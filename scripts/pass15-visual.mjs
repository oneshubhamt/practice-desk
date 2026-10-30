/**
 * Pass 15: actual v11 vs overhaul file:// screenshots at identical viewports.
 * The zip artifact is inspection evidence, NOT physical-device or AT signoff.
 */
import {mkdtemp,mkdir,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
import {builtinCglPackages} from "../src/app/exam-package.ts";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS15_OUTPUT??join(root,"artifacts","pass15-visual"));
await mkdir(out,{recursive:true});
const baseln=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:12*1024*1024});
if(baseln.status!==0)throw Error("Cannot retrieve frozen v11 offline HTML: "+
 baseln.stderr.toString().slice(0,500)+". Fetch baseline/v11 before running.");
const tmp=await mkdtemp(join(tmpdir(),"practice-pass15-"));
const v11=join(tmp,"v11-offline.html");
await writeFile(v11,baseln.stdout);
const modern=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const source=JSON.parse(await readFile(join(root,"src/content/papers.json"),"utf8"));
const patches=JSON.parse(await readFile(join(root,"src/content/patches.json"),"utf8"));
const solutions=JSON.parse(await readFile(join(root,"src/content/solutions.json"),"utf8"));
const packages=builtinCglPackages(source,patches,solutions);
const sourcePaper=Object.values(source).find(p=>Object.keys(patches[p.id]??{}).some(n=>Number(n)<=25));
if(!sourcePaper)throw Error("No real audited source question in the first CGL section");
const revised=packages.find(p=>p.paper.paperId===sourcePaper.id&&p.paper.edition==="reviewed");
const auditQ=Number(Object.keys(patches[sourcePaper.id]??{}).find(n=>Number(n)<=25));
if(!revised||!Number.isInteger(auditQ))throw Error("Missing audited paper variant");
const executable=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(x=>
 spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!executable)throw Error("Chromium is not installed");
