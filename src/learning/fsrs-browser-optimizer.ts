import {validateFsrsOptimizerProfile,type FsrsOptimizerProfile} from "./fsrs-optimizer.ts";

export interface BrowserFsrsOptimizerAvailability{readonly available:boolean;readonly reason:string;}
export interface BrowserFsrsOptimizerProgress{readonly stage:string;readonly current:number;readonly total:number;}
export interface BrowserFsrsOptimizerRun{
 readonly promise:Promise<FsrsOptimizerProfile>;
 cancel():void;
}
export interface BrowserFsrsOptimizerOptions{
 readonly timezone:string|number;readonly nextDayStartsAt:number;
 readonly timeoutMs?:number;readonly onProgress?:(progress:BrowserFsrsOptimizerProgress)=>void;
}
export class FsrsOptimizerRejectedError extends Error{
 readonly reasons:readonly string[];
 constructor(reasons:readonly string[]){
  super(reasons.join("; "));this.name="FsrsOptimizerRejectedError";this.reasons=[...reasons];
 }
}
const CAPABILITY="wasm32-wasip1-0.6.1";
export function browserFsrsOptimizerAvailability():BrowserFsrsOptimizerAvailability{
 if(typeof document==="undefined"||typeof Worker==="undefined"||typeof WebAssembly==="undefined")
   return {available:false,reason:"Browser Worker/WebAssembly support is unavailable."};
 if(location.protocol==="file:")
   return {available:false,reason:"Use the static Practice Desk build over HTTP/HTTPS for in-app optimization."};
 const marker=document.querySelector<HTMLMetaElement>('meta[name="practice-desk-browser-optimizer"]')?.content;
 if(marker!==CAPABILITY)
   return {available:false,reason:"This build does not include the FSRS optimizer Worker/WASM assets."};
 if(!globalThis.crypto?.subtle)
   return {available:false,reason:"Web Crypto is unavailable; use HTTPS or localhost."};
 return {available:true,reason:"FSRS-7 WebAssembly optimizer available in a dedicated Worker."};
}
export function detectedFsrsOptimizerTimezone():string{
 try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch{return "";}
}
export function normalizeFsrsOptimizerTimezone(value:string|number):string|number{
 if(typeof value==="number"){
  if(!Number.isFinite(value)||value<-1440||value>1440)throw Error("Timezone offset must be between -1440 and 1440 minutes");
  return value;
 }
 const trimmed=value.trim();
 if(!trimmed)throw Error("Timezone is required for FSRS-7 optimization");
 const numeric=Number(trimmed);
 if(Number.isFinite(numeric)){
  if(numeric<-1440||numeric>1440)throw Error("Timezone offset must be between -1440 and 1440 minutes");
  return numeric;
 }
 return trimmed;
}
export function startBrowserFsrsOptimizer(csv:string,options:BrowserFsrsOptimizerOptions):BrowserFsrsOptimizerRun{
 const availability=browserFsrsOptimizerAvailability();
 if(!availability.available)throw Error(availability.reason);
 if(!csv.trim())throw Error("Optimizer evidence is empty");
 const nextDayStartsAt=options.nextDayStartsAt;
 if(!Number.isSafeInteger(nextDayStartsAt)||nextDayStartsAt<0||nextDayStartsAt>23)
   throw Error("Next-day rollover must be an integer from 0 to 23");
 const timezone=normalizeFsrsOptimizerTimezone(options.timezone);
 const requestId=globalThis.crypto?.randomUUID?.()??"fsrs-"+Date.now()+"-"+Math.random().toString(36).slice(2);
 const worker=new Worker(new URL("./fsrs-optimizer.worker.js",document.baseURI),{type:"module",name:"practice-desk-fsrs-optimizer"});
 let settled=false;
 const timeoutMs=options.timeoutMs??15*60*1000;
 let rejectPromise:(reason?:unknown)=>void=()=>{};
 const cleanup=()=>{worker.terminate();if(timer!==undefined)clearTimeout(timer);};
 const finishReject=(error:unknown)=>{if(settled)return;settled=true;cleanup();rejectPromise(error);};
 const timer=timeoutMs>0?window.setTimeout(()=>finishReject(new Error("FSRS optimization timed out")),timeoutMs):undefined;
 const promise=new Promise<FsrsOptimizerProfile>((resolve,reject)=>{
  rejectPromise=reject;
  worker.addEventListener("message",(event:MessageEvent<unknown>)=>{
   const data=event.data;
   if(!data||typeof data!=="object"||Array.isArray(data))return;
   const message=data as Record<string,unknown>;
   if(message.requestId!==requestId||typeof message.type!=="string")return;
   if(message.type==="progress"){
    if(typeof message.stage==="string"&&typeof message.current==="number"&&typeof message.total==="number")
      options.onProgress?.({stage:message.stage,current:message.current,total:message.total});
    return;
   }
   if(message.type==="rejected"){
    const reasons=Array.isArray(message.reasons)?message.reasons.filter((x):x is string=>typeof x==="string"):[];
    finishReject(new FsrsOptimizerRejectedError(reasons.length?reasons:["Personalized FSRS-7 did not clear the activation gate"]));return;
   }
   if(message.type==="error"){
    finishReject(new Error(typeof message.message==="string"?message.message:"FSRS optimizer Worker failed"));return;
   }
   if(message.type==="result"){
    try{
     const profile=validateFsrsOptimizerProfile(message.profile);
     if(settled)return;settled=true;cleanup();resolve(profile);
    }catch(error){finishReject(error);}
   }
  });
  worker.addEventListener("error",event=>finishReject(new Error(event.message||"FSRS optimizer Worker crashed")));
  worker.postMessage({type:"optimize",requestId,csv,timezone,nextDayStartsAt});
 });
 return {promise,cancel(){finishReject(new DOMException("FSRS optimization cancelled","AbortError"));}};
}
