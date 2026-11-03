/** P47-3: pure viewer geometry, trust boundary and actual HTML contracts. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {assetHTML,renderGenericControls,stimulusHTML} from "../src/app/question-content-view.ts";
import {frozenReviewMedia,sourceReviewHTML} from "../src/app/review-media-view.ts";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {IMAGE_MIN_ZOOM,IMAGE_MAX_ZOOM,boundedImageZoom,fittedImage,
  boundedImageOffset,anchoredImageOffset,isLocalVerifiedImageUri} from "../src/app/image-viewer.ts";

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
test("P47-3 module source is transient: no OPFS, IndexedDB, network or object URLs",async()=>{
 const source=await readFile(new URL("../src/app/image-viewer.ts",import.meta.url),"utf8");
 for(const term of ["indexedDB","getDirectory(","fetch(","createObjectURL(","localStorage","sessionStorage"]){
  assert.ok(!source.includes(term),"image viewer must not introduce a storage/network dependency: "+term);
 }
 const ui=await readFile(new URL("../src/app/generic-ui.ts",import.meta.url),"utf8");
 assert.match(ui,/imageViewer\.beforeRender\(\)/);
 assert.match(ui,/imageViewer\.dispose\(\)/);
 assert.match(ui,/if\(imageViewer\.isOpen\(\)\)return/);
});
