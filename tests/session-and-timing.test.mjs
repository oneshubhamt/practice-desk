// Pass37 lossless capability suite. Each lexical block preserves the original
// independent fixtures and test body, identified for assertion-level traceability.
// Imports are module namespaces to avoid collisions between former suites.
import * as __suite_dep_0 from "node:test";
import * as __suite_dep_1 from "node:assert/strict";
import * as __suite_dep_2 from "../src/engine/session.ts";
import * as __suite_dep_3 from "../src/engine/scoring.ts";
import * as __suite_dep_4 from "./fixtures/six-kinds.mjs";
import * as __suite_dep_5 from "../src/domain/integrity.ts";
import * as __suite_dep_6 from "../src/app/exam-package.ts";
import * as __suite_dep_7 from "../src/app/generic-ui.ts";
import * as __suite_dep_8 from "../src/engine/score-ceiling.ts";
import * as __suite_dep_9 from "../src/learning/attempt-evidence.ts";
import * as __suite_dep_10 from "../src/history/frozen.ts";
import * as __suite_dep_11 from "../src/history/deletion-policy.ts";
import * as __suite_dep_12 from "../src/app/history-page.ts";
import * as __suite_dep_13 from "../src/app/result-presentation.ts";

// === Legacy suite: tests/session-and-scoring-basics.test.mjs — 5 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const startSession = __suite_dep_2["startSession"];
const transition = __suite_dep_2["transition"];
const rebaseSession = __suite_dep_2["rebaseSession"];
const scoreAttempt = __suite_dep_3["scoreAttempt"];
const q = (id, kind = "single-choice", status = "verified") => ({
  id, content: { kind, prompt: "Test", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] },
  editorial: { status },
});
const paper = (timing = { kind: "sectional", sectionLimits: [{ sectionId: "s1", durationMs: 1000 }, { sectionId: "s2", durationMs: 2000 }], allowEarlySubmit: true, pausePolicy: "allowed" }) => ({
  id: "pr", paperId: "p", answerKeyRevisionId: "key", sections: [
    { id: "s1", questionRevisionIds: ["q1"] }, { id: "s2", questionRevisionIds: ["q2"] },
  ], timing, navigation: { questionNavigation: "free", sectionNavigation: "sequential-locked", allowFlagging: true },
  scoring: { defaultRule: { correctMarks: 2, incorrectMarks: -0.5, unansweredMarks: 0 } },
});
const key = { id: "key", paperId: "p", entries: [
  { questionRevisionId: "q1", answer: { kind: "single-choice", optionId: "a" } },
  { questionRevisionId: "q2", answer: { kind: "single-choice", optionId: "b" } },
] };
const evt = (type, nowMs, extra = {}) => ({ type, nowMs, ...extra });

test("visibility change commits the preceding visible interval exactly once", () => {
  const p = paper({ kind: "whole-paper", durationMs: 100000, pausePolicy: "allowed" });
  let s = startSession(p, 0);
  s = transition(p, s, evt("VISIBILITY", 12000, { visible: false }));
  assert.equal(s.responses[0].timeSpentMs, 12000);
  s = transition(p, s, evt("TICK", 15000));
  assert.equal(s.responses[0].timeSpentMs, 12000);
  assert.equal(s.elapsedMs, 15000);
  s = transition(p, s, evt("VISIBILITY", 15000, { visible: true }));
  s = transition(p, s, evt("TICK", 16000));
  assert.equal(s.responses[0].timeSpentMs, 13000);
});

test("overshoot splits sectional timing and closes sections without double counting", () => {
  const p = paper();
  const s = transition(p, startSession(p, 0), evt("TICK", 5000));
  assert.equal(s.status, "completed");
  assert.equal(s.elapsedMs, 3000);
  assert.deepEqual(s.completedSections, [0, 1]);
  assert.equal(s.responses.find(r => r.questionRevisionId === "q1").timeSpentMs, 1000);
  assert.equal(s.responses.find(r => r.questionRevisionId === "q2").timeSpentMs, 2000);
});

