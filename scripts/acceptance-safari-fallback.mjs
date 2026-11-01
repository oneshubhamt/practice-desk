/** Real file:// fallback routing journey for Safari without Navigation API.
 * No polyfill, screenshots on failure only; tests real hashchange Back/Forward.
 */
import {openHarness,offlineUrl,check,route,records,assertNoOverflow} from "./browser/fixtures.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
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
 check(await page.locator("#g-start").isEnabled(),engine+" fallback failed to boot Library");
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 let fragment=new URL(await page.url()).hash;
 check(fragment.startsWith("#pd=exam&attempt="),
  engine+" fallback did not keep route in same-document fragment");
 const id=new URLSearchParams(fragment.slice(1)).get("attempt");
 check(Boolean(id),"fragment attempt id not pinned");
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-flag").click();
 await page.locator("#g-library").click();await route(page,"library");
 check(new URL(await page.url()).hash==="#pd=library",
  engine+" Library fragment not updated");
 const saved=(await records(page)).find(a=>a.id===id);
 check(saved?.finishedAt===null&&saved.state.responses.some(r=>r.response),
  engine+" saved attempt not checkpointed by fallback routing");
 await page.locator("#g-history").click();await route(page,"history");
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
 await page.locator("#g-library").click();await route(page,"library");
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
finally{await context.close();await h.finish();}
