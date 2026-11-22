import test from "node:test";
import assert from "node:assert/strict";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {
 addCandidateHighlights,candidateHighlightIdsOverlapping,emptyCandidateScratch,
 removeCandidateHighlights,validateCandidateScratch
} from "../src/domain/candidate-scratch.ts";
import {renderQuestionPrompt,stimulusHTML} from "../src/app/question-content-view.ts";
import {renderModelExam} from "../src/app/exam-view.ts";
import {startGenericAttempt} from "../src/app/exam-package.ts";

const IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4NwAAAAASUVORK5CYII=";
const asset={id:"atomic-image",mediaType:"image/png",dataUri:IMAGE,contentHash:"0".repeat(64),altText:"Atomic image"};
const context=(qs=questions,stimuli=[])=>({questions:qs,stimuli});

test("candidate highlight operations validate source anchors, detect overlap and remove only scratch evidence",()=>{
 const base=emptyCandidateScratch();
 const first={id:"h-one",surface:{kind:"question-prompt",questionRevisionId:"rev-0"},
  anchor:{kind:"plain",start:0,end:6},color:"yellow"};
 const scratch=addCandidateHighlights(base,[first],context());
 assert.equal(scratch.highlights.length,1);
 assert.deepEqual(candidateHighlightIdsOverlapping(scratch,[{
  surface:first.surface,anchor:{kind:"plain",start:3,end:8}
 }]),["h-one"]);
 assert.deepEqual(candidateHighlightIdsOverlapping(scratch,[{
  surface:first.surface,anchor:{kind:"plain",start:6,end:9}
 }]),[],"touching ranges are not overlapping");
 assert.throws(()=>addCandidateHighlights(scratch,[{...first,id:"bad",anchor:{kind:"plain",start:0,end:999}}],context()),
  /range exceeds source text/);
 const removed=removeCandidateHighlights(scratch,["h-one"]);
 assert.deepEqual(removed,base);
 assert.equal(removeCandidateHighlights(scratch,["missing"]),scratch,
  "no-op removal should preserve object identity");
});

test("plain prompt highlighting renders canonical offsets and never mutates frozen question content",()=>{
 let attempt=startGenericAttempt(pkg,"highlight-plain",1000);
 const before=structuredClone(attempt.frozen.questions[0]);
 attempt={...attempt,candidateScratch:validateCandidateScratch({
  schema:1,eliminations:[],highlights:[{
   id:"plain-h",surface:{kind:"question-prompt",questionRevisionId:"rev-0"},
   anchor:{kind:"plain",start:0,end:6},color:"pink"
  }]
 },context(attempt.frozen.questions,attempt.frozen.stimuli))};
 const html=renderModelExam(attempt,pkg);
 assert.match(html,/data-highlight-surface="question-prompt" data-highlight-mode="plain"/);
 assert.match(html,/data-highlight-color="pink">Choose<\/mark> one/);
 assert.deepEqual(attempt.frozen.questions[0],before,
  "candidate highlighting must not rewrite the frozen QuestionRevision");
});

