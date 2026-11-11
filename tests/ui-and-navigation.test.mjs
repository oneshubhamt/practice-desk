// Pass37 lossless capability suite. Each lexical block preserves the original
// independent fixtures and test body, identified for assertion-level traceability.
// Imports are module namespaces to avoid collisions between former suites.
import * as __suite_dep_0 from "node:test";
import * as __suite_dep_1 from "node:assert/strict";
import * as __suite_dep_2 from "./fixtures/six-kinds.mjs";
import * as __suite_dep_3 from "../src/app/exam-package.ts";
import * as __suite_dep_4_exam_view from "../src/app/exam-view.ts";
import * as __suite_dep_4_stored_record_validator from "../src/app/stored-record-validator.ts";
import * as __suite_dep_4_question_content_view from "../src/app/question-content-view.ts";
import * as __suite_dep_5 from "../src/app/history-page.ts";
import * as __suite_history_query from "../src/app/history-query.ts";
import * as __suite_dep_6 from "../src/app/result-presentation.ts";
import * as __suite_dep_7 from "../src/learning/answer-revisions.ts";
import * as __suite_dep_8 from "node:fs/promises";
import * as __suite_dep_9 from "../src/app/editorial-labels.ts";
import * as __suite_dep_10 from "../src/engine/session.ts";
import * as __suite_dep_11 from "../src/domain/integrity.ts";
import * as __suite_dep_12 from "../src/app/response-drafts.ts";
import * as __suite_dep_13 from "../src/app/navigation.ts";

// === Legacy suite: tests/ui-history-and-results.test.mjs — 5 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const pkg = __suite_dep_2["pkg"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __suite_dep_3["transitionGenericAttempt"];
const renderModelExam = __suite_dep_4_exam_view["renderModelExam"];
const filteredHistory = __suite_history_query["filteredHistory"];
const historyHTML = __suite_dep_5["historyHTML"];
const sectionPriorities = __suite_dep_5["sectionPriorities"];
const reviewMatch = __suite_dep_6["reviewMatch"];
const resultTabsHTML = __suite_dep_6["resultTabsHTML"];
const reviewFiltersHTML = __suite_dep_6["reviewFiltersHTML"];
const timingLedgerHTML = __suite_dep_6["timingLedgerHTML"];
const sectionPaceHTML = __suite_dep_6["sectionPaceHTML"];
const answerRevisionEvidence = __suite_dep_7["answerRevisionEvidence"];
const validateGenericStoredRecord = __suite_dep_4_stored_record_validator["validateGenericStoredRecord"];
const bundle=validateExamPackage(pkg);
const questionMap=new Map(bundle.questions.map(q=>[q.id,q]));
function completed(id="complete",at=1000){
 return transitionGenericAttempt(startGenericAttempt(bundle,id,at),
   {type:"SUBMIT_ATTEMPT",nowMs:at+1000},questionMap);
}
const packages=new Map([[bundle.paper.id,bundle]]);
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
 const pacing=sectionPaceHTML(a);
 assert.match(pacing,/Time &amp; pacing/);
 assert.match(pacing,/Section diagnostics/);
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
}

