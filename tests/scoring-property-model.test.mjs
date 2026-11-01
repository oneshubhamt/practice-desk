import test from "node:test";
import assert from "node:assert/strict";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {scoreableBounds,scoreableMaximum,scoreableLowerBound} from "../src/engine/score-ceiling.ts";
import {pkg,questions} from "./fixtures/six-kinds.mjs";

// Self-contained reference arithmetic: no production scoring/ceiling helper is used
// to calculate any expected answer. Seed, policy and case index survive test failures.
function rng(seed){
 let x=seed>>>0;
 return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};
}
function approx(actual,expected,label){
 assert.ok(Number.isFinite(actual)&&Number.isFinite(expected),label+": finite operands");
 assert.ok(Math.abs(actual-expected)<=1e-9*Math.max(1,Math.abs(expected),Math.abs(actual)),
  label+": expected "+expected+"; got "+actual);
}
const policies=[
 {correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0},
 {correctMarks:2.5,incorrectMarks:-5/6,unansweredMarks:0},
 {correctMarks:4,incorrectMarks:-1,unansweredMarks:-0.25},
 {correctMarks:5,incorrectMarks:-2,unansweredMarks:-1},
 {correctMarks:1.25,incorrectMarks:-0.75,unansweredMarks:0},
];

test("seeded independent scoring reference: precedence, marks ledger, verdicts, exclusions and bounds",()=>{
 for(let seed=1;seed<=200;seed++){
  const random=rng(0x36b00b^seed);
  const sections=[],entries=[],qs=[],responses=[],expected=[];
  const defaultRule=policies[random(policies.length)];
  const byKind= random(2)?{ "single-choice":policies[random(policies.length)] }:{};
  const sectionCount=1+random(4);
  for(let s=0;s<sectionCount;s++){
   const scoringOverride=random(3)===0?policies[random(policies.length)]:undefined;
   const section={id:"s"+s,questionRevisionIds:[],...(scoringOverride?{scoringOverride}:{})};
   sections.push(section);
   const n=1+random(10);
   for(let i=0;i<n;i++){
    const id="q"+s+"-"+i;
    const status=random(9)===0?"invalid":random(8)===0?"under-review":random(5)===0?"caution":"verified";
    const question={id,editorial:{status},content:{kind:"single-choice",prompt:"Reference question",options:[
     {id:"a",text:"A"},{id:"b",text:"B"}]}};
    qs.push(question);section.questionRevisionIds.push(id);
    const entryOverride=random(4)===0?policies[random(policies.length)]:undefined;
    entries.push({questionRevisionId:id,answer:{kind:"single-choice",optionId:"a"},
     ...(entryOverride?{scoringOverride:entryOverride}:{})});
    const rule=entryOverride??scoringOverride??byKind["single-choice"]??defaultRule;
    const choice=random(3);
    if(choice!==2)responses.push({questionRevisionId:id,response:{kind:"single-choice",optionId:choice===0?"a":"b"}});
    const verdict=["invalid","under-review"].includes(status)?"excluded":
      choice===2?"unanswered":choice===0?"correct":"incorrect";
    const marks=verdict==="excluded"?0:verdict==="unanswered"?rule.unansweredMarks:
      verdict==="correct"?rule.correctMarks:rule.incorrectMarks;
    expected.push({id,verdict,marks,rule});
   }
  }
  const paper={id:"pr",paperId:"p",answerKeyRevisionId:"key",sections,
   scoring:{defaultRule,byQuestionKind:byKind}};
  const key={id:"key",paperId:"p",entries};
  const result=scoreAttempt(paper,key,qs,responses,"2026-11-01T00:00:00Z");
  const eligible=expected.filter(x=>x.verdict!=="excluded");
  const sum=xs=>xs.reduce((a,b)=>a+b,0);
  const expectedMarks=sum(expected.map(x=>x.marks));
  const positive=sum(expected.map(x=>Math.max(0,x.marks)));
  const penalties=sum(expected.map(x=>Math.max(0,-x.marks)));
  const ceiling=sum(eligible.map(x=>x.rule.correctMarks));
  const lower=sum(eligible.map(x=>Math.min(x.rule.correctMarks,x.rule.incorrectMarks,x.rule.unansweredMarks)));
  assert.equal(result.items.length,expected.length,"seed="+seed);
  for(let i=0;i<expected.length;i++){
   assert.equal(result.items[i].questionRevisionId,expected[i].id,"seed="+seed+" item="+i+" id");
   assert.equal(result.items[i].verdict,expected[i].verdict,"seed="+seed+" item="+i+" verdict");
   approx(result.items[i].marks,expected[i].marks,"seed="+seed+" item="+i+" policy");
  }
  const snap=result.snapshot;
  approx(snap.earnedMarks,expectedMarks,"seed="+seed+" earned");
  approx(snap.positiveMarks,positive,"seed="+seed+" positive");
  approx(snap.penaltyMarks,penalties,"seed="+seed+" penalties");
  approx(snap.earnedMarks,snap.positiveMarks-snap.penaltyMarks,"seed="+seed+" ledger identity");
  approx(snap.earnedMarks,sum(result.items.map(x=>x.marks)),"seed="+seed+" items identity");
  for(const [verdict,name] of [["correct","correctCount"],["incorrect","incorrectCount"],
   ["unanswered","unansweredCount"],["excluded","excludedCount"]]){
   assert.equal(snap[name],expected.filter(x=>x.verdict===verdict).length,"seed="+seed+" "+name);
  }
  const bounds=scoreableBounds(paper,key,qs);
  approx(bounds.maximum,ceiling,"seed="+seed+" maximum");
  approx(bounds.lowerBound,lower,"seed="+seed+" lower bound");
  approx(scoreableMaximum(paper,key,qs),ceiling,"seed="+seed+" direct max");
  approx(scoreableLowerBound(paper,key,qs),lower,"seed="+seed+" direct floor");
  assert.ok(snap.earnedMarks>=bounds.lowerBound-1e-8&&snap.earnedMarks<=bounds.maximum+1e-8,
    "seed="+seed+" result outside declared bounds");
  for(const section of sections){
   const its=eligible.filter(x=>section.questionRevisionIds.includes(x.id));
   approx(scoreableMaximum(paper,key,qs,section),sum(its.map(x=>x.rule.correctMarks)),
    "seed="+seed+" section="+section.id);
  }
 }
});

