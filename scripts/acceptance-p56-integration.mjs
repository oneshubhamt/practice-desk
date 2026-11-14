/** P56 independent red-before-green integration: concurrent same-source snapshot.
 * The importing Library was hydrated BEFORE another tab committed a valid
 * digest. Import a separately made v5 archive with another attempt referencing
 * exactly that digest. A stale in-memory snapshot set must not abort a
 * legitimate, additive transaction or overwrite the other tab's record.
 * Runs against the real standalone file:// UI and IndexedDB in every engine.
 */
import {openHarness,offlineUrl,route,records,check} from "./browser/fixtures.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {compactAttempt} from "../src/history/shared-store.ts";
import {serializeVerifiedBackup} from "../src/history/backup.ts";
import {DEFAULT_PREFERENCES} from "../src/app/preferences.ts";

const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/p56-integration"});
const {page,context,errors}=await h.open({viewport:{width:1280,height:850}});
const t=Date.UTC(2026,10,5,0,0);
const completed=id=>{
 const start=startGenericAttempt(pkg,id,t);
 return transitionGenericAttempt(start,{type:"TICK",nowMs:t+1200000},
   new Map(pkg.questions.map(q=>[q.id,q])));
};
const foreign={...completed("p56-foreign-committed"),saveRevision:1};
const restoring={...completed("p56-additive-restored"),saveRevision:1};
const packed=compactAttempt(foreign),otherPacked=compactAttempt(restoring);
check(packed.snapshot.id===otherPacked.snapshot.id,
 "P56 precondition: frozen same-source digest should be shared");
const backup=serializeVerifiedBackup([restoring],DEFAULT_PREFERENCES,
 "2026-11-05T02:00:00.000Z");

try{
 await route(page,"library");
 const other=await context.newPage();
 await other.goto(offlineUrl,{waitUntil:"load"});
 await other.locator("#g-papers").waitFor({state:"visible"});
 // Use the same atomic shared-store representation as production writes.
 // Only tab B commits. Tab A's in-memory storedSnapshots is now stale.
 await other.evaluate(async ({row,snapshot})=>{
   const db=await new Promise((resolve,reject)=>{
     const req=indexedDB.open("practiceDesk.history",1);
     req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   try{
     await new Promise((resolve,reject)=>{
       const tx=db.transaction(["attempts","snapshots"],"readwrite");
       tx.objectStore("snapshots").add(snapshot);
       tx.objectStore("attempts").add(row);
       tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
       tx.onabort=()=>reject(tx.error);
     });
   }finally{db.close();}
 },packed);
 await other.close();
 // Snapshot source is valid, but intentionally not present in tab A cache.
 const before=await records(page);
 check(before.some(x=>x.id===foreign.id)&&!before.some(x=>x.id===restoring.id),
   engine+" second tab did not durably install the immutable source");
 await page.locator("#g-history-file").setInputFiles({
   name:"p56-two-tab-backup.json",mimeType:"application/json",
   buffer:Buffer.from(backup)
 });
 // Both the success and the error branches report through the visible UI.
 await page.waitForFunction(()=>/Imported 1 records|History import failed|Import failed|already exists|ConstraintError/i
   .test(document.querySelector("#app")?.textContent??""),null,{timeout:12000});
 const result=(await records(page));
 const message=await page.locator("#app").innerText();
 check(result.some(x=>x.id===restoring.id),
   engine+" P56 R1 stale snapshot cache blocked valid additive v5 import: "+
   message.slice(0,450));
 check(result.some(x=>x.id===foreign.id),
   engine+" P56 R1 import overwrote concurrent original record");
 const identity=await page.evaluate(async ()=>{
   const db=await new Promise((resolve,reject)=>{
     const req=indexedDB.open("practiceDesk.history",1);
     req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   try{
     return await new Promise((resolve,reject)=>{
       const tx=db.transaction(["attempts","snapshots"],"readonly");
       const r=tx.objectStore("attempts").getAll();
       const s=tx.objectStore("snapshots").getAll();
       tx.oncomplete=()=>resolve({rows:r.result.filter(x=>x.id.startsWith("p56-")),
         snapshots:s.result});
       tx.onerror=()=>reject(tx.error);
     });
   }finally{db.close();}
 });
 check(identity.rows.length===2&&identity.snapshots.length===1&&
   identity.rows.every(x=>x.frozenRef===packed.snapshot.id),
   engine+" P56 immutable digest was duplicated, missing or overwritten");
 await page.reload({waitUntil:"load"});await route(page,"library");
 await page.locator("#g-history").click();await route(page,"history");
 check((await records(page)).filter(x=>x.id.startsWith("p56-")).length===2,
   engine+" P56 imported completed attempts did not survive actual file reload");
 // Independent fail-closed case in a fresh browser profile. A pre-existing
 // same-ID digest with DIFFERENT content must never be overwritten or
 // legitimised by a checksum-correct incoming portable archive.
 const hostile=await h.open({viewport:{width:1280,height:850}});
 await route(hostile.page,"library");
 const distorted=structuredClone(packed.snapshot);
 distorted.body.paper.revision=distorted.body.paper.revision+1;
 await hostile.page.evaluate(async snapshot=>{
   const db=await new Promise((resolve,reject)=>{
     const r=indexedDB.open("practiceDesk.history",1);
     r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   try{
     await new Promise((resolve,reject)=>{
       const tx=db.transaction("snapshots","readwrite");
       tx.objectStore("snapshots").add(snapshot);
       tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
     });
   }finally{db.close();}
 },distorted);
 await hostile.page.locator("#g-history-file").setInputFiles({
   name:"p56-valid-archive-corrupt-local-digest.json",
   mimeType:"application/json",buffer:Buffer.from(backup)
 });
 await hostile.page.waitForFunction(()=>/Import failed|integrity|SHA-256 mismatch|Invalid stored snapshot|Write aborted|ConstraintError/i.test(
   document.querySelector("#app")?.textContent??""),null,{timeout:12000});
 const nonOverwrite=await hostile.page.evaluate(async id=>{
   const db=await new Promise((resolve,reject)=>{
     const r=indexedDB.open("practiceDesk.history",1);
     r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   try{
     return await new Promise((resolve,reject)=>{
       const tx=db.transaction(["attempts","snapshots"],"readonly");
       const a=tx.objectStore("attempts").get("p56-additive-restored");
       const b=tx.objectStore("snapshots").get(id);
       tx.oncomplete=()=>resolve({attempt:a.result,snapshot:b.result});
       tx.onerror=()=>reject(tx.error);
     });
   }finally{db.close();}
 },packed.snapshot.id);
 check(!nonOverwrite.attempt&&nonOverwrite.snapshot.body.paper.revision===
   distorted.body.paper.revision,
   engine+" P56 mutated stored digest was silently repaired or imported anyway");
 check(!hostile.errors.length,engine+" hostile profile browser exceptions "+hostile.errors.join("; "));
 check(errors.length===0,engine+" P56 browser exception: "+errors.join("; "));
 console.log("P56 "+engine+" PASS: concurrent immutable digest reused, corrupted digest rejected without overwrite, reloaded original");
 await h.evidence("p56-"+engine,{pass:true,records:identity.rows.length,
   sharedSnapshots:identity.snapshots.length,concurrent:packed.snapshot.id});
}catch(error){await h.diagnose("p56-"+engine,page,error);throw error;}
finally{await h.finish();}
