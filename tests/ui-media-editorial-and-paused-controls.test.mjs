import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg} from "./fixtures/six-kinds.mjs";
import {builtinCglPackages,configureCglPractice,startGenericAttempt} from "../src/app/exam-package.ts";
import {renderGenericControls,renderModelExam} from "../src/app/generic-ui.ts";
import {editorialStatusLabel} from "../src/app/editorial-labels.ts";
import {startSession,transition} from "../src/engine/session.ts";

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
