// Pass37 lossless capability suite. Each lexical block preserves the original
// independent fixtures and test body, identified for assertion-level traceability.
// Imports are module namespaces to avoid collisions between former suites.
import * as __suite_dep_0 from "node:test";
import * as __suite_dep_1 from "node:assert/strict";
import * as __suite_dep_2 from "./fixtures/six-kinds.mjs";
import * as __suite_dep_3 from "../src/app/exam-package.ts";
import * as __generic_attempt from "../src/engine/generic-attempt.ts";
import * as __suite_dep_4 from "../src/learning/attempt-evidence.ts";
import * as __suite_dep_5 from "../src/learning/question-analytics.ts";
import * as __suite_dep_6 from "../src/app/history-score.ts";
import * as __suite_dep_7 from "../src/engine/session.ts";
import * as __suite_dep_8 from "../src/domain/integrity.ts";
import * as __suite_dep_9_stored_record_validator from "../src/app/stored-record-validator.ts";
import * as __suite_dep_9_exam_view from "../src/app/exam-view.ts";
import * as __suite_dep_10 from "../src/app/result-presentation.ts";
import * as __suite_dep_11 from "../src/learning/fsrs-scheduler-adapter.ts";
import * as __suite_dep_12 from "../src/learning/learning.ts";
import * as __suite_dep_13 from "../src/history/backup.ts";
import * as __suite_dep_14 from "../src/learning/revision-test.ts";
import * as __suite_dep_15 from "../src/engine/scoring.ts";
import * as __suite_dep_16 from "../src/domain/hash.ts";
import * as __suite_dep_17 from "../src/learning/revision-settings.ts";
import * as __suite_dep_18 from "../src/learning/fsrs-optimizer.ts";
import {revisionInventory as independentRevisionInventory} from "../src/learning/revision-selection.ts";
import * as __suite_dep_19 from "ts-fsrs/models/fsrs-7";
import * as __suite_dep_20 from "../tools/fsrs-optimizer/optimizer-pipeline.mjs";
import * as __suite_dep_21 from "../tools/fsrs-optimizer/optimizer-policy.mjs";
import * as __suite_dep_22 from "node:fs/promises";

// === Consolidated coverage: tests/analytics-property-model.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const pkg = __suite_dep_2["pkg"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const attemptEvidence = __suite_dep_4["attemptEvidence"];
const evidenceProgression = __suite_dep_4["evidenceProgression"];
const questionSpeed = __suite_dep_5["questionSpeed"];
const studySuggestions = __suite_dep_5["studySuggestions"];
const frozenScoreSummary = __suite_dep_6["frozenScoreSummary"];
function rng(seed){let x=seed>>>0;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};}
const bundle=validateExamPackage(pkg);
const lookup=new Map(bundle.questions.map(q=>[q.id,q]));
const good=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
 {kind:"free-response",text:"An explicit manual self-assessment is required."}
];
const bad=[
 {kind:"single-choice",optionId:"b"},
 {kind:"multiple-select",optionIds:["x","y"]},
 {kind:"numeric-entry",value:4},
 {kind:"true-false",value:false},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r2"},{leftId:"l2",rightId:"r1"}]},
 good[5]
];

test("seeded evidence classifications require independent sample size and question diversity",()=>{
 for(let seed=1;seed<=300;seed++){
  const random=rng(0x36ed01^seed);
  const attempts=random(8),answered=random(51),correct=random(answered+1),
   distinctQuestions=random(25);
  const row={examId:"exam-"+random(4),label:"Topic",answeredAttempts:attempts,
   distinctAnsweredQuestions:distinctQuestions,answered,correct};
  const result=evidenceProgression([row])[0];
  const accuracy=answered?correct/answered:null;
  const expected=attempts<2||answered<10?"insufficient":distinctQuestions<5?
   "repeated-items":accuracy>=0.8?"consistently-accurate":accuracy>=0.6?
   "moderate-observed":"mixed";
  assert.equal(result.label,expected,"seed="+seed);
  assert.equal(result.accuracy,accuracy,"seed="+seed);
  assert.equal(result.attempts,attempts,"seed="+seed);
  assert.equal(result.distinctQuestions,distinctQuestions,"seed="+seed);
  assert.equal(result.answered,answered,"seed="+seed);
 }
});

test("seeded six-kind frozen analytics retain denominators, pending essays and honest speed evidence",()=>{
 for(let seed=1;seed<=90;seed++){
  const random=rng(0x36a4af^seed);
  let attempt=startGenericAttempt(bundle,"analytics-"+seed,1000),now=1000;
  const selections=Array.from({length:6},(_,i)=>i===5?random(2):random(3));
  for(let i=0;i<selections.length;i++){
   const section=i<3?0:1,questionIndex=i%3;
   attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:++now,
    sectionIndex:section,questionIndex},lookup);
   if(i===5?selections[i]===1:selections[i]!==2){
    attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:++now,
     response:selections[i]===0?bad[i]:good[i]},lookup);
   }
   now+=random(700)+1;
  }
  attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:++now},lookup);
  const evidence=attemptEvidence(attempt);
  assert.ok(evidence,"seed="+seed+" finished attempt has evidence");
  const score=attempt.result.snapshot;
  const correct=selections.slice(0,5).filter(x=>x===1).length;
  const wrong=selections.slice(0,5).filter(x=>x===0).length;
  const blank=5-correct-wrong;
  assert.equal(score.correctCount,correct,"seed="+seed+" correct");
  assert.equal(score.incorrectCount,wrong,"seed="+seed+" wrong");
  assert.equal(score.unansweredCount,blank+(selections[5]===1?0:1),
   "seed="+seed+" missing including essay");
  const summary=frozenScoreSummary(attempt);
  assert.equal(summary.maximum,10,"seed="+seed+" essay not in automated denominator");
  assert.equal(summary.earned,score.earnedMarks,"seed="+seed+" earned is frozen");
  assert.equal(summary.decimals,2,"seed="+seed+" display precision");
  assert.equal(evidence.sections.reduce((n,s)=>n+s.total,0),6,"seed="+seed+" all questions");
  assert.equal(evidence.sections.reduce((n,s)=>n+s.answered,0),correct+wrong,
   "seed="+seed+" only scored candidates counted as answered");
  assert.equal(evidence.sections.reduce((n,s)=>n+s.pending,0),selections[5]===1?1:0);
  assert.equal(evidence.sections.reduce((n,s)=>n+s.unanswered,0),
   blank+(selections[5]===1?0:1));
  assert.equal(evidence.timing.eligibleQuestions,6);
  assert.equal(evidence.timing.attemptedEligible,correct+wrong+(selections[5]===1?1:0));
  assert.equal(evidence.speed.classified,0,"each section has at most three scored items");
  assert.equal(evidence.opportunity.countWrong,wrong);
  assert.equal(evidence.opportunity.countSkipped,blank+(selections[5]===1?0:1));
  assert.ok(evidence.timing.questionMeasuredMs<=evidence.timing.elapsedMs);
  for(let i=0;i<5;i++)assert.equal(questionSpeed(attempt,bundle.questions[i].id),"Not classified");
  const suggestions=studySuggestions(attempt);
  assert.ok(suggestions.length>=1&&suggestions.length<=3);
  assert.ok(!suggestions.some(text=>/predicted rank|proven cause|will achieve mastery/i.test(text)));
 }
});
}

