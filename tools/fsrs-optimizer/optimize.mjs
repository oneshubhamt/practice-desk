import {createHash} from "node:crypto";
import {readFile,rename,rm,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {
 FSRSBinding,computeParameters,convertCsvToFsrsItemsWithCardIds,evaluateWithTimeSeriesSplits
} from "@open-spaced-repetition/binding";
import {
 OptimizerPipelineRejectedError,runFsrsOptimizerPipeline
} from "./optimizer-pipeline.mjs";

const args=process.argv.slice(2);
const [input,output,...flagArgs]=args;
if(!input||!output){
 console.error("Usage: npm run optimize -- <reviews.csv> <profile.json> [--max-seconds=N] [--poll-ms=N]");
 console.error("FSRS-7 conversion is explicitly fixed to elapsed 24-hour days, matching Practice Desk dateChrono runtime scheduling.");
 process.exit(2);
}
const inputPath=resolve(input),outputPath=resolve(output),temporaryOutput=outputPath+".tmp";
if(inputPath===outputPath||inputPath===temporaryOutput)
 throw Error("Input CSV and output profile must use different paths");

let maxSeconds=0,pollMs=250;
for(const arg of flagArgs){
 const [name,raw]=arg.split("=",2);
 if(name==="--max-seconds"){
  maxSeconds=Number(raw);
  if(!Number.isFinite(maxSeconds)||maxSeconds<0)
   throw Error("--max-seconds must be a non-negative number");
 }else if(name==="--poll-ms"){
  pollMs=Number(raw);
  if(!Number.isSafeInteger(pollMs)||pollMs<50||pollMs>5000)
   throw Error("--poll-ms must be an integer from 50 to 5000");
 }else throw Error("Unknown optimizer option: "+arg);
}
await rm(outputPath,{force:true});
await rm(temporaryOutput,{force:true});

let abortRequested=false;
const deadline=maxSeconds>0?Date.now()+maxSeconds*1000:Number.POSITIVE_INFINITY;
process.on("SIGINT",()=>{
 abortRequested=true;
 console.error("\nOptimizer interruption requested; stopping at the next progress checkpoint.");
});
const progressFor=stage=>{
 let lastPercent=-5,lastPrinted=0;
 return (current,total)=>{
  const now=Date.now();
  if(abortRequested||now>=deadline)return false;
  const percent=total>0?Math.floor(current*100/total):0;
  if(percent>=lastPercent+5||now-lastPrinted>=2000||current===total){
   console.error(stage+": "+current+"/"+total+(total>0?" ("+percent+"%)":""));
   lastPercent=percent;lastPrinted=now;
  }
  return true;
 };
};
const checkpoint=()=>{
 if(abortRequested||Date.now()>=deadline)throw Error("Optimizer interrupted before completion");
};

const bytes=new Uint8Array(await readFile(inputPath));
const sourceSha256=createHash("sha256").update(bytes).digest("hex");
const binding={
 FSRSBinding,computeParameters,convertCsvToFsrsItemsWithCardIds,evaluateWithTimeSeriesSplits
};
let profile;
try{
 profile=await runFsrsOptimizerPipeline({
  binding,bytes,sourceSha256,
  makeOptions:(cardIds,stage)=>({cardIds,timeout:pollMs,progress:progressFor(stage)}),
  checkpoint
 });
}catch(error){
 if(error instanceof OptimizerPipelineRejectedError){
  const prefix=error.kind==="evidence"?
   "Insufficient evidence for personalized activation: ":
   "Personalized FSRS-7 activation gate failed: ";
  throw Error(prefix+error.reasons.join("; "));
 }
 throw error;
}

await writeFile(temporaryOutput,JSON.stringify(profile,null,2)+"\n","utf8");
await rename(temporaryOutput,outputPath);
console.log("FSRS-7 profile written:",outputPath);
console.log("optimizer chronology:",profile.training.chronology);
console.log("optimizer items:",profile.evidenceItems);
console.log("holdout log loss: stock",profile.evaluation.holdout.default.logLoss,
 "personalized",profile.evaluation.holdout.personalized.logLoss);
console.log("holdout RMSE bins: stock",profile.evaluation.holdout.default.rmseBins,
 "personalized",profile.evaluation.holdout.personalized.rmseBins);
console.log("time-series log loss:",profile.evaluation.crossValidation.logLoss);
console.log("time-series RMSE bins:",profile.evaluation.crossValidation.rmseBins);
