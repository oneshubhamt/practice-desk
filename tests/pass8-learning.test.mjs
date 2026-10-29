import test from "node:test";
import assert from "node:assert/strict";
import { pkg } from "./fixtures/six-kinds.mjs";
import { makeRevisionPackage,createNotebookLineage,validateNotebookLineage,REVISION_MAX_QUESTIONS } from "../src/learning/revision-test.ts";
import { attemptEvidence,evidenceProgression } from "../src/learning/attempt-evidence.ts";
import { topicMetrics,addLearningCard } from "../src/learning/learning.ts";
import { validateExamPackage,startGenericAttempt,transitionGenericAttempt } from "../src/app/exam-package.ts";
import { validateGenericStoredRecord,renderModelExam } from "../src/app/generic-ui.ts";
import { scoreAttempt } from "../src/engine/scoring.ts";
import { questionRevisionHash,paperRevisionHash } from "../src/domain/integrity.ts";
import { makeBackup,verifyBackup } from "../src/history/backup.ts";
import { sha256 } from "../src/domain/hash.ts";

const bundle=validateExamPackage(pkg);
function complete(id){
 const a=startGenericAttempt(bundle,id,1000);
 return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:2000},
   new Map(bundle.questions.map(q=>[q.id,q])));
}
const finished=complete("completed-source");
const card=(index,at=3000)=>addLearningCard(finished,bundle.questions[index].id,new Date(at).toISOString());

test("generated notebook revision is a real validated attempt, not a copied note",()=>{
 const selected=[card(0),card(2),card(5)];
 const revision=makeRevisionPackage(selected,"nonce-1");
 assert.equal(revision.questions.length,3);
 const lineage=createNotebookLineage(selected);
 assert.equal(lineage.entries.length,3);
 assert.equal(lineage.entries[0].sourceAttemptId,"completed-source");
 assert.equal(revision.paper.edition,"custom");
 assert.equal(revision.paper.timing.kind,"untimed");
 assert.deepEqual(revision.paper.scoring.defaultRule,{correctMarks:1,incorrectMarks:0,unansweredMarks:0});
 assert.deepEqual(revision.answerKey.entries.map(e=>e.answer),selected.map(x=>x.answer));
 assert.equal(validateExamPackage(revision),revision);
 let attempt={...startGenericAttempt(revision,"revision-attempt",5000),notebookLineage:lineage};
 validateNotebookLineage(attempt);
 assert.equal(attempt.frozen.snapshot.mode,"custom-practice");
 assert.equal(attempt.frozen.paper.sections.length,1);
 assert.equal(renderModelExam(attempt,revision).includes("Expected answer"),false,"Active exam reveals answer");
 const map=new Map(revision.questions.map(q=>[q.id,q]));
 attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:5010,
   response:{kind:"single-choice",optionId:revision.answerKey.entries[0].answer.optionId}},map);
 attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:5020},map);
 assert.equal(attempt.result.items.length,3);
 assert.equal(attempt.result.snapshot.earnedMarks,1);
 assert.equal(attempt.result.snapshot.correctCount,1);
 assert.equal(attempt.result.snapshot.unansweredCount,2);
 assert.equal(validateGenericStoredRecord(JSON.parse(JSON.stringify(attempt))).id,"revision-attempt");
 const backed=verifyBackup(makeBackup([attempt],{schema:1,dark:false,scale:100},"2026-10-29T20:00:00Z"));
 assert.equal(backed.records[0].frozen.questions.length,3);
 assert.equal(backed.records[0].notebookLineage.entries[0].cardId,selected[0].id);
 assert.equal(selected[0].sourceAttemptId,"completed-source");
 const otherPaper={...card(1),paperId:"another-paper-revision",paperEdition:"source"};
 const mixedPapers=makeRevisionPackage([selected[0],otherPaper],"same-exam-different-papers");
 assert.equal(mixedPapers.questions.length,2,"Cards from distinct source papers in one exam may be combined");
 assert.equal(createNotebookLineage([selected[0],otherPaper]).entries[1].sourcePaperId,"another-paper-revision");
 const forged=structuredClone(attempt);forged.notebookLineage.entries[0].sourceAttemptId="different";
 assert.throws(()=>validateGenericStoredRecord(forged),/lineage hash mismatch/);
});

