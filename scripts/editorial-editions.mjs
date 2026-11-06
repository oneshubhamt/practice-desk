#!/usr/bin/env node
/** P60-D: vendor-neutral source-preserving editorial pairing.
 * Reuses the existing Wordgard compiler, P60-C source QA, and the generic
 * source/reviewed engine. No second scorer, History editor or factual verifier.
 */
import {readFile,writeFile,mkdir,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {dirname,resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {isDeepStrictEqual} from "node:util";
import {toAuthoringDraft,inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {inspectCandidateIntegrity} from "../src/authoring/candidate-integrity.ts";
import {auditQuestionQuality} from "./question-quality.mjs";
import {createSourceKeyReference} from "../src/engine/source-comparison.ts";
import {createSourceReviewReference} from "../src/engine/review-source.ts";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {questionRevisionHash} from "../src/domain/integrity.ts";

const FORMAT="practice-desk-editorial-decisions",LINEAGE_FORMAT="practice-desk-editorial-lineage";
const sha=s=>createHash("sha256").update(s).digest("hex");
const SHA=/^[0-9a-f]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MAX_SOURCE_BYTES=25*1024*1024,MAX_DECISIONS_BYTES=2*1024*1024,
 MAX_REVIEW_BYTES=3*1024*1024,MAX_QUESTIONS=200;
const CHOICE_FIELDS=["answer","explanation","prompt","options","kind",
 "leftItems","rightItems","stimulusRef","tolerance","minSelections",
 "maxSelections","partialCreditEach","partialPenaltyEach","provenance",
 "subject","syllabusHeadingId","topic","subtopic","difficulty","examSection"];
const BAD_INPUT="editorial-pair-input-invalid";
const plain=(value,name,keys)=>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  Object.getPrototypeOf(value)!==Object.prototype)throw Error(name+" must be a plain object");
 for(const key of Object.keys(value))if(!keys.includes(key))
  throw Error(name+" unsupported field "+key);
 return value;
};
const string=(s,name,min=1,max=1500)=>{
 if(typeof s!=="string"||s.trim()!==s||s.length<min||s.length>max||
  /[\u0000-\u001f\u007f]/.test(s))throw Error("Invalid "+name);
 return s;
};
const sumErrors=issues=>issues.filter(x=>x.severity==="error").length;
const isSourceKeyChange=fields=>fields.some(x=>["answer","kind","prompt","options",
 "leftItems","rightItems","stimulusRef","media","stimuli","tolerance"].includes(x));
async function load(file,max,label){
 const raw=await readFile(file,"utf8");
 if(Buffer.byteLength(raw,"utf8")>max)throw Error(label+" exceeds "+max+" bytes");
 let data;try{data=JSON.parse(raw)}catch{throw Error(label+" is not valid JSON")}
 return {raw,data,sha256:sha(raw)};
}
function assertPair(original,reviewed){
 const a=toAuthoringDraft(original),b=toAuthoringDraft(reviewed);
 for(const field of ["examId","paperId"])
  if(a[field]!==b[field])throw Error("Original/reviewed mismatch: "+field);
 if(a.revision>b.revision)throw Error("Reviewed edition cannot predate source revision");
 for(const field of ["scoring","timing","navigation","sections"])
  if(!isDeepStrictEqual(original[field],reviewed[field]))
   throw Error("Original/reviewed exam policy mismatch: "+field);
 const ids=a.questions.map(q=>q.id),newIds=b.questions.map(q=>q.id);
 if(ids.length!==newIds.length||new Set(ids).size!==ids.length||
  ids.some((id,i)=>id!==newIds[i]))
  throw Error("Original/reviewed questions must preserve each stable ID and order; never silently add/drop/renumber");
 if(ids.length<1||ids.length>MAX_QUESTIONS)throw Error("Only 1..200 questions per paired source are supported");
 return {a,b};
}
function derivedChanges(original,reviewed,originalHash,reviewedHash){
 const sameMedia=isDeepStrictEqual(original.media??[],reviewed.media??[]);
 const sameStimuli=isDeepStrictEqual(original.stimuli??[],reviewed.stimuli??[]);
 return original.questions.map((q,i)=>{
  const other=reviewed.questions[i],fields=CHOICE_FIELDS.filter(f=>!isDeepStrictEqual(q[f],other[f]));
  if(!sameStimuli)fields.push("stimuli");
  if(!sameMedia)fields.push("media");
  return {questionId:q.id,changedFields:fields,
   originalQuestionSha256:sha(JSON.stringify(q)),
   reviewedQuestionSha256:sha(JSON.stringify(other))};
 }).filter(x=>x.changedFields.length>0);
}
function template(original,reviewed,originalHash,reviewedHash){
 const changes=derivedChanges(original,reviewed,originalHash,reviewedHash);
 return {format:FORMAT,version:1,originalSha256:originalHash,reviewedSha256:reviewedHash,
  entries:changes.map(x=>({...x,disposition:"needs-review",reason:"",
   evidence:[]})),templateIncomplete:true,
  note:"Template is incomplete. A correction claim, timestamp, URL or reviewer identity is NOT independently authenticated."};
}
function validateEvidence(raw,kind){
 const e=plain(raw,"correction evidence",["publisher","title","locator","url","asOfDate","sourceNote"]);
 string(e.publisher,"evidence.publisher",1,180);
 string(e.title,"evidence.title",1,240);
 string(e.locator,"evidence.locator",1,240);
 if(e.sourceNote!==undefined)string(e.sourceNote,"evidence.sourceNote",1,1000);
 if(e.url!==undefined){
  string(e.url,"evidence.url",1,2048);
  if(!/^https:\/\/[^\s/@]+(?::\d+)?(?:\/[^\s]*)?$/iu.test(e.url))
   throw Error("Evidence URLs require HTTPS without credentials");
 }
 if(e.asOfDate!==undefined){
  string(e.asOfDate,"evidence.asOfDate",10,10);
  const v=e.asOfDate;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+"T00:00:00Z"))||
   new Date(v+"T00:00:00Z").toISOString().slice(0,10)!==v)
   throw Error("Invalid evidence as-of date");
 }
 return e;
}
function validateDecisions(input,expected,source,reviewed){
 const issues=[],add=(code,message,id)=>issues.push({code,severity:"error",message,...(id?{questionId:id}:{})});
 let rows=[];
 try{
  const d=plain(input,"decisions",["format","version","originalSha256","reviewedSha256",
   "entries"]);
  if(d.format!==FORMAT||d.version!==1)throw Error("Unexpected decision format/version");
  if(!SHA.test(d.originalSha256)||!SHA.test(d.reviewedSha256))
   throw Error("Decision source hashes must be SHA-256 digests");
  if(d.originalSha256!==expected.originalSha256||d.reviewedSha256!==expected.reviewedSha256)
   add("stale-decisions","Source or reviewed file changed after the editorial decision");
  rows=Array.isArray(d.entries)?d.entries:null;
  if(!rows||rows.length>MAX_QUESTIONS)throw Error("Invalid decision entries");
 }catch(e){add("decision-invalid",e.message);return {rows:new Map(),issues};}
 const byId=new Map();
 const derived=derivedChanges(source,reviewed);
 const needed=new Map(derived.map(x=>[x.questionId,x]));
 for(const row of rows){
  try{
   const decision=plain(row,"decision",["questionId","changedFields",
    "originalQuestionSha256","reviewedQuestionSha256","disposition","reason","evidence"]);
   string(decision.questionId,"decision.questionId",1,100);
   if(!ID.test(decision.questionId))throw Error("Malformed question ID");
   if(byId.has(decision.questionId))throw Error("Repeated decision for "+decision.questionId);
   byId.set(decision.questionId,decision);
   const expectedChange=needed.get(decision.questionId);
   if(!expectedChange){add("unnecessary-change-decision","No change matches decision",decision.questionId);continue;}
   if(!Array.isArray(decision.changedFields)||
     !isDeepStrictEqual(decision.changedFields,expectedChange.changedFields)||
     decision.originalQuestionSha256!==expectedChange.originalQuestionSha256||
     decision.reviewedQuestionSha256!==expectedChange.reviewedQuestionSha256)
    add("stale-question-decision","Decision does not match actual fields and question hashes",decision.questionId);
   if(!["corrected","caution","exclude"].includes(decision.disposition))
    add("unresolved-decision","Choose corrected, caution or exclude",decision.questionId);
   if(typeof decision.reason!=="string"||decision.reason.trim().length<15||
     decision.reason.length>1400)add("missing-change-reason","Record a substantive correction rationale",decision.questionId);
   if(!Array.isArray(decision.evidence)||decision.evidence.length>12)
    add("decision-evidence-invalid","Evidence must be a bounded array",decision.questionId);
   else {
    for(const evidence of decision.evidence){
     try{validateEvidence(evidence);}catch(e){add("decision-evidence-invalid",e.message,decision.questionId)}
    }
   }
   const idx=source.questions.findIndex(q=>q.id===decision.questionId);
   const originalKind=source.questions[idx]?.provenance?.kind;
   const reviewedKind=reviewed.questions[idx]?.provenance?.kind;
   if((isSourceKeyChange(expectedChange.changedFields)||
      originalKind==="official-pyq"||reviewedKind==="official-pyq")&&
      (!Array.isArray(decision.evidence)||decision.evidence.length===0))
    add("change-evidence-required","Substantive corrections or claimed PYQs require an attributed source/proof locator",decision.questionId);
  }catch(e){add("decision-invalid",e.message)}
 }
 for(const item of derived)if(!byId.has(item.questionId))
  add("missing-change-decision","Every changed question needs a separate correction decision",item.questionId);
 return {rows:byId,issues};
}
function sourceDraft(draft,edition){
 const supplement=q=>{
  const fallback="Supplied source transcription; independently verified provenance not established.";
  return {...q,source:q.source.trim().length>=6?q.source:fallback};
 };
 return {...draft,edition,questions:draft.questions.map(supplement)};
}
function annotateReviewed(bundle,rawReviewed,decisionMap,changes){
 const byId=new Map(changes.map(x=>[x.questionId,x]));
 const questions=bundle.questions.map((q,i)=>{
  const item=rawReviewed.questions[i],decision=decisionMap.get(item.id),change=byId.get(item.id);
  if(!decision||!change)return q;
  const kindMap={
   answer:"answer-key",prompt:"wording",options:"options",leftItems:"options",rightItems:"options",
   kind:"source-correction",stimulusRef:"figure",stimuli:"figure",media:"figure",
   explanation:"explanation",provenance:"source-correction",tolerance:"answer-key",
   minSelections:"answer-key",maxSelections:"answer-key",partialCreditEach:"answer-key",
   partialPenaltyEach:"answer-key",subject:"formatting",syllabusHeadingId:"formatting",
   topic:"formatting",subtopic:"formatting",difficulty:"formatting",examSection:"formatting"
  };
  const types=[...new Set(change.changedFields.map(x=>kindMap[x]??"source-correction"))];
  const notes=(q.editorial.notes??"")+
    " Reviewed-edition change (author/reviewer-attributed, not authenticated): "+
    decision.reason+" Original source and printed answer key are preserved independently; "+
    "disposition "+decision.disposition+". Recorded evidence count "+decision.evidence.length+
    " (source correctness not independently checked by this application).";
  const editorial={...q.editorial,status:decision.disposition==="exclude"?"invalid":"caution",
   changes:types,notes:notes.slice(0,20000)};
  const signed={...q,editorial};
  return {...signed,contentHash:questionRevisionHash(signed)};
 });
 return validateExamPackage({...bundle,questions});
}
function compilePair(source,reviewed,rows,changes,a,b){
 const old=inspectAuthoringPublication(sourceDraft(a,"source"));
 if(!old.valid||!old.compiled)throw Error("Original source cannot be packaged: "+
  old.issues.map(x=>x.reason).slice(0,3).join("; "));
 const newer=inspectAuthoringPublication(sourceDraft(b,"reviewed"),[old.compiled]);
 if(!newer.valid||!newer.compiled)throw Error("Reviewed edition cannot be packaged: "+
  newer.issues.map(x=>x.reason).slice(0,3).join("; "));
 const sourcePkg=validateExamPackage(old.compiled);
 const reviewedPkg=annotateReviewed(newer.compiled,reviewed,rows,changes);
 return {sourcePkg,reviewedPkg};
}
function inspectPair(sourceInput,reviewedInput,decisions,qualityReview){
 const source=sourceInput.data,reviewed=reviewedInput.data;
 const {a,b}=assertPair(source,reviewed);
 const changes=derivedChanges(source,reviewed);
 const hashes={originalSha256:sourceInput.sha256,reviewedSha256:reviewedInput.sha256};
 const validation=validateDecisions(decisions,hashes,source,reviewed);
 const issues=[...validation.issues];
 const add=(code,message)=>issues.push({code,severity:"error",message});
 for(const leak of inspectCandidateIntegrity(a))
  if(leak.severity==="error")add("source-candidate-answer-leak",
   "Original transcription has a candidate-visible key leak at "+leak.questionId+" / "+leak.field+
   "; keep the raw original archived, but do not publish this as a playable Source edition");
 const reviewedQA=inspectExternalQuestionBank(reviewed);
 if(!reviewedQA.valid)for(const issue of reviewedQA.issues.filter(x=>x.severity==="error").slice(0,12))
  add("reviewed-bank-invalid",issue.code+": "+issue.message);
 let qqa=null;
 if(qualityReview===undefined)add("review-required",
  "Strict pairing requires complete P60-C SHA-bound independent review; no external factual certification is implied");
 else{
  qqa=auditQuestionQuality(reviewed,reviewedInput.raw,qualityReview);
  if(!qqa.readyForPublication)
   for(const issue of qqa.issues.items.filter(x=>x.severity==="error").slice(0,12))
    add("review-"+issue.code,issue.message);
  if(!qqa.readyForPublication&&!qqa.issues.items.some(x=>x.severity==="error"))
   add("review-invalid","Review check failed or is incomplete");
 }
 let packages=null,comparison=null;
 try{
  packages=compilePair(source,reviewed,validation.rows,changes,a,b);
  const ref=createSourceKeyReference(packages.reviewedPkg,packages.sourcePkg);
  const lineage=createSourceReviewReference(packages.reviewedPkg,packages.sourcePkg);
  comparison={total:packages.reviewedPkg.questions.length,
   comparable:ref?.entries.filter(x=>x.comparable).length??0,
   unavailable:packages.reviewedPkg.questions.length-(ref?.entries.filter(x=>x.comparable).length??0),
   frozenSourceReviewAvailable:Boolean(lineage),
   mode:"conservative-semantic-only; source-key score is not a substitute for reviewed score"};
 }catch(error){add("pair-publication-invalid",error instanceof Error?error.message:"Invalid paired publication");}
 const errorCount=sumErrors(issues),valid=errorCount===0;
 return {valid,readyForPublication:valid,issues,changes,hashes,packages,comparison,
  reviewAssurance:qqa?.reviewAssurance??"not-performed",
  factualVerification:"not-performed",externalSourceFetches:0,
  originalOriginClaims:[...new Set(source.questions.map(q=>q.provenance?.kind??"unspecified"))],
  reviewedQaWarnings:reviewedQA.issues.filter(i=>i.severity==="warning").length,
  examId:source.examId,paperId:source.paperId,sourceRevision:source.revision,
  reviewedRevision:reviewed.revision};
}
function publicAudit(result,offset=0,limit=12){
 const changed=result.changes.map(x=>({questionId:x.questionId,changedFields:x.changedFields}));
 return {format:"practice-desk-edition-pair-audit",version:1,
  valid:result.valid,readyForPublication:result.readyForPublication,
  examId:result.examId,paperId:result.paperId,
  sourceRevision:result.sourceRevision,reviewedRevision:result.reviewedRevision,
  ...result.hashes,changes:{total:changed.length,shown:changed.slice(0,12),
   remaining:Math.max(0,changed.length-12)},
  sourceKeyComparison:result.comparison,reviewAssurance:result.reviewAssurance,
  factualVerification:result.factualVerification,externalSourceFetches:0,
  originalOriginClaims:result.originalOriginClaims,
  reviewedQaWarnings:result.reviewedQaWarnings,
  issues:{total:result.issues.length,blocking:sumErrors(result.issues),offset,limit,
   nextOffset:offset+limit<result.issues.length?offset+limit:null,
   remaining:Math.max(0,result.issues.length-offset-limit),
   items:result.issues.slice(offset,offset+limit)}};
}
function createLineage(result,decisions,sourceInput,reviewedInput){
 const rows=new Map(decisions.entries.map(x=>[x.questionId,x]));
 const items=result.changes.map(x=>{
  const decision=rows.get(x.questionId);
  return {...x,disposition:decision.disposition,reason:decision.reason,
   evidence:decision.evidence};
 });
 const sourcePkg=result.packages.sourcePkg,reviewedPkg=result.packages.reviewedPkg;
 return {format:LINEAGE_FORMAT,version:1,
  examId:result.examId,paperId:result.paperId,
  originalSha256:sourceInput.sha256,reviewedSha256:reviewedInput.sha256,
  sourcePaperRevisionId:sourcePkg.paper.id,
  sourceAnswerKeyRevisionId:sourcePkg.answerKey.id,
  reviewedPaperRevisionId:reviewedPkg.paper.id,
  reviewedAnswerKeyRevisionId:reviewedPkg.answerKey.id,
  questionCount:sourcePkg.questions.length,entries:items,
  sourceKeyComparison:result.comparison,
  editorialStatus:"source-preserved-reviewed-claimed-not-authenticated",
  factualVerification:"not-performed",externalSourceFetches:0,
  reviewAssurance:result.reviewAssurance,
  sourceFile:"original-source.json",reviewedSourceFile:"reviewed-source.json",
  sourcePackageFile:"source.exam.json",reviewedPackageFile:"reviewed.exam.json"};
}
async function publish(dir,result,decisions,sourceInput,reviewedInput){
 if(!result.valid||!result.packages)throw Error("Cannot publish incomplete or unverified editorial record");
 const target=resolve(dir);
 const files=[
  ["original-source.json",sourceInput.raw],
  ["reviewed-source.json",reviewedInput.raw],
  ["source.exam.json",JSON.stringify(result.packages.sourcePkg,null,2)+"\n"],
  ["reviewed.exam.json",JSON.stringify(result.packages.reviewedPkg,null,2)+"\n"],
  ["editorial-lineage.json",JSON.stringify(createLineage(result,decisions,sourceInput,reviewedInput),null,2)+"\n"]
 ];
 await mkdir(target); // Exclusive fresh directory; never overwrite existing user data.
 try{
  for(const [name,text] of files)await writeFile(join(target,name),text,{flag:"wx"});
 }catch(e){await rm(target,{recursive:true,force:true});throw e;}
 return {directory:target,files:files.map(x=>x[0]),compiled:true};
}
const usage="Usage: editorial-editions.mjs template <original.json> <reviewed.json> | audit <original.json> <reviewed.json> <decisions.json> [--quality-review review.json] [--offset N --limit 1..50] | compile <original.json> <reviewed.json> <decisions.json> <NEW_DIRECTORY> --quality-review <review.json>";
const emit=value=>process.stdout.write(JSON.stringify(value,null,2)+"\n");
function error(e){process.stderr.write(JSON.stringify({valid:false,readyForPublication:false,
 code:BAD_INPUT,message:e instanceof Error?e.message:"Unknown error"},null,2)+"\n");process.exitCode=2;}
