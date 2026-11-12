import {
 HOLDOUT_STRATEGY,MIN_HOLDOUT_CARDS,MIN_HOLDOUT_ITEMS,MIN_TRAIN_ITEMS,
 OPTIMIZER_BINDING_VERSION,OPTIMIZER_CHRONOLOGY,OPTIMIZER_FIXED_UTC_OFFSET_MINUTES,
 OPTIMIZER_MODEL_VERSION,OPTIMIZER_PROFILE_SCHEMA,OPTIMIZER_ROLLOVER_HOUR,
 evaluateHoldoutGate,fsrsWeightsFingerprint,splitChronologicalHoldout
} from "./optimizer-policy.mjs";

export const OPTIMIZER_STAGES=Object.freeze({
 validation:"Train validation candidate",
 holdout:"Compare later holdout",
 final:"Retrain final profile on all evidence",
 crossValidation:"Time-series cross-validation"
});

export class OptimizerPipelineRejectedError extends Error{
 constructor(kind,reasons){
  super(reasons.join("; "));
  this.name="OptimizerPipelineRejectedError";
  this.kind=kind;
  this.reasons=[...reasons];
 }
}

export function finiteOptimizerMetrics(value,label){
 if(!value||!Number.isFinite(value.logLoss)||value.logLoss<0||
    !Number.isFinite(value.rmseBins)||value.rmseBins<0)
  throw Error(label+" returned invalid evaluation metrics");
 return {logLoss:value.logLoss,rmseBins:value.rmseBins};
}

export function ensureOptimizerWeights(weights,label){
 if(!weights||typeof weights.length!=="number"||weights.length!==34)
  throw Error(label+" did not return 34 finite FSRS-7 weights");
 const normalized=Array.from(weights);
 if(normalized.some(v=>typeof v!=="number"||!Number.isFinite(v)))
  throw Error(label+" did not return 34 finite FSRS-7 weights");
 return normalized;
}

export async function convertOptimizerEvidence(binding,bytes){
 const converted=await Promise.resolve(binding.convertCsvToFsrsItemsWithCardIds(
  bytes,OPTIMIZER_ROLLOVER_HOUR,OPTIMIZER_FIXED_UTC_OFFSET_MINUTES,OPTIMIZER_MODEL_VERSION
 ));
 if(!converted||!Array.isArray(converted.items)||!Array.isArray(converted.cardIds)||
   converted.items.length!==converted.cardIds.length)
  throw Error("FSRS optimizer conversion returned misaligned evidence");
 return converted;
}

export function evaluateOptimizerEvidence(binding,items,cardIds,label){
 return finiteOptimizerMetrics(
  new binding.FSRSBinding().evaluate(items,cardIds),label
 );
}

const evidenceReasons=split=>[
 "Need at least "+MIN_TRAIN_ITEMS+" historical optimizer items, "+MIN_HOLDOUT_ITEMS+
 " later holdout items and "+MIN_HOLDOUT_CARDS+" holdout cards; observed "+
 split.trainCount+", "+split.holdoutCount+" and "+split.holdoutCards+"."
];

