import test from "node:test";
import assert from "node:assert/strict";
import { sha256 } from "../src/domain/hash.ts";
import { makeBackup, verifyBackup, planBackupMerge } from "../src/history/backup.ts";
import { validateDisplayPreferences } from "../src/app/preferences.ts";
const preferences={schema:1,dark:true,scale:115};
test("SHA-256 standard vectors and UTF-8",()=>{
 assert.equal(sha256("abc"),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 assert.equal(sha256(new TextEncoder().encode("abc")),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 assert.equal(sha256(""),"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
 assert.equal(sha256("The quick brown fox jumps over the lazy dog"),"d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
});
test("complete backup v3 preserves records and preferences",()=>{
 const rows=[{id:"unfinished",recordType:"generic-attempt",finishedAt:null},
  {id:"paper",recordType:"generic-package"},{id:"learn",recordType:"learning-card"}];
 const backup=makeBackup(rows,preferences,"2026-10-29T11:00:00Z");
 assert.deepEqual(verifyBackup(JSON.parse(JSON.stringify(backup))),backup);
 assert.equal(backup.records.length,3);
 assert.deepEqual(backup.preferences,preferences);
 const corrupt=JSON.parse(JSON.stringify(backup));corrupt.records[0].finishedAt=999;
 assert.throws(()=>verifyBackup(corrupt),/integrity/);
 assert.throws(()=>verifyBackup({...backup,records:backup.records.slice(1)}),/integrity/);
 assert.throws(()=>verifyBackup(makeBackup([{id:"x"},{id:"x"}],preferences,backup.exportedAt)),/records/);
});
test("preferences import validates range and type",()=>{
 assert.deepEqual(validateDisplayPreferences(preferences),preferences);
 assert.throws(()=>validateDisplayPreferences({schema:1,dark:false,scale:999}),/preferences/);
 assert.throws(()=>makeBackup([],{schema:1,dark:"no",scale:100},"2026-10-29T00:00:00Z"),/preferences/);
});
test("backup merge is additive and preserves active and completed IDs",()=>{
 const existing=[{id:"completed",finishedAt:100},{id:"ongoing",finishedAt:null}];
 const incoming=[{id:"completed",finishedAt:200},{id:"ongoing",finishedAt:300},
  {id:"new",finishedAt:null},{id:"new",finishedAt:99}];
 assert.deepEqual(planBackupMerge(existing,incoming,"ongoing"),[{id:"new",finishedAt:null}]);
});