// === Legacy suite: tests/ui-media-editorial-and-paused-controls.test.mjs — 6 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_8["readFile"];
const pkg = __suite_dep_2["pkg"];
const builtinCglPackages = __suite_dep_3["builtinCglPackages"];
const configureCglPractice = __suite_dep_3["configureCglPractice"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const renderGenericControls = __suite_dep_4_question_content_view["renderGenericControls"];
const renderModelExam = __suite_dep_4_exam_view["renderModelExam"];
const editorialStatusLabel = __suite_dep_9["editorialStatusLabel"];
const startSession = __suite_dep_10["startSession"];
const transition = __suite_dep_10["transition"];
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const cgl=builtinCglPackages(sources,patches);
const send=(type,nowMs,extra={})=>({type,nowMs,...extra});
const visible=(a,id)=>a.responses.find(r=>r.questionRevisionId===id);

test("F07: built-in CGL question/option media carries exact contextual alt descriptions in both editions",()=>{
 let stemCount=0,optionCount=0;
 for(const p of cgl){
  const src=sources[p.paper.paperId];
  for(const q of src.questions){
   const n=q.n,head=p.paper.paperId+":q:"+n;
   if(q.images.stem){
    const asset=p.assets.find(a=>a.id===head+":stem");
    assert.equal(asset?.altText,"Diagram for question "+n);
    stemCount++;
   }
   for(const [i,uri] of (q.images.options??[]).entries()){
    if(!uri)continue;
    const asset=p.assets.find(a=>a.id===head+":option:"+i);
    assert.equal(asset?.altText,"Image for option "+String.fromCharCode(65+i)+" of question "+n);
    optionCount++;
   }
  }
 }
 assert.ok(stemCount>0&&optionCount>0);
});

test("F07: generic author alt survives exactly; option without alt gets contextual fallback",()=>{
 const p=structuredClone(pkg);
 const q=p.questions[0];
 const image={id:"image-option-a",mediaType:"image/png",dataUri:"data:image/png;base64,aGVsbG8=",
   contentHash:"0".repeat(64),altText:"Authored structural diagram of a motor"}; // renderer-only fixture
 const noAlt={...image,id:"image-option-b",altText:undefined};
 p.assets=[image,noAlt];
 q.content.options[0].assetIds=[image.id];
 q.content.options[1].assetIds=[noAlt.id];
 const html=renderGenericControls(p,q);
 assert.match(html,/alt="Authored structural diagram of a motor"/);
 assert.match(html,/alt="Image for option B"/);
 assert.doesNotMatch(html,/alt="Question image"/);
});

test("F07: actual question screen inherits source context rather than generic image label",()=>{
 const p=cgl.find(p=>p.paper.edition==="reviewed"&&p.paper.paperId==="cgl-2026-09-30");
 assert.ok(p);
 const original=sources[p.paper.paperId].questions.find(q=>q.n===1);
 if(!original?.images.stem&&!original?.images.options?.some(Boolean)){
  const imageQuestion=sources[p.paper.paperId].questions.find(q=>q.n<=25&&
   (q.images.stem||q.images.options?.some(Boolean)));
  assert.ok(imageQuestion);
  const attempt=startGenericAttempt(configureCglPractice(p,"free"),"img",0);
  const state={...attempt.state,questionIndex:imageQuestion.n-1};
  const html=renderModelExam({...attempt,state},p);
  assert.match(html,new RegExp("question "+imageQuestion.n+"|option [A-D] of question "+imageQuestion.n,"i"));
  assert.doesNotMatch(html,/alt="Question image"/);
 }
});

test("F08: all eight statuses have explicit meaningful labels; change types avoid false key-correction claims",()=>{
 const expected={
  verified:/source or author/i,corrected:/Editorial correction recorded/,caution:/Editorial caution/,
  invalid:/Defective.+excluded/,draft:/Draft.+excluded/,"under-review":/Under review.+excluded/,
  "incomplete-source":/Incomplete source.+excluded/,superseded:/Superseded.+excluded/
 };
 for(const [status,pattern] of Object.entries(expected)){
  const label=editorialStatusLabel({status});
  assert.match(label,pattern);
  assert.notEqual(label,status);
 }
 assert.match(editorialStatusLabel({status:"corrected",changes:["answer-key"]}),/Key corrected/);
 assert.doesNotMatch(editorialStatusLabel({status:"corrected",changes:["wording"]}),/Key corrected/);
 assert.match(editorialStatusLabel({status:"caution",changes:["wording"]}),/Wording caution/);
 assert.match(editorialStatusLabel({status:"caution"}),/not certified/);
 assert.doesNotMatch(editorialStatusLabel({status:"caution"}),/independently (verified|established|correct)/i);
});

test("F10: paused marking changes only the flag; time, response, cursor and visit counts remain frozen",()=>{
 const p=pkg.paper;
 let state=startSession(p,0);
 const id=p.sections[0].questionRevisionIds[0];
 state=transition(p,state,send("ANSWER",40,{response:{kind:"single-choice",optionId:"a"}}));
 state=transition(p,state,send("PAUSE",100));
 const before=structuredClone(state);
 assert.equal(before.status,"paused");
 state=transition(p,state,send("FLAG",50000,{flagged:true}));
 assert.equal(visible(state,id)?.flagged,true);
 assert.deepEqual(visible(state,id)?.response,visible(before,id)?.response);
 assert.equal(state.elapsedMs,before.elapsedMs);
 assert.equal(state.sectionElapsedMs,before.sectionElapsedMs);
 assert.equal(state.foregroundMs,before.foregroundMs);
 assert.equal(state.questionIndex,before.questionIndex);
 assert.deepEqual(state.questionVisits,before.questionVisits);
 for(const command of [
   send("ANSWER",51000,{response:{kind:"single-choice",optionId:"b"}}),
   send("CLEAR",52000),
   send("NAVIGATE",53000,{sectionIndex:0,questionIndex:1}),
   send("SUBMIT_ATTEMPT",54000)]){
  const previous=state;
  state=transition(p,state,command);
  assert.equal(state.status,"paused");
  assert.deepEqual(state.responses,previous.responses);
  assert.equal(state.questionIndex,0);
  assert.equal(state.elapsedMs,before.elapsedMs);
 }
 const second=transition(p,state,send("FLAG",56000,{flagged:false}));
 assert.equal(visible(second,id)?.flagged,false);
 state=transition(p,second,send("RESUME",60000));
 state=transition(p,state,send("TICK",60100));
 assert.equal(state.elapsedMs,before.elapsedMs+100);
 assert.equal(state.status,"running");
});

test("F10: cannot flag when disabled, after expiry or after completion",()=>{
 const noFlag={...pkg.paper,navigation:{...pkg.paper.navigation,allowFlagging:false}};
 let a=startSession(noFlag,0);
 a=transition(noFlag,a,send("PAUSE",10));
 const old=a.responses;
 a=transition(noFlag,a,send("FLAG",20,{flagged:true}));
 assert.deepEqual(a.responses,old);
 const manual={...pkg.paper,
   timing:{kind:"sectional",transition:"manual",allowEarlySubmit:false,pausePolicy:"allowed",
     sectionLimits:[{sectionId:"s1",durationMs:30},{sectionId:"s2",durationMs:100}]}};
 let expired=startSession(manual,0);
 expired=transition(manual,expired,send("TICK",40));
 assert.equal(expired.status,"section-expired");
 const frozenAtExpiry=structuredClone(expired.responses);
 expired=transition(manual,expired,send("FLAG",1000,{flagged:true}));
 assert.deepEqual(expired.responses,frozenAtExpiry,"Expired section must not accept new flags");
 let done=startSession(pkg.paper,0);
 done=transition(pkg.paper,done,send("SUBMIT_ATTEMPT",100));
 assert.equal(done.status,"completed");
 const frozenAtCompletion=structuredClone(done.responses);
 done=transition(pkg.paper,done,send("FLAG",200,{flagged:true}));
 assert.deepEqual(done.responses,frozenAtCompletion,"Completed exam must not accept new flags");
});
}

