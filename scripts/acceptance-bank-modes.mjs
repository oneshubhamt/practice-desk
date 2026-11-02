/** Modern bank/edition/untimed acceptance, replacing historical Pass30 screenshots.
 * No screenshots by default; current-app assertions at real file:// 1366/390/195px.
 */
import {openHarness,starterBank,check,records,route,assertNoOverflow} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {readFile} from "node:fs/promises";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const scenes=[];
for(const v of [
 {name:"laptop1366",width:1366,height:768},
 {name:"phone390",width:390,height:844},
 {name:"narrow195",width:195,height:844}
]){
 const {page,context,errors}=await h.open({viewport:{width:v.width,height:v.height}});
 try{
  const starter=page.waitForEvent("download");
  await page.locator("#g-bank-template").click();
  const download=await starter;
  check(download.suggestedFilename()==="Practice_Desk_APFC_NAT_Starter.json",
   v.name+" offline APFC/NAT template changed");
  check(await page.locator('#g-edition select').count()===0,
   v.name+" edition unexpectedly regressed to dropdown");
  for(const edition of ["reviewed","source"]){
   await page.locator('[data-edition="'+edition+'"]').click();
   check(await page.locator('[data-edition="'+edition+'"]').getAttribute("aria-pressed")==="true",
    v.name+" edition pressed state lost "+edition);
   const visible=await page.locator("#g-papers option").evaluateAll(xs=>xs
    .map(el=>el.value).filter(id=>id.includes("cgl-")));
   check(visible.length===5&&visible.every(id=>id.includes(edition)),
    v.name+" edition selector mixed published/source revisions "+JSON.stringify(visible));
  }
  await page.locator('[data-edition="reviewed"]').click();
  const cgl=await page.locator("#g-papers option").evaluateAll(xs=>
   xs.find(el=>el.value.includes("cgl-2026-09-30")&&el.value.includes("reviewed"))?.value??"");
  check(Boolean(cgl),v.name+" reviewed CGL missing");
  await chooseModernPaper(page,cgl);
  if(v.name==="laptop1366"){
   check(await page.locator("#g-preflight").count()===1&&
     await page.locator("#g-exam-rules").count()===1,
    "active CGL must show a selected-scoring preview and operative rules");
   check((await page.locator(".app-independent-footer").innerText()).includes("Not affiliated"),
    "independent educational attribution missing from Library");
   await page.locator('[data-mode="strict"]').click();
   const strict=(await page.locator("#g-preflight").innerText());
   check(strict.includes("200.00")&&strict.includes("Correct +2")&&
     strict.includes("Incorrect -0.5")&&strict.includes("not official SSC answer keys")&&
     strict.includes("reviewed changes"),
    "strict CGL selected policy/max/provenance must be truthful");
   await page.locator("#g-exam-rules summary").click();
   const strictHelp=await page.locator("#g-exam-rules").innerText();
   check(["Unused minutes do not carry","15 min","A–D","backup"].every(x=>strictHelp.includes(x)),
    "strict rules omit consequential timer, shortcuts or offline backup");
   await page.locator('[data-mode="single"]').click();
   check((await page.locator("#g-preflight").innerText()).includes("50.00"),
    "single-section maximum must be 50");
   await page.locator('[data-mode="free"]').click();
   await page.locator("#g-exam-rules summary").click();
   const freeHelp=await page.locator("#g-exam-rules").innerText();
   check(freeHelp.includes("One shared 60 min paper timer")&&
     freeHelp.includes("Pause control is available"),
    "flexible CGL rules must describe actual shared timer and pause");
   await page.locator('[data-edition="source"]').click();
   const sourcePreflight=await page.locator("#g-preflight").innerText();
   check(sourcePreflight.includes("publisher-provided")&&sourcePreflight.includes("excluded"),
    "original-source preview must disclose publisher provenance and excluded items");
   await page.locator('[data-edition="reviewed"]').click();
   await chooseModernPaper(page,cgl);
  }
  await page.locator("#g-untimed").check();
  await page.reload({waitUntil:"load"});
  check(await page.locator("#g-untimed").isChecked(),v.name+" untimed preference lost on reload");
  check(await page.locator('[data-edition="reviewed"]').getAttribute("aria-pressed")==="true",
   v.name+" reviewed edition lost on reload");
  await chooseModernPaper(page,cgl);
  if(v.name==="narrow195"){
   await page.locator("#displayTrigger").click();
   for(let i=0;i<8;i++)await page.locator("#fontMore").click();
   check(await page.locator("#fontReset").innerText()==="140%",
    "140% narrow text scaling unavailable");
   await page.locator("#displayClose").click();
   await assertNoOverflow(page,v.name+" zoom-equivalent Library at 140%");
   // Run exam, Results and imported APFC/NAT at *both* 195px viewport
   // and 140% in-app text scaling; the previously failing case is now a gate.
  }
  for(const mode of ["strict","free","single"]){
   await page.locator('[data-mode="'+mode+'"]').click();
   if(mode==="single")await page.locator("#g-single-section").selectOption("2");
   check((await page.locator(".paper-preview .preview-metrics").innerText()).includes("Untimed"),
    v.name+" "+mode+" preview did not expose untimed policy");
   await page.locator("#g-start").click();await route(page,"exam");
   check(await page.locator("#g-timer").innerText()==="Untimed",
    v.name+" "+mode+" still has a countdown");
   check(await page.locator(".exam-time-progress").count()===0||
    !(await page.locator(".exam-time-progress").innerText()).includes("remaining"),
    v.name+" "+mode+" misleading countdown");
   await assertNoOverflow(page,v.name+" "+mode+" exam");
   if(mode==="strict"){
    check(await page.locator('[data-section="1"]').isDisabled(),
     v.name+" strict section lock bypassed");
    await page.locator("#g-submit").click();
    check(await page.locator('[data-section="1"]').getAttribute("aria-current")==="step",
     v.name+" strict section did not advance");
   }else{
    await page.locator("#g-submit").click();await route(page,"result");
    check(await page.locator(".score.standout").count()===1,
     v.name+" "+mode+" did not score");
    await assertNoOverflow(page,v.name+" "+mode+" Results at "+(v.name==="narrow195"?"140%":"100%")+" text");
   }
   await page.locator("#g-library").click();await route(page,"library");
   await chooseModernPaper(page,cgl);
  }
  await page.locator("#g-untimed").uncheck();
  await page.locator('[data-mode="free"]').click();
  check((await page.locator(".paper-preview .preview-metrics").innerText()).includes("60 minutes"),
   v.name+" timed policy not restored");
  const bank=await starterBank();
  if(v.name==="laptop1366"){
   const before=(await records(page)).filter(x=>x.recordType==="generic-package").length;
   const hostile=structuredClone(bank);
   hostile.questions[0].question="X".repeat(20001);
   await page.locator("#g-file").setInputFiles({name:"oversized-bank.json",
     mimeType:"application/json",buffer:Buffer.from(JSON.stringify(hostile))});
   check((await page.locator(".generic-warning").allTextContents()).some(x=>
     /20,000 characters|up to .* characters|Invalid/.test(x)),
     "Oversized imported question must produce visible rejection");
   check((await records(page)).filter(x=>x.recordType==="generic-package").length===before,
     "Rejected bank must not modify saved package records");
  }
  await page.locator("#g-file").setInputFiles({name:"apfc-nat.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(bank))});
  await page.waitForFunction(()=>document.querySelector("#g-papers")?.value==="bank:apfc-starter-demo:paper:r1");
  check(await page.locator("#g-papers optgroup").evaluateAll(xs=>
   xs.some(x=>x.label==="Imported / custom examinations"&&
    [...x.querySelectorAll("option")].some(o=>o.value.startsWith("bank:apfc-starter-demo")))),
   v.name+" imported exam not independently grouped");
  await page.locator("#g-start").click();await route(page,"exam");
  check((await page.locator(".exam-question").innerText()).includes("EPFO APFC"),
   v.name+" authored MCQ missing");
  await page.locator("input[data-choice]").first().click();
  await page.locator('[data-section="2"]').click();
  check(await page.locator("#g-number").count()===1,v.name+" NAT control missing");
  await page.locator("#g-number").fill("4");await page.locator("#g-save").click();
  await page.locator("#g-submit").click();await route(page,"result");
  check(await page.locator(".score.standout").count()===1,
   v.name+" APFC authored result missing");
  const apfcAttempt=(await records(page)).find(x=>x.recordType==="generic-attempt"&&
   x.frozen.paper.paperId==="bank:apfc-starter-demo"&&x.result?.items.length===3);
  check(Boolean(apfcAttempt),v.name+" bank did not freeze three questions");
  check(Math.abs(apfcAttempt.result.snapshot.earnedMarks-5)<1e-8,
   v.name+" exact APFC/NAT +2.5×2 and blank-0 score must equal 5/7.5");
  await assertNoOverflow(page,v.name+" APFC/NAT Results at "+(v.name==="narrow195"?"140%":"100%")+" text");
  await page.locator("#g-library").click();await route(page,"library");
  check(await page.locator("#g-family").inputValue()==="imported:upsc-epfo-apfc",
    v.name+" imported APFC family not selected");
  check((await page.locator(".family-provenance").innerText()).includes("not an official"),
    v.name+" imported content not labelled user supplied");
  const six=(await import("../tests/fixtures/six-kinds.mjs")).pkg;
  await page.locator("#g-file").setInputFiles({name:"six-kinds.json",
    mimeType:"application/json",buffer:Buffer.from(JSON.stringify(six))});
  await page.waitForFunction(()=>document.querySelector("#g-family")?.value==="imported:example-exam");
  check(await page.locator("#g-papers option").count()===1,
    v.name+" imported exam families mixed paper lists");
  await page.locator("#g-family").selectOption("builtin:ssc-cgl");
  check(await page.locator("#g-papers option").count()===5,
    v.name+" CGL papers mixed with imported banks");
  await page.locator('[data-mode="single"]').click();
  await page.locator("#g-single-section").selectOption("2");
  await page.locator("#g-untimed").check();
  await page.locator("#g-family").selectOption("imported:upsc-epfo-apfc");
  check(!(await page.locator("#g-untimed").isChecked()),
    v.name+" CGL untimed policy leaked to imported APFC");
  await page.locator("#g-untimed").check();
  await page.locator("#g-family").selectOption("imported:example-exam");
  check(!(await page.locator("#g-untimed").isChecked()),
    v.name+" APFC untimed policy leaked to independent six-kind exam");
  await page.locator("#g-family").selectOption("builtin:ssc-cgl");
  check(await page.locator("#g-untimed").isChecked()&&
    await page.locator('[data-mode="single"]').getAttribute("aria-pressed")==="true"&&
    await page.locator("#g-single-section").inputValue()==="2",
    v.name+" SSC CGL mode/section/untimed presets overwritten");
  await page.reload({waitUntil:"load"});
  check(await page.locator("#g-family").inputValue()==="builtin:ssc-cgl"&&
    await page.locator("#g-single-section").inputValue()==="2",
    v.name+" selected family/paper did not survive reload");
  await page.locator("#g-family").selectOption("imported:upsc-epfo-apfc");
  check(await page.locator("#g-untimed").isChecked(),
    v.name+" APFC preset did not survive reload");
  await page.locator("#g-family").selectOption("imported:example-exam");
  check(!(await page.locator("#g-untimed").isChecked()),
    v.name+" independent six-kind preset did not survive reload");
  if(v.name==="narrow195")await assertNoOverflow(page,v.name+" three exam families at 140% text");
  if(v.name==="laptop1366"){
   await page.locator("#g-family").selectOption("builtin:ssc-cgl");
   const before=(await records(page)).map(r=>r.id).sort();
   const downloadPromise=page.waitForEvent("download");
   await page.locator("#g-export-history").click();
   const archive=JSON.parse(await readFile(await (await downloadPromise).path(),"utf8"));
   check(archive.setups?.selectedFamilyId==="builtin:ssc-cgl"&&
     archive.setups.families["builtin:ssc-cgl"]?.untimed===true&&
     archive.setups.families["imported:upsc-epfo-apfc"]?.untimed===true,
     "Backup must contain all current per-family setups");
   await page.locator("#g-untimed").uncheck();
   await page.locator("#g-history-file").setInputFiles({name:"family-backup.json",
     mimeType:"application/json",buffer:Buffer.from(JSON.stringify(archive))});
   await page.waitForFunction(()=>document.querySelector("#g-untimed")?.checked===true);
   check(await page.locator("#g-family").inputValue()==="builtin:ssc-cgl"&&
     (await records(page)).map(r=>r.id).sort().join("|")===before.join("|"),
     "Backup preferences must restore without overwriting or duplicating records");
  }
  if(v.name==="laptop1366"){
   await page.evaluate(()=>{
     const key="practiceDesk.overhaul.setups.v2";
     const data=JSON.parse(localStorage.getItem(key));
     data.selectedFamilyId="imported:unavailable";
     data.families["imported:unavailable"]={paperRevisionId:"missing-revision",
       mode:"strict",section:0,untimed:false,edition:"reviewed"};
     localStorage.setItem(key,JSON.stringify(data));
   });
   await page.reload({waitUntil:"load"});
   check(await page.locator("#g-start").isDisabled()&&
     await page.locator("#g-family").inputValue()==="imported:unavailable"&&
     (await page.locator(".generic-warning").allTextContents()).some(t=>t.includes("unavailable")),
     "Absent saved family/paper must block Start with actionable warning");
   await page.locator("#g-family").selectOption("builtin:ssc-cgl");
   check(await page.locator("#g-start").isEnabled()&&
     await page.locator("#g-untimed").isChecked(),
     "Explicit family choice must recover intact CGL preferences");
  }
  // P44: Custom composition builds only from the selected source revision.
  if(v.name==="laptop1366"||v.name==="narrow195"){
   await page.locator("#g-family").selectOption("imported:upsc-epfo-apfc");
   await page.locator("#g-compose-details summary").click();
   await page.locator("#g-compose-count").fill("4");
   await page.locator("#g-compose-seed").fill("p44-repeatable");
   await page.locator("#g-compose-preview").click();
   check((await page.locator("#g-compose").innerText()).includes("Only 3 eligible"),
     v.name+" insufficient-inventory response was not explicit");
   await page.locator("#g-compose-count").fill("2");
   await page.locator("#g-compose-preview").click();
   check((await page.locator(".compose-preview").innerText()).includes("2 selected from 3 eligible"),
     v.name+" custom draw count/available preview missing");
   check(!(await page.locator("#g-compose").innerText()).includes("First option"),
     v.name+" composer leaked a key/answer before starting");
   await assertNoOverflow(page,v.name+" open custom builder");
   if(v.name==="laptop1366"){
    await page.locator("#g-compose-start").click();await route(page,"exam");
    await page.waitForFunction(async()=>{
      const db=await new Promise((resolve,reject)=>{
        const r=indexedDB.open("practiceDesk.overhaul.v1",1);
        r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
      });
      try{
        const rows=await new Promise((resolve,reject)=>{
          const tx=db.transaction("attempts","readonly");
          const r=tx.objectStore("attempts").getAll();
          r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
        });
        return rows.some(x=>x.recordType==="generic-attempt"&&
          x.practiceComposition?.seed==="p44-repeatable");
      }finally{db.close();}
    });
    const active=(await records(page)).find(x=>x.recordType==="generic-attempt"&&
      x.practiceComposition?.seed==="p44-repeatable");
    check(Boolean(active)&&active.frozen.questions.length===2&&
      active.frozen.key.entries.length===2&&active.practiceComposition.eligibleCount===3,
      "Custom draw did not freeze exactly two source-linked questions and keys");
    await page.locator("#g-submit").click();await route(page,"result");
    await page.locator(".result-scoring-details summary").click();
    check((await page.locator(".result-scoring-details").innerText()).includes("p44-repeatable"),
      "Completed result lacks source/seed provenance");
    const finished=(await records(page)).find(x=>x.id===active.id);
    check(finished.finishedAt!==null&&finished.result.items.length===2,
      "Custom result did not score the exact frozen two-question subset");
    await page.locator("#g-library").click();await route(page,"library");
    const downloaded=page.waitForEvent("download");
    await page.locator("#g-export-history").click();
    const backup=JSON.parse(await readFile(await (await downloaded).path(),"utf8"));
    check(backup.records.some(x=>x.id===active.id&&
      x.practiceComposition?.contentHash===active.practiceComposition.contentHash),
      "Portable checksum backup omitted custom selection manifest");
    const imported=await h.open();
    await imported.page.locator("#g-history-file").setInputFiles({
      name:"practice-p44.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(backup))
    });
    await imported.page.waitForFunction(id=>document.querySelector('[data-attempt="'+id+'"]'),active.id);
    const portable=(await records(imported.page)).find(x=>x.id===active.id);
    check(portable?.finishedAt!==null&&portable.frozen.questions.length===2,
      "Other offline browser profile did not restore frozen custom exam score");
    await imported.context.close();
    // Remove the imported source package, but never the frozen result.
    await page.evaluate(async paperId=>{
      const db=await new Promise((resolve,reject)=>{
        const open=indexedDB.open("practiceDesk.overhaul.v1",1);
        open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
      });
      await new Promise((resolve,reject)=>{
        const tx=db.transaction("attempts","readwrite");
        tx.objectStore("attempts").delete("generic-package:"+paperId);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
      db.close();
    },"bank:apfc-starter-demo:paper:r1");
    await page.reload({waitUntil:"load"});
    await page.locator("#g-history").click();await route(page,"history");
    await page.locator('[data-attempt="'+active.id+'"]').first().click();await route(page,"result");
    check((await page.locator(".result-scoring-details").count())===1,
      "Deleting source bank made frozen custom result unavailable");
   }
  }
  check(errors.length===0,v.name+" uncaught browser errors "+errors.join("; "));
  scenes.push({viewport:v.name,editions:2,modes:3,untimedReload:true,
   template:true,apfcMcqNat:true,screenComparison:false});
  console.log("MODERN BANK/MODES PASS "+v.name+" editions, untimed all modes, APFC/NAT");
 }catch(e){await h.diagnose("bank-"+v.name,page,e);throw e;}
 finally{await context.close();}
}
try{
 await h.evidence("bank-modes-summary",{scenes,claim:"current-app behavioural contract only"});
 console.log("MODERN BANK/MODES COMPLETE "+scenes.length+" viewports; no routine screenshots");
}finally{await h.finish();}
