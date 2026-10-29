import test from "node:test";
import assert from "node:assert/strict";
import { pkg } from "./fixtures/six-kinds.mjs";
import { validateExamPackage,startGenericAttempt,transitionGenericAttempt } from "../src/app/exam-package.ts";
import { renderModelExam } from "../src/app/generic-ui.ts";
import { filteredHistory,historyHTML,sectionPriorities } from "../src/app/history-page.ts";
import { reviewMatch,resultTabsHTML,reviewFiltersHTML,timingLedgerHTML,sectionPaceHTML } from "../src/app/result-presentation.ts";
import { answerRevisionEvidence } from "../src/learning/answer-revisions.ts";
import { validateGenericStoredRecord } from "../src/app/generic-ui.ts";

const bundle=validateExamPackage(pkg);
const questionMap=new Map(bundle.questions.map(q=>[q.id,q]));
function completed(id="complete",at=1000){
 return transitionGenericAttempt(startGenericAttempt(bundle,id,at),
   {type:"SUBMIT_ATTEMPT",nowMs:at+1000},questionMap);
}
const packages=new Map([[bundle.paper.id,bundle]]);
test("dedicated history filters/sorts completed and in-progress records without mutating source",()=>{
 const a=completed("first"),b=completed("second",5000),live=startGenericAttempt(bundle,"active",7000);
 const original=[a,b,live];
 const query={status:"all",sort:"newest",search:""};
 assert.deepEqual(filteredHistory(original,packages,query).map(x=>x.id),["active","second","first"]);
 assert.equal(filteredHistory(original,packages,{...query,status:"progress"}).length,1);
 assert.equal(filteredHistory(original,packages,{...query,status:"complete"}).length,2);
 assert.equal(filteredHistory(original,packages,{...query,sort:"oldest"})[0].id,"first");
 assert.equal(filteredHistory(original,packages,{...query,search:"NOT FOUND"}).length,0);
 assert.equal(filteredHistory(original,packages,{...query,search:bundle.paper.paperId})[0].id,"active");
 assert.deepEqual(original.map(x=>x.id),["first","second","active"]);
});
test("history is a genuinely separate panel with faithful evidence disclaimers and native actions",()=>{
 const a=completed("first"),b=completed("second");
 const html=historyHTML([a,b],packages,{status:"all",sort:"newest",search:""},false,false,"");
 assert.match(html,/History &amp; insights|History & insights/);
 assert.match(html,/id="g-history-search"/);
 assert.match(html,/id="g-history-sort"/);
 assert.match(html,/data-attempt="first"/);
 assert.match(html,/id="g-export-history"/);
 assert.match(html,/Comparable progression/);
 assert.ok(!html.includes('class="history-sparkline"'),
   "Two unanswered attempts must not be plotted as false zero-percent scores");
 assert.match(html,/repeated questions count as repeated observations/i);
 assert.ok(!html.includes("Expected answer:"));
 const empty=historyHTML([],packages,{status:"all",sort:"newest",search:"x"},false,true,"");
 assert.match(empty,/No attempts match/);
 assert.match(empty,/id="g-import-history" disabled/);
 assert.deepEqual(sectionPriorities([a]),[],"Too little evidence must not create fake section priorities");
});
test("result tabs and time ledger keep frozen verdicts, timings and accessible controls separate",()=>{
 const a=completed();
 const html=resultTabsHTML("overview");
 assert.match(html,/role="tablist"/);
 assert.match(html,/data-result-tab="overview"/);
 assert.match(html,/aria-selected="true"/);
 const ledger=timingLedgerHTML(a,true);
 assert.match(ledger,/id="result-timing"/);
 assert.match(ledger,/Question timing ledger/);
 assert.equal((ledger.match(/data-ledger-q=/g)??[]).length,6);
 assert.ok(!ledger.includes("Expected answer"));
 const filters=reviewFiltersHTML("incorrect");
 assert.match(filters,/id="g-review-filter"/);
 assert.match(filters,/value="incorrect" selected/);
 assert.equal(a.result.items.filter(row=>reviewMatch(a,row,"incorrect")).length,0);
 assert.equal(a.result.items.filter(row=>reviewMatch(a,row,"unanswered")).length,6);
 assert.equal(a.result.items.filter(row=>reviewMatch(a,row,"fastwrong")).length,0);
 assert.equal(sectionPaceHTML(a).includes("Section pacing & coverage"),true);
});
test("restored exam shell exposes progress, timer and navigator while withholding answer keys",()=>{
 const a=startGenericAttempt(bundle,"exam",1000);
 const html=renderModelExam(a,bundle);
 assert.match(html,/class="generic-layout exam-grid"/);
 assert.match(html,/class="exam-progress"/);
 assert.match(html,/id="g-timer"/);
 assert.match(html,/role="progressbar"/);
 assert.match(html,/Question navigator/);
 assert.match(html,/palette-legend/);
 assert.match(html,/aria-label="Question 1/);
 assert.ok(!html.includes("Expected answer"));
});

test("answer changes preserve actual events and distinguish rescued from lost answers",()=>{
 const first=bundle.questions[0];
 assert.equal(first.content.kind,"single-choice");
 const right=bundle.answerKey.entries[0].answer;
 assert.equal(right.kind,"single-choice");
 const wrong=first.content.options.find(x=>x.id!==right.optionId).id;
 function take(initial,final){
  let a=startGenericAttempt(bundle,"revision-logged",1000);
  a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1010,
    response:{kind:"single-choice",optionId:initial}},questionMap);
  a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1020,
    response:{kind:"single-choice",optionId:final}},questionMap);
  return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1030},questionMap);
 }
 const rescued=take(wrong,right.optionId);
 const row=rescued.state.responses.find(x=>x.questionRevisionId===first.id);
 assert.equal(row.answerEvents.length,2);
 assert.equal(row.answerChangeCount,1);
 assert.equal(row.firstAnsweredAt,new Date(1010).toISOString());
 assert.deepEqual(answerRevisionEvidence(rescued),{recorded:1,changed:1,rescued:1,lost:0,other:0});
 assert.equal(validateGenericStoredRecord(JSON.parse(JSON.stringify(rescued))).id,rescued.id);
 assert.equal(answerRevisionEvidence(take(right.optionId,wrong)).lost,1);
 const altered=structuredClone(rescued);
 const entry=altered.state.responses.find(x=>x.questionRevisionId===first.id);
 entry.answerEvents[1].from={kind:"single-choice",optionId:wrong};
 // Change the first selection so the sequence no longer chains.
 entry.answerEvents[0].to={kind:"single-choice",optionId:right.optionId};
 assert.throws(()=>validateGenericStoredRecord(altered),/Disconnected saved answer revision/);
});
