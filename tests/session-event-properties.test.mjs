/** Metamorphic timing/evidence checks complementary to the independent
 * reference clocks already in session-and-timing.test.mjs. These compare
 * observable session states under different event batchings, and use a
 * separate elapsed/visibility calculation for multi-section overshoots.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startSession,transition,rebaseSession,validateSectionTimingEvidence} from "../src/engine/session.ts";

const randomFrom=seed=>{
 let n=seed>>>0;return bound=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)%bound;};
};
const answerAt=state=>{
 const id=pkg.paper.sections[state.sectionIndex].questionRevisionIds[state.questionIndex];
 if(id==="rev-0")return {kind:"single-choice",optionId:"a"};
 if(id==="rev-1")return {kind:"multiple-select",optionIds:["x","z"]};
 if(id==="rev-2")return {kind:"numeric-entry",value:3.5};
 if(id==="rev-3")return {kind:"true-false",value:true};
 if(id==="rev-4")return {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]};
 return {kind:"free-response",text:"A recorded response"};
};

test("G session: 120 seeded event histories are invariant under timer-tick refinement and rebase",()=>{
 const types=["TICK","VISIBILITY","PAUSE","RESUME","NAVIGATE","ANSWER","CLEAR","FLAG"];
 for(let seed=1;seed<=120;seed++){
  const rand=randomFrom(0x71b33^seed),base=Date.UTC(2026,10,14,0)+seed*600000;
  const paper={...pkg.paper,timing:{kind:"whole-paper",
   durationMs:3000+rand(18000),pausePolicy:"allowed"}};
  let coarse=startSession(paper,base),fine=startSession(paper,base),clock=base;
  for(let index=0;index<75;index++){
   const delta=rand(480),previous=clock;
   clock+=delta;
   const type=types[rand(types.length)];
   const extra=type==="VISIBILITY"?{visible:rand(2)===1}:
     type==="NAVIGATE"?{sectionIndex:rand(2),questionIndex:rand(3)}:
     type==="ANSWER"?{response:answerAt(coarse)}:
     type==="FLAG"?{flagged:rand(2)===1}:{};
   const event={type,nowMs:clock,...extra};
   const before=coarse;
   coarse=transition(paper,coarse,event);
   // Interstitial ticks are observational only: they must not change
   // answer events, exposure, section boundaries or terminal score evidence.
   for(const elapsed of [Math.floor(delta/3),Math.floor(2*delta/3)])
    fine=transition(paper,fine,{type:"TICK",nowMs:previous+elapsed});
   fine=transition(paper,fine,event);
   assert.deepEqual(fine,coarse,"seed="+seed+" event="+index+" "+type);
   const spent=coarse.responses.reduce((sum,r)=>sum+r.timeSpentMs,0);
   assert.equal(spent,coarse.foregroundMs,"time is attributed exactly once");
   assert.ok(coarse.foregroundMs<=coarse.elapsedMs&&
     coarse.elapsedMs<=paper.timing.durationMs,"timer and exposure bounded");
   if(before.status==="completed"){
    assert.equal(coarse.elapsedMs,before.elapsedMs,"terminal time immutable");
    assert.deepEqual(coarse.responses,before.responses,"terminal responses immutable");
   }
  }
  const rebased=rebaseSession(coarse,base+9000000);
  assert.equal(rebased.elapsedMs,coarse.elapsedMs);
  assert.deepEqual(rebased.responses,coarse.responses);
  assert.deepEqual(rebased.questionVisits,coarse.questionVisits);
  assert.deepEqual(rebased.completedSectionTimings,coarse.completedSectionTimings);
  assert.equal(rebased.clockMs,base+9000000);
  validateSectionTimingEvidence(paper,coarse);
 }
});

test("G session: independently calculated hidden/paused time is not misattributed across automatic sectional expiry",()=>{
 for(let seed=1;seed<=100;seed++){
  const rand=randomFrom(0x477ac^seed);
  const limits=[20+rand(600),20+rand(600),20+rand(600)];
  const total=limits.reduce((a,b)=>a+b,0);
  const first=1+rand(limits[0]-1);
  const hidden=1+rand(total*2);
  const paused=1+rand(total*2);
  const sections=limits.map((_,i)=>({id:"g"+i,questionRevisionIds:["q"+i]}));
  const paper={...pkg.paper,sections,
   navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"},
   timing:{kind:"sectional",transition:"automatic",allowEarlySubmit:false,
    pausePolicy:"allowed",sectionLimits:sections.map((s,i)=>({sectionId:s.id,durationMs:limits[i]}))}};
  let time=Date.UTC(2026,10,14,0)+seed*100000;
  let s=startSession(paper,time);
  const advance=(type,millis,extra={})=>{
   time+=millis;s=transition(paper,s,{type,nowMs:time,...extra});
  };
  advance("TICK",first);
  advance("VISIBILITY",0,{visible:false});
  advance("TICK",hidden);
  advance("VISIBILITY",0,{visible:true});
  advance("PAUSE",0);
  advance("TICK",paused);
  const elapsedDuringPause=s.elapsedMs;
  advance("RESUME",0);
  assert.equal(s.elapsedMs,elapsedDuringPause,"pause must conserve exact measured time");
  advance("TICK",total*2);
  const hiddenEffective=Math.min(hidden,total-first);
  const expectedForeground=total-hiddenEffective;
  assert.equal(s.status,"completed","seed="+seed+" terminal");
  assert.equal(s.elapsedMs,total,"seed="+seed+" elapsed");
  assert.equal(s.foregroundMs,expectedForeground,"seed="+seed+" foreground");
  assert.deepEqual(s.completedSectionTimings.map(x=>x.durationMs),limits,"seed="+seed+" independent limits");
  assert.deepEqual(s.completedSectionTimings.map(x=>x.reason),["time-expired","time-expired","time-expired"]);
  assert.deepEqual(s.completedSections,[0,1,2]);
  assert.equal(s.responses.reduce((sum,r)=>sum+r.timeSpentMs,0),expectedForeground);
  assert.doesNotThrow(()=>validateSectionTimingEvidence(paper,s));
 }
});
