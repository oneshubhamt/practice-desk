import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";
import {stageWrittenResponseDraft,commitCurrentWrittenDraft} from "../src/app/written-response-draft.ts";
import {writtenAnswerEvidence} from "../src/learning/written-answer-analytics.ts";
import {writtenAnswerAnalysisHTML,timingLedgerHTML,resultPacingHTML} from "../src/app/result-presentation.ts";
import {examClockDisplay} from "../src/app/exam-view.ts";
import {setManualGrade,manualGradeLimits} from "../src/engine/manual-grading.ts";
import {timeEnforcementForMode} from "../src/domain/timing.ts";

const qmap=new Map(pkg.questions.map(q=>[q.id,q]));
const event=(type,nowMs,extra={})=>({type,nowMs,...extra});
const words=n=>Array.from({length:n},(_,i)=>"word"+(i+1)).join(" ");
function timedBundle(durationMs=1000){
 const base={...pkg.paper,timing:{kind:"whole-paper",durationMs,pausePolicy:"allowed"}};
 return {...pkg,paper:{...base,contentHash:paperRevisionHash(base)}};
}
function atWritten(bundle,mode,id="written"){
 let a=startGenericAttempt(bundle,id,0,mode);
 return transitionGenericAttempt(a,event("NAVIGATE",0,{sectionIndex:1,questionIndex:2}),qmap);
}

test("written draft typed before a hard deadline survives timeout without accepting a late edit",()=>{
 const bundle=timedBundle(),store=new Map();
 let a=atWritten(bundle,"exam-simulation","hard-written");
 assert.equal(stageWrittenResponseDraft(store,a,"rev-5",words(35),900),"staged");
 assert.equal(stageWrittenResponseDraft(store,a,"rev-5",words(36),1100),"deadline",
   "an input event at/after the hard deadline cannot overwrite the last legal draft");
 a=commitCurrentWrittenDraft(store,a,1200);
 a=transitionGenericAttempt(a,event("TICK",1200),qmap);
 assert.equal(a.finishedAt,1200);
 assert.equal(a.completionReason,"time-expired");
 const row=a.state.responses.find(x=>x.questionRevisionId==="rev-5");
 assert.equal(row.response.text,words(35));
 assert.equal(row.timeSpentMs,1000);
 assert.equal(row.postDeadlineMs,0);
 assert.equal(row.answerChangeCount,0);
 assert.equal(row.answerEvents,undefined,"written safety checkpoints are not typing telemetry");
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});

test("written draft commits at navigation/submission boundary without requiring Save response",()=>{
 const bundle=timedBundle(5000),store=new Map();
 let a=atWritten(bundle,"custom-practice","boundary-written");
 assert.equal(stageWrittenResponseDraft(store,a,"rev-5","Visible unsaved answer",400),"staged");
 a=commitCurrentWrittenDraft(store,a,500);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",600),qmap);
 assert.equal(a.completionReason,"submitted");
 assert.equal(a.result.items.find(x=>x.questionRevisionId==="rev-5").verdict,"pending");
 assert.equal(a.state.responses.find(x=>x.questionRevisionId==="rev-5").response.text,
   "Visible unsaved answer");
 assert.equal(store.size,0);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});

test("advisory practice continues into overtime and attributes only foreground post-budget exposure",()=>{
 const bundle=timedBundle(),store=new Map();
 let a=atWritten(bundle,"custom-practice","advisory-written");
 a=transitionGenericAttempt(a,event("TICK",1500),qmap);
 assert.equal(a.finishedAt,null);
 assert.equal(a.state.elapsedMs,1500);
 assert.equal(a.state.responses.find(x=>x.questionRevisionId==="rev-5").postDeadlineMs,500);
 const clock=examClockDisplay(a.frozen.paper,a.state,a.frozen.snapshot.mode);
 assert.deepEqual(clock,{text:"+00:01",label:"PAPER OVERTIME",low:false,overtime:true});
 assert.equal(stageWrittenResponseDraft(store,a,"rev-5",words(41),1550),"staged");
 a=commitCurrentWrittenDraft(store,a,1600);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",1700),qmap);
 assert.equal(a.completionReason,"submitted");
 assert.equal(a.state.elapsedMs,1700);
 assert.equal(a.state.responses.find(x=>x.questionRevisionId==="rev-5").postDeadlineMs,700);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});

test("written Results derive word/time/overtime evidence and keep self-assessment separate",()=>{
 const bundle=timedBundle(),store=new Map();
 let a=atWritten(bundle,"custom-practice","written-results");
 a=transitionGenericAttempt(a,event("TICK",1200),qmap);
 stageWrittenResponseDraft(store,a,"rev-5",words(41),1250);
 a=commitCurrentWrittenDraft(store,a,1300);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",1400),qmap);
 const machine=a.result.snapshot.earnedMarks;
 a=setManualGrade(a,"rev-5",1.5,"Good coverage; tighten conclusion",new Date(1500).toISOString());
 assert.equal(a.result.snapshot.earnedMarks,machine,"manual mark cannot rewrite machine score");
 const evidence=writtenAnswerEvidence(a);
 assert.equal(evidence.rows.length,1);
 assert.equal(evidence.rows[0].wordCount,41);
 assert.equal(evidence.rows[0].wordLimit,40);
 assert.equal(evidence.rows[0].postDeadlineMs,400);
 assert.equal(evidence.paperBudgetMs,1000);
 assert.equal(evidence.actualMs,1400);
 assert.equal(evidence.paperOvertimeMs,400);
 assert.equal(evidence.writtenPostDeadlineMs,400);
 assert.equal(evidence.rows[0].selfAssessedMarks,1.5);
 const html=writtenAnswerAnalysisHTML(a);
 assert.match(html,/Written answers/);
 assert.match(html,/41 \/ 40 words · \+1 \(2\.5% over\)/);
 assert.match(html,/\+00:01/);
 assert.match(html,/1\.5 \/ 2/);
 assert.match(html,/Good coverage; tighten conclusion/);
 assert.doesNotMatch(html,/typing speed|readability|semantic score/i);
 const timing=timingLedgerHTML(a,true);
 assert.match(timing,/<th>After deadline<\/th>/);
});

