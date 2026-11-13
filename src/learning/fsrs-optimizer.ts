import {checkFSRS7Parameters} from "ts-fsrs/models/fsrs-7";
import type {LearningCard} from "./learning.ts";
import type {RevisionMemoryState} from "./revision-scheduler-port.ts";

export const FSRS_OPTIMIZER_PROFILE_SCHEMA="practice-desk-fsrs-profile/v4";
export const FSRS_OPTIMIZER_BINDING_VERSION="0.6.1";
export const FSRS_OPTIMIZER_HOLDOUT_STRATEGY="final-sixth";
export const FSRS_OPTIMIZER_MIN_TRAIN_ITEMS=64;
export const FSRS_OPTIMIZER_MIN_HOLDOUT_ITEMS=64;
export const FSRS_OPTIMIZER_MIN_HOLDOUT_CARDS=16;
export const FSRS_OPTIMIZER_CALIBRATION_EPSILON=1e-9;
export const FSRS_OPTIMIZER_CHRONOLOGY="elapsed-24h";
export const FSRS_OPTIMIZER_CONVERTER_FIXED_UTC_OFFSET_MINUTES=0;
export const FSRS_OPTIMIZER_CONVERTER_ROLLOVER_HOUR=0;

export interface FsrsEvaluationMetrics{readonly logLoss:number;readonly rmseBins:number;}
export interface FsrsHoldoutDiagnostics{
 readonly logLossImprovement:{readonly absolute:number;readonly relative:number};
 readonly calibration:{readonly metric:"rmse-bins";readonly delta:number;readonly relativeDelta:number;
  readonly status:"improved"|"unchanged"|"regressed"};
}
export interface FsrsIncumbentEvaluation{
 readonly sourceSha256:string;readonly weightsFingerprint:string;readonly metrics:FsrsEvaluationMetrics;
}
export interface FsrsOptimizerProfile{
 readonly schema:typeof FSRS_OPTIMIZER_PROFILE_SCHEMA;readonly model:"FSRS-7";
 readonly bindingVersion:typeof FSRS_OPTIMIZER_BINDING_VERSION;readonly trainedAt:string;
 readonly sourceSha256:string;readonly evidenceItems:number;readonly weights:readonly number[];
 readonly evaluation:{
  readonly crossValidation:FsrsEvaluationMetrics;
  readonly holdout:{
   readonly strategy:typeof FSRS_OPTIMIZER_HOLDOUT_STRATEGY;
   readonly trainItems:number;readonly holdoutItems:number;readonly holdoutCards:number;
   readonly minimumTrainItems:typeof FSRS_OPTIMIZER_MIN_TRAIN_ITEMS;
   readonly minimumHoldoutItems:typeof FSRS_OPTIMIZER_MIN_HOLDOUT_ITEMS;
   readonly minimumHoldoutCards:typeof FSRS_OPTIMIZER_MIN_HOLDOUT_CARDS;
   readonly stock:FsrsEvaluationMetrics;readonly personalized:FsrsEvaluationMetrics;
   readonly incumbent?:FsrsIncumbentEvaluation;readonly gate:"passed";
  };
 };
 readonly training:{readonly enableShortTerm:true;readonly enableSchedPenalties:true;
  readonly numRelearningSteps:1;readonly chronology:typeof FSRS_OPTIMIZER_CHRONOLOGY;
  readonly converterFixedUtcOffsetMinutes:typeof FSRS_OPTIMIZER_CONVERTER_FIXED_UTC_OFFSET_MINUTES;
  readonly converterRolloverHour:typeof FSRS_OPTIMIZER_CONVERTER_ROLLOVER_HOUR;
  readonly validationCandidateTrainedItems:number;readonly finalRetrainedOnAllEvidence:true;};
}
const stateCode=(state:RevisionMemoryState):0|1|2|3=>{
 switch(state){case "new":return 0;case "learning":return 1;case "review":return 2;case "relearning":return 3;}
};
const csvCell=(v:string)=>'"'+v.replaceAll('"','""')+'"';
export function optimizerEvidenceSummary(cards:readonly Pick<LearningCard,"reviews">[]){
 let reviewedCards=0,reviews=0;
 for(const card of cards){if(card.reviews.length)reviewedCards++;reviews+=card.reviews.length;}
 return {cards:reviewedCards,reviews};
}
export function fsrsOptimizerCsv(cards:readonly Pick<LearningCard,"id"|"reviews">[]):string{
 const rows=["review_time,card_id,review_rating,review_duration,review_state"];
 for(const card of [...cards].sort((a,b)=>a.id.localeCompare(b.id)))
  for(const review of card.reviews)rows.push([
   Date.parse(review.at),csvCell(card.id),review.rating,review.durationMs,stateCode(review.state)
  ].join(","));
 return rows.join("\n")+"\n";
}
const nonNegative=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const safePositive=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>0;
const metrics=(value:unknown,label:string):FsrsEvaluationMetrics=>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid FSRS optimizer "+label+" metrics");
 const m=value as Partial<FsrsEvaluationMetrics>;
 if(!nonNegative(m.logLoss)||!nonNegative(m.rmseBins))throw Error("Invalid FSRS optimizer "+label+" metrics");
 return {logLoss:m.logLoss,rmseBins:m.rmseBins};
};
const optimizerWeights=(value:unknown):number[]=>{
 if(!Array.isArray(value)||value.length!==34||value.some(x=>typeof x!=="number"||!Number.isFinite(x)))
  throw Error("Invalid FSRS optimizer profile weights");
 try{return Array.from(checkFSRS7Parameters(value));}
 catch{throw Error("Invalid FSRS optimizer FSRS-7 weights");}
};
const fingerprintText64=(value:string):string=>{
 let hash=0xcbf29ce484222325n;
 for(let index=0;index<value.length;index++){
   hash^=BigInt(value.charCodeAt(index));
   hash=BigInt.asUintN(64,hash*0x100000001b3n);
 }
 return "fnv1a64:"+hash.toString(16).padStart(16,"0");
};
export const fsrsWeightsFingerprint=(weights:readonly number[]):string=>
 fingerprintText64(optimizerWeights(weights).map(value=>Number(value).toString()).join(","));
