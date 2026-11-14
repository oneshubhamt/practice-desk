/** Stable product-domain browser scenarios. */

export async function resultStress(){
// Consolidated from scripts/acceptance-stress.mjs; retained browser-only assertions remain intact.
/** Bounded modern stress: current lazy Results DOM and History with 80 frozen records.
 * No historical SHA/screenshots or environment-specific frame-time targets.
 */
const {performance}=await import("node:perf_hooks");
const {openHarness,check,route,records,assertNoOverflow}=await import("../../browser/fixtures.mjs");
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
try{
 await page.locator('[data-mode="strict"]').click();
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 for(let section=0;section<4;section++)await page.locator("#g-submit").click();
 await route(page,"result");
 const id=new URL(await page.url()).searchParams.get("attempt");
 const frozen=(await records(page)).find(x=>x.id===id);
 check(frozen?.result?.items?.length===100,"100-item frozen review fixture absent");
 const before=await page.evaluate(()=>({
  nodes:document.querySelectorAll("#app *").length,
  review:document.querySelectorAll("#result-review .generic-review").length,
  timings:document.querySelectorAll("#result-timing tbody tr").length
 }));
 check(before.review===0&&before.timings===0,"inactive 100-question panes materialized eagerly");
 await page.locator("#result-tab-review").click();
 await page.locator("#result-review").waitFor({state:"visible"});
 check(await page.locator("#result-review .generic-review").count()===100,"100-question Review incomplete");
 const reviewNodes=await page.locator("#app *").count();
 check(reviewNodes>before.nodes,"Review did not lazily add DOM nodes");
 check(await page.locator("#result-timing tbody tr").count()===0,
  "Review unexpectedly rendered inactive Timing pane");
 await page.locator("#result-tab-timing").click();
 await page.locator("#result-timing").waitFor({state:"visible"});
 check(await page.locator("#result-timing tbody tr").count()===100,"100-question Timing incomplete");
 check(await page.locator(".generic-review").count()===0,
  "Timing displayed inactive 100-question review");
 const after=await page.locator("#app *").count();
 check(after<15000,"unbounded active-only Result DOM regression: "+after+" nodes");
 await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
 const count=80;
 await page.evaluate(async ({baseId,n})=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open("practiceDesk.history",1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  try{
   const source=await new Promise((resolve,reject)=>{
    const req=db.transaction("attempts","readonly").objectStore("attempts").get(baseId);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   if(!source||source.recordType!=="generic-attempt")throw Error("Frozen stress fixture missing");
   await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readwrite");
    for(let i=0;i<n;i++)tx.objectStore("attempts")
     .add({...source,id:"modern-stress-"+i,saveRevision:1});
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });
  }finally{db.close();}
 },{baseId:id,n:count});
 const started=performance.now();
 await page.reload({waitUntil:"load"});await route(page,"library");
 await page.getByRole("button",{name:/History & insights/}).click();await route(page,"history");
 await page.locator('[data-attempt="modern-stress-79"]').waitFor({state:"visible"});
 const elapsedMs=performance.now()-started;
 check(elapsedMs<30000,"80-record History startup exceeds generous 30s guardrail: "+elapsedMs);
 check((await records(page)).filter(x=>x.id.startsWith("modern-stress-")).length===count,
  "80-record seed was truncated");
 const layout=await assertNoOverflow(page,"80-record History");
 check(!errors.length,"uncaught browser exceptions "+errors.join("; "));
 await h.evidence("stress-summary",{case:"80-record history plus 100-item result lazy panes",
  historyMs:Math.round(elapsedMs),historyCount:count,
  resultDom:{overview:before.nodes,review:reviewNodes,timing:after},
  historyViewport:layout});
 console.log("MODERN STRESS PASS 80 persisted History records in "+
  Math.round(elapsedMs)+"ms; 100-item panes lazy; DOM "+
  JSON.stringify({overview:before.nodes,review:reviewNodes,timing:after}));
}catch(e){await h.diagnose("stress",page,e);throw e;}
finally{await context.close();await h.finish();}
}
