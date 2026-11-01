/** Current-source editorial and media integrity in a real offline browser.
 * Test all 10 edition/scores, the disputed 6 October Q62, original-v-reviewed
 * media and editorial labels, older saved-source compatibility and an authored
 * six-kind source/review pair. No historic v11 screenshot equality.
 */
import {readFile} from "node:fs/promises";
import {openHarness,check,records,route} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
import {builtinCglPackages} from "../src/app/exam-package.ts";
import {scoreableMaximum} from "../src/engine/score-ceiling.ts";
import {createSourceReviewReference} from "../src/engine/review-source.ts";
import {questionRevisionHash,answerKeyRevisionHash,paperRevisionHash} from "../src/domain/integrity.ts";
const source=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const editions=builtinCglPackages(source,patches,solutions);
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const {page,errors,context}=await h.open();
async function finishNow(){
 await page.locator("#g-submit").click();await route(page,"result");
}
async function chooseEdition(p){
 await chooseModernPaper(page,p.paper.id);
 await page.locator('[data-mode="free"]').click();
}
async function persisted(id,pred=()=>true){
 for(let n=0;n<50;n++){
  const record=(await records(page)).find(x=>x.id===id);
  if(record&&pred(record))return record;
  await page.waitForTimeout(75);
 }
 throw Error("Missing committed frozen record "+id);
}

function genericVariant(edition,revised=false){
 const questions=pkg.questions.map((base,i)=>{
  const q=structuredClone(base);
  if(!revised||i!==0)return q;
  const content={...q.content,prompt:"Reviewed clinical intervention",
   options:q.content.options.map((o,j)=>j===0?{...o,text:"Revised intervention label"}:o)};
  const editorial={...q.editorial,status:"corrected",notes:"Reviewed topic guidance"};
  const changed={...q,id:q.id+":reviewed",revision:2,content,editorial};
  return {...changed,contentHash:questionRevisionHash(changed)};
 });
 const ids=new Map(questions.map((q,i)=>[pkg.questions[i].id,q.id]));
 const entries=pkg.answerKey.entries.map(e=>({...e,questionRevisionId:ids.get(e.questionRevisionId)}));
 const answerKey={...pkg.answerKey,id:"six-key-"+edition,entries,contentHash:answerKeyRevisionHash({entries})};
 const sections=pkg.paper.sections.map(s=>({...s,
  questionRevisionIds:s.questionRevisionIds.map(id=>ids.get(id))}));
 const paperBase={...pkg.paper,id:"six-"+edition,edition,
  answerKeyRevisionId:answerKey.id,sections,
  scoring:{decimalPlaces:3,defaultRule:{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0},
   byQuestionKind:{"numeric-entry":{correctMarks:5,incorrectMarks:-1,unansweredMarks:0},
    "multiple-select":{correctMarks:3,incorrectMarks:-1,unansweredMarks:0}}}};
 return {...pkg,title:"Generic "+edition,questions,answerKey,
  paper:{...paperBase,contentHash:paperRevisionHash(paperBase)}};
}


