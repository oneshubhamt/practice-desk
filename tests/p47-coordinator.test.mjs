/** P47-6: architecture ownership, literal vendor insulation and FSRS replay. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {createRevisionScheduler,FSRS_PROVIDER} from "../src/learning/fsrs-scheduler-adapter.ts";
const source=async file=>readFile(new URL("../"+file,import.meta.url),"utf8");
const splitNames=[
 "library-controller","result-controller","exam-controller","route-controller",
 "persistence-controller","history-controller","screen-controller",
 "lifecycle-controller","authoring-controller","learning-controller","storage-health-controller"
];
test("P47-6 full coordinator is a small composition root, not a relocated second monolith",async()=>{
 const text=await source("src/app/generic-ui.ts");
 assert.ok(text.split("\n").length<=350,"Coordinator must be composition-only");
 assert.match(text,/mountExamWorkspace/);
 assert.match(text,/let owner!:WorkspaceContext/);
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
  "learning-controller":"createWorkspaceLearningDesk|addLearningNotebookCard",
  "storage-health-controller":"showWorkspaceStorageEstimate|requestWorkspacePersistentStorage|workspaceStorageHealth"
 };
 const ctx=await source("src/app/coordinator-context.ts");
 assert.match(ctx,/export interface WorkspaceContext/);
 assert.match(ctx,/readonly records:Map<string, RecordItem>/);
 assert.match(ctx,/readonly packages:Map<string, ExamPackage>/);
 assert.match(ctx,/\battempt:GenericAttempt \| null/);
 assert.match(ctx,/storageBackend:WorkspaceStore \| null/);
 assert.doesNotMatch(ctx,/\bdb:IDBDatabase|fallbackStamp|storedSnapshots|readonly storageKey/);
 const contexts={
  "library-controller":"LibraryControllerContext",
  "result-controller":"ResultControllerContext",
  "exam-controller":"ExamControllerContext",
  "history-controller":"HistoryControllerContext",
  "route-controller":"RouteControllerContext",
  "persistence-controller":"PersistenceControllerContext",
  "screen-controller":"ScreenControllerContext",
  "lifecycle-controller":"LifecycleControllerContext",
  "authoring-controller":"AuthoringControllerContext",
  "learning-controller":"LearningControllerContext",
  "storage-health-controller":"StorageHealthControllerContext"
 };
 for(const [name,required] of Object.entries(expected)){
  const text=await source("src/app/"+name+".ts");
  assert.match(text,new RegExp("import type \\{"+contexts[name]+"\\} from \\\"\\./coordinator-context\\.ts\\\""),
    name+" must depend on its narrow capability slice");
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
 assert.match(adapter,/version:"FSRS-7"/);
 assert.match(adapter,/enableShortTerm:true/);
 assert.match(adapter,/learningSteps:\["1m","10m"\]/);
 assert.match(adapter,/relearningSteps:\["10m"\]/);
 assert.match(adapter,/allowModelOverride:true/);
 assert.match(adapter,/schedulerCostAdrMiddleware/);
 assert.match(adapter,/retentionPolicy===\"cost-adr\"/);
 assert.match(adapter,/checkFSRS7Parameters/);
 assert.match(adapter,/const enableFuzz=options\.enableFuzz\?\?true/);
 const index=await readdir(new URL("../src/learning/",import.meta.url));
 assert.ok(!index.includes("scheduler-port.ts"),"obsolete P47-5A scheduler prototype must not coexist with P47-6 port");
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


test("Persistence orchestration has one backend contract and no raw storage fork",async()=>{
 const persistence=await source("src/app/persistence-controller.ts");
 const backend=await source("src/history/workspace-store.ts");
 const health=await source("src/app/storage-health-controller.ts");
 assert.doesNotMatch(persistence,/\bindexedDB\b|\.transaction\s*\(|ATTEMPTS_STORE|SNAPSHOTS_STORE|fallbackStamp|storageKey/);
 assert.match(backend,/export interface WorkspaceStore/);
 assert.match(backend,/class IndexedDbWorkspaceStore implements WorkspaceStore/);
 assert.match(backend,/class LocalFallbackWorkspaceStore implements WorkspaceStore/);
 for(const method of ["loadRecoverable","loadVerified","write","insertMany","delete","deleteCompleted","readAuthoritative","pruneSnapshots"])
  assert.match(backend,new RegExp("\\b"+method+"\\b"),"Backend contract must own "+method);
 assert.doesNotMatch(health,/indexedDB|ATTEMPTS_STORE|SNAPSHOTS_STORE|\.transaction\s*\(/);
 assert.match(health,/navigator\.storage\?\.estimate/);
 assert.match(health,/navigator\.storage\?\.persist/);
});


test("Lower-layer modules cannot depend on application composition",async()=>{
 for(const dir of ["domain","engine","history","learning"]){
  const entries=await readdir(new URL("../src/"+dir+"/",import.meta.url));
  for(const file of entries.filter(name=>name.endsWith(".ts"))){
   const text=await source("src/"+dir+"/"+file);
   assert.doesNotMatch(text,/from ["']\.\.\/app\//,
     dir+"/"+file+" must not import an app-layer module");
  }
 }
});


test("CLEER package, attempt and composition ownership stays canonical",async()=>{
 const domainPackage=await source("src/domain/exam-package.ts");
 const appPackage=await source("src/app/exam-package.ts");
 const engineAttempt=await source("src/engine/generic-attempt.ts");
 const generic=await source("src/app/generic-ui.ts");
 const authoring=await source("src/app/authoring-controller.ts");
 assert.doesNotMatch(domainPackage,/\bCglPracticeMode\b|\bpracticeMode\b/,
  "runtime CGL policy must not enter the canonical exam package");
 assert.doesNotMatch(appPackage,/export function transitionGenericAttempt\s*\(/,
  "attempt transitions belong to engine/, not app/");
 assert.match(engineAttempt,/export function transitionGenericAttempt\s*\(/);
 assert.doesNotMatch(generic,/authoring\/authoring-studio|createLearningDesk|\.\/learning-ui\.ts/,
  "composition root must use workspace adapters rather than feature constructors for typing");
 assert.doesNotMatch(authoring,/owner\.authoringStudio/,
  "authoring adapter must not depend on the instance it is constructing");
});

test("terminal candidate scratch has one persistence cleanup owner",async()=>{
 const persistence=await source("src/app/persistence-controller.ts");
 assert.match(persistence,/versioned\.finishedAt!==null/);
 assert.match(persistence,/clearCandidateToolWorkspace\(localStorage,versioned\.id\)/);
 assert.match(persistence,/owner\.calculatorStates\.delete\(versioned\.id\)/);
 assert.match(persistence,/owner\.choiceDrafts\.delete\(key\)/);
 for(const file of ["exam-controller","route-controller","lifecycle-controller"]){
  const text=await source("src/app/"+file+".ts");
  assert.doesNotMatch(text,/clearCandidateToolWorkspace/,
   file+" must delegate terminal candidate cleanup to persistence");
 }
});
