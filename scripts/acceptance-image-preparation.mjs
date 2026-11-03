/** P47-3B true offline pre-import image preparation, authored-bank import,
 * source digest and clarity-guard acceptance, no external requests.
 */
import {readFile} from "node:fs/promises";
import {openHarness,route,records,check,assertNoOverflow} from "./browser/fixtures.mjs";
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
 const validBank={format:"practice-desk-bank",version:1,bankId:"cat-figure-prepared",
  examId:"cat",title:"CAT image preparation verification",revision:1,
  scoring:{correctMarks:3,incorrectMarks:-1,unansweredMarks:0},
  media:[entry],questions:[{id:"qa-figure",section:"Quantitative Ability",type:"mcq",
   question:"Read the exact diagram carefully and select one option.",
   imageIds:["math-fig"],options:["One","Two","Three","Four"],
   optionImageIds:[["math-fig"],[],[],[]],answer:"C"}]};
 // Close, verify focus returns to actual Library trigger, then import the JSON.
 await page.locator("dialog.generic-image-preparation button:text-is('Close')").click();
 await modal.waitFor({state:"detached"});
 check(await button.evaluate(el=>document.activeElement===el),"focus was not restored to preparation trigger");
 await page.locator("#g-file").setInputFiles({name:"authored-cat-figure.json",
  mimeType:"application/json",buffer:Buffer.from(JSON.stringify(validBank))});
 await page.waitForFunction(()=>document.querySelector("#g-papers")?.value==="bank:cat-figure-prepared:paper:r1"||
  document.querySelector("#g-family")?.value?.includes("cat"));
 check((await page.locator("#g-papers").inputValue()).includes("cat-figure-prepared"),
  "imported authored media package not selected after validation");
 await page.locator("#g-start").click();await route(page,"exam");
 check(await page.locator(".exam-question .generic-figure").count()===2,
  "authored diagram and option figure missing after simple-bank import");
 check(await page.locator(".exam-question .generic-figure").first().getAttribute("src")===diagram,
  "frozen simple bank changed original diagram bytes");
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
 await page.locator("#g-library").click();await route(page,"library");
 // Explicitly opt in to lossy high-quality WebP for PHOTOGRAPHS only.
 await page.locator("#g-image-prep").click();await modal.waitFor({state:"visible"});
 await page.locator("#prep-image-type").selectOption("photo");
 const photograph=await imageData({photograph:true});
 await chooseImage(photograph,"local-photo.png");
 const message=await page.locator("#prep-image-status").innerText();
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
