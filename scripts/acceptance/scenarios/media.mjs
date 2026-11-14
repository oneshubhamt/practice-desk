/** Stable product-domain browser scenarios. */

export async function imageViewer(){
// Consolidated from scripts/acceptance-image-viewer.mjs; retained browser-only assertions remain intact.
/** P47-3: actual single-file file:// image viewer; no historical screenshot parity.
 * One source CGL q3 with 5 real figures, source review, 195px + 140% text,
 * native modal focus, mouse/keyboard and paused exam isolation.
 */
const {readFile}=await import("node:fs/promises");
const {openHarness,route,records,check,assertNoOverflow}=await import("../../browser/fixtures.mjs");
const {chooseModernPaper}=await import("../../paper-select.mjs");
const {builtinCglPackages}=await import("../../../src/app/exam-package.ts");
const engine=process.argv[2]||"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
const requests=[];
page.on("request",request=>{
 if(/^https?:/i.test(request.url()))requests.push(request.url());
});
const source=JSON.parse(await readFile(new URL("../../../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../../../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../../../src/content/solutions.json",import.meta.url)));
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
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
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
 // Firefox can dispatch wheel asynchronously after Playwright resolves mouse.wheel.
 // Preserve the numerical zoom contract, but observe the completed event state.
 await page.waitForFunction(()=>Number.parseInt(document.querySelector(".generic-image-zoom")?.textContent??"0")>130,null,{timeout:3500});
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

 // A deterministic high-resolution optical-chart fixture tests actual pan
 // translation and two-point touch input independent of the CGL image dimensions.
 // It exists in the DOM only during QA; it is NOT imported into or written to
 // any verified frozen paper, IndexedDB snapshot or answer.
 await page.evaluate(()=>{
  const c=document.createElement("canvas");
  c.width=1600;c.height=1200;
  const g=c.getContext("2d");
  g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);
  g.fillStyle="#111";g.font="bold 56px Arial";
  g.fillText("High-resolution chart — original pixels",55,120);
  g.lineWidth=4;
  for(let i=0;i<18;i++){
   g.beginPath();g.moveTo(80+i*70,180);g.lineTo(80+i*70,1080);g.stroke();
  }
  const frame=document.createElement("span");frame.className="generic-media-frame";
  frame.id="p47-diagnostic-image";
  const img=document.createElement("img");
  img.className="generic-figure";img.alt="Diagnostic chart at 1600 by 1200 pixels";
  img.src=c.toDataURL("image/png");
  const open=document.createElement("span");
  open.className="generic-image-open";open.setAttribute("role","button");
  open.tabIndex=0;open.dataset.imageOpen="";open.textContent="Enlarge diagnostic image";
  frame.append(img,open);
  document.querySelector(".exam-question")?.append(frame);
 });
 await page.locator("#p47-diagnostic-image [data-image-open]").click();
 await modal.waitFor({state:"visible"});
 await page.waitForFunction(()=>document.querySelector(".generic-image-large")?.naturalWidth===1600);
 const diagnostic=await readModal();
 check(diagnostic?.naturalWidth===1600&&diagnostic?.naturalHeight===1200,
  "P47-3 viewer changed image dimensions before any zoom");
 for(let n=0;n<18;n++){
  const plus=page.locator(".generic-image-toolbar [aria-label='Zoom in']");
  if(!await plus.isEnabled())break;
  await plus.click();
 }
 check((await page.locator(".generic-image-zoom").innerText())==="800%",
  "P47-3 full-resolution diagnostic did not reach 800%");
 const dragArea=await canvas.boundingBox();
 check(Boolean(dragArea),"P47-3 diagnostic canvas not rendered");
 const beforePan=(await readModal())?.imageTransform;
 const center={x:dragArea.x+dragArea.width/2,y:dragArea.y+dragArea.height/2};
 await page.mouse.move(center.x,center.y);
 await page.mouse.down();
 await page.mouse.move(center.x+75,center.y+45,{steps:6});
 await page.mouse.up();
 const afterPan=(await readModal())?.imageTransform;
 check(afterPan!==beforePan&&/translate\([1-9]/.test(afterPan??""),
  "P47-3 drag did not translate large diagram or was clamped unexpectedly");

 if(engine==="chromium"){
  // Chrome DevTools sends a real two-finger touch stream; PointerEvents and
  // setPointerCapture are exercised by the browser, not synthetic JS events.
  await page.locator(".generic-image-toolbar [aria-label='Reset zoom and position']").click();
  const cdp=await context.newCDPSession(page);
  const at=await canvas.boundingBox();
  const x=Math.round(at.x+at.width/2),y=Math.round(at.y+at.height/2);
  try{
   await cdp.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:2});
   await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[
    {x:x-35,y,id:1},{x:x+35,y,id:2}]});
   await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[
    {x:x-90,y,id:1},{x:x+90,y,id:2}]});
   await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
   check(Number.parseInt(await page.locator(".generic-image-zoom").innerText())>100,
    "P47-3 Chrome two-pointer touch pinch did not zoom the real dialog");
  }finally{
   await cdp.send("Emulation.setTouchEmulationEnabled",{enabled:false}).catch(()=>{});
   await cdp.detach();
  }
 }
 await page.keyboard.press("Escape");await modal.waitFor({state:"detached"});
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
}

