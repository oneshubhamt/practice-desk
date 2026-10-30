import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const cmd=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(name=>spawnSync(name,["--version"],{encoding:"utf8"}).status===0);
if(!cmd)throw Error("Chromium executable unavailable for Pass 11 targeted QA");
const executablePath=spawnSync("which",[cmd],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"practice-desk-pass11-"));
const path=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const assert=(condition,message)=>{if(!condition)throw Error(message);};
let context;
async function stored(page){
 return page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{
     const request=indexedDB.open("practiceDesk.overhaul.v1",1);
     request.onsuccess=()=>resolve(request.result);
     request.onerror=()=>reject(request.error);
   });
   try{
     return await new Promise((resolve,reject)=>{
       const request=db.transaction("attempts","readonly").objectStore("attempts").getAll();
       request.onsuccess=()=>resolve(request.result);
       request.onerror=()=>reject(request.error);
     });
   }finally{db.close();}
 });
}
async function saved(page,id,accept=()=>true){
 for(let n=0;n<50;n++){
   const row=(await stored(page)).find(x=>x.id===id);
   if(row&&accept(row))return row;
   await page.waitForTimeout(100);
 }
 throw Error("Attempt not persisted: "+id);
}
try{
 context=await chromium.launchPersistentContext(profile,{executablePath,headless:true,
   args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(20000);
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto(path,{waitUntil:"load"});
 await page.locator("#g-start").click();
 assert((await page.locator('[data-section="0"]').innerText()).includes("0 / 25 answered"),
   "Live section must show answered count");
 assert((await page.locator('[data-section="1"]').innerText()).includes("Locked"),
   "Strict future section must be labelled locked");
 assert((await page.locator(".exam-question>.eyebrow").innerText()).includes("Paper Q"),
   "v11 paper-wide question number missing");
 assert(await page.locator("#g-exam-full").count()===1,"Exam fullscreen button absent");
 // A–D remain usable with the native radio receiving focus after each change.
 await page.locator('input[data-choice]').first().focus();
 await page.keyboard.press("a");
 assert(await page.locator('input[data-choice]').first().isChecked(),"A shortcut failed from focused radio");
 await page.keyboard.press("b");
 assert(await page.locator('input[data-choice]').nth(1).isChecked(),"B shortcut failed from focused radio");
 await page.keyboard.press("m");
 assert(await page.locator("#g-flag").getAttribute("aria-pressed")==="true","M flag shortcut failed");
 await page.keyboard.press("ArrowRight");
 assert(await page.locator('[data-q="1"]').getAttribute("aria-current")==="step",
   "ArrowRight shortcut failed from focused radio");
 await page.keyboard.press("ArrowLeft");
 assert(await page.locator('[data-q="0"]').getAttribute("aria-current")==="step",
   "ArrowLeft shortcut failed");
 await page.keyboard.press("Alt+ArrowRight");
 assert(await page.locator('[data-q="1"]').getAttribute("aria-current")==="step",
   "Alt+ArrowRight backward-compatible shortcut failed");
 await page.locator('[data-q="0"]').click();
 assert((await page.locator('[data-section="0"]').innerText()).includes("1 / 25 answered"),
   "Section counts failed to reflect keyboard response");
 // Native fullscreen is frequently unavailable under file://. Prove actual
 // rejected API requests still enter and exit usable in-page focus mode.
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error("blocked"));});
 await page.locator("#g-exam-full").focus();
 await page.keyboard.press("f");
 await page.waitForFunction(()=>document.documentElement.classList.contains("immersive"));
 assert(await page.locator("#g-exam-full").getAttribute("aria-pressed")==="true",
   "Fullscreen fallback button state was not updated");
 // Pass 20 retains a compact, sticky Display-only strip in immersion.
 // Hiding the entire header would strand appearance controls on long exams.
 const headerBox=await page.locator("header").boundingBox();
 assert(await page.locator("header").isVisible()&&
   await page.locator("#displayTrigger").isVisible()&&
   await page.locator("header .brand").evaluate(e=>getComputedStyle(e).display)==="none"&&
   headerBox!==null&&headerBox.height<=60,
   "Fullscreen fallback must hide brand chrome without hiding global Display");
 await page.keyboard.press("f");
 await page.waitForFunction(()=>!document.documentElement.classList.contains("immersive"));
 await page.locator("#g-exam-full").click();
 await page.waitForFunction(()=>document.documentElement.classList.contains("immersive"));
 await page.keyboard.press("Escape");
 await page.waitForFunction(()=>!document.documentElement.classList.contains("immersive"));
 // The leave confirmation must be cancellable and cannot discard the attempt.
 page.once("dialog",dialog=>dialog.dismiss());
 await page.locator("#g-library").click();
 assert(await page.locator("#g-timer").count()===1,"Cancelled leave unexpectedly abandoned exam");
 const before=(await stored(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt===null);
 assert(before,"Active attempt absent");
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#g-library").click();
 assert(await page.locator("#g-start").count()===1,"Confirmed leave did not return to library");
 const departed=await saved(page,before.id);
 assert(departed.state.visible===false,"Background attempt remained foreground-visible");
 const questionId=departed.frozen.paper.sections[0].questionRevisionIds[0];
 const spent=departed.state.responses.find(x=>x.questionRevisionId===questionId)?.timeSpentMs??0;
 await page.waitForTimeout(1500);
 await page.locator('[data-attempt="'+before.id+'"]').first().click();
 const resumed=await saved(page,before.id,row=>
   row.state.visible===true&&row.state.elapsedMs>departed.state.elapsedMs+800);
 assert(resumed.state.elapsedMs>departed.state.elapsedMs+800,
   "Elapsed timer failed to advance while in library");
 assert((resumed.state.responses.find(x=>x.questionRevisionId===questionId)?.timeSpentMs??0)-spent<300,
   "Library time was incorrectly added to foreground question time");
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#g-library").click();
 // Starting while another attempt is pending must ask, and cancellation must work.
 page.once("dialog",dialog=>dialog.dismiss());
 await page.locator("#g-start").click();
 assert(await page.locator("#g-start").count()===1,"Cancelled new attempt unexpectedly began");
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#g-start").click();
 assert(await page.locator("#g-timer").count()===1,"Confirmed parallel attempt did not begin");
 await page.waitForFunction(async()=>{
   const request=indexedDB.open("practiceDesk.overhaul.v1",1);
   const db=await new Promise((resolve,reject)=>{
     request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   });
   try{return await new Promise((resolve,reject)=>{
     const read=db.transaction("attempts","readonly").objectStore("attempts").getAll();
     read.onsuccess=()=>resolve(read.result.filter(x=>x.recordType==="generic-attempt"&&x.finishedAt===null).length>=2);
     read.onerror=()=>reject(read.error);
   });}finally{db.close();}
 });
 const pending=(await stored(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt===null);
 assert(pending.length>=2,"New attempt discarded previous unfinished record");
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#g-submit").click();
 assert((await page.locator('[data-section="0"]').innerText()).includes("Closed"),
   "Submitted section must be labelled closed");
 assert((await page.locator('[data-section="2"]').innerText()).includes("Locked"),
   "Future sections must remain locked");
 assert(!errors.length,"Pass 11 browser error: "+errors.join("; "));
 console.log("Pass 11 source-driven browser parity: shortcuts, focused radio, fullscreen fallback, section states, confirmations, background clock and retained attempts passed");
}finally{
 await context?.close();
 await rm(profile,{recursive:true,force:true});
}
