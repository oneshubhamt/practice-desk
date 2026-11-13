import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createScheduledMock,validateScheduledMock} from "../src/calendar/scheduled-mock.ts";
import {makeBackup,verifyBackup} from "../src/history/backup.ts";
import {DEFAULT_PREFERENCES} from "../src/workspace-settings.ts";
import {DEFAULT_REVISION_SETTINGS} from "../src/learning/revision-settings.ts";
import {parseAppRoute,routeHref} from "../src/app/navigation.ts";

const CALENDAR_COMMIT="0aa64c3e99e6b6d40fb1eea395305ed21fe929e9";

test("calendar route is first-class in native and fragment-compatible route semantics",()=>{
  const route={screen:"calendar"};
  const href=routeHref("file:///Practice_Desk_Offline_Mock_Tests.html?x=1",route);
  assert.deepEqual(parseAppRoute(href),route);
  assert.equal(new URL(href).searchParams.get("pd"),"calendar");
  assert.equal(parseAppRoute("file:///x.html?pd=calendar&attempt=bad"),null);
});

test("scheduled mocks are strict canonical Practice Desk records",()=>{
  const record=createScheduledMock({
    packageRevisionId:"paper-revision-1",examId:"exam-1",paperId:"paper-1",
    title:"Full mock",start:"2026-11-20T08:30:00.000Z",durationMinutes:120
  },"2026-11-13T05:00:00.000Z","mock-1");
  assert.equal(record.recordType,"calendar-scheduled-mock");
  assert.equal(record.saveRevision,0);
  assert.equal(validateScheduledMock(record),record);
  assert.throws(()=>validateScheduledMock({...record,durationMinutes:0}),/Invalid scheduled mock/);
  assert.throws(()=>validateScheduledMock({...record,extra:true}),/Invalid scheduled mock/);
});

test("backup v5 carries scheduled mocks and exact revision-scheduler settings in the canonical archive",()=>{
  const scheduled={...createScheduledMock({
    packageRevisionId:"paper-revision-1",examId:"exam-1",paperId:"paper-1",
    title:"Full mock",start:"2026-11-20T08:30:00.000Z",durationMinutes:120
  },"2026-11-13T05:00:00.000Z","mock-1"),saveRevision:1};
  const revisionSettings={...DEFAULT_REVISION_SETTINGS,
    policy:{kind:"cost-adr",preset:"upstream-default"}};
  const archive=makeBackup([scheduled],DEFAULT_PREFERENCES,
    "2026-11-13T05:10:00.000Z",undefined,revisionSettings);
  const verified=verifyBackup(structuredClone(archive));
  assert.equal(verified.version,5);
  assert.deepEqual(verified.records,[scheduled]);
  assert.deepEqual(verified.revisionSettings,revisionSettings);
  assert.throws(()=>verifyBackup({...structuredClone(archive),version:4}),/Invalid backup format/);
  assert.throws(()=>verifyBackup({...structuredClone(archive),
    revisionSettings:{...revisionSettings,leechThreshold:999}}),/integrity check failed/i);
});

test("Practice Desk pins Calendar to the verified commit and keeps Calendar durability host-owned",async()=>{
  const [gitmodules,controller,calendarPackage,styles]=await Promise.all([
    readFile(new URL("../.gitmodules",import.meta.url),"utf8"),
    readFile(new URL("../src/app/calendar-controller.ts",import.meta.url),"utf8"),
    readFile(new URL("../vendor/calendar/package.json",import.meta.url),"utf8"),
    readFile(new URL("../src/styles/app.css",import.meta.url),"utf8"),
  ]);
  assert.match(gitmodules,/path = vendor\/calendar/);
  assert.match(gitmodules,/oneshubhamt\/calendar\.git/);
  const gitHead=(await import("node:child_process")).execFileSync(
    "git",["-C",new URL("../vendor/calendar",import.meta.url).pathname,"rev-parse","HEAD"],
    {encoding:"utf8"}).trim();
  assert.equal(gitHead,CALENDAR_COMMIT);
  assert.equal(JSON.parse(calendarPackage).name,"@director/calendar");
  assert.match(controller,/CalendarSnapshotProvider/);
  assert.doesNotMatch(controller,/MemoryCalendarRepository|IndexedDB|indexedDB|openIndexedDb/i);
  assert.match(controller,/readRevisionSettings\(\)/);
  assert.match(controller,/scheduledCard\(card,revision\)/);
  assert.doesNotMatch(controller,/theme:\s*\{/);
  assert.match(styles,/\.pd-calendar-mount\s*\{[\s\S]*--dc-theme-background:var\(--panel\)/);
  assert.match(styles,/--dc-theme-text:var\(--ink\)/);
  assert.match(styles,/--dc-theme-accent:var\(--blue\)/);
  assert.match(styles,/\.pd-calendar-mount \.dc-root,\.pd-calendar-mount \.dc-dialog\{font-size:\.9333333333em\}/);
  assert.doesNotMatch(styles,/\.pd-calendar-mount \.dc-root[^\n]*font-size:calc/);
});