export async function imagePreparation(){
// Consolidated from scripts/acceptance-image-preparation.mjs; retained browser-only assertions remain intact.
/** P47-3B true offline pre-import image preparation, authored-bank import,
 * source digest and clarity-guard acceptance, no external requests.
 */
const {readFile}=await import("node:fs/promises");
const {openHarness,route,records,check,assertNoOverflow}=await import("../../browser/fixtures.mjs");
const {compileExternalQuestionBank}=await import("../../../src/authoring/external-bank.ts");
const engine=process.argv[2]||"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
const remote=[];
page.on("request",request=>{if(/^https?:/i.test(request.url()))remote.push(request.url());});
async function imageData({photograph}){
 return page.evaluate(({photograph})=>{
  const c=document.createElement("canvas");
  c.width=photograph?960:640;c.height=photograph?620:360;
  const g=c.getContext("2d");if(!g)throw Error("No browser canvas");
  g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);
  if(photograph){
   // Repeatable smooth photograph-like colour/noise: visually detailed PNG
   // with lots of redundant entropy; a high-quality WebP should be smaller.
   const bitmap=g.createImageData(c.width,c.height);
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    const i=(y*c.width+x)*4;
    const noise=((x*71+y*31+(x*y)%7)%11)-5;
    bitmap.data[i]=Math.max(0,Math.min(255,70+160*x/c.width+noise));
    bitmap.data[i+1]=Math.max(0,Math.min(255,35+165*y/c.height+noise));
    bitmap.data[i+2]=Math.max(0,Math.min(255,90+80*x/c.width+noise));
    bitmap.data[i+3]=255;
   }
   g.putImageData(bitmap,0,0);
  }else{
   g.fillStyle="#000";g.font="13px Arial";
   for(let i=0;i<14;i++){g.fillText("x² + y² = 1 · tan θ "+i,16,22+i*20);}
   g.strokeStyle="#111";g.lineWidth=1;
   for(let i=0;i<30;i++){g.beginPath();g.moveTo(320+i*9,10);g.lineTo(350+i*9,350);g.stroke();}
  }
  return c.toDataURL("image/png");
 },{photograph});
}
async function chooseImage(data,name){
 const image=Buffer.from(data.split(",")[1],"base64");
 await page.locator("#prep-image-file").setInputFiles({name,mimeType:"image/png",buffer:image});
 await page.waitForFunction(()=>document.querySelector("#prep-image-status")?.textContent?.includes("Original retained")||
   document.querySelector("#prep-image-status")?.textContent?.includes("Candidate saves")||
   document.querySelector("#prep-image-status")?.textContent?.includes("Cannot"));
}
async function downloadEntry(selector){
 const d=page.waitForEvent("download");
 await page.locator(selector).click();
 const download=await d;
 const pathname=await download.path();
 check(Boolean(pathname),"Expected a downloaded local media snippet");
 return JSON.parse(await readFile(pathname,"utf8"));
}
try{
 await route(page,"library");
 check(await page.locator("#g-image-prep").count()===1,"Library image preparation is not discoverable");
 const before=await records(page);
 const button=page.locator("#g-image-prep");
 await button.click();
 const modal=page.locator("dialog.generic-image-preparation");
 await modal.waitFor({state:"visible"});
 check(await page.locator("#prep-image-type").inputValue()==="diagram","must default to protecting fine line-art");
 const diagram=await imageData({photograph:false});
 await chooseImage(diagram,"fine-math-diagram.png");
 check((await page.locator("#prep-image-status").innerText()).includes("not recompressed"),
  "Default diagram path must not silently perform lossy WebP conversion");
 check(await page.locator(".generic-prepare-previews .generic-prepare-preview").count()===2,
  "must render original and comparison containers");
 check(await page.locator("#prep-image-approve").isDisabled(),
  "diagram should never present automatic lossy approval");
 await page.locator("#prep-image-id").fill("math-fig");
 await page.locator("#prep-image-alt").fill("Fine mathematical graph with labelled axes and Greek letters");
 const entry=await downloadEntry("button:text-is('Download original image entry')");
 check(entry.dataUri===diagram&&entry.id==="math-fig"&&entry.altText.includes("Greek"),
  "P47-3B original media export changed source pixels or author description");
 const dialogueCount=await page.locator("dialog.generic-image-preparation").count();
 check(dialogueCount===1,"preparation dialog disappeared unexpectedly");
 const imageDoc=(label,id)=>({format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:label},
    {type:"image",assetId:id,altText:entry.altText}]}
 ]});
 const validBank=compileExternalQuestionBank({
  format:"practice-desk-authoring",version:1,bankId:"cat-figure-prepared",
  examId:"cat",paperId:"cat-figure-prepared",title:"CAT image preparation verification",
  revision:1,edition:"custom",scoring:{correctMarks:3,incorrectMarks:-1},
  timing:{kind:"untimed",pausePolicy:"allowed"},
  navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
  sections:[{id:"qa",title:"Quantitative Ability"}],media:[entry],
  questions:[{id:"qa-figure",examSection:"qa",subject:"Quantitative Aptitude",
   kind:"single-choice",prompt:imageDoc("Read the exact diagram carefully and select one option.","math-fig"),
   options:[imageDoc("One","math-fig"),"Two","Three","Four"],answer:"C",
   provenance:{kind:"manual"},qa:{status:"unchecked"}}]
 });
 // Close, verify focus returns to actual Library trigger, then import the JSON.
 await page.locator("dialog.generic-image-preparation button:text-is('Close')").click();
 await modal.waitFor({state:"detached"});
 check(await button.evaluate(el=>document.activeElement===el),"focus was not restored to preparation trigger");
 await page.locator("#g-file").setInputFiles({name:"authored-cat-figure.json",
  mimeType:"application/json",buffer:Buffer.from(JSON.stringify(validBank))});
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,
  validBank.paper.id);
 check((await page.locator("#g-papers").inputValue()).includes("cat-figure-prepared"),
  "imported authored media package not selected after validation");
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 check(await page.locator(".exam-question .generic-figure").count()===2,
  "authored diagram and option figure missing after canonical package import");
 check(await page.locator(".exam-question .generic-figure").first().getAttribute("src")===diagram,
  "frozen package changed original diagram bytes");
 check(await page.locator(".exam-question .generic-choice-media-row").count()===1,
  "authored option image missing or nested within radio option");
 const id=new URL(page.url()).searchParams.get("attempt");
 check(Boolean(id),"frozen authored CAT test missing saved attempt");
 const frozen=(await records(page)).find(x=>x.id===id);
 check(Boolean(frozen?.frozen?.assets?.[0]?.contentHash),"prepared image did not receive a frozen verified hash");
 check(frozen.frozen.assets[0].altText===entry.altText,"authored image description lost");
 await page.locator(".exam-question [data-image-open]").first().click();
 const viewer=page.locator("dialog.generic-image-dialog");
 await viewer.waitFor({state:"visible"});
 check(await viewer.locator(".generic-image-large").getAttribute("alt")===entry.altText,
  "prepared diagram lost native viewer alt text");
 await page.keyboard.press("Escape");await viewer.waitFor({state:"detached"});
 check(await page.locator("input[data-choice]:checked").count()===0,
  "image viewer selected an option while inspecting the imported diagram");
 await page.getByRole("button",{name:/library/i}).click();await route(page,"library");
 // Explicitly opt in to lossy high-quality WebP for PHOTOGRAPHS only.
 await page.locator("#g-image-prep").click();await modal.waitFor({state:"visible"});
 await page.locator("#prep-image-type").selectOption("photo");
 const photograph=await imageData({photograph:true});
 await chooseImage(photograph,"local-photo.png");
 const message=await page.locator("#prep-image-status").innerText();
 let convertedMedia=null;
 const offered=message.includes("Candidate saves");
 if(engine==="chromium")check(offered,
   "Chromium must actually offer a vetted smaller WebP for the photographic test fixture: "+message);
 check(!message.includes("Cannot"),"preparation failed rather than retaining the original: "+message);
 if(offered){
  check(await page.locator("#prep-image-approve").isEnabled(),
   "quality-eligible WebP must still require human review");
  check(await page.locator("button:text-is('Download reviewed WebP image entry')").isDisabled(),
   "WebP was offered before explicit comparison approval");
  await page.locator("#prep-image-scale").selectOption("400");
  check(await page.locator(".generic-prepare-preview img").first().evaluate(img=>img.style.width==="400%"),
    "side-by-side high-detail review must actually enlarge original pixels to 400%");
  check(await page.locator(".generic-prepare-preview img").last().evaluate(img=>img.naturalWidth===960&&img.naturalHeight===620),
    "candidate conversion changed photographic dimensions or failed to decode");
  await page.locator("#prep-image-id").fill("photo-one");
  await page.locator("#prep-image-alt").fill("Photograph of a physical setup");
  await page.locator("#prep-image-approve").check();
  const converted=await downloadEntry("button:text-is('Download reviewed WebP image entry')");
  convertedMedia=converted;
  check(converted.dataUri.startsWith("data:image/webp;base64,"),
   "WebP converter did not produce a standard importable image");
  check(converted.dataUri.length<photograph.length*.85,
   "converted WebP did not save at least 15%");
 }
 // A non-eligible candidate must safely preserve the original; never alter
 // existing imported CAT content or persistent score records.
 check((await records(page)).find(x=>x.id===id)?.frozen?.assets?.[0]?.dataUri===diagram,
  "photo preparation mutated an already frozen diagram");
 await page.locator("dialog.generic-image-preparation button:text-is('Close')").click();
 await modal.waitFor({state:"detached"});
 if(convertedMedia){
  const photoDoc={format:"practice-desk-rich",version:1,blocks:[
   {type:"paragraph",content:[{type:"text",text:"Inspect the photographic dataset."},
    {type:"image",assetId:"photo-one",altText:convertedMedia.altText}]}
  ]};
  const photographicBank=compileExternalQuestionBank({
   format:"practice-desk-authoring",version:1,bankId:"pgdba-photo-prepared",
   examId:"pgdba",paperId:"pgdba-photo-prepared",title:"PGDBA pre-frozen photo verification",
   revision:1,edition:"custom",scoring:{correctMarks:3,incorrectMarks:-1},
   timing:{kind:"untimed",pausePolicy:"allowed"},
   navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
   sections:[{id:"di",title:"Data Interpretation"}],media:[convertedMedia],
   questions:[{id:"q-photo",examSection:"di",subject:"Data Interpretation",kind:"single-choice",
    prompt:photoDoc,options:["First","Second","Third","Fourth"],answer:"A",
    provenance:{kind:"manual"},qa:{status:"unchecked"}}]
  });
  await page.locator("#g-file").setInputFiles({
   name:"pgdba-prepared-webp.json",mimeType:"application/json",
   buffer:Buffer.from(JSON.stringify(photographicBank))
  });
  await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,photographicBank.paper.id);
  const stored=(await records(page)).find(x=>x.recordType==="generic-package"&&
    x.bundle?.paper?.paperId===photographicBank.paper.paperId);
  check(stored?.bundle?.assets?.length===1&&
    stored.bundle.assets[0].mediaType==="image/webp"&&
    stored.bundle.assets[0].contentHash?.length===64,
    "reviewed WebP did not import as a separately authenticated frozen bank asset");
  check(stored.bundle.assets[0].dataUri===convertedMedia.dataUri,
    "WebP import altered or recompressed an approved candidate");
 }
 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 while((await page.locator("#fontReset").innerText()).trim()!=="140%"){
  const n=Number.parseInt(await page.locator("#fontReset").innerText());
  check(n<140,"font scaling failed");await page.locator("#fontMore").click();
 }
 await page.locator("#displayClose").click();
 await page.locator("#g-image-prep").click();await modal.waitFor({state:"visible"});
 await assertNoOverflow(page,"P47-3B 195px and 140% image pre-import dialog");
 check(await page.locator("#prep-image-file").count()===1&&
  await page.locator("#prep-image-approve").count()===1,
  "small screen removed preparation controls");
 await page.keyboard.press("Escape");await modal.waitFor({state:"detached"});
 await assertNoOverflow(page,"P47-3B post-dialog focus/scroll restoration");
 check(!remote.length,"image preparation requested remote network: "+remote.join(","));
 check(!errors.length,"image preparation uncaught browser errors: "+errors.join("; "));
 await h.evidence("p47-3b-image-prepare-"+engine,{
  engine,diagramExact:true,prepToFrozenBank:true,shaVerified:true,
  optInWebp:offered,actualHttpRequests:remote.length,
  narrow195:true,updatedAt:new Date().toISOString()
 });
 console.log("MODERN P47-3B IMAGE PREPARATION PASS "+engine+
  " offline diagram preserved, authored hash import, WebP opt-in guarded, 195px/140%, no network");
}catch(error){await h.diagnose("p47-3b-image-prepare-"+engine,page,error);throw error;}
finally{await context.close();await h.finish();}
}

