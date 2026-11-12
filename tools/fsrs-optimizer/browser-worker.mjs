import {createInstance} from "@open-spaced-repetition/binding-wasm32-wasip1/workerd";
import {OPTIMIZER_CHRONOLOGY} from "./optimizer-policy.mjs";
import {
 OptimizerPipelineRejectedError,convertOptimizerEvidence,evaluateOptimizerEvidence,
 runFsrsOptimizerPipeline
} from "./optimizer-pipeline.mjs";

const send=message=>self.postMessage(message);
async function createBindingRuntime(){
 const url=new URL("./fsrs-binding.wasm32-wasip1.wasm",import.meta.url);
 const response=await fetch(url);
 if(!response.ok)throw Error("Could not load local FSRS optimizer WASM: "+response.status);
 const module=await WebAssembly.compile(await response.arrayBuffer());
 const instance=await createInstance(module);
 return {binding:instance.exports,dispose:()=>instance.dispose()};
}
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,"0")).join("");
const digest=async bytes=>hex(await crypto.subtle.digest("SHA-256",bytes));
const progressReporter=requestId=>{
 const states=new Map();
 return (stage,current,total)=>{
  const prior=states.get(stage)??{last:0,lastCurrent:-1};
  const now=Date.now();
  if(current===total||current===0||now-prior.last>=250||
     current-prior.lastCurrent>=Math.max(1,Math.floor(total/20))){
   states.set(stage,{last:now,lastCurrent:current});
   send({type:"progress",requestId,stage,current,total});
  }
 };
};

async function optimize(binding,request){
 const {requestId,csv}=request;
 if(typeof csv!=="string"||!csv.trim())throw Error("Optimizer evidence is empty");
 const bytes=new TextEncoder().encode(csv);
 const report=progressReporter(requestId);
 try{
  const profile=await runFsrsOptimizerPipeline({
   binding,bytes,sourceSha256:await digest(bytes),
   makeOptions:(cardIds,stage)=>({
    cardIds,progress:(current,total)=>{report(stage,current,total);return true;}
   }),
   progress:report
  });
  send({type:"result",requestId,profile});
 }catch(error){
  if(error instanceof OptimizerPipelineRejectedError){
   send({type:"rejected",requestId,reasons:error.reasons});
   return;
  }
  throw error;
 }
}
async function probe(binding,request){
 const {requestId,csv}=request;
 if(typeof csv!=="string"||!csv.trim())throw Error("Optimizer evidence is empty");
 const bytes=new TextEncoder().encode(csv);
 const {items,cardIds}=await convertOptimizerEvidence(binding,bytes);
 if(items.length<1)throw Error("Probe evidence produced no optimizer items");
 const metrics=evaluateOptimizerEvidence(binding,items,cardIds,"Browser optimizer probe");
 send({type:"probe-result",requestId,items:items.length,cards:new Set(cardIds).size,metrics,
  chronology:OPTIMIZER_CHRONOLOGY});
}
self.addEventListener("message",event=>{
 const request=event.data;
 if(!request||typeof request!=="object")return;
 if(request.type!=="optimize"&&request.type!=="probe")return;
 void (async()=>{
  let runtime;
  try{
   runtime=await createBindingRuntime();
   if(runtime.binding.__napiBindingTarget!=="wasm32-wasip1")
    throw Error("Unexpected FSRS optimizer binding target");
   await (request.type==="optimize"?optimize(runtime.binding,request):probe(runtime.binding,request));
  }catch(error){
   send({type:"error",requestId:request.requestId,
    message:error instanceof Error?error.message:String(error)});
  }finally{
   try{await runtime?.dispose();}catch(error){
    console.error("FSRS optimizer WASM disposal failed",error);
   }
  }
 })();
});
