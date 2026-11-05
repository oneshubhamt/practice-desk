/** P58-A red-before-green, actual offline file:// integrity probes.
 * Independent cases report all failures rather than hiding later regressions.
 * The baseline is expected to FAIL these assertions before source repairs.
 */
import {openHarness,offlineUrl,route,check,records} from "./browser/fixtures.mjs";
import {readFile} from "node:fs/promises";

const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/p58a-integrity"});
const failures=[];
const run=async(name,fn)=>{
 let page=null;
 try{page=await fn();console.log("P58-A "+engine+" "+name+" PASS");}
 catch(error){
  failures.push(name+": "+String(error));
  console.error("P58-A "+engine+" "+name+" RED: "+String(error));
  if(page)await h.diagnose("p58a-"+name+"-"+engine,page,error);
 }
};

async function readStoredRow(page,id){
 return page.evaluate(async id=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open("practiceDesk.shared.v1",1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readonly");
    const req=tx.objectStore("attempts").get(id);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
  }finally{db.close();}
 },id);
}

await run("F01-AI-renamed-draft-QA",async()=>{
 const {page}=await h.open();
 const source=JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
 source.questions[2].answer="B"; // A documented arithmetic/key mismatch, not a malformed draft.
 await page.locator("#g-author-open").click();
 await page.locator("#pd-stage-input").setInputFiles({
  name:"p58a-ai-source.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(source))
 });
 await page.locator("#pd-stage-handoff").click();
 await page.waitForFunction(()=>document.querySelector("#pd-author-drafts")?.value.startsWith("stage:"));
 await page.locator("#pd-author-close").click();
 // Deliberately modify only the authoring draft ID. Provenance, source text,
 // question content, and AI-review flags are unchanged.
 const renamed=await page.evaluate(()=>{
  const key="practiceDesk.authoring.drafts.v1";
  const shelf=JSON.parse(localStorage.getItem(key));
  const id="independently-imported-draft-no-stage-prefix";
  shelf.drafts=shelf.drafts.map(d=>d.id===shelf.activeId?{...d,id}:d);
  shelf.activeId=id;localStorage.setItem(key,JSON.stringify(shelf));
  return id;
 });
 await page.reload({waitUntil:"load"});
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-drafts").waitFor({state:"visible"});
 check(await page.locator("#pd-author-drafts").inputValue()===renamed,
  engine+" source identity rename was not loaded");
 await page.locator("#pd-author-validate").click();
 const report=await page.locator("#pd-author-validation").innerText();
 check(report.includes("math-answer-conflict"),
  engine+" F01 renamed imported AI draft bypassed deterministic key QA: "+report.slice(0,400));
 check(await page.locator("#pd-author-accept-warnings").count()===1,
  engine+" F01 AI trust path depends on a mutable draft ID prefix");
 return page;
});

await run("F02-corrupt-snapshot-normal-save",async()=>{
 const {page,context}=await h.open();
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator("#g-save").click();
 await page.waitForFunction(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open("practiceDesk.shared.v1",1);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readonly");
    const r=tx.objectStore("attempts").getAll();
    r.onsuccess=()=>resolve(r.result.some(x=>x.recordType==="generic-attempt"));
    r.onerror=()=>reject(r.error);
   });
  }finally{db.close();}
 });
 const raw=(await records(page,"attempts")).find(x=>x.recordType==="generic-attempt");
 const source=(await records(page,"snapshots"));
 check(Boolean(raw)&&source.length>0,engine+" F02 cannot establish saved source");
 const row=await readStoredRow(page,raw.id);
 const snapshot=source.find(s=>s.id===row.frozenRef);
 check(Boolean(snapshot),engine+" F02 frozenRef not in snapshot store");
 const corrupted=structuredClone(snapshot);
 corrupted.body.paper.revision+=1; // content no longer matches content-addressed ID.
 const other=await context.newPage();
 await other.goto(offlineUrl,{waitUntil:"load"});
 await other.evaluate(async snapshot=>{
  const db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open("practiceDesk.shared.v1",1);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try{
   await new Promise((resolve,reject)=>{
    const tx=db.transaction("snapshots","readwrite");
    tx.objectStore("snapshots").put(snapshot);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
   });
  }finally{db.close();}
 },corrupted);
 await other.close();
 // Tab A hydrated a GOOD snapshot before tab B corrupted the persisted bytes.
 await page.locator("#g-save").click();
 await page.waitForFunction(async({id,revision})=>{
  const msg=document.querySelector("#app")?.textContent??"";
  if(/SAVE FAILED|SHA-256 mismatch|Storage locked/i.test(msg))return true;
  const db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open("practiceDesk.shared.v1",1);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readonly");
    const r=tx.objectStore("attempts").get(id);
    r.onsuccess=()=>resolve((r.result?.saveRevision??0)>revision);
    r.onerror=()=>reject(r.error);
   });
  }finally{db.close();}
 },{id:row.id,revision:row.saveRevision??0},{timeout:15000});
 const afterward=await readStoredRow(page,row.id);
 const msg=await page.locator("#app").innerText();
 check(afterward.saveRevision===row.saveRevision,
  engine+" F02 corrupted same-ID snapshot was reused by ordinary save");
 check(/SAVE FAILED|SHA-256 mismatch/i.test(msg),
  engine+" F02 corruption rejected without visible failure notice");
 const afterSnapshot=(await records(page,"snapshots")).find(s=>s.id===snapshot.id);
 check(afterSnapshot?.body.paper.revision===corrupted.body.paper.revision,
  engine+" F02 corrupted snapshot was overwritten/quietly repaired");
 return page;
});

await run("F07-two-tab-unpublished-draft-conflict",async()=>{
 const {page,context}=await h.open();
 await page.locator("#g-author-open").click();
 await page.locator(".pd-author-paper-settings summary").click();
 await page.locator("#pd-author-title").fill("Initial published-never draft");
 await page.locator("#pd-author-title").blur();
 const second=await context.newPage();
 await second.goto(offlineUrl,{waitUntil:"load"});
 await second.locator("#g-author-open").click();
 await second.locator(".pd-author-paper-settings summary").click();
 await page.locator("#pd-author-title").fill("Tab A authoritative edit");
 await page.locator("#pd-author-title").blur();
 await second.locator("#pd-author-title").fill("Tab B divergent unsaved edit");
 await second.locator("#pd-author-title").blur();
 const stored=await page.evaluate(()=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts.v1"));
  return shelf.drafts.find(d=>d.id===shelf.activeId)?.title;
 });
 const message=await second.locator("#pd-author-status").innerText();
 check(stored==="Tab A authoritative edit",
  engine+" F07 stale tab overwrote another tab's unpublished draft: "+stored);
 check(/another tab|conflict|changed elsewhere/i.test(message),
  engine+" F07 no visible conflict after stale draft save: "+message);
 check(await second.locator("#pd-author-title").inputValue()==="Tab B divergent unsaved edit",
  engine+" F07 unsaved local edit lost before export");
 await second.close();
 return page;
});

await h.finish();
if(failures.length)throw Error("P58-A EXPECTED RED on unfixed source ("+engine+"):\n"+failures.join("\n"));
console.log("P58-A "+engine+" GREEN: renamed AI QA, immutable SHA normal save, two-tab draft isolation");
