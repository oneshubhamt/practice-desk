/** P47-1 direct public module seam tests; no import from the old UI coordinator. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg,questions,answers} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {escapeText} from "../src/app/html-escape.ts";
import {assetHTML,stimulusHTML,renderGenericControls} from "../src/app/question-content-view.ts";
import {minutes,readablePracticeMode,examTimeRemaining,renderModelExam} from "../src/app/exam-view.ts";
import {frozenReviewMedia,sourceReviewHTML} from "../src/app/review-media-view.ts";
import {validateGenericStoredRecord,isAttempt,isPackage,isLearning} from "../src/app/stored-record-validator.ts";

const attempt=()=>startGenericAttempt(pkg,"module-seam-attempt",1000);
test("P47-1 independently escaped HTML text/attributes cannot turn into markup",()=>{
 assert.equal(escapeText('&<>"\''),"&amp;&lt;&gt;&quot;&#39;");
 const bad={...questions[0],content:{...questions[0].content,
  prompt:'<img src=x onerror=alert(1)>',options:[
   {id:'\" onfocus=\"malicious',text:'<svg onload=alert(1)>'},
   {id:"b",text:"Safe & easy"}]}};
 const html=renderGenericControls(pkg,bad);
 assert.match(html,/&lt;svg onload=alert\(1\)&gt;/);
 assert.match(html,/data-choice="&quot; onfocus=&quot;malicious"/);
 assert.doesNotMatch(html,/<svg|onfocus="malicious"/);
 const active=attempt();
 const page=renderModelExam({...active,frozen:{...active.frozen,questions:[
  bad,...active.frozen.questions.slice(1)]}},pkg);
 assert.match(page,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(page,/<img src=x onerror/);
 assert.doesNotMatch(page,/Expected answer|Correct answer|Published key/);
});
test("P47-1 all six independently rendered answer kinds retain exact controls and drafts",()=>{
 const tags=[
  /type="radio"[^>]*data-choice="a"/,
  /type="checkbox"[^>]*data-choice="x"/,
  /id="g-number"/,
  /data-bool="true"/,
  /data-match="l1"/,
  /id="g-text"/
 ];
 for(let i=0;i<questions.length;i++)assert.match(renderGenericControls(pkg,questions[i]),tags[i]);
 assert.match(renderGenericControls(pkg,questions[1],{kind:"multiple-select",optionIds:["x","z"]}),/data-choice="x" checked/);
 assert.match(renderGenericControls(pkg,questions[4],{kind:"matching",pairs:[{leftId:"l1",rightId:"r2"}]}),/value="r2" selected/);
 assert.match(renderGenericControls(pkg,questions[5],{kind:"free-response",text:"A < B & C"}),/A &lt; B &amp; C/);
});
test("P47-1 asset/stimulus modules use validated source references and preserve authored alt",()=>{
 const a={id:"image",dataUri:"data:image/png;base64,AA==",mediaType:"image/png",altText:'Angle < 20° & "safe"',contentHash:"0".repeat(64)};
 const pack={...pkg,assets:[a],stimuli:[
  {id:"pass",kind:"passage",title:"Passage <1>",text:"A & B",assetIds:["image"]},
  {id:"table",kind:"table",title:"Rates",columns:["<Name>"],rows:[["3 & 4"]]},
  {id:"chart",kind:"image",assetId:"image",altText:"Chart <1>"},
 ]};
 assert.match(assetHTML(pack,["image"]),/alt="Angle &lt; 20° &amp; &quot;safe&quot;"/);
 assert.match(assetHTML(pack,["missing"]),/^$/);
 assert.match(assetHTML({...pack,assets:[{...a,altText:undefined}]},["image"],"Contextual option B"),/alt="Contextual option B"/);
 const q=id=>({...questions[0],content:{...questions[0].content,stimulusId:id}});
 assert.match(stimulusHTML(pack,q("pass")),/Reading passage|Passage &lt;1&gt;/);
 assert.match(stimulusHTML(pack,q("pass")),/A &amp; B/);
 assert.match(stimulusHTML(pack,q("table")),/3 &amp; 4/);
 assert.doesNotMatch(stimulusHTML(pack,q("table")),/<Name>/);
 assert.match(stimulusHTML(pack,q("chart")),/Chart &lt;1&gt;/);
 assert.equal(stimulusHTML(pack,q("missing")),"");
});
test("P47-1 exam view is a read-only dependency of supplied state and focus flag",()=>{
 const a=attempt(),snapshot=structuredClone(a);
 const inactive=renderModelExam(a,pkg,"",undefined,{focused:false});
 const full=renderModelExam(a,pkg,"",undefined,{focused:true});
 assert.match(inactive,/Toggle full-screen test view" aria-pressed="false"/);
 assert.match(full,/Toggle full-screen test view" aria-pressed="true"/);
 assert.equal(readablePracticeMode("custom-practice"),"Custom practice");
 assert.equal(minutes(1001),"00:02");
 assert.equal(examTimeRemaining(a.frozen.paper,a.state),1200000);
 assert.deepEqual(a,snapshot,"renderModelExam may not mutate frozen attempts");
});
test("P47-1 review display uses exact frozen answers and separate source edition",()=>{
 const a=attempt(),q=questions[0];
 const chosen={kind:"single-choice",optionId:"b"};
 const html=frozenReviewMedia(a,q,chosen,answers[0],"incorrect");
 assert.match(html,/Your choice/);
 assert.match(html,/Correct answer/);
 assert.match(html,/Incorrect choice/);
 assert.equal(frozenReviewMedia(a,q,chosen,answers[0],"excluded").includes("Correct answer"),false,
  "excluded items must not be highlighted as correct");
 const source={
  examId:pkg.examId,stimuli:[],assets:[],
  entries:[{targetQuestionRevisionId:q.id,sourceQuestion:q,sourceAnswer:answers[0]}]
 };
 const compare=sourceReviewHTML(a,q,source);
 assert.match(compare,/Original published answer:/);
 assert.match(compare,/Compare with original source edition/);
 assert.equal(sourceReviewHTML(a,questions[1],source),"");
});
test("P47-1 validator is standalone, fail-closed and never modifies the input",()=>{
 const a=attempt(),before=structuredClone(a);
 assert.equal(validateGenericStoredRecord(a),a);
 assert.deepEqual(a,before);
 assert.ok(isAttempt(a));assert.equal(isLearning(a),false);assert.equal(isPackage(a),false);
 assert.throws(()=>validateGenericStoredRecord({...a,packageId:"another"}),/incorrect revision/);
 assert.throws(()=>validateGenericStoredRecord({...a,saveRevision:-1}),/write revision/);
 assert.throws(()=>validateGenericStoredRecord({...a,frozen:{...a.frozen,answerKeyRevisionId:"forged"}}),/frozen|snapshot|hash|integrity|content/i);
});
test("P47-1 independent presentation and validation modules have no coordinator or DOM dependency",async()=>{
 for(const file of ["html-escape","question-content-view","exam-view","stored-record-validator","review-media-view"]){
  const s=await readFile(new URL("../src/app/"+file+".ts",import.meta.url),"utf8");
  assert.doesNotMatch(s,/from ["']\.\/generic-ui\.ts["']|from ["']\.\/bootstrap\.ts["']/);
  assert.doesNotMatch(s,/\b(?:document|window)\s*\./,
    file+" must not read application DOM, focus, window or global user state");
 }
 const coordinator=await readFile(new URL("../src/app/generic-ui.ts",import.meta.url),"utf8");
 for(const fn of ["assetHTML","stimulusHTML","renderGenericControls","renderModelExam",
  "validateGenericStoredRecord","frozenReviewMedia","sourceReviewHTML"]){
  assert.doesNotMatch(coordinator,new RegExp("(?:export )?function "+fn+"\\("),
   fn+" must be implemented in its owned module, not duplicated in coordinator");
 }
});
