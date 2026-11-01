/**
 * Pass35: non-sticky header and DOM-detached viewport-floating Aa.
 * Real bundled file:// browser journeys; no scoring, routes or persistence edits.
 */
import {mkdir,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
import {chooseModernPaper} from "./paper-select.mjs";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS35_OUTPUT??join(root,"artifacts/pass35-detached-display"));
await mkdir(out,{recursive:true});
const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!binary)throw Error("Pass35 requires Chromium");
const browser=await chromium.launch({headless:true,
 executablePath:spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim(),
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const url=pathToFileURL(join(root,"Practice_Desk_Offline_Mock_Tests.html")).href;
const check=(ok,msg)=>{if(!ok)throw Error("PASS35 "+msg)};
const scenes=[];
async function make(width,height){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
 const page=await ctx.newPage();page.setDefaultTimeout(16000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>void d.accept());
 await page.goto(url,{waitUntil:"load"});
 await page.locator("#g-papers").waitFor();
 // Ensure there is actual document scrolling even for a fresh/empty History.
 await page.addStyleTag({content:"body{min-height:3100px!important}"});
 return {ctx,page,errors,width,height};
}
async function snapshot(a,label){
 const s=await a.page.evaluate(()=>{
  const aa=document.querySelector("#displayTrigger");
  const tools=document.querySelector(".display-tools");
  const header=document.querySelector("header");
  const rect=el=>{const r=el.getBoundingClientRect();return {
   x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
   bottom:+r.bottom.toFixed(1),right:+r.right.toFixed(1)}};
  return {
   header:rect(header),headerPosition:getComputedStyle(header).position,
   headerDisplay:getComputedStyle(header).display,
   aa:rect(aa),aaPosition:getComputedStyle(tools).position,
   detached:tools.parentElement===document.body&&!header.contains(tools),
   uniqueTrigger:document.querySelectorAll("#displayTrigger").length===1,
   uniquePanel:document.querySelectorAll("#displayPanel").length===1,
   panelOpen:!document.querySelector("#displayPanel").hidden,
   scrollY:window.scrollY,width:innerWidth,docWidth:document.documentElement.scrollWidth
  };
 });
 check(s.detached&&s.uniqueTrigger&&s.uniquePanel,
  label+" Aa must be a unique direct-body child, not part of header "+JSON.stringify(s));
 check(s.aaPosition==="fixed",label+" Aa lost fixed positioning");
 check(s.docWidth<=s.width+2,label+" horizontal document overflow "+JSON.stringify(s));
 const file=label+".png";
 await a.page.screenshot({path:join(out,file),animations:"disabled"});
 scenes.push({label,file,...s});
 return s;
}
async function verifyScrolled(a,screen,{headerHidden=false}={}){
 const expectedTop=a.width<=500?10:12;
 await a.page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 await a.page.evaluate(()=>window.scrollTo({top:700,behavior:"instant"}));
 await a.page.waitForFunction(()=>window.scrollY>350);
 const s=await snapshot(a,screen+"-"+a.width+"-scrolled");
 check(Math.abs(s.aa.y-expectedTop)<=1&&s.aa.right<=a.width+1&&s.aa.x>=-1,
  screen+" Aa moved/overflowed while scrolling "+JSON.stringify(s));
 if(headerHidden){
  check(s.headerDisplay==="none",screen+" unused masthead should be absent");
 }else{
  check(s.headerDisplay!=="none"&&s.headerPosition==="static",
   screen+" header must participate in normal document flow");
  check(s.header.bottom<0,screen+" brand header remained visible after scrolling "+JSON.stringify(s));
 }
 await a.page.locator("#displayTrigger").click();
 check(await a.page.locator("#displayPanel").isVisible(),screen+" Aa popover failed to open while scrolled");
 const p=await a.page.locator("#displayPanel").boundingBox();
 check(p&&p.x>=-1&&p.y>=-1&&p.x+p.width<=a.width+1&&
   p.y+p.height<=a.height+1,screen+" Aa popover overflowed the viewport "+JSON.stringify(p));
 check(await a.page.locator("#fontMore").count()===1&&
       await a.page.locator("#themeLight").count()===1&&
       await a.page.locator("#themeDark").count()===1&&
       await a.page.locator("#themeToggle").count()===1&&
       await a.page.locator("#displayFullscreen").count()===1,
  screen+" Display settings were lost while detaching Aa");
 await a.page.keyboard.press("Escape");
 check(await a.page.locator("#displayPanel").isHidden()&&
   await a.page.evaluate(()=>document.activeElement?.id)==="displayTrigger",
  screen+" Escape or keyboard focus restoration regressed");
}
async function broadJourney(){
 const a=await make(1366,768),p=a.page;
 try{
  await verifyScrolled(a,"library");
  await p.locator("#g-history").click();
  await p.locator(".history-archive").waitFor({state:"visible"});
  await verifyScrolled(a,"history");
  await p.locator("#g-library").click();
  await p.locator("#g-learning").click();
  await p.locator("#learning-close").waitFor({state:"visible"});
  await verifyScrolled(a,"learning");
  await p.locator("#learning-close").click();
  const paper=await p.locator("#g-papers option").evaluateAll(xs=>
   xs.find(x=>x.value.includes("cgl-2026-09-30")&&x.value.includes("reviewed"))?.value??"");
  check(Boolean(paper),"Reviewed CGL paper not available");
  await chooseModernPaper(p,paper);
  await p.locator('[data-mode="single"]').click();
  await p.locator("#g-single-section").selectOption("0");
  await p.locator("#g-start").click();
  await verifyScrolled(a,"exam");
  await p.locator("#g-exam-full").click();
  await verifyScrolled(a,"exam-immersive",{headerHidden:true});
  await p.locator("#g-exam-full").click();
  await p.locator("#g-submit").click();
  await p.locator(".result-performance-overview").waitFor({state:"visible"});
  await verifyScrolled(a,"result",{headerHidden:true});
  check(!a.errors.length,"Chromium errors "+a.errors.join("; "));
 }finally{await a.ctx.close();}
}
async function smallJourney(width,height){
 const a=await make(width,height),p=a.page;
 try{
  await verifyScrolled(a,"library");
  // Overlay is allowed to scroll internally; the page itself cannot gain
  // horizontal overflow at extreme 200%-equivalent mobile viewport.
  await p.locator("#g-history").click();
  await p.locator(".history-archive").waitFor({state:"visible"});
  await verifyScrolled(a,"history");
  check(!a.errors.length,width+"px browser errors "+a.errors.join("; "));
 }finally{await a.ctx.close();}
}
try{
 await broadJourney();
 await smallJourney(390,844);
 await smallJourney(195,844);
 await writeFile(join(out,"pass35-evidence.json"),JSON.stringify({
  title:"Pass35 independent Aa body sibling and non-sticky header browser regression",
  scenes:scenes.length,records:scenes
 },null,2));
 console.log("PASS35 HEADER SCROLLS / DETACHED Aa FLOATS PASS "+scenes.length+" SCENES");
}finally{await browser.close();}
