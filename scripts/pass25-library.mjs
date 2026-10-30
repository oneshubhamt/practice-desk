/**
 * Pass25: enforce laptop-first Library geometry and behavior vs frozen v11.
 * Unlike earlier screenshot-only checks, fail if the primary setup action
 * is below the first viewport. The browser is the real offline file:// build.
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
if(baseline.status!==0||!baseline.stdout.length)throw Error("Frozen v11 HTML required");
const out=resolve(process.env.PASS25_OUTPUT??join(root,"artifacts/pass25-library"));
await mkdir(out,{recursive:true});
const tmp=await mkdtemp(join(tmpdir(),"practice-pass25-"));
const v11=join(tmp,"v11.html");await writeFile(v11,baseline.stdout);
const current=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const exe=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(cmd=>
 spawnSync(cmd,["--version"],{encoding:"utf8"}).status===0);
if(!exe)throw Error("Pass25 requires Chromium");
const bin=spawnSync("which",[exe],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath:bin,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const assert=(condition,reason)=>{if(!condition)throw Error("Pass25: "+reason)};
const screens=[
 {name:"laptop1280",width:1280,height:800},
 {name:"laptop1366",width:1366,height:768},
 {name:"laptop1440",width:1440,height:900},
 {name:"laptop1536",width:1536,height:864},
];
const results=[];
async function setup(url,width,height){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce",colorScheme:"light"});
 const page=await ctx.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept()});
 await page.goto(pathToFileURL(url).href,{waitUntil:"load"});
 return {ctx,page,errors};
}
async function rect(page,selector){
 return page.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect();
  return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),
   height:Math.round(r.height),bottom:Math.round(r.bottom),
   fullyVisible:r.top>=0&&r.bottom<=window.innerHeight};
 });
}
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
try{
 for(const v of screens){
  const old=await setup(v11,v.width,v.height);
  const modern=await setup(current,v.width,v.height);
  try{
   // Compare the exact same CGL family and reviewed edition, rather than
   // silently contrasting v11's default first paper with overhaul's latest.
   const dateId="cgl-2026-09-30";
   await old.page.locator("#paperSelect").selectOption(dateId);
   await old.page.locator('[data-edition="reviewed"]').click();
   const sameEdition=await modern.page.locator("#g-papers option").evaluateAll((opts,id)=>
     opts.find(o=>o.value.includes(id)&&o.value.includes("reviewed"))?.value??"",dateId);
   assert(Boolean(sameEdition),"Paired source/reviewed CGL edition unavailable");
   await modern.page.locator("#g-papers").selectOption(sameEdition);
   assert((await old.page.locator("#app").innerText()).includes("30 September 2026"),
     "v11 comparison paper not selected");
   assert((await modern.page.locator("#g-papers option:checked").innerText()).includes("30 Sep 2026"),
     "Overhaul comparison paper not selected");
   const base={paper:await rect(old.page,"#paperSelect"),start:await rect(old.page,"#start")};
   const main={paper:await rect(modern.page,"#g-papers"),
    start:await rect(modern.page,"#g-start"),mode:await rect(modern.page,'[data-mode="strict"]')};
   assert(await modern.page.locator(".home-grid").count()===1,"Library setup grid absent");
   const statsAfter=await modern.page.evaluate(()=>{
    const stats=document.querySelector(".home-stats"),grid=document.querySelector(".home-grid"),
      utilities=document.querySelector(".home-utilities");
    return Boolean(stats&&grid&&utilities&&
     (grid.compareDocumentPosition(stats)&Node.DOCUMENT_POSITION_FOLLOWING)&&
     (utilities.compareDocumentPosition(stats)&Node.DOCUMENT_POSITION_FOLLOWING));
   });
   assert(statsAfter,"Supplemental summary metrics must follow setup and utilities");
   assert(main.start.fullyVisible,"Start falls below "+v.width+"x"+v.height+" initial viewport: "+JSON.stringify(main.start));
   assert(main.start.y<=base.start.y+18,
    "Start regressed vs v11 at "+v.name+": old y"+base.start.y+" new y"+main.start.y);
   assert(main.paper.y<=base.paper.y+80,
    "Paper selection still buried vs v11 at "+v.name+": old y"+base.paper.y+" new y"+main.paper.y);
   assert(await overflow(modern.page)<=2,"Library horizontal overflow at "+v.name);
   assert(await modern.page.locator("#g-edition").count()===1,
    "Source/reviewed edition selector lost for built-in CGL");
   assert(await modern.page.locator(".paper-preflight").count()===1,
    "Scoring/source preflight lost while rearranging Library");
   assert(await modern.page.locator("#g-learning").count()===1&&
     await modern.page.locator("#g-export-history").count()===1&&
     await modern.page.locator("#g-import-history").count()===1,
      "Learning/backup affordance missing from rearranged Library");
   assert(await modern.page.locator(".home-stat").count()===4,"Dashboard counts deleted instead of moved");
   await old.page.screenshot({path:join(out,"v11-"+v.name+"-library.png"),animations:"disabled"});
   await modern.page.screenshot({path:join(out,"overhaul-"+v.name+"-library.png"),animations:"disabled"});
   const initialEdition=await modern.page.locator("#g-edition").inputValue();
   await modern.page.locator('[data-mode="free"]').click();
   assert(await modern.page.locator('[data-mode="free"]').getAttribute("aria-pressed")==="true",
     "Flexible mode not operable at "+v.name);
   assert(await modern.page.locator("#g-start").isEnabled(),"Start disabled unexpectedly after free mode");
   await modern.page.locator('[data-mode="single"]').click();
   assert(await modern.page.locator("#g-single-section").count()===1,
     "Single-section selector missing after mode change");
   await modern.page.locator("#g-single-section").selectOption("2");
   await modern.page.locator('[data-mode="strict"]').click();
   assert(await modern.page.locator("#g-edition").inputValue()===initialEdition,
     "Edition was reset when changing modes");
   assert(modern.errors.length===0,"Current Library runtime errors "+modern.errors.join("; "));
   assert(old.errors.length===0,"v11 runtime errors "+old.errors.join("; "));
   results.push({viewport:v.name,width:v.width,height:v.height,old:base,overhaul:main,
    deltaStartY:main.start.y-base.start.y,deltaPaperY:main.paper.y-base.paper.y,
    scoreAndEditionPolicyVisible:true,modeChangesPass:true});
   console.log("Pass25 "+v.name+" old Start "+base.start.y+" → overhaul "+main.start.y+
    "; old paper "+base.paper.y+" → overhaul "+main.paper.y+" PASS");
  }finally{await old.ctx.close();await modern.ctx.close();}
 }
 // Responsive scope guard: the compact laptop rules must not impair touch
 // controls on mobile/tablet or large user-configured font sizes.
 for(const v of [{width:390,height:844},{width:768,height:1024},{width:1366,height:768}]){
  const {ctx,page,errors}=await setup(current,v.width,v.height);
  try{
   assert(await page.locator("#g-start").count()===1,"Missing mobile/tablet Start");
   assert(await page.locator("#g-edition").count()===1,"Missing responsive edition selector");
   assert(await overflow(page)<=2,"Responsive Library overflow at "+v.width);
   await page.locator("#displayTrigger").click();
   for(let i=0;i<8;i++)await page.locator("#fontMore").click();
   assert(await page.locator("#fontReset").innerText()==="140%","Scale 140% failed");
   assert(await overflow(page)<=2,"140% Library horizontal overflow at "+v.width);
   assert(await page.locator("#g-start").isEnabled(),"140% Start became disabled");
   await page.locator("#displayClose").click();
   if(v.width===1366){
    await page.screenshot({path:join(out,"overhaul-laptop1366-text140.png"),animations:"disabled"});
   }
   assert(errors.length===0,"Responsive runtime errors "+errors.join("; "));
   results.push({viewport:v.width+"x"+v.height+" at 140%",noHorizontalOverflow:true,
      editionAndStartAvailable:true});
  }finally{await ctx.close();}
 }
 await writeFile(join(out,"pass25-library-geometry.json"),JSON.stringify({
  title:"Pass25 independent real file:// v11/overhaul laptop Library geometry and functionality",
  constraints:{startFullyVisible:true,startTopVsV11MaxDeltaPx:18,paperTopVsV11MaxDeltaPx:80},
  results,notes:"Original source banks and production branches not modified; mobile/touch AT not certified."
 },null,2));
 console.log("Pass25: laptop action-first geometry, preserved generic controls and responsive scope PASS");
}finally{
 await browser.close();await rm(tmp,{recursive:true,force:true});
}
