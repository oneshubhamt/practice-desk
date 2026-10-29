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

test("single-section and flexible-paper modes use distinct timer/navigation policies",()=>{
 const engine=createBrowserEngine(sources,patches);
 const id=Object.keys(sources)[0];
 const single={paperId:id,mode:"single",singleSection:2,startedAt:0,answers:{},flags:{},section:2,cursors:[0,0,0,0]};
 const one=engine.context(single);
 assert.equal(one.paper.sections.length,1);
 assert.equal(one.paper.timing.durationMs,900000);
 engine.ensure(single,0);
 assert.equal(engine.answer(single,"a",1),true);
 assert.equal(engine.event(single,{type:"TICK",nowMs:900001}).status,"completed");
 const free={paperId:id,mode:"free",singleSection:0,startedAt:0,answers:{},flags:{},section:0,cursors:[0,0,0,0]};
 const many=engine.context(free);
 assert.equal(many.paper.sections.length,4);
 assert.equal(many.paper.timing.durationMs,3600000);
 engine.ensure(free,0);
 assert.equal(engine.event(free,{type:"NAVIGATE",nowMs:1,sectionIndex:3,questionIndex:24}).sectionIndex,3);
});
test("strict mode enforces section lock and a late tick closes elapsed sections",()=>{
 const engine=createBrowserEngine(sources,patches);
 const a={paperId:Object.keys(sources)[0],mode:"strict",singleSection:0,startedAt:0,answers:{},flags:{},section:0,cursors:[0,0,0,0]};
 engine.ensure(a,0);
 assert.equal(engine.event(a,{type:"NAVIGATE",nowMs:1,sectionIndex:2,questionIndex:0}).sectionIndex,0);
 const state=engine.event(a,{type:"TICK",nowMs:1800001});
 assert.equal(state.sectionIndex,2);
 assert.deepEqual(state.completedSections,[0,1]);
});

test("CGL UI bridge exposes transactional archive and history backup APIs",()=>{
 const engine=createBrowserEngine(sources,patches);
 const a={paperId:Object.keys(sources)[0],mode:"strict",singleSection:0,startedAt:100,answers:{},flags:{},section:0,cursors:[0,0,0,0]};
 engine.capture(a,100);
 const display=engine.archiveDisplayRevision(a.frozen.snapshot.paperRevisionId,a.paperId,{questions:[]});
 assert.equal(display.id,a.frozen.paper.id);
 const backup=engine.makeBackup([{id:"example",paperId:a.paperId}], [display],null,"2026-10-28T00:00:00Z");
 assert.equal(engine.verifyBackup(backup).manifest.attemptCount,1);
 assert.equal(engine.planBackupMerge([{id:"example"}],[{id:"example"},{id:"other"}]).length,1);
});
