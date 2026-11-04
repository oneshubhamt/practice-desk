/** P48-4 independent adversarial saved-session contract.
 * Build from live six-kind domain package, not a previously green mock.
 * A checksum-matched hostile archive must not confer legitimacy on invented
 * timer data or unsigned fields in mutable attempt/session records.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";

const origin=Date.UTC(2026,10,4,8,30);
const fresh=()=>startGenericAttempt(pkg,"p48-4-record",origin);
const savedResponse=()=>{
 const a=fresh(),qs=new Map(pkg.questions.map(q=>[q.id,q]));
 return transitionGenericAttempt(a,{type:"ANSWER",nowMs:origin+1000,
  response:{kind:"single-choice",optionId:"a"}},qs);
};

test("P48-4 current legitimate timer and response rows still validate",()=>{
 assert.doesNotThrow(()=>validateGenericStoredRecord(fresh()));
 assert.doesNotThrow(()=>validateGenericStoredRecord(savedResponse()));
});

test("P48-4 reject impossible clock/timer snapshots before History or backup import",()=>{
 const cases=[
  ["negative elapsed",s=>s.elapsedMs=-1],
  ["nonfinite elapsed",s=>s.elapsedMs=Number.NaN],
  ["negative section time",s=>s.sectionElapsedMs=-1],
  ["negative foreground time",s=>s.foregroundMs=-1],
  ["foreground exceeds elapsed",s=>s.foregroundMs=1000],
  ["section elapsed exceeds elapsed",s=>s.sectionElapsedMs=1000],
  ["nonboolean visibility",s=>s.visible="foreground"],
  ["timed whole-paper duration exceeded",s=>s.elapsedMs=2000000],
 ];
 for(const [name,change] of cases){
  const candidate=structuredClone(fresh());
  change(candidate.state);
  assert.throws(()=>validateGenericStoredRecord(candidate),/invalid|duration|time|clock|elapsed|visible|unsupported/i,name);
 }
});

test("P48-4 reject undeclared mutable-row and session metadata irrespective of SHA source hashes",()=>{
 for(const [name,change] of [
  ["attempt issuer",a=>a.issuerCertification="UPSC"],
  ["session bypass",a=>a.state.bypassTimer=true],
 ]){
  const candidate=structuredClone(fresh());
  change(candidate);
  assert.throws(()=>validateGenericStoredRecord(candidate),/unsupported field|Invalid/,name);
 }
 const attempt=structuredClone(savedResponse());
 attempt.state.responses[0].unverifiedSpeedOverride=999999999;
 assert.throws(()=>validateGenericStoredRecord(attempt),/unsupported field|Invalid/,"response metadata");
});

test("P48-4 genuinely accrued foreground question time must not exceed saved total",()=>{
 const candidate=structuredClone(savedResponse());
 candidate.state.foregroundMs=0;
 assert.throws(()=>validateGenericStoredRecord(candidate),/Invalid|time|foreground/);
});

test("P48-4 candidate answer and pair objects must reject unsigned extra keys",()=>{
 const choice=structuredClone(savedResponse());
 choice.state.responses[0].response.officialIssuer="invented";
 assert.throws(()=>validateGenericStoredRecord(choice),/unsupported field|Invalid/,
   "exact candidate response shape");
 const matching=structuredClone(fresh());
 matching.state.responses=[{
  questionRevisionId:"rev-4",flagged:false,timeSpentMs:0,answerChangeCount:0,
  response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1",privilegedMatch:true}]}
 }];
 assert.throws(()=>validateGenericStoredRecord(matching),/unsupported field|Invalid/,
   "matching endpoint must not contain shadow fields");
});