export function fsrsHoldoutDiagnostics(
 baseline:FsrsEvaluationMetrics,candidate:FsrsEvaluationMetrics
):FsrsHoldoutDiagnostics{
 const absolute=baseline.logLoss-candidate.logLoss;
 const relative=baseline.logLoss>0?absolute/baseline.logLoss:0;
 const delta=candidate.rmseBins-baseline.rmseBins;
 const relativeDelta=baseline.rmseBins>0?delta/baseline.rmseBins:delta===0?0:Number.POSITIVE_INFINITY;
 const status:FsrsHoldoutDiagnostics["calibration"]["status"]=
   delta < -FSRS_OPTIMIZER_CALIBRATION_EPSILON?"improved":
   Math.abs(delta)<=FSRS_OPTIMIZER_CALIBRATION_EPSILON?"unchanged":"regressed";
 return {logLossImprovement:{absolute,relative},
  calibration:{metric:"rmse-bins",delta,relativeDelta,status}};
}
const requireHeldoutImprovement=(baseline:FsrsEvaluationMetrics,candidate:FsrsEvaluationMetrics,label:string)=>{
 const diagnostics=fsrsHoldoutDiagnostics(baseline,candidate);
 if(candidate.logLoss>=baseline.logLoss)
  throw Error("Personalized FSRS-7 profile held-out log loss is not lower than "+label);
 if(diagnostics.calibration.status==="regressed")
  throw Error("Personalized FSRS-7 profile regressed held-out RMSE-bins calibration versus "+label);
};
const incumbentEvaluation=(value:unknown):FsrsIncumbentEvaluation=>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid FSRS optimizer incumbent comparison");
 const raw=value as Partial<FsrsIncumbentEvaluation>;
 if(Object.keys(raw).some(k=>!["sourceSha256","weightsFingerprint","metrics"].includes(k))||
   typeof raw.sourceSha256!=="string"||!/^[a-f0-9]{64}$/.test(raw.sourceSha256)||
   typeof raw.weightsFingerprint!=="string"||!/^fnv1a64:[0-9a-f]{16}$/.test(raw.weightsFingerprint))
  throw Error("Invalid FSRS optimizer incumbent comparison");
 return {sourceSha256:raw.sourceSha256,weightsFingerprint:raw.weightsFingerprint,
  metrics:metrics(raw.metrics,"incumbent holdout")};
};
export function validateFsrsOptimizerProfile(value:unknown):FsrsOptimizerProfile{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid FSRS optimizer profile");
 const p=value as Partial<FsrsOptimizerProfile>;
 const fields=["schema","model","bindingVersion","trainedAt","sourceSha256","evidenceItems","weights","evaluation","training"];
 if(Object.keys(p).some(k=>!fields.includes(k))||p.schema!==FSRS_OPTIMIZER_PROFILE_SCHEMA||p.model!=="FSRS-7"||
   p.bindingVersion!==FSRS_OPTIMIZER_BINDING_VERSION||typeof p.trainedAt!=="string"||!Number.isFinite(Date.parse(p.trainedAt))||
   typeof p.sourceSha256!=="string"||!/^[a-f0-9]{64}$/.test(p.sourceSha256)||!safePositive(p.evidenceItems))
  throw Error("Invalid FSRS optimizer profile");
 const weights=optimizerWeights(p.weights);

 const e=p.evaluation;
 if(!e||typeof e!=="object"||Array.isArray(e))throw Error("Invalid FSRS optimizer evaluation");
 const crossValidation=metrics(e.crossValidation,"cross-validation");
 const h=e.holdout;
 if(!h||typeof h!=="object"||Array.isArray(h)||
   h.strategy!==FSRS_OPTIMIZER_HOLDOUT_STRATEGY||!safePositive(h.trainItems)||!safePositive(h.holdoutItems)||
   !safePositive(h.holdoutCards)||h.minimumTrainItems!==FSRS_OPTIMIZER_MIN_TRAIN_ITEMS||
   h.minimumHoldoutItems!==FSRS_OPTIMIZER_MIN_HOLDOUT_ITEMS||h.minimumHoldoutCards!==FSRS_OPTIMIZER_MIN_HOLDOUT_CARDS||
   h.gate!=="passed"||h.trainItems<FSRS_OPTIMIZER_MIN_TRAIN_ITEMS||
   h.holdoutItems<FSRS_OPTIMIZER_MIN_HOLDOUT_ITEMS||h.holdoutCards<FSRS_OPTIMIZER_MIN_HOLDOUT_CARDS||
   h.holdoutCards>h.holdoutItems||h.trainItems+h.holdoutItems!==p.evidenceItems)
  throw Error("Invalid FSRS optimizer holdout evidence");
 const stock=metrics(h.stock,"stock holdout"),personalized=metrics(h.personalized,"personalized holdout");
 requireHeldoutImprovement(stock,personalized,"stock FSRS-7");
 const incumbent=h.incumbent===undefined?undefined:incumbentEvaluation(h.incumbent);
 if(incumbent)requireHeldoutImprovement(incumbent.metrics,personalized,"the active personalized profile");

 const t=p.training;
 if(!t||t.enableShortTerm!==true||t.enableSchedPenalties!==true||t.numRelearningSteps!==1||
   t.chronology!==FSRS_OPTIMIZER_CHRONOLOGY||
   t.converterFixedUtcOffsetMinutes!==FSRS_OPTIMIZER_CONVERTER_FIXED_UTC_OFFSET_MINUTES||
   t.converterRolloverHour!==FSRS_OPTIMIZER_CONVERTER_ROLLOVER_HOUR||
   t.validationCandidateTrainedItems!==h.trainItems||t.finalRetrainedOnAllEvidence!==true)
  throw Error("Invalid FSRS optimizer training metadata");
 return {
  schema:FSRS_OPTIMIZER_PROFILE_SCHEMA,model:"FSRS-7",bindingVersion:FSRS_OPTIMIZER_BINDING_VERSION,
  trainedAt:p.trainedAt,sourceSha256:p.sourceSha256,evidenceItems:p.evidenceItems,weights,
  evaluation:{crossValidation,holdout:{
   strategy:FSRS_OPTIMIZER_HOLDOUT_STRATEGY,trainItems:h.trainItems,holdoutItems:h.holdoutItems,holdoutCards:h.holdoutCards,
   minimumTrainItems:FSRS_OPTIMIZER_MIN_TRAIN_ITEMS,minimumHoldoutItems:FSRS_OPTIMIZER_MIN_HOLDOUT_ITEMS,
   minimumHoldoutCards:FSRS_OPTIMIZER_MIN_HOLDOUT_CARDS,stock,personalized,
   ...(incumbent?{incumbent}:{}),gate:"passed"
  }},
  training:{enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,
   chronology:FSRS_OPTIMIZER_CHRONOLOGY,
   converterFixedUtcOffsetMinutes:FSRS_OPTIMIZER_CONVERTER_FIXED_UTC_OFFSET_MINUTES,
   converterRolloverHour:FSRS_OPTIMIZER_CONVERTER_ROLLOVER_HOUR,
   validationCandidateTrainedItems:t.validationCandidateTrainedItems,finalRetrainedOnAllEvidence:true}
 };
}
export function assertFsrsOptimizerReplacement(
 candidateValue:unknown,incumbentValue:unknown
):FsrsOptimizerProfile{
 const candidate=validateFsrsOptimizerProfile(candidateValue);
 if(incumbentValue===null||incumbentValue===undefined)return candidate;
 const incumbent=validateFsrsOptimizerProfile(incumbentValue);
 const candidateId=candidate.sourceSha256+"|"+fsrsWeightsFingerprint(candidate.weights);
 const incumbentId=incumbent.sourceSha256+"|"+fsrsWeightsFingerprint(incumbent.weights);
 if(candidateId===incumbentId)return candidate;
 const proof=candidate.evaluation.holdout.incumbent;
 if(!proof||proof.sourceSha256!==incumbent.sourceSha256||
   proof.weightsFingerprint!==fsrsWeightsFingerprint(incumbent.weights))
  throw Error("Replacement FSRS-7 profile was not evaluated against the active personalized profile");
 return candidate;
}
export const serializeFsrsOptimizerProfile=(p:FsrsOptimizerProfile)=>
 JSON.stringify(validateFsrsOptimizerProfile(p),null,2)+"\n";
