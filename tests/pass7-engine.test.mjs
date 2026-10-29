import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg} from "./fixtures/six-kinds.mjs";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {validateExamPackage,configureCglPractice,builtinCglPackages,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validateGenericStoredRecord} from "../src/app/generic-ui.ts";
import {transition,startSession} from "../src/engine/session.ts";
import {setManualGrade,validateManualGrades,manualGradeSummary} from "../src/engine/manual-grading.ts";
import {createSourceKeyReference,sourceKeyScore,validateSourceKeyReference} from "../src/engine/source-comparison.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {createSessionClock} from "../src/engine/clock.ts";

const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const builtins=builtinCglPackages(sources,patches);
const mock=(paperChanges)=>{const base={...pkg.paper,...paperChanges};return validateExamPackage({...pkg,paper:{...base,contentHash:paperRevisionHash(base)}});};

test("strict section submission policy is an engine invariant, not a disabled button",()=>{
 const bundle=mock({timing:{kind:"sectional",transition:"automatic",pausePolicy:"forbidden",allowEarlySubmit:false,
   sectionLimits:[{sectionId:"s1",durationMs:1000},{sectionId:"s2",durationMs:1000}]}});
 const started=startSession(bundle.paper,0);
 assert.equal(transition(bundle.paper,started,{type:"SUBMIT_ATTEMPT",nowMs:1}).status,"running");
 assert.equal(transition(bundle.paper,started,{type:"SUBMIT_SECTION",nowMs:2}).sectionIndex,0);
 const timed=transition(bundle.paper,started,{type:"TICK",nowMs:1000});
 assert.equal(timed.sectionIndex,1);
 assert.deepEqual(timed.completedSections,[0]);
 assert.equal(transition(bundle.paper,timed,{type:"SUBMIT_ATTEMPT",nowMs:1001}).status,"running");
 assert.equal(transition(bundle.paper,timed,{type:"TICK",nowMs:2000}).status,"completed");
});
test("delayed submit cannot accidentally finish the next section after a timeout",()=>{
 const bundle=mock({timing:{kind:"sectional",transition:"automatic",pausePolicy:"forbidden",allowEarlySubmit:true,
   sectionLimits:[{sectionId:"s1",durationMs:1000},{sectionId:"s2",durationMs:1000}]}});
 const first=startSession(bundle.paper,0);
 const advanced=transition(bundle.paper,first,{type:"SUBMIT_SECTION",nowMs:1050});
 assert.equal(advanced.status,"running");
 assert.equal(advanced.sectionIndex,1);
 assert.deepEqual(advanced.completedSections,[0]);
 const final=transition(bundle.paper,advanced,{type:"SUBMIT_SECTION",nowMs:1060});
 assert.equal(final.status,"completed");
});
test("pause and flag policies hold in pure transitions, including clock rollback",()=>{
 const bundle=mock({timing:{kind:"whole-paper",durationMs:5000,pausePolicy:"forbidden"},
    navigation:{questionNavigation:"forward-only",sectionNavigation:"sequential-locked",allowFlagging:false,allowReview:false}});
 const initial=startSession(bundle.paper,3000);
 assert.equal(transition(bundle.paper,initial,{type:"PAUSE",nowMs:3001}).status,"running");
 const moved=transition(bundle.paper,initial,{type:"NAVIGATE",nowMs:3010,sectionIndex:0,questionIndex:2});
 assert.equal(moved.questionIndex,2);
 assert.equal(transition(bundle.paper,moved,{type:"NAVIGATE",nowMs:3011,sectionIndex:0,questionIndex:0}).questionIndex,2);
 const flagRejected=transition(bundle.paper,moved,{type:"FLAG",nowMs:3011,flagged:true});
 assert.ok(flagRejected.responses.every(row=>!row.flagged),"Disabled flag event created a flag");
 const rebased=transition(bundle.paper,moved,{type:"TICK",nowMs:2000});
 assert.equal(rebased.clockMs,2000);
 assert.equal(rebased.elapsedMs,moved.elapsedMs);
 assert.equal(transition(bundle.paper,rebased,{type:"TICK",nowMs:2100}).elapsedMs,moved.elapsedMs+100);
});
test("all four attempt modes are pinned with their actual CGL policy or custom package",()=>{
 const cgl=builtins.find(p=>p.paper.edition==="reviewed");
 for(const [mode,expected] of [["strict","exam-simulation"],["free","full-paper-practice"],["single","section-practice"]]){
  const configured=configureCglPractice(cgl,mode,0);
  const a=startGenericAttempt(configured,mode,1000);
  assert.equal(a.frozen.snapshot.mode,expected);
  validateGenericStoredRecord(a);
 }
 const custom=startGenericAttempt(pkg,"custom",1000);
 assert.equal(custom.frozen.snapshot.mode,"custom-practice");
});
test("built-in source page and independently supplied references survive reviewed import",()=>{
 const source=Object.values(sources)[0];
 const built=builtins.find(p=>p.paper.paperId===source.id&&p.paper.edition==="source");
 const first=source.questions[0];
 const q=built.questions.find(q=>q.questionId.endsWith(":q:"+first.n));
 assert.equal(q.editorial.sourcePage,first.sourcePage);
 assert.deepEqual(q.editorial.sources??[],first.sources??[]);
 const withSources=source.questions.find(q=>q.sources?.length);
 if(withSources){
  const candidate=built.questions.find(q=>q.questionId.endsWith(":q:"+withSources.n));
  assert.deepEqual(candidate.editorial.sources,withSources.sources);
 }
});
test("written response can be explicitly self-assessed without modifying frozen automated results",()=>{
 const bundle=validateExamPackage(pkg);
 let a=startGenericAttempt(bundle,"essay",1000);
 const qm=new Map(bundle.questions.map(q=>[q.id,q]));
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:1010,sectionIndex:1,questionIndex:2},qm);
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1011,response:{kind:"free-response",text:"I explain the reasons."}},qm);
 a=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1020},qm);
 const original=structuredClone(a.result);
 assert.equal(a.result.items.at(-1).verdict,"pending");
 const marked=setManualGrade(a,bundle.questions[5].id,1.5,"Reasoning is plausible",new Date(1500).toISOString());
 assert.deepEqual(marked.result,original);
 assert.equal(manualGradeSummary(marked).total,1.5);
 assert.equal(manualGradeSummary(marked).graded,1);
 assert.equal(validateGenericStoredRecord(JSON.parse(JSON.stringify(marked))).manualGrades[0].marks,1.5);
 assert.throws(()=>setManualGrade(marked,bundle.questions[5].id,99,"",new Date(2000).toISOString()),/Invalid manual grade/);
 assert.throws(()=>validateManualGrades({...marked,manualGrades:[...marked.manualGrades,...marked.manualGrades]}),/invalid manual grade/i);
 assert.throws(()=>setManualGrade(marked,bundle.questions[0].id,1,"",new Date(2000).toISOString()),/pending written responses/);
 assert.throws(()=>setManualGrade(startGenericAttempt(bundle,"open",2000),bundle.questions[5].id,1,"",new Date(2001).toISOString()),/pending written responses/);
});

