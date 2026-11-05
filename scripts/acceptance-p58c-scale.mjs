/** P58-C independent high-volume real file:// acceptance.
 * Eight AI files / 400 mixed-kind questions / 200 selected; 500 duplicate
 * warning ceiling; two-tab conflict; exact stage/draft archive; frozen scoring.
 * Performance observations are engine/runner-specific and not SLA claims.
 */
import {openHarness,route,check,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {makeP58cSources,stageOf,P58C_KINDS} from "./p58c-synthetic-fixture.mjs";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {performance} from "node:perf_hooks";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/p58c-scale"});
const {page,errors}=await h.open({viewport:{width:1280,height:850}});
page.setDefaultTimeout(95000);
const timings={};
const measure=async(label,fn)=>{
 const start=performance.now();const value=await fn();
 timings[label+"Ms"]=Math.round(performance.now()-start);return value;
};
const sources=makeP58cSources({duplicates:true});
const selected=stageOf(sources,200);
const file=(value,name)=>({name,mimeType:"application/json",buffer:Buffer.from(JSON.stringify(value))});
const checked=async(selector)=>page.locator(selector).count();
const downloadJson=async(selector)=>{
 const promise=page.waitForEvent("download",{timeout:95000});
 await page.locator(selector).click();
 return JSON.parse(await readFile(await (await promise).path(),"utf8"));
};
async function maxScale(){
 await page.locator("#displayTrigger").click();
 for(let i=0;i<12&&await page.locator("#fontMore").isEnabled();i++)
  await page.locator("#fontMore").click();
 check(!(await page.locator("#fontMore").isEnabled()),
  engine+" did not reach 140% in-app text limit");
 await page.locator("#displayClose").click();
}
const screenshot=async(name)=>{
 await mkdir("artifacts/p58c-scale",{recursive:true});
 await page.screenshot({path:"artifacts/p58c-scale/"+engine+"-"+name+".png",
  animations:"disabled",fullPage:false});
};
const diagnoseNarrowLayout=async(name)=>{
 const report=await page.evaluate(()=>{
  const width=document.documentElement.clientWidth,scroll=document.documentElement.scrollWidth;
  if(scroll<=width)return null;
  const offenders=[...document.querySelectorAll("h1,h2,h3,p,button,section")].filter(el=>
   el.getBoundingClientRect().right>width+1&&el.getBoundingClientRect().left>=0).slice(0,6);
  return {width,scroll,offenders:offenders.map(el=>{
   const chain=[];
   for(let node=el;node&&node!==document.body&&chain.length<7;node=node.parentElement){
    const css=getComputedStyle(node),r=node.getBoundingClientRect();
    chain.push({tag:node.tagName,id:node.id,classes:String(node.className).slice(0,100),
     text:(node.children.length?node.querySelector("h1,h2,h3")?.textContent:node.textContent)?.trim().slice(0,72),
     left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),
     minWidth:css.minWidth,display:css.display,grid:css.gridTemplateColumns,
     overflowWrap:css.overflowWrap,whiteSpace:css.whiteSpace});
   }
   return chain;
  })};
 });
 if(report)console.log("P58-C "+engine+" narrow "+name+" computed geometry "+JSON.stringify(report));
};
try{
 await page.locator("#g-author-open").click();
 await measure("stageEightFiles400",async()=>{
  await page.locator("#pd-stage-input").setInputFiles(sources.map((source,i)=>
   file(source,"p58c-bank-"+(i+1)+".json")));
  await page.waitForFunction(()=>
   document.querySelectorAll("[data-stage-key]").length===400,
   undefined,{timeout:95000});
 });
 check(await checked("[data-stage-key]")===400,engine+" dropped staged items");
 check(await page.locator("summary").filter({hasText:"400 of 400 selected"}).count()===1,
  engine+" stage did not disclose exactly 400 selected");
 const summaryBefore=await page.locator(".pd-author-section-manager").first().innerText();
 check(summaryBefore.includes("INCOMPLETE")&&summaryBefore.includes("500"),
  engine+" duplicate candidate 500 cap hidden at full scale");
 const archiveBefore=await downloadJson("#pd-stage-archive-export");
 check(archiveBefore.workspace.files.length===8&&archiveBefore.workspace.selected.length===400,
  engine+" eight-file source archival export was truncated");
 const second=await page.context().newPage();
 const tabErrors=[];second.on("pageerror",e=>tabErrors.push(String(e)));
 second.setDefaultTimeout(95000);
 await second.goto(page.url(),{waitUntil:"load"});
 await second.locator("#g-author-open").click();
 await second.waitForFunction(()=>document.querySelectorAll("[data-stage-key]").length===400,
  undefined,{timeout:95000});

 const changed={format:"practice-desk-staging-archive",version:1,
  factualVerification:"not-performed",workspace:selected};
 await measure("restore200Selection",async()=>{
  await page.locator("#pd-stage-archive-file").setInputFiles(file(changed,"p58c-stage-200.json"));
  await page.waitForFunction(()=>{
   const state=JSON.parse(localStorage.getItem("practiceDesk.authoring.staging.v1")??"null");
   return state?.selected?.length===200&&
    [...document.querySelectorAll("[data-stage-key]")].filter(el=>el.checked).length===200;
  },undefined,{timeout:95000});
 });
 // A correctly refused stale write restores the checkbox. Use click(),
 // not Playwright uncheck() which incorrectly expects it to remain unchecked.
 await second.locator('[data-stage-key]').first().click();
 check((await second.locator("#pd-author-status").innerText()).includes("Another tab"),
  engine+" stale large-stage tab overwrote fresh selection without warning");
 check(await second.locator('[data-stage-key]').first().isChecked(),
  engine+" stale tab did not restore its own checkbox state");
 check((await page.evaluate(()=>
  JSON.parse(localStorage.getItem("practiceDesk.authoring.staging.v1")).selected.length))===200,
  engine+" stale tab altered selected count");
 check(tabErrors.length===0,engine+" second-tab error "+tabErrors.join("; "));
 await second.close();
 await page.locator("#pd-stage-filter").selectOption("unselected");
 check(await checked("[data-stage-key]")===200,engine+" unselected filter should show 200");
 await page.locator("#pd-stage-filter").selectOption("selected");
 check(await checked("[data-stage-key]")===200,engine+" selected filter should show 200");
 const firstItem=page.locator(".pd-stage-question-detail").first();
 await firstItem.locator("summary").click();
 check((await firstItem.innerText()).includes("source corroborated"),
  engine+" high-volume per-question QA status missing");
 const report=await downloadJson("#pd-stage-export");
 check(report.questions.length===400&&report.selectedCount===200&&
  report.duplicateTruncated===true&&report.duplicateCandidates>=500,
  engine+" high-volume exported QA report silently truncated");
 check(report.duplicatePairsInspected<report.duplicatePairsPossible,
  engine+" high-volume duplicate report falsely implies exhaustive comparison");
 const archiveAfter=await downloadJson("#pd-stage-archive-export");
 check(archiveAfter.workspace.selected.length===200,
  engine+" corrected selected source backup lost selection");
 await page.locator("#pd-stage-filter").focus();
 await page.keyboard.press("Tab");
 check(await page.evaluate(()=>
  document.activeElement!==null&&document.activeElement.tagName!=="BODY"),
  engine+" keyboard Tab lost focus in staging");

 await page.setViewportSize({width:195,height:844});
 await maxScale();
 await assertNoOverflow(page,engine+" 8/400 staging at 195px/140%");
 await screenshot("stage-400-195");
 await measure("handoff200",async()=>{
  await page.locator("#pd-stage-handoff").click();
  await page.waitForFunction(()=>document.querySelector("#pd-author-drafts")?.value.startsWith("stage:")&&
   document.querySelector("#pd-author-questions")?.options.length===200,
   undefined,{timeout:95000});
 });
 check(await page.locator("#pd-author-questions option").count()===200,
  engine+" Wordgard did not retain all 200 selected questions");
 await assertNoOverflow(page,engine+" 200-question Wordgard 195px/140%");
 await screenshot("wordgard-200-195");

 const draftExchange=await downloadJson("#pd-author-exchange");
 check(draftExchange.draft.questions.length===200&&draftExchange.draft.assets.length===4,
  engine+" 200-question corrected exchange omitted questions/media");
 const fullShelf=await downloadJson("#pd-author-shelf-export");
 check(fullShelf.shelf.drafts.some(d=>d.id===draftExchange.draft.id&&d.questions.length===200),
  engine+" archive omitted the 200-question unpublished Wordgard work");
 const fresh=await h.open({viewport:{width:1280,height:820}});
 fresh.page.setDefaultTimeout(95000);
 await fresh.page.locator("#g-author-open").click();
 await fresh.page.locator("#pd-author-import-file").setInputFiles(file(draftExchange,"p58c-fresh-exchange.json"));
 await fresh.page.waitForFunction(id=>
  document.querySelector("#pd-author-drafts")?.value===id,draftExchange.draft.id,
  {timeout:95000});
 const current=await fresh.page.evaluate(id=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts.v1"));
  return shelf.drafts.find(d=>d.id===id);
 },draftExchange.draft.id);
 check(JSON.stringify(current)===JSON.stringify(draftExchange.draft),
  engine+" fresh source exchange failed exact re-import at 200 questions");
 check(fresh.errors.length===0,engine+" new browser exceptions: "+fresh.errors.join("; "));

 await page.setViewportSize({width:1280,height:850});
 await measure("validate200",async()=>await page.locator("#pd-author-validate").click());
 const validationText=(await page.locator("#pd-author-validation").innerText()).slice(0,2000);
 check(validationText.includes("warnings")&&validationText.includes("0 errors"),
  engine+" 200-question full QA did not disclose warning review: "+validationText.slice(0,400));
 await page.locator("#pd-author-confirm").check();
 await page.locator("#pd-author-accept-warnings").check();
 await measure("publish200",async()=>{
  await page.locator("#pd-author-publish").click();
  await page.waitForFunction(()=>document.querySelector("#g-papers")?.value===
   "authored:upsc-epfo-apfc:p58c-synthetic-apfc:r1:custom",
   undefined,{timeout:95000});
 });
 const publishedId="authored:upsc-epfo-apfc:p58c-synthetic-apfc:r1:custom";
 const saved=(await records(page)).find(r=>r.recordType==="generic-package"&&
  r.bundle?.paper?.id===publishedId);
 check(Boolean(saved)&&saved.bundle.questions.length===200,
  engine+" 200-question publication lost immutable package");
 check(saved.bundle.questions.every(q=>q.editorial.status==="caution"),
  engine+" synthetic source appears falsely official");

 await page.setViewportSize({width:195,height:844});
 await diagnoseNarrowLayout("Library");
 await assertNoOverflow(page,engine+" high-volume Library 195px/140%");
 await screenshot("library-200-195");
 await page.setViewportSize({width:1280,height:850});
 await page.locator("#g-start").click();await route(page,"exam");
 check((await page.locator(".exam-question").innerText()).includes("synthetic premise"),
  engine+" 200-question first synthetic item not navigable");
 check(await page.locator("#g-next").count()===1,
  engine+" 200-question exam lost next/keyboard navigation");
 await page.locator('input[data-choice="B"]').click();
 await page.setViewportSize({width:195,height:844});
 await assertNoOverflow(page,engine+" high-volume Exam 195px/140%");
 await screenshot("exam-200-195");
 await page.locator("#g-submit").click();await route(page,"result");
 const attempted=(await records(page)).find(r=>r.recordType==="generic-attempt"&&
  r.frozen.paper.id===publishedId&&r.result?.items.length===200);
 check(Boolean(attempted)&&Math.abs(attempted.result.snapshot.earnedMarks-2.5)<1e-9,
  engine+" published 200-question true canonical score/frozen result invalid");
 await assertNoOverflow(page,engine+" 200-question Results 195px/140%");
 await screenshot("results-200-195");
 await page.setViewportSize({width:1280,height:850});
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 await page.setViewportSize({width:195,height:844});
 await diagnoseNarrowLayout("Learning");
 await assertNoOverflow(page,engine+" high-volume Learning 195px/140%");
 await screenshot("learning-200-195");
 check(errors.length===0,engine+" browser exceptions "+errors.join("; "));
 await mkdir("artifacts/p58c-scale",{recursive:true});
 await writeFile("artifacts/p58c-scale/"+engine+"-observed-times.json",
  JSON.stringify({engine,fixture:{banks:8,staged:400,selected:200,duplicateCap:500},
   timings,context:"CI runner; NOT physical device, SLA or historical speed claim"},null,2));
 console.log("P58-C "+engine+" PASS eight-bank 400 staged, 200 selected, warning-cap, cross-tab, backup/exchange and frozen exam; measured stage="+timings.stageEightFiles400+"ms handoff="+timings.handoff200+"ms published="+timings.publish200+"ms");
}catch(error){await h.diagnose("p58c-"+engine,page,error);throw error;}
finally{await h.finish();}
