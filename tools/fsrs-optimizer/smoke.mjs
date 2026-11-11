import assert from "node:assert/strict";
import {
 FSRSBinding,FSRSBindingItem,FSRSBindingReview,computeOptimalSteps,computeParameters
} from "@open-spaced-repetition/binding";

const item=new FSRSBindingItem([
 new FSRSBindingReview(3,0),
 new FSRSBindingReview(3,1/24),
 new FSRSBindingReview(4,1)
]);
const weights=await computeParameters([item],{
 modelVersion:"FSRS-7",
 enableShortTerm:true,
 enableSchedPenalties:true,
 numRelearningSteps:1,
 trainingConfig:{
   numEpochs:1,batchSize:32,seed:2023,maxSeqLen:256,learningRate:0.04,gamma:1e-4
 }
});
assert.equal(weights.length,34);
assert.ok(weights.every(Number.isFinite));
const model=new FSRSBinding(weights);
const next=model.nextStates(null,0.9,0);
assert.ok(next.good.memory.stability>0);
assert.ok(next.good.memory.stabilityFast>0);

const rows=["review_time,card_id,review_rating,review_duration,review_state"];
for(let card=0;card<120;card++){
 const start=1704067200000+card*1000;
 rows.push(`${start},card-${card},3,1000,0`);
 rows.push(`${start+10*60*1000},card-${card},3,900,1`);
}
const analysis=computeOptimalSteps(new TextEncoder().encode(rows.join("\n")),0.9,0.5);
assert.ok(Array.isArray(analysis.recommendedLearningSteps));
assert.ok(Array.isArray(analysis.recommendedRelearningSteps));
assert.ok(analysis.good&&analysis.good.count>=100);
console.log("FSRS optimizer binding smoke passed: 34-weight FSRS-7 training + advisory step analysis runtime loaded.");
