/** Canonical product-domain suite. Historical programme files are preserved only as trace comments. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {sha256} from "../src/domain/hash.ts";
import {assessRasterCandidate,PREPARE_MAX_FILE_BYTES,PREPARE_MAX_COMPARE_PIXELS,PREPARE_WEBP_QUALITY,imageBytesLabel} from "../src/app/image-preparation.ts";
import {pkg,questions,answers} from "./fixtures/six-kinds.mjs";
import {assetHTML,renderGenericControls,stimulusHTML,renderAuthoredText} from "../src/app/question-content-view.ts";
import {frozenReviewMedia,sourceReviewHTML} from "../src/app/review-media-view.ts";
import {IMAGE_MIN_ZOOM,IMAGE_MAX_ZOOM,boundedImageZoom,fittedImage,boundedImageOffset,anchoredImageOffset,isLocalVerifiedImageUri} from "../src/app/image-viewer.ts";
import {mathRenderer,KATEX_VERSION} from "../src/app/katex-math-adapter.ts";
import {authoredTextHTML} from "../src/app/rich-content-view.ts";
import {renderModelExam,minutes,readablePracticeMode,examTimeRemaining} from "../src/app/exam-view.ts";
import {questionRevisionHash} from "../src/domain/integrity.ts";
import {escapeText} from "../src/app/html-escape.ts";
import {validateGenericStoredRecord,isAttempt,isPackage,isLearning} from "../src/app/stored-record-validator.ts";

/** Image Preparation — canonical domain contracts. */
async function registerImagePreparationTests(){
/** P47-3B: authored image preparation/commit gate, independent of UI. */
const IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4NwAAAAASUVORK5CYII=";
const richImage=(text,id)=>({format:"practice-desk-rich",version:1,blocks:[
 {type:"paragraph",content:[{type:"text",text},
  {type:"image",assetId:id,altText:"A mathematical diagram with fine labels"}]}
]});
const bank=()=>({
 format:"practice-desk-authoring",version:1,bankId:"cat-media-demo",examId:"cat",
 paperId:"cat-media-demo",title:"CAT authored diagram practice",revision:1,edition:"custom",
 scoring:{correctMarks:3,incorrectMarks:-1},
 timing:{kind:"untimed",pausePolicy:"allowed"},
 navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
 sections:[{id:"qa",title:"Quantitative Ability"}],
 media:[{id:"math-fig",dataUri:IMAGE,altText:"A mathematical diagram with fine labels"}],
 questions:[{id:"q1",examSection:"qa",subject:"Quantitative Aptitude",kind:"single-choice",
  prompt:richImage("Which picture represents the function?","math-fig"),
  options:[richImage("A","math-fig"),"B","C","D"],answer:"B",
  provenance:{kind:"manual"},qa:{status:"unchecked"}}]
});
test("P47-3B canonical authoring image is frozen with exact validated SHA-256 and all references",()=>{
 const original=bank(),snapshot=structuredClone(original);
 const pkg=compileExternalQuestionBank(original);
 assert.equal(pkg.examId,"cat");
 assert.equal(pkg.assets.length,1);
 const asset=pkg.assets[0];
 assert.equal(asset.id,"math-fig");
 assert.equal(asset.altText,"A mathematical diagram with fine labels");
 assert.equal(asset.mediaType,"image/png");
 assert.equal(asset.dataUri,IMAGE,"source bytes must not be silently recompressed");
 assert.equal(asset.contentHash,sha256(Uint8Array.from(atob(IMAGE.split(",")[1]),c=>c.charCodeAt(0))));
 assert.deepEqual(pkg.questions[0].content.assetIds,["math-fig"]);
 assert.deepEqual(pkg.questions[0].content.options[0].assetIds,["math-fig"]);
 assert.deepEqual(validateExamPackage(pkg),pkg);
 assert.deepEqual(original,snapshot,"authoring import must not mutate input");
});
test("P47-3B advanced already-hashed package imports without altering authenticated images",()=>{
 const pkg=compileExternalQuestionBank(bank());
 const copy=structuredClone(pkg);
 assert.deepEqual(validateExamPackage(copy),copy);
 copy.assets[0].contentHash="a".repeat(64);
 assert.throws(()=>validateExamPackage(copy),/digest mismatch/);
});
test("P47-3B invalid image references and media metadata are rejected before freezing",()=>{
 const missing=bank();
 missing.questions[0].prompt.blocks[0].content[1].assetId="not-in-inventory";
 assert.throws(()=>compileExternalQuestionBank(missing),/asset|image/i);
 const badOption=bank();
 badOption.questions[0].options[0].blocks[0].content[1].assetId="missing-option-image";
 assert.throws(()=>compileExternalQuestionBank(badOption),/asset|image/i);
 const svg=bank();svg.media[0].dataUri="data:image/svg+xml;base64,PHN2Zz4=";
 assert.throws(()=>compileExternalQuestionBank(svg),/embedded data:image|dataUri|image/i);
 const malicious=bank();malicious.media[0].extra="script";
 assert.throws(()=>compileExternalQuestionBank(malicious),/unsupported authoring field/i);
});
test("P47-3B choose smaller WebP only with strong fidelity and meaningful savings",()=>{
 const good={sourceBytes:550000,candidateBytes:240000,width:1600,height:1200,
  psnrDb:45,maxChannelError:12,significantErrorFraction:0};
 const accepted=assessRasterCandidate(good);
 assert.equal(accepted.accepted,true);
 assert.ok(accepted.smallerBy>0.5);
 assert.equal(assessRasterCandidate({...good,candidateBytes:525000}).accepted,false);
 assert.equal(assessRasterCandidate({...good,psnrDb:32}).accepted,false);
 assert.equal(assessRasterCandidate({...good,maxChannelError:80}).accepted,false);
 assert.equal(assessRasterCandidate({...good,significantErrorFraction:0.1}).accepted,false);
 assert.equal(assessRasterCandidate({...good,width:5000,height:5000}).accepted,false);
 assert.equal(assessRasterCandidate({...good,candidateBytes:0}).accepted,false);
 assert.equal(PREPARE_MAX_FILE_BYTES,10*1024*1024);
 assert.equal(PREPARE_MAX_COMPARE_PIXELS,8*1024*1024);
 assert.equal(PREPARE_WEBP_QUALITY,0.98);
 assert.equal(imageBytesLabel(1024*1024),"1.00 MiB");
});
}
await registerImagePreparationTests();


