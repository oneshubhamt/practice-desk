import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {importAuthoredExam,importSimpleQuestionBank} from "../src/app/bank-import.ts";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {validateResponse} from "../src/engine/response.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {scoreableMaximum} from "../src/engine/score-ceiling.ts";
import {questions,pkg} from "./fixtures/six-kinds.mjs";
const starter=JSON.parse(await readFile(new URL("../examples/apfc-mcq-nat-starter.json",import.meta.url),"utf8"));
function rng(seed){let x=seed>>>0;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};}
const edit=mutate=>{const b=structuredClone(starter);mutate(b);return b;};

test("author-friendly MCQ/NAT adapter retains full fractions, unique identities and hash determinism",()=>{
 for(let seed=1;seed<=75;seed++){
  const random=rng(0x36b123^seed);
  const count=1+random(50);
  const bank=structuredClone(starter);
  bank.bankId="seed-"+seed;
  bank.questions=Array.from({length:count},(_,i)=>{
   const q=structuredClone(starter.questions[i%starter.questions.length]);
   q.id="seed-q"+i;
   q.section="Section "+(i%4);
   if(q.type==="nat")q.answer=[-2,0,12][random(3)];
   return q;
  });
  const pkg=importAuthoredExam(bank);
  assert.equal(pkg.questions.length,count,"seed="+seed);
  assert.equal(pkg.answerKey.entries.length,count,"seed="+seed);
  assert.equal(pkg.paper.sections.length,Math.min(4,count),"seed="+seed);
  assert.equal(pkg.paper.scoring.defaultRule.correctMarks,2.5);
  assert.ok(Math.abs(pkg.paper.scoring.defaultRule.incorrectMarks+5/6)<1e-12);
  assert.equal(validateExamPackage(pkg),pkg);
  assert.deepEqual(importAuthoredExam(structuredClone(bank)),pkg,
   "seed="+seed+" stable identities and hashes");
  assert.equal(new Set(pkg.questions.map(q=>q.id)).size,count);
  assert.ok(pkg.questions.every(q=>q.editorial.status==="verified"));
  assert.ok(pkg.answerKey.entries.every(e=>e.answer.kind==="single-choice"||e.answer.kind==="numeric-entry"));
  const maximum=scoreableMaximum(pkg.paper,pkg.answerKey,pkg.questions);
  assert.ok(Math.abs(maximum-2.5*count)<1e-8,"seed="+seed+" nominal maximum");
 }
});

test("simple-bank upper boundary of 2000 questions succeeds without truncating keys or sections",()=>{
 const bank=edit(b=>{b.bankId="limit-2000";b.questions=Array.from({length:2000},(_,i)=>({
  ...structuredClone(starter.questions[0]),id:"q"+i,section:"Group "+(i%10)}));});
 const p=importSimpleQuestionBank(bank);
 assert.equal(p.questions.length,2000);
 assert.equal(p.answerKey.entries.length,2000);
 assert.equal(p.paper.sections.length,10);
 assert.equal(p.paper.sections.reduce((n,s)=>n+s.questionRevisionIds.length,0),2000);
 assert.equal(new Set(p.questions.map(q=>q.id)).size,2000,
  "each question has a unique revision identity even for identical wording");
 assert.equal(new Set(p.answerKey.entries.map(e=>e.questionRevisionId)).size,2000,
  "all 2000 distinct identities have retained keys");
 assert.ok(p.questions.every(q=>typeof q.contentHash==="string"&&q.contentHash.length===64),
  "every revision retains an integrity hash; identical content may legitimately share a hash");
 assert.ok(Math.abs(scoreableMaximum(p.paper,p.answerKey,p.questions)-5000)<1e-8);
 assert.throws(()=>importSimpleQuestionBank({...bank,questions:[
  ...bank.questions,{...bank.questions[0],id:"q2000"}]}),/1–2000/);
});

