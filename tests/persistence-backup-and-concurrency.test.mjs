import test from "node:test";
import assert from "node:assert/strict";
import { sha256 } from "../src/domain/hash.ts";
import { makeBackup, verifyBackup, planBackupMerge } from "../src/history/backup.ts";
import { validateDisplayPreferences } from "../src/app/preferences.ts";
import {assertWriteVersion,nextWriteVersion} from "../src/history/concurrency.ts";
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


// Compare-and-swap invariants; retained from storage-concurrency.test.mjs.
test("new records cannot be overwritten and concurrent revisions conflict",()=>{
 assert.doesNotThrow(()=>assertWriteVersion(undefined,null));
 assert.equal(nextWriteVersion(null),1);
 assert.throws(()=>assertWriteVersion({saveRevision:1},null),/already created/);
 assert.doesNotThrow(()=>assertWriteVersion({saveRevision:3},3));
 assert.equal(nextWriteVersion(3),4);
 assert.throws(()=>assertWriteVersion({saveRevision:4},3),/Another tab changed/);
 assert.throws(()=>assertWriteVersion(undefined,3),/Another tab changed/);
 assert.doesNotThrow(()=>assertWriteVersion({},0));
});

// Deterministic adversarial scenarios; retained from contract-persistence-properties.test.mjs.
{
const preferences={schema:1,dark:false,scale:100};
const at="2026-11-01T10:00:00Z";
function rng(seed){let x=seed>>>0;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};}

test("seeded two-tab compare-and-swap interleavings reject stale writes, preserve stored revision",()=>{
 for(let seed=1;seed<=250;seed++){
  const random=rng(0x360123^seed);
  let stored=undefined;
  const expected=[null,null,null];
  for(let step=0;step<150;step++){
   const tab=random(expected.length);
   if(random(4)===0){expected[tab]=stored?.saveRevision??null;continue;}
   const observed=stored?.saveRevision??null;
   const version=expected[tab];
   const permitted=version===observed;
   if(permitted){
    assert.doesNotThrow(()=>assertWriteVersion(stored,version),
     "seed="+seed+" step="+step+" tab="+tab+" legal CAS");
    const newRevision=nextWriteVersion(version);
    assert.equal(newRevision,(observed??0)+1);
    stored={saveRevision:newRevision,by:tab};
    expected[tab]=newRevision;
   }else{
    const before=structuredClone(stored);
    assert.throws(()=>assertWriteVersion(stored,version),/Another tab/,
     "seed="+seed+" step="+step+" tab="+tab+" stale CAS");
    assert.deepEqual(stored,before,"rejected tab must not mutate observed saved state");
   }
  }
  assert.ok((stored?.saveRevision??0)>=0);
 }
});

test("generated additive merge is deterministic, idempotent, ordered and non-destructive",()=>{
 for(let seed=1;seed<=200;seed++){
  const random=rng(0x36a11a^seed);
  const existing=Array.from({length:random(25)},(_,i)=>({id:"id-"+i,origin:"original"}));
  const incoming=Array.from({length:random(50)},(_,i)=>({
   id:"id-"+random(65),origin:"import-"+i}));
  const activeId="id-"+random(65);
  const expected=[];
  const seen=new Set([...existing.map(x=>x.id),activeId]);
  for(const record of incoming)if(!seen.has(record.id)){
   seen.add(record.id);expected.push(record);
  }
  const added=planBackupMerge(existing,incoming,activeId);
  assert.deepEqual(added,expected,"seed="+seed+" independent first-occurrence reference");
  const accumulated=[...existing,...added];
  assert.deepEqual(planBackupMerge(accumulated,incoming,activeId),[],
   "seed="+seed+" importing same backup twice is idempotent");
  assert.deepEqual(existing.map(x=>x.origin),existing.map(()=>"original"),
   "seed="+seed+" no overwritten existing records");
  assert.equal(new Set([...existing,...added].map(x=>x.id)).size,accumulated.length,
   "seed="+seed+" merged IDs unique");
 }
});

test("backup v3 checksum covers records and preferences; size, IDs and timestamp are bounded",()=>{
 for(let count of [0,1,7,101,5000]){
  const records=Array.from({length:count},(_,i)=>({id:"r"+i,recordType:"opaque",answer:i%4}));
  const b=makeBackup(records,preferences,at);
  assert.deepEqual(verifyBackup(JSON.parse(JSON.stringify(b))),b,"count="+count);
  for(const mutate of [
   x=>{x.preferences.scale=110;},
   x=>{if(x.records.length)x.records[0].answer=99;else x.exportedAt="2026-11-02T10:00:00Z";},
   x=>{x.manifest.digest="0".repeat(64);},
   x=>{x.manifest.recordCount=count+1;},
  ]){
   const corrupted=structuredClone(b);
   mutate(corrupted);
   assert.throws(()=>verifyBackup(corrupted),"count="+count+" modified checksum payload");
  }
 }
 const over=makeBackup(Array.from({length:5001},(_,i)=>({id:"r"+i})),preferences,at);
 assert.throws(()=>verifyBackup(over),/Invalid backup format/);
 const dups=makeBackup([{id:"x"},{id:"x"}],preferences,at);
 assert.throws(()=>verifyBackup(dups),/Invalid backup records/);
 const invalidName=makeBackup([{id:"x".repeat(201)}],preferences,at);
 assert.throws(()=>verifyBackup(invalidName),/Invalid backup records/);
 assert.throws(()=>makeBackup([],preferences,"not-a-date"),/timestamp/);
});

test("new-record CAS, current revision zero and saved revision progression have distinct meanings",()=>{
 assert.doesNotThrow(()=>assertWriteVersion(undefined,null));
 assert.doesNotThrow(()=>assertWriteVersion({},0));
 assert.equal(nextWriteVersion(null),1);
 assert.equal(nextWriteVersion(0),1);
 assert.equal(nextWriteVersion(12),13);
 for(const current of [undefined,{},{saveRevision:1},{saveRevision:8}]){
  for(const expected of [null,0,1,8]){
   const allowed=(expected===null?current===undefined:
    current!==undefined&&(current.saveRevision??0)===expected);
   if(allowed)assert.doesNotThrow(()=>assertWriteVersion(current,expected));
   else assert.throws(()=>assertWriteVersion(current,expected),/Another tab/);
  }
 }
});
}
