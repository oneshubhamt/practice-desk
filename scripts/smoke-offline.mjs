import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const candidates=["google-chrome","google-chrome-stable","chromium","chromium-browser"];
const chrome=candidates.find(bin=>spawnSync(bin,["--version"],{encoding:"utf8"}).status===0);
if(!chrome)throw new Error("Headless Chromium/Chrome is required for the offline file:// smoke test");
const root=resolve(import.meta.dirname,"..");
const artifact=await readFile(join(root,"Practice_Desk_Offline_Mock_Tests.html"),"utf8");
if(!artifact.includes("</body>"))throw new Error("Offline HTML has no closing body");
const directory=await mkdtemp(join(tmpdir(),"pd-file-smoke-"));
const path=join(directory,"Practice_Desk_Offline_Mock_Tests.html");
const profile=join(directory,"profile");
const scriptFor=(code)=>artifact.replace("</body>",`<script>\n${code}\n</script></body>`);
const common=`
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn) {
 for(let i=0;i<200;i++){const found=await fn();if(found)return found;await sleep(100);}
 throw new Error("Offline smoke condition timed out");
}
function savedAttempts(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open("practiceDesk.history.v1",2);
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{
   const db=req.result;
   const get=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   get.onerror=()=>{db.close();reject(get.error);};
   get.onsuccess=()=>{const records=get.result.filter(x=>x.recordType==="generic-attempt");db.close();resolve(records);};
  };
 });
}
async function enterWorkspace(){
 document.documentElement.dataset.pdSmokeStage="home";
 (await until(()=>document.querySelector("#genericWorkspace"))).click();
 document.documentElement.dataset.pdSmokeStage="generic-loading";
 await until(()=>document.querySelector("#g-start:not([disabled])"));
}
`;
const first=`(async()=>{${common}
 document.documentElement.dataset.pdSmokeStage="enter";
 await enterWorkspace();
 document.documentElement.dataset.pdSmokeStage="start";
 document.querySelector("#g-start").click();
 document.documentElement.dataset.pdSmokeStage="choice";
 (await until(()=>document.querySelector("#app input[data-choice]"))).click();
 document.documentElement.dataset.pdSmokeStage="database";
 await until(async()=>{
  const records=await savedAttempts();
  return records.some(x=>x.state?.responses?.some(r=>r.response?.kind==="single-choice"));
 });
 document.documentElement.dataset.pdSmoke="saved";
})().catch(e=>{document.documentElement.dataset.pdSmoke="error";document.documentElement.dataset.pdSmokeError=e.message;});`;
const second=`(async()=>{${common}
 document.documentElement.dataset.pdSmokeStage="reopen";
 await enterWorkspace();
 document.documentElement.dataset.pdSmokeStage="lookup";
 const record=await until(async()=> (await savedAttempts()).find(x=>x.state?.responses?.some(r=>r.response?.kind==="single-choice")));
 document.documentElement.dataset.pdSmokeStage="history";
 const button=await until(()=>[...document.querySelectorAll("[data-attempt]")].find(x=>x.dataset.attempt===record.id));
 button.click();
 document.documentElement.dataset.pdSmokeStage="answer";
 await until(()=>document.querySelector("input[data-choice]:checked"));
 document.documentElement.dataset.pdSmoke="restored";
})().catch(e=>{document.documentElement.dataset.pdSmoke="error";document.documentElement.dataset.pdSmokeError=e.message;});`;
function run(expected){
 const result=spawnSync(chrome,[
  "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
  "--no-first-run","--disable-extensions","--disable-background-networking",
  "--virtual-time-budget=40000","--dump-dom","--user-data-dir="+profile,
  pathToFileURL(path).href,
 ],{encoding:"utf8",timeout:45000,maxBuffer:32*1024*1024});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error("Chrome exited "+result.status+": "+result.stderr.slice(-1500));
 if(!result.stdout.includes('data-pd-smoke="'+expected+'"')){
  const failure=result.stdout.match(/data-pd-smoke-error="([^"]+)"/)?.[1];
  const stage=result.stdout.match(/data-pd-smoke-stage="([^"]+)"/)?.[1];
  const app=result.stdout.slice(result.stdout.indexOf('id="app"'),result.stdout.indexOf('id="app"')+500).replace(/\\s+/g," ");
  throw new Error("Offline file:// "+expected+" failed: "+("stage="+(stage??"unknown")+" "+(failure||result.stderr.slice(-1000)||"no smoke marker")+" app="+app));
 }
 console.log("Offline file://: "+expected+" passed");
}
try{
 await writeFile(path,scriptFor(first));
 run("saved");
 await writeFile(path,scriptFor(second));
 run("restored");
}finally{
 await rm(directory,{recursive:true,force:true});
}
