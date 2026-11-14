/** Independent reference map for real localStorage fallback transactions.
 * Model updates only after an acknowledged write; assertions include raw bytes
 * after injected failures and a separately stale tab. No mocked store methods.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {createLocalFallbackWorkspaceStore} from "../src/history/workspace-store.ts";

const seeded=seed=>{
 let x=seed>>>0;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};
};
class StorageBytes {
 data=null;fail=false;
 getItem(key){return key==="g"?this.data:null;}
 setItem(key,value){
  if(key!=="g")throw Error("unexpected key");
  if(this.fail){this.fail=false;throw Error("injected disk rejection");}
  this.data=String(value);
 }
 removeItem(key){if(key==="g")this.data=null;}
 key(index){return index===0&&this.data!==null?"g":null;}
 get length(){return this.data===null?0:1;}
}
const make=(id,version)=>({id,saveRevision:version,recordType:id.startsWith("a")?
 "generic-attempt":"learning-card",...(id.startsWith("a")?{finishedAt:id.endsWith("0")?10:null}:{})});
const intentOf=record=>record.recordType==="learning-card"?"learning-card":
 record.finishedAt===null?"discard-unfinished":"completed";

test("G persistence: seeded CAS, insertion, deletion, disk failure and competing tabs obey a standalone transactional map",async()=>{
 for(let seed=1;seed<=55;seed++){
  const random=seeded(0xc0ffee^seed),bytes=new StorageBytes();
  const store=createLocalFallbackWorkspaceStore(bytes,"g");
  const stale=createLocalFallbackWorkspaceStore(bytes,"g");
  let nextId=0,reference=new Map();
  await store.loadRecoverable();await stale.loadRecoverable();
  const snapshot=()=>JSON.stringify([...reference.values()]);
  const check=async label=>{
   assert.deepEqual(JSON.parse(bytes.data??"[]"),[...reference.values()],label+" raw durable ledger");
   assert.deepEqual((await store.loadVerified()).records,[...reference.values()],label+" verified ledger");
   for(const record of reference.values())
    assert.deepEqual(await store.readAuthoritative(record.id),record,label+" authoritative read");
  };
  for(let step=0;step<45;step++){
   const mode=random(7),entries=[...reference.values()];
   const existing=entries.length?entries[random(entries.length)]:null;
   const label="seed="+seed+" step="+step+" mode="+mode;
   const before=bytes.data;
   if(mode===0||mode===1||mode===2){
    // A successful CAS never skips a revision. A failed durable set cannot
    // partially update the in-memory or serialized owner.
    const id=existing&&random(2)?existing.id:
      (random(2)?"a":"c")+(nextId++);
    const old=reference.get(id),value=make(id,(old?.saveRevision??0)+1);
    if(mode===1)bytes.fail=true;
    await store.loadRecoverable();
    if(mode===1){
     await assert.rejects(store.write(value,old?.saveRevision??null),/injected disk rejection/,label);
     assert.equal(bytes.data,before,label+" failed write preserved bytes");
    }else if(mode===2&&old){
     await assert.rejects(store.write(value,null),/Another tab already created/,label);
     assert.equal(bytes.data,before,label+" stale create preserved bytes");
    }else{
     await store.write(value,old?.saveRevision??null);
     reference.set(id,value);
    }
   }else if(mode===3){
    const candidate=existing??make("c"+nextId++,1);
    await store.loadRecoverable();
    const wrong=candidate.recordType==="learning-card"?"completed":"learning-card";
    await assert.rejects(store.delete(candidate.id,candidate.saveRevision,wrong),/Deletion|saved item/i,label);
    assert.equal(bytes.data,before,label+" wrong delete preserved bytes");
   }else if(mode===4){
    // One batch must be all-or-nothing, even if a later entry collides.
    const first=make("c"+nextId++,1),second=existing??make("a"+nextId++,1);
    await store.loadRecoverable();
    if(existing){
     await assert.rejects(store.insertMany([first,second]),/Another tab already created/,label);
     assert.equal(bytes.data,before,label+" conflicting batch did not write first member");
    }else{
     await store.insertMany([first,second]);
     reference.set(first.id,first);reference.set(second.id,second);
    }
   }else if(mode===5&&existing){
    await store.loadRecoverable();
    await store.delete(existing.id,existing.saveRevision,intentOf(existing));
    reference.delete(existing.id);
   }else if(mode===6){
    // Secondary tab reads the same bytes, then the primary advances the
    // authoritative version. The old tab must be refused rather than merge.
    await stale.loadRecoverable();await store.loadRecoverable();
    const id=existing?.id??"c"+nextId++;
    const old=reference.get(id);
    const newer=make(id,(old?.saveRevision??0)+1);
    await store.write(newer,old?.saveRevision??null);reference.set(id,newer);
    await assert.rejects(stale.write(make(id,newer.saveRevision+1),old?.saveRevision??null),
      /Another tab changed fallback history/,label);
   }
   await check(label);
   assert.equal(bytes.fail,false,label+" injected failure was not swallowed");
   assert.equal(bytes.data,snapshot(),label+" raw JSON, order and no partial write");
  }
  store.close();stale.close();
 }
});

test("G persistence: bulk completed deletion is atomic on stale versions and injected quota failure",async()=>{
 const bytes=new StorageBytes(),s=createLocalFallbackWorkspaceStore(bytes,"g");
 await s.loadRecoverable();
 const done=[make("a0",1),make("a20",1)],unfinished=make("a1",1);
 await s.insertMany([...done,unfinished]);
 const original=bytes.data;
 await assert.rejects(s.deleteCompleted([
  {id:"a0",saveRevision:1},{id:"a20",saveRevision:9}
 ]),/Another tab changed/);
 assert.equal(bytes.data,original,"stale batch cannot delete its earlier member");
 await assert.rejects(s.deleteCompleted([
  {id:"a0",saveRevision:1},{id:"a1",saveRevision:1}
 ]),/Completed status changed/);
 assert.equal(bytes.data,original,"unfinished record cannot masquerade as completed");
 bytes.fail=true;
 await assert.rejects(s.deleteCompleted(done.map(x=>({id:x.id,saveRevision:1}))),
  /injected disk rejection/);
 assert.equal(bytes.data,original,"quota failure must preserve every completed record");
 await s.deleteCompleted(done.map(x=>({id:x.id,saveRevision:1})));
 assert.deepEqual((await s.loadVerified()).records,[unfinished]);
});