test("pause freezes countdown; resume rebases; completion is terminal", () => {
  const p = paper({ kind: "whole-paper", durationMs: 5000, pausePolicy: "allowed" });
  let s = transition(p, startSession(p, 0), evt("PAUSE", 1000));
  s = transition(p, s, evt("TICK", 4000));
  assert.equal(s.elapsedMs, 1000);
  s = transition(p, s, evt("RESUME", 4000));
  s = transition(p, s, evt("TICK", 8000));
  assert.equal(s.status, "completed");
  assert.equal(s.elapsedMs, 5000);
  assert.equal(transition(p, s, evt("ANSWER", 9000, { response: { kind: "single-choice", optionId: "a" } })).responses.length, 1);
  assert.equal(rebaseSession(s, 3).clockMs, 3);
});

test("locked navigation, early section submission and answer clearing", () => {
  const p = paper();
  let s = startSession(p, 0);
  s = transition(p, s, evt("NAVIGATE", 1, { sectionIndex: 1, questionIndex: 0 }));
  assert.equal(s.sectionIndex, 0);
  s = transition(p, s, evt("ANSWER", 2, { response: { kind: "single-choice", optionId: "a" } }));
  s = transition(p, s, evt("CLEAR", 3));
  assert.equal(s.responses[0].response, undefined);
  s = transition(p, s, evt("SUBMIT_SECTION", 4));
  assert.equal(s.sectionIndex, 1);
  assert.deepEqual(s.completedSections, [0]);
});

test("scoring uses explicit rules and excludes invalid questions", () => {
  const p = paper();
  const result = scoreAttempt(p, key, [q("q1"), q("q2", "single-choice", "invalid")], [
    { questionRevisionId: "q1", response: { kind: "single-choice", optionId: "b" } },
    { questionRevisionId: "q2", response: { kind: "single-choice", optionId: "b" } },
  ], "2026-10-28T00:00:00Z");
  assert.equal(result.snapshot.earnedMarks, -0.5);
  assert.equal(result.snapshot.excludedCount, 1);
  assert.equal(result.snapshot.incorrectCount, 1);
});
}

// === Legacy suite: tests/session-property-model.test.mjs — 4 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const startSession = __suite_dep_2["startSession"];
const transition = __suite_dep_2["transition"];
const rebaseSession = __suite_dep_2["rebaseSession"];
const validateSectionTimingEvidence = __suite_dep_2["validateSectionTimingEvidence"];
function rng(seed){
 let x=seed>>>0;
 return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};
}
const base=(timing,sectionCount=1)=>({
 id:"session-model",paperId:"model",answerKeyRevisionId:"model-key",
 sections:Array.from({length:sectionCount},(_,i)=>({
  id:"s"+i,questionRevisionIds:["q"+i+"a","q"+i+"b","q"+i+"c"]})),
 timing,
 navigation:{questionNavigation:"free",sectionNavigation:sectionCount>1?"sequential-locked":"free",
  allowFlagging:true,allowReview:true},
 scoring:{defaultRule:{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0}}
});
const event=(type,nowMs,more={})=>({type,nowMs,...more});

