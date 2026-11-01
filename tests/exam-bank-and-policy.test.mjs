import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {importAuthoredExam,importSimpleQuestionBank} from "../src/app/bank-import.ts";
import {validateExamPackage,builtinCglPackages,configureCglPractice,
 configureUntimedPractice,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validatePracticeSetups} from "../src/app/practice-selection.ts";
const starter=JSON.parse(await readFile(new URL("../examples/apfc-mcq-nat-starter.json",import.meta.url),"utf8"));
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url),"utf8"));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url),"utf8"));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url),"utf8"));
test("easy APFC/NAT author bank generates a strict validated immutable exam package",()=>{
 const pkg=importAuthoredExam(starter);
 assert.equal(pkg.questions.length,3);
 assert.equal(pkg.paper.sections.length,3);
 assert.equal(pkg.paper.timing.kind,"untimed");
 assert.equal(pkg.paper.scoring.defaultRule.correctMarks,2.5);
 assert(Math.abs(pkg.paper.scoring.defaultRule.incorrectMarks-(-5/6))<1e-12,
  "APFC negative 1/3 of 2.5 marks must retain the full fractional value, not round to -0.83");
 assert.deepEqual(pkg.questions.map(q=>q.content.kind),["single-choice","single-choice","numeric-entry"]);
 assert.equal(pkg.answerKey.entries[0].answer.optionId,"A");
 assert.equal(pkg.answerKey.entries[1].answer.optionId,"B");
 assert.equal(pkg.answerKey.entries[2].answer.acceptedValues[0],4);
 assert.equal(validateExamPackage(pkg),pkg);
 const copy=importSimpleQuestionBank(JSON.parse(JSON.stringify(starter)));
 assert.deepEqual(copy,pkg,"Same authored question bank must generate same revision/content hashes");
});
test("simple-bank input rejects malformed keys, excess questions, invalid marks and NAT tolerance",()=>{
 const edited=mutate=>{const x=structuredClone(starter);mutate(x);return x;};
 for(const [name,mutate] of [
  ["duplicate",x=>x.questions[1].id=x.questions[0].id],
  ["letter outside options",x=>x.questions[0].answer="Z"],
  ["bad question",x=>x.questions[0].question=""],
  ["negative tolerance",x=>x.questions[2].tolerance=-0.01],
  ["invalid penalty",x=>x.scoring.incorrectMarks=10],
  ["huge count",x=>x.questions=Array.from({length:2001},(_,i)=>({...x.questions[0],id:"q"+i}))],
  ["unsupported content",x=>x.questions[0].type="bogus"],
  ["duplicate bank identifier",x=>x.bankId="hello world"],
 ]){
  assert.throws(()=>importSimpleQuestionBank(edited(mutate)),undefined,name);
 }
});
test("untimed option derives new validated frozen policy for every built-in mode and generic package",()=>{
 const p=builtinCglPackages(sources,patches,solutions).find(x=>x.paper.edition==="reviewed");
 assert(p);
 for(const mode of ["strict","free","single"]){
  const base=configureCglPractice(p,mode,2);
  const untimed=configureUntimedPractice(base,true);
  assert.notEqual(untimed.paper.id,base.paper.id);
  assert.notEqual(untimed.paper.contentHash,base.paper.contentHash);
  assert.equal(untimed.paper.timing.kind,"untimed");
  assert.deepEqual(untimed.paper.navigation,base.paper.navigation);
  assert.deepEqual(untimed.answerKey,base.answerKey);
  assert.equal(untimed.questions.length,base.questions.length);
  assert.equal(validateExamPackage(untimed),untimed);
  assert.equal(configureUntimedPractice(base,false),base);
  const attempt=startGenericAttempt(untimed,mode+"-untimed",1000);
  const lookup=new Map(untimed.questions.map(q=>[q.id,q]));
  const tick=transitionGenericAttempt(attempt,{type:"TICK",nowMs:1000+3*3600000},lookup);
  assert.equal(tick.state.status,"running","Untimed mode must never time out even after three hours");
  if(mode==="strict"){
   const continued=transitionGenericAttempt(tick,{type:"SUBMIT_SECTION",nowMs:1000+3*3600000+1},lookup);
   assert.equal(continued.state.sectionIndex,1,"Untimed strict exam must still allow forward section progression");
   assert.equal(continued.state.status,"running");
  }
 }
 const custom=importAuthoredExam({...starter,timing:{kind:"whole-paper",minutes:20}});
 assert.equal(custom.paper.timing.kind,"whole-paper");
 const unlocked=configureUntimedPractice(custom,true);
 assert.equal(unlocked.paper.timing.kind,"untimed");
 assert.equal(unlocked.paper.edition,"custom");
 assert.equal(validateExamPackage(unlocked),unlocked);
});
test("P43 per-family selection rejects invalid mode, edition and untimed values",()=>{
 const valid={schema:2,selectedFamilyId:"builtin:ssc-cgl",families:{
   "builtin:ssc-cgl":{paperRevisionId:"paper-x",mode:"free",section:2,untimed:true,edition:"source"}
 }};
 assert.equal(validatePracticeSetups(valid).selectedFamilyId,"builtin:ssc-cgl");
 for(const [field,invalid] of [["untimed","yes"],["edition","corrupt"],["section",-1],["mode","other"]]){
   const copy=structuredClone(valid);
   copy.families["builtin:ssc-cgl"][field]=invalid;
   assert.throws(()=>validatePracticeSetups(copy),/Invalid/);
 }
});
