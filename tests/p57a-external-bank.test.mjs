/** P57-A red/green external authoring source contract and immutable end-to-end oracles. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {importAuthoredExam,importSimpleQuestionBank} from "../src/app/bank-import.ts";
import {compileExternalQuestionBank,inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
const fixture=async(name)=>JSON.parse(await readFile(new URL("../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
test("P57-A CAT external agent source compiles without authored hashes and reuses one shared RC and DILR stimulus",async()=>{
 const source=await fixture("cat"),report=inspectExternalQuestionBank(source);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 const pkg=compileExternalQuestionBank(source);
 assert.equal(validateExamPackage(pkg),pkg);
 assert.equal(JSON.stringify(pkg),JSON.stringify(compileExternalQuestionBank(structuredClone(source))));
 assert.equal(pkg.paper.sections.length,3);
 assert.deepEqual(pkg.questions.map(q=>q.content.kind),["single-choice","numeric-entry","multiple-select"]);
 assert.equal(pkg.stimuli.length,2);
 assert.equal(pkg.questions[0].content.stimulusId,pkg.stimuli[0].id);
 assert.equal(pkg.questions[1].content.stimulusId,pkg.stimuli[1].id);
 assert.equal(pkg.paper.timing.kind,"sectional");
 assert.equal(pkg.paper.timing.sectionLimits.length,3);
 assert.equal(pkg.questions[0].editorial.status,"caution");
 assert.match(pkg.questions[0].editorial.notes,/not been independently certified/);
 assert.equal(importAuthoredExam(source).paper.contentHash,pkg.paper.contentHash);
});
test("P57-A APFC academic subject hierarchy remains independent of one physical exam section",async()=>{
 const source=await fixture("apfc");
 const pkg=compileExternalQuestionBank(source);
 assert.equal(pkg.paper.sections.length,1);
 assert.equal(pkg.paper.sections[0].questionRevisionIds.length,3);
 assert.equal(pkg.questions.length,3);
 assert.ok(pkg.questions[0].content.topicIds[0].includes("Industrial"));
 assert.ok(pkg.questions[1].content.topicIds[0].includes("Developmental"));
 assert.ok(pkg.questions[2].content.topicIds[0].includes("Accountancy"));
 assert.equal(pkg.paper.scoring.defaultRule.incorrectMarks,-5/6);
 const q=pkg.questions[0],entries=pkg.answerKey.entries;
 const marked=[{questionRevisionId:q.id,response:{kind:"single-choice",optionId:"A"},timeSpentMs:0,answerChangeCount:0}];
 const result=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,marked,new Date().toISOString());
 assert.ok(Math.abs(result.snapshot.earnedMarks-(-5/6))<1e-10);
 const draft=toAuthoringDraft(source);
 assert.equal(draft.questions[0].section,"Combined Examination");
 assert.equal(draft.questions[0].syllabusHeadingId,"labour");
 assert.equal(entries[0].answer.optionId,"B");
});
test("P57-A external source rejects unsupported fields, fake IDs, broken references, suspect math and conflicting answer keys",async()=>{
 const source=await fixture("cat");
 const cases=[
  {format:"practice-desk-exam"},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,contentHash:"forged"})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,stimulusRef:"missing"})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,answer:"Z"})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,options:["x","y"]})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,prompt:"<script>alert(1)</script>"})},
  {timing:{...source.timing,kind:"sectional",sectionTransition:"automatic"},navigation:{...source.navigation,sectionNavigation:"free"}}
 ];
 for(const fields of cases){
  const input={...source,...fields};
  const report=inspectExternalQuestionBank(input);
  assert.equal(report.valid,false,JSON.stringify(fields));
  assert.ok(report.issues.length>0);
  assert.throws(()=>compileExternalQuestionBank(input));
 }
});
test("P57-A immutable question IDs survive source revisions; changed passage changes hashed reference and older key remains frozen",async()=>{
 const source=await fixture("cat");
 const p1=compileExternalQuestionBank(source);
 const p2=compileExternalQuestionBank({...source,revision:2,stimuli:source.stimuli.map((s,i)=>i? s:{...s,text:s.text+" Revision two."}),questions:source.questions.map((q,i)=>i? q:{...q,answer:"B"})});
 assert.notEqual(p1.paper.id,p2.paper.id);
 assert.equal(p1.questions[0].questionId,p2.questions[0].questionId);
 assert.notEqual(p1.questions[0].content.stimulusId,p2.questions[0].content.stimulusId);
 assert.notEqual(p1.questions[0].contentHash,p2.questions[0].contentHash);
 assert.equal(p1.answerKey.entries[0].answer.optionId,"A");
 assert.equal(p2.answerKey.entries[0].answer.optionId,"B");
 assert.equal(inspectExternalQuestionBank(source,[p1]).valid,false);
});
test("P57-A simple legacy authoring imports remain supported but are never automatically 'verified'",()=>{
 const legacy={format:"practice-desk-bank",version:1,bankId:"legacy-p57",examId:"mock",title:"Legacy import",revision:1,scoring:{correctMarks:1,incorrectMarks:0},questions:[{id:"q1",type:"mcq",question:"2+2?",options:["1","2","3","4"],answer:"D"}]};
 const pkg=importSimpleQuestionBank(legacy);
 assert.equal(pkg.questions[0].editorial.status,"caution");
});
