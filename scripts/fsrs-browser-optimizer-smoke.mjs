import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {pathToFileURL} from "node:url";
import {chromium,firefox,webkit} from "playwright-core";

const browserName=process.argv[2]??"chromium";
const browserType={chromium,firefox,webkit}[browserName];
if(!browserType)throw Error("Unknown browser "+browserName);
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
 for(let card=0;card<12;card++){
  const start=1704067200000+card*1000;
  rows.push(`${start},card-${card},3,1000,0`);
  rows.push(`${start+10*60*1000},card-${card},3,900,1`);
  rows.push(`${start+24*60*60*1000},card-${card},3,800,2`);
 }
 const result=await page.evaluate(csv=>new Promise((resolve,reject)=>{
  const worker=new Worker("./fsrs-optimizer.worker.js",{type:"module"});
  const timer=setTimeout(()=>{worker.terminate();reject(new Error("optimizer probe timeout"));},60000);
  worker.onmessage=event=>{
   if(event.data?.requestId!=="probe")return;
   if(event.data.type==="probe-result"){clearTimeout(timer);worker.terminate();resolve(event.data);}
   if(event.data.type==="error"){clearTimeout(timer);worker.terminate();reject(new Error(event.data.message));}
  };
  worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(new Error(event.message));};
  worker.postMessage({type:"probe",requestId:"probe",csv,timezone:"Asia/Kolkata",nextDayStartsAt:4});
 }),rows.join("\n")+"\n");
 if(!(result.items>0&&result.cards>0&&Number.isFinite(result.metrics.logLoss)&&Number.isFinite(result.metrics.rmseBins)))
  throw Error("Browser optimizer probe returned invalid metrics");
 console.log(browserName+" browser/WASM optimizer probe passed:",JSON.stringify(result));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
