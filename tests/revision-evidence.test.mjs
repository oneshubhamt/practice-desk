import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {addLearningCard,validateLearningCard,topicMetrics,comparableTrends} from "../src/learning/learning.ts";
import {revisionInventory,revisionTake,mockEvidenceAttempts,isRevisionAttempt} from "../src/learning/revision-selection.ts";
import {APFC_SYLLABUS_V1,syllabusForExam} from "../src/learning/syllabus-taxonomy.ts";
import {makeRevisionPackage,createNotebookLineage,validateNotebookLineage} from "../src/learning/revision-test.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";
import {makeBackup,verifyBackup} from "../src/history/backup.ts";
import {paperRevisionHash,questionRevisionHash} from "../src/domain/integrity.ts";
import {hashJson} from "../src/domain/hash.ts";
import {adjustedHistoryMetrics} from "../src/app/history-metrics.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {historyHTML} from "../src/app/history-page.ts";

const source=validateExamPackage(pkg);
const map=new Map(source.questions.map(q=>[q.id,q]));
function finished(id,wrong=true){
 let a=startGenericAttempt(source,id,1000);
 if(wrong)a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1100,
  response:{kind:"single-choice",optionId:"b"}},map);
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:1200,sectionIndex:0,questionIndex:1},map);
 a=transitionGenericAttempt(a,{type:"FLAG",nowMs:1300,flagged:true},map);
 return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1500},map);
}
test("P46 correct/blank/flagged/recurrent evidence is exact and exam-scoped",()=>{
 const a=finished("source-a"),b=finished("source-b");
 const wrong=revisionInventory([a,b],[],new Set(),source.examId,["wrong","repeated"]);
 assert.ok(wrong.selected.some(x=>x.questionId===source.questions[0].id&&
  x.wrongAttempts===2&&x.observedAttempts===2&&x.reasons.includes("repeated")));
 const blank=revisionInventory([a],[],new Set(),source.examId,["blank"]);
 assert.equal(blank.eligibleCount,source.questions.length-1);
 const flagged=revisionInventory([a],[],new Set(),source.examId,["flagged"]);
 assert.deepEqual(flagged.selected.map(x=>x.questionId),[source.questions[1].id]);
 assert.equal(revisionInventory([a],[],new Set(),"other-exam",["wrong"]).eligibleCount,0);
 assert.match(revisionInventory([a],[],new Set(),source.examId,["slow"]).insufficient.join(" "),/sufficient/);
 assert.throws(()=>revisionTake(wrong,wrong.eligibleCount+1),/Only/);
 assert.throws(()=>revisionTake(wrong,26),/Select 1/);
 assert.deepEqual(wrong.selected.map(x=>x.questionId),
  revisionInventory([b,a],[],new Set(),source.examId,["wrong","repeated"]).selected.map(x=>x.questionId));
});
test("P46 bookmarked and genuinely due cards work after deleting source attempts",()=>{
 const a=finished("captured"),card=addLearningCard(a,source.questions[0].id,new Date(1600).toISOString());
 const annotated=validateLearningCard({...card,bookmarked:true});
 const due=revisionInventory([],[annotated],new Set([card.id]),source.examId,["bookmarked","due"]);
 assert.equal(due.eligibleCount,1);
 assert.deepEqual(due.selected[0].reasons,["bookmarked","due"]);
 assert.equal(due.selected[0].sourceAttemptId,a.id);
 const p=makeRevisionPackage(due.selected.map(x=>x.card),"due-retest");
 assert.deepEqual(p.answerKey.entries[0].answer,card.answer);
 assert.equal(revisionInventory([],[annotated],new Set(),source.examId,["due"]).eligibleCount,0);
 assert.equal(revisionInventory([],[annotated],new Set(),source.examId,["bookmarked"]).eligibleCount,1);
});
test("P46 explicit APFC syllabus is versioned, self-assigned and never inferred",()=>{
 assert.equal(APFC_SYLLABUS_V1.version,1);
 assert.equal(APFC_SYLLABUS_V1.headings.length,9);
 assert.equal(syllabusForExam("ssc-cgl"),undefined);
 const original=addLearningCard(finished("note"),source.questions[0].id,new Date(1600).toISOString());
 assert.throws(()=>validateLearningCard({...original,syllabusTopicId:"labour"}),/Invalid learning card fields/);
 const apfc=validateLearningCard({...original,examId:"upsc-epfo-apfc",syllabusTopicId:"labour",
  customTopic:"EPF contribution"});
 assert.equal(apfc.syllabusTopicId,"labour");
 assert.equal(apfc.customTopic,"EPF contribution");
 assert.throws(()=>validateLearningCard({...apfc,syllabusTopicId:"invented"}),/Invalid learning card fields/);
 const archive=verifyBackup(makeBackup([{...apfc,saveRevision:1}],
   {schema:1,dark:false,scale:100},"2026-11-02T12:00:00Z"));
 assert.equal(validateLearningCard(archive.records[0]).syllabusTopicId,"labour");
});
test("P46 selection filters are authenticated and mock trends exclude revision results",()=>{
 const a=finished("original"),card=addLearningCard(a,source.questions[0].id,new Date(1600).toISOString());
 const chosen=revisionInventory([a],[card],new Set(),source.examId,["wrong"]);
 const picked=revisionTake(chosen,1);
 const provenance={schema:1,examId:source.examId,reasons:["wrong"],
  eligibleCount:chosen.eligibleCount,selectedQuestionIds:picked.map(x=>x.questionId)};
 const paper=makeRevisionPackage(picked.map(x=>x.card),"evidence-test");
 const lineage=createNotebookLineage(picked.map(x=>x.card),provenance);
 const opened={...startGenericAttempt(paper,"targeted",2000),notebookLineage:lineage};
 assert.equal(validateGenericStoredRecord(opened).id,opened.id);
 assert.equal(lineage.selection.reasons[0],"wrong");
 const forged=structuredClone(opened);
 forged.notebookLineage.selection.reasons[0]="due";
 assert.throws(()=>validateNotebookLineage(forged),/hash mismatch/);
 const nullable={...opened,notebookLineage:{...lineage,selection:null,
   contentHash:hashJson({schema:1,entries:lineage.entries})}};
 assert.throws(()=>validateNotebookLineage(nullable),/Invalid frozen revision selection/);
 assert.throws(()=>createNotebookLineage(picked.map(x=>x.card),{...provenance,selectedQuestionIds:["other"]}),/Invalid/);
 const completed=transitionGenericAttempt(opened,{type:"SUBMIT_ATTEMPT",nowMs:2100},
  new Map(paper.questions.map(q=>[q.id,q])));
 assert.equal(isRevisionAttempt(completed),true);
 assert.equal(mockEvidenceAttempts([a,completed]).length,1);
 assert.deepEqual(topicMetrics([a,completed]),topicMetrics([a]));
 assert.deepEqual(comparableTrends([a,completed]),comparableTrends([a]));
 assert.deepEqual(adjustedHistoryMetrics([a,completed]),adjustedHistoryMetrics([a]));
 const display=historyHTML([a,completed],new Map(),{status:"all",sort:"newest",search:""},false,false,"");
 assert.match(display,/Mock accuracy/);
 assert.match(display,/Revision tests/iu);
 const back=verifyBackup(makeBackup([{...a,saveRevision:1},{...completed,saveRevision:1}],
   {schema:1,dark:false,scale:100},"2026-11-02T12:00:00Z"));
 assert.equal(back.records.find(x=>x.id==="targeted").notebookLineage.selection.reasons[0],"wrong");
});
test("P46 only scoreable, review-permitted frozen questions can be selected",()=>{
 const a=finished("allowed");
 const hidden={...a,frozen:{...a.frozen,paper:{...a.frozen.paper,
  navigation:{...a.frozen.paper.navigation,allowReview:false}}}};
 assert.equal(revisionInventory([hidden],[],new Set(),source.examId,["wrong"]).eligibleCount,0);
 const q=source.questions[0],invalid={...q,editorial:{...q.editorial,status:"invalid"}};
 const changed={...invalid,contentHash:questionRevisionHash(invalid)};
 const copy=validateExamPackage({...source,questions:[changed,...source.questions.slice(1)]});
 let result=startGenericAttempt(copy,"excluded-source",1000);
 result=transitionGenericAttempt(result,{type:"ANSWER",nowMs:1100,
  response:{kind:"single-choice",optionId:"b"}},new Map(copy.questions.map(x=>[x.id,x])));
 result=transitionGenericAttempt(result,{type:"SUBMIT_ATTEMPT",nowMs:1200},
  new Map(copy.questions.map(x=>[x.id,x])));
 assert.equal(result.result.items[0].verdict,"excluded");
 assert.equal(revisionInventory([result],[],new Set(),source.examId,["wrong"]).eligibleCount,0);
});
test("P46 pacing evidence does not invent first-answer or revisit timestamps",()=>{
 const a=finished("timed");
 const inspected=revisionInventory([a],[],new Set(),source.examId,["wrong"]);
 assert.equal(inspected.selected[0].visits,1);
 assert.ok(inspected.selected[0].measuredForegroundMs>=0);
 assert.equal("firstAnswerMs" in inspected.selected[0],false,
  "Raw wall-clock answer dwell must not be invented");
 assert.equal(inspected.selected[0].revisitMs,0,
  "A single recorded first visit cannot be called a revisit");
 assert.equal(inspected.selected[0].firstVisitMs,inspected.selected[0].measuredForegroundMs);
});

test("P46 explicitly assigned broad APFC syllabus heading becomes a separate measured topic row",()=>{
 const apfc=validateExamPackage({...source,examId:"upsc-epfo-apfc"});
 const byId=new Map(apfc.questions.map(q=>[q.id,q]));
 let a=startGenericAttempt(apfc,"apfc-source",1000);
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1010,
  response:{kind:"single-choice",optionId:"a"}},byId);
 a=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1200},byId);
 const note=addLearningCard(a,apfc.questions[0].id,new Date(1300).toISOString());
 const card=validateLearningCard({...note,syllabusTopicId:"labour",customTopic:"EPFO"});
 const rows=topicMetrics([a],[card]);
 const official=rows.find(x=>x.kind==="syllabus"&&x.label===APFC_SYLLABUS_V1.headings[6].label);
 assert.equal(official.examId,"upsc-epfo-apfc");
 assert.equal(official.answered,1);
 assert.ok(rows.some(x=>x.kind==="user-topic"&&x.label==="EPFO"));
 assert.ok(rows.some(x=>x.kind==="section"));
 assert.equal(rows.filter(x=>x.kind==="source-topic").length,0,"Never infer unavailable topic IDs");
});

