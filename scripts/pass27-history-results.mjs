/**
 * Pass27: v11-vs-overhaul laptop primary-task geometry for History/Results.
 * Use actual file:// offline builds, identical 30 Sep reviewed CGL edition,
 * same answer and flexible mode. Fail on below-fold archive/table.
 */
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const baseline=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:18*1024*1024});
if(baseline.status!==0||!baseline.stdout.length)throw Error("Frozen v11 offline HTML required");
const out=resolve(process.env.PASS27_OUTPUT??join(root,"artifacts/pass27-history-results"));
await mkdir(out,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),"practice-pass27-"));
const oldHtml=join(temp,"v11.html");await writeFile(oldHtml,baseline.stdout);
const newHtml=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const executable=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(cmd=>
 spawnSync(cmd,["--version"],{encoding:"utf8"}).status===0);
if(!executable)throw Error("Pass27 requires Chromium");
const executablePath=spawnSync("which",[executable],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const check=(v,message)=>{if(!v)throw Error("Pass27: "+message)};
const laptops=[{name:"laptop1280",width:1280,height:800},
 {name:"laptop1366",width:1366,height:768},
 {name:"laptop1440",width:1440,height:900},
 {name:"laptop1536",width:1536,height:864}];
const observations=[];
async function openFile(file,v){
 const context=await browser.newContext({viewport:{width:v.width,height:v.height},
  reducedMotion:"reduce",colorScheme:"light"});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept()});
 await page.goto(pathToFileURL(file).href,{waitUntil:"load"});
 return {context,page,errors};
}
async function geometry(page,selector){
 return page.locator(selector).first().evaluate(el=>{
  const r=el.getBoundingClientRect();
  return {x:Math.round(r.x),y:Math.round(r.y),bottom:Math.round(r.bottom),
   height:Math.round(r.height),width:Math.round(r.width),
   visible:r.top<innerHeight&&r.bottom>0,fullyVisible:r.top>=0&&r.bottom<=innerHeight};
 });
}
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
async function capture(page,file){
 await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 await page.screenshot({path:join(out,file),animations:"disabled"});
}
async function beginPair(old,newer){
 await old.locator("#paperSelect").selectOption("cgl-2026-09-30");
 await old.locator('[data-edition="reviewed"]').click();
 const reviewed=await newer.locator("#g-papers option").evaluateAll(options=>
  options.find(o=>o.value.includes("cgl-2026-09-30")&&o.value.includes("reviewed"))?.value??"");
 check(Boolean(reviewed),"same reviewed CGL paper missing");
 await newer.locator("#g-papers").selectOption(reviewed);
 await old.locator('[data-mode="free"]').click();
 await newer.locator('[data-mode="free"]').click();
 await old.locator("#start").click();await newer.locator("#g-start").click();
 await old.locator(".choices .choice").first().click();
 await newer.locator(".exam-question input[data-choice]").first().click();
 await old.locator("#finish").click();
 await newer.locator("#g-submit").click();
 await old.locator("[data-tab='insights']").waitFor();
 await newer.locator("#result-overview > .panel:nth-child(2) table").waitFor();
}
async function validatePair(v){
 const old=await openFile(oldHtml,v),current=await openFile(newHtml,v);
 try{
  await beginPair(old.page,current.page);
  await capture(old.page,"v11-"+v.name+"-results.png");
  await capture(current.page,"overhaul-"+v.name+"-results.png");
  const tableOld=await geometry(old.page,"#resultContent table");
  const tableNew=await geometry(current.page,"#result-overview > .panel:nth-child(2) table");
  const scoreNew=await geometry(current.page,"#result-overview .scoregrid");
  check(tableNew.y<=tableOld.y+80,
   v.name+" section table is too low vs v11: old "+tableOld.y+" new "+tableNew.y);
  check(tableNew.visible&&tableNew.y<v.height-50,
   v.name+" section table below initial viewport: y"+tableNew.y);
  check(scoreNew.bottom<tableNew.y,
   "Table must come after score summary");
  check((await current.page.locator("#result-overview .scoregrid").innerText()).includes("Audit-adjusted"),
   "Frozen automated marks missing");
  check(await current.page.locator(".result-score-details").count()===1,
   "Source score and conservative bounds have been discarded");
  const details=await current.page.locator(".result-score-details").innerText();
  check(details.includes("Original-source key")&&details.includes("Scoring envelope"),
   "Frozen source-key comparison or conservative score bounds missing");
  const header=()=>current.page.locator(".results-heading h1").innerText();
  check(await header()==="Attempt analysis","L11 overview heading is misleading");
  await current.page.locator('[data-result-tab="review"]').click();
  check(await header()==="Attempt analysis","Review heading incorrectly remains Overview-specific");
  check(await current.page.locator("#result-tab-review").getAttribute("aria-selected")==="true",
   "Review tab selection semantics lost");
  check((await current.page.locator("#screen-announcement").innerText()).includes("Question review"),
   "Review announcement missing");
  check(await current.page.evaluate(()=>document.activeElement?.id)==="result-tab-review",
   "Review tab focus lost");
  await current.page.keyboard.press("ArrowRight");
  check(await current.page.locator("#result-tab-timing").getAttribute("aria-selected")==="true",
   "Keyboard cannot select Timing tab");
  check(await header()==="Attempt analysis","Timing tab must retain neutral heading");
  check((await current.page.locator("#screen-announcement").innerText()).includes("Question timing ledger"),
   "Timing announcement missing");
  check(await current.page.locator("#result-timing").count()===1,
   "Timing ledger unavailable");
  await current.page.locator("#g-history-results").click();
  await old.page.locator("#historyBack").click();
  await capture(old.page,"v11-"+v.name+"-history.png");
  await capture(current.page,"overhaul-"+v.name+"-history.png");
  const historyOld=await geometry(old.page,".attempt-row");
  const historyNew=await geometry(current.page,".archive-entry");
  const archive=await geometry(current.page,".history-archive");
  const summary=await geometry(current.page,".history-summary");
  check(historyNew.fullyVisible,
   v.name+" first saved History row is not fully visible: "+JSON.stringify(historyNew));
  check(historyNew.y<=historyOld.y+80,
   v.name+" archive entry still buried: old "+historyOld.y+" new "+historyNew.y);
  check(summary.y>archive.bottom,"History metrics must follow saved attempt archive");
  check(await current.page.locator(".history-summary .summary-stat").count()===6,
   "History metrics deleted instead of moved");
  check(await current.page.locator(".history-trend").count()===1&&
   await current.page.locator(".history-priorities").count()===1&&
   await current.page.locator("#g-cross-paper-priorities").count()===1,
   "Learning analytics removed");
  check(await current.page.locator("#g-storage-panel").count()===1&&
   await current.page.locator("#g-export-history").count()===1&&
   await current.page.locator("#g-import-history").count()===1,
   "Storage / backups removed");
  check(await current.page.locator(".archive-entry").count()===1,
   "History did not preserve completed record");
  await current.page.locator("#g-filter").selectOption("progress");
  check(await current.page.locator(".archive-entry").count()===0,
   "History progress filter ignored");
  await current.page.locator("#g-filter").selectOption("all");
  await current.page.locator("#g-history-search").fill("does-not-exist");
  check(await current.page.locator(".archive-entry").count()===0,
   "History text filter ignored");
  await current.page.locator("#g-history-search").fill("");
  await current.page.locator("#g-history-sort").selectOption("oldest");
  check(await current.page.locator(".archive-entry").count()===1,
   "History sort/reset lost saved record");
  await current.page.locator(".history-open").click();
  check(await current.page.locator(".results-heading h1").innerText()==="Attempt analysis",
   "History record no longer opens saved analysis");
  check(await noOverflow(current.page)<=2&&await noOverflow(old.page)<=2,
   v.name+" horizontal overflow");
  check(!current.errors.length&&!old.errors.length,
   "Runtime exceptions: "+[...current.errors,...old.errors].join("; "));
  observations.push({viewport:v,results:{v11Table:tableOld,overhaulTable:tableNew,
    score:scoreNew,tableTopDelta:tableNew.y-tableOld.y},
    history:{v11First:historyOld,overhaulFirst:historyNew,
     firstTopDelta:historyNew.y-historyOld.y,summaryAfterArchive:true},
    headingStable:true,filtersOperational:true});
  console.log("Pass27 "+v.name+" Results table old "+tableOld.y+" / new "+tableNew.y+
   "; History first old "+historyOld.y+" / new "+historyNew.y+" PASS");
 }finally{await old.context.close();await current.context.close();}
}
try{
 for(const v of laptops)await validatePair(v);
 for(const v of [{name:"phone390",width:390,height:844},
  {name:"tablet768",width:768,height:1024},
  {name:"laptop1366-zoom",width:1366,height:768}]){
  const x=await openFile(newHtml,v);
  try{
   await x.page.locator("#g-history").click();
   check(await x.page.locator(".history-archive").count()===1,
    "Responsive History missing");
   await x.page.locator("#displayTrigger").click();
   for(let i=0;i<8;i++)await x.page.locator("#fontMore").click();
   check(await x.page.locator("#fontReset").innerText()==="140%",
    "User's 140% text option unavailable");
   check(await noOverflow(x.page)<=2,
    v.name+" History overflow at 140%");
   check(await x.page.locator(".history-summary .summary-stat").count()===6,
    v.name+" history cards absent at 140%");
   check(await x.page.locator("#g-history-search").count()===1,
    v.name+" history filter missing");
   check(!x.errors.length,v.name+" runtime errors "+x.errors.join("; "));
   observations.push({viewport:v.name,scale:140,historyOverflow:false});
  }finally{await x.context.close();}
 }
 await writeFile(join(out,"pass27-geometry.json"),JSON.stringify({
  scope:"Pass27 L05 L06 L11",baseline:"baseline/v11",paper:"30 Sep 2026 reviewed",
  mode:"free",observations,disclaimer:"Measured Chromium file://, not physical-device or human visual approval."
 },null,2));
 console.log("Pass27: L05 L06 L11 first-fold and result semantics PASS");
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
