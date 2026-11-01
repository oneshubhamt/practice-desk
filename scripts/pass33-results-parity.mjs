/**
 * Pass33: frozen-v11 Results information hierarchy comparison plus overhaul-only
 * evidence/route regression checks. Automated screenshot evidence is not human
 * aesthetic or physical-device/AT certification.
 */
import {mkdir,mkdtemp,writeFile,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS33_OUTPUT??join(root,"artifacts/pass33-results"));
await mkdir(out,{recursive:true});
const oldBytes=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:20*1024*1024});
if(oldBytes.status!==0||!oldBytes.stdout?.length)throw Error("Pass33 requires frozen baseline/v11");
const temp=await mkdtemp(join(tmpdir(),"practice-pass33-"));
const oldFile=join(temp,"v11.html");await writeFile(oldFile,oldBytes.stdout);
const currentFile=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const command=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!command)throw Error("Pass33 requires Chromium");
const browser=await chromium.launch({headless:true,
 executablePath:spawnSync("which",[command],{encoding:"utf8"}).stdout.trim(),
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const check=(ok,msg)=>{if(!ok)throw Error("PASS33 "+msg)};
const evidence=[];
async function make(era,width,height,colorScheme="dark"){
 const context=await browser.newContext({viewport:{width,height},colorScheme,reducedMotion:"reduce"});
 const page=await context.newPage();page.setDefaultTimeout(18000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>void d.accept());
 await page.goto(pathToFileURL(era==="v11"?oldFile:currentFile).href,{waitUntil:"load"});
 await page.locator(era==="v11"?"#paperSelect":"#g-papers").waitFor();
 return {era,page,context,errors,width,height};
}
async function setDark(a){
 const p=a.page;
 await p.locator("#displayTrigger").click();
 await p.locator("#themeDark").click();
 await p.locator("#displayClose").click();
}
async function chooseSingle(a,edition="source"){
 const p=a.page,old=a.era==="v11";
 if(old){
  await p.locator("#paperSelect").selectOption("cgl-2026-09-30");
  await p.locator('[data-edition="'+(edition==="source"?"original":"reviewed")+'"]').click();
  await p.locator('[data-mode="single"]').click();
  await p.locator("#singleSelect").selectOption("0");
  await p.locator("#start").click();
 }else{
  await p.locator('[data-edition="'+edition+'"]').click();
  const id=await p.locator("#g-papers option").evaluateAll((xs,edition)=>
   xs.find(o=>o.value.includes("cgl-2026-09-30")&&o.value.includes(edition))?.value??"",edition);
  check(Boolean(id),"CGL source/reviewed paper not found");
  await p.locator("#g-papers").selectOption(id);
  await p.locator('[data-mode="single"]').click();
  await p.locator("#g-single-section").selectOption("0");
  await p.locator("#g-start").click();
 }
}
async function answerFourAndFinish(a){
 const p=a.page,old=a.era==="v11";
 for(let i=0;i<4;i++){
  await p.locator(old?".choices .choice":".exam-question input[data-choice]").first().click();
  if(i<3)await p.locator(old?"#next":"#g-next").click();
 }
 await p.locator(old?"#finish":"#g-submit").click();
 await p.locator(old?".viewtabs":".result-tabs").waitFor({state:"visible"});
}
async function geometry(a,label){
 const p=a.page;await p.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
 const state=await p.evaluate(old=>{
  const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
   return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)}};
  return {
   main:box("main"),heading:box(old?".results-header":".results-heading"),
   tabs:box(old?".viewtabs":".result-tabs"),
   performance:box(old?"#resultContent>.panel:first-child":".result-performance-overview"),
   score:box(".scoregrid"),display:box("#displayTrigger"),header:box("header"),
   docWidth:document.documentElement.scrollWidth,viewport:innerWidth,
   h1:document.querySelector("#app h1")?.textContent?.trim()??"",
   visibleBrand:Boolean(document.querySelector("header .brand")?.getClientRects().length)
  };
 },a.era==="v11");
 check(state.docWidth<=state.viewport+2,label+" horizontal overflow "+JSON.stringify(state));
 const file=label+".png";await p.screenshot({path:join(out,file),animations:"disabled",fullPage:true});
 evidence.push({label,file,...state});
 return state;
}
try{
 for(const vp of [{name:"laptop1366",width:1366,height:768},{name:"laptop1440",width:1440,height:900}]){
  const old=await make("v11",vp.width,vp.height),now=await make("overhaul",vp.width,vp.height);
  try{
   await setDark(old);await setDark(now);
   await chooseSingle(old);await chooseSingle(now);
   await answerFourAndFinish(old);await answerFourAndFinish(now);
   const a=await geometry(old,"v11-"+vp.name+"-result-low-data");
   const b=await geometry(now,"overhaul-"+vp.name+"-result-low-data");
   check(b.main&&b.main.w<=1132,"Result main did not return to v11-like width "+JSON.stringify(b.main));
   check(a.main&&Math.abs(b.main.w-a.main.w)<=4,"Result shell width diverges from frozen v11 "+a.main.w+" vs "+b.main.w);
   check(b.heading&&b.heading.y<=40,"Result heading still displaced by masthead "+JSON.stringify(b.heading));
   check(!b.visibleBrand,"Large Practice Desk masthead remains visible on Results");
   check(b.display&&b.display.w>0,"Floating Display access lost on compact Results");
   console.log("PASS33 geometry "+vp.name+" "+JSON.stringify({v11:{heading:a.heading,tabs:a.tabs,performance:a.performance,main:a.main},overhaul:{heading:b.heading,tabs:b.tabs,performance:b.performance,main:b.main}}));
   const v11HeadingTabGap=a.tabs&&a.heading?a.tabs.y-a.heading.bottom:null;
   const currentHeadingTabGap=b.tabs&&b.heading?b.tabs.y-b.heading.bottom:null;
   const v11TabPerformanceGap=a.performance&&a.tabs?a.performance.y-a.tabs.bottom:null;
   const currentTabPerformanceGap=b.performance&&b.tabs?b.performance.y-b.tabs.bottom:null;
   check(v11HeadingTabGap!==null&&currentHeadingTabGap!==null&&
       Math.abs(currentHeadingTabGap-v11HeadingTabGap)<=6&&
       v11TabPerformanceGap!==null&&currentTabPerformanceGap!==null&&
       Math.abs(currentTabPerformanceGap-v11TabPerformanceGap)<=6,
     "Result content rhythm diverges from v11 after intentional masthead removal "+
       JSON.stringify({viewport:vp.name,v11HeadingTabGap,currentHeadingTabGap,
         v11TabPerformanceGap,currentTabPerformanceGap}));
   check(b.performance&&b.performance.h<520,"Performance overview is too tall for compact first-fold hierarchy "+b.performance.h);
   check(await now.page.locator(".result-performance-overview h2").innerText()==="Performance overview","Named performance overview missing");
   check(await now.page.locator(".result-performance-overview .score").count()===5,"Five primary score metrics missing");
   check(await now.page.locator(".result-section-table tbody tr").count()===1,"Single-section summary row missing");
   check(await now.page.locator(".result-scoring-details").evaluate(x=>!x.open),"Advanced scoring detail should be collapsed initially");
   check((await now.page.locator(".result-scoring-details").innerText()).includes("Scoring details"),"Scoring detail disclosure missing");
   check(await now.page.locator(".result-time-pacing").count()===1&&await now.page.locator(".result-section-diagnostics").count()===1,
     "v11-like pacing/diagnostics pair missing");
   check(await now.page.locator(".result-opportunities .coach-card").count()===3,"Compact score opportunities missing");
   check(await now.page.locator(".result-speed-grid").count()===0,"Insufficient speed sample rendered empty classification cards");
   check((await now.page.locator(".result-speed-accuracy").innerText()).includes("Five or more measurable"),
     "Insufficient speed evidence is not disclosed");
   check(await now.page.locator(".answer-revision-panel .learning-metric").count()===0,
     "Answer revision zero state regressed to large metric cards");
   check(await now.page.locator("#g-longest-questions .slow-link").count()>0,"Longest question visits lost");
   check(await now.page.locator("#g-next-work").count()===1,"Next-work coaching lost");
   check(await now.page.locator("#result-tab-review").innerText()==="Answer review","v11 review tab label not restored");
   check(await now.page.locator("#result-tab-timing").innerText()==="Question times","v11 timing tab label not restored");
   const reviewButton=now.page.locator(".result-opportunities [data-review-preset=unanswered]");
   if(await reviewButton.count()){
    await reviewButton.click();
    await now.page.waitForFunction(()=>new URL(location.href).searchParams.get("tab")==="review");
    await now.page.locator("#result-review").waitFor({state:"visible"});
    check(await now.page.locator("#g-review-filter").inputValue()==="unanswered","Opportunity action did not preserve review filter");
   }
   check(!now.errors.length,"Runtime errors "+now.errors.join("; "));
  }finally{await old.context.close();await now.context.close();}
 }
 const phone=await make("overhaul",390,844);
 try{
  await setDark(phone);await chooseSingle(phone);await answerFourAndFinish(phone);
  await geometry(phone,"overhaul-phone390-result-low-data");
  check(await phone.page.locator(".result-performance-overview").count()===1,"Phone overview missing");
  check(await phone.page.locator(".result-insight-grid").evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(" ").length===1),
    "Phone pacing/diagnostics did not stack");
  check(!phone.errors.length,"Phone runtime errors "+phone.errors.join("; "));
 }finally{await phone.context.close();}
 const zoom=await make("overhaul",195,844);
 try{
  await setDark(zoom);await chooseSingle(zoom);await answerFourAndFinish(zoom);
  await geometry(zoom,"overhaul-zoom195-result-low-data");
  check(!zoom.errors.length,"195px runtime errors "+zoom.errors.join("; "));
 }finally{await zoom.context.close();}
 const enough=await make("overhaul",1366,768);
 try{
  await setDark(enough);await chooseSingle(enough,"reviewed");
  for(let i=0;i<6;i++){
   await enough.page.waitForTimeout(120);
   await enough.page.locator(".exam-question input[data-choice]").first().click();
   if(i<5)await enough.page.locator("#g-next").click();
  }
  await enough.page.locator("#g-submit").click();
  await enough.page.locator(".result-tabs").waitFor({state:"visible"});
  await geometry(enough,"overhaul-laptop1366-result-speed-evidence");
  check(await enough.page.locator(".result-speed-grid .result-speed-cell").count()===3,
    "Sufficient measured answers did not unlock compact speed × accuracy cells");
  check(!(await enough.page.locator(".result-speed-accuracy").innerText()).includes("Continue practising to unlock"),
    "Sufficient speed evidence incorrectly remained in empty state");
  check(!enough.errors.length,"Sufficient-data runtime errors "+enough.errors.join("; "));
 }finally{await enough.context.close();}
 await writeFile(join(out,"pass33-evidence.json"),JSON.stringify({
  title:"Pass33 v11 Results parity with overhaul evidence preservation",sceneCount:evidence.length,evidence
 },null,2));
 console.log("PASS33 RESULTS V11 HIERARCHY + OVERHAUL EVIDENCE PASS "+evidence.length+" SCENES");
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