try{
 const checked=[];
 for(const [paperId] of Object.entries(source)){
  for(const edition of ["source","reviewed"]){
   const p=editions.find(x=>x.paper.paperId===paperId&&x.paper.edition===edition);
   check(Boolean(p),"Missing validated edition "+paperId+" "+edition);
   await chooseEdition(p);
   check(await page.locator("#g-papers").inputValue()===p.paper.id,
    "Paper picker lost edition "+paperId+" "+edition);
   await page.locator("#g-start").click();await route(page,"exam");
   check(await page.locator(".exam-question").count()===1&&
     await page.locator(".source-review").count()===0,
     "Live exam leaked edited published answer or failed rendering");
   const q=p.questions[0],key=p.answerKey.entries[0].answer;
   check(await page.locator('[data-q="0"]').count()===1,"Missing first paper question");
   const keyIndex=q.content.options.findIndex(x=>x.id===key.optionId);
   check(keyIndex>=0,"Frozen source key cannot be represented by offered options");
   await page.locator("input[data-choice]").nth(keyIndex).check();
   const id=new URL(await page.url()).searchParams.get("attempt");
   await finishNow();
   const maximum=scoreableMaximum(p.paper,p.answerKey,p.questions).toFixed(2);
   check((await page.locator(".score.standout").innerText()).includes("/ "+maximum),
     "Wrong edition-specific eligible maximum "+paperId+"/"+edition);
   await page.locator("#result-tab-review").click();
   const item=page.locator('[data-review-id="'+q.id+'"]');
   check(await page.locator(".generic-review").count()===100,
    "Full CGL publication edition failed complete 100-item frozen review "+paperId+"/"+edition);
   check(await item.count()===1&&
    ((await item.innerText()).toLowerCase().includes("correct")||q.editorial.status==="invalid"),
    "Frozen answer missing or wrong in review "+paperId+"/"+edition);
   await page.locator("#g-library").click();await route(page,"library");
   await page.locator("#g-history").click();await route(page,"history");
   check(await page.locator('[data-attempt="'+id+'"]').count()>=1,
    "Actual scored "+paperId+"/"+edition+" not present in saved History");
   await page.locator("#g-library").click();await route(page,"library");
   checked.push(paperId+"/"+edition);
  }
 }
 check(checked.length===10,"Did not exercise all ten original/reviewed CGL packages");
 const oct="cgl-2026-10-06";
 for(const edition of ["source","reviewed"]){
  const p=editions.find(x=>x.paper.paperId===oct&&x.paper.edition===edition);
  await chooseEdition(p);
  await page.locator("#g-start").click();await route(page,"exam");
  await page.locator('[data-section="2"]').click();
  await page.locator('[data-q="11"]').click();
  const q=p.questions[61];
  check(q.editorial.status===(edition==="source"?"invalid":"caution"),
    "6 October Q62 changed its source/caution editorial policy");
  await page.locator("input[data-choice]").nth(1).check();
  check(!(await page.locator("main").innerText()).includes("the original published answer is retained for scoring"),
    "Q62 dispute or published-key policy leaked before submission");
  await finishNow();
  await page.locator("#result-tab-review").click();
  const item=page.locator('[data-review-id="'+q.id+'"]');
  const text=await item.innerText();
  check(text.includes(edition==="source"?"excluded":"correct"),
    "Q62 "+edition+" frozen verdict incorrect");
  if(edition==="reviewed"){
   check(text.includes("disputed")&&text.includes("retained for scoring")&&
     text.includes("2 automated marks"),
    "Reviewed Q62 must retain disputed published B with +2 marks and disclosure");
   check(await item.locator("details.source-review").count()===1,
     "Q62 original/reviewed comparison missing");
   check((await page.locator("#result-review").innerText()).includes(
    "Editorial caution · review notes; answer key not certified here"),
    "Caution result improperly claims official key certification");
  }else check(text.includes("0 automated marks")&&
   (await page.locator("#result-review").innerText()).includes(
    "Defective · excluded from automated scoring"),
   "Original invalid Q62 must be excluded and explicitly labelled");
  await page.locator("#g-library").click();await route(page,"library");
 }
 // Validate non-key editorial wording, changed published key and media details.
 const family="cgl-2026-09-30";
 const reviewed=editions.find(x=>x.paper.paperId===family&&x.paper.edition==="reviewed");
 const original=editions.find(x=>x.paper.paperId===family&&x.paper.edition==="source");
 const ref=createSourceReviewReference(reviewed,original);
 check(ref.entries.length>0,"Reviewed CGL has no source comparison records");
 const firstCorrection=ref.entries[0];
 const q=reviewed.questions.find(x=>x.id===firstCorrection.targetQuestionRevisionId);
 const section=reviewed.paper.sections.findIndex(x=>x.questionRevisionIds.includes(q.id));
 const ix=reviewed.paper.sections[section].questionRevisionIds.indexOf(q.id);
 await chooseEdition(reviewed);
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator('[data-section="'+section+'"]').click();
 await page.locator('[data-q="'+ix+'"]').click();
 check(await page.locator(".source-review").count()===0,
  "Pre-submit CGL source correction revealed answer");
 const answer=reviewed.answerKey.entries.find(x=>x.questionRevisionId===q.id).answer;
 const wrongIx=q.content.options.findIndex(x=>x.id!==answer.optionId);
 check(wrongIx>=0,"No visible wrong-answer option in modified CGL item");
 await page.locator("input[data-choice]").nth(wrongIx).check();
 await finishNow();
 const comparisonDetails=await page.locator(".result-scoring-details").textContent();
 check(comparisonDetails.includes("comparable subset only")&&
   comparisonDetails.includes("unavailable")&&
   !comparisonDetails.includes("100 of 100 questions comparable"),
   "P41 must not present a misleading full-paper publisher-key comparison");
 check((await page.locator(".result-performance-overview").innerText()).includes("Submitted by user"),
   "Explicit voluntary completion reason omitted");
 check(await page.locator(".result-section-table th").filter({hasText:"Marks"}).count()>0,
   "Section denominator missing");
 await page.locator("#result-tab-review").click();
 const article=page.locator('[data-review-id="'+q.id+'"]');
 check(await article.locator(".review-option-incorrect").count()>=1&&
    await article.locator(".review-option-correct").count()>=1,
    "Reviewed wrong-vs-right option styling absent");
 const comparison=article.locator("details.source-review");
 check(await comparison.count()===1,"Corrected source comparison missing");
 await comparison.locator("summary").click();
 const originalInfo=await comparison.innerText();
 check(originalInfo.includes(firstCorrection.sourceQuestion.content.prompt)&&
    originalInfo.includes("Original published answer:"),
    "Edited original prompt or published key provenance missing");
 check(await page.locator("#result-review .generic-figure").count()>=5&&
   await page.locator("#result-review .generic-figure").first().evaluate(x=>x.complete&&x.naturalWidth>0),
   "Real CGL review failed to display decoded question/option figures");
 const withOptionImage=reviewed.questions.find(x=>
   (x.content.kind==="single-choice"||x.content.kind==="multiple-select")&&
   x.content.options.some(o=>o.assetIds?.length));
 check(withOptionImage&&await page.locator('[data-review-id="'+withOptionImage.id+'"] .review-opt img').count()>0,
   "CGL reviewed option images unavailable");
 const withSolution=reviewed.questions.find(x=>Boolean(reviewed.explanations?.[x.id]));
 check(withSolution&&await page.locator('[data-review-id="'+withSolution.id+'"] details.worked-solution[open]').count()===1,
   "Unanswered item did not expand available explanation");
 const reviewText=await page.locator("#result-review").innerText();
 check(reviewText.includes("Editorial correction recorded")&&
  reviewText.includes("Key corrected · recorded editorial change"),
  "Review omitted distinction between wording-only and corrected-key edits");
 const third=await page.locator("#result-review .generic-review").nth(2).innerText();
 const sixth=await page.locator("#result-review .generic-review").nth(5).innerText();
 check(third.includes("Editorial correction recorded")&&!third.includes("Key corrected")&&
   sixth.includes("Key corrected · recorded editorial change"),
   "30 September wording-only Q3 / corrected-key Q6 falsely conflated");
 const figure=source[family].questions.find(x=>x.n<=25&&
   (x.images.stem||x.images.options?.some(Boolean)));
 check(Boolean(figure),"Original CGL image fixture missing");
 const altTexts=await page.locator(".generic-figure").evaluateAll(xs=>xs.map(x=>x.getAttribute("alt")));
 check(altTexts.some(x=>x?.includes("question "+figure.n)),
   "Reviewed image alt did not preserve source question identity");
 const savedId=new URL(await page.url()).searchParams.get("attempt");
 const originalSaved=await persisted(savedId,x=>x.finishedAt!==null&&
  x.sourceReviewReference?.entries.length===ref.entries.length);
 check(originalSaved.sourceReviewReference.entries.length===ref.entries.length&&
  originalSaved.sourceKeyReference?.entries?.length===100,
  "Reviewed CGL did not durably pin both edited questions and all 100 original source keys");
 check(await page.locator("#g-review-top").count()===1&&
   await page.locator(".generic-review").filter({hasText:"Source page"}).count()>0,
   "Completed CGL review missing jump-to-top or original published page provenance");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-history").click();await route(page,"history");
 await page.locator('[data-attempt="'+savedId+'"]').first().click();await route(page,"result");
 await page.locator("#result-tab-review").click();
 check(await page.locator('[data-review-id="'+q.id+'"] details.source-review').count()===1,
   "Reopened corrected source comparison lost");
 // Historical supported stored record format without embedded comparison: only
 // the immutable bundled source + matching pinned key may reconstruct it.
 const archivedId="older-pinned-source-record";
 await page.evaluate(async({sourceId,id})=>{
  const db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open("practiceDesk.overhaul.v1",1);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try{
   await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readwrite"),store=tx.objectStore("attempts");
    const get=store.get(sourceId);
    get.onsuccess=()=>{
     const old={...get.result,id,saveRevision:1};
     delete old.sourceReviewReference;
     store.add(old);
    };
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
   });
  }finally{db.close();}
 },{sourceId:savedId,id:archivedId});
 await page.reload({waitUntil:"load"});
 if(await page.locator("#g-history").count()){
  await page.locator("#g-history").click();await route(page,"history");
 }else{
  await page.locator("#g-history-results").click();await route(page,"history");
 }
 await page.locator('[data-attempt="'+archivedId+'"]').first().click();await route(page,"result");
 await page.locator("#result-tab-review").click();
 const legacy=page.locator('[data-review-id="'+q.id+'"] details.source-review');
 check(await legacy.count()===1,
  "Older frozen attempt with pinned key failed verified original-source comparison recovery");
 await legacy.locator("summary").click();
 check((await legacy.innerText()).includes(firstCorrection.sourceQuestion.content.prompt),
  "Older pinned source comparison used incorrect original prompt");
 await page.locator("#g-library").click();await route(page,"library");
 // Generic six-kind authored exams also support source/review without SSC
 // provenance; their author-supplied scoring overrides must be honoured.
 const src=genericVariant("source"),dst=genericVariant("reviewed",true);
 await page.locator("#g-file").setInputFiles({name:"source.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(src))});
 await page.locator("#g-file").setInputFiles({name:"reviewed.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(dst))});
 await chooseModernPaper(page,dst.paper.id);
 await page.locator("#g-start").click();await route(page,"exam");
 check(await page.locator(".source-review").count()===0,
  "Generic author-created source key leaked during exam");
 await page.locator('input[data-choice]').nth(1).click();
 await page.locator('[data-section="1"]').click();
 await page.locator('input[data-bool="false"]').click();
 await finishNow();
 const max=scoreableMaximum(dst.paper,dst.answerKey,dst.questions);
 check(max===14&&(await page.locator(".score.standout").innerText()).includes("/ 14.000"),
  "Authored six-kind source/review max incorrectly assumes SSC");
 await page.locator("#result-tab-review").click();
 check(await page.locator('[data-review-id="rev-0:reviewed"] details.source-review').count()===1,
  "Generic reviewed-source comparison missing after scoring");
 const bool=page.locator('[data-review-id="rev-3"]');
 check(await bool.locator(".review-option-correct").count()===1&&
  await bool.locator(".review-option-incorrect").count()===1,
  "Boolean reviewed correct-vs-selected-wrong evidence missing");
 check((await page.locator('[data-review-id="rev-5"]').innerText()).includes("Manual assessment"),
  "Ungraded written question incorrectly classified as automated");
 // CGL item images must also have specific contextual alt text in the live
 // question UI (the matching completed frozen Review is checked above).
 await page.locator("#g-library").click();await route(page,"library");
 await chooseEdition(reviewed);
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator('[data-q="'+(figure.n-1)+'"]').click();
 const alts=await page.locator(".exam-question img.generic-figure").evaluateAll(xs=>
   xs.map(x=>x.getAttribute("alt")));
 check(alts.length>0&&alts.every(x=>x?.includes("question "+figure.n)),
  "Live figure missing contextual question number");
 if(figure.images.stem)check(alts.includes("Diagram for question "+figure.n),
  "Stem diagram alt text not contextual");
 if(figure.images.options?.some(Boolean))check(alts.some(x=>/^Image for option [A-D] of question /.test(x)),
  "Option image alt missing alphabetic option context");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 check((await page.locator("#screen-announcement").innerText()).includes("Learning and spaced revision")&&
  await page.evaluate(()=>document.activeElement?.tagName)==="H1",
  "Learning entry must announce screen and focus its heading");
 await page.locator("#learning-close").click();await route(page,"library");
 check((await page.locator("#screen-announcement").innerText()).includes("Test library"),
  "Learning close did not announce Library");
 check(errors.length===0,"Unexpected browser errors "+errors.join("; "));
 await h.evidence("provenance-matrix",{editions:checked.length,q62:true,legacyPinned:true,
  sourceRevisionGeneric:true,alt:true,manual:true});
 console.log("MODERN PROVENANCE PASS all 10 source/reviewed CGL editions, Q62 published-key policy, source corrections, media alt, older saved pinned source and custom six-kind source");
}catch(e){await h.diagnose("provenance",page,e);throw e;}
finally{await context.close();await h.finish();}
