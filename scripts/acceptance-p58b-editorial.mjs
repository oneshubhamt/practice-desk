/** P58-B real file:// editorial acceptance: staging, citations, source exchange,
 * iterative selection, lossless fresh import and separately recoverable backups.
 */
import {openHarness,route,check,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {readFile} from "node:fs/promises";
import {captureVisualEvidence} from "./browser/visual-evidence.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/p58b-editorial"});
const {page,errors}=await h.open({viewport:{width:1280,height:850}});
const source=JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
async function download(button){
 const pending=page.waitForEvent("download");
 await page.locator(button).click();
 return JSON.parse(await readFile(await (await pending).path(),"utf8"));
}
async function evidence(){
 const details=page.locator("#pd-author-evidence");
 if(!(await details.evaluate(el=>el.open)))await details.locator("summary").click();
}
async function sourceField(index,field,value){
 await evidence();
 const node=page.locator('[data-author-source-index="'+index+'"][data-author-source-field="'+field+'"]');
 if(field==="stance")await node.selectOption(value);
 else{await node.fill(value);await node.blur();}
}
try{
 await page.locator("#g-author-open").click();
 check(await page.locator("#pd-stage-archive-import").count()===1,
   engine+" unpublished staged-source recovery is unavailable");
 await page.locator("#pd-stage-input").setInputFiles({
  name:"p58b-batch.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(source))
 });
 await page.waitForFunction(()=>document.querySelectorAll("[data-stage-key]").length===3);
 const stageBacked=await download("#pd-stage-archive-export");
 check(stageBacked.format==="practice-desk-staging-archive"&&
  stageBacked.workspace.files.length===1&&stageBacked.workspace.selected.length===3,
  engine+" staged-source backup lost original AI content or selection");
 await page.locator("#pd-stage-clear").click();
 await page.locator("#pd-stage-archive-file").setInputFiles({
  name:"recovered-staging.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(stageBacked))
 });
 await page.waitForFunction(()=>document.querySelectorAll("[data-stage-key]").length===3);
 const keys=await page.locator("[data-stage-key]").evaluateAll(nodes=>
  nodes.map(node=>node.getAttribute("data-stage-key")));
 await page.locator(".pd-stage-question-detail").first().locator("summary").click();
 check((await page.locator(".pd-stage-question-detail").first().innerText()).includes("source corroborated"),
  engine+" staged per-question QA checks missing");
 await page.locator('[data-stage-triage-decision="'+keys[0]+'"]').selectOption("distinct");
 await page.locator('[data-stage-triage-note="'+keys[0]+'"]').fill("Checked wording manually; no original publisher was contacted.");
 await page.locator('[data-stage-triage-reviewer="'+keys[0]+'"]').fill("Reviewer claimed by author");
 await page.locator('[data-stage-triage-save="'+keys[0]+'"]').click();
 await page.waitForFunction(key=>{
  const state=JSON.parse(localStorage.getItem("practiceDesk.authoring.staging")??"null");
  return state?.triage?.some(x=>x.key===key&&x.decision==="distinct");
 },keys[0]);
 await page.locator("#pd-stage-handoff").click();
 await page.waitForFunction(()=>document.querySelector("#pd-author-drafts")?.value.startsWith("stage:"));
 const firstId=await page.locator("#pd-author-drafts").inputValue();
 const firstShelf=await page.evaluate(()=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts"));
  return shelf.drafts.find(x=>x.id===shelf.activeId);
 });
 check(firstShelf.questions[0].qa?.review?.note?.includes("author decision distinct"),
  engine+" claimed stage triage vanished on Wordgard handoff");
 await page.locator("#pd-author-source").fill("Original fork edit — preserve me");
 await page.locator("#pd-author-source").blur();
 await page.locator('[data-stage-key="'+keys[0]+'"]').uncheck();
 await page.locator("#pd-stage-handoff").click();
 await page.waitForFunction(id=>document.querySelector("#pd-author-drafts")?.value.startsWith("stage:")&&
  document.querySelector("#pd-author-drafts").value!==id,firstId);
 const nextId=await page.locator("#pd-author-drafts").inputValue();
 check(nextId!==firstId,engine+" changing the selected questions overwrote a prior draft");
 const preserved=await page.evaluate(id=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts"));
  return shelf.drafts.find(d=>d.id===id)?.questions[0]?.source;
 },firstId);
 check(preserved==="Original fork edit — preserve me",
  engine+" previous Wordgard corrections disappeared after second staged handoff");

 await evidence();
 await page.locator("#pd-author-source-new-publisher").fill("Government office (author claim)");
 await page.locator("#pd-author-source-new-title").fill("Illustrative primary-source document");
 await page.locator("#pd-author-source-add").click();
 await page.waitForFunction(()=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts"));
  return shelf.drafts.find(d=>d.id===shelf.activeId)?.questions[0]?.provenance?.sources?.length===1;
 });
 await sourceField(0,"url","http://untrusted.invalid/plaintext");
 check((await page.locator("#pd-author-status").innerText()).includes("NOT saved"),
  engine+" malformed source URL was silently accepted");
 const invalidStored=await page.evaluate(()=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts"));
  return shelf.drafts.find(d=>d.id===shelf.activeId)?.questions[0]?.provenance?.sources?.[0]?.url;
 });
 check(!invalidStored,engine+" invalid source URL entered authoritative saved draft");
 await sourceField(0,"url","https://example.gov.in/notice.pdf");
 await sourceField(0,"publicationDate","2026-02-30");
 check((await page.locator("#pd-author-status").innerText()).includes("NOT saved"),
  engine+" impossible calendar date was silently accepted");
 await sourceField(0,"publicationDate","2026-01-02");
 await sourceField(0,"asOfDate","2026-11-05");
 await sourceField(0,"section","Chapter II");
 await sourceField(0,"page","12");
 await sourceField(0,"provision","Section 4");
 await sourceField(0,"stance","supports");

 await evidence();
 await page.locator("#pd-author-source-new-publisher").fill("Secondary source (author claim)");
 await page.locator("#pd-author-source-new-title").fill("Disputed reference");
 await page.locator("#pd-author-source-add").click();
 await sourceField(1,"stance","disputes");
 await page.locator("#pd-author-validate").click();
 const validation=await page.locator("#pd-author-validation").innerText();
 check(validation.includes("source-disagreement")&&validation.includes("0 errors"),
   engine+" corrected source disagreement was hidden or counted as authenticated: "+validation.slice(0,500));

 // Targeted actual Wordgard evidence UI at the narrow 195px + 140% setting.
 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8&&await page.locator("#fontMore").isEnabled();i++)await page.locator("#fontMore").click();
 check(!(await page.locator("#fontMore").isEnabled()),engine+" display scale did not reach 140% cap");
 await page.locator("#displayClose").click();
 await assertNoOverflow(page,engine+" P58-B Wordgard evidence editor 195px/140%");
 await captureVisualEvidence(page,"artifacts/p58b-editorial/"+engine+"-source-evidence-195.png",{fullPage:true});
 await page.setViewportSize({width:1280,height:850});

 // Per-draft exchange is distinct from AI source v1; every field round-trips.
 const exchange=await download("#pd-author-exchange");
 check(exchange.format==="practice-desk-draft-exchange"&&exchange.version===1&&
  exchange.draft.id===nextId&&exchange.draft.questions[0].sourceOrigin.bankId===source.bankId&&
  exchange.draft.questions[0].provenance.sources[0].asOfDate==="2026-11-05",
  engine+" versioned exchange lost original source identity or edited evidence");
 const allDrafts=await download("#pd-author-shelf-export");
 check(allDrafts.format==="practice-desk-draft-shelf-archive"&&
  allDrafts.shelf.drafts.some(x=>x.id===firstId)&&allDrafts.shelf.drafts.some(x=>x.id===nextId),
  engine+" full unpublished draft backup omitted an earlier correction");

 const fresh=await h.open({viewport:{width:1280,height:850}});
 await fresh.page.locator("#g-author-open").click();
 await fresh.page.locator("#pd-author-import-file").setInputFiles({
  name:"p58b-exchange.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(exchange))
 });
 await fresh.page.waitForFunction(id=>document.querySelector("#pd-author-drafts")?.value===id,nextId);
 const imported=await fresh.page.evaluate(id=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts"));
  return shelf.drafts.find(x=>x.id===id);
 },nextId);
 check(JSON.stringify(imported)===JSON.stringify(exchange.draft),
  engine+" fresh offline browser did not losslessly reimport edited source/key/citations/media/policy");
 // Malformed shelf recovery fails closed without replacing the existing active draft.
 const invalid={...allDrafts,extraField:true};
 await fresh.page.locator("#pd-author-shelf-file").setInputFiles({
  name:"bad-shelf.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(invalid))
 });
 // File.text() and the input change handler are asynchronous in WebKit;
 // wait for the *same* visible fail-closed message rather than reading too early.
 await fresh.page.locator("#pd-author-status").filter({hasText:"NOT restored"})
  .waitFor({state:"visible"});
 check((await fresh.page.locator("#pd-author-status").innerText()).includes("NOT restored"),
  engine+" unsafe draft shelf import did not visibly fail");
 check(await fresh.page.locator("#pd-author-drafts").inputValue()===nextId,
  engine+" invalid archive changed active draft");
 await fresh.page.locator("#pd-author-shelf-file").setInputFiles({
  name:"p58b-full-shelf.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(allDrafts))
 });
 await fresh.page.waitForFunction(id=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts")??"null");
  return shelf?.drafts?.some(x=>x.id===id);
 },firstId);
 check(await fresh.page.locator("#pd-author-drafts").inputValue()===nextId,
  engine+" restore unexpectedly selected a different edited draft");

 await page.locator("#pd-author-confirm").check();
 await page.locator("#pd-author-accept-warnings").check();
 await page.locator("#pd-author-publish").click();
 const publishedId="authored:"+source.examId+":"+source.paperId+":r"+source.revision+":custom";
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,publishedId);
 const persisted=(await records(page)).find(x=>x.recordType==="generic-package"&&x.bundle?.paper.id===publishedId);
 check(Boolean(persisted)&&persisted.bundle.questions.length===2,
  engine+" changed selection published wrong question count");
 const editorial=persisted.bundle.questions[0].editorial;
 check(editorial.status==="caution"&&
  ["Government office","2026-01-02","2026-11-05","Chapter II","page 12","Section 4","stance supports"]
   .every(value=>editorial.notes.includes(value)),
  engine+" author citations were dropped or improperly certified at immutable publication");

 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8&&await page.locator("#fontMore").isEnabled();i++)await page.locator("#fontMore").click();
 check(!(await page.locator("#fontMore").isEnabled()),engine+" display scale did not reach 140% cap");
 await page.locator("#displayClose").click();
 await assertNoOverflow(page,engine+" P58-B published library 195px/140%");
 check(errors.length===0,engine+" source browser exceptions: "+errors.join("; "));
 check(fresh.errors.length===0,engine+" fresh browser exceptions: "+fresh.errors.join("; "));
 console.log("P58-B "+engine+" PASS: stage archive/triage, selection fork, strict citation edit, exchange fresh import, full-shelf recovery, caution publication");
}catch(error){await h.diagnose("p58b-"+engine,page,error);throw error;}
finally{await h.finish();}
