/** P57-A/B preserved under P57-C: actual file:// staging, QA, Wordgard publication,
 * immutable frozen APFC/CAT attempts and real cross-browser responsive rendering.
 */
import {openHarness,route,check,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {readFile} from "node:fs/promises";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,errors}=await h.open({viewport:{width:1280,height:840}});
const fixture=async name=>JSON.parse(await readFile(new URL("../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
async function stage(source,label){
 await page.locator("#g-file").setInputFiles({name:label+".json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(source))});
 await page.locator("#pd-author-heading").waitFor({state:"visible"});
 await page.locator("#pd-stage-handoff").waitFor({state:"visible"});
}
async function clearStage(){
 if(await page.locator("#pd-stage-clear").count()){
  await page.locator("#pd-stage-clear").click();
  await page.locator("#pd-stage-clear").waitFor({state:"detached"});
 }
}
async function publishStage(source,label){
 await stage(source,label);
 check((await records(page)).every(r=>r.recordType!=="generic-package"||
   r.bundle?.paper.id!=="authored:"+source.examId+":"+source.paperId+":r"+source.revision+":custom"),
  engine+" AI bank published before user selection or confirmation");
 await page.locator("#pd-stage-handoff").click();
 await page.waitForFunction(()=>document.querySelector("#pd-author-drafts")?.value.startsWith("stage:"));
 await clearStage();
 await page.locator("#pd-author-validate").click();
 const report=await page.locator("#pd-author-validation").innerText();
 check(!/\b[1-9]\d* errors\b/.test(report),engine+" valid source has fatal QA "+report.slice(0,500));
 await page.locator("#pd-author-confirm").check();
 if(await page.locator("#pd-author-accept-warnings").count())
  await page.locator("#pd-author-accept-warnings").check();
 await page.locator("#pd-author-publish").click();
 const id="authored:"+source.examId+":"+source.paperId+":r"+source.revision+":custom";
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,id);
 return id;
}
try{
 const apfc=await fixture("apfc");
 const initial=(await records(page)).length;
 const invalid=structuredClone(apfc);invalid.questions[2].answer="B";
 await stage(invalid,"p57b-wrong-key");
 check((await page.locator("#pd-stage-filter").count())===1,engine+" staging panel absent");
 check((await page.locator("#pd-stage-handoff").count())===1,engine+" QA stage did not load");
 check((await page.locator(".pd-author-section-manager").allTextContents()).some(x=>
  /math-answer-conflict|arithmetic does not agree/i.test(x)),
  engine+" P57-B math/key inconsistency was not displayed in staging");
 check((await records(page)).length===initial,engine+" invalid bank modified scored records");
 await clearStage();
 // P60-C: actual offline browser intake must reject answer leakage that the
 // source author incorrectly placed inside the candidate-visible question.
 const leaking=structuredClone(apfc);
 leaking.questions[0].prompt+=" Correct answer: B";
 await stage(leaking,"p60c-candidate-answer-leak");
 check((await page.locator(".pd-author-section-manager").allTextContents()).some(x=>
  /candidate-answer-leak|Candidate-visible content contains an explicit answer/i.test(x)),
  engine+" P60-C stem answer leak bypassed real source staging");
 check((await records(page)).length===initial,
  engine+" P60-C unsafe answer-leak source changed persisted exams");
 await clearStage();
 const duplicates=structuredClone(apfc);duplicates.questions[0].options[2]=" B ";
 await stage(duplicates,"p57b-equivalent-options");
 check((await page.locator(".pd-author-section-manager").allTextContents()).some(x=>
  /duplicate-option|equivalent text/i.test(x)),engine+" QA duplicate choices not shown");
 check((await records(page)).length===initial,engine+" invalid bank was published");
 await clearStage();
 const apfcId=await publishStage(apfc,"p57-apfc");
 const bundled=(await records(page)).find(r=>r.recordType==="generic-package"&&r.bundle?.paper?.id===apfcId);
 check(Boolean(bundled),engine+" APFC staged bank not persisted after explicit confirmation");
 const pkg=bundled.bundle;
 check(pkg.paper.sections.length===1&&pkg.questions.length===3,
  engine+" APFC syllabus subjects split physical exam sections");
 check(pkg.questions.every(q=>q.editorial.status==="caution"),
  engine+" unverified authors were mislabeled certified");
 check(new Set(pkg.questions.map(q=>q.content.topicIds[0])).size===3,
  engine+" three explicit APFC syllabus roots were lost");
 await page.locator("#g-start").click();await route(page,"exam");
 check((await page.locator(".exam-question").innerText()).includes("letter comes second"),
  engine+" first APFC stem is missing");
 const candidateBeforeSubmission=await page.locator(".exam-question").innerText();
 check(!candidateBeforeSubmission.includes("B is second.")&&
  !candidateBeforeSubmission.includes("Correct answer: B"),
  engine+" P60-C actual exam view leaked protected explanation/key before submission");
 await page.locator('input[data-choice="B"]').click();
 await page.locator("#g-submit").click();await route(page,"result");
 const result=(await records(page)).find(r=>r.recordType==="generic-attempt"&&
  r.frozen.paper.id===apfcId&&r.result?.items.length===3);
 check(Boolean(result),engine+" frozen APFC attempt not persisted");
 check(Math.abs(result.result.snapshot.earnedMarks-2.5)<1e-10,
  engine+" frozen APFC marks incorrect");
 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8;i++)await page.locator("#fontMore").click();
 await page.locator("#displayClose").click();
 await assertNoOverflow(page,engine+" APFC result 195px/140%");
 await page.setViewportSize({width:1280,height:840});
 await page.locator("#g-library").click();await route(page,"library");
 const cat=await fixture("cat");
 const catId=await publishStage(cat,"p57-cat");
 const catSaved=(await records(page)).find(r=>r.recordType==="generic-package"&&r.bundle?.paper.id===catId);
 check(Boolean(catSaved),engine+" CAT staged publication absent");
 const c=catSaved.bundle;
 check(c.stimuli.length===2&&c.paper.sections.length===3&&
  c.questions[0].content.stimulusId===c.stimuli[0].id&&
  c.questions[1].content.stimulusId===c.stimuli[1].id,
  engine+" CAT shared RC/DILR stimulus lost or duplicated");
 check(c.paper.timing.kind==="sectional"&&
  c.paper.timing.sectionLimits.every(x=>x.durationMs===40*60000),
  engine+" CAT timers changed");
 await page.reload({waitUntil:"load"});
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,catId);
 check((await records(page)).some(r=>r.recordType==="generic-attempt"&&r.frozen.paper.id===apfcId),
  engine+" CAT publication modified earlier APFC history");
 // P57-C: a second, overlapping APFC revision arrives in two files.
 // The bad arithmetic key must be corrected in Wordgard before publication.
 const second=structuredClone(apfc);second.revision=2;second.questions[2].answer="B";
 const overlap=structuredClone(apfc);overlap.revision=2;overlap.bankId="second-source-p57c";
 overlap.questions=overlap.questions.map(q=>({...q,id:"copy-"+q.id}));
 await page.locator("#g-author-open").click();
 await page.locator("#pd-stage-input").setInputFiles([
  {name:"p57c-main.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(second))},
  {name:"p57c-overlap.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(overlap))}
 ]);
 await page.waitForFunction(()=>document.querySelectorAll("[data-stage-key]").length===6);
 const stageText=await page.locator(".pd-author-section-manager").first().innerText();
 check(stageText.includes("math-answer-conflict")&&stageText.includes("duplicate-candidate"),
  engine+" multi-file QA did not identify bad key and overlap");
 await page.locator("#pd-stage-filter").selectOption("errors");
 check(await page.locator("[data-stage-key]").count()>0,engine+" QA error filter empty");
 await page.locator("#pd-stage-filter").selectOption("all");
 await page.locator('[data-stage-key="second-source-p57c::copy-'+apfc.questions[2].id+'"]').uncheck();
 await page.locator("#pd-stage-handoff").click();
 await page.waitForFunction(()=>document.querySelector("#pd-author-drafts")?.value.startsWith("stage:"));
 check(await page.locator("#pd-author-questions option").count()===5,
  engine+" selected source questions did not transfer to Wordgard");
 await page.locator("#pd-author-validate").click();
 check((await page.locator("#pd-author-validation").innerText()).includes("math-answer-conflict"),
  engine+" bad key bypassed Wordgard QA");
 const wrong=await page.locator("#pd-author-questions option").nth(2).getAttribute("value");
 await page.locator("#pd-author-questions").selectOption(wrong);
 await page.locator("#pd-author-answer").fill(apfc.questions[2].answer);
 await page.locator("#pd-author-answer").blur();
 await page.locator("#pd-author-validate").click();
 const corrected=await page.locator("#pd-author-validation").innerText();
 check(corrected.includes("0 errors")&&corrected.includes("Exact publication dry-run"),
  engine+" corrected staged questions lacked a passing dry run: "+corrected.slice(0,500));
 await page.locator("#pd-stage-clear").click(); // Harness accepts confirmation exactly once.
 await page.locator("#pd-author-reviewer").fill("Reader named by author");
 await page.locator("#pd-author-review-note").fill("Manually corrected arithmetic; sources and remaining duplicates are not independently authenticated.");
 await page.locator("#pd-author-confirm").check();
 await page.locator("#pd-author-accept-warnings").check();
 await page.locator("#pd-author-publish").click();
 const revised="authored:"+apfc.examId+":"+apfc.paperId+":r2:custom";
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,revised);
 const revision2=(await records(page)).find(r=>r.recordType==="generic-package"&&r.bundle?.paper.id===revised);
 check(Boolean(revision2)&&revision2.bundle.questions.length===5,
  engine+" two-batch selective revision was not saved as one immutable paper");
 check(revision2.bundle.questions.some(q=>q.editorial.notes.includes("Author-entered review/QA acknowledgement")),
  engine+" author-attributed warning acceptance not frozen with the revision");
 check((await records(page)).some(r=>r.recordType==="generic-attempt"&&r.frozen.paper.id===apfcId),
  engine+" revision 2 modified the original APFC score/history");
 check(errors.length===0,engine+" unexpected page errors "+errors.join("; "));
 console.log("P57-A/B/C "+engine+" PASS: bounded staging and QA errors, Wordgard handoff, two immutable CAT/APFC publications, scored history, 195px/140%");
}catch(error){await h.diagnose("p57a-"+engine,page,error);throw error;}
finally{await h.finish();}