// === Consolidated coverage: tests/analytics-visits-and-speed-evidence.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const sixKinds = __suite_dep_2["pkg"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const startSession = __suite_dep_7["startSession"];
const transition = __suite_dep_7["transition"];
const paperRevisionHash = __suite_dep_8["paperRevisionHash"];
const questionRevisionHash = __suite_dep_8["questionRevisionHash"];
const validateGenericStoredRecord = __suite_dep_9_stored_record_validator["validateGenericStoredRecord"];
const questionSpeed = __suite_dep_5["questionSpeed"];
const isAuditQuestion = __suite_dep_5["isAuditQuestion"];
const longestQuestionExposure = __suite_dep_5["longestQuestionExposure"];
const studySuggestions = __suite_dep_5["studySuggestions"];
const reviewMatch = __suite_dep_10["reviewMatch"];
const reviewFiltersHTML = __suite_dep_10["reviewFiltersHTML"];
const timingLedgerHTML = __suite_dep_10["timingLedgerHTML"];
const questionCoachingHTML = __suite_dep_10["questionCoachingHTML"];
const base=structuredClone(sixKinds);
const updated=base.questions.map((q,i)=>{
 if(i!==1)return q;
 const changed={...q,editorial:{status:"caution",notes:"Review the original item wording"}};
 return {...changed,contentHash:questionRevisionHash(changed)};
});
const originalPaper={...base.paper,id:"mixed-pass14",sections:[
 {id:"all",title:"Mixed clinical examination",questionRevisionIds:base.questions.map(q=>q.id)}]};
const bundle=validateExamPackage({...base,questions:updated,
 paper:{...originalPaper,contentHash:paperRevisionHash(originalPaper)}});
const map=new Map(bundle.questions.map(q=>[q.id,q]));
const id=n=>"rev-"+n;
const values=[
 {kind:"single-choice",optionId:"b"},
 {kind:"multiple-select",optionIds:["x","y"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:false},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
];
function sample(overrides={},written=false){
 let a=startGenericAttempt(bundle,"mixed",1000),now=1000;
 const times=[100,1000,1000,1000,6000];
 for(let i=0;i<5;i++){
   a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:now+1,response:overrides[i]??values[i]},map);
   now+=times[i];
   a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:now,sectionIndex:0,questionIndex:i+1},map);
 }
 // A real revisit of q0 must not invent answer changes or extra exposure.
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:now,sectionIndex:0,questionIndex:0},map);
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:now,sectionIndex:0,questionIndex:5},map);
 if(written)a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:now,
    response:{kind:"free-response",text:"A short self-assessed explanation"}},map);
 return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:now},map);
}
test("visits reflect cursor entries, never answering, flags, repeated cursor or clock ticks",()=>{
 let s=startSession(bundle.paper,1000);
 assert.deepEqual(s.questionVisits,[{questionRevisionId:id(0),count:1}]);
 s=transition(bundle.paper,s,{type:"TICK",nowMs:1010});
 s=transition(bundle.paper,s,{type:"ANSWER",nowMs:1020,response:values[0]});
 s=transition(bundle.paper,s,{type:"FLAG",nowMs:1030,flagged:true});
 s=transition(bundle.paper,s,{type:"NAVIGATE",nowMs:1040,sectionIndex:0,questionIndex:0});
 assert.equal(s.questionVisits.find(x=>x.questionRevisionId===id(0)).count,1);
 s=transition(bundle.paper,s,{type:"NAVIGATE",nowMs:1050,sectionIndex:0,questionIndex:1});
 s=transition(bundle.paper,s,{type:"NAVIGATE",nowMs:1060,sectionIndex:0,questionIndex:0});
 assert.equal(s.questionVisits.find(x=>x.questionRevisionId===id(0)).count,2);
 assert.equal(s.questionVisits.find(x=>x.questionRevisionId===id(1)).count,1);
});
test("section auto-advance records a new section's first question once",()=>{
 const source=bundle.paper;
 const modified={...source,sections:[
   {id:"first",title:"First",questionRevisionIds:[id(0),id(1)]},
   {id:"second",title:"Second",questionRevisionIds:[id(2),id(3),id(4),id(5)]}],
   timing:{kind:"sectional",sectionLimits:[{sectionId:"first",durationMs:1000},
    {sectionId:"second",durationMs:1000}],allowEarlySubmit:true,pausePolicy:"forbidden"},
   navigation:{questionNavigation:"free",sectionNavigation:"sequential-locked",allowFlagging:true,allowReview:true}};
 const done=transition(modified,startSession(modified,0),{type:"TICK",nowMs:2500});
 assert.equal(done.status,"completed");
 assert.equal(done.questionVisits.find(x=>x.questionRevisionId===id(0)).count,1);
 assert.equal(done.questionVisits.find(x=>x.questionRevisionId===id(2)).count,1);
});
test("generic six-kind frozen timing classifications, accurate filters, longest links and conservative suggestions",()=>{
 const a=sample();
 validateGenericStoredRecord(a);
 const verdicts=Object.fromEntries(a.result.items.map(x=>[x.questionRevisionId,x.verdict]));
 assert.deepEqual([verdicts[id(0)],verdicts[id(1)],verdicts[id(2)],verdicts[id(3)],verdicts[id(4)],verdicts[id(5)]],
  ["incorrect","incorrect","correct","incorrect","correct","unanswered"]);
 assert.equal(questionSpeed(a,id(0)),"Fast");
 assert.equal(questionSpeed(a,id(1)),"Typical");
 assert.equal(questionSpeed(a,id(4)),"Slow");
 assert.equal(questionSpeed(a,id(5)),"Not classified");
 assert.equal(isAuditQuestion(a,id(1)),true);
 assert.equal(isAuditQuestion(a,id(0)),false);
 const matching=(filter)=>a.result.items.filter(item=>reviewMatch(a,item,filter)).map(item=>item.questionRevisionId);
 assert.deepEqual(matching("audit"),[id(1)]);
 assert.deepEqual(matching("fastwrong"),[id(0)]);
 assert.deepEqual(matching("typicalwrong"),[id(1),id(3)]);
 assert.deepEqual(matching("slowwrong"),[]);
 assert.equal(longestQuestionExposure(a)[0].id,id(4));
 assert.equal(longestQuestionExposure(a).length,5);
 assert.equal(longestQuestionExposure(a)[0].milliseconds,6000);
 assert.deepEqual(a.state.questionVisits.find(x=>x.questionRevisionId===id(0)).count,2);
 assert.ok(studySuggestions(a).length>=1&&studySuggestions(a).length<=3);
 assert.match(studySuggestions(a)[0],/3 incorrect among 5 scored responses/);
 const html=timingLedgerHTML(a,true);
 assert.match(html,/<th>Speed<\/th><th>Visits<\/th>/);
 assert.match(html,/Typical/);assert.match(html,/Not classified/);
 assert.match(html,/Review question 1/);
 const overview=questionCoachingHTML(a);
 assert.match(overview,/Question-speed insights/);
 assert.match(overview,/Longest question visits/);
 assert.match(overview,/What to work on next/);
 assert.match(overview,/data-ledger-q="rev-4"/);
 const filters=reviewFiltersHTML("typicalwrong");
 assert.match(filters,/value="audit"/);assert.match(filters,/value="typicalwrong" selected/);
});
test("missing visit evidence is rejected; insufficient speed samples remain conservative",()=>{
 const a=sample();
 const missing=structuredClone(a);
 delete missing.state.questionVisits;
 assert.throws(()=>validateGenericStoredRecord(missing),/timing evidence|visit history/i);
 const fewer=validateExamPackage(sixKinds);
 const qmap=new Map(fewer.questions.map(q=>[q.id,q]));
 let limited=startGenericAttempt(fewer,"small",1000);
 limited=transitionGenericAttempt(limited,{type:"ANSWER",nowMs:1010,response:values[0]},qmap);
 limited=transitionGenericAttempt(limited,{type:"SUBMIT_ATTEMPT",nowMs:1400},qmap);
 assert.equal(questionSpeed(limited,id(0)),"Not classified");
 assert.deepEqual(limited.result.items.filter(x=>reviewMatch(limited,x,"typicalwrong")),[]);
 const tampered=structuredClone(a);
 tampered.state.questionVisits.push({questionRevisionId:"rev-0",count:10});
 assert.throws(()=>validateGenericStoredRecord(tampered),/visit history/);
 const zero=transitionGenericAttempt(startGenericAttempt(bundle,"zero",1000),
   {type:"SUBMIT_ATTEMPT",nowMs:1000},map);
 assert.equal(longestQuestionExposure(zero).length,0);
 assert.match(studySuggestions(zero)[0],/No scored answers/);
});

