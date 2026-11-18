/** Stable product-domain browser scenarios. */

export async function authoringPublication(){
// Consolidated from scripts/acceptance-authoring-publication.mjs; retained browser-only assertions remain intact.
/** P47-5D actual file:// Library author → validate → immutable publish → score → review.
 * Captures focused, user-facing screenshots, not historical parity images.
 */
const {captureVisualEvidence}=await import("../../browser/visual-evidence.mjs");
const {openHarness,route,check,assertNoOverflow,records}=await import("../../browser/fixtures.mjs");
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const dir="artifacts/p47-5d-publish";
const {page,errors}=await h.open({viewport:{width:1280,height:830},colorScheme:"light"});
const requestUrls=[];
page.on("request",r=>{if(/^https?:/i.test(r.url()))requestUrls.push(r.url());});
const shot=async name=>captureVisualEvidence(page,dir+"/"+engine+"-"+name+".png",{fullPage:true});
async function fillField(field,text){
 await page.locator("#pd-author-field").selectOption(field);
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 await page.locator("#pd-author-editor wg-content").click();
 await page.keyboard.insertText(text);
}
try{
 const installedFamilies=await page.locator("#g-family option").allTextContents();
 check(installedFamilies.some(x=>x.includes("PFRDA Grade A 2026 — Phase II")),
  "Catalog-preinstalled PFRDA family is missing from Library");
 check(await page.locator("#g-import").count()===0&&await page.locator("#g-author-open").count()===0,
  "Library still exposes content-management controls");
 await page.locator("#g-authoring").click();await route(page,"authoring");
 check(await page.locator("#authoring-import").isVisible()&&
   await page.locator("#authoring-image-prep").isVisible()&&
   await page.locator("#authoring-open-studio").isVisible(),
  "Dedicated Authoring entry points are incomplete");
 await page.locator("#authoring-open-studio").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 check(await page.locator("#pd-author-health").isVisible(),"Derived authoring health summary missing");
 check(await page.locator("#pd-author-fix-next").isEnabled(),"Invalid draft did not expose Fix next");
 check(await page.locator(".pd-author-question-chips").count()===1,"Current-question QA chips missing");
 check((await page.locator("#pd-author-health").innerText()).includes("Draft health"),
  "Authoring health summary did not identify itself");
 check(await page.locator("#pd-author-publish").isEnabled(),"Publish entrypoint absent");
 await page.locator("#pd-author-publish").click();
 check((await page.locator("#pd-author-validation").innerText()).includes("Fix"),
  "Incomplete draft incorrectly publishable");
 check(!(await records(page)).some(x=>x.recordType==="generic-package"&&
  x.bundle?.paper?.paperId==="authored:cat-practice:local-math-quiz"),
  "Blank authoring draft escaped validation");
 await page.locator(".pd-author-paper-settings > summary").click();
 await page.locator("#pd-author-title").fill("Authored mathematics and CAT practice");
 await page.locator("#pd-author-exam").fill("cat-practice");
 await page.locator("#pd-author-paper").fill("local-math-quiz");
 await page.locator("#pd-author-timing-kind").selectOption("whole-paper");
 await page.locator(".pd-author-paper-settings > summary").click();
 await page.locator("#pd-author-duration").fill("20");
 await page.locator("#pd-author-correct").fill("2.5");
 await page.locator(".pd-author-paper-settings > summary").click();
 await page.locator("#pd-author-answer").fill("B");
 await page.locator("#pd-author-answer").blur();
 await fillField("prompt","What is the value of x when x divided by 2 equals 2?");
 await page.locator("#pd-author-tex").fill("\\frac{x}{2}");
 await page.locator("#pd-author-math-alt").fill("x divided by 2");
 check(await page.locator("#pd-author-math-live .katex-mathml").count()===1,"Live authored maths missing");
 await page.locator("#pd-author-math-insert").click();
 for(const [field,text] of [["O1","2"],["O2","4"],["O3","6"],["O4","8"]])await fillField(field,text);
 await fillField("explanation","WORKED-SOLUTION-SECRET. Multiply both sides by 2.");
 // A kind transition must not strand hidden component-scoring metadata.
 await page.locator("#pd-author-kind").selectOption("multiple-select");
 await page.locator("#pd-author-partial-credit").fill("0.5");
 await page.locator("#pd-author-partial-credit").blur();
 await page.locator("#pd-author-kind").selectOption("single-choice");
 check(await page.locator("#pd-author-partial-credit").count()===0,
  "Changing to a non-component kind left obsolete partial-scoring controls/state visible");
 await page.locator("#pd-author-field").selectOption("prompt");
 await page.locator("#pd-author-validate").click();
 check((await page.locator("#pd-author-validation").innerText()).includes("Ready to publish"),
   "Complete valid authoring draft did not pass pre-publish checks");
 await assertNoOverflow(page,"P47-5D valid authoring desktop");
 await shot("author-validation-desktop");
 await page.setViewportSize({width:390,height:844});
 await assertNoOverflow(page,"P47-5D valid authoring mobile");
 await shot("author-validation-phone");
 await page.locator("#pd-author-confirm").check();
 await page.locator("#pd-author-publish").click();
 const paperId="authored:cat-practice:local-math-quiz:r1:custom";
 await page.waitForFunction(id=>[...document.querySelectorAll("[data-authoring-open-paper]")]
   .some(x=>x.dataset.authoringOpenPaper===id),paperId);
 await page.locator('[data-authoring-open-paper="'+paperId+'"]').click();await route(page,"library");
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,paperId);
 const record=(await records(page)).find(x=>x.recordType==="generic-package"&&x.bundle?.paper?.id===paperId);
 check(Boolean(record),"Published package not durable in single IndexedDB record store");
 check(record.bundle.questions.length===1,"Wrong published question count");
 check(record.bundle.paper.scoring.defaultRule.correctMarks===2.5,"Marks changed by publisher");
 check(record.bundle.questions[0].content.richPrompt.blocks.some(b=>b.content?.some(x=>x.type==="math")),
  "Authored explicit LaTeX was not frozen in signed source");
 check(record.bundle.answerKey.entries[0].answer.optionId==="B","Signed answer key lost original B");
 check(!(await page.locator("body").innerText()).includes("WORKED-SOLUTION-SECRET"),
  "Worked explanation leaked into Library");
 await shot("published-library-mobile");
 await page.getByRole("button",{name:/^Start /}).click();
 await route(page,"exam");
 check(await page.locator(".pd-math .katex-mathml").count()>0,"Exam lost authored KaTeX math");
 check(!(await page.locator("body").innerText()).includes("WORKED-SOLUTION-SECRET"),
  "Draft solution leaked before submission");
 check(!(await page.locator("body").innerText()).includes("Option B is correct"),
  "Author key leaked before submission");
 await page.locator("input[data-choice]").nth(1).check();
 await page.locator("#g-submit").click();
 await route(page,"result");
 check((await page.locator("body").innerText()).includes("2.5"),"Author scoring not exposed after submission");
 await page.locator("#result-tab-review").click();
 await page.locator(".worked-solution").first().locator("summary").click();
 check((await page.locator(".worked-solution").first().innerText()).includes("WORKED-SOLUTION-SECRET"),
  "Post-submit worked explanation missing");
 await shot("published-review-mobile");
 const scored=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.packageId===paperId&&x.finishedAt);
 check(Boolean(scored)&&scored.result?.snapshot?.correctCount===1&&scored.result?.snapshot?.earnedMarks===2.5,
  "Frozen authored-paper marks incorrect after real exam");
 const originalHash=scored.frozen.questions[0].contentHash;
 check(originalHash===record.bundle.questions[0].contentHash,
  "Frozen attempt did not pin the exact authored revision");
 await page.reload({waitUntil:"load"});
 await page.locator("#result-tab-review").waitFor({state:"visible"});
 await page.locator("#result-tab-review").click();
 check(await page.locator(".pd-math .katex-mathml").count()>0,"Restored authored result lost math");
 const reread=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.packageId===paperId);
 check(reread?.frozen?.questions?.[0]?.contentHash===originalHash,
  "Reload mutated the immutable published question SHA");
 const restoredPackage=(await records(page)).find(x=>
  x.recordType==="generic-package"&&x.bundle?.paper?.id===paperId);
 check(restoredPackage?.bundle?.answerKey?.contentHash===record.bundle.answerKey.contentHash&&
  reread?.result?.snapshot?.earnedMarks===scored.result.snapshot.earnedMarks&&
  reread?.completionReason===scored.completionReason,
  "Reload crossed private-key, publication revision or completed-score boundaries");
 await page.locator(".worked-solution").first().locator("summary").click();
 check((await page.locator(".worked-solution").first().innerText()).includes("WORKED-SOLUTION-SECRET"),
  "Restored post-submission review lost the authored private explanation");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-authoring").click();await route(page,"authoring");
 await page.locator("#authoring-open-studio").click();
 await page.locator("#pd-author-new").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 await page.locator(".pd-author-paper-settings > summary").click();
 await page.locator("#pd-author-title").fill("Twenty mark written practice");
 await page.locator("#pd-author-exam").fill("manual-mark-practice");
 await page.locator("#pd-author-paper").fill("written-20");
 await page.locator("#pd-author-timing-kind").selectOption("whole-paper");
 await page.locator(".pd-author-paper-settings > summary").click();
 await page.locator("#pd-author-duration").fill("10");
 await page.locator(".pd-author-paper-settings > summary").click();
 await page.locator("#pd-author-kind").selectOption("free-response");
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 await page.locator("#pd-author-answer").fill("");
 await page.locator("#pd-author-answer").blur();
 await fillField("prompt","Explain the principle briefly.");
 await fillField("explanation","Assess the response manually against the stated principle and award up to twenty marks.");
 await page.locator(".pd-author-question-marks summary").click();
 await page.locator("#pd-author-custom-marks").check();
 await page.locator("#pd-author-mark-correctMarks").fill("20");
 await page.locator("#pd-author-mark-correctMarks").blur();
 await page.locator("#pd-author-validate").click();
 const writtenValidationBox=page.locator("#pd-author-validation");
 check((await writtenValidationBox.innerText()).includes("Ready to publish"),
  "Valid twenty-mark written question did not pass authoring validation");
 await writtenValidationBox.locator("details > summary").click();
 const writtenValidation=await writtenValidationBox.innerText();
 check(writtenValidation.includes("automated correct-answer ceiling 0 marks"),
  "Authoring dry-run did not use the canonical automated score ceiling for manual written grading");
 await page.locator("#pd-author-confirm").check();
 await page.locator("#pd-author-publish").click();
 const writtenId="authored:manual-mark-practice:written-20:r1:custom";
 await page.waitForFunction(id=>[...document.querySelectorAll("[data-authoring-open-paper]")]
   .some(x=>x.dataset.authoringOpenPaper===id),writtenId);
 await page.locator('[data-authoring-open-paper="'+writtenId+'"]').click();await route(page,"library");
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,writtenId);
 const writtenPackage=(await records(page)).find(x=>
  x.recordType==="generic-package"&&x.bundle?.paper?.id===writtenId);
 check(writtenPackage?.bundle?.answerKey?.entries?.[0]?.scoringOverride?.correctMarks===20,
  "Question-specific twenty-mark rule was not frozen in the published key");
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 await page.locator("#g-text").fill("A short candidate response.");
 await page.locator("#g-save").click();
 await page.locator("#g-submit").click();await route(page,"result");
 await page.locator("#result-tab-review").click();
 const manualMarks=page.locator("[data-manual-marks]").first();
 check(await manualMarks.getAttribute("max")==="20","Result UI did not expose the frozen twenty-mark ceiling");
 await manualMarks.fill("20");
 await page.locator("[data-manual-note]").first().fill("Full credit for the browser acceptance witness.");
 await page.locator("[data-manual-save]").first().click();
 await page.waitForTimeout(50);
 const writtenAttempt=()=>records(page).then(rows=>rows.find(x=>
  x.recordType==="generic-attempt"&&x.packageId===writtenId&&x.finishedAt));
 check((await writtenAttempt())?.manualGrades?.[0]?.marks===20,
  "Maximum valid manual grade was not persisted");
 await page.locator("[data-manual-marks]").first().fill("20.01");
 await page.locator("[data-manual-save]").first().click();
 await page.waitForTimeout(50);
 check((await writtenAttempt())?.manualGrades?.[0]?.marks===20,
  "Manual grading accepted marks above the question-specific ceiling");
 check(requestUrls.length===0,"Authoring/publishing triggered remote HTTP requests: "+requestUrls.join(", "));
 check(errors.length===0,"Browser errors: "+errors.join(" / "));
 console.log("P47-5D PUBLICATION PASS "+engine+": preinstalled catalog visible; authored MCQ and twenty-mark written response published, scored/manual-graded, review/reload, offline");
}catch(error){await h.diagnose("p47-5d-publish-"+engine,page,error);throw error;}
finally{await h.finish();}
}

