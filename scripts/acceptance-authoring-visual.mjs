/** P47-5C screenshot-first, offline user-facing Library editor journey.
 * Targeted screenshots are diagnostic evidence, not v11 parity fixtures.
 */
import {captureVisualEvidence} from "./browser/visual-evidence.mjs";
import {openHarness,check,assertNoOverflow} from "./browser/fixtures.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const output="artifacts/p47-5c-visual";
const {page,errors}=await h.open({viewport:{width:1366,height:900},colorScheme:"light"});
const external=[];
page.on("request",r=>{if(/^https?:/i.test(r.url()))external.push(r.url());});
const shot=async name=>captureVisualEvidence(page,output+"/"+engine+"-"+name+".png",{fullPage:true});
const open=async()=>{
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible",timeout:18000});
};
try{
 await open();
 check(await page.locator("#pd-author-publish").isEnabled(),"P47-5D publishing action must be enabled for validated drafts");
 await page.locator("#pd-author-validate").click();
 check((await page.locator("#pd-author-validation").innerText()).includes("Fix"),"Blank draft must fail publication validation");
 check(await page.locator("wg-content").count()===1,"Wordgard must mount exactly one editor");
 check(await page.locator("#app.pd-author-mode").count()===1,"Authoring did not enter focused Library view");
 check(await page.locator("#g-start:visible").count()===0,"Exam start controls must not compete with authoring");
 check((await page.locator("body").innerText()).includes("Wordgard authoring studio"),"Library heading absent");
 await page.locator("wg-content").click();
 await page.keyboard.insertText("Find the value of x in the expression");
 await page.waitForFunction(()=>String(localStorage.getItem("practiceDesk.authoring.drafts.v1")).includes("Find the value"));
 check((await page.locator("wg-content").innerText()).includes("Find the value"),"Live Wordgard text editing failed");
 await page.locator("#pd-author-tex").fill("\\frac{x^2-1}{x-1}");
 await page.locator("#pd-author-math-alt").fill("x squared minus one divided by x minus one");
 check(await page.locator("#pd-author-math-live .katex-mathml").count()===1,"Authoring lacks actual live KaTeX preview");
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
 await page.evaluate(()=>document.documentElement.setAttribute("data-theme","dark"));
 check(await page.evaluate(()=>document.documentElement.getAttribute("data-theme"))==="dark","Dark screenshot theme not applied");
 // The global .btn has a 140 ms background transition. Wait for the
 // completed theme instead of measuring a transient light fill/dark text.
 await page.waitForFunction(()=>{
  const studio=document.querySelector(".pd-author-studio");
  const close=document.querySelector("#pd-author-close");
  const next=document.querySelector("#pd-author-new");
  if(!studio||!close||!next)return false;
  const backdrop=getComputedStyle(studio).backgroundColor;
  return getComputedStyle(close).backgroundColor===backdrop&&
   getComputedStyle(next).backgroundColor===backdrop;
 },null,{timeout:3000});

 const darkContrast=await page.evaluate(()=>{
  const rgb=(color)=>{
   const values=color.match(/[\d.]+/g)?.slice(0,3).map(Number);
   if(!values||values.length!==3)throw Error("Cannot parse CSS colour "+color);
   return values.map(v=>{
    const linear=v/255;
    return linear<=0.04045?linear/12.92:((linear+0.055)/1.055)**2.4;
   });
  };
  const luminance=triplet=>triplet[0]*0.2126+triplet[1]*0.7152+triplet[2]*0.0722;
  const ratio=(a,b)=>{
   const [hi,lo]=[luminance(rgb(a)),luminance(rgb(b))].sort((x,y)=>y-x);
   return +( (hi+0.05)/(lo+0.05)).toFixed(2);
  };
  const style=selector=>getComputedStyle(document.querySelector(selector));
  const panel=style(".pd-author-studio").backgroundColor;
  return {
   heading:ratio(style("#pd-author-heading").color,panel),
   close:ratio(style("#pd-author-close").color,style("#pd-author-close").backgroundColor),
   closeColor:style("#pd-author-close").color,closeBackground:style("#pd-author-close").backgroundColor,
   closeInlineStyle:document.querySelector("#pd-author-close")?.getAttribute("style"),
   closeMatchesTheme:document.querySelector("#pd-author-close")?.matches('html[data-theme="dark"] body .generic-workspace.pd-author-mode .pd-author-studio button.btn:not(.primary)'),
   closeVarPanel:style("#pd-author-close").getPropertyValue("--panel").trim(),
   newDraft:ratio(style("#pd-author-new").color,style("#pd-author-new").backgroundColor),
   draftColor:style("#pd-author-new").color,draftBackground:style("#pd-author-new").backgroundColor,
   editor:ratio(style("#pd-author-editor wg-content").color,style("#pd-author-editor").backgroundColor),
   previewText:ratio(style("#pd-author-preview .pd-rich-paragraph").color,style("#pd-author-preview").backgroundColor),
   token:ratio(style("#pd-author-editor .pd-author-token").color,style("#pd-author-editor").backgroundColor)
  };
 });
 check(["heading","close","newDraft","editor","previewText","token"].every(k=>darkContrast[k]>=4.5),
   "P47-5C dark-theme WCAG contrast failed: "+JSON.stringify(darkContrast));

 await assertNoOverflow(page,"P47-5C phone dark authoring");
 await shot("phone-dark");
 await page.setViewportSize({width:195,height:844});
 await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
 await assertNoOverflow(page,"P47-5C extreme 195px 140 percent");
 await shot("195px-140pct-dark");
 await page.emulateMedia({colorScheme:"light"});
 await page.evaluate(()=>document.documentElement.setAttribute("data-theme","light"));
 await assertNoOverflow(page,"P47-5C extreme 195px light");
 await shot("195px-140pct-light");
 const before=await page.evaluate(()=>localStorage.getItem("practiceDesk.authoring.drafts.v1"));
 check(Boolean(before&&before.includes("Find the value")),"Local draft not committed");
 await page.locator("#pd-author-close").click();
 check(await page.locator("#app.pd-author-mode").count()===0,"Closing studio failed to restore Library");
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
