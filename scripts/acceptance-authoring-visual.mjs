/** P47-5C screenshot-first, offline user-facing Library editor journey.
 * Targeted screenshots are diagnostic evidence, not v11 parity fixtures.
 */
import {mkdir} from "node:fs/promises";
import {openHarness,check,assertNoOverflow} from "./browser/fixtures.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const output="artifacts/p47-5c-visual";await mkdir(output,{recursive:true});
const {page,errors}=await h.open({viewport:{width:1366,height:900},colorScheme:"light"});
const external=[];
page.on("request",r=>{if(/^https?:/i.test(r.url()))external.push(r.url());});
const shot=async name=>{
 await page.screenshot({path:output+"/"+engine+"-"+name+".png",animations:"disabled",fullPage:true});
};
const open=async()=>{
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible",timeout:18000});
};
try{
 await open();
 check(await page.locator("#pd-author-publish").isDisabled(),"P47-5D publishing must be disabled");
 check(await page.locator("wg-content").count()===1,"Wordgard must mount exactly one editor");
 check((await page.locator("body").innerText()).includes("Wordgard authoring studio"),"Library heading absent");
 await page.locator("wg-content").click();
 await page.keyboard.insertText("Find the value of x in the expression");
 await page.waitForFunction(()=>String(localStorage.getItem("practiceDesk.authoring.drafts.v1")).includes("Find the value"));
 check((await page.locator("wg-content").innerText()).includes("Find the value"),"Live Wordgard text editing failed");
 await page.locator("#pd-author-tex").fill("\\frac{x^2-1}{x-1}");
 await page.locator("#pd-author-math-alt").fill("x squared minus one divided by x minus one");
 await page.locator("#pd-author-math-insert").click();
 await page.locator("#pd-author-field").selectOption("A");
 await page.locator("wg-content").click();
 await page.keyboard.insertText("Option A");
 await page.locator("#pd-author-field").selectOption("prompt");
 check((await page.locator("wg-content").innerText()).includes("Find the value"),"Field-switch lost prompt");
 await page.locator("#pd-author-add-table").click();
 await page.waitForFunction(()=>document.querySelector("#pd-author-editor table"));
 check(await page.locator("#pd-author-editor table").count()===1,"Wordgard table insertion failed");
 await page.locator("#pd-author-preview-toggle").click();
 await page.locator("#pd-author-preview:not([hidden])").waitFor();
 check((await page.locator("#pd-author-preview").innerText()).includes("Read-only exam-style preview"),"Preview missing");
 await assertNoOverflow(page,"P47-5C desktop authoring");
 await shot("desktop-light");
 await page.setViewportSize({width:390,height:844});
 await assertNoOverflow(page,"P47-5C phone authoring");
 await shot("phone-light");
 await page.emulateMedia({colorScheme:"dark"});
 await assertNoOverflow(page,"P47-5C phone dark authoring");
 await shot("phone-dark");
 await page.setViewportSize({width:195,height:844});
 await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
 await assertNoOverflow(page,"P47-5C extreme 195px 140 percent");
 await shot("195px-140pct-dark");
 await page.emulateMedia({colorScheme:"light"});
 await assertNoOverflow(page,"P47-5C extreme 195px light");
 await shot("195px-140pct-light");
 const before=await page.evaluate(()=>localStorage.getItem("practiceDesk.authoring.drafts.v1"));
 check(Boolean(before&&before.includes("Find the value")),"Local draft not committed");
 await page.locator("#pd-author-close").click();
 check(await page.locator("#pd-author-editor").count()===0,"Editor instance survived close");
 check(await page.locator("wg-content").count()===0,"Wordgard leaked into Library");
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 check((await page.locator("wg-content").innerText()).includes("Find the value"),"Draft not restored on reopen");
 await page.reload({waitUntil:"load"});
 await page.locator("#g-papers").waitFor({state:"visible"});
 check(await page.locator("wg-content").count()===0,"Exam boot mounted Wordgard editing surface");
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 check((await page.locator("wg-content").innerText()).includes("Find the value"),"Draft not restored after reload");
 check(errors.length===0,"Uncaught editor/browser errors "+errors.join(" | "));
 check(external.length===0,"Authoring unexpectedly requested network "+external.join(" | "));
 console.log("P47-5C VISUAL ACCEPTANCE PASS "+engine+": true Library editor, math/table, draft restore, screenshot checks, offline");
}catch(error){
 await h.diagnose("p47-5c-editor-"+engine,page,error);
 throw error;
}finally{await h.finish();}
