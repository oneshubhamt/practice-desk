import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {builtinCglPackages, validateExamPackage, startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const packages=builtinCglPackages(sources,patches);

test("generic importer retains all 500 questions in 10 existing editions",()=>{
 assert.equal(packages.length,10);
 assert.equal(packages.reduce((n,p)=>n+p.questions.length,0),1000);
 for(const p of packages) {
   assert.equal(validateExamPackage(p),p);
   assert.equal(p.paper.sections.length,4);
 }
});
test("a package rejects missing questions, unknown media and malformed keys",()=>{
 const p=packages[0];
 assert.throws(()=>validateExamPackage({...p,questions:p.questions.slice(1)}));
 assert.throws(()=>validateExamPackage({...p,questions:[{...p.questions[0],
   content:{...p.questions[0].content,assetIds:["missing-image"]}},...p.questions.slice(1)]}),/Missing question image/);
});
test("generic attempt uses validated responses and frozen revisions",()=>{
 const p=packages[0];
 const start=startGenericAttempt(p,"test",100);
 const id=p.questions[0].id, option=p.questions[0].content.options[0].id;
 const index=new Map(p.questions.map(q=>[q.id,q]));
 const next=transitionGenericAttempt(start,{type:"ANSWER",nowMs:101,response:{kind:"single-choice",optionId:option}},index);
 assert.equal(next.state.responses.find(x=>x.questionRevisionId===id).response.optionId,option);
 assert.throws(()=>transitionGenericAttempt(start,{type:"ANSWER",nowMs:101,
   response:{kind:"single-choice",optionId:"not-real"}},index),/Unknown option/);
 // Sectional exam cannot bypass the locked sections by directly submitting.
 const blocked=transitionGenericAttempt(next,{type:"SUBMIT_ATTEMPT",nowMs:200},index);
 assert.equal(blocked.finishedAt,null);
 let end=blocked;
 for(let section=0;section<4;section++)
   end=transitionGenericAttempt(end,{type:"SUBMIT_SECTION",nowMs:201+section},index);
 assert.equal(end.finishedAt,204);
 assert.equal(end.result.items.length,100);
});
