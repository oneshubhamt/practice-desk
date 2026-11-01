/**
 * Pass36: screenshot-backed, conditional Library spacing regression for an
 * authentic saved unfinished attempt. Runs against the bundled file:// app.
 */
import {mkdir,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS36_OUTPUT??join(root,"artifacts/pass36-library-spacing"));
await mkdir(out,{recursive:true});
const cli=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(cmd=>spawnSync(cmd,["--version"],{encoding:"utf8"}).status===0);
if(!cli)throw Error("Pass36 needs Chromium");
const browser=await chromium.launch({headless:true,
 executablePath:spawnSync("which",[cli],{encoding:"utf8"}).stdout.trim(),
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const file=pathToFileURL(join(root,"Practice_Desk_Offline_Mock_Tests.html")).href;
const check=(ok,msg)=>{if(!ok)throw Error("PASS36 "+msg)};
const results=[];
const scenes=[
 {name:"desktop1366-dark",width:1366,height:768,dark:true,scale:false},
 {name:"desktop1366-dark-140",width:1366,height:768,dark:true,scale:true},
 {name:"mobile390-dark",width:390,height:844,dark:true,scale:false},
 {name:"zoom195-light",width:195,height:844,dark:false,scale:false}
];
async function geometry(page){
 return page.evaluate(()=>{
  const pending=document.querySelector("#g-pending-attempts");
  const grid=document.querySelector(".home-grid");
  const picker=document.querySelector(".home-picker");
  const preview=document.querySelector(".paper-preview");
  const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();
   return {top:+r.top.toFixed(2),bottom:+r.bottom.toFixed(2),
    left:+r.left.toFixed(2),right:+r.right.toFixed(2),height:+r.height.toFixed(2)}};
  return {pending:box(pending),grid:box(grid),picker:box(picker),
   preview:box(preview),gridMarginTop:getComputedStyle(grid).marginTop,
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth};
 });
}
try{
 for(const scene of scenes){
  const context=await browser.newContext({viewport:{width:scene.width,height:scene.height},
   reducedMotion:"reduce",colorScheme:scene.dark?"dark":"light"});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  page.on("dialog",d=>void d.accept());
  try{
   await page.goto(file,{waitUntil:"load"});
   await page.locator("#g-papers").waitFor({state:"visible"});
   if(scene.dark){
    await page.locator("#displayTrigger").click();
    await page.locator("#themeDark").click();
    await page.locator("#displayClose").click();
   }
   if(scene.scale){
    await page.locator("#displayTrigger").click();
    for(let i=0;i<8;i++)await page.locator("#fontMore").click();
    check((await page.locator("#fontReset").innerText())==="140%","Text 140% setting failed");
    await page.locator("#displayClose").click();
   }
   const initial=await geometry(page);
   check(initial.pending===null,scene.name+" fresh Library should have no unfinished card");
   check(parseFloat(initial.gridMarginTop)===0,
    scene.name+" fresh Library has an unintended blank margin: "+initial.gridMarginTop);
   await page.locator("#g-start").click();
   await page.locator(".exam-question").first().waitFor({state:"visible"});
   await page.locator("#g-library").click();
   await page.locator("#g-pending-attempts").waitFor({state:"visible"});
   const measured=await geometry(page);
   const gap=(measured.grid?.top??0)-(measured.pending?.bottom??0);
   check(Math.abs(gap-18)<=1,scene.name+" pending-to-Paper/Selected paper gap must be 18px, got "+
     gap+"px "+JSON.stringify(measured));
   check(Math.abs((measured.picker?.top??0)-(measured.preview?.top??0))<=1,
     scene.name+" Paper and Selected paper tops no longer align");
   check(measured.scrollWidth<=measured.width+2,
     scene.name+" new spacing introduced horizontal document overflow");
   check(await page.locator("#g-pending-attempts [data-attempt]").count()===1,
     scene.name+" unfinished attempt no longer resumable");
   check(await page.locator("#g-papers").isEnabled()&&
         await page.locator(".paper-preview").isVisible(),
     scene.name+" paper picker or selected-paper information lost");
   await page.evaluate(()=>{
    const grid=document.querySelector(".home-grid");
    scrollTo({top:Math.max(0,window.scrollY+grid.getBoundingClientRect().top-370),
      behavior:"instant"});
   });
   const shot=scene.name+".png";
   await page.screenshot({path:join(out,shot),animations:"disabled"});
   check(!errors.length,scene.name+" page errors "+errors.join("; "));
   results.push({scene:scene.name,initial,withPending:measured,gap,
    resumeAction:true,screenshot:shot});
  }finally{await context.close();}
 }
 await writeFile(join(out,"pass36-evidence.json"),JSON.stringify({
  title:"Pass36 resume-to-paper spacing only when unfinished attempts exist",
  expectedGapPx:18,scenes:results
 },null,2));
 console.log("PASS36 LIBRARY RESUME/PAPER CONDITIONAL GAP PASS "+
  results.length+" SCENES");
}finally{await browser.close();}
