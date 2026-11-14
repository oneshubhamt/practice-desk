/** Stable product-domain browser scenarios. */

export async function fileNavigation(){
// Consolidated from scripts/acceptance-navigation.mjs; retained browser-only assertions remain intact.
/** Unified native and fragment-fallback offline navigation journeys.
 * Both original scenarios are retained in separate clean browser contexts;
 * sharing one Playwright browser launch removes repeated setup in each engine.
 * Historical source/coverage mapping: docs/TEST_SUITE_LEDGER.md.
 */
const {readFile}=await import("node:fs/promises");
const {openHarness,offlineUrl,check,route,records,claimNativeNavigation,assertNoOverflow}=await import("../../browser/fixtures.mjs");
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});

async function nativeNavigationJourney(){
/** New cross-browser modern critical path; validates clean shared-snapshot backup-v5 offline.
 * Requires actual native Navigation API; no router polyfill or silent browser skip.
 */

const {page,context,errors}=await h.open();
try{
 check(await claimNativeNavigation(page),engine+" lacks native Navigation API; explicit unsupported gate");
 check((await page.locator("#g-papers option").count())>0,"offline bank not loaded");
 await page.locator('[data-mode="free"]').click();
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 const attemptId=new URL(await page.url()).searchParams.get("attempt");
 check(Boolean(attemptId),engine+" attempt URL identity missing");
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-flag").click();
 await page.getByRole("button",{name:/Library/}).click();await route(page,"library");
 const savedRow=(await records(page)).find(x=>x.id===attemptId);
 check(savedRow?.state?.responses?.some(x=>x.response)&&savedRow.finishedAt===null,
  engine+" save/checkpoint did not persist");
 await page.getByRole("button",{name:/History & insights/}).click();await route(page,"history");
 const file=page.waitForEvent("download");
 await page.locator("#g-export-history").click();
 const download=await file;
 const exported=JSON.parse(await readFile(await download.path(),"utf8"));
 check(exported.format==="practice-desk-backup"&&exported.version===5&&
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
 await page.getByRole("button",{name:/Library/}).click();await route(page,"library");
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
finally{await context.close();}

}
async function fragmentFallbackJourney(){
/** Real file:// fallback routing journey for Safari without Navigation API.
 * No polyfill, screenshots on failure only; tests real hashchange Back/Forward.
 */
const context=await h.browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();page.setDefaultTimeout(16000);
const errors=[];
page.on("pageerror",e=>errors.push(String(e)));
page.on("dialog",d=>void d.accept());
try{
 // Simulate older Safari/WebKit before the first script executes.
 await page.addInitScript(()=>{
  Object.defineProperty(window,"navigation",{configurable:true,value:undefined});
 });
 await page.goto(offlineUrl,{waitUntil:"load"});
 check(await page.evaluate(()=>typeof window.navigation?.navigate!=="function"),
  engine+" Navigation API absence was not reproduced");
 await page.locator("#g-papers").waitFor({state:"visible"});
 // Visible selectors can render before asynchronous two-store hydration finishes.
 // Wait for genuine readiness, not merely a pre-hydration placeholder.
 await page.waitForFunction(()=>document.querySelector("#g-start")?.disabled===false);
 check(await page.getByRole("button",{name:/^Start /}).isEnabled(),engine+" fallback failed to boot Library");
 await page.locator('[data-mode="free"]').click();
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 let fragment=new URL(await page.url()).hash;
 check(fragment.startsWith("#pd=exam&attempt="),
  engine+" fallback did not keep route in same-document fragment");
 const id=new URLSearchParams(fragment.slice(1)).get("attempt");
 check(Boolean(id),"fragment attempt id not pinned");
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-flag").click();
 await page.getByRole("button",{name:/Library/}).click();await route(page,"library");
 check(new URL(await page.url()).hash==="#pd=library",
  engine+" Library fragment not updated");
 const saved=(await records(page)).find(a=>a.id===id);
 check(saved?.finishedAt===null&&saved.state.responses.some(r=>r.response),
  engine+" saved attempt not checkpointed by fallback routing");
 await page.getByRole("button",{name:/History & insights/}).click();await route(page,"history");
 check(new URL(await page.url()).hash==="#pd=history","History fragment not updated");
 // The browser's own Back and Forward buttons must restore SPA content.
 await page.evaluate(()=>history.back());await route(page,"library");
 check(new URL(await page.url()).hash==="#pd=library",
  engine+" browser Back did not restore Library fragment");
 await page.evaluate(()=>history.forward());await route(page,"history");
 check(new URL(await page.url()).hash==="#pd=history",
  engine+" browser Forward did not restore History fragment");
 await page.reload({waitUntil:"load"});await route(page,"history");
 await page.locator('[data-attempt="'+id+'"]').first().click();await route(page,"exam");
 check((new URLSearchParams(new URL(await page.url()).hash.slice(1))).get("attempt")===id,
  "reopened exam lost deep-link identity");
 check(await page.locator('input[data-choice]:checked').count()===1,
  "reopened exam lost persisted answer");
 await page.reload({waitUntil:"load"});await route(page,"exam");
 check(await page.locator('input[data-choice]:checked').count()===1,
  "fragment deep-link reload lost persisted answer");
 await page.getByRole("button",{name:/Library/}).click();await route(page,"library");
 await page.evaluate(()=>{location.hash="#pd=exam&attempt=not-a-real-attempt";});
 await route(page,"library");
 check((await page.locator(".generic-warning").innerText()).includes("unavailable"),
  "invalid fragment deep link was not recovered");
 await assertNoOverflow(page,engine+" fallback Library");
 check(errors.length===0,engine+" fallback runtime errors "+errors.join("; "));
 await h.evidence("safari-fallback-"+engine,{browser:engine,mode:"no Navigation API",
  fragmentHistoryBackForward:true,deepLinkReload:true,saveResume:true,invalidRouteRepaired:true});
 console.log("MODERN SAFARI FALLBACK "+engine+" PASS: no API boot, same-file fragment routes, Back/Forward, saved exam reload and invalid-link recovery");
}catch(e){await h.diagnose("safari-fallback-"+engine,page,e);throw e;}
finally{await context.close();}

}
try{
 await nativeNavigationJourney();
 await fragmentFallbackJourney();
 console.log("NAVIGATION JOURNEYS "+engine+" PASS: native + absent-API fallback, offline/restore/backup");
}finally{
 await h.finish();
}
}