test("negative marking, manual-pending and excluded questions stay separate from pace classification",()=>{
 const negative=sample({
   2:{kind:"numeric-entry",value:9},
   4:{kind:"matching",pairs:[{leftId:"l1",rightId:"r2"},{leftId:"l2",rightId:"r1"}]}
 });
 assert.ok(negative.result.snapshot.earnedMarks<0,"Negative frozen exam marks remain negative");
 assert.equal(questionSpeed(negative,id(0)),"Fast");
 assert.ok(studySuggestions(negative).every(x=>!/(guarantee|careless|must improve|predicted)/i.test(x)));
 const submitted=sample({},true);
 assert.equal(submitted.result.items.at(-1).verdict,"pending");
 assert.equal(questionSpeed(submitted,id(5)),"Not classified");
 assert.equal(reviewMatch(submitted,submitted.result.items.at(-1),"pending"),true);
 const copy=structuredClone(bundle);
 const original=copy.questions[0],bad={...original,editorial:{...original.editorial,
   status:"invalid",notes:"Source item cannot be scored"}};
 copy.questions[0]={...bad,contentHash:questionRevisionHash(bad)};
 const invalid=validateExamPackage(copy);
 const m=new Map(invalid.questions.map(q=>[q.id,q]));
 let a=startGenericAttempt(invalid,"invalid",1000);
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1001,response:{kind:"single-choice",optionId:"b"}},m);
 a=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1600},m);
 assert.equal(a.result.items[0].verdict,"excluded");
 assert.equal(questionSpeed(a,id(0)),"Not classified");
 assert.equal(reviewMatch(a,a.result.items[0],"audit"),true);
 assert.equal(reviewMatch(a,a.result.items[0],"fastwrong"),false);
});
}

