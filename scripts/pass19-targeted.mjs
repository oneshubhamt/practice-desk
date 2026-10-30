// Pass 19 focused file:// UI acceptance: distinct papers, completed-only
// recents, multiple resumable attempts, archived frozen denominators and routes.
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
  .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!binary)throw Error("Chromium is required for Pass 19 targeted UI verification");
const executablePath=spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"practice-desk-pass19-"));
const url=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const ensure=(value,message)=>{if(!value)throw Error(message);};
let context;
try{
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,
   args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(20000);
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept();});
 await page.goto(url,{waitUntil:"load"});
 const reviewed=await page.locator("#g-papers option").evaluateAll(options=>
   options.filter(option=>option.textContent.includes("Reviewed")).map(option=>option.value));
 ensure(reviewed.length>=2,"Need at least two distinct reviewed CGL papers");
 for(let j=0;j<2;j++){
   await page.locator("#g-papers").selectOption(reviewed[j]);
   await page.locator('[data-mode="strict"]').click();
   await page.locator("#g-start").click();
   for(let section=0;section<4;section++)await page.locator("#g-submit").click();
   ensure(await page.locator("#result-tab-overview").count()===1,
     "Strict full paper did not finish");
   await page.locator("#g-library").click();
 }
 ensure(await page.locator(".recent-panel .recent-attempt").count()===2,"Two complete results not shown");
 const completedBefore=await page.locator(".recent-panel").innerText();
 ensure(completedBefore.includes(" / ")&&completedBefore.includes("marks"),
   "Recent completed results missing earned / maximum score");
 await page.locator("#g-history").click();
 ensure(await page.locator("#g-cross-paper-priorities").count()===1,
   "Cross-paper score-priority panel missing");
 const marks=await page.locator("#g-cross-paper-priorities").innerText();
 ensure(marks.includes("2 distinct papers")&&marks.includes("% marks"),
   "Two compatible full papers did not generate marks-priority view");
 ensure(await page.locator(".history-priorities").count()===1,
   "Existing accuracy panel was replaced");
 ensure(await page.locator(".history-entries [data-delete]").count()===2,
   "Two completed attempts absent from archive");
 const historyText=await page.locator(".history-entries").innerText();
 ensure(historyText.includes(" / ")&&historyText.includes("marks"),
   "Archive lacks eligible scoring denominator");
 await page.locator("#g-library").click();
 for(let i=0;i<6;i++){
   await page.locator("#g-start").click();
   await page.locator("#g-library").click();
 }
 ensure(await page.locator("#g-pending-attempts .recent-attempt").count()===5,
   "Multi-resume panel did not show five most recent pending tests");
 ensure(await page.locator("#g-pending-history").count()===1,
   "More than five pending tests lack View all link");
 const completedAfter=await page.locator(".recent-panel").innerText();
 ensure(await page.locator(".recent-panel .recent-attempt").count()===2,
   "Recent completed result was displaced by pending attempts");
 ensure(completedAfter===completedBefore,
   "Recent completed results were changed by new pending attempts");
 await page.locator("#g-pending-history").click();
 ensure(await page.locator("#g-filter").inputValue()==="progress",
   "Pending View all did not open unfinished-only archive");
 ensure(await page.locator(".history-entries [data-discard]").count()===6,
   "Pending archive did not list all six resumable tests");
 ensure(await page.locator(".history-entries [data-delete]").count()===0,
   "Unfinished attempts exposed ordinary Delete");
 await page.locator(".history-entries [data-attempt]").first().click();
 ensure(await page.locator("#g-submit").count()===1,"Unfinished test cannot resume");
 await page.locator("#g-library").click();
 await page.locator("#g-history-recent").click();
 ensure(await page.locator("#g-filter").inputValue()==="complete",
   "View all completed results did not filter archived history");
 ensure(await page.locator(".history-entries [data-delete]").count()===2,
   "Completed View all list missing two results");
 ensure(await page.locator(".history-entries [data-discard]").count()===0,
   "Pending attempts leaked into completed-only history");
 ensure(errors.length===0,"Browser page errors: "+errors.join(" / "));
 console.log("Pass 19: cross-paper marks, frozen denominators, two completed recents and six separate resumable attempts passed");
}finally{
 await context?.close();
 await rm(profile,{recursive:true,force:true});
}
