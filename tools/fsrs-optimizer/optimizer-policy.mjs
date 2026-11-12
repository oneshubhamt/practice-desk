export const OPTIMIZER_MODEL_VERSION="FSRS-7";
export const OPTIMIZER_PROFILE_SCHEMA="practice-desk-fsrs-profile/v4";
export const OPTIMIZER_BINDING_VERSION="0.6.1";
export const OPTIMIZER_BROWSER_CAPABILITY="wasm32-wasip1-"+OPTIMIZER_BINDING_VERSION;
export const HOLDOUT_SEGMENTS=6;
export const MIN_TRAIN_ITEMS=64;
export const MIN_HOLDOUT_ITEMS=64;
export const MIN_HOLDOUT_CARDS=16;
export const MIN_ABSOLUTE_LOG_LOSS_IMPROVEMENT=0.001;
export const MIN_RELATIVE_LOG_LOSS_IMPROVEMENT=0.005;
export const CALIBRATION_EPSILON=1e-9;
export const HOLDOUT_STRATEGY="final-sixth";
export const OPTIMIZER_CHRONOLOGY="elapsed-24h";
export const OPTIMIZER_FIXED_UTC_OFFSET_MINUTES=0;
export const OPTIMIZER_ROLLOVER_HOUR=0;

const metric=(value,name)=>{
 if(!value||typeof value!=="object"||!Number.isFinite(value.logLoss)||value.logLoss<0||
   !Number.isFinite(value.rmseBins)||value.rmseBins<0)throw Error("Invalid "+name+" evaluation metrics");
 return {logLoss:value.logLoss,rmseBins:value.rmseBins};
};
const fingerprintText64=value=>{
 let hash=0xcbf29ce484222325n;
 for(let index=0;index<value.length;index++){
  hash^=BigInt(value.charCodeAt(index));
  hash=BigInt.asUintN(64,hash*0x100000001b3n);
 }
 return "fnv1a64:"+hash.toString(16).padStart(16,"0");
};
export function fsrsWeightsFingerprint(weights){
 if(!weights||typeof weights.length!=="number"||weights.length!==34)
  throw Error("FSRS-7 weights fingerprint requires exactly 34 weights");
 const normalized=Array.from(weights);
 if(normalized.some(value=>typeof value!=="number"||!Number.isFinite(value)))
  throw Error("FSRS-7 weights fingerprint requires finite weights");
 return fingerprintText64(normalized.map(value=>Number(value).toString()).join(","));
}
export function holdoutDiagnostics(baselineValue,candidateValue){
 const baseline=metric(baselineValue,"baseline"),candidate=metric(candidateValue,"candidate");
 const absolute=baseline.logLoss-candidate.logLoss;
 const relative=baseline.logLoss>0?absolute/baseline.logLoss:0;
 const required=Math.max(MIN_ABSOLUTE_LOG_LOSS_IMPROVEMENT,
  baseline.logLoss*MIN_RELATIVE_LOG_LOSS_IMPROVEMENT);
 const delta=candidate.rmseBins-baseline.rmseBins;
 const relativeDelta=baseline.rmseBins>0?delta/baseline.rmseBins:delta===0?0:Number.POSITIVE_INFINITY;
 const status=delta < -CALIBRATION_EPSILON?"improved":
  Math.abs(delta)<=CALIBRATION_EPSILON?"unchanged":"regressed";
 return {logLossImprovement:{absolute,relative,required},
  calibration:{metric:"rmse-bins",delta,relativeDelta,status}};
}

export function splitChronologicalHoldout(items,cardIds){
 if(!Array.isArray(items)||!Array.isArray(cardIds)||items.length!==cardIds.length)
  throw Error("Items and card IDs must be aligned arrays");
 const segmentSize=Math.floor(items.length/HOLDOUT_SEGMENTS);
 if(segmentSize<1)throw Error("Not enough optimizer items for chronological holdout");
 const trainEnd=(HOLDOUT_SEGMENTS-1)*segmentSize;
 const holdoutIds=cardIds.slice(trainEnd);
 return {
  trainItems:items.slice(0,trainEnd),trainCardIds:cardIds.slice(0,trainEnd),
  holdoutItems:items.slice(trainEnd),holdoutCardIds:holdoutIds,
  trainCount:trainEnd,holdoutCount:items.length-trainEnd,
  holdoutCards:new Set(holdoutIds).size
 };
}

const comparisonReasons=(baseline,candidate,label)=>{
 const diagnostics=holdoutDiagnostics(baseline,candidate),reasons=[];
 if(diagnostics.logLossImprovement.absolute+Number.EPSILON<diagnostics.logLossImprovement.required)
  reasons.push("personalized holdout log loss does not achieve the minimum practical improvement over "+label);
 if(diagnostics.calibration.status==="regressed")
  reasons.push("personalized holdout RMSE bins regresses versus "+label);
 return reasons;
};
export function evaluateHoldoutGate(stockEvaluation,personalizedEvaluation,counts,incumbentEvaluation=null){
 const stock=metric(stockEvaluation,"stock"),personalized=metric(personalizedEvaluation,"personalized");
 const incumbent=incumbentEvaluation===null?null:metric(incumbentEvaluation,"incumbent");
 const reasons=[];
 if(!Number.isSafeInteger(counts.trainCount)||counts.trainCount<MIN_TRAIN_ITEMS)
  reasons.push("historical training prefix has fewer than "+MIN_TRAIN_ITEMS+" optimizer items");
 if(!Number.isSafeInteger(counts.holdoutCount)||counts.holdoutCount<MIN_HOLDOUT_ITEMS)
  reasons.push("later holdout has fewer than "+MIN_HOLDOUT_ITEMS+" optimizer items");
 if(!Number.isSafeInteger(counts.holdoutCards)||counts.holdoutCards<MIN_HOLDOUT_CARDS)
  reasons.push("later holdout spans fewer than "+MIN_HOLDOUT_CARDS+" cards");
 reasons.push(...comparisonReasons(stock,personalized,"stock FSRS-7"));
 if(incumbent)reasons.push(...comparisonReasons(incumbent,personalized,"the active personalized profile"));
 return {passed:reasons.length===0,reasons,stock,personalized,incumbent};
}
