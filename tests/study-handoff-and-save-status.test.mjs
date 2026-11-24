import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {paperRevisionHash,questionRevisionHash} from "../src/domain/integrity.ts";
import {validateCandidateScratch} from "../src/domain/candidate-scratch.ts";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {candidateSaveStatus} from "../src/app/storage-health.ts";
import {updateWorkspaceStorageHealth} from "../src/app/storage-health-controller.ts";
import {
 DEFAULT_STUDY_HANDOFF_SELECTION,STUDY_HANDOFF_MAX_OUTPUT_CHARS,
 buildStudyHandoffPacket,serializeStudyHandoffJson,serializeStudyHandoffMarkdown,
 studyHandoffFileName,studyHandoffPanelHTML
} from "../src/app/study-handoff.ts";

function completed(bundle=validateExamPackage(pkg),id="PRIVATE-ATTEMPT-ID"){
 const lookup=new Map(bundle.questions.map(question=>[question.id,question]));
 let attempt=startGenericAttempt(bundle,id,1000);
 const first=attempt.frozen.questions.find(q=>q.id==="rev-0");
 const anchor=first?.content.richPrompt?
  {kind:"rich",path:[0,0],start:0,end:6}:{kind:"plain",start:0,end:6};
 attempt={...attempt,candidateScratch:validateCandidateScratch({
  schema:1,
  eliminations:[{questionRevisionId:"rev-0",optionIds:["b"]}],
  highlights:[{id:"handoff-highlight",surface:{kind:"question-prompt",questionRevisionId:"rev-0"},
   anchor,color:"yellow"}]
 },{questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli})};
 attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1100,
  response:{kind:"single-choice",optionId:"a"}},lookup);
 attempt=transitionGenericAttempt(attempt,{type:"FLAG",nowMs:1200,flagged:true},lookup);
 return transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:1500},lookup);
}

test("Pass E save indicator is a projection of pending writes and the existing storage lock",()=>{
 assert.equal(candidateSaveStatus({pendingWrites:1,locked:false}).label,"Saving…");
 assert.equal(candidateSaveStatus({pendingWrites:0,locked:false}).label,"Saved");
 assert.equal(candidateSaveStatus({pendingWrites:0,locked:true}).label,"Save problem");

 let snapshot={pendingWrites:2,lastCommittedAt:null,lastFailure:null,locked:false,loading:false,inMemoryRecords:1};
 const badge={
  textContent:"",dataset:{},title:"",attributes:new Map(),
  setAttribute(name,value){this.attributes.set(name,value);}
 };
 const owner={
  root:{querySelector(selector){return selector==="#g-save-state"?badge:null;}},
  storageSnapshot:()=>snapshot,records:new Map(),lastCommittedAt:null,lastStorageFailure:null
 };
 updateWorkspaceStorageHealth(owner);
 assert.equal(badge.textContent,"Saving…");
 assert.equal(badge.dataset.saveState,"saving");
 snapshot={...snapshot,pendingWrites:0};
 updateWorkspaceStorageHealth(owner);
 assert.equal(badge.textContent,"Saved");
 snapshot={...snapshot,locked:true};
 updateWorkspaceStorageHealth(owner);
 assert.equal(badge.textContent,"Save problem");
 assert.equal(badge.dataset.saveState,"problem");
});

test("Study Handoff exposes explicit inclusion controls and keeps annotations opt-in",()=>{
 const released=studyHandoffPanelHTML(true);
 assert.match(released,/data-study-handoff-option="expectedResponses" checked/);
 assert.match(released,/data-study-handoff-option="annotations"/);
 assert.doesNotMatch(released,/data-study-handoff-option="annotations" checked/);
 const withheld=studyHandoffPanelHTML(false);
 assert.match(withheld,/data-study-handoff-option="expectedResponses" disabled/);
 assert.match(withheld,/does not release detailed answers/);
});

test("Study Handoff derives response, released key, score, timing, flags and source-anchored annotations from one completed attempt",()=>{
 const attempt={...completed(),explanations:{"rev-0":"NEVER EXPORT THIS EXPLANATION"}};
 const packet=buildStudyHandoffPacket(attempt,{...DEFAULT_STUDY_HANDOFF_SELECTION,annotations:true});
 assert.equal(packet.format,"practice-desk-study-handoff");
 assert.equal(packet.privacy.scope,"single-completed-attempt");
 assert.ok(packet.privacy.omitted.includes("attempt-id"));
 assert.ok(packet.privacy.omitted.includes("other-attempts"));
 assert.ok(packet.privacy.omitted.includes("source-urls"));
 assert.equal(packet.includedQuestions,packet.totalQuestions);
 assert.equal(packet.truncated,false);
 const first=packet.questions[0];
 assert.equal(first.questionId,"question-0");
 assert.equal(first.selected?.text,"Alpha");
 assert.equal(first.expected?.text,"Alpha");
 assert.deepEqual(first.outcome,{verdict:"correct",marks:2});
 assert.ok((first.timing?.foregroundMs??-1)>=0);
 assert.equal(first.flagged,true);
 assert.deepEqual(first.annotations?.eliminatedOptions,[{optionId:"b",text:"Beta"}]);
 assert.equal(first.annotations?.highlights[0]?.excerpt,"Choose");
 assert.equal(first.annotations?.highlights[0]?.color,"yellow");

 const json=serializeStudyHandoffJson(packet);
 const markdown=serializeStudyHandoffMarkdown(packet);
 for(const output of [json,markdown]){
  assert.ok(output.length<=STUDY_HANDOFF_MAX_OUTPUT_CHARS);
  assert.equal(output.includes("PRIVATE-ATTEMPT-ID"),false);
  assert.equal(output.includes("NEVER EXPORT THIS EXPLANATION"),false);
 }
 assert.equal(studyHandoffFileName(attempt,"json"),"Practice_Desk_Study_Handoff_paper.json");
});

