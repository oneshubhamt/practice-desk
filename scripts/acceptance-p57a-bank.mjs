/** P57-A: real file:// import of external agent JSON, immutable History and shared CAT context. */
import {openHarness,route,check,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {readFile} from "node:fs/promises";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,errors}=await h.open({viewport:{width:1280,height:840}});
const fixture=async name=>JSON.parse(await readFile(new URL("../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
const add=async(source,label)=>{
 await page.locator("#g-file").setInputFiles({
  name:label+".json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(source))
 });
 const id="authored:"+source.examId+":"+source.paperId+":r"+source.revision+":custom";
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,id);
 return id;
};
try{
 const apfc=await fixture("apfc");
 const initial=(await records(page)).length;
 const rejected=structuredClone(apfc);rejected.questions[0].answer="Z";
 await page.locator("#g-file").setInputFiles({
  name:"p57-invalid.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(rejected))
 });
 check((await records(page)).length===initial,engine+" malformed external source was stored");
 check((await page.locator(".generic-warning").allTextContents()).some(x=>
  /Answer key|Enter one correct option|unsupported|answer/i.test(x)),
  engine+" malformed external answer had no visible rejection");
 // P57-B: a structurally four-option bank with equivalent distractors
 // must be rejected by the same offline import boundary, without a partial save.
 const qaInvalid=structuredClone(apfc);qaInvalid.questions[0].options[2]=" B ";
 await page.locator("#g-file").setInputFiles({
  name:"p57b-qa-duplicate-options.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(qaInvalid))
 });
 check((await records(page)).length===initial,
  engine+" P57-B duplicate-option authoring source was persisted");
 check((await page.locator(".generic-warning").allTextContents()).some(x=>
  /duplicate|equivalent|options/i.test(x)),
  engine+" P57-B deterministic QA failure was not visible");
 const apfcId=await add(apfc,"p57-apfc");
 const bundled=(await records(page)).find(r=>r.recordType==="generic-package"&&r.bundle?.paper?.id===apfcId);
 check(Boolean(bundled),engine+" APFC external bank not stored");
 const packageValue=bundled.bundle;
 check(packageValue.paper.sections.length===1&&packageValue.questions.length===3,
  engine+" academic subjects split the single APFC physical mock section");
 check(packageValue.questions.every(q=>q.editorial.status==="caution"),
  engine+" synthetic author claims were mislabeled verified");
 check(new Set(packageValue.questions.map(q=>q.content.topicIds[0])).size===3,
  engine+" official subjects were lost on import");
 await page.locator("#g-start").click();await route(page,"exam");
 check((await page.locator(".exam-question").innerText()).includes("letter comes second"),
  engine+" first external APFC question missing");
 await page.locator('input[data-choice="B"]').click();
 await page.locator("#g-submit").click();await route(page,"result");
 const result=(await records(page)).find(r=>r.recordType==="generic-attempt"&&
  r.frozen.paper.id===apfcId&&r.result?.items.length===3);
 check(Boolean(result),engine+" frozen APFC result missing");
 check(Math.abs(result.result.snapshot.earnedMarks-2.5)<1e-10,
  engine+" frozen APFC marks incorrect");
 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8;i++)await page.locator("#fontMore").click();
 await page.locator("#displayClose").click();
 await assertNoOverflow(page,engine+" P57 APFC result 195px/140%");
 await page.setViewportSize({width:1280,height:840});
 await page.locator("#g-library").click();await route(page,"library");
 const cat=await fixture("cat");
 const catId=await add(cat,"p57-cat");
 const catSaved=(await records(page)).find(r=>r.recordType==="generic-package"&&r.bundle?.paper.id===catId);
 check(Boolean(catSaved),engine+" CAT external bank not stored");
 const c=catSaved.bundle;
 check(c.stimuli.length===2&&c.paper.sections.length===3&&
  c.questions[0].content.stimulusId===c.stimuli[0].id&&
  c.questions[1].content.stimulusId===c.stimuli[1].id,
  engine+" shared CAT RC/DILR reference was duplicated or lost");
 check(c.paper.timing.kind==="sectional"&&
  c.paper.timing.sectionLimits.every(x=>x.durationMs===40*60000),
  engine+" CAT section rule changed");
 await page.reload({waitUntil:"load"});
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,catId);
 check((await records(page)).some(r=>r.recordType==="generic-attempt"&&r.frozen.paper.id===apfcId),
  engine+" external CAT import overwrote prior APFC History");
 check(errors.length===0,engine+" unexpected page errors "+errors.join("; "));
 console.log("P57-A/B "+engine+" PASS: offline external JSON rejection, multi-subject APFC immutable scored History, CAT shared stimuli and section timing, responsive 195px/140%");
}catch(error){await h.diagnose("p57a-"+engine,page,error);throw error;}
finally{await h.finish();}
