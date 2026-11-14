import {spawn} from "node:child_process";
import {appendFile,mkdir} from "node:fs/promises";
import {dirname} from "node:path";
import {performance} from "node:perf_hooks";
const args=process.argv.slice(2);
const label=args.shift();
if(!label||args.shift()!=="--"||!args.length)
 throw Error("Usage: node scripts/timed-run.mjs <label> -- <command> [args...]");
const [command,...commandArgs]=args;
const started=performance.now();
const child=spawn(command,commandArgs,{stdio:"inherit",env:process.env});
const outcome=await new Promise((resolve,reject)=>{
 child.once("error",reject);child.once("exit",(code,signal)=>resolve({code,signal}));
});
const elapsedMs=Math.round(performance.now()-started),ok=outcome.code===0&&!outcome.signal;
const record={schema:"practice-desk-qa-timing/v1",label,elapsedMs,status:ok?"pass":"fail",
 job:process.env.GITHUB_JOB??null,sha:process.env.GITHUB_SHA??null,
 command:[command,...commandArgs].join(" ")};
console.log("QA_TIMING "+JSON.stringify(record));
if(process.env.QA_TIMING_FILE){
 await mkdir(dirname(process.env.QA_TIMING_FILE),{recursive:true});
 await appendFile(process.env.QA_TIMING_FILE,JSON.stringify(record)+"\n");
}
if(process.env.GITHUB_STEP_SUMMARY)
 await appendFile(process.env.GITHUB_STEP_SUMMARY,
  "- **"+label+"**: "+(elapsedMs/1000).toFixed(2)+" s — "+record.status+"\n");
if(!ok)process.exitCode=outcome.code??1;