test("hostile or borderline authored bank input is rejected instead of truncated or coerced",()=>{
 const cases=[
  ["20001 prompt",b=>b.questions[0].question="X".repeat(20001)],
  ["blank prompt",b=>b.questions[0].question=" "],
  ["duplicate stable ID",b=>b.questions[1].id=b.questions[0].id],
  ["invalid option",b=>b.questions[0].options=["only-one"]],
  ["nonfinite incorrect",b=>b.scoring.incorrectMarks=Infinity],
  ["negative wrong reward fraction",b=>b.scoring.negativeFraction=-1],
  ["contradictory scoring knobs",b=>b.scoring.incorrectMarks=-1],
  ["nonfinite NAT",b=>b.questions[2].answer=NaN],
  ["NAT accepted list empty",b=>b.questions[2].answer=[]],
  ["NAT too many alternatives",b=>b.questions[2].answer=Array.from({length:21},(_,i)=>i)],
  ["NAT negative tolerance",b=>b.questions[2].tolerance=-0.001],
  ["NAT excessive tolerance",b=>b.questions[2].tolerance=1000001],
  ["unsupported answer kind",b=>b.questions[0].type="matching"],
  ["invalid revision",b=>b.revision=1.5],
  ["invalid edition",b=>b.edition="official-maybe"],
  ["invalid bank identifier",b=>b.bankId="../outside"],
 ];
 for(const [name,mutate] of cases){
  assert.throws(()=>importSimpleQuestionBank(edit(mutate)),undefined,name);
 }
});

test("engine response validator gates six kinds independently from UI controls",()=>{
 const accepted=[
  {kind:"single-choice",optionId:"a"},
  {kind:"multiple-select",optionIds:["x","z"]},
  {kind:"numeric-entry",value:3.5},
  {kind:"true-false",value:true},
  {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
  {kind:"free-response",text:"Reasoning and explanation."},
 ];
 for(let i=0;i<accepted.length;i++)assert.doesNotThrow(()=>validateResponse(questions[i],accepted[i]),"kind="+i);
 const invalid=[
  [0,{kind:"single-choice",optionId:"unknown"}],
  [1,{kind:"multiple-select",optionIds:["x"]}],
  [1,{kind:"multiple-select",optionIds:["x","x"]}],
  [1,{kind:"multiple-select",optionIds:["x","z","unknown"]}],
  [2,{kind:"numeric-entry",value:NaN}],
  [2,{kind:"numeric-entry",value:Infinity}],
  [2,{kind:"numeric-entry",value:-1}],
  [2,{kind:"numeric-entry",value:10.01}],
  [2,{kind:"numeric-entry",value:3.501}],
  [3,{kind:"true-false",value:"true"}],
  [4,{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r1"}]}],
  [4,{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l1",rightId:"r2"}]}],
  [5,{kind:"free-response",text:"word ".repeat(41)}],
 ];
 for(const [i,response] of invalid)assert.throws(()=>validateResponse(questions[i],response),
  undefined,"kind="+i+" input="+JSON.stringify(response));
 const negative={...questions[2],content:{...questions[2].content,
  numericRules:{minimum:-10,maximum:10,allowNegative:true,decimalPlaces:2}}};
 for(const value of [-10,-1.25,0,10])assert.doesNotThrow(()=>
  validateResponse(negative,{kind:"numeric-entry",value}),"negative/zero NAT "+value);
 for(const value of [-10.001,10.001,NaN,-Infinity])assert.throws(()=>
  validateResponse(negative,{kind:"numeric-entry",value}),undefined,"boundary NAT "+value);
});

test("validated advanced six-kind package still retains manual grading separation",()=>{
 assert.equal(validateExamPackage(pkg),pkg);
 const response=[{questionRevisionId:"rev-5",response:{kind:"free-response",text:"Essay"}}];
 const result=scoreAttempt(pkg.paper,pkg.answerKey,questions,response,"T");
 assert.equal(result.items[5].verdict,"pending");
 assert.equal(result.items[5].marks,0);
 assert.equal(result.snapshot.unansweredCount,5);
 assert.equal(scoreableMaximum(pkg.paper,pkg.answerKey,questions),10);
});
