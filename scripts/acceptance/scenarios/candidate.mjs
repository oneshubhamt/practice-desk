/** Stable product-domain browser scenarios. */

export async function candidateCore(){
// Consolidated from scripts/acceptance-critical.mjs; retained browser-only assertions remain intact.
/** Current-app critical journeys: no frozen historical screenshots or hard-coded prior SHA. */
const {openHarness,records,check,assertNoOverflow,route,claimNativeNavigation}=await import("../../browser/fixtures.mjs");
const {chooseModernPaper}=await import("../../paper-select.mjs");
const {pkg : sixKinds}=await import("../../../tests/fixtures/six-kinds.mjs");
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const evidence=[];
async function scenario(name,run){
 const {page,errors}=await h.open();
 try{
  await run(page);
  check(!errors.length,name+" browser exceptions "+errors.join("; "));
  evidence.push({name,result:"pass",url:await page.url()});
  console.log("MODERN CRITICAL PASS "+name);
 }catch(e){await h.diagnose(name,page,e);throw e;}
}
try{
 await scenario("source-reviewed-cgl-immutable-results-and-history",async page=>{
  check(await claimNativeNavigation(page),"native Navigation API not supported");
  const options=await page.locator("#g-papers option").evaluateAll(xs=>xs.map(x=>x.value));
  check(options.length>=5,"no built-in CGL papers");
  check(await page.locator('[data-edition="reviewed"]').getAttribute("aria-pressed")==="true"||
    await page.locator('[data-edition="source"]').getAttribute("aria-pressed")==="true",
    "edition segment missing");
  await page.locator('[data-edition="reviewed"]').click();
  const reviewed=await page.locator("#g-papers option").evaluateAll(xs=>
   xs.find(x=>x.value.includes("cgl-2026-09-30")&&x.value.includes("reviewed"))?.value??"");
  check(Boolean(reviewed),"no reviewed paper");
  await chooseModernPaper(page,reviewed);
  const title=await page.locator("#g-papers option:checked").innerText();
  await page.locator('[data-edition="source"]').click();
  check(await page.locator("#g-papers option").evaluateAll(xs=>
   xs.filter(x=>x.value.includes("cgl-")).length)===5,"source picker must show only five CGL source editions");
  check(await page.locator("#g-papers option").evaluateAll(xs=>
   xs.filter(x=>x.value.includes("cgl-")).every(x=>x.value.includes("source"))),
   "source picker leaks reviewed edition");
  await page.locator('[data-edition="reviewed"]').click();
  check((await page.locator("#g-papers option:checked").innerText())===title,
   "edition switch lost the paper family");
  await page.locator('[data-mode="single"]').click();
  await page.locator("#g-single-section").selectOption("0");
  check((await page.locator("#g-preflight").innerText()).includes("50"),
   "single-section preflight should display 50 nominal points");
  await page.getByRole("button",{name:/^Start /}).click();
  await route(page,"exam");
  const attemptId=new URL(await page.url()).searchParams.get("attempt");
  check(Boolean(attemptId),"exam URL not pinned to saved attempt");
  check(await page.locator("#result-review").count()===0,"pre-submit review/solutions leaked");
  await page.locator(".exam-question input[data-choice]").first().click();
  await page.locator("#g-flag").click();
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  await page.locator('[data-attempt="'+attemptId+'"]').first().click();
  await route(page,"exam");
  await page.locator('input[data-choice]:checked').first().waitFor({state:"visible"});
  check(await page.locator('[data-q="0"]').evaluate(x=>x.classList.contains("answered")&&x.classList.contains("marked")),
   "saved answer and flag did not recover");
  await page.locator("#g-submit").click();
  await route(page,"result");
  check(await page.locator(".result-performance-overview .score").count()===5,
    "current Results five primary metrics missing");
  check(await page.locator(".result-section-table tbody tr").count()===1,
    "single-section summary incorrect");
  check(await page.locator("#result-review .generic-review").count()===0,
    "review rendered eagerly despite overview selected");
  const snapshot=(await records(page)).find(x=>x.id===attemptId);
  check(snapshot?.result?.items?.length===25&&snapshot.finishedAt!==null,
    "completed frozen 25-question score not saved");
  check(snapshot.sourceKeyReference?.entries?.length===25,
    "reviewed CGL lost independently pinned source key");
  await page.locator("#result-tab-review").click();await page.locator("#result-review").waitFor({state:"visible"});
  check(await page.locator(".generic-review").count()===25,"lazy review wrong question count");
  await page.locator("#result-tab-timing").click();await page.locator("#result-timing").waitFor({state:"visible"});
  check(await page.locator("#result-timing tbody tr").count()===25,"item time ledger missing");
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  await page.getByRole("button",{name:/History & insights/}).click();await route(page,"history");
  await page.locator("#g-filter").selectOption("complete");
  check(await page.locator('[data-attempt="'+attemptId+'"]').count()===1,
   "history lost finished attempt");
  await page.reload({waitUntil:"load"});await route(page,"history");
  check(await page.locator('[data-attempt="'+attemptId+'"]').count()===1,
   "reloading History lost frozen attempt");
  await assertNoOverflow(page,"CGL History");
 });
 await scenario("six-kinds-manual-assessment-and-fsrs",async page=>{
  await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(sixKinds))});
  await chooseModernPaper(page,sixKinds.paper.id);
  const importedPreflight=await page.locator("#g-preflight").innerText();
  check(importedPreflight.includes("10.00")&&
    importedPreflight.includes("manual-response")&&
    importedPreflight.includes("author/importer")&&
    !importedPreflight.includes("SSC"),
    "authored six-kind bank must not inherit CGL scoring or official provenance");
  await page.locator("#g-exam-rules summary").click();
  check((await page.locator("#g-exam-rules").innerText()).includes("One shared 20 min"),
    "imported exam rules must follow authored timing");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  check(await page.locator("#result-review").count()===0,"active imported key leaked");
  await page.locator('input[data-choice]').first().click();
  await page.locator("#g-next").click();
  await page.locator('input[data-choice]').first().click();
  await page.locator('input[data-choice]').nth(2).click();
  await page.locator("#g-next").click();
  await page.locator("#g-number").fill("3.5");await page.locator("#g-save").click();
  await page.locator('[data-section="1"]').click();
  await page.locator('input[data-bool="true"]').click();
  await page.locator("#g-next").click();
  await page.locator('select[data-match]').nth(0).selectOption("r1");
  await page.locator('select[data-match]').nth(1).selectOption("r2");
  await page.locator("#g-save").click();await page.locator("#g-next").click();
  await page.locator("#g-text").fill("Self assessment response");await page.locator("#g-save").click();
  await page.locator("#g-submit").click();await route(page,"result");
  await page.locator("#result-tab-review").click();
  check(await page.locator(".generic-review").count()===6,"six question kinds not independently reviewed");
  const row=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.packageId===sixKinds.paper.id&&x.finishedAt);
  check(row?.result?.snapshot?.correctCount===5,"automated five answer verdicts wrong");
  check(row.result.items[5].verdict==="pending","written response not manual-pending");
  await page.locator('[data-manual-marks="rev-5"]').fill("1.5");
  await page.locator('[data-manual-note="rev-5"]').fill("Rubric self-assessment");
  await page.locator('[data-manual-save="rev-5"]').click();
  await page.waitForFunction(id=>Boolean(document.querySelector('[data-manual-save="rev-5"]')),row.id);
  // Reload ensures both the manual mark and the automated score were actually saved.
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  const persisted=(await records(page)).find(x=>x.id===row.id);
  check(persisted.manualGrades?.some(x=>x.marks===1.5)&&
    persisted.result.snapshot.earnedMarks===row.result.snapshot.earnedMarks,
   "manual self-mark changed frozen machine score or failed to persist");
  await page.locator('[data-attempt="'+row.id+'"]').first().click();await route(page,"result");
  await page.locator("#result-tab-review").click();
  await page.locator("[data-add-card]").first().click();
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  await page.getByRole("button",{name:/Open learning desk/}).click();await route(page,"learning");
  await page.locator("#learning-due").click();
  check(await page.locator(".learning-answer").count()===0,"FSRS answer leaked before reveal");
  await page.locator("#learning-reveal").click();
  check(await page.locator(".learning-answer").count()===1,"FSRS reveal failed");
  await page.locator('[data-grade="3"]').click();
  await page.locator("#learning-note").fill("Revisit this item");await page.locator("#learning-save").click();
  check((await records(page)).some(x=>x.recordType==="learning-card"&&
    x.reviews?.length===1&&x.note==="Revisit this item"),"explicit FSRS rating not persisted");
 });
 await h.evidence("critical-summary",{verified:evidence.length,scenarios:evidence});
}finally{await h.finish();}
console.log("MODERN CRITICAL COMPLETE "+evidence.length+" scenarios");
}

