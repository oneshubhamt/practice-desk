/** P54 genuine offline Wordgard author→exact preflight→six-kind preview
 * → one-section-at-a-time timer editing→publish→partial-mark exam→result.
 * Not a screenshot-only or localStorage-field-only acceptance.
 */
import {mkdir} from "node:fs/promises";
import {openHarness,route,check,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {newAuthoringDraft,newAuthoringQuestion} from "../src/authoring/authoring-draft.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const authorDialogs=[];
const {page,context,errors}=await h.open({
 viewport:{width:1280,height:850},colorScheme:"light",
 onDialog:dialog=>{
  authorDialogs.push({type:dialog.type(),message:dialog.message()});
  void dialog.accept();
 }
});
const dir="artifacts/p54-authoring";await mkdir(dir,{recursive:true});
const shot=async(label)=>page.screenshot({path:dir+"/"+engine+"-"+label+".png",animations:"disabled",fullPage:true});
const P=s=>plainRichDocument(s);
const answers=[
 ["multiple-select","A,C","Specialised"],
 ["matching","1-C,2-A,3-D,4-B","Specialised"],
 ["single-choice","B","General"],
 ["true-false","True","General"],
 ["numeric-entry","42","General"],
 ["free-response","Manual model response","General"]
];
function inputDraft(){
 const base=newAuthoringDraft();
 return {...base,examId:"apfc",paperId:"p54-browser",title:"Authentic P54 six-kind rules exercise",
  timingKind:"sectional",sectionNavigation:"sequential-locked",questionNavigation:"free",
  sectionTransition:"manual",pausePolicy:"forbidden",allowEarlySubmit:true,allowReview:true,
  questions:answers.map(([kind,answer,section],i)=>({
   ...newAuthoringQuestion(kind),kind,section,sectionMinutes:section==="General"?10:15,answer,
   prompt:P("P54 specimen "+(i+1)+" "+kind),
   options:["Choice A","Choice B","Choice C","Choice D"].map(P),
   leftItems:["Left one","Left two","Left three","Left four"].map(P),
   rightItems:["Right A","Right B","Right C","Right D"].map(P),
   explanation:P("Author-only worked solution "+(i+1)),
   ...(kind==="multiple-select"?{minSelections:2,maxSelections:3,partialCreditEach:1,partialPenaltyEach:0.5}:{}),
   ...(kind==="matching"?{partialCreditEach:0.6,partialPenaltyEach:0.1}:{})
  }))
 };
}
async function waitPersist(match){
 for(let i=0;i<65;i++){
  const list=(await records(page)).filter(x=>match(x));
  if(list.length)return list[0];
  await page.waitForTimeout(75);
 }
 throw Error("Cannot see persisted P54 record");
}
try{
 const d=inputDraft();
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-heading").waitFor({state:"visible"});
 await page.locator("#pd-author-import-file").setInputFiles({
  name:"p54-authoring-draft.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(d))
 });
 await page.waitForFunction(id=>document.querySelector("#pd-author-drafts")?.value===id,d.id);
 check(await page.locator("#pd-author-questions option").count()===6,
   engine+" imported six-kind authored draft was not loaded");
 await page.locator("#pd-author-section-manager summary").click();
 check(await page.locator("[data-author-section-timer]").count()===2,
   engine+" no consolidated section-level duration editor");
 check(await page.locator("#pd-author-duration").isDisabled()&&
   await page.locator("#pd-author-section-transition").isEnabled(),
   engine+" irrelevant whole-paper duration is editable during sectional policy");
 await page.locator('[data-author-section-timer="Specialised"]').fill("");
 await page.locator('[data-author-section-timer="Specialised"]').blur();
 check((await page.locator("#pd-author-status").innerText()).includes("Enter a section duration"),
   engine+" empty section timer silently coerced to untimed zero");
 await page.locator('[data-author-section-timer="Specialised"]').fill("16");
 await page.locator('[data-author-section-timer="Specialised"]').blur();
 check(await page.locator("#pd-author-section-minutes").inputValue()==="16",
   engine+" section manager failed to synchronise active section timer");
 const shelf=await page.evaluate(()=>{
  const data=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts.v1")??"null");
  return data?.drafts?.find(x=>x.id===data.activeId);
 });
 check(shelf?.questions?.slice(0,2).every(q=>q.sectionMinutes===16)&&
   shelf?.questions?.slice(2).every(q=>q.sectionMinutes===10),
   engine+" section-wide timer edit left inconsistent per-question metadata");
 await page.locator("#pd-author-add-question").click();
 check(await page.locator("#pd-author-questions option").count()===7,
   engine+" add question did not preserve editable section structure");
 const inherited=await page.evaluate(()=>{
   const raw=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts.v1")??"null");
   return raw?.drafts?.find(d=>d.id===raw.activeId)?.questions?.at(-1);
 });
 check(inherited?.section==="Specialised"&&inherited.sectionMinutes===16,
   engine+" newly authored question reintroduced a conflicting timer");
 await page.locator("#pd-author-delete-question").click();
 check(authorDialogs.length===1&&authorDialogs[0].type==="confirm"&&
   authorDialogs[0].message.includes("Delete this unpublished draft question"),
   engine+" did not require the real destructive-action confirmation");
 check(await page.locator("#pd-author-questions option").count()===6,
   engine+" temporary inheriting question not removed");
 await page.locator("#pd-author-validate").click();
 check((await page.locator("#pd-author-validation").innerText()).includes("Ready to publish"),
   engine+" exact six-kind authoring draft did not validate through publisher");
 await page.locator("#pd-author-preview-toggle").click();
 await page.locator("#pd-author-preview:not([hidden])").waitFor();
 check(await page.locator("#pd-author-preview .pd-author-effective-rules").count()===1,
   engine+" preview lacks compiled, effective scoring/navigation/section budget");
 const rules=await page.locator("#pd-author-preview .pd-author-effective-rules").innerText();
 check(rules.includes("16 min")&&rules.includes("10 min")&&
   rules.includes("locked in sequence")&&rules.includes("partial"),
   engine+" preview did not describe actual frozen exam rules: "+rules.slice(0,550));
 check(await page.locator("#pd-author-preview .pd-author-preview-controls[inert] input[type=checkbox]").count()===4,
   engine+" multiple-select preview does not reuse inert actual candidate controls");
 const actualPartialExample=await page.locator("#pd-author-preview .pd-author-partial-examples").innerText();
 check(actualPartialExample.includes("Select A, B, C (2 correct, 1 incorrect components)")&&
   actualPartialExample.includes("1.5 marks"),
   engine+" published scorer's 2 × 1 − 1 × 0.5 partial example differs from the actual preview: "+
    actualPartialExample.slice(0,500));
 await shot("validated-multiple-desktop");
 for(const [i,[kind]] of answers.entries()){
  await page.locator("#pd-author-questions").selectOption(d.questions[i].id);
  await page.locator("#pd-author-preview-toggle").click();
  await page.locator("#pd-author-preview:not([hidden])").waitFor();
  const within=page.locator("#pd-author-preview .pd-author-preview-controls[inert]");
  if(kind==="matching"){
   check(await within.locator('select[data-match]').count()===4,
    engine+" matching did not show true exam dropdowns");
   const content=await page.locator("#pd-author-preview").innerText();
   check(!content.includes("Left one — Right A")&&content.includes("1-C"),
    engine+" misleading positional matching preview / missing author-only answer key");
  }else if(kind==="numeric-entry")check(await within.locator("#g-number").count()===1,
   engine+" numeric preview does not use actual exam control");
  else if(kind==="true-false")check(await within.locator("[data-bool]").count()===2,
   engine+" true-false preview lacks actual controls");
  else if(kind==="free-response")check(await within.locator("#g-text").count()===1,
   engine+" written preview missing actual textbox");
  else check(await within.locator("[data-choice]").count()===4,
   engine+" option-kind preview missing choices");
 }
 await page.setViewportSize({width:390,height:844});
 await assertNoOverflow(page,engine+" P54 mobile six-kind authoring");
 await shot("validated-written-phone");
 await page.setViewportSize({width:195,height:844});
 await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
 await assertNoOverflow(page,engine+" P54 195px at 140% authoring and real preview");
 await shot("validated-written-195px");
 await page.evaluate(()=>document.documentElement.style.removeProperty("--type-scale"));
 await page.setViewportSize({width:1280,height:850});
 await page.locator("#pd-author-confirm").check();
 await page.locator("#pd-author-publish").click();
 await page.locator("#g-papers").waitFor({state:"visible"});
 const id="authored:apfc:p54-browser:r1:custom";
 await page.waitForFunction(expected=>document.querySelector("#g-papers")?.value===expected,id);
 const saved=await waitPersist(x=>x.recordType==="generic-package"&&x.bundle?.paper?.id===id);
 check(saved.bundle.paper.sections.length===2&&
   saved.bundle.paper.timing.kind==="sectional"&&
   saved.bundle.paper.timing.sectionLimits[0].durationMs===960000,
   engine+" committed paper differs from preflight timers");
 check(saved.bundle.answerKey.entries[0].scoringOverride.partialCredit.marksPerCorrectComponent===1,
   engine+" source-pinned multi partial credit policy lost at publication");
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator('input[data-choice="A"]').check();
 await page.locator('input[data-choice="B"]').check();
 await page.locator("#g-next").click();
 for(const [left,right] of [["L1","A"],["L2","C"],["L3","D"],["L4","B"]])
  await page.locator('select[data-match="'+left+'"]').selectOption(right);
 await page.locator("#g-save").click();
 await page.locator("#g-submit").click();
 await page.waitForFunction(()=>document.querySelector(".exam-header")?.textContent?.includes("General"),null,{timeout:6000});
 await page.locator("#g-submit").click();await route(page,"result");
 const result=await waitPersist(x=>x.recordType==="generic-attempt"&&x.packageId===id&&x.finishedAt);
 check(result.result.snapshot.incorrectCount===2&&
   Math.abs(result.result.snapshot.earnedMarks-1.5)<1e-9&&
   result.result.items[0].marks===0.5&&
   Math.abs(result.result.items[1].marks-1)<1e-9,
   engine+" real exam did not apply the actual two partial-credit policies: "+
    JSON.stringify(result.result.items.slice(0,2)));
 await page.locator("#result-tab-review").click();
 check(await page.locator(".generic-review").count()===6,
   engine+" authorised detailed review of six-kind finished paper missing");
 await page.reload({waitUntil:"load"});
 await page.locator("#result-tab-review").waitFor({state:"visible"});
 check(errors.length===0,engine+" browser errors "+errors.join("; "));
 console.log("P54 "+engine+" PASS: exact dry-run, one timer per section, true six-kind preview, published policy and partial-score/review/reload");
}catch(error){await h.diagnose("p54-"+engine,page,error);throw error;}
finally{await context.close();await h.finish();}
