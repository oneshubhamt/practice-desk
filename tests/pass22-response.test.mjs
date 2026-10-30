import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {renderModelExam,renderGenericControls} from "../src/app/generic-ui.ts";
import {multipleDraftMessage,duplicateMatchingTargets} from "../src/app/response-drafts.ts";

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
