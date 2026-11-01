/** Current-app critical journeys: no frozen v11 screenshots or hard-coded prior SHA. */
import {readFile} from "node:fs/promises";
import {openHarness,starterBank,records,check,assertNoOverflow,route,claimNativeNavigation} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {pkg as sixKinds} from "../tests/fixtures/six-kinds.mjs";
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
  await page.locator("#g-start").click();
  await route(page,"exam");
  const attemptId=new URL(await page.url()).searchParams.get("attempt");
  check(Boolean(attemptId),"exam URL not pinned to saved attempt");
  check(await page.locator("#result-review").count()===0,"pre-submit review/solutions leaked");
  await page.locator(".exam-question input[data-choice]").first().click();
  await page.locator("#g-flag").click();
  await page.locator("#g-library").click();await route(page,"library");
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
  await page.locator("#g-library").click();await route(page,"library");
  await page.locator("#g-history").click();await route(page,"history");
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
  await page.locator("#g-start").click();await route(page,"exam");
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
  await page.locator("#g-library").click();await route(page,"library");
  const persisted=(await records(page)).find(x=>x.id===row.id);
  check(persisted.manualGrades?.some(x=>x.marks===1.5)&&
    persisted.result.snapshot.earnedMarks===row.result.snapshot.earnedMarks,
   "manual self-mark changed frozen machine score or failed to persist");
  await page.locator('[data-attempt="'+row.id+'"]').first().click();await route(page,"result");
  await page.locator("#result-tab-review").click();
  await page.locator("[data-add-card]").first().click();
  await page.locator("#g-library").click();await route(page,"library");
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
 await scenario("apfc-nat-template-untimed-and-source-review-isolation",async page=>{
  const pendingDownload=page.waitForEvent("download");
  await page.locator("#g-bank-template").click();
  const dl=await pendingDownload;
  check(dl.suggestedFilename()==="Practice_Desk_APFC_NAT_Starter.json",
   "offline starter is not downloadable");
  const bank=await starterBank();
  await page.locator("#g-file").setInputFiles({name:"apfc-nat.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(bank))});
  await page.waitForFunction(()=>document.querySelector("#g-papers")?.value===
   "bank:apfc-starter-demo:paper:r1");
  check(await page.locator("#g-papers optgroup").evaluateAll(xs=>xs.some(x=>
    x.label==="Imported / custom examinations")),"custom bank was mixed with original/reviewed selector");
  await page.locator("#g-start").click();await route(page,"exam");
  check(await page.locator("#g-timer").innerText()==="Untimed",
   "custom bank untimed scoring not honoured");
  await page.locator('input[data-choice]').first().click();
  await page.locator('[data-section="2"]').click();
  await page.locator("#g-number").fill("4");await page.locator("#g-save").click();
  await page.locator("#g-submit").click();await route(page,"result");
  const r=(await records(page)).find(x=>x.recordType==="generic-attempt"&&
    x.frozen.paper.paperId==="bank:apfc-starter-demo");
  check(r?.result?.items.length===3,"APFC author bank did not freeze MCQ/NAT correctly");
  check(Math.abs(r.result.snapshot.earnedMarks-5)<1e-8,
    "two correct + one blank should receive exactly 5/7.5 APFC marks");
  await page.locator("#g-library").click();await route(page,"library");
  await page.locator('[data-edition="reviewed"]').click();
  await page.locator('[data-mode="strict"]').click();
  await page.locator("#g-untimed").check();
  await page.locator("#g-start").click();await route(page,"exam");
  check(await page.locator("#g-timer").innerText()==="Untimed","CGL strict untimed was not applied");
  await page.locator("#g-submit").click();
  check(await page.locator('[data-section="1"]').getAttribute("aria-current")==="step",
    "untimed strict transition unexpectedly bypassed");
 });
 await h.evidence("critical-summary",{verified:evidence.length,scenarios:evidence});
}finally{await h.finish();}
console.log("MODERN CRITICAL COMPLETE "+evidence.length+" scenarios");
