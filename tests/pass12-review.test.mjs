import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pkg } from "./fixtures/six-kinds.mjs";
import { builtinCglPackages, configureCglPractice, validateExamPackage, startGenericAttempt,
 transitionGenericAttempt } from "../src/app/exam-package.ts";
import { createSourceReviewReference, validateSourceReviewReference } from "../src/engine/review-source.ts";
import { createSourceKeyReference } from "../src/engine/source-comparison.ts";
import { scoreableMaximum, sectionScoreSummaries } from "../src/engine/score-ceiling.ts";
import { questionRevisionHash, paperRevisionHash, answerKeyRevisionHash } from "../src/domain/integrity.ts";
import { validateGenericStoredRecord } from "../src/app/generic-ui.ts";

const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const cgl=builtinCglPackages(sources,patches,solutions);
const byPaper=(id,edition)=>cgl.find(p=>p.paper.paperId===id&&p.paper.edition===edition);
const editedPaper=Object.keys(patches).find(id=>Object.keys(patches[id]).length>0);
assert.ok(editedPaper,"CGL patch bank unexpectedly empty");
const reviewed=byPaper(editedPaper,"reviewed"),original=byPaper(editedPaper,"source");
const qaMap=new Map(reviewed.questions.map(q=>[q.id,q]));

test("CGL original wording, options, source key and media are frozen at reviewed test start",()=>{
 const ref=createSourceReviewReference(reviewed,original);
 assert.ok(ref?.entries.length>0,"Corrected CGL content not identified");
 assert.equal(ref.schema,1);
 assert.equal(ref.paperId,reviewed.paper.paperId);
 const target=reviewed.questions.find(q=>q.id===ref.entries[0].targetQuestionRevisionId);
 assert.equal(ref.entries[0].sourceQuestion.questionId,target.questionId);
 const sourceKey=createSourceKeyReference(reviewed,original);
 assert.ok(sourceKey?.entries.length===100);
 const attempt={...startGenericAttempt(reviewed,"cgl-reviewed",1000),
   sourceKeyReference:sourceKey,sourceReviewReference:ref};
 assert.equal(validateGenericStoredRecord(attempt),attempt);
 const duplicate=structuredClone(attempt);
 duplicate.sourceReviewReference.entries[0].sourceQuestion.content.prompt+=" TAMPER";
 assert.throws(()=>validateGenericStoredRecord(duplicate),/source-review hash mismatch/);
 const patchedKey=structuredClone(attempt);
 patchedKey.sourceReviewReference.entries[0].sourceAnswer.optionId="unknown";
 assert.throws(()=>validateGenericStoredRecord(patchedKey),/source-review hash mismatch/);
 // Existing pre-Pass-12 records remain loadable, including historic reviews
 // that have no original-text snapshot and must not be silently backfilled.
 assert.equal(validateGenericStoredRecord(startGenericAttempt(reviewed,"old",1000)).id,"old");
});

test("edited single-section CGL preserves only its changed question subset and adjusted max",()=>{
 const r=configureCglPractice(reviewed,"single",2);
 const o=original;
 const ref=createSourceReviewReference(r,o);
 if(ref)assert.ok(ref.entries.every(e=>r.questions.some(q=>q.id===e.targetQuestionRevisionId)));
 const a=startGenericAttempt(r,"single",1000);
 const ended=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1100},
   new Map(r.questions.map(q=>[q.id,q])));
 const summary=sectionScoreSummaries(ended,ended.result);
 assert.equal(summary.length,1);
 assert.equal(summary[0].questions,25);
 assert.equal(summary[0].marks,ended.result.snapshot.earnedMarks);
 const eligible=r.questions.filter(q=>!["draft","invalid","under-review","superseded","incomplete-source"].includes(q.editorial.status)).length;
 assert.equal(scoreableMaximum(r.paper,r.answerKey,r.questions),eligible*2);
 assert.equal(summary[0].eligibleMax,eligible*2);
});

