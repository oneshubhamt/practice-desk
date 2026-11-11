/** P48-1 independent hostile-input, strict v1/v4 schemas and compiler CSP tests.
 * Inputs are rebuilt from real domain fixtures, not prior CI success labels.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {pkg} from "./fixtures/six-kinds.mjs";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {makeBackup,verifyBackup} from "../src/history/backup.ts";
import {builtinCglPackages,startGenericAttempt} from "../src/app/exam-package.ts";
import {createSourceKeyReference,validateSourceKeyReference} from "../src/engine/source-comparison.ts";
import {createSourceReviewReference,validateSourceReviewReference} from "../src/engine/review-source.ts";

const mutate=(fn)=>{const copy=structuredClone(pkg);fn(copy);return copy;};
const authoringExample=JSON.parse(await readFile(
 new URL("../examples/apfc-authoring-example.json",import.meta.url),"utf8"));



test("P48-1 unknown unsigned fields are rejected at every exam/key/paper nested boundary",()=>{
 // Control: valid pre-existing six-kind and canonical authoring source remain usable.
 assert.equal(validateExamPackage(structuredClone(pkg)).paper.id,pkg.paper.id);
 assert.equal(compileExternalQuestionBank(structuredClone(authoringExample)).questions.length,3);

 const invalid=[
  ["envelope",p=>p.silentPayload={canExecute:"never"}],
  ["question",p=>p.questions[0].secretOverride="A"],
  ["question content",p=>p.questions[0].content.shadowAnswer="B"],
  ["option",p=>p.questions[0].content.options[0].surplus="secret"],
  ["editorial",p=>p.questions[0].editorial.sourceSignature="false"],
  ["key",p=>p.answerKey.claimedIssuer="official"],
  ["answer entry",p=>p.answerKey.entries[0].forged="value"],
  ["answer body",p=>p.answerKey.entries[0].answer.injected="<img onerror=alert(1)>"],
  ["paper",p=>p.paper.hiddenTimer=999],
  ["section",p=>p.paper.sections[0].unknownSectionRule=true],
  ["timing",p=>p.paper.timing.unrecognizedPause=true],
  ["navigation",p=>p.paper.navigation.skipPolicy=true],
  ["scoring",p=>p.paper.scoring.hiddenMark=true],
  ["marking",p=>p.paper.scoring.defaultRule.unboundedCredit=100],
  ["partial credit",p=>{p.paper.scoring.defaultRule.partialCredit={
    kind:"per-correct-component",marksPerCorrectComponent:1,shadowMark:5};}],
  ["numeric rules",p=>p.questions[2].content.numericRules.unverifiedBias=12],
  ["response rules",p=>p.questions[5].content.responseRules.injectedMax=100],
  ["matching item",p=>p.questions[4].content.leftItems[0].answerHint="bogus"]
 ];
 for(const [name,fn] of invalid)
   assert.throws(()=>validateExamPackage(mutate(fn)),/unsupported field/,name);
});
test("P48-1 canonical authoring envelopes cannot launder undeclared metadata",()=>{
 const tests=[
  [bank=>bank.certificate="government", "root"],
  [bank=>bank.scoring.overrideKey="B","scoring"],
  [bank=>bank.questions[0].candidateScript="<svg onload=alert(1)>","question"],
  [bank=>bank.timing.unapprovedMode="strict","timing"],
  [bank=>bank.media=[{id:"a",dataUri:"data:image/png;base64,AA==",altText:"x",unauthorized:true}],"media"]
 ];
 for(const [fn,label] of tests){
   const copy=structuredClone(authoringExample);
   fn(copy);
   assert.throws(()=>compileExternalQuestionBank(copy),/unsupported|field|media/i,label);
 }
});

test("P48-1 frozen CGL source review references reject unsigned extra metadata without losing valid Q32 provenance",async()=>{
 const base=new URL("../src/content/",import.meta.url);
 const papers=JSON.parse(await readFile(new URL("papers.json",base),"utf8"));
 const patches=JSON.parse(await readFile(new URL("patches.json",base),"utf8"));
 const builtins=builtinCglPackages(papers,patches);
 const source=builtins.find(p=>p.paper.paperId==="cgl-2026-10-05"&&p.paper.edition==="source");
 const reviewed=builtins.find(p=>p.paper.paperId==="cgl-2026-10-05"&&p.paper.edition==="reviewed");
 assert.ok(source&&reviewed);
 const keyRef=createSourceKeyReference(reviewed,source);
 const reviewRef=createSourceReviewReference(reviewed,source);
 assert.ok(keyRef&&reviewRef);
 const attempt={...startGenericAttempt(reviewed,"p48-sec-cgl",Date.UTC(2026,10,4)),
   sourceKeyReference:keyRef,sourceReviewReference:reviewRef};
 validateSourceKeyReference(attempt);
 validateSourceReviewReference(attempt);
 const adversarial=[
  [a=>a.sourceKeyReference.selfSignedBy="UPSC",validateSourceKeyReference,/fields/],
  [a=>a.sourceKeyReference.entries[0].promotedKey=true,validateSourceKeyReference,/entry fields/],
  [a=>a.sourceReviewReference.publisherSignature="invented",validateSourceReviewReference,/fields/],
  [a=>a.sourceReviewReference.entries[0].extraSource="not verified",validateSourceReviewReference,/entry fields/]
 ];
 for(const [mutate,verify,pattern] of adversarial){
   const copy=structuredClone(attempt);mutate(copy);
   assert.throws(()=>verify(copy),pattern);
 }
});
test("P48-1 generated offline HTML restricts execution to its exact compiled runtime SHA-256",async()=>{
 const html=await readFile(new URL("../Practice_Desk_Offline_Mock_Tests.html",import.meta.url),"utf8");
 const meta=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
 assert.ok(meta,"CSP must be embedded before script tags");
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script,"exactly one executable inline runtime required");
 assert.equal((html.match(/<script>/g)||[]).length,1);
 const hash=createHash("sha256").update(script[1],"utf8").digest("base64");
 assert.ok(meta[1].includes("script-src 'sha256-"+hash+"'"),"digest must bind actual JS source bytes");
 for(const directive of ["default-src 'none'","connect-src 'none'","object-src 'none'",
   "base-uri 'none'","form-action 'none'","frame-src 'none'","worker-src 'none'",
   "font-src data:","img-src data: blob:","script-src-attr 'none'"]){
   assert.ok(meta[1].includes(directive),"Missing offline CSP boundary: "+directive);
 }
 assert.ok(!meta[1].includes("script-src 'unsafe-inline'")&&!meta[1].includes("unsafe-eval"));
 assert.ok(html.indexOf('http-equiv="Content-Security-Policy"')<html.indexOf("<script>"),
  "CSP must be parsed before executable bundle");
});
