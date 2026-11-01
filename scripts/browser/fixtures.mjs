/** Modern offline-browser acceptance harness. No frozen v11 oracle or runtime network.
 * Browser engine versions are provided by CI's pinned Playwright Core installation
 * (and the installed Google Chrome for the Chromium leg).
 */
import {chromium,firefox,webkit} from "playwright-core";
import {spawnSync} from "node:child_process";
import {resolve,join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {mkdir,writeFile,readFile} from "node:fs/promises";

export const root=resolve(fileURLToPath(new URL("../..",import.meta.url)));
export const offlineUrl=pathToFileURL(join(root,"Practice_Desk_Offline_Mock_Tests.html")).href;
export const viewports={
 laptop:{width:1366,height:768},
 tablet:{width:768,height:1024},
 phone:{width:390,height:844},
 narrow:{width:195,height:844}
};
export const check=(condition,message)=>{
 if(!condition)throw Error("MODERN ACCEPTANCE: "+message);
};
export async function starterBank(){
 return JSON.parse(await readFile(join(root,"examples/apfc-mcq-nat-starter.json"),"utf8"));
}
function chromePath(){
 for(const name of ["google-chrome","google-chrome-stable","chromium","chromium-browser"]){
  if(spawnSync(name,["--version"],{encoding:"utf8"}).status===0){
   const path=spawnSync("which",[name],{encoding:"utf8"}).stdout.trim();
   if(path)return path;
  }
 }
 throw Error("Chromium acceptance requires installed Chrome; refusing browser fallback");
}
export async function openHarness({engine="chromium",artifactDir=null}={}){
 check(["chromium","firefox","webkit"].includes(engine),"unknown browser engine "+engine);
 const selected={chromium,firefox,webkit}[engine];
 const options={headless:true};
 if(engine==="chromium"){
  options.executablePath=chromePath();
  options.args=["--no-sandbox","--disable-dev-shm-usage","--disable-background-networking"];
 }
 const browser=await selected.launch(options);
 const pages=[];
 async function open({viewport=viewports.laptop,colorScheme="light",reducedMotion="reduce"}={}){
  const context=await browser.newContext({viewport,colorScheme,reducedMotion,acceptDownloads:true});
  const page=await context.newPage();
  page.setDefaultTimeout(18000);
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("dialog",d=>void d.accept());
  await page.goto(offlineUrl,{waitUntil:"load"});
  // The first Library render proves that the offline generated app booted.
  await page.locator("#g-papers").waitFor({state:"visible"});
  const record={page,context,errors};
  pages.push(record);
  return record;
 }
 async function finish(){
  try{
   for(const p of pages)check(!p.errors.length,
    engine+" uncaught browser errors: "+p.errors.join("; "));
  }finally{
   for(const p of pages.reverse())await p.context.close().catch(()=>{});
   await browser.close();
  }
 }
 async function evidence(label,data){
  if(!artifactDir)return;
  const dir=resolve(root,artifactDir);await mkdir(dir,{recursive:true});
  await writeFile(join(dir,label+".json"),JSON.stringify(data,null,2));
 }
 async function diagnose(label,page,error){
  if(!artifactDir)return;
  const dir=resolve(root,artifactDir);await mkdir(dir,{recursive:true});
  const safe=label.replace(/[^a-zA-Z0-9_-]/g,"_");
  try{
   await page.screenshot({path:join(dir,safe+"-failure.png"),animations:"disabled",timeout:8000});
   await writeFile(join(dir,safe+"-failure.txt"),
    String(error)+"\n"+await page.url()+"\n"+(await page.locator("body").innerText()).slice(0,4500));
  }catch{/* Preserve the originating assertion, not a screenshot exception. */}
 }
 return {engine,browser,open,finish,evidence,diagnose};
}
/** Read real IndexedDB rather than trusting the DOM as persistence evidence. */
export async function records(page,store="attempts"){
 return page.evaluate(async storeName=>{
  const db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open("practiceDesk.overhaul.v1",1);
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction(storeName,"readonly"),r=tx.objectStore(storeName).getAll();
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
   });
  }finally{db.close();}
 },store);
}
export async function saved(page,predicate,label){
 // Do not race asynchronous IDB checkpoint flushes. Poll only actual persisted data.
 await page.waitForFunction(async needle=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open("practiceDesk.overhaul.v1",1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  try{
   const rows=await new Promise((resolve,reject)=>{
    const tx=db.transaction("attempts","readonly"),req=tx.objectStore("attempts").getAll();
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   return rows.some(x=>x.id===needle);
  }finally{db.close();}
 },label);
 return (await records(page)).find(predicate);
}
export async function assertNoOverflow(page,label){
 const state=await page.evaluate(()=>({
  width:innerWidth,scroll:document.documentElement.scrollWidth,
  nav:typeof window.navigation?.navigate==="function",
  viewport:{width:innerWidth,height:innerHeight}
 }));
 check(state.scroll<=state.width+2,label+" document overflow "+JSON.stringify(state));
 return state;
}
export async function route(page,name){
 const selectors={library:"#g-start",exam:"#g-next",result:".result-performance-overview",
  history:".history-archive",learning:"#learning-close"};
 await page.waitForFunction(expected=>{
  const actual=new URL(location.href).searchParams.get("pd")??"library";
  return actual===expected;
 },name);
 await page.locator(selectors[name]).waitFor({state:"visible"});
}
export function claimNativeNavigation(page){
 return page.evaluate(()=>Boolean(window.navigation&&typeof navigation.navigate==="function"));
}
