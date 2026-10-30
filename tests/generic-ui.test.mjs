import test from "node:test";
import assert from "node:assert/strict";
import { renderGenericControls, examTimeRemaining, validateGenericStoredRecord } from "../src/app/generic-ui.ts";
import { readableAnswer } from "../src/app/exam-package.ts";
import { paperRevisionHash } from "../src/domain/integrity.ts";

const stub={format:"practice-desk-exam",version:1,examId:"example",
 title:"Example",paper:{},answerKey:{},questions:[],assets:[]};
const revision=(content)=>({id:"q",questionId:"q",revision:1,contentHash:"0".repeat(64),
 editorial:{status:"verified"},content});
test("six exam question response kinds render editable, escaped controls",()=>{
 const cases=[
  [{kind:"single-choice",prompt:"x",options:[{id:"1",text:"<script>"},{id:"2",text:"Second"}]},"data-choice"],
  [{kind:"multiple-select",prompt:"x",options:[{id:"1",text:"First"},{id:"2",text:"Second"}]},"checkbox"],
  [{kind:"numeric-entry",prompt:"x",numericRules:{minimum:0,maximum:100}},"type=\"number\""],
  [{kind:"true-false",prompt:"x"},"data-bool"],
  [{kind:"matching",prompt:"x",leftItems:[{id:"a",text:"A"}],rightItems:[{id:"b",text:"B"}]},"data-match"],
  [{kind:"free-response",prompt:"x",responseRules:{maxWords:20}},"textarea"],
 ];
 for(const [content,marker] of cases)assert.match(renderGenericControls(stub,revision(content)),new RegExp(marker));
 const html=renderGenericControls(stub,revision(cases[0][0]));
 assert.ok(!html.includes("<script>"));
 assert.ok(html.includes("&lt;script&gt;"));
});
test("timer display derives from paper policy, not CGL constants",()=>{
 const state={sectionIndex:1,elapsedMs:5000,sectionElapsedMs:2000};
 assert.equal(examTimeRemaining({timing:{kind:"untimed"}},state),null);
 assert.equal(examTimeRemaining({timing:{kind:"whole-paper",durationMs:12000}},state),7000);
 assert.equal(examTimeRemaining({timing:{kind:"sectional",sectionLimits:[{sectionId:"one",durationMs:3000},{sectionId:"two",durationMs:9000}]},
 sections:[{id:"one"},{id:"two"}]},state),7000);
});

test("review answers resolve human labels for all six question kinds",()=>{
 const options=[{id:"a",text:"Label A"},{id:"b",text:"Label B"}];
 const q=(content)=>revision(content);
 assert.equal(readableAnswer(q({kind:"single-choice",options}),{kind:"single-choice",optionId:"a"}),"Label A");
 assert.equal(readableAnswer(q({kind:"multiple-select",options}),{kind:"multiple-select",optionIds:["a","b"]}),"Label A; Label B");
 assert.equal(readableAnswer(q({kind:"numeric-entry"}),{kind:"numeric-entry",value:3.5}),"3.5");
 assert.equal(readableAnswer(q({kind:"true-false"}),{kind:"true-false",value:false}),"False");
 assert.equal(readableAnswer(q({kind:"matching",leftItems:[{id:"l",text:"Left"}],rightItems:[{id:"r",text:"Right"}]}),
  {kind:"matching",pairs:[{leftId:"l",rightId:"r"}]}),"Left → Right");
 assert.equal(readableAnswer(q({kind:"free-response"}),{kind:"free-response",evaluation:"manual"}),"Manual assessment required");
});

test("generic history rejects malformed stored records before import",()=>{
 assert.throws(()=>validateGenericStoredRecord({recordType:"generic-attempt",id:"fake"}),/Invalid generic/);
 assert.throws(()=>validateGenericStoredRecord({recordType:"generic-package",id:"wrong",bundle:{paper:{id:"x"}}}),/identity/);
});

test("shared renderer enforces paused, forward-only and no-early-submit policies",async()=>{
 const {renderModelExam}=await import("../src/app/generic-ui.ts");
 const {validateExamPackage,startGenericAttempt,transitionGenericAttempt}=await import("../src/app/exam-package.ts");
 const {pkg}=await import("./fixtures/six-kinds.mjs");
 const forwardPaper={...pkg.paper,navigation:{...pkg.paper.navigation,questionNavigation:"forward-only"}};
 const forward=validateExamPackage({...pkg,paper:{...forwardPaper,contentHash:paperRevisionHash(forwardPaper)}});
 const attempt=startGenericAttempt(forward,"policies",0);
 const questionMap=new Map(forward.questions.map(q=>[q.id,q]));
 const moved=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:1,sectionIndex:0,questionIndex:1},questionMap);
 assert.match(renderModelExam(moved,forward),/id="g-prev" disabled/);
 const paused=transitionGenericAttempt(moved,{type:"PAUSE",nowMs:2},questionMap);
 const html=renderModelExam(paused,forward);
 assert.match(html,/id="g-clear" disabled/);
 assert.match(html,/id="g-flag"[^>]*disabled/);
 assert.match(html,/id="g-submit" disabled/);
 const sectionedPaper={...pkg.paper,
   navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"},
   timing:{kind:"sectional",sectionLimits:[{sectionId:"s1",durationMs:10000},{sectionId:"s2",durationMs:10000}],transition:"automatic",allowEarlySubmit:false,pausePolicy:"forbidden"}
 };
 const sectioned=validateExamPackage({...pkg,paper:{...sectionedPaper,contentHash:paperRevisionHash(sectionedPaper)}});
 const noEarly=renderModelExam(startGenericAttempt(sectioned,"noearly",0),sectioned);
 assert.match(noEarly,/id="g-submit" disabled/);
 assert.match(noEarly,/data-section="0" aria-current="step"/);
});
