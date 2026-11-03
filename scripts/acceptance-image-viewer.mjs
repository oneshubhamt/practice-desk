/** P47-3: actual single-file file:// image viewer; no v11 screenshot parity.
 * One source CGL q3 with 5 real figures, source review, 195px + 140% text,
 * native modal focus, mouse/keyboard and paused exam isolation.
 */
import {readFile} from "node:fs/promises";
import {openHarness,route,records,check,assertNoOverflow} from "./browser/fixtures.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {builtinCglPackages} from "../src/app/exam-package.ts";
const engine=process.argv[2]||"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
const requests=[];
page.on("request",request=>{
 if(/^https?:/i.test(request.url()))requests.push(request.url());
});
const source=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const pkg=builtinCglPackages(source,patches,solutions).find(x=>
 x.paper.paperId==="cgl-2026-10-08"&&x.paper.edition==="reviewed");
check(Boolean(pkg),"P47-3 reviewed 8 October CGL fixture missing");
const expected=source["cgl-2026-10-08"].questions.find(q=>q.n===3);
check(Boolean(expected?.images.stem)&&expected.images.options?.filter(Boolean).length===4,
 "P47-3 real question fixture must contain four option images and a stem diagram");
const modal=page.locator("dialog.generic-image-dialog");
const thumbnail=page.locator(".exam-question .generic-choice-media-row .generic-figure").first();
const button=page.locator(".exam-question .generic-choice-media-row [data-image-open]").first();
const readModal=()=>page.evaluate(()=>{
 const d=document.querySelector("dialog.generic-image-dialog");
 if(!d)return null;
 const image=d.querySelector(".generic-image-large");
 const canvas=d.querySelector(".generic-image-viewport");
 return {open:d.open,focused:d.contains(document.activeElement),
  zoom:d.querySelector(".generic-image-zoom")?.textContent,
  source:image?.getAttribute("src")?.slice(0,36),
  naturalWidth:image?.naturalWidth,naturalHeight:image?.naturalHeight,
  imageAlt:image?.alt,scroll:document.documentElement.scrollWidth,
  viewport:innerWidth,width:d.getBoundingClientRect().width,
  imageTransform:image?.style.transform,
  canvasWidth:canvas?.clientWidth,canvasHeight:canvas?.clientHeight,
  offset:canvas?{x:canvas.getBoundingClientRect().x,y:canvas.getBoundingClientRect().y}:null};
});
const mediaSnapshot=async id=>{
 const a=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.id===id);
 check(Boolean(a),"P47-3 missing frozen attempt "+id);
 return {frozenSnapshot:a.frozen.snapshot,sourceHash:a.frozen.key.contentHash,
  responses:a.state.responses.map(x=>({id:x.questionRevisionId,response:x.response,flagged:x.flagged})),
  id:a.id};
};
try{
 await chooseModernPaper(page,pkg.paper.id);
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator('[data-q="2"]').click();
 check(await page.locator(".exam-question img.generic-figure").count()===5,
  "P47-3 missing actual source-backed five-image question");
 check(await page.locator(".exam-question .generic-choice-media-row").count()===4,
  "P47-3 option figure not separated from native answer input label");
 check(await page.locator(".exam-question [data-image-open]").count()===5,
  "P47-3 image enlargement must be present for question and all options");
 const id=new URL(page.url()).searchParams.get("attempt");
 check(Boolean(id),"P47-3 source-exam URL missing frozen attempt ID");
 await page.waitForFunction(()=>document.querySelector("input[data-choice]")!==null);
 const before=await page.locator("input[data-choice]:checked").count();
 check(before===0,"P47-3 test must start with blank choice");
 const src=await thumbnail.getAttribute("src"),alt=await thumbnail.getAttribute("alt");
 // Clicking the option image cannot choose its containing radio. One typed
 // immutable media source becomes a second transient image only while open.
 await thumbnail.click();
 await modal.waitFor({state:"visible"});
 await page.waitForFunction(()=>document.querySelector(".generic-image-large")?.naturalWidth>0);
 const first=await readModal();
 check(first?.open&&first.focused&&first.source?.startsWith("data:image/")&&
  first.imageAlt===alt,"P47-3 native modal did not display exact verified original/alt");
 check(await page.locator("input[data-choice]:checked").count()===0,
  "P47-3 enlarging option image changed an answer");
 check((await page.locator("dialog").innerText()).includes("Image detail")&&
  !(await modal.innerText()).includes("Correct answer"),
  "P47-3 modal displayed an answer key before submission");
 const pressed=await page.locator("#g-exam-full").getAttribute("aria-pressed");
 await page.keyboard.press("a");await page.keyboard.press("m");await page.keyboard.press("f");
 check(await page.locator("input[data-choice]:checked").count()===0&&
  await page.locator("#g-flag").getAttribute("aria-pressed")==="false"&&
  await page.locator("#g-exam-full").getAttribute("aria-pressed")===pressed,
  "P47-3 modal let answer/flag/fullscreen shortcuts affect background");
 await page.locator(".generic-image-toolbar [aria-label='Zoom in']").click();
 check((await page.locator(".generic-image-zoom").innerText())!=="100%",
  "P47-3 zoom-in button did not change zoom");
 await page.locator(".generic-image-toolbar [aria-label='Zoom out']").click();
 check((await page.locator(".generic-image-zoom").innerText())==="100%",
  "P47-3 zoom-out did not restore fitting view");
 await page.locator(".generic-image-toolbar [aria-label='Zoom in']").click();
 await page.locator(".generic-image-viewport").hover();
 await page.mouse.wheel(0,-250);
 check(Number.parseInt(await page.locator(".generic-image-zoom").innerText())>130,
  "P47-3 wheel zoom did not advance on the canvas");
 await page.locator(".generic-image-toolbar [aria-label='Reset zoom and position']").click();
 check((await page.locator(".generic-image-zoom").innerText())==="100%",
  "P47-3 reset must fit");
 const focusName=await button.getAttribute("aria-label");
 await page.keyboard.press("Escape");
 await modal.waitFor({state:"detached"});
 check((await page.locator("[data-image-open]:focus").count())===1&&
  await button.getAttribute("aria-label")===focusName,
  "P47-3 Escape did not return keyboard focus to image control");
 check(await page.locator("input[data-choice]:checked").count()===0,
  "P47-3 closing image changed answer");
 // Keyboard-only control is reachable independent of pointer gestures.
 await button.focus();await page.keyboard.press("Enter");
 await modal.waitFor({state:"visible"});
 await page.keyboard.press("+");
 check(Number.parseInt(await page.locator(".generic-image-zoom").innerText())>100,
  "P47-3 keyboard + did not zoom");
 await page.keyboard.press("0");
 check((await page.locator(".generic-image-zoom").innerText())==="100%",
  "P47-3 keyboard 0 did not reset");
 await page.locator(".generic-image-viewport").focus();
 await page.keyboard.press("Tab");
 check((await readModal())?.focused,
  "P47-3 native dialog did not keep Tab within its modal focus area");
 await page.locator(".generic-image-close").click();
 await modal.waitFor({state:"detached"});
 // The launch control is non-form and remains operable when pause disables
 // the answer fieldset. Resuming must not require reopening the question.
 await page.locator("#g-pause").click();
 await page.waitForFunction(()=>{
  const field=document.querySelector("fieldset.generic-response-group");
  const pause=document.getElementById("g-pause");
  return field?.hasAttribute("disabled")&&pause?.textContent?.includes("Resume");
 });
 check(await page.locator("input[data-choice]").first().isDisabled(),
  "P47-3 expected actually disabled answer inputs while paused");
 const pausedButton=page.locator(".exam-question .generic-choice-media-row [data-image-open]").first();
 await pausedButton.focus();await page.keyboard.press(" ");
 await modal.waitFor({state:"visible"});
 check(await page.locator("fieldset.generic-response-group").getAttribute("disabled")!==null&&
  await page.locator("input[data-choice]").first().isDisabled(),
  "P47-3 image enlargement activated paused inputs");
 await page.keyboard.press("Escape");await modal.waitFor({state:"detached"});
 await page.locator("#g-pause").click();
 check(await page.locator("input[data-choice]:checked").count()===0,
  "P47-3 paused enlargement touched answer");
 // Live render close on stage/navigation must not retain an orphaned dialog.
 await page.locator("[data-q='3']").click();
 check(await page.locator("dialog.generic-image-dialog").count()===0,
  "P47-3 question transition retained stale dialog");
 await page.locator("[data-q='2']").click();
 await button.click();await modal.waitFor({state:"visible"});
 await page.setViewportSize({width:390,height:844});
 check((await readModal())?.viewport===390,"P47-3 zoom modal failed responsive resize");
 for(let n=0;n<18;n++){
  const zoomIn=page.locator(".generic-image-toolbar [aria-label='Zoom in']");
  if(!await zoomIn.isEnabled())break;
  await zoomIn.click();
 }
 check((await page.locator(".generic-image-zoom").innerText())==="800%",
  "P47-3 zoom must stop precisely at 8x");
 const canvas=page.locator(".generic-image-viewport");
 const box=await canvas.boundingBox();
 check(Boolean(box),"P47-3 canvas must be physically rendered");
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+65,box.y+box.height/2+35,{steps:5});
 await page.mouse.up();
 const moved=await readModal();
 check(Boolean(moved?.imageTransform?.includes("scale(8)"))&&
  !moved.imageTransform.includes("NaN")&&!moved.imageTransform.includes("Infinity"),
  "P47-3 pointer pan/zoom created invalid transform");
 await page.locator(".generic-image-close").click();await modal.waitFor({state:"detached"});
 await page.setViewportSize({width:1366,height:768});
 const savedBefore=await mediaSnapshot(id);
 check(savedBefore.responses.every(x=>x.response==null),"P47-3 visual interaction persisted a response");
 // Review full frozen media, and the original-source comparison if available.
 await page.locator("input[data-choice]").first().click();
 await page.locator("#g-submit").click();await route(page,"result");
 await page.locator("#result-tab-review").click();
 await page.locator("#result-review").waitFor({state:"visible"});
 const figure=page.locator("#result-review .generic-media-frame img.generic-figure").first();
 check(await figure.count()===1,"P47-3 review missed original frozen media");
 const reviewedAlt=await figure.getAttribute("alt");
 await figure.click();await modal.waitFor({state:"visible"});
 check((await readModal())?.imageAlt===reviewedAlt,"P47-3 frozen reviewed image alt mismatch");
 await page.locator(".generic-image-close").click();await modal.waitFor({state:"detached"});
 const compare=page.locator("#result-review details.source-review").first();
 if(await compare.count()){
  await compare.locator("summary").click();
  const sourceFigure=compare.locator(".generic-media-frame img").first();
  if(await sourceFigure.count()){
   const sourceAlt=await sourceFigure.getAttribute("alt");
   await sourceFigure.click();await modal.waitFor({state:"visible"});
   check((await readModal())?.imageAlt===sourceAlt,
     "P47-3 source-edition figure not enlarged with original alt");
   await page.keyboard.press("Escape");await modal.waitFor({state:"detached"});
  }
 }
 // Combined 195px and 140% app text: modal's own controls must remain within
 // logical viewport, with no width leakage to the underlying document.
 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 while((await page.locator("#fontReset").innerText()).trim()!=="140%"){
  const n=Number.parseInt(await page.locator("#fontReset").innerText());
  check(n<140,"P47-3 text scaling overshot");
  await page.locator("#fontMore").click();
 }
 await page.locator("#displayClose").click();
 await assertNoOverflow(page,"P47-3 195px/140% reviewed media before modal");
 await page.locator("#result-review .generic-media-frame [data-image-open]").first().click();
 await modal.waitFor({state:"visible"});
 const narrow=await readModal();
 check(narrow?.viewport===195&&narrow.width<=195&&narrow.focused&&
  narrow.scroll<=197,"P47-3 195px/140% modal overflow "+JSON.stringify(narrow));
 await page.keyboard.press("Escape");await modal.waitFor({state:"detached"});
 await assertNoOverflow(page,"P47-3 narrow after modal cleanup");
 const rec=(await records(page)).find(x=>x.recordType==="generic-attempt"&&x.id===id);
 check(Boolean(rec?.frozen)&&rec.frozen.key.contentHash===savedBefore.sourceHash,
  "P47-3 image viewer changed frozen source/key digest");
 check(requests.length===0,"P47-3 image viewer attempted HTTP(S) requests: "+JSON.stringify(requests));
 check(!errors.length,"P47-3 uncaught browser errors: "+errors.join("; "));
 await h.evidence("p47-3-image-viewer-"+engine,{
  engine,authoredFigures:5,firstImageAlt:alt,reviewedAlt,
  nativeDialog:true,zoomRange:"100–800%",keyboardFocus:true,
  sourceKeyDigestUnchanged:true,answerIsolation:true,
  pausedInspect:true,sourceReview:true,lightNarrow195:true,
  requestCount:requests.length,at:new Date().toISOString()
 });
 console.log("MODERN P47-3 IMAGE PASS "+engine+" offline source figures, option isolation, zoom/pan, keyboard/focus/Escape, paused exam, review and 195px/140%");
}catch(e){await h.diagnose("p47-3-image-"+engine,page,e);throw e;}
finally{await context.close();await h.finish();}
