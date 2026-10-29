// Shared non-CGL exam fixture for pure-engine and browser acceptance tests.
const hash="a".repeat(64);
const items=[
 {kind:"single-choice",prompt:"Choose one",options:[{id:"a",text:"Alpha"},{id:"b",text:"Beta"}]},
 {kind:"multiple-select",prompt:"Select all",options:[{id:"x",text:"X"},{id:"y",text:"Y"},{id:"z",text:"Z"}],minSelections:2,maxSelections:3},
 {kind:"numeric-entry",prompt:"Compute",numericRules:{minimum:0,maximum:10,decimalPlaces:2}},
 {kind:"true-false",prompt:"True?",},
 {kind:"matching",prompt:"Match",leftItems:[{id:"l1",text:"One"},{id:"l2",text:"Two"}],rightItems:[{id:"r1",text:"First"},{id:"r2",text:"Second"}]},
 {kind:"free-response",prompt:"Explain",responseRules:{maxWords:40}},
];
export const questions=items.map((content,i)=>({
 id:"rev-"+i,questionId:"question-"+i,revision:1,contentHash:hash,editorial:{status:"verified"},content
}));
export const answers=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",acceptedValues:[3.5],absoluteTolerance:0.01},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
 {kind:"free-response",evaluation:"manual"},
];
export const pkg={
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