test("seeded whole-paper state model conserves elapsed, foreground and response exposure",()=>{
 for(let seed=1;seed<=160;seed++){
  const random=rng(0x36beef^seed);
  const deadline=1000+random(30000);
  const paper=base({kind:"whole-paper",durationMs:deadline,pausePolicy:"allowed"});
  let now=1000000,s=startSession(paper,now);
  // Independent reference deliberately tracks only time/status/visibility. It
  // does not reuse checkpoint(), transition(), or session answer events.
  let reference={elapsed:0,foreground:0,clock:now,status:"running",visible:true};
  const names=["TICK","VISIBILITY","PAUSE","RESUME","ANSWER","CLEAR","FLAG",
   "NAVIGATE","SUBMIT_ATTEMPT"];
  for(let step=0;step<120;step++){
   const name=names[random(names.length)];
   // Includes rollback, repeated timestamps, large jumps and post-terminal calls.
   const movement=random(11)===0?-(random(2500)+1):random(1800);
   now+=movement;
   const args=name==="VISIBILITY"?{visible:!!random(2)}:
    name==="ANSWER"?{response:{kind:"single-choice",optionId:random(2)?"a":"b"}}:
    name==="FLAG"?{flagged:!!random(2)}:
    name==="NAVIGATE"?{sectionIndex:0,questionIndex:random(3)}:{};
   if(reference.status==="running"&&now>=reference.clock){
    const spent=Math.min(now-reference.clock,deadline-reference.elapsed);
    reference.elapsed+=spent;
    if(reference.visible)reference.foreground+=spent;
    if(reference.elapsed>=deadline)reference.status="completed";
   }
   reference.clock=now;
   if(name==="VISIBILITY")reference.visible=args.visible;
   else if(reference.status==="running"&&name==="PAUSE")reference.status="paused";
   else if(reference.status==="paused"&&name==="RESUME")reference.status="running";
   else if(reference.status==="running"&&name==="SUBMIT_ATTEMPT")reference.status="completed";
   s=transition(paper,s,event(name,now,args));
   const label="seed="+seed+" event="+step+" "+name+" clock="+now;
   assert.equal(s.status,reference.status,label+" status");
   assert.equal(s.elapsedMs,reference.elapsed,label+" elapsed");
   assert.equal(s.foregroundMs,reference.foreground,label+" foreground");
   assert.equal(s.clockMs,reference.clock,label+" rebase");
   assert.equal(s.visible,reference.visible,label+" visibility");
   const time=s.responses.reduce((sum,r)=>sum+r.timeSpentMs,0);
   assert.equal(time,s.foregroundMs,label+" time assigned exactly once");
   assert.ok(s.elapsedMs>=s.foregroundMs&&s.foregroundMs>=0,label+" accounting bounds");
   assert.ok(s.elapsedMs<=deadline,label+" deadline upper bound");
   assert.ok(s.responses.every(r=>r.timeSpentMs>=0&&r.answerChangeCount>=0),label+" per-item evidence");
   assert.ok(s.questionVisits?.every(v=>v.count>=1),label+" visits always positive");
   validateSectionTimingEvidence(paper,s);
  }
  const restored=rebaseSession(s,2000000+seed);
  assert.equal(restored.clockMs,2000000+seed);
  assert.equal(restored.elapsedMs,s.elapsedMs);
  assert.deepEqual(restored.responses,s.responses);
 }
});

test("seeded sectional automatic overshoot splits exact limits and closes each section once",()=>{
 for(let seed=1;seed<=100;seed++){
  const random=rng(0x36cafe^seed);
  const limits=Array.from({length:2+random(4)},()=>1+random(10000));
  const paper=base({kind:"sectional",transition:"automatic",allowEarlySubmit:true,
   pausePolicy:"allowed",sectionLimits:limits.map((durationMs,i)=>({sectionId:"s"+i,durationMs}))},limits.length);
  const excess=1+random(100000);
  const s=transition(paper,startSession(paper,1000),event("TICK",1000+limits.reduce((a,b)=>a+b,0)+excess));
  const label="seed="+seed+" limits="+limits.join(",");
  assert.equal(s.status,"completed",label);
  assert.equal(s.elapsedMs,limits.reduce((a,b)=>a+b,0),label);
  assert.equal(s.foregroundMs,s.elapsedMs,label);
  assert.deepEqual(s.completedSections,limits.map((_,i)=>i),label);
  assert.deepEqual(s.completedSectionTimings?.map(x=>x.durationMs),limits,label+" durations");
  assert.ok(s.completedSectionTimings?.every(x=>x.reason==="time-expired"),label+" expiry reasons");
  const spent=s.responses.reduce((sum,r)=>sum+r.timeSpentMs,0);
  assert.equal(spent,s.elapsedMs,label+" single attribution");
  validateSectionTimingEvidence(paper,s);
  const late=transition(paper,s,event("TICK",20000000));
  assert.equal(late.elapsedMs,s.elapsedMs,label+" terminal no extra elapsed");
 }
});

