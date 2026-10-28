import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importCglBank } from "../src/content/import-cgl.ts";
import { freezeAttempt, assertFrozenContent, restoreSession, chooseRecovered } from "../src/history/frozen.ts";
import { startSession, transition } from "../src/engine/session.ts";
import { scoreAttempt } from "../src/engine/scoring.ts";
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const first=importCglBank(sources,patches)[0];

test("frozen attempt survives a later changed key, paper or editorial state",()=>{
 const frozen=freezeAttempt(first.paper,first.key,first.questions,"exam-simulation","2026-10-28T05:00:00Z");
 assertFrozenContent(frozen);
 assert.notEqual(frozen.paper,first.paper);
 const old=scoreAttempt(frozen.paper,frozen.key,frozen.questions,[],frozen.frozenAt).snapshot;
 const newKey=structuredClone(first.key);
 newKey.entries[0].answer.optionId="an-edited-answer";
 assert.equal(scoreAttempt(frozen.paper,frozen.key,frozen.questions,[],frozen.frozenAt).snapshot.unansweredCount,old.unansweredCount);
 assert.notEqual(frozen.key.entries[0].answer.optionId,newKey.entries[0].answer.optionId);
 assert.throws(()=>assertFrozenContent({...frozen,snapshot:{...frozen.snapshot,paperRevisionId:"wrong"}}),/Invalid or mismatched/);
});
test("saved strict session expires while app is closed, without fictitious foreground viewing",()=>{
 const saved=transition(first.paper,startSession(first.paper,0),{type:"VISIBILITY",nowMs:1000,visible:false});
 const restored=restoreSession(first.paper,JSON.parse(JSON.stringify(saved)),3600001,true);
 assert.equal(restored.state.status,"completed");
 assert.equal(restored.state.elapsedMs,3600000);
 assert.equal(restored.state.foregroundMs,1000);
 assert.equal(restored.expired,true);
});
test("paused flexible attempt does not consume offline wall time",()=>{
 const paper={...first.paper,timing:{kind:"whole-paper",durationMs:3600000,pausePolicy:"allowed"}};
 const paused=transition(paper,startSession(paper,0),{type:"PAUSE",nowMs:200});
 const restored=restoreSession(paper,paused,999999,true);
 assert.equal(restored.state.elapsedMs,200);
 assert.equal(restored.state.status,"paused");
});
test("recover from clock rollback without assigning negative time",()=>{
 const state=startSession(first.paper,5000);
 const restored=restoreSession(first.paper,state,4000,true);
 assert.equal(restored.state.elapsedMs,0);
 assert.equal(restored.state.clockMs,4000);
});
test("completed record always defeats stale active mirror",()=>{
 const stored={id:"a",startedAt:1,updatedAt:100,finishedAt:90};
 const mirror={id:"a",startedAt:1,updatedAt:110,finishedAt:null};
 assert.equal(chooseRecovered(stored,mirror),stored);
 assert.equal(chooseRecovered(mirror,stored),stored);
 assert.equal(chooseRecovered(stored,{...stored,updatedAt:120}).updatedAt,120);
});
