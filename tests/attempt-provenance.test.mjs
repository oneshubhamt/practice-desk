import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
 builtinCglPackages,cglAttemptMode,configureCglPractice,startGenericAttempt,validateExamPackage
} from "../src/app/exam-package.ts";
import {composePracticeSet} from "../src/app/practice-compose.ts";

const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const reviewed=builtinCglPackages(sources,patches).find(p=>p.paper.edition==="reviewed");
assert.ok(reviewed);

test("runtime CGL practice policy is not accepted as canonical ExamPackage content",()=>{
 assert.equal("practiceMode" in reviewed,false);
 assert.throws(()=>validateExamPackage({...reviewed,practiceMode:"single"}),/unsupported field/);
});

test("attempt creation freezes deliberate CGL modes while ordinary packages default safely",()=>{
 assert.equal(startGenericAttempt(reviewed,"ordinary",0).frozen.snapshot.mode,"exam-simulation");
 for(const [policy,expected] of [
  ["strict","exam-simulation"],["free","full-paper-practice"],["single","section-practice"]
 ]){
  const configured=configureCglPractice(reviewed,policy,0);
  assert.equal("practiceMode" in configured,false);
  assert.equal(startGenericAttempt(configured,policy,0,cglAttemptMode(policy)).frozen.snapshot.mode,expected);
 }
});

test("custom composition always freezes custom-practice provenance regardless of CGL source policy",()=>{
 for(const [policy,index] of [["strict",0],["free",0],["single",1]]){
  const configured=configureCglPractice(reviewed,policy,index);
  const selection=composePracticeSet(configured,{count:1,seed:"cleer-"+policy,filters:{}});
  assert.equal("practiceMode" in selection.bundle,false);
  const attempt={...startGenericAttempt(selection.bundle,"custom-"+policy,0,"custom-practice"),
   practiceComposition:selection.manifest};
  assert.equal(attempt.frozen.snapshot.mode,"custom-practice");
  assert.equal(attempt.practiceComposition.sourcePaperRevisionId,configured.paper.id);
 }
});
