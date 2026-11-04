/** P48-2 measured heterogeneous cold-load stress, *not* a speedup claim.
 * Synthetic workload: ten real image-bearing SSC CGL paper graphs, sixteen
 * different simple authored APFC/NAT revisions, frozen 100-question completed
 * and in-progress attempts, one imported package per family and FSRS cards.
 * Uses real IndexedDB and app file:// Chromium rather than a mocked store.
 */
import {performance} from "node:perf_hooks";
import {readFile} from "node:fs/promises";
import {openHarness,check,route} from "./browser/fixtures.mjs";
import {builtinCglPackages,configureCglPractice,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {importSimpleQuestionBank,APFC_NAT_BANK_TEMPLATE} from "../src/app/bank-import.ts";
import {compactAttempt} from "../src/history/shared-store.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";
import {addLearningCard} from "../src/learning/learning.ts";

const sizes=[100,1000,1600],repeats=2;
const origin=Date.UTC(2026,10,4,0,0,0);
const h=await openHarness({artifactDir:"artifacts/p48-heterogeneous"});
const round=n=>Math.round(n*100)/100;
const summary=a=>({min:round(Math.min(...a)),median:round(a.toSorted((x,y)=>x-y)[Math.floor(a.length/2)]),max:round(Math.max(...a))});
const papers=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url),"utf8"));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url),"utf8"));
const bundles=builtinCglPackages(papers,patches).map(p=>configureCglPractice(p,"strict"));
const attempts=bundles.map((bundle,i)=>{
 let attempt=startGenericAttempt(bundle,"p48-real-template-"+i,origin);
 const lookup=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
 for(let section=0;section<bundle.paper.sections.length;section++)
   attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_SECTION",nowMs:origin+(section+1)*1000},lookup);
 check(attempt.finishedAt!==null&&attempt.result?.items.length===100,
   "P48-2 real completed 100-question CGL test fixture invalid");
 validateGenericStoredRecord(attempt);
 return attempt;
});
const pending=bundles.map((bundle,i)=>startGenericAttempt(bundle,"p48-pending-template-"+i,origin));
const imported=Array.from({length:16},(_,i)=>{
 const bank=structuredClone(APFC_NAT_BANK_TEMPLATE);
 bank.bankId="p48-hetero-"+i;
 bank.title="Heterogeneous APFC family "+(i+1);
 bank.questions[0].question="Verified-input synthetic load case "+i+": "+
   ("Labour, social security and independent source revision. ".repeat(7));
 return importSimpleQuestionBank(bank);
});
const cards=attempts[0].frozen.questions.slice(0,80)
 .map(q=>({...addLearningCard(attempts[0],q.id,new Date(origin+5000).toISOString()),saveRevision:1}));
for(const card of cards)validateGenericStoredRecord(card);
const observed=[];

function rowsFor(n){
 const rows=[],snapshots=new Map();
 const packageCount=Math.min(imported.length,Math.ceil(n/50));
 const cardCount=Math.min(cards.length,Math.floor(n/12));
 for(let i=0;i<packageCount;i++)rows.push({
   recordType:"generic-package",id:"generic-package:"+imported[i].paper.id,
   bundle:imported[i],saveRevision:1});
 for(let i=0;i<cardCount;i++)rows.push(cards[i]);
 const remainder=n-rows.length;
 for(let i=0;i<remainder;i++){
   const template=i%11===0?pending[i%pending.length]:attempts[i%attempts.length];
   const instance={...template,id:"p48-hetero-attempt-"+String(i).padStart(5,"0"),saveRevision:1};
   const packed=compactAttempt(instance);
   rows.push(packed.row);
   snapshots.set(packed.snapshot.id,packed.snapshot);
 }
 check(rows.length===n,"P48-2 heterogeneous record count mismatch");
 return {rows,snapshots:[...snapshots.values()],families:packageCount,cards:cardCount,
   completed:rows.filter(r=>r.recordType==="generic-attempt"&&r.finishedAt!==null).length,
   unfinished:rows.filter(r=>r.recordType==="generic-attempt"&&r.finishedAt===null).length};
}