// === Consolidated coverage: tests/learning-fsrs-and-cards.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const DefaultScheduler = __suite_dep_11["createRevisionScheduler"];
const Rating = {Again:1,Hard:2,Good:3,Easy:4};
const pkg = __suite_dep_2["pkg"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const addLearningCard = __suite_dep_12["addLearningCard"];
const validateLearningCard = __suite_dep_12["validateLearningCard"];
const scheduledCard = __suite_dep_12["scheduledCard"];
const inspectLearningCard = __suite_dep_12["inspectLearningCard"];
const previewLearningCard = __suite_dep_12["previewLearningCard"];
const rateLearningCard = __suite_dep_12["rateLearningCard"];
const topicMetrics = __suite_dep_12["topicMetrics"];
const comparableTrends = __suite_dep_12["comparableTrends"];
const validateGenericStoredRecord = __suite_dep_9_stored_record_validator["validateGenericStoredRecord"];
const makeBackup = __suite_dep_13["makeBackup"];
const verifyBackup = __suite_dep_13["verifyBackup"];
const bundle=validateExamPackage(pkg);
const lookup=new Map(bundle.questions.map(q=>[q.id,q]));
function complete(id,answer=false){
 let a=startGenericAttempt(bundle,id,1000);
 if(answer)a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1010,
  response:{kind:"single-choice",optionId:bundle.questions[0].content.options[0].id}},lookup);
 return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1020},lookup);
}
test("learning cards are created from completed immutable answers, not active test keys",()=>{
 const finished=complete("first");
 assert.throws(()=>addLearningCard(startGenericAttempt(bundle,"active",1000),bundle.questions[0].id,
  new Date(1000).toISOString()),/only after submission/);
 const item=addLearningCard(finished,bundle.questions[0].id,new Date(1030).toISOString());
 assert.equal(item.recordType,"learning-card");
 assert.equal(item.reviews.length,0);
 assert.equal(validateLearningCard(item),item);
 assert.equal(validateGenericStoredRecord(item),item);
 assert.deepEqual(item.answer,finished.frozen.key.entries[0].answer);
 assert.throws(()=>validateLearningCard({...item,id:"learning-card:bad"}),/identity/);
 assert.throws(()=>validateLearningCard({...item,answer:{kind:"single-choice",optionId:"fake"}}),/unknown option/);
});
test("stable ts-fsrs 6.0.0 runs explicit FSRS-7 with evidence-rich replay, previews and retrievability",async()=>{
 const scheduler=await DefaultScheduler();
 assert.equal(scheduler.provider,"ts-fsrs@6.0.0/FSRS-7");
 assert.equal(scheduler.configuration.model,"FSRS-7");
 assert.equal(scheduler.configuration.packageVersion,"6.0.0");
 assert.equal(scheduler.configuration.policy.kind,"fixed");
 assert.equal(scheduler.configuration.policy.desiredRetention,0.9);
 assert.equal(scheduler.configuration.enableShortTerm,true);
 assert.deepEqual(scheduler.configuration.learningSteps,["1m","10m"]);
 assert.deepEqual(scheduler.configuration.relearningSteps,["10m"]);
 assert.equal(scheduler.configuration.allowModelOverride,true);
 assert.equal(scheduler.configuration.enableFuzz,true);
 assert.equal(scheduler.configuration.leechAction,"remediate");
 const item=addLearningCard(complete("reviewer"),bundle.questions[0].id,new Date(1030).toISOString());
 assert.equal(item.revisionDisposition,"active");
 const initial=scheduledCard(item,scheduler);
 assert.equal(initial.dueAt.getTime(),1030);assert.equal(initial.scheduleStatus,"new");
 assert.equal(initial.stability,0);assert.equal(initial.stabilityFast,0);
 const previews=previewLearningCard(item,new Date(2030).toISOString(),scheduler);
 assert.deepEqual(previews.map(x=>x.rating),[1,2,3,4]);
 assert.ok(previews.every(x=>x.dueAt.getTime()>=2030&&x.scheduledDays>=0));
 assert.ok(previews.some(x=>x.scheduledDays>0&&x.scheduledDays<1));
 const graded=rateLearningCard(item,Rating.Good,new Date(2030).toISOString(),725,scheduler);
 assert.equal(graded.reviews[0].rating,Rating.Good);assert.equal(graded.reviews[0].durationMs,725);
 assert.equal(graded.reviews[0].state,"new");
 const next=scheduledCard(graded,scheduler);assert.equal(next.reps,1);assert.ok(next.stability>0);assert.ok(next.stabilityFast>0);
 const inspected=inspectLearningCard(graded,new Date(2030+12*60*60*1000).toISOString(),scheduler);
 assert.ok(inspected.retrievability!==null&&inspected.retrievability>0&&inspected.retrievability<=1);
 const reloaded=validateLearningCard(JSON.parse(JSON.stringify(graded))),replayed=scheduledCard(reloaded,await DefaultScheduler());
 assert.equal(replayed.dueAt.getTime(),next.dueAt.getTime());assert.equal(replayed.stabilityFast,next.stabilityFast);
 assert.throws(()=>scheduler.replay(item.id,item.createdAt,[
  {at:new Date(3030).toISOString(),rating:Rating.Good,durationMs:100,state:"new"},
  {at:new Date(2500).toISOString(),rating:Rating.Good,durationMs:100,state:"learning"}
 ]),/chronological/);
 assert.throws(()=>rateLearningCard(graded,Rating.Again,new Date(1500).toISOString(),20,scheduler),/monotonic/);
});
test("FSRS policy changes reschedule replayed history without mutating review evidence",async()=>{
 const source=await DefaultScheduler({policy:{kind:"fixed",desiredRetention:0.9},enableFuzz:false});
 let card=addLearningCard(complete("policy-replay"),bundle.questions[0].id,new Date(1030).toISOString());
 for(let i=0;i<8&&scheduledCard(card,source).state!=="review";i++){
  const current=scheduledCard(card,source),last=Date.parse(card.reviews.at(-1)?.at??card.createdAt);
  card=rateLearningCard(card,Rating.Good,new Date(Math.max(last+1,current.dueAt.getTime()+1)).toISOString(),400,source);
 }
 assert.equal(scheduledCard(card,source).state,"review");
 {
  const current=scheduledCard(card,source),last=Date.parse(card.reviews.at(-1).at);
  card=rateLearningCard(card,Rating.Good,new Date(Math.max(last+1,current.dueAt.getTime()+1)).toISOString(),450,source);
 }
 const immutableReviews=structuredClone(card.reviews);
 const low=await DefaultScheduler({policy:{kind:"fixed",desiredRetention:0.75},enableFuzz:false});
 const high=await DefaultScheduler({policy:{kind:"fixed",desiredRetention:0.97},enableFuzz:false});
 const adaptive=await DefaultScheduler({policy:{kind:"cost-adr",preset:"upstream-default"},enableFuzz:false});
 const lowSchedule=scheduledCard(card,low),highSchedule=scheduledCard(card,high),adaptiveSchedule=scheduledCard(card,adaptive);
 assert.deepEqual(card.reviews,immutableReviews,"changing scheduler policy must not rewrite stored review evidence");
 assert.equal(lowSchedule.reps,highSchedule.reps);assert.equal(lowSchedule.reps,adaptiveSchedule.reps);
 assert.equal(lowSchedule.lapses,highSchedule.lapses);assert.equal(lowSchedule.lapses,adaptiveSchedule.lapses);
 assert.equal(lowSchedule.stability,highSchedule.stability);assert.equal(lowSchedule.difficulty,highSchedule.difficulty);
 assert.notEqual(lowSchedule.dueAt.getTime(),highSchedule.dueAt.getTime(),
  "fixed-retention policy changes must recompute the future schedule from the same history");
 assert.equal(low.configuration.policy.kind,"fixed");assert.equal(high.configuration.policy.kind,"fixed");
 assert.equal(adaptive.configuration.policy.kind,"cost-adr");
 assert.deepEqual(card.reviews,immutableReviews);
});
test("Cost-ADR composes with remediation and native ts-fsrs leech suspension without rewriting review evidence",async()=>{
 const scheduler=await DefaultScheduler({policy:{kind:"cost-adr",preset:"upstream-default"},leechThreshold:1,leechAction:"remediate"});
 assert.equal(scheduler.configuration.policy.kind,"cost-adr");
 assert.equal(scheduler.configuration.policy.goalCostWeight,__suite_dep_11.FSRS_COST_ADR_PRESET_GOAL_WEIGHT);
 const seed=addLearningCard(complete("cost-adr"),bundle.questions[0].id,new Date(1030).toISOString());
 assert.deepEqual(previewLearningCard(seed,new Date(2030).toISOString(),scheduler).map(x=>x.rating),[1,2,3,4]);
 let card=seed;
 for(let i=0;i<8&&scheduledCard(card,scheduler).state!=="review";i++){
   const current=scheduledCard(card,scheduler),last=Date.parse(card.reviews.at(-1)?.at??card.createdAt);
   card=rateLearningCard(card,Rating.Good,new Date(Math.max(last+1,current.dueAt.getTime()+1)).toISOString(),500,scheduler);
 }
 assert.equal(scheduledCard(card,scheduler).state,"review");
 const current=scheduledCard(card,scheduler),last=Date.parse(card.reviews.at(-1).at);
 card=rateLearningCard(card,Rating.Again,new Date(Math.max(last+1,current.dueAt.getTime()+1)).toISOString(),650,scheduler);
 assert.equal(scheduledCard(card,scheduler).lapses,1);assert.equal(scheduledCard(card,scheduler).leechStatus,"remediation");
 assert.notEqual(scheduledCard(card,scheduler).scheduleStatus,"suspended");
 const suspended=await DefaultScheduler({policy:{kind:"cost-adr",preset:"upstream-default"},leechThreshold:1,leechAction:"suspend"});
 assert.equal(scheduledCard(card,suspended).scheduleStatus,"suspended");
 assert.equal(scheduledCard(card,suspended).leechStatus,"suspended");assert.equal(card.reviews.at(-1).state,"review");
});
test("optimizer evidence and evaluated profiles are portable without persisting vendor scheduler state",async()=>{
 const scheduler=await DefaultScheduler();
 let card=addLearningCard(complete("optimizer"),bundle.questions[0].id,new Date(1030).toISOString());
 card=rateLearningCard(card,Rating.Good,new Date(2030).toISOString(),810,scheduler);
 const csv=__suite_dep_18.fsrsOptimizerCsv([card]);
 assert.match(csv,/^review_time,card_id,review_rating,review_duration,review_state\n/);assert.match(csv,/,3,810,0\n$/);
 assert.deepEqual(__suite_dep_18.optimizerEvidenceSummary([card]),{cards:1,reviews:1});
 const profile=__suite_dep_18.validateFsrsOptimizerProfile({
  schema:"practice-desk-fsrs-profile/v4",model:"FSRS-7",bindingVersion:"0.6.1",trainedAt:"2026-11-10T00:00:00.000Z",
  sourceSha256:"a".repeat(64),evidenceItems:384,weights:[...__suite_dep_19.FSRS7_DEFAULT_WEIGHTS],
  evaluation:{
   crossValidation:{logLoss:0.39,rmseBins:0.07},
   holdout:{strategy:"final-sixth",trainItems:320,holdoutItems:64,holdoutCards:16,
    minimumTrainItems:64,minimumHoldoutItems:64,minimumHoldoutCards:16,
    stock:{logLoss:0.42,rmseBins:0.08},personalized:{logLoss:0.40,rmseBins:0.08},gate:"passed"}
  },
  training:{enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,chronology:"elapsed-24h",
   converterFixedUtcOffsetMinutes:0,converterRolloverHour:0,
   validationCandidateTrainedItems:320,finalRetrainedOnAllEvidence:true}
 });
 const settings=__suite_dep_17.validateRevisionSettings({...__suite_dep_17.DEFAULT_REVISION_SETTINGS,
  optimizerProfile:profile,policy:{kind:"cost-adr",preset:"upstream-default"}});
 const options=__suite_dep_17.revisionSchedulerOptions(settings);assert.equal(options.policy.kind,"cost-adr");assert.equal(options.weights.length,34);
 assert.throws(()=>__suite_dep_17.validateRevisionSettings({...settings,policy:{kind:"fixed",desiredRetention:0.74}}),/0.75/);
 assert.throws(()=>__suite_dep_17.validateRevisionSettings({...settings,policy:{kind:"cost-adr",preset:"custom"}}),/preset/);
 assert.throws(()=>__suite_dep_17.validateRevisionSettings({...settings,retentionPolicy:"fixed"}),/Invalid revision settings/);
 const storage=new Map(),fake={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 __suite_dep_17.writeRevisionSettings(settings,fake);assert.deepEqual(__suite_dep_17.readRevisionSettings(fake),settings);
 assert.throws(()=>__suite_dep_18.validateFsrsOptimizerProfile({...profile,evaluation:null}),/evaluation/);
 const tinyGain=__suite_dep_18.validateFsrsOptimizerProfile({...profile,evaluation:{...profile.evaluation,
  holdout:{...profile.evaluation.holdout,personalized:{logLoss:0.4199,rmseBins:0.07}}}});
 assert.equal(tinyGain.evaluation.holdout.personalized.logLoss,0.4199);
 assert.throws(()=>__suite_dep_18.validateFsrsOptimizerProfile({...profile,evaluation:{...profile.evaluation,
  holdout:{...profile.evaluation.holdout,personalized:{logLoss:0.42,rmseBins:0.07}}}}),/not lower/);
 assert.throws(()=>__suite_dep_18.validateFsrsOptimizerProfile({...profile,evaluation:{...profile.evaluation,
  holdout:{...profile.evaluation.holdout,personalized:{logLoss:0.4201,rmseBins:0.07}}}}),/not lower/);
 assert.throws(()=>__suite_dep_18.validateFsrsOptimizerProfile({...profile,evaluation:{...profile.evaluation,
  holdout:{...profile.evaluation.holdout,personalized:{logLoss:0.40,rmseBins:0.081}}}}),/RMSE-bins/);
 const active=__suite_dep_18.validateFsrsOptimizerProfile({...profile,sourceSha256:"b".repeat(64)});
 assert.throws(()=>__suite_dep_18.assertFsrsOptimizerReplacement(profile,active),/active personalized profile/);
 const replacement=__suite_dep_18.validateFsrsOptimizerProfile({...profile,sourceSha256:"c".repeat(64),
  evaluation:{...profile.evaluation,holdout:{...profile.evaluation.holdout,
   incumbent:{sourceSha256:active.sourceSha256,
    weightsFingerprint:__suite_dep_18.fsrsWeightsFingerprint(active.weights),
    metrics:{logLoss:0.405,rmseBins:0.08}}}}});
 assert.deepEqual(__suite_dep_18.assertFsrsOptimizerReplacement(replacement,active),replacement);
 const badWeights=[...profile.weights];badWeights[23]=0.9;
 assert.throws(()=>__suite_dep_18.validateFsrsOptimizerProfile({...profile,weights:badWeights}),/weights/);
 assert.throws(()=>__suite_dep_18.validateFsrsOptimizerProfile({...profile,schema:"practice-desk-fsrs-profile/v3"}),/profile/);
 assert.throws(()=>__suite_dep_18.validateFsrsOptimizerProfile({...profile,training:{...profile.training,chronology:"zoned-study-day"}}),/training metadata/);
});
test("topic evidence and trends never compare different paper revisions",()=>{
 const a=complete("one",true),b=complete("two",false);
 const card=addLearningCard(a,bundle.questions[0].id,new Date(1030).toISOString());
 const topics=topicMetrics([a,b],[{...card,customTopic:"Manual topic"}]);
 assert.ok(topics.some(t=>t.label==="Manual topic"&&t.total===2));
 assert.ok(topics.every(t=>t.evidence==="insufficient" || t.answered>=5));
 assert.ok(topics.some(t=>t.answered!==t.total));
 const trend=comparableTrends([a,b]);
 assert.equal(trend.length,1);
 assert.equal(trend[0].count,2);
 assert.equal(trend[0].points.length,2);
 const different={...b,frozen:{...b.frozen,paper:{...b.frozen.paper,id:"another-revision"}}};
 assert.equal(comparableTrends([a,different]).length,2);
 // Preserve the exact two-independent-attempt / one-question, unanswered
 // user-topic counter case without creating a separate learning suite fixture.
 const once=complete("topic-once"),twice={...once,id:"topic-second",startedAt:9000,finishedAt:10000};
 const sameQuestion=addLearningCard(once,bundle.questions[0].id,new Date(1030).toISOString());
 const topicRows=topicMetrics([once,twice],[{...sameQuestion,customTopic:"Mechanics"}]);
 const topic=topicRows.find(x=>x.kind==="user-topic"&&x.label==="Mechanics");
 assert.equal(topic.attempts,2);
 assert.equal(topic.distinctQuestions,1);
 assert.equal(topic.total,2);
 assert.equal(topic.answered,0);
 assert.equal(topic.answeredAttempts,0);
 assert.equal(topic.distinctAnsweredQuestions,0);
 assert.ok(topicRows.some(x=>x.kind==="section"));

});
test("backup preserves notes and FSRS review logs with strict integrity checks",async()=>{
 const scheduler=await DefaultScheduler();
 const a=complete("backup");
 const original=addLearningCard(a,bundle.questions[0].id,new Date(1030).toISOString());
 const rated=rateLearningCard({...original,note:"Review concept carefully",errorLabel:"conceptual",customTopic:"Topic"},
 Rating.Again,new Date(2030).toISOString(),900,scheduler);
 const archived=verifyBackup(makeBackup([{...a,saveRevision:1},{...rated,saveRevision:1}],
   {schema:1,dark:false,scale:100},"2026-10-29T10:00:00Z"));
 assert.equal(archived.records.length,2);
 const card=validateLearningCard(archived.records.find(x=>x.recordType==="learning-card"));
 assert.equal(card.note,"Review concept carefully");
 assert.equal(card.reviews.length,1);assert.equal(card.reviews[0].durationMs,900);assert.equal(card.reviews[0].state,"new");
 assert.throws(()=>validateLearningCard({...card,reviews:[{rating:9,at:card.updatedAt,durationMs:1,state:"new"}]}),/history/);
 assert.throws(()=>verifyBackup({...archived,records:archived.records.slice(1)}),/integrity/);
});
}