// === Legacy suite: tests/ui-question-controls-and-drafts.test.mjs — 8 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const renderGenericControls = __suite_dep_4_question_content_view["renderGenericControls"];
const renderModelExam = __suite_dep_4_exam_view["renderModelExam"];
const examTimeRemaining = __suite_dep_4_exam_view["examTimeRemaining"];
const validateGenericStoredRecord = __suite_dep_4_stored_record_validator["validateGenericStoredRecord"];
const readableAnswer = __suite_dep_3["readableAnswer"];
const paperRevisionHash = __suite_dep_11["paperRevisionHash"];
const pkg = __suite_dep_2["pkg"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __suite_dep_3["transitionGenericAttempt"];
const multipleDraftMessage = __suite_dep_12["multipleDraftMessage"];
const duplicateMatchingTargets = __suite_dep_12["duplicateMatchingTargets"];
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
 assert.throws(()=>validateGenericStoredRecord({recordType:"generic-attempt",saveRevision:1,id:"fake"}),/Invalid generic/);
 assert.throws(()=>validateGenericStoredRecord({recordType:"generic-package",saveRevision:1,id:"wrong",bundle:{paper:{id:"x"}}}),/identity/);
});

test("shared renderer enforces paused, forward-only and no-early-submit policies",async()=>{
 const {renderModelExam}=await import("../src/app/exam-view.ts");
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
}

// === Legacy suite: tests/navigation-native-routes.test.mjs — 3 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const parseAppRoute = __suite_dep_13["parseAppRoute"];
const routeHref = __suite_dep_13["routeHref"];
const sameDocumentPath = __suite_dep_13["sameDocumentPath"];
const file="file:///tmp/Practice_Desk_Offline_Mock_Tests.html";
test("native-only query codec round-trips every routable screen on file URL",()=>{
  const cases=[
   {screen:"library"},{screen:"history"},{screen:"learning"},
   {screen:"exam",attemptId:"attempt-1"},
   {screen:"result",attemptId:"attempt-1",tab:"overview"},
   {screen:"result",attemptId:"imported:é/& +",tab:"review"},
   {screen:"result",attemptId:"a".repeat(256),tab:"timing"}
  ];
  for(const r of cases){
    const href=routeHref(file,r);
    assert.equal(new URL(href).pathname,new URL(file).pathname);
    assert.equal(new URL(href).hash,"");
    assert.deepEqual(parseAppRoute(href),r);
    assert(sameDocumentPath(file,href),"query navigation must keep same file path");
  }
});
test("native codec rejects ambiguous, malformed or answer-bearing route schema",()=>{
 const bad=[
  "?pd=bogus","?pd=exam","?pd=result","?pd=exam&attempt=",
  "?pd=exam&attempt=x&attempt=y","?pd=result&attempt=x&tab=bogus",
  "?pd=result&attempt=x&tab=review&tab=timing",
  "?pd=library&attempt=wrong","?pd=learning&tab=review",
  "?pd=exam&attempt="+encodeURIComponent("\u0001"),
  "?pd=exam&attempt="+"a".repeat(257),
  "?pd=history&pd=exam"
 ];
 for(const query of bad)assert.equal(parseAppRoute(file+query),null,query);
 assert.equal(parseAppRoute(file),null);
 assert.equal(parseAppRoute("not a url"),null);
});
test("routeHref clears old route parameters without destroying unrelated query",()=>{
 const href=routeHref(file+"?foo=one&pd=exam&attempt=a&tab=review",
  {screen:"result",attemptId:"next",tab:"timing"});
 const u=new URL(href);
 assert.equal(u.searchParams.get("foo"),"one");
 assert.deepEqual(u.searchParams.getAll("pd"),["result"]);
 assert.deepEqual(u.searchParams.getAll("attempt"),["next"]);
 assert.deepEqual(u.searchParams.getAll("tab"),["timing"]);
 assert.equal(sameDocumentPath(file,file+"?pd=history"),true);
 assert.equal(sameDocumentPath(file,"file:///tmp/other.html?pd=history"),false);
 assert.equal(sameDocumentPath(file,"https://example.com/test?pd=history"),false);
});
}


