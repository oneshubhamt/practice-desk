import type {LearningCard} from "./learning.ts";
import type {RevisionMemoryState} from "./revision-scheduler-port.ts";
export const FSRS_OPTIMIZER_PROFILE_SCHEMA="practice-desk-fsrs-profile/v1";
export const FSRS_OPTIMIZER_BINDING_VERSION="0.6.1";
export interface FsrsOptimizerProfile{
 readonly schema:typeof FSRS_OPTIMIZER_PROFILE_SCHEMA;readonly model:"FSRS-7";
 readonly bindingVersion:typeof FSRS_OPTIMIZER_BINDING_VERSION;readonly trainedAt:string;
 readonly sourceSha256:string;readonly evidenceItems:number;readonly weights:readonly number[];
 readonly evaluation:{readonly logLoss:number;readonly rmseBins:number};
 readonly training:{readonly enableShortTerm:true;readonly enableSchedPenalties:true;
  readonly numRelearningSteps:1;readonly nextDayStartsAt:number;readonly timezone:string|number;};
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
export function validateFsrsOptimizerProfile(value:unknown):FsrsOptimizerProfile{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid FSRS optimizer profile");
 const p=value as Partial<FsrsOptimizerProfile>;
 const fields=["schema","model","bindingVersion","trainedAt","sourceSha256","evidenceItems","weights","evaluation","training"];
 if(Object.keys(p).some(k=>!fields.includes(k))||p.schema!==FSRS_OPTIMIZER_PROFILE_SCHEMA||p.model!=="FSRS-7"||
   p.bindingVersion!==FSRS_OPTIMIZER_BINDING_VERSION||typeof p.trainedAt!=="string"||!Number.isFinite(Date.parse(p.trainedAt))||
   typeof p.sourceSha256!=="string"||!/^[a-f0-9]{64}$/.test(p.sourceSha256)||
   !Number.isSafeInteger(p.evidenceItems)||p.evidenceItems!<1||!Array.isArray(p.weights)||p.weights.length!==34||
   p.weights.some(x=>typeof x!=="number"||!Number.isFinite(x)))throw Error("Invalid FSRS optimizer profile");
 const e=p.evaluation;if(!e||typeof e!=="object"||!nonNegative(e.logLoss)||!nonNegative(e.rmseBins))
  throw Error("Invalid FSRS optimizer evaluation");
 const t=p.training,z=t?.timezone;
 if(!t||t.enableShortTerm!==true||t.enableSchedPenalties!==true||t.numRelearningSteps!==1||
   !Number.isSafeInteger(t.nextDayStartsAt)||t.nextDayStartsAt!<0||t.nextDayStartsAt!>23||
   !(typeof z==="string"&&z.length>0&&z.length<=120||typeof z==="number"&&Number.isFinite(z)&&z>=-1440&&z<=1440))
  throw Error("Invalid FSRS optimizer training metadata");
 return {schema:FSRS_OPTIMIZER_PROFILE_SCHEMA,model:"FSRS-7",bindingVersion:FSRS_OPTIMIZER_BINDING_VERSION,
  trainedAt:p.trainedAt,sourceSha256:p.sourceSha256,evidenceItems:p.evidenceItems!,weights:[...p.weights],
  evaluation:{logLoss:e.logLoss,rmseBins:e.rmseBins},
  training:{enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,nextDayStartsAt:t.nextDayStartsAt,timezone:z}};
}
export const serializeFsrsOptimizerProfile=(p:FsrsOptimizerProfile)=>
 JSON.stringify(validateFsrsOptimizerProfile(p),null,2)+"\n";
