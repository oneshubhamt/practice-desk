import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {attemptQuestionLookup} from "../src/learning/question-analytics.ts";
import {timingLedgerHTML,resultInsightsHTML} from "../src/app/result-presentation.ts";
import {renderCurrentResultHTML} from "../src/app/result-controller.ts";

const COUNT=2000;
const baseQuestion=pkg.questions.find(q=>q.content.kind==="single-choice");
assert.ok(baseQuestion);
const optionId=baseQuestion.content.options[0].id;
const ids=Array.from({length:COUNT},(_,i)=>"scale:q:"+(i+1));
const section={...pkg.paper.sections[0],id:"scale:section",title:"Scale",
 questionRevisionIds:ids};
const paper={...pkg.paper,id:"scale:paper",paperId:"scale-paper",edition:"custom",
 sections:[section],timing:{kind:"untimed"},navigation:{...pkg.paper.navigation,sectionNavigation:"free"}};
const questions=ids.map((id,i)=>({...baseQuestion,id,questionId:"scale-question:"+(i+1)}));
const key={...pkg.answerKey,id:"scale:key",paperId:paper.paperId,
 entries:ids.map(id=>({questionRevisionId:id,answer:{kind:"single-choice",optionId}}))};
const responses=ids.map((id,i)=>({
 questionRevisionId:id,response:{kind:"single-choice",optionId},flagged:i%17===0,
 timeSpentMs:100+(i%50),firstVisitMs:100+(i%50),preFirstAnswerMs:50,
 firstAnsweredAt:"2026-11-12T00:00:00.000Z",answerChangeCount:0
}));
const items=ids.map((id,i)=>({questionRevisionId:id,verdict:i%2?"incorrect":"correct",
 marks:i%2?-0.5:2}));
const attempt={
 recordType:"generic-attempt",saveRevision:1,id:"scale-attempt",packageId:paper.id,
 startedAt:0,updatedAt:1,finishedAt:1,completionReason:"submitted",
 frozen:{schema:2,frozenAt:"2026-11-12T00:00:00.000Z",
  snapshot:{examId:"scale",paperId:paper.paperId,paperRevisionId:paper.id,
   answerKeyRevisionId:key.id,scoringPolicy:paper.scoring,mode:"custom-practice"},
  paper,key,questions,stimuli:[],assets:[]},
 state:{status:"completed",sectionIndex:0,questionIndex:COUNT-1,elapsedMs:COUNT*100,
  sectionElapsedMs:COUNT*100,foregroundMs:COUNT*100,responses,
  questionVisits:ids.map(id=>({questionRevisionId:id,count:1})),timingEvidenceVersion:1,
  completedSections:[0],completedSectionTimings:[],visible:false,clockMs:1},
 result:{items,snapshot:{earnedMarks:1500,positiveMarks:2000,penaltyMarks:500,
  correctCount:1000,incorrectCount:1000,unansweredCount:0,excludedCount:0,
  calculatedAt:"2026-11-12T00:00:01.000Z"}}
};

test("result analytics and review stay complete at the 2,000-question package ceiling",()=>{
 const lookup=attemptQuestionLookup(attempt);
 assert.equal(lookup.questions.size,COUNT);
 assert.equal(lookup.responses.size,COUNT);
 assert.equal(lookup.paperNumbers.get(ids.at(-1)),COUNT);
 assert.equal(lookup.evidence.sections[0].total,COUNT);

 const timing=timingLedgerHTML(attempt,true,true);
 assert.equal((timing.match(/data-ledger-q=/g)??[]).length,COUNT);
 const insights=resultInsightsHTML(attempt,true);
 assert.match(insights,/role="progressbar" aria-label="Scale coverage"[^>]*aria-valuenow="100"/);
 assert.match(insights,/2000\/2000 attempted/,
   "Scale analytics must expose complete section coverage without depending on headings");

 const review=renderCurrentResultHTML({
  attempt,resultTab:"review",reviewFilter:"all",warning:"",
  packageForAttempt:()=>undefined,manualGradeDrafts:new Map(),records:new Map()
 });
 assert.equal((review.match(/data-add-card=/g)??[]).length,COUNT,
   "Every rendered scale review item must retain its actionable notebook control");
 assert.match(review,/data-review-id="scale:q:2000"/,
   "The final scale item must remain addressable for review navigation");
 assert.match(review,/2000 of 2000 items/);
});
