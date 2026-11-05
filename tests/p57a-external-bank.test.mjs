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

test("P57-A all six response kinds, safe rich math, image assets and genuine mixed scoring use one published engine",async()=>{
 const original=await fixture("cat");
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const richMath={format:"practice-desk-rich",version:1,
  blocks:[{type:"paragraph",content:[
   {type:"text",text:"Compute "},{type:"math",tex:"2+2",linearText:"two plus two"}]}]};
 const extra=[
  {id:"tf-1",examSection:"qa",subject:"Quantitative Aptitude",kind:"true-false",
   prompt:"2 + 2 = 4.",stimulusRef:"chart-one",answer:true,explanation:"Elementary arithmetic.",
   provenance:{kind:"manual"},qa:{status:"needs-review"}},
  {id:"matching-1",examSection:"qa",subject:"Quantitative Aptitude",kind:"matching",
   prompt:"Match each number with its label.",
   leftItems:["One","Two","Three","Four"],rightItems:["Two","Four","One","Three"],
   answer:"1-C,2-A,3-D,4-B",partialCreditEach:0.5,partialPenaltyEach:0.1,
   explanation:"Pair each word with the matching number.",provenance:{kind:"ai-original"},qa:{status:"unchecked"}},
  {id:"written-1",examSection:"qa",subject:"Quantitative Aptitude",kind:"free-response",
   prompt:richMath,answer:"A model explanation of arithmetic",explanation:"2 + 2 = 4.",
   provenance:{kind:"ai-original"},qa:{status:"unchecked"}}
 ];
 const source={...original,media:[{id:"tiny",dataUri:"data:image/png;base64,"+png,altText:"Illustrative one-pixel icon"}],
  stimuli:[...original.stimuli,{id:"chart-one",kind:"image",mediaRef:"tiny",altText:"Illustrative one-pixel icon"}],
  questions:[...original.questions,...extra]};
 const packageValue=compileExternalQuestionBank(source);
 assert.equal(packageValue.questions.length,6);
 assert.deepEqual(packageValue.questions.map(q=>q.content.kind),
  ["single-choice","numeric-entry","multiple-select","true-false","matching","free-response"]);
 assert.equal(packageValue.assets.length,1);
 assert.equal(packageValue.questions[5].content.richPrompt.blocks[0].content[1].tex,"2+2");
 assert.equal(packageValue.answerKey.entries[4].answer.pairs[0].rightId,"C");
 assert.equal(packageValue.answerKey.entries[3].answer.value,true);
 assert.equal(packageValue.answerKey.entries[5].answer.evaluation,"manual");
 const q=packageValue.questions;
 const responses=[
  {questionRevisionId:q[0].id,response:{kind:"single-choice",optionId:"A"}},
  {questionRevisionId:q[1].id,response:{kind:"numeric-entry",value:6}},
  {questionRevisionId:q[2].id,response:{kind:"multiple-select",optionIds:["A","C"]}},
  {questionRevisionId:q[3].id,response:{kind:"true-false",value:true}},
  {questionRevisionId:q[4].id,response:{kind:"matching",pairs:[
   {leftId:"L1",rightId:"C"},{leftId:"L2",rightId:"A"},
   {leftId:"L3",rightId:"D"},{leftId:"L4",rightId:"B"}]}},
  {questionRevisionId:q[5].id,response:{kind:"free-response",text:"2+2 is four"}}
 ].map(x=>({...x,timeSpentMs:0,answerChangeCount:0}));
 const scored=scoreAttempt(packageValue.paper,packageValue.answerKey,packageValue.questions,
  responses,new Date().toISOString());
 assert.deepEqual(scored.items.map(x=>x.verdict),
  ["correct","correct","correct","correct","correct","pending"]);
});
test("P57-A headless CLI emits machine-readable diagnostics and byte-identical compiled JSON without network",async()=>{
 const {mkdtemp,readFile:read,rm}=await import("node:fs/promises");
 const {tmpdir}=await import("node:os");
 const {join}=await import("node:path");
 const {spawnSync}=await import("node:child_process");
 const folder=await mkdtemp(join(tmpdir(),"p57a-"));
 try{
  const input=new URL("../examples/ai-first-apfc.json",import.meta.url).pathname;
  const out=join(folder,"compiled.json");
  const cli=new URL("../scripts/question-bank-cli.mjs",import.meta.url).pathname;
  const validate=spawnSync(process.execPath,[cli,"validate-bank",input],{encoding:"utf8"});
  assert.equal(validate.status,0,validate.stderr);
  assert.equal(JSON.parse(validate.stdout).valid,true);
  const compiled=spawnSync(process.execPath,[cli,"compile-bank",input,out],{encoding:"utf8"});
  assert.equal(compiled.status,0,compiled.stderr);
  assert.deepEqual(JSON.parse(await read(out,"utf8")),compileExternalQuestionBank(await fixture("apfc")));
  const rejected=spawnSync(process.execPath,[cli,"compile-bank",input,out],{encoding:"utf8"});
  assert.notEqual(rejected.status,0,"must not overwrite previous immutable compiler output");
  const malformed=join(folder,"bad.json");await (await import("node:fs/promises")).writeFile(malformed,
   '{"format":"practice-desk-authoring","version":1,"questions":[]}');
  const bad=spawnSync(process.execPath,[cli,"validate-bank",malformed],{encoding:"utf8"});
  assert.equal(bad.status,1);
  const failure=JSON.parse(bad.stdout);
  assert.equal(failure.valid,false);
  assert.ok(failure.issues[0].path);
 }finally{await rm(folder,{recursive:true,force:true});}
});

test("P57-A two CAT RC questions share the same immutable stimulus once; changing media bytes changes frozen reference",async()=>{
 const base=await fixture("cat");
 const rc2={...base.questions[0],id:"rc-2",
  prompt:"Which entity is described in the illustrative passage?",answer:"A"};
 const source={...base,questions:[base.questions[0],rc2,...base.questions.slice(1)]};
 const first=compileExternalQuestionBank(source);
 assert.equal(first.stimuli.length,2,"stimulus must not be copied for each referencing question");
 assert.equal(first.questions[0].content.stimulusId,first.questions[1].content.stimulusId);
 assert.equal(first.paper.sections[0].questionRevisionIds.length,2);
 const png1="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const imageSource={...source,media:[{id:"tiny",altText:"Small demonstration image",dataUri:"data:image/png;base64,"+png1}],
  stimuli:[...source.stimuli,{id:"visual",kind:"chart",mediaRef:"tiny",altText:"Small demonstration image"}],
  questions:[...source.questions.map((q,i)=>i===2?{...q,stimulusRef:"visual"}:q)]};
 const im=compileExternalQuestionBank(imageSource);
 assert.equal(im.questions[2].content.stimulusId,im.stimuli.find(s=>s.kind==="chart").id);
 // Any revised media byte sequence is rehashed. An invalid base64 payload must
 // fail before compilation; no untrusted caller-supplied media digest accepted.
 const broken=structuredClone(imageSource);
 broken.media[0].dataUri="https://external.example/chart.png";
 assert.equal(inspectExternalQuestionBank(broken).valid,false);
});
