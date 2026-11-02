import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startSession,transition,rebaseSession} from "../src/engine/session.ts";
import {startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validateGenericStoredRecord} from "../src/app/generic-ui.ts";
import {questionTimingPhases} from "../src/learning/question-analytics.ts";
import {timingLedgerHTML,resultPacingHTML} from "../src/app/result-presentation.ts";
import {revisionInventory} from "../src/learning/revision-selection.ts";
import {makeBackup,verifyBackup} from "../src/history/backup.ts";

const paper=pkg.paper, questions=pkg.questions, key=new Map(questions.map(q=>[q.id,q]));
const a0={kind:"single-choice",optionId:"a"};
const a1={kind:"single-choice",optionId:"b"};
const id=i=>"rev-"+i;
const event=(type,nowMs,more={})=>({type,nowMs,...more});
const row=(s,i)=>s.responses.find(r=>r.questionRevisionId===id(i));

test("P46-B exact first-visit/revisit/first-answer phases across navigation and changes",()=>{
 let s=startSession(paper,1000);
 assert.equal(s.timingEvidenceVersion,1);
 s=transition(paper,s,event("TICK",1800));
 s=transition(paper,s,event("NAVIGATE",2000,{sectionIndex:0,questionIndex:1}));
 s=transition(paper,s,event("NAVIGATE",2500,{sectionIndex:0,questionIndex:0}));
 s=transition(paper,s,event("ANSWER",3400,{response:a0}));
 assert.equal(row(s,0).firstVisitMs,1000);
 assert.equal(row(s,0).preFirstAnswerMs,1900,"first answer AFTER revisiting includes both visits");
 assert.equal(row(s,0).timeSpentMs,1900);
 assert.equal(row(s,0).firstAnsweredAt,new Date(3400).toISOString());
 s=transition(paper,s,event("TICK",4000));
 s=transition(paper,s,event("CLEAR",4200));
 s=transition(paper,s,event("ANSWER",4300,{response:a1}));
 assert.equal(row(s,0).timeSpentMs,2800);
 assert.equal(row(s,0).firstVisitMs,1000);
 assert.equal(row(s,0).preFirstAnswerMs,1900,"clear and corrected answer cannot reset the first response");
 assert.equal(row(s,0).firstAnsweredAt,new Date(3400).toISOString());
 const a={...startGenericAttempt(pkg,"phases",1000),state:s};
 assert.deepEqual(questionTimingPhases(a,id(0)),{
   firstVisitMs:1000,revisitMs:1800,beforeFirstAnswerMs:1900,totalMs:2800,visits:2
 });
 assert.equal(row(s,1).firstVisitMs,500);
 assert.equal(questionTimingPhases(a,id(1)).beforeFirstAnswerMs,null);
 assert.equal(row(s,0).timeSpentMs,row(s,0).firstVisitMs+questionTimingPhases(a,id(0)).revisitMs);
});
test("P46-B pauses, visibility and clock rebase never invent phase exposure",()=>{
 let s=startSession(paper,1000);
 s=transition(paper,s,event("PAUSE",2100));
 s=transition(paper,s,event("TICK",4100));
 s=transition(paper,s,event("RESUME",4200));
 s=transition(paper,s,event("VISIBILITY",4400,{visible:false}));
 s=transition(paper,s,event("TICK",6400));
 s=transition(paper,s,event("VISIBILITY",6500,{visible:true}));
 s=rebaseSession(s,6500);
 s=transition(paper,s,event("TICK",7000));
 assert.equal(row(s,0).timeSpentMs,1800);
 assert.equal(row(s,0).firstVisitMs,1800);
 assert.equal(row(s,0).preFirstAnswerMs,1800);
 assert.equal(s.foregroundMs,1800);
 assert.equal(s.elapsedMs,3900,"whole-paper clock may run through hidden-tab interval");
 s=transition(paper,s,event("TICK",6900));
 assert.equal(row(s,0).timeSpentMs,1800,"clock rollback must not subtract exposure");
 s=transition(paper,s,event("TICK",7000));
 assert.equal(row(s,0).timeSpentMs,1900,"only forward time since new clock origin counts");
});
test("P46-B automatic sectional expiry caps attribution and records next section",()=>{
 const mod={...paper,sections:[{id:"a",title:"A",questionRevisionIds:[id(0)]},
   {id:"b",title:"B",questionRevisionIds:[id(1)]}],
   timing:{kind:"sectional",sectionLimits:[{sectionId:"a",durationMs:1000},
    {sectionId:"b",durationMs:1000}],allowEarlySubmit:true,pausePolicy:"forbidden",transition:"automatic"},
   navigation:{questionNavigation:"free",sectionNavigation:"sequential-locked",allowFlagging:true,allowReview:true}};
 const done=transition(mod,startSession(mod,0),event("TICK",2500));
 assert.equal(done.status,"completed");
 assert.equal(row(done,0).timeSpentMs,1000);
 assert.equal(row(done,1).timeSpentMs,1000);
 assert.equal(row(done,0).firstVisitMs,1000);
 assert.equal(row(done,1).firstVisitMs,1000);
 assert.equal(row(done,1).preFirstAnswerMs,1000);
 assert.equal(done.foregroundMs,2000);
});
test("P46-B zero-time first visit followed by measured revisit is not fabricated",()=>{
 let s=startSession(paper,0);
 s=transition(paper,s,event("NAVIGATE",0,{sectionIndex:0,questionIndex:1}));
 s=transition(paper,s,event("NAVIGATE",1000,{sectionIndex:0,questionIndex:0}));
 s=transition(paper,s,event("TICK",2000));
 assert.equal(s.questionVisits.find(x=>x.questionRevisionId===id(0)).count,2);
 assert.equal(row(s,0).firstVisitMs,0);
 assert.equal(row(s,0).preFirstAnswerMs,1000);
 assert.equal(row(s,0).timeSpentMs,1000);
});
function completed(){
 let a=startGenericAttempt(pkg,"source-phase",1000);
 a=transitionGenericAttempt(a,event("NAVIGATE",2000,{sectionIndex:0,questionIndex:1}),key);
 a=transitionGenericAttempt(a,event("NAVIGATE",2500,{sectionIndex:0,questionIndex:0}),key);
 a=transitionGenericAttempt(a,event("ANSWER",3000,{response:a0}),key);
 return transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",3500),key);
}
test("P46-B frozen stored attempts reject impossible or forged timing phase claims",()=>{
 const done=completed();
 assert.equal(validateGenericStoredRecord(done).id,done.id);
 const altered=(fn)=>{const x=structuredClone(done);fn(x);return x;};
 for(const [description,fn] of [
   ["negative first visit",x=>{x.state.responses[0].firstVisitMs=-1;}],
   ["over-total first visit",x=>{x.state.responses[0].firstVisitMs=5000;}],
   ["over-total before first answer",x=>{x.state.responses[0].preFirstAnswerMs=5000;}],
   ["fractional first visit",x=>{x.state.responses[0].firstVisitMs=3.5;}],
   ["nonfinite before first answer",x=>{x.state.responses[0].preFirstAnswerMs=Infinity;}],
   ["half-filled phase",x=>{delete x.state.responses[0].preFirstAnswerMs;}],
   ["unversioned forged fields",x=>{delete x.state.timingEvidenceVersion;}],
   ["unknown timing version",x=>{x.state.timingEvidenceVersion=2;}]
 ]){
   assert.throws(()=>validateGenericStoredRecord(altered(fn)),/timing (?:phase evidence|evidence version)/,description);
 }
});
test("P46-B exact phases survive compact v4 backup, reopen and remain independent of marks",()=>{
 const a=completed(),summary=a.result.snapshot;
 const archive=verifyBackup(makeBackup([a],{schema:1,dark:false,scale:100},"2026-11-02T20:00:00Z"));
 assert.equal(archive.version,4);
 const restored=validateGenericStoredRecord(JSON.parse(JSON.stringify(archive.records[0])));
 assert.equal(restored.result.snapshot.earnedMarks,summary.earnedMarks);
 assert.deepEqual(questionTimingPhases(restored,id(0)),questionTimingPhases(a,id(0)));
 assert.equal(restored.state.timingEvidenceVersion,1);
 const html=timingLedgerHTML(restored,true);
 assert.match(html,/<th>First visit<\/th><th>Revisits<\/th><th>Before first answer<\/th>/);
 assert.match(html,/00:01/);
 assert.match(resultPacingHTML(restored),/Revisit exposure/);
 const selected=revisionInventory([restored],[],new Set(),pkg.examId,["blank"]);
 const q=selected.selected.find(x=>x.questionId===id(1));
 assert.equal(q.firstVisitMs,500);
 assert.equal(q.revisitMs,0);
 assert.equal(q.beforeFirstAnswerMs,null);
});
test("P46-B uninstrumented records remain unavailable; no wall-clock guesses",()=>{
 const a=completed(),old=structuredClone(a);
 delete old.state.timingEvidenceVersion;
 for(const r of old.state.responses){delete r.firstVisitMs;delete r.preFirstAnswerMs;}
 assert.equal(validateGenericStoredRecord(old).id,a.id);
 assert.equal(questionTimingPhases(old,id(0)),null);
 assert.match(timingLedgerHTML(old,true),/Not measured/);
 const missing=revisionInventory([old],[],new Set(),pkg.examId,["blank"]);
 assert.ok(missing.selected.every(x=>x.firstVisitMs===null&&x.revisitMs===null));
});
