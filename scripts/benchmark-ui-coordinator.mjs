/** P47-0 diagnostic baseline, not a new user feature or a universal performance target.
 * Measures actual single-file file:// Chromium History redraw and coordinator
 * focus/DOM churn on current frozen records; keeps app runtime untouched.
 * Run: npm run build && node scripts/benchmark-ui-coordinator.mjs
 */
import {performance} from "node:perf_hooks";
import {openHarness,route,check,assertNoOverflow} from "./browser/fixtures.mjs";

const sizes=[0,100,1000,1600], repeats=2;
const h=await openHarness({artifactDir:"artifacts/p47-baseline"});
const {page,context,errors}=await h.open({reducedMotion:"reduce"});
page.setDefaultTimeout(120000);
const observations=[];
const last=(a)=>a.toSorted((x,y)=>x-y)[Math.floor(a.length/2)]??null;
const round=(x)=>typeof x==="number"?Math.round(x*100)/100:x;

// Observe the app root itself, rather than monkey-patching application code;
// the observer and sync-duration clock exist only during a user-equivalent UI event.
async function actionSample(selector,value,eventName){
 return page.evaluate(async({selector,value,eventName})=>{
  const root=document.getElementById("app");
  const el=document.querySelector(selector);
  if(!(root instanceof HTMLElement)||!(el instanceof HTMLElement))
    throw Error("P47-0 target/root missing "+selector);
  const before={nodeCount:root.querySelectorAll("*").length,top:scrollY,
    focused:(document.activeElement instanceof HTMLElement?document.activeElement.id:null)};
  let replacements=0,removed=0,added=0;
  const observer=new MutationObserver(mutations=>{
   for(const m of mutations)if(m.target===root&&m.type==="childList"){
    replacements++;removed+=m.removedNodes.length;added+=m.addedNodes.length;
   }
  });
  observer.observe(root,{childList:true});
  if("value" in el)el.value=value;
  const started=performance.now();
  el.dispatchEvent(new Event(eventName,{bubbles:true}));
  const jsMs=performance.now()-started;
  await Promise.resolve();observer.disconnect();
  const input=document.querySelector(selector);
  return {jsMs,nodeBefore:before.nodeCount,nodeAfter:root.querySelectorAll("*").length,
   rootReplaceEvents:replacements,rootNodesRemoved:removed,rootNodesAdded:added,
   focusBefore:before.focused,focusAfter:document.activeElement instanceof HTMLElement?
    document.activeElement.id:null,scrollBefore:before.top,scrollAfter:scrollY,
   text:(input&&"value" in input?input.value:null),
   caret:input instanceof HTMLInputElement?input.selectionStart:null,
   innerWidth,documentWidth:document.documentElement.scrollWidth};
 },{selector,value,eventName});
}
async function memory(){
 try{
  const cdp=await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const report=await cdp.send("Performance.getMetrics");
  await cdp.detach();
  return report.metrics.find(x=>x.name==="JSHeapUsedSize")?.value??null;
 }catch{return null;}
}
async function reload(){
 await page.reload({waitUntil:"load",timeout:120000});
 await page.waitForFunction(()=>document.querySelector("#g-import")?.disabled===false,null,{timeout:120000});
 await route(page,"library");
}
async function profile(count){
 const cold=performance.now();await reload();const coldOpen=performance.now()-cold;
 const visit=performance.now();
 await page.locator("#g-history").click();await route(page,"history");
 const historyMs=performance.now()-visit;
 const actual=await page.locator(".history-entries .archive-entry").count();
 check(actual===count,"P47-0 frozen History rows incorrect "+actual+" vs "+count);
 const input=page.locator("#g-history-search");
 const searchSamples=[],sortSamples=[];
 for(let i=0;i<repeats;i++){
  await input.focus();
  const s=await actionSample("#g-history-search","CGL","input");
  searchSamples.push(s);
  check(s.text==="CGL"&&s.focusAfter==="g-history-search",
   "P47-0 History redraw lost focused search/typed value at "+count);
  await actionSample("#g-history-search","","input");
  sortSamples.push(await actionSample("#g-history-sort",i%2?"oldest":"newest","change"));
 }
 // Real keyboard-style user input and caret preservation, not just synthetic dispatch.
 await input.fill("CG");await input.press("End");await input.press("KeyL");
 const caret=await page.evaluate(()=>{
  const x=document.getElementById("g-history-search");
  return {value:x?.value,active:document.activeElement===x,
   start:x?.selectionStart,end:x?.selectionEnd};
 });
 check(caret.active&&caret.value==="CGL"&&caret.start===3&&caret.end===3,
  "P47-0 search caret/focus failed after a real key event at "+count+": "+JSON.stringify(caret));
 await input.fill("");
 const summary={count,environment:"headless Linux Chrome / offline file://",
  repeats,coldOpenMs:round(coldOpen),historyEntryMs:round(historyMs),
  searchSyncJsMedianMs:round(last(searchSamples.map(x=>x.jsMs))),
  searchSyncJsMaxMs:round(Math.max(...searchSamples.map(x=>x.jsMs))),
  sortSyncJsMedianMs:round(last(sortSamples.map(x=>x.jsMs))),
  rootReplaceEventsPerSearch:searchSamples.map(x=>x.rootReplaceEvents),
  removedRootNodesPerSearch:searchSamples.map(x=>x.rootNodesRemoved),
  domNodes:searchSamples[0].nodeAfter,caret,
  heapBytes:await memory(),documentWidth:await page.evaluate(()=>document.documentElement.scrollWidth)};
 observations.push(summary);
 await page.locator("#g-library").click();await route(page,"library");
 console.log("P47-0 HISTORY "+JSON.stringify(summary));
}
async function seedTo(count,sourceId){
 const expected=count-1;
 const actual=await page.evaluate(async({count,sourceId})=>{
  const db=await new Promise((ok,fail)=>{
   const req=indexedDB.open("practiceDesk.shared.v1",1);
   req.onsuccess=()=>ok(req.result);req.onerror=()=>fail(req.error);
  });
  try{
   const store=db.transaction("attempts","readonly").objectStore("attempts");
   const get=req=>new Promise((ok,fail)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>fail(req.error)});
   const [base,before]=await Promise.all([get(store.get(sourceId)),get(store.getAllKeys())]);
   if(!base?.frozenRef||!base.finishedAt)throw Error("P47-0 completed shared source missing");
   const current=before.filter(x=>String(x).startsWith("p47-archive-")).length;
   if(current>count-1)throw Error("P47-0 cannot decrease seed count");
   const tx=db.transaction("attempts","readwrite");
   for(let i=current;i<count-1;i++){
    const shift=(i+1)*60000;
    tx.objectStore("attempts").add({...base,id:"p47-archive-"+String(i).padStart(5,"0"),
      startedAt:base.startedAt+shift,updatedAt:base.updatedAt+shift,
      finishedAt:base.finishedAt+shift,saveRevision:1});
   }
   await new Promise((ok,fail)=>{tx.oncomplete=ok;tx.onabort=()=>fail(tx.error);tx.onerror=()=>fail(tx.error)});
   const verify=db.transaction("attempts","readonly").objectStore("attempts").count();
   return await get(verify);
  }finally{db.close();}
 },{count,sourceId});
 check(actual===count,"P47-0 seeded compact attempts mismatch "+actual+" vs "+count);
}
async function examine100Questions(){
 await page.locator('[data-mode="strict"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 const samples=[];
 samples.push(await actionSample("#g-next",undefined,"click"));
 const media=await page.evaluate(()=>({
  images:document.querySelectorAll("#app .generic-figure").length,
  appNodes:document.querySelectorAll("#app *").length,
  radio:document.querySelectorAll("#app input[type=radio]").length,
  focused:document.activeElement?.id??null,
  actualWidths:{document:document.documentElement.scrollWidth,viewport:innerWidth}
 }));
 for(let s=0;s<4;s++)await page.locator("#g-submit").click();
 await route(page,"result");
 const id=new URL(page.url()).searchParams.get("attempt");
 check(Boolean(id),"P47-0 completed attempt missing");
 const overviewNodes=await page.locator("#app *").count();
 const review=await actionSample("#result-tab-review",undefined,"click");
 const reviewCount=await page.locator("#result-review .generic-review").count();
 check(reviewCount===100,"P47-0 100-question review incomplete");
 const reviewNodes=await page.locator("#app *").count();
 const timing=await actionSample("#result-tab-timing",undefined,"click");
 const timingRows=await page.locator("#result-timing tbody tr").count();
 check(timingRows===100,"P47-0 100-question timing incomplete");
 const result={examNavigation:samples[0],media,overviewNodes,review:{...review,rows:reviewCount,domNodes:reviewNodes},
  timing:{...timing,rows:timingRows},recordId:id};
 console.log("P47-0 EXAM100 "+JSON.stringify(result));
 await page.locator("#g-library").click();await route(page,"library");
 return result;
}
async function responsive(){
 const result=[];
 for(const viewport of [{width:390,height:844},{width:195,height:844}]){
  await page.setViewportSize(viewport);
  await page.locator("#displayTrigger").click();
  while(await page.locator("#fontReset").innerText()!=="140%"){
   const current=await page.locator("#fontReset").innerText();
   check(Number.parseInt(current)<140,"P47-0 cannot reach font scaling target");
   await page.locator("#fontMore").click();
  }
  await page.locator("#displayClose").click();
  await page.locator("#g-history").click();await route(page,"history");
  const layout=await assertNoOverflow(page,"P47-0 history "+viewport.width+"px at 140%");
  const summary={width:viewport.width,scale:140,scroll:layout.scroll,
   viewport:layout.width,entries:await page.locator(".archive-entry").count(),
   nodes:await page.locator("#app *").count()};
  result.push(summary);
  await page.locator("#g-library").click();await route(page,"library");
 }
 return result;
}
try{
 await profile(0);
 const exam100=await examine100Questions();
 for(const n of sizes.slice(1)){await seedTo(n,exam100.recordId);await profile(n);}
 const mobile=await responsive();
 check(!errors.length,"P47-0 browser errors: "+errors.join("; "));
 const summary={scope:"P47-0 only, measurement baseline not optimized app",
  measuredAt:new Date().toISOString(),node:process.version,
  environment:"GitHub Actions Linux Chromium when run in CI, Playwright Core, offline file://",
  caveats:["Only one content-heavy CGL source graph reused for archive copies",
   "Browser orchestration and CI-machine load affect wall durations",
   "Synchronous event timing excludes paint/compositor; input search is an event-specific measurement",
   "No claim about physical Mac Safari, touch hardware, screen readers or OS storage eviction",
   "No screen rendering implementation modified and no speedup claimed"],
  sizes,repeats,history:observations,exam100,mobile};
 await h.evidence("p47-0-profile",summary);
 console.log("P47-0 PROFILE COMPLETE "+JSON.stringify({sizes,repeats,examReviewQuestions:100,
  responsive:mobile.map(x=>x.width),source:"current app untouched"}));
}catch(e){await h.diagnose("p47-0-baseline",page,e);throw e;}
finally{await context.close();await h.finish();}
