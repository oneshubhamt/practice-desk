import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {activateWorkspaceRoute} from "../src/app/route-controller.ts";
import {renderCurrentResultHTML} from "../src/app/result-controller.ts";

test("resume expiry samples one monotonic instant for state, persistence and score evidence",async()=>{
 const attempt={...startGenericAttempt(pkg,"cleer-expiry",0),saveRevision:1};
 const restoredAt=pkg.paper.timing.durationMs+5000;
 let nowCalls=0,saved=null;
 const routes=[];
 const previousDocument=Object.getOwnPropertyDescriptor(globalThis,"document");
 Object.defineProperty(globalThis,"document",{value:{hidden:true},configurable:true});
 try{
  const owner={
   activationGeneration:0,routeHydrated:true,hydration:Promise.resolve(),disposed:false,
   view:"library",resultTab:"overview",attempt:null,records:new Map([[attempt.id,attempt]]),
   warning:"",freshlyStartedAttemptId:null,reviewFilter:"all",
   now:()=>{nowCalls++;return restoredAt;},
   save:async record=>{saved=record;return true;},
   go:route=>{routes.push(route);},
   draw:()=>{throw new Error("Expired restore should route to Results before drawing Exam");}
  };
  await activateWorkspaceRoute(owner,{screen:"exam",attemptId:attempt.id},
   {kind:"push",signal:undefined,generation:1});
 }finally{
  if(previousDocument)Object.defineProperty(globalThis,"document",previousDocument);
  else delete globalThis.document;
 }
 assert.equal(nowCalls,1);
 assert.ok(saved);
 assert.equal(saved.updatedAt,restoredAt);
 assert.equal(saved.finishedAt,restoredAt);
 assert.equal(saved.completionReason,"time-expired");
 assert.equal(saved.result.snapshot.calculatedAt,new Date(restoredAt).toISOString());
 assert.deepEqual(routes,[{screen:"result",attemptId:attempt.id,tab:"overview"}]);
});

test("Results never repairs a completed attempt by recomputing a missing immutable score",()=>{
 const attempt={...startGenericAttempt(pkg,"cleer-result",0),finishedAt:1,result:undefined};
 assert.throws(()=>renderCurrentResultHTML({attempt}),/Completed attempt has no immutable score/);
});