// User-reported Mac Safari compatibility: deterministic file:// fragment codec.
// Real Back/Forward, persistence and reloading are covered by acceptance-safari-fallback.
{
const test=__suite_dep_0["default"];
const assert=__suite_dep_1["default"];
const fragmentRouteHref=__suite_dep_13["fragmentRouteHref"];
const parseFragmentRoute=__suite_dep_13["parseFragmentRoute"];
const sameDocumentPath=__suite_dep_13["sameDocumentPath"];
test("Safari fallback encodes every route in same-file fragments without changing pathname",()=>{
 const base="file:///Users/example/Practice_Desk_Offline_Mock_Tests.html?mode=demo";
 const routes=[
  {screen:"library"},{screen:"history"},{screen:"learning"},
  {screen:"exam",attemptId:"saved+test id"},
  {screen:"result",attemptId:"saved+test id",tab:"overview"},
  {screen:"result",attemptId:"saved+test id",tab:"review"},
  {screen:"result",attemptId:"saved+test id",tab:"timing"}
 ];
 for(const route of routes){
  const href=fragmentRouteHref(base,route);
  assert(sameDocumentPath(base,href),JSON.stringify(route));
  assert.equal(new URL(href).searchParams.get("mode"),"demo");
  assert.deepEqual(parseFragmentRoute(href),route);
 }
});
test("Safari fallback rejects malformed and duplicate deep-link routes without executing content",()=>{
 const base="file:///Users/example/practice.html";
 for(const hash of [
  "#pd=exam","#pd=results&attempt=foo",
  "#pd=exam&attempt=a&attempt=b",
  "#pd=history&pd=exam",
  "#pd=exam&attempt=a&tab=review",
  "#pd=result&attempt=a&tab=solutions",
  "#pd=exam&attempt=%00"
 ])assert.equal(parseFragmentRoute(base+hash),null,hash);
 assert.equal(parseFragmentRoute(base),null);
 assert.equal(parseFragmentRoute("not a url"),null);
});
}
