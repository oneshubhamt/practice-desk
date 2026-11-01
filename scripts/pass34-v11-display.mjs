/**
 * Pass34 frozen v11 Aa component comparison. Browser evidence covers actual
 * file:// geometry/colors and modern cross-screen controls without changing
 * scoring, navigation or stored records.
 */
import {chooseModernPaper} from "./paper-select.mjs";
import {mkdir,mkdtemp,writeFile,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS34_OUTPUT??join(root,"artifacts/pass34-v11-display"));
await mkdir(out,{recursive:true});
const v11=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:20*1024*1024});
if(v11.status!==0||!v11.stdout?.length)throw Error("Frozen baseline/v11 HTML unavailable");
const temp=await mkdtemp(join(tmpdir(),"practice-pass34-"));
const oldFile=join(temp,"frozen-v11.html");await writeFile(oldFile,v11.stdout);
const executable=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!executable)throw Error("Pass34 requires Chromium");
const browser=await chromium.launch({headless:true,
 executablePath:spawnSync("which",[executable],{encoding:"utf8"}).stdout.trim(),
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const must=(condition,message)=>{if(!condition)throw Error("PASS34 "+message)};
const scenes=[];
const rectWithin=(r,w,h)=>r&&r.x>=-1&&r.y>=-1&&r.right<=w+1&&r.bottom<=h+1;
async function make(era,w,h){
 const ctx=await browser.newContext({viewport:{width:w,height:h},reducedMotion:"reduce"});
 const page=await ctx.newPage();page.setDefaultTimeout(16000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>void d.accept());
 await page.goto(pathToFileURL(era==="v11"?oldFile:join(root,"Practice_Desk_Offline_Mock_Tests.html")).href,
  {waitUntil:"load"});
 await page.locator(era==="v11"?"#paperSelect":"#g-papers").waitFor();
 return {page,ctx,errors,era,w,h};
}
async function state(a,label){
 const p=a.page;
 const state=await p.evaluate(()=>{
  const trigger=document.querySelector("#displayTrigger");
  const panel=document.querySelector("#displayPanel");
  const r=(node)=>{const q=node.getBoundingClientRect();return {
   x:+q.x.toFixed(2),y:+q.y.toFixed(2),w:+q.width.toFixed(2),
   h:+q.height.toFixed(2),right:+q.right.toFixed(2),bottom:+q.bottom.toFixed(2)}};
  const cs=getComputedStyle(trigger);
  return {trigger:r(trigger),panel:panel.hidden?null:r(panel),
   position:getComputedStyle(document.querySelector(".display-tools")).position,
   background:cs.backgroundColor,color:cs.color,border:cs.borderTopColor,
   label:trigger.textContent.trim(),aria:trigger.getAttribute("aria-label"),
   expanded:trigger.getAttribute("aria-expanded"),
   theme:document.documentElement.dataset.theme,
   docWidth:document.documentElement.scrollWidth,viewport:innerWidth,
   scrollY,headerHeight:document.querySelector("header").getBoundingClientRect().height};
 });
 // Frozen v11 itself overflows at 195 CSS px; preserve its screenshot
 // honestly, but require the updated app to avoid that known baseline defect.
 if(a.era==="overhaul")must(state.docWidth<=state.viewport+2,
  label+" page overflow "+JSON.stringify(state));
 if(label){
  const file=label+".png";await p.screenshot({path:join(out,file),animations:"disabled"});
  scenes.push({label,file,...state});
 }
 return state;
}
async function compareAt(w,h,theme){
 const a=await make("v11",w,h),b=await make("overhaul",w,h);
 try{
  if(theme==="dark"){
   for(const x of [a,b]){
    await x.page.locator("#displayTrigger").click();
    await x.page.locator("#themeDark").click();
    await x.page.locator("#displayClose").click();
    await x.page.mouse.move(2,Math.min(180,h-2));
    must(await x.page.locator("#displayTrigger").getAttribute("aria-expanded")==="false",
      "Display trigger remained expanded after close");
   }
  }
  const old=await state(a,"v11-library-"+w+"-"+theme);
  const now=await state(b,"overhaul-library-"+w+"-"+theme);
  must(old.label==="Aa"&&now.label==="Aa","Button text differs from frozen v11");
  must(now.aria==="Display settings","Accessible Aa name lost");
  must(now.position==="fixed","Aa is not a floating viewport-fixed control");
  for(const k of ["x","y","w","h"])
   must(Math.abs(now.trigger[k]-old.trigger[k])<=1,
    "Aa "+k+" differs from v11 at "+w+" "+theme+": "+
    JSON.stringify({old:old.trigger,modern:now.trigger}));
  for(const k of ["background","color","border"])
   must(now[k]===old[k],"Aa "+k+" color differs from v11 "+theme+": "+old[k]+" / "+now[k]);
  await a.page.locator("#displayTrigger").click();
  await b.page.locator("#displayTrigger").click();
  const popupOld=await state(a,"v11-library-popup-"+w+"-"+theme);
  const popupNew=await state(b,"overhaul-library-popup-"+w+"-"+theme);
  must(popupNew.expanded==="true","Popover aria-expanded missing");
  must(popupNew.panel&&rectWithin(popupNew.panel,w,h),"Popover offscreen "+w);
  if(w>=390){
   must(Math.abs(popupOld.panel.w-popupNew.panel.w)<=2,
    "Popover width differs from v11 "+w+" "+JSON.stringify({old:popupOld.panel,new:popupNew.panel}));
   must(Math.abs(popupOld.panel.x-popupNew.panel.x)<=2,
    "Popover anchor differs from v11 "+w);
  }
  must(await b.page.locator("#themeToggle").count()===1&&
       await b.page.locator("#displayFullscreen").count()===1,
       "Overhaul-only Display functions were removed");
  if(w===1366&&theme==="light"){
   await b.page.locator("#fontMore").click();
   must(await b.page.locator("#fontReset").innerText()==="105%","Font+ regression");
   await b.page.locator("#fontReset").click();
   must(await b.page.locator("#fontReset").innerText()==="100%","Font reset regression");
   await b.page.locator("#themeToggle").click();
   must(await b.page.locator("html").getAttribute("data-theme")==="dark","Theme-toggle regression");
   await b.page.locator("#themeLight").click();
   must(await b.page.locator("html").getAttribute("data-theme")==="light","Theme light regression");
   await b.page.keyboard.press("Escape");
   must(await b.page.locator("#displayPanel").isHidden(),"Escape must close popover");
   must(await b.page.evaluate(()=>document.activeElement?.id)==="displayTrigger",
    "Escape must restore focus to Aa");
   await b.page.locator("#displayTrigger").click();
   await b.page.locator("#displayClose").click();
   must(await b.page.evaluate(()=>document.activeElement?.id)==="displayTrigger",
    "Close button must restore focus to Aa");
  }
  must(!b.errors.length,"Browser errors "+b.errors.join("; "));
 }finally{await a.ctx.close();await b.ctx.close();}
}
async function modernScreenJourneys(){
 const b=await make("overhaul",1366,768),p=b.page;
 try{
  // History and Learning are distinct route renderers. Their Display control
  // must remain fixed even when the user scrolls a long view.
  await p.locator("#g-history").click();
  await p.locator(".history-archive").waitFor({state:"visible"});
  await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  let s=await state(b,"overhaul-history-scrolled");
  must(s.position==="fixed"&&s.trigger.y===12,"Aa did not float on History");
  await p.locator("#g-library").click();
  await p.locator("#g-learning").click();
  s=await state(b,"overhaul-learning");
  must(s.position==="fixed"&&s.trigger.y===12,"Aa did not float on Learning");
  await p.locator("#learning-close").click();
  const id=await p.locator("#g-papers option").evaluateAll(xs=>
   xs.find(x=>x.value.includes("cgl-2026-09-30")&&x.value.includes("reviewed"))?.value??"");
  must(Boolean(id),"Expected reviewed CGL option");
  await chooseModernPaper(p,id);
  await p.locator('[data-mode="single"]').click();
  await p.locator("#g-single-section").selectOption("0");
  await p.locator("#g-start").click();
  s=await state(b,"overhaul-exam");
  must(s.position==="fixed"&&s.trigger.y===12,"Aa did not float on Exam");
  await p.locator("#g-exam-full").click();
  s=await state(b,"overhaul-exam-immersive");
  must(s.position==="fixed"&&s.trigger.y<=12,"Aa hidden in immersive Exam");
  await p.locator("#displayTrigger").click();
  must(await p.locator("#displayPanel").isVisible(),"Immersive Aa popover missing");
  await p.locator("#displayClose").click();
  await p.locator("#g-exam-full").click();
  await p.locator("#g-submit").click();
  await p.locator(".result-performance-overview").waitFor({state:"visible"});
  await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  s=await state(b,"overhaul-results-scrolled");
  must(s.position==="fixed"&&s.trigger.y===12,"Aa did not float on Results");
  await p.locator("#displayTrigger").click();
  must(await p.locator("#themeDark").isVisible(),"Results Display controls lost");
  await p.locator("#displayClose").click();
  must(!b.errors.length,"Modern screen journey errors "+b.errors.join("; "));
 }finally{await b.ctx.close();}
}
try{
 for(const [w,h,theme] of [[1366,768,"light"],[1366,768,"dark"],
  [390,844,"light"],[390,844,"dark"],[195,844,"light"]])
  await compareAt(w,h,theme);
 await modernScreenJourneys();
 await writeFile(join(out,"pass34-evidence.json"),JSON.stringify({
  title:"Pass34 frozen v11 Aa button parity and full overhaul screen functions",
  count:scenes.length,scenes},null,2));
 console.log("PASS34 V11 Aa PARITY AND CROSS-SCREEN DISPLAY PASS "+scenes.length+" SCENES");
}finally{
 await browser.close();await rm(temp,{recursive:true,force:true});
}
