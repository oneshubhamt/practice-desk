export const HOLDOUT_SEGMENTS=6;
export const MIN_TRAIN_ITEMS=64;
export const MIN_HOLDOUT_ITEMS=64;
export const MIN_HOLDOUT_CARDS=16;
export const HOLDOUT_STRATEGY="final-sixth";

const metric=(value,name)=>{
 if(!value||typeof value!=="object"||!Number.isFinite(value.logLoss)||value.logLoss<0||
   !Number.isFinite(value.rmseBins)||value.rmseBins<0)throw Error("Invalid "+name+" evaluation metrics");
 return {logLoss:value.logLoss,rmseBins:value.rmseBins};
};

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

export function evaluateHoldoutGate(defaultEvaluation,personalizedEvaluation,counts){
 const baseline=metric(defaultEvaluation,"default"),personalized=metric(personalizedEvaluation,"personalized");
 const reasons=[];
 if(!Number.isSafeInteger(counts.trainCount)||counts.trainCount<MIN_TRAIN_ITEMS)
  reasons.push("historical training prefix has fewer than "+MIN_TRAIN_ITEMS+" optimizer items");
 if(!Number.isSafeInteger(counts.holdoutCount)||counts.holdoutCount<MIN_HOLDOUT_ITEMS)
  reasons.push("later holdout has fewer than "+MIN_HOLDOUT_ITEMS+" optimizer items");
 if(!Number.isSafeInteger(counts.holdoutCards)||counts.holdoutCards<MIN_HOLDOUT_CARDS)
  reasons.push("later holdout spans fewer than "+MIN_HOLDOUT_CARDS+" cards");
 if(!(personalized.logLoss<baseline.logLoss))
  reasons.push("personalized holdout log loss does not improve on stock FSRS-7");
 if(personalized.rmseBins>baseline.rmseBins)
  reasons.push("personalized holdout RMSE bins regresses versus stock FSRS-7");
 return {passed:reasons.length===0,reasons,baseline,personalized};
}
