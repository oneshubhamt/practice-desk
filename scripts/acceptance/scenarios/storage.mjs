/** Stable product-domain browser scenarios. */

export async function storageResilience(){
// Consolidated from scripts/acceptance-resilience.mjs; retained browser-only assertions remain intact.
/** Current offline persistence under two-tab races, unavailable IndexedDB,
 * failing first reads and quota-denied writes. No historical screenshot oracle.
 */
const {readFile,mkdtemp,rm}=await import("node:fs/promises");
const {tmpdir}=await import("node:os");
const {join}=await import("node:path");
const {chromePath}=await import("../../browser/chrome-path.mjs");
const {chromium}=await import("playwright-core");
const {openHarness,offlineUrl,records,check,route}=await import("../../browser/fixtures.mjs");
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
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 await page.locator("input[data-choice]").first().click();
 const attemptId=new URL(await page.url()).searchParams.get("attempt");
 await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
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
 await other.getByRole("button",{name:/History & insights/}).click();await route(other,"history");
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
 // The preceding IndexedDB scenario deliberately leaves an unfinished mirrored
 // attempt. Fallback hydration validly recovers it, so starting a separate
 // attempt must accept the application's explicit safety confirmation.
 fallbackA.on("dialog",dialog=>void dialog.accept());
 const unavailable=()=>Object.defineProperty(window,"indexedDB",
   {configurable:true,value:undefined});
 await fallbackA.addInitScript(unavailable);
 await fallbackB.addInitScript(unavailable);
 await fallbackA.goto(offlineUrl,{waitUntil:"load"});
 await fallbackA.getByRole("button",{name:/^Start /}).click();await route(fallbackA,"exam");
 await fallbackA.locator("input[data-choice]").first().click();
 const fallbackId=await until(async()=>fallbackA.evaluate(()=>{
  const arr=JSON.parse(localStorage.getItem("practiceDesk.history.fallback")??"[]");
  return arr.find(x=>x.recordType==="generic-attempt"&&x.state.responses.some(r=>r.response))?.id;
 }),"durable localStorage fallback answer");
 // Freeze tab A's generation before opening B. Leaving A actively on Exam
 // permits its legitimate 10-second timer checkpoint to race B's hydration,
 // which tests scheduling luck rather than concurrent-storage detection.
 await fallbackA.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(fallbackA,"library");
 await fallbackB.goto(offlineUrl,{waitUntil:"load"});
 await fallbackB.locator('[data-attempt="'+fallbackId+'"]').first().click();await route(fallbackB,"exam");
 await fallbackB.locator("input[data-choice]").nth(1).click();
 await fallbackA.locator(".generic-warning").filter({hasText:"Fallback history changed"}).waitFor();
 const backupEvent=fallbackA.waitForEvent("download");
 await fallbackA.locator("#g-export-history").click();
 const backup=JSON.parse(await readFile(await (await backupEvent).path(),"utf8"));
 check(backup.version===5&&backup.records.some(x=>x.id===fallbackId),
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
 await readFailure.getByRole("button",{name:/^Start /}).click();
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
 await quota.getByRole("button",{name:/^Start /}).click();await route(quota,"exam");
 await quota.locator(".generic-warning").filter({hasText:"SAVE FAILED"}).waitFor();
 await quota.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(quota,"library");
 const emergency=quota.waitForEvent("download");
 await quota.locator("#g-export-history").click();
 const downloaded=await emergency;
 check(downloaded.suggestedFilename().includes("UNSAVED_RECOVERY"),
  "Unsaved emergency export did not identify potentially non-durable material");
 const recovered=JSON.parse(await readFile(await downloaded.path(),"utf8"));
 check(recovered.version===5&&recovered.records.some(x=>
  x.recordType==="generic-attempt"&&!initiallySaved.has(x.id))&&
  await quota.locator(".generic-warning").filter({hasText:"Emergency recovery file"}).count()===1,
  "Quota failure lost attempted record or failed to explain emergency backup");
 await quota.close();
 // Persist across an actual complete Chrome process/profile restart, not
 // merely a page.reload() or a fresh isolated in-memory browser context.
 const binary=chromePath();
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
  await originalPage.getByRole("button",{name:/^Start /}).click();await route(originalPage,"exam");
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
  await restored.getByRole("button",{name:/History & insights/}).click();await route(restored,"history");
  check(await restored.locator('[data-attempt="'+persistedId+'"]').count()===1,
   "Offline profile restart lost frozen result");
  await restored.getByRole("button",{name:/^(?:← )?Test library$/i}).click();await route(restored,"library");
  await restored.getByRole("button",{name:/Open learning desk/}).click();await route(restored,"learning");
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
}

export async function partialRecovery(){
// Consolidated from scripts/acceptance-partial-recovery.mjs; retained browser-only assertions remain intact.
/** P48 independent user-visible IndexedDB partial corruption/recovery gate.
 * Requires actual offline file:// and real persistent IndexedDB, not mocks.
 * Same capability runs on Chromium, Firefox and WebKit.
 */
const {readFile}=await import("node:fs/promises");
const {openHarness,check,route,records,offlineUrl}=await import("../../browser/fixtures.mjs");
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
try{
  await page.locator('[data-mode="single"]').click();
  await page.getByRole("button",{name:/^Start /}).click();
  await route(page,"exam");
  await page.locator("input[data-choice]").first().click();
  await page.locator("#g-submit").click();
  await route(page,"result");
  const good=(await records(page)).find(r=>r.recordType==="generic-attempt"&&r.finishedAt!==null);
  check(Boolean(good),"Cannot seed a durable completed attempt for corruption test");
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();
  await route(page,"library");

  // Independently corrupt one attempt reference AND one otherwise-unused
  // digest. Never mutate the completed, source-authenticated good attempt.
  await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{
      const q=indexedDB.open("practiceDesk.history",1);
      q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
    });
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(["attempts","snapshots"],"readwrite");
        const snapshots=tx.objectStore("snapshots");
        const get=snapshots.getAll();
        get.onsuccess=()=>{
          const seed=get.result[0];
          if(!seed){tx.abort();return;}
          snapshots.add({id:"snapshot:"+("0".repeat(64)),body:seed.body});
          tx.objectStore("attempts").add({
            recordType:"generic-attempt",id:"p48-corrupt-missing-snapshot",
            frozenRef:"snapshot:not-present",frozenAt:"2026-11-03T00:00:00.000Z"
          });
        };
        tx.oncomplete=()=>resolve();
        tx.onabort=()=>reject(tx.error??Error("P48 corruption seed transaction aborted"));
        tx.onerror=()=>reject(tx.error??Error("P48 corruption seed write failed"));
      });
    }finally{db.close();}
  });

  await page.reload({waitUntil:"load"});
  await page.locator(".generic-warning").filter({hasText:"STORAGE INTEGRITY WARNING"}).waitFor();
  const warning=await page.locator(".generic-warning").first().innerText();
  check(warning.includes("2 damaged storage entries")&&
    warning.includes("editing is locked")&&warning.includes("healthy records"),
    "Corrupt startup did not disclose quarantine, lock and healthy-only export");
  check(await page.getByRole("button",{name:/^Start /}).isDisabled(),
    "Corrupt database must be read-only instead of overwriting old records");
  check(await page.locator("#g-import-history").isDisabled(),
    "Unsafe backup import stayed enabled during integrity fault");

  await page.getByRole("button",{name:/History & insights/}).click();
  await route(page,"history");
  check(await page.locator('[data-attempt="'+good.id+'"]').count()===1,
    "Healthy completed attempt disappeared because of unrelated corrupt row");
  const backend=await page.locator("#g-storage-backend").innerText();
  check(backend.includes("IndexedDB")&&!backend.includes("fallback"),
    "One corrupt entry incorrectly switched the whole archive to fallback");

  const downloadEvent=page.waitForEvent("download");
  await page.locator("#g-export-history").click();
  const download=await downloadEvent;
  check(download.suggestedFilename().includes("UNSAVED_RECOVERY"),
    "Partial-recovery backup not clearly identified as exceptional");
  const archive=JSON.parse(await readFile(await download.path(),"utf8"));
  check(archive.version===5&&archive.records.some(r=>r.id===good.id)&&
    !archive.records.some(r=>r.id==="p48-corrupt-missing-snapshot"),
    "Recovery backup failed to preserve good attempt or leaked corrupted row");
  const preserved=await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{
      const q=indexedDB.open("practiceDesk.history",1);
      q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
    });
    try{
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction("attempts","readonly");
        const req=tx.objectStore("attempts").get("p48-corrupt-missing-snapshot");
        req.onsuccess=()=>resolve(Boolean(req.result));
        req.onerror=()=>reject(req.error);
      });
    }finally{db.close();}
  });
  check(preserved,"Startup should quarantine, not destructively delete corrupt on-disk evidence");
  check(!errors.length,"P48 browser page errors: "+errors.join("; "));
  console.log("P48 INDEPENDENT RECOVERY PASS "+engine+
    " healthy attempt visible, corrupted row/snapshot isolated, read-only warning, guarded recovery export");
}catch(error){await h.diagnose("p48-partial-recovery-"+engine,page,error);throw error;}
finally{await context.close();await h.finish();}
}