test("hard exam simulation still auto-completes exactly at its timer limit",()=>{
 const bundle=timedBundle();
 let a=atWritten(bundle,"exam-simulation","strict-written");
 a=transitionGenericAttempt(a,event("TICK",5000),qmap);
 assert.equal(a.finishedAt,5000);
 assert.equal(a.state.elapsedMs,1000);
 assert.equal(a.completionReason,"time-expired");
 assert.equal(a.state.responses.find(x=>x.questionRevisionId==="rev-5").postDeadlineMs,0);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});


test("attempt modes resolve one generic hard/advisory timing policy",()=>{
 assert.equal(timeEnforcementForMode("exam-simulation"),"hard");
 for(const mode of ["full-paper-practice","section-practice","custom-practice"])
   assert.equal(timeEnforcementForMode(mode),"advisory");
});

test("Written answers summary excludes overtime spent on non-written questions",()=>{
 const bundle=timedBundle(),store=new Map();
 let a=startGenericAttempt(bundle,"mixed-overtime",0,"custom-practice");
 a=transitionGenericAttempt(a,event("TICK",1200),qmap); // 200 ms overtime on MCQ Q1
 a=transitionGenericAttempt(a,event("NAVIGATE",1200,{sectionIndex:1,questionIndex:2}),qmap);
 stageWrittenResponseDraft(store,a,"rev-5","written overtime",1250);
 a=commitCurrentWrittenDraft(store,a,1250);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",1300),qmap); // 100 ms written overtime
 const evidence=writtenAnswerEvidence(a);
 assert.equal(a.state.responses.reduce((sum,row)=>sum+row.postDeadlineMs,0),300);
 assert.equal(evidence.writtenPostDeadlineMs,100,
   "Written panel must not attribute MCQ overtime to written responses");
 const ledger=timingLedgerHTML(a,true);
 assert.match(ledger,/<th>After deadline<\/th>/);
 const objectiveRow=ledger.match(/<tr><td>1<\/td>[\s\S]*?<\/tr>/)?.[0]??"";
 assert.match(objectiveRow,/\+00:01/,
   "Objective-question overtime must remain visible in the all-question timing ledger");
 const html=writtenAnswerAnalysisHTML(a);
 assert.match(html,/Written-answer overtime/);
 assert.match(html,/other questions and hidden-page time are intentionally excluded/);
});

test("Results distinguish a mixed sectional policy from a wholly untimed paper",()=>{
 const base={...pkg.paper,
   timing:{kind:"sectional",transition:"automatic",allowEarlySubmit:true,pausePolicy:"allowed",
     sectionLimits:[{sectionId:"s1",durationMs:1000},{sectionId:"s2",durationMs:null}]},
   navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}};
 const bundle={...pkg,paper:{...base,contentHash:paperRevisionHash(base)}};
 let a=startGenericAttempt(bundle,"mixed-sectional",0,"custom-practice");
 a=transitionGenericAttempt(a,event("SUBMIT_SECTION",100),qmap);
 a=transitionGenericAttempt(a,event("SUBMIT_SECTION",200),qmap);
 assert.equal(a.finishedAt,200);
 const html=resultPacingHTML(a);
 assert.match(html,/No single total budget/);
 assert.match(html,/Not derivable/);
 assert.doesNotMatch(html,/<b>Untimed<\/b>/);
});

test("Results report derived paper overtime percentage without persisting another field",()=>{
 const bundle=timedBundle(),store=new Map();
 let a=atWritten(bundle,"custom-practice","overtime-percent");
 stageWrittenResponseDraft(store,a,"rev-5","answer",900);
 a=commitCurrentWrittenDraft(store,a,900);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",1400),qmap);
 const html=resultPacingHTML(a);
 assert.match(html,/40\.0% over budget/);
 assert.equal(Object.hasOwn(a.state,"paperOvertimeMs"),false);
 assert.equal(Object.hasOwn(a,"paperOvertimeMs"),false);
});

test("manual grading exposes one linear limit map for written analytics",()=>{
 const bundle=timedBundle(),store=new Map();
 let a=atWritten(bundle,"custom-practice","manual-limits");
 stageWrittenResponseDraft(store,a,"rev-5","answer",200);
 a=commitCurrentWrittenDraft(store,a,200);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",300),qmap);
 const limits=manualGradeLimits(a);
 assert.equal(limits.size,1);
 assert.equal(limits.get("rev-5"),2);
});
