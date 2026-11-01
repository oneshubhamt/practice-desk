import test from "node:test";
import assert from "node:assert/strict";
import { renderGenericControls, renderModelExam, examTimeRemaining, validateGenericStoredRecord } from "../src/app/generic-ui.ts";
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
 // Paused review markers remain editable; answers, navigation and submit do not.
 assert.doesNotMatch(html,/id="g-flag"[^>]*disabled/);
 assert.match(html,/id="g-next" disabled/);
 assert.match(html,/id="g-prev" disabled/);
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

import {pkg} from "./fixtures/six-kinds.mjs";
import {validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {multipleDraftMessage,duplicateMatchingTargets} from "../src/app/response-drafts.ts";

// Unsaved multi-select drafts and matching diagnostics; retained from pass22-response.test.mjs.
test("G07: under-minimum and over-maximum selections are clearly unsaved; legal selections are not drafts",()=>{
 assert.match(multipleDraftMessage(1,2,3),/Unsaved draft: select at least 2 options/);
 assert.match(multipleDraftMessage(4,2,3),/Unsaved draft: select at most 3 options/);
 assert.match(multipleDraftMessage(1,2,3),/No answer is scored until valid/);
 assert.match(multipleDraftMessage(1,2,3),/not saved to your attempt or backup/);
 assert.equal(multipleDraftMessage(2,2,3),"");
 assert.equal(multipleDraftMessage(3,2,3),"");
 assert.equal(multipleDraftMessage(0,1,2),"Unsaved draft: select at least 1 options (0 currently selected). No answer is scored until valid; this partial choice is kept only in the current browser tab, not saved to your attempt or backup.");
});
test("G07: explicit draft renders visible selected options and a live status without altering saved engine response",()=>{
 const b=validateExamPackage(pkg);
 let a=startGenericAttempt(b,"draft-test",0);
 const ids=new Map(b.questions.map(q=>[q.id,q]));
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:1,sectionIndex:0,questionIndex:1},ids);
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:2,response:{kind:"multiple-select",optionIds:["x","y"]}},ids);
 const qid=b.paper.sections[0].questionRevisionIds[1];
 const saved=a.state.responses.find(x=>x.questionRevisionId===qid);
 assert.deepEqual(saved?.response,{kind:"multiple-select",optionIds:["x","y"]});
 a=transitionGenericAttempt(a,{type:"CLEAR",nowMs:3},ids);
 const draft={questionId:qid,optionIds:["x"],message:multipleDraftMessage(1,2,3)};
 const rendered=renderModelExam(a,b,"",draft);
 assert.match(rendered,/role="status">Unsaved draft: select at least 2 options/);
 assert.match(rendered,/data-choice="x" checked/);
 assert.doesNotMatch(rendered,/data-choice="y" checked/);
 assert.equal(a.state.responses.find(x=>x.questionRevisionId===qid)?.response,undefined);
 assert.doesNotMatch(renderModelExam(a,b),/Unsaved draft:/,"Reloaded attempt uses scored/frozen response, not volatile draft");
});
test("G08: report each duplicate right value once; blanks and distinct right choices are legal",()=>{
 assert.deepEqual(duplicateMatchingTargets(["","",""]),[]);
 assert.deepEqual(duplicateMatchingTargets(["r1","r2","r3"]),[]);
 assert.deepEqual(duplicateMatchingTargets(["r1","r1","r2","r1","r2"]),["r1","r2"]);
 assert.deepEqual(duplicateMatchingTargets(["r1","","r1"]),["r1"]);
 const b=validateExamPackage(pkg),q=b.questions.find(x=>x.content.kind==="matching");
 const html=renderGenericControls(b,q);
 assert.match(html,/data-match="l1"/);
 assert.match(html,/data-match="l2"/);
 assert.match(html,/id="g-match-feedback" role="status" aria-live="polite"/);
 assert.match(html,/id="g-save">Save matches/);
});
