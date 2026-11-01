/** Current offline persistence under two-tab races, unavailable IndexedDB,
 * failing first reads and quota-denied writes. No historical screenshot or v11.
 */
import {readFile} from "node:fs/promises";
import {openHarness,offlineUrl,records,check,route} from "./browser/fixtures.mjs";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
async function until(fn,label,n=65){
 for(let i=0;i<n;i++){
  const x=await fn();if(x)return x;
  await new Promise(r=>setTimeout(r,75));
 }
 throw Error("Timed out "+label);
}
const {page,context,errors}=await h.open();
try{
 await page.locator('[data-mode="strict"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator("input[data-choice]").first().click();
 const attemptId=new URL(await page.url()).searchParams.get("attempt");
 await page.locator("#g-library").click();await route(page,"library");
 const departed=await until(async()=>{
  const x=(await records(page)).find(x=>x.id===attemptId);
  return x?.state.visible===false&&x.saveRevision>0?x:null;
 },"departed durable first tab");
 check(departed.packageId.endsWith(":practice:strict"),
   "Frozen strict section has no distinct source-practice revision identity");
 const other=await context.newPage();
 other.on("dialog",d=>void d.accept());
 await other.goto(offlineUrl,{waitUntil:"load"});
 await other.locator("#g-history").click();await route(other,"history");
 await other.locator('[data-attempt="'+attemptId+'"]').first().click();await route(other,"exam");
 check(await other.locator("input[data-choice]").count()>=3,
   "Second tab could not resume first tab's frozen question");
 const replacement=await other.locator("input[data-choice]").nth(1).getAttribute("data-choice");
 await other.locator("input[data-choice]").nth(1).click();
 const updated=await until(async()=>{
  const x=(await records(other)).find(x=>x.id===attemptId);
  return x?.saveRevision>departed.saveRevision&&
    x.state.responses.some(y=>y.response?.kind==="single-choice"&&y.response.optionId===replacement)?x:null;
 },"durable alternate second-tab answer");
 // The original tab must not silently overwrite a newer revision.
 if(await page.locator('[data-attempt="'+attemptId+'"]').count())
  await page.locator('[data-attempt="'+attemptId+'"]').first().click();
 await page.evaluate(()=>document.querySelectorAll('input[data-choice]')[2]?.click());
 await page.locator(".generic-warning").filter({hasText:"Another tab"}).waitFor();
 const authoritative=(await records(other)).find(x=>x.id===attemptId);
 check(authoritative.saveRevision>=updated.saveRevision&&
  authoritative.state.responses.some(x=>x.response?.optionId===replacement),
  "Stale original browser tab overwrote authoritative alternate answer");
 await other.close();
 console.log("MODERN RESILIENCE PASS actual IndexedDB two-tab CAS conflict");
 // Two tabs using localStorage fallback must detect a changed data generation.
 const fallbackA=await context.newPage(),fallbackB=await context.newPage();
 const unavailable=()=>Object.defineProperty(window,"indexedDB",
   {configurable:true,value:undefined});
 await fallbackA.addInitScript(unavailable);
 await fallbackB.addInitScript(unavailable);
 await fallbackA.goto(offlineUrl,{waitUntil:"load"});
 await fallbackA.locator("#g-start").click();await route(fallbackA,"exam");
 await fallbackA.locator("input[data-choice]").first().click();
 const fallbackId=await until(async()=>fallbackA.evaluate(()=>{
  const arr=JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]");
  return arr.find(x=>x.recordType==="generic-attempt"&&x.state.responses.some(r=>r.response))?.id;
 }),"durable localStorage fallback answer");
 await fallbackB.goto(offlineUrl,{waitUntil:"load"});
 await fallbackB.locator('[data-attempt="'+fallbackId+'"]').first().click();await route(fallbackB,"exam");
 await fallbackB.locator("input[data-choice]").nth(1).click();
 await fallbackA.locator(".generic-warning").filter({hasText:"Fallback history changed"}).waitFor();
 const backupEvent=fallbackA.waitForEvent("download");
 await fallbackA.locator("#g-export-history").click();
 const backup=JSON.parse(await readFile(await (await backupEvent).path(),"utf8"));
 check(backup.version===3&&backup.records.some(x=>x.id===fallbackId),
  "Two-tab fallback conflict does not preserve valid export");
 await fallbackA.close();await fallbackB.close();
 console.log("MODERN RESILIENCE PASS concurrent localStorage fallback and recovery export");
 // An IndexedDB object-store failure after opening must switch to durable fallback.
 const readFailure=await context.newPage();
 // The previous fallback tab left an unfinished attempt in shared localStorage:
 // explicitly accept the app's start-new confirmation, never let Playwright
 // silently dismiss a legitimate warning and misdiagnose it as no exam UI.
 readFailure.on("dialog",d=>void d.accept());
 await readFailure.addInitScript(()=>{
  IDBObjectStore.prototype.getAll=function(){throw Error("Injected failed initial IndexedDB read");};
 });
 await readFailure.goto(offlineUrl,{waitUntil:"load"});
 await readFailure.locator(".generic-warning").filter({hasText:"IndexedDB unavailable"}).waitFor();
 const before=await readFailure.evaluate(()=>
  JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]").length);
 await readFailure.locator("#g-start").click();
 await readFailure.locator("input[data-choice]").first().click();
 await readFailure.waitForFunction(old=>
  JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]").length>old,before);
 check(await readFailure.evaluate(old=>
  JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]").length>old,before),
  "Failed IDB initial getAll did not persist subsequent exam in fallback store");
 await readFailure.close();
 console.log("MODERN RESILIENCE PASS failed initial IndexedDB read fallback");
 // A refused IDB put must disclose data loss risk and provide an unsaved
 // recovery copy including the current in-memory attempt.
 const quota=await context.newPage();quota.on("dialog",d=>void d.accept());
 await quota.goto(offlineUrl,{waitUntil:"load"});
 const initiallySaved=new Set((await records(quota)).map(x=>x.id));
 await quota.evaluate(()=>{
  window.__originalPut=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(){
   throw new DOMException("Injected quota rejection","QuotaExceededError");
  };
 });
 await quota.locator("#g-start").click();await route(quota,"exam");
 await quota.locator(".generic-warning").filter({hasText:"SAVE FAILED"}).waitFor();
 await quota.locator("#g-library").click();await route(quota,"library");
 const emergency=quota.waitForEvent("download");
 await quota.locator("#g-export-history").click();
 const downloaded=await emergency;
 check(downloaded.suggestedFilename().includes("UNSAVED_RECOVERY"),
  "Unsaved emergency export did not identify potentially non-durable material");
 const recovered=JSON.parse(await readFile(await downloaded.path(),"utf8"));
 check(recovered.version===3&&recovered.records.some(x=>
  x.recordType==="generic-attempt"&&!initiallySaved.has(x.id))&&
  await quota.locator(".generic-warning").filter({hasText:"Emergency recovery file"}).count()===1,
  "Quota failure lost attempted record or failed to explain emergency backup");
 await quota.close();
 check(errors.length===0,"Main browser exceptions "+errors.join("; "));
 await h.evidence("resilience",{idbStaleRejected:true,localStorageRace:true,
  initialReadFallback:true,quotaUnsavedRecovery:true});
 console.log("MODERN RESILIENCE PASS IDB CAS, localStorage conflict, failed read and quota recovery");
}catch(e){await h.diagnose("resilience",page,e);throw e;}
finally{await context.close();await h.finish();}
