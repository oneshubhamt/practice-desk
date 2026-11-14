/** P48 independent user-visible IndexedDB partial corruption/recovery gate.
 * Requires actual offline file:// and real persistent IndexedDB, not mocks.
 * Same capability runs on Chromium, Firefox and WebKit.
 */
import {readFile} from "node:fs/promises";
import {openHarness,check,route,records,offlineUrl} from "./browser/fixtures.mjs";

const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
try{
  await page.locator('[data-mode="single"]').click();
  await page.locator("#g-start").click();
  await route(page,"exam");
  await page.locator("input[data-choice]").first().click();
  await page.locator("#g-submit").click();
  await route(page,"result");
  const good=(await records(page)).find(r=>r.recordType==="generic-attempt"&&r.finishedAt!==null);
  check(Boolean(good),"Cannot seed a durable completed attempt for corruption test");
  await page.locator("#g-library").click();
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
  check(await page.locator("#g-start").isDisabled(),
    "Corrupt database must be read-only instead of overwriting old records");
  check(await page.locator("#g-import-history").isDisabled(),
    "Unsafe backup import stayed enabled during integrity fault");

  await page.locator("#g-history").click();
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
