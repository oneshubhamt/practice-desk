import test from "node:test";
import assert from "node:assert/strict";
import { validateExamPackage, startGenericAttempt, transitionGenericAttempt, readableAnswer } from "../src/app/exam-package.ts";

const hash="a".repeat(64);
const items=[
 {kind:"single-choice",prompt:"Choose one",options:[{id:"a",text:"Alpha"},{id:"b",text:"Beta"}]},
 {kind:"multiple-select",prompt:"Select all",options:[{id:"x",text:"X"},{id:"y",text:"Y"},{id:"z",text:"Z"}],minSelections:2,maxSelections:3},
 {kind:"numeric-entry",prompt:"Compute",numericRules:{minimum:0,maximum:10,decimalPlaces:2}},
 {kind:"true-false",prompt:"True?",},
 {kind:"matching",prompt:"Match",leftItems:[{id:"l1",text:"One"},{id:"l2",text:"Two"}],rightItems:[{id:"r1",text:"First"},{id:"r2",text:"Second"}]},
 {kind:"free-response",prompt:"Explain",responseRules:{maxWords:40}},
];
const questions=items.map((content,i)=>({
 id:"rev-"+i,questionId:"question-"+i,revision:1,contentHash:hash,editorial:{status:"verified"},content
}));
const answers=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",acceptedValues:[3.5],absoluteTolerance:0.01},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
 {kind:"free-response",evaluation:"manual"},
];
const pkg={
 format:"practice-desk-exam",version:1,examId:"example-exam",title:"Six kinds",
 questions,answerKey:{id:"key",paperId:"paper",revision:1,contentHash:hash,entries:answers.map((answer,i)=>({
  questionRevisionId:"rev-"+i,answer
 }))},
 paper:{id:"rev-paper",paperId:"paper",revision:1,contentHash:hash,edition:"custom",answerKeyRevisionId:"key",
 sections:[{id:"s1",title:"Part I",questionRevisionIds:["rev-0","rev-1","rev-2"]},{id:"s2",title:"Part II",questionRevisionIds:["rev-3","rev-4","rev-5"]}],
 timing:{kind:"whole-paper",durationMs:1200000,pausePolicy:"allowed"},
 navigation:{questionNavigation:"free",sectionNavigation:"free",allowFlagging:true,allowReview:true},
 scoring:{defaultRule:{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0}}},
};
const responses=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
 {kind:"free-response",text:"Because of the underlying principles."},
];
const lookup=new Map(questions.map(q=>[q.id,q]));
test("a non-CGL paper completes all six response types through the same engine",()=>{
 const bundle=validateExamPackage(pkg);
 let attempt=startGenericAttempt(bundle,"test",1000);
 let now=1001;
 for(let i=0;i<6;i++){
   const s=i<3?0:1, n=i%3;
   attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:now++,sectionIndex:s,questionIndex:n},lookup);
   attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:now++,response:responses[i]},lookup);
 }
 attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:now++},lookup);
 assert.equal(attempt.state.status,"completed");
 assert.equal(attempt.result.snapshot.correctCount,5);
 assert.equal(attempt.result.snapshot.earnedMarks,10);
 assert.equal(attempt.result.items.filter(item=>item.verdict==="pending").length,1);
 assert.equal(attempt.frozen.snapshot.examId,"example-exam");
 assert.equal(readableAnswer(questions[0],answers[0]),"Alpha");
});
test("invalid numeric value, underspecified selections and duplicate matches are rejected",()=>{
 const bundle=validateExamPackage(pkg);
 let attempt=startGenericAttempt(bundle,"bad",1000);
 const navigate=(s,n)=>{attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:1001,sectionIndex:s,questionIndex:n},lookup);};
 navigate(0,1);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1002,response:{kind:"multiple-select",optionIds:["x"]}},lookup),/selection/i);
 navigate(0,2);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1003,response:{kind:"numeric-entry",value:11}},lookup),/numeric/i);
 navigate(1,1);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1004,response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r1"}]}},lookup),/matching/i);
});
test("forward-only navigation restrictions are respected for non-CGL papers",()=>{
 const b=validateExamPackage({...pkg,paper:{...pkg.paper,navigation:{...pkg.paper.navigation,questionNavigation:"forward-only"}}});
 let attempt=startGenericAttempt(b,"forward",0);
 attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:1,sectionIndex:0,questionIndex:2},lookup);
 const back=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:2,sectionIndex:0,questionIndex:0},lookup);
 assert.equal(back.state.questionIndex,2);
});
