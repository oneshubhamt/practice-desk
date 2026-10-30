import test from "node:test";
import assert from "node:assert/strict";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {startSession,transition,sectionTimerDuration,validateSectionTimingEvidence} from "../src/engine/session.ts";
import {validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validateGenericStoredRecord} from "../src/app/generic-ui.ts";
import {sectionScoreSummaries} from "../src/engine/score-ceiling.ts";
import {attemptEvidence} from "../src/learning/attempt-evidence.ts";
import {restoreSession} from "../src/history/frozen.ts";
import {assertDeletionAllowed,deletionWarning} from "../src/history/deletion-policy.ts";
import {historyHTML} from "../src/app/history-page.ts";
import {sectionPaceHTML} from "../src/app/result-presentation.ts";

const event=(type,nowMs,props={})=>({type,nowMs,...props});
const base=(overrides={})=>({...pkg.paper,...overrides,
  navigation:overrides.navigation??{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}});
const bundle=overrides=>{const p=base(overrides);return validateExamPackage({...pkg,paper:{...p,contentHash:paperRevisionHash(p)}});};
const qm=new Map(questions.map(q=>[q.id,q]));

test("F01: automatic multi-section clock stores exactly one closure each, split across a late background tick",()=>{
 const p=base({timing:{kind:"sectional",transition:"automatic",pausePolicy:"forbidden",allowEarlySubmit:false,
   sectionLimits:[{sectionId:"s1",durationMs:100},{sectionId:"s2",durationMs:250}]}});
 let st=startSession(p,0);
 st=transition(p,st,event("VISIBILITY",50,{visible:false}));
 st=transition(p,st,event("TICK",1000));
 assert.equal(st.status,"completed");
 assert.equal(st.elapsedMs,350);
 assert.equal(st.foregroundMs,50);
 assert.deepEqual(st.completedSectionTimings?.map(x=>[x.sectionIndex,x.durationMs,x.reason]),
  [[0,100,"time-expired"],[1,250,"time-expired"]]);
 assert.equal(sectionTimerDuration(st,0),100);
 assert.equal(sectionTimerDuration(st,1),250);
 assert.doesNotThrow(()=>validateSectionTimingEvidence(p,st));
 assert.equal(st.responses.find(x=>x.questionRevisionId===questions[0].id)?.timeSpentMs,50);
});

test("F01: early-submitted sequential section and final section preserve timer durations, not response exposure",()=>{
 const b=bundle({timing:{kind:"sectional",transition:"automatic",pausePolicy:"allowed",allowEarlySubmit:true,
   sectionLimits:[{sectionId:"s1",durationMs:500},{sectionId:"s2",durationMs:800}]}});
 let attempt=startGenericAttempt(b,"early",1000);
 attempt=transitionGenericAttempt(attempt,event("SUBMIT_SECTION",1125),qm);
 assert.equal(attempt.state.sectionIndex,1);
 attempt=transitionGenericAttempt(attempt,event("PAUSE",1200),qm);
 attempt=transitionGenericAttempt(attempt,event("TICK",3000),qm);
 attempt=transitionGenericAttempt(attempt,event("RESUME",3000),qm);
 attempt=transitionGenericAttempt(attempt,event("SUBMIT_SECTION",3150),qm);
 assert.equal(attempt.finishedAt,3150);
 assert.deepEqual(attempt.state.completedSectionTimings?.map(x=>[x.durationMs,x.reason]),
   [[125,"submitted"],[225,"submitted"]]);
 assert.equal(attempt.state.elapsedMs,350);
 assert.doesNotThrow(()=>validateGenericStoredRecord(attempt));
 const rows=sectionScoreSummaries(attempt,attempt.result);
 assert.deepEqual(rows.map(x=>x.timerMs),[125,225]);
 assert.deepEqual(rows.map(x=>x.timerReason),["submitted","submitted"]);
 assert.match(sectionPaceHTML(attempt),/Timer: 00:01/);
});

