/** Generic candidate-status contract: a review flag must not conceal answer evidence.
 * Tests the production frozen-attempt transition and shared exam renderer, not a
 * CGL-only mock, so every response kind obeys the same status classes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {renderModelExam} from "../src/app/exam-view.ts";

const exam=validateExamPackage(pkg),map=new Map(exam.questions.map(q=>[q.id,q]));
const responses=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]},
 {kind:"free-response",text:"Candidate explanation"}
];
function palette(a,index){
 const html=renderModelExam(a,exam),q=index%3;
 const markup=html.match(new RegExp('<button class="num ([^"]*)" data-q="'+q+'"[^>]*>'))?.[0];
 assert.ok(markup,"Question navigator entry is missing for kind "+index);
 return {html,markup};
}
for(let i=0;i<responses.length;i++){
 test("review palette uses actual session evidence for "+responses[i].kind,()=>{
  let a=startGenericAttempt(exam,"palette-"+i,1000);
  const send=(event)=>{a=transitionGenericAttempt(a,{...event,nowMs:1100},map);};
  if(i>=3)send({type:"NAVIGATE",sectionIndex:1,questionIndex:i-3});
  else if(i>0)send({type:"NAVIGATE",sectionIndex:0,questionIndex:i});
  const before=palette(a,i);
  assert.doesNotMatch(before.markup,/\bmarked\b/);
  assert.doesNotMatch(before.markup,/\banswered\b/);
  send({type:"FLAG",flagged:true});
  const pending=palette(a,i);
  assert.match(pending.markup,/\bmarked\b/);
  assert.doesNotMatch(pending.markup,/class="num [^"]*\banswered\b/);
  assert.match(pending.markup,/unanswered, marked for review/);
  assert.match(pending.html,/id="g-flag" aria-pressed="true" aria-label="Unmark review \(unanswered\)"/);
  send({type:"ANSWER",response:responses[i]});
  const done=palette(a,i);
  assert.match(done.markup,/class="num [^"]*\banswered\b[^"]*\bmarked\b/);
  assert.match(done.markup,/answered, marked for review/);
  assert.match(done.html,/id="g-flag" aria-pressed="true" aria-label="Unmark review \(answered\)"/);
  assert.match(done.html,/Unanswered · review/);
  assert.match(done.html,/Answered · review/);
  send({type:"CLEAR"});
  const cleared=palette(a,i);
  assert.match(cleared.markup,/\bmarked\b/);
  assert.doesNotMatch(cleared.markup,/class="num [^"]*\banswered\b/);
  assert.equal(a.state.responses.find(r=>r.questionRevisionId===exam.questions[i].id)?.flagged,true);
  send({type:"FLAG",flagged:false});
  const unmarked=palette(a,i);
  assert.doesNotMatch(unmarked.markup,/\bmarked\b/);
  assert.doesNotMatch(unmarked.markup,/class="num [^"]*\banswered\b/);
 });
}