/** Image Viewing — canonical domain contracts. */
async function registerImageViewingTests(){
/** P47-3: pure viewer geometry, trust boundary and actual HTML contracts. */
const dataUri="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4NwAAAAASUVORK5CYII=";
const image={id:"diagram-1",mediaType:"image/png",dataUri,contentHash:"0".repeat(64),
 altText:'Exact “graph” & <radius> > 10'};
const withMedia=(q=questions[0])=>({
 ...pkg,assets:[image],questions:pkg.questions.map(x=>x.id===q.id?
   {...x,content:{...x.content,assetIds:["diagram-1"]}}:x)
});
test("P47-3 geometry fits originals without upscaling and guards invalid dimensions",()=>{
 assert.deepEqual(fittedImage({width:200,height:100},{width:800,height:600}),{width:200,height:100});
 assert.deepEqual(fittedImage({width:2400,height:1200},{width:600,height:250}),{width:500,height:250});
 assert.deepEqual(fittedImage({width:0,height:100},{width:100,height:100}),{width:0,height:0});
 assert.deepEqual(fittedImage({width:Infinity,height:100},{width:100,height:100}),{width:0,height:0});
});
test("P47-3 zoom/pan are mathematically bounded and pointer anchored",()=>{
 assert.equal(boundedImageZoom(-10),IMAGE_MIN_ZOOM);
 assert.equal(boundedImageZoom(Infinity),IMAGE_MIN_ZOOM);
 assert.equal(boundedImageZoom(9999),IMAGE_MAX_ZOOM);
 assert.equal(boundedImageZoom(3.75),3.75);
 const size={width:600,height:400},viewport={width:300,height:250};
 assert.deepEqual(boundedImageOffset({x:999,y:-999},2,size,viewport),{x:450,y:-275});
 assert.deepEqual(boundedImageOffset({x:15,y:-15},1,{width:120,height:80},viewport),{x:0,y:0});
 assert.deepEqual(anchoredImageOffset({x:0,y:0},1,2,{x:80,y:20}),{x:-80,y:-20});
 assert.deepEqual(anchoredImageOffset({x:40,y:-10},2,4,{x:0,y:0}),{x:80,y:-20});
});
test("P47-3 viewer refuses network, active SVG, plain strings and malformed URL prefixes",()=>{
 for(const type of ["png","jpeg","webp","avif","gif"])
  assert.equal(isLocalVerifiedImageUri("data:image/"+type+";base64,AAAA"),true);
 for(const input of ["https://cdn.example/diagram.png","http://host/img.jpg",
  "blob:https://host/id","data:image/svg+xml;base64,PHN2Zz4=",
  "data:text/html;base64,PHNjcmlwdD4=","data:image/png,AAAA","javascript:alert(1)",""]){
  assert.equal(isLocalVerifiedImageUri(input),false,input);
 }
});
test("P47-3 one validated source URI per thumbnail, exact alt escaped, and keyboard launcher",()=>{
 const pack=withMedia();
 const html=assetHTML(pack,["diagram-1"]);
 assert.equal(html.split("data:image/png;base64,").length-1,1,"do not embed duplicate base64 for enlarged copy");
 assert.match(html,/class="generic-media-frame"/);
 assert.match(html,/data-image-open/);
 assert.match(html,/role="button" tabindex="0"/);
 assert.match(html,/alt="Exact “graph” &amp; &lt;radius&gt; &gt; 10"/);
 assert.match(html,/aria-label="Enlarge image: Exact “graph” &amp; &lt;radius&gt; &gt; 10"/);
 assert.equal(html.split("src=").length-1,1);
 assert.equal(assetHTML(pack,["missing"]),"");
});
test("P47-3 input and matching option images place launch controls OUTSIDE their labels",()=>{
 const pack=withMedia();
 const withOption={...questions[0],content:{...questions[0].content,
  options:questions[0].content.options.map((o,i)=>i===0?{...o,assetIds:["diagram-1"]}:o)}};
 const controls=renderGenericControls(pack,withOption);
 assert.match(controls,/generic-choice-media-row/);
 assert.match(controls,/data-choice="a"/);
 assert.match(controls,/data-image-open/);
 const optionPart=controls.slice(controls.indexOf('data-choice="a"'),controls.indexOf('data-choice="b"'));
 assert.ok(optionPart.indexOf('</label>')>=0);
 assert.ok(optionPart.indexOf('data-image-open')>optionPart.indexOf('</label>'),
  "image launch must not be nested inside the radio label");
 const matching={...questions[4],content:{...questions[4].content,
  leftItems:questions[4].content.leftItems.map((o,i)=>i===0?{...o,assetIds:["diagram-1"]}:o)}};
 const html=renderGenericControls(pack,matching);
 assert.match(html,/generic-match-media-row/);
 assert.ok(html.indexOf('data-image-open')>html.indexOf('</select></label>'),
  "image zoom must not be nested inside matching select label");
});
test("P47-3 stimulus, frozen reviewed and source edition figures all share same launcher",()=>{
 const pack={...withMedia(),stimuli:[{id:"st-image",kind:"image",assetId:"diagram-1",
  title:"Diagram",altText:"Image case"}]};
 const q={...questions[0],content:{...questions[0].content,
  stimulusId:"st-image",assetIds:["diagram-1"]}};
 assert.match(stimulusHTML(pack,q),/data-image-open/);
 const attempt=startGenericAttempt(pkg,"view-test",1000);
 const saved={...attempt,frozen:{...attempt.frozen,questions:[q,...attempt.frozen.questions.slice(1)],
  stimuli:pack.stimuli,assets:pack.assets}};
 assert.match(frozenReviewMedia(saved,q),/data-image-open/);
 const source={examId:pkg.examId,stimuli:pack.stimuli,assets:pack.assets,
  entries:[{targetQuestionRevisionId:q.id,sourceQuestion:q,sourceAnswer:pkg.answerKey.entries[0].answer}]};
 assert.match(sourceReviewHTML(saved,q,source),/data-image-open/);
});
}
await registerImageViewingTests();


