import test from "node:test";
import { questions, answers, pkg } from "./fixtures/six-kinds.mjs";
import assert from "node:assert/strict";
import { validateExamPackage, startGenericAttempt, transitionGenericAttempt, readableAnswer } from "../src/app/exam-package.ts";
import { validateGenericStoredRecord } from "../src/app/generic-ui.ts";
import { makeBackup, verifyBackup, planBackupMerge } from "../src/history/backup.ts";

const responses=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
 {kind:"free-response",text:"Because of the underlying principles."},
];
const lookup=new Map(questions.map(q=>[q.id,q]));
test("a non-CGL paper completes all six response types through the same engine",()=>{
 const bundle=validateExamPackage(pkg);
 let attempt=startGenericAttempt(bundle,"test",1000);
 let now=1001;
 for(let i=0;i<6;i++){
   const s=i<3?0:1, n=i%3;
   attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:now++,sectionIndex:s,questionIndex:n},lookup);
   attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:now++,response:responses[i]},lookup);
 }
 attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:now++},lookup);
 assert.equal(attempt.state.status,"completed");
 assert.equal(attempt.result.snapshot.correctCount,5);
 assert.equal(attempt.result.snapshot.earnedMarks,10);
 assert.equal(attempt.result.items.filter(item=>item.verdict==="pending").length,1);
 assert.equal(attempt.frozen.snapshot.examId,"example-exam");
 assert.equal(readableAnswer(questions[0],answers[0]),"Alpha");
});
test("invalid numeric value, underspecified selections and duplicate matches are rejected",()=>{
 const bundle=validateExamPackage(pkg);
 let attempt=startGenericAttempt(bundle,"bad",1000);
 const navigate=(s,n)=>{attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:1001,sectionIndex:s,questionIndex:n},lookup);};
 navigate(0,1);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1002,response:{kind:"multiple-select",optionIds:["x"]}},lookup),/selection/i);
 navigate(0,2);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1003,response:{kind:"numeric-entry",value:11}},lookup),/numeric/i);
 navigate(1,1);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1004,response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r1"}]}},lookup),/matching/i);
});
test("forward-only navigation restrictions are respected for non-CGL papers",()=>{
 const changed={...pkg.paper,navigation:{...pkg.paper.navigation,questionNavigation:"forward-only"}};
 const b=validateExamPackage({...pkg,paper:{...changed,contentHash:paperRevisionHash(changed)}});
 let attempt=startGenericAttempt(b,"forward",0);
 attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:1,sectionIndex:0,questionIndex:2},lookup);
 const back=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:2,sectionIndex:0,questionIndex:0},lookup);
 assert.equal(back.state.questionIndex,2);
});

test("generic attempts and imported packages survive a verified history backup round trip",()=>{
 const bundle=validateExamPackage(pkg);
 const unfinished=startGenericAttempt(bundle,"resumeable",1000);
 let completed=startGenericAttempt(bundle,"completed",1000);
 completed=transitionGenericAttempt(completed,{type:"ANSWER",nowMs:1001,response:responses[0]},lookup);
 completed=transitionGenericAttempt(completed,{type:"SUBMIT_ATTEMPT",nowMs:1002},lookup);
 assert.equal(validateGenericStoredRecord(unfinished),unfinished);
 assert.equal(validateGenericStoredRecord(completed),completed);
 const importedPackage={recordType:"generic-package",id:"generic-package:"+bundle.paper.id,bundle};
 const contents=[importedPackage,unfinished,completed];
 const backup=makeBackup(contents,{schema:1,dark:false,scale:100},"2026-10-28T00:00:00Z");
 const reloaded=verifyBackup(JSON.parse(JSON.stringify(backup)));
 assert.equal(reloaded.records.length,3);
 for(const record of reloaded.records) assert.doesNotThrow(()=>validateGenericStoredRecord(record));
 assert.deepEqual(planBackupMerge([completed],reloaded.records,"completed").map(x=>x.id),
  [importedPackage.id,unfinished.id]);
 assert.throws(()=>verifyBackup({...reloaded,records:reloaded.records.slice(1)}),/integrity/);
});
test("completed generic scores cannot be silently rewritten in stored history",()=>{
 const bundle=validateExamPackage(pkg);
 let completed=startGenericAttempt(bundle,"tamper",1000);
 completed=transitionGenericAttempt(completed,{type:"SUBMIT_ATTEMPT",nowMs:1100},lookup);
 const altered=structuredClone(completed);
 altered.result.snapshot.earnedMarks=123456;
 assert.throws(()=>validateGenericStoredRecord(altered),/score does not match/);
 assert.throws(()=>validateGenericStoredRecord({...completed,packageId:"different-revision"}),/incorrect revision/);
});
