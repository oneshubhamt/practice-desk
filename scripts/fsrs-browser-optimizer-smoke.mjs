import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {chromium,firefox,webkit} from "playwright-core";

const browserName=process.argv[2]??"chromium";
const mode=process.argv[3]??"probe";
const browserType={chromium,firefox,webkit}[browserName];
if(!browserType)throw Error("Unknown browser "+browserName);
if(mode!=="probe"&&mode!=="full")throw Error("Unknown optimizer smoke mode "+mode);
const root=join(process.cwd(),"Practice_Desk_Static");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".wasm":"application/wasm",".txt":"text/plain; charset=utf-8"};
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url??"/","http://localhost").pathname;
  const relative=pathname==="/"?"/index.html":pathname;
  const file=normalize(join(root,relative));
  if(!file.startsWith(normalize(root)))throw Error("invalid path");
  const data=await readFile(file);res.statusCode=200;res.setHeader("Content-Type",mime[extname(file)]??"application/octet-stream");res.end(data);
 }catch{res.statusCode=404;res.end("not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const address=server.address();if(!address||typeof address==="string")throw Error("server address unavailable");
const browser=await browserType.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${address.port}/`,{waitUntil:"load"});
 const marker=await page.locator('meta[name="practice-desk-browser-optimizer"]').getAttribute("content");
 if(marker!=="wasm32-wasip1-0.6.1")throw Error("Static optimizer capability marker missing");
 const rows=["review_time,card_id,review_rating,review_duration,review_state"];
 const cards=mode==="full"?96:12;
 for(let card=0;card<cards;card++){
  const start=1704067200000+card*1000;
  rows.push(`${start},card-${card},3,1000,0`);
  rows.push(`${start+10*60*1000},card-${card},3,900,1`);
  if(mode==="full"){
   const pattern=card%4;
   rows.push(`${start+12*60*60*1000},card-${card},${pattern===3?3:1},800,2`);
   rows.push(`${start+24*60*60*1000},card-${card},${pattern>=2?3:1},750,2`);
   rows.push(`${start+48*60*60*1000},card-${card},${pattern===3?3:1},700,2`);
  }else rows.push(`${start+24*60*60*1000},card-${card},3,800,2`);
 }
 const result=await page.evaluate(({csv,mode})=>new Promise((resolve,reject)=>{
  const worker=new Worker("./fsrs-optimizer.worker.js",{type:"module"});
  const updates=[];
  const timer=setTimeout(()=>{worker.terminate();reject(new Error("optimizer "+mode+" timeout"));},mode==="full"?8*60*1000:60000);
  worker.onmessage=event=>{
   if(event.data?.requestId!=="smoke")return;
   if(event.data.type==="progress"){updates.push([event.data.stage,event.data.current,event.data.total]);return;}
   if(event.data.type==="probe-result"){
    clearTimeout(timer);worker.terminate();resolve({...event.data,updates});return;
   }
   if(event.data.type==="result"){
    clearTimeout(timer);worker.terminate();resolve({...event.data,updates});return;
   }
   if(event.data.type==="rejected"){
    clearTimeout(timer);worker.terminate();reject(new Error("optimizer activation rejected: "+event.data.reasons?.join("; ")));return;
   }
   if(event.data.type==="error"){clearTimeout(timer);worker.terminate();reject(new Error(event.data.message));}
  };
  worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(new Error(event.message));};
  worker.postMessage({type:mode==="full"?"optimize":"probe",requestId:"smoke",csv});
 }),{csv:rows.join("\n")+"\n",mode});
 if(mode==="probe"){
  if(!(result.items>0&&result.cards>0&&result.chronology==="elapsed-24h"&&
    Number.isFinite(result.metrics.logLoss)&&Number.isFinite(result.metrics.rmseBins)))
   throw Error("Browser optimizer probe returned invalid metrics");
 }else{
  const p=result.profile;
  if(p?.schema!=="practice-desk-fsrs-profile/v5"||p.training?.chronology!=="elapsed-24h"||
    p.training?.converterFixedUtcOffsetMinutes!==0||p.training?.converterRolloverHour!==0||
    p.evaluation?.holdout?.gate!=="passed"||
    p.evidence?.rawReviews!==rows.length-1||p.evidence?.rawCards!==cards||
    !(p.evidence?.retainedItems>0)||!(p.evidence?.retainedCards>0)||
    !Array.isArray(p.weights)||p.weights.length!==34||
    p.weights.some(x=>!Number.isFinite(x))||!Number.isFinite(p.evaluation.crossValidation.logLoss)||
    !Number.isFinite(p.evaluation.crossValidation.rmseBins))
   throw Error("Full browser optimizer returned an invalid v5 profile");
  const stages=new Set(result.updates.map(x=>x[0]));
  for(const stage of ["Train validation candidate","Compare later holdout","Retrain final profile on all evidence","Time-series cross-validation"])
   if(!stages.has(stage))throw Error("Full browser optimizer did not exercise stage: "+stage);
 }
 console.log(browserName+" browser/WASM optimizer "+mode+" passed:",JSON.stringify(
  mode==="full"?{
   evidence:result.profile.evidence,holdout:result.profile.evaluation.holdout,
   crossValidation:result.profile.evaluation.crossValidation,progressUpdates:result.updates.length
  }:result
 ));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