async function profile(n){
 const {page,context,errors}=await h.open();page.setDefaultTimeout(120000);
 try{
  const fixtures=rowsFor(n);
  const written=await page.evaluate(async({rows,snapshots})=>{
   const request=indexedDB.open("practiceDesk.shared.v1",1);
   const db=await new Promise((ok,fail)=>{
     request.onsuccess=()=>ok(request.result);request.onerror=()=>fail(request.error);
   });
   try{
     const start=performance.now();
     await new Promise((ok,fail)=>{
       const tx=db.transaction(["attempts","snapshots"],"readwrite");
       for(const record of snapshots)tx.objectStore("snapshots").add(record);
       for(const record of rows)tx.objectStore("attempts").add(record);
       tx.oncomplete=ok;tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error);
     });
     return {writeMs:performance.now()-start};
   }finally{db.close();}
  },fixtures);
  const startup=[];
  for(let rep=0;rep<repeats;rep++){
   const started=performance.now();
   await page.reload({waitUntil:"load",timeout:120000});
   await page.waitForFunction(()=>document.querySelector("#g-import")?.disabled===false,null,{timeout:120000});
   startup.push(performance.now()-started);
  }
  await page.locator("#g-history").click();await route(page,"history");
  const storageText=await page.locator("#g-storage-records").innerText();
  check(storageText.includes("Loaded in this tab: "+n+" records"),
    "P48-2 heterogeneous cursor startup lost saved data: "+storageText);
  const archive=await page.locator(".history-entries .archive-entry").count();
  check(archive===fixtures.completed+fixtures.unfinished,
    "P48-2 heterogeneous History attempt count mismatch "+archive);
  // These raw read timings compare native IDB access patterns ONLY. They do
  // not include source verification, scoring, DOM, History or browser paints.
  // They must not be presented as whole-app startup speedups.
  const rawRead=await page.evaluate(async()=>{
   const open=indexedDB.open("practiceDesk.shared.v1",1);
   const db=await new Promise((ok,fail)=>{
     open.onsuccess=()=>ok(open.result);open.onerror=()=>fail(open.error);
   });
   try{
     const getAll=()=>new Promise((ok,fail)=>{
       const start=performance.now();
       const tx=db.transaction(["snapshots","attempts"],"readonly");
       const a=tx.objectStore("snapshots").getAll();
       const b=tx.objectStore("attempts").getAll();
       tx.oncomplete=()=>ok({ms:performance.now()-start,snapshots:a.result.length,rows:b.result.length});
       tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error);
     });
     const cursor=()=>new Promise((ok,fail)=>{
       const start=performance.now(),tx=db.transaction(["snapshots","attempts"],"readonly");
       let snapshots=0,rows=0;
       const step=(store,finish)=>{
         const req=tx.objectStore(store).openCursor();
         req.onsuccess=()=>{
           if(req.result){if(store==="snapshots")snapshots++;else rows++;req.result.continue();}
           else finish();
         };
         req.onerror=()=>fail(req.error);
       };
       step("snapshots",()=>step("attempts",()=>{}));
       tx.oncomplete=()=>ok({ms:performance.now()-start,snapshots,rows});
       tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error);
     });
     const old=await getAll(),stream=await cursor();
     return {old,stream};
   }finally{db.close();}
  });
  check(rawRead.old.rows===n&&rawRead.stream.rows===n&&
    rawRead.stream.snapshots===fixtures.snapshots.length,
    "P48-2 raw IDB scan counts differ");
  check(!errors.length,"P48-2 browser exceptions "+errors.join("; "));
  const result={count:n,sourceCglGraphs:bundles.length,authoredFamilies:fixtures.families,
   savedLearningCards:fixtures.cards,completed:fixtures.completed,unfinished:fixtures.unfinished,
   snapshots:fixtures.snapshots.length,writeMs:round(written.writeMs),
   coldOpenMs:summary(startup),rawIdbMs:{getAll:round(rawRead.old.ms),cursor:round(rawRead.stream.ms)}};
  observed.push(result);
  console.log("P48-2 HETEROGENEOUS "+JSON.stringify(result));
 }catch(e){await h.diagnose("p48-heterogeneous-"+n,page,e);throw e;}
 finally{await context.close();}
}
try{
 for(const n of sizes)await profile(n);
 await h.evidence("heterogeneous-storage-profile",{environment:"headless Linux Chrome file://",
   at:new Date().toISOString(),measures:observed,
   caveats:["Synthetic mixture; does not represent every real user's attachments or disks",
   "Native raw getAll vs cursor timings exclude validation/DOM/score work",
   "Cold timings include page reload, app build bootstrap, cursor hydration and Library draw",
   "No speedup claimed without same-workload before/after on a controlled runner",
   "Real Mac Safari, Android/iOS, assistive technology and OS eviction not tested"]});
 console.log("P48-2 HETEROGENEOUS PROFILE PASS 100/1000/1600 records, true image-bearing CGL graphs and authored families");
}finally{await h.finish();}