test("rich prompt annotations use structural text-leaf paths while authored marks, lists and tables survive",()=>{
 const richPrompt={format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[
   {type:"text",text:"Alpha",marks:["strong"]},
   {type:"math",tex:"x^2",linearText:"x squared"},
   {type:"image",assetId:"atomic-image",altText:"Atomic image"},
   {type:"text",text:" beta",marks:["underline"]}
  ]},
  {type:"list",ordered:false,items:[[{type:"text",text:"List item",marks:["emphasis"]}]]},
  {type:"table",rows:[
   [[{type:"text",text:"Head"}]],
   [[{type:"text",text:"Cell"}]]
  ]},
  {type:"display-math",tex:"y=mx+b",linearText:"y equals m x plus b"}
 ]};
 const q={...questions[0],id:"rich-highlight-q",content:{...questions[0].content,richPrompt}};
 const pack={...pkg,questions:[q,...questions.slice(1)],assets:[asset]};
 const scratch=validateCandidateScratch({schema:1,eliminations:[],highlights:[
  {id:"rich-a",surface:{kind:"question-prompt",questionRevisionId:q.id},
   anchor:{kind:"rich",path:[0,0],start:0,end:5},color:"yellow"},
  {id:"rich-b",surface:{kind:"question-prompt",questionRevisionId:q.id},
   anchor:{kind:"rich",path:[0,3],start:1,end:5},color:"green"},
  {id:"rich-list",surface:{kind:"question-prompt",questionRevisionId:q.id},
   anchor:{kind:"rich",path:[1,0,0],start:0,end:4},color:"pink"},
  {id:"rich-cell",surface:{kind:"question-prompt",questionRevisionId:q.id},
   anchor:{kind:"rich",path:[2,1,0,0],start:0,end:4},color:"yellow"}
 ]},context([q],[]));
 const html=renderQuestionPrompt(pack,q,scratch);
 assert.match(html,/data-rich-path="0\.0"/);
 assert.match(html,/data-rich-path="0\.3"/);
 assert.doesNotMatch(html,/data-rich-path="0\.1"/,"inline KaTeX must stay atomic");
 assert.doesNotMatch(html,/data-rich-path="0\.2"/,"inline images must stay atomic");
 assert.match(html,/data-highlight-color="yellow"><strong>Alpha<\/strong><\/mark>/);
 assert.match(html,/<u> <mark class="candidate-highlight"[^>]*data-highlight-color="green">beta<\/mark><\/u>/);
 assert.match(html,/<ul class="pd-rich-list">/);
 assert.match(html,/<em><mark class="candidate-highlight"[^>]*>List<\/mark> item<\/em>/);
 assert.match(html,/<table class="pd-rich-table">/);
 assert.match(html,/data-rich-path="2\.1\.0\.0"/);
 assert.match(html,/katex-mathml/);
 assert.match(html,/data-image-open/);
});

test("eligible passage, table-cell and media-caption surfaces are independently source anchored",()=>{
 const passage={id:"pass",kind:"passage",title:"Case",text:"Clinical clue"};
 const table={id:"tab",kind:"table",title:"Labs",columns:["Marker"],rows:[["Value"]]};
 const image={id:"fig",kind:"image",assetId:"atomic-image",altText:"Figure",caption:"Caption clue"};
 const stimuli=[passage,table,image];
 const pack={...pkg,assets:[asset],stimuli};
 const cases=[
  {
   q:{...questions[0],content:{...questions[0].content,stimulusId:"pass"}},
   highlight:{id:"p",surface:{kind:"stimulus-passage",stimulusId:"pass"},
    anchor:{kind:"plain",start:0,end:8},color:"yellow"},
   pattern:/data-highlight-surface="stimulus-passage"[^>]*><mark[^>]*>Clinical<\/mark> clue/
  },
  {
   q:{...questions[0],content:{...questions[0].content,stimulusId:"tab"}},
   highlight:{id:"t",surface:{kind:"stimulus-table-cell",stimulusId:"tab",row:0,column:0},
    anchor:{kind:"plain",start:0,end:5},color:"green"},
   pattern:/data-highlight-row="0" data-highlight-column="0"[^>]*><mark[^>]*data-highlight-color="green">Value<\/mark>/
  },
  {
   q:{...questions[0],content:{...questions[0].content,stimulusId:"fig"}},
   highlight:{id:"c",surface:{kind:"stimulus-caption",stimulusId:"fig"},
    anchor:{kind:"plain",start:0,end:7},color:"pink"},
   pattern:/data-highlight-surface="stimulus-caption"[^>]*><mark[^>]*data-highlight-color="pink">Caption<\/mark> clue/
  }
 ];
 for(const item of cases){
  const scratch=validateCandidateScratch({schema:1,eliminations:[],highlights:[item.highlight]},
    context([item.q],stimuli));
  const html=stimulusHTML(pack,item.q,scratch);
  assert.match(html,item.pattern);
 }
 const imageHTML=stimulusHTML(pack,cases[2].q,validateCandidateScratch({
  schema:1,eliminations:[],highlights:[cases[2].highlight]
 },context([cases[2].q],stimuli)));
 assert.match(imageHTML,/data-image-open/);
 assert.doesNotMatch(imageHTML,/data-rich-path/,"plain image/caption rendering must not make the image an offset target");
});
