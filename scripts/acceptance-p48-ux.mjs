/** P48-3 user-facing file:// checks, not historical pixel parity. */
import {openHarness,check,route,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {pkg as sixKinds} from "../tests/fixtures/six-kinds.mjs";
import {captureVisualEvidence} from "./browser/visual-evidence.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/p48-3-ux"});
const {page,context,errors}=await h.open({viewport:{width:1366,height:900}});
const out="artifacts/p48-3-ux";
try{
 await page.locator("#g-file").setInputFiles({name:"p48-six-kinds.json",
  mimeType:"application/json",buffer:Buffer.from(JSON.stringify(sixKinds))});
 await chooseModernPaper(page,sixKinds.paper.id);
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator('[data-section="1"]').click();
 await page.locator('[data-q="2"]').click();
 await page.locator("#g-text").fill("Original written response");
 await page.locator("#g-save").click();
 await page.locator("#g-submit").click();
 await route(page,"result");
 const attempt=(await records(page)).find(x=>x.packageId===sixKinds.paper.id&&x.finishedAt);
 check(Boolean(attempt),engine+" missing frozen written attempt");
 const originalScore=attempt.result.snapshot.earnedMarks;
 await page.locator("#result-tab-review").click();
 await page.locator("#result-review").waitFor({state:"visible"});
 check(new URL(await page.url()).searchParams.get("tab")==="review",
   engine+" review URL did not select the requested result pane");
 await page.locator('[data-manual-marks="rev-5"]').fill("1.25");
 await page.locator('[data-manual-note="rev-5"]').fill("Unsaved P48-3 rubric note");
 await page.evaluate(()=>{
   window.__p48Review=document.querySelector("#result-review");
   window.__p48Article=document.querySelector('[data-review-id="rev-5"]');
   window.__p48Note=document.querySelector('[data-manual-note="rev-5"]');
 });
 await page.locator("#g-review-filter").selectOption("pending");
 check(await page.evaluate(()=>window.__p48Review===document.querySelector("#result-review")&&
   window.__p48Article===document.querySelector('[data-review-id="rev-5"]')&&
   window.__p48Note===document.querySelector('[data-manual-note="rev-5"]')),
   engine+" reviewing pending items replaced retained live inputs");
 await page.locator("#g-review-filter").selectOption("all");
 check(await page.evaluate(()=>window.__p48Article===document.querySelector('[data-review-id="rev-5"]')),
   engine+" article reordered without stable frozen question identity");
 await page.locator("#g-review-filter").selectOption("correct");
 check(await page.locator('[data-manual-note="rev-5"]').count()===0,
   engine+" filtered-out question unexpectedly visible");
 await page.locator("#g-review-filter").selectOption("pending");
 check(await page.locator('[data-manual-marks="rev-5"]').inputValue()==="1.25"&&
   await page.locator('[data-manual-note="rev-5"]').inputValue()==="Unsaved P48-3 rubric note",
   engine+" unsaved grade vanished after filtering");
 await page.locator('[data-manual-marks="rev-5"]').fill("500");
 await page.locator('[data-manual-save="rev-5"]').click();
 check(await page.locator('[data-manual-note="rev-5"]').inputValue()==="Unsaved P48-3 rubric note",
   engine+" bad mark validation wiped draft note");
 await page.locator('[data-manual-marks="rev-5"]').fill("1.5");
 await page.locator('[data-manual-save="rev-5"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-manual-status="rev-5"]')?.textContent?.includes("No unsaved"));
 const saved=(await records(page)).find(x=>x.id===attempt.id);
 check(saved?.manualGrades?.some(x=>x.questionRevisionId==="rev-5"&&x.marks===1.5&&x.note==="Unsaved P48-3 rubric note")&&
    saved.result.snapshot.earnedMarks===originalScore,
    engine+" manual draft not safely committed separately from frozen score");
 await assertNoOverflow(page,engine+" result desktop");
 await captureVisualEvidence(page,out+"/"+engine+"-result-desktop.png",{fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await assertNoOverflow(page,engine+" result phone");
 await captureVisualEvidence(page,out+"/"+engine+"-result-phone.png",{fullPage:true});
 await page.locator("#g-library").click();await route(page,"library");
 await page.evaluate(()=>{window.__p48Picker=document.querySelector(".home-picker");});
 await page.locator("#g-untimed").check();
 check(await page.evaluate(()=>window.__p48Picker===document.querySelector(".home-picker")),
    engine+" unchanged Library picker was unnecessarily replaced");
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-heading").waitFor({state:"visible"});
 await page.evaluate(()=>{
   window.__p48Editor=document.querySelector("#pd-author-editor");
   document.querySelector("#g-untimed").click();
 });
 check(await page.evaluate(()=>window.__p48Editor?.isConnected&&
   Boolean(document.querySelector("#pd-author-heading"))),
   engine+" unrelated Library redraw destroyed active Wordgard");
 await page.locator("#pd-author-close").click();
 check(await page.locator("#pd-author-heading").count()===0&&
   await page.locator("#g-author-open").count()===1,
   engine+" closing Wordgard did not restore Library");
 await assertNoOverflow(page,engine+" Library phone");
 await captureVisualEvidence(page,out+"/"+engine+"-library-phone.png",{fullPage:true});
 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8;i++)await page.locator("#fontMore").click();
 await page.keyboard.press("Escape");
 await assertNoOverflow(page,engine+" narrow 195px/140% Library");
 await captureVisualEvidence(page,out+"/"+engine+"-library-narrow.png",{fullPage:true});
 check(errors.length===0,engine+" browser errors "+errors.join("; "));
 console.log("P48-3 UX "+engine+" PASS: retained Result/Library, transient/manual grade, Wordgard lifecycle, no overflow");
}catch(error){await h.diagnose("p48-3-ux-"+engine,page,error);throw error;}
finally{await context.close();await h.finish();}
