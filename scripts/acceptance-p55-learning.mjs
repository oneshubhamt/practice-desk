/** P55 real file:// Learning keyed UI, unsaved editor and measured redraw.
 * Red-before-green acceptance for audit P51-R1 through R5.
 * Browser engine variance is recorded; no universal speedup is inferred.
 */
import {openHarness,route,check,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
import {questionRevisionHash} from "../src/domain/integrity.ts";
import {validateLearningCard} from "../src/learning/learning.ts";

const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/p55-learning"});
const {page,errors}=await h.open({viewport:{width:1280,height:850}});
const idA="learning-card:rev-0",idB="learning-card:rev-1";
const median=values=>{const a=[...values].sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
const percentile=(values,p)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];};
async function waitCard(id){
 await page.waitForFunction(async id=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open("practiceDesk.shared.v1",1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{
   const record=await new Promise((resolve,reject)=>{const r=db.transaction("attempts","readonly").objectStore("attempts").get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   return record?.recordType==="learning-card";
  }finally{db.close();}
 },id,{timeout:12000});
}
async function notebook(){
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
}
const select=async id=>page.locator('[data-learning-id="'+id+'"]').click();
async function seedCards(from,to){
 const source=(await records(page)).find(x=>x.id===idA);
 check(Boolean(source),engine+" real immutable Learning source fixture missing");
 const cards=[];
 for(let i=from;i<to;i++){
  const stamp=new Date(Date.parse(source.createdAt)+(i+2)*1000).toISOString();
  const q={...source.question,id:"p55-rev-"+i,questionId:"p55-question-"+i,
   content:{...source.question.content,prompt:"P55 measured Learning card "+i}};
  const {contentHash:discard,...unsigned}=q;
  const question={...unsigned,contentHash:questionRevisionHash(unsigned)};
  const card={...source,id:"learning-card:"+question.id,question,
   note:"",customTopic:"",customSubject:"",customSubtopic:"",
   errorLabel:null,bookmarked:i%2===0,createdAt:stamp,updatedAt:stamp,
   reviews:[],saveRevision:1};
  validateLearningCard(card);
  cards.push(card);
 }
 await page.evaluate(async cards=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open("practiceDesk.shared.v1",1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{
   await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readwrite");
    for(const card of cards)tx.objectStore("attempts").add(card);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });
  }finally{db.close();}
 },cards);
}
async function measure(n){
 await page.reload({waitUntil:"load"});
 await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 await page.waitForFunction(n=>document.querySelectorAll("[data-learning-id]").length===n+2,n,{timeout:30000});
 const metrics=await page.evaluate(()=>{
  const rows=[...document.querySelectorAll("[data-learning-id]")];
  const a=rows[0],b=rows[1];
  const summary=document.querySelector(".learning-summary");
  const evidence=document.querySelector(".learning-evidence-builder");
  const list=document.querySelector("[data-learning-list]");
  const times=[];
  for(let i=0;i<12;i++){
   const tick=performance.now();
   (i%2?b:a).click();
   times.push(performance.now()-tick);
  }
  return {samplesMs:times,rows:document.querySelectorAll("[data-learning-id]").length,
   domNodes:document.querySelectorAll("#app *").length,
   summaryRetained:document.querySelector(".learning-summary")===summary,
   evidenceRetained:document.querySelector(".learning-evidence-builder")===evidence,
   listRetained:document.querySelector("[data-learning-list]")===list,
   rowRetained:document.querySelector('[data-learning-id="'+a.dataset.learningId+'"]')===a};
 });
 check(metrics.rows===n+2&&metrics.summaryRetained&&metrics.evidenceRetained&&
  metrics.listRetained&&metrics.rowRetained,engine+" P55 keyed synthetic "+n+" card DOM identity regression: "+JSON.stringify(metrics));
 check(metrics.samplesMs.every(Number.isFinite)&&metrics.samplesMs.every(ms=>ms<15000),
  engine+" P55 "+n+" card redraw exceeded bounded 15s responsiveness guardrail");
 const output={n,medianMs:median(metrics.samplesMs),p95Ms:percentile(metrics.samplesMs,0.95),
  maxMs:Math.max(...metrics.samplesMs),domNodes:metrics.domNodes,environment:engine,
  samplesMs:metrics.samplesMs,baselineClaim:"none; measured current implementation only"};
 console.log("P55 LEARNING MEASURE "+JSON.stringify(output));
 return output;
}
try{
 await page.locator("#g-file").setInputFiles({name:"p55-six-kinds.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(pkg))});
 await chooseModernPaper(page,pkg.paper.id);
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator("#g-submit").click();await route(page,"result");
 await page.locator("#result-tab-review").click();
 await page.locator('[data-add-card="rev-0"]').click();await waitCard(idA);
 await page.locator('[data-add-card="rev-1"]').click();await waitCard(idB);
 await notebook();
 await select(idA);
 await page.locator("#learning-subject").fill("User-selected subject");
 await page.locator("#learning-topic").fill("Unsaved topic");
 await page.locator("#learning-subtopic").fill("Unsaved subtopic");
 await page.locator("#learning-error").selectOption("conceptual");
 await page.locator("#learning-bookmark").check();
 await page.locator("#learning-note").fill("First card unsaved note; keep all edit controls.");
 await page.evaluate(()=>{
  window.__p55refs={summary:document.querySelector(".learning-summary"),
   evidence:document.querySelector(".learning-evidence-builder"),
   rowA:document.querySelector('[data-learning-id="learning-card:rev-0"]'),
   rowB:document.querySelector('[data-learning-id="learning-card:rev-1"]'),
   detail:document.querySelector("[data-learning-card]"),
   note:document.querySelector("#learning-note")};
 });
 const focused=await page.evaluate(()=>{
  const n=document.querySelector("#learning-note");n.focus();n.setSelectionRange(6,12);
  const checkbox=document.querySelector('[data-evidence-reason="flagged"]');checkbox.click();
  const refs=window.__p55refs;
  return {sameNote:n===document.querySelector("#learning-note"),
   sameSummary:refs.summary===document.querySelector(".learning-summary"),
   focused:document.activeElement===n,
   selectionStart:n.selectionStart,selectionEnd:n.selectionEnd};
 });
 check(focused.sameNote&&focused.sameSummary&&focused.focused&&
  focused.selectionStart===6&&focused.selectionEnd===12,
  engine+" same card Learning redraw lost native note, caret or top-level identity: "+JSON.stringify(focused));
 await select(idB);
 const switched=await page.evaluate(()=>{
  const refs=window.__p55refs;
  return {summary:refs.summary===document.querySelector(".learning-summary"),
   evidence:refs.evidence===document.querySelector(".learning-evidence-builder"),
   rowA:refs.rowA===document.querySelector('[data-learning-id="learning-card:rev-0"]'),
   rowB:refs.rowB===document.querySelector('[data-learning-id="learning-card:rev-1"]'),
   oldDetailRemoved:!refs.detail.isConnected,distinctDetail:document.querySelector("[data-learning-card]")?.dataset.learningCard,
   note:document.querySelector("#learning-note")?.value,
   aria:document.querySelector('[data-learning-id="learning-card:rev-1"]')?.getAttribute("aria-pressed"),
   announcement:document.querySelector("#learning-selection-status")?.textContent};
 });
 check(switched.summary&&switched.evidence&&switched.rowA&&switched.rowB&&switched.oldDetailRemoved&&
  switched.distinctDetail===idB&&switched.note===""&&switched.aria==="true"&&
  switched.announcement?.includes("Select all"),
  engine+" card switch destroyed unaffected tree, leaked prior draft or missed change announcement: "+JSON.stringify(switched));
 await page.locator("#learning-note").fill("Second card draft must stay on B only");
 await page.locator("#learning-topic").fill("Second-only topic");
 await select(idA);
 check(await page.locator("#learning-note").inputValue()==="First card unsaved note; keep all edit controls."&&
  await page.locator("#learning-topic").inputValue()==="Unsaved topic"&&
  await page.locator("#learning-subtopic").inputValue()==="Unsaved subtopic"&&
  await page.locator("#learning-subject").inputValue()==="User-selected subject"&&
  await page.locator("#learning-error").inputValue()==="conceptual"&&
  await page.locator("#learning-bookmark").isChecked(),
  engine+" card-specific full unsaved editor state did not survive A-B-A switch");
 // Simulated composition transition during a background Learning redraw.
 const composing=await page.evaluate(()=>{
  const note=document.querySelector("#learning-note");
  note.focus();note.setSelectionRange(4,4);
  note.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true,data:"श"}));
  note.value="Composing श",note.dispatchEvent(new InputEvent("input",{bubbles:true,data:"श",inputType:"insertCompositionText",isComposing:true}));
  document.querySelector('[data-evidence-reason="slow"]').click();
  const after=document.querySelector("#learning-note");
  after.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true,data:"श"}));
  return {same:after===note,value:after.value,focused:document.activeElement===after,
   caret:after.selectionStart};
 });
 check(composing.same&&composing.value==="Composing श"&&composing.focused&&composing.caret===4,
  engine+" synthetic composition and focused input were reset: "+JSON.stringify(composing));
 check((await records(page)).find(x=>x.id===idA)?.note!=="Composing श",
  engine+" unsaved composition was incorrectly persisted");
 await page.locator("#learning-save").click();
 await page.waitForFunction(id=>document.querySelector("#learning-save")?.textContent==="Save note",idA);
 check((await records(page)).find(x=>x.id===idA)?.note==="Composing श",
  engine+" explicit Save did not commit the edited card");
 await select(idB);
 check(await page.locator("#learning-note").inputValue()==="Second card draft must stay on B only",
  engine+" B draft lost after saving A");
 await page.locator("#learning-filter").selectOption("bookmarked");
 const filtered=await page.evaluate(()=>{
  const x=document.querySelector("[data-learning-card]");
  return {rows:document.querySelectorAll("[data-learning-id]").length,
   selected:x?.dataset.learningCard,summary:window.__p55refs.summary===document.querySelector(".learning-summary"),
   a:window.__p55refs.rowA===document.querySelector('[data-learning-id="learning-card:rev-0"]')};
 });
 check(filtered.rows===1&&filtered.selected===idA&&filtered.summary&&filtered.a,
  engine+" filtered list did not keep selected-visible card or stable keyed survivor: "+JSON.stringify(filtered));
 await page.locator("#learning-filter").selectOption("all");
 await select(idB);
 check(await page.locator("#learning-note").inputValue()==="Second card draft must stay on B only",
  engine+" temporary filtered-out draft was lost on return");
 // Browser reload discards unsaved B while preserving explicitly saved A.
 await page.reload({waitUntil:"load"});await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 await select(idB);
 check(await page.locator("#learning-note").inputValue()==="",
  engine+" tab-only uncommitted B edit was silently saved");
 await select(idA);
 check(await page.locator("#learning-note").inputValue()==="Composing श",
  engine+" saved A edit did not survive physical file reload");
 const measurements=[];
 if(engine==="chromium"){
  await page.locator("#learning-close").click();await route(page,"library");
  await seedCards(0,100);
  measurements.push(await measure(100));
  await page.locator("#learning-close").click();await route(page,"library");
  await seedCards(100,500);
  measurements.push(await measure(500));
  await page.setViewportSize({width:195,height:844});
  await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
  await assertNoOverflow(page,"P55 500-card Learning at 195px + 140% type");
 }else{
  await page.setViewportSize({width:195,height:844});
  await page.evaluate(()=>document.documentElement.style.setProperty("--type-scale","1.4"));
  await assertNoOverflow(page,"P55 two-card Learning at 195px + 140% type");
 }
 check(errors.length===0,engine+" uncaught browser exceptions "+errors.join("; "));
 await h.evidence("p55-"+engine,{engine,measurements,passed:true});
 console.log("P55 "+engine+" PASS: cross-card keyed identity, draft isolation, native focus/composition, filter, saved/reload and measured bounds");
}catch(error){await h.diagnose("p55-"+engine,page,error);throw error;}
finally{await h.finish();}
