/** Modern-safe destructive intent, validated backup restore and storage fallback.
 * Focused current-app contracts; legacy Pass13/18 and smoke remain live until Pass39.
 */
import {readFile} from "node:fs/promises";
import {openHarness,offlineUrl,records,check,route,assertNoOverflow} from "./browser/fixtures.mjs";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
try{
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator('input[data-choice]').first().click();
 const draftId=new URL(await page.url()).searchParams.get("attempt");
 await page.locator("#g-library").click();await route(page,"library");
 check(await page.locator('[data-discard="'+draftId+'"]').count()===1,
  "unfinished must expose Discard, not completed Delete");
 check(await page.locator('[data-delete="'+draftId+'"]').count()===0,
  "unfinished mistakenly exposes completed deletion");
 await page.locator('[data-discard="'+draftId+'"]').click();
 check(!(await records(page)).some(x=>x.id===draftId),
  "confirmed unfinished Discard did not persist");
 await page.locator('[data-mode="single"]').click();
 await page.locator("#g-single-section").selectOption("0");
 await page.locator("#g-start").click();await route(page,"exam");
 const resultId=new URL(await page.url()).searchParams.get("attempt");
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-submit").click();await route(page,"result");
 const original=(await records(page)).find(x=>x.id===resultId);
 check(original?.finishedAt!==null&&original?.result?.items?.length===25,
  "completed frozen exam missing");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-history").click();await route(page,"history");
 const resultDelete=page.locator('[data-delete="'+resultId+'"]');
 check(await resultDelete.count()===1,"completed result lacks explicit Delete");
 check(await page.locator('[data-discard="'+resultId+'"]').count()===0,
  "completed result exposes unfinished Discard");
 const pending=page.waitForEvent("download");
 await page.locator("#g-export-history").click();
 const archive=JSON.parse(await readFile(await (await pending).path(),"utf8"));
 check(archive.format==="practice-desk-backup"&&archive.version===3&&
  archive.manifest?.recordCount===archive.records.length,
  "export is not an integrity-verified v3 complete backup");
 check(archive.records.some(x=>x.id===resultId&&x.result.snapshot.earnedMarks===
  original.result.snapshot.earnedMarks),"backup omitted frozen result");
 await resultDelete.click();
 check(!(await records(page)).some(x=>x.id===resultId),
  "completed Delete did not remove the result");
 await page.locator("#g-history-file").setInputFiles({name:"backup.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(archive))});
 await page.locator('[data-delete="'+resultId+'"]').waitFor({state:"visible"});
 const restored=(await records(page)).find(x=>x.id===resultId);
 check(restored?.result?.snapshot?.earnedMarks===original.result.snapshot.earnedMarks,
  "restored immutable marks differ from exported frozen result");
 await page.locator("#g-history-file").setInputFiles({name:"backup-again.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(archive))});
 check((await records(page)).filter(x=>x.id===resultId).length===1,
  "re-import overwrote or duplicated the existing saved identity");
 await assertNoOverflow(page,"restored History");
 // Current native routing handles a missing local record conservatively.
 await page.evaluate(async()=>{
  const to=new URL(location.href);
  to.searchParams.set("pd","exam");to.searchParams.set("attempt","nonexistent-modern-test-id");
  to.searchParams.delete("tab");
  try{await navigation.navigate(to.href).finished;}catch{/* redirect may abort stale destination */}
 });
 await route(page,"library");
 check((await page.locator(".generic-warning").innerText()).includes("unavailable"),
  "invalid deep link did not explain missing record");
 // A fresh tab with IDB denied must still provide an explicit fallback backend.
 const fallback=await context.newPage();
 const fallbackErrors=[];
 fallback.on("pageerror",err=>fallbackErrors.push(String(err)));
 fallback.on("dialog",d=>void d.accept());
 await fallback.addInitScript(()=>Object.defineProperty(window,"indexedDB",
  {configurable:true,value:undefined}));
 await fallback.goto(offlineUrl,{waitUntil:"load"});
 await fallback.locator("#g-start").waitFor({state:"visible"});
 await fallback.locator('[data-mode="free"]').click();
 await fallback.locator("#g-start").click();
 await fallback.locator('input[data-choice]').first().click();
 await fallback.locator("#g-library").click();
 await fallback.locator("#g-history").click();
 await fallback.locator("#g-storage-backend").waitFor({state:"visible"});
 check((await fallback.locator("#g-storage-backend").innerText()).includes("localStorage fallback"),
  "denied IndexedDB should explicitly report fallback");
 const fallbackFile=fallback.waitForEvent("download");
 await fallback.locator("#g-export-history").click();
 const fallbackBackup=JSON.parse(await readFile(await (await fallbackFile).path(),"utf8"));
 check(fallbackBackup.version===3&&fallbackBackup.records.some(x=>
  x.recordType==="generic-attempt"&&x.state.responses.some(r=>r.response)),
  "fallback export did not include saved answers");
 check(!fallbackErrors.length,"fallback page errors "+fallbackErrors.join("; "));
 check(!errors.length,"runtime errors "+errors.join("; "));
 await h.evidence("recovery-summary",{discardedDraft:true,deletedAndRestored:true,
  additiveReimport:true,invalidDeepLinkRecovered:true,localStorageFallbackExport:true});
 console.log("MODERN RECOVERY PASS: Discard/Delete distinction, v3 restore, idempotent import, invalid link, fallback");
}catch(e){await h.diagnose("recovery",page,e);throw e;}
finally{await context.close();await h.finish();}
