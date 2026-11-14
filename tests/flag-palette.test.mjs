/** Pure flagged-response state contract. Real palette paint, accessible labels,
 * six-kind UI and theme/reload behaviour are independently exercised by
 * scripts/acceptance/scenarios/candidate.mjs: statusPalette.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";

const exam=validateExamPackage(pkg);
const questions=new Map(exam.questions.map(q=>[q.id,q]));
const responses=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]},
 {kind:"free-response",text:"Candidate explanation"}
];

for(const [index,response] of responses.entries()){
 test("flagged answer state remains independent of answer status for "+response.kind,()=>{
  let attempt=startGenericAttempt(exam,"flag-"+index,1000);
  const question=exam.questions[index];
  const update=event=>{
   attempt=transitionGenericAttempt(attempt,{...event,nowMs:1100},questions);
   return attempt.state.responses.find(row=>row.questionRevisionId===question.id);
  };
  if(index>=3)update({type:"NAVIGATE",sectionIndex:1,questionIndex:index-3});
  else if(index>0)update({type:"NAVIGATE",sectionIndex:0,questionIndex:index});
  const before=attempt.state.responses.find(row=>row.questionRevisionId===question.id);
  assert.equal(before?.flagged??false,false);
  assert.equal(before?.response??null,null);

  const flagged=update({type:"FLAG",flagged:true});
  assert.equal(flagged?.flagged,true);
  assert.equal(flagged?.response??null,null,"a review flag must not invent an answer");

  const saved=update({type:"ANSWER",response});
  assert.equal(saved?.flagged,true);
  assert.equal(saved?.response?.kind,response.kind,"answer should commit independently of review flag");

  const cleared=update({type:"CLEAR"});
  assert.equal(cleared?.flagged,true,"clearing an answer must retain review intent");
  assert.equal(cleared?.response??null,null,"clear must remove committed answer");

  const unmarked=update({type:"FLAG",flagged:false});
  assert.equal(unmarked?.flagged,false);
  assert.equal(unmarked?.response??null,null);
 });
}
