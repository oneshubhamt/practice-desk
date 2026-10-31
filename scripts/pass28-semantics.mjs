/**
 * Pass28: actual single-file browser acceptance of L07-L10, with frozen v11
 * display screenshots and source-backed editorial examples.
 */
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS28_OUTPUT??join(root,"artifacts/pass28-semantics"));
await mkdir(out,{recursive:true});
const baseline=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:18*1024*1024});
if(baseline.status!==0||!baseline.stdout.length)throw Error("Frozen v11 missing");
const temporary=await mkdtemp(join(tmpdir(),"practice-pass28-"));
const oldFile=join(temporary,"v11.html");
await writeFile(oldFile,baseline.stdout);
const newFile=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const chrome=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(c=>
 spawnSync(c,["--version"],{encoding:"utf8"}).status===0);
if(!chrome)throw Error("No Chromium installed");
const executablePath=spawnSync("which",[chrome],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const assert=(yes,msg)=>{if(!yes)throw Error("Pass28: "+msg)};
const screens=[
 {name:"laptop1366",width:1366,height:768},
 {name:"laptop1440",width:1440,height:900},
 {name:"phone390",width:390,height:844},
 {name:"tiny195",width:195,height:844}
];
const evidence=[];
async function setup(path,v){
 const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},
  reducedMotion:"reduce",colorScheme:"light"});
 const page=await ctx.newPage();page.setDefaultTimeout(16000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept()});
 await page.goto(pathToFileURL(path).href,{waitUntil:"load"});
 return {ctx,page,errors};
}
const scrollOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
async function capture(page,name){
 await page.screenshot({path:join(out,name+".png"),animations:"disabled"});
}
async function setPaper(page,id,reviewed=true){
 const value=await page.locator("#g-papers option").evaluateAll((items,{id,reviewed})=>
  items.find(o=>o.value.includes(id)&&o.value.includes(reviewed?"reviewed":"source"))?.value??"",
  {id,reviewed});
 assert(Boolean(value),"Cannot find paired CGL paper "+id);
 await page.locator("#g-papers").selectOption(value);
}
async function themeButtons(page){
 return await page.locator("#themeLight,#themeDark").evaluateAll(nodes=>nodes.map(button=>{
  const box=button.getBoundingClientRect(),range=document.createRange();
  range.selectNodeContents(button);
  const text=range.getBoundingClientRect();
  return {text:button.textContent.trim(),clientWidth:button.clientWidth,
   scrollWidth:button.scrollWidth,boxWidth:Math.round(box.width),
   textWidth:Math.round(text.width),textHeight:Math.round(text.height),
   buttonHeight:Math.round(box.height),rects:range.getClientRects().length,
   css:getComputedStyle(button).whiteSpace,
   contained:text.left>=box.left-1&&text.right<=box.right+1};
 }));
}
try{
 for(const v of screens){
  const modern=await setup(newFile,v);
  const legacy=v.width>=1280?await setup(oldFile,v):null;
  try{
   await modern.page.locator("#displayTrigger").click();
   if(legacy)await legacy.page.locator("#displayTrigger").click();
   for(const scale of [100,140]){
    if(scale===140){
     for(let i=0;i<8;i++)await modern.page.locator("#fontMore").click();
     if(legacy)for(let i=0;i<8;i++)await legacy.page.locator("#fontMore").click();
    }
    assert(await modern.page.locator("#fontReset").innerText()===scale+"%",
     "Scale failed "+v.name+" "+scale);
    const details=await themeButtons(modern.page);
    assert(details.length===2&&details.every(d=>d.rects===1&&d.contained&&
      d.scrollWidth<=d.clientWidth+2&&d.css==="nowrap"),
      "Light/Dark labels clipped, wrapped or overflowed at "+v.name+" "+scale+" "+JSON.stringify(details));
    const toggle=modern.page.locator("#themeToggle");
    assert(await toggle.isVisible(),"Toggle theme control was hidden");
    const panel=await modern.page.locator("#displayPanel").boundingBox();
    assert(panel&&panel.x>=-2&&panel.x+panel.width<=v.width+2,
      "Display popup offscreen "+v.name+" "+scale+" "+JSON.stringify(panel));
    assert(await scrollOverflow(modern.page)<=2,
      "Display/document horizontal overflow "+v.name+" "+scale);
    evidence.push({viewport:v.name,scale,buttons:details,popup:{x:panel.x,right:panel.x+panel.width}});
    await capture(modern.page,"overhaul-"+v.name+"-display"+scale);
    if(legacy)await capture(legacy.page,"v11-"+v.name+"-display"+scale);
    await modern.page.locator("#themeDark").click();
    assert(await modern.page.locator("#themeDark").getAttribute("aria-pressed")==="true",
      "Dark select fails "+v.name+" "+scale);
    await modern.page.locator("#themeLight").click();
    assert(await modern.page.locator("#themeLight").getAttribute("aria-pressed")==="true",
      "Light select fails "+v.name+" "+scale);
    await modern.page.locator("#themeToggle").click();
    assert(await modern.page.locator("#themeDark").getAttribute("aria-pressed")==="true",
      "Retained toggle control fails");
    await modern.page.locator("#themeLight").click();
   }
   assert(modern.errors.length===0,modern.errors.join("; "));
  }finally{await modern.ctx.close();if(legacy)await legacy.ctx.close();}
  console.log("Pass28 Display "+v.name+" 100%/140% labels and controls PASS");
 }
 const v=screens[0],a=await setup(newFile,v);
 try{
  await setPaper(a.page,"cgl-2026-09-30");
  for(const mode of [
   {id:"free",human:"Full paper · flexible navigation",scope:"Whole-paper timer",aria:"Whole-paper time used"},
   {id:"strict",human:"Exam simulation",scope:"Section timer",aria:"Section time used"},
   {id:"single",human:"Single-section practice",scope:"Whole-paper timer",aria:"Whole-paper time used"}
  ]){
   await a.page.locator('[data-mode="'+mode.id+'"]').click();
   await a.page.locator("#g-start").click();
   assert((await a.page.locator(".exam-header .eyebrow").innerText()).includes(mode.human),
    "Mode slug leaked "+mode.id);
   const scopeText=await a.page.locator(".exam-progress .row").innerText();
   assert(scopeText.includes(mode.scope)&&!scopeText.includes("full-paper-practice"),
    "Wrong progress scope "+mode.id+": "+scopeText);
   assert(await a.page.locator(".exam-progress [role=progressbar]").getAttribute("aria-label")===mode.aria,
    "Timer accessible name wrong "+mode.id);
   if(mode.id==="free")assert(!scopeText.includes("Section timer"),
    "Whole paper mislabeled section");
   await capture(a.page,"overhaul-"+mode.id+"-exam");
   if(mode.id!=="free"){
    await a.page.locator("#g-library").click();
    continue;
   }
   assert(!((await a.page.locator(".exam-question").innerText()).includes("Key corrected")),
    "Editorial correction exposed before submission");
   await a.page.locator("#g-submit").click();
   await a.page.locator('[data-result-tab="review"]').click();
   const q3=await a.page.locator("#result-review .generic-review").nth(2).innerText();
   const q6=await a.page.locator("#result-review .generic-review").nth(5).innerText();
   assert(q3.includes("Editorial correction recorded")&&!q3.includes("Key corrected"),
    "Wording-only Q3 was falsely called a key correction");
   assert(q6.includes("Key corrected · recorded editorial change"),
    "Actual published C→D Q6 key correction missing");
   await capture(a.page,"overhaul-reviewed-keychange-q6");
   await a.page.locator("#g-library").click();
  }
  await setPaper(a.page,"cgl-2026-10-06");
  await a.page.locator('[data-mode="free"]').click();
  await a.page.locator("#g-start").click();
  await a.page.locator("#g-submit").click();
  await a.page.locator('[data-result-tab="review"]').click();
  const q62=await a.page.locator("#result-review .generic-review").nth(61).innerText();
  assert(q62.includes("Editorial caution")&&!q62.includes("Key corrected"),
   "Q62 disputed caution mislabeled key correction");
  assert(q62.includes("Expected: Both 1 and 2, but not 3"),
   "Q62 publisher option B text not retained in frozen review");
  await capture(a.page,"overhaul-q62-caution");
  assert(!a.errors.length,"Live exam/review console errors "+a.errors.join("; "));
  console.log("Pass28 live CGL strict/free/single scope, corrected Q6, wording Q3, caution Q62 PASS");
 }finally{await a.ctx.close();}
 await writeFile(join(out,"pass28-evidence.json"),JSON.stringify({
  title:"Pass28 L07–L10 source-backed offline browser semantics and Display geometry",
  evidence,note:"Automated Chromium file:// and frozen v11 screenshot comparison; no physical/AT signoff."
 },null,2));
 console.log("Pass28 L07 L08 L09 L10 ACCEPTANCE PASS");
}finally{await browser.close();await rm(temporary,{recursive:true,force:true});}
