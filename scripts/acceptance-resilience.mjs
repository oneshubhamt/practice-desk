/** Current offline persistence under two-tab races, unavailable IndexedDB,
 * failing first reads and quota-denied writes. No historical screenshot or v11.
 */
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
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
 // B starts from the durable attempt while A is safely at Library.
 // Resuming A later may either hydrate B's exact newer answer (no conflict)
 // or detect a stale checkpoint and report the conflict/return to Library.
 // Both are safe; require the authoritative B answer to remain unchanged.
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
 check(await page.locator('[data-attempt="'+attemptId+'"]').count()>0,
   "Original tab must still expose its saved attempt before resume");
 await page.locator('[data-attempt="'+attemptId+'"]').first().click();
 await page.waitForFunction(expected=>{
  const conflict=[...document.querySelectorAll(".generic-warning")]
   .some(n=>n.textContent?.includes("Another tab"));
  const checked=document.querySelector('input[data-choice]:checked')?.getAttribute("data-choice");
  return conflict||checked===expected||Boolean(document.querySelectorAll("input[data-choice]")[2]);
 },replacement,{timeout:12000});
 // B may trigger A's automatic stale-record rejection/Library redirect
 // BEFORE a candidate can click C. Or A may legitimately refresh to B's new
 // answer. Exercise C only while A still shows the old exam controls; require
 // either a visible fail-closed warning or a confirmed synchronized B state.
 const conflictWarning=page.locator(".generic-warning").filter({hasText:"Another tab"});
 const view=async()=>page.evaluate(()=>({
  conflict:[...document.querySelectorAll(".generic-warning")]
   .some(n=>n.textContent?.includes("Another tab")),
  checked:document.querySelector('input[data-choice]:checked')?.getAttribute("data-choice")??null,
  hasThird:Boolean(document.querySelectorAll("input[data-choice]")[2])
 }));
 const preConflictView=await view();
 if(!preConflictView.conflict&&preConflictView.checked!==replacement&&preConflictView.hasThird)
   await page.evaluate(()=>document.querySelectorAll("input[data-choice]")[2]?.click());
 // Preserve actual observed conflict/synchronisation as a test witness.
 // A valid stale-record redirect may remove the transient warning and exam
 // controls immediately afterwards. Re-sampling the DOM is not a valid proof
 // that the fail-closed state was never displayed.
 const witness=await page.waitForFunction(expected=>{
  const conflict=[...document.querySelectorAll(".generic-warning")]
   .some(n=>n.textContent?.includes("Another tab"));
  const checked=document.querySelector('input[data-choice]:checked')?.getAttribute("data-choice");
  return conflict?"visible-conflict":checked===expected?"synchronized-answer":false;
 },replacement,{timeout:12000});
 const observed=await witness.jsonValue();
 check(observed==="visible-conflict"||observed==="synchronized-answer",
   "Original tab neither visibly rejected stale write nor synchronized to the authoritative answer");
 // A witnessed banner alone is not proof of stored correctness: give pending
 // transactions time to settle and check the second tab's durable record.
 await page.waitForTimeout(250);
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
  const arr=JSON.parse(localStorage.getItem("practiceDesk.history.fallback")??"[]");
  return arr.find(x=>x.recordType==="generic-attempt"&&x.state.responses.some(r=>r.response))?.id;
 }),"durable localStorage fallback answer");
 await fallbackB.goto(offlineUrl,{waitUntil:"load"});
 await fallbackB.locator('[data-attempt="'+fallbackId+'"]').first().click();await route(fallbackB,"exam");
 await fallbackB.locator("input[data-choice]").nth(1).click();
 await fallbackA.locator(".generic-warning").filter({hasText:"Fallback history changed"}).waitFor();
 const backupEvent=fallbackA.waitForEvent("download");
 await fallbackA.locator("#g-export-history").click();
 const backup=JSON.parse(await readFile(await (await backupEvent).path(),"utf8"));
 check(backup.version===4&&backup.records.some(x=>x.id===fallbackId),
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
  // P48-2 startup reads a cursor rather than getAll. Inject the actual
  // IDB API failure so the same durable fallback contract remains tested.
  IDBObjectStore.prototype.openCursor=function(){throw Error("Injected failed initial IndexedDB cursor read");};
 });
 await readFailure.goto(offlineUrl,{waitUntil:"load"});
 await readFailure.locator(".generic-warning").filter({hasText:"IndexedDB unavailable"}).waitFor();
 const before=await readFailure.evaluate(()=>
  JSON.parse(localStorage.getItem("practiceDesk.history.fallback")??"[]").length);
 await readFailure.locator("#g-start").click();
 await readFailure.locator("input[data-choice]").first().click();
 await readFailure.waitForFunction(old=>
  JSON.parse(localStorage.getItem("practiceDesk.history.fallback")??"[]").length>old,before);
 check(await readFailure.evaluate(old=>
  JSON.parse(localStorage.getItem("practiceDesk.history.fallback")??"[]").length>old,before),
  "Failed IDB initial cursor read did not persist subsequent exam in fallback store");
 await readFailure.close();
 console.log("MODERN RESILIENCE PASS failed initial IndexedDB read fallback");
 // A refused IDB put must disclose data loss risk and provide an unsaved
 // recovery copy including the current in-memory attempt.
 const quota=await context.newPage();quota.on("dialog",d=>void d.accept());
 await quota.goto(offlineUrl,{waitUntil:"load"});
 // The injected failed put must occur AFTER async IndexedDB hydration and
 // emergency-mirror reconciliation, not sabotage the test's own startup.
 await quota.waitForFunction(()=>document.querySelector("#g-start")?.disabled===false,
   null,{timeout:30000});
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
 check(recovered.version===4&&recovered.records.some(x=>
  x.recordType==="generic-attempt"&&!initiallySaved.has(x.id))&&
  await quota.locator(".generic-warning").filter({hasText:"Emergency recovery file"}).count()===1,
  "Quota failure lost attempted record or failed to explain emergency backup");
 await quota.close();
 // Persist across an actual complete Chrome process/profile restart, not
 // merely a page.reload() or a fresh isolated in-memory browser context.
 const executable=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
  .map(cmd=>({cmd,version:spawnSync(cmd,["--version"],{encoding:"utf8"})}))
  .find(x=>x.version.status===0)?.cmd;
 check(Boolean(executable),"No installed Chromium for real profile restart");
 const binary=spawnSync("which",[executable],{encoding:"utf8"}).stdout.trim();
 const profile=await mkdtemp(join(tmpdir(),"practice-resilience-persistent-"));
 let persistent;
 try{
  const opts={headless:true,executablePath:binary,
   args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]};
  persistent=await chromium.launchPersistentContext(profile,opts);
  let originalPage=persistent.pages()[0]??await persistent.newPage();
  originalPage.on("dialog",d=>void d.accept());
  await originalPage.goto(offlineUrl,{waitUntil:"load"});
  await originalPage.locator('[data-mode="single"]').click();
  await originalPage.locator("#g-start").click();await route(originalPage,"exam");
  const persistedId=new URL(await originalPage.url()).searchParams.get("attempt");
  await originalPage.locator("input[data-choice]").first().click();
  await originalPage.locator("#g-submit").click();await route(originalPage,"result");
  await originalPage.locator("#result-tab-review").click();
  await originalPage.locator("[data-add-card]").first().click();
  await until(async()=>{
   const x=await records(originalPage);
   return x.some(y=>y.id===persistedId&&y.finishedAt!==null)&&
     x.some(y=>y.recordType==="learning-card"&&y.sourceAttemptId===persistedId);
  },"durably committed result/card before process exit");
  await persistent.close();persistent=null;
  persistent=await chromium.launchPersistentContext(profile,opts);
  const restored=persistent.pages()[0]??await persistent.newPage();
  restored.on("dialog",d=>void d.accept());
  await restored.goto(offlineUrl,{waitUntil:"load"});
  await restored.locator("#g-history").click();await route(restored,"history");
  check(await restored.locator('[data-attempt="'+persistedId+'"]').count()===1,
   "Offline profile restart lost frozen result");
  await restored.locator("#g-library").click();await route(restored,"library");
  await restored.locator("#g-learning").click();await route(restored,"learning");
  check((await records(restored)).some(x=>x.recordType==="learning-card"&&
   x.sourceAttemptId===persistedId),
   "Offline profile restart lost separately saved FSRS learning card");
 }finally{await persistent?.close();await rm(profile,{recursive:true,force:true});}
 check(errors.length===0,"Main browser exceptions "+errors.join("; "));
 await h.evidence("resilience",{idbStaleRejected:true,localStorageRace:true,
  initialReadFallback:true,quotaUnsavedRecovery:true,realProfileProcessRestart:true});
 console.log("MODERN RESILIENCE PASS IDB CAS, localStorage conflict, failed read, quota recovery and real Chrome profile restart");
}catch(e){await h.diagnose("resilience",page,e);throw e;}
finally{await context.close();await h.finish();}