test("revision selection rejects duplicates, unsafe statuses, mixed exams and impossible sizes",()=>{
 const a=card(0);
 assert.throws(()=>makeRevisionPackage([],"empty"),/Select/);
 assert.throws(()=>makeRevisionPackage([a,a],"dup"),/Duplicate question/);
 assert.throws(()=>makeRevisionPackage([a,{...a,examId:"different",id:"learning-card:other"}],"mixed"),/identity|different exams/);
 assert.throws(()=>makeRevisionPackage([a],"invalid nonce"),/identity/);
 assert.throws(()=>makeRevisionPackage(Array.from({length:REVISION_MAX_QUESTIONS+1},()=>a),"too-many"),/Select/);
 const modifiedQuestion={...a.question,editorial:{...a.question.editorial,status:"invalid"}};
 const safeHash={...modifiedQuestion,contentHash:questionRevisionHash(modifiedQuestion)};
 assert.throws(()=>makeRevisionPackage([{...a,question:safeHash}],"unsafe"),/editorially eligible/);
});

test("media from notebook remains in generated paper even if source package disappears",()=>{
 const a=card(0);
 const uri="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WsSlz8AAAAASUVORK5CYII=";
 const bytes=Uint8Array.from(atob(uri.split(",")[1]),c=>c.charCodeAt(0));
 const asset={id:"rev-asset",mediaType:"image/png",dataUri:uri,altText:"Geometry sketch",contentHash:sha256(bytes)};
 const question={...a.question,content:{...a.question.content,assetIds:[asset.id]}};
 const revised={...question,contentHash:questionRevisionHash(question)};
 const one={...a,id:"learning-card:"+revised.id,question:revised,assets:[asset]};
 const paper=makeRevisionPackage([one],"visual");
 assert.equal(paper.assets.length,1);
 const active=startGenericAttempt(paper,"visual",1000);
 assert.equal(active.frozen.assets[0].contentHash,asset.contentHash);
 assert.throws(()=>makeRevisionPackage([one,{...card(1),assets:[{...asset,dataUri:"data:image/png;base64,AA=="}]}],"collision"),/Conflicting frozen image|digest mismatch/);
 const second={...card(1),assets:[{...asset,altText:"Different asset metadata"}]};
 assert.throws(()=>makeRevisionPackage([one,second],"conflicting-valid-asset"),/Conflicting frozen image identity/);
});

test("pace, speed relative to a section median and marking opportunities are exact",()=>{
 const responses=[
 {questionRevisionId:"rev-0",response:{kind:"single-choice",optionId:"a"},timeSpentMs:1000,flagged:false,answerChangeCount:1},
 {questionRevisionId:"rev-1",response:{kind:"multiple-select",optionIds:["x","z"]},timeSpentMs:2000,flagged:false,answerChangeCount:0},
 {questionRevisionId:"rev-2",response:{kind:"numeric-entry",value:3.5},timeSpentMs:3000,flagged:false,answerChangeCount:0},
 {questionRevisionId:"rev-3",response:{kind:"true-false",value:false},timeSpentMs:6000,flagged:false,answerChangeCount:0},
 {questionRevisionId:"rev-4",response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},timeSpentMs:10000,flagged:false,answerChangeCount:0}
 ];
 const original=complete("metrics");
 const score=scoreAttempt(original.frozen.paper,original.frozen.key,original.frozen.questions,responses,"2026-10-29T12:00:00Z");
 const a={...original,state:{...original.state,responses,foregroundMs:22000,elapsedMs:25000},result:score};
 const result=attemptEvidence(a);
 assert.equal(result.sections.length,2);
 assert.equal(result.sections[0].measuredAnswered,3);
 assert.equal(result.sections[1].measuredAnswered,2);
 assert.equal(result.speed.classified,0,"Small sections cannot be speed-classified");
 assert.equal(result.timing.changedAnswers,1);
 assert.equal(result.timing.questionMeasuredMs,22000);
 assert.equal(result.opportunity.countSkipped,1);
 assert.equal(result.opportunity.observedPenalty,score.snapshot.penaltyMarks);
 assert.equal(result.opportunity.wrongToCorrect,score.items.filter(x=>x.verdict==="incorrect")
    .reduce((n,x)=>n+2-x.marks,0));
 assert.equal(result.opportunity.skippedToCorrect,2);
 assert.equal(attemptEvidence(startGenericAttempt(bundle,"active",1000)),null);
});

