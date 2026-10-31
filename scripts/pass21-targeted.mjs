// Pass 21 targeted real file:// interactions, not broad paired release QA.
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const candidate=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!candidate)throw Error("Chromium is required for Pass 21 targeted UI verification");
const executablePath=spawnSync("which",[candidate],{encoding:"utf8"}).stdout.trim();
const profile=await mkdtemp(join(tmpdir(),"practice-desk-pass21-"));
const html=pathToFileURL(resolve(import.meta.dirname,"..","Practice_Desk_Offline_Mock_Tests.html")).href;
const source=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const ensure=(value,message)=>{if(!value)throw Error(message);};
let context;
try{
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,
  args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
 const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(20000);
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 page.on("dialog",dialog=>{void dialog.accept()});
 await page.goto(html,{waitUntil:"load"});
 async function choose(family,edition){
  const value=await page.locator("#g-papers option").evaluateAll((options,query)=>{
   const [id,label]=query;
   return options.find(option=>option.value.includes(id)&&option.textContent.includes(label))?.value;
  },[family,edition]);
  ensure(value,edition+" CGL paper absent: "+family);
  await page.locator("#g-papers").selectOption(value);
  await page.locator('[data-mode="free"]').click();
 }
 await choose("cgl-2026-09-30","Reviewed");
 await page.locator("#g-start").click();
 const q=page.locator('[data-q="0"]');
 await page.locator('input[data-choice]').nth(1).focus();
 await page.keyboard.press("c");
 ensure(await page.locator('input[data-choice]').nth(2).isChecked(),
   "A–D shortcut failed on focused radio");
 await page.locator('input[data-choice]').nth(1).focus();
 await page.keyboard.press("ArrowRight");
 ensure(await page.locator('input[data-choice]').nth(2).isChecked(),
   "Native ArrowRight failed to select next radio");
 ensure(await q.getAttribute("aria-current")==="step","Radio arrow improperly navigated question");
 await page.keyboard.press("ArrowLeft");
 ensure(await page.locator('input[data-choice]').nth(1).isChecked(),
   "Native ArrowLeft failed to select previous radio");
 await page.keyboard.press("Alt+ArrowRight");
 ensure(await page.locator('[data-q="1"]').getAttribute("aria-current")==="step",
   "Alt+ArrowRight from radio did not navigate question");
 await page.locator("#g-next").focus();
 await page.keyboard.press("ArrowLeft");
 ensure(await q.getAttribute("aria-current")==="step",
   "Unmodified arrow from button no longer navigates");
 const timeBefore=await page.locator("#g-timer").innerText();
 await page.locator("#g-pause").click();
 ensure(await page.locator("#g-flag").isEnabled(),"Pause disabled Flag annotation");
 for(const id of ["#g-next","#g-prev","#g-submit","#g-clear"])
  ensure(await page.locator(id).isDisabled(),"Paused interaction still enabled: "+id);
 ensure(await page.locator('input[data-choice]').first().isDisabled(),
   "Paused radio remains answerable");
 await page.locator("#g-flag").click();
 ensure(await page.locator("#g-flag").getAttribute("aria-pressed")==="true",
   "Paused Flag click did not set annotation");
 await page.locator("#g-pause").focus();
 await page.keyboard.press("m");
 ensure(await page.locator("#g-flag").getAttribute("aria-pressed")==="false",
   "Paused M shortcut did not clear annotation");
 await page.locator("#g-pause").focus();
 await page.keyboard.press("a");
 ensure(await page.locator('input[data-choice]').nth(1).isChecked(),
   "Paused A key changed a frozen response");
 await page.waitForTimeout(120);
 ensure(await page.locator("#g-timer").innerText()===timeBefore,
   "Paused flagging consumed exam time");
 await page.locator("#g-pause").click();
 ensure(await page.locator("#g-next").isEnabled(),"Resume did not enable navigation");
 const figures=source["cgl-2026-09-30"].questions.filter(x=>x.n<=25&&
   (x.images.stem||x.images.options?.some(Boolean)));
 ensure(figures.length>0,"No built-in CGL image question available");
 const target=figures[0];
 await page.locator('[data-q="'+(target.n-1)+'"]').click();
 const alts=await page.locator(".exam-question img.generic-figure").evaluateAll(imgs=>
   imgs.map(img=>img.getAttribute("alt")));
 ensure(alts.length>0,"Embedded CGL image did not render");
 ensure(alts.every(alt=>alt.includes("question "+target.n)),
   "Built-in CGL image lacks number context: "+alts.join(" / "));
 if(target.images.stem)ensure(alts.includes("Diagram for question "+target.n),
   "Question diagram lacked contextual alt");
 if(target.images.options?.some(Boolean))ensure(alts.some(alt=>/^Image for option [A-D] of question /.test(alt)),
   "Option visual lacked option-letter context");
 console.log("Pass21: native radio ArrowLeft/Right, Alt navigation, paused Flag/M and CGL contextual alt passed");
 await page.locator("#g-submit").click();
 await page.locator('[data-result-tab="review"]').click();
 const reviewed=await page.locator("#result-review").innerText();
 ensure(reviewed.includes("Editorial correction recorded"),
   "Wording-only CGL corrections lost their non-key editorial label");
 ensure(reviewed.includes("Key corrected · recorded editorial change"),
   "Published-versus-reviewed changed-key question no longer identified after submission");
 const q3Editorial=await page.locator("#result-review .generic-review").nth(2).innerText();
 const q6Editorial=await page.locator("#result-review .generic-review").nth(5).innerText();
 ensure(q3Editorial.includes("Editorial correction recorded")&&!q3Editorial.includes("Key corrected"),
   "30 Sep Q3 has no key change: must not be called key corrected");
 ensure(q6Editorial.includes("Key corrected · recorded editorial change"),
   "30 Sep Q6 published C→D change must be labelled precisely");
 const reviewAlts=await page.locator("#result-review .generic-figure").evaluateAll(imgs=>
   imgs.map(img=>img.getAttribute("alt")));
 ensure(reviewAlts.some(alt=>alt?.includes("question "+target.n)),
   "Frozen review lost contextual question/option alt");

 await page.locator("#g-library").click();
 await choose("cgl-2026-09-30","Original");
 await page.locator("#g-start").click();
 await page.locator("#g-submit").click();
 await page.locator('[data-result-tab="review"]').click();
 const original=await page.locator("#result-review").innerText();
 ensure(original.includes("Defective · excluded from automated scoring"),
   "Source-invalid CGL item lacks explicit excluded review label");

 await page.locator("#g-library").click();
 await choose("cgl-2026-10-06","Reviewed");
 await page.locator("#g-start").click();
 await page.locator("#g-submit").click();
 await page.locator('[data-result-tab="review"]').click();
 const disputed=await page.locator("#result-review").innerText();
 ensure(disputed.includes("Editorial caution · review notes; answer key not certified here"),
   "Reviewed disputed CGL item lacks caution without key-certification claim");
 ensure(errors.length===0,"Browser errors: "+errors.join(" / "));
 console.log("Pass21: post-test corrected/caution/defective labels from real source and reviewed papers passed");
}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
