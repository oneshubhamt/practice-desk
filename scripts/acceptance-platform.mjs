/** New cross-browser modern critical path; run separately on chromium/firefox/webkit.
 * Requires actual native Navigation API; no router polyfill or silent browser skip.
 */
import {readFile} from "node:fs/promises";
import {openHarness,check,route,records,claimNativeNavigation,assertNoOverflow} from "./browser/fixtures.mjs";

const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
try{
 check(await claimNativeNavigation(page),engine+" lacks native Navigation API; explicit unsupported gate");
 check((await page.locator("#g-papers option").count())>0,"offline bank not loaded");
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 const attemptId=new URL(await page.url()).searchParams.get("attempt");
 check(Boolean(attemptId),engine+" attempt URL identity missing");
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-flag").click();
 await page.locator("#g-library").click();await route(page,"library");
 const savedRow=(await records(page)).find(x=>x.id===attemptId);
 check(savedRow?.state?.responses?.some(x=>x.response)&&savedRow.finishedAt===null,
  engine+" save/checkpoint did not persist");
 await page.locator("#g-history").click();await route(page,"history");
 const file=page.waitForEvent("download");
 await page.locator("#g-export-history").click();
 const download=await file;
 const exported=JSON.parse(await readFile(await download.path(),"utf8"));
 check(exported.format==="practice-desk-backup"&&exported.version===3&&
  exported.manifest?.recordCount===exported.records.length,
  engine+" verified backup metadata missing");
 check(exported.records.some(x=>x.id===attemptId&&x.state.responses.some(r=>r.response)),
  engine+" saved response absent from exported backup");
 await page.reload({waitUntil:"load"});await route(page,"history");
 await page.locator('[data-attempt="'+attemptId+'"]').first().click();await route(page,"exam");
 await page.locator('input[data-choice]:checked').first().waitFor({state:"visible"});
 check(await page.locator('[data-q="0"]').evaluate(x=>x.classList.contains("marked")),
  engine+" restored flag lost");
 const routeBefore=await page.url();
 await page.locator("#g-next").click();
 check(await page.url()===routeBefore,
  engine+" question navigation pushed an unwanted browser history entry");
 await page.locator("#g-library").click();await route(page,"library");
 const nativeHistory=await page.evaluate(()=>({
  canGoBack:window.navigation?.canGoBack??false,
  canGoForward:window.navigation?.canGoForward??false,
  count:window.navigation?.entries()?.length??0
 }));
 let backForwardStatus="unsupported: browser did not expose usable same-document Back after file reload";
 if(nativeHistory.canGoBack){
  try{
   await page.evaluate(()=>navigation.back().finished);
   await route(page,"exam");
   check(new URL(await page.url()).searchParams.get("attempt")===attemptId,
    engine+" native Back lost exam identity");
   await page.evaluate(()=>navigation.forward().finished);
   await route(page,"library");
   backForwardStatus="verified";
  }catch(e){
   console.error("MODERN PLATFORM "+engine+" native history advertised but failed",e);
   throw e;
  }
 }else{
  console.warn("MODERN PLATFORM LIMITATION "+engine+" native Back unavailable on file:// after reload; state="+
   JSON.stringify(nativeHistory));
 }
 await assertNoOverflow(page,engine+" Library");
 check(!errors.length,engine+" runtime exceptions "+errors.join("; "));
 await h.evidence(engine+"-platform",{engine,backupRecords:exported.records.length,
  nativeBackForward:backForwardStatus,nativeHistory,restoredAttempt:attemptId,verified:true});
 console.log("MODERN PLATFORM "+engine+" PASS: offline, persistence, backup, reload; Native Back/Forward: "+backForwardStatus);
}catch(e){console.error("MODERN PLATFORM "+engine+" failing check",e);await h.diagnose("platform-"+engine,page,e);throw e;}
finally{await context.close();await h.finish();}