// === Consolidated coverage: tests/learning-notebook-and-evidence.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const pkg = __suite_dep_2["pkg"];
const makeRevisionPackage = __suite_dep_14["makeRevisionPackage"];
const createNotebookLineage = __suite_dep_14["createNotebookLineage"];
const validateNotebookLineage = __suite_dep_14["validateNotebookLineage"];
const REVISION_MAX_QUESTIONS = __suite_dep_14["REVISION_MAX_QUESTIONS"];
const attemptEvidence = __suite_dep_4["attemptEvidence"];
const evidenceProgression = __suite_dep_4["evidenceProgression"];
const topicMetrics = __suite_dep_12["topicMetrics"];
const addLearningCard = __suite_dep_12["addLearningCard"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const validateGenericStoredRecord = __suite_dep_9_stored_record_validator["validateGenericStoredRecord"];
const renderModelExam = __suite_dep_9_exam_view["renderModelExam"];
const scoreAttempt = __suite_dep_15["scoreAttempt"];
const questionRevisionHash = __suite_dep_8["questionRevisionHash"];
const paperRevisionHash = __suite_dep_8["paperRevisionHash"];
const makeBackup = __suite_dep_13["makeBackup"];
const verifyBackup = __suite_dep_13["verifyBackup"];
const sha256 = __suite_dep_16["sha256"];
const bundle=validateExamPackage(pkg);
function complete(id){
 const a=startGenericAttempt(bundle,id,1000);
 return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:2000},
   new Map(bundle.questions.map(q=>[q.id,q])));
}
const finished=complete("completed-source");
const card=(index,at=3000)=>addLearningCard(finished,bundle.questions[index].id,new Date(at).toISOString());

