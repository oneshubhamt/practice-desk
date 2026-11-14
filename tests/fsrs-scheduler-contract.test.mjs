import test from "node:test";
import assert from "node:assert/strict";
import {
 createRevisionScheduler,FSRS_PROVIDER,FSRS_DEFAULT_DESIRED_RETENTION,
 FSRS_DEFAULT_LEECH_THRESHOLD,FSRS_COST_ADR_PRESET_GOAL_WEIGHT
} from "../src/learning/fsrs-scheduler-adapter.ts";

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

test("FSRS scheduler rejects invalid policy and leech settings as a table",async()=>{
 const invalid=[{policy:{kind:"fixed",desiredRetention:0.74}},{policy:{kind:"fixed",desiredRetention:0.98}},
  {policy:{kind:"cost-adr",preset:"unknown"}},{leechThreshold:0},{leechThreshold:1.5},{leechAction:"drop"}];
 for(const [index,options] of invalid.entries())
  await assert.rejects(()=>createRevisionScheduler(options),undefined,"invalid scheduler case "+index);
});