export async function statusPalette(){
// Consolidated from scripts/acceptance-flag-palette.mjs; retained browser-only assertions remain intact.
/** Real file:// offline browser: yellow=flagged without a committed response,
 * orange=flagged with committed response. Same palette for all six question
 * kinds and built-in CGL, including draft transitions, reload and dark mode.
 */
const {openHarness,route,check,assertNoOverflow}=await import("../../browser/fixtures.mjs");
const {chooseModernPaper}=await import("../../paper-select.mjs");
const {pkg}=await import("../../../tests/fixtures/six-kinds.mjs");
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
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
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
 // The theme switch can animate independently of answer/flag reconciliation.
 // Wait for both the dark theme token and its actual painted swatches.
 await page.waitForFunction(light=>{
  const root=document.documentElement;
  const swatch=document.querySelector(".legend-dot.marked-answered");
  return root.getAttribute("data-theme")==="dark"&&
    getComputedStyle(root).getPropertyValue("--review-answered-bg").trim()==="#633f25"&&
    swatch&&getComputedStyle(swatch).backgroundColor!==light;
 },completed,{timeout:7000,polling:"raf"});
 const darkDone=await status(2,true);
 check(darkDone!==completed,engine+" dark theme must have own review palette: "+JSON.stringify({
  light:completed,dark:darkDone,theme:await page.locator("html").getAttribute("data-theme")
 }));
 await page.locator("#g-clear").click();await status(2,false);
 await page.setViewportSize({width:195,height:844});
 await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
 await status(2,false);
 await assertNoOverflow(page,engine+" 195px 140% flagged-unanswered");
 await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
 await page.setViewportSize({width:1100,height:790});
 await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1"));
 await page.locator("#g-family").selectOption("builtin:ssc-cgl");
 const cgl=await page.locator("#g-papers option").first().getAttribute("value");
 check(Boolean(cgl),engine+" no source/reviewed CGL paper to verify shared renderer");
 await chooseModernPaper(page,cgl);
 await page.locator('[data-mode="single"]').click();
 await page.locator("#g-single-section").selectOption("0");
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 await flagAndCheck(0);
 await page.locator('input[data-choice]').first().check();await status(0,true);
 check(!errors.length,engine+" browser errors: "+errors.join("; "));
 console.log("REVIEW PALETTE "+engine+" PASS: six kinds, CGL, drafts, clear, reload, two themes and 195px");
}catch(e){await h.diagnose("review-palette-"+engine,page,e);throw e;
}finally{await h.finish();}
}
