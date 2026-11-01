import test from "node:test";
import assert from "node:assert/strict";
import {assertWriteVersion,nextWriteVersion} from "../src/history/concurrency.ts";
import {makeBackup,verifyBackup,planBackupMerge} from "../src/history/backup.ts";
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
