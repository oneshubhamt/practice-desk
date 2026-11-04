/** P53 file:// whole UI acceptance: genuine mixed-subject *single* exam section.
 * Exercises Wordgard heading selection, immutable publication, meaningful
 * taxonomy builder and a frozen filtered attempt in each browser engine.
 */
import {openHarness,route,check,records,assertNoOverflow} from "./browser/fixtures.mjs";
import {mkdir} from "node:fs/promises";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,errors}=await h.open({viewport:{width:1280,height:840}});
const images="artifacts/p53-taxonomy";
await mkdir(images,{recursive:true});
const shot=async(label)=>page.screenshot({path:images+"/"+engine+"-"+label+".png",
 animations:"disabled",fullPage:true});
async function input(id,value){
 const field=page.locator(id);
 await field.fill(value);
 await field.blur();
}
async function field(name,value){
 await page.locator("#pd-author-field").selectOption(name);
 const editable=page.locator("#pd-author-editor wg-content");
 await editable.waitFor({state:"visible"});
 await editable.click();
 await page.keyboard.insertText(value);
}
try{
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 await page.locator(".pd-author-paper-settings summary").click();
 await input("#pd-author-title","P53 mixed academic subjects in one exam section");
 await input("#pd-author-exam","upsc-epfo-apfc");
 check(await page.locator("#pd-author-syllabus-heading").isEnabled(),
   engine+" APFC heading chooser did not activate immediately after changing family ID");
 await input("#pd-author-paper","p53-mixed-ui");
 await page.locator(".pd-author-paper-settings summary").click();

 await input("#pd-author-section","Combined Examination");
 await page.locator("#pd-author-syllabus-heading").selectOption("labour");
 check((await page.locator(".pd-author-taxonomy-summary").innerText()).includes("Industrial Relations"),
   engine+" official subject not reflected in authoring summary");
 check((await page.locator("#pd-author-section").inputValue())==="Combined Examination",
   engine+" choosing a syllabus heading changed real exam section");
 await input("#pd-author-topic","Labour Codes");
 await input("#pd-author-subtopic","Wages");
 await input("#pd-author-answer","B");
 await field("prompt","Which option demonstrates a wage principle?");
 for(const [k,v] of [["A","Incorrect A"],["B","Correct B"],["C","Incorrect C"],["D","Incorrect D"]])
  await field(k,v);
 await page.locator("#pd-author-add-question").click();
 await page.locator("#pd-author-editor wg-content").waitFor({state:"visible"});
 await input("#pd-author-section","Combined Examination");
 await page.locator("#pd-author-syllabus-heading").selectOption("economy");
 check((await page.locator("#pd-author-topic").inputValue())===""&&
   (await page.locator("#pd-author-section").inputValue())==="Combined Examination",
   engine+" an unclassified topic changed the real section");
 await input("#pd-author-answer","A");
 await field("prompt","Which option identifies an economic development issue?");
 for(const [k,v] of [["A","Correct A"],["B","Incorrect B"],["C","Incorrect C"],["D","Incorrect D"]])
  await field(k,v);
 await page.locator("#pd-author-validate").click();
 check((await page.locator("#pd-author-validation").innerText()).includes("Ready to publish"),
   engine+" semantically distinct subject paths did not validate");
 await shot("authoring-desktop");
 await page.setViewportSize({width:195,height:844});
 await assertNoOverflow(page,engine+" P53 195px Wordgard semantic classification");
 await shot("authoring-195px");
 await page.setViewportSize({width:1280,height:840});
 await page.locator("#pd-author-confirm").check();
 await page.locator("#pd-author-publish").click();
 await page.locator("#g-papers").waitFor({state:"visible"});
 const id="authored:upsc-epfo-apfc:p53-mixed-ui:r1:custom";
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,id);
 const packageRecord=(await records(page)).find(row=>
  row.recordType==="generic-package"&&row.bundle?.paper?.id===id);
 check(Boolean(packageRecord),engine+" immutable mixed-topic bundle was not saved");
 const bundle=packageRecord.bundle;
 check(bundle.paper.sections.length===1&&
   bundle.paper.sections[0].questionRevisionIds.length===2&&
   bundle.paper.sections[0].title==="Combined Examination",
   engine+" two academic subjects incorrectly split actual exam sections");
 const paths=bundle.questions.map(q=>q.content.topicIds);
 check(paths[0].length===3&&paths[1].length===1&&paths[0][0]!==paths[1][0]&&
   paths[0][0].includes("Industrial")&&paths[1][0].includes("Developmental"),
   engine+" source subject-only and nested taxonomy tags not frozen correctly");
 await page.locator("#g-compose-details summary").click();
 // Details toggling intentionally redraws the Library asynchronously. Inspect
 // the populated list, not the transient closed-builder placeholder.
 await page.locator("#g-compose-topic optgroup").first().waitFor({state:"attached"});
 const chooser=page.locator("#g-compose-topic");
 check(await chooser.locator("optgroup").count()>=2,
   engine+" practice filtering has no navigable subject groups");
 const shown=await chooser.locator("option").allTextContents();
 check(shown.some(s=>s.includes("Entire subject"))&&!shown.some(s=>s.includes("topic:")),
   engine+" source taxonomy uses opaque IDs rather than readable hierarchical labels");
 await chooser.selectOption(paths[1][0]);
 await page.locator("#g-compose-count").fill("1");
 await page.locator("#g-compose-seed").fill("p53-subject-filter");
 await page.locator("#g-compose-preview").click();
 check((await page.locator(".compose-preview").innerText()).includes("1 selected from 1 eligible"),
   engine+" ancestor subject filter selected wrong number of questions");
 await page.locator("#g-compose-start").click();
 await route(page,"exam");
 check((await page.locator(".exam-question").innerText()).includes("economic development issue"),
   engine+" subject-specific practice selected a question from another academic subject");
 check(errors.length===0,engine+" new browser errors "+errors.join("; "));
 console.log("P53 "+engine+" PASS: one real exam section, distinct official academic subjects, topicless hierarchy, readable picker, source-frozen filtered attempt");
}catch(error){await h.diagnose("p53-"+engine,page,error);throw error;}
finally{await h.finish();}
