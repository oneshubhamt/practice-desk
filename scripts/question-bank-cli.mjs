#!/usr/bin/env node
/** P57-A headless deterministic local authoring compiler (no API, browser or LLM). */
import {readFile,writeFile} from "node:fs/promises";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
const [command,input,output,...extra]=process.argv.slice(2);
if(!["validate-bank","compile-bank"].includes(command)||!input||extra.length||
  (command==="compile-bank"&&!output)||(command==="validate-bank"&&output)){
 process.stderr.write("Usage: node scripts/question-bank-cli.mjs validate-bank <source.json>\n"+
  "   or: node scripts/question-bank-cli.mjs compile-bank <source.json> <compiled.json>\n");
 process.exitCode=2;
}else{
 try{
  const raw=await readFile(input,"utf8");
  if(Buffer.byteLength(raw,"utf8")>25*1024*1024)throw Error("Source JSON exceeds 25 MiB");
  const report=inspectExternalQuestionBank(JSON.parse(raw));
  const {compiled,...publicReport}=report;
  if(!report.valid||!compiled){
   process.stdout.write(JSON.stringify({...publicReport,compiled:false},null,2)+"\n");
   process.exitCode=1;
  }else{
   if(command==="compile-bank"){
    // Atomic create-new in the same folder; no destructive overwrite of a prior output.
    await writeFile(output,JSON.stringify(compiled,null,2)+"\n",{flag:"wx"});
   }
   process.stdout.write(JSON.stringify({...publicReport,
    compiled:command==="compile-bank",...(output?{output}:{})},null,2)+"\n");
  }
 }catch(error){
  process.stderr.write(JSON.stringify({valid:false,code:"input-error",
   message:error instanceof Error?error.message:"Unknown input error"},null,2)+"\n");
  process.exitCode=1;
 }
}
