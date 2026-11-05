/** Real file:// offline browser: yellow=flagged without a committed response,
 * orange=flagged with committed response. Same palette for all six question
 * kinds and built-in CGL, including draft transitions, reload and dark mode.
 */
import {openHarness,route,check,assertNoOverflow} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,errors}=await h.open({viewport:{width:1100,height:790}});
async function status(index,answered){
 // Reconciliation commits the new model synchronously, but a browser may
 // still be interpolating the previous CSS colour in the same animation
 // frame (including under reduced-motion). Assert the settled paint.
 await page.waitForFunction(({index,answered})=>{
  const el=document.querySelector('[data-q="'+index+'"]'),flag=document.querySelector("#g-flag");
  if(!el||!flag||!el.classList.contains("marked")||
     el.classList.contains("answered")!==answered)return false;
  const legend=document.querySelector(".legend-dot."+(answered?"marked-answered":"marked-unanswered"));
  if(!legend)return false;
  const expected=getComputedStyle(legend).backgroundColor;
  return getComputedStyle(el).backgroundColor===expected &&
    getComputedStyle(flag).backgroundColor===expected;
 },{index,answered},{timeout:7000,polling:"raf"});
 const s=await page.locator('[data-q="'+index+'"]').evaluate(el=>{
  const flag=document.querySelector("#g-flag");
  const legend=document.querySelector(".legend-dot."+
   (el.classList.contains("answered")?"marked-answered":"marked-unanswered"));
  return {
   flagged:el.classList.contains("marked"),answered:el.classList.contains("answered"),
   background:getComputedStyle(el).backgroundColor,
   legend:legend?getComputedStyle(legend).backgroundColor:null,
   button:flag?getComputedStyle(flag).backgroundColor:null,
   buttonPressed:flag?.getAttribute("aria-pressed"),
   buttonLabel:flag?.getAttribute("aria-label"),
   navLabel:el.getAttribute("aria-label"),
   outline:getComputedStyle(el).outlineStyle
  };
 });
 check(s.flagged&&s.answered===answered,engine+" wrong question flag/answer composite: "+JSON.stringify(s));
 check(s.background===s.legend&&s.background===s.button,
  engine+" navigator/legend/flag colours disagree: "+JSON.stringify(s));
 check(s.buttonPressed==="true"&&s.buttonLabel?.includes(answered?"(answered)":"(unanswered)")&&
  s.navLabel?.includes(answered?", answered, marked for review":", unanswered, marked for review"),
  engine+" review state not accessible: "+JSON.stringify(s));
 return s.background;
}
async function flagAndCheck(index){
 await page.locator("#g-flag").click();
 return status(index,false);
}
try{
 await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(pkg))});
 await chooseModernPaper(page,pkg.paper.id);
 await page.locator("#g-start").click();await route(page,"exam");
 const pending=await flagAndCheck(0);
 await page.locator('input[data-choice]').first().check();
 const completed=await status(0,true);
 check(pending!==completed,engine+" yellow and orange must be visibly different");
 await page.locator("#g-clear").click();await status(0,false);
 await page.locator('input[data-choice]').first().check();await status(0,true);
 await page.locator("#g-next").click();
 await flagAndCheck(1);
 await page.locator('input[data-choice]').first().check();
 await status(1,false); // incomplete multi-select is an unsaved draft
 await page.locator('input[data-choice]').nth(2).check();
 await status(1,true);
 await page.locator("#g-next").click();
 await flagAndCheck(2);
 await page.locator("#g-number").fill("3.5");
 await status(2,false); // text in control is not a committed response
 await page.locator("#g-save").click();await status(2,true);
 await page.locator('[data-section="1"]').click();
 await flagAndCheck(0);
 await page.locator('input[data-bool="true"]').check();await status(0,true);
 await page.locator("#g-next").click();
 await flagAndCheck(1);
 await page.locator('select[data-match]').first().selectOption("r1");
 await status(1,false);
 await page.locator("#g-save").click();await status(1,true);
 await page.locator("#g-next").click();
 await flagAndCheck(2);
 await page.locator("#g-text").fill("Manual answer draft");
 await status(2,false);
 await page.locator("#g-save").click();await status(2,true);
 await page.reload({waitUntil:"load"});await route(page,"exam");
 await status(2,true); // exact persisted state rehydrates, no CSS-only ephemeral status
 await page.locator("#displayTrigger").click();
 await page.locator("#themeDark").click();
 await page.keyboard.press("Escape");
 const darkDone=await status(2,true);
 check(darkDone!==completed,engine+" dark theme must have own review palette");
 await page.locator("#g-clear").click();await status(2,false);
 await page.setViewportSize({width:195,height:844});
 await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
 await status(2,false);
 await assertNoOverflow(page,engine+" 195px 140% flagged-unanswered");
 await page.locator("#g-library").click();await route(page,"library");
 await page.setViewportSize({width:1100,height:790});
 await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1"));
 await page.locator("#g-family").selectOption("builtin:ssc-cgl");
 const cgl=await page.locator("#g-papers option").first().getAttribute("value");
 check(Boolean(cgl),engine+" no source/reviewed CGL paper to verify shared renderer");
 await chooseModernPaper(page,cgl);
 await page.locator('[data-mode="single"]').click();
 await page.locator("#g-single-section").selectOption("0");
 await page.locator("#g-start").click();await route(page,"exam");
 await flagAndCheck(0);
 await page.locator('input[data-choice]').first().check();await status(0,true);
 check(!errors.length,engine+" browser errors: "+errors.join("; "));
 console.log("REVIEW PALETTE "+engine+" PASS: six kinds, CGL, drafts, clear, reload, two themes and 195px");
}catch(e){await h.diagnose("review-palette-"+engine,page,e);throw e;
}finally{await h.finish();}
