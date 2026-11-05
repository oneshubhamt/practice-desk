#!/usr/bin/env node
/** P57-A/B headless compiler and deterministic QA (no API, browser or LLM). */
import {readFile,writeFile} from "node:fs/promises";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {isDraftExchange,inspectDraftExchange} from "../src/authoring/authoring-exchange.ts";
const [command,input,...rest]=process.argv.slice(2);
const compiling=command==="compile-bank";
const output=compiling?rest[0]:undefined;
const flags=compiling?rest.slice(1):rest;
const flagOk=flags.length<=16&&flags.length%2===0&&
 flags.every((v,i)=>i%2===1||v==="--against");
if(!["validate-bank","compile-bank","qa-bank"].includes(command)||!input||!flagOk||
  (compiling&&!output)){
 process.stderr.write("Usage: node scripts/question-bank-cli.mjs validate-bank <source.json> [--against prior.json]...\n"+
  "       node scripts/question-bank-cli.mjs qa-bank <source.json> [--against prior.json]...\n"+
  "       node scripts/question-bank-cli.mjs compile-bank <source.json> <compiled.json> [--against prior.json]...\n"+
  "Both AI source v1 and the versioned Wordgard draft exchange are accepted; --against applies to source v1 only.\n");
 process.exitCode=2;
}else{
 try{
  const raw=await readFile(input,"utf8");
  if(Buffer.byteLength(raw,"utf8")>25*1024*1024)throw Error("Source JSON exceeds 25 MiB");
  const comparisonSources=[];
  for(let i=1;i<flags.length;i+=2){
   const contents=await readFile(flags[i],"utf8");
   if(Buffer.byteLength(contents,"utf8")>25*1024*1024)throw Error("Comparison JSON exceeds 25 MiB");
   comparisonSources.push(JSON.parse(contents));
  }
  const source=JSON.parse(raw);
  if(isDraftExchange(source)&&comparisonSources.length)
   throw Error("Draft exchanges do not accept --against; import the original AI source for cross-bank comparisons");
  const report=isDraftExchange(source)?
   inspectDraftExchange(source):inspectExternalQuestionBank(source,[],comparisonSources);
  const {compiled,...publicReport}=report;
  if(!report.valid||!compiled){
   process.stdout.write(JSON.stringify({...publicReport,compiled:false},null,2)+"\n");
   process.exitCode=1;
  }else{
   if(compiling){
    // Atomic create-new in the same folder; no destructive overwrite of a prior output.
    await writeFile(output,JSON.stringify(compiled,null,2)+"\n",{flag:"wx"});
   }
   process.stdout.write(JSON.stringify({...publicReport,
    compiled:compiling,...(output?{output}:{})},null,2)+"\n");
  }
 }catch(error){
  process.stderr.write(JSON.stringify({valid:false,code:"input-error",
   message:error instanceof Error?error.message:"Unknown input error"},null,2)+"\n");
  process.exitCode=1;
 }
}
