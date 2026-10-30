import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright-core";
import { pkg } from "../tests/fixtures/six-kinds.mjs";
const yes=(ok,msg)=>{if(!ok)throw Error(msg);};
const browser=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
  .find(cmd=>spawnSync(cmd,["--version"],{encoding:"utf8"}).status===0);
if(!browser)throw Error("Chromium is required for Pass 13 browser acceptance");
const executablePath=spawnSync("which",[browser],{encoding:"utf8"}).stdout.trim();
const url=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const dir=await mkdtemp(join(tmpdir(),"pass13-history-"));
const backupName="practice-desk-backup";
const dbRecords=async page=>page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open("practiceDesk.overhaul.v1",1);
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 try{return await new Promise((resolve,reject)=>{
  const r=db.transaction("attempts","readonly").objectStore("attempts").getAll();
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });}finally{db.close();}
});
let context;
try{
 context=await chromium.launchPersistentContext(dir,{headless:true,executablePath,
  acceptDownloads:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(18000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"load"});
 const paper=await page.locator("#g-papers").inputValue();
 yes(await page.locator("#g-edition").count()===1,"Paired source/reviewed editions not explicit");
 const source=await page.locator('#g-edition option').first().getAttribute("value");
 const reviewed=await page.locator('#g-edition option').last().getAttribute("value");
 yes(source!==reviewed,"Source and reviewed revision must be distinct");
 await page.locator("#g-edition").selectOption(source);
 yes(await page.locator("#g-papers").inputValue()===source,"Edition picker did not switch frozen paper");
 await page.locator("#g-edition").selectOption(reviewed);
 await page.locator('[data-mode="single"]').click();
 await page.locator("#g-single-section").selectOption("2");
 await page.reload({waitUntil:"load"});
 yes(await page.locator("#g-papers").inputValue()===reviewed,"Paper selection did not persist");
 yes(await page.locator('[data-mode="single"]').getAttribute("aria-pressed")==="true","Mode not persisted");
 yes(await page.locator("#g-single-section").inputValue()==="2","Section not persisted");
 // Corrupt stored selection must not prevent startup.
 await page.evaluate(()=>localStorage.setItem("practiceDesk.overhaul.selection.v1","{invalid"));
 await page.reload({waitUntil:"load"});
 yes(await page.locator("#g-start").count()===1,"Corrupt setup preferences broke offline startup");
 await page.locator("#displayTrigger").click();
 await page.locator("#themeDark").click();
 yes(await page.locator("#themeDark").getAttribute("aria-pressed")==="true",
  "Explicit dark theme selection missing");
 await page.locator("#themeLight").click();
 yes(await page.locator("#themeLight").getAttribute("aria-pressed")==="true",
  "Explicit light theme selection missing");
 await page.locator("#displayClose").click();
 await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(pkg))});
 await page.waitForFunction(expected=>document.querySelector("#g-papers")?.value===expected,
  pkg.paper.id);
 await page.locator("#g-papers").selectOption(reviewed);
 await page.waitForFunction(expected=>document.querySelector("#g-papers")?.value===expected,
  reviewed);
 await page.locator('[data-mode="free"]').click();
 // Two completed exams with preserved notebook card; one pending exam later.
 for(let i=0;i<2;i++){
  await page.locator("#g-start").click();
  await page.locator("input[data-choice]").first().click();
  page.once("dialog",d=>d.accept());
  await page.locator("#g-submit").click();
  await page.locator('[data-result-tab="review"]').click();
  if(i===0)await page.locator("[data-add-card]").first().click();
  await page.locator("#g-library").click();
 }
 const before=await dbRecords(page);
 yes(before.filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length===2,"Expected two completed records");
 yes(before.some(x=>x.recordType==="learning-card"),"Learning card creation failed");
 yes(before.some(x=>x.recordType==="generic-package"),"Imported generic package creation failed");
 await page.locator("#g-start").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-library").click();
 const pending=(await dbRecords(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt===null);
 yes(pending,"Unfinished attempt must be preserved");
 await page.locator("#g-history").click();
 yes((await page.locator("#g-storage-backend").innerText()).includes("IndexedDB"),"Backend indicator missing");
 yes((await page.locator(".history-summary").innerText()).includes("Papers practised"),"Paper metrics missing");
 yes((await page.locator(".history-trend").innerText()).includes("Adjusted score progression"),"Adjusted score trend absent");
 const editionFilter=page.locator("#g-history-paper");
 await editionFilter.selectOption(pending.frozen.paper.id);
 yes(await page.locator(".archive-entry").count()===3,"Exact revision filter missed comparable attempts");
 await editionFilter.selectOption("all");
 await page.locator("#g-filter").selectOption("complete");
 yes(await page.locator(".archive-entry").count()===2,"Completed filter wrong");
 await page.locator("#g-filter").selectOption("all");
 await page.evaluate(()=>Object.defineProperty(navigator,"storage",{configurable:true,value:{
   estimate:()=>Promise.reject(new Error("denied")),persist:()=>Promise.resolve(false)}}));
 await page.locator("#g-library").click();
 await page.locator("#g-history").click();
 await page.waitForFunction(()=>document.querySelector("#g-storage-quota")?.textContent?.includes("unavailable"));
 await page.locator("#g-storage-persist").click();
 yes((await page.locator("#g-storage-persist-status").innerText()).includes("not granted"),
  "Denied persistent storage request was not reported");
 const downloadPromise=page.waitForEvent("download");
 await page.locator("#g-export-history").click();
 const download=await downloadPromise;
 const exported=JSON.parse(await readFile(await download.path(),"utf8"));
 yes(exported.format===backupName&&exported.version===3&&exported.manifest.recordCount===exported.records.length,
  "Checksum-verified v3 backup format changed");
 yes(exported.selection?.paperRevisionId===reviewed&&exported.selection?.mode==="free",
  "Device exam setup was not included in the integrity-protected backup");
 // Cancel at first confirmation: nothing should be touched.
 page.once("dialog",d=>d.dismiss());
 await page.locator("#g-delete-completed").click();
 yes((await dbRecords(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length===2,
  "Cancelled bulk action deleted completed history");

 // Simulate a second tab updating one completed record after it was rendered
 // in this tab. The whole IndexedDB transaction must abort and roll back.
 const competing=(await dbRecords(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null);
 await page.evaluate(async id=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open("practiceDesk.overhaul.v1",1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  try{await new Promise((resolve,reject)=>{
   const tx=db.transaction("attempts","readwrite"),store=tx.objectStore("attempts");
   const get=store.get(id);
   get.onsuccess=()=>store.put({...get.result,saveRevision:get.result.saveRevision+1});
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });}finally{db.close();}
 },competing.id);
 const prompts=[];
 page.on("dialog",d=>{if(d.message().includes("Delete all")||d.message().includes("Confirm permanent deletion")){
  prompts.push(d.message());void d.accept();}else if(d.message().startsWith("Import ")){void d.accept();}});
 await page.locator("#g-delete-completed").click();
 await page.waitForFunction(()=>document.querySelector(".generic-warning")?.textContent?.includes("No completed history was cleared"));
 yes((await dbRecords(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length===2,
  "Competing version allowed partial completed-history deletion");
 await page.reload({waitUntil:"load"});
 await page.locator("#g-history").click();
 prompts.length=0;
 await page.locator("#g-delete-completed").click();
 await page.waitForFunction(()=>document.querySelector("#g-delete-completed")?.disabled===true);
 yes(prompts.length===2,"Bulk deletion must require two confirmations");
 const after=await dbRecords(page);
 yes(after.filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length===0,"Completed records not removed");
 yes(after.some(x=>x.id===pending.id&&x.finishedAt===null),"Pending record was deleted");
 yes(after.some(x=>x.recordType==="learning-card"),"Learning cards were deleted");
 yes(after.some(x=>x.recordType==="generic-package"),"Imported exams were deleted");
 // Additive restoration can reintroduce deleted completed items; existing
 // pending/card/package IDs must remain untouched.
 const pendingBefore=after.find(x=>x.id===pending.id);
 await page.locator("#g-history-file").setInputFiles({name:"backup.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(exported))});
 await page.waitForFunction(()=>document.querySelector("#g-delete-completed")?.disabled===false);
 const restored=await dbRecords(page);
 yes(restored.filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length===2,
  "Additive v3 import failed to restore new records");
 yes(restored.find(x=>x.id===pending.id)?.saveRevision===pendingBefore.saveRevision,
  "Additive import overwrote matching pending record");
 yes(!errors.length,"Browser errors: "+errors.join("; "));

 // Confirm the same finished-only, double-checked operation remains atomic in
 // localStorage fallback when IndexedDB cannot be opened on this file origin.
 const fallback=await context.newPage();
 await fallback.addInitScript(()=>Object.defineProperty(window,"indexedDB",
  {configurable:true,value:undefined}));
 await fallback.goto(url,{waitUntil:"load"});
 await fallback.locator('[data-mode="free"]').click();
 await fallback.locator("#g-start").click();
 fallback.once("dialog",d=>d.accept());
 await fallback.locator("#g-submit").click();
 await fallback.locator("#g-library").click();
 await fallback.locator("#g-history").click();
 yes((await fallback.locator("#g-storage-backend").innerText()).includes("localStorage fallback"),
  "Fallback storage backend must be visible");
 const fallbackBefore=JSON.parse(await fallback.evaluate(()=>
  localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]"));
 yes(fallbackBefore.some(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null),
  "Fallback completed attempt not durably saved");
 const fallbackPrompts=[];
 fallback.on("dialog",d=>{
  if(d.message().includes("Delete all")||d.message().includes("Confirm permanent deletion")){
   fallbackPrompts.push(d.message());void d.accept();
  }
 });
 await fallback.locator("#g-delete-completed").click();
 await fallback.waitForFunction(()=>document.querySelector("#g-delete-completed")?.disabled===true);
 const fallbackAfter=JSON.parse(await fallback.evaluate(()=>
  localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]"));
 yes(fallbackPrompts.length===2&&!fallbackAfter.some(x=>
  x.recordType==="generic-attempt"&&x.finishedAt!==null),
  "Fallback bulk delete failed atomic completed-only deletion");
 console.log("Pass 13: explicit edition, persisted mode/section, corrupt-pref fallback, exact history filter, adjusted trend, denied quota/persist, atomic completed deletion, fallback and additive backup preservation PASS");
}finally{
 await context?.close();
 await rm(dir,{recursive:true,force:true});
}
