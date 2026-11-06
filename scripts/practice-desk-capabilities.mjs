#!/usr/bin/env node
/** P60-A: bounded, source-backed read-only capability discovery.
 * No LLM, browser, network, history, persistence or content publication access.
 * Every result describes current supported functionality and honest limits.
 */
import {readFile} from "node:fs/promises";

const contractUrl=new URL("../docs/contracts/practice-desk-capabilities.v1.json",import.meta.url);
const emit=value=>process.stdout.write(JSON.stringify(value,null,2)+"\n");
const error=(message)=>{
 process.stderr.write(JSON.stringify({valid:false,code:"unsupported-capability-request",message},null,2)+"\n");
 process.exitCode=2;
};
const [command,...args]=process.argv.slice(2);
if(!["summary","list","show","operations"].includes(command)||
   (command==="show"?args.length!==1:args.length!==0)){
 error("Usage: practice-desk-capabilities.mjs summary | list | show <capability-id> | operations");
}else{
 try{
  const data=JSON.parse(await readFile(contractUrl,"utf8"));
  if(data.format!=="practice-desk-agent-capabilities"||data.version!==1||
    !Array.isArray(data.capabilities)||!Array.isArray(data.existingAgentOperations))
   throw Error("Capability contract has an unsupported format/version");
  if(command==="summary"){
   emit({format:"practice-desk-capability-summary",version:1,
    product:{name:data.product.name,runtime:data.product.runtime,
     embeddedLLM:data.product.embeddedLLM,automaticCloudSync:data.product.automaticCloudSync,
     agentDeviceBridge:data.product.agentDeviceBridge},
    capabilityCount:data.capabilities.length,
    ids:data.capabilities.map(c=>c.id),
    guide:data.discovery.appGuide,quickstart:data.discovery.lowContextEntry,
    programme:data.discovery.programme,
    warning:"Current capabilities only; planned programme: "+(data.plannedProgramme.length?
      data.plannedProgramme.map(x=>x.id).join(", "):"no unimplemented P60 stages declared")+
     ". Factual/PYQ authentication and direct device access are not provided."});
  }else if(command==="list"){
   emit({format:"practice-desk-capability-list",version:1,
    capabilities:data.capabilities.map(c=>({id:c.id,status:c.status,summary:c.summary})),
    note:"Use show <id> for exactly one bounded capability; use operations for available real CLI actions."});
  }else if(command==="operations"){
   emit({format:"practice-desk-capability-operations",version:1,
    operations:data.existingAgentOperations,
    note:"These are external Node CLI operations, NOT a remote API into the user's offline app."});
  }else{
   const cap=data.capabilities.find(c=>c.id===args[0]);
   if(!cap)error("Unknown capability: "+String(args[0]));
   else emit({format:"practice-desk-capability",version:1,capability:cap,
    note:"Read-only catalogue entry, not execution permission; source paths are human audit references."});
  }
 }catch(e){
  error("Capability discovery failed: "+(e instanceof Error?e.message:"unknown error"));
 }
}
