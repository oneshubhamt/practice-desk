import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const binaries=["google-chrome","google-chrome-stable","chromium","chromium-browser"];
const chrome=binaries.find(bin=>spawnSync(bin,["--version"],{encoding:"utf8"}).status===0);
if(!chrome)throw new Error("Chrome/Chromium is required for the file:// smoke test");
const chromePath=spawnSync("which",[chrome],{encoding:"utf8"}).stdout.trim();
if(!chromePath.startsWith("/"))throw new Error("Could not resolve Chrome executable");
const profile=await mkdtemp(join(tmpdir(),"pd-file-smoke-"));
const file=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const browserOptions={executablePath:chromePath,headless:true,
 args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--disable-background-networking"]};
async function launch(){
 const context=await chromium.launchPersistentContext(profile,browserOptions);
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(25000);
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto(file,{waitUntil:"load"});
 return {context,page,errors};
}
async function readGenericAttempts(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open("practiceDesk.history.v1",2);
  request.onerror=()=>reject(request.error?.message||"open failed");
  request.onsuccess=()=>{
   const db=request.result;
   const get=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   get.onerror=()=>{db.close();reject(get.error?.message||"read failed");};
   get.onsuccess=()=>{const result=get.result.filter(x=>x.recordType==="generic-attempt");db.close();resolve(result);};
  };
 }));
}
async function readCglAttempts(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open("practiceDesk.history.v1",2);
  req.onerror=()=>reject(req.error??Error("Open failed"));
  req.onsuccess=()=>{
   const db=req.result,all=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   all.onerror=()=>{db.close();reject(all.error??Error("Read failed"));};
   all.onsuccess=()=>{const rows=all.result.filter(a=>a.schema===4);db.close();resolve(rows);};
  };
 }));
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let savedId;
try{
 const first=await launch();
 try{
   await first.page.locator("#genericWorkspace").click();
   await first.page.locator("#g-start").click();
   await first.page.locator('input[data-choice]').first().click();
   const focused=await first.page.locator('input[data-choice]:checked').evaluate(el=>document.activeElement===el);
   if(!focused)throw new Error("Keyboard focus was lost after answering");
   for(let i=0;i<50;i++){
     const records=await readGenericAttempts(first.page);
     const saved=records.find(x=>x.state?.responses?.some(r=>r.response?.kind==="single-choice"));
     if(saved){savedId=saved.id;break;}
     await delay(100);
   }
   if(!savedId)throw new Error("Answer did not persist to IndexedDB");
   console.log("Offline file://: answer saved to IndexedDB");
 }catch(error){throw new Error("Initial file:// test: "+error.message+"; browser errors: "+first.errors.join(" | "));}
 finally{await first.context.close();}
 const second=await launch();
 try{
   await second.page.locator("#genericWorkspace").click();
   await second.page.locator("#g-start").waitFor({state:"visible"});
   await second.page.locator('[data-attempt="'+savedId+'"]').click();
   await second.page.locator('input[data-choice]:checked').first().waitFor({state:"visible"});
   const records=await readGenericAttempts(second.page);
   if(!records.some(x=>x.id===savedId))throw new Error("Persisted attempt disappeared");
   console.log("Offline file://: same attempt reopened with answer selected");
 }catch(error){throw new Error("Reopen file:// test: "+error.message+"; browser errors: "+second.errors.join(" | "));}
 finally{await second.context.close();}
 // Independently exercise the original CGL UI: its start path archives frozen
 // display assets and its History path must export a checksum-verified backup.
 const cgl=await launch();
 try{
   await cgl.page.locator("#start").click();
   await cgl.page.locator('[data-answer="a"]').first().click();
   cgl.page.once("dialog",dialog=>dialog.accept());
   await cgl.page.locator("#goHome").click();
   await cgl.page.locator("#openHistory").click();
   const downloadPromise=cgl.page.waitForEvent("download");
   await cgl.page.locator("#exportBackup").click();
   const backupDownload=await downloadPromise;
   if(!backupDownload.suggestedFilename().endsWith(".json"))throw new Error("Backup download missing");
   const backup=JSON.parse(await readFile(await backupDownload.path(),"utf8"));
   if(backup.version!==2||backup.manifest?.attemptCount!==backup.attempts?.length)throw new Error("Backup manifest missing");
   if(!backup.attempts.some(a=>a.recordType==="generic-attempt")||
      !backup.attempts.some(a=>a.schema===4))throw new Error("All-data backup omitted CGL or generic history");
   if(cgl.errors.length)throw new Error("CGL UI errors: "+cgl.errors.join(" | "));
   console.log("Offline file://: original CGL start, answer and unified backup export passed");

   // Two tabs use one IndexedDB origin. Resuming in tab B advances the saved
   // revision; editing the stale copy in tab A must not overwrite it.
   await cgl.page.locator("#historyHome").click();
   await cgl.page.locator("#genericWorkspace").click();
   await cgl.page.locator("#g-start").waitFor({state:"visible"});
   await cgl.page.locator('[data-attempt="'+savedId+'"]').click();
   await cgl.page.locator('input[data-choice]').first().waitFor({state:"visible"});
   let firstVersion=0;
   for(let i=0;i<50;i++){
     const found=(await readGenericAttempts(cgl.page)).find(x=>x.id===savedId);
     if(found?.saveRevision>0){firstVersion=found.saveRevision;break;}
     await delay(100);
   }
   if(!firstVersion)throw new Error("Initial tab revision not persisted");
   const competing=await cgl.context.newPage();
   await competing.goto(file,{waitUntil:"load"});
   await competing.locator("#genericWorkspace").click();
   await competing.locator("#g-start").waitFor({state:"visible"});
   await competing.locator('[data-attempt="'+savedId+'"]').click();
   await competing.locator('input[data-choice]').first().waitFor({state:"visible"});
   let otherVersion=firstVersion;
   for(let i=0;i<60;i++){
     const found=(await readGenericAttempts(competing)).find(x=>x.id===savedId);
     if(found?.saveRevision>firstVersion){otherVersion=found.saveRevision;break;}
     await delay(100);
   }
   if(otherVersion<=firstVersion)throw new Error("Second tab did not checkpoint a new revision");
   await cgl.page.locator('input[data-choice]').nth(1).click();
   await cgl.page.locator('.generic-warning').filter({hasText:"Another tab"}).waitFor({state:"visible"});
   const after=(await readGenericAttempts(cgl.page)).find(x=>x.id===savedId);
   if(after?.saveRevision!==otherVersion)throw new Error("Stale tab overwrote the newer revision");
   console.log("Offline file://: stale tab rejected without changing the saved attempt");
   // The original CGL path also rejects stale writes between simultaneous tabs.
   await cgl.page.locator("#g-back").click();
   await cgl.page.locator("#resume").click();
   const source=(await readCglAttempts(cgl.page)).find(a=>!a.finishedAt);
   if(!source?.id||!source.saveRevision)throw new Error("No versioned active CGL attempt");
   const cglTab=await cgl.context.newPage();
   await cglTab.goto(file,{waitUntil:"load"});
   await cglTab.locator("#resume").click();
   await cglTab.locator('[data-answer="b"]').first().click();
   let latestCgl=null;
   for(let i=0;i<60;i++){
    latestCgl=(await readCglAttempts(cglTab)).find(a=>a.id===source.id);
    if(latestCgl?.saveRevision>source.saveRevision)break;
    await delay(100);
   }
   if(!latestCgl||latestCgl.saveRevision<=source.saveRevision)
    throw new Error("CGL tab B did not persist a new version");
   await cgl.page.locator('[data-answer="c"]').first().click();
   await cgl.page.locator("#toast").filter({hasText:"Another tab"}).waitFor({state:"visible"});
   const preserved=(await readCglAttempts(cglTab)).find(a=>a.id===source.id);
   if(preserved?.answers?.[1]!=="b"||preserved.saveRevision!==latestCgl.saveRevision)
    throw new Error("Stale CGL tab overwrote a newer answer");
   console.log("Offline file://: original CGL stale-tab write rejected");
 }catch(error){throw new Error("CGL file:// test: "+error.message+"; browser errors: "+cgl.errors.join(" | "));}
 finally{await cgl.context.close();}
}finally{
 await rm(profile,{recursive:true,force:true});
}
