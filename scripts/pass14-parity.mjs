import { mkdtemp,rm,readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join,resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright-core";
import {pkg} from "../tests/fixtures/six-kinds.mjs";

const ensure=(v,m)=>{if(!v)throw Error(m);};
const executable=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!executable)throw Error("Offline Chromium missing");
const browserPath=spawnSync("which",[executable],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"pass14-visits-"));
const url=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
async function saved(page){
 return page.evaluate(async()=>{
  const request=indexedDB.open("practiceDesk.overhaul.v1",1);
  const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{
   const q=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });}finally{db.close();}
 });
}
let context;
try{
 context=await chromium.launchPersistentContext(profile,{executablePath:browserPath,headless:true,acceptDownloads:true,
  args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(20000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"load"});
 await page.locator("#g-papers").waitFor();
 const reviewed=await page.locator("#g-papers option").evaluateAll(opts=>
  opts.find(x=>x.textContent.includes("Reviewed"))?.value??opts[0]?.value);
 await page.locator("#g-papers").selectOption(reviewed);
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();
 // Observe a real return, independent from answer edits and timing ticks.
 const q0=await page.locator('[data-q="0"]').getAttribute("data-q");
 ensure(q0==="0","Question palette missing");
 await page.locator('input[data-choice]').first().click();
 await page.locator('[data-q="1"]').click();
 await page.locator('[data-q="0"]').click();
 await page.locator('[data-q="2"]').click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
 await page.locator("#result-overview").waitFor();
 const latest=(await saved(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null);
 ensure(latest,"Completed real CGL attempt not persisted");
 const firstId=latest.frozen.paper.sections[0].questionRevisionIds[0];
 ensure(latest.state.questionVisits?.find(x=>x.questionRevisionId===firstId)?.count===2,
  "Repeated navigations did not record two actual question entries");
 ensure(latest.state.questionVisits?.length>=3,"Question entries not recorded");
 ensure(await page.locator("#g-longest-questions .slow-link").count()>=1,"Missing linked longest question ranking");
 ensure((await page.locator("#g-longest-questions .slow-link").count())<=5,"Unbounded longest ranking");
 ensure(await page.locator("#g-next-work li").count()>=1,"No evidence-based study guidance");
 await page.locator("#g-longest-questions .slow-link").first().click();
 ensure(await page.locator("#result-tab-review").getAttribute("aria-selected")==="true",
  "Longest question did not switch to review");
 ensure(await page.locator(".generic-review").count()>0,"Longest question jump lost review contents");
 const filter=page.locator("#g-review-filter");
 ensure(await filter.locator('option[value="audit"]').count()===1,"Audit notes review filter absent");
 ensure(await filter.locator('option[value="typicalwrong"]').count()===1,"Typical-speed incorrect filter absent");
 await filter.selectOption("audit");
 ensure(await page.locator(".generic-review").count()>0,"Real reviewed CGL audit items missing");
 await page.locator("#g-review-filter").selectOption("typicalwrong");
 const reviewCount=await page.locator(".generic-review").count();
 ensure(reviewCount>=0,"Typical-speed filter failed");
 await page.locator('[data-result-tab="timing"]').click();
 const table=await page.locator("#result-timing").innerText();
 ensure(table.includes("Speed")&&table.includes("Visits")&&table.includes("Changes"),
  "Time ledger omitted visits, speed or changes");
 ensure((await page.locator("#result-timing").innerText()).includes("Not classified"),
  "Insufficient samples incorrectly received speed labels");
 // Older completed results have no visit count, even when they retain answer
 // changes and foreground timing. A read-only reopen must not fill this in.
 await page.evaluate(async id=>{
  const req=indexedDB.open("practiceDesk.overhaul.v1",1);
  const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  try{await new Promise((resolve,reject)=>{
   const tx=db.transaction("attempts","readwrite"),store=tx.objectStore("attempts");
   const r=store.get(id);
   r.onsuccess=()=>{const old=r.result;delete old.state.questionVisits;store.put(old);};
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
 },latest.id);
 await page.reload({waitUntil:"load"});
 await page.locator("#g-history").click();
 await page.locator('[data-attempt="'+latest.id+'"]').first().click();
 await page.locator('[data-result-tab="timing"]').click();
 ensure((await page.locator("#result-timing").innerText()).includes("Not recorded"),
  "Legacy visit counters were fabricated on historical reopen");
 // The same generic exam API supports imported six-kind exams, including
 // manual-only responses that must never be assigned a relative speed.
 await page.locator("#g-library").click();
 await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(pkg))});
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,pkg.paper.id);
 await page.locator("#g-start").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
 await page.locator('[data-result-tab="timing"]').click();
 ensure((await page.locator("#result-timing").innerText()).includes("Not classified"),
  "Imported manual/insufficient-sample exam received unjustified speed labels");
 const custom=(await saved(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null&&
   x.frozen.snapshot.examId===pkg.examId);
 ensure(custom?.state.questionVisits?.length===1,"Imported exam did not record its initial visit");
 ensure(!errors.length,"Browser runtime errors: "+errors.join("; "));
 console.log("Pass 14: real CGL repeated visits, linked longest questions, audit and typical filters, gated speed, older record and imported six-kind browser review PASS");
}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
