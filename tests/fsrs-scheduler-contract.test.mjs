import test from "node:test";
import assert from "node:assert/strict";
import {
 createRevisionScheduler,FSRS_PROVIDER,FSRS_DEFAULT_DESIRED_RETENTION,
 FSRS_DEFAULT_LEECH_THRESHOLD,FSRS_COST_ADR_PRESET_GOAL_WEIGHT
} from "../src/learning/fsrs-scheduler-adapter.ts";
import {FSRS7_DEFAULT_WEIGHTS} from "ts-fsrs/models/fsrs-7";

test("FSRS-7 scheduler exposes one versioned runtime configuration for fixed and Cost-ADR policies",async()=>{
 const cases=[
  {name:"fixed",options:{policy:{kind:"fixed",desiredRetention:0.91},enableFuzz:false},
   policy:{kind:"fixed",desiredRetention:0.91}},
  {name:"cost-adr",options:{policy:{kind:"cost-adr",preset:"upstream-default"},enableFuzz:false},
   policy:{kind:"cost-adr",preset:"upstream-default",goalCostWeight:FSRS_COST_ADR_PRESET_GOAL_WEIGHT}}
 ];
 for(const row of cases){
  const scheduler=await createRevisionScheduler(row.options);
  assert.equal(scheduler.provider,FSRS_PROVIDER,row.name);
  assert.deepEqual(scheduler.configuration.policy,row.policy,row.name);
  assert.deepEqual({
   model:scheduler.configuration.model,packageVersion:scheduler.configuration.packageVersion,
   enableShortTerm:scheduler.configuration.enableShortTerm,learningSteps:scheduler.configuration.learningSteps,
   relearningSteps:scheduler.configuration.relearningSteps,graduatingInterval:scheduler.configuration.graduatingInterval,
   allowModelOverride:scheduler.configuration.allowModelOverride,enableFuzz:scheduler.configuration.enableFuzz,
   maximumInterval:scheduler.configuration.maximumInterval,clearStatsOnForget:scheduler.configuration.clearStatsOnForget
  },{
   model:"FSRS-7",packageVersion:"6.0.0",enableShortTerm:true,learningSteps:["1m","10m"],
   relearningSteps:["10m"],graduatingInterval:1,allowModelOverride:true,enableFuzz:false,
   maximumInterval:36500,clearStatsOnForget:true
  },row.name);
 }
 const defaults=await createRevisionScheduler({enableFuzz:false});
 assert.deepEqual(defaults.configuration.policy,{kind:"fixed",desiredRetention:FSRS_DEFAULT_DESIRED_RETENTION});
 assert.equal(defaults.configuration.leechThreshold,FSRS_DEFAULT_LEECH_THRESHOLD);
 assert.equal(defaults.configuration.weights,"FSRS-7-default");
});

test("FSRS-7 replay is deterministic, chronological and invariant to hypothetical preview/inspection",async()=>{
 const created="2026-10-01T09:00:00.000Z";
 const histories=[[],
  [{at:"2026-10-03T09:00:00.000Z",rating:3,duration:800,state:"recalled"}],
  [{at:"2026-10-03T09:00:00.000Z",rating:3,duration:800,state:"recalled"},
   {at:"2026-10-08T09:00:00.000Z",rating:2,duration:1200,state:"recalled"}]];
 const a=await createRevisionScheduler({enableFuzz:false}),b=await createRevisionScheduler({enableFuzz:false});
 for(const [i,reviews] of histories.entries()){
  const before=structuredClone(reviews),first=a.replay("card",created,reviews),second=b.replay("card",created,reviews);
  assert.deepEqual(first,second,"history "+i);
  const inspected=a.inspect("card",created,reviews,"2026-10-10T09:00:00.000Z");
  const previews=a.preview("card",created,reviews,"2026-10-10T09:00:00.000Z");
  assert.deepEqual(reviews,before,"history "+i+" mutated");
  assert.equal(a.replay("card",created,reviews).dueAt.getTime(),first.dueAt.getTime(),
   "inspection/preview mutated schedule for history "+i);
  assert.deepEqual(previews.map(x=>x.rating),[1,2,3,4]);
  assert.ok(inspected.dueAt instanceof Date);
 }
 assert.throws(()=>a.replay("card",created,[
  {at:"2026-10-08T09:00:00.000Z",rating:3,duration:1,state:"recalled"},
  {at:"2026-10-03T09:00:00.000Z",rating:3,duration:1,state:"recalled"}]),/chronological/);
});

test("J FSRS-7: inspect retrievability matches the published dual-trace curve",async()=>{
 // Independent reference for the documented FSRS-7 forgetting curve:
 // https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7
 const scheduler=await createRevisionScheduler({enableFuzz:false});
 const created="2026-01-01T00:00:00.000Z",reviewed="2026-01-03T00:00:00.000Z";
 const reviews=[{at:reviewed,rating:3,duration:800,state:"recalled"}];
 const state=scheduler.replay("known-vector",created,reviews);
 const w=FSRS7_DEFAULT_WEIGHTS;
 assert.equal(w.length,34);
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const reference=(elapsedDays)=>{
  const sf=state.stabilityFast,ss=state.stability,d=state.difficulty;
  const df=-clamp(w[23]*sf**(w[33]-0.3),0.01,0.95);
  const ff=Math.exp(Math.min(Math.log(w[25])/df,60))-1;
  const rf=(1+ff*elapsedDays/sf)**df;
  const ds=-clamp(w[24],0.01,0.95);
  const fs=(w[26]**(1/ds)-1)*Math.exp((d-5)*(w[32]-0.3));
  const rs=(1+fs*elapsedDays/ss)**ds;
  const af=w[27]*sf**(-w[29]);
  const as=w[28]*ss**w[30]*Math.exp((d-5)*(w[31]-0.5));
  return ((af*rf+as*rs)/(af+as))*(1-2e-5)+1e-5;
 };
 const atReview=scheduler.inspect("known-vector",created,reviews,reviewed).retrievability;
 assert.ok(Math.abs(atReview-0.99999)<1e-12,
   "FSRS-7 documented R(0)=0.99999 boundary changed");
 const later=scheduler.inspect("known-vector",created,reviews,"2026-01-04T12:00:00.000Z").retrievability;
 const expected=reference(1.5);
 assert.ok(Math.abs(later-expected)<1e-12,
   "Adapter retrievability diverged from independent FSRS-7 dual-trace reference");
});

test("FSRS scheduler rejects invalid policy and leech settings as a table",async()=>{
 const invalid=[{policy:{kind:"fixed",desiredRetention:0.74}},{policy:{kind:"fixed",desiredRetention:0.98}},
  {policy:{kind:"cost-adr",preset:"unknown"}},{leechThreshold:0},{leechThreshold:1.5},{leechAction:"drop"}];
 for(const [index,options] of invalid.entries())
  await assert.rejects(()=>createRevisionScheduler(options),undefined,"invalid scheduler case "+index);
});