export async function externalBankAuthoring(){
// Consolidated from scripts/acceptance-p57a-bank.mjs; retained browser-only assertions remain intact.
/** P57-A/B preserved under P57-C: actual file:// staging, QA, Wordgard publication,
 * immutable frozen APFC/CAT attempts and real cross-browser responsive rendering.
 */
const {openHarness,route,check,records,assertNoOverflow}=await import("../../browser/fixtures.mjs");
const {readFile,writeFile,mkdtemp,rm}=await import("node:fs/promises");
const {createHash}=await import("node:crypto");
const {tmpdir}=await import("node:os");
const {join}=await import("node:path");
const {execFileSync}=await import("node:child_process");
const {fileURLToPath}=await import("node:url");
const {editorialDecisionTemplate,inspectEditorialPair}=await import("../../editorial-editions.mjs");
const {SEMANTIC_CHECKLIST,BANK_CHECKLIST}=await import("../../question-quality.mjs");
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,errors}=await h.open({viewport:{width:1280,height:840}});
const fixture=async name=>JSON.parse(await readFile(new URL("../../../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
async function ensureAuthoring(){
 if(await page.locator("#authoring-import-file").count())return;
 if(await page.locator("#g-authoring").count()){
  await page.locator("#g-authoring").click();await route(page,"authoring");return;
 }
 if(await page.locator("#g-library").count()){
  await page.locator("#g-library").click();await route(page,"library");
  await page.locator("#g-authoring").click();await route(page,"authoring");return;
 }
 throw Error("Cannot reach Authoring from current acceptance state");
}
async function stage(source,label){
 await ensureAuthoring();
 await page.locator("#authoring-import-file").setInputFiles({name:label+".json",mimeType:"application/json",
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
 await page.waitForFunction(id=>[...document.querySelectorAll("[data-authoring-open-paper]")]
   .some(x=>x.dataset.authoringOpenPaper===id),id);
 await page.locator('[data-authoring-open-paper="'+id+'"]').click();await route(page,"library");
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
 const secrecyCat=await fixture("cat");
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const secrecyCases=[
  ["shared-stimulus",source=>{source.stimuli[0].text+=" Correct answer: A";}],
  ["media-alt",source=>{
    source.media=[{id:"secret-image",dataUri:"data:image/png;base64,"+png,altText:"Correct answer: A"}];
    source.stimuli.push({id:"secret-picture",kind:"image",mediaRef:"secret-image",
      altText:"Question illustration"});
    source.questions[0].stimulusRef="secret-picture";
  }]
 ];
 for(const [label,mutate] of secrecyCases){
  const unsafe=structuredClone(secrecyCat);mutate(unsafe);
  await stage(unsafe,"p60c-"+label);
  check((await page.locator(".pd-author-section-manager").allTextContents()).some(x=>
    /candidate-answer-leak|Candidate-visible content contains an explicit answer/i.test(x)),
    engine+" P60-C "+label+" answer leak bypassed browser staging");
  check((await records(page)).length===initial,
    engine+" P60-C "+label+" unsafe source changed persisted exams");
  await clearStage();
 }
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
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
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
 await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
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
 second.questions[0].qa={status:"needs-review",applicability:{
  mathematical:false,legal:true,timeSensitive:true,asOfDate:"2026-11-12"
 }};
 const overlap=structuredClone(apfc);overlap.revision=2;overlap.bankId="second-source-p57c";
 overlap.questions=overlap.questions.map(q=>({...q,id:"copy-"+q.id}));
 await ensureAuthoring();
 await page.locator("#authoring-open-studio").click();
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
 const firstQuestion=await page.locator("#pd-author-questions option").first().getAttribute("value");
 await page.locator("#pd-author-questions").selectOption(firstQuestion);
 await page.locator("#pd-author-evidence > summary").click();
 check(await page.locator("#pd-author-qa-legal").isChecked()&&
  await page.locator("#pd-author-qa-time-sensitive").isChecked()&&
  await page.locator("#pd-author-qa-asof").inputValue()==="2026-11-12",
  engine+" author-declared QA applicability was lost during staged Wordgard handoff");
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
 await page.waitForFunction(id=>[...document.querySelectorAll("[data-authoring-open-paper]")]
   .some(x=>x.dataset.authoringOpenPaper===id),revised);
 await page.locator('[data-authoring-open-paper="'+revised+'"]').click();await route(page,"library");
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,revised);
 const revision2=(await records(page)).find(r=>r.recordType==="generic-package"&&r.bundle?.paper.id===revised);
 check(Boolean(revision2)&&revision2.bundle.questions.length===5,
  engine+" two-batch selective revision was not saved as one immutable paper");
 check(revision2.bundle.questions.some(q=>q.editorial.notes.includes("Author-entered review/QA acknowledgement")),
  engine+" author-attributed warning acceptance not frozen with the revision");
 check((await records(page)).some(r=>r.recordType==="generic-attempt"&&r.frozen.paper.id===apfcId),
  engine+" revision 2 modified the original APFC score/history");
 // P60-D end-to-end: generate a corrected version of an independent,
 // unmodified Source, then import both through the normal offline Library.
 // The test review is intentionally synthetic and never authenticates facts.
 const originalBank=structuredClone(apfc),reviewedBank=structuredClone(apfc);
 reviewedBank.questions[0].answer="A";
 reviewedBank.questions[0].explanation="Synthetic proposed answer change (not an authentic source correction).";
 const digest=x=>createHash("sha256").update(x).digest("hex");
 const originalRaw=JSON.stringify(originalBank),reviewedRaw=JSON.stringify(reviewedBank);
 const temp=await mkdtemp(join(tmpdir(),"pd-p60d-ui-"));
 let editionPair;
 try{
  const path=join(temp,"reviewed.json");
  await writeFile(path,reviewedRaw);
  const command=fileURLToPath(new URL("../../question-quality.mjs",import.meta.url));
  const packet=JSON.parse(execFileSync(process.execPath,[command,"candidate",path,"--limit","10"],
   {encoding:"utf8",timeout:30000}));
  const decisions=editorialDecisionTemplate(originalBank,reviewedBank,digest(originalRaw),digest(reviewedRaw));
  delete decisions.templateIncomplete;
  decisions.entries=decisions.entries.map(row=>({...row,
   disposition:"corrected",
   reason:"Synthetic example: retain printed source key and separately record the disputed proposed reviewed key.",
   evidence:[{publisher:"Fixture",title:"Synthetic editorial decision",locator:"P60-D browser test",
    sourceNote:"Test-only user-attributed note; independent factual correctness not asserted"}]
  }));
  const reviewCore=new Set(["exam-relevance","clarity-defensibility","reasoning-correctness",
   "factual-correctness","explanation-quality"]);
  const review={format:"practice-desk-quality-review",version:3,bankId:reviewedBank.bankId,
   sourceSha256:packet.sourceSha256,reviewMode:"self-review",candidateOnlyContextClaim:false,
   reviewer:{id:"regression-only",kind:"ai"},
   records:packet.items.map(entry=>{
    const question=reviewedBank.questions.find(q=>q.id===entry.questionId),
     mathematical=question.id==="account-01",required=new Set(reviewCore);
    if(["single-choice","multiple-select"].includes(question.kind))required.add("distractor-quality");
    if(mathematical)required.add("mathematical-correctness");
    return {questionId:entry.questionId,questionSha256:digest(JSON.stringify(question)),
      candidateSha256:entry.candidateSha256,
      applicability:{mathematical:mathematical?"yes":"no",legal:"no",timeSensitive:"no",visual:"no",asOfDate:null},
      solution:{status:"completed",answer:String(question.answer),
       reasoning:"Synthetic second-pass software-fixture assertion, not a checked external answer."},
      semanticChecks:SEMANTIC_CHECKLIST.filter(x=>required.has(x.id)).map(x=>({id:x.id,status:"pass",
       basis:x.id==="mathematical-correctness"||x.id==="factual-correctness"&&mathematical?
        "mathematical-proof":x.id==="factual-correctness"?"source-consulted":"semantic-editorial",
       rationale:"Synthetic regression fixture, verification not authenticated."})),
      evidence:[{publisher:"Fixture",title:"P60-D browser QA",locator:"question:"+question.id,
       retrievedAt:"2026-11-06",excerpt:"Only tests code contracts; not factual source verification."}]
    };
   }),
   bankReview:{checks:BANK_CHECKLIST.map(x=>({id:x.id,status:"pass",basis:"bank-editorial",
    rationale:"Synthetic bank-level browser regression assertion only."}))}};
  editionPair=inspectEditorialPair(
   {data:originalBank,raw:originalRaw,sha256:digest(originalRaw)},
   {data:reviewedBank,raw:reviewedRaw,sha256:digest(reviewedRaw)},
   decisions,review);
  check(editionPair.valid,engine+" P60-D editorial preflight failed: "+
   editionPair.issues.map(x=>x.code+":"+x.message).join("; "));
  // P60-F: use the *actual external agent handoff* to publish the reviewed
  // pair. Import exact signed output files through the user's offline Library.
  const originalPath=join(temp,"original.json"),decisionsPath=join(temp,"decisions.json");
  const reviewPath=join(temp,"review.json"),outputPath=join(temp,"approved-pair");
  await writeFile(originalPath,originalRaw);
  await writeFile(decisionsPath,JSON.stringify(decisions));
  await writeFile(reviewPath,JSON.stringify(review));
  const handoffCommand=fileURLToPath(new URL("../../agent-handoff.mjs",import.meta.url));
  const preflight=JSON.parse(execFileSync(process.execPath,
   [handoffCommand,"assess","paired",originalPath,path,decisionsPath,
    "--quality-review",reviewPath],
   {encoding:"utf8",timeout:30000}));
  check(preflight.readyForPublication===true&&preflight.factualVerification==="not-performed"&&
   preflight.appAccess==="none",
   engine+" P60-F external agent handoff incorrectly certified source truth or failed strict review");
  const result=JSON.parse(execFileSync(process.execPath,
   [handoffCommand,"publish","paired",originalPath,path,decisionsPath,outputPath,
    "--quality-review",reviewPath,"--allow-create"],
   {encoding:"utf8",timeout:30000}));
  check(result.published===true&&result.writtenFiles?.length===5&&
    result.externalAuthenticatedReview===false,
   engine+" P60-F permission-scoped publication did not yield exact five-file handoff");
  editionPair.packages={
   sourcePkg:JSON.parse(await readFile(join(outputPath,"source.exam.json"),"utf8")),
   reviewedPkg:JSON.parse(await readFile(join(outputPath,"reviewed.exam.json"),"utf8"))
  };
  check((await readFile(join(outputPath,"original-source.json"),"utf8"))===originalRaw,
   engine+" P60-F external handoff altered immutable source bytes");
 }finally{await rm(temp,{recursive:true,force:true});}
 const sourceEdition=editionPair.packages.sourcePkg,reviewedEdition=editionPair.packages.reviewedPkg;
 const importEdition=async(bundle,name)=>{
  await ensureAuthoring();
  await page.locator("#authoring-import-file").setInputFiles({name,mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(bundle))});
  await page.waitForFunction(id=>[...document.querySelectorAll("[data-authoring-open-paper]")]
   .some(x=>x.dataset.authoringOpenPaper===id),bundle.paper.id);
 };
 await importEdition(sourceEdition,"p60d-original.exam.json");
 await importEdition(reviewedEdition,"p60d-reviewed.exam.json");
 await page.locator('[data-authoring-open-paper="'+reviewedEdition.paper.id+'"]').click();
 await route(page,"library");
 check(await page.locator('#g-edition [data-edition="source"]').count()===1&&
  await page.locator('#g-edition [data-edition="reviewed"]').count()===1,
  engine+" P60-D source/reviewed switch not visible in imported family");
 check((await records(page)).some(r=>r.recordType==="generic-package"&&
  r.bundle.paper.id===sourceEdition.paper.id&&r.bundle.answerKey.entries[0].answer.optionId==="B"),
  engine+" P60-D corrected review overwrote frozen original answer");
 check((await records(page)).some(r=>r.recordType==="generic-package"&&
  r.bundle.paper.id===reviewedEdition.paper.id&&r.bundle.answerKey.entries[0].answer.optionId==="A"),
  engine+" P60-D reviewed correction was not separately saved");
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 const pairAttempt=(await records(page)).find(r=>r.recordType==="generic-attempt"&&
  r.frozen.paper.id===reviewedEdition.paper.id&&r.finishedAt===null);
 check(Boolean(pairAttempt?.sourceReviewReference)&&
  pairAttempt?.frozen.paper.sourcePaperRevisionId===sourceEdition.paper.id&&
  pairAttempt?.frozen.paper.sourceAnswerKeyRevisionId===sourceEdition.answerKey.id&&
  pairAttempt?.sourceKeyReference?.sourcePaperRevisionId===sourceEdition.paper.id&&
  pairAttempt?.sourceKeyReference?.sourceAnswerKeyRevisionId===sourceEdition.answerKey.id&&
  pairAttempt?.sourceKeyReference?.entries.filter(x=>x.comparable).length===3,
  engine+" P62-B source/reviewed original revision was not frozen exactly at attempt start");
 await page.locator('input[data-choice="A"]').click();
 await page.locator("#g-submit").click();await route(page,"result");
 const completed=(await records(page)).find(r=>r.recordType==="generic-attempt"&&
  r.frozen.paper.id===reviewedEdition.paper.id&&r.finishedAt!==null);
 check(Boolean(completed?.sourceReviewReference)&&
  completed.result?.items[0]?.verdict==="correct",
  engine+" P60-D reviewed score/history did not freeze separate published correction");
 // P60-F independent end-to-end: reviewed source package → frozen marks →
 // explicit Result→Learning card → deliberate FSRS rating → reload preserved.
 await page.locator("#result-tab-review").click();
 // This review panel is rendered asynchronously; WebKit may complete the tab
 // event before the lazy question renderer inserts its three review rows.
 await page.waitForFunction(()=>document.querySelectorAll(".generic-review").length===3,
  undefined,{timeout:10000});
 check(await page.locator(".generic-review").count()===3,
  engine+" P60-F reviewed candidate output cannot be reviewed after scoring");
 await page.locator("[data-add-card]").first().click();
 let card;
 for(let i=0;i<55;i++){
  card=(await records(page)).find(x=>x.recordType==="learning-card"&&x.sourceAttemptId===completed.id);
  if(card)break;
  await page.waitForTimeout(75);
 }
 check(Boolean(card)&&card.reviews?.length===0,
  engine+" P60-F card not derived from frozen reviewed source or FSRS was silently graded");
 await page.getByRole("button",{name:/^(?:← )?Library$/}).click();await route(page,"library");
 await page.locator("#g-learning").click();await route(page,"learning");
 // Pass 5 native bridge: derive learner evidence locally, then attach it to a
 // standard Authoring Brief without exposing unrestricted History to an agent.
 await page.locator("#learning-focus-exam").selectOption(reviewedEdition.examId);
 await page.locator("#learning-focus-mode").selectOption("focused");
 await page.locator("#learning-focus-intent").selectOption("targeted-practice");
 await page.locator("#learning-focus-generate").click();
 await page.locator("#learning-focus-preview").waitFor({state:"visible"});
 const focusPacket=JSON.parse(await page.locator("#learning-focus-preview").inputValue());
 check(focusPacket.examId===reviewedEdition.examId&&focusPacket.mode==="focused"&&
   focusPacket.intent==="targeted-practice"&&focusPacket.privacy?.scope==="exam-only"&&
   !("questionEvidence" in focusPacket)&&!JSON.stringify(focusPacket).includes("answerKey"),
   engine+" Pass 5 Focused learner packet leaked detailed/key data or lost exam scope");
 const nativeBlueprint={
   format:"practice-desk-content-blueprint",version:1,id:"p60f-browser-brief",
   examId:reviewedBank.examId,paperId:reviewedBank.paperId,revision:reviewedBank.revision,
   targetCount:Math.max(2,reviewedBank.questions.length),allowPartial:true,
   syllabus:{basis:"user-defined",asOfDate:"2026-11-18",
    reference:"Synthetic browser regression fixture only; not an authentic exam allocation."},
   requirements:{requireExplanation:true,minCitations:0,allowedOrigins:["ai-original"],
    maxTopicSharePercent:100},
   quotas:{},
   paperRules:{scoring:reviewedBank.scoring,timing:reviewedBank.timing,
    ...(reviewedBank.navigation?{navigation:reviewedBank.navigation}:{}),sections:reviewedBank.sections,
    ...(reviewedBank.tools?{tools:reviewedBank.tools}:{}),
    ...(reviewedBank.practiceModes?{practiceModes:reviewedBank.practiceModes}:{})}
 };
 const blueprintRaw=JSON.stringify(nativeBlueprint,null,2)+"\n";
 await page.locator("#learning-blueprint-file").setInputFiles({
   name:"blueprint.json",mimeType:"application/json",buffer:Buffer.from(blueprintRaw)
 });
 await page.locator("#learning-brief-bank-id").fill("p60f-native-next");
 await page.locator("#learning-brief-title").fill("P60-F native browser brief");
 await page.locator("#learning-brief-batch-size").fill("2");
 await page.locator("#learning-brief-generate").click();
 await page.locator("#learning-standard-brief-preview").waitFor({state:"visible"});
 const standardBrief=JSON.parse(await page.locator("#learning-standard-brief-preview").inputValue());
 check(standardBrief.learnerFocusIncluded===false&&standardBrief.task?.requestedNow===2&&
   standardBrief.blueprint?.examId===reviewedEdition.examId&&
   standardBrief.classification?.taxonomyAssignmentPolicy==="deepest-defensible"&&
   standardBrief.classification?.requireTaxonomy===false,
   engine+" native standard Authoring Brief was not generated for the learner-focus exam");
 await page.waitForFunction(()=>!document.querySelector("#learning-brief-personalise")?.disabled);
 await page.locator("#learning-brief-personalise").click();
 await page.locator("#learning-brief-preview").waitFor({state:"visible"});
 const personalised=JSON.parse(await page.locator("#learning-brief-preview").inputValue());
 check(personalised.learnerFocusIncluded===true&&
   personalised.learnerFocus?.examId===reviewedEdition.examId&&
   personalised.personalisationIntent?.compositionPolicy==="focus-first-with-blueprint-guardrails"&&
   !JSON.stringify(personalised).includes("answerKey"),
   engine+" Pass 5 native personalised Authoring Brief is incomplete or leaked answer-key state");
 await page.locator("#learning-due").click();
 check(await page.locator(".learning-answer").count()===0,
  engine+" P60-F user Learning answer leaked before reveal");
 await page.locator("#learning-reveal").click();
 await page.locator('[data-grade="3"]').click();
 await page.locator("#learning-note").waitFor({state:"visible"});
 await page.locator("#learning-note").fill("P60-F externally authored reviewed APFC correction");
 await page.locator("#learning-save").click();
 let afterReview;
 for(let i=0;i<55;i++){
  afterReview=(await records(page)).find(x=>x.id===card.id&&x.reviews?.length===1&&
   x.note==="P60-F externally authored reviewed APFC correction");
  if(afterReview)break;
  await page.waitForTimeout(75);
 }
 check(Boolean(afterReview),
  engine+" P60-F explicit FSRS rating/learning note was not persisted");
 await page.reload({waitUntil:"load"});
 const restored=await records(page);
 check(restored.some(x=>x.id===completed.id&&
   x.result.snapshot.earnedMarks===completed.result.snapshot.earnedMarks)&&
  restored.some(x=>x.id===card.id&&x.reviews.length===1)&&
  restored.some(x=>x.recordType==="generic-package"&&x.bundle?.paper.id===sourceEdition.paper.id),
  engine+" P60-F reload changed independently frozen source, grade or FSRS evidence");
 check(errors.length===0,engine+" unexpected page errors "+errors.join("; "));
 console.log("P57-A/B/C + P60-D/F "+engine+" PASS: bounded staging, strict agent handoff, separate original/reviewed exam, frozen score and FSRS Learning lifecycle");
}catch(error){await h.diagnose("p57a-"+engine,page,error);throw error;}
finally{await h.finish();}
}
