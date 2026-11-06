#!/usr/bin/env node
/** P60-F: one small agent-facing handoff to existing P57–P60-E source/quality/edition
 * contracts. No browser/device access, LLM, source research or alternate compiler.
 * Never infer source authentication or reviewer independence from self-attestation.
 */
import {spawnSync} from "node:child_process";
import {readFile,readdir,stat,access,mkdtemp,rm,link,rename,mkdir,rmdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";

const FORMAT="practice-desk-agent-handoff", VERSION=1,MAX_BUFFER=6*1024*1024;
const MODES={single:{inputs:1},paired:{inputs:3},pdf:{inputs:5}};
const COMMANDS=Object.freeze([
 {name:"prepare",privilege:"create-only-with-explicit-consent",description:"Create a complete candidate-blind review packet and exact fillable review-v1 template for an entire bank; no key/media in output"},
 {name:"assess",privilege:"read-only",description:"Evaluate existing independent-review, source/edition and optional coverage contracts; no answers or full media returned"},
 {name:"publish",privilege:"create-only-with-explicit-consent",description:"Requires --allow-create, an independently recorded current quality review and canonical signed source publication; no browser/device import"}
]);
const sha=data=>createHash("sha256").update(data).digest("hex");
const emit=x=>process.stdout.write(JSON.stringify(x,null,2)+"\n");
const fail=(code,message,status=2)=>{
 process.stderr.write(JSON.stringify({format:FORMAT,version:VERSION,
   valid:false,readyForPublication:false,code,message,
   factualVerification:"not-performed",externalAuthenticatedReview:false},null,2)+"\n");
 process.exitCode=status;
};
const failure=(code,status=1)=>{
 fail(code,"The requested operation failed closed. Use a scoped canonical audit to inspect the failure; no factual certification is implied.",status);
};
const FILE_LIMIT=100*1024*1024;
const inputHash=async path=>{
 const s=await stat(path);
 if(!s.isFile()||s.size>FILE_LIMIT)throw Error("Input must be a readable local file within 100 MiB");
 return sha(await readFile(path));
};
function options(argv){
 if(argv.length<2)throw Error("Expected assess|publish <single|paired|pdf> and mode inputs");
 const [action,mode,...rest]=argv;
 if(!["assess","publish"].includes(action)||!Object.hasOwn(MODES,mode))
  throw Error("Unsupported handoff action or mode");
 const required=MODES[mode].inputs+(action==="publish"?1:0);
 if(rest.length<required)throw Error("Missing positional source or output file");
 const inputs=rest.slice(0,MODES[mode].inputs);
 const output=action==="publish"?rest[MODES[mode].inputs]:null;
 const args=rest.slice(required),flags={};
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(key==="--allow-create"){
   if(Object.hasOwn(flags,key))throw Error("Duplicate permission flag");
   flags[key]=true;continue;
  }
  if(!["--quality-review","--blueprint","--key-document","--cognitive","--against"].includes(key)||
      i+1===args.length||Object.hasOwn(flags,key))throw Error("Invalid or duplicate flag "+String(key));
  flags[key]=args[++i];
 }
 if(!flags["--quality-review"])throw Error("Independent source-bound P60-C review file is mandatory");
 if(action==="publish"&&!flags["--allow-create"])throw Error("Explicit --allow-create required for new-file publication");
 if(action==="assess"&&flags["--allow-create"])throw Error("Read-only assessment cannot request publication privilege");
 if(mode!=="pdf"&&flags["--key-document"])throw Error("Separate key document is only for PDF ingestion mode");
 if(flags["--cognitive"]&&!flags["--blueprint"])throw Error("--cognitive requires --blueprint");
 if(flags["--against"]&&mode!=="single"&&!flags["--blueprint"])
  throw Error("--against requires --blueprint for paired/PDF modes; without coverage it would be ignored");
 return {action,mode,inputs,output,flags};
}
function cleanIssues(result){
 const rows=[];
 const capture=(x)=>{
  if(Array.isArray(x)){rows.push(...x);return;}
  if(x&&typeof x==="object"&&Array.isArray(x.items))rows.push(...x.items);
 };
 capture(result.issues);
 capture(result.qualityReview?.issues);
 capture(result.blueprint?.issues);
 const compact=rows.slice(0,12).map(x=>{
  const safe=s=>typeof s==="string"?s.replace(/[^A-Za-z0-9_.:/\-\[\]]/g,"").slice(0,100):"";
  return {code:safe(x.code)||"review-issue",severity:safe(x.severity)||"error",
   ...(x.path?{path:safe(x.path)}:{})};
 });
 const total=Math.max(rows.length,typeof result.issues?.total==="number"?result.issues.total:0,
   typeof result.qualityReview?.issues?.total==="number"?result.qualityReview.issues.total:0);
 return {total,shown:compact.length,remaining:Math.max(0,total-compact.length),items:compact};
}
function invoke(script,args){
 const program=fileURLToPath(new URL("./"+script,import.meta.url));
 const result=spawnSync(process.execPath,[program,...args],{
  encoding:"utf8",timeout:90000,maxBuffer:MAX_BUFFER});
 if(result.error)return {ok:false,body:{valid:false,code:"downstream-execution-error"}};
 let body;
 try{body=JSON.parse(result.stdout||result.stderr);}
 catch{return {ok:false,body:{valid:false,code:"downstream-output-invalid"}};}
 return {ok:result.status===0,body};
}
function planArgs(flags){return [...(flags["--blueprint"]?["--blueprint",flags["--blueprint"]]:[]),
 ...(flags["--cognitive"]?["--cognitive",flags["--cognitive"]]:[]),
 ...(flags["--against"]?["--against",flags["--against"]]:[])];}
