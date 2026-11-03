/** P47-5D actual file:// Library author → validate → immutable publish → score → review.
 * Captures focused, user-facing screenshots, not v11 parity images.
 */
import {mkdir} from "node:fs/promises";
import {openHarness,route,check,assertNoOverflow,records} from "./browser/fixtures.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const dir="artifacts/p47-5d-publish";await mkdir(dir,{recursive:true});
const {page,errors}=await h.open({viewport:{width:1280,height:830},colorScheme:"light"});
const requestUrls=[];
page.on("request",r=>{if(/^https?:/i.test(r.url()))requestUrls.push(r.url());});
const shot=async name=>page.screenshot({path:dir+"/"+engine+"-"+name+".png",animations:"disabled",fullPage:true});
async function fillField(field,text){
 await page.locator("#pd-author-field").selectOption(field);
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 await page.locator("#pd-author-editor wg-content").click();
 await page.keyboard.insertText(text);
}
try{
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 check(await page.locator("#pd-author-publish").isEnabled(),"Publish entrypoint absent");
 await page.locator("#pd-author-publish").click();
 check((await page.locator("#pd-author-validation").innerText()).includes("Fix"),
  "Incomplete draft incorrectly publishable");
 check(!(await records(page)).some(x=>x.recordType==="generic-package"&&
  x.bundle?.paper?.paperId==="authored:cat-practice:local-math-quiz"),
  "Blank authoring draft escaped validation");
 await page.locator(".pd-author-paper-settings summary").click();
 await page.locator("#pd-author-title").fill("Authored mathematics and CAT practice");
 await page.locator("#pd-author-exam").fill("cat-practice");
 await page.locator("#pd-author-paper").fill("local-math-quiz");
 await page.locator("#pd-author-duration").fill("20");
 await page.locator(".pd-author-paper-settings summary").click();
 await page.locator("#pd-author-answer").fill("B");
 await page.locator("#pd-author-answer").blur();
 await fillField("prompt","What is the value of x when x divided by 2 equals 2?");
 await page.locator("#pd-author-tex").fill("\\frac{x}{2}");
 await page.locator("#pd-author-math-alt").fill("x divided by 2");
 check(await page.locator("#pd-author-math-live .katex-mathml").count()===1,"Live authored maths missing");
 await page.locator("#pd-author-math-insert").click();
 for(const [letter,text] of [["A","2"],["B","4"],["C","6"],["D","8"]])await fillField(letter,text);
 await fillField("explanation","WORKED-SOLUTION-SECRET. Multiply both sides by 2.");
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
 await page.locator("#g-papers").waitFor({state:"visible"});
 const paperId="authored:cat-practice:local-math-quiz:r1:custom";
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
 await page.locator("#g-start").click();
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
 check(requestUrls.length===0,"Authoring/publishing triggered remote HTTP requests: "+requestUrls.join(", "));
 check(errors.length===0,"Browser errors: "+errors.join(" / "));
 console.log("P47-5D PUBLICATION PASS "+engine+": invalid draft rejected, source/key/hash published, scored, review/reload, offline");
}catch(error){await h.diagnose("p47-5d-publish-"+engine,page,error);throw error;}
finally{await h.finish();}
