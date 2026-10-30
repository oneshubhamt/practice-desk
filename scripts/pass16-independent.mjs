import {readFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
import {builtinCglPackages} from "../src/app/exam-package.ts";
import {scoreableMaximum} from "../src/engine/score-ceiling.ts";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const source=JSON.parse(await readFile(join(root,"src/content/papers.json"),"utf8"));
const patches=JSON.parse(await readFile(join(root,"src/content/patches.json"),"utf8"));
const solutions=JSON.parse(await readFile(join(root,"src/content/solutions.json"),"utf8"));
const banks=builtinCglPackages(source,patches,solutions);
const browserName=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(x=>
 spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!browserName)throw Error("Pass 16 requires Chromium");
const executablePath=spawnSync("which",[browserName],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"practice-pass16-"));
const url=pathToFileURL(join(root,"Practice_Desk_Offline_Mock_Tests.html")).href;
const browser=await chromium.launchPersistentContext(profile,{headless:true,executablePath,
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const failures=[];
const assert=(condition,description)=>{if(!condition)throw Error(description)};
const take=(q)=>q?.content?.options?.find(x=>x.id!==q.content.options[0].id);
try{
 const page=browser.pages()[0]??await browser.newPage();
 page.setDefaultTimeout(20000);
 const runtime=[];page.on("pageerror",e=>runtime.push(e.message));
 page.on("dialog",dialog=>{void dialog.accept();});
 await page.goto(url,{waitUntil:"load"});
 await page.locator("#g-papers").waitFor();
 // New de novo matrix: visit every source and reviewed edition; answer an
 // actual source-bank question; calculate score; save; reopen completed
 // record. This does not rely on old Pass 12/15 screenshot fixtures.
 for(const sourcePaper of Object.values(source)){
   for(const edition of ["source","reviewed"]){
     const pkg=banks.find(p=>p.paper.paperId===sourcePaper.id&&p.paper.edition===edition);
     assert(pkg,"Missing package "+sourcePaper.id+" / "+edition);
     await page.locator("#g-papers").selectOption(pkg.paper.id);
     await page.locator('[data-mode="free"]').click();
     assert(await page.locator("#g-papers").inputValue()===pkg.paper.id,
       "Edition selector did not retain chosen version");
     await page.locator("#g-start").click();
     const q=pkg.questions[0],key=pkg.answerKey.entries[0].answer;
     assert(await page.locator(".exam-question").count()===1,"Exam renderer not present");
     assert(await page.locator(".source-review").count()===0,
       "Original correction disclosed before submitting exam");
     assert(await page.locator('[data-q="0"]').count()===1,"Question navigation missing");
     const index=q.content.options.findIndex(o=>o.id===key.optionId);
     assert(index>=0,"Published/edited key unknown");
     await page.locator('input[data-choice]').nth(index).check();
     await page.locator("#g-submit").click();
     await page.locator("#result-overview").waitFor();
     const status=await page.locator(".score.standout").innerText();
     const validMax=scoreableMaximum(pkg.paper,pkg.answerKey,pkg.questions).toFixed(2);
     assert(status.includes("/ "+validMax),"Wrong score maximum for "+sourcePaper.id+" "+edition+": "+status);
     await page.locator('[data-result-tab="review"]').click();
     const item=page.locator('[data-review-id="'+q.id+'"]');
     assert(await item.count()===1,"Completed first question not reviewed");
     const verdict=await item.innerText();
     assert(verdict.toLowerCase().includes("correct")||q.editorial.status==="invalid",
       "Expected frozen correct answer absent");
     await page.locator("#g-library").click();
     await page.locator("#g-history").click();
     assert(await page.locator('[data-attempt]').count()>=1,
       "Completed archive did not include attempt");
     await page.locator("#g-library").click();
     console.log("Pass16 source/edition "+sourcePaper.id+" "+edition+" scored and archived");
   }
 }
 // New scored caution policy on the real disputed published-key question.
 const oct="cgl-2026-10-06";
 for(const edition of ["source","reviewed"]){
   const pkg=banks.find(p=>p.paper.paperId===oct&&p.paper.edition===edition);
   await page.locator("#g-papers").selectOption(pkg.paper.id);
   await page.locator('[data-mode="free"]').click();
   await page.locator("#g-start").click();
   await page.locator('[data-section="2"]').click();
   await page.locator('[data-q="11"]').click();
   const q=pkg.questions[61];
   assert(q.editorial.status===(edition==="source"?"invalid":"caution"),
     "Q62 edition editorial status incorrect");
   await page.locator('input[data-choice]').nth(1).check(); // published B
   assert(!(await page.locator("main").innerText()).includes("the original published answer is retained for scoring"),
     "Q62 disputed published answer policy leaked before submission");
   await page.locator("#g-submit").click();
   await page.locator("#result-overview").waitFor();
   await page.locator('[data-result-tab="review"]').click();
   const item=page.locator('[data-review-id="'+q.id+'"]');
   const plain=await item.innerText();
   const expected=edition==="source"?"excluded":"correct";
   assert(plain.includes(expected),"Q62 "+edition+" expected "+expected+": "+plain.slice(0,250));
   if(edition==="reviewed"){
     assert(plain.includes("disputed")&&plain.includes("retained for scoring"),
       "Caution review must disclose published-key concern");
     assert(plain.includes("2 automated marks"),"Reviewed Q62 published B not credited");
     assert(await item.locator("details.source-review").count()===1,
       "Changed Q62 must preserve source-version comparison");
   }else assert(plain.includes("0 automated marks"),"Source-invalid Q62 not excluded");
   await page.locator("#g-library").click();
   console.log("Pass16 edited caution "+edition+" user-visible test PASS");
 }
 await page.locator("#g-learning").click();
 const text=await page.locator("#screen-announcement").innerText();
 assert(text.includes("Learning and spaced revision"),"Learning route status omitted");
 assert((await page.evaluate(()=>document.activeElement?.tagName))==="H1",
   "Learning navigation does not focus route heading");
 await page.locator("#learning-close").click();
 assert((await page.locator("#screen-announcement").innerText()).includes("Test library"),
   "Returning to library not announced");
 assert(runtime.length===0,"Browser errors: "+runtime.join("; "));
 console.log("Pass16 independent browser: 10 actual CGL editions, Q62 source/review scoring, frozen result archive and Learning route focus PASS");
}finally{await browser.close();await rm(profile,{recursive:true,force:true});}