test("F01: manual expiry freezes waiting interval through persistence and restore",()=>{
 const b=bundle({timing:{kind:"sectional",transition:"manual",pausePolicy:"allowed",allowEarlySubmit:false,
   sectionLimits:[{sectionId:"s1",durationMs:100},{sectionId:"s2",durationMs:200}]}});
 let a=startGenericAttempt(b,"manual",1000);
 a=transitionGenericAttempt(a,event("TICK",1400),qm);
 assert.equal(a.state.status,"section-expired");
 assert.equal(a.state.elapsedMs,100);
 a=transitionGenericAttempt(a,event("TICK",9000),qm);
 assert.equal(a.state.elapsedMs,100);
 const restored=restoreSession(b.paper,a.state,20000,false);
 assert.equal(restored.state.elapsedMs,100);
 assert.equal(restored.state.status,"section-expired");
 a=transitionGenericAttempt({...a,state:restored.state},event("SUBMIT_SECTION",20000),qm);
 assert.deepEqual(a.state.completedSectionTimings?.map(x=>[x.durationMs,x.reason]),[[100,"time-expired"]]);
 a=transitionGenericAttempt(a,event("TICK",20200),qm);
 assert.equal(a.state.status,"section-expired");
 a=transitionGenericAttempt(a,event("SUBMIT_SECTION",21000),qm);
 assert.deepEqual(a.state.completedSectionTimings?.map(x=>x.durationMs),[100,200]);
 assert.equal(a.state.elapsedMs,300);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});

test("F01: locked whole-paper sections have consumable section time; free multi-section does not",()=>{
 const locked=bundle({timing:{kind:"whole-paper",durationMs:500,pausePolicy:"allowed"}});
 let a=startGenericAttempt(locked,"locked",1000);
 a=transitionGenericAttempt(a,event("SUBMIT_SECTION",1120),qm);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",1280),qm);
 assert.deepEqual(a.state.completedSectionTimings?.map(x=>x.durationMs),[120,160]);
 assert.equal(a.state.elapsedMs,280);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
 const free=bundle({navigation:{...pkg.paper.navigation,sectionNavigation:"free"},
    timing:{kind:"whole-paper",durationMs:500,pausePolicy:"allowed"}});
 let f=startGenericAttempt(free,"free",1000);
 f=transitionGenericAttempt(f,event("NAVIGATE",1080,{sectionIndex:1,questionIndex:0}),qm);
 f=transitionGenericAttempt(f,event("SUBMIT_ATTEMPT",1200),qm);
 assert.equal(f.state.elapsedMs,200);
 assert.deepEqual(f.state.completedSectionTimings,[]);
 assert.deepEqual(sectionScoreSummaries(f,f.result).map(x=>x.timerMs),[null,null]);
 assert.match(sectionPaceHTML(f),/Not recorded/);
 assert.doesNotThrow(()=>validateGenericStoredRecord(f));
});

test("F01: older stored attempt lacks section timer evidence, and imported false claims are rejected",()=>{
 const b=bundle({timing:{kind:"whole-paper",durationMs:500,pausePolicy:"allowed"}});
  // Locked multi-section cannot finish from Section 1. Close the first, then finish.
 let a=startGenericAttempt(b,"old",1000);
 a=transitionGenericAttempt(a,event("SUBMIT_SECTION",1030),qm);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",1075),qm);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
 const {completedSectionTimings: _old, ...oldState}=a.state;
 const prior={...a,state:oldState};
 assert.equal(sectionTimerDuration(prior.state,0),null);
 assert.deepEqual(sectionScoreSummaries(prior,prior.result).map(x=>x.timerMs),[null,null]);
 assert.doesNotThrow(()=>validateGenericStoredRecord(prior));
 const forged=structuredClone(a);
 forged.state.completedSectionTimings[0].durationMs=2000;
 assert.throws(()=>validateGenericStoredRecord(forged),/section timer exceeds|section timing history|section timing entry/i);
 const duplicate=structuredClone(a);
 duplicate.state.completedSectionTimings[1].sectionIndex=0;
 assert.throws(()=>validateGenericStoredRecord(duplicate),/section timing/i);
 const mismatched=structuredClone(a);
 mismatched.state.completedSectionTimings[0].sectionId="wrong";
 assert.throws(()=>validateGenericStoredRecord(mismatched),/section timing/i);
});

