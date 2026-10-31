/**
 * Pass29 independent expanded journey/visual matrix.
 * Pairs frozen v11/current CGL journeys, audits generic-only modern flows,
 * and emits a reproducible scene/geometry/test manifest and screenshots.
 * Browser automation evidence is not physical/AT/human design approval.
 */
import {mkdtemp,mkdir,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const dir=resolve(process.env.PASS29_OUTPUT??join(root,"artifacts/pass29-independent"));
await mkdir(dir,{recursive:true});
const v11bytes=spawnSync("git",["show","origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html"],
 {cwd:root,maxBuffer:20*1024*1024});
if(v11bytes.status!==0||!v11bytes.stdout?.length)throw Error("Frozen v11 offline artifact unavailable");
const tmp=await mkdtemp(join(tmpdir(),"pass29-independent-"));
const oldFile=join(tmp,"baseline-v11.html");await writeFile(oldFile,v11bytes.stdout);
const modernFile=join(root,"Practice_Desk_Offline_Mock_Tests.html");
const papers=JSON.parse(await readFile(join(root,"src/content/papers.json"),"utf8"));
const x=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(v=>spawnSync(v,["--version"],{encoding:"utf8"}).status===0);
if(!x)throw Error("Chromium needed for independent Pass29");
const executablePath=spawnSync("which",[x],{encoding:"utf8"}).stdout.trim();
const browser=await chromium.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const fail=(yes,msg)=>{if(!yes)throw Error("PASS29 "+msg)};
const screens=[],cases=[],comparisons=[],findings=[];
const vps=[
 {id:"laptop1280",width:1280,height:800},
 {id:"laptop1366",width:1366,height:768},
 {id:"laptop1440",width:1440,height:900},
 {id:"laptop1536",width:1536,height:864},
 {id:"tablet768",width:768,height:1024},
 {id:"phone390",width:390,height:844},
 {id:"zoom195",width:195,height:844}
];
async function newPage(era,vp){
 const c=await browser.newContext({viewport:{width:vp.width,height:vp.height},
  colorScheme:"light",reducedMotion:"reduce",deviceScaleFactor:1,acceptDownloads:true});
 const page=await c.newPage();page.setDefaultTimeout(16000);
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 page.on("dialog",d=>{void d.accept()});
 await page.goto(pathToFileURL(era==="v11"?oldFile:modernFile).href,{waitUntil:"load"});
 await page.locator(era==="v11"?"#paperSelect":"#g-papers").waitFor();
 return {page,c,era,vp,errors,mode:"strict",paper:"30sep",edition:"reviewed",theme:"light",scale:100};
}
async function selectCgl(a,paper="cgl-2026-09-30",edition="reviewed",mode="free",single="2"){
 const p=a.page,old=a.era==="v11";
 if(old){
  await p.locator("#paperSelect").selectOption(paper);
  await p.locator('[data-edition="'+(edition==="source"?"original":"reviewed")+'"]').click();
 }else{
  const selected=await p.locator("#g-papers option").evaluateAll((xs,args)=>
   xs.find(o=>o.value.includes(args.paper)&&o.value.includes(args.edition))?.value??"",
   {paper,edition});
  fail(Boolean(selected),"selected CGL edition not found "+paper+" "+edition);
  await p.locator("#g-papers").selectOption(selected);
 }
 await p.locator('[data-mode="'+mode+'"]').click();
 if(mode==="single")await p.locator(old?"#singleSelect":"#g-single-section").selectOption(single);
 a.mode=mode;a.paper=paper;a.edition=edition;
}
async function visibleGeometry(page,mapping){
 return page.evaluate(mapping=>{
  const result={};
  for(const [key,selector] of Object.entries(mapping)){
   const node=document.querySelector(selector);
   if(!node){result[key]={missing:true,selector};continue;}
   const r=node.getBoundingClientRect(),style=getComputedStyle(node);
   result[key]={x:+r.x.toFixed(1),y:+r.y.toFixed(1),bottom:+r.bottom.toFixed(1),
    w:+r.width.toFixed(1),h:+r.height.toFixed(1),
    visible:r.bottom>0&&r.y<innerHeight,
    fullyVisible:r.y>=0&&r.bottom<=innerHeight,
    font:+parseFloat(style.fontSize).toFixed(1)};
  }
  return result;
 },mapping);
}
function landmarks(era,scene){
 const old=era==="v11";
 if(scene.startsWith("library")||scene.startsWith("display"))return {
  paper:old?"#paperSelect":"#g-papers",start:old?"#start":"#g-start",mode:"[data-mode=free]",
  heading:"#app h1",preflight:old?"#app .paper-preview":"#g-preflight"};
 if(scene.startsWith("exam"))return {question:old?".question":".exam-question",
  firstOption:old?".choices .choice":".exam-question .generic-choice",
  next:old?"#next":"#g-next",flag:old?"#mark":"#g-flag",
  timer:old?"#timer":"#g-timer",submit:old?"#finish":"#g-submit"};
 if(scene.startsWith("result"))return {score:old?".score.standout":".score.standout",
  table:old?"#resultContent table":"#result-overview > .panel:nth-child(2) table",
  tabs:old?".viewtabs":".result-tabs",heading:"#app h1"};
 if(scene.startsWith("history"))return {first:old?".attempt-row":".archive-entry",
  filter:old?"#historyFilter":"#g-filter",heading:"#app h1"};
 return {heading:"#app h1"};
}
async function shot(a,scene,{full=false,checks=[]}={}){
 const p=a.page;
 await p.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
 const geometry=await visibleGeometry(p,landmarks(a.era,scene));
 const pageState=await p.evaluate(()=>{
  const el=document.documentElement;
  return {docWidth:el.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,
    overflow:el.scrollWidth>innerWidth+2,focus:document.activeElement?.id??"",
    heading:document.querySelector("#app h1")?.textContent?.trim()??"",
    visibleButtons:[...document.querySelectorAll("#app button")].filter(b=>{
     const r=b.getBoundingClientRect();return !b.disabled&&r.width&&r.height&&r.top<innerHeight&&r.bottom>0;
    }).length,
    numberImages:[...document.querySelectorAll("#app img")].filter(i=>i.getBoundingClientRect().width>0).length};
 });
 const file=[a.era,a.vp.id,a.paper.replace("cgl-2026-",""),a.edition,a.mode,
   a.theme,"s"+a.scale,scene].join("--")+".png";
 await p.screenshot({path:join(dir,file),animations:"disabled",fullPage:full});
 const rec={id:cases.length+1,era:a.era,viewport:a.vp.id,width:a.vp.width,height:a.vp.height,
  paper:a.paper,edition:a.edition,mode:a.mode,theme:a.theme,scale:a.scale,
  scene,screenshot:file,fullPage:full,geometry,pageState,checks};
 cases.push(rec);screens.push(file);
 fail(!a.errors.length,a.era+" "+scene+" browser errors "+a.errors.join("; "));
 if(a.era==="overhaul"){
  fail(!pageState.overflow,a.vp.id+" "+scene+" horizontal overflow by "+
   (pageState.docWidth-pageState.viewportWidth));
  for(const [key,data] of Object.entries(geometry)){
   if(data.missing&&checks.includes(key))throw Error("PASS29 missing required "+key+" in "+scene);
  }
 }
 return rec;
}
async function paired(a,b,scene,checks=[],options={}){
 const o=await shot(a,scene,{checks,...options});
 const n=await shot(b,scene,{checks,...options});
 const row={scene,viewport:b.vp.id,mode:b.mode,paper:b.paper,edition:b.edition,
  baseline:o.id,current:n.id,measurements:{}};
 for(const key of checks){
  if(o.geometry[key]&&!o.geometry[key].missing&&n.geometry[key]&&!n.geometry[key].missing){
   const old=o.geometry[key],cur=n.geometry[key];
   row.measurements[key]={v11Y:old.y,newY:cur.y,shift:+(cur.y-old.y).toFixed(1),
    currentVisible:cur.visible,currentFullyVisible:cur.fullyVisible};
  }
 }
 comparisons.push(row);
 return {o,n};
}
async function setDisplay(a,theme,scale){
 const p=a.page;
 await p.locator("#displayTrigger").click();
 if(theme!=="light")await p.locator("#themeDark").click();
 if(scale!==100){
  const dir=scale>100?"#fontMore":"#fontLess";
  for(let n=0;n<Math.abs(scale-100)/5;n++)await p.locator(dir).click();
 }
 a.theme=theme;a.scale=scale;
}
async function closeDisplay(a){await a.page.locator("#displayClose").click();}
async function setupMain(vp){
 const legacy=await newPage("v11",vp),current=await newPage("overhaul",vp);
 try{
  await selectCgl(legacy);
  await selectCgl(current);
  const library=await paired(legacy,current,"library-selected",["paper","start"]);
  if(vp.width>=1280){
   fail(library.n.geometry.start.fullyVisible,vp.id+" Start off initial fold");
   fail(library.n.geometry.paper.fullyVisible,vp.id+" paper control off initial fold");
  }
  await setDisplay(legacy,"dark",140);await setDisplay(current,"dark",140);
  await paired(legacy,current,"display-dark140",["start"]);
  fail(await current.page.locator("#themeDark").getAttribute("aria-pressed")==="true",
   "Theme was not pressed in enlarged popup");
  await closeDisplay(legacy);await closeDisplay(current);
  await paired(legacy,current,"library-dark140",["start"]);
  // Return to light at 100% before performance geometry comparison.
  for(const a of [legacy,current]){
   await a.page.locator("#displayTrigger").click();
   await a.page.locator("#themeLight").click();
   await a.page.locator("#fontReset").click();
   await a.page.locator("#displayClose").click();
   a.theme="light";a.scale=100;
  }
  for(const a of [legacy,current]){
   await a.page.locator(a.era==="v11"?"#start":"#g-start").click();
   await a.page.locator(a.era==="v11"?".choices .choice":"input[data-choice]").first().click();
  }
  const ordinary=await paired(legacy,current,"exam-answered",["question","firstOption","next","flag"]);
  if(vp.width>=1280){
   fail(ordinary.n.geometry.next.fullyVisible,"Next below fold "+vp.id);
   fail(ordinary.n.geometry.flag.fullyVisible,"Flag below fold "+vp.id);
  }
  for(const a of [legacy,current])
   await a.page.locator(a.era==="v11"?"#mark":"#g-flag").click();
  await paired(legacy,current,"exam-flagged",["question","next","flag"]);
  for(const a of [legacy,current])
   await a.page.locator(a.era==="v11"?"#pause":"#g-pause").click();
  await paired(legacy,current,"exam-paused",["question","next","flag"]);
  fail(await current.page.locator("#g-next").isDisabled(),"Paused next remains active");
  fail(await current.page.locator("#g-flag").isEnabled(),"Paused flag disabled");
  for(const a of [legacy,current])
   await a.page.locator(a.era==="v11"?"#pause":"#g-pause").click();
  const figure=papers["cgl-2026-09-30"].questions.find(q=>q.n<=25&&
   (q.images.stem||q.images.options?.some(Boolean)));
  fail(Boolean(figure),"No source figure selected");
  for(const a of [legacy,current])await a.page.locator(
   a.era==="v11"?'[data-num="'+(figure.n-1)+'"]':'[data-q="'+(figure.n-1)+'"]').click();
  const fig=await paired(legacy,current,"exam-figure",["firstOption","next"]);
  fail(await current.page.locator(".exam-question img").count()>0,"Figure missing in modern");
  if(vp.width>=1280)fail(fig.n.geometry.firstOption.visible,"Figure first option lost "+vp.id);
  const passage=papers["cgl-2026-09-30"].questions.find(q=>q.passageRef);
  fail(Boolean(passage),"No passage in source");
  const si=Math.floor((passage.n-1)/25),qi=(passage.n-1)%25;
  for(const a of [legacy,current]){
   await a.page.locator('[data-section="'+si+'"]').click();
   await a.page.locator(a.era==="v11"?'[data-num="'+qi+'"]':'[data-q="'+qi+'"]').click();
  }
  const pass=await paired(legacy,current,"exam-passage",["firstOption","next"]);
  fail(await current.page.locator(".generic-stimulus").count()>0,"Modern passage missing");
  if(vp.width>=1280)fail(pass.n.geometry.firstOption.visible,"Passage answer undiscoverable "+vp.id);
  for(const a of [legacy,current]){
   await a.page.locator('[data-section="0"]').click();
   await a.page.locator(a.era==="v11"?"#finish":"#g-submit").click();
  }
  const overview=await paired(legacy,current,"results-overview",["score","table","tabs"]);
  if(vp.width>=1280)fail(overview.n.geometry.table.visible,"Results table below fold "+vp.id);
  for(const a of [legacy,current])await a.page.locator(
   a.era==="v11"?'[data-tab="review"]':'[data-result-tab="review"]').click();
  await paired(legacy,current,"results-review",["tabs","heading"]);
  if(vp.width===1366){
   const correction=6;
   await legacy.page.locator("#review-"+correction).scrollIntoViewIfNeeded();
   await current.page.locator("#result-review .generic-review").nth(correction-1).scrollIntoViewIfNeeded();
   await shot(legacy,"results-correctedQ6",{full:false});
   await shot(current,"results-correctedQ6",{full:false});
   const q=await current.page.locator("#result-review .generic-review").nth(5).innerText();
   fail(q.includes("Key corrected"),"True corrected source Q6 lacks badge");
  }
  for(const a of [legacy,current])await a.page.locator(
   a.era==="v11"?'[data-tab="timing"]':'[data-result-tab="timing"]').click();
  await paired(legacy,current,"results-timing",["tabs","heading"]);
  for(const a of [legacy,current])await a.page.locator(
   a.era==="v11"?"#historyBack":"#g-history-results").click();
  const history=await paired(legacy,current,"history-populated",["first","heading"]);
  if(vp.width>=1280)fail(history.n.geometry.first.fullyVisible,
   "Saved history record below fold "+vp.id);
  await current.page.locator("#g-filter").selectOption("progress");
  await shot(current,"history-progress-filter");
  fail(await current.page.locator(".archive-entry").count()===0,"History progress filter mismatch");
  await current.page.locator("#g-filter").selectOption("all");
  await current.page.locator("#g-history-search").fill("not-an-exam");
  await shot(current,"history-search-empty");
  fail(await current.page.locator(".archive-entry").count()===0,"History text filter mismatch");
  await current.page.locator("#g-history-search").fill("");
  await current.page.locator("#g-history-sort").selectOption("oldest");
  await current.page.locator(".history-open").click();
  await shot(current,"results-reopened", {checks:["score"]});
  fail(await current.page.locator(".score.standout").count()===1,
    "Saved result reopened without frozen score");
  console.log("PASS29 paired full CGL journey "+vp.id+" "+(cases.length)+" recorded states");
 }finally{await legacy.c.close();await current.c.close();}
}
async function modeJourney(mode,edition,paper,vp){
 const pair=await Promise.all([newPage("v11",vp),newPage("overhaul",vp)]);
 const [o,n]=pair;
 try{
  await selectCgl(o,paper,edition,mode);
  await selectCgl(n,paper,edition,mode);
  await paired(o,n,"library-"+mode+"-"+edition,["paper","start"]);
  for(const a of pair)await a.page.locator(a.era==="v11"?"#start":"#g-start").click();
  await paired(o,n,"exam-"+mode+"-"+edition,["question","firstOption","next"]);
  const timer=await n.page.locator(".exam-progress").innerText();
  fail(timer.includes(mode==="strict"?"Section timer":"Whole-paper timer"),"Wrong "+mode+" timer");
  fail((await n.page.locator(".exam-header").innerText()).includes(mode==="strict"?"Exam simulation":
    mode==="single"?"Single-section practice":"Full paper"),"Mode heading not human-friendly");
  if(mode!=="strict"){
   for(const a of pair){
    await a.page.locator(a.era==="v11"?".choices .choice":"input[data-choice]").first().click();
    await a.page.locator(a.era==="v11"?"#finish":"#g-submit").click();
   }
   await paired(o,n,"results-"+mode+"-"+edition,["score","table"]);
   const oMarks=await o.page.locator(".score.standout").innerText();
   const nMarks=await n.page.locator(".score.standout").innerText();
   const parse=t=>t.match(/[-−]?\d+(?:\.\d+)?/g)?.map(x=>Number(x.replace("−","-")))??[];
   const left=parse(oMarks),right=parse(nMarks);
   fail(left.length>=2&&right.length>=2&&Math.abs(left[0]-right[0])<0.01&&
    Math.abs(left[1]-right[1])<0.01,
    "Frozen score/max parity drift: "+oMarks+" / "+nMarks);
   await o.page.locator('[data-tab="review"]').click();
   await n.page.locator('[data-result-tab="review"]').click();
   if(paper==="cgl-2026-10-06"&&edition==="reviewed"){
    const q62=await n.page.locator("#result-review .generic-review").nth(61).innerText();
    fail(q62.includes("Editorial caution")&&!q62.includes("Key corrected")&&
     q62.includes("Expected: Both 1 and 2, but not 3"),"6 Oct Q62 policy corrupted");
    await shot(n,"results-disputed-Q62");
   }else if(edition==="source"){
    fail((await n.page.locator("#result-review").innerText()).includes("Defective · excluded"),
     "Original invalid source status concealed");
   }
  }
  console.log("PASS29 paired mode "+mode+" "+edition+" "+paper);
 }finally{await o.c.close();await n.c.close();}
}
async function supplemental(vp){
 const a=await newPage("overhaul",vp);
 try{
  await shot(a,"library-responsive");
  await a.page.locator("#displayTrigger").click();
  for(let i=0;i<8;i++)await a.page.locator("#fontMore").click();
  a.scale=140;
  await shot(a,"display-scale140");
  const bounds=await a.page.locator("#displayPanel").boundingBox();
  fail(bounds&&bounds.x>=-2&&bounds.x+bounds.width<=vp.width+2,
   "Display popover offscreen "+vp.id);
  await a.page.locator("#themeDark").click();a.theme="dark";
  await shot(a,"display-dark140");
  await a.page.locator("#displayClose").click();
  await shot(a,"library-dark140-responsive");
  await a.page.locator("#g-history").click();
  await shot(a,"history-empty");
  await a.page.locator("#g-library").click();
  await a.page.locator("#g-learning").click();
  await shot(a,"learning-empty",{full:vp.width===390});
  await a.page.locator("#learning-close").click();
  await a.page.locator('[data-mode="free"]').click();
  await a.page.locator("#g-start").click();
  await shot(a,"exam-responsive");
  fail(await a.page.locator("#g-next").isVisible(),"Next control missing "+vp.id);
  // With a small viewport, scrolling is expected, but the document must not overflow horizontally.
  console.log("PASS29 responsive modern "+vp.id);
 }finally{await a.c.close();}
}
async function genericJourney(vp){
 const a=await newPage("overhaul",vp);
 try{
  const p=a.page;
  await p.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(pkg))});
  await p.waitForFunction(()=>document.querySelector("#g-papers")?.value==="rev-paper");
  a.paper="generic-six-kinds";a.edition="custom";a.mode="custom";
  await shot(a,"library-generic-import");
  await p.locator("#g-start").click();
  const expected=[
   ["single-choice",'input[data-choice]'],["multiple-select",'input[type="checkbox"]'],
   ["numeric-entry",'input[type="number"]'],["true-false",'input[type="radio"]'],
   ["matching","select"],["free-response","textarea"]
  ];
  // Two sections, 3 questions each. Verify all six types with actual navigation.
  let j=0;
  for(const [section,index] of [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]]){
   await p.locator('[data-section="'+section+'"]').click();
   await p.locator('[data-q="'+index+'"]').click();
   const [type,selector]=expected[j++];
   fail(await p.locator(".exam-question "+selector).count()>0,
    "Generic "+type+" form control missing");
   await shot(a,"exam-generic-"+type);
  }
  await p.locator("#g-submit").click();
  await shot(a,"results-generic-overview",{full:vp.width===1366});
  await p.locator('[data-result-tab="review"]').click();
  await shot(a,"results-generic-review");
  fail(await p.locator(".generic-review").count()===6,
   "Generic six-kind frozen item review incomplete");
  const manual=p.locator("[data-manual-marks]").first();
  fail(await manual.count()>0,"Generic writing self-assessment missing");
  await manual.fill("1");
  await p.locator("[data-manual-save]").first().click();
  await shot(a,"results-generic-manual-grade");
  await p.locator("[data-add-card]").first().click();
  await p.locator("#g-library").click();
  await p.locator("#g-learning").click();
  await shot(a,"learning-populated",{full:vp.width===1366});
  fail(await p.locator("[data-learning-id]").count()>0,"Notebook card missing after review add");
  await p.locator("#learning-close").click();
  await p.locator("#g-history").click();
  await shot(a,"history-generic");
  fail(await p.locator(".archive-entry").count()>0,"Generic record missing in History");
  fail(await p.locator("#g-export-history").count()===1&&
   await p.locator("#g-import-history").count()===1&&
   await p.locator("#g-storage-panel").count()===1,
   "Offline backup/storage controls absent for generic attempt");
  console.log("PASS29 independent generic six-kind journey "+vp.id);
 }finally{await a.c.close();}
}
const matrix={
 design:"Independent, reproducible scenario sampling; not Cartesian product.",
 dimensions:{viewports:vps.map(v=>v.id),themes:["light","dark"],
  scales:[85,100,140],editions:["source","reviewed","custom"],
  modes:["strict","free","single","generic"],papers:["cgl-2026-09-30","cgl-2026-10-06","six-kinds"],
  journeys:["CGL complete/free","CGL strict/single","source/review","Display and zoom",
   "generic six-kind import/results/learning/history"],
  explicitlyNotClaimed:["physical Mac/iOS/Android","NVDA/VoiceOver","storage OS-kill",
   "pixel-identical v11","human aesthetic signoff","all Cartesian combinations"]},
 sampledPlan:[
  {kind:"paired full journeys",viewports:"4 laptops",states:"Library, 100/140/dark, exam answer/flag/pause/figure/passage, Results 3 tabs, corrected item, saved/filtered History, reopen"},
  {kind:"paired mode variations",viewports:"1366 laptop",states:"strict reviewed 30 Sep; single source 30 Sep; flexible reviewed 6 Oct"},
  {kind:"responsive standalone",viewports:"768 tablet; 390 phone; 195 zoom",states:"Library, Display 140/dark, History empty, Learning empty, Exam"},
  {kind:"generic modern-only",viewports:"1366 laptop, 390 phone",states:"import, six kinds, frozen score/review, manual grade, notebook and History"},
 ],
 baselinePolicy:"Comparable v11 CGL screens only; generic and Learning have no invented v11 equivalent.",
 limits:"Chromium offline screenshots/DOM and keyboard proxies only. No physical browser, AT or human design approval."
};
try{
 for(const vp of vps.filter(v=>v.width>=1280))await setupMain(vp);
 const main=vps.find(v=>v.id==="laptop1366");
 await modeJourney("strict","reviewed","cgl-2026-09-30",main);
 await modeJourney("single","source","cgl-2026-09-30",main);
 await modeJourney("free","reviewed","cgl-2026-10-06",main);
 for(const vp of vps.filter(v=>v.width<1280))await supplemental(vp);
 await genericJourney(main);
 await genericJourney(vps.find(v=>v.id==="phone390"));
 const report={version:1,run:"Pass29 independent expanded CGL/v11 and generic journey matrix",
  baseline:"origin/baseline/v11",scope:matrix,sceneCount:cases.length,
  pairedComparisons:comparisons.length,screenshotCount:screens.length,
  countsByScenario:Object.fromEntries([...new Set(cases.map(c=>c.scene))].map(name=>
   [name,cases.filter(c=>c.scene===name).length])),
  cases,comparisons,findings,
  approvedForRelease:false,physicalAtHumanSignoff:false};
 await writeFile(join(dir,"pass29-coverage.json"),JSON.stringify(report,null,2));
 await writeFile(join(dir,"pass29-review-index.md"),
  "# Pass29 independent browser evidence\n\n"+
  "**"+cases.length+"** measured scenes, **"+comparisons.length+"** paired CGL states; no physical/AT/human signoff.\n\n"+
  "| Screen | Edition | Mode | View | Theme/scale | Evidence | Initial-fold actions |\n"+
  "|---|---|---|---|---|---|---|\n"+
  cases.map(c=>"| "+c.scene+" | "+c.edition+" | "+c.mode+" | "+c.viewport+
   " | "+c.theme+"/"+c.scale+"% | "+c.screenshot+" | "+
   Object.entries(c.geometry).filter(([k,v])=>v.fullyVisible)
   .map(([k])=>k).join(", ")+" |").join("\n")+"\n");
 console.log("PASS29 independent matrix PASS: "+cases.length+" screenshots/states, "+
  comparisons.length+" paired frozen-v11 CGL states; 4 laptop widths, 3 responsive widths, "+
  "strict/free/single, original/reviewed, dark/140%, figure/passage, history/results, six kinds.");
}finally{await browser.close();await rm(tmp,{recursive:true,force:true});}
