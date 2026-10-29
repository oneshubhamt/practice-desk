import test from "node:test";
import assert from "node:assert/strict";
import { DefaultScheduler, Rating } from "ts-fsrs";
import { pkg } from "./fixtures/six-kinds.mjs";
import { validateExamPackage, startGenericAttempt, transitionGenericAttempt } from "../src/app/exam-package.ts";
import { addLearningCard, validateLearningCard, scheduledCard, rateLearningCard, topicMetrics, comparableTrends } from "../src/learning/learning.ts";
import { validateGenericStoredRecord } from "../src/app/generic-ui.ts";
import { makeBackup, verifyBackup } from "../src/history/backup.ts";

const bundle=validateExamPackage(pkg);
const lookup=new Map(bundle.questions.map(q=>[q.id,q]));
function complete(id,answer=false){
 let a=startGenericAttempt(bundle,id,1000);
 if(answer)a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1010,
  response:{kind:"single-choice",optionId:bundle.questions[0].content.options[0].id}},lookup);
 return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1020},lookup);
}
test("learning cards are created from completed immutable answers, not active test keys",()=>{
 const finished=complete("first");
 assert.throws(()=>addLearningCard(startGenericAttempt(bundle,"active",1000),bundle.questions[0].id,
  new Date(1000).toISOString()),/only after submission/);
 const item=addLearningCard(finished,bundle.questions[0].id,new Date(1030).toISOString());
 assert.equal(item.recordType,"learning-card");
 assert.equal(item.reviews.length,0);
 assert.equal(validateLearningCard(item),item);
 assert.equal(validateGenericStoredRecord(item),item);
 assert.deepEqual(item.answer,finished.frozen.key.entries[0].answer);
 assert.throws(()=>validateLearningCard({...item,id:"learning-card:bad"}),/identity/);
 assert.throws(()=>validateLearningCard({...item,answer:{kind:"single-choice",optionId:"fake"}}),/unknown option/);
});
test("FSRS-7 from stable ts-fsrs 6.0.0 schedules only explicit review ratings",async()=>{
 const scheduler=await DefaultScheduler({version:"FSRS-7",enableFuzz:false});
 const item=addLearningCard(complete("reviewer"),bundle.questions[0].id,new Date(1030).toISOString());
 assert.equal(scheduledCard(item,scheduler).dueAt.getTime(),1030);
 const graded=rateLearningCard(item,Rating.Good,new Date(2030).toISOString(),scheduler);
 assert.equal(graded.reviews.length,1);
 assert.equal(graded.reviews[0].rating,Rating.Good);
 const next=scheduledCard(graded,scheduler);
 assert.equal(next.reps,1);
 assert.ok(next.dueAt.getTime()>2030);
 const reloaded=validateLearningCard(JSON.parse(JSON.stringify(graded)));
 assert.equal(scheduledCard(reloaded,await DefaultScheduler({version:"FSRS-7",enableFuzz:false})).dueAt.getTime(),next.dueAt.getTime());
 assert.throws(()=>rateLearningCard(graded,Rating.Again,new Date(1500).toISOString(),scheduler),/monotonic/);
});
test("topic evidence and trends never compare different paper revisions",()=>{
 const a=complete("one",true),b=complete("two",false);
 const card=addLearningCard(a,bundle.questions[0].id,new Date(1030).toISOString());
 const topics=topicMetrics([a,b],[{...card,customTopic:"Manual topic"}]);
 assert.ok(topics.some(t=>t.label==="Manual topic"&&t.total===2));
 assert.ok(topics.every(t=>t.evidence==="insufficient" || t.answered>=5));
 assert.ok(topics.some(t=>t.answered!==t.total));
 const trend=comparableTrends([a,b]);
 assert.equal(trend.length,1);
 assert.equal(trend[0].count,2);
 assert.equal(trend[0].points.length,2);
 const different={...b,frozen:{...b.frozen,paper:{...b.frozen.paper,id:"another-revision"}}};
 assert.equal(comparableTrends([a,different]).length,2);
});
test("backup preserves notes and FSRS review logs with strict integrity checks",async()=>{
 const scheduler=await DefaultScheduler({version:"FSRS-7",enableFuzz:false});
 const a=complete("backup");
 const original=addLearningCard(a,bundle.questions[0].id,new Date(1030).toISOString());
 const rated=rateLearningCard({...original,note:"Review concept carefully",errorLabel:"conceptual",customTopic:"Topic"},
 Rating.Again,new Date(2030).toISOString(),scheduler);
 const archived=verifyBackup(makeBackup([a,rated],[],null,"2026-10-29T10:00:00Z"));
 assert.equal(archived.attempts.length,2);
 const card=validateLearningCard(archived.attempts.find(x=>x.recordType==="learning-card"));
 assert.equal(card.note,"Review concept carefully");
 assert.equal(card.reviews.length,1);
 assert.throws(()=>validateLearningCard({...card,reviews:[{rating:9,at:card.updatedAt}]}),/history/);
 assert.throws(()=>verifyBackup({...archived,attempts:archived.attempts.slice(1)}),/integrity/);
});
