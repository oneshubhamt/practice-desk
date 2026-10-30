import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright-core";
import { pkg } from "../tests/fixtures/six-kinds.mjs";
import { builtinCglPackages } from "../src/app/exam-package.ts";
import { createSourceReviewReference } from "../src/engine/review-source.ts";
import { scoreableMaximum } from "../src/engine/score-ceiling.ts";
import { questionRevisionHash, answerKeyRevisionHash, paperRevisionHash } from "../src/domain/integrity.ts";

const ok=(test,message)=>{if(!test)throw Error(message);};
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const cgl=builtinCglPackages(sources,patches,solutions);
const reviewed=cgl.find(p=>p.paper.edition==="reviewed"&&
 cgl.some(src=>src.paper.paperId===p.paper.paperId&&src.paper.edition==="source"&&
   createSourceReviewReference(p,src)?.entries.length>0));
ok(reviewed,"No reviewed CGL question corrections");
const original=cgl.find(p=>p.paper.paperId===reviewed.paper.paperId&&p.paper.edition==="source");
const sourceReview=createSourceReviewReference(reviewed,original);
const changed=sourceReview.entries[0];
const q=reviewed.questions.find(q=>q.id===changed.targetQuestionRevisionId);
const questionIndex=reviewed.paper.sections.findIndex(s=>s.questionRevisionIds.includes(q.id));
const position=reviewed.paper.sections[questionIndex].questionRevisionIds.indexOf(q.id);
const answer=reviewed.answerKey.entries.find(e=>e.questionRevisionId===q.id).answer;
const wrong=q.content.options.find(o=>o.id!==answer.optionId);
ok(wrong,"Need incorrect source key example");

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
  scoring:{defaultRule:{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0},
   byQuestionKind:{"numeric-entry":{correctMarks:5,incorrectMarks:-1,unansweredMarks:0},
    "multiple-select":{correctMarks:3,incorrectMarks:-1,unansweredMarks:0}}}};
 return {...pkg,title:"Generic "+edition,questions,answerKey,
  paper:{...paperBase,contentHash:paperRevisionHash(paperBase)}};
}
const bin=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!bin)throw Error("Chromium required for offline parity acceptance");
const executablePath=spawnSync("which",[bin],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"pass12-parity-"));
const url=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
let context;
async function stored(page){
 return page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open("practiceDesk.overhaul.v1",1);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try{return await new Promise((resolve,reject)=>{
   const r=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });}finally{db.close();}
 });
}
try{
 context=await chromium.launchPersistentContext(profile,{executablePath,headless:true,
  acceptDownloads:true,args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
 const page=context.pages()[0]??await context.newPage();
 const exceptions=[];page.on("pageerror",e=>exceptions.push(e.message));
 page.setDefaultTimeout(20000);
 await page.goto(url,{waitUntil:"load"});
 await page.locator("#g-papers").selectOption(reviewed.paper.id);
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();
 ok(await page.locator(".source-review").count()===0,"Original key shown in live test");
 await page.locator('[data-section="'+questionIndex+'"]').click();
 await page.locator('[data-q="'+position+'"]').click();
 const ix=q.content.options.findIndex(o=>o.id===wrong.id);
 await page.locator("input[data-choice]").nth(ix).click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
 await page.locator("#result-overview").waitFor();
 ok((await page.locator(".results-heading").innerText()).includes("Submitted by user"),
   "Explicit early completion reason is not visible");
 const max=scoreableMaximum(reviewed.paper,reviewed.answerKey,reviewed.questions);
 ok((await page.locator(".score.standout").innerText()).includes("/ "+max.toFixed(2)),
  "CGL adjusted score max missing");
 ok(await page.locator("th").filter({hasText:"Marks / eligible max"}).count()>0,
  "Section score maximum not presented");
 await page.locator('[data-result-tab="review"]').click();
 const article=page.locator('[data-review-id="'+q.id+'"]');
 ok(await article.count()===1,"Frozen patched CGL question absent");
 ok(await article.locator(".review-option-incorrect").count()>=1,
  "Incorrect selected option does not have its own verdict style");
 ok(await article.locator(".review-option-correct").count()>=1,
  "Correct frozen answer not visually identified");
 const compare=article.locator("details.source-review");
 ok(await compare.count()===1,"Original-vs-reviewed comparison missing");
 await compare.locator("summary").click();
 ok((await compare.innerText()).includes(changed.sourceQuestion.content.prompt),
  "Original prompt changed or not rendered");
 ok((await compare.innerText()).includes("Original published answer:"),
  "Original key provenance missing");
 ok(await page.locator(".generic-review .generic-figure").count()>=5,
  "Figures not preserved across completed CGL reviews");
 const withOptionImage=reviewed.questions.find(question=>
   (question.content.kind==="single-choice"||question.content.kind==="multiple-select")&&
   question.content.options.some(option=>option.assetIds?.length));
 ok(withOptionImage&&
   await page.locator('[data-review-id="'+withOptionImage.id+'"] .review-opt img').count()>0,
   "Original option diagrams absent from the completed frozen review");
 const solution=reviewed.questions.find(question=>Boolean(reviewed.explanations?.[question.id]));
 ok(solution&&await page.locator('[data-review-id="'+solution.id+'"] details.worked-solution[open]').count()===1,
   "Unanswered question with a worked solution should expand its explanation");
 ok(await page.locator("#g-review-top").count()===1,"Review Top action missing");
 await page.locator("#g-review-top").click();
 const oldRecord=(await stored(page)).find(x=>x.recordType==="generic-attempt"&&
  x.frozen.paper.paperId===reviewed.paper.paperId&&x.finishedAt!==null);
 ok(oldRecord?.sourceReviewReference?.entries.length===sourceReview.entries.length,
  "Source comparison was not stored with frozen attempt");
 await page.locator("#g-library").click();
 await page.locator("#g-history").click();
 await page.locator('[data-attempt="'+oldRecord.id+'"]').first().click();
 await page.locator('[data-result-tab="review"]').click();
 ok(await page.locator('[data-review-id="'+q.id+'"] details.source-review').count()===1,
  "Original comparison disappeared after opening saved CGL result");

 // Previous overhaul versions saved a pinned original key but did not yet
 // archive the original question text. Recover that comparison only when
 // the bundled immutable source and original key revision match exactly.
 const archiveId="pre-pass12-cgl-archived";
 await page.evaluate(async({id,sourceId})=>{
   const db=await new Promise((resolve,reject)=>{
     const request=indexedDB.open("practiceDesk.overhaul.v1",1);
     request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   });
   try{
     await new Promise((resolve,reject)=>{
       const tx=db.transaction("attempts","readwrite");
       const store=tx.objectStore("attempts");
       const read=store.get(sourceId);
       read.onsuccess=()=>{
         const archived={...read.result,id,saveRevision:1};
         delete archived.sourceReviewReference;
         store.add(archived);
       };
       tx.oncomplete=()=>resolve();
       tx.onerror=()=>reject(tx.error);
       tx.onabort=()=>reject(tx.error);
     });
   }finally{db.close();}
 },{id:archiveId,sourceId:oldRecord.id});
 await page.reload({waitUntil:"load"});
 await page.locator("#g-history").click();
 await page.locator('[data-attempt="'+archiveId+'"]').first().click();
 await page.locator('[data-result-tab="review"]').click();
 const restoredOlder=page.locator('[data-review-id="'+q.id+'"] details.source-review');
 ok(await restoredOlder.count()===1,"Pinned pre-Pass-12 CGL source review was lost");
 await restoredOlder.locator("summary").click();
 ok((await restoredOlder.innerText()).includes(changed.sourceQuestion.content.prompt),
   "Older saved CGL source text not correctly verified by pinned revision");

 // An arbitrary imported exam shares the same source/review model, even though
 // its answer kinds and marking rules differ from SSC CGL.
 await page.locator("#g-library").click();
 const source=genericVariant("source"),target=genericVariant("reviewed",true);
 await page.locator("#g-file").setInputFiles({name:"source.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(source))});
 await page.locator("#g-file").setInputFiles({name:"reviewed.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(target))});
 await page.locator("#g-papers").selectOption(target.paper.id);
 await page.locator("#g-start").click();
 ok(await page.locator(".source-review").count()===0,"Generic source key leaked during exam");
 await page.locator('input[data-choice]').nth(1).click();
 await page.locator('[data-section="1"]').click();
 await page.locator('input[data-bool="false"]').click();
 page.once("dialog",d=>d.accept());
 await page.locator("#g-submit").click();
 const maxGeneric=scoreableMaximum(target.paper,target.answerKey,target.questions);
 ok(maxGeneric===14,"Generic expected model score maximum is not 14");
 ok((await page.locator(".score.standout").innerText()).includes("/ 14.00"),
  "Generic score max incorrectly assumes SSC CGL");
 await page.locator('[data-result-tab="review"]').click();
 ok(await page.locator('[data-review-id="rev-0:reviewed"] details.source-review').count()===1,
  "Imported exam reviewed source provenance not preserved");
 const boolean=page.locator('[data-review-id="rev-3"]');
 ok(await boolean.locator(".review-option-correct").count()===1&&
    await boolean.locator(".review-option-incorrect").count()===1,
  "Boolean question did not show correct vs chosen wrong");
 const writing=page.locator('[data-review-id="rev-5"]');
 ok((await writing.innerText()).includes("Manual assessment"),
  "Manual written item wrongly treated as machine-grade key");
 ok(!exceptions.length,"Browser runtime errors: "+exceptions.join("; "));
 console.log("Pass 12: real corrected CGL, frozen original text/answer/media, score maximum, reviewed option styles, saved history, and non-CGL six-kind source comparison PASS");
}finally{
 await context?.close();
 await rm(profile,{recursive:true,force:true});
}
