#!/usr/bin/env node
/** P60-F: matched-task evidence, not a claim of measured LLM tokens, factual research
 * or performance across hardware. Both paths use the EXACT same fixture and review.
 * Reviewer records are synthetic. Independent arithmetic/table oracles are separate.
 */
import {readFile,writeFile,mkdtemp,rm} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {performance} from "node:perf_hooks";
import {createHash} from "node:crypto";
import {QUALITY_CHECKLIST} from "./question-quality.mjs";
const scripts=Object.fromEntries(["question-bank-agent.mjs","question-quality.mjs",
 "question-bank-cli.mjs","agent-handoff.mjs"].map(n=>[n,fileURLToPath(new URL("./"+n,import.meta.url))]));
const sha=s=>createHash("sha256").update(s).digest("hex");
function call(script,args){
 const start=performance.now();
 const r=spawnSync(process.execPath,[scripts[script],...args],{
  encoding:"utf8",timeout:45000,maxBuffer:3*1024*1024});
 const elapsedMs=performance.now()-start;
 if(r.error)throw r.error;
 let data;
 try{data=JSON.parse(r.stdout||r.stderr);}catch{throw Error("Non-JSON child output from "+script);}
 return {ok:r.status===0,data,bytes:Buffer.byteLength(r.stdout||r.stderr),elapsedMs};
}
const median=x=>[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)];
function reviewFor(source,raw,packet){
 const questions=new Map(source.questions.map(q=>[q.id,q]));
 return {format:"practice-desk-quality-review",version:1,
  bankId:source.bankId,sourceSha256:packet.sourceSha256,
  records:packet.items.map(item=>{
   const q=questions.get(item.questionId);
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:item.candidateSha256,reviewer:{id:"synthetic-benchmark-claim",kind:"ai"},
    independentSolution:{blindClaim:true,answer:Array.isArray(q.answer)?String(q.answer[0]):String(q.answer),
     reasoning:"Synthetic review assertion for measuring workflow, not genuine blinded verification."},
    checks:QUALITY_CHECKLIST.map((x,i)=>({id:x.id,status:"pass",
     basis:[11,12,13].includes(i)?"source-consulted":i===19?"rendered-claim":"independent-editorial",
     rationale:"Synthetic attributed assertion; external source not fetched or checked."})),
    evidence:[{publisher:"Synthetic fixture",title:"Not a real source",locator:"question:"+q.id,
     retrievedAt:"2026-11-06",excerpt:"Only measured workflow; not real evidence."}]
   };
  })};
}
// Independent limited fixture oracles: intentionally separate from authored keys.
// Only simple arithmetic and a stipulated seven-day/letter ordinal are checked.
function oracle(source,kind){
 if(kind==="apfc"){
  const q=Object.fromEntries(source.questions.map(x=>[x.id,x]));
  const expected={
   "labour-01":String.fromCharCode("A".charCodeAt(0)+1),
   "economy-01":"C",
   "account-01":String.fromCharCode(65+q["account-01"].options.indexOf(String(2+2)))};
  const actual=source.questions.map(x=>({id:x.id,match:x.answer===expected[x.id]}));
  return {checked:actual.length,correct:actual.filter(x=>x.match).length,
   oracleType:"limited independent illustrative ordinal/week/arithmetic oracle"};
 }
 const table=source.stimuli.find(x=>x.id==="dilr-one");
 const total=table.rows.reduce((sum,row)=>sum+Number(row[1]),0);
 const numeric=source.questions.find(x=>x.id==="dilr-1");
 const even=source.questions.find(x=>x.id==="qa-1");
 const expected=even.options.map((s,i)=>Number(s)%2===0?String.fromCharCode(65+i):null).filter(Boolean).join(",");
 return {checked:2,correct:Number(numeric.answer[0]===total)+Number(even.answer===expected),
  oracleType:"independent synthetic DILR table sum and parity only; RC semantic answer not checked"};
}
async function measure(){
 const dir=await mkdtemp(join(tmpdir(),"pd-p60f-measure-"));
 const result=[];
 try{
  for(const type of ["apfc","cat"]){
   const source=JSON.parse(await readFile(new URL("../examples/ai-first-"+type+".json",import.meta.url),"utf8"));
   const sourceRaw=JSON.stringify(source),sourcePath=join(dir,type+"-bank.json");
   await writeFile(sourcePath,sourceRaw);
   const packet=call("question-quality.mjs",["candidate",sourcePath,"--limit","10"]);
   if(!packet.ok)throw Error("Synthetic blind packet failed for "+type);
   const review=reviewFor(source,sourceRaw,packet.data);
   const reviewPath=join(dir,type+"-review.json");
   await writeFile(reviewPath,JSON.stringify(review));
   const samples=[];
   for(let n=0;n<3;n++){
    const baseline=[
     call("question-bank-agent.mjs",["inspect",sourcePath]),
     call("question-quality.mjs",["audit",sourcePath,"--review",reviewPath]),
     call("question-bank-cli.mjs",["validate-bank",sourcePath,"--quality-review",reviewPath])
    ];
    const integrated=call("agent-handoff.mjs",["assess","single",sourcePath,
     "--quality-review",reviewPath]);
    if(!baseline.every(x=>x.ok)||!integrated.ok||!integrated.data.readyForPublication)
     throw Error("Matched source audit failed for "+type);
    samples.push({
     baselineElapsedMs:baseline.reduce((sum,x)=>sum+x.elapsedMs,0),
     integratedElapsedMs:integrated.elapsedMs,
     baselineVisibleBytes:baseline.reduce((sum,x)=>sum+x.bytes,0),
     integratedVisibleBytes:integrated.bytes});
   }
   const measured={
    fixture:type,sourceSha256:sha(sourceRaw),questions:source.questions.length,
    callerInvocations:{baseline:3,integrated:1},
    medianWallMs:{baseline:Math.round(median(samples.map(x=>x.baselineElapsedMs))),
     integrated:Math.round(median(samples.map(x=>x.integratedElapsedMs)))},
    medianAgentVisibleJsonBytes:{baseline:median(samples.map(x=>x.baselineVisibleBytes)),
     integrated:median(samples.map(x=>x.integratedVisibleBytes))},
    sourceEvidence:{primaryDocumentFetches:0,sourceClaims:"synthetic-unverified",
     reviewerIndependentIdentityAuthenticated:false},
    sourceAnswerOracle:oracle(source,type),qaGateValid:true,sourceCoverage:"all fixture questions",
    manualCorrectionWorkload:"not-measured",modelTokens:"not-measured",
    actualHumanAccuracy:"not-measured",endUserStudyQuality:"not-measured"
   };
   result.push(measured);
  }
  const apfc=JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
  const miskey=structuredClone(apfc);miskey.questions[0].answer="A";
  const negative=oracle(miskey,"apfc");
  const output={format:"practice-desk-agent-handoff-benchmark",version:1,
   measuredOn:"local Node CLI child processes",sampleRunsPerFixture:3,
   tests:result,adversarialIndependentOracle:{
    name:"Intentionally wrong second-letter answer",checked:negative.checked,
    correct:negative.correct,defectDetected:negative.correct<negative.checked,
    note:"Independent elementary oracle catches a false key that a self-attested editorial reviewer might incorrectly approve."},
   comparisonBasis:"Same input and identical synthetic review record; P59 inspect + P60-C audit + P57 validate versus P60-F assess.",
   interpretation:"Only caller invocations, wall-clock on these runners, emitted JSON bytes and elementary synthetic answer oracles are measured. No LLM token, cognitive quality, authentic PYQ, human reviewer, current-law, actual screen UX or source-research correctness has been independently measured.",
   factualVerification:"not-performed",externalSourceFetches:0,agentDeviceBridge:false};
  process.stdout.write(JSON.stringify(output,null,2)+"\n");
 }finally{await rm(dir,{recursive:true,force:true});}
}
try{await measure()}catch(e){
 process.stderr.write(JSON.stringify({valid:false,code:"benchmark-failed",message:e.message},null,2)+"\n");
 process.exitCode=1;
}
