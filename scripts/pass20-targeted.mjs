// Pass 20 focused offline browser acceptance, not full release QA.
// Challenges actual selected-policy scoring, editorial preflight, help,
// independent attribution, sticky Display on long pages and tiny screens.
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
import {pkg} from "../tests/fixtures/six-kinds.mjs";

const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!binary)throw Error("Chromium required for Pass 20 offline UI acceptance");
const executablePath=spawnSync("which",[binary],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"practice-desk-pass20-"));
const url=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const ensure=(value,message)=>{if(!value)throw Error(message);};
const inside=(rect,w,h)=>rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=w+1&&rect.y+rect.height<=h+1;
let context;
try{
 context=await chromium.launchPersistentContext(profile,{
   headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]
 });
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(18000);
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 page.on("dialog",d=>{void d.accept();});
 await page.setViewportSize({width:1280,height:840});
 await page.goto(url,{waitUntil:"load"});
 ensure(await page.locator("#g-preflight").count()===1,"Selected exam has no scoring preflight");
 ensure(await page.locator("#g-exam-rules").count()===1,"Selected exam has no detailed rules");
 ensure((await page.locator(".app-independent-footer").innerText()).includes("Not affiliated"),
   "Independent educational attribution is absent");
 const reviewed=(await page.locator("#g-papers option").evaluateAll(opts=>
   opts.find(x=>x.textContent.includes("Reviewed"))?.value));
 const source=(await page.locator("#g-papers option").evaluateAll(opts=>
   opts.find(x=>x.textContent.includes("Original"))?.value));
 ensure(reviewed&&source,"Missing built-in paired paper editions");
 await page.locator("#g-papers").selectOption(reviewed);
 await page.locator('[data-mode="strict"]').click();
 const strict=(await page.locator("#g-preflight").innerText());
 ensure(strict.includes("200.00")&&strict.includes("Correct +2")&&strict.includes("Incorrect -0.5"),
   "Strict reviewed CGL preflight lacks truthful automatic maximum/marks");
 ensure(strict.includes("not official SSC answer keys")&&strict.includes("reviewed changes"),
   "No clear review provenance/patch counts");
 await page.locator("#g-exam-rules summary").click();
 let help=await page.locator("#g-exam-rules").innerText();
 ensure(help.includes("Unused minutes do not carry")&&help.includes("15 min")&&
   help.includes("A–D")&&help.includes("backup"),
   "Strict-mode help misses operative exam/timing/keyboard/storage rules");
 await page.locator('[data-mode="single"]').click();
 ensure((await page.locator("#g-preflight").innerText()).includes("50.00"),
   "Single 25-question mode shows wrong eligible maximum");
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-exam-rules summary").click();
 help=await page.locator("#g-exam-rules").innerText();
 ensure(help.includes("One shared 60 min paper timer")&&help.includes("Pause control is available"),
   "Flexible mode did not update selected timing/rules");
 await page.locator("#g-papers").selectOption(source);
 const original=await page.locator("#g-preflight").innerText();
 ensure(original.includes("publisher-provided")&&original.includes("excluded"),
   "Original edition omitted publisher key or excluded-item cautions");
 await page.locator("#g-papers").selectOption(reviewed);
 // Import must not inherit built-in SSC provenance even if authored as a separate format.
 await page.locator("#g-file").setInputFiles({
   name:"six-kinds.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(pkg))
 });
 await page.locator("#g-papers").selectOption(pkg.paper.id);
 const imported=await page.locator("#g-preflight").innerText();
 ensure(imported.includes("10.00")&&imported.includes("manual-response")&&
   imported.includes("author/importer")&&!imported.includes("SSC"),
   "Generic imported exam preflight improperly assumes CGL or miscounts marks");
 await page.locator("#g-exam-rules summary").click();
 ensure((await page.locator("#g-exam-rules").innerText()).includes("One shared 20 min"),
   "Imported exam rules did not derive from its own policy");
 console.log("Pass 20: configured CGL modes, editorial counts/provenance and generic imported exam preflight passed");

 await page.locator("#g-papers").selectOption(reviewed);
 await page.locator('[data-mode="strict"]').click();
 await page.locator("#g-start").click();
 await page.locator("#g-exam-full").click();
 ensure(await page.locator("header").isVisible(),
   "Display header hidden in immersive exam view");
 await page.locator("#displayTrigger").click();
 ensure(await page.locator("#displayPanel").isVisible(),
   "Display popover unavailable in immersive mode");
 await page.locator("#displayClose").click();
 await page.locator("#g-exam-full").click();
 for(let i=0;i<4;i++)await page.locator("#g-submit").click();
 ensure(await page.locator('[data-result-tab="review"]').count()===1,
   "Strict test could not complete to detailed review");
 await page.locator('[data-result-tab="review"]').click();
 for(const [width,height] of [[1280,840],[375,667],[300,640]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
   await page.waitForTimeout(70);
   const trigger=page.locator("#displayTrigger");
   const rect=await trigger.boundingBox();
   ensure(rect&&inside(rect,width,height),
     "Display trigger scrolled away or overflowed at "+width+"px");
   const position=await page.locator("header").evaluate(el=>getComputedStyle(el).position);
   ensure(position==="sticky","Header is not a non-obscuring sticky Display access path");
   await trigger.click();
   const panel=page.locator("#displayPanel");
   ensure(await panel.isVisible(),"Display popover failed to open while scrolled");
   const pop=await panel.boundingBox();
   ensure(pop&&inside(pop,width,height),
     "Display popover exceeds "+width+"x"+height+" viewport");
   ensure(await page.locator("#fontMore").isVisible()&&
          await page.locator("#themeDark").isVisible()&&
          await page.locator("#displayFullscreen").isVisible(),
     "Display controls clipped in constrained viewport");
   if(width===375){
     await page.locator("#fontMore").click();
     ensure((await page.locator("#fontReset").innerText()).includes("105%"),
       "Text scaling failed from scroll-heavy review");
     await page.locator("#themeDark").click();
     ensure(await page.locator("html").getAttribute("data-theme")==="dark",
       "Theme switching failed while scrolled");
   }
   await page.keyboard.press("Escape");
   ensure(await panel.isHidden(),"Escape did not close Display");
   const focused=await page.evaluate(()=>document.activeElement?.id);
   ensure(focused==="displayTrigger","Display focus did not return to opener after Escape");
 }
 await page.locator("#g-history-results").click();
 const foot=await page.locator(".app-independent-footer").innerText();
 ensure(foot.includes("Not affiliated")&&foot.toLowerCase().includes("imported"),
   "Global independent-source footer lost on History route");
 ensure(errors.length===0,"Uncaught page errors: "+errors.join(" | "));
 console.log("Pass 20: long review & history, immersive, tiny 300px, scroll, controls, focus, theme and attribution passed");
}finally{
 await context?.close();
 await rm(profile,{recursive:true,force:true});
}