test("generated notebook revision is a real validated attempt, not a copied note",()=>{
 const selected=[card(0),card(2),card(5)];
 const revision=makeRevisionPackage(selected,"nonce-1");
 assert.equal(revision.questions.length,3);
 const lineage=createNotebookLineage(selected);
 assert.equal(lineage.entries.length,3);
 assert.equal(lineage.entries[0].sourceAttemptId,"completed-source");
 assert.equal(revision.paper.edition,"custom");
 assert.equal(revision.paper.timing.kind,"untimed");
 assert.deepEqual(revision.paper.scoring.defaultRule,{correctMarks:1,incorrectMarks:0,unansweredMarks:0});
 assert.deepEqual(revision.answerKey.entries.map(e=>e.answer),selected.map(x=>x.answer));
 assert.equal(validateExamPackage(revision),revision);
 let attempt={...startGenericAttempt(revision,"revision-attempt",5000),notebookLineage:lineage};
 validateNotebookLineage(attempt);
 assert.equal(attempt.frozen.snapshot.mode,"custom-practice");
 assert.equal(attempt.frozen.paper.sections.length,1);
 assert.equal(renderModelExam(attempt,revision).includes("Expected answer"),false,"Active exam reveals answer");
 const map=new Map(revision.questions.map(q=>[q.id,q]));
 attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:5010,
   response:{kind:"single-choice",optionId:revision.answerKey.entries[0].answer.optionId}},map);
 attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:5020},map);
 assert.equal(attempt.result.items.length,3);
 assert.equal(attempt.result.snapshot.earnedMarks,1);
 assert.equal(attempt.result.snapshot.correctCount,1);
 assert.equal(attempt.result.snapshot.unansweredCount,2);
 assert.equal(validateGenericStoredRecord(JSON.parse(JSON.stringify(attempt))).id,"revision-attempt");
 const backed=verifyBackup(makeBackup([{...attempt,saveRevision:1}],
   {schema:1,dark:false,scale:100},"2026-10-29T20:00:00Z"));
 assert.equal(backed.snapshots.length,1);
 assert.equal(backed.snapshots[0].body.questions.length,3);
 assert.equal(backed.records[0].notebookLineage.entries[0].cardId,selected[0].id);
 assert.equal(selected[0].sourceAttemptId,"completed-source");
 const otherPaper={...card(1),paperId:"another-paper-revision",paperEdition:"source"};
 const mixedPapers=makeRevisionPackage([selected[0],otherPaper],"same-exam-different-papers");
 assert.equal(mixedPapers.questions.length,2,"Cards from distinct source papers in one exam may be combined");
 assert.equal(createNotebookLineage([selected[0],otherPaper]).entries[1].sourcePaperId,"another-paper-revision");
 const forged=structuredClone(attempt);forged.notebookLineage.entries[0].sourceAttemptId="different";
 assert.throws(()=>validateGenericStoredRecord(forged),/lineage hash mismatch/);
});

