#!/usr/bin/env node
/** P57-A/B headless compiler and deterministic QA (no API, browser or LLM). */
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {validateBlueprint,auditBlueprint} from "./content-blueprint.mjs";
import {auditQuestionQuality} from "./question-quality.mjs";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {isDraftExchange,inspectDraftExchange} from "../src/authoring/authoring-exchange.ts";
const [command,input,...rest]=process.argv.slice(2);
const compiling=command==="compile-bank";
const output=compiling?rest[0]:undefined;
const flags=compiling?rest.slice(1):rest;
const flagOk=flags.length<=20&&flags.length%2===0&&
 flags.every((v,i)=>i%2===1||v==="--against"||v==="--blueprint"||v==="--quality-review"||v==="--cognitive")&&
 flags.filter((v,i)=>i%2===0&&v==="--blueprint").length<=1&&
 flags.filter((v,i)=>i%2===0&&v==="--quality-review").length<=1&&
 flags.filter((v,i)=>i%2===0&&v==="--cognitive").length<=1;
if(!["validate-bank","compile-bank","qa-bank"].includes(command)||!input||!flagOk||
  (compiling&&!output)){
 process.stderr.write("Usage: node scripts/question-bank-cli.mjs validate-bank <source.json> [--against prior.json]...\n"+
  "       node scripts/question-bank-cli.mjs qa-bank <source.json> [--against prior.json]...\n"+
  "       node scripts/question-bank-cli.mjs compile-bank <source.json> <compiled.json> [--against prior.json]...\n"+
  "Both AI source v1 and the versioned Wordgard draft exchange are accepted; --against applies to source v1 only.\n"+
  "Optional --blueprint <plan.json> with --cognitive <tags.json> checks a scoped single-source or explicitly approved partial delivery; for multi-batch use content-blueprint.mjs audit.\n"+
  "Optional --quality-review <review.json> requires complete P60-C SHA-bound independent review records; no source fact authentication.\n");
 process.exitCode=2;
}else{
 try{
  const raw=await readFile(input,"utf8");
  if(Buffer.byteLength(raw,"utf8")>25*1024*1024)throw Error("Source JSON exceeds 25 MiB");
  const comparisonSources=[];let blueprintPath=null,qualityReviewPath=null,cognitivePath=null;
  for(let i=0;i<flags.length;i+=2){
   if(flags[i]==="--blueprint"){blueprintPath=flags[i+1];continue;}
   if(flags[i]==="--quality-review"){qualityReviewPath=flags[i+1];continue;}
   if(flags[i]==="--cognitive"){cognitivePath=flags[i+1];continue;}
   const contents=await readFile(flags[i+1],"utf8");
   if(Buffer.byteLength(contents,"utf8")>25*1024*1024)throw Error("Comparison JSON exceeds 25 MiB");
   comparisonSources.push(JSON.parse(contents));
  }
  const source=JSON.parse(raw);
  if(isDraftExchange(source)&&comparisonSources.length)
   throw Error("Draft exchanges do not accept --against; import the original AI source for cross-bank comparisons");
  const report=isDraftExchange(source)?
   inspectDraftExchange(source):inspectExternalQuestionBank(source,[],comparisonSources);
  const {compiled,...publicReport}=report;
  let qualityAudit=null;
  if(qualityReviewPath){
   if(isDraftExchange(source))
    throw Error("Quality-review guard applies to external practice-desk-authoring v1 source only");
   const reviewRaw=await readFile(qualityReviewPath,"utf8");
   if(Buffer.byteLength(reviewRaw,"utf8")>3*1024*1024)throw Error("Quality review exceeds 3 MiB");
   qualityAudit=auditQuestionQuality(source,raw,JSON.parse(reviewRaw));
  }
  let blueprintAudit=null;
  if(cognitivePath&&!blueprintPath)throw Error("--cognitive requires --blueprint");
  if(blueprintPath){
   if(isDraftExchange(source))
    throw Error("Blueprint guard supports original practice-desk-authoring v1; use content-blueprint.mjs audit for source batches");
   const rawPlan=await readFile(blueprintPath,"utf8");
   if(Buffer.byteLength(rawPlan,"utf8")>1024*1024)throw Error("Blueprint exceeds 1 MiB");
   const plan=validateBlueprint(JSON.parse(rawPlan));
   const digest=createHash("sha256").update(raw).digest("hex");
   let cognitiveTags;
   if(cognitivePath){
    const tagged=await readFile(cognitivePath,"utf8");
    if(Buffer.byteLength(tagged,"utf8")>1024*1024)throw Error("Cognitive tags exceed 1 MiB");
    cognitiveTags=JSON.parse(tagged);
   }
   blueprintAudit=auditBlueprint(plan,[{value:source,digest}],cognitiveTags,{priorSources:comparisonSources});
  }
  if(!report.valid||!compiled||blueprintAudit?.valid===false||qualityAudit?.readyForPublication===false){
   process.stdout.write(JSON.stringify({...publicReport,compiled:false,
    ...(blueprintAudit?{blueprint:{valid:blueprintAudit.valid,requestedCount:blueprintAudit.requestedCount,
      actualCount:blueprintAudit.actualCount,partialDelivery:blueprintAudit.partialDelivery,
       remainingCount:blueprintAudit.remainingCount,issues:blueprintAudit.issues,coverage:blueprintAudit.coverage}}:{}),
    ...(qualityAudit?{qualityReview:{readyForPublication:qualityAudit.readyForPublication,
      factualVerification:"not-performed",reviewAssurance:qualityAudit.reviewAssurance,
      issues:qualityAudit.issues,questionsMissingReview:qualityAudit.questionsMissingReview}}:{})},null,2)+"\n");
   process.exitCode=1;
  }else{
   if(compiling){
    // Atomic create-new in the same folder; no destructive overwrite of a prior output.
    await writeFile(output,JSON.stringify(compiled,null,2)+"\n",{flag:"wx"});
   }
   process.stdout.write(JSON.stringify({...publicReport,
    compiled:compiling,...(blueprintAudit?{blueprint:{valid:true,requestedCount:blueprintAudit.requestedCount,actualCount:blueprintAudit.actualCount,
      partialDelivery:blueprintAudit.partialDelivery,remainingCount:blueprintAudit.remainingCount,
      nearDuplicateCandidates:blueprintAudit.nearDuplicateCandidates}}:{}),
    ...(qualityAudit?{qualityReview:{readyForPublication:true,factualVerification:"not-performed",
      reviewAssurance:qualityAudit.reviewAssurance}}:{}),
    ...(output?{output}:{})},null,2)+"\n");
  }
 }catch(error){
  process.stderr.write(JSON.stringify({valid:false,code:"input-error",
   message:error instanceof Error?error.message:"Unknown input error"},null,2)+"\n");
  process.exitCode=1;
 }
}
