import {spawnSync} from "node:child_process";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {
 FSRSBinding,FSRSBindingItem,FSRSBindingReview,computeOptimalSteps,computeParameters,
 convertCsvToFsrsItemsWithCardIds
} from "@open-spaced-repetition/binding";
import {OPTIMIZER_FIXED_UTC_OFFSET_MINUTES,OPTIMIZER_ROLLOVER_HOUR,
 evaluateHoldoutGate,splitChronologicalHoldout} from "./optimizer-policy.mjs";

const item=new FSRSBindingItem([
 new FSRSBindingReview(3,0),
 new FSRSBindingReview(3,1/24),
 new FSRSBindingReview(4,1)
]);
const weights=await computeParameters([item],{
 modelVersion:"FSRS-7",enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,
 trainingConfig:{numEpochs:1,batchSize:32,seed:2023,maxSeqLen:256,learningRate:0.04,gamma:1e-4}
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
 rows.push(`${start+24*60*60*1000},card-${card},3,800,2`);
}
const csv=new TextEncoder().encode(rows.join("\n"));
const converted=convertCsvToFsrsItemsWithCardIds(
 csv,OPTIMIZER_ROLLOVER_HOUR,OPTIMIZER_FIXED_UTC_OFFSET_MINUTES,"FSRS-7"
);
assert.ok(converted.items.length>=120);
const stockMetrics=new FSRSBinding().evaluate(converted.items,converted.cardIds);
const personalizedMetrics=model.evaluate(converted.items,converted.cardIds);
assert.ok(Number.isFinite(stockMetrics.logLoss)&&Number.isFinite(stockMetrics.rmseBins));
assert.ok(Number.isFinite(personalizedMetrics.logLoss)&&Number.isFinite(personalizedMetrics.rmseBins));

const dstBefore=Date.parse("2026-03-07T12:00:00-05:00");
const dstAfter=Date.parse("2026-03-08T12:00:00-04:00");
const dstCsv=new TextEncoder().encode([
 "review_time,card_id,review_rating,review_duration,review_state",
 `${dstBefore},dst-card,3,1000,0`,
 `${dstAfter},dst-card,3,900,2`
].join("\n")+"\n");
const elapsed=convertCsvToFsrsItemsWithCardIds(dstCsv,0,0,"FSRS-7");
const zoned=convertCsvToFsrsItemsWithCardIds(dstCsv,0,"America/New_York","FSRS-7");
const elapsedDelta=elapsed.items[0].reviews[1].deltaT,zonedDelta=zoned.items[0].reviews[1].deltaT;
assert.ok(Math.abs(elapsedDelta-23/24)<1e-6,"Canonical optimizer chronology must preserve 23 elapsed hours");
assert.ok(Math.abs(zonedDelta-1)<1e-6,"IANA study-day conversion should expose the DST semantic difference");
assert.ok(Math.abs(elapsedDelta-zonedDelta)>0.04,"DST regression fixture must distinguish elapsed and zoned chronology");

const fakeItems=Array.from({length:384},(_,i)=>({i}));
const fakeIds=Array.from({length:384},(_,i)=>Math.floor(i/4));
const split=splitChronologicalHoldout(fakeItems,fakeIds);
assert.equal(split.trainCount,320);
assert.equal(split.holdoutCount,64);
assert.equal(split.holdoutCards,16);
assert.equal(evaluateHoldoutGate(
 {logLoss:0.4,rmseBins:0.08},{logLoss:0.39,rmseBins:0.08},split
).passed,true);
assert.equal(evaluateHoldoutGate(
 {logLoss:0.4,rmseBins:0.08},{logLoss:0.39,rmseBins:0.081},split
).passed,false);

const analysis=computeOptimalSteps(csv,0.9,0.5);
assert.ok(Array.isArray(analysis.recommendedLearningSteps));
assert.ok(Array.isArray(analysis.recommendedRelearningSteps));
assert.ok(analysis.good&&analysis.good.count>=100);

const temp=await mkdtemp(join(tmpdir(),"practice-desk-fsrs-"));
try{
 const csvPath=join(temp,"small.csv"),profilePath=join(temp,"profile.json");
 await writeFile(csvPath,rows.slice(0,4).join("\n")+"\n","utf8");
 await writeFile(profilePath,"sentinel","utf8");
 const cli=fileURLToPath(new URL("./optimize.mjs",import.meta.url));
 const invalid=spawnSync(process.execPath,[cli,csvPath],{encoding:"utf8"});
 assert.equal(invalid.status,2);
 assert.equal(await readFile(profilePath,"utf8"),"sentinel");
 const insufficient=spawnSync(process.execPath,[cli,csvPath,profilePath],{encoding:"utf8"});
 assert.notEqual(insufficient.status,0);
 let staleProfileExists=true;
 try{await readFile(profilePath,"utf8");}catch(error){staleProfileExists=error?.code!=="ENOENT";}
 assert.equal(staleProfileExists,false);
}finally{await rm(temp,{recursive:true,force:true});}

console.log("FSRS optimizer smoke passed: FSRS-7 training, direct evaluation, elapsed-24h DST regression, held-out activation policy, fail-closed output, and advisory step analysis.");
