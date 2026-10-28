import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const binaries=["google-chrome","google-chrome-stable","chromium","chromium-browser"];
const chrome=binaries.find(bin=>spawnSync(bin,["--version"],{encoding:"utf8"}).status===0);
if(!chrome)throw new Error("Chrome/Chromium is required for the file:// smoke test");
const profile=await mkdtemp(join(tmpdir(),"pd-file-smoke-"));
const file=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const browserOptions={executablePath:chrome,headless:true,
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
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let savedId;
try{
 const first=await launch();
 try{
   await first.page.locator("#genericWorkspace").click();
   await first.page.locator("#g-start").click();
   await first.page.locator('input[data-choice]').first().click();
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
}finally{
 await rm(profile,{recursive:true,force:true});
}