test("F09: elapsed timer, actual answer attempt-rate and global median exclude editorially unscored items",()=>{
 const b=validateExamPackage(pkg);
 let a=startGenericAttempt(b,"stats",1000);
 a=transitionGenericAttempt(a,event("TICK",1020),qm);
 a=transitionGenericAttempt(a,event("ANSWER",1020,{response:{kind:"single-choice",optionId:"a"}}),qm);
 a=transitionGenericAttempt(a,event("NAVIGATE",1020,{sectionIndex:0,questionIndex:2}),qm);
 a=transitionGenericAttempt(a,event("TICK",1060),qm);
 a=transitionGenericAttempt(a,event("ANSWER",1060,{response:{kind:"numeric-entry",value:3.5}}),qm);
 a=transitionGenericAttempt(a,event("SUBMIT_ATTEMPT",1100),qm);
 let e=attemptEvidence(a);
 assert.equal(e.timing.elapsedMs,100);
 assert.equal(e.timing.attemptedEligible,2);
 assert.equal(e.timing.eligibleQuestions,6);
 assert.equal(e.timing.attemptRate,2/6);
 assert.equal(e.timing.overallMedianAnsweredMs,50);
 assert.equal(e.timing.measuredAnswered,2);
 // Editorially excluded CGL questions are covered by existing source/review tests.
 assert.equal(e.sections.length,2);
});

test("F13: status-specific destructive intent rejects cross-type and wrong-lifecycle requests",()=>{
 const completed={recordType:"generic-attempt",finishedAt:1000};
 const unfinished={recordType:"generic-attempt",finishedAt:null};
 const learning={recordType:"learning-card"};
 assert.doesNotThrow(()=>assertDeletionAllowed(completed,"completed"));
 assert.doesNotThrow(()=>assertDeletionAllowed(unfinished,"discard-unfinished"));
 assert.doesNotThrow(()=>assertDeletionAllowed(learning,"learning-card"));
 assert.throws(()=>assertDeletionAllowed(unfinished,"completed"),/Discard/);
 assert.throws(()=>assertDeletionAllowed(completed,"discard-unfinished"),/completed/);
 assert.throws(()=>assertDeletionAllowed(learning,"completed"),/test attempt/);
 assert.throws(()=>assertDeletionAllowed(unfinished,"learning-card"),/learning card/);
 assert.throws(()=>assertDeletionAllowed(undefined,"completed"),/no longer exists/);
 assert.match(deletionWarning("discard-unfinished",2),/2 saved answers/);
 assert.match(deletionWarning("discard-unfinished",2),/not be able to resume/);
});

test("F13: archive renders completed Delete and unfinished Discard as non-interchangeable controls",()=>{
 const b=validateExamPackage(pkg);
 const started=startGenericAttempt(b,"pending",1000);
 const done=transitionGenericAttempt(startGenericAttempt(b,"done",1100),event("SUBMIT_ATTEMPT",1200),qm);
 const html=historyHTML([started,done],new Map([[b.paper.id,b]]),
   {status:"all",sort:"newest",search:""},false,false,"");
 assert.match(html,/data-delete="done"/);
 assert.match(html,/data-discard="pending"/);
 assert.doesNotMatch(html,/data-delete="pending"/);
 assert.doesNotMatch(html,/data-discard="done"/);
 assert.match(html,/Discard unfinished/);
});
