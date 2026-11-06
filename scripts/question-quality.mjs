#!/usr/bin/env node
/** P60-C: source-bound, candidate-blind, model-agnostic question-quality review.
 * This NEVER fetches, independently authenticates, or fact-checks source URLs.
 * Recorded AI/human review is an unverified assertion of work performed.
 * Canonical schema/scorer/candidate leak defects still come from P57/P60-C QA.
 */
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {candidateFields} from "../src/authoring/candidate-integrity.ts";
import {publicationPlainText} from "../src/authoring/authoring-publisher.ts";

export const QUALITY_CHECKLIST=Object.freeze([
 ["syllabus-relevance","Exam, subject, topic and syllabus alignment"],
 ["difficulty-calibration","Expected difficulty and examination construct"],
 ["stem-construction","Well-formed, complete and grammatically sound stem"],
 ["task-unambiguous","Single intelligible task, assumptions and jurisdiction"],
 ["one-defensible-answer","Only the declared correct response under assumptions"],
 ["option-distinctness","Distinct noncontradictory response alternatives"],
 ["distractor-quality","Plausible distractors test real misconceptions"],
 ["answer-leakage","No correct option/key or solution disclosed to candidate"],
 ["unintended-hints","No grammatical, mathematical, visual or verbal shortcuts"],
 ["mathematical-correctness","Exact calculations, tolerance, units, rounding and boundary"],
 ["reasoning-correctness","Independent logical derivation and alternative solutions"],
 ["factual-correctness","Primary/reference source correctness and exceptions"],
 ["temporal-correctness","As-of date, applicable statute, amendment and data period"],
 ["pyq-fidelity","Official source, year, item and wording identity for claimed PYQ"],
 ["explanation-quality","Reasoning and all viable distractor justifications"],
 ["internal-consistency","Key, options, stem, rationale and source consistent"],
 ["cognitive-diversity","Requested recall, understanding and application mix"],
 ["duplication","No inappropriate duplicate or near-duplicate in intended set"],
 ["blueprint-coverage","Requested coverage and topic/difficulty allocation met"],
 ["candidate-view-integrity","Actual candidate UI conceals answers and author notes"]
 ].map(([id,description])=>({id,description})));
const ids=new Set(QUALITY_CHECKLIST.map(c=>c.id));
const sha=s=>createHash("sha256").update(s).digest("hex");
const MAX_SOURCE=25*1024*1024,MAX_REVIEW=3*1024*1024,MAX_ROWS=200;
const idPattern=/^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const hashPattern=/^[a-f0-9]{64}$/;
const allowedChecks=new Set(["pass","fail","not-reviewed","not-applicable"]);
// N/A is valid only for a genuinely inapplicable construct; mandatory checks require PASS.
const CONDITIONAL_CHECKS=new Set(["option-distinctness","distractor-quality",
 "mathematical-correctness","temporal-correctness","pyq-fidelity"]);
