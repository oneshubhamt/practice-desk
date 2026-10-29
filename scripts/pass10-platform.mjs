import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright-core";

const name=process.argv[2]??"chromium";
if(!["chromium","firefox","webkit"].includes(name))throw Error("Use chromium, firefox or webkit");
const browser={chromium,firefox,webkit}[name];
const html=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const profile=await mkdtemp(join(tmpdir(),"practice-desk-pass10-"+name+"-"));
const assert=(condition,message)=>{if(!condition)throw Error(message);};
let context;
try{
 const options={headless:true,acceptDownloads:true};
 if(name==="chromium"){
  const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
   .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
  if(!binary)throw Error("Chromium executable missing");
  options.executablePath=spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim();
  options.args=["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"];
 }
 context=await browser.launchPersistentContext(profile,options);
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(30000);
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",dialog=>{
   if(dialog.type()==="confirm"&&dialog.message().includes("Return to library?"))
     void dialog.accept();
 });
 await page.goto(html,{waitUntil:"load"});
 await page.locator("#g-start").click();
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-library").click();
 await page.locator("#g-history").click();
 await page.locator('[data-attempt]').first().waitFor();
 const pending=page.waitForEvent("download");
 await page.locator("#g-export-history").click();
 const download=await pending;
 const archive=JSON.parse(await readFile(await download.path(),"utf8"));
 const saved=archive.records.find(x=>x.recordType==="generic-attempt"&&
  x.state.responses.some(row=>row.response));
 assert(saved,"Committed attempt absent from verified backup");
 assert(!download.suggestedFilename().includes("UNSAVED_RECOVERY"),
  "Browser failed to commit answered attempt before export");
 await page.reload({waitUntil:"load"});
 await page.locator("#g-history").click();
 await page.locator('[data-attempt="'+saved.id+'"]').first().click();
 assert(await page.locator('input[data-choice]:checked').count()===1,
  "Same-profile file:// restart lost saved answer");
 await page.locator("#g-library").click();
 assert(!errors.length,"Uncaught browser errors: "+errors.join("; "));
 console.log(name+": file:// save, backup, reload and answer recovery passed");

 if(name==="chromium"){
  // A bounded performance guardrail, not a real-device performance guarantee.
  // The 80 copies have unique IDs but preserve the validated frozen questions.
  const count=80;
  await page.evaluate(async n=>{
   const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open("practiceDesk.overhaul.v1",1);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
   });
   try{
    const source=await new Promise((resolve,reject)=>{
     const req=db.transaction("attempts","readonly").objectStore("attempts").getAll();
     req.onsuccess=()=>resolve(req.result.find(x=>x.recordType==="generic-attempt"));
     req.onerror=()=>reject(req.error);
    });
    if(!source)throw Error("No source attempt for stress fixture");
    await new Promise((resolve,reject)=>{
     const tx=db.transaction("attempts","readwrite");
     for(let i=0;i<n;i++)
      tx.objectStore("attempts").add({...source,id:"pass10-stress-"+i,saveRevision:1});
     tx.oncomplete=()=>resolve();
     tx.onerror=()=>reject(tx.error);
     tx.onabort=()=>reject(tx.error);
    });
   }finally{db.close();}
  },count);
  const started=Date.now();
  await page.reload({waitUntil:"load"});
  await page.locator("#g-history").click();
  await page.locator('[data-attempt="pass10-stress-79"]').waitFor();
  const elapsed=Date.now()-started;
  assert(elapsed<30000,"80-record history exceeded 30-second startup/render budget: "+elapsed+"ms");
  console.log("chromium: 80-record history reload/render in "+elapsed+"ms");
 }
}finally{
 if(context)await context.close();
 await rm(profile,{recursive:true,force:true});
}
