/** P48 independent defect regression: damaged local IndexedDB must not mask
 * unrelated healthy immutable attempts, nor weaken strict backup import.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {
 compactAttempt,reconstructRecords,reconstructRecoverableRecords,createRecoverableRecordCollector,expandAttempt
} from "../src/history/shared-store.ts";

const attempt=(id)=>({...startGenericAttempt(pkg,id,Date.UTC(2026,10,3,12,0,0)),saveRevision:1});

test("P48 intact attempt survives a corrupt sibling without adopting the invalid row",()=>{
 const good=attempt("p48-valid");
 const {row,snapshot}=compactAttempt(good);
 const damaged={recordType:"generic-attempt",saveRevision:1,id:"p48-damaged",
   frozenAt:"2026-11-03T12:00:00.000Z",frozenRef:"snapshot:absent"};
 assert.throws(()=>reconstructRecords([row,damaged],[snapshot]),/missing immutable snapshot/);
 const recovered=reconstructRecoverableRecords([row,damaged],[snapshot]);
 assert.equal(recovered.rejectedRows,1);
 assert.equal(recovered.rejectedSnapshots,0);
 assert.deepEqual(recovered.records.map(x=>x.id),["p48-valid"]);
 assert.equal(recovered.records[0].frozen.key.contentHash,good.frozen.key.contentHash);
 assert.equal(recovered.snapshots[0].id,snapshot.id);
});

test("P48 unauthenticated snapshot corruption is quarantined but not normalized",()=>{
 const {row,snapshot}=compactAttempt(attempt("p48-valid-b"));
 const tampered={...snapshot,id:"snapshot:"+("0".repeat(64))};
 assert.throws(()=>reconstructRecords([row],[snapshot,tampered]),/SHA-256 mismatch/);
 const recovered=reconstructRecoverableRecords([row],[snapshot,tampered]);
 assert.equal(recovered.rejectedSnapshots,1);
 assert.equal(recovered.rejectedRows,0);
 assert.equal(recovered.records.length,1);
 assert.equal(recovered.snapshots.length,1);
 assert.equal(recovered.snapshots[0].id,snapshot.id);
});

test("P48 compact rows cannot smuggle a different source/key/explanation outside its SHA snapshot",()=>{
 const {row,snapshot}=compactAttempt(attempt("p48-valid-c"));
 for(const field of ["frozen","sourceKeyReference","sourceReviewReference","explanations"]){
   const forged={...row,[field]:{p48:"untrusted"}};
   assert.throws(()=>expandAttempt(forged,snapshot),/forbidden immutable source fields/,field);
   assert.throws(()=>reconstructRecords([forged],[snapshot]),/forbidden immutable source fields/,field);
   const recovered=reconstructRecoverableRecords([row,forged],[snapshot]);
   assert.equal(recovered.rejectedRows,1,field);
   assert.deepEqual(recovered.records.map(x=>x.id),["p48-valid-c"]);
 }
});

test("P48 unknown non-attempt rows remain visible to the caller's strict record validator",()=>{
 const good=compactAttempt(attempt("p48-valid-d"));
 const unknown={recordType:"unexpected-record",saveRevision:1,id:"untrusted"};
 const recovered=reconstructRecoverableRecords([good.row,unknown],[good.snapshot]);
 assert.deepEqual(recovered.records.map(x=>x.id),["p48-valid-d","untrusted"]);
 assert.equal(recovered.rejectedRows,0,"do not silently discard other record types");
});

test("P48-2 incremental cursor collector has exactly the same recoverable semantics as array startup",()=>{
 const valid=compactAttempt(attempt("p48-cursor-valid"));
 const second=compactAttempt(attempt("p48-cursor-second"));
 const corruptSnapshot={...valid.snapshot,id:"snapshot:"+("f".repeat(64))};
 const corruptAttempt={...valid.row,id:"p48-broken",frozenRef:"snapshot:unavailable"};
 const unsupported={recordType:"invalid-record",saveRevision:1,id:"unsupported"};
 const snapshots=[valid.snapshot,corruptSnapshot];
 const rows=[valid.row,corruptAttempt,unsupported,second.row];
 const expected=reconstructRecoverableRecords(rows,snapshots);
 const stream=createRecoverableRecordCollector();
 snapshots.forEach(item=>stream.acceptSnapshot(item));
 rows.forEach(item=>stream.acceptRow(item));
 const actual=stream.result();
 assert.deepEqual(actual.records.map(x=>x.id),expected.records.map(x=>x.id));
 assert.equal(actual.rejectedRows,1);
 assert.equal(actual.rejectedSnapshots,1);
 assert.equal(actual.snapshots.length,1);
 assert.equal(actual.records[0].frozen.key.contentHash,valid.snapshot.body.key.contentHash);
 assert.equal(actual.records[2].frozen.key.contentHash,second.snapshot.body.key.contentHash);
 // The unrecoverable entries must remain available only in untouched IDB,
 // never reconstructed as apparently valid snapshots.
 assert.equal(actual.records.some(x=>x.id==="p48-broken"),false);
});
