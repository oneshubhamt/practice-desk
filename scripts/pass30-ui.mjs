/** Pass 30: actual offline Library source/review exclusivity, untimed modes,
 * easy APFC/NAT bank import and cross-route persistence.
 * Automated browser evidence, not physical-device/human signoff.
 */
import {readFile,mkdir} from "node:fs/promises";
import {resolve,join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const dir=resolve(process.env.PASS30_OUTPUT??join(root,"artifacts/pass30-ui"));
await mkdir(dir,{recursive:true});
const bank=JSON.parse(await readFile(join(root,"examples/apfc-mcq-nat-starter.json"),"utf8"));
const executable=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .find(v=>spawnSync(v,["--version"],{encoding:"utf8"}).status===0);
if(!executable)throw Error("Pass30 requires Chromium");
const browser=await chromium.launch({headless:true,executablePath:
 spawnSync("which",[executable],{encoding:"utf8"}).stdout.trim(),
 args:["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"]});
const check=(x,m)=>{if(!x)throw Error("PASS30: "+m)};
const records=[];
async function capture(page,vp,scene){
 await page.evaluate(()=>window.scrollTo(0,0));
 const width=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
 const buttons=await page.locator("[data-edition]").evaluateAll(nodes=>nodes.map(n=>({
  edition:n.getAttribute("data-edition"),pressed:n.getAttribute("aria-pressed"),
  text:n.textContent.trim()})));
 const papers=await page.locator("#g-papers option").evaluateAll(nodes=>nodes.map(n=>({
  value:n.value,text:n.textContent.trim()})));
 const start=await page.locator("#g-start").count()?
  await page.locator("#g-start").boundingBox():null;
 const shot="overhaul-"+vp.name+"-"+scene+".png";
 await page.screenshot({path:join(dir,shot),animations:"disabled"});
 records.push({viewport:vp.name,scene,shot,buttons,papers,document:width,
  start:start?{top:start.y,bottom:start.y+start.height}:null});
 check(width.scroll<=width.inner+2,"Horizontal overflow "+vp.name+" "+scene+" "+JSON.stringify(width));
}
try{
 for(const vp of [{name:"laptop1366",width:1366,height:768},
                  {name:"phone390",width:390,height:844},
                  {name:"zoom195",width:195,height:844}]){
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},
   reducedMotion:"reduce",acceptDownloads:true});
  const page=await ctx.newPage();page.setDefaultTimeout(17000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  page.on("dialog",d=>{void d.accept()});
  try{
   await page.goto(pathToFileURL(join(root,"Practice_Desk_Offline_Mock_Tests.html")).href,
    {waitUntil:"load"});
   await page.locator("#g-papers").waitFor();
   const templateDownload=page.waitForEvent("download");
   await page.locator("#g-bank-template").click();
   const savedTemplate=await templateDownload;
   check(savedTemplate.suggestedFilename()==="Practice_Desk_APFC_NAT_Starter.json",
    "Offline APFC/NAT authoring template download was not generated");
   check(await page.locator('[data-edition="source"]').count()===1&&
    await page.locator('[data-edition="reviewed"]').count()===1,
    "Both segmented edition controls must exist");
   check(await page.locator("#g-edition select").count()===0,
    "Edition must not be a second dropdown");
   async function edition(next){
    await page.locator('[data-edition="'+next+'"]').click();
    check(await page.locator('[data-edition="'+next+'"]').getAttribute("aria-pressed")==="true",
     "Edition pressed state mismatch "+next);
    const options=await page.locator("#g-papers option").evaluateAll(nodes=>
     nodes.map(n=>n.value).filter(value=>value.includes("cgl-")));
    check(options.length===5,"Expected exactly five visible CGL papers for "+next);
    check(options.every(v=>v.includes(next)),
     "Mixed editions remain selectable despite filter "+next+" "+JSON.stringify(options));
    return await page.locator("#g-papers").inputValue();
   }
   const reviewed=await edition("reviewed");
   await capture(page,vp,"reviewed-five-papers");
   const original=await edition("source");
   check(original!==reviewed,"Edition toggle did not change selected paper");
   await capture(page,vp,"original-five-papers");
   const returned=await edition("reviewed");
   check(returned===reviewed,"Edition switch did not preserve same paper family");
   await page.locator("#g-untimed").check();
   check(await page.locator("#g-untimed").isChecked(),
    "Untimed checkbox inaccessible");
   await capture(page,vp,"untimed-selected-library");
   if(vp.width>=1280){
    const start=await page.locator("#g-start").boundingBox();
    check(start&&start.y+start.height<=vp.height,"Start fell below laptop fold");
   }
   await page.reload({waitUntil:"load"});
   check(await page.locator("#g-untimed").isChecked(),"Untimed preference lost on reload");
   check(await page.locator('[data-edition="reviewed"]').getAttribute("aria-pressed")==="true",
    "Edition preference lost on reload");
   for(const mode of ["strict","free","single"]){
    await page.locator('[data-mode="'+mode+'"]').click();
    if(mode==="single")await page.locator("#g-single-section").selectOption("2");
    check((await page.locator(".paper-preview .preview-metrics").innerText()).includes("Untimed"),
     "Selected paper preview does not show untimed "+mode);
    await page.locator("#g-start").click();
    check(await page.locator("#g-timer").innerText()==="Untimed",
     "An exam countdown remains enabled in "+mode);
    await capture(page,vp,"exam-"+mode+"-untimed");
    if(mode==="strict"){
     check(await page.locator('[data-section="1"]').isDisabled(),
      "Strict section navigation lost lock in untimed mode");
     await page.locator("#g-submit").click();
     check(await page.locator('[data-section="1"]').getAttribute("aria-current")==="step",
      "Untimed strict section did not advance");
    }else{
     await page.locator("#g-submit").click();
     check(await page.locator(".score.standout").count()===1,"Untimed "+mode+" did not score");
    }
    await page.locator("#g-library").click();
   }
   await page.locator("#g-untimed").uncheck();
   await page.locator('[data-mode="free"]').click();
   check((await page.locator(".paper-preview .preview-metrics").innerText()).includes("60:00"),
    "Disabling untimed did not restore the 60-minute whole-paper timer");
   await capture(page,vp,"timed-restored");
   // Author-friendly APFC MCQ/NAT bank: no manual hashes, sections or key IDs.
   await page.locator("#g-file").setInputFiles({
    name:"apfc-mcq-nat-starter.json",mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(bank))});
   await page.waitForFunction(()=>document.querySelector("#g-papers")?.value===
    "bank:apfc-starter-demo:paper:r1");
   const options=await page.locator("#g-papers optgroup").evaluateAll(xs=>
     xs.map(x=>({label:x.label,values:[...x.querySelectorAll("option")].map(o=>o.value)})));
   check(options.some(x=>x.label==="Imported / custom examinations"&&x.values.some(v=>
    v.startsWith("bank:apfc-starter-demo"))),"Imported paper not in separate group");
   await capture(page,vp,"apfc-bank-imported");
   await page.locator("#g-start").click();
   check((await page.locator(".exam-question").innerText()).includes("EPFO APFC"),
    "First APFC authored question not rendered");
   await page.locator("input[data-choice]").first().click();
   await page.locator('[data-section="2"]').click();
   check(await page.locator("#g-number").count()===1,"Authored NAT input missing");
   await page.locator("#g-number").fill("4");
   await page.locator("#g-save").click();
   await capture(page,vp,"apfc-nat-entered");
   await page.locator("#g-submit").click();
   check(await page.locator(".score.standout").count()===1,"APFC authored bank did not score");
   await capture(page,vp,"apfc-scored");
   check(!errors.length,"Runtime exception: "+errors.join("; "));
   console.log("PASS30 user journeys "+vp.name+" original/review, strict/free/single untimed, simple APFC MCQ/NAT");
  }finally{await ctx.close();}
 }
 await (await import("node:fs/promises")).writeFile(join(dir,"pass30-evidence.json"),
  JSON.stringify({title:"Pass30 edition filtering, untimed all modes and simple APFC/NAT bank",
   recordCount:records.length,records},null,2));
 console.log("PASS30 NEW USER WORKFLOWS PASS "+records.length+" measured screenshots");
}finally{await browser.close();}
