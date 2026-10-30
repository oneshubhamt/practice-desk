import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { pkg as sixKindsPackage } from "../tests/fixtures/six-kinds.mjs";

const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!binary)throw Error("Headless Chrome is required for offline release acceptance");
const executablePath=spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim();
const html=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const opts={executablePath,headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]};
const profile=await mkdtemp(join(tmpdir(),"practice-desk-overhaul-"));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fail=(value,msg)=>{if(!value)throw Error(msg);};
async function attempts(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open("practiceDesk.overhaul.v1",1);
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result;
   const get=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   get.onsuccess=()=>{db.close();resolve(get.result);};
   get.onerror=()=>{db.close();reject(get.error);};
  };
 }));
}
async function find(page,predicate){
 for(let i=0;i<100;i++){
  const result=(await attempts(page)).find(predicate);
  if(result)return result;
  await delay(100);
 }
 throw Error("Timed out waiting for persisted record");
}
const navigationDialogPages=new WeakSet();
async function testPage(page){
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 if(!navigationDialogPages.has(page)){
   navigationDialogPages.add(page);
   page.on("dialog",dialog=>{
     if(/Return to library\?|unfinished test/.test(dialog.message()))void dialog.accept();
   });
 }
 page.setDefaultTimeout(20000);
 await page.goto(html,{waitUntil:"load"});
 await page.locator("#g-start").waitFor({state:"visible"});
 return errors;
}
let context;
try{
 context=await chromium.launchPersistentContext(profile,opts);
 const page=context.pages()[0]??await context.newPage();
 const errors=await testPage(page);
 fail(await page.locator(".generic-layout").count()===1,"Unified library not visible");
 fail(await page.locator('[data-mode="strict"]').count()===1,"CGL mode selector absent");
 await page.locator("#g-start").click();
 fail(await page.locator('[data-section="1"]').isDisabled(),"Strict CGL sections not locked");
 await page.locator('input[data-choice]').first().click();
 await page.locator('input[data-choice]').nth(1).click();
 await page.locator('input[data-choice]').first().click();
 fail(await page.locator('input[data-choice]:checked').first().evaluate(el=>document.activeElement===el),"Answer focus lost");
 const cgl=await find(page,x=>x.recordType==="generic-attempt"&&x.state?.responses?.some(r=>r.response));
 fail(cgl.frozen.paper.sections.length===4,"Strict CGL revision invalid");
 // Native keyboard focus and a non-input shortcut should navigate the same engine.
 fail(await page.locator(".exam-time-progress[role=progressbar]").count()===1,
   "Exam time progress or accessible progressbar missing");
 await page.locator("#g-library").focus();
 await page.keyboard.press("Alt+ArrowRight");
 fail(await page.locator('[data-q="1"]').getAttribute("aria-current")==="step",
   "Alt+Right did not navigate the current section");
 await page.locator('[data-q="0"]').click();
 // Preview original inline figure using the same shared engine.
 await page.locator('[data-q="2"]').click();
 const figures=page.locator(".generic-figure");
 fail(await figures.count()>=5,"CGL figures lost in single unified exam");
 fail(await figures.first().evaluate(img=>img.complete&&img.naturalWidth>0),"CGL image did not decode");
 await page.locator("#g-library").click();
 await page.locator('[data-attempt="'+cgl.id+'"]').first().click();
 fail(await page.locator('input[data-choice]:checked').count()===0,"Question navigation not restored");
 await page.locator('[data-q="0"]').click();
 fail(await page.locator('input[data-choice]:checked').count()===1,"Saved CGL answer not restored");
 console.log("Chrome file://: strict CGL, figures and resume passed");

 // One completed CGL run exercises immutable scored review and history.
 for(let section=0;section<4;section++){
  page.once("dialog",d=>d.accept());
  await page.locator("#g-submit").click();
 }
 await page.locator('[data-result-tab="review"]').click();
 await page.getByRole("heading",{name:"Question review"}).waitFor();
 fail(await page.locator(".generic-review").count()===100,"CGL results do not contain 100 questions");
 fail(await page.locator(".generic-review .generic-figure").count()>=5,
   "Completed CGL review omitted frozen figures");
 fail(await page.locator(".generic-review .generic-figure").first().evaluate(img=>img.complete&&img.naturalWidth>0),
   "Historical review figure did not decode");
 fail(await page.locator(".generic-review").filter({hasText:"Source page"}).count()>0,
   "Source document page provenance missing from review");
 await page.locator('[data-result-tab="overview"]').click();
 fail(await page.getByRole("heading",{name:"Section performance"}).count()===1,"Section breakdown absent");
 const completed=await find(page,x=>x.id===cgl.id&&x.finishedAt!==null);
 fail(completed.result?.items?.length===100,"Frozen CGL score not persisted");
 fail(completed.sourceKeyReference?.entries?.length===100,
   "Reviewed CGL attempt did not pin its original source key");
 fail(await page.getByText("Original-source key (unadjusted):",{exact:false}).count()===1,
   "Original-key comparison is missing or mislabelled");
 await page.locator("#g-library").click();
 await page.locator('[data-attempt="'+cgl.id+'"]').first().click();
 await page.locator('[data-result-tab="review"]').click();
 await page.getByRole("heading",{name:"Question review"}).waitFor();
 // Pass 9: independent insights, review and timing tabs, source media and filters.
 await page.locator('[data-result-tab="review"]').focus();
 await page.keyboard.press("ArrowRight");
 fail(await page.locator("#result-timing").isVisible(),
   "Result tab arrow-key navigation failed");
 await page.locator('[data-result-tab="timing"]').click();
 fail(await page.locator("#result-timing tbody tr").count()===100,
   "Item-level timing ledger incomplete");
 await page.locator("#result-timing [data-ledger-q]").first().click();
 fail(await page.locator("#result-review").isVisible(),"Ledger did not open filtered review");
 await page.locator("#g-review-filter").selectOption("incorrect");
 const incorrectCount=await page.locator(".generic-review").count();
 fail(incorrectCount===completed.result.snapshot.incorrectCount,
   "Review filter did not match frozen incorrect count");
 await page.locator("#g-review-filter").selectOption("all");
 await page.locator('[data-result-tab="overview"]').click();
 fail(await page.locator("#g-attempt-evidence").isVisible(),
   "Performance analytics not visible in insights");
 fail(await page.locator(".answer-revision-panel").isVisible(),
   "Actual answer change evidence missing from v11-grade insights");
 await page.locator('[data-review-preset="incorrect"]').click();
 fail(await page.locator("#g-review-filter").inputValue()==="incorrect",
   "Marks-opportunity card did not open targeted question review");
 await page.locator('[data-result-tab="overview"]').click();

 console.log("Chrome file://: completed CGL analytics and saved history passed");

 // Pass 9: history has its own independently navigable, sortable, filtered workspace.
 await page.locator("#g-library").click();
 await page.locator("#g-history").click();
 await page.getByRole("heading",{name:"History & insights"}).waitFor();
 fail(await page.locator(".history-summary .summary-stat").count()===6&&
   (await page.locator(".history-summary").innerText()).includes("Papers practised")&&
   (await page.locator(".history-summary").innerText()).includes("Best adjusted %"),
   "History statistics missing");
 await page.locator("#g-filter").selectOption("complete");
 fail(await page.locator('[data-attempt="'+cgl.id+'"]').count()===1,
   "History filter did not retain completed attempt");
 await page.locator("#g-history-sort").selectOption("oldest");
 await page.locator("#g-history-search").fill("nonexistent paper query");
 fail(await page.locator(".history-entries").count()===0,
   "Search did not filter history");
 await page.locator("#g-history-search").fill("");
 await page.locator("#g-filter").selectOption("all");
 await page.locator("#g-library").click();
 fail(await page.locator(".home-stats .home-stat").count()===4,
   "Home dashboard statistics missing");
 console.log("Chrome file://: Pass 9 responsive home, filtered history and return route passed");

 // Three CGL modes are paper policies, not separate application implementations.
 await page.locator('[data-mode="free"]').click();
 fail((await page.locator(".preview-metrics").innerText()).includes("Free"),
   "Flexible mode preview incorrectly shows locked navigation");
 await page.locator("#g-start").click();
 await page.locator('[data-section="2"]').click();
 fail((await find(page,x=>x.recordType==="generic-attempt"&&x.id!==cgl.id&&x.frozen.paper.timing.kind==="whole-paper")).frozen.paper.sections.length===4,
   "Flexible mode did not use full paper");
 await page.locator("#g-pause").click();
 fail(!await page.locator('input[data-choice]').first().isEnabled(),"Paused exam permits editing");
 await page.locator("#g-pause").click();
 await page.locator("#g-library").click();
 await page.locator('[data-mode="single"]').click();
 fail((await page.locator(".preview-metrics").innerText()).includes("One section"),
   "Single-section preview incorrectly claims four sections");
 await page.locator("#g-single-section").selectOption("2");
 await page.locator("#g-start").click();
 fail(await page.locator(".generic-prompt").count()===1,"Single section failed");
 const single=await find(page,x=>x.recordType==="generic-attempt"&&x.frozen.paper.sections.length===1);
 fail(single.frozen.questions.length===25,"Single section froze incorrect question count");
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
 await page.locator('[data-result-tab="review"]').click();
 fail(await page.locator(".generic-review").count()===25,"Single section review invalid");
 console.log("Chrome file://: flexible and single-section policies passed");

 // Import a non-CGL fixture and exercise all six answer kinds in the same UI.
 await page.locator("#g-library").click();
 await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(sixKindsPackage))});
 await page.locator("#g-papers").selectOption("rev-paper");
 await page.locator("#g-start").click();
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-next").click();
 await page.locator('input[data-choice]').first().click();
 await page.locator(".generic-inline-warning").waitFor();
 await page.locator('input[data-choice]').nth(2).click();
 await page.locator("#g-next").click();
 await page.locator("#g-number").fill("3.5");
 await page.locator("#g-save").click();
 await page.locator('[data-section="1"]').click();
 await page.locator('input[data-bool="true"]').click();
 await page.locator("#g-next").click();
 await page.locator('select[data-match]').nth(0).selectOption("r1");
 await page.locator('select[data-match]').nth(1).selectOption("r2");
 await page.locator("#g-save").click();
 await page.locator("#g-next").click();
 await page.locator("#g-text").fill("A short written explanation.");
 await page.locator("#g-save").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
 await page.locator('[data-result-tab="review"]').click();
 fail(await page.locator(".generic-review").count()===6,"Six response kinds were not reviewed");
 const custom=await find(page,x=>x.recordType==="generic-attempt"&&x.packageId==="rev-paper"&&x.finishedAt);
 fail(custom.result.snapshot.correctCount===5,"Custom exam score incorrect");
 // Explicit written-answer grading must be durable and stay outside the machine-scored snapshot.
 await page.locator('[data-manual-marks="rev-5"]').fill("1.5");
 await page.locator('[data-manual-note="rev-5"]').fill("Self assessed using the rubric.");
 await page.locator('[data-manual-save="rev-5"]').click();
 const graded=await find(page,x=>x.id===custom.id&&x.manualGrades?.some(g=>g.marks===1.5));
 fail(graded.result.snapshot.earnedMarks===custom.result.snapshot.earnedMarks,
   "Manual self-marking changed the immutable automated score");
 fail(graded.manualGrades[0].note==="Self assessed using the rubric.","Written grading note was not persisted");
 await page.locator('[data-result-tab="overview"]').click();
 fail(await page.getByText("Separate self-assessment:",{exact:false}).count()>0,
   "Manual marks are not explicitly separated in results");
 console.log("Chrome file://: manual grading persisted without rewriting automatic score");
 console.log("Chrome file://: six response types and immutable custom result passed");

 // Pass 5: card creation never leaks answers during an active mock test.
 await page.locator('[data-result-tab="review"]').click();
 await page.locator("[data-add-card]").first().click();
 const firstLearning=await find(page,x=>x.recordType==="learning-card");
 fail(firstLearning.reviews.length===0,"Mock answers were incorrectly treated as FSRS ratings");
 await page.locator("#g-library").click();
 await page.locator("#g-learning").click();
 await page.locator("#learning-due").click();
 fail(await page.locator(".learning-answer").count()===0,"Review answer leaked before reveal");
 await page.locator("#learning-reveal").click();
 fail(await page.locator(".learning-answer").count()===1,"Review answer failed to reveal");
 await page.locator('[data-grade="3"]').click();
 await page.locator("#learning-note").waitFor({state:"visible"});
 await page.locator("#learning-error").selectOption("conceptual");
 await page.locator("#learning-topic").fill("Explicit user subtopic");
 await page.locator("#learning-note").fill("Review the underlying concept.");
 await page.locator("#learning-save").click();
 const ratedLearning=await find(page,x=>x.id===firstLearning.id&&x.reviews?.length===1&&
   x.note==="Review the underlying concept.");
 fail(ratedLearning.errorLabel==="conceptual"&&ratedLearning.customTopic==="Explicit user subtopic",
   "Notebook classification or user topic did not save");
 fail(await page.getByRole("heading",{name:"Topic performance"}).count()===1,
   "Learning analytics are missing");
 await page.locator("#learning-close").click();
 console.log("Chrome file://: Pass 5 FSRS-7 review, notebook notes and topic analytics passed");

 // Pass 8: turn the frozen notebook into a real practice test; never leak solutions.
 await page.locator("#g-learning").click();
 fail(await page.locator("#learning-test").count()===1,"Notebook revision-test entry missing");
 await page.locator("#learning-test").click();
 await page.locator(".generic-prompt").waitFor();
 const revision=await find(page,x=>x.recordType==="generic-attempt"&&
   x.frozen.paper.paperId?.startsWith("notebook-revision:")&&x.finishedAt===null);
 fail(revision.frozen.paper.timing.kind==="untimed"&&revision.frozen.snapshot.mode==="custom-practice",
   "Notebook revision did not start through the generic exam engine");
 fail(revision.notebookLineage?.entries?.length===1&&
   revision.notebookLineage.entries[0].sourceAttemptId===custom.id,
   "Revision lacks the source notebook and completed-attempt provenance");
 fail(revision.frozen.paper.scoring.defaultRule.correctMarks===1&&
   revision.frozen.paper.scoring.defaultRule.incorrectMarks===0,
   "Notebook revision incorrectly inherited official test marks");
 fail(await page.locator(".learning-answer").count()===0,
   "Answer revealed in an active generated exam");
 fail(await page.locator("#g-attempt-evidence").count()===0,
   "Results analytics leaked into an active test");
 const revisionButtons=await page.locator('input[data-choice]').count();
 fail(revisionButtons>=2,"Generated revision question controls missing");
 await page.locator('input[data-choice]').first().click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
 await page.locator("#g-attempt-evidence").waitFor();
 const revisedCompleted=await find(page,x=>x.id===revision.id&&x.finishedAt!==null);
 fail(revisedCompleted.result.items.length===1,"Revision exam did not complete as a normal attempt");
 fail(await page.locator(".generic-review").count()===0,
   "Lazy Review must not be rendered while Overview is selected");
 await page.locator('[data-result-tab="review"]').click();
 fail(await page.locator(".generic-review").count()===1,
   "Active Revision Review did not render the frozen notebook question");
 fail(await page.getByText("Notebook source:",{exact:false}).count()>0,
   "Revision review lost its origin metadata");
 await page.locator("#g-library").click();
 await page.locator('[data-attempt="'+revision.id+'"]').first().click();
 await page.locator('[data-result-tab="overview"]').click();
 fail(await page.locator("#g-attempt-evidence").count()===1,
   "Generated revision Overview was not available in persisted attempt history");
 const unchangedCard=await find(page,x=>x.id===firstLearning.id);
 fail(unchangedCard.reviews.length===1,
   "Taking a generated revision exam improperly changed FSRS rating history");
 await page.locator("#g-library").click();
 console.log("Chrome file://: notebook-generated revision, scoring, analysis and reopening passed");


 // Preferences are included in the v3 complete backup and restored with data.
 await page.locator("#displayTrigger").click();
 fail(await page.locator("#displayPanel").isVisible(),"Compact appearance popover did not open");
 fail(await page.locator("#displayFullscreen").count()===1,"Full-screen option missing");
 await page.keyboard.press("Escape");
 fail(!(await page.locator("#displayPanel").isVisible()),"Display popover ignored Escape");
 await page.locator("#displayTrigger").click();
 await page.locator("#themeToggle").click();
 fail(await page.evaluate(()=>document.documentElement.dataset.theme)==="dark","Dark appearance not applied");
 await page.locator("#fontMore").click();
 const pending=page.waitForEvent("download");
 await page.locator("#g-export-history").click();
 const downloaded=await pending;
 const backup=JSON.parse(await readFile(await downloaded.path(),"utf8"));
 fail(backup.version===3&&backup.records.some(a=>a.id===custom.id),"All-exam backup missing records");
 fail(backup.preferences.dark===true&&backup.preferences.scale===105,"Display preferences missing from backup");
 fail(backup.records.some(a=>a.id===firstLearning.id&&a.reviews?.length===1),
   "Learning review history missing from backup");
 fail(backup.records.some(a=>a.id===custom.id&&a.manualGrades?.[0]?.marks===1.5),
   "Written self-assessment missing from complete backup");
 fail(backup.records.some(a=>a.id===cgl.id&&a.sourceKeyReference?.entries?.length===100),
   "Frozen original-source key missing from complete backup");
 fail(backup.records.some(a=>a.id===revision.id&&a.notebookLineage?.entries[0]?.sourceAttemptId===custom.id&&a.frozen.paper.edition==="custom"),
   "Notebook revision test missing from full backup");
 await page.locator("#g-history").click();
 page.once("dialog",d=>d.accept());
 await page.locator('[data-delete="'+custom.id+'"]').click();
 const deleted=await attempts(page);
 fail(!deleted.some(a=>a.id===custom.id),"Attempt deletion not committed");
 await page.locator("#displayTrigger").click();
 await page.locator("#themeToggle").click();
 await page.locator("#fontReset").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-history-file").setInputFiles({name:"backup.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(backup))});
 const importedCustom=await find(page,x=>x.id===custom.id);
 fail(importedCustom.manualGrades?.[0]?.marks===1.5,
   "Backup restore did not retain written self-assessment");
 fail(await page.locator("#themeToggle").getAttribute("aria-pressed")==="true"&&
   await page.locator("html").getAttribute("data-theme")==="dark","Theme preference not restored");
 fail(await page.locator("#fontReset").innerText()==="105%","Font preference not restored");
 console.log("Chrome file://: complete backup, preferences, restore and deletion passed");

 // Reopen the identical local file with the same profile.
 await context.close();context=null;
 context=await chromium.launchPersistentContext(profile,opts);
 const reopened=context.pages()[0]??await context.newPage();
 const reopenedErrors=await testPage(reopened);
 await reopened.locator("#g-history").click();
 await reopened.locator('[data-attempt="'+custom.id+'"]').first().click();
 await reopened.locator('[data-result-tab="review"]').click();
 fail(await reopened.locator(".generic-review").count()===6,"file:// reopen lost stored custom result");
 fail(await reopened.locator('[data-manual-marks="rev-5"]').inputValue()==="1.5",
   "file:// reopen lost independent written self-assessment");
 await reopened.locator("#g-library").click();
 await reopened.locator("#g-learning").click();
 fail(await reopened.locator("#learning-note").inputValue()==="Review the underlying concept.",
   "file:// restart lost FSRS notebook history");
 await reopened.locator("#learning-close").click();
 console.log("Chrome file://: profile restart restores exam and FSRS learning history");

 // The frozen strict-mode policy has its own hashed revision identity;
 // the library lists the underlying source paper revision, not that derived
 // practice revision. Re-select the original source before choosing mode.
 fail(cgl.packageId.endsWith(":practice:strict"),"Saved strict revision identity is missing its mode suffix");
 const sourcePaperRevisionId=cgl.packageId.slice(0,-":practice:strict".length);
 await reopened.locator("#g-papers").selectOption(sourcePaperRevisionId);
 await reopened.locator('[data-mode="strict"]').click();
 await reopened.locator("#g-start").click();
 await reopened.locator('input[data-choice]').first().click();
 const race=await find(reopened,x=>x.recordType==="generic-attempt"&&x.finishedAt===null&&
   x.state?.responses?.some(r=>r.response)&&x.saveRevision>0);
 // Keep the first tab's local revision stale without a competing periodic timer
 // changing the authoritative record during the controlled two-tab race.
 await reopened.locator("#g-library").click();
 // Do not race with the first tab's departure checkpoint: establish the
 // actual committed baseline before making the second tab authoritative.
 const departed=await find(reopened,x=>x.id===race.id&&
   x.saveRevision>race.saveRevision&&x.state.visible===false);
 const second=await context.newPage();
 await testPage(second);
 await second.locator("#g-history").click();
 await second.locator('[data-attempt="'+race.id+'"]').first().click();
 fail(await second.locator('input[data-choice]').count()>=3,
   "Concurrent history resume failed: "+await second.locator("main").innerText().then(text=>text.slice(0,240)));
 const secondOption=await second.locator('input[data-choice]').nth(1).getAttribute("data-choice");
 fail(Boolean(secondOption),"Second-tab answer option unavailable");
 await second.locator('input[data-choice]').nth(1).click();
 // A saveRevision bump alone can reflect the second tab's *restore*
 // checkpoint. Wait for its different answer to be durably committed.
 const advanced=await find(second,x=>x.id===race.id&&x.saveRevision>departed.saveRevision&&
   x.state.responses.some(row=>row.response?.kind==="single-choice"&&
     row.response.optionId===secondOption));
 if(await reopened.locator('[data-attempt="'+race.id+'"]').count())
  await reopened.locator('[data-attempt="'+race.id+'"]').first().click();
 // A stale-tab rejection may remove the exam inputs while a click is pending.
 // Dispatch at most one synchronous user-level click if the form still exists.
 await reopened.evaluate(()=>document.querySelectorAll('input[data-choice]')[2]?.click());
 await reopened.locator(".generic-warning").filter({hasText:"Another tab"}).waitFor();
 const authoritative=(await attempts(second)).find(x=>x.id===race.id);
 const latestAnswer=authoritative?.state.responses.find(row=>row.response)?.response;
 const secondAnswer=advanced.state.responses.find(row=>row.response)?.response;
 fail(authoritative?.saveRevision>=advanced.saveRevision&&
   JSON.stringify(latestAnswer)===JSON.stringify(secondAnswer),
   "Stale tab replaced newer answer or revision");
 console.log("Chrome file://: stale-tab IndexedDB write rejected");

 // A blocked IndexedDB session uses conflict-aware fallback with usable export.
 const fallbackA=await context.newPage();
 await fallbackA.addInitScript(()=>Object.defineProperty(window,"indexedDB",{configurable:true,value:undefined}));
 await testPage(fallbackA);
 await fallbackA.locator("#g-start").click();
 await fallbackA.locator('input[data-choice]').first().click();
 let fallbackId;
 for(let i=0;i<100;i++){
  fallbackId=await fallbackA.evaluate(()=>{
   const items=JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]");
   return items.find(x=>x.recordType==="generic-attempt"&&x.state.responses.some(r=>r.response))?.id;
  });
  if(fallbackId)break;
  await delay(100);
 }
 fail(fallbackId,"LocalStorage fallback didn't retain answer");
 const fallbackB=await context.newPage();
 await fallbackB.addInitScript(()=>Object.defineProperty(window,"indexedDB",{configurable:true,value:undefined}));
 await testPage(fallbackB);
 await fallbackB.locator('[data-attempt="'+fallbackId+'"]').first().click();
 await fallbackB.locator('input[data-choice]').nth(1).click();
 await fallbackA.locator(".generic-warning").filter({hasText:"Fallback history changed"}).waitFor();
 const downloadFallback=fallbackA.waitForEvent("download");
 await fallbackA.locator("#g-export-history").click();
 const fallbackArchive=JSON.parse(await readFile(await (await downloadFallback).path(),"utf8"));
 fail(fallbackArchive.records.some(x=>x.id===fallbackId),"Fallback recovery export unavailable");
 console.log("Chrome file://: localStorage fallback conflict and safe export passed");

 // An opened IndexedDB with a failed initial read must also switch writes.
 const readFailure=await context.newPage();
 await readFailure.addInitScript(()=>{
  IDBObjectStore.prototype.getAll=function(){
   throw new Error("Injected initial IndexedDB read failure");
  };
 });
 await testPage(readFailure);
 await readFailure.locator(".generic-warning").filter({hasText:"IndexedDB unavailable"}).waitFor();
 const fallbackBefore=await readFailure.evaluate(()=>
  JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]").length);
 await readFailure.locator("#g-start").click();
 await readFailure.locator('input[data-choice]').first().click();
 let fallbackAfter=0;
 for(let i=0;i<100;i++){
  fallbackAfter=await readFailure.evaluate(()=>
   JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]").length);
  if(fallbackAfter>fallbackBefore)break;
  await delay(100);
 }
 fail(fallbackAfter>fallbackBefore,
  "Failed initial IndexedDB read did not switch writes to fallback storage");
 console.log("Chrome file://: failed initial IndexedDB read uses durable fallback");


 // Inject a synchronous IndexedDB write rejection. No success claim may survive the failed commit,
 // and an explicitly named recovery export must contain the in-memory unsaved record.
 const denied=await context.newPage();
 await testPage(denied);
 const savedIds=new Set((await attempts(denied)).map(x=>x.id));
 await denied.evaluate(()=>{
   const original=IDBObjectStore.prototype.put;
   Object.defineProperty(window,"__originalPut",{value:original});
   IDBObjectStore.prototype.put=function(){
     throw new DOMException("Injected quota denial","QuotaExceededError");
   };
 });
 await denied.locator("#g-start").click();
 await denied.locator(".generic-warning").filter({hasText:"SAVE FAILED"}).waitFor();
 await denied.locator("#g-library").click();
 const emergencyDownload=denied.waitForEvent("download");
 await denied.locator("#g-export-history").click();
 const emergencyFile=await emergencyDownload;
 fail(emergencyFile.suggestedFilename().includes("UNSAVED_RECOVERY"),
   "Failed write not labelled as an unsaved recovery backup");
 const emergencyBackup=JSON.parse(await readFile(await emergencyFile.path(),"utf8"));
 fail(emergencyBackup.version===3&&emergencyBackup.records.some(x=>
   x.recordType==="generic-attempt"&&!savedIds.has(x.id)),
   "Emergency export did not retain rejected in-memory attempt");
 fail(await denied.locator(".generic-warning").filter({hasText:"Emergency recovery file"}).count()===1,
   "Recovery export did not explain non-durable state");
 console.log("Chrome file://: quota-denied save and unsaved recovery export passed");

 // Mobile/tablet screens must remain within viewport.
 const responsive=await context.newPage();
 for(const width of [390,768]){
  await responsive.setViewportSize({width,height:844});
  await testPage(responsive);
  const overflow=()=>responsive.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  fail(await overflow()<=3,"Library overflow at "+width);
  await responsive.locator("#g-history").click();
  fail(await overflow()<=3,"History overflow at "+width);
  await responsive.locator('[data-attempt="'+cgl.id+'"]').first().click();
  fail(await overflow()<=3,"Result insights overflow at "+width);
  await responsive.locator('[data-result-tab="review"]').click();
  fail(await overflow()<=3,"Result review overflow at "+width);
  await responsive.locator('[data-result-tab="timing"]').click();
  fail(await overflow()<=3,"Time ledger overflow at "+width);
  await responsive.locator("#g-library").click();
  await responsive.locator("#g-learning").click();
  fail(await overflow()<=3,"Learning notebook overflow at "+width);
  await responsive.locator("#learning-close").click();
  await responsive.locator("#g-start").click();
  fail(await overflow()<=3,"Exam overflow at "+width);
 }
 fail(!errors.length&&!reopenedErrors.length,"Uncaught browser errors: "+errors.concat(reopenedErrors).join("; "));
 console.log("Chrome file://: responsive layouts and error-free execution passed");
}finally{
 if(context)await context.close();
 await rm(profile,{recursive:true,force:true});
}
