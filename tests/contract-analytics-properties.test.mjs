import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {attemptEvidence,evidenceProgression} from "../src/learning/attempt-evidence.ts";
import {questionSpeed,studySuggestions} from "../src/learning/question-analytics.ts";
import {frozenScoreSummary} from "../src/app/history-score.ts";

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
  const row={examId:"exam-"+random(4),label:"Topic",attempts,
   distinctQuestions,answered,correct};
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
