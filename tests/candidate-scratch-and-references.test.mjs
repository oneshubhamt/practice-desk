import test from "node:test";
import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {createCandidateReferenceResource} from "../src/domain/candidate-reference.ts";
import {emptyCandidateScratch,validateCandidateScratch} from "../src/domain/candidate-scratch.ts";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";
import {makeBackup,verifyBackup} from "../src/history/backup.ts";
import {reconstructRecords} from "../src/history/shared-store.ts";
import {buildLearnerFocusPacket} from "../src/learning/learner-focus.ts";
import {newAuthoringDraft} from "../src/authoring/authoring-draft.ts";
import {compileAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";

function referenceBundle(){
 const reference=createCandidateReferenceResource({
  id:"formula-sheet",title:"Formula sheet",category:"Mathematics",
  keywords:["formula","area"],document:plainRichDocument("Area of a circle = pi r squared")
 });
 const base={...pkg.paper,candidateTools:{
  ...(pkg.paper.candidateTools??{}),
  references:[{id:reference.id,contentHash:reference.contentHash}]
 }};
 const paper={...base,contentHash:paperRevisionHash(base)};
 return {bundle:validateExamPackage({...pkg,paper,candidateReferences:[reference]}),reference};
}
function annotatedScratch(){
 return {
  schema:1,
  eliminations:[{questionRevisionId:"rev-0",optionIds:["b"]}],
  highlights:[{id:"h-1",surface:{kind:"question-prompt",questionRevisionId:"rev-0"},
   anchor:{kind:"plain",start:0,end:6},color:"yellow"}]
 };
}

test("candidate references are exact-hash bound to the executable paper and frozen attempt",()=>{
 const imageBound={id:"with-image",title:"Image-bound reference",document:plainRichDocument("Reference image"),
  assetIds:["ref-image"]};
 const imageA=createCandidateReferenceResource(imageBound,[{id:"ref-image",contentHash:"a".repeat(64)}]);
 const imageB=createCandidateReferenceResource(imageBound,[{id:"ref-image",contentHash:"b".repeat(64)}]);
 assert.notEqual(imageA.contentHash,imageB.contentHash,
  "reference identity must change when a linked image digest changes");

 const {bundle,reference}=referenceBundle();
 assert.equal(bundle.paper.candidateTools.references[0].contentHash,reference.contentHash);
 const attempt=startGenericAttempt(bundle,"reference-attempt",1000);
 assert.equal(attempt.frozen.schema,3);
 assert.deepEqual(attempt.frozen.candidateReferences,[reference]);
 assert.deepEqual(attempt.candidateScratch,emptyCandidateScratch());

 const changed={...reference,title:"Changed title"};
 assert.throws(()=>validateExamPackage({...bundle,candidateReferences:[changed]}),/content hash mismatch/);
 assert.throws(()=>validateExamPackage({...bundle,candidateReferences:[]}),/inventory does not match/);

 const without={...pkg.paper,candidateTools:{references:[]}};
 const withRef={...pkg.paper,candidateTools:{references:[{id:reference.id,contentHash:reference.contentHash}]}};
 assert.notEqual(paperRevisionHash(without),paperRevisionHash(withRef),
  "candidate-visible reference bindings must change paper identity");
});

test("candidate scratch validates stable option IDs and source-anchored highlights",()=>{
 const scratch=validateCandidateScratch(annotatedScratch(),{questions,stimuli:[]});
 assert.equal(scratch.eliminations[0].optionIds[0],"b");
 assert.equal(scratch.highlights[0].anchor.end,6);
 assert.throws(()=>validateCandidateScratch({...scratch,eliminations:[
  {questionRevisionId:"rev-0",optionIds:["not-real"]}
 ]},{questions,stimuli:[]}),/unknown or duplicate option/);
 assert.throws(()=>validateCandidateScratch({...scratch,highlights:[{
  ...scratch.highlights[0],anchor:{kind:"plain",start:0,end:1000}
 }]},{questions,stimuli:[]}),/range exceeds/);
 assert.throws(()=>validateCandidateScratch({...scratch,highlights:[{
  ...scratch.highlights[0],surface:{kind:"question-prompt",questionRevisionId:"rev-3"}
 }]},{questions,stimuli:[]}),/range exceeds/,
  "highlight ranges are validated against the exact frozen target text");
});

test("candidate scratch is durable attempt evidence but never changes scoring",()=>{
 const bundle=validateExamPackage(pkg);
 const lookup=new Map(bundle.questions.map(q=>[q.id,q]));
 const base=startGenericAttempt(bundle,"scratch-score",1000);
 const withScratch={...base,candidateScratch:validateCandidateScratch(annotatedScratch(),{
  questions:base.frozen.questions,stimuli:base.frozen.stimuli
 })};
 const answer={type:"ANSWER",nowMs:1010,response:{kind:"single-choice",optionId:"a"}};
 const finish={type:"SUBMIT_ATTEMPT",nowMs:1020};
 const scored=transitionGenericAttempt(transitionGenericAttempt(withScratch,answer,lookup),finish,lookup);
 const control=transitionGenericAttempt(transitionGenericAttempt(base,answer,lookup),finish,lookup);
 assert.deepEqual(scored.result,control.result);
 assert.deepEqual(scored.candidateScratch,withScratch.candidateScratch);
 assert.equal(validateGenericStoredRecord({...scored,saveRevision:1}).candidateScratch.highlights.length,1);
});

test("backup preserves candidate scratch while learner-focus privacy excludes it",()=>{
 const bundle=validateExamPackage(pkg);
 const lookup=new Map(bundle.questions.map(q=>[q.id,q]));
 let attempt=startGenericAttempt(bundle,"scratch-backup",1000);
 attempt={...attempt,candidateScratch:validateCandidateScratch(annotatedScratch(),{
  questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli
 })};
 attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1010,
  response:{kind:"single-choice",optionId:"b"}},lookup);
 attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:1020},lookup);
 const stored={...attempt,saveRevision:1};
 const rawArchive=makeBackup([stored],{schema:1,dark:false,scale:100},
  "2026-11-21T00:00:00.000Z");
 assert.equal(rawArchive.version,6);
 assert.throws(()=>verifyBackup({...rawArchive,version:5}),/Invalid backup format/,
  "the schema-3 attempt topology must not masquerade as the prior backup envelope");
 const archive=verifyBackup(rawArchive);
 const [restored]=reconstructRecords(archive.records,archive.snapshots);
 const valid=validateGenericStoredRecord(restored);
 assert.deepEqual(valid.candidateScratch,stored.candidateScratch);
 assert.equal(valid.frozen.candidateReferences.length,0);

 const focus=buildLearnerFocusPacket([valid],[],new Set(),{
  examId:"example-exam",mode:"detailed",intent:"targeted-practice",
  asOf:"2026-11-21T00:00:00.000Z"
 });
 assert.ok(focus);
 assert.ok(focus.privacy.omitted.includes("candidate-scratch"));
 assert.equal(JSON.stringify(focus).includes("candidateScratch"),false);
 assert.equal(JSON.stringify(focus).includes('"eliminations"'),false);
 assert.equal(JSON.stringify(focus).includes('"highlights"'),false);
});