/** Math Rendering — canonical domain contracts. */
async function registerMathRenderingTests(){
/** P47-5B: source-hashed explicit authored maths and safe KaTeX renderer. */
const TEX="\\frac{1}{2}";
const doc=blocks=>({format:"practice-desk-rich",version:1,blocks});
const paragraph=items=>doc([{type:"paragraph",content:items}]);
const txt=text=>({type:"text",text});
const math=(tex=TEX)=>({type:"math",tex,linearText:"one half"});
function richPack(){
 const pack=structuredClone(pkg);
 pack.stimuli=[{id:"math-table",kind:"table",title:"Rational numbers",
  columns:["Expression"],rows:[["1/2"]],
  richColumns:[paragraph([txt("Column "),math()])],
  richRows:[[paragraph([math()])]]}];
 pack.questions=pack.questions.map((q,i)=>{
  let content={...q.content,richPrompt:paragraph([txt("Compute "),math()])};
  if(i===0){
   content={...content,stimulusId:"math-table",
    richExplanation:paragraph([txt("SOLUTION-ONLY-CONTENT "),math()]),
    options:q.content.options.map((o,j)=>j===0?
     {...o,richText:paragraph([txt("Option "),math()])}:o)};
  }
  if(i===4)content={...content,leftItems:q.content.leftItems.map(x=>
   ({...x,richText:paragraph([math()])}))};
  return {...q,content,contentHash:questionRevisionHash({content,editorial:q.editorial})};
 });
 return pack;
}
test("P47-5B latest pinned KaTeX emits HTML and accessible MathML, bounded",()=>{
 assert.equal(KATEX_VERSION,"0.19.1");
 const html=mathRenderer.render({tex:TEX,linearText:"one half",displayMode:true}).html;
 assert.match(html,/katex-html/);
 assert.match(html,/katex-mathml/);
 assert.match(html,/<math/);
 assert.match(html,/pd-math-block/);
});
test("P47-5B malformed, malicious and untrusted TeX uses safe visible fallback",()=>{
 for(const tex of ["\\unknowncommand{bad}","\\href{https://evil.invalid/}{x}","\\includegraphics{https://evil.invalid/}{x}","x".repeat(2049)]){
  const html=mathRenderer.render({tex,linearText:'Figure <1> & "two"',displayMode:false}).html;
  assert.doesNotMatch(html,/<a\s+href=|<img\s+src=|<script/i);
  assert.doesNotMatch(html,/href="https?:/);
 }
 const bad=mathRenderer.render({tex:"\\thisCommandDoesNotExist",linearText:"x < y",displayMode:false}).html;
 assert.match(bad,/pd-math-fallback/);
 assert.match(bad,/aria-label="x &lt; y"/);
 assert.doesNotMatch(bad,/<y/);
});
test("P47-5B ordinary plain text including TeX-looking dollars stays inert",()=>{
 const source="$x^2$ <script>alert(1)</script>";
 const html=authoredTextHTML(source,undefined,new Set());
 assert.equal(html,"$x^2$ &lt;script&gt;alert(1)&lt;/script&gt;");
 assert.doesNotMatch(html,/katex/);
});
test("P47-5B six-kind authored rich math, tables and explanations survive valid signed import",()=>{
 const pack=richPack();
 assert.equal(validateExamPackage(pack),pack);
 const a=startGenericAttempt(pack,"math-rich",Date.now());
 const view=renderModelExam(a,pack);
 assert.match(view,/katex-mathml/);
 assert.match(view,/Rational numbers/);
 assert.match(view,/generic-choices/);
 assert.doesNotMatch(view,/SOLUTION-ONLY-CONTENT/);
 assert.doesNotMatch(view,/Correct answer/);
 const source=frozenReviewMedia(a,a.frozen.questions[0],undefined,undefined,undefined);
 assert.match(source,/katex-html/);
 const answerHTML=renderAuthoredText(pack,"",pack.questions[0].content.richExplanation);
 assert.match(answerHTML,/SOLUTION-ONLY-CONTENT/);
 assert.match(stimulusHTML(pack,pack.questions[0]),/scroll-table/);
});
test("P47-5B tampering with frozen rich math is rejected by current SHA source contract",()=>{
 const pack=richPack();
 pack.questions[0].content.richPrompt.blocks[0].content[1].tex="\\frac{2}{3}";
 assert.throws(()=>validateExamPackage(pack),/hash|digest|mismatch/i);
 const malformed=richPack();
 malformed.questions[0].content.richPrompt.blocks[0].content[1].unsafeHTML="<img src=x onerror=alert(1)>";
 malformed.questions[0].contentHash=questionRevisionHash(malformed.questions[0]);
 assert.throws(()=>validateExamPackage(malformed),/Unknown|noncanonical|rich|Invalid|source/i);
});
test("P47-5B source/review presentation supports math only from frozen verified resources",()=>{
 const pack=richPack(),a=startGenericAttempt(pack,"source-math",Date.now());
 const q=a.frozen.questions[0],ans=pack.answerKey.entries[0].answer;
 const reference={examId:pack.examId,stimuli:pack.stimuli,assets:[],
  entries:[{targetQuestionRevisionId:q.id,sourceQuestion:q,sourceAnswer:ans}]};
 const html=sourceReviewHTML(a,q,reference);
 assert.match(html,/katex-mathml/);
 assert.match(html,/Original published answer/);
});
test("P47-5C release carries only local WOFF2 and both KaTeX/Wordgard MIT notices",async()=>{
 const html=await readFile(new URL("../Practice_Desk_Offline_Mock_Tests.html",import.meta.url),"utf8");
 const size=(await stat(new URL("../Practice_Desk_Offline_Mock_Tests.html",import.meta.url))).size;
 assert.match(html,/KaTeX 0\.19\.1 LICENSE/);
 assert.match(html,/Wordgard 0\.6\.2 LICENSE/);
 assert.match(html,/data:font\/woff2;base64,/);
 assert.doesNotMatch(html,/url\(["']?(?:\.\/)?fonts\/KaTeX/);
 assert.doesNotMatch(html,/url\([^)]*\.ttf\)/);
 assert.doesNotMatch(html,/url\([^)]*\.woff\)/);
 // Pass 3 adds the full pinned Calendar surface (~212 KB minified runtime, measured in CI).
 // Keep a bounded post-integration review ceiling rather than silently dropping Calendar functionality.
 assert.ok(size<2_750_000,"Bundled file exceeds reviewed post-Calendar size limit: "+size);
});
}
await registerMathRenderingTests();


/** Rendering Purity — canonical domain contracts. */
async function registerRenderingPurityTests(){
/** P47-1 direct public module seam tests; no import from the old UI coordinator. */
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
 const forged=structuredClone(a);forged.frozen.key.entries[0].answer.optionId="b";
 assert.throws(()=>validateGenericStoredRecord(forged),/frozen|snapshot|hash|integrity|content/i);
});
}
await registerRenderingPurityTests();
