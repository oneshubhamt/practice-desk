/** P57-C staged multi-source handoff contract. Actual browser lifecycle is tested separately. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {addStagedFiles,updateStagedSelection,inspectStagingWorkspace,
 stagedToAuthoringDraft,validateStagingWorkspace} from "../src/authoring/authoring-staging.ts";
import {inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {inspectExternalQuality} from "../src/authoring/external-bank-qa.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
const load=async(name)=>JSON.parse(await readFile(new URL("../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
const initial={schema:1,files:[],selected:[]};
const staged=(source,name="first.json")=>addStagedFiles(initial,[{name,source}]);
test("P57-C stores unverified AI imports as selected, unpublished staged files with no scored package",async()=>{
 const source=await load("apfc");
 const state=staged(source);
 const view=inspectStagingWorkspace(state);
 assert.equal(view.questions.length,source.questions.length);
 assert.equal(view.selectedCount,3);
 assert.equal(view.sourceCount,source.questions.reduce((n,q)=>n+(q.provenance.sources?.length??0),0));
 assert.equal(view.questions.every(q=>q.selected),true);
 assert.equal("compiled" in state,false);
 assert.equal(validateStagingWorkspace(JSON.parse(JSON.stringify(state))).selected.length,3);
});
test("P57-C two compatible batches provide cross-batch overlap diagnostics and deterministic stable handoff identities",async()=>{
 const a=await load("apfc"),b=structuredClone(a);
 b.bankId="second-batch";b.questions=b.questions.map(q=>({...q,id:"copy-"+q.id}));
 const state=addStagedFiles(staged(a),[{name:"second.json",source:b}]);
 const report=inspectStagingWorkspace(state);
 assert.equal(report.selectedCount,6);
 assert.ok(report.duplicateCandidates>=3);
 assert.ok(report.issues.some(i=>i.code==="duplicate-candidate"));
 const draft=stagedToAuthoringDraft(state);
 assert.equal(draft.questions.length,6);
 assert.equal(new Set(draft.questions.map(q=>q.id)).size,6);
 const compiled=inspectAuthoringPublication(draft);
 assert.equal(compiled.valid,true,JSON.stringify(compiled.issues));
 assert.equal(compiled.compiled.questions.length,6);
 assert.equal(compiled.compiled.questions[0].editorial.status,"caution");
 const reversed=addStagedFiles(initial,[{name:"second.json",source:b},{name:"first.json",source:a}]);
 const other=stagedToAuthoringDraft(reversed);
 assert.deepEqual(new Set(draft.questions.map(q=>q.id)),new Set(other.questions.map(q=>q.id)),
  "Stable question IDs do not depend on source file ordering");
});
test("P57-C a deterministically wrong mathematical key is staged for Wordgard correction, then rechecked",async()=>{
 const a=await load("apfc"),original=a.questions[2].answer;
 a.questions[2].answer="B";
 const state=staged(a);
 assert.equal(inspectStagingWorkspace(state).issues.some(i=>i.code==="math-answer-conflict"),true);
 const draft=stagedToAuthoringDraft(state);
 const report=inspectAuthoringPublication(draft);
 assert.equal(report.valid,true,"structural publisher alone must not suppress QA");
 const qa=inspectExternalQuality(draft,report.compiled,"stage");
 assert.equal(qa.issues.some(i=>i.code==="math-answer-conflict"&&i.severity==="error"),true);
 const edited={...draft,questions:draft.questions.map((q,i)=>i===2?{...q,answer:original}:q)};
 const green=inspectAuthoringPublication(edited);
 assert.equal(green.valid,true);
 assert.equal(inspectExternalQuality(edited,green.compiled,"stage").issues.some(i=>i.code==="math-answer-conflict"),false);
});
test("P57-C selecting individual questions prunes unselected scoring while preserving the selected key and source",async()=>{
 const a=await load("apfc");
 let state=staged(a);
 state=updateStagedSelection(state,a.bankId+"::"+a.questions[0].id,false);
 state=updateStagedSelection(state,a.bankId+"::"+a.questions[1].id,false);
 const draft=stagedToAuthoringDraft(state);
 assert.equal(draft.questions.length,1);
 assert.equal(draft.questions[0].provenance.kind,a.questions[2].provenance.kind);
 const report=inspectAuthoringPublication(draft);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 const pkg=report.compiled;
 assert.equal(pkg.paper.sections[0].questionRevisionIds.length,1);
 const correct=pkg.answerKey.entries[0].answer;
 const response=correct.kind==="single-choice"?{kind:"single-choice",optionId:correct.optionId}:undefined;
 if(response){
  const result=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,
   [{questionRevisionId:pkg.questions[0].id,response,timeSpentMs:0,answerChangeCount:0}],
    "2026-11-05T00:00:00.000Z");
  assert.equal(result.items[0].verdict,"correct");
 }
});
test("P57-C strict staging rejects incompatible marking policies and duplicate bank identity",async()=>{
 const a=await load("apfc"),b=structuredClone(a);
 b.bankId="another";b.scoring.correctMarks=2;
 assert.throws(()=>addStagedFiles(staged(a),[{name:"conflict.json",source:b}]),/same exam, paper, revision, marking/);
 assert.throws(()=>addStagedFiles(staged(a),[{name:"repeat.json",source:a}]),/Bank ID/);
});
test("P57-C rejects unknown/duplicate selection, excessive authoring selection and empty handoff",async()=>{
 const a=await load("apfc"),state=staged(a);
 assert.throws(()=>validateStagingWorkspace({...state,selected:["none::unknown"]}),/unknown/);
 assert.throws(()=>validateStagingWorkspace({...state,selected:[state.selected[0],state.selected[0]]}),/repeated/);
 const cleared={...state,selected:[]};
 assert.equal(inspectStagingWorkspace(cleared).selectedCount,0);
 assert.throws(()=>stagedToAuthoringDraft(cleared),/Select at least one/);
});
test("P57-C stable semantic identities survive corrected revisions and never replace old frozen papers",async()=>{
 const a=await load("apfc"),first=stagedToAuthoringDraft(staged(a));
 const v1=inspectAuthoringPublication(first).compiled;
 const revised={...a,revision:a.revision+1,questions:a.questions.map((q,i)=>
  i===0?{...q,explanation:q.explanation+" Additional editorial context."}:q)};
 const next=stagedToAuthoringDraft(staged(revised));
 assert.deepEqual(first.questions.map(q=>q.id),next.questions.map(q=>q.id));
 const v2=inspectAuthoringPublication(next,[v1]).compiled;
 assert.notEqual(v1.paper.id,v2.paper.id);
 assert.equal(v1.questions[0].questionId,v2.questions[0].questionId);
 assert.notEqual(v1.questions[0].contentHash,v2.questions[0].contentHash);
 assert.equal(v1.questions[0].editorial.status,"caution");
 assert.equal(v2.questions[0].editorial.status,"caution");
});

test("P57-C attributed, unverified reviewer warning acceptance remains in exact immutable editorial evidence",async()=>{
 const source=await load("apfc"),draft=stagedToAuthoringDraft(staged(source));
 const reviewed={...draft,questions:draft.questions.map((q,i)=>i? q:{...q,qa:{
  status:"needs-review",review:{reviewer:"Independent reader (author-claimed)",
   reviewedAt:"2026-11-05T08:00:00.000Z",note:"Arithmetic and source references compared manually; independent verification not claimed.",
   acceptedWarningCodes:["missing-explanation","legal-currentness-unverified"]}
 }})};
 const report=inspectAuthoringPublication(reviewed);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 const notes=report.compiled.questions[0].editorial.notes;
 assert.match(notes,/Author-entered review\/QA acknowledgement/);
 assert.match(notes,/identity NOT authenticated/);
 assert.match(notes,/missing-explanation/);
 assert.equal(report.compiled.questions[0].editorial.status,"caution");
 const bad=structuredClone(reviewed);bad.questions[0].qa.review.reviewedAt="2026-02-30T08:00:00.000Z";
 assert.equal(inspectAuthoringPublication(bad).valid,false);
});