function edition(edition,revised=false){
 const questions=pkg.questions.map((q,i)=>{
   const initial=structuredClone(q);
   if(!revised||i!==0)return initial;
   const content={...initial.content,prompt:"Changed clinical triage prompt",
     options:initial.content.options.map((o,j)=>j===0?{...o,text:"Updated intervention"}:o)};
   const editorial={...initial.editorial,status:"corrected",notes:"Reviewed clinical evidence"};
   const update={...initial,id:initial.id+":reviewed",revision:2,content,editorial};
   return {...update,contentHash:questionRevisionHash(update)};
 });
 const ids=new Map(questions.map((q,i)=>[pkg.questions[i].id,q.id]));
 const entries=pkg.answerKey.entries.map(e=>({...e,questionRevisionId:ids.get(e.questionRevisionId)}));
 const answerKey={...pkg.answerKey,id:"key-"+edition,entries,contentHash:answerKeyRevisionHash({entries})};
 const sections=pkg.paper.sections.map(section=>({...section,
   questionRevisionIds:section.questionRevisionIds.map(id=>ids.get(id))}));
 const policy={...pkg.paper.scoring,byQuestionKind:{
   "numeric-entry":{correctMarks:5,incorrectMarks:-1,unansweredMarks:0},
   "multiple-select":{correctMarks:3,incorrectMarks:-1,unansweredMarks:0}}};
 const paperBase={...pkg.paper,id:"paper-"+edition,edition,answerKeyRevisionId:answerKey.id,
   sections,scoring:policy};
 const paper={...paperBase,contentHash:paperRevisionHash(paperBase)};
 return validateExamPackage({...pkg,title:"Generic exam "+edition,questions,answerKey,paper});
}

test("non-CGL exam source/review snapshots support six response types and arbitrary marking",()=>{
 const source=edition("source"),target=edition("reviewed",true);
 const ref=createSourceReviewReference(target,source);
 assert.ok(ref);
 assert.equal(ref.entries.length,1);
 assert.equal(ref.entries[0].sourceQuestion.content.prompt,"Choose one");
 const a={...startGenericAttempt(target,"generic-reviewed",1000),sourceReviewReference:ref};
 assert.equal(validateGenericStoredRecord(a),a);
 // 2 single + 3 multi + 5 numeric + 2 true/false + 2 matching,
 // manually assessed free-response has no automatic mark maximum.
 assert.equal(scoreableMaximum(target.paper,target.answerKey,target.questions),14);
 const ended=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1100},
   new Map(target.questions.map(q=>[q.id,q])));
 const sections=sectionScoreSummaries(ended,ended.result);
 assert.equal(sections.length,2);
 assert.equal(sections[0].eligibleMax,10);
 assert.equal(sections[1].eligibleMax,4);
 assert.equal(sections[1].pending,0);
 assert.equal(validateGenericStoredRecord(ended),ended);
 assert.equal(createSourceReviewReference(source,target),null,"Source/review direction cannot be reversed");
});

test("source-review snapshots detect passage-only edits without forcing a new question kind",()=>{
 const source=edition("source"),reviewed=edition("reviewed");
 const withPassage=(base,text)=>{
   const questions=base.questions.map((q,i)=>{
     if(i!==0)return q;
     const changed={...q,content:{...q.content,stimulusId:"shared-passage"}};
     return {...changed,contentHash:questionRevisionHash(changed)};
   });
   return validateExamPackage({...base,questions,
     stimuli:[{id:"shared-passage",kind:"passage",text}]});
 };
 const original=withPassage(source,"Unedited clinical case text");
 const updated=withPassage(reviewed,"Revised clinical case text");
 assert.equal(original.questions[0].id,updated.questions[0].id,
   "Passage-only edits should not need to re-key the question");
 const ref=createSourceReviewReference(updated,original);
 assert.equal(ref.entries.length,1);
 assert.equal(ref.stimuli[0].text,"Unedited clinical case text");
 const attempt={...startGenericAttempt(updated,"passage",1000),sourceReviewReference:ref};
 assert.equal(validateGenericStoredRecord(attempt),attempt);
});
