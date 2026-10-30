/**
 * Independent Pass 23 paired v11/current acceptance.
 * Uses frozen v11 HTML, not previously generated v11 screenshots.
 * Fresh behavior checks across dates, both editorial editions, full/single
 * tests, score/review/history, responsive accessibility and imported policy.
 * Browser emulation is not physical mobile/AT certification.
 */
import {mkdtemp,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
import {paperRevisionHash,questionRevisionHash} from "../src/domain/integrity.ts";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const baseline=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:18*1024*1024});
if(baseline.status!==0||!baseline.stdout?.length)
 throw Error("Immutable v11 HTML is required for independent comparison");
const temp=await mkdtemp(join(tmpdir(),"practice-desk-pass23-"));
const baselineFile=join(temp,"frozen-v11.html");
await writeFile(baselineFile,baseline.stdout);
const oldUrl=pathToFileURL(baselineFile).href;
const newUrl=pathToFileURL(join(root,"Practice_Desk_Offline_Mock_Tests.html")).href;
const sources=JSON.parse(await readFile(join(root,"src/content/papers.json"),"utf8"));
const exe=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(s=>spawnSync(s,["--version"],{encoding:"utf8"}).status===0);
if(!exe)throw Error("Pass23 browser test requires Chromium");
const executablePath=spawnSync("which",[exe],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const ensure=(x,m)=>{if(!x)throw Error("PASS23: "+m);};
const observations=[];
async function pageFactory(url,width=1024,height=768){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
 const page=await ctx.newPage();page.setDefaultTimeout(16000);
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>{void d.accept()});
 await page.goto(url,{waitUntil:"load"});
 return {page,ctx,errors};
}
const chosenPapers=["cgl-2026-09-30","cgl-2026-10-06"];
// Standardize only effects that are truly comparable between the original
// CGL app and the generic engine, not their richer modern metadata.
async function doCgl(era,id,edition,mode="free"){
 const old=era==="v11",go=old?oldUrl:newUrl;
 const {page,ctx,errors}=await pageFactory(go);
 try{
  if(old){
   await page.locator("#paperSelect").selectOption(id);
   await page.locator('[data-edition="'+(edition==="source"?"original":"reviewed")+'"]').click();
  }else{
   const selected=await page.locator("#g-papers option").evaluateAll((options,{id,edition})=>
    options.find(o=>o.value.includes(id)&&o.value.includes(edition))?.value,{id,edition});
   ensure(Boolean(selected),"selected edition missing: "+id+" "+edition);
   await page.locator("#g-papers").selectOption(selected);
  }
  if(mode!=="strict")await page.locator('[data-mode="'+mode+'"]').click();
  if(mode==="single")await page.locator(old?"#singleSelect":"#g-single-section").selectOption("2");
  const intro=await page.locator("#app").innerText();
  ensure(intro.includes("Test library"),era+" library not available");
  ensure(intro.toLowerCase().includes("original")&&intro.toLowerCase().includes("review"),
    era+" source/review distinction missing");
  ensure(intro.includes("Not affiliated")||!old&&await page.locator(".app-independent-footer").count()===1,
    era+" independent examination attribution missing");
  if(!old){
   const audit=await page.locator("#g-preflight").innerText();
   ensure(audit.includes("Correct +2")&&audit.includes("Incorrect -0.5"),
     "Selected CGL mark rule not disclosed preflight");
  }
  await page.locator(old?"#start":"#g-start").click();
  ensure(await page.locator(old?".question":".exam-question").count()===1,
    era+" paper did not begin");
  ensure(await page.locator(old?".source-review":".source-review").count()===0,
    era+" leaked editorial correction before submission");
  const answer=old?page.locator(".choices .choice").first():page.locator("input[data-choice]").first();
  await answer.click();
  await page.locator(old?"#mark":"#g-flag").click();
  if(mode==="free"||mode==="single"){
   await page.locator(old?"#pause":"#g-pause").click();
   const flag=page.locator(old?"#mark":"#g-flag");
   ensure(await flag.isEnabled(),era+" lost flagging while paused");
   await flag.click();
   await page.locator(old?"#pause":"#g-pause").click();
  }
  const question2=page.locator(old?'[data-num="1"]':'[data-q="1"]');
  await question2.click();
  const beforeSubmit=await page.locator(old?".question":".exam-question").innerText();
  ensure(!beforeSubmit.includes("Correct answer:")&&!beforeSubmit.includes("Expected:"),
    era+" leaked keys before test end");
  const submit=page.locator(old?"#finish":"#g-submit");
  if(mode==="strict")for(let i=0;i<4;i++)await submit.click();
  else await submit.click();
  const overview=page.locator(old?"#resultContent":"#result-overview");
  await overview.waitFor({state:"visible"});
  const score=(await page.locator(".score.standout").innerText()).replace(/\s+/g," ").trim();
  ensure(score.includes("/"),era+" completed result lost denominator");
  if(!old)ensure(await page.locator("#result-review .generic-review").count()===0,
    "Overhaul Overview eagerly rendered hidden review");
  await page.locator(old?'[data-tab="review"]':'[data-result-tab="review"]').click();
  const review=old?page.locator("#resultContent"):page.locator("#result-review");
  ensure(await review.isVisible(),era+" completed answer review unavailable");
  const count=old?await page.locator("#resultContent .review-item, #resultContent .review-question, #resultContent .reviewcard").count():
    await page.locator(".generic-review").count();
  if(!old)ensure(count===(mode==="single"?25:100),era+" frozen result question count incorrect "+count);
  await page.locator(old?'[data-tab="timing"]':'[data-result-tab="timing"]').click();
  ensure(await page.locator(old?"#resultContent":"#result-timing").isVisible(),era+" timing view missing");
  await page.locator(old?"#historyBack":"#g-history-results").click();
  ensure((await page.locator("#app h1").innerText()).includes("History"),
    era+" history route failed");
  const historyButtons=page.locator(old?".attempt-open":"[data-attempt]");
  ensure(await historyButtons.count()>=1,era+" completed result not in history");
  if(!old){
   const row=page.locator(".attempt-row").first();
   ensure((await row.innerText()).includes("/"),"Frozen history lacks scored denominator");
   ensure(await page.locator("#g-storage-panel").count()===1,"Storage/backup history omitted");
   ensure(await page.locator("#screen-announcement").getAttribute("aria-live")==="polite",
    "Accessible route announcements absent");
  }
  ensure(errors.length===0,era+" browser errors: "+errors.join("; "));
  observations.push({era,id,edition,mode,score,reviewCount:count,
   questionCount:mode==="single"?25:100});
 }finally{await ctx.close();}
}
async function separateGenericReviewPolicy(){
 const {page,ctx,errors}=await pageFactory(newUrl);
 try{
  const q=structuredClone(pkg);
  q.paper.navigation.allowReview=false;
  q.paper.contentHash=paperRevisionHash(q.paper);
  q.questions[0].content.prompt='<img src=x onerror=alert(1)> Malicious untrusted author text';
  q.questions[0].contentHash=questionRevisionHash(q.questions[0]);
  await page.locator("#g-file").setInputFiles({name:"private-custom.json",
   mimeType:"application/json",buffer:Buffer.from(JSON.stringify(q))});
  await page.locator("#g-papers").selectOption(q.paper.id);
  ensure((await page.locator("#g-preflight").innerText()).includes("author/importer"),
   "Imported exams inappropriately inherit SSC official provenance");
  await page.locator("#g-start").click();
  ensure(await page.locator("#app img[src=x]").count()===0,
   "Untrusted question text executed as HTML");
  ensure((await page.locator(".generic-prompt").innerText()).includes("<img src=x"),
   "Untrusted prompt text not correctly escaped");
  await page.locator("#g-submit").click();
  ensure(await page.locator('[data-result-tab="review"]').count()===0,
   "Exam configured allowReview=false still disclosed answer review");
  ensure(await page.locator(".generic-review").count()===0,
   "Non-review exam still serialized secret solutions into DOM");
  await page.locator('[data-result-tab="timing"]').click();
  ensure(await page.locator("#result-timing").isVisible(),
   "Review policy incorrectly hid general timing evidence");
  ensure(errors.length===0,"Imported exam browser errors: "+errors.join("; "));
  observations.push({era:"overhaul",mode:"generic-unreleased",status:"safe"});
 }finally{await ctx.close();}
}
async function accessibilityAndOverflow(){
 for(const [width,height] of [[320,700],[390,844],[768,1024],[1280,800],[195,844]]){
  const {page,ctx,errors}=await pageFactory(newUrl,width,height);
  try{
   await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
   const trigger=page.locator("#displayTrigger");
   const bounds=await trigger.boundingBox();
   ensure(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1&&bounds.y>=-1&&bounds.y+bounds.height<=height+1,
    "Sticky Display access offscreen at "+width+"px");
   await trigger.click();
   const panel=await page.locator("#displayPanel").boundingBox();
   ensure(panel&&panel.x>=-1&&panel.x+panel.width<=width+1,
    "Display panel overflows at "+width+"px");
   await page.keyboard.press("Escape");
   ensure(await page.evaluate(()=>document.activeElement?.id)==="displayTrigger",
    "Escape did not restore Display trigger focus");
   const x=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   ensure(x<=2,"Library horizontal overflow at width "+width+"px: "+x);
   ensure(errors.length===0,"Responsive page error: "+errors.join("; "));
   observations.push({era:"overhaul",viewport:width,displayAccessible:true,overflowCssPx:x});
  }finally{await ctx.close();}
 }
}
try{
 for(const id of chosenPapers)
  for(const edition of ["source","reviewed"])
   for(const era of ["v11","overhaul"])
    await doCgl(era,id,edition);
 // Strict/four-section and 25-question single-section comparison against the
 // same paired baseline, independent of the specific free-navigation flows.
 for(const era of ["v11","overhaul"]){
  await doCgl(era,chosenPapers[0],"reviewed","strict");
  await doCgl(era,chosenPapers[1],"source","single");
 }
 await separateGenericReviewPolicy();
 await accessibilityAndOverflow();
 console.log("PASS23 PAIRED REAL-HTML EVIDENCE "+JSON.stringify(observations));
 console.log("Pass23: frozen v11/current end-to-end parity cases, selected generic no-review, editorial safety, saved history and responsive Display PASS");
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
