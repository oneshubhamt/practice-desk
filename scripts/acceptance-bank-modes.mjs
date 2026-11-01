/** Modern bank/edition/untimed acceptance, replacing historical Pass30 screenshots.
 * No screenshots by default; current-app assertions at real file:// 1366/390/195px.
 */
import {openHarness,starterBank,check,records,route,assertNoOverflow} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
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