test("Study Handoff exports frozen rich context and classification with collision-safe bounded serializers",()=>{
 const q0=pkg.questions[0];
 const richPrompt={format:"practice-desk-rich",version:1,blocks:[{type:"paragraph",content:[
  {type:"text",text:"Candidate "},{type:"math",tex:"x^2",linearText:"x squared"},
  {type:"text",text:" context"}
 ]}]};
 const content={...q0.content,prompt:"Plain fallback should not replace rich display",richPrompt};
 const richQ={...q0,content,contentHash:questionRevisionHash({content,editorial:q0.editorial})};
 const taxonomy={format:"practice-desk-taxonomy",version:1,id:"example-tax",examId:"example-exam",
  title:"Example taxonomy",basis:"user-defined",asOfDate:"2026-11-24",reference:"Test fixture",
  nodes:[
   {id:"subject",label:"Subject A",kind:"subject"},
   {id:"topic",label:"Topic B",kind:"topic",parentId:"subject"},
   {id:"subtopic",label:"Subtopic C",kind:"subtopic",parentId:"topic"}
  ]};
 const bundle=validateExamPackage({...pkg,questions:[richQ,...pkg.questions.slice(1)],
  taxonomy,taxonomyAssignments:{"rev-0":"subtopic"}});
 const packet=buildStudyHandoffPacket(completed(bundle,"PRIVATE-RICH"));
 const first=packet.questions[0];
 assert.match(first.content?.text??"",/Candidate x squared context/);
 assert.doesNotMatch(first.content?.text??"",/Plain fallback should not replace rich display/);
 assert.deepEqual(first.classification,{subject:"Subject A",topic:"Topic B",subtopic:"Subtopic C"});

 const fenced={...packet,questions:packet.questions.map((row,i)=>i?row:{
  ...row,content:{kind:row.content.kind,text:row.content.text+"\n```learner marker"}
 })};
 const markdown=serializeStudyHandoffMarkdown(fenced);
 const fence=markdown.split("\n")[2];
 assert.ok(fence.startsWith("````")&&fence.endsWith("json"),
  "Markdown fence must exceed backtick runs inside candidate/question content");

 const oversized={...packet,questions:[{
  ...first,content:{kind:first.content.kind,text:"x".repeat(STUDY_HANDOFF_MAX_OUTPUT_CHARS)}
 }]};
 assert.throws(()=>serializeStudyHandoffJson(oversized),/output limit/);
 assert.throws(()=>serializeStudyHandoffMarkdown(oversized),/output limit/);
});

test("Study Handoff cannot reveal expected answers when the frozen paper withholds detailed review",()=>{
 const base={...pkg.paper,navigation:{...pkg.paper.navigation,allowReview:false}};
 const paper={...base,contentHash:paperRevisionHash(base)};
 const attempt=completed(validateExamPackage({...pkg,paper}),"PRIVATE-NO-REVIEW");
 const packet=buildStudyHandoffPacket(attempt,{
  questionContent:false,candidateResponses:false,expectedResponses:true,
  outcomes:false,timing:false,flags:false,annotations:false
 });
 assert.equal(packet.source.reviewReleased,false);
 assert.equal(packet.inclusion.expectedResponses,false);
 assert.ok(packet.privacy.omitted.includes("unreleased-answer-key"));
 assert.equal(packet.questions.some(question=>"expected" in question),false);
 assert.doesNotMatch(serializeStudyHandoffMarkdown(packet),/Expected response:/);
 assert.doesNotMatch(serializeStudyHandoffJson(packet),/"expected":/);
});

test("Study Handoff refuses unfinished attempts and default exports omit candidate scratch",()=>{
 const unfinished=startGenericAttempt(validateExamPackage(pkg),"unfinished-private-id",1000);
 assert.throws(()=>buildStudyHandoffPacket(unfinished),/completed attempt/);
 const packet=buildStudyHandoffPacket(completed());
 assert.equal(packet.inclusion.annotations,false);
 assert.ok(packet.privacy.omitted.includes("candidate-scratch"));
 assert.equal(packet.questions.some(question=>"annotations" in question),false);
});