test("revision selection rejects duplicates, unsafe statuses, mixed exams and impossible sizes",()=>{
 const a=card(0);
 assert.throws(()=>makeRevisionPackage([],"empty"),/Select/);
 assert.throws(()=>makeRevisionPackage([a,a],"dup"),/Duplicate question/);
 assert.throws(()=>makeRevisionPackage([a,{...a,examId:"different",id:"learning-card:other"}],"mixed"),/identity|different exams/);
 assert.throws(()=>makeRevisionPackage([a],"invalid nonce"),/identity/);
 assert.throws(()=>makeRevisionPackage(Array.from({length:REVISION_MAX_QUESTIONS+1},()=>a),"too-many"),/Select/);
 const modifiedQuestion={...a.question,editorial:{...a.question.editorial,status:"invalid"}};
 const safeHash={...modifiedQuestion,contentHash:questionRevisionHash(modifiedQuestion)};
 assert.throws(()=>makeRevisionPackage([{...a,question:safeHash}],"unsafe"),/editorially eligible/);
});

test("media from notebook remains in generated paper even if source package disappears",()=>{
 const a=card(0);
 const uri="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WsSlz8AAAAASUVORK5CYII=";
 const bytes=Uint8Array.from(atob(uri.split(",")[1]),c=>c.charCodeAt(0));
 const asset={id:"rev-asset",mediaType:"image/png",dataUri:uri,altText:"Geometry sketch",contentHash:sha256(bytes)};
 const question={...a.question,content:{...a.question.content,assetIds:[asset.id]}};
 const revised={...question,contentHash:questionRevisionHash(question)};
 const one={...a,id:"learning-card:"+revised.id,question:revised,assets:[asset]};
 const paper=makeRevisionPackage([one],"visual");
 assert.equal(paper.assets.length,1);
 const active=startGenericAttempt(paper,"visual",1000);
 assert.equal(active.frozen.assets[0].contentHash,asset.contentHash);
 assert.throws(()=>makeRevisionPackage([one,{...card(1),assets:[{...asset,dataUri:"data:image/png;base64,AA=="}]}],"collision"),/Conflicting frozen image|digest mismatch/);
 const second={...card(1),assets:[{...asset,altText:"Different asset metadata"}]};
 assert.throws(()=>makeRevisionPackage([one,second],"conflicting-valid-asset"),/Conflicting frozen image identity/);
});

test("pace, speed relative to a section median and marking opportunities are exact",()=>{
 const responses=[
 {questionRevisionId:"rev-0",response:{kind:"single-choice",optionId:"a"},timeSpentMs:1000,flagged:false,answerChangeCount:1},
 {questionRevisionId:"rev-1",response:{kind:"multiple-select",optionIds:["x","z"]},timeSpentMs:2000,flagged:false,answerChangeCount:0},
 {questionRevisionId:"rev-2",response:{kind:"numeric-entry",value:3.5},timeSpentMs:3000,flagged:false,answerChangeCount:0},
 {questionRevisionId:"rev-3",response:{kind:"true-false",value:false},timeSpentMs:6000,flagged:false,answerChangeCount:0},
 {questionRevisionId:"rev-4",response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},timeSpentMs:10000,flagged:false,answerChangeCount:0}
 ];
 const original=complete("metrics");
 const score=scoreAttempt(original.frozen.paper,original.frozen.key,original.frozen.questions,responses,"2026-10-29T12:00:00Z");
 const a={...original,state:{...original.state,responses,foregroundMs:22000,elapsedMs:25000},result:score};
 const result=attemptEvidence(a);
 assert.equal(result.sections.length,2);
 assert.equal(result.sections[0].measuredAnswered,3);
 assert.equal(result.sections[1].measuredAnswered,2);
 assert.equal(result.speed.classified,0,"Small sections cannot be speed-classified");
 assert.equal(result.timing.changedAnswers,1);
 assert.equal(result.timing.questionMeasuredMs,22000);
 assert.equal(result.opportunity.countSkipped,1);
 assert.equal(result.opportunity.observedPenalty,score.snapshot.penaltyMarks);
 assert.equal(result.opportunity.wrongToCorrect,score.items.filter(x=>x.verdict==="incorrect")
    .reduce((n,x)=>n+2-x.marks,0));
 assert.equal(result.opportunity.skippedToCorrect,2);
 assert.equal(attemptEvidence(startGenericAttempt(bundle,"active",1000)),null);
});



test("speed classification uses a sufficient section median and distinguishes fast mistakes",()=>{
 const group={...bundle.paper.sections[0],questionRevisionIds:bundle.questions.map(q=>q.id)};
 const source={...bundle.paper,sections:[group]};
 const combined=validateExamPackage({...bundle,paper:{...source,contentHash:paperRevisionHash(source)}});
 const responses=[
  {questionRevisionId:"rev-0",response:{kind:"single-choice",optionId:"a"},timeSpentMs:1000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-1",response:{kind:"multiple-select",optionIds:["x","z"]},timeSpentMs:2000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-2",response:{kind:"numeric-entry",value:3.5},timeSpentMs:3000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-3",response:{kind:"true-false",value:false},timeSpentMs:6000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-4",response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},timeSpentMs:10000,flagged:false,answerChangeCount:0}
 ];
 const a=startGenericAttempt(combined,"speed",1000);
 const scores=scoreAttempt(a.frozen.paper,a.frozen.key,a.frozen.questions,responses,"2026-10-29T12:00:00Z");
 const completed={...a,finishedAt:2000,state:{...a.state,responses,status:"completed",foregroundMs:22000},result:scores};
 const rows=attemptEvidence(completed);
 assert.equal(rows.sections.length,1);
 assert.equal(rows.sections[0].medianAnsweredMs,3000);
 assert.equal(rows.speed.measured,5);
 assert.equal(rows.speed.classified,5);
 assert.deepEqual(rows.speed.buckets.map(x=>x.items),[2,1,2]);
 assert.equal(rows.speed.buckets[0].incorrect+rows.speed.buckets[1].incorrect+rows.speed.buckets[2].incorrect,
   scores.snapshot.incorrectCount);
 // The same *measured* frozen evidence must drive actual revision eligibility,
 // not a duplicate separately manufactured fixture.
 const selected=independentRevisionInventory([completed],[],new Set(),combined.examId,["slow"]);
 assert.deepEqual(selected.selected.map(x=>x.questionId).sort(),["rev-3","rev-4"]);
 const slowWrong=selected.selected.find(x=>x.questionId==="rev-3");
 const slowCorrect=selected.selected.find(x=>x.questionId==="rev-4");
 assert.equal(slowWrong.observedAttempts,1);
 assert.equal(slowWrong.wrongAttempts,1,"slow/incorrect is not excluded from revision");
 assert.equal(slowCorrect.observedAttempts,1);
 assert.equal(slowCorrect.wrongAttempts,0,"slow/correct still qualifies for revision");
});
}


