import test from "node:test";
import assert from "node:assert/strict";
import {pkg as sixKinds} from "./fixtures/six-kinds.mjs";
import { validateExamPackage,startGenericAttempt,transitionGenericAttempt } from "../src/app/exam-package.ts";
import { startSession,transition } from "../src/engine/session.ts";
import { paperRevisionHash,questionRevisionHash } from "../src/domain/integrity.ts";
import { validateGenericStoredRecord } from "../src/app/generic-ui.ts";
import { questionSpeed,isAuditQuestion,longestQuestionExposure,studySuggestions } from "../src/learning/question-analytics.ts";
import { reviewMatch,reviewFiltersHTML,timingLedgerHTML,questionCoachingHTML } from "../src/app/result-presentation.ts";

const base=structuredClone(sixKinds);
const updated=base.questions.map((q,i)=>{
 if(i!==1)return q;
 const changed={...q,editorial:{status:"caution",notes:"Review the original item wording"}};
 return {...changed,contentHash:questionRevisionHash(changed)};
});
const originalPaper={...base.paper,id:"mixed-pass14",sections:[
 {id:"all",title:"Mixed clinical examination",questionRevisionIds:base.questions.map(q=>q.id)}]};
const bundle=validateExamPackage({...base,questions:updated,
 paper:{...originalPaper,contentHash:paperRevisionHash(originalPaper)}});
