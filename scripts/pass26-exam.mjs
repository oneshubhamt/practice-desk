/**
 * Pass26: actual frozen v11 vs current offline laptop Exam landmarks (L02-L04).
 * Use the SAME reviewed 30 Sep CGL paper and flexible mode. Never infer parity
 * from screenshot existence: fail CI if task actions/content remain below fold.
 */
import {mkdtemp,mkdir,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const baseline=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:18*1024*1024});
if(baseline.status!==0||!baseline.stdout.length)throw Error("Pass26 needs frozen v11 HTML");
const out=resolve(process.env.PASS26_OUTPUT??join(root,"artifacts/pass26-exam"));
await mkdir(out,{recursive:true});
const tmp=await mkdtemp(join(tmpdir(),"practice-pass26-"));
const v11=join(tmp,"v11.html");await writeFile(v11,baseline.stdout);
const modern=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const source=JSON.parse(await readFile(join(root,"src/content/papers.json"),"utf8"));
const paper=source["cgl-2026-09-30"];
if(!paper)throw Error("Pass26 comparison paper absent");
const figure=paper.questions.find(q=>q.n<=25&&(q.images?.stem||q.images?.options?.some(Boolean)));
const passage=paper.questions.find(q=>q.passageRef);
if(!figure||!passage)throw Error("Pass26 source lacks fixed figure/passage samples");
const exe=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(cmd=>
 spawnSync(cmd,["--version"],{encoding:"utf8"}).status===0);