test("all six answer kinds and written pending have a frozen automated ceiling",()=>{
 const typed=[
  {kind:"single-choice",optionId:"a"},
  {kind:"multiple-select",optionIds:["x","z"]},
  {kind:"numeric-entry",value:3.5},
  {kind:"true-false",value:true},
  {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
  {kind:"free-response",text:"An assessable explanation."},
 ];
 const response=typed.map((row,i)=>({questionRevisionId:questions[i].id,response:row}));
 const result=scoreAttempt(pkg.paper,pkg.answerKey,questions,response,"2026-11-01T00:00:00Z");
 assert.deepEqual(result.items.map(row=>row.verdict),
  ["correct","correct","correct","correct","correct","pending"]);
 approx(result.snapshot.earnedMarks,10,"five automatically marked answers");
 approx(scoreableMaximum(pkg.paper,pkg.answerKey,questions),10,"exclude pending writing from maximum");
 assert.equal(result.snapshot.correctCount,5);
 assert.equal(result.items[5].marks,0);
});

test("partial-credit cap and conservative penalty floor hold under adversarial component rules",()=>{
 const section={id:"s",questionRevisionIds:["rev-1","rev-4"]};
 const options=[
  {questionRevisionId:"rev-1",response:{kind:"multiple-select",optionIds:["x","y"]}},
  {questionRevisionId:"rev-4",response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]}},
 ];
 for(const floorAtZero of [false,true]){
  for(let per=0;per<=20;per+=4){
   const rule={correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0,
    partialCredit:{kind:"per-correct-component",marksPerCorrectComponent:per,
     penaltyPerIncorrectComponent:per+2,floorAtZero}};
   const paper={...pkg.paper,sections:[section],scoring:{defaultRule:rule}};
   const result=scoreAttempt(paper,pkg.answerKey,questions,options,"2026-11-01T00:00:00Z");
   const refMulti=Math.min(2,floorAtZero?Math.max(0,per-(per+2)):per-(per+2));
   const refMatching=Math.min(2,floorAtZero?Math.max(0,per):per);
   approx(result.items[0].marks,refMulti,"multi component reference per="+per);
   approx(result.items[1].marks,refMatching,"matching component reference per="+per);
   assert.ok(result.items.every(x=>x.marks<=2),"full-credit cap");
   const bounds=scoreableBounds(paper,pkg.answerKey,questions);
   assert.ok(result.snapshot.earnedMarks>=bounds.lowerBound-1e-8);
   assert.ok(result.snapshot.earnedMarks<=bounds.maximum+1e-8);
   approx(bounds.maximum,4,"full nominal ceiling");
  }
 }
});

