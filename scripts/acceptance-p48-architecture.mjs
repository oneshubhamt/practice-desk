/** P48-2 source-backed architecture acceptance on real offline file://.
 * Same-question redraws preserve input DOM/focus and new-navigation behavior.
 * An IDB getAll() tripwire proves cold startup uses streaming cursors.
 */
import {openHarness,check,route,records} from "./browser/fixtures.mjs";

const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
try{
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 const attemptId=new URL(await page.url()).searchParams.get("attempt");
 check(Boolean(attemptId),"P48-2 exam attempt URL missing");
 check(await page.locator('input[data-choice]').count()===4,
   engine+" expected actual built-in four-choice question");
 await page.evaluate(()=>{
   window.__p48ExamInput=document.querySelector('input[data-choice]');
   window.__p48ExamHeading=document.querySelector(".generic-heading");
   window.__p48ExamContainer=document.querySelector(".exam-question");
 });
 await page.locator('input[data-choice]').first().click();
 const answer=await page.evaluate(()=>({
   preservedInput:window.__p48ExamInput===document.querySelector('input[data-choice]'),
   preservedHeading:window.__p48ExamHeading===document.querySelector(".generic-heading"),
   preservedQuestion:window.__p48ExamContainer===document.querySelector(".exam-question"),
   inputActive:document.activeElement===window.__p48ExamInput,
   checked:window.__p48ExamInput?.checked===true
 }));
 check(answer.preservedInput&&answer.preservedHeading&&answer.preservedQuestion&&
   answer.inputActive&&answer.checked,
   engine+" same-question ANSWER redrew/disconnected focused content: "+JSON.stringify(answer));
 await page.locator("#g-flag").click();
 const flag=await page.evaluate(()=>({
   preservedInput:window.__p48ExamInput===document.querySelector('input[data-choice]'),
   preservedHeading:window.__p48ExamHeading===document.querySelector(".generic-heading"),
   checked:window.__p48ExamInput?.checked===true,
   flagged:document.querySelector('[data-q="0"]')?.classList.contains("marked")??false
 }));
 check(flag.preservedInput&&flag.preservedHeading&&flag.checked&&flag.flagged,
   engine+" same-question FLAG redrew or lost marks: "+JSON.stringify(flag));
 await page.locator("#g-next").click();
 check(!(await page.evaluate(()=>window.__p48ExamInput?.isConnected)),
   engine+" navigating to another question kept the previous question control");
 await page.locator("#g-prev").click();
 check(await page.locator('input[data-choice]:checked').count()===1,
   engine+" response lost when returning from a new question");
 await page.locator("#g-library").click();await route(page,"library");

 const persisted=(await records(page)).find(record=>record.id===attemptId);
 check(persisted?.recordType==="generic-attempt"&&
   persisted.state.responses.some(row=>row.response?.kind==="single-choice"),
   engine+" source-based compact attempt not saved");

 // This JavaScript is a test-only pre-page-init tripwire. It does not persist
 // into the user's compiled HTML or interfere with post-start user export.
 await context.addInitScript(()=>{
   window.__p48UnboundedReads=0;
   IDBObjectStore.prototype.getAll=function(){
     window.__p48UnboundedReads++;
     throw Error("P48-2 unbounded IDB getAll() invoked during startup");
   };
 });
 await page.reload({waitUntil:"load"});
 await page.locator("#g-import").waitFor({state:"visible"});
 await page.waitForFunction(()=>document.querySelector("#g-import")?.disabled===false);
 const startup=await page.evaluate(()=>({
   getAllCalls:window.__p48UnboundedReads,
   backend:document.querySelector("#g-storage-backend")?.textContent??"",
   warning:document.querySelector(".generic-warning")?.textContent??""
 }));
 check(startup.getAllCalls===0,
   engine+" startup cloned all records using forbidden getAll()");
 await page.locator("#g-history").click();await route(page,"history");
 check(await page.locator('[data-attempt="'+attemptId+'"]').count()===1,
   engine+" cursor hydration lost the previously answered attempt");
 check((await page.locator("#g-storage-backend").innerText()).includes("IndexedDB"),
   engine+" no-getAll cold startup fell back to localStorage");
 check(!errors.length,engine+" runtime error "+errors.join("; "));
 console.log("P48-2 ARCHITECTURE "+engine+" PASS: same-question DOM/focus preserved, other-question navigation and IndexedDB cursor hydration verified; getAll calls="+startup.getAllCalls);
}catch(error){await h.diagnose("p48-architecture-"+engine,page,error);throw error;}
finally{await context.close();await h.finish();}
