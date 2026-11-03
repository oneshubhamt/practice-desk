/** P47-2 actual offline History filters + navigation/persistence/mobile negative checks.
 * Tests a frozen imported PGDBA bank and bundled CGL, no external network.
 */
import {openHarness,records,check,route,assertNoOverflow} from "./browser/fixtures.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";

const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
const imported={...pkg,examId:"pgdba",title:"PGDBA user-authored practice"};
const dateLocal=t=>{
 const d=new Date(t);
 return String(d.getFullYear()).padStart(4,"0")+"-"+
   String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
const count=()=>page.locator(".archive-entry").count();
async function query(){
 return page.evaluate(()=>{
  const keys=["g-history-exam","g-history-mode","g-history-paper","g-filter",
    "g-history-sort","g-history-from","g-history-to","g-history-search"];
  return Object.fromEntries(keys.map(id=>[id,document.getElementById(id)?.value]));
 });
}
async function settled(predicate,reason){
 for(let n=0;n<55;n++){
  const list=(await records(page)).filter(x=>x.recordType==="generic-attempt");
  if(predicate(list))return list;
  await page.waitForTimeout(75);
 }
 throw Error("P47-2 persisted record condition not met: "+reason);
}
try{
 // An imported examination whose exam ID does not exist in the bundled bank.
 await page.locator("#g-file").setInputFiles({name:"pgdba-authored.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(imported))});
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,imported.paper.id);
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator("input[data-choice]").first().click();
 await page.locator("#g-submit").click();await route(page,"result");
 await page.locator("#g-library").click();await route(page,"library");
 const before=await settled(xs=>xs.some(x=>x.frozen.snapshot.examId==="pgdba"&&x.finishedAt!==null),
  "PGDBA completed attempt");
 const importedAttempt=before.find(x=>x.frozen.snapshot.examId==="pgdba");
 // A distinct built-in exam, with its own frozen paper/scoring identity.
 await page.locator("#g-family").selectOption("builtin:ssc-cgl");
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator("input[data-choice]").first().click();
 for(let n=0;n<4;n++)await page.locator("#g-submit").click();
 await route(page,"result");
 await page.locator("#g-library").click();await route(page,"library");
 await settled(xs=>xs.some(x=>x.frozen.snapshot.examId==="ssc-cgl"&&x.finishedAt!==null),
  "CGL completed attempt");
 // Also retain an unfinished test, which the new filters must never destroy.
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator("#g-library").click();await route(page,"library");
 const all=await settled(xs=>xs.length===3&&xs.some(x=>x.finishedAt===null),"three saved attempts");
 const completeCgl=all.find(x=>x.frozen.snapshot.examId==="ssc-cgl"&&x.finishedAt!==null);
 check(Boolean(completeCgl&&importedAttempt),"missing valid completed attempts");
 const baseline=all.map(x=>({id:x.id,marks:x.result?.snapshot.earnedMarks,
  revision:x.saveRevision,exam:x.frozen.snapshot.examId,startedAt:x.startedAt}));
 await page.locator("#g-history").click();await route(page,"history");
 check(await count()===3,"History initial archive is not all three attempts");
 const insightBefore=await page.locator(".history-summary").innerText();
 await page.locator("#g-history-exam").selectOption("pgdba");
 check(await count()===1&&await page.locator('[data-attempt="'+importedAttempt.id+'"]').count()===1,
  "frozen PGDBA filter failed");
 check(await page.locator("#g-history-mode").inputValue()==="all",
  "changing exam silently applied a practice mode");
 await page.locator("#g-history-mode").selectOption(importedAttempt.frozen.snapshot.mode);
 await page.locator("#g-filter").selectOption("complete");
 await page.locator("#g-history-paper").selectOption(importedAttempt.frozen.paper.id);
 await page.locator("#g-history-search").fill("PGDBA");
 check(await count()===1,"composed exam/mode/status/paper/search did not intersect correctly");
 const actualDay=dateLocal(importedAttempt.startedAt);
 await page.locator("#g-history-from").fill(actualDay);
 await page.locator("#g-history-to").fill(actualDay);
 check(await count()===1,"inclusive local start-date boundaries lost an exact-day attempt");
 check((await page.locator(".history-summary").innerText())===insightBefore,
  "filtering a subset altered all-time metrics");
 check((await page.locator("#g-history-count").innerText()).includes("1 of 3"),
  "filtered archive count missing");
 const savedQuery=await query();
 await page.reload({waitUntil:"load"});await route(page,"history");
 check(await count()===1&&JSON.stringify(await query())===JSON.stringify(savedQuery),
  "same-tab reload did not restore selected filters and date range");
 // Opening a saved result and navigating back must preserve the archive subset.
 await page.locator('[data-attempt="'+importedAttempt.id+'"]').click();await route(page,"result");
 if(await page.evaluate(()=>Boolean(window.navigation?.canGoBack))){
  await page.evaluate(()=>window.navigation.back().finished);
  await route(page,"history");
 }else{
  await page.locator("#g-history-results").click();await route(page,"history");
 }
 check(await count()===1&&await page.locator("#g-history-exam").inputValue()==="pgdba",
  "History filter lost after opening an immutable result");
 // Empty intersection is explicit; Reset clears every dimension including sort.
 await page.locator("#g-history-sort").selectOption("oldest");
 await page.locator("#g-history-exam").selectOption("ssc-cgl");
 check(await count()===0,"composed conflicting exam and paper was not empty");
 check(await page.locator(".empty-state").first().innerText()
  .then(t=>t.includes("No attempts match")),"missing empty state");
 await page.locator("#g-history-reset").click();
 check(await count()===3&&
  (await page.locator("#g-history-sort").inputValue())==="newest"&&
  (await page.locator("#g-history-exam").inputValue())==="all"&&
  (await page.locator("#g-history-paper").inputValue())==="all"&&
  (await page.locator("#g-history-from").inputValue())===""&&
  (await page.locator("#g-history-to").inputValue())===""&&
  (await page.locator("#g-history-search").inputValue())==="",
  "Reset did not clear all fields");
 // Simulate a deleted imported package. Its completed frozen result must survive.
 await page.evaluate(async id=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open("practiceDesk.shared.v1",1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  try{
   const tx=db.transaction("attempts","readwrite");
   tx.objectStore("attempts").delete("generic-package:"+id);
   await new Promise((resolve,reject)=>{
    tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
   });
  }finally{db.close();}
 },imported.paper.id);
 await page.reload({waitUntil:"load"});await route(page,"history");
 await page.locator("#g-history-exam").selectOption("pgdba");
 check(await count()===1&&await page.locator('[data-attempt="'+importedAttempt.id+'"]').count()===1,
  "orphan imported examination result disappeared from archived filter");
 await page.locator('[data-attempt="'+importedAttempt.id+'"]').click();await route(page,"result");
 check((await page.locator("#result-overview").innerText()).length>40,
  "orphan result no longer opens with frozen paper and score");
 await page.locator("#g-history-results").click();await route(page,"history");
 // Accurate source results remain intact after filtering, reload and deletion.
 const after=await settled(xs=>xs.length===3,"three immutable attempts after orphan removal");
 for(const row of baseline){
  const same=after.find(x=>x.id===row.id);
  check(Boolean(same)&&same.result?.snapshot.earnedMarks===row.marks&&
   same.frozen.snapshot.examId===row.exam&&same.startedAt===row.startedAt,
   "History filter/reload changed frozen attempt, marks or exam ID");
 }
 await page.locator("#g-history-reset").click();
 // Narrow viewport and scaled font in both themes; date inputs must not overflow.
 const responsive=[];
 for(const width of [390,195]){
  await page.setViewportSize({width,height:844});
  await page.locator("#displayTrigger").click();
  while((await page.locator("#fontReset").innerText()).trim()!=="140%"){
   const n=Number.parseInt(await page.locator("#fontReset").innerText());
   check(n<140,"font scale overshot 140%");
   await page.locator("#fontMore").click();
  }
  await page.locator("#displayClose").click();
  await assertNoOverflow(page,"P47-2 light History at "+width+"px /140%");
  await page.locator("#displayTrigger").click();
  await page.locator("#themeDark").click();
  await page.locator("#displayClose").click();
  await assertNoOverflow(page,"P47-2 dark History at "+width+"px /140%");
  for(const id of ["g-history-from","g-history-to","g-history-exam","g-history-reset"]){
   check(await page.locator("#"+id).count()===1,"P47-2 narrow missing "+id);
  }
  responsive.push(width);
  await page.locator("#displayTrigger").click();
  await page.locator("#themeLight").click();
  await page.locator("#displayClose").click();
 }
 check(!errors.length,"uncaught History filter browser errors: "+errors.join("; "));
 await h.evidence("p47-2-history-filter",{
  passed:true,exams:["pgdba","ssc-cgl"],attempts:3,
  assertions:["AND-filter","local-inclusive-date","persistent-session-query",
   "immutable-analytics","Back-or-Result-navigation","empty-and-reset",
   "orphan-imported-bank-result","frozen-score-retention","390-and-195-light-dark-140%"],
  responsive,at:new Date().toISOString()
 });
 console.log("MODERN P47-2 HISTORY PASS exam/mode/paper/status/search/inclusive-dates, reset, orphan result, reload, navigation, 195px+140% both themes");
}catch(e){await h.diagnose("p47-2-history-filters",page,e);throw e;}
finally{await context.close();await h.finish();}