test("numeric-entry uses max(absolute,relative × |accepted|) at exact binary boundaries",()=>{
 const question={...questions[2],content:{...questions[2].content,numericRules:{allowNegative:true}}};
 const paper={...pkg.paper,sections:[{id:"numeric",questionRevisionIds:[question.id]}],
  scoring:{defaultRule:{correctMarks:2.5,incorrectMarks:-5/6,unansweredMarks:0}}};
 const entry={questionRevisionId:question.id,answer:{
  kind:"numeric-entry",acceptedValues:[-8,0,12],absoluteTolerance:0.25,relativeTolerance:0.25}};
 const key={...pkg.answerKey,entries:[entry]};
 const cases=[
  [-10,"correct"],[-6,"correct"],[-6+0.000001,"incorrect"],
  [-10-0.000001,"incorrect"],[0,"correct"],[0.25,"correct"],
  [0.2500001,"incorrect"],[-0.25,"correct"],[-0.2500001,"incorrect"],
  [9,"correct"],[15,"correct"],[15.000001,"incorrect"],
  [8.999999,"incorrect"],[NaN,"incorrect"],[Infinity,"incorrect"],
 ];
 for(const [value,verdict] of cases){
  const r=scoreAttempt(paper,key,[question],
   [{questionRevisionId:question.id,response:{kind:"numeric-entry",value}}],
   "2026-11-01T00:00:00Z");
  assert.equal(r.items[0].verdict,verdict,"candidate="+String(value));
  approx(r.items[0].marks,verdict==="correct"?2.5:-5/6,"candidate="+String(value));
 }
 const p2={...paper,scoring:{...paper.scoring,decimalPlaces:0}};
 const p3={...paper,scoring:{...paper.scoring,decimalPlaces:6}};
 const response=[{questionRevisionId:question.id,response:{kind:"numeric-entry",value:0.2500001}}];
 assert.equal(scoreAttempt(p2,key,[question],response,"T").snapshot.earnedMarks,
  scoreAttempt(p3,key,[question],response,"T").snapshot.earnedMarks);
});

test("APFC one-third deduction is accumulated unrounded, blanks score zero",()=>{
 const p={...pkg.paper,sections:[{id:"apfc",questionRevisionIds:Array.from({length:120},(_,i)=>"apfc-"+i)}],
  scoring:{defaultRule:{correctMarks:2.5,incorrectMarks:-5/6,unansweredMarks:0,}}};
 const qs=p.sections[0].questionRevisionIds.map(id=>({
  id,editorial:{status:"verified"},content:{kind:"single-choice",prompt:"APFC",options:[
   {id:"A",text:"A"},{id:"B",text:"B"}]}}));
 const entries=qs.map(q=>({questionRevisionId:q.id,answer:{kind:"single-choice",optionId:"A"}}));
 const key={...pkg.answerKey,entries};
 const records=qs.slice(0,100).map((q,i)=>({questionRevisionId:q.id,
  response:{kind:"single-choice",optionId:i<60?"A":"B"}}));
 const r=scoreAttempt(p,key,qs,records,"T");
 const unrounded=60*2.5-40*(5/6);
 approx(r.snapshot.earnedMarks,unrounded,"APFC aggregate marks");
 assert.equal(r.snapshot.correctCount,60);
 assert.equal(r.snapshot.incorrectCount,40);
 assert.equal(r.snapshot.unansweredCount,20);
 approx(scoreableMaximum(p,key,qs),300,"APFC 120×2.5 working denominator");
 assert.ok(Math.abs(unrounded-(60*2.5-40*.83))>0.1,"do not round penalty per incorrect item");
});

test("negative-zero policy never creates phantom marks or a negative aggregate",()=>{
 const question={id:"zero-q",editorial:{status:"verified"},
  content:{kind:"single-choice",prompt:"Neg-zero",options:[{id:"a",text:"A"},{id:"b",text:"B"}]}};
 const paper={id:"pr",paperId:"p",answerKeyRevisionId:"key",
  sections:[{id:"s",questionRevisionIds:["zero-q"]}],
  scoring:{defaultRule:{correctMarks:2,incorrectMarks:-0,unansweredMarks:0},decimalPlaces:2}};
 const key={id:"key",paperId:"p",entries:[
  {questionRevisionId:"zero-q",answer:{kind:"single-choice",optionId:"a"}}]};
 const result=scoreAttempt(paper,key,[question],[
  {questionRevisionId:"zero-q",response:{kind:"single-choice",optionId:"b"}}],"T");
 assert.equal(result.items[0].verdict,"incorrect");
 assert.equal(result.snapshot.earnedMarks,0);
 assert.equal(result.snapshot.positiveMarks,0);
 assert.equal(result.snapshot.penaltyMarks,0);
 assert.equal(result.snapshot.earnedMarks.toFixed(paper.scoring.decimalPlaces),"0.00");
 assert.ok(result.snapshot.earnedMarks<=scoreableMaximum(paper,key,[question]));
});
