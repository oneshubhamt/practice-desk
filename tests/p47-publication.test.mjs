/** P47-5D: source-verified immutable publication and scored engine contracts. */
import test from "node:test";
import assert from "node:assert/strict";
import {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft} from "../src/authoring/authoring-draft.ts";
import {compileAuthoringPublication,inspectAuthoringPublication,publicationPlainText,
 PublicationValidationError} from "../src/authoring/authoring-publisher.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {questionRevisionHash} from "../src/domain/integrity.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {sha256} from "../src/domain/hash.ts";
const P=(text)=>plainRichDocument(text);
const rich=(name)=>({format:"practice-desk-rich",version:1,blocks:[
 {type:"paragraph",content:[{type:"text",text:name+" · "},
  {type:"math",tex:"\\frac{x}{2}",linearText:"x divided by two"}]},
 {type:"table",rows:[
  [[{type:"text",text:"x"}],[{type:"text",text:"Value"}]],
  [[{type:"text",text:"2"}],[{type:"math",tex:"x^2",linearText:"x squared"}]]
 ]}
]});
const answers={"single-choice":"B","multiple-select":"A,C","numeric-entry":"4,4.5",
 "true-false":"False","matching":"1-C,2-A,3-D,4-B","free-response":"Essay rubric"};
const kinds=Object.keys(answers);
function readyDraft(){
 const a=newAuthoringDraft();
 const questions=kinds.map((kind,i)=>{
  const q=newAuthoringQuestion(kind);
  return {...q,section:i<3?"Mathematics":"General",source:"Author-provided literature reference",
   prompt:rich("Problem "+i),passage:i===0?rich("Read the case"):P(""),
   options:["Alpha","Beta","Gamma","Delta"].map(P),
   leftItems:["One","Two","Three","Four"].map(P),
   rightItems:["Right A","Right B","Right C","Right D"].map(P),
   explanation:P("Worked explanation for "+kind),
   answer:answers[kind],tolerance:kind==="numeric-entry"?0.01:0};
 });
 return {...a,examId:"cat-pgdba",paperId:"mixed-2026",title:"Original six-kind CAT and PGDBA practice",
   revision:1,edition:"custom",durationMinutes:120,questions};
}
test("P47-5D all six kinds publish as source-validated frozen rich package, with correct hashes",()=>{
 const a=readyDraft(),pkg=compileAuthoringPublication(a);
 assert.equal(validateExamPackage(pkg),pkg);
 assert.equal(pkg.questions.length,6);
 assert.equal(pkg.answerKey.entries.length,6);
 assert.equal(pkg.paper.sections.length,2);
 assert.equal(pkg.stimuli?.length,1);
 assert.equal(pkg.paper.edition,"custom");
 assert.equal(pkg.paper.timing.kind,"whole-paper");
 assert.equal(pkg.questions[0].content.richPrompt.blocks[0].content[1].tex,"\\frac{x}{2}");
 assert.equal(pkg.questions[0].content.stimulusId,pkg.stimuli[0].id);
 assert.equal(pkg.questions[0].content.richExplanation.blocks[0].content[0].text,"Worked explanation for single-choice");
 assert.equal(pkg.questions[0].contentHash,questionRevisionHash(pkg.questions[0]));
 assert.deepEqual(pkg.answerKey.entries.map(e=>e.answer.kind),kinds);
 assert.equal(pkg.answerKey.entries[2].answer.absoluteTolerance,0.01);
 assert.equal(pkg.answerKey.entries[4].answer.pairs[0].rightId,"C");
 assert.equal(pkg.answerKey.entries[5].answer.evaluation,"manual");
 assert.match(pkg.questions[0].editorial.notes,/not been independently certified/);
});
test("P47-5D authored rich fallback preserves math alt/table/image semantics without TeX parsing of literal dollars",()=>{
 const text=publicationPlainText(rich("Read $5"));
 assert.match(text,/Read \$5/);
 assert.match(text,/x divided by two/);
 assert.match(text,/Value/);
 assert.match(text,/x squared/);
 assert.doesNotMatch(text,/\\frac/);
});
test("P47-5D existing scorer observes correct, incorrect, numeric tolerance, matching and pending manual",()=>{
 const pkg=compileAuthoringPublication(readyDraft());
 const ids=pkg.questions.map(q=>q.id);
 const responses=[
  {questionRevisionId:ids[0],response:{kind:"single-choice",optionId:"B"}},
  {questionRevisionId:ids[1],response:{kind:"multiple-select",optionIds:["A","C"]}},
  {questionRevisionId:ids[2],response:{kind:"numeric-entry",value:4.009}},
  {questionRevisionId:ids[3],response:{kind:"true-false",value:true}},
  {questionRevisionId:ids[4],response:{kind:"matching",pairs:[
   {leftId:"L1",rightId:"C"},{leftId:"L2",rightId:"A"},
   {leftId:"L3",rightId:"D"},{leftId:"L4",rightId:"B"}]}},
  {questionRevisionId:ids[5],response:{kind:"free-response",text:"Model answer"}}
 ].map(x=>({...x,timeSpentMs:0,answerChangeCount:0}));
 const result=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,responses,new Date().toISOString());
 assert.equal(result.snapshot.correctCount,4);
 assert.equal(result.snapshot.incorrectCount,1);
 assert.deepEqual(result.items.map(x=>x.verdict),["correct","correct","correct","incorrect","correct","pending"]);
 assert.ok(Math.abs(result.snapshot.earnedMarks-(4*2.5-5/6))<1e-10);
});
test("P47-5D rejects incomplete paper, missing keys and every kind's malformed answer",()=>{
 for(const kind of kinds){
  const a=readyDraft();
  const questions=a.questions.map((q,i)=>i===kinds.indexOf(kind)?{...q,answer:"?"}:q);
  const report=inspectAuthoringPublication({...a,questions});
  if(kind!=="free-response"){
   assert.equal(report.valid,false,kind);
   assert.ok(report.issues.some(x=>x.reason.match(/Enter|Use|format|Matching|finite|option/i)),kind);
   assert.throws(()=>compileAuthoringPublication({...a,questions}),PublicationValidationError);
  }
 }
 const a=readyDraft();
 for(const override of [
  {title:"Untitled question bank"},{examId:"new-exam"},{paperId:"new-paper"},
  {revision:0},{durationMinutes:1.25}
 ])assert.throws(()=>compileAuthoringPublication({...a,...override}));
 const q=a.questions[0];
 assert.throws(()=>compileAuthoringPublication({...a,questions:[{...q,options:[P(""),...q.options.slice(1)]}]}));
});
test("P47-5D never replaces published ID; increments and separately authenticates new revision",()=>{
 const a=readyDraft(),first=compileAuthoringPublication(a);
 assert.equal(inspectAuthoringPublication(a,[first]).valid,false);
 assert.throws(()=>compileAuthoringPublication(a,[first]),/already published/);
 const second=compileAuthoringPublication({...a,revision:2,questions:[
  {...a.questions[0],answer:"A"},...a.questions.slice(1)]},[first]);
 assert.notEqual(second.paper.id,first.paper.id);
 assert.notEqual(second.paper.contentHash,first.paper.contentHash);
 assert.notEqual(second.questions[0].contentHash,first.questions[0].contentHash);
 assert.equal(second.questions[0].questionId,first.questions[0].questionId);
 assert.equal(first.answerKey.entries[0].answer.optionId,"B");
 assert.equal(second.answerKey.entries[0].answer.optionId,"A");
});
test("P47-5D source/reviewed editions require provenance and a real source counterpart",()=>{
 const a=readyDraft(),source={...a,edition:"source"};
 assert.ok(inspectAuthoringPublication(source).valid);
 const signed=compileAuthoringPublication(source);
 const reviewed={...a,edition:"reviewed",questions:a.questions.map((q,i)=>
  i===0?{...q,answer:"A"}:q)};
 assert.ok(inspectAuthoringPublication(reviewed).issues.some(x=>x.field==="Edition"));
 const review=compileAuthoringPublication(reviewed,[signed]);
 assert.notEqual(review.paper.id,signed.paper.id);
 assert.equal(review.paper.paperId,signed.paper.paperId);
 assert.equal(review.questions[0].questionId,signed.questions[0].questionId);
 assert.equal(review.answerKey.entries[0].answer.optionId,"A");
 const missing={...source,questions:[{...source.questions[0],source:""}]};
 assert.ok(inspectAuthoringPublication(missing).issues.some(x=>/Provenance/.test(x.field)));
});
test("P47-5D authenticated local image references include only used assets",()=>{
 const a=readyDraft(),png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const dataUri="data:image/png;base64,"+png,bytes=Uint8Array.from(atob(png),c=>c.charCodeAt(0));
 const figure={id:"fig1",mediaType:"image/png",dataUri,
  contentHash:sha256(bytes),altText:"A 1 pixel science figure"};
 const richImage={format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:"Find the marked figure"},{type:"image",assetId:"fig1",altText:figure.altText}]}
 ]};
 const qa={...a,assets:[figure],questions:[{...a.questions[0],prompt:richImage}]};
 const compiled=compileAuthoringPublication(qa);
 assert.equal(compiled.assets.length,1);
 assert.deepEqual(compiled.questions[0].content.assetIds,["fig1"]);
 const tampered=structuredClone(compiled);tampered.assets[0].contentHash="0".repeat(64);
 assert.throws(()=>validateExamPackage(tampered),/digest mismatch/);
});
test("P47-5D rejects tampered already-published mathematical/source/key hashes",()=>{
 const pkg=compileAuthoringPublication(readyDraft());
 const bad=structuredClone(pkg);
 bad.questions[0].content.richPrompt.blocks[0].content[1].tex="\\wrongCommand";
 assert.throws(()=>validateExamPackage(bad),/hash mismatch/);
 const key=structuredClone(pkg);key.answerKey.entries[0].answer.optionId="D";
 assert.throws(()=>validateExamPackage(key),/hash mismatch/);
 const rules=structuredClone(pkg);rules.paper.scoring.defaultRule.correctMarks=100;
 assert.throws(()=>validateExamPackage(rules),/hash mismatch/);
});
test("P47-5D publisher depends on domain hashes and validated packages, never editor or storage",async()=>{
 const {readFile}=await import("node:fs/promises");
 const s=await readFile(new URL("../src/authoring/authoring-publisher.ts",import.meta.url),"utf8");
 assert.doesNotMatch(s,/from "wordgard\/|localStorage|indexedDB|document\.querySelector|fetch\(/);
 assert.match(s,/validateExamPackage/);
 assert.match(s,/answerKeyRevisionHash/);
 assert.match(s,/paperRevisionHash/);
});
