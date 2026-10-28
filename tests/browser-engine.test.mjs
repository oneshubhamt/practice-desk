import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createBrowserEngine } from "../src/app/browser-engine.ts";
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
test("UI adapter starts, answers and scores the actual CGL paper",()=>{
 const engine=createBrowserEngine(sources,patches);
 const a={paperId:Object.keys(sources)[0],mode:"strict",singleSection:0,startedAt:100,answers:{},flags:{},section:0,cursors:[0,0,0,0]};
 assert.equal(engine.importedCount,10);
 engine.ensure(a,100);
 assert.equal(engine.answer(a,"a",101),true);
 a.answers[1]="a";
 const scored=engine.score(a,"2026-10-28T00:00:00Z");
 assert.equal(scored.items.length,100);
 assert.equal(scored.items[0].marks,2);
 assert.equal(a.engineState.responses.length>0,true);
});