test("source-key comparison pins original answer references independently of reviewed revisions",()=>{
 const reviewed=builtins.find(p=>p.paper.edition==="reviewed");
 const source=builtins.find(p=>p.paper.paperId===reviewed.paper.paperId&&p.paper.edition==="source");
 const original=createSourceKeyReference(reviewed,source);
 assert.equal(original.entries.length,100);
 let a=startGenericAttempt(reviewed,"original-vs-reviewed",1000);
 a={...a,sourceKeyReference:original};
 validateSourceKeyReference(a);
 assert.equal(sourceKeyScore(a),null,"Never compare an active attempt");
 const qm=new Map(reviewed.questions.map(q=>[q.id,q]));
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1001,
   response:{kind:"single-choice",optionId:reviewed.questions[0].content.options[0].id}},qm);
 for(let i=0;i<4;i++)a=transitionGenericAttempt(a,{type:"SUBMIT_SECTION",nowMs:1010+i},qm);
 const comparison=sourceKeyScore(a);
 assert.equal(comparison.correct+comparison.incorrect+comparison.unanswered,100);
 assert.equal(comparison.maxMarks,200);
 assert.equal(validateGenericStoredRecord(JSON.parse(JSON.stringify(a))).sourceKeyReference.contentHash,original.contentHash);
 const malicious=structuredClone(a);
 malicious.sourceKeyReference.entries[0].originalOptionId="tampered";
 assert.throws(()=>validateGenericStoredRecord(malicious),/source-key reference hash mismatch/);
 const single=configureCglPractice(reviewed,"single",2);
 const singleRef=createSourceKeyReference(single,source);
 assert.equal(singleRef.entries.length,25);
 assert.equal(createSourceKeyReference(pkg,source),null);
});
test("draft and editorial-unsafe questions are excluded rather than treated as correct",()=>{
 const reviewed=builtins.find(p=>p.paper.edition==="reviewed");
 const q=reviewed.questions[0];
 const draft={...q,editorial:{...q.editorial,status:"draft"}};
 const paper={...reviewed.paper,sections:[{...reviewed.paper.sections[0],questionRevisionIds:[q.id]}],
   timing:{kind:"untimed"}};
 const score=scoreAttempt(paper,reviewed.answerKey,[draft],[
  {questionRevisionId:q.id,response:{kind:"single-choice",optionId:reviewed.answerKey.entries[0].answer.optionId},
   timeSpentMs:0,flagged:false,answerChangeCount:0}
 ],new Date(1000).toISOString());
 assert.deepEqual(score.items.map(x=>x.verdict),["excluded"]);
 assert.equal(score.snapshot.earnedMarks,0);
});

test("live timer uses nondecreasing monotonic elapsed time even if wall clock moves",()=>{
 let mono=100;
 const clock=createSessionClock(10000,100,()=>mono);
 assert.equal(clock(),10000);
 mono=110;assert.equal(clock(),10010);
 mono=105;assert.equal(clock(),10010,"A backwards sample must never reverse the timer");
 mono=130;assert.equal(clock(),10030);
 const paper={...pkg.paper,timing:{kind:"whole-paper",durationMs:40,pausePolicy:"forbidden"}};
 const initial=startSession(paper,10000);
 const after=transition(paper,initial,{type:"TICK",nowMs:clock()});
 assert.equal(after.elapsedMs,30);
 mono=145;
 assert.equal(transition(paper,after,{type:"TICK",nowMs:clock()}).status,"completed");
});
