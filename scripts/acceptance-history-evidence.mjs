/** Real offline archive and study evidence: revision-aware atomic deletion,
 * archival v3 restoration, multi-exam cross-paper progress, bounded pending
 * panels and per-question visit evidence. No historical screen comparisons.
 */
import {readFile} from "node:fs/promises";
import {gzipSync} from "node:zlib";
import {openHarness,records,check,route} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
async function settle(page,predicate,label){
 for(let n=0;n<45;n++){
  const all=await records(page);
  if(predicate(all))return all;
  await page.waitForTimeout(85);
 }
 throw Error("Timed out: "+label);
}
async function pageRun(name,fn){
 let disposition="accept",prompts=[];
 const {page,context,errors}=await h.open({onDialog:d=>{
  prompts.push(d.message());void (disposition==="dismiss"?d.dismiss():d.accept());
 }});
 try{
  await fn({page,context,errors,decision:v=>{disposition=v;},prompts,
   resetPrompts:()=>{prompts.length=0;}});
  check(errors.length===0,"Browser exception "+name+" "+errors.join("; "));
  console.log("MODERN HISTORY PASS "+name);
 }catch(e){await h.diagnose("history-"+name,page,e);throw e;}
 finally{await context.close();}
}
try{
 await pageRun("atomic-bulk-deletion-and-backup",async({page,context,decision,prompts,resetPrompts})=>{
  const initial=await page.locator("#g-papers").inputValue();
  await page.locator('[data-edition="source"]').click();
  const source=await page.locator("#g-papers").inputValue();
  check(source!==initial&&
   await page.locator("#g-papers option").evaluateAll(xs=>xs.filter(x=>x.value.includes("cgl-")).every(x=>x.value.includes("source"))),
   "Library mixed original and reviewed source files");
  await page.locator('[data-edition="reviewed"]').click();
  check(await page.locator("#g-papers").inputValue()===initial,
   "Switching editions lost the original family");
  await page.locator('[data-mode="single"]').click();
  await page.locator("#g-single-section").selectOption("2");
  await page.reload({waitUntil:"load"});await route(page,"library");
  check(await page.locator("#g-papers").inputValue()===initial&&
   await page.locator('[data-mode="single"]').getAttribute("aria-pressed")==="true"&&
   await page.locator("#g-single-section").inputValue()==="2",
   "Selected original/reviewed, mode or section did not persist");
  await page.evaluate(()=>localStorage.setItem("practiceDesk.overhaul.setups.v2","{bad"));
  await page.reload({waitUntil:"load"});await route(page,"library");
  check(await page.locator("#g-start").count()===1,"Bad selection storage broke offline boot");
  await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(pkg))});
  await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,pkg.paper.id);
  await page.reload({waitUntil:"load"});
  check(await page.locator("#g-papers").inputValue()===pkg.paper.id,
   "Authored exam selection not restored");
  await chooseModernPaper(page,initial);
  await page.locator('[data-mode="free"]').click();
  for(let n=0;n<2;n++){
   await page.locator("#g-start").click();await route(page,"exam");
   await page.locator("input[data-choice]").first().click();
   await page.locator("#g-submit").click();await route(page,"result");
   await page.locator("#result-tab-review").click();
   if(n===0)await page.locator("[data-add-card]").first().click();
   await page.locator("#g-library").click();await route(page,"library");
  }
  await settle(page,x=>x.filter(y=>y.recordType==="generic-attempt"&&y.finishedAt!==null).length===2,
   "Two real completed attempts");
  await page.locator("#g-start").click();await route(page,"exam");
  await page.locator("#g-library").click();await route(page,"library");
  const before=await settle(page,x=>x.some(y=>y.recordType==="generic-attempt"&&y.finishedAt===null),"pending");
  const pending=before.find(x=>x.recordType==="generic-attempt"&&x.finishedAt===null);
  check(before.some(x=>x.recordType==="learning-card")&&
    before.some(x=>x.recordType==="generic-package"),"Preparatory card/imported package absent");
  await page.locator("#g-history").click();await route(page,"history");
  check((await page.locator("#g-storage-backend").innerText()).includes("IndexedDB")&&
    (await page.locator(".history-summary").innerText()).includes("Papers practised")&&
    (await page.locator(".history-trend").innerText()).includes("Adjusted score progression"),
    "History storage and adjusted progression evidence missing");
  check((await page.locator("#g-storage-health").innerText()).includes("No writes pending")&&
    !(await page.locator("#g-storage-last-commit").innerText()).includes("none observed")&&
    (await page.locator("#g-storage-last-failure").innerText()).includes("none reported")&&
    (await page.locator("#g-storage-records").innerText()).includes(before.length+" records"),
    "P45 History health must disclose actual loaded records, completed saves and no inferred error");
  await page.locator("#g-history-paper").selectOption(pending.frozen.paper.id);
  check(await page.locator(".archive-entry").count()===3,"Frozen paper-revision filter missed attempts");
  await page.locator("#g-history-paper").selectOption("all");
  await page.locator("#g-filter").selectOption("complete");
  check(await page.locator(".archive-entry").count()===2,"Completed History filter incorrect");
  await page.locator("#g-filter").selectOption("all");
  await page.evaluate(()=>Object.defineProperty(navigator,"storage",{configurable:true,value:{
   estimate:()=>Promise.reject(Error("denied")),persist:()=>Promise.resolve(false)}}));
  await page.locator("#g-library").click();await route(page,"library");
  await page.locator("#g-history").click();await route(page,"history");
  await page.waitForFunction(()=>document.querySelector("#g-storage-quota")?.textContent?.includes("unavailable"));
  await page.locator("#g-storage-persist").click();
  check((await page.locator("#g-storage-persist-status").innerText()).includes("not granted"),
   "Denied persistence request falsely reported success");
  const download=page.waitForEvent("download");await page.locator("#g-export-history").click();
  const exported=JSON.parse(await readFile(await (await download).path(),"utf8"));
  check(exported.format==="practice-desk-backup"&&exported.version===3&&
   exported.manifest.recordCount===exported.records.length,
   "Integrity-checked exported v3 format wrong");
  check(exported.setups?.families?.["builtin:ssc-cgl"]?.paperRevisionId===initial&&
   exported.setups?.families?.["builtin:ssc-cgl"]?.mode==="free",
   "Complete backup lacks verified exam selection");
  decision("dismiss");
  await page.locator("#g-delete-completed").click();
  check((await records(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length===2,
   "Cancel mistakenly deleted completed records");
  decision("accept");
  const competing=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null);
  await page.evaluate(async id=>{
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open("practiceDesk.shared.v1",1);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   try{await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readwrite"),store=tx.objectStore("attempts");
    const req=store.get(id);
    req.onsuccess=()=>store.put({...req.result,saveRevision:req.result.saveRevision+1});
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
   });}finally{db.close();}
  },competing.id);
  resetPrompts();
  await page.locator("#g-delete-completed").click();
  await page.waitForFunction(()=>document.querySelector(".generic-warning")?.textContent?.includes("No completed history was cleared"));
  check((await records(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null).length===2,
   "Stale-revision bulk Delete partially erased completed attempts");
  await page.reload({waitUntil:"load"});
  if(await page.locator("#g-history").count())await page.locator("#g-history").click();
  else await page.locator("#g-delete-completed").waitFor({state:"visible"});
  resetPrompts();
  await page.locator("#g-delete-completed").click();
  await page.waitForFunction(()=>document.querySelector("#g-delete-completed")?.disabled===true);
  check(prompts.length===2&&prompts.some(x=>x.includes("Delete all")),
   "Bulk Delete must require two consequential confirmations");
  const after=await records(page);
  check(!after.some(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null)&&
   after.some(x=>x.id===pending.id&&x.finishedAt===null)&&
   after.some(x=>x.recordType==="learning-card")&&
   after.some(x=>x.recordType==="generic-package"),
   "Bulk Delete damaged unfinished/card/imported records");
  const pendingRevision=after.find(x=>x.id===pending.id).saveRevision;
  await page.locator("#g-history-file").setInputFiles({name:"backup.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(exported))});
  const restored=await settle(page,x=>x.filter(y=>y.recordType==="generic-attempt"&&y.finishedAt!==null).length===2,"additive restore");
  check(restored.find(x=>x.id===pending.id)?.saveRevision===pendingRevision,
   "Additive backup overwrote pending newer revision");
  // P45: gzip is only a file wrapper around the same checksum-verified v3
  // document; re-import cannot overwrite an existing newer record.
  const compressed=gzipSync(Buffer.from(JSON.stringify(exported)));
  await page.locator("#g-history-file").setInputFiles({name:"backup.json.gz",
    mimeType:"application/gzip",buffer:compressed});
  await page.waitForFunction(()=>document.querySelector(".generic-warning")?.textContent?.includes("Imported 0 records"));
  check((await records(page)).find(x=>x.id===pending.id)?.saveRevision===pendingRevision,
    "Gzip backup import rewrote the newer unfinished attempt");
  const corrupted=structuredClone(exported);
  corrupted.records[0].startedAt+=1000;
  await page.locator("#g-history-file").setInputFiles({name:"tampered.json.gz",
    mimeType:"application/gzip",buffer:gzipSync(Buffer.from(JSON.stringify(corrupted)))});
  await page.waitForFunction(()=>document.querySelector(".generic-warning")?.textContent?.includes("Backup integrity check failed"));
  check((await records(page)).find(x=>x.id===pending.id)?.saveRevision===pendingRevision,
    "Invalid gzip backup modified history despite checksum failure");
  // Real fallback storage bulk deletion must remain atomic on quota errors.
  const fallback=await context.newPage();
  const e=[];fallback.on("pageerror",x=>e.push(String(x)));
  fallback.on("dialog",d=>void d.accept());
  await fallback.addInitScript(()=>Object.defineProperty(window,"indexedDB",{configurable:true,value:undefined}));
  await fallback.goto(page.url().split("#")[0].split("?")[0],{waitUntil:"load"});
  await fallback.locator('[data-mode="free"]').click();
  await fallback.locator("#g-start").click();await fallback.locator("#g-submit").click();
  await fallback.locator("#g-library").click();await fallback.locator("#g-history").click();
  check((await fallback.locator("#g-storage-backend").innerText()).includes("localStorage fallback"),
   "Fallback backend indicator missing");
  const fallbackRead=()=>fallback.evaluate(()=>
   JSON.parse(localStorage.getItem("practiceDesk.overhaul.fallback.v1")??"[]"));
  check((await fallbackRead()).some(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null),
   "Completed fallback attempt not saved");
  await fallback.evaluate(()=>{
   window.__writeBefore=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
    if(key==="practiceDesk.overhaul.fallback.v1")
     throw new DOMException("quota denied","QuotaExceededError");
    return window.__writeBefore.call(this,key,value);
   };
  });
  await fallback.locator("#g-delete-completed").click();
  await fallback.waitForFunction(()=>document.querySelector(".generic-warning")?.textContent?.includes("No completed history was cleared"));
  check((await fallbackRead()).some(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null),
   "Quota-denied fallback bulk deletion corrupted storage");
  await fallback.evaluate(()=>{Storage.prototype.setItem=window.__writeBefore;});
  await fallback.locator("#g-delete-completed").click();
  await fallback.waitForFunction(()=>document.querySelector("#g-delete-completed")?.disabled===true);
  check(!(await fallbackRead()).some(x=>x.recordType==="generic-attempt"&&x.finishedAt!==null)&&
   e.length===0,
   "Fallback completed-only deletion did not commit safely");
  await fallback.close();
 });
 await pageRun("cross-paper-and-pending-panel",async({page})=>{
  const reviewed=await page.locator("#g-papers option").evaluateAll(xs=>
    xs.filter(x=>x.textContent.includes("Reviewed")).map(x=>x.value));
  check(reviewed.length>=2,"Need two different reviewed paper identities");
  for(let i=0;i<2;i++){
   await chooseModernPaper(page,reviewed[i]);
   await page.locator('[data-mode="strict"]').click();
   await page.locator("#g-start").click();await route(page,"exam");
   for(let j=0;j<4;j++)await page.locator("#g-submit").click();
   await route(page,"result");
   await page.locator("#g-library").click();await route(page,"library");
  }
  check(await page.locator(".recent-panel .recent-attempt").count()===2,
   "Two completed distinct CGL attempts not shown in recents");
  const before=await page.locator(".recent-panel").innerText();
  check(before.includes(" / ")&&before.includes("marks"),"Recents lost frozen earned / max");
  await page.locator("#g-history").click();await route(page,"history");
  const priorities=await page.locator("#g-cross-paper-priorities").innerText();
  check(priorities.includes("2 distinct papers")&&priorities.includes("% marks")&&
   await page.locator(".history-priorities").count()===1,
   "Comparable full papers lost separate adjusted-marks and accuracy diagnostics");
  check(await page.locator(".history-entries [data-delete]").count()===2&&
   (await page.locator(".history-entries").innerText()).includes(" / "),
   "Frozen archive denominator not visible");
  await page.locator("#g-library").click();await route(page,"library");
  for(let i=0;i<6;i++){
   await page.locator("#g-start").click();await route(page,"exam");
   await page.locator("#g-library").click();await route(page,"library");
  }
  await page.locator("#g-pending-attempts .recent-attempt").first().waitFor();
  check(await page.locator("#g-pending-attempts .recent-attempt").count()===5&&
   await page.locator("#g-pending-history").count()===1,
   "More than five pending attempts displaced intended 5-item cap");
  check((await page.locator(".recent-panel").innerText())===before,
   "Creating unfinished attempts changed prior completed results");
  await page.locator("#g-pending-history").click();await route(page,"history");
  check(await page.locator("#g-filter").inputValue()==="progress"&&
   await page.locator(".history-entries [data-discard]").count()===6&&
   await page.locator(".history-entries [data-delete]").count()===0,
   "View all unfinished did not preserve six resumable attempts/Discard policy");
  await page.locator(".history-entries [data-attempt]").first().click();await route(page,"exam");
  await page.locator("#g-library").click();await route(page,"library");
  await page.locator("#g-history-recent").click();await route(page,"history");
  check(await page.locator("#g-filter").inputValue()==="complete"&&
   await page.locator(".history-entries [data-delete]").count()===2&&
   await page.locator(".history-entries [data-discard]").count()===0,
   "Completed view-all mixed pending Discard controls");
 });
 await pageRun("question-visits-and-historical-timing",async({page})=>{
  await page.locator('[data-mode="free"]').click();
  await page.locator("#g-start").click();await route(page,"exam");
  await page.locator("input[data-choice]").first().click();
  await page.locator('[data-q="1"]').click();
  await page.locator('[data-q="0"]').click();
  await page.locator('[data-q="2"]').click();
  const id=new URL(await page.url()).searchParams.get("attempt");
  await page.locator("#g-submit").click();await route(page,"result");
  const all=await settle(page,x=>x.some(y=>y.id===id&&y.finishedAt!==null),"finished visit attempt");
  const result=all.find(x=>x.id===id),first=result.frozen.paper.sections[0].questionRevisionIds[0];
  check(result.state.questionVisits?.find(x=>x.questionRevisionId===first)?.count===2&&
    result.state.questionVisits?.length>=3,
    "Repeated navigation not recorded independently of answer edits");
  check(await page.locator("#g-longest-questions .slow-link").count()>=1&&
    await page.locator("#g-longest-questions .slow-link").count()<=5&&
    await page.locator("#g-next-work li").count()>=1,
    "Observed longest items or study advice missing");
  await page.locator("#g-longest-questions .slow-link").first().click();
  check(await page.locator("#result-tab-review").getAttribute("aria-selected")==="true"&&
   await page.locator(".generic-review").count()>0,
   "Longest-question link did not reveal actual reviewed item");
  const filter=page.locator("#g-review-filter");
  check(await filter.locator('option[value="audit"]').count()===1&&
   await filter.locator('option[value="typicalwrong"]').count()===1,
   "Evidence-aware audit and typical-wrong filters absent");
  await filter.selectOption("audit");
  check(await page.locator(".generic-review").count()>0,"Editorial audit filter lost reviewed CGL items");
  await filter.selectOption("typicalwrong");
  await page.locator("#result-tab-timing").click();
  const ledger=await page.locator("#result-timing").innerText();
  check(["Speed","Visits","Changes","Not classified"].every(x=>ledger.includes(x)),
   "Actual visit/time/answer-change ledger or insufficient-sample disclosure missing");
  // Restore an older record with no visit counters: do not fabricate observations.
  await page.evaluate(async id=>{
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open("practiceDesk.shared.v1",1);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   try{await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readwrite"),store=tx.objectStore("attempts");
    const r=store.get(id);
    r.onsuccess=()=>{const older=r.result;delete older.state.questionVisits;store.put(older);};
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
   });}finally{db.close();}
  },id);
  await page.reload({waitUntil:"load"});
  // A record with pre-visit-schema evidence may re-open through Library;
  // do not assume native file:// navigation can preserve Results on reload.
  if(await page.locator("#g-history").count()){
   await page.locator("#g-history").click();await route(page,"history");
   await page.locator('[data-attempt="'+id+'"]').first().click();await route(page,"result");
  }else await page.locator("#result-tab-timing").waitFor({state:"visible"});
  await page.locator("#result-tab-timing").click();
  check((await page.locator("#result-timing").innerText()).includes("Not recorded"),
   "Old saved attempts falsely attributed unsaved visit counts");
  await page.locator("#g-library").click();await route(page,"library");
  await page.locator("#g-file").setInputFiles({name:"six-kinds.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(pkg))});
  await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,pkg.paper.id);
  await page.locator("#g-start").click();await route(page,"exam");
  await page.locator("#g-submit").click();await route(page,"result");
  await page.locator("#result-tab-timing").click();
  check((await page.locator("#result-timing").innerText()).includes("Not classified"),
   "Imported/manual/insufficient-sample questions falsely speed classified");
  const custom=(await records(page)).find(x=>x.recordType==="generic-attempt"&&
   x.finishedAt!==null&&x.frozen.snapshot.examId===pkg.examId);
  check(custom?.state.questionVisits?.length===1,
   "Initial imported six-kind question visit not captured");
 });
 await h.evidence("advanced-history",{bulkAtomic:true,fallBackQuota:true,backup:true,
  sixPending:true,crossPaper:true,historicVisits:true});
}catch(e){throw e;}
finally{await h.finish();}
