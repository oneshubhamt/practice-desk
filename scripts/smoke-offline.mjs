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
async function testPage(page){
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
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
 fail(await page.locator('input[data-choice]:checked').first().evaluate(el=>document.activeElement===el),"Answer focus lost");
 const cgl=await find(page,x=>x.recordType==="generic-attempt"&&x.state?.responses?.some(r=>r.response));
 fail(cgl.frozen.paper.sections.length===4,"Strict CGL revision invalid");
 // Preview original inline figure using the same shared engine.
 await page.locator('[data-q="2"]').click();
 const figures=page.locator(".generic-figure");
 fail(await figures.count()>=5,"CGL figures lost in single unified exam");
 fail(await figures.first().evaluate(img=>img.complete&&img.naturalWidth>0),"CGL image did not decode");
 await page.locator("#g-library").click();
 await page.locator('[data-attempt="'+cgl.id+'"]').click();
 fail(await page.locator('input[data-choice]:checked').count()===0,"Question navigation not restored");
 await page.locator('[data-q="0"]').click();
 fail(await page.locator('input[data-choice]:checked').count()===1,"Saved CGL answer not restored");
 console.log("Chrome file://: strict CGL, figures and resume passed");

 // One completed CGL run exercises immutable scored review and history.
 for(let section=0;section<4;section++){
  page.once("dialog",d=>d.accept());
  await page.locator("#g-submit").click();
 }
 await page.getByRole("heading",{name:"Question review"}).waitFor();
 fail(await page.locator(".generic-review").count()===100,"CGL results do not contain 100 questions");
 fail(await page.locator(".generic-review .generic-figure").count()>=5,
   "Completed CGL review omitted frozen figures");
 fail(await page.locator(".generic-review .generic-figure").first().evaluate(img=>img.complete&&img.naturalWidth>0),
   "Historical review figure did not decode");
 fail(await page.locator(".generic-review").filter({hasText:"Source page"}).count()>0,
   "Source document page provenance missing from review");
 fail(await page.getByRole("heading",{name:"Section performance"}).count()===1,"Section breakdown absent");
 const completed=await find(page,x=>x.id===cgl.id&&x.finishedAt!==null);
 fail(completed.result?.items?.length===100,"Frozen CGL score not persisted");
 await page.locator("#g-library").click();
 await page.locator('[data-attempt="'+cgl.id+'"]').click();
 await page.getByRole("heading",{name:"Question review"}).waitFor();
 console.log("Chrome file://: completed CGL analytics and saved history passed");

 // Three CGL modes are paper policies, not separate application implementations.
 await page.locator("#g-library").click();
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();
 await page.locator('[data-section="2"]').click();
 fail((await find(page,x=>x.recordType==="generic-attempt"&&x.id!==cgl.id&&x.frozen.paper.timing.kind==="whole-paper")).frozen.paper.sections.length===4,
   "Flexible mode did not use full paper");
 await page.locator("#g-pause").click();
 fail(!await page.locator('input[data-choice]').first().isEnabled(),"Paused exam permits editing");
 await page.locator("#g-pause").click();
 await page.locator("#g-library").click();
 await page.locator('[data-mode="single"]').click();
 await page.locator("#g-single-section").selectOption("2");
 await page.locator("#g-start").click();
 fail(await page.locator(".generic-prompt").count()===1,"Single section failed");
 const single=await find(page,x=>x.recordType==="generic-attempt"&&x.frozen.paper.sections.length===1);
 fail(single.frozen.questions.length===25,"Single section froze incorrect question count");
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
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
 fail(await page.getByText("Separate self-assessment:",{exact:false}).count()>0,
   "Manual marks are not explicitly separated in results");
 console.log("Chrome file://: manual grading persisted without rewriting automatic score");
 console.log("Chrome file://: six response types and immutable custom result passed");

 // Pass 5: card creation never leaks answers during an active mock test.
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


 // Preferences are included in the v3 complete backup and restored with data.
 await page.locator("#themeToggle").click();
 await page.locator("#fontMore").click();
 const pending=page.waitForEvent("download");
 await page.locator("#g-export-history").click();
 const downloaded=await pending;
 const backup=JSON.parse(await readFile(await downloaded.path(),"utf8"));
 fail(backup.version===3&&backup.records.some(a=>a.id===custom.id),"All-exam backup missing records");
 fail(backup.preferences.dark===true&&backup.preferences.scale===105,"Display preferences missing from backup");
 fail(backup.records.some(a=>a.id===firstLearning.id&&a.reviews?.length===1),
   "Learning review history missing from backup");
 page.once("dialog",d=>d.accept());
 await page.locator('[data-delete="'+custom.id+'"]').click();
 const deleted=await attempts(page);
 fail(!deleted.some(a=>a.id===custom.id),"Attempt deletion not committed");
 await page.locator("#themeToggle").click();
 await page.locator("#fontReset").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-history-file").setInputFiles({name:"backup.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(backup))});
 await find(page,x=>x.id===custom.id);
 fail(await page.locator("#themeToggle").innerText()==="Light theme","Theme preference not restored");
 fail(await page.locator("#fontReset").innerText()==="105%","Font preference not restored");
 console.log("Chrome file://: complete backup, preferences, restore and deletion passed");

 // Reopen the identical local file with the same profile.
 await context.close();context=null;
 context=await chromium.launchPersistentContext(profile,opts);
 const reopened=context.pages()[0]??await context.newPage();
 const reopenedErrors=await testPage(reopened);
 await reopened.locator('[data-attempt="'+custom.id+'"]').click();
 fail(await reopened.locator(".generic-review").count()===6,"file:// reopen lost stored custom result");
 await reopened.locator("#g-library").click();
 await reopened.locator("#g-learning").click();
 fail(await reopened.locator("#learning-note").inputValue()==="Review the underlying concept.",
   "file:// restart lost FSRS notebook history");
 await reopened.locator("#learning-close").click();
 console.log("Chrome file://: profile restart restores exam and FSRS learning history");

 // Multi-tab IndexedDB conflict must reject stale overwrites.
 await reopened.locator('[data-mode="strict"]').click();
 await reopened.locator("#g-start").click();
 await reopened.locator('input[data-choice]').first().click();
 const race=await find(reopened,x=>x.recordType==="generic-attempt"&&x.finishedAt===null&&
   x.state?.responses?.some(r=>r.response)&&x.saveRevision>0);
 const second=await context.newPage();
 await testPage(second);
 await second.locator('[data-attempt="'+race.id+'"]').click();
 await second.locator('input[data-choice]').nth(1).click();
 const advanced=await find(second,x=>x.id===race.id&&x.saveRevision>race.saveRevision);
 if(await reopened.locator('input[data-choice]').count()>=3)
  await reopened.locator('input[data-choice]').nth(2).click();
 await reopened.locator(".generic-warning").filter({hasText:"Another tab"}).waitFor();
 const authoritative=(await attempts(second)).find(x=>x.id===race.id);
 fail(authoritative.saveRevision===advanced.saveRevision,"Stale tab replaced newer revision");
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
 await fallbackB.locator('[data-attempt="'+fallbackId+'"]').click();
 await fallbackB.locator('input[data-choice]').nth(1).click();
 await fallbackA.locator(".generic-warning").filter({hasText:"Fallback history changed"}).waitFor();
 const downloadFallback=fallbackA.waitForEvent("download");
 await fallbackA.locator("#g-export-history").click();
 const fallbackArchive=JSON.parse(await readFile(await (await downloadFallback).path(),"utf8"));
 fail(fallbackArchive.records.some(x=>x.id===fallbackId),"Fallback recovery export unavailable");
 console.log("Chrome file://: localStorage fallback conflict and safe export passed");

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
  await responsive.locator("#g-start").click();
  fail(await overflow()<=3,"Exam overflow at "+width);
 }
 fail(!errors.length&&!reopenedErrors.length,"Uncaught browser errors: "+errors.concat(reopenedErrors).join("; "));
 console.log("Chrome file://: responsive layouts and error-free execution passed");
}finally{
 if(context)await context.close();
 await rm(profile,{recursive:true,force:true});
}
