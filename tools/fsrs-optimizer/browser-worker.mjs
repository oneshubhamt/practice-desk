import {createInstance} from "@open-spaced-repetition/binding-wasm32-wasip1/workerd";
import {
 HOLDOUT_STRATEGY,MIN_HOLDOUT_CARDS,MIN_HOLDOUT_ITEMS,MIN_TRAIN_ITEMS,
 evaluateHoldoutGate,splitChronologicalHoldout
} from "./optimizer-policy.mjs";

const send=(message)=>self.postMessage(message);
async function createBindingRuntime(){
 const url=new URL("./fsrs-binding.wasm32-wasip1.wasm",import.meta.url);
 const response=await fetch(url);
 if(!response.ok)throw Error("Could not load local FSRS optimizer WASM: "+response.status);
 const module=await WebAssembly.compile(await response.arrayBuffer());
 const instance=await createInstance(module);
 return {binding:instance.exports,dispose:()=>instance.dispose()};
}
const finiteMetrics=(value,label)=>{
 if(!value||!Number.isFinite(value.logLoss)||!Number.isFinite(value.rmseBins))
  throw Error(label+" returned invalid evaluation metrics");
 return {logLoss:value.logLoss,rmseBins:value.rmseBins};
};
const ensureWeights=(weights,label)=>{
 if(!Array.isArray(weights)||weights.length!==34||weights.some(v=>!Number.isFinite(v)))
  throw Error(label+" did not return 34 finite FSRS-7 weights");
 return weights;
};
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,"0")).join("");
const progress=(requestId,stage)=>{
 let last=0,lastCurrent=-1;
 return (current,total)=>{
  const now=Date.now();
  if(current===total||current===0||now-last>=250||current-lastCurrent>=Math.max(1,Math.floor(total/20))){
   last=now;lastCurrent=current;send({type:"progress",requestId,stage,current,total});
  }
  return true;
 };
};
const options=(requestId,cardIds,stage)=>({
 modelVersion:"FSRS-7",enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,
 cardIds,progress:progress(requestId,stage)
});
async function convert(binding,csv,timezone,nextDayStartsAt){
 const bytes=new TextEncoder().encode(csv);
 const sourceSha256=hex(await crypto.subtle.digest("SHA-256",bytes));
 const converted=await Promise.resolve(binding.convertCsvToFsrsItemsWithCardIds(bytes,nextDayStartsAt,timezone,"FSRS-7"));
 return {bytes,sourceSha256,...converted};
}
async function optimize(binding,request){
 const {requestId,csv,timezone,nextDayStartsAt}=request;
 if(typeof csv!=="string"||!csv.trim())throw Error("Optimizer evidence is empty");
 if(!Number.isSafeInteger(nextDayStartsAt)||nextDayStartsAt<0||nextDayStartsAt>23)
  throw Error("Next-day rollover must be an integer from 0 to 23");
 const {sourceSha256,items,cardIds}=await convert(binding,csv,timezone,nextDayStartsAt);
 if(items.length<1)throw Error("Review evidence did not produce any FSRS-7 optimizer items");
 const split=splitChronologicalHoldout(items,cardIds);
 if(split.trainCount<MIN_TRAIN_ITEMS||split.holdoutCount<MIN_HOLDOUT_ITEMS||split.holdoutCards<MIN_HOLDOUT_CARDS){
  send({type:"rejected",requestId,reasons:[
   "Need at least "+MIN_TRAIN_ITEMS+" historical optimizer items, "+MIN_HOLDOUT_ITEMS+
   " later holdout items and "+MIN_HOLDOUT_CARDS+" holdout cards; observed "+
   split.trainCount+", "+split.holdoutCount+" and "+split.holdoutCards+"."
  ]});return;
 }
 const validationWeights=ensureWeights(
  await binding.computeParameters(split.trainItems,options(requestId,split.trainCardIds,"Train validation candidate")),
  "Validation training"
 );
 send({type:"progress",requestId,stage:"Compare later holdout",current:0,total:2});
 const baseline=finiteMetrics(new binding.FSRSBinding().evaluate(split.holdoutItems,split.holdoutCardIds),"Stock FSRS-7");
 send({type:"progress",requestId,stage:"Compare later holdout",current:1,total:2});
 const personalized=finiteMetrics(new binding.FSRSBinding(validationWeights).evaluate(split.holdoutItems,split.holdoutCardIds),"Personalized FSRS-7");
 send({type:"progress",requestId,stage:"Compare later holdout",current:2,total:2});
 const gate=evaluateHoldoutGate(baseline,personalized,split);
 if(!gate.passed){send({type:"rejected",requestId,reasons:gate.reasons});return;}
 const weights=ensureWeights(
  await binding.computeParameters(items,options(requestId,cardIds,"Retrain final profile on all evidence")),
  "Final training"
 );
 const crossValidation=finiteMetrics(
  await binding.evaluateWithTimeSeriesSplits(items,options(requestId,cardIds,"Time-series cross-validation")),
  "Time-series cross-validation"
 );
 send({type:"result",requestId,profile:{
  schema:"practice-desk-fsrs-profile/v2",model:"FSRS-7",bindingVersion:"0.6.1",
  trainedAt:new Date().toISOString(),sourceSha256,evidenceItems:items.length,weights,
  evaluation:{crossValidation,holdout:{
   strategy:HOLDOUT_STRATEGY,trainItems:split.trainCount,holdoutItems:split.holdoutCount,holdoutCards:split.holdoutCards,
   minimumTrainItems:MIN_TRAIN_ITEMS,minimumHoldoutItems:MIN_HOLDOUT_ITEMS,minimumHoldoutCards:MIN_HOLDOUT_CARDS,
   default:gate.baseline,personalized:gate.personalized,gate:"passed"
  }},
  training:{enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,nextDayStartsAt,timezone,
   validationCandidateTrainedItems:split.trainCount,finalRetrainedOnAllEvidence:true}
 }});
}
async function probe(binding,request){
 const {requestId,csv,timezone,nextDayStartsAt}=request;
 const {items,cardIds}=await convert(binding,csv,timezone,nextDayStartsAt);
 if(items.length<1)throw Error("Probe evidence produced no optimizer items");
 const metrics=finiteMetrics(new binding.FSRSBinding().evaluate(items,cardIds),"Browser optimizer probe");
 send({type:"probe-result",requestId,items:items.length,cards:new Set(cardIds).size,metrics});
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
   send({type:"error",requestId:request.requestId,message:error instanceof Error?error.message:String(error)});
  }finally{
   try{await runtime?.dispose();}catch(error){
    console.error("FSRS optimizer WASM disposal failed",error);
   }
  }
 })();
});
