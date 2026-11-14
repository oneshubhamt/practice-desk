/** Publication noninterference and revisions: the candidate's signed content
 * is distinct from the private answer key, while reviewer/compile failures
 * must not alter previously published source or author drafts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {newAuthoringDraft,newAuthoringQuestion} from "../src/authoring/authoring-draft.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {inspectAuthoringPublication,compileAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {renderQuestionPrompt} from "../src/app/question-content-view.ts";

function seeded(seed){
 let x=seed>>>0;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};
}
const P=text=>plainRichDocument(text);
function draftFor(seed,count){
 const sections=[{name:"Alpha",minutes:5},{name:"Beta",minutes:7}];
 const questions=Array.from({length:count},(_,i)=>({
  ...newAuthoringQuestion("single-choice"),
  id:"g-question-"+seed+"-"+i,section:sections[i%2].name,
  prompt:P("Seed "+seed+" question "+i+" with <literal> & symbols"),
  options:["One","Two","Three","Four"].map((value,j)=>P(value+" item "+i+" "+j)),
  explanation:P("PRIVATE SOLUTION "+seed+" "+i),
  answer:"A",source:"Synthetic authoring property fixture"
 }));
 return {...newAuthoringDraft(),id:"g-draft-"+seed,examId:"example-exam",
  paperId:"g-publication-"+seed,title:"Independent publication case "+seed,
  updatedAt:"2026-11-14T00:00:00.000Z",revision:1,
  sections:count===1?sections.slice(0,1):sections,questions};
}
const byQuestion=bundle=>new Map(bundle.questions.map(q=>[q.questionId,q]));

test("G publication: seeded private-key changes leave signed candidate content unchanged while altering only key evidence",()=>{
 for(let seed=1;seed<=70;seed++){
  const random=seeded(0xb02ade^seed),count=1+random(7);
  const original=draftFor(seed,count),before=structuredClone(original);
  const review=inspectAuthoringPublication(original);
  assert.equal(review.valid,true,"seed="+seed+" "+JSON.stringify(review.issues));
  const published=compileAuthoringPublication(original);
  assert.deepEqual(review.compiled,published,"preflight must be exactly executable publisher output");
  assert.deepEqual(original,before,"publication may not mutate draft");
  assert.equal(validateExamPackage(published),published);
  assert.deepEqual(compileAuthoringPublication(structuredClone(original)),published);

  const changedIndex=random(count);
  const secretEdit=structuredClone(original);
  secretEdit.questions[changedIndex].answer="B";
  const changed=compileAuthoringPublication(secretEdit);
  assert.equal(changed.paper.id,published.paper.id,"same paper edition identity");
  assert.equal(changed.paper.contentHash,published.paper.contentHash,"secret-only key changes must not rewrite visible paper");
  assert.notEqual(changed.answerKey.contentHash,published.answerKey.contentHash,"secret key must be authenticated");
  assert.deepEqual(changed.questions,published.questions,"private answer change must not alter candidate question bytes");
  for(let i=0;i<count;i++)
   assert.equal(renderQuestionPrompt(changed,changed.questions[i]),
    renderQuestionPrompt(published,published.questions[i]),"pre-reveal prompt must not disclose private edit");

  const explanationEdit=structuredClone(original);
  explanationEdit.questions[changedIndex].explanation=P("ALTERED PRIVATE EXPLANATION "+seed);
  const explanation=compileAuthoringPublication(explanationEdit);
  assert.equal(explanation.answerKey.contentHash,published.answerKey.contentHash,
    "explanation-only edit cannot silently alter the scoring key");
  assert.notEqual(explanation.questions[changedIndex].contentHash,published.questions[changedIndex].contentHash,
    "worked explanation still belongs to authenticated frozen revision");
  assert.equal(renderQuestionPrompt(explanation,explanation.questions[changedIndex]),
    renderQuestionPrompt(published,published.questions[changedIndex]),
    "explanation-only changes must be inaccessible before review");
  assert.deepEqual(original,before,"secondary compiles must not mutate original");
 }
});

test("G publication: invalid mutations fail closed; revision increase is append-only with stable semantic question identity",()=>{
 for(let seed=1;seed<=60;seed++){
  const original=draftFor(1000+seed,2+seed%5);
  const first=compileAuthoringPublication(original),frozen=JSON.stringify(first);
  const bad=[
   d=>{d.questions[0].answer="Z";},
   d=>{d.questions[1].id=d.questions[0].id;},
   d=>{d.questions[0].section="Unpublished section";},
   d=>{d.sections[1].name=d.sections[0].name;}
  ];
  for(const change of bad){
   const draft=structuredClone(original);change(draft);
   const report=inspectAuthoringPublication(draft);
   assert.equal(report.valid,false,"bad input incorrectly marked ready");
   assert.equal(report.compiled,undefined,"invalid report cannot carry executable package");
   assert.throws(()=>compileAuthoringPublication(draft));
   assert.equal(JSON.stringify(first),frozen,"refused attempt modified existing published revision");
  }
  assert.throws(()=>compileAuthoringPublication(original,[first]),/published|Revision/i);
  const updated={...original,revision:2};
  const second=compileAuthoringPublication(updated,[first]);
  const oldById=byQuestion(first),newById=byQuestion(second);
  assert.equal(newById.size,oldById.size);
  assert.notEqual(second.paper.id,first.paper.id);
  for(const [id,q] of oldById){
   assert.ok(newById.has(id),"semantic identity missing "+id);
   assert.notEqual(newById.get(id).id,q.id,"new publication reused old revision identity");
  }
  assert.equal(JSON.stringify(first),frozen,"append-only publication mutated previous frozen source");
 }
});
