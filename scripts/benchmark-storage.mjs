/** P45 reproducible storage/History measurement, NOT a device-wide performance claim.
 * Run after npm run build: node scripts/benchmark-storage.mjs
 * Real self-contained file:// Chrome, real frozen records, real IndexedDB and backup UI.
 * Clean shared-snapshot schema; 1600 attempt rows must reuse <=3 immutable graphs.
 */
import {performance} from "node:perf_hooks";
import {readFile} from "node:fs/promises";
import {gunzipSync} from "node:zlib";
import {openHarness,records,route,starterBank,check} from "./browser/fixtures.mjs";
import {addLearningCard} from "../src/learning/learning.ts";
import {compactAttempt} from "../src/history/shared-store.ts";

const sizes=[0,100,1000,1600];
const repeats=2;
const h=await openHarness({artifactDir:"artifacts/p45-profile"});
const observations=[];
const now=Date.now();
const percentile=(a)=>({min:Math.round(Math.min(...a)),median:Math.round([...a].sort((x,y)=>x-y)[Math.floor(a.length/2)]),max:Math.round(Math.max(...a))});
const elapsed=()=>performance.now();

async function templates(){
 const {page,context,errors}=await h.open();
 try{
  await page.locator('[data-mode="strict"]').click();
  await page.locator("#g-start").click();await route(page,"exam");
  for(let i=0;i<4;i++)await page.locator("#g-submit").click();
  await route(page,"result");
  const complete=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt);
  check(complete?.frozen.questions.length===100,"P45 completed 100Q CGL fixture unavailable");
  const stamp=new Date(now).toISOString();
  const cards=complete.frozen.questions.slice(0,80).map(q=>
   addLearningCard(complete,q.id,stamp));
  // Explicit scheduled-review fixtures, never counted as exam marks.
  const reviews=cards.map((c,i)=>({...c,reviews:i%2?[{rating:3,at:stamp}]:[],
   bookmarked:i%9===0,customTopic:i%8===0?"self-authored-topic":"",note:i%7===0?"Review definition.":""}));
  await page.locator("#g-library").click();await route(page,"library");
  await page.locator("#g-start").click();await route(page,"exam");
  const pending=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt===null);
  check(Boolean(pending),"P45 in-progress fixture unavailable");
  await page.locator("#g-library").click();await route(page,"library");
  const bank=await starterBank();
  await page.locator("#g-file").setInputFiles({name:"p45-bank.json",
   mimeType:"application/json",buffer:Buffer.from(JSON.stringify(bank))});
  await page.waitForFunction(()=>document.querySelector("#g-family")?.value==="imported:upsc-epfo-apfc");
  await page.locator("#g-start").click();await route(page,"exam");
  await page.locator("#g-submit").click();await route(page,"result");
  const all=await records(page);
  const apfc=all.find(x=>x.recordType==="generic-attempt"&&
    x.frozen.snapshot.examId==="upsc-epfo-apfc"&&x.finishedAt!==null);
  const imported=all.find(x=>x.recordType==="generic-package");
  check(Boolean(apfc&&imported),"P45 imported author bank/attempt fixture missing");
  check(errors.length===0,"P45 fixture uncaught errors "+errors.join(";"));
  return {complete,pending,apfc,imported,cards:reviews};
 }finally{await context.close();}
}
async function seed(page,data,n){
 const fixtures=[],snapshots=new Map();
 const cards=Math.min(80,Math.floor(n*.10));
 const attempts=n-cards-(n>0?1:0);
 if(n>0)fixtures.push({...data.imported});
 for(let i=0;i<attempts;i++){
  const template=i%5===0?data.apfc:i%3===0?data.pending:data.complete;
  const full={...template,id:"p45-archive-"+String(i).padStart(5,"0"),
    startedAt:template.startedAt+i*1000,updatedAt:template.updatedAt+i*1000,
    ...(template.finishedAt===null?{}:{finishedAt:template.finishedAt+i*1000}),
    saveRevision:1};
  const packed=compactAttempt(full);
  fixtures.push(packed.row);snapshots.set(packed.snapshot.id,packed.snapshot);
 }
 for(let i=0;i<cards;i++)fixtures.push({...data.cards[i],saveRevision:1});
 if(fixtures.length!==n)throw Error("P45 fixture count mismatch");
 const bodies=[...snapshots.values()];
 const estimatedJsonBytes=fixtures.reduce((sum,row)=>sum+JSON.stringify(row).length,0)+
   bodies.reduce((sum,row)=>sum+JSON.stringify(row).length,0);
 const writeMs=await page.evaluate(async({rows,shared})=>{
  const r=indexedDB.open("practiceDesk.history",1);
  const db=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{
   const t=performance.now();
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(["attempts","snapshots"],"readwrite");
    const records=tx.objectStore("attempts"),snapshots=tx.objectStore("snapshots");
    for(const row of shared)snapshots.add(row);
    for(const row of rows)records.add(row);
    tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
   });
   return performance.now()-t;
  }finally{db.close();}
 },{rows:fixtures,shared:bodies});
 return {writeMs,records:fixtures.length,estimatedJsonBytes,sharedSnapshots:bodies.length,
    classes:{completed:fixtures.filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length,
      unfinished:fixtures.filter(x=>x.recordType==="generic-attempt"&&x.finishedAt===null).length,
      learning:fixtures.filter(x=>x.recordType==="learning-card").length,
      imported:fixtures.filter(x=>x.recordType==="generic-package").length}};
}
async function profile(count,data){
 const {page,context,errors}=await h.open();
 page.setDefaultTimeout(120000);
 try{
  const seeded=await seed(page,data,count);
  check(seeded.sharedSnapshots<=(count?3:0),
    "P45-B source dedup failed: "+seeded.sharedSnapshots+" snapshots for "+count+" rows");
  const startup=[],history=[],filter=[],sort=[],backups=[],save=[];
  let exportBytes=0,heapBytes=null;
  for(let rep=0;rep<repeats;rep++){
   const start=elapsed();
   await page.reload({waitUntil:"load",timeout:120000});
   await page.waitForFunction(()=>document.querySelector("#g-import")?.disabled===false,null,{timeout:120000});
   startup.push(elapsed()-start);
   const begin=elapsed();
   await page.locator("#g-history").click();await route(page,"history");
   await page.locator(".history-archive .fine").first().waitFor();
   history.push(elapsed()-begin);
   const attemptCount=seeded.classes.completed+seeded.classes.unfinished;
   check((await page.locator(".history-archive").innerText()).includes(attemptCount+" records shown"),
     "P45 History attempt count not authoritative at "+count+" total records");
   const x=elapsed();
   await page.locator("#g-history-search").fill("cgl-");
   filter.push(elapsed()-x);
   const expectedCgl=attemptCount-Math.ceil(attemptCount/5);
   check(await page.locator(".history-entries .archive-entry").count()===expectedCgl,
     "P45 CGL source-paper filter count incorrect at "+count);
   const y=elapsed();
   await page.locator("#g-history-sort").selectOption(rep%2?"newest":"oldest");
   sort.push(elapsed()-y);
   const z=elapsed();
   const exportTimeout=count>=1600?180000:120000;
   const download=page.waitForEvent("download",{timeout:exportTimeout});
   const exportError=page.locator(".generic-warning").filter({hasText:"Backup failed:"})
     .waitFor({timeout:exportTimeout}).then(async()=>{
       throw Error("P45 export rejected at "+count+" records: "+
         await page.locator(".generic-warning").filter({hasText:"Backup failed:"}).innerText());
     });
   await page.locator("#g-export-history").click();
   const file=await Promise.race([download,exportError]);
   const raw=await readFile(await file.path());
   backups.push(elapsed()-z);exportBytes=raw.byteLength;
   const json=file.suggestedFilename().endsWith(".gz")?
     gunzipSync(raw).toString("utf8"):raw.toString("utf8");
   const archive=JSON.parse(json);
   check(archive.manifest.recordCount===count,"P45 backup record count changed");
   await page.locator("#g-library").click();await route(page,"library");
  }
  // Read a count and one keyed record without serializing hundreds of MiB of
  // full frozen snapshots across Playwright's process boundary.
  const inventory=async()=>page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open("practiceDesk.history",1);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   try{
    const tx=db.transaction("attempts","readonly"),store=tx.objectStore("attempts");
    const get=req=>new Promise((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    const [count,sample]=await Promise.all([get(store.count()),get(store.get("p45-archive-00000"))]);
    return {count,hasScore:Boolean(sample?.result?.snapshot&&sample?.frozenRef),writeRevision:sample?.saveRevision??null};
   }finally{db.close();}
  });
  const snapshot=await inventory();
  check(snapshot.count===count,"P45 source records were lost across reloads");
  if(count)check(snapshot.hasScore,"P45 lost completed frozen marks");
  const t=elapsed();
  await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open("practiceDesk.history",1);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   const tx=db.transaction("attempts","readwrite");
   const store=tx.objectStore("attempts");
   const row=await new Promise((resolve,reject)=>{
    const r=store.get("p45-archive-00000");
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   if(row){store.put({...row,saveRevision:2});}
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
   db.close();
  });
  save.push(elapsed()-t);
  if(count>0){
   await page.reload({waitUntil:"load",timeout:120000});
   await page.waitForFunction(()=>document.querySelector("#g-import")?.disabled===false,null,{timeout:120000});
   const after=await inventory();
   check(after.count===count,"P45 after-save count changed");
   check(after.writeRevision===2,"P45 single-record update not durable");
  }
  try{
   const session=await context.newCDPSession(page);
   await session.send("Performance.enable");
   const m=await session.send("Performance.getMetrics");
   heapBytes=m.metrics.find(m=>m.name==="JSHeapUsedSize")?.value??null;
   await session.detach();
  }catch{/* CDP memory measurement is optional, not a synthetic estimate */}
  const result={count,repeats,seeded,
   coldOpenMs:percentile(startup),historyMs:percentile(history),
   filterMs:percentile(filter),sortMs:percentile(sort),backupMs:percentile(backups),
   backupBytes:exportBytes,oneRecordWriteMs:percentile(save),heapBytes,errors};
  check(!errors.length,"P45 browser errors "+errors.join(";"));
  console.log("P45 PROFILE "+JSON.stringify(result));observations.push(result);
 }catch(error){await h.diagnose("profile-"+count,page,error);throw error;}
 finally{await context.close();}
}
try{
 const data=await templates();
 for(const n of sizes)await profile(n,data);
 const report={at:new Date().toISOString(),platform:process.platform,arch:process.arch,
   node:process.version,browser:"installed Chrome via Playwright core, offline file://",
   sizes,repeats,observations};
 await h.evidence("storage-profile",report);
 console.log("P45 PROFILE COMPLETE "+JSON.stringify({sizes,repeats}));
}finally{await h.finish();}
