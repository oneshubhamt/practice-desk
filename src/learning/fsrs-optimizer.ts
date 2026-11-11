import {checkFSRS7Parameters} from "ts-fsrs/models/fsrs-7";
import type {LearningCard} from "./learning.ts";
import type {RevisionMemoryState} from "./revision-scheduler-port.ts";

export const FSRS_OPTIMIZER_PROFILE_SCHEMA="practice-desk-fsrs-profile/v3";
export const FSRS_OPTIMIZER_BINDING_VERSION="0.6.1";
export const FSRS_OPTIMIZER_HOLDOUT_STRATEGY="final-sixth";
export const FSRS_OPTIMIZER_MIN_TRAIN_ITEMS=64;
export const FSRS_OPTIMIZER_MIN_HOLDOUT_ITEMS=64;
export const FSRS_OPTIMIZER_MIN_HOLDOUT_CARDS=16;
export const FSRS_OPTIMIZER_CHRONOLOGY="elapsed-24h";
export const FSRS_OPTIMIZER_CONVERTER_FIXED_UTC_OFFSET_MINUTES=0;
export const FSRS_OPTIMIZER_CONVERTER_ROLLOVER_HOUR=0;

export interface FsrsEvaluationMetrics{readonly logLoss:number;readonly rmseBins:number;}
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
   readonly default:FsrsEvaluationMetrics;readonly personalized:FsrsEvaluationMetrics;
   readonly gate:"passed";
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
 const baseline=metrics(h.default,"stock holdout"),personalized=metrics(h.personalized,"personalized holdout");
 if(!(personalized.logLoss<baseline.logLoss)||personalized.rmseBins>baseline.rmseBins)
  throw Error("Personalized FSRS-7 profile did not pass the held-out non-regression gate");

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
   minimumHoldoutCards:FSRS_OPTIMIZER_MIN_HOLDOUT_CARDS,default:baseline,personalized,gate:"passed"
  }},
  training:{enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,
   chronology:FSRS_OPTIMIZER_CHRONOLOGY,
   converterFixedUtcOffsetMinutes:FSRS_OPTIMIZER_CONVERTER_FIXED_UTC_OFFSET_MINUTES,
   converterRolloverHour:FSRS_OPTIMIZER_CONVERTER_ROLLOVER_HOUR,
   validationCandidateTrainedItems:t.validationCandidateTrainedItems,finalRetrainedOnAllEvidence:true}
 };
}
export const serializeFsrsOptimizerProfile=(p:FsrsOptimizerProfile)=>
 JSON.stringify(validateFsrsOptimizerProfile(p),null,2)+"\n";