async function main(){
 const [op,...args]=process.argv.slice(2);
 if(!["template","audit","compile"].includes(op))throw Error(usage);
 if(op==="template"&&args.length!==2)throw Error(usage);
 if(op!=="template"&&args.length<(op==="compile"?5:3))throw Error(usage);
 const original=await load(args[0],MAX_SOURCE_BYTES,"Original source"),
  reviewed=await load(args[1],MAX_SOURCE_BYTES,"Reviewed source");
 const {a,b}=assertPair(original.data,reviewed.data);
 if(op==="template"){emit(template(original.data,reviewed.data,original.sha256,reviewed.sha256));return;}
 let reviewPath=null,offset=0,limit=12;
 const remaining=args.slice(op==="compile"?4:3);
 for(let i=0;i<remaining.length;i+=2){
  const key=remaining[i],value=remaining[i+1];
  if(!value)throw Error(usage);
  if(key==="--quality-review"){
   if(reviewPath)throw Error("Repeated quality-review option");
   reviewPath=value;
  }else if(key==="--offset"||key==="--limit"){
   const n=Number(value);
   if(!Number.isSafeInteger(n)||(key==="--offset"?n<0||n>1000000:n<1||n>50))
    throw Error("Invalid "+key);
   if(key==="--offset")offset=n;else limit=n;
  }else throw Error(usage);
 }
 if(op==="compile"&&!reviewPath)throw Error("compile requires a P60-C --quality-review file");
 const decisionData=(await load(args[2],MAX_DECISIONS_BYTES,"Editorial decisions")).data;
 const review=reviewPath?(await load(reviewPath,MAX_REVIEW_BYTES,"P60-C independent review")).data:undefined;
 const result=inspectPair(original,reviewed,decisionData,review);
 const summary=publicAudit(result,offset,limit);
 if(op==="audit"){emit(summary);if(!result.valid)process.exitCode=1;return;}
 if(!result.valid){emit({...summary,compiled:false});process.exitCode=1;return;}
 const published=await publish(args[3],result,decisionData,original,reviewed);
 emit({...summary,...published});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main()}catch(e){error(e)}
}
export {template as editorialDecisionTemplate,inspectPair as inspectEditorialPair};