const requiresCheck=(id,q,timeSensitive)=>{
 if(!CONDITIONAL_CHECKS.has(id))return true;
 if(id==="option-distinctness")return ["single-choice","multiple-select","matching"].includes(q.kind);
 if(id==="distractor-quality")return ["single-choice","multiple-select"].includes(q.kind);
 if(id==="mathematical-correctness")return q.kind==="numeric-entry"||
  /(?:\\(?:frac|sqrt|sum|int)|\b(?:calculate|evaluate|compute|percent|ratio|equation)\b|[+×÷=])/iu.test(publicationPlainText(q.prompt));
 if(id==="temporal-correctness")return timeSensitive;
 if(id==="pyq-fidelity")return q.provenance?.kind==="official-pyq";
 return true;
};
const allowedBasis=new Set(["independent-editorial","mathematical-proof","source-consulted","rendered-claim","human-claim"]);
const emit=x=>process.stdout.write(JSON.stringify(x,null,2)+"\n");
const fail=message=>{throw Error(message);};
const object=(raw,label,keys)=>{
 if(!raw||typeof raw!=="object"||Array.isArray(raw)||
  Object.getPrototypeOf(raw)!==Object.prototype)fail(label+" must be a plain JSON object");
 for(const k of Object.keys(raw))if(!keys.includes(k))fail(label+": unknown field "+k);
 return raw;
};
const array=(x,label,max=MAX_ROWS,min=0)=>{
 if(!Array.isArray(x)||x.length<min||x.length>max)fail(label+" must have "+min+".."+max+" items");
 return x;
};
const string=(v,label,max=400)=>{
 if(typeof v!=="string"||!v.trim()||v!==v.trim()||v.length>max||/[\u0000-\u001f\u007f]/u.test(v))
  fail(label+" must be nonempty trimmed printable text (max "+max+")");
 return v;
};
const digest=(v,label)=>{if(typeof v!=="string"||!hashPattern.test(v))fail("Invalid SHA-256 "+label);return v;};
const date=(v,label)=>{
 string(v,label,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+"T00:00:00Z"))||
  new Date(v+"T00:00:00Z").toISOString().slice(0,10)!==v)
  fail("Invalid ISO date "+label);
 return v;
};
const parseFile=async(path,limit,label)=>{
 const raw=await readFile(path,"utf8");
 if(Buffer.byteLength(raw,"utf8")>limit)fail(label+" exceeds "+limit+" bytes");
 return {raw,value:JSON.parse(raw)};
};
function candidateProjection(draft,q){
 const fields=candidateFields(draft,q);
 const result={
  questionId:q.id,kind:q.kind,physicalSection:q.section,
  prompt:publicationPlainText(q.prompt),
  choices:(q.kind==="single-choice"||q.kind==="multiple-select")?
   q.options.map((v,i)=>({label:"ABCD"[i],text:publicationPlainText(v)})):[],
  matching:q.kind==="matching"?{
   left:q.leftItems.map(v=>publicationPlainText(v)),right:q.rightItems.map(v=>publicationPlainText(v))}:null,
  candidateContext:fields.filter(f=>f.field.startsWith("stimulus.")||f.field.startsWith("media.")),
  hasVisualMaterial:fields.some(f=>f.field.includes("altText"))||
   (q.kind==="matching"?false:false),
  note:"Text-only blind packet; visually inspect any referenced figures and actual candidate rendering independently."
 };
 return {...result,candidateSha256:sha(JSON.stringify(result))};
}
function keyEquals(kind,proposed,actual,tolerance=0){
 if(typeof proposed!=="string"||typeof actual!=="string")return false;
 if(kind==="free-response")return false;
 if(kind==="numeric-entry"){
  const tokens=s=>s.split(",").map(x=>x.trim());
  const left=tokens(proposed),right=tokens(actual);
  if(left.length!==right.length||left.some(x=>!x)||right.some(x=>!x))return false;
  const a=left.map(Number).sort((x,y)=>x-y),b=right.map(Number).sort((x,y)=>x-y);
  return a.every(Number.isFinite)&&b.every(Number.isFinite)&&
   a.every((x,i)=>Math.abs(x-b[i])<=tolerance);
 }
 if(kind==="multiple-select")return proposed.replace(/[\s,;+]/g,"").toUpperCase().split("").sort().join("")===
  actual.replace(/[\s,;+]/g,"").toUpperCase().split("").sort().join("");
 if(kind==="matching"){
  const norm=s=>s.toUpperCase().replace(/\s+/g,"").split(",").sort().join(",");
  return norm(proposed)===norm(actual);
 }
 return proposed.trim().toUpperCase()===actual.trim().toUpperCase();
}
function parseReview(raw){
 const r=object(raw,"review",["format","version","bankId","sourceSha256","records"]);
 if(r.format!=="practice-desk-quality-review"||r.version!==1)fail("Expected practice-desk-quality-review v1");
 string(r.bankId,"review.bankId",80);digest(r.sourceSha256,"review.sourceSha256");
 const seen=new Set();
 for(const entry of array(r.records,"review.records")){
  object(entry,"review record",["questionId","questionSha256","candidateSha256","reviewer","independentSolution","checks","evidence"]);
  string(entry.questionId,"questionId",80);
  if(!idPattern.test(entry.questionId))fail("Invalid question ID");
  if(seen.has(entry.questionId))fail("Duplicate review question ID");
  seen.add(entry.questionId);
  digest(entry.questionSha256,"review question");
  digest(entry.candidateSha256,"candidate projection");
  const actor=object(entry.reviewer,"reviewer",["id","kind"]);
  string(actor.id,"reviewer.id",100);
  if(!["ai","human"].includes(actor.kind))fail("Reviewer kind must be ai or human");
  const solved=object(entry.independentSolution,"independentSolution",
   ["blindClaim","answer","reasoning"]);
  if(solved.blindClaim!==true)fail("Independent reviewer must explicitly state blind claim");
  if(typeof solved.answer!=="string"||solved.answer.length>200)fail("Invalid independent answer");
  string(solved.reasoning,"independent reasoning",2500);
  const labels=new Set();
  for(const check of array(entry.checks,"checks",20,20)){
   object(check,"review check",["id","status","basis","rationale"]);
   if(!ids.has(check.id)||labels.has(check.id))fail("Unknown or duplicate checklist id");
   labels.add(check.id);
   if(!allowedChecks.has(check.status))fail("Unknown checklist status");
   if(!allowedBasis.has(check.basis))fail("Unknown review basis");
   string(check.rationale,"review rationale",1000);
  }
  for(const e of array(entry.evidence??[],"evidence",15)){
   object(e,"evidence",["publisher","title","locator","url","retrievedAt","excerpt","asOfDate"]);
   string(e.publisher,"evidence publisher",180);
   string(e.title,"evidence title",240);
   string(e.locator,"evidence locator",240);
   date(e.retrievedAt,"retrievedAt");
   if(e.asOfDate!==undefined)date(e.asOfDate,"asOfDate");
   string(e.excerpt,"evidence excerpt",650);
   if(e.url!==undefined){
    string(e.url,"evidence.url",2048);
    if(!/^https:\/\/[^\s/@]+(?::\d+)?(?:\/[^\s]*)?$/i.test(e.url))
     fail("Evidence URL must be HTTPS without credentials");
   }
  }
 }
 return r;
}
export function auditQuestionQuality(source,sourceRaw,reviewRaw=undefined,{offset=0,limit=12}={}){
 const report=inspectExternalQuestionBank(source);
 const issues=[];
 const add=(code,message,questionId=undefined,basis="deterministic")=>
  issues.push({code,severity:"error",basis,message,...(questionId?{questionId}:{})});
 const qualityIssues=report.issues??[];
 for(const q of qualityIssues){
  if(q.severity==="error")add("canonical-"+q.code,q.message,q.questionId);
  else if(q.severity==="warning")
   issues.push({code:"canonical-"+q.code,severity:"warning",
    basis:q.basis??"heuristic",message:q.message,...(q.questionId?{questionId:q.questionId}:{})});
 }
 const validSource=Boolean(report.valid);
 if(!validSource&&(!Array.isArray(source?.questions)||!source.questions.length)){
  return {format:"practice-desk-question-quality-audit",version:1,valid:false,readyForPublication:false,
   sourceSha256:sha(sourceRaw),factualVerification:"not-performed",externalSourceFetches:0,
   checklist:QUALITY_CHECKLIST,questionsMissingReview:0,
   issues:{total:issues.length||1,offset,limit,items:issues.slice(offset,offset+limit),
    nextOffset:offset+limit<issues.length?offset+limit:null}};
 }
 const bankId=source.bankId,sourceHash=sha(sourceRaw);
 let draft;
 try{draft=toAuthoringDraft(source);}catch(e){
  add("source-invalid","Canonical source cannot be parsed: "+(e instanceof Error?e.message:"invalid"));
  return {format:"practice-desk-question-quality-audit",version:1,valid:false,readyForPublication:false,
   sourceSha256:sourceHash,factualVerification:"not-performed",externalSourceFetches:0,
   checklist:QUALITY_CHECKLIST,questionsMissingReview:0,
   issues:{total:issues.length,offset,limit,items:issues.slice(offset,offset+limit),
    nextOffset:offset+limit<issues.length?offset+limit:null}};
 }
 const projections=new Map(draft.questions.map(q=>[q.id,candidateProjection(draft,q)]));
 let review=null;
 if(reviewRaw!==undefined){
  try{review=parseReview(reviewRaw);}
  catch(e){add("review-invalid","Invalid independent review record: "+(e instanceof Error?e.message:"invalid"));}
  if(review){
   if(review.bankId!==bankId||review.sourceSha256!==sourceHash)
    add("review-stale","Review bank or source digest differs from current source");
  }
 }
 const indexed=new Map(review?.records.map(r=>[r.questionId,r])??[]);
 let missing=0,asserted=0,reportedEvidence=0;
 for(let i=0;i<draft.questions.length;i++){
  const q=draft.questions[i],sourceQuestion=source.questions[i],item=indexed.get(q.id);
  if(!item){
   missing++;add("review-missing","No independent review record for question",q.id,"not-performed");continue;
  }
  const expectedQuestionHash=sha(JSON.stringify(sourceQuestion));
  if(item.questionSha256!==expectedQuestionHash||
   item.candidateSha256!==projections.get(q.id).candidateSha256){
   add("review-stale","Review question or blind candidate view changed",q.id);continue;
  }
  asserted++;reportedEvidence+=item.evidence?.length??0;
  if(q.kind!=="free-response"&&!keyEquals(q.kind,item.independentSolution.answer,q.answer,q.tolerance??0))
   add("independent-key-disagreement","Blind-review answer disagrees with authored key",q.id,"reviewer-claimed");
  // Reviewer claims are validated for applicability before they can permit publication.
  const visibleStem=publicationPlainText(q.prompt)+" "+publicationPlainText(q.explanation);
  const timeSensitive=/(?:\b(?:Act|Code|Rules|Regulations|Gazette|Notification)\b(?:\s+[A-Za-z&\x27-]+){0,8}\s*,?\s*(?:19|20)\d{2}\b|\b(?:commenc(?:ed|ement)|amend(?:ed|ment)|section\s+\d+|effective\s+(?:from|on)|as[- ]of\s+\d{4}|latest|current\s+(?:rate|rule|law|figure))\b)/iu.test(visibleStem);
  const map=new Map(item.checks.map(x=>[x.id,x]));
  for(const c of QUALITY_CHECKLIST){
   const check=map.get(c.id);
   if(!check||check.status==="fail"||check.status==="not-reviewed"||
    (check.status==="not-applicable"&&requiresCheck(c.id,q,timeSensitive)))
    add("review-check-unresolved","Quality checklist not satisfied: "+c.id,q.id,"reviewer-claimed");
  }
  // All evidence, sources and independent solving remain reviewer-attributed, not authenticated.
  const facts=map.get("factual-correctness"),temporal=map.get("temporal-correctness"),
   pyq=map.get("pyq-fidelity"),visual=map.get("candidate-view-integrity");
  const consulted=(name,check)=>{
   if(check?.status!=="pass")return;
   if(check.basis!=="source-consulted")
    add("source-check-basis-invalid","Source-backed pass requires source-consulted basis: "+name,q.id,"reviewer-claimed");
   if(!item.evidence?.length)
    add("review-evidence-missing","No locatable source extract recorded: "+name,q.id,"reviewer-claimed");
  };
  if(facts?.status==="pass"&&!["mathematical-proof","source-consulted"].includes(facts.basis))
   add("factual-basis-invalid","Factual correctness requires source consultation or mathematical proof",q.id,"reviewer-claimed");
  if(facts?.status==="pass"&&facts.basis==="source-consulted"&&!item.evidence?.length)
   add("review-evidence-missing","No source extract recorded for factual correctness",q.id,"reviewer-claimed");
  if(timeSensitive){
   if(facts?.status==="pass"&&facts.basis!=="source-consulted")
    add("legal-source-required","A time-sensitive legal assertion needs source corroboration",q.id,"reviewer-claimed");
   if(temporal?.status!=="pass")
    add("temporal-check-required","Time-sensitive legal question needs currentness review",q.id,"reviewer-claimed");
   consulted("temporal-correctness",temporal);
   if(!item.evidence?.some(e=>e.asOfDate))
    add("legal-asof-evidence-required","Legal review must record an as-of date",q.id,"reviewer-claimed");
  }else if(temporal?.status==="pass"&&temporal.basis==="source-consulted")consulted("temporal-correctness",temporal);
  if(q.provenance?.kind==="official-pyq"){
   if(pyq?.status!=="pass")add("pyq-source-check-required","Official PYQ claim requires affirmative source review",q.id,"reviewer-claimed");
   consulted("pyq-fidelity",pyq);
  }else if(pyq?.status==="pass"&&pyq.basis==="source-consulted")consulted("pyq-fidelity",pyq);
  if(visual?.status==="pass"&&visual.basis!=="rendered-claim")
   add("candidate-render-claim-required","Candidate-view integrity needs an actual-render inspection claim",q.id,"reviewer-claimed");
 }
 if(review)for(const record of review.records){
  if(!projections.has(record.questionId))
   add("review-unknown-question","Review references a question absent from the audited source",record.questionId);
 }
 const blockingIssueCount=issues.filter(x=>x.severity==="error").length;
 const warningIssueCount=issues.length-blockingIssueCount;
 const ready=validSource&&review!==null&&missing===0&&blockingIssueCount===0;
 const count=issues.length;
 return {format:"practice-desk-question-quality-audit",version:1,valid:ready,
  readyForPublication:ready,sourceSha256:sourceHash,bankId,
  questionCount:draft.questions.length,questionsMissingReview:missing,assertedReviews:asserted,
  blockingIssueCount,warningIssueCount,
  reviewAssurance:review?"recorded-self-attestation-not-authenticated":"not-performed",
  factualVerification:"not-performed",externalSourceFetches:0,
  sourceEvidenceClaims:reportedEvidence,
  renderedCandidateUI:"not-performed",
  checklist:QUALITY_CHECKLIST,
  canonical:{valid:report.valid,errors:qualityIssues.filter(x=>x.severity==="error").length,
   warnings:qualityIssues.filter(x=>x.severity==="warning").length,
   factualVerification:"not-performed"},
  issues:{offset,limit,total:count,nextOffset:offset+limit<count?offset+limit:null,
   remaining:Math.max(0,count-offset-limit),items:issues.slice(offset,offset+limit)}};
}
const usage="Usage: question-quality.mjs checklist | candidate <source.json> [--offset N --limit 1..20] | template <source.json> [--offset N --limit 1..20] | audit <source.json> [--review <review.json>] [--offset N --limit 1..50]";
const throwResult=(e)=>{
 process.stderr.write(JSON.stringify({valid:false,readyForPublication:false,code:"quality-input-invalid",
  message:e instanceof Error?e.message:"Unknown error"},null,2)+"\n");
 process.exitCode=2;
};
async function main(){
 const [op,...args]=process.argv.slice(2);
 if(op==="checklist"){
  if(args.length)fail(usage);
  emit({format:"practice-desk-quality-checklist",version:1,checklist:QUALITY_CHECKLIST,
   note:"AI editorial judgments are not source-authenticated by this offline checker."});
  return;
 }
 if(!["candidate","template","audit"].includes(op)||!args.length)fail(usage);
 const sourceFile=args[0],flags=args.slice(1);
 let offset=0,limit=op==="audit"?12:10,reviewPath=null;
 for(let i=0;i<flags.length;i+=2){
  const k=flags[i],v=flags[i+1];
  if(v===undefined)fail(usage);
  if(k==="--review"&&op==="audit"){
   if(reviewPath)fail("Repeated --review");
   reviewPath=v;
  }else if(k==="--offset"||k==="--limit"){
   const n=Number(v);
   if(!Number.isSafeInteger(n)||(k==="--offset"?(n<0||n>500):(n<1||n>(op==="audit"?50:20))))
    fail("Invalid "+k+" value");
   if(k==="--offset")offset=n;else limit=n;
  }else fail(usage);
 }
 const {raw,value}=await parseFile(sourceFile,MAX_SOURCE,"Source");
 if(op==="candidate"||op==="template"){
  // Canonical v1 parser, without requiring a question already to pass all QA.
  const draft=toAuthoringDraft(value);
  const items=draft.questions.slice(offset,offset+limit).map(q=>{
   const item=candidateProjection(draft,q);
   return {...item,questionSha256:sha(JSON.stringify(value.questions.find(x=>x.id===q.id)))};
  });
  if(op==="template"){
   emit({format:"practice-desk-quality-review",version:1,
    bankId:value.bankId,sourceSha256:sha(raw),
    records:items.map(item=>({
     questionId:item.questionId,questionSha256:item.questionSha256,
     candidateSha256:item.candidateSha256,
     reviewer:{id:"REPLACE_REVIEWER",kind:"ai"},
     independentSolution:{blindClaim:false,answer:"",
      reasoning:"Pending blind independent solution"},
     checks:QUALITY_CHECKLIST.map(x=>({id:x.id,status:"not-reviewed",
      basis:"independent-editorial",rationale:"Pending independent assessment"})),
     evidence:[]
    })),
    templateIncomplete:true,offset,limit,
    warning:"Incomplete template; never self-certifies review. Merge fully assessed records for all source questions, after blinded solving and actual source research."});
   return;
  }
  emit({format:"practice-desk-blind-candidates",version:1,bankId:value.bankId,
   sourceSha256:sha(raw),total:draft.questions.length,offset,limit,
   nextOffset:offset+limit<draft.questions.length?offset+limit:null,items,
   factualVerification:"not-performed",
   warning:"Candidate text/alt-only review does not replace viewing actual image pixels and rendered UI."});
  return;
 }
 const reviewRaw=reviewPath?(await parseFile(reviewPath,MAX_REVIEW,"Review")).value:undefined;
 const result=auditQuestionQuality(value,raw,reviewRaw,{offset,limit});
 emit(result);
 if(!result.valid)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}catch(e){throwResult(e);}
}
