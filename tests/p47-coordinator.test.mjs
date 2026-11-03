/** P47-6: architecture ownership, literal vendor insulation and FSRS replay. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {createRevisionScheduler,FSRS_PROVIDER} from "../src/learning/fsrs-scheduler-adapter.ts";
const source=async file=>readFile(new URL("../"+file,import.meta.url),"utf8");
const splitNames=[
 "library-controller","result-controller","exam-controller","route-controller",
 "persistence-controller","history-controller","screen-controller",
 "lifecycle-controller","authoring-controller","learning-controller"
];
test("P47-6 full coordinator is a small composition root, not a relocated second monolith",async()=>{
 const text=await source("src/app/generic-ui.ts");
 assert.ok(text.split("\n").length<=350,"Coordinator must be composition-only");
 assert.match(text,/mountExamWorkspace/);
 assert.match(text,/const owner:CoordinatorContext/);
 assert.match(text,/authoringStudio=createWorkspaceAuthoringStudio\(owner\)/);
 assert.match(text,/learningDesk=createWorkspaceLearningDesk\(owner\)/);
 assert.match(text,/timer=startWorkspaceTimer\(owner\)/);
 assert.match(text,/hydrateWorkspaceStorage\(owner\)/);
 assert.doesNotMatch(text,/\bindexedDB\.open\s*\(|\.transaction\s*\(|\.onchange\s*=|\.onclick\s*=|\.onkeydown\s*=/);
 assert.doesNotMatch(text,/window\.setInterval|document\.createElement\(/);
 assert.equal((text.match(/export function mountExamWorkspace\(/g)??[]).length,1);
});
test("P47-6 independently owned route, Library, exam, Results, History, persistence and lifecycle handlers are real and typed",async()=>{
 const expected={
  "library-controller":"renderLibraryHTML|bindLibraryScreen|applyLibraryFamily|persistLibrarySelection",
  "result-controller":"renderCurrentResultHTML|bindResultScreen|packageForResult",
  "exam-controller":"renderCurrentExamHTML|dispatchExamEvent|bindExamScreen",
  "history-controller":"bindHistoryScreen|changeHistoryFilters",
  "route-controller":"activateWorkspaceRoute|navigateWorkspace",
  "persistence-controller":"saveWorkspaceRecord|removeWorkspaceAttempt|hydrateWorkspaceStorage",
  "screen-controller":"drawWorkspaceScreen|reportWorkspaceNotice",
  "lifecycle-controller":"startWorkspaceTimer|disposeWorkspace|dispatchWorkspaceVisibility",
  "authoring-controller":"createWorkspaceAuthoringStudio",
  "learning-controller":"createWorkspaceLearningDesk|addLearningNotebookCard"
 };
 const ctx=await source("src/app/coordinator-context.ts");
 assert.match(ctx,/export interface CoordinatorContext/);
 assert.match(ctx,/readonly records:Map<string, RecordItem>/);
 assert.match(ctx,/readonly packages:Map<string, ExamPackage>/);
 assert.match(ctx,/\battempt:GenericAttempt \| null/);
 for(const [name,required] of Object.entries(expected)){
  const text=await source("src/app/"+name+".ts");
  assert.match(text,/import type \{CoordinatorContext\}/);
  assert.doesNotMatch(text,/:\s*any\b|as any\b/);
  for(const value of required.split("|"))
    assert.match(text,new RegExp("\\b"+value+"\\b"),name+" must own "+value);
  assert.ok(text.split("\n").length<600,name+" too large for a focused controller");
 }
});
test("P47-6 controller modules do not introduce runtime cycles, mutable parallel contexts or duplicate scheduling vendor imports",async()=>{
 const files=splitNames.map(x=>"src/app/"+x+".ts");
 for(const path of files){
  const text=await source(path);
  assert.doesNotMatch(text,/from ["']\.\/generic-ui\.ts["']/);
  assert.doesNotMatch(text,/from ["']ts-fsrs["']/);
  assert.doesNotMatch(text,/from ["']wordgard(?:\/|["'])/);
  assert.doesNotMatch(text,/new DefaultScheduler|newCard\(/);
 }
 for(const path of ["src/learning/learning.ts","src/app/learning-ui.ts"])
  assert.doesNotMatch(await source(path),/from ["']ts-fsrs["']/);
 const adapter=await source("src/learning/fsrs-scheduler-adapter.ts");
 assert.match(adapter,/from "ts-fsrs"/);
 assert.match(adapter,/desiredRetention:0\.9,enableFuzz:false/);
 const index=await readdir(new URL("../src/learning/",import.meta.url));
 for(const file of index.filter(x=>x.endsWith(".ts")&&x!=="fsrs-scheduler-adapter.ts")){
  const text=await source("src/learning/"+file);
  assert.doesNotMatch(text,/from ["']ts-fsrs["']/,"FSRS vendor leaked into "+file);
 }
});
test("P47-6 FSRS adapter replay of explicit ratings is deterministic and independent of mock exam scores",async()=>{
 const a=await createRevisionScheduler(),b=await createRevisionScheduler();
 assert.equal(a.provider,FSRS_PROVIDER);
 const created="2026-10-01T09:00:00.000Z";
 const reviews=[
  {at:"2026-10-03T09:00:00.000Z",rating:3},
  {at:"2026-10-08T09:00:00.000Z",rating:2}
 ];
 const original=a.replay("learning-card:test",created,[]);
 const later=a.replay("learning-card:test",created,reviews);
 assert.ok(original.dueAt instanceof Date);
 assert.ok(later.dueAt instanceof Date);
 assert.equal(later.dueAt.getTime(),b.replay("learning-card:test",created,reviews).dueAt.getTime());
 assert.deepEqual(reviews,[{at:reviews[0].at,rating:3},{at:reviews[1].at,rating:2}]);
 assert.doesNotThrow(()=>a.assertCanRate("learning-card:test",created,reviews,1,"2026-10-10T09:00:00.000Z"));
 assert.equal(a.replay("learning-card:test",created,reviews).dueAt.getTime(),later.dueAt.getTime(),
  "Assessing a hypothetical grade must not mutate the review history or schedule");
});
test("P47-6 no undeclared global event subscriptions or duplicate clock authority",async()=>{
 const generic=await source("src/app/generic-ui.ts");
 const life=await source("src/app/lifecycle-controller.ts");
 assert.equal((generic.match(/window\.addEventListener\("keydown"/g)??[]).length,1);
 assert.equal((generic.match(/window\.addEventListener\("pagehide"/g)??[]).length,1);
 assert.equal((generic.match(/window\.addEventListener\("storage"/g)??[]).length,1);
 assert.equal((generic.match(/document\.addEventListener\("visibilitychange"/g)??[]).length,1);
 for(const type of ["keydown","pagehide","storage","visibilitychange"])
  assert.match(life,new RegExp("removeEventListener\\(\""+type+"\""),
   "Unmount must dispose "+type);
 assert.equal((life.match(/window\.setInterval\(/g)??[]).length,1);
 assert.match(life,/window\.clearInterval\(owner\.timer\)/);
});