if(!exe)throw Error("Pass26 requires installed Chromium");
const bin=spawnSync("which",[exe],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath:bin,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const assert=(ok,why)=>{if(!ok)throw Error("Pass26: "+why)};
const viewports=[
 {name:"laptop1280",width:1280,height:800},
 {name:"laptop1366",width:1366,height:768},
 {name:"laptop1440",width:1440,height:900},
 {name:"laptop1536",width:1536,height:864}
];
const evidence=[];
async function setup(path,width,height){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce",colorScheme:"light"});
 const page=await ctx.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept()});
 await page.goto(pathToFileURL(path).href,{waitUntil:"load"});
 return {ctx,page,errors};
}
async function r(page,sel){
 return page.locator(sel).first().evaluate(el=>{
  const x=el.getBoundingClientRect();
  return {top:Math.round(x.top),bottom:Math.round(x.bottom),
   left:Math.round(x.left),right:Math.round(x.right),
   height:Math.round(x.height),visible:x.bottom>0&&x.top<innerHeight,
   fullyVisible:x.top>=0&&x.bottom<=innerHeight};
 });
}
async function oldModernSelect(old,now){
 await old.locator("#paperSelect").selectOption("cgl-2026-09-30");
 await old.locator('[data-edition="reviewed"]').click();
 const id=await now.locator("#g-papers option").evaluateAll(list=>
  list.find(o=>o.value.includes("cgl-2026-09-30")&&o.value.includes("reviewed"))?.value??"");
 assert(Boolean(id),"Reviewed same-paper counterpart not found");
 await now.locator("#g-papers").selectOption(id);
 assert((await now.locator("#g-papers option:checked").innerText()).includes("30 Sep 2026"),
  "Current paper selection drifted");
 await old.locator('[data-mode="free"]').click();
 await now.locator('[data-mode="free"]').click();
 await old.locator("#start").click();
 await now.locator("#g-start").click();
}
async function selectQuestion(old,now,n){
 const sec=Math.floor((n-1)/25),q=(n-1)%25;
 await old.locator('[data-section="'+sec+'"]').click();
 await now.locator('[data-section="'+sec+'"]').click();
 await old.locator('[data-num="'+q+'"]').click();
 await now.locator('[data-q="'+q+'"]').click();
}
async function sample(old,now,screen,viewport){
 // Element clicks can scroll the document. Geometry must compare the real
 // initial viewport from scroll Y=0, not Playwright's scrolled click state.
 await old.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 await now.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 const selectors={
  old:{question:".question",choice:".choices .choice",next:"#next",flag:"#mark"},
  now:{question:".exam-question",choice:".exam-question .generic-choice",
   next:"#g-next",flag:"#g-flag"}};
 const a={},b={};
 for(const name of Object.keys(selectors.old)){
  a[name]=await r(old,selectors.old[name]);
  b[name]=await r(now,selectors.now[name]);
 }
 const docOverflow=await now.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(docOverflow<=2,viewport.name+" "+screen+" horizontal overflow "+docOverflow);
 await old.screenshot({path:join(out,"v11-"+viewport.name+"-"+screen+".png"),
  animations:"disabled"});
 await now.screenshot({path:join(out,"overhaul-"+viewport.name+"-"+screen+".png"),
  animations:"disabled"});
 evidence.push({viewport:viewport.name,screen,v11:a,overhaul:b,
  deltaChoiceTop:b.choice.top-a.choice.top,deltaNextTop:b.next.top-a.next.top,
  docOverflow});
 return {base:a,current:b};
}
try{
 for(const viewport of viewports){
  const old=await setup(v11,viewport.width,viewport.height);
  const now=await setup(modern,viewport.width,viewport.height);
  try{
   await oldModernSelect(old.page,now.page);
   await old.page.locator(".choices .choice").first().click();
   await now.page.locator(".exam-question input[data-choice]").first().click();
   const regular=await sample(old.page,now.page,"ordinary",viewport);
   assert(regular.current.question.top<=regular.base.question.top+65,
    viewport.name+" ordinary question remains too low, old "+regular.base.question.top+
     " vs new "+regular.current.question.top);
   assert(regular.current.next.fullyVisible&&regular.current.flag.fullyVisible,
    viewport.name+" ordinary Next/Flag not fully within first viewport; Next bottom "+
    regular.current.next.bottom+" Flag bottom "+regular.current.flag.bottom);
   assert(regular.current.next.top<=regular.base.next.top+90,
    viewport.name+" ordinary Next still materially behind v11");
   // The compact toolbar must keep both actions operational and preserve
   // the exact current answer across navigation, without affecting marking.
   await now.page.locator("#g-flag").click();
   assert(await now.page.locator("#g-flag").getAttribute("aria-pressed")==="true",
    "Flag did not toggle");
   await now.page.locator("#g-next").click();
   await now.page.locator("#g-prev").click();
   assert(await now.page.locator(".exam-question input[data-choice]").first().isChecked(),
    "Answered option lost after navigation");
   assert(await now.page.locator("#g-flag").getAttribute("aria-pressed")==="true",
    "Flag lost after navigation");
   await selectQuestion(old.page,now.page,figure.n);
   const fig=await sample(old.page,now.page,"figure",viewport);
   assert(fig.current.choice.visible&&fig.current.choice.top<=viewport.height-24,
    viewport.name+" figure first answer not discoverable above fold: y"+
    fig.current.choice.top);
   assert(fig.current.choice.top<=fig.base.choice.top+65,
    viewport.name+" figure choice regressed substantially relative to v11");
   const image=await now.page.locator(".exam-question img").first().evaluate(el=>{
    const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    return {loaded:el.naturalWidth>0&&el.naturalHeight>0,alt:el.alt,
      fit:cs.objectFit,width:r.width,height:r.height,display:cs.display};
   });
   assert(image.loaded&&Boolean(image.alt)&&image.width>0&&image.height>0,
    "Figure disappeared/failed loading or lost accessible alternative");
   assert(image.fit==="contain","Figure must not crop to fit compact layout");
   await selectQuestion(old.page,now.page,passage.n);
   const pass=await sample(old.page,now.page,"passage",viewport);
   assert(pass.current.choice.visible&&pass.current.choice.top<=viewport.height-24,
    viewport.name+" passage answer first option below fold y"+pass.current.choice.top);
   assert(pass.current.choice.top<=pass.base.choice.top+90,
    viewport.name+" passage answer is much lower than v11");
   const reader=now.page.locator(".exam-question .generic-stimulus");
   const detail=await reader.evaluate(el=>({
    role:el.getAttribute("role"),tab:el.tabIndex,label:el.getAttribute("aria-label"),
    text:el.querySelector("p")?.textContent||"",
    client:el.clientHeight,scroll:el.scrollHeight
   }));
   assert(detail.role==="region"&&detail.tab===0&&detail.label?.includes("scroll"),
    "Scrollable passage is not labelled/focusable to keyboard users");
   assert(detail.text.length>400,"Full reading passage appears truncated");
   assert(detail.scroll>detail.client,"Long passage is not actually scrollable");
   await reader.focus();await now.page.keyboard.press("End");
   assert((await reader.evaluate(el=>el.scrollTop))>0,
    "Keyboard cannot scroll the full passage");
   assert(now.errors.length===0&&old.errors.length===0,
    "Runtime errors "+[...now.errors,...old.errors].join("; "));
   console.log("Pass26 "+viewport.name+" Next "+regular.current.next.top+
    " / Flag "+regular.current.flag.top+"; figure choice "+fig.current.choice.top+
    "; passage choice "+pass.current.choice.top+" PASS");
  } finally {await old.ctx.close();await now.ctx.close();}
 }
 // Desktop-targeted layout must not break tablet/mobile or the user's display
 // scaling. Do not impose desktop first-fold thresholds at 140% text zoom.
 for(const vp of [{width:390,height:844},{width:768,height:1024},
  {width:1366,height:768}]){
  const {ctx,page,errors}=await setup(modern,vp.width,vp.height);
  try{
   const id=await page.locator("#g-papers option").evaluateAll(list=>
    list.find(o=>o.value.includes("cgl-2026-09-30")&&o.value.includes("reviewed"))?.value??"");
   await page.locator("#g-papers").selectOption(id);
   await page.locator('[data-mode="free"]').click();await page.locator("#g-start").click();
   assert(await page.locator("#g-next").isEnabled(),"Responsive Next unavailable");
   assert(await page.locator("#g-flag").isEnabled(),"Responsive Flag unavailable");
   await page.locator("#displayTrigger").click();
   for(let i=0;i<8;i++)await page.locator("#fontMore").click();
   assert(await page.locator("#fontReset").innerText()==="140%",
    "Text scaling control broken");
   assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,
    vp.width+" at 140% overflows horizontally");
   assert(await page.locator("#g-next").count()===1&&
    await page.locator("#g-flag").count()===1,
    "Responsive exam actions absent at 140%");
   if(vp.width===1366)
    await page.screenshot({path:join(out,"overhaul-1366-text140-exam.png"),
      animations:"disabled"});
   assert(!errors.length,"Responsive runtime errors "+errors.join("; "));
   evidence.push({viewport:vp.width+"x"+vp.height+" / 140%",
    noHorizontalOverflow:true,buttonsRetained:true});
  } finally {await ctx.close();}
 }
 await writeFile(join(out,"pass26-exam-geometry.json"),JSON.stringify({
  title:"Pass26 v11/overhaul same-paper real file:// Exam first-viewport acceptance",
  paper:"30 Sep 2026 reviewed",mode:"free",sampleFigure:figure.n,
  samplePassage:passage.n,viewports,evidence,
  notes:"Automated laptop Chromium only; physical Safari/screen reader/human signoff open."
 },null,2));
 console.log("Pass26: L02-L04 laptop exam geometry and responsive controls PASS");
} finally {await browser.close();await rm(tmp,{recursive:true,force:true});}
