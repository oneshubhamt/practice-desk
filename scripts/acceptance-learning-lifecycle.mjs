/** Notebook-generated exam and truly persistent Learning/backup provenance.
 * Direct current six-kind attempt, manual marks, FSRS evidence and re-test.
 */
import {readFile} from "node:fs/promises";
import {openHarness,records,check,route} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
async function saved(predicate,label){
 for(let i=0;i<55;i++){
  const x=(await records(page)).find(predicate);
  if(x)return x;
  await page.waitForTimeout(75);
 }
 throw Error("Expected persisted "+label);
}
try{
 await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(pkg))});
 await chooseModernPaper(page,pkg.paper.id);
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator("input[data-choice]").first().click();
 await page.locator("#g-next").click();
 await page.locator("input[data-choice]").first().click();
 await page.locator("input[data-choice]").nth(2).click();
 await page.locator("#g-next").click();
 await page.locator("#g-number").fill("3.5");await page.locator("#g-save").click();
 await page.locator('[data-section="1"]').click();
 await page.locator('input[data-bool="true"]').click();
 await page.locator("#g-next").click();
 await page.locator('select[data-match]').nth(0).selectOption("r1");
 await page.locator('select[data-match]').nth(1).selectOption("r2");
 await page.locator("#g-save").click();await page.locator("#g-next").click();
 await page.locator("#g-text").fill("A compact human-graded explanation.");
 await page.locator("#g-save").click();
 await page.locator("#g-submit").click();await route(page,"result");
 await page.locator("#result-tab-review").click();
 check(await page.locator(".generic-review").count()===6,
  "Six different authored response kinds did not complete");
 const custom=await saved(x=>x.recordType==="generic-attempt"&&
  x.packageId===pkg.paper.id&&x.finishedAt!==null,"finished generic result");
 check(custom.result.snapshot.correctCount===5,
  "Generic automated marks must not include pending self-assessed essay");
 await page.locator('[data-manual-marks="rev-5"]').fill("1.5");
 await page.locator('[data-manual-note="rev-5"]').fill("Rubric checked independently");
 await page.locator('[data-manual-save="rev-5"]').click();
 const graded=await saved(x=>x.id===custom.id&&
  x.manualGrades?.some(y=>y.marks===1.5),"written self-assessment");
 check(graded.result.snapshot.earnedMarks===custom.result.snapshot.earnedMarks&&
  graded.manualGrades[0].note==="Rubric checked independently",
  "Manual grade overwrote machine score or note failed durable storage");
 await page.locator("#result-tab-overview").click();
 check(await page.getByText("Separate self-assessment:",{exact:false}).count()>0,
  "Manual feedback was not clearly separated from automated scoring");
 await page.locator("#result-tab-review").click();
 await page.locator("[data-add-card]").first().click();
 const card=await saved(x=>x.recordType==="learning-card"&&x.sourceAttemptId===custom.id,"learning card");
 check(card.reviews.length===0,"Answers were silently converted to FSRS ratings");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 await page.locator("#learning-due").click();
 check(await page.locator(".learning-answer").count()===0,"FSRS answer leaked pre-reveal");
 await page.locator("#learning-reveal").click();
 check(await page.locator(".learning-answer").count()===1,"FSRS answer did not reveal");
 await page.locator('[data-grade="3"]').click();
 await page.locator("#learning-note").waitFor({state:"visible"});
 await page.locator("#learning-error").selectOption("conceptual");
 await page.locator("#learning-topic").fill("Independently labelled topic");
 await page.locator("#learning-note").fill("Review source fundamentals");
 await page.locator("#learning-save").click();
 const rated=await saved(x=>x.id===card.id&&x.reviews?.length===1&&
   x.note==="Review source fundamentals","explicit FSRS-rated notebook");
 check(rated.errorLabel==="conceptual"&&
  rated.customTopic==="Independently labelled topic",
  "Notebook user error-type/topic annotations did not persist");
 check(await page.getByRole("heading",{name:"Topic performance"}).count()===1,
  "Learning topic performance not accessible");
 await page.locator("#learning-close").click();await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 check(await page.locator("#learning-test").count()===1,
  "Notebook re-test control missing");
 await page.locator("#learning-test").click();await route(page,"exam");
 const revision=await saved(x=>x.recordType==="generic-attempt"&&x.finishedAt===null&&
  x.frozen.paper.paperId?.startsWith("notebook-revision:"),"generated revision");
 check(revision.frozen.paper.timing.kind==="untimed"&&
  revision.frozen.snapshot.mode==="custom-practice"&&
  revision.notebookLineage?.entries?.length===1&&
  revision.notebookLineage.entries[0].sourceAttemptId===custom.id,
  "Notebook practice is not independently frozen, untimed, source-pinned");
 check(revision.frozen.paper.scoring.defaultRule.correctMarks===1&&
  revision.frozen.paper.scoring.defaultRule.incorrectMarks===0,
  "Notebook review exam inherited high-stakes exam negative marking");
 check(await page.locator(".learning-answer").count()===0&&
  await page.locator(".result-time-pacing,.result-opportunities,.result-speed-accuracy").count()===0,
  "Generated live revision exam disclosed answer or analysis");
 check(await page.locator("input[data-choice]").count()>=2,
  "Generated notebook revision rendered no answer choices");
 await page.locator("input[data-choice]").first().click();
 await page.locator("#g-submit").click();await route(page,"result");
 check(await page.locator(".generic-review").count()===0,
  "Generated notebook review rendered eagerly during Overview");
 await page.locator("#result-tab-review").click();
 check(await page.locator(".generic-review").count()===1&&
  await page.getByText("Notebook source:",{exact:false}).count()>0,
  "Notebook source provenance lost in scored re-test review");
 const revisionFinished=await saved(x=>x.id===revision.id&&x.finishedAt!==null,
  "completed re-test");
 check(revisionFinished.result.items.length===1&&
  (await records(page)).find(x=>x.id===card.id)?.reviews.length===1,
  "Re-test did not score normally or silently rewrote FSRS rating");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator('[data-attempt="'+revision.id+'"]').first().click();await route(page,"result");
 check(await page.locator(".result-time-pacing").count()===1&&
  await page.locator(".result-opportunities").count()===1,
  "Generated and persisted re-test lost normal Results analytics");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#displayTrigger").click();await page.locator("#themeDark").click();
 await page.locator("#fontMore").click();
 await page.locator("#displayClose").click();
 await page.locator("#g-history").click();await route(page,"history");
 const download=page.waitForEvent("download");await page.locator("#g-export-history").click();
 const archive=JSON.parse(await readFile(await (await download).path(),"utf8"));
 check(archive.version===3&&archive.preferences.dark===true&&
  archive.preferences.scale===105,"Backup omitted explicit appearance settings");
 check(archive.records.some(x=>x.id===custom.id&&x.manualGrades?.[0]?.marks===1.5)&&
  archive.records.some(x=>x.id===card.id&&x.reviews?.length===1)&&
  archive.records.some(x=>x.id===revision.id&&
    x.notebookLineage?.entries[0]?.sourceAttemptId===custom.id),
  "Backup omitted linked source exam, manual marks, FSRS ratings or notebook provenance");
 await page.locator('[data-delete="'+custom.id+'"]').click();
 check(!(await records(page)).some(x=>x.id===custom.id),"Deletion of saved attempt failed");
 await page.locator("#displayTrigger").click();await page.locator("#themeLight").click();
 await page.locator("#fontReset").click();await page.locator("#displayClose").click();
 await page.locator("#g-history-file").setInputFiles({name:"verified.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(archive))});
 await saved(x=>x.id===custom.id&&x.manualGrades?.some(y=>y.marks===1.5),
  "additively restored self-assessment");
 check(await page.locator("#themeToggle").getAttribute("aria-pressed")==="true"&&
  await page.locator("#fontReset").innerText()==="105%",
  "Imported backup did not restore explicitly saved theme/font preference");
 await page.reload({waitUntil:"load"});await route(page,"history");
 await page.locator('[data-attempt="'+custom.id+'"]').first().click();await route(page,"result");
 await page.locator("#result-tab-review").click();
 check(await page.locator('[data-manual-marks="rev-5"]').inputValue()==="1.5",
  "File reload lost saved independently graded writing");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 check(await page.locator("#learning-note").inputValue()==="Review source fundamentals",
  "File reload lost rated notebook classification/note");
 check(errors.length===0,"Browser errors: "+errors.join("; "));
 await h.evidence("learning-lifecycle",{sixKinds:true,manualGrades:true,explicitFSRS:true,
  notebookRevision:true,backupCrossRecords:true,reload:true});
 console.log("MODERN LEARNING PASS six-kind manual marks, rated notebook, source-derived revision, FSRS independence, backup v3 and reload");
}catch(e){await h.diagnose("learning-lifecycle",page,e);throw e;}
finally{await context.close();await h.finish();}
