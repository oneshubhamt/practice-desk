import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {computeOptimalSteps} from "@open-spaced-repetition/binding";

const [input,output="practice-desk-fsrs-step-analysis.json",decayArg,retentionArg="0.9"]=process.argv.slice(2);
if(!input||decayArg===undefined){
 console.error("Usage: npm run analyze-steps -- <reviews.csv> [analysis.json] <surrogate-decay> [desired-retention]");
 console.error("Important: computeOptimalSteps is a single-decay heuristic and is not model-consistent with FSRS-7.");
 process.exit(2);
}
const surrogateDecay=Number(decayArg),desiredRetention=Number(retentionArg);
if(!Number.isFinite(surrogateDecay)||surrogateDecay<0.1||surrogateDecay>1)
 throw Error("surrogate-decay must be a finite number in [0.1, 1]");
if(!Number.isFinite(desiredRetention)||desiredRetention<=0||desiredRetention>=1)
 throw Error("desired-retention must be between 0 and 1");
const bytes=new Uint8Array(await readFile(input));
const sourceSha256=createHash("sha256").update(bytes).digest("hex");
const result=computeOptimalSteps(bytes,desiredRetention,surrogateDecay);
const report={
 schema:"practice-desk-fsrs-step-analysis/v1",
 compatibility:"single-decay-heuristic-not-fsrs-7",
 advisoryOnly:true,
 sourceSha256,
 desiredRetention,
 surrogateDecay,
 generatedAt:new Date().toISOString(),
 recommendedLearningStepsSeconds:result.recommendedLearningSteps,
 recommendedRelearningStepsSeconds:result.recommendedRelearningSteps,
 stats:{
   again:result.again??null,
   hard:result.hard??null,
   good:result.good??null,
   againThenGood:result.againThenGood??null,
   goodThenAgain:result.goodThenAgain??null,
   relearning:result.relearning??null
 }
};
await writeFile(output,JSON.stringify(report,null,2)+"\n","utf8");
console.warn("ADVISORY ONLY: upstream computeOptimalSteps uses a single-decay curve and does not support FSRS-7's dual-trace mixture curve.");
console.log("Step analysis written:",output);
