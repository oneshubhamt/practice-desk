/** Stable product-domain browser scenarios. */

export async function candidateCore(){
// Consolidated from scripts/acceptance-critical.mjs; retained browser-only assertions remain intact.
/** Current-app critical journeys: no frozen historical screenshots or hard-coded prior SHA. */
const {openHarness,records,check,assertNoOverflow,route,claimNativeNavigation}=await import("../../browser/fixtures.mjs");
const {chooseModernPaper,findModernPaper,importModernPaper,choosePracticeMode}=await import("../../paper-select.mjs");
const {pkg : sixKinds}=await import("../../../tests/fixtures/six-kinds.mjs");
const {paperRevisionHash,answerKeyRevisionHash}=await import("../../../src/domain/integrity.ts");
const shortTimed=(id,durationMs,edition)=>{
 const {contentHash:_oldHash,...paperCore}=sixKinds.paper;
 const base={...paperCore,id,edition,timing:{kind:"whole-paper",durationMs,pausePolicy:"allowed"}};
 return {...sixKinds,title:sixKinds.title+" · "+id,paper:{...base,contentHash:paperRevisionHash(base)}};
};
const hardWritten=shortTimed("rev-paper:hard-written",4000,"source");
const advisoryWritten=shortTimed("rev-paper:advisory-written",2000,"custom");
const unsectioned=(()=>{
 const {contentHash:_oldHash,...paperCore}=sixKinds.paper;
 const base={...paperCore,id:"rev-paper:unsectioned-precision",paperId:"unsectioned-precision",
  edition:"custom",practiceModes:["strict","free"],
  sections:[{id:"whole",title:"Whole paper",questionRevisionIds:sixKinds.questions.map(q=>q.id)}],
  timing:{kind:"whole-paper",durationMs:20*60000,pausePolicy:"allowed"},
  navigation:{...paperCore.navigation,questionNavigation:"free",sectionNavigation:"free"},
  scoring:{...paperCore.scoring,
   defaultRule:{correctMarks:1/3,incorrectMarks:-1/9,unansweredMarks:0},decimalPlaces:3}};
 const keyCore={...sixKinds.answerKey,paperId:base.paperId};
 const answerKey={...keyCore,contentHash:answerKeyRevisionHash(keyCore)};
 return {...sixKinds,examId:"generic-structure",title:"Unsectioned precision demo",
  paper:{...base,answerKeyRevisionId:answerKey.id,contentHash:paperRevisionHash({...base,answerKeyRevisionId:answerKey.id})},
  answerKey};
})();
const mixedSections=(()=>{
 const {contentHash:_oldHash,...paperCore}=sixKinds.paper;
 const base={...paperCore,id:"rev-paper:mixed-sections",paperId:"mixed-sections",
  edition:"custom",practiceModes:["strict","single"],
  timing:{kind:"sectional",sectionLimits:[
   {sectionId:paperCore.sections[0].id,durationMs:60000},
   {sectionId:paperCore.sections[1].id,durationMs:null}
  ],transition:"manual",allowEarlySubmit:true,pausePolicy:"allowed"},
  navigation:{...paperCore.navigation,sectionNavigation:"sequential-locked"}};
 const keyCore={...sixKinds.answerKey,id:"key:mixed-sections",paperId:base.paperId};
 const answerKey={...keyCore,contentHash:answerKeyRevisionHash(keyCore)};
 const paperBase={...base,answerKeyRevisionId:answerKey.id};
 return {...sixKinds,examId:"generic-mixed-sections",title:"Mixed section timing demo",
  paper:{...paperBase,contentHash:paperRevisionHash(paperBase)},answerKey};
})();
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
  const reviewed=await findModernPaper(page,"reviewed",o=>o.value.includes("cgl-2026-09-30"));
  await chooseModernPaper(page,reviewed);
  check(await page.locator('[data-edition="reviewed"]').getAttribute("aria-pressed")==="true",
    "reviewed edition segment missing");
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
  await page.locator(".paper-detail-disclosure > summary").click();
  check((await page.locator("#g-preflight").innerText()).includes("50"),
   "single-section preflight should display 50 nominal points after opening details");
  await page.getByRole("button",{name:/^Start /}).click();
  await route(page,"exam");
  const attemptId=new URL(await page.url()).searchParams.get("attempt");
  check(Boolean(attemptId),"exam URL not pinned to saved attempt");
  check(await page.locator("#result-review").count()===0,"pre-submit review/solutions leaked");
  await page.locator('[data-q="4"]').click();
  check(await page.locator('.exam-question [data-image-open]').count()>0,
    "canonical CGL package lost question/option media in the candidate browser");
  await page.locator('[data-q="0"]').click();
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
  check((await page.locator("#result-review").innerText()).includes("Compare with frozen source edition"),
    "Reviewed CGL browser review lost its exact frozen Source comparison lineage");
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
  const restored=(await records(page)).find(x=>x.id===attemptId);
  check(restored?.frozen?.paper?.id===snapshot.frozen.paper.id&&
    restored?.result?.snapshot?.earnedMarks===snapshot.result.snapshot.earnedMarks&&
    restored?.result?.items?.length===snapshot.result.items.length&&
    restored?.completionReason===snapshot.completionReason,
    "History restore changed frozen revision, score ledger or completion provenance");
  await assertNoOverflow(page,"CGL History");
 });
 await scenario("exam-shape-unsectioned-fractional-and-mixed-sections",async page=>{
  await importModernPaper(page,unsectioned,"unsectioned.json");
  check(await page.locator(".generic-modes [data-mode]").count()===2,
    "one physical section must expose only compatible declared full-paper modes");
  check(await page.locator('[data-mode="single"]').count()===0,
    "one physical section exposed artificial section practice");
  const preview=await page.locator(".preview-metrics").innerText();
  check(preview.includes("Whole paper")&&preview.includes("Structure"),
    "unsectioned Library preview exposed an artificial section count");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  check(await page.locator(".generic-sections").count()===0,
    "unsectioned paper rendered a section-tab bar");
  check(!(await page.locator("main").innerText()).includes("Section 1 of 1"),
    "unsectioned paper leaked internal section numbering");
  check((await page.locator(".navigator-intro").innerText())==="Jump to a question",
    "unsectioned navigator used section-specific wording");
  await page.locator('input[data-choice]').first().click();
  await page.locator("#g-submit").click();await route(page,"result");
  const overview=await page.locator(".result-performance-overview").innerText();
  check(overview.includes("0.333"),
    "fractional marks ignored the frozen three-decimal scoring policy");
  check((await page.locator(".result-section-table thead").innerText()).includes("Paper"),
    "unsectioned Results retained a Section table heading");
  check((await page.locator(".result-section-diagnostics").innerText()).includes("Paper diagnostics"),
    "unsectioned Results retained section diagnostics chrome");
  check((await page.locator(".result-scoring-details").textContent()).includes("does not independently authenticate official status"),
    "custom-paper result lost neutral frozen provenance wording");
  await page.locator("#result-tab-review").click();await page.locator("#result-review").waitFor({state:"visible"});
  check((await page.locator(".generic-review").first().innerText()).includes("0.333 automated marks"),
    "question review ignored frozen three-decimal result precision");

  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  await importModernPaper(page,mixedSections,"mixed-sections.json");
  check(await page.locator(".generic-modes [data-mode]").count()===2,
    "authored optional mode eligibility was not respected");
  check(await page.locator('[data-mode="free"]').count()===0,
    "paper that declares strict+single unexpectedly exposed flexible mode");
  check((await page.locator(".preview-metrics").innerText()).includes("01:00 + Untimed"),
    "mixed sectional timing was flattened or fabricated");
  await choosePracticeMode(page,"single");
  await page.locator("#g-single-section").selectOption("0");
  check((await page.locator(".preview-metrics").innerText()).includes("01:00"),
    "timed section practice lost its authored section limit");
  await page.locator("#g-single-section").selectOption("1");
  check((await page.locator(".preview-metrics").innerText()).includes("Untimed"),
    "untimed section practice inherited a fabricated timer");
  await page.locator("#g-single-section").selectOption("0");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  check((await page.locator("#g-timer").innerText())==="01:00",
    "declared section-practice mode could not execute its authored timed section");
  check(await page.locator(".generic-sections").count()===0,
    "one selected practice section rendered a fake section-tab bar");
  await page.locator("#g-submit").click();await route(page,"result");
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  await chooseModernPaper(page,mixedSections.paper.id);
  await choosePracticeMode(page,"strict");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  check(await page.locator(".generic-sections").count()===1&&
    await page.locator(".exam-section-tab").count()===2,
    "mixed-section exam did not retain two real sections");
  check((await page.locator("#g-timer").innerText())==="01:00",
    "first mixed section did not retain its authored timer");
  await page.locator("#g-submit").click();
  check((await page.locator("#g-timer").innerText())==="Untimed",
    "second mixed section did not retain its explicit untimed status");
 });
 await scenario("written-hard-timeout-preserves-visible-draft",async page=>{
  await importModernPaper(page,hardWritten,"hard-written.json");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  await page.locator('[data-section="1"]').click();
  await page.locator("#g-next").click();await page.locator("#g-next").click();
  const text="Visible draft before hard timeout";
  await page.locator("#g-text").fill(text); // deliberately never select Save response
  await route(page,"result");
  const row=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.packageId===hardWritten.paper.id);
  check(row?.completionReason==="time-expired","hard written attempt did not expire");
  const written=row?.state?.responses?.find(x=>x.questionRevisionId==="rev-5");
  check(written?.response?.text===text,"hard timeout lost the latest visible written draft");
  check(written?.postDeadlineMs===0,"hard timeout recorded impossible post-deadline exposure");
  check(written?.answerEvents===undefined,"hard timeout persisted written typing telemetry");
  check((await page.locator(".result-written-answers").innerText()).includes("Visible")===false,
    "written analytics should summarize evidence, not duplicate candidate prose in Insights");
 });
 await scenario("written-advisory-overtime-continues-live",async page=>{
  await importModernPaper(page,advisoryWritten,"advisory-written.json");
  check(await page.locator('[data-mode="free"]').getAttribute("aria-pressed")==="true",
   "a newly imported custom paper must retain its advisory practice default");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  await page.locator('[data-section="1"]').click();
  await page.locator("#g-next").click();await page.locator("#g-next").click();
  await page.locator("#g-text").fill("Practice answer may continue beyond the target.");
  await page.waitForFunction(()=>document.querySelector("#g-timer-label")?.textContent==="PAPER OVERTIME",
    undefined,{timeout:7000,polling:"raf"});
  check((await page.locator("#g-timer").innerText()).startsWith("+"),
    "advisory live timer did not switch to positive overtime");
  await page.locator("#g-submit").click();await route(page,"result");
  const row=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.packageId===advisoryWritten.paper.id);
  check(row?.completionReason==="submitted","advisory practice should finish by user submission");
  check(row.state.elapsedMs>advisoryWritten.paper.timing.durationMs,
    "advisory practice did not continue past its budget");
  check(row.state.responses.find(x=>x.questionRevisionId==="rev-5")?.postDeadlineMs>0,
    "written question did not receive foreground overtime attribution");
  const pacing=await page.locator(".result-time-pacing").innerText();
  check(pacing.includes("% over budget")&&pacing.includes("Submitted by user"),
    "Results omitted derived overtime percentage or completion mode");
 });
 await scenario("six-kinds-manual-assessment-and-fsrs",async page=>{
  await importModernPaper(page,sixKinds,"six-kinds.json");
  await page.locator(".paper-detail-disclosure > summary").click();
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
  const written=n=>Array.from({length:n},(_,i)=>"word"+(i+1)).join(" ");
  check((await page.locator("#g-word-count").innerText())==="0 / 40 words",
    "custom-practice should show the Auto word counter");
  await page.locator("#g-text").fill(written(32));
  check(await page.locator("#g-word-count").getAttribute("data-word-count-state")==="caution",
    "80% word count should enter yellow caution state");
  await page.locator("#g-text").fill(written(36));
  check(await page.locator("#g-word-count").getAttribute("data-word-count-state")==="warning",
    "90% word count should enter amber warning state");
  await page.locator("#g-text").fill(written(41));
  check(await page.locator("#g-word-count").getAttribute("data-word-count-state")==="over",
    "over-limit word count should enter red state");
  await page.locator("#g-save").click();
  check((await page.locator("#g-word-count").innerText())==="41 / 40 words",
    "over-limit written response was not saved and restored");
  // A final visible edit is deliberately left unsaved. Submission must commit
  // the textarea boundary state rather than silently submit the older 41-word snapshot.
  await page.locator("#g-text").fill(written(42));
  await page.locator("#g-submit").click();await route(page,"result");
  check((await page.locator(".result-written-answers").innerText()).includes("42 / 40 words"),
    "Results did not analyse the final visible written response");
  check((await page.locator(".result-written-answers").innerText()).includes("Written answers"),
    "written-answer analysis panel missing");
  await page.locator("#result-tab-review").click();
  check(await page.locator(".generic-review").count()===6,"six question kinds not independently reviewed");
  const row=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.packageId===sixKinds.paper.id&&x.finishedAt);
  check(row?.result?.snapshot?.correctCount===5,"automated five answer verdicts wrong");
  check(row.result.items[5].verdict==="pending","written response not manual-pending");
  check(row.state.responses.find(x=>x.questionRevisionId==="rev-5")?.response?.text===written(42),
    "final unsaved textarea edit was not committed at submission");
  check(row.state.responses.find(x=>x.questionRevisionId==="rev-5")?.answerEvents===undefined,
    "written checkpoints leaked typing telemetry");
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
  await page.reload({waitUntil:"load"});await route(page,"library");
  const restoredManual=(await records(page)).find(x=>x.id===row.id);
  check(restoredManual?.manualGrades?.some(x=>x.marks===1.5)&&
    restoredManual.result.snapshot.earnedMarks===row.result.snapshot.earnedMarks&&
    restoredManual.result.items[5].verdict==="pending",
    "Reload lost manual evidence or incorrectly rewrote frozen machine results");
  await page.locator('[data-attempt="'+row.id+'"]').first().click();await route(page,"result");
  await page.locator("#result-tab-review").click();
  await page.locator("[data-add-card]").first().click();
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  await page.locator("#g-learning").click();await route(page,"learning");
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
const {chooseModernPaper,findModernPaper,importModernPaper}=await import("../../paper-select.mjs");
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
 await importModernPaper(page,pkg,"six-kinds.json");
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
 const cgl=await findModernPaper(page,"reviewed",o=>o.value.includes("cgl-"));
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


export async function candidateMcqTools(){
 const {openHarness,records,check,assertNoOverflow,route}=await import("../../browser/fixtures.mjs");
 const {importModernPaper}=await import("../../paper-select.mjs");
 const {pkg}=await import("../../../tests/fixtures/six-kinds.mjs");
 const engine=process.argv[2]??"chromium";
 const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
 const {page,errors}=await h.open({viewport:{width:1100,height:790}});
 try{
  await importModernPaper(page,pkg,"six-kinds-candidate-tools.json");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  const attemptId=new URL(await page.url()).searchParams.get("attempt");
  check(Boolean(attemptId),"candidate-tools attempt ID missing");

  check(await page.locator("[data-eliminate]").count()===2,
   "single-choice question did not expose one strike control per stable option");
  await page.locator('input[data-choice="a"]').check();
  await page.locator('[data-eliminate="b"]').click();
  check(await page.locator('input[data-choice="a"]').isChecked(),
   "striking option B changed selected option A");
  check(await page.locator('[data-eliminate="b"]').getAttribute("aria-pressed")==="true",
   "option B strike state was not exposed accessibly");
  check(await page.locator('[data-eliminate="b"]').evaluate(el=>
    Boolean(el.parentElement?.classList.contains("eliminated"))),
   "struck option did not receive eliminated presentation state");

  await page.locator('[data-q="2"]').click();
  await page.locator("#g-flag").click();
  await page.locator('[data-q="0"]').click();
  await page.locator("#g-next-unanswered").click();
  check(await page.locator(".exam-question").getAttribute("data-active-question")==="rev-1",
   "Next unanswered did not advance to the next unanswered question");
  check(await page.locator("[data-eliminate]").count()===3,
   "multiple-select question did not expose strike controls");
  await page.locator("#g-next-flagged").click();
  check(await page.locator(".exam-question").getAttribute("data-active-question")==="rev-2",
   "Next flagged did not advance to the next marked question");

  await page.reload({waitUntil:"load"});await route(page,"exam");
  await page.locator('[data-q="0"]').click();
  check(await page.locator('input[data-choice="a"]').isChecked(),
   "saved answer did not survive candidate-tools reload");
  check(await page.locator('[data-eliminate="b"]').getAttribute("aria-pressed")==="true",
   "stable OptionId elimination did not survive reload");
  const stored=(await records(page)).find(x=>x.id===attemptId);
  check(stored?.candidateScratch?.eliminations?.some(row=>
    row.questionRevisionId==="rev-0"&&row.optionIds.length===1&&row.optionIds[0]==="b"),
    "persisted candidate scratch did not retain eliminated OptionId b");

  await page.setViewportSize({width:195,height:844});
  await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
  await assertNoOverflow(page,"candidate MCQ tools 195px 140%");
  check(!errors.length,"candidate-tools browser errors: "+errors.join("; "));
  console.log("CANDIDATE MCQ TOOLS "+engine+
   " PASS: independent strike state, reload persistence, next-unanswered/flagged and 195px layout");
 }catch(e){await h.diagnose("candidate-mcq-tools-"+engine,page,e);throw e;
 }finally{await h.finish();}
}


export async function candidateHighlighting(){
 const {openHarness,records,check,assertNoOverflow,route}=await import("../../browser/fixtures.mjs");
 const {importModernPaper}=await import("../../paper-select.mjs");
 const {pkg}=await import("../../../tests/fixtures/six-kinds.mjs");
 const {questionRevisionHash}=await import("../../../src/domain/integrity.ts");
 const richPrompt={format:"practice-desk-rich",version:1,blocks:[{
  type:"paragraph",content:[
   {type:"text",text:"Alpha ",marks:["strong"]},
   {type:"math",tex:"x^2",linearText:"x squared"},
   {type:"text",text:" beta",marks:["underline"]}
  ]
 }]};
 const richStimulus={id:"highlight-passage",kind:"passage",title:"Case passage",text:"Clinical clue",
  richText:{format:"practice-desk-rich",version:1,blocks:[{type:"paragraph",content:[
   {type:"text",text:"Clinical ",marks:["emphasis"]},{type:"text",text:"clue"}
  ]}]}};
 const original=pkg.questions[0],content={...original.content,stimulusId:richStimulus.id,richPrompt};
 const richQuestion={...original,content,contentHash:questionRevisionHash({content,editorial:original.editorial})};
 const highlightPkg={...pkg,title:"Candidate highlighting",questions:[richQuestion,...pkg.questions.slice(1)],
  stimuli:[richStimulus]};
 const engine=process.argv[2]??"chromium";
 const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
 const {page,errors}=await h.open({viewport:{width:1100,height:790}});

 async function selectBetween(startSelector,startOffset,endSelector,endOffset){
  await page.evaluate(({startSelector,startOffset,endSelector,endOffset})=>{
   const start=document.querySelector(startSelector),end=document.querySelector(endSelector);
   if(!start||!end)throw Error("Highlight selection target missing");
   const point=(root,offset)=>{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node,seen=0;
    while((node=walker.nextNode())){
     const length=node.textContent?.length??0;
     if(offset<=seen+length)return {node,offset:offset-seen};
     seen+=length;
    }
    throw Error("Highlight selection offset exceeds target text");
   };
   const a=point(start,startOffset),b=point(end,endOffset),range=document.createRange();
   range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   start.dispatchEvent(new PointerEvent("pointerup",{bubbles:true}));
  },{startSelector,startOffset,endSelector,endOffset});
 }
 try{
  await importModernPaper(page,highlightPkg,"candidate-highlighting.json");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  const attemptId=new URL(await page.url()).searchParams.get("attempt");
  check(Boolean(attemptId),"candidate-highlighting attempt ID missing");
  check(await page.locator('[data-highlight-surface="question-prompt"][data-highlight-mode="rich"]').count()===1,
   "rich question prompt did not expose one candidate highlight surface");
  check(await page.locator('[data-highlight-surface="question-prompt"] [data-rich-path="0.0"]').count()===1&&
    await page.locator('[data-highlight-surface="question-prompt"] [data-rich-path="0.2"]').count()===1,
   "rich prompt text leaves did not expose stable structural paths");
  check(await page.locator('[data-highlight-surface="question-prompt"] [data-rich-path="0.1"]').count()===0,
   "inline KaTeX incorrectly became a character-offset highlight leaf");

  await selectBetween(
   '[data-highlight-surface="question-prompt"] [data-rich-path="0.0"]',0,
   '[data-highlight-surface="question-prompt"] [data-rich-path="0.2"]',5
  );
  check(!(await page.getByRole("button",{name:"Highlight selected text yellow"}).isDisabled()),
   "valid rich selection did not enable highlight colors");
  await page.getByRole("button",{name:"Highlight selected text yellow"}).click();
  check(await page.locator('mark.candidate-highlight[data-highlight-color="yellow"]').count()===2,
   "cross-leaf rich selection did not render two text-only highlight fragments");
  check(await page.locator('[data-highlight-surface="question-prompt"] .katex mark.candidate-highlight').count()===0,
   "candidate highlight wrapped KaTeX math");

  await selectBetween(
   '[data-highlight-surface="stimulus-passage"] [data-rich-path="0.1"]',0,
   '[data-highlight-surface="stimulus-passage"] [data-rich-path="0.1"]',4
  );
  await page.getByRole("button",{name:"Highlight selected text green"}).click();
  check(await page.locator('[data-highlight-surface="stimulus-passage"] mark[data-highlight-color="green"]').count()===1,
   "eligible rich passage selection was not highlighted");

  await selectBetween(
   '[data-highlight-surface="option-text"][data-highlight-option="b"]',0,
   '[data-highlight-surface="option-text"][data-highlight-option="b"]',4
  );
  await page.getByRole("button",{name:"Highlight selected text pink"}).click();
  check((await page.locator('[data-highlight-surface="option-text"][data-highlight-option="b"] mark').innerText())==="Beta",
   "textual choice option did not use its stable option-text surface");
  check(await page.locator('input[data-choice]:checked').count()===0,
   "highlighting option text changed answer selection");

  await page.locator("#g-next").click();
  check(await page.locator('[data-highlight-surface="question-prompt"][data-highlight-mode="plain"]').count()===1,
   "plain question prompt did not expose canonical text highlighting");
  await selectBetween(
   '[data-highlight-surface="question-prompt"][data-highlight-mode="plain"]',0,
   '[data-highlight-surface="question-prompt"][data-highlight-mode="plain"]',6
  );
  await page.getByRole("button",{name:"Highlight selected text pink"}).click();
  check((await page.locator('[data-highlight-surface="question-prompt"] mark[data-highlight-color="pink"]').innerText())==="Select",
   "plain prompt highlight did not use canonical source offsets");

  await page.reload({waitUntil:"load"});await route(page,"exam");
  check(await page.locator('[data-highlight-surface="question-prompt"] mark[data-highlight-color="pink"]').count()===1,
   "plain highlight did not survive reload");
  await page.locator('[data-q="0"]').click();
  check(await page.locator('[data-highlight-surface="question-prompt"] mark[data-highlight-color="yellow"]').count()===2&&
    await page.locator('[data-highlight-surface="stimulus-passage"] mark[data-highlight-color="green"]').count()===1&&
    await page.locator('[data-highlight-surface="option-text"][data-highlight-option="b"] mark[data-highlight-color="pink"]').count()===1,
   "rich prompt/stimulus/option highlights did not survive redraw and reload");

  let stored=(await records(page)).find(x=>x.id===attemptId);
  const promptHighlights=stored?.candidateScratch?.highlights?.filter(x=>
   x.surface?.kind==="question-prompt"&&x.surface.questionRevisionId===richQuestion.id&&x.color==="yellow")??[];
  check(promptHighlights.length===2&&
    promptHighlights.some(x=>x.anchor?.kind==="rich"&&JSON.stringify(x.anchor.path)==="[0,0]")&&
    promptHighlights.some(x=>x.anchor?.kind==="rich"&&JSON.stringify(x.anchor.path)==="[0,2]")&&
    !promptHighlights.some(x=>JSON.stringify(x.anchor?.path)==="[0,1]"),
   "persisted rich selection did not retain structural text-only anchors");
  check(stored?.frozen?.questions?.[0]?.contentHash===richQuestion.contentHash&&
    stored?.frozen?.questions?.[0]?.content?.richPrompt?.blocks?.[0]?.content?.[1]?.type==="math",
   "candidate highlighting mutated frozen question content");

  await selectBetween(
   '[data-highlight-surface="question-prompt"] [data-rich-path="0.0"]',0,
   '[data-highlight-surface="question-prompt"] [data-rich-path="0.0"]',5
  );
  check(!(await page.locator("#g-highlight-remove").isDisabled()),
   "selecting highlighted text did not enable removal");
  await page.locator("#g-highlight-remove").click();
  check(await page.locator('[data-highlight-surface="question-prompt"] mark[data-highlight-color="yellow"]').count()===1,
   "removal did not delete only the overlapping structural highlight");
  stored=(await records(page)).find(x=>x.id===attemptId);
  check((stored?.candidateScratch?.highlights?.length??0)===4,
   "removing one rich fragment changed unrelated candidate annotations");

  await page.setViewportSize({width:195,height:844});
  await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
  await assertNoOverflow(page,"candidate highlighting 195px 140%");
  check(!errors.length,"candidate-highlighting browser errors: "+errors.join("; "));
  console.log("CANDIDATE HIGHLIGHTING "+engine+
   " PASS: structural rich/plain anchors, atomic math, eligible stimulus, reload, remove and 195px layout");
 }catch(e){await h.diagnose("candidate-highlighting-"+engine,page,e);throw e;
 }finally{await h.finish();}
}


export async function candidateReferencePanel(){
 const {openHarness,check,assertNoOverflow,route}=await import("../../browser/fixtures.mjs");
 const {importModernPaper}=await import("../../paper-select.mjs");
 const {pkg}=await import("../../../tests/fixtures/six-kinds.mjs");
 const {sha256}=await import("../../../src/domain/hash.ts");
 const {paperRevisionHash}=await import("../../../src/domain/integrity.ts");
 const {createCandidateReferenceResource}=await import("../../../src/domain/candidate-reference.ts");
 const {validateExamPackage}=await import("../../../src/app/exam-package.ts");
 const IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4NwAAAAASUVORK5CYII=";
 const bytes=Uint8Array.from(atob(IMAGE.split(",")[1]),c=>c.charCodeAt(0));
 const asset={id:"candidate-reference-image",mediaType:"image/png",dataUri:IMAGE,
  contentHash:sha256(bytes),altText:"Reference-only diagram"};
 const quant=createCandidateReferenceResource({
  id:"quant-ref",title:"Formula and conversion sheet",category:"Quantitative",
  keywords:["formula","conversion","constants"],assetIds:[asset.id],
  document:{format:"practice-desk-rich",version:1,blocks:[
   {type:"heading",level:2,content:[{type:"text",text:"Permitted formulas",marks:["strong"]}]},
   {type:"table",rows:[
    [[{type:"text",text:"Quantity"}],[{type:"text",text:"Conversion"}]],
    [[{type:"text",text:"Length"}],[{type:"text",text:"100 centimetres = 1 metre"}]]
   ]},
   {type:"display-math",tex:"A=\\pi r^2",linearText:"Area equals pi r squared"},
   {type:"image",assetId:asset.id,altText:"Circle radius reference diagram"}
  ]}
 },[asset]);
 const law=createCandidateReferenceResource({
  id:"law-ref",title:"Permitted statutory extract",category:"Law",keywords:["statute","section"],
  document:{format:"practice-desk-rich",version:1,blocks:[
   {type:"paragraph",content:[{type:"text",text:"Section 10: candidate-visible statutory wording."}]}
  ]}
 });
 const clinical=createCandidateReferenceResource({
  id:"clinical-ref",title:"Laboratory ranges",category:"Clinical",keywords:["laboratory","range"],
  document:{format:"practice-desk-rich",version:1,blocks:[
   {type:"table",rows:[
    [[{type:"text",text:"Analyte"}],[{type:"text",text:"Reference range"}]],
    [[{type:"text",text:"Example marker"}],[{type:"text",text:"10–20 units"}]]
   ]}
  ]}
 });
 const refs=[law,quant,clinical];
 const candidateTools={...(pkg.paper.candidateTools??{}),references:refs.map(x=>({id:x.id,contentHash:x.contentHash}))};
 const paperBase={...pkg.paper,candidateTools};
 const paper={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const referencePkg=validateExamPackage({...pkg,title:"Generic authorised reference paper",paper,
  assets:[asset],candidateReferences:refs,
  explanations:{...(pkg.explanations??{}),"rev-0":"REVIEWER ONLY SECRET SHOULD NEVER ENTER THE PANEL"}});
 const engine=process.argv[2]??"chromium";
 const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
 const {page,errors}=await h.open({viewport:{width:1100,height:790}});
 try{
  await importModernPaper(page,referencePkg,"candidate-reference-panel.json");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  const trigger=page.getByRole("button",{name:"Open candidate reference materials"});
  check(await trigger.count()===1,"authored reference bindings did not expose one candidate-tool trigger");
  await trigger.click();
  const dialog=page.locator("dialog.candidate-reference-dialog");
  check(await dialog.getAttribute("open")!==null,"candidate reference dialog did not open");
  const search=page.getByRole("searchbox",{name:"Search candidate references"});
  check(await search.evaluate(el=>document.activeElement===el),"reference search did not receive initial keyboard focus");
  check((await page.locator(".candidate-reference-status").innerText()).includes("3 of 3 references shown"),
   "reference panel did not report bounded authored inventory");
  check((await dialog.innerText()).includes("Permitted statutory extract"),
   "first paper-bound reference was not selected in authored binding order");
  check(!(await dialog.innerText()).includes("REVIEWER ONLY SECRET"),
   "reviewer-only explanation leaked into candidate reference panel");
  check((await dialog.innerText()).includes("not proof of external-exam permission"),
   "reference panel overstated paper-supplied material as officially permitted");

  await search.fill("centimetres metre");
  check(await page.locator("[data-reference-id]").count()===1,
   "local body/table search did not narrow the reference inventory");
  check((await page.locator(".candidate-reference-current-title").innerText())==="Formula and conversion sheet",
   "table-text search selected the wrong reference");
  check(await page.locator('.candidate-reference-document [aria-label="Reference table"]').count()===1,
   "rich reference table did not render through shared semantic renderer");
  check(await page.locator(".candidate-reference-document .katex").count()>=1,
   "candidate reference maths did not render through offline KaTeX");
  const imageSrc=await page.locator(".candidate-reference-image").getAttribute("src");
  check(Boolean(imageSrc?.startsWith("data:image/png;base64,")),
   "reference-only image was not rendered from frozen local data");
  check(await dialog.locator('img[src^="http://"],img[src^="https://"],a[href^="http://"],a[href^="https://"]').count()===0,
   "reference panel introduced a remote runtime image/link dependency");
  const imageOpen=page.getByRole("button",{name:"Enlarge image: Circle radius reference diagram"});
  await imageOpen.click();
  const imageDialog=page.locator("dialog.generic-image-dialog");
  check(await imageDialog.getAttribute("open")!==null,
   "reference-only figure did not open in the shared verified image viewer");
  check((await imageDialog.locator("img.generic-image-large").getAttribute("alt"))==="Circle radius reference diagram",
   "shared image viewer lost the frozen reference figure alternative text");
  await page.getByRole("button",{name:"Close enlarged image"}).click();
  check(await imageOpen.evaluate(el=>document.activeElement===el),
   "closing the shared reference image viewer did not return focus to its trigger");

  await page.keyboard.press("Control+f");
  check(await search.evaluate(el=>document.activeElement===el),"Ctrl+F did not focus local reference search");
  await search.fill("");
  const category=page.getByRole("combobox",{name:"Filter candidate references by category"});
  await category.selectOption("Law");
  check(await page.locator("[data-reference-id]").count()===1&&
    (await page.locator(".candidate-reference-current-title").innerText())==="Permitted statutory extract",
   "category filter did not select the matching authored reference");
  await category.selectOption("");
  const first=page.locator("[data-reference-id]").first();
  await first.focus();await page.keyboard.press("End");
  check((await page.locator(".candidate-reference-current-title").innerText())==="Laboratory ranges",
   "End key did not navigate to the final visible reference");
  check(await page.locator("[data-reference-id]").last().getAttribute("aria-selected")==="true",
   "keyboard reference navigation did not expose selected state");

  await page.setViewportSize({width:195,height:844});
  await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
  await assertNoOverflow(page,"candidate reference panel 195px 140%");
  await page.keyboard.press("Escape");
  check(await page.locator("dialog.candidate-reference-dialog").count()===0,
   "Escape did not close candidate reference panel");
  check(await trigger.evaluate(el=>document.activeElement===el),"closing reference panel did not return focus to its trigger");

  await trigger.click();
  check((await search.inputValue())==="","reference search unexpectedly persisted as attempt data");
  check((await page.locator(".candidate-reference-status").innerText()).includes("3 of 3 references shown"),
   "reopened transient panel did not reset to the frozen authored inventory");
  await page.keyboard.press("Escape");
  check(!errors.length,"candidate-reference browser errors: "+errors.join("; "));
  console.log("CANDIDATE REFERENCES "+engine+
   " PASS: authored-only trigger, neutral trust boundary, frozen rich/table/math content, shared image viewer, local search/filter, keyboard and 195px layout");
 }catch(e){await h.diagnose("candidate-reference-panel-"+engine,page,e);throw e;
 }finally{await h.finish();}
}

export async function candidateReliabilityHandoff(){
 const {readFile}=await import("node:fs/promises");
 const {openHarness,records,check,assertNoOverflow,route}=await import("../../browser/fixtures.mjs");
 const {importModernPaper}=await import("../../paper-select.mjs");
 const {pkg}=await import("../../../tests/fixtures/six-kinds.mjs");
 const {answerKeyRevisionHash,paperRevisionHash}=await import("../../../src/domain/integrity.ts");
 const engine=process.argv[2]??"chromium";
 const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
 const {page,errors}=await h.open({viewport:{width:1100,height:790}});
 const handoffPkg={...pkg,title:"Pass F Study Handoff",
  explanations:{"rev-0":"REVIEWER SECRET MUST NOT ENTER HANDOFF"}};
 const keyBase={...pkg.answerKey,id:"key:no-review",paperId:"paper:no-review"};
 const answerKey={...keyBase,contentHash:answerKeyRevisionHash(keyBase)};
 const paperBase={...pkg.paper,id:"rev-paper:no-review",paperId:"paper:no-review",
  answerKeyRevisionId:answerKey.id,navigation:{...pkg.paper.navigation,allowReview:false}};
 const paper={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const noReview={...pkg,examId:"example-no-review",title:"No-review Study Handoff",answerKey,paper,
  explanations:{"rev-0":"NO-REVIEW SECRET"}};

 const highlightPlain=async(selector,start,end)=>{
  await page.evaluate(({selector,start,end})=>{
   const root=document.querySelector(selector),node=root?.firstChild;
   if(!root||!node||node.nodeType!==Node.TEXT_NODE)throw Error("Plain highlight target missing");
   const range=document.createRange();range.setStart(node,start);range.setEnd(node,end);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   root.dispatchEvent(new PointerEvent("pointerup",{bubbles:true}));
  },{selector,start,end});
 };
 const downloadJson=async()=>{
  const event=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download JSON"}).click();
  const file=await event;
  return JSON.parse(await readFile(await file.path(),"utf8"));
 };
 try{
  await importModernPaper(page,handoffPkg,"pass-f-handoff.json");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  const attemptId=new URL(await page.url()).searchParams.get("attempt");
  check(Boolean(attemptId),"Pass F handoff attempt identity missing");
  check((await page.locator("#g-save-state").innerText())==="Saved",
   "exam did not expose the real candidate save-state projection");
  await page.evaluate(()=>{
   const badge=document.querySelector("#g-save-state");
   window.__pdSaveStates=[badge?.textContent??""];
   window.__pdSaveObserver=new MutationObserver(()=>{
    window.__pdSaveStates.push(badge?.textContent??"");
   });
   window.__pdSaveObserver.observe(badge,{childList:true,subtree:true,characterData:true});
  });

  await page.locator('input[data-choice="a"]').check();
  await page.locator('[data-eliminate="b"]').click();
  await highlightPlain('[data-highlight-surface="question-prompt"][data-highlight-mode="plain"]',0,6);
  await page.getByRole("button",{name:"Highlight selected text yellow"}).click();
  await page.locator("#g-flag").click();
  await page.waitForFunction(()=>document.querySelector("#g-save-state")?.textContent==="Saved");
  const saveStates=await page.evaluate(()=>{
   window.__pdSaveObserver?.disconnect();
   const states=window.__pdSaveStates??[];
   delete window.__pdSaveObserver;delete window.__pdSaveStates;
   return states;
  });
  check(saveStates.includes("Saving…")&&saveStates.at(-1)==="Saved",
   "real queued persistence did not visibly transition Saving… to Saved");
  const durable=(await records(page)).find(row=>row.id===attemptId);
  check(durable?.state.responses.some(row=>row.questionRevisionId==="rev-0"&&row.response?.optionId==="a")&&
    durable?.candidateScratch?.eliminations?.some(row=>row.optionIds?.includes("b"))&&
    durable?.candidateScratch?.highlights?.some(row=>row.surface?.kind==="question-prompt"),
    "Saved indicator was shown without committed answer/annotation evidence");

  await page.locator("#g-submit").click();await route(page,"result");
  const annotationToggle=page.locator('[data-study-handoff-option="annotations"]');
  check(await annotationToggle.isChecked()===false,"candidate annotations must be opt-in");
  const basePacket=await downloadJson();
  check(basePacket.format==="practice-desk-study-handoff"&&basePacket.privacy.scope==="single-completed-attempt",
   "browser handoff did not use the bounded single-attempt contract");
  check(basePacket.inclusion.annotations===false&&
    basePacket.questions[0]?.questionId==="question-0"&&
    basePacket.questions[0]?.selected?.text==="Alpha"&&
    basePacket.questions[0]?.expected?.text==="Alpha"&&
    basePacket.questions[0]?.outcome?.verdict==="correct"&&
    basePacket.questions[0]?.flagged===true,
   "default handoff lost identity/response/key/result/flag evidence");
  const raw=JSON.stringify(basePacket);
  check(!raw.includes(attemptId)&&!raw.includes("REVIEWER SECRET")&&!raw.includes('"annotations":{'),
   "default handoff leaked attempt identity, reviewer content or candidate annotations");

  await annotationToggle.check();
  const annotated=await downloadJson();
  check(annotated.questions[0]?.annotations?.eliminatedOptions?.[0]?.optionId==="b"&&
    annotated.questions[0]?.annotations?.highlights?.[0]?.excerpt==="Choose",
   "opt-in handoff did not export exact stable elimination/highlight evidence");
  const mdEvent=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download Markdown"}).click();
  const md=await readFile(await (await mdEvent).path(),"utf8");
  check(md.startsWith("# Practice Desk — Attempt / Study Handoff")&&md.includes("```json")&&
    !md.includes(attemptId)&&!md.includes("REVIEWER SECRET"),
   "Markdown handoff diverged from the privacy-bounded canonical packet");

  await page.setViewportSize({width:195,height:844});
  await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
  await assertNoOverflow(page,"Pass F Study Handoff 195px 140%");
  await page.setViewportSize({width:1100,height:790});
  await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1"));
  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");

  await importModernPaper(page,noReview,"pass-f-no-review.json");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  await page.locator('input[data-choice="a"]').check();
  await page.locator("#g-submit").click();await route(page,"result");
  check(await page.locator('[data-study-handoff-option="expectedResponses"]').isDisabled(),
   "no-review paper exposed an enabled expected-answer handoff control");
  const withheld=await downloadJson();
  check(withheld.inclusion.expectedResponses===false&&
    withheld.questions.every(row=>row.expected===undefined)&&
    withheld.privacy.omitted.includes("unreleased-answer-key"),
   "browser handoff bypassed frozen allowReview=false");

  await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
  await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
  await page.evaluate(()=>{
   window.__pdOriginalPut=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(){throw new DOMException("Injected Pass F failure","QuotaExceededError");};
  });
  await page.locator('input[data-choice]').first().check();
  await page.waitForFunction(()=>document.querySelector("#g-save-state")?.textContent==="Save problem");
  check((await page.locator(".generic-warning").innerText()).includes("SAVE FAILED"),
   "real durable-write failure did not surface recovery guidance beside Save problem");
  await page.evaluate(()=>{
   if(window.__pdOriginalPut)IDBObjectStore.prototype.put=window.__pdOriginalPut;
   delete window.__pdOriginalPut;
  });
  check(!errors.length,"Pass F reliability/handoff browser errors: "+errors.join("; "));
  console.log("PASS F RELIABILITY/HANDOFF "+engine+
   " PASS: Saving/Saved/failure feedback, bounded downloads, privacy, no-review gate and 195px layout");
 }catch(e){await h.diagnose("candidate-reliability-handoff-"+engine,page,e);throw e;
 }finally{await h.finish();}
}

