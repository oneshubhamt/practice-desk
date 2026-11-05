#!/usr/bin/env node
/** P59: compact, source-safe, headless agent interface.
 * Edits the narrow AI authoring SOURCE only, never History, Wordgard's shelf,
 * immutable paper/answer-key hashes, or an existing source file in place.
 * Integrity SHA checks are not factual verification.
 */
import {readFile,writeFile,link,unlink} from "node:fs/promises";
import {createHash,randomBytes} from "node:crypto";
import {basename,dirname,join} from "node:path";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";

const SOURCE_FORMAT="practice-desk-authoring";
const PATCH_FORMAT="practice-desk-agent-patch";
const digest=value=>createHash("sha256").update(value).digest("hex");
const shaRule=/^[a-f0-9]{64}$/;
const idRule=/^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MAX_SOURCE=25*1024*1024,MAX_PATCH=1024*1024;
const EDITABLE_FIELDS=new Set([
 "examSection","subject","syllabusHeadingId","topic","subtopic","difficulty",
 "kind","prompt","options","answer","explanation","stimulusRef","tolerance",
 "minSelections","maxSelections","partialCreditEach","partialPenaltyEach",
 "leftItems","rightItems","provenance","qa"
]);
const OPTIONAL_FIELDS=new Set([
 "subject","syllabusHeadingId","topic","subtopic","difficulty","stimulusRef",
 "tolerance","minSelections","maxSelections","partialCreditEach","partialPenaltyEach",
 "leftItems","rightItems","options"
]);
const fail=message=>{throw Error(message);};
const plain=(value,label)=>{
 if(value===null||typeof value!=="object"||Array.isArray(value)||
    Object.getPrototypeOf(value)!==Object.prototype)
  fail(label+" must be a JSON object");
 return value;
};
const exact=(value,allowed,label)=>{
 plain(value,label);
 for(const key of Object.keys(value))
  if(!allowed.includes(key))fail(label+" has unsupported field "+key);
 return value;
};
const asArray=(value,label,max)=>{
 if(!Array.isArray(value)||value.length>max)
  fail(label+" must contain at most "+max+" items");
 return value;
};
const ident=(value,label)=>{
 if(typeof value!=="string"||!idRule.test(value)||value.length>80)
  fail(label+" must be a stable source question ID");
 return value;
};
const hash=(value,label)=>{
 if(typeof value!=="string"||!shaRule.test(value))
  fail(label+" must be a 64-character lower-case SHA-256 digest");
 return value;
};
const positive=(value,label,max,min=0)=>{
 if(!Number.isSafeInteger(value)||value<min||value>max)
  fail(label+" must be an integer from "+min+" to "+max);
 return value;
};
const io=async(path,max,label)=>{
 const raw=await readFile(path,"utf8");
 if(Buffer.byteLength(raw,"utf8")>max)fail(label+" exceeds "+max+" UTF-8 bytes");
 let value;
 try{value=JSON.parse(raw);}catch{fail(label+" is not valid JSON");}
 return {raw,value,sha256:digest(raw)};
};
const sourceOnly=value=>{
 plain(value,"Input");
 if(value.format!==SOURCE_FORMAT||value.version!==1||
   !Array.isArray(value.questions)||typeof value.bankId!=="string")
  fail("Expected practice-desk-authoring source v1; a rich Wordgard draft exchange must use its separate exact import/export contract");
 return value;
};
const briefIssue=x=>({
 severity:x.severity,code:x.code,
 ...(x.questionId?{questionId:x.questionId}:{}),
 ...(x.path?{path:x.path}:{}),
 message:x.message,
 ...(x.suggestion?{action:x.suggestion}:{})
});
const pageOf=(issues,offset,limit)=>({
 offset,limit,total:issues.length,
 nextOffset:offset+limit<issues.length?offset+limit:null,
 items:issues.slice(offset,offset+limit).map(briefIssue)
});
const fileMeta=(value,report,sha256)=>{
 const source=sourceOnly(value);
 return {
  sourceSha256:sha256,
  bankId:source.bankId,examId:source.examId,paperId:source.paperId,
  revision:source.revision,questionCount:report.questionCount,
  valid:report.valid,editorialStatus:report.editorialStatus,
  factualVerification:"not-performed",
  quality:report.quality?.summary??null
 };
};
const output=value=>process.stdout.write(JSON.stringify(value,null,2)+"\n");
const issueError=report=>{
 const total=report.issues.length;
 return {issueCount:total,issues:report.issues.slice(0,12).map(briefIssue),
  remainingIssues:Math.max(0,total-12)};
};
function linkedMedia(source,question,stimulus){
 const refs=new Set();
 const visit=x=>{
  if(!x||typeof x!=="object")return;
  if(Array.isArray(x)){for(const v of x)visit(v);return;}
  for(const [key,value] of Object.entries(x)){
   if((key==="assetId"||key==="mediaRef")&&typeof value==="string")
    refs.add(value);
   else if(key==="assetIds"&&Array.isArray(value))
    value.forEach(id=>{if(typeof id==="string")refs.add(id);});
   else visit(value);
  }
 };
 visit(question);visit(stimulus);
 return (source.media??[]).filter(m=>refs.has(m.id)).map(m=>({
  id:m.id,altText:m.altText,
  mediaType:typeof m.dataUri==="string"?(m.dataUri.match(/^data:([^;]+);/)?.[1]??"unknown"):"unknown",
  inlineBytesOmitted:true
 }));
}
function patchSource(source,shape,sha256){
 const body=exact(shape,["format","version","baseSha256","updates","add","remove","nextRevision"],"Patch");
 if(body.format!==PATCH_FORMAT||body.version!==1)fail("Expected practice-desk-agent-patch v1");
 if(hash(body.baseSha256,"Patch baseSha256")!==sha256)
  fail("Stale source: baseSha256 differs from actual source bytes; inspect again");
 const updates=asArray(body.updates??[],"updates",100);
 const additions=asArray(body.add??[],"add",100);
 const removals=asArray(body.remove??[],"remove",100);
 if(!updates.length&&!additions.length&&!removals.length)
  fail("Patch must add, update or remove at least one question");
 if(updates.length+additions.length+removals.length>100)
  fail("A batch may change at most 100 questions");
 const next=structuredClone(source);
 if(body.nextRevision!==undefined){
  positive(body.nextRevision,"nextRevision",999999,1);
  if(body.nextRevision<=source.revision)
   fail("nextRevision must strictly increase for a new publication revision");
  next.revision=body.nextRevision;
 }
 const original=new Map();
 for(const [index,q] of source.questions.entries()){
  if(!q||typeof q!=="object"||Array.isArray(q))
   fail("Source questions["+index+"] is not an object");
  const id=ident(q.id,"Source question ID");
  if(original.has(id))fail("Source contains duplicate question ID "+id);
  original.set(id,q);
 }
 const touched=new Set(),updated=[],added=[],removed=[];
 for(const item of updates){
  exact(item,["id","expectedQuestionSha256","set","unset"],"Question update");
  const id=ident(item.id,"Update question ID");
  if(touched.has(id))fail("More than one mutation targets question "+id);
  touched.add(id);
  const before=original.get(id);
  if(!before)fail("Question "+id+" not found in source");
  if(hash(item.expectedQuestionSha256,"expectedQuestionSha256")!==digest(JSON.stringify(before)))
   fail("Stale question "+id+": original question digest has changed; show it again");
  const set=exact(item.set??{},[...EDITABLE_FIELDS],"set for "+id);
  const unset=asArray(item.unset??[],"unset for "+id,OPTIONAL_FIELDS.size);
  if(!Object.keys(set).length&&!unset.length)fail("Question "+id+" has no actual changes");
  for(const field of unset){
   if(typeof field!=="string"||!OPTIONAL_FIELDS.has(field))
    fail("Cannot unset required or unknown field "+String(field));
   if(Object.hasOwn(set,field))fail("Cannot set and unset "+field+" simultaneously");
  }
  if(new Set(unset).size!==unset.length)fail("Duplicate unset fields for "+id);
  // A correction is new unverified work, not a continuation of an earlier
  // review claim. Always make a substantive changed key/stem/solution visible
  // in the app's QA queue, even when the incoming source had unchecked status.
  const materialFields=["kind","prompt","options","answer","explanation",
   "leftItems","rightItems","tolerance","minSelections","maxSelections",
   "partialCreditEach","partialPenaltyEach","provenance"];
  const material=materialFields.some(k=>Object.hasOwn(set,k)||unset.includes(k));
  const sourceWordingChanged=["kind","prompt","options","answer","leftItems","rightItems"]
   .some(k=>Object.hasOwn(set,k)||unset.includes(k));
  if(before.provenance?.kind==="official-pyq"&&sourceWordingChanged&&
     !Object.hasOwn(set,"provenance"))
   fail("Edited official-PYQ wording/key requires an explicit source-origin/provenance update, not silent retention of the PYQ claim");
  if(material&&set.qa?.status==="unchecked")
   fail("A material question correction cannot opt out of needs-review; omit qa or set needs-review");
  const target=next.questions.find(q=>q.id===id);
  Object.assign(target,set);
  unset.forEach(key=>{delete target[key];});
  if(material)target.qa={status:"needs-review"};
  updated.push(id);
 }
 for(const item of additions){
  plain(item,"Added question");
  const id=ident(item.id,"Added question ID");
  if(touched.has(id)||original.has(id))fail("Duplicate new question ID "+id);
  touched.add(id);
  next.questions.push(structuredClone(item));
  added.push(id);
 }
 for(const item of removals){
  exact(item,["id","expectedQuestionSha256"],"Question removal");
  const id=ident(item.id,"Removed question ID");
  if(touched.has(id))fail("More than one mutation targets question "+id);
  touched.add(id);
  const before=original.get(id);
  if(!before)fail("Question "+id+" not found in source");
  if(hash(item.expectedQuestionSha256,"expectedQuestionSha256")!==digest(JSON.stringify(before)))
   fail("Stale removed question "+id+"; inspect again");
  next.questions=next.questions.filter(q=>q.id!==id);
  removed.push(id);
 }
 return {next,updated,added,removed};
}
async function createNewAtomic(filename,contents){
 // A unique sibling temporary file and atomic hardlink prevent a visible
 // half-written result, and cannot overwrite any pre-existing path.
 const name="."+basename(filename)+".pd-agent-"+randomBytes(8).toString("hex")+".tmp";
 const temp=join(dirname(filename),name);
 try{
  await writeFile(temp,contents,{flag:"wx",mode:0o600});
  await link(temp,filename);
 }finally{
  await unlink(temp).catch(()=>{});
 }
}
const usage="Usage: question-bank-agent.mjs inspect source.json [--offset N --limit 1..50] | show source.json question-id | patch source.json patch.json NEW-output.json [--dry-run]";
async function main(){
 const [command,input,...args]=process.argv.slice(2);
 if(!command||!input)fail(usage);
 if(command==="inspect"){
  if(args.length%2!==0||args.some((x,i)=>i%2===0&&!["--offset","--limit"].includes(x))||
   new Set(args.filter((_,i)=>i%2===0)).size!==args.length/2)fail(usage);
  let offset=0,limit=12;
  for(let i=0;i<args.length;i+=2){
   if(args[i]==="--offset")offset=positive(Number(args[i+1]),"offset",1000000);
   else limit=positive(Number(args[i+1]),"limit",50,1);
  }
  const {raw,value,sha256}=await io(input,MAX_SOURCE,"Source");
  sourceOnly(value);
  const report=inspectExternalQuestionBank(value);
  output({format:"practice-desk-agent-inspection",version:1,
   ...fileMeta(value,report,sha256),
   issues:pageOf(report.issues,offset,limit),
   note:"Integrity SHA is not authentication; citations/PYQ/current law and reviewer claims remain unverified. Import or compile only after independent factual checking."});
  if(!report.valid)process.exitCode=1;
  return;
 }
 if(command==="show"){
  if(args.length!==1)fail(usage);
  const id=ident(args[0],"Question ID");
  const {value,sha256}=await io(input,MAX_SOURCE,"Source");
  const source=sourceOnly(value);
  const matching=source.questions.filter(q=>q?.id===id);
  if(matching.length!==1)fail(matching.length?"Ambiguous duplicate question ID "+id:"Unknown question "+id);
  const question=matching[0];
  const stimulus=source.stimuli?.find(x=>x.id===question.stimulusRef)??null;
  output({format:"practice-desk-agent-question",version:1,
   bankId:source.bankId,revision:source.revision,sourceSha256:sha256,
   questionSha256:digest(JSON.stringify(question)),
   question,stimulus,media:linkedMedia(source,question,stimulus),
   factualVerification:"not-performed",
   note:"Only this source question is shown. Shared media bytes are omitted; cite/verify external documents before changing factual claims."});
  return;
 }
 if(command==="patch"){
  if(args.length<2||args.length>3||(args.length===3&&args[2]!=="--dry-run"))
   fail(usage);
  const [patchPath,outputPath,dry]=args;
  if(!patchPath||!outputPath)fail(usage);
  const {value:source,sha256}=await io(input,MAX_SOURCE,"Source");
  sourceOnly(source);
  const {value:patch}=await io(patchPath,MAX_PATCH,"Patch");
  const {next,updated,added,removed}=patchSource(source,patch,sha256);
  const report=inspectExternalQuestionBank(next);
  if(!report.valid||!report.compiled){
   output({format:"practice-desk-agent-patch-report",version:1,valid:false,
    code:"agent-validation-failed",
    ...issueError(report),factualVerification:"not-performed",
    message:"Patch rejected. No output source was written."});
   process.exitCode=1;return;
  }
  const rendered=JSON.stringify(next,null,2)+"\n";
  if(Buffer.byteLength(rendered,"utf8")>MAX_SOURCE)
   fail("Patched source exceeds 25 MiB budget");
  if(dry!=="--dry-run")await createNewAtomic(outputPath,rendered);
  output({format:"practice-desk-agent-patch-report",version:1,valid:true,
   sourceSha256:digest(rendered),baseSha256:sha256,
   bankId:next.bankId,revision:next.revision,questionCount:report.questionCount,
   updatedIds:updated,addedIds:added,removedIds:removed,
   warnings:report.quality?.summary.warnings??0,
   duplicateCandidates:report.quality?.summary.duplicateCandidates??0,
   duplicateTruncated:report.quality?.summary.duplicateTruncated??false,
   ...(dry==="--dry-run"?{dryRun:true}:{output:outputPath}),
   editorialStatus:"caution",factualVerification:"not-performed",
   note:"Source output validated against the existing canonical publisher and scorer. Factual truth and source authenticity are NOT checked."});
  return;
 }
 fail(usage);
}
try{await main();}
catch(error){
 process.stderr.write(JSON.stringify({valid:false,code:"agent-input-invalid",
  message:error instanceof Error?error.message:"Unknown agent CLI failure"},null,2)+"\n");
 process.exitCode=1;
}