function qualityArgs(flags){return ["--quality-review",flags["--quality-review"]];}
function auditCall(task){
 const {mode,inputs,flags}=task;
 if(mode==="single"){
  return invoke("question-bank-cli.mjs",["validate-bank",inputs[0],
    ...qualityArgs(flags),...planArgs(flags)]);
 }
 if(mode==="paired"){
  return invoke("editorial-editions.mjs",["audit",...inputs,
    ...qualityArgs(flags)]);
 }
 return invoke("pdf-ingest.mjs",["audit",...inputs.slice(0,3),
  ...(flags["--key-document"]?["--key-document",flags["--key-document"]]:[]),
  "--reviewed",inputs[3],"--decisions",inputs[4],...qualityArgs(flags),...planArgs(flags)]);
}
function coverageCheck(task){
 if(task.mode!=="paired"||!task.flags["--blueprint"])return null;
 return invoke("content-blueprint.mjs",["audit",task.flags["--blueprint"],task.inputs[1],
  ...(task.flags["--cognitive"]?["--cognitive",task.flags["--cognitive"]]:[]),
  ...(task.flags["--against"]?["--against",task.flags["--against"]]:[])]);
}
function publicationCall(task){
 const {mode,inputs,flags,output}=task;
 if(mode==="single"){
  return invoke("question-bank-cli.mjs",["compile-bank",inputs[0],output,
    ...qualityArgs(flags),...planArgs(flags)]);
 }
 if(mode==="paired"){
  return invoke("editorial-editions.mjs",["compile",...inputs,output,...qualityArgs(flags)]);
 }
 return invoke("pdf-ingest.mjs",["compile",...inputs.slice(0,3),
  ...inputs.slice(3),output,...qualityArgs(flags),
  ...(flags["--key-document"]?["--key-document",flags["--key-document"]]:[]),
  ...planArgs(flags)]);
}
function report(task,primary,coverage,inputsSha){
 const {action,mode}=task;
 const p=primary.body,c=coverage?.body;
 const supported=primary.ok&&p.valid!==false&&
  (mode==="single"?p.qualityReview?.readyForPublication===true:
    mode==="paired"?p.readyForPublication===true:p.readyForPublication===true);
 const ready=supported&&(!coverage||coverage.ok&&c.valid===true);
 const issues=cleanIssues(p);
 if(coverage&&!coverage.ok){
  const extra=cleanIssues(c);issues.total+=Math.max(1,extra.total);
  issues.remaining=Math.max(0,issues.total-issues.items.length);
  issues.items.push(...extra.items.slice(0,Math.max(0,12-issues.items.length)));
  issues.shown=issues.items.length;
 }
 if(!ready&&!issues.total){
  issues.total=1;issues.shown=1;
  issues.items=[{code:String(!primary.ok?(p.code||"canonical-guard-rejected"):
     "review-or-coverage-incomplete").slice(0,70).replace(/[^a-z0-9-]/gi,""),severity:"error"}];
 }
 const comparison=p.sourceKeyComparison??null;
 return {format:FORMAT,version:VERSION,
  mode,stage:action==="assess"?"assess":"prepublish",
  valid:ready,readyForPublication:ready,
  inputSha256:inputsSha,
  ...(mode==="single"?{bankId:p.bankId??null,questionCount:p.questionCount??null}:{
   sourceKeyComparison:comparison&&typeof comparison==="object"?{
    total:comparison.total??null,comparable:comparison.comparable??null,
    unavailable:comparison.unavailable??null}:null}),
  reviewAssurance:p.reviewAssurance??p.qualityReview?.reviewAssurance??"not-performed",
  coverageValid:coverage?c.valid===true:mode==="pdf"?p.coverageValid??null:null,
  partialDelivery:mode==="single"?p.blueprint?.partialDelivery??null:
   mode==="paired"?c?.partialDelivery??null:p.coveragePartial??null,
  remainingCount:mode==="single"?p.blueprint?.remainingCount??null:
   mode==="paired"?c?.remainingCount??null:p.coverageRemaining??null,
  factualVerification:"not-performed",externalAuthenticatedReview:false,externalSourceFetches:0,
  appAccess:"none",userImport:"explicit-offline-library",
  permissions:{operation:action==="assess"?"read-only":"create-new-files-only",
   explicitCreateConsent:action==="publish"&&task.flags["--allow-create"]===true},
  issues,
  note:"Passing software gates verify format/freshness/recorded review only; NOT factual, historical, PDF-visual or independent-review authenticity."};
}
async function perform(task){
 const allInput=[...task.inputs,task.flags["--quality-review"],
   task.flags["--blueprint"],task.flags["--key-document"],task.flags["--cognitive"],
   task.flags["--against"]].filter(Boolean);
 const digests=await Promise.all(allInput.map(inputHash));
 if(task.action==="publish"){
  try{await access(task.output);return failure("output-already-exists");}
  catch(e){if(e?.code!=="ENOENT")throw e;}
 }
 const primary=auditCall(task);
 const coverage=coverageCheck(task);
 const base=report(task,primary,coverage,digests);
 if(!base.readyForPublication){emit(base);process.exitCode=1;return;}
 if(task.action==="assess"){emit(base);return;}
 if((await Promise.all(allInput.map(inputHash))).some((v,i)=>v!==digests[i]))
  return failure("stale-input-before-publication");
 // Downstream compilers write only into a hidden, exclusive staging directory.
 // Any stale input detected after compilation leaves no published output behind.
 const target=resolve(task.output);
 const staging=await mkdtemp(join(dirname(target),".practice-desk-stage-"));
 const stagedOutput=join(staging,task.mode==="single"?"compiled.exam.json":"bundle");
 let published=false,reservedDirectory=false;
 try{
  const created=publicationCall({...task,output:stagedOutput});
  if(!created.ok||created.body.valid===false){
   emit({...base,stage:"publish",valid:false,readyForPublication:false,
    published:false,issues:{total:1,shown:1,remaining:0,
     items:[{code:created.body.code??"canonical-publication-rejected",severity:"error"}]}});
   process.exitCode=1;return;
  }
  const stagedFiles=task.mode==="single"?[stagedOutput]:
   (await readdir(stagedOutput)).map(name=>join(stagedOutput,name)).sort();
  if(!stagedFiles.length)throw Error("Canonical publication returned no output files");
  const writtenFiles=await Promise.all(stagedFiles.map(async path=>({
   file:task.mode==="single"?target:join(target,path.slice(stagedOutput.length+1)),
   sha256:await inputHash(path)})));
  if((await Promise.all(allInput.map(inputHash))).some((v,i)=>v!==digests[i]))
   return failure("stale-input-after-publication");
  // Exclusive hard-link for a file; directory reservation prevents replacing
  // any pre-existing bundle, then same-parent rename publishes completed files.
  if(task.mode==="single")await link(stagedOutput,target);
  else{
   await mkdir(target);
   reservedDirectory=true;
   await rename(stagedOutput,target);
   reservedDirectory=false;
  }
  published=true;
  // Reject even a mutation that races the short final commit interval.
  if((await Promise.all(allInput.map(inputHash))).some((v,i)=>v!==digests[i])){
   await rm(target,{recursive:true,force:true});
   published=false;
   return failure("stale-input-after-publication");
  }
  emit({...base,stage:"publish",published:true,writtenFiles,
   importInstruction:task.mode==="single"?
    "Explicitly import the signed compiled file into the offline Library; no automatic user-device access.":
    "Explicitly import source.exam.json first and reviewed.exam.json second into the offline Library; retain external source/sidecars."});
 }catch(error){
  // A failed post-commit operation must not strand a newly created publication.
  if(published){await rm(target,{recursive:true,force:true});published=false;}
  throw error;
 }finally{
  if(reservedDirectory&&!published){
   // Only clear our own still-empty reservation; never remove third-party data.
   try{if((await readdir(target)).length===0)await rmdir(target);}catch{}
  }
  await rm(staging,{recursive:true,force:true});
 }
}
async function main(){
 const argv=process.argv.slice(2);
 if(argv[0]==="prepare"){
  if(argv.length!==4||argv[3]!=="--allow-create")
   throw Error("Usage: agent-handoff.mjs prepare <source.json> <NEW-directory> --allow-create");
  const input=argv[1],destination=argv[2];
  const originalSha=await inputHash(input);
  const generated=invoke("question-quality.mjs",["prepare",input,destination]);
  if(!generated.ok){
   fail(generated.body.code??"review-preparation-rejected",
    "Review packet could not be prepared; source or output path invalid.",1);return;
  }
  if(await inputHash(input)!==originalSha){
   await rm(resolve(destination),{recursive:true,force:true});
   return failure("stale-input-after-review-preparation");
  }
  emit({format:FORMAT,version:VERSION,mode:"single",stage:"prepare",
   valid:true,readyForPublication:false,reviewComplete:false,
   inputSha256:originalSha,bankId:generated.body.bankId??null,
   questionCount:generated.body.questionCount??null,
   directory:generated.body.directory,files:generated.body.files,
   factualVerification:"not-performed",externalAuthenticatedReview:false,appAccess:"none",
   note:"Prepared review is empty and cannot be published: blind reviewer must solve, record genuine evidence and complete every applicable check."});
  return;
 }
 if(argv.length===1&&argv[0]==="actions"){
  emit({format:"practice-desk-agent-handoff-actions",version:1,
   modes:["single","paired","pdf"],commands:COMMANDS,
   appAccess:"none",agentDeviceBridge:false,externalSourceFetches:0,
   input:"Existing practice-desk-authoring v1, P60-C review, P60-D decisions and optional P60-B plan / P60-E intake",
   examples:[
    "node scripts/agent-handoff.mjs prepare bank.json NEW-review-dir --allow-create",
     "node scripts/agent-handoff.mjs assess single bank.json --quality-review review.json [--blueprint plan.json]",
    "node scripts/agent-handoff.mjs publish single bank.json NEW.exam.json --quality-review review.json --allow-create",
    "node scripts/agent-handoff.mjs assess paired original.json reviewed.json decisions.json --quality-review review.json",
    "node scripts/agent-handoff.mjs publish paired original.json reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create",
    "node scripts/agent-handoff.mjs assess pdf intake.json original.json source.pdf reviewed.json decisions.json --quality-review review.json"
   ],
   caveat:"No LLM, PDF OCR, independent fact authentication, local browser/History read or direct agent-to-app API."});return;
 }
 const task=options(argv);
 await perform(task);
}
try{await main()}catch(e){fail("handoff-input-invalid",e instanceof Error?e.message:"Unknown handoff failure");}