{
const test=__suite_dep_0.default;
const assert=__suite_dep_1.default;
const {runFsrsOptimizerPipeline,OptimizerPipelineRejectedError,OPTIMIZER_STAGES}=__suite_dep_20;
const {
 OPTIMIZER_PROFILE_SCHEMA,OPTIMIZER_BINDING_VERSION,OPTIMIZER_MODEL_VERSION,
 MIN_TRAIN_ITEMS,MIN_HOLDOUT_ITEMS,MIN_HOLDOUT_CARDS
}=__suite_dep_21;
const {readFile}=__suite_dep_22;

const evidence=(count=384)=>({
 items:Array.from({length:count},(_,i)=>({i})),
 cardIds:Array.from({length:count},(_,i)=>"card-"+Math.floor(i/4))
});
const fakeBinding=(personalizedLogLoss=0.4,incumbentLogLoss=0.45)=>({
 convertCsvToFsrsItemsWithCardIds(){return evidence();},
 async computeParameters(_items,options){
  options.progress?.(0,1);options.progress?.(1,1);
  return Array(34).fill(options.cardIds.length===320?1:2);
 },
 async evaluateWithTimeSeriesSplits(){return {logLoss:0.35,rmseBins:0.18};},
 FSRSBinding:class{
  constructor(weights){this.weights=weights;}
  evaluate(){
   if(!this.weights)return {logLoss:0.5,rmseBins:0.2};
   return {logLoss:this.weights[0]===9?incumbentLogLoss:personalizedLogLoss,rmseBins:0.2};
  }
 }
});

test("FSRS optimizer native/browser pipeline owns conversion, holdout gate, retraining and profile assembly once",async()=>{
 const stages=[],holdout=[];
 const profile=await runFsrsOptimizerPipeline({
  binding:fakeBinding(),bytes:new Uint8Array([1,2,3]),
  sourceSha256:"a".repeat(64),trainedAt:"2026-11-12T00:00:00.000Z",
  incumbentProfile:{sourceSha256:"d".repeat(64),weights:Array(34).fill(9)},
  makeOptions:(cardIds,stage)=>{stages.push([stage,cardIds.length]);return {cardIds};},
  progress:(stage,current,total)=>holdout.push([stage,current,total])
 });
 assert.equal(profile.schema,OPTIMIZER_PROFILE_SCHEMA);
 assert.equal(profile.bindingVersion,OPTIMIZER_BINDING_VERSION);
 assert.equal(profile.model,OPTIMIZER_MODEL_VERSION);
 assert.equal(profile.evidenceItems,384);
 assert.equal(profile.evaluation.holdout.trainItems,320);
 assert.equal(profile.evaluation.holdout.holdoutItems,64);
 assert.equal(profile.evaluation.holdout.holdoutCards,16);
 assert.equal(profile.evaluation.holdout.gate,"passed");
 assert.equal(profile.evaluation.holdout.incumbent.sourceSha256,"d".repeat(64));
 assert.match(profile.evaluation.holdout.incumbent.weightsFingerprint,/^fnv1a64:/);
 assert.equal(profile.training.validationCandidateTrainedItems,320);
 assert.equal(profile.training.finalRetrainedOnAllEvidence,true);
 assert.deepEqual(stages.map(x=>x[0]),[
  OPTIMIZER_STAGES.validation,OPTIMIZER_STAGES.final,OPTIMIZER_STAGES.crossValidation
 ]);
 assert.deepEqual(holdout,[
  [OPTIMIZER_STAGES.holdout,0,3],[OPTIMIZER_STAGES.holdout,1,3],
  [OPTIMIZER_STAGES.holdout,2,3],[OPTIMIZER_STAGES.holdout,3,3]
 ]);
 assert.equal(profile.weights.length,34);
});

test("FSRS optimizer shared pipeline rejects insufficient evidence and held-out regression before final training",async()=>{
 const small=fakeBinding();
 small.convertCsvToFsrsItemsWithCardIds=()=>evidence(60);
 await assert.rejects(
  runFsrsOptimizerPipeline({binding:small,bytes:new Uint8Array([1]),sourceSha256:"b".repeat(64)}),
  error=>error instanceof OptimizerPipelineRejectedError&&error.kind==="evidence"&&
   error.reasons.some(x=>x.includes(String(MIN_TRAIN_ITEMS))&&x.includes(String(MIN_HOLDOUT_ITEMS))&&
    x.includes(String(MIN_HOLDOUT_CARDS)))
 );
 await assert.rejects(
  runFsrsOptimizerPipeline({binding:fakeBinding(0.4995),bytes:new Uint8Array([1]),sourceSha256:"e".repeat(64)}),
  error=>error instanceof OptimizerPipelineRejectedError&&error.kind==="gate"&&
   error.reasons.some(x=>x.includes("minimum practical"))
 );
 await assert.rejects(
  runFsrsOptimizerPipeline({binding:fakeBinding(0.4,0.39),bytes:new Uint8Array([1]),sourceSha256:"f".repeat(64),
   incumbentProfile:{sourceSha256:"d".repeat(64),weights:Array(34).fill(9)}}),
  error=>error instanceof OptimizerPipelineRejectedError&&error.kind==="gate"&&
   error.reasons.some(x=>x.includes("active personalized"))
 );
 let calls=0;
 const regressing=fakeBinding(0.6);
 const original=regressing.computeParameters;
 regressing.computeParameters=async(...args)=>{calls++;return original(...args);};
 await assert.rejects(
  runFsrsOptimizerPipeline({binding:regressing,bytes:new Uint8Array([1]),sourceSha256:"c".repeat(64)}),
  error=>error instanceof OptimizerPipelineRejectedError&&error.kind==="gate"
 );
 assert.equal(calls,1,"held-out failure must not reach final all-evidence retraining");
});

test("Native and browser optimizer entrypoints are runtime adapters, not duplicate training pipelines",async()=>{
 const native=await readFile(new URL("../tools/fsrs-optimizer/optimize.mjs",import.meta.url),"utf8");
 const browser=await readFile(new URL("../tools/fsrs-optimizer/browser-worker.mjs",import.meta.url),"utf8");
 const pipeline=await readFile(new URL("../tools/fsrs-optimizer/optimizer-pipeline.mjs",import.meta.url),"utf8");
 for(const source of [native,browser])assert.match(source,/runFsrsOptimizerPipeline/);
 assert.match(native,/--incumbent/);assert.match(browser,/incumbentProfile/);
 for(const duplicate of ["splitChronologicalHoldout(","evaluateHoldoutGate(","validationCandidateTrainedItems:"])
  for(const source of [native,browser])assert.equal(source.includes(duplicate),false,
   "runtime adapter duplicated pipeline semantic: "+duplicate);
 assert.match(pipeline,/splitChronologicalHoldout/);
 assert.match(pipeline,/evaluateHoldoutGate/);
 assert.match(pipeline,/validationCandidateTrainedItems/);
});
}