test("Wordgard authoring publishes references through the canonical package path",()=>{
 const initial=newAuthoringDraft();
 const question={...initial.questions[0],
  prompt:plainRichDocument("Which option is correct?"),
  options:[plainRichDocument("Correct"),plainRichDocument("Incorrect")],
  answer:"A",minSelections:1,maxSelections:2
 };
 const draft={...initial,examId:"reference-exam",paperId:"reference-paper",
  title:"Reference-enabled practice paper",
  references:[{id:"permitted-reference",title:"Permitted reference",
   category:"General",keywords:["reference"],document:plainRichDocument("Candidate-visible reference text")}],
  questions:[question]
 };
 const compiled=compileAuthoringPublication(draft);
 assert.equal(compiled.candidateReferences.length,1);
 assert.equal(compiled.paper.candidateTools.references.length,1);
 assert.equal(compiled.paper.candidateTools.references[0].id,"permitted-reference");
 assert.equal(validateExamPackage(compiled),compiled);
});


test("external/agent authoring references converge on the same canonical publisher",async()=>{
 const source=JSON.parse(await readFile(new URL("../examples/apfc-authoring-example.json",import.meta.url),"utf8"));
 source.bankId="reference-external";
 source.paperId="reference-external-paper";
 source.title="External authoring with reference";
 source.references=[{id:"permitted-extract",title:"Permitted extract",category:"Law",
  keywords:["extract","reference"],content:"Candidate-visible statutory extract supplied with the paper."}];
 const compiled=compileExternalQuestionBank(source);
 assert.equal(compiled.candidateReferences?.length,1);
 assert.equal(compiled.candidateReferences?.[0].id,"permitted-extract");
 assert.deepEqual(compiled.paper.candidateTools?.references?.map(x=>x.id),["permitted-extract"]);
 assert.equal(validateExamPackage(compiled),compiled);

 const leaked=structuredClone(source);
 leaked.references=[{id:"bad-reference",title:"Leaking reference",content:"The correct answer is B."}];
 assert.throws(()=>compileExternalQuestionBank(leaked),/candidate-visible reference|answer.*leak|correct answer/i,
  "candidate references must share the pre-submit answer-secrecy boundary");
});