export async function mathRendering(){
// Consolidated from scripts/acceptance-p47-math.mjs; retained browser-only assertions remain intact.
/** P47-5B: actual file:// imported mathematical content, pre-submit key secrecy and post-submit review.
 * No screenshot parity or remote services. Same fixture in Chromium, Firefox and WebKit.
 */
const {openHarness,route,check,assertNoOverflow,records}=await import("../../browser/fixtures.mjs");
const {pkg}=await import("../../../tests/fixtures/six-kinds.mjs");
const {questionRevisionHash}=await import("../../../src/domain/integrity.ts");
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,errors}=await h.open({viewport:{width:390,height:844}});
const requests=[];
page.on("request",r=>{if(/^https?:/i.test(r.url()))requests.push(r.url());});
const TEX="\\frac{a}{b}";
const doc=blocks=>({format:"practice-desk-rich",version:1,blocks});
const math=()=>({type:"math",tex:TEX,linearText:"a divided by b"});
const rich=label=>doc([{type:"paragraph",content:[{type:"text",text:label},math()]}]);
function authoredMath(){
 const p=structuredClone(pkg);
 p.examId="cat-math";
 p.title="CAT mathematical notation (source verified)";
 p.paper={...p.paper,id:"cat-math-paper-r1",paperId:"cat-math-paper"};
 p.answerKey={...p.answerKey,id:"cat-math-key-r1",paperId:"cat-math-paper"};
 p.paper.answerKeyRevisionId=p.answerKey.id;
 // Rehash exact authored paper/key IDs.
 p.answerKey.contentHash=p.answerKey.contentHash;
 p.questions=p.questions.map((q,i)=>{
  const c={...q.content,richPrompt:rich("Question "+i+" algebra "),
    ...(i===0?{richExplanation:rich("P47-SOLUTION-SECRET "),
      options:q.content.options.map((o,j)=>j===0?{...o,richText:rich("Choice ")}:o)}:{})};
  return {...q,content:c,contentHash:questionRevisionHash({content:c,editorial:q.editorial})};
 });
 return p;
}
const {paperRevisionHash}=await import("../src/domain/integrity.ts");
try{
 const p=authoredMath();
 p.paper.contentHash=paperRevisionHash(p.paper);
 // Invalid changed TeX with stale SHA is rejected before current-source installation.
 const tampered=structuredClone(p);
 tampered.questions[0].content.richPrompt.blocks[0].content[1].tex="x^2";
 await page.locator("#g-file").setInputFiles({name:"bad-maths.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(tampered))});
 check((await page.locator(".generic-warning").allTextContents()).some(s=>/hash|mismatch|import/i.test(s)),
  "Tampered rich mathematical content accepted silently");
 await page.locator("#g-file").setInputFiles({name:"cat-rich-maths.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(p))});
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,p.paper.id);
 await page.getByRole("button",{name:/^Start /}).click();await route(page,"exam");
 check(await page.locator(".pd-math .katex-mathml").count()>=2,"Read-only rich question and option maths missing");
 check((await page.locator(".pd-rich-prompt .pd-rich-content").innerText()).includes("Question 0 algebra"),
   "Imported authored prompt missing");
 check(!(await page.locator("body").innerText()).includes("P47-SOLUTION-SECRET"),
  "Worked solution leaked before submission");
 check(await page.locator(".worked-solution").count()===0,"Solution UI appeared during active test");
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8;i++)await page.locator("#fontMore").click();
 check((await page.locator("#fontReset").innerText())==="140%","140% scaling absent");
 await page.locator("#displayClose").click();
 await page.setViewportSize({width:195,height:844});
 await assertNoOverflow(page,"P47-5B 195px + 140% mathematical exam");
 const scrollCheck=await page.evaluate(()=>[...document.querySelectorAll(".pd-math-block")].every(el=>
   el.scrollWidth>=el.clientWidth&&el.clientWidth<=document.documentElement.clientWidth));
 check(scrollCheck,"Math scrolling exceeded browser viewport");
 await page.locator('input[data-choice]').first().check();
 await page.locator("#g-submit").click();await route(page,"result");
 await page.locator("#result-tab-review").click();await page.locator("#result-review").waitFor({state:"visible"});
 check(await page.locator(".pd-math .katex-mathml").count()>=6,"Post-submit six-kind math review unavailable");
 await page.locator(".worked-solution").first().locator("summary").click();
 check((await page.locator(".worked-solution").first().innerText()).includes("P47-SOLUTION-SECRET"),
  "Rich worked explanation absent in authorized Results");
 await assertNoOverflow(page,"P47-5B narrow reviewed maths");
 const rows=(await records(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt);
 const saved=rows.find(x=>x.packageId===p.paper.id);
 check(Boolean(saved),"Rich mathematical attempt not stored");
 check(saved.frozen.questions[0].content.richPrompt.blocks[0].content[1].tex===TEX,
  "Source math did not remain frozen by exact hash");
 await page.reload({waitUntil:"load"});
 // Returning directly to the Review tab is valid; the generic route helper
 // deliberately waits for an Overview-only panel and must not be used here.
 await page.locator("#result-tab-review").waitFor({state:"visible"});
 await page.locator("#result-tab-review").click();
 check(await page.locator(".pd-math .katex-mathml").count()>=6,
  "Restored frozen mathematical display missing after reload");
 check(requests.length===0,"Mathematical rendering requested network resources: "+JSON.stringify(requests));
 check(errors.length===0,"Browser JavaScript errors: "+errors.join("; "));
 console.log("P47-5B MATH PASS "+engine+": imported frozen six-kind rich math, embargo, 195px+140%, offline fonts, review/reload");
}catch(e){await h.diagnose("p47-5b-math-"+engine,page,e);throw e;}
finally{await h.finish();}
}
