import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {computeParameters,convertCsvToFsrsItemsWithCardIds,evaluateWithTimeSeriesSplits} from "@open-spaced-repetition/binding";
const [input,output="practice-desk-fsrs-profile.json",timezoneArg="UTC",rolloverArg="4"]=process.argv.slice(2);
if(!input){console.error("Usage: npm run optimize -- <reviews.csv> [profile.json] [timezone-or-offset] [next-day-hour]");process.exit(2);}
const nextDayStartsAt=Number(rolloverArg);
if(!Number.isSafeInteger(nextDayStartsAt)||nextDayStartsAt<0||nextDayStartsAt>23)throw Error("next-day-hour must be 0..23");
const n=Number(timezoneArg),timezone=timezoneArg.trim()!==""&&Number.isFinite(n)?n:timezoneArg;
const bytes=new Uint8Array(await readFile(input)),sourceSha256=createHash("sha256").update(bytes).digest("hex");
const {items,cardIds}=await Promise.resolve(convertCsvToFsrsItemsWithCardIds(bytes,nextDayStartsAt,timezone,"FSRS-7"));
if(items.length<1)throw Error("Review evidence did not produce any FSRS-7 training items");
const options={modelVersion:"FSRS-7",enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,cardIds};
const weights=await computeParameters(items,options);
if(weights.length!==34||weights.some(v=>!Number.isFinite(v)))throw Error("Optimizer did not return 34 finite FSRS-7 weights");
const evaluation=await evaluateWithTimeSeriesSplits(items,options);
if(!Number.isFinite(evaluation.logLoss)||!Number.isFinite(evaluation.rmseBins))throw Error("Optimizer evaluation failed");
const profile={schema:"practice-desk-fsrs-profile/v1",model:"FSRS-7",bindingVersion:"0.6.0",trainedAt:new Date().toISOString(),
 sourceSha256,evidenceItems:items.length,weights,evaluation:{logLoss:evaluation.logLoss,rmseBins:evaluation.rmseBins},
 training:{enableShortTerm:true,enableSchedPenalties:true,numRelearningSteps:1,nextDayStartsAt,timezone}};
await writeFile(output,JSON.stringify(profile,null,2)+"\n","utf8");
console.log("FSRS-7 profile written:",output);console.log("training items:",items.length);
console.log("time-series log loss:",evaluation.logLoss);console.log("time-series RMSE bins:",evaluation.rmseBins);
