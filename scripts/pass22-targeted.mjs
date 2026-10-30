// Pass 22 targeted offline browser verification and measured Pass21-vs-Pass22
// 100-question result-pane benchmark. Not a physical-device/AT release gate.
import {readFile,writeFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
import {pkg} from "../tests/fixtures/six-kinds.mjs";

const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
  .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!binary)throw Error("Chromium required for Pass22 result performance and input acceptance");
const executablePath=spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim();
const temp=await mkdtemp(join(tmpdir(),"practice-desk-pass22-"));
const modern=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const ensure=(v,m)=>{if(!v)throw Error(m);};
const baselineSha="9f0bca0d51ea3f1f14614599f641769aed473735";
const before=spawnSync("git",["show",baselineSha+":Practice_Desk_Offline_Mock_Tests.html"],{
 cwd:resolve(import.meta.dirname,".."),maxBuffer:32*1024*1024,encoding:"buffer"});
if(before.status!==0||!before.stdout?.length)
 throw Error("Pass21 verified baseline HTML unavailable: "+String(before.stderr));
const beforeFile=join(temp,"pass21.html");
await writeFile(beforeFile,before.stdout);
const legacy=pathToFileURL(beforeFile).href;
const browser=await chromium.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const errors=[];
async function attempts(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open("practiceDesk.overhaul.v1",1);
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{
   const db=req.result,request=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   request.onsuccess=()=>{resolve(request.result.filter(x=>x.recordType==="generic-attempt"));db.close();};
   request.onerror=()=>{reject(request.error);db.close();};
  };
 }));
}
async function eventuallySaved(page,condition,label){
 for(let i=0;i<45;i++){
  const all=await attempts(page);
  if(condition(all))return all;
  await page.waitForTimeout(75);
 }
 throw Error("Timed out waiting for durable "+label);
}
async function responseTest(){
 const ctx=await browser.newContext();
 const page=await ctx.newPage();page.setDefaultTimeout(14000);
 page.on("pageerror",e=>errors.push("response: "+e.message));
 page.on("dialog",d=>{void d.accept()});
 try{
  await page.goto(modern,{waitUntil:"load"});
  await page.locator("#g-file").setInputFiles({
   name:"six-kinds.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(pkg))
  });
  await page.locator("#g-papers").selectOption(pkg.paper.id);
  await page.locator("#g-start").click();
  await page.locator('[data-q="1"]').click();
  await page.locator('[data-choice="x"]').check();
  ensure(await page.locator('[data-choice="x"]').isChecked(),
    "G07: first checkbox selection was immediately lost");
  ensure((await page.locator(".generic-response-group [role=status]").innerText()).includes("Unsaved draft"),
    "G07: incomplete selection not explicitly marked unsaved");
  ensure(!(await page.locator(".exam-progress").innerText()).includes("1 / 6 answered"),
    "G07: incomplete checkbox selection incorrectly scored");
  await page.locator('[data-choice="y"]').check();
  ensure(await page.locator(".generic-response-group [role=status]").count()===0,
    "G07: valid 2-option selection still reports unscored draft");
  ensure((await page.locator(".exam-progress").innerText()).includes("1 / 6 answered"),
    "G07: valid two-option answer not committed");
  await eventuallySaved(page,rows=>rows.some(a=>a.state.responses.some(x=>
    x.questionRevisionId==="rev-1"&&x.response?.kind==="multiple-select"&&x.response.optionIds.length===2)),
    "committed two-option answer");
  await page.locator('[data-choice="x"]').uncheck();
  ensure(await page.locator('[data-choice="y"]').isChecked(),
    "G07: partial edit was not preserved visibly");
  ensure((await page.locator(".generic-response-group [role=status]").innerText()).includes("not saved to your attempt"),
    "G07: partial edit is not disclosed as transient");
  ensure((await page.locator(".exam-progress").innerText()).includes("0 / 6 answered"),
    "G07: outdated previously saved answer still counts");
  await eventuallySaved(page,rows=>rows.some(a=>a.state.responses.some(x=>
    x.questionRevisionId==="rev-1"&&x.response===undefined)),
    "clear of obsolete valid answer");
  await page.locator('[data-q="2"]').click();
  await page.locator('[data-q="1"]').click();
  ensure(await page.locator('[data-choice="y"]').isChecked(),
    "G07: draft should survive in-tab question navigation");
  await page.reload({waitUntil:"load"});
  await page.locator("#g-pending-attempts .recent-attempt").first().click();
  await page.locator('[data-q="1"]').click();
  ensure(!(await page.locator('[data-choice="y"]').isChecked()),
    "G07: volatile draft was misleadingly persisted through reload");
  ensure((await page.locator(".exam-progress").innerText()).includes("0 / 6 answered"),
    "G07: reload revived old previously saved selection");
  await page.locator('[data-section="1"]').click();
  await page.locator('[data-q="1"]').click();
  const selects=page.locator("[data-match]");
  ensure(await selects.count()===2,"G08: matching selectors unavailable");
  await selects.nth(0).selectOption("r1");
  await selects.nth(1).selectOption("r1");
  ensure(await page.locator("#g-save").isDisabled(),
    "G08: Save not blocked on duplicate right target");
  ensure(await page.locator('[data-match][aria-invalid="true"]').count()===2,
    "G08: both conflicting rows were not identified");
  ensure((await page.locator("#g-match-feedback").innerText()).includes("First"),
    "G08: conflict feedback does not name repeated target");
  await selects.nth(1).selectOption("r2");
  ensure(await page.locator("[data-match][aria-invalid=true]").count()===0,
    "G08: resolved matches remain in error state");
  ensure(await page.locator("#g-save").isEnabled(),
    "G08: Save did not recover after correcting duplicate");
  ensure((await page.locator("#g-match-feedback").innerText()).includes("not yet saved"),
    "G08: valid but uncommitted selection not identified");
  await page.locator("#g-save").click();
  await eventuallySaved(page,rows=>rows.some(a=>a.state.responses.some(x=>
    x.questionRevisionId==="rev-4"&&x.response?.kind==="matching"&&x.response.pairs.length===2)),
    "matching response");
  await page.locator('[data-q="0"]').click();
  await page.locator('[data-q="1"]').click();
  ensure(await selects.nth(0).inputValue()==="r1"&&await selects.nth(1).inputValue()==="r2",
    "G08: corrected matching pairs not restored from saved record");
  console.log("Pass22 G07/G08: incomplete drafts, saved-answer clearing, reload, conflicts and keyboard-correctable native matching PASS");
 }finally{await ctx.close();}
}
async function profileResult(url,tag){
 const ctx=await browser.newContext();
 const page=await ctx.newPage();page.setDefaultTimeout(20000);
 page.on("dialog",d=>{void d.accept()});
 page.on("pageerror",e=>errors.push(tag+": "+e.message));
 try{
  await page.goto(url,{waitUntil:"load"});
  const reviewed=await page.locator("#g-papers option").evaluateAll(options=>
   options.find(option=>option.textContent.includes("Reviewed"))?.value);
  ensure(Boolean(reviewed),tag+" missing 100-question CGL paper");
  await page.locator("#g-papers").selectOption(reviewed);
  await page.locator('[data-mode="strict"]').click();
  await page.locator("#g-start").click();
  for(let i=0;i<4;i++)await page.locator("#g-submit").click();
  await page.locator("#result-overview").waitFor();
  const snap=async()=>({
   nodes:await page.locator("#app *").count(),
   reviewArticles:await page.locator("#result-review .generic-review").count(),
   timingRows:await page.locator("#result-timing tbody tr").count(),
   overviewMetrics:await page.locator("#result-overview .scoregrid").count()
  });
  const overview=await snap();
  const times={review:[],timing:[],overview:[]};
  const go=async(tab)=>{
   const t0=await page.evaluate(()=>performance.now());
   await page.locator('[data-result-tab="'+tab+'"]').click();
   const duration=await page.evaluate(start=>performance.now()-start,t0);
   times[tab].push(Math.round(duration*100)/100);
  };
  for(let i=0;i<3;i++){
   await go("review");
   ensure(await page.locator("#result-review .generic-review").count()===100,
     tag+" review did not load all 100 frozen items");
   await go("timing");
   ensure(await page.locator("#result-timing tbody tr").count()===100,
     tag+" timing tab failed to load all 100 ledger rows");
   await go("overview");
  }
  await go("review");
  const review=await snap();
  await go("timing");
  const timing=await snap();
  const first=page.locator("#result-timing [data-ledger-q]").first();
  await first.click();
  ensure(await page.locator('[data-result-tab="review"]').getAttribute("aria-selected")==="true",
    tag+" timing-to-review link failed to activate tab");
  ensure(await page.locator("#result-review [data-review-id]").count()===100,
    tag+" ledger jump lost review items");
  await page.locator("#g-review-filter").selectOption("incorrect");
  ensure(await page.locator("#g-review-filter").inputValue()==="incorrect",
    tag+" review filter reset on rerender");
  return {overview,review,timing,times};
 }finally{await ctx.close();}
}
try{
 await responseTest();
 const original=await profileResult(legacy,"pass21");
 const improved=await profileResult(modern,"pass22");
 ensure(original.overview.reviewArticles===100&&original.overview.timingRows===100,
   "Historical result renderer did not eagerly load hidden panes; baseline invalid");
 ensure(improved.overview.reviewArticles===0&&improved.overview.timingRows===0,
   "F12: active overview still materializes hidden review/timing rows");
 ensure(improved.review.timingRows===0&&improved.review.overviewMetrics===0,
   "F12: review pane still materializes other expensive result panes");
 ensure(improved.timing.reviewArticles===0&&improved.timing.overviewMetrics===0,
   "F12: timing pane still materializes nonselected review/overview");
 for(const name of ["overview","review","timing"]){
  ensure(improved[name].nodes<original[name].nodes,
    "F12: active "+name+" node count did not improve");
 }
 ensure(errors.length===0,"Browser page errors: "+errors.join(" | "));
 const report={baselineSha,environment:"CI headless Chromium file://; observed not universal device speed",
  pass21:original,pass22:improved};
 await writeFile(join(temp,"pass22-render-metrics.json"),JSON.stringify(report,null,2));
 // Structured output is retained in CI logs for audit, not as invented estimates.
 console.log("Pass22 F12 measured exact 100-question DOM + observed route wall times: "+JSON.stringify(report));
 console.log("Pass22: active-only result rendering, tab semantics, 100-item review, timing links and filtered review PASS");
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