const executablePath=spawnSync("which",[executable],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const failures=[],observations=[],screens=[];
const ensure=(v,message)=>{if(!v)throw Error(message);};
const viewports=[
 {name:"phone390",width:390,height:844},
 {name:"tablet768",width:768,height:1024},
 {name:"desktop1280",width:1280,height:800},
];
const cssWide=async p=>p.evaluate(()=>{
 const w=window.innerWidth,doc=document.documentElement,body=document.body;
 const overflowing=[...document.querySelectorAll("*")].filter(el=>{
  const e=el;
  if(!(e instanceof HTMLElement)||!e.getClientRects().length)return false;
  if(e.closest(".scroll-table,.result-tabs,.generic-stimulus,.display-panel"))return false;
  const rect=e.getBoundingClientRect();
  return rect.right>w+3||rect.left< -3;
 }).slice(0,6).map(el=>({tag:el.tagName,cls:el.className?.toString().slice(0,100),
   right:Math.round(el.getBoundingClientRect().right)}));
 return {windowWidth:w,docWidth:doc.scrollWidth,bodyWidth:body.scrollWidth,
  overflow:doc.scrollWidth>w+2,overflowing};
});
async function capture(p,edition,screen,viewport){
 if(screen!=="corrected-review")await p.evaluate(()=>window.scrollTo(0,0));
 await p.screenshot({path:join(out,edition+"-"+viewport.name+"-"+screen+".png"),animations:"disabled"});
 const sizing=await cssWide(p);
 screens.push(edition+"-"+viewport.name+"-"+screen+".png");
 observations.push({edition,viewport:viewport.name,screen,sizing});
 if(sizing.overflow&&edition==="overhaul")
  failures.push(edition+" "+viewport.name+" "+screen+" document width "+
    sizing.docWidth+" > "+sizing.windowWidth+"; suspects "+JSON.stringify(sizing.overflowing));
}
const skip=(edition,viewport,reason)=>observations.push({edition,viewport:viewport.name,skipped:reason});
async function exercise(edition,viewport,filepath){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:"reduce",colorScheme:"light"});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept()});
 try{
  await page.goto(pathToFileURL(filepath).href,{waitUntil:"load"});
  const old=edition==="v11";
  await page.locator(old?"#paperSelect":"#g-papers").waitFor();
  if(old)await page.locator("#paperSelect").selectOption(sourcePaper.id);
  else await page.locator("#g-papers").selectOption(revised.paper.id);
  await capture(page,edition,"library",viewport);
  const title100=await page.locator("#app h1").evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  await page.locator("#displayTrigger").click();
  await capture(page,edition,"display-open",viewport);
  ensure(await page.locator("#themeLight").getAttribute("aria-pressed")==="true",
    edition+" theme selection missing");
  await page.locator("#themeDark").click();
  await capture(page,edition,"library-dark",viewport);
  await page.locator("#themeLight").click();
  for(let i=0;i<8;i++)await page.locator("#fontMore").click();
  ensure(await page.locator("#fontReset").innerText()==="140%",edition+" text scale 140% not reached");
  const title140=await page.locator("#app h1").evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  if(!old)ensure(title140>title100*1.3,
    "Overhaul heading did not scale with user 140% preference");
  await capture(page,edition,"display-text140",viewport);
  for(let i=0;i<11;i++)await page.locator("#fontLess").click();
  ensure(await page.locator("#fontReset").innerText()==="85%",edition+" text scale 85% not reached");
  await capture(page,edition,"display-text85",viewport);
  for(let i=0;i<3;i++)await page.locator("#fontMore").click();
  await page.locator("#displayClose").click();
  if(!old){
    await page.locator("#displayTrigger").focus();
    await page.keyboard.press("Enter");
    ensure(await page.locator("#displayPanel").isVisible(),"Display menu cannot be opened by keyboard");
    await page.keyboard.press("Escape");
    ensure(await page.locator("#displayPanel").isHidden(),"Escape did not dismiss Display menu");
    ensure(await page.evaluate(()=>document.activeElement?.id)==="displayTrigger",
      "Display keyboard dismissal failed to restore trigger focus");
  }
  await page.locator('[data-mode="free"]').click();
  await page.locator(old?"#start":"#g-start").click();
  await page.locator(old?".choices .choice":"input[data-choice]").first().click();
  await capture(page,edition,"exam-answered",viewport);
  const figure=sourcePaper.questions.find(q=>q.n<=25&&
    (Boolean(q.images?.stem)||(q.images?.options??[]).some(Boolean)));
  if(figure){
    await page.locator(old?'[data-num="'+(figure.n-1)+'"]':'[data-q="'+(figure.n-1)+'"]').click();
    await capture(page,edition,"exam-figure",viewport);
    ensure(await page.locator(old?".question img":".exam-question img").count()>0,
      edition+" figure option/stem image missing");
  }
  const passage=sourcePaper.questions.find(q=>q.passageRef);
  if(passage){
    const sectionIndex=Math.floor((passage.n-1)/25),qIndex=(passage.n-1)%25;
    await page.locator('[data-section="'+sectionIndex+'"]').click();
    await page.locator(old?'[data-num="'+qIndex+'"]':'[data-q="'+qIndex+'"]').click();
    await capture(page,edition,"exam-passage",viewport);
    ensure(await page.locator(old?".passage":".exam-question .generic-stimulus").count()>0,
      edition+" shared reading passage missing");
    await page.locator('[data-section="0"]').click();
  }
  if(auditQ<=25){
   await page.locator(old?'[data-num="'+(auditQ-1)+'"]':'[data-q="'+(auditQ-1)+'"]').click();
   await capture(page,edition,"exam-audited-question",viewport);
  }
  await page.locator(old?"#finish":"#g-submit").click();
  await page.locator(old?"[data-tab='insights']":"#result-overview").waitFor();
  await capture(page,edition,"results-overview",viewport);
  await page.locator(old?"[data-tab='review']":"[data-result-tab='review']").click();
  if(!old){
    ensure((await page.locator("#screen-announcement").textContent())?.includes("Question review"),
      "Review panel activation did not announce its destination");
    ensure(await page.evaluate(()=>document.activeElement?.id)==="result-tab-review",
      "Result tab failed to retain keyboard focus after rerender");
    // Native tab semantics: ArrowRight and ArrowLeft must track the active view
    // rather than leaving focus behind on an inactive tab.
    await page.keyboard.press("ArrowRight");
    ensure(await page.locator("#result-tab-timing").getAttribute("aria-selected")==="true"&&
      await page.evaluate(()=>document.activeElement?.id)==="result-tab-timing",
      "Result tab keyboard ArrowRight did not move selection and focus");
    await page.keyboard.press("ArrowLeft");
    ensure(await page.locator("#result-tab-review").getAttribute("aria-selected")==="true"&&
      await page.evaluate(()=>document.activeElement?.id)==="result-tab-review",
      "Result tab keyboard ArrowLeft did not move selection and focus");
    ensure(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches),
      "Reduced-motion browser preference not exposed");
    const motion=await page.locator("#g-review-top").evaluate(el=>
      getComputedStyle(el).transitionDuration);
    ensure(motion.split(",").every(x=>parseFloat(x)<=0.001),
      "Reduced-motion setting did not suppress button animations");
  }
  await capture(page,edition,"results-review",viewport);
  if(old){
   const q=page.locator("#review-"+auditQ);
   if(await q.count()){await q.scrollIntoViewIfNeeded();await capture(page,edition,"corrected-review",viewport);}
  }else{
   const item=revised.paper.sections[0].questionRevisionIds[auditQ-1];
   const q=page.locator('[data-review-id="'+item+'"]');
   ensure(await q.count()===1,"Audited frozen review item missing");
   await q.scrollIntoViewIfNeeded();await capture(page,edition,"corrected-review",viewport);
   ensure(await q.locator("details.source-review").count()===1,"Original PDF comparison absent");
  }
  await page.locator(old?"[data-tab='timing']":"[data-result-tab='timing']").click();
  await capture(page,edition,"results-timing",viewport);
  await page.locator(old?"#historyBack":"#g-history-results").click();
  await capture(page,edition,"history-populated",viewport);
  if(!old){
    ensure(await page.locator("#g-storage-panel").count()===1,"History storage panel missing");
    const status=page.locator("#screen-announcement");
    ensure(await status.getAttribute("aria-live")==="polite","Route announcer missing");
    ensure((await status.innerText()).includes("History"),"Route change not announced");
    const focus=await page.evaluate(()=>document.activeElement?.textContent?.trim().slice(0,30));
    ensure(focus?.includes("History"),"Navigation did not transfer focus to page heading");
  }
  ensure(!errors.length,edition+" "+viewport.name+" browser errors: "+errors.join("; "));
  console.log("Pass15 "+edition+" "+viewport.name+" snapshots and major route interactions PASS");
 }finally{await context.close();}
}
try{
 for(const viewport of viewports){
  for(const [edition,filename] of [["v11",v11],["overhaul",modern]])
   await exercise(edition,viewport,filename);
 }
 const zoom={name:"zoom200-phone",width:195,height:844};
 const context=await browser.newContext({viewport:zoom,reducedMotion:"reduce"});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 try{
  await page.goto(pathToFileURL(modern).href,{waitUntil:"load"});
  await page.locator("#g-papers").waitFor();
  await capture(page,"overhaul","library-200pct-zoom",zoom);
  await page.locator("#displayTrigger").click();
  await capture(page,"overhaul","display-200pct-zoom",zoom);
  await page.locator("#displayClose").click();
  await page.locator('[data-mode="free"]').click();
  await page.locator("#g-start").click();
  await capture(page,"overhaul","exam-200pct-zoom",zoom);
  // No offscreen answer controls even with a 195 CSS-px zoom-equivalent viewport.
  const optionBounds=await page.locator(".exam-question .generic-choice").first().boundingBox();
  ensure(optionBounds&&optionBounds.width>100&&optionBounds.x>=0&&
   optionBounds.x+optionBounds.width<=195,"Question option clipped at 200%-equivalent phone zoom");
 }finally{await context.close();}
}finally{
 await browser.close();
 await rm(tmp,{recursive:true,force:true});
}
await writeFile(join(out,"visual-layout-report.json"),JSON.stringify({
 run:"Pass 15 direct v11 / overhaul offline visual comparison",viewports,zoomEquivalentCssWidth:195,
 originalPaper:sourcePaper.id,reviewedPaperRevision:revised.paper.id,auditedQuestion:auditQ,
 screenshots:screens,observations,failures,
 humanSignoff:{physicalAndroid:false,physicalIos:false,desktopSafari:false,
  keyboardOnlyManual:false,voiceOver:false,nvda:false,humanVisualApproval:false},
 note:"Screenshots are automated browser evidence and are not physical-device or assistive-technology approval."
},null,2));
if(failures.length)throw Error("Pass 15 layout failures:\n"+failures.join("\n"));
console.log("Pass 15: v11 versus overhaul screenshots, 390/768/1280, light/dark, 140% fonts, real audited CGL, result and history, 200%-equivalent zoom PASS");
