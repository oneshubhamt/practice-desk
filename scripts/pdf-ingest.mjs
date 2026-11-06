#!/usr/bin/env node
/** P60-E: external-agent PDF/document intake ledger and fail-closed handoff.
 * No OCR, PDF parser, AI runtime, browser access or alternative publication path.
 * File digests and source-bound assertions are NOT independent transcription proof.
 */
import {readFile,stat,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {inspectEditorialPair} from "./editorial-editions.mjs";
import {validateBlueprint,auditBlueprint} from "./content-blueprint.mjs";

const FORMAT="practice-desk-pdf-intake", SHA=/^[0-9a-f]{64}$/, ID=/^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MAX_SOURCE=25*1024*1024,MAX_INTAKE=2*1024*1024,MAX_DOCUMENT=100*1024*1024;
const digest=v=>createHash("sha256").update(v).digest("hex");
const obj=(x,label,keys)=>{
 if(!x||typeof x!=="object"||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)
  throw Error(label+" must be a plain object");
 for(const k of Object.keys(x))if(!keys.includes(k))throw Error(label+" unexpected field: "+k);
 return x;
};
const string=(x,label,max=300)=>{
 if(typeof x!=="string"||!x.trim()||x.trim()!==x||x.length>max||
  /[\u0000-\u001f\u007f]/.test(x))throw Error(label+" must be a trimmed printable string");
 return x;
};
const list=(x,label,max=500)=>{if(!Array.isArray(x)||x.length>max)throw Error(label+" invalid list");return x;};
const pages=(x,label,count,nonempty=false)=>{
 list(x,label,2000);
 if(nonempty&&!x.length)throw Error(label+" needs at least one source page");
 if(x.some(v=>!Number.isSafeInteger(v)||v<1||v>count)||new Set(x).size!==x.length)
  throw Error(label+" has duplicate/out-of-range page numbers");
 return x;
};
function validateDocumentMetadata(d,label){
 obj(d,label,["title","type","sha256","byteLength","pageCount","inspectedPages","missingPages","publisherClaim","identityNote"]);
 string(d.title,label+".title",240);
 if(!["pdf","image","other-document"].includes(d.type))throw Error(label+" unsupported document type");
 if(!SHA.test(d.sha256)||!Number.isSafeInteger(d.byteLength)||d.byteLength<1||
   d.byteLength>MAX_DOCUMENT)throw Error(label+" invalid byte length/digest");
 if(!Number.isSafeInteger(d.pageCount)||d.pageCount<1||d.pageCount>2000)
  throw Error(label+" invalid asserted pageCount");
 pages(d.inspectedPages,label+".inspectedPages",d.pageCount);
 pages(d.missingPages,label+".missingPages",d.pageCount);
 if(d.publisherClaim!==undefined)string(d.publisherClaim,label+".publisherClaim",180);
 string(d.identityNote,label+".identityNote",500);
}
const sourceJson=async(path,max,label)=>{
 const s=await stat(path);if(s.size>max)throw Error(label+" exceeds byte limit");
 const raw=await readFile(path,"utf8");return {raw,value:JSON.parse(raw),sha256:digest(raw)};
};
async function sourceBytes(path,type){
 const size=(await stat(path)).size;
 if(size<1||size>MAX_DOCUMENT)throw Error("Source document is empty or exceeds 100 MiB");
 const bytes=await readFile(path);
 if(type==="pdf"&&(!bytes.subarray(0,8).toString("ascii").startsWith("%PDF-")||
   !bytes.subarray(-2048).toString("ascii").includes("%%EOF")))
  throw Error("Source PDF lacks minimal PDF header/trailer; document is corrupt or wrong file");
 if(type==="image"&&!(bytes.subarray(0,4).toString("hex")==="89504e47"||
   bytes.subarray(0,3).toString("hex")==="ffd8ff"||
   bytes.subarray(0,4).toString("ascii")==="RIFF"))
  throw Error("Source image does not have a supported PNG/JPEG/WebP signature");
 return {byteLength:bytes.length,sha256:digest(bytes)};
}
const sourceParts=v=>({stimuli:v.stimuli??[],media:v.media??[],questions:v.questions??[]});
const hasMath=q=>{
 const s=JSON.stringify(q),slashPair=String.fromCharCode(92,92);
 return s.includes('"type":"math"')||
  ["frac","sqrt","sum","int","begin","alpha","beta","times","cdot","(","["]
   .some(name=>s.includes(slashPair+name))||
  (s.includes("$")&&s.indexOf("$")!==s.lastIndexOf("$"));
};
export function buildPdfIntakeTemplate(original,raw,document,bytes,keyDocument=null,keyBytes=null){
 toAuthoringDraft(original);
 const parts=sourceParts(original);
 const item=(x,extra={})=>({id:x.id,sha256:digest(JSON.stringify(x)),
  pages:[],status:"unchecked",uncertainties:[],notes:"Pending page-by-page comparison",...extra});
 return {format:FORMAT,version:1,document:{
  title:"REPLACE WITH EXACT DOCUMENT TITLE",type:"pdf",sha256:bytes.sha256,
  byteLength:bytes.byteLength,pageCount:1,inspectedPages:[],missingPages:[],
  identityNote:"Record publisher, examination, year, edition, and where the document came from"
 },...(keyDocument?{keyDocument:{title:"REPLACE KEY DOCUMENT TITLE",type:"pdf",sha256:keyBytes.sha256,
  byteLength:keyBytes.byteLength,pageCount:1,inspectedPages:[],missingPages:[],
  identityNote:"Identify the separate printed key without asserting it is official"}}:{}),
  original:{sourceSha256:digest(raw),bankId:original.bankId,questionCount:parts.questions.length,
   expectedPrintedCount:parts.questions.length,omissions:[]},
  questions:parts.questions.map(q=>({...item(q),printedNumber:"",
   keyOrigin:"unavailable",keyPages:[],mathStatus:hasMath(q)?"unchecked":"not-applicable",
   explanationOrigin:"unverified"})),
  stimuli:parts.stimuli.map(s=>item(s)),
  media:parts.media.map(m=>({...item(m),visualStatus:"unchecked"})),
  documentInventoryStatus:"unchecked",externalVerification:"not-performed",
  inspector:{kind:"agent",id:"REPLACE_INSPECTOR",method:"REPLACE SOURCE COMPARISON METHOD",reviewedAt:"2026-11-06"},
  note:"Template is incomplete. SHA proves byte identity only. Never fill missing questions/keys by invention."};
}
export function auditPdfIntake(manifest,original,raw,documentBytes,{keyBytes=null,pair=null,blueprint=null}={}){
 const issues=[],add=(code,message,questionId)=>{
  issues.push({code,severity:"error",message,...(questionId?{questionId}:{})});};
 let sourceCount=0;
 obj(manifest,"intake",["format","version","document","keyDocument","original","questions","stimuli","media","documentInventoryStatus","externalVerification","note"]);
 if(manifest.format!==FORMAT||manifest.version!==1)throw Error("Unsupported PDF intake version");
 validateDocumentMetadata(manifest.document,"document");
 if(manifest.keyDocument)validateDocumentMetadata(manifest.keyDocument,"keyDocument");
 if(Boolean(manifest.keyDocument)!==Boolean(keyBytes))
  add("key-file-required","Separate key metadata and --key-document must both be present");
 for(const [name,d,bytes] of [["document",manifest.document,documentBytes],
  ...(manifest.keyDocument&&keyBytes?[["keyDocument",manifest.keyDocument,keyBytes]]:[])]){
  if(d.sha256!==bytes.sha256||d.byteLength!==bytes.byteLength)
   add("document-digest-mismatch",name+" bytes no longer match intake manifest");
  const inspected=new Set(d.inspectedPages),missing=new Set(d.missingPages);
  for(let n=1;n<=d.pageCount;n++)if(!inspected.has(n)&&!missing.has(n))
   add("unaccounted-page",name+" page "+n+" not marked examined or missing");
  for(const n of inspected)if(missing.has(n))
   add("page-contradiction",name+" page "+n+" both inspected and missing");
  if(missing.size)add("missing-source-pages",name+" has "+missing.size+" missing pages");
 }
 const src=obj(manifest.original,"original",["sourceSha256","bankId","questionCount","expectedPrintedCount","omissions"]);
 if(!SHA.test(src.sourceSha256)||src.sourceSha256!==digest(raw))
  add("stale-original","Original JSON changed after ingestion metadata was recorded");
 if(src.bankId!==original.bankId||src.questionCount!==original.questions?.length)
  add("original-identity-mismatch","Original bank ID or question count changed");
 if(!Number.isSafeInteger(src.expectedPrintedCount)||src.expectedPrintedCount<1||
  src.expectedPrintedCount>2000)add("expected-count-invalid","Expected printed count must be 1..2000");
 list(src.omissions,"original.omissions",2000);
 if(new Set(src.omissions).size!==src.omissions.length)add("duplicate-omission","Repeated omission reference");
 if(src.expectedPrintedCount!==original.questions.length+src.omissions.length)
  add("question-count-gap","Expected printed count differs from transcriptions plus disclosed omissions");
 if(src.omissions.length)add("unresolved-omissions","Some printed questions have no recoverable transcription");
 if(manifest.documentInventoryStatus!=="checked-against-source")
  add("document-inventory-unchecked","Document/page/numbering completeness has not been source-compared");
 const inspector=obj(manifest.inspector,"inspector",["kind","id","method","reviewedAt"]);
 if(!["human","agent"].includes(inspector.kind))add("inspector-kind-invalid","Name the type of source comparer");
 string(inspector.id,"inspector.id",120);string(inspector.method,"inspector.method",500);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(inspector.reviewedAt)||
    new Date(inspector.reviewedAt+"T00:00:00Z").toISOString().slice(0,10)!==inspector.reviewedAt)
  add("inspector-date-invalid","Use actual source inspection ISO date");
 if(manifest.externalVerification!=="recorded-agent-check"&&
    manifest.externalVerification!=="recorded-human-check")
  add("transcription-unverified","Record who actually compared transcription against the supplied document");
 const parts=sourceParts(original);
 const rows=[
  ["questions",parts.questions,"question"],
  ["stimuli",parts.stimuli,"shared-stimulus"],
  ["media",parts.media,"embedded-media"]];
 const allPrinted=new Set();
 for(const [field,actual,kind] of rows){
  const entries=list(manifest[field],"intake."+field,500);
  if(entries.length!==actual.length)add("coverage-mismatch",field+" count differs from source");
  const byId=new Map(),seen=new Set();
  for(const entry of entries){
   obj(entry,field+" entry",field==="questions"?
    ["id","sha256","pages","status","uncertainties","notes","printedNumber","keyOrigin","keyPages","mathStatus","explanationOrigin"]:
    field==="media"?["id","sha256","pages","status","uncertainties","notes","visualStatus"]:
    ["id","sha256","pages","status","uncertainties","notes"]);
   if(!ID.test(entry.id)||seen.has(entry.id))add("duplicate-or-invalid-item",field+" has duplicate/invalid ID");
   seen.add(entry.id);byId.set(entry.id,entry);
  }
  for(const value of actual){
   sourceCount++;
   const entry=byId.get(value.id);
   if(!entry){add("missing-intake-entry",kind+" lacks source-page record",value.id);continue;}
   if(entry.sha256!==digest(JSON.stringify(value)))
    add("stale-item",kind+" content changed after recorded page inspection",value.id);
   pages(entry.pages,kind+" pages",manifest.document.pageCount);
   if(!entry.pages.length)add("no-source-page",kind+" has no source page",value.id);
   if(entry.pages.some(p=>!manifest.document.inspectedPages.includes(p)))
    add("page-not-inspected",kind+" points to an uninspected page",value.id);
   if(entry.status!=="source-compared")
    add("unverified-transcription",kind+" is not marked compared to its source",value.id);
   string(entry.notes,"entry.notes",800);
   list(entry.uncertainties,"entry.uncertainties",20);
   for(const u of entry.uncertainties)string(u,"uncertainty",500);
   if(entry.uncertainties.length)add("unresolved-uncertainty",kind+" has unresolved uncertainty",value.id);
   if(field==="questions"){
    string(entry.printedNumber,"question.printedNumber",60);
    const number=String(value.examSection)+":"+entry.printedNumber;
    if(allPrinted.has(number))add("duplicate-printed-number","Duplicate original number within the same physical section",value.id);
    allPrinted.add(number);
    if(!["source-document","key-document","unavailable"].includes(entry.keyOrigin))
     add("invalid-key-origin","Missing key origin classification",value.id);
    if(entry.keyOrigin==="unavailable")add("unverified-original-key",
     "Do not invent a printed source key; locate it or hold this question",value.id);
    if(entry.keyOrigin==="key-document"&&!manifest.keyDocument)
     add("missing-key-document","Claimed external key has no byte-bound document",value.id);
    const keyDoc=entry.keyOrigin==="key-document"?manifest.keyDocument:manifest.document;
    if(keyDoc){
     pages(entry.keyPages,"answer key pages",keyDoc.pageCount);
     if(!entry.keyPages.length)add("key-page-unlocated","Answer key location is missing",value.id);
     if(entry.keyPages.some(p=>!keyDoc.inspectedPages.includes(p)))
      add("key-page-uninspected","Answer key cites an uninspected page",value.id);
    }
    if(!["not-applicable","source-compared"].includes(entry.mathStatus)||
      (hasMath(value)&&entry.mathStatus!=="source-compared"))
     add("math-not-reviewed","Equations/TeX require visual character-by-character comparison",value.id);
    const sourceNote=value.provenance?.sourceNote;
    if(!sourceNote||sourceNote.trim().length<12)
     add("source-note-required","Frozen question must carry a meaningful document/page provenance note",value.id);
    else if(!entry.pages.some(p=>sourceNote.toLowerCase().includes("page "+p)||
       sourceNote.toLowerCase().includes("p. "+p)))
     add("source-note-page-mismatch","Frozen question note must cite one of the recorded source pages",value.id);
    if(!["printed-source","editorial-not-in-source"].includes(entry.explanationOrigin))
     add("explanation-origin-unresolved","Distinguish printed explanations from editorial additions",value.id);
    if(value.provenance?.kind==="official-pyq"&&!manifest.document.publisherClaim)
     add("official-origin-not-substantiated","Claimed PYQ has no attributed publisher; claim is not proof",value.id);
   }
   if(field==="media"&&entry.visualStatus!=="source-compared")
    add("figure-not-reviewed","Image/diagram pixel fidelity has not been source-compared",value.id);
  }
  for(const entry of entries)if(!actual.some(x=>x.id===entry.id))
   add("unknown-intake-item",field+" contains an item absent from the original",entry.id);
 }
 const canonical=inspectExternalQuestionBank(original);
 if(!canonical.valid)for(const e of canonical.issues.filter(x=>x.severity==="error").slice(0,10))
  add("canonical-source-invalid",e.code+" at "+e.path);
 let editorial=null,coverage=null;
 if(pair){
  editorial=inspectEditorialPair(
   {data:original,raw,sha256:digest(raw)},
   {data:pair.reviewed.value,raw:pair.reviewed.raw,sha256:pair.reviewed.sha256},
   pair.decisions.value,pair.qualityReview.value);
  if(!editorial.valid)for(const e of editorial.issues.filter(x=>x.severity==="error").slice(0,12))
   add("editorial-"+e.code,e.message);
 }
 if(blueprint){
  const plan=validateBlueprint(blueprint.value);
  coverage=auditBlueprint(plan,[{value:pair?pair.reviewed.value:original,digest:pair?pair.reviewed.sha256:digest(raw)}],undefined,{limit:12});
  if(!coverage.valid)for(const e of coverage.issues.items.slice(0,12))
   add("blueprint-"+e.code,e.message);
 }
 const valid=issues.length===0;
 return {format:"practice-desk-pdf-intake-audit",version:1,valid,
  readyForPublication:valid&&Boolean(pair),stage:pair?"intake-and-editorial":"transcription-only",
  bankId:original.bankId,sourcePdfSha256:documentBytes.sha256,
  originalSha256:digest(raw),questionCount:original.questions?.length??0,
  sourceElementsChecked:sourceCount,reviewAssurance:editorial?.reviewAssurance??"not-performed",
  editorialComparable:editorial?.comparison?.comparable??null,
  coverageValid:coverage?.valid??null,factualVerification:"not-performed",
  externalSourceFetches:0,actualPdfTextComparison:"not-performed-by-software",
  sourceInspection:"attributed-agent-or-human-claim-not-authenticated",
  issues:{total:issues.length,blocking:issues.length,offset:0,limit:12,
   nextOffset:issues.length>12?12:null,items:issues.slice(0,12)}};
}
const usage="Usage: pdf-ingest.mjs template <original.json> <source.pdf> [--key-document key.pdf] | audit <intake.json> <original.json> <source.pdf> [--key-document key.pdf] [--reviewed reviewed.json --decisions decisions.json --quality-review quality.json] [--blueprint plan.json] | compile <intake.json> <original.json> <source.pdf> <reviewed.json> <decisions.json> <NEW-directory> --quality-review quality.json [--key-document key.pdf] [--blueprint plan.json]";
async function main(){
 const [command,...args]=process.argv.slice(2);
 if(!["template","audit","compile"].includes(command))throw Error(usage);
 const mandatory=command==="template"?2:command==="audit"?3:6;
 if(args.length<mandatory)throw Error(usage);
 const flags=args.slice(mandatory),opts={};
 for(let i=0;i<flags.length;i+=2){
  const k=flags[i],v=flags[i+1];
  if(!["--key-document","--reviewed","--decisions","--quality-review","--blueprint"].includes(k)||
    !v||Object.hasOwn(opts,k))throw Error(usage);
  opts[k]=v;
 }
 if(command==="template"&&Object.keys(opts).some(k=>k!=="--key-document"))
  throw Error("Template accepts only --key-document");
 const original=await sourceJson(args[command==="template"?0:1],MAX_SOURCE,"Original JSON");
 const data=original.value;toAuthoringDraft(data);
 const intake=command==="template"?null:await sourceJson(args[0],MAX_INTAKE,"Intake manifest");
 const mainType=intake?.value?.document?.type??"pdf";
 const doc=await sourceBytes(args[command==="template"?1:2],mainType);
 const key=opts["--key-document"]?await sourceBytes(opts["--key-document"],
  intake?.value?.keyDocument?.type??"pdf"):null;
 if(command==="template"){
  process.stdout.write(JSON.stringify(buildPdfIntakeTemplate(data,original.raw,null,doc,null,key),null,2)+"\n");return;
 }
 let pair=null;
 if(command==="compile"){
  if(opts["--reviewed"]||opts["--decisions"])throw Error("compile supplies reviewed and decisions positionally");
  if(!opts["--quality-review"])throw Error("Strict compilation requires --quality-review");
  pair={reviewed:await sourceJson(args[3],MAX_SOURCE,"Reviewed"),
   decisions:await sourceJson(args[4],2*1024*1024,"Decisions"),
   qualityReview:await sourceJson(opts["--quality-review"],3*1024*1024,"Quality review")};
 }else{
  const set=["--reviewed","--decisions","--quality-review"].filter(k=>opts[k]);
  if(set.length!==0&&set.length!==3)throw Error("Audit needs all reviewed, decisions and quality-review or none");
  if(set.length)pair={reviewed:await sourceJson(opts["--reviewed"],MAX_SOURCE,"Reviewed"),
   decisions:await sourceJson(opts["--decisions"],2*1024*1024,"Decisions"),
   qualityReview:await sourceJson(opts["--quality-review"],3*1024*1024,"Quality review")};
 }
 const blueprint=opts["--blueprint"]?await sourceJson(opts["--blueprint"],1024*1024,"Blueprint"):null;
 const report=auditPdfIntake(intake.value,data,original.raw,doc,{keyBytes:key,pair,blueprint});
 if(command==="compile"){
  if(!report.readyForPublication){
   process.stdout.write(JSON.stringify({...report,compiled:false},null,2)+"\n");process.exitCode=1;return;
  }
  const script=fileURLToPath(new URL("./editorial-editions.mjs",import.meta.url));
  const result=spawnSync(process.execPath,[script,"compile",args[1],args[3],args[4],args[5],
   "--quality-review",opts["--quality-review"]],{encoding:"utf8",maxBuffer:1024*1024});
  if(result.status!==0)throw Error("Canonical P60-D compilation failed: "+(result.stderr||result.stdout).slice(0,1500));
  await writeFile(join(resolve(args[5]),"pdf-intake-provenance.json"),
   JSON.stringify({...intake.value,sourceDocumentFile:"external-original-document-not-copied",
    originalSourceFile:"original-source.json",factualVerification:"not-performed"},null,2)+"\n",
   {flag:"wx"});
  process.stdout.write(JSON.stringify({...report,compiled:true,directory:resolve(args[5]),
   canonicalPublication:"P60-D editorial-editions.mjs",extraFile:"pdf-intake-provenance.json"},null,2)+"\n");return;
 }
 process.stdout.write(JSON.stringify(report,null,2)+"\n");
 if(!report.valid)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main()}catch(e){
  process.stderr.write(JSON.stringify({valid:false,readyForPublication:false,
   code:"pdf-intake-input-invalid",message:e instanceof Error?e.message:"Unknown error"},null,2)+"\n");
  process.exitCode=2;
 }
}