const map=new Map(bundle.questions.map(q=>[q.id,q]));
const id=n=>"rev-"+n;
const values=[
 {kind:"single-choice",optionId:"b"},
 {kind:"multiple-select",optionIds:["x","y"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:false},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
];
function sample(){
 let a=startGenericAttempt(bundle,"mixed",1000),now=1000;
 const times=[100,1000,1000,1000,6000];
 for(let i=0;i<5;i++){
   a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:now+1,response:values[i]},map);
   now+=times[i];
   a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:now,sectionIndex:0,questionIndex:i+1},map);
 }
 // A real revisit of q0 must not invent answer changes or extra exposure.
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:now,sectionIndex:0,questionIndex:0},map);
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:now,sectionIndex:0,questionIndex:5},map);
 return transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:now},map);
}
test("visits reflect cursor entries, never answering, flags, repeated cursor or clock ticks",()=>{
 let s=startSession(bundle.paper,1000);
 assert.deepEqual(s.questionVisits,[{questionRevisionId:id(0),count:1}]);
 s=transition(bundle.paper,s,{type:"TICK",nowMs:1010});
 s=transition(bundle.paper,s,{type:"ANSWER",nowMs:1020,response:values[0]});
 s=transition(bundle.paper,s,{type:"FLAG",nowMs:1030,flagged:true});
 s=transition(bundle.paper,s,{type:"NAVIGATE",nowMs:1040,sectionIndex:0,questionIndex:0});
 assert.equal(s.questionVisits.find(x=>x.questionRevisionId===id(0)).count,1);
 s=transition(bundle.paper,s,{type:"NAVIGATE",nowMs:1050,sectionIndex:0,questionIndex:1});
 s=transition(bundle.paper,s,{type:"NAVIGATE",nowMs:1060,sectionIndex:0,questionIndex:0});
 assert.equal(s.questionVisits.find(x=>x.questionRevisionId===id(0)).count,2);
 assert.equal(s.questionVisits.find(x=>x.questionRevisionId===id(1)).count,1);
 const old={...s,questionVisits:undefined};
 assert.equal(transition(bundle.paper,old,{type:"NAVIGATE",nowMs:1070,sectionIndex:0,questionIndex:1}).questionVisits,
  undefined,"Historic sessions must never receive fabricated partial visit counts");
});
test("section auto-advance records a new section's first question once",()=>{
 const source=bundle.paper;
 const modified={...source,sections:[
   {id:"first",title:"First",questionRevisionIds:[id(0),id(1)]},
   {id:"second",title:"Second",questionRevisionIds:[id(2),id(3),id(4),id(5)]}],
   timing:{kind:"sectional",sectionLimits:[{sectionId:"first",durationMs:1000},
    {sectionId:"second",durationMs:1000}],allowEarlySubmit:true,pausePolicy:"forbidden"},
   navigation:{questionNavigation:"free",sectionNavigation:"sequential-locked",allowFlagging:true,allowReview:true}};
 const done=transition(modified,startSession(modified,0),{type:"TICK",nowMs:2500});
 assert.equal(done.status,"completed");
 assert.equal(done.questionVisits.find(x=>x.questionRevisionId===id(0)).count,1);
 assert.equal(done.questionVisits.find(x=>x.questionRevisionId===id(2)).count,1);
});
test("generic six-kind frozen timing classifications, accurate filters, longest links and conservative suggestions",()=>{
 const a=sample();
 validateGenericStoredRecord(a);
 const verdicts=Object.fromEntries(a.result.items.map(x=>[x.questionRevisionId,x.verdict]));
 assert.deepEqual([verdicts[id(0)],verdicts[id(1)],verdicts[id(2)],verdicts[id(3)],verdicts[id(4)],verdicts[id(5)]],
  ["incorrect","incorrect","correct","incorrect","correct","unanswered"]);
 assert.equal(questionSpeed(a,id(0)),"Fast");
 assert.equal(questionSpeed(a,id(1)),"Typical");
 assert.equal(questionSpeed(a,id(4)),"Slow");
 assert.equal(questionSpeed(a,id(5)),"Not classified");
 assert.equal(isAuditQuestion(a,id(1)),true);
 assert.equal(isAuditQuestion(a,id(0)),false);
 const matching=(filter)=>a.result.items.filter(item=>reviewMatch(a,item,filter)).map(item=>item.questionRevisionId);
 assert.deepEqual(matching("audit"),[id(1)]);
 assert.deepEqual(matching("fastwrong"),[id(0)]);
 assert.deepEqual(matching("typicalwrong"),[id(1),id(3)]);
 assert.deepEqual(matching("slowwrong"),[]);
 assert.equal(longestQuestionExposure(a)[0].id,id(4));
 assert.equal(longestQuestionExposure(a).length,5);
 assert.equal(longestQuestionExposure(a)[0].milliseconds,6000);
 assert.deepEqual(a.state.questionVisits.find(x=>x.questionRevisionId===id(0)).count,2);
 assert.ok(studySuggestions(a).length>=1&&studySuggestions(a).length<=3);
 assert.match(studySuggestions(a)[0],/3 incorrect among 5 scored responses/);
 const html=timingLedgerHTML(a,true);
 assert.match(html,/<th>Speed<\/th><th>Visits<\/th>/);
 assert.match(html,/Typical/);assert.match(html,/Not classified/);
 assert.match(html,/Review question 1/);
 const overview=questionCoachingHTML(a);
 assert.match(overview,/Longest recorded question exposure/);
 assert.match(overview,/What to work on next/);
 assert.match(overview,/data-ledger-q="rev-4"/);
 const filters=reviewFiltersHTML("typicalwrong");
 assert.match(filters,/value="audit"/);assert.match(filters,/value="typicalwrong" selected/);
});
test("historic visits and insufficient speed samples are disclosed, not manufactured",()=>{
 const a=sample();
 const old=structuredClone(a);
 delete old.state.questionVisits;
 validateGenericStoredRecord(old);
 assert.match(timingLedgerHTML(old,true),/Not recorded/);
 const fewer=validateExamPackage(sixKinds);
 const qmap=new Map(fewer.questions.map(q=>[q.id,q]));
 let limited=startGenericAttempt(fewer,"small",1000);
 limited=transitionGenericAttempt(limited,{type:"ANSWER",nowMs:1010,response:values[0]},qmap);
 limited=transitionGenericAttempt(limited,{type:"SUBMIT_ATTEMPT",nowMs:1400},qmap);
 assert.equal(questionSpeed(limited,id(0)),"Not classified");
 assert.deepEqual(limited.result.items.filter(x=>reviewMatch(limited,x,"typicalwrong")),[]);
 const tampered=structuredClone(a);
 tampered.state.questionVisits.push({questionRevisionId:"rev-0",count:10});
 assert.throws(()=>validateGenericStoredRecord(tampered),/visit history/);
 const zero=transitionGenericAttempt(startGenericAttempt(bundle,"zero",1000),
   {type:"SUBMIT_ATTEMPT",nowMs:1000},map);
 assert.equal(longestQuestionExposure(zero).length,0);
 assert.match(studySuggestions(zero)[0],/No scored answers/);
});
