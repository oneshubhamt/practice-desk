
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright-core";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const out=resolve(process.env.PASS32_OUTPUT??join(root,"artifacts/pass32-native-navigation"));
await mkdir(out,{recursive:true});
const command=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(x=>spawnSync(x,["--version"],{encoding:"utf8"}).status===0);
if(!command)throw Error("Pass32 requires Chromium");
const browser=await chromium.launch({headless:true,executablePath:spawnSync("which",[command],{encoding:"utf8"}).stdout.trim(),args:["--no-sandbox","--disable-dev-shm-usage"]});
const file=pathToFileURL(join(root,"Practice_Desk_Offline_Mock_Tests.html")).href;
const assert=(ok,msg)=>{if(!ok)throw Error("PASS32 "+msg)};
const records=[];
async function checkRoute(page,screen,id=null,tab=null){
 await page.waitForFunction(x=>{
  const p=new URL(location.href).searchParams;
  return (p.get("pd")===x.screen||(x.screen==="library"&&p.get("pd")===null))&&
   (x.id===null||p.get("attempt")===x.id)&&(x.tab===null||p.get("tab")===x.tab);
 },{screen,id,tab});
 // Navigation API commits the URL before async checkpoint/render finishes.
 // Assert the destination DOM, not just the URL (and no document reload).
 const selectors={library:"#g-start",history:".history-archive",learning:"#learning-close",
   exam:"#g-next",result:"#result-tab-overview"};
 await page.locator(selectors[screen]).waitFor({state:"visible"});
 assert(await page.evaluate(()=>Boolean(window.__nativeDoc)), "Internal route navigation reloaded document");
}
async function capture(page,label){
 await page.evaluate(()=>window.scrollTo(0,0));
 const state=await page.evaluate(()=>({href:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
  entries:navigation.entries().length,header:document.querySelector("#app h1")?.textContent??""}));
 assert(state.scrollWidth<=state.width+2,"Unexpected horizontal overflow "+label);
 const filename=label+".png";
 await page.screenshot({path:join(out,filename),animations:"disabled"});
 records.push({filename,...state});
}
try{
 for(const vp of [{name:"laptop1366",width:1366,height:768},{name:"phone390",width:390,height:844},{name:"zoom195",width:195,height:844}]){
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},reducedMotion:"reduce"});
  const page=await ctx.newPage();page.setDefaultTimeout(17000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>{void d.accept()});
  try{
   await page.goto(file,{waitUntil:"load"});
   await page.locator("#g-papers").waitFor();
   // Initial Library is deliberately rendered without a needless URL rewrite.
   assert(await page.locator("#g-start").count()===1,"Library startup incomplete");
   await page.evaluate(()=>window.__nativeDoc=true);
   assert(await page.evaluate(()=>Boolean(navigation&&typeof navigation.navigate==="function")),"Navigation API missing");
   await capture(page,vp.name+"-library");
   await page.locator("#g-history").click();await checkRoute(page,"history");
   await capture(page,vp.name+"-history");
   await page.evaluate(()=>navigation.back().finished);await checkRoute(page,"library");
   await page.evaluate(()=>navigation.forward().finished);await checkRoute(page,"history");
   await page.locator("#g-library").click();await checkRoute(page,"library");
   await page.locator("#g-learning").click();await checkRoute(page,"learning");
   assert(await page.locator("#learning-close").count()===1,"Learning screen absent");
   await capture(page,vp.name+"-learning");
   await page.locator("#learning-close").click();await checkRoute(page,"library");
   await page.locator('[data-mode="free"]').click();
   await page.locator("#g-start").click();await checkRoute(page,"exam");
   const id=new URL(await page.evaluate(()=>location.href)).searchParams.get("attempt");
   assert(Boolean(id),"Missing exam attempt in URL");
   const href=await page.evaluate(()=>location.href);
   const entries=await page.evaluate(()=>navigation.entries().length);
   await page.locator(".exam-question input[data-choice]").first().click();
   await page.locator("#g-flag").click();
   await page.locator("#g-next").click();
   assert(await page.evaluate(()=>location.href)===href,"Question edits changed the route");
   assert(await page.evaluate(()=>navigation.entries().length)===entries,"Question edits changed history length");
   await page.locator("#g-library").click();await checkRoute(page,"library");
   await page.evaluate(()=>navigation.back().finished);await checkRoute(page,"exam",id);
   assert(await page.locator('[data-q="0"]').evaluate(el=>el.classList.contains("answered")&&el.classList.contains("marked")),"Back lost answer or flag");
   await capture(page,vp.name+"-exam-back");
   await page.reload({waitUntil:"load"});
   await page.locator("#g-next").waitFor({state:"visible"});
   // A deliberate browser reload creates a new Document; internal navigations
   // after this point must continue preserving that new Document.
   await page.evaluate(()=>window.__nativeDoc=true);
   assert(new URL(await page.evaluate(()=>location.href)).searchParams.get("attempt")===id,"Reload lost deep-link ID");
   assert(await page.locator('[data-q="0"]').evaluate(el=>el.classList.contains("marked")),"Reload lost flag");
   await page.locator("#g-submit").click();
   await page.waitForFunction(()=>new URL(location.href).searchParams.get("pd")==="result");
   assert(await page.locator(".score.standout").count()===1,"Results missing");
   await page.locator("#result-tab-review").click();await checkRoute(page,"result",id,"review");
   await page.locator("#result-tab-timing").click();await checkRoute(page,"result",id,"timing");
   await page.evaluate(()=>navigation.back().finished);await checkRoute(page,"result",id,"review");
   await capture(page,vp.name+"-review-back");
   await page.reload({waitUntil:"load"});
   await page.locator("#result-tab-review").waitFor();
   assert(await page.locator("#result-tab-review").getAttribute("aria-selected")==="true","Review deep link lost after reload");
   assert(!errors.length,"Runtime error: "+errors.join("; "));
   console.log("PASS32 native offline navigation "+vp.name);
  }finally{await ctx.close();}
 }
 await writeFile(join(out,"pass32-evidence.json"),JSON.stringify({scenes:records.length,records},null,2));
 console.log("PASS32 NATIVE API "+records.length+" measured screenshot states");
}finally{await browser.close();}
