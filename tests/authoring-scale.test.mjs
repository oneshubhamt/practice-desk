/** P58-C independent high-volume source contract challenge.
 * No fixed-time perf assertion: elapsed measurements are observations on CI hardware.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {makeP58cSources,stageOf,P58C_KINDS} from "../scripts/p58c-synthetic-fixture.mjs";
import {validateStagingWorkspace,inspectStagingWorkspace,stagedToAuthoringDraft,
 updateStagedSelection,createStagingArchive,readStagingArchive} from "../src/authoring/authoring-staging.ts";
import {inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {validateAuthoringDraft} from "../src/authoring/authoring-draft.ts";
import {createDraftExchange,readDraftExchange} from "../src/authoring/authoring-exchange.ts";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";

test("P58-C F10: 8 different AI banks, 400 mixed six-kind questions, exactly 200 selected and immutable source publication",()=>{
 const start=performance.now();
 const sources=makeP58cSources(),stage=validateStagingWorkspace(stageOf(sources,200));
 assert.equal(stage.files.length,8);assert.equal(stage.selected.length,200);
 assert.equal(sources.reduce((n,s)=>n+s.questions.length,0),400);
 const report=inspectStagingWorkspace(stage);
 assert.equal(report.questions.length,400);
 assert.equal(report.selectedCount,200);
 assert.equal(report.errorCount,0,JSON.stringify(report.issues.filter(i=>i.severity==="error").slice(0,4)));
 const draft=stagedToAuthoringDraft(stage);
 assert.equal(draft.questions.length,200);
 assert.deepEqual(new Set(draft.questions.map(x=>x.kind)),new Set(P58C_KINDS));
 assert.equal(draft.assets.length,4);
 assert.equal(draft.stimuli?.length,4);
 for(const item of draft.questions){
  assert.ok(item.sourceOrigin&&item.sourceOrigin.bankId&&item.sourceOrigin.questionId);
  if(item.stimulusRef)assert.ok(draft.stimuli.some(s=>s.id===item.stimulusRef));
 }
 const compiled=inspectAuthoringPublication(draft);
 assert.equal(compiled.valid,true,JSON.stringify(compiled.issues.slice(0,6)));
 assert.equal(compiled.compiled?.questions.length,200);
 assert.equal(compiled.compiled?.answerKey.entries.length,200);
 assert.equal(compiled.compiled?.paper.sections.length,1);
 assert.equal(compiled.compiled?.assets.length,4);
 const q=compiled.compiled.questions[0],key=compiled.compiled.answerKey.entries[0];
 assert.equal(q.content.kind,"single-choice");
 assert.equal(key.answer.kind,"single-choice");
 const answerKey=key.answer;
 const score=scoreAttempt(compiled.compiled.paper,compiled.compiled.answerKey,
  compiled.compiled.questions,[{questionRevisionId:q.id,response:{kind:"single-choice",optionId:answerKey.optionId},
   timeSpentMs:500,answerChangeCount:0}],new Date("2026-11-05T15:00:00.000Z").toISOString());
 assert.ok(score.snapshot.earnedMarks<=2.5&&score.snapshot.earnedMarks>=0);
 const exchange=createDraftExchange(draft);
 assert.deepEqual(readDraftExchange(JSON.parse(JSON.stringify(exchange))),draft);
 const archive=createStagingArchive(stage);
 assert.deepEqual(readStagingArchive(JSON.parse(JSON.stringify(archive))),stage);
 console.log("P58-C measured Node scale 8/400 staged→200 published: "+Math.round(performance.now()-start)+" ms; no cross-device inference");
});

test("P58-C F10: actual 500-candidate cap is visible and source list remains non-destructively complete",()=>{
 const sources=makeP58cSources({duplicates:true,media:false}),stage=stageOf(sources,200);
 const report=inspectStagingWorkspace(stage);
 assert.equal(report.questions.length,400);
 assert.equal(report.duplicateTruncated,true);
 assert.ok(report.duplicateCandidates>=500);
 assert.ok(report.duplicatePairsInspected<report.duplicatePairsPossible,
  "A truncated report cannot claim a complete scan");
 const item=report.questions.find(q=>q.duplicates.length>0);
 assert.ok(item&&item.duplicates.length>0);
 assert.equal(stage.files[0].source.questions.length,50);
 assert.equal(stage.selected.length,200);
});

test("P58-C F10: 8/400/200 caps fail closed, source config disagreements rejected before any edits",()=>{
 const sources=makeP58cSources();
 const original=stageOf(sources,200);
 assert.throws(()=>validateStagingWorkspace({...original,files:[...original.files,original.files[0]]}),/Unsupported|Bank ID/);
 const forty=makeP58cSources({files:8,each:50});
 const overflow=structuredClone(original);overflow.files[0].source.questions.push({...forty[0].questions[0],id:"overflow"});
 assert.throws(()=>validateStagingWorkspace(overflow),/bounded to 400|Invalid/);
 assert.throws(()=>stagedToAuthoringDraft({...original,selected:original.files.flatMap(f=>f.source.questions.map(q=>f.source.bankId+"::"+q.id)).slice(0,201)}),/200 questions/);
 const disagree=structuredClone(original);disagree.files[7].source.scoring.correctMarks=4;
 assert.throws(()=>validateStagingWorkspace(disagree),/same exam, paper, revision, marking/);
 assert.deepEqual(validateStagingWorkspace(original).selected,original.selected,
  "Invalid later inputs may never alter the legitimate selected source");
});

test("P58-C F10: immutable historical revision and source edits do not silently overwrite prior scored exam",()=>{
 const sources=makeP58cSources({files:2,each:12,media:false});
 const stage=stageOf(sources,18),first=stagedToAuthoringDraft(stage);
 const compiled=inspectAuthoringPublication(first).compiled;
 assert.ok(compiled);
 const changedSource=structuredClone(sources);
 changedSource[0].questions[0].answer="D";
 const stage2=stageOf(changedSource,18);
 const second=stagedToAuthoringDraft(stage2);
 assert.equal(second.id,first.id,"source identity based staging can be handed off only after explicit fork control");
 const rejection=inspectAuthoringPublication(second,[compiled]);
 assert.equal(rejection.valid,false);
 const fresh=validateAuthoringDraft({...second,id:second.id+"-review2",revision:2});
 const next=inspectAuthoringPublication(fresh,[compiled]);
 assert.equal(next.valid,true,JSON.stringify(next.issues));
 assert.notEqual(compiled.paper.id,next.compiled.paper.id);
 assert.notEqual(compiled.answerKey.entries[0].answer.optionId,next.compiled.answerKey.entries[0].answer.optionId);
 assert.equal(compiled.answerKey.entries[0].answer.optionId,"B");
 assert.equal(next.compiled.answerKey.entries[0].answer.optionId,"D");
 assert.deepEqual(compiled.answerKey.entries[0].answer.optionId,"B");
});

test("P58-C F10: source-package citation and QA never auto-certifies fictional PYQ claims",()=>{
 const source=makeP58cSources({files:1,each:6,media:false})[0];
 source.questions[0].provenance={kind:"official-pyq",examYear:2025,
  sources:[{publisher:"Unverified synthetic office",title:"Fictitious notice",url:"https://example.gov.in/mock",provision:"Rule 1",asOfDate:"2026-11-05"}]};
 const report=inspectExternalQuestionBank(source);
 assert.equal(report.editorialStatus,"caution");
 assert.equal(report.factualVerification,"not-performed");
 assert.ok(report.issues.some(x=>x.code==="legal-currentness-unverified")===false);
 assert.ok(report.compiled.questions[0].editorial.status==="caution");
 assert.match(report.compiled.questions[0].editorial.notes,/NOT independently fetched or verified/);
});