test("manual expiry excludes waiting time, prevents edits, and records exact section closure",()=>{
 const first=250,second=400;
 const paper=base({kind:"sectional",transition:"manual",allowEarlySubmit:false,
  pausePolicy:"forbidden",sectionLimits:[{sectionId:"s0",durationMs:first},
   {sectionId:"s1",durationMs:second}]},2);
 let s=startSession(paper,5000);
 s=transition(paper,s,event("TICK",5000+first+9999));
 assert.equal(s.status,"section-expired");
 assert.equal(s.elapsedMs,first);
 for(const e of [event("ANSWER",16000,{response:{kind:"single-choice",optionId:"a"}}),
   event("NAVIGATE",20000,{sectionIndex:1,questionIndex:0}),
   event("PAUSE",24000),event("TICK",25000)]){
  const before=s;
  s=transition(paper,s,e);
  assert.equal(s.status,"section-expired");
  assert.equal(s.elapsedMs,before.elapsedMs);
  assert.deepEqual(s.responses,before.responses);
 }
 s=transition(paper,s,event("SUBMIT_SECTION",30000));
 assert.equal(s.status,"running");
 assert.equal(s.sectionIndex,1);
 assert.equal(s.elapsedMs,first);
 assert.deepEqual(s.completedSectionTimings?.map(x=>x.durationMs),[first]);
 s=transition(paper,s,event("TICK",30000+second+40000));
 assert.equal(s.status,"section-expired");
 assert.equal(s.elapsedMs,first+second);
 s=transition(paper,s,event("SUBMIT_SECTION",80000));
 assert.equal(s.status,"completed");
 assert.equal(s.elapsedMs,first+second);
 assert.deepEqual(s.completedSectionTimings?.map(x=>x.durationMs),[first,second]);
 validateSectionTimingEvidence(paper,s);
 assert.equal(transition(paper,s,event("ANSWER",90000,{response:{kind:"single-choice",optionId:"a"}})).elapsedMs,first+second);
});

test("section evidence rejects fabricated duration, expiry reason, identity and totals",()=>{
 const paper=base({kind:"sectional",transition:"automatic",allowEarlySubmit:true,
  pausePolicy:"allowed",sectionLimits:[{sectionId:"s0",durationMs:100},{sectionId:"s1",durationMs:150}]},2);
 const s=transition(paper,startSession(paper,0),event("TICK",1000));
 assert.doesNotThrow(()=>validateSectionTimingEvidence(paper,s));
 const modifications=[
  x=>{x.completedSectionTimings[0].durationMs=101;},
  x=>{x.completedSectionTimings[0].sectionId="forged";},
  x=>{x.completedSectionTimings[0].reason="submitted";x.completedSectionTimings[1].reason="time-expired";x.completedSectionTimings[1].durationMs=149;},
  x=>{x.elapsedMs=10;},
  x=>{x.completedSectionTimings.push(x.completedSectionTimings[0]);},
 ];
 for(const mutate of modifications){
  const wrong=structuredClone(s);
  mutate(wrong);
  assert.throws(()=>validateSectionTimingEvidence(paper,wrong));
 }
});
}

// === Legacy suite: tests/session-timing-and-deletion.test.mjs — 8 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const pkg = __suite_dep_4["pkg"];
const questions = __suite_dep_4["questions"];
const paperRevisionHash = __suite_dep_5["paperRevisionHash"];
const startSession = __suite_dep_2["startSession"];
const transition = __suite_dep_2["transition"];
const sectionTimerDuration = __suite_dep_2["sectionTimerDuration"];
const validateSectionTimingEvidence = __suite_dep_2["validateSectionTimingEvidence"];
const validateExamPackage = __suite_dep_6["validateExamPackage"];
const startGenericAttempt = __suite_dep_6["startGenericAttempt"];
const transitionGenericAttempt = __suite_dep_6["transitionGenericAttempt"];
const validateGenericStoredRecord = __suite_dep_7["validateGenericStoredRecord"];
const sectionScoreSummaries = __suite_dep_8["sectionScoreSummaries"];
const attemptEvidence = __suite_dep_9["attemptEvidence"];
const restoreSession = __suite_dep_10["restoreSession"];
const assertDeletionAllowed = __suite_dep_11["assertDeletionAllowed"];
const deletionWarning = __suite_dep_11["deletionWarning"];
const historyHTML = __suite_dep_12["historyHTML"];
const sectionPaceHTML = __suite_dep_13["sectionPaceHTML"];
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
 assert.match(sectionPaceHTML(attempt),/Section time: 00:01/);
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
}