export async function runFsrsOptimizerPipeline({
 binding,bytes,sourceSha256,trainedAt=new Date().toISOString(),
 makeOptions,progress=()=>{},checkpoint=()=>{},incumbentProfile=null
}){
 if(!(bytes instanceof Uint8Array)||bytes.length<1)throw Error("Optimizer evidence is empty");
 if(typeof sourceSha256!=="string"||!/^[a-f0-9]{64}$/.test(sourceSha256))
  throw Error("Optimizer evidence digest is invalid");
 const optionsFor=(cardIds,stage)=>{
  const options=makeOptions?.(cardIds,stage)??{
   modelVersion:OPTIMIZER_MODEL_VERSION,enableShortTerm:true,
   enableSchedPenalties:true,numRelearningSteps:1,cardIds
  };
  return {
   ...options,modelVersion:OPTIMIZER_MODEL_VERSION,
   enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,cardIds
  };
 };

 checkpoint();
 const {items,cardIds}=await convertOptimizerEvidence(binding,bytes);
 if(items.length<1)throw Error("Review evidence did not produce any FSRS-7 optimizer items");
 const split=splitChronologicalHoldout(items,cardIds);
 if(split.trainCount<MIN_TRAIN_ITEMS||split.holdoutCount<MIN_HOLDOUT_ITEMS||
   split.holdoutCards<MIN_HOLDOUT_CARDS)
  throw new OptimizerPipelineRejectedError("evidence",evidenceReasons(split));

 const validationWeights=ensureOptimizerWeights(
  await binding.computeParameters(
   split.trainItems,optionsFor(split.trainCardIds,OPTIMIZER_STAGES.validation)
  ),"Validation training"
 );
 checkpoint();

 let incumbent=null;
 if(incumbentProfile!==null){
  if(!incumbentProfile||typeof incumbentProfile!=="object"||
    typeof incumbentProfile.sourceSha256!=="string"||!/^[a-f0-9]{64}$/.test(incumbentProfile.sourceSha256))
   throw Error("Active FSRS optimizer profile provenance is invalid");
  const incumbentWeights=ensureOptimizerWeights(incumbentProfile.weights,"Active personalized profile");
  incumbent={sourceSha256:incumbentProfile.sourceSha256,
   weightsFingerprint:fsrsWeightsFingerprint(incumbentWeights),weights:incumbentWeights};
 }
 const evaluationTotal=incumbent?3:2;
 progress(OPTIMIZER_STAGES.holdout,0,evaluationTotal);
 const stock=finiteOptimizerMetrics(
  new binding.FSRSBinding().evaluate(split.holdoutItems,split.holdoutCardIds),
  "Stock FSRS-7"
 );
 progress(OPTIMIZER_STAGES.holdout,1,evaluationTotal);
 const personalized=finiteOptimizerMetrics(
  new binding.FSRSBinding(validationWeights).evaluate(split.holdoutItems,split.holdoutCardIds),
  "Personalized FSRS-7"
 );
 progress(OPTIMIZER_STAGES.holdout,2,evaluationTotal);
 let incumbentMetrics=null;
 if(incumbent){
  incumbentMetrics=finiteOptimizerMetrics(
   new binding.FSRSBinding(incumbent.weights).evaluate(split.holdoutItems,split.holdoutCardIds),
   "Active personalized FSRS-7"
  );
  progress(OPTIMIZER_STAGES.holdout,3,evaluationTotal);
 }
 const gate=evaluateHoldoutGate(stock,personalized,split,incumbentMetrics);
 if(!gate.passed)throw new OptimizerPipelineRejectedError("gate",gate.reasons);

 checkpoint();
 const weights=ensureOptimizerWeights(
  await binding.computeParameters(items,optionsFor(cardIds,OPTIMIZER_STAGES.final)),
  "Final training"
 );
 checkpoint();
 const crossValidation=finiteOptimizerMetrics(
  await binding.evaluateWithTimeSeriesSplits(
   items,optionsFor(cardIds,OPTIMIZER_STAGES.crossValidation)
  ),"Time-series cross-validation"
 );
 checkpoint();

 return {
  schema:OPTIMIZER_PROFILE_SCHEMA,model:OPTIMIZER_MODEL_VERSION,
  bindingVersion:OPTIMIZER_BINDING_VERSION,trainedAt,sourceSha256,
  evidenceItems:items.length,weights,
  evaluation:{
   crossValidation,
   holdout:{
    strategy:HOLDOUT_STRATEGY,
    trainItems:split.trainCount,holdoutItems:split.holdoutCount,
    holdoutCards:split.holdoutCards,
    minimumTrainItems:MIN_TRAIN_ITEMS,minimumHoldoutItems:MIN_HOLDOUT_ITEMS,
    minimumHoldoutCards:MIN_HOLDOUT_CARDS,
    stock:gate.stock,personalized:gate.personalized,
    ...(incumbent?{incumbent:{sourceSha256:incumbent.sourceSha256,
      weightsFingerprint:incumbent.weightsFingerprint,metrics:gate.incumbent}}:{}),
    gate:"passed"
   }
  },
  training:{
   enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,
   chronology:OPTIMIZER_CHRONOLOGY,
   converterFixedUtcOffsetMinutes:OPTIMIZER_FIXED_UTC_OFFSET_MINUTES,
   converterRolloverHour:OPTIMIZER_ROLLOVER_HOUR,
   validationCandidateTrainedItems:split.trainCount,finalRetrainedOnAllEvidence:true
  }
 };
}
