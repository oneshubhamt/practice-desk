/** Pass31: true frozen-v11 compact exam chrome/side navigator comparison and
 * real file:// generic interaction/regression journeys. Screenshots and geometry
 * are automated evidence, not human/physical-device/AT certification. */
import {chooseModernPaper} from "./paper-select.mjs";
import {readFile,writeFile,mkdir,mkdtemp,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS31_OUTPUT??join(root,"artifacts/pass31-ui"));
await mkdir(out,{recursive:true});
const bytes=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:20*1024*1024});
if(bytes.status!==0||!bytes.stdout?.length)throw Error("Pass31 requires frozen baseline/v11");
const temp=await mkdtemp(join(tmpdir(),"practice-pass31-"));
const oldFile=join(temp,"v11.html");
await writeFile(oldFile,bytes.stdout);
const currentFile=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const bank=JSON.parse(await readFile(join(root,"examples/apfc-mcq-nat-starter.json"),"utf8"));
const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!binary)throw Error("Pass31 requires Chromium");
const executablePath=spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const check=(condition,msg)=>{if(!condition)throw Error("PASS31: "+msg)};
const records=[];
async function make(era,width,height){
 const ctx=await browser.newContext({viewport:{width,height},
  reducedMotion:"reduce",acceptDownloads:true,colorScheme:"dark"});
 const page=await ctx.newPage();page.setDefaultTimeout(16000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept()});
 await page.goto(pathToFileURL(era==="v11"?oldFile:currentFile).href,{waitUntil:"load"});
 await page.locator(era==="v11"?"#paperSelect":"#g-papers").waitFor();
 return {ctx,page,errors};
}
async function cgl(page,era,mode="single"){
 if(era==="v11"){
  await page.locator("#paperSelect").selectOption("cgl-2026-09-30");
  await page.locator('[data-edition="reviewed"]').click();
  await page.locator('[data-mode="'+mode+'"]').click();
  if(mode==="single")await page.locator("#singleSelect").selectOption("0");
  await page.locator("#start").click();
 }else{
  const id=await page.locator("#g-papers option").evaluateAll(xs=>
   xs.find(x=>x.value.includes("cgl-2026-09-30")&&x.value.includes("reviewed"))?.value??"");
  check(Boolean(id),"Reviewed CGL test unavailable");
  await chooseModernPaper(page,id);
  await page.locator('[data-mode="'+mode+'"]').click();
  if(mode==="single")await page.locator("#g-single-section").selectOption("0");
  await page.locator("#g-start").click();
 }
}
async function capture(page,label){
 await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 const g=await page.evaluate(()=>{
  const box=sel=>{
   const el=document.querySelector(sel);if(!el)return null;
   const b=el.getBoundingClientRect();
   return {left:Math.round(b.left),top:Math.round(b.top),
    width:Math.round(b.width),height:Math.round(b.height),
    right:Math.round(b.right),bottom:Math.round(b.bottom)};
  };
  return {header:box("header .wrap"),main:box("main"),
   side:box(".exam-sidebar, .side"),heading:box(".exam-header h1, .paperline"),
   progress:box(".exam-time-progress, .progress"),
   first:box(".exam-question, .question"),palette:box(".generic-palette, .palette"),
   firstQuestion:box('[data-q="0"], [data-num="0"]'),
   stats:box(".navigator-stats"),
   topDuplicate:document.querySelectorAll(".exam-progress .fine").length,
   progressA11y:document.querySelector(".exam-time-progress")?.getAttribute("aria-label")??"",
   docWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
 });
 const file=label+".png";
 await page.screenshot({path:join(out,file),animations:"disabled"});
 records.push({label,file,geometry:g});
 check(g.docWidth<=g.viewportWidth+2,"Horizontal document overflow "+label+" "+JSON.stringify(g));
 return g;
}
async function stats(page,answered,unanswered,flagged,denominator){
 const numbers=await page.locator(".navigator-stats b").allInnerTexts();
 check(numbers.length===3,"Missing three navigator status tiles");
 check(numbers[0].replace(/\s+/g," ").trim()===answered+" / "+denominator,
  "Answered status drift "+JSON.stringify(numbers));
 check(Number(numbers[1])===unanswered&&Number(numbers[2])===flagged,
  "Unanswered/flagged status drift "+JSON.stringify(numbers));
}
try{
 for(const vp of [{name:"laptop1366",width:1366,height:768},
                  {name:"laptop1440",width:1440,height:900}]){
  const baseline=await make("v11",vp.width,vp.height);
  const now=await make("overhaul",vp.width,vp.height);
  try{
   await cgl(baseline.page,"v11");
   await cgl(now.page,"overhaul");
   const old=await capture(baseline.page,"v11-"+vp.name+"-single-initial");
   const neo=await capture(now.page,"overhaul-"+vp.name+"-single-initial");
   check(old.side&&old.side.width>=234&&old.side.width<=246,
    "Frozen v11 sidebar not 240px "+JSON.stringify(old.side));
   check(neo.side&&Math.abs(neo.side.width-old.side.width)<=3,
    "Overhaul desktop side diverges from v11 width "+old.side.width+" vs "+neo.side.width);
   check(neo.header.width<=1132&&Math.abs(neo.header.width-old.header.width)<=3,
    "Header container did not restore v11 narrower width "+JSON.stringify({old:old.header,new:neo.header}));
   check(neo.main.width<=1132,"Exam main should be v11-width without resizing Library");
   check(Math.abs(neo.heading.height-old.heading.height)<=8,
    "Exam heading text much taller than v11 "+neo.heading.height+" vs "+old.heading.height);
   check(neo.topDuplicate===0,"Redundant answer counter still above questions");
   check(neo.progressA11y.length>0,"Accessible timer/coverage bar was lost");
   check(neo.stats&&neo.stats.width>0,"Compact sidebar stats not visible");
   check(await now.page.locator(".navigator-help summary").innerText()==="Keyboard shortcuts",
    "Keyboard help was deleted rather than collapsed");
   check(await now.page.locator(".navigator-help").evaluate(x=>!x.open),
    "Verbose shortcut instructions should be collapsed initially");
   check((await now.page.locator(".exam-sidebar").innerText()).includes("Answers remain hidden"),
    "Pre-submit key confidentiality guidance missing");
   check(!(await now.page.locator(".exam-header").innerText()).includes("answered"),
    "Exam header still repeats answered totals");
   await stats(now.page,0,25,0,25);
   await now.page.locator(".exam-question input[data-choice]").first().click();
   await stats(now.page,1,24,0,25);
   await now.page.locator("#g-flag").click();
   await stats(now.page,1,24,1,25);
   check(await now.page.locator('[data-q="0"]').getAttribute("aria-current")==="step",
    "Current question not represented in palette");
   await capture(now.page,"overhaul-"+vp.name+"-single-answered-flagged");
   await now.page.locator('[data-q="2"]').click();
   check((await now.page.locator(".exam-question .eyebrow").innerText()).includes("Question 3 of 25"),
    "Palette navigation failed");
   await now.page.locator('[data-q="0"]').click();
   check(await now.page.locator(".exam-question input[data-choice]").first().isChecked(),
    "Answer lost on returning to first question");
   await now.page.locator(".navigator-help summary").click();
   check(await now.page.locator(".navigator-help").evaluate(x=>x.open),
    "Keyboard help not operable by native details");
   check(!now.errors.length,"Modern runtime error "+now.errors.join(";"));
  }finally{await baseline.ctx.close();await now.ctx.close();}
 }
 for(const vp of [{name:"phone390",width:390,height:844},
                  {name:"zoom195",width:195,height:844}]){
  const now=await make("overhaul",vp.width,vp.height);
  try{
   await cgl(now.page,"overhaul","free");
   await stats(now.page,0,25,0,25);
   await capture(now.page,"overhaul-"+vp.name+"-free-initial");
   await now.page.locator(".exam-question input[data-choice]").first().click();
   await now.page.locator("#g-flag").click();
   await stats(now.page,1,24,1,25);
   await capture(now.page,"overhaul-"+vp.name+"-free-answered-flagged");
   check(!now.errors.length,"Modern runtime error "+now.errors.join(";"));
  }finally{await now.ctx.close();}
 }
 // Native generic author bank has a one-question section, not CGL's 25.
 const custom=await make("overhaul",1366,768);
 try{
  await custom.page.locator("#g-file").setInputFiles({
   name:"apfc-mcq-nat-starter.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(bank))});
  await custom.page.waitForFunction(()=>document.querySelector("#g-papers")?.value===
   "bank:apfc-starter-demo:paper:r1");
  await custom.page.locator("#g-start").click();
  await stats(custom.page,0,1,0,1);
  await capture(custom.page,"overhaul-laptop1366-apfc-initial");
  await custom.page.locator(".exam-question input[data-choice]").first().click();
  await stats(custom.page,1,0,0,1);
  await custom.page.locator('[data-section="2"]').click();
  await stats(custom.page,0,1,0,1);
  check(await custom.page.locator("#g-number").count()===1,
   "Numeric-entry exam control missing after section switch");
  await capture(custom.page,"overhaul-laptop1366-apfc-nat");
  check(!custom.errors.length,"Generic runtime error "+custom.errors.join(";"));
 }finally{await custom.ctx.close();}
 // Strict timed CGL retains section locking and disabled future tabs.
 const strict=await make("overhaul",1366,768);
 try{
  await cgl(strict.page,"overhaul","strict");
  check(await strict.page.locator('[data-section="1"]').isDisabled(),
   "Strict second section was unlocked by chrome changes");
  await stats(strict.page,0,25,0,25);
  await capture(strict.page,"overhaul-laptop1366-strict-locked");
  check(!strict.errors.length,"Strict runtime error "+strict.errors.join(";"));
 }finally{await strict.ctx.close();}
 await writeFile(join(out,"pass31-evidence.json"),
  JSON.stringify({title:"Pass31 frozen-v11 header/side parity and new exam state coverage",
   scenes:records.length,records},null,2));
 console.log("PASS31 v11 COMPACT HEADER/NAVIGATOR AND MULTI-EXAM JOURNEYS PASS "+records.length+" SCENES");
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
