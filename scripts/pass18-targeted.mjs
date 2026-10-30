// Focused Pass 18 browser acceptance: real archive controls and destructive safety.
// This is not a comprehensive full-app QA pass.
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!binary)throw Error("Chromium is needed for Pass 18 focused UI verification");
const executablePath=spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"practice-desk-pass18-"));
const html=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const ensure=(ok,msg)=>{if(!ok)throw Error(msg);};
async function attempts(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open("practiceDesk.overhaul.v1",1);
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
    const db=request.result;
    const get=db.transaction("attempts","readonly").objectStore("attempts").getAll();
    get.onsuccess=()=>{resolve(get.result.filter(x=>x.recordType==="generic-attempt"));db.close();};
    get.onerror=()=>{reject(get.error);db.close();};
  };
 }));
}
let context;
try{
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,
  args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(15000);
 const errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 let action="accept",dialogs=[];
 page.on("dialog",dialog=>{
   dialogs.push(dialog.message());
   void (action==="dismiss"?dialog.dismiss():dialog.accept());
 });
 await page.goto(html,{waitUntil:"load"});
 await page.locator('[data-mode="strict"]').click();
 await page.locator("#g-start").click();
 await page.locator('input[data-choice]').first().click();
 await page.locator("#g-library").click();
 await page.locator("#g-history").click();
 const unfinished=(await attempts(page)).find(x=>x.finishedAt===null);
 ensure(Boolean(unfinished),"No unfinished attempt was saved");
 const discard=page.locator('[data-discard="'+unfinished.id+'"]');
 ensure(await discard.count()===1,"Unfinished attempt must show explicit Discard control");
 ensure(await page.locator('[data-delete="'+unfinished.id+'"]').count()===0,
   "Unfinished attempt must not expose completed-result Delete");
 action="dismiss";
 await discard.click();
 ensure(Boolean((await attempts(page)).find(x=>x.id===unfinished.id)),
   "Cancelling discard must preserve all saved work");
 action="accept";
 dialogs=[];
 await discard.click();
 await page.locator("#g-start").waitFor({state:"visible"});
 ensure(dialogs.length===2&&dialogs.some(message=>message.includes("UNFINISHED")),
   "Discard must require specific warning and a second final confirmation");
 ensure(!(await attempts(page)).some(x=>x.id===unfinished.id),"Discard did not commit");
 const mirror=await page.evaluate(()=>localStorage.getItem("practiceDesk.overhaul.active.v1"));
 ensure(!mirror||JSON.parse(mirror).id!==unfinished.id,"Discard left a resumable emergency mirror");
 console.log("Pass 18: unfinished discard requires two deliberate confirmations, respects cancel and removes mirror");
 await page.locator("#g-start").click();
 for(let i=0;i<4;i++)await page.locator("#g-submit").click();
 ensure(await page.locator('[data-result-tab="overview"]').count()===1,
   "Strict four-section exam failed to complete");
 const completed=(await attempts(page)).find(x=>x.finishedAt!==null);
 ensure(Boolean(completed),"Completed attempt not persisted");
 ensure(completed.state.completedSectionTimings?.length===4,
   "Strict exam did not persist four section timer records");
 ensure(completed.state.completedSectionTimings.every(row=>Number.isFinite(row.durationMs)),
   "A section timer value is missing or invalid");
 const resultsText=await page.locator("#result-overview").innerText();
 ensure(resultsText.includes("Test timer used")&&resultsText.includes("Attempt rate")&&
   resultsText.includes("Median answered time")&&resultsText.includes("Section timer"),
   "F01/F09 result visibility missing");
 await page.locator("#g-history-results").click();
 ensure(await page.locator('[data-delete="'+completed.id+'"]').count()===1,
   "Completed result must retain the Delete action");
 ensure(await page.locator('[data-discard="'+completed.id+'"]').count()===0,
   "Completed result must not expose unfinished Discard");
 dialogs=[];
 await page.locator('[data-delete="'+completed.id+'"]').click();
 ensure(dialogs.length===1&&dialogs[0].includes("COMPLETED"),
   "Completed delete should use a specific one-step confirmation");
 ensure(!(await attempts(page)).some(x=>x.id===completed.id),"Completed deletion not committed");
 ensure(errors.length===0,"Browser errors: "+errors.join(" / "));
 console.log("Pass 18: completed Delete distinct, strict timer evidence visible and persisted, no page errors");
}finally{
 await context?.close();
 await rm(profile,{force:true,recursive:true});
}