test("evidence progression requires independent attempts and distinct questions",()=>{
 const repeated=evidenceProgression([{examId:"x",label:"Algebra",answered:20,correct:19,attempts:3,distinctQuestions:1}]);
 assert.equal(repeated[0].label,"repeated-items");
 const qualified=evidenceProgression([{examId:"x",label:"Algebra",answered:20,correct:17,attempts:3,distinctQuestions:12}]);
 assert.equal(qualified[0].label,"consistently-accurate");
 const weak=evidenceProgression([{examId:"x",label:"Algebra",answered:6,correct:6,attempts:1,distinctQuestions:6}]);
 assert.equal(weak[0].label,"insufficient");
 const base=complete("once");
 const twice={...base,id:"second",startedAt:9000,finishedAt:10000};
 const noted={...card(0),customTopic:"Mechanics"};
 const topics=topicMetrics([base,twice],[noted]);
 const topic=topics.find(x=>x.kind==="user-topic"&&x.label==="Mechanics");
 assert.equal(topic.attempts,2);
 assert.equal(topic.distinctQuestions,1);
 assert.equal(topic.total,2);
 assert.equal(topic.answered,0);
 assert.equal(topic.answeredAttempts,0);
 assert.equal(topic.distinctAnsweredQuestions,0);
 assert.ok(topics.some(x=>x.kind==="section"));
});

test("speed classification uses a sufficient section median and distinguishes fast mistakes",()=>{
 const group={...bundle.paper.sections[0],questionRevisionIds:bundle.questions.map(q=>q.id)};
 const source={...bundle.paper,sections:[group]};
 const combined=validateExamPackage({...bundle,paper:{...source,contentHash:paperRevisionHash(source)}});
 const responses=[
  {questionRevisionId:"rev-0",response:{kind:"single-choice",optionId:"a"},timeSpentMs:1000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-1",response:{kind:"multiple-select",optionIds:["x","z"]},timeSpentMs:2000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-2",response:{kind:"numeric-entry",value:3.5},timeSpentMs:3000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-3",response:{kind:"true-false",value:false},timeSpentMs:6000,flagged:false,answerChangeCount:0},
  {questionRevisionId:"rev-4",response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},timeSpentMs:10000,flagged:false,answerChangeCount:0}
 ];
 const a=startGenericAttempt(combined,"speed",1000);
 const scores=scoreAttempt(a.frozen.paper,a.frozen.key,a.frozen.questions,responses,"2026-10-29T12:00:00Z");
 const completed={...a,finishedAt:2000,state:{...a.state,responses,status:"completed",foregroundMs:22000},result:scores};
 const rows=attemptEvidence(completed);
 assert.equal(rows.sections.length,1);
 assert.equal(rows.sections[0].medianAnsweredMs,3000);
 assert.equal(rows.speed.measured,5);
 assert.equal(rows.speed.classified,5);
 assert.deepEqual(rows.speed.buckets.map(x=>x.items),[2,1,2]);
 assert.equal(rows.speed.buckets[0].incorrect+rows.speed.buckets[1].incorrect+rows.speed.buckets[2].incorrect,
   scores.snapshot.incorrectCount);
});
