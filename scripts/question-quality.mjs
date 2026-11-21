#!/usr/bin/env node
/** P60-C: layered, source-bound, model-agnostic question-quality review.
 * This NEVER fetches, independently authenticates, or fact-checks source URLs.
 * Recorded AI/human review mode and evidence remain unverified assertions of work performed.
 * Canonical schema/scorer/candidate leak defects still come from P57/P60-C QA.
 */
import {readFile,writeFile,mkdir,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {candidateFields} from "../src/authoring/candidate-integrity.ts";
import {publicationPlainText} from "../src/authoring/authoring-publisher.ts";

export const SEMANTIC_CHECKLIST=Object.freeze([
 ["exam-relevance","Exam/syllabus relevance and appropriate item-level difficulty/construct"],
 ["clarity-defensibility","Well-formed unambiguous task with sufficient assumptions and one defensible response"],
 ["distractor-quality","Plausible distractors test meaningful misconceptions rather than wording tricks"],
 ["reasoning-correctness","Second-pass reasoning supports the keyed response and relevant alternatives"],
 ["factual-correctness","Factual claims, exceptions and jurisdiction are correct on the recorded evidence basis"],
 ["explanation-quality","Explanation correctly justifies the response and resolves useful distinctions"],
 ["mathematical-correctness","Calculations, units, tolerance, rounding and boundary conditions are correct"],
 ["temporal-correctness","Applicable law/data is current for the declared as-of date"],
 ["pyq-fidelity","Claimed official PYQ provenance, year and item fidelity are supported"],
 ["visual-integrity","Required visual material was actually inspected and does not create a misleading or answer-bearing cue"]
 ].map(([id,description])=>({id,description})));
export const BANK_CHECKLIST=Object.freeze([
 ["coverage-balance","Bank-level syllabus/blueprint coverage is appropriate for the intended paper"],
 ["difficulty-distribution","Overall difficulty distribution matches the intended examination or practice purpose"],
 ["cognitive-diversity","Recall, understanding, application and reasoning are appropriately balanced"],
 ["duplication-diversity","The bank avoids excessive semantic repetition and overconcentration"],
 ["style-consistency","Wording, option style and editorial conventions are coherent across the bank"],
 ["exam-fidelity","As a whole, the bank plausibly represents the intended exam or declared practice objective"]
 ].map(([id,description])=>({id,description})));
export const QUALITY_COVERAGE_MAP=Object.freeze([
 {dimension:"syllabus-relevance",layer:"semantic",coveredBy:["exam-relevance","coverage-balance"]},
 {dimension:"difficulty-calibration",layer:"semantic+bank",coveredBy:["exam-relevance","difficulty-distribution"]},
 {dimension:"stem-construction",layer:"semantic",coveredBy:["clarity-defensibility"]},
 {dimension:"task-unambiguous",layer:"semantic",coveredBy:["clarity-defensibility"]},
 {dimension:"one-defensible-answer",layer:"semantic+deterministic",coveredBy:["clarity-defensibility","review-solution-reconciliation"]},
 {dimension:"option-distinctness",layer:"deterministic",coveredBy:["canonical-option-structure"]},
 {dimension:"distractor-quality",layer:"semantic",coveredBy:["distractor-quality"]},
 {dimension:"answer-leakage",layer:"deterministic",coveredBy:["candidate-integrity"]},
 {dimension:"unintended-hints",layer:"deterministic+semantic",coveredBy:["candidate-hint-detectors","clarity-defensibility"]},
 {dimension:"mathematical-correctness",layer:"conditional-semantic",coveredBy:["mathematical-correctness"]},
 {dimension:"reasoning-correctness",layer:"semantic",coveredBy:["reasoning-correctness"]},
 {dimension:"factual-correctness",layer:"semantic",coveredBy:["factual-correctness"]},
 {dimension:"temporal-correctness",layer:"conditional-semantic",coveredBy:["temporal-correctness","dated-evidence"]},
 {dimension:"pyq-fidelity",layer:"conditional-semantic",coveredBy:["pyq-fidelity","locatable-source-evidence"]},
 {dimension:"explanation-quality",layer:"semantic",coveredBy:["explanation-quality"]},
 {dimension:"internal-consistency",layer:"deterministic+semantic",coveredBy:["canonical-source-validation","review-solution-reconciliation","clarity-defensibility"]},
 {dimension:"cognitive-diversity",layer:"bank",coveredBy:["cognitive-diversity"]},
 {dimension:"duplication",layer:"deterministic+bank",coveredBy:["duplicate-candidate-detection","duplication-diversity"]},
 {dimension:"blueprint-coverage",layer:"deterministic+bank",coveredBy:["content-blueprint-audit","coverage-balance"]},
 {dimension:"candidate-view-integrity",layer:"deterministic+conditional-semantic",coveredBy:["candidate-integrity","visual-integrity"]}
]);
const semanticIds=new Set(SEMANTIC_CHECKLIST.map(c=>c.id));
const bankIds=new Set(BANK_CHECKLIST.map(c=>c.id));
const SEMANTIC_CORE=new Set(["exam-relevance","clarity-defensibility","reasoning-correctness","factual-correctness","explanation-quality"]);
const REVIEW_MODES=new Set(["self-review","clean-context","independent-agent"]);
const sha=s=>createHash("sha256").update(s).digest("hex");
const MAX_SOURCE=25*1024*1024,MAX_REVIEW=3*1024*1024,MAX_ROWS=200;
const idPattern=/^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const hashPattern=/^[a-f0-9]{64}$/;
const allowedChecks=new Set(["pass","fail","not-reviewed"]);
const allowedSemanticBasis=new Set(["semantic-editorial","mathematical-proof","source-consulted","rendered-claim","human-claim"]);
const allowedBankBasis=new Set(["bank-editorial","blueprint-audit","source-consulted","human-claim"]);
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
const optionLabel=index=>String.fromCharCode(65+index);
function candidateReferenceProjection(draft){
 return (draft.references??[]).map(reference=>({
  id:reference.id,title:reference.title,
  ...(reference.category?{category:reference.category}:{}),
  ...(reference.keywords?.length?{keywords:reference.keywords}:{}),
  content:publicationPlainText(reference.document),
  mediaAlt:(reference.assetIds??[]).map(id=>{
   const asset=draft.assets.find(item=>item.id===id);
   return {id,altText:asset?.altText??""};
  })
 }));
}
function candidateProjection(draft,q){
 const fields=candidateFields(draft,q),referenceContext=candidateReferenceProjection(draft);
 const result={
  questionId:q.id,kind:q.kind,physicalSection:q.section,
  prompt:publicationPlainText(q.prompt),
  choices:(q.kind==="single-choice"||q.kind==="multiple-select")?
   q.options.map((v,i)=>({label:optionLabel(i),text:publicationPlainText(v)})):[],
  matching:q.kind==="matching"?{
   left:q.leftItems.map(v=>publicationPlainText(v)),right:q.rightItems.map(v=>publicationPlainText(v))}:null,
  candidateContext:fields.filter(f=>f.field.startsWith("stimulus.")||f.field.startsWith("media.")),
  ...(referenceContext.length?{candidateReferencesSha256:sha(JSON.stringify(referenceContext))}:{}),
  hasVisualMaterial:fields.some(f=>f.field.includes("altText")),
  note:"Answer-hidden candidate-only packet; inspect the shared candidate references and any referenced visual material when review requires it."
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

// Heuristics are corroborative only. Every reviewer explicitly classifies
// applicability; source URLs and these classifications are not authenticated.
function inferredApplicability(q,draft){
 const text=publicationPlainText(q.prompt)+" "+publicationPlainText(q.explanation);
 const stimulus=(draft.stimuli??[]).find(s=>s.id===q.stimulusRef);
 const context=text+" "+(stimulus?JSON.stringify(stimulus):"");
 return {
  mathematical:q.kind==="numeric-entry"||
   /(?:\\(?:frac|sqrt|sum|int)|\b(?:calculate|evaluate|compute|percent|ratio|equation|remainder|multiply|divide)\b|\b\d+\s*[+×÷/=−-]\s*\d+\b)/iu.test(context),
  legal:/\b(?:Act|Code|Rules|Regulations|Gazette|Notification|statutory|statute|legislation|section\s+\d+|rule\s+\d+)\b/iu.test(context),
  timeSensitive:/(?:\b(?:Act|Code|Rules|Regulations|Gazette|Notification)\b(?:\s+[A-Za-z&'-]+){0,8}\s*,?\s*(?:19|20)\d{2}\b|\b(?:commenc(?:ed|ement)|amend(?:ed|ment)|section\s+\d+|effective\s+(?:from|on)|as[- ]of\s+\d{4}|latest|current\s+(?:rate|rule|law|figure))\b)/iu.test(context)
 };
}
const DECLARATION_VALUES=new Set(["yes","no","pending"]);
function parseApplicability(raw){
 const a=object(raw,"review applicability",["mathematical","legal","timeSensitive","visual","asOfDate"]);
 for(const key of ["mathematical","legal","timeSensitive","visual"])
  if(!DECLARATION_VALUES.has(a[key]))fail("review applicability."+key+": declare yes, no or pending");
 if(!Object.hasOwn(a,"asOfDate"))fail("review applicability.asOfDate: explicit null or ISO date required");
 if(a.asOfDate!==null)date(a.asOfDate,"review applicability.asOfDate");
 return a;
}

function parseEvidence(raw){
 for(const e of array(raw??[],"evidence",15)){
  object(e,"evidence",["publisher","title","locator","url","retrievedAt","excerpt","asOfDate"]);
  string(e.publisher,"evidence publisher",180);string(e.title,"evidence title",240);
  string(e.locator,"evidence locator",240);date(e.retrievedAt,"retrievedAt");
  if(e.asOfDate!==undefined)date(e.asOfDate,"asOfDate");
  string(e.excerpt,"evidence excerpt",650);
  if(e.url!==undefined){
   string(e.url,"evidence.url",2048);
   if(!/^https:\/\/[^\s/@]+(?::\d+)?(?:\/[^\s]*)?$/i.test(e.url))
    fail("Evidence URL must be HTTPS without credentials");
  }
 }
 return raw??[];
}
function parseCheck(check,kind){
 object(check,kind+" check",["id","status","basis","rationale"]);
 const known=kind==="semantic"?semanticIds:bankIds;
 if(!known.has(check.id))fail("Unknown "+kind+" checklist id");
 if(!allowedChecks.has(check.status))fail("Unknown checklist status");
 const bases=kind==="semantic"?allowedSemanticBasis:allowedBankBasis;
 if(!bases.has(check.basis))fail("Unknown "+kind+" review basis");
 string(check.rationale,kind+" rationale",1000);return check;
}
function parseReview(raw){
 const r=object(raw,"review",["format","version","bankId","sourceSha256","reviewMode","reviewer","candidateOnlyContextClaim","records","bankReview"]);
 if(r.format!=="practice-desk-quality-review"||r.version!==3)fail("Expected practice-desk-quality-review v3 layered review");
 string(r.bankId,"review.bankId",80);digest(r.sourceSha256,"review.sourceSha256");
 if(!REVIEW_MODES.has(r.reviewMode))fail("reviewMode must be self-review, clean-context or independent-agent");
 if(typeof r.candidateOnlyContextClaim!=="boolean")fail("candidateOnlyContextClaim must be boolean");
 if(r.reviewMode==="self-review"&&r.candidateOnlyContextClaim)fail("self-review must not claim a clean candidate-only context");
 if(r.reviewMode!=="self-review"&&!r.candidateOnlyContextClaim)fail(r.reviewMode+" requires an explicit candidate-only context claim");
 const actor=object(r.reviewer,"reviewer",["id","kind"]);string(actor.id,"reviewer.id",100);
 if(!["ai","human"].includes(actor.kind))fail("Reviewer kind must be ai or human");
 const seen=new Set();
 for(const entry of array(r.records,"review.records")){
  object(entry,"review record",["questionId","questionSha256","candidateSha256","solution","applicability","semanticChecks","evidence"]);
  parseApplicability(entry.applicability);string(entry.questionId,"questionId",80);
  if(!idPattern.test(entry.questionId))fail("Invalid question ID");
  if(seen.has(entry.questionId))fail("Duplicate review question ID");seen.add(entry.questionId);
  digest(entry.questionSha256,"review question");digest(entry.candidateSha256,"candidate projection");
  const solved=object(entry.solution,"solution",["status","answer","reasoning"]);
  if(!["pending","completed"].includes(solved.status))fail("solution.status must be pending or completed");
  if(typeof solved.answer!=="string"||solved.answer.length>200)fail("Invalid review answer");
  string(solved.reasoning,"review reasoning",2500);
  const labels=new Set();
  for(const check of array(entry.semanticChecks,"semanticChecks",SEMANTIC_CHECKLIST.length)){
   parseCheck(check,"semantic");if(labels.has(check.id))fail("Duplicate semantic checklist id");labels.add(check.id);
  }
  parseEvidence(entry.evidence);
 }
 const bank=object(r.bankReview,"bankReview",["checks"]),bankSeen=new Set();
 for(const check of array(bank.checks,"bankReview.checks",BANK_CHECKLIST.length,BANK_CHECKLIST.length)){
  parseCheck(check,"bank");if(bankSeen.has(check.id))fail("Duplicate bank checklist id");bankSeen.add(check.id);
 }
 return r;
}
export function auditQuestionQuality(source,sourceRaw,reviewRaw=undefined,{offset=0,limit=12}={}){
 const report=inspectExternalQuestionBank(source),issues=[];
 const add=(code,message,questionId=undefined,basis="deterministic")=>issues.push({code,severity:"error",basis,message,...(questionId?{questionId}:{})});
 const qualityIssues=report.issues??[];
 for(const q of qualityIssues){
  if(q.severity==="error")add("canonical-"+q.code,q.message,q.questionId);
  else if(q.severity==="warning")issues.push({code:"canonical-"+q.code,severity:"warning",basis:q.basis??"heuristic",message:q.message,...(q.questionId?{questionId:q.questionId}:{})});
 }
 const validSource=Boolean(report.valid),sourceHash=sha(sourceRaw),bankId=source.bankId;
 let draft;
 try{draft=toAuthoringDraft(source);}catch(e){
  add("source-invalid","Canonical source cannot be parsed: "+(e instanceof Error?e.message:"invalid"));
  return {format:"practice-desk-question-quality-audit",version:2,valid:false,readyForPublication:false,
   sourceSha256:sourceHash,factualVerification:"not-performed",externalSourceFetches:0,reviewMode:"not-performed",reviewAssurance:"not-performed",questionsMissingReview:0,
   layers:{deterministic:{status:"failed"},semantic:{status:"not-performed"},bank:{status:"not-performed"}},
   issues:{total:issues.length,offset,limit,items:issues.slice(offset,offset+limit),nextOffset:offset+limit<issues.length?offset+limit:null}};
 }
 const projections=new Map(draft.questions.map(q=>[q.id,candidateProjection(draft,q)]));
 let review=null;
 if(reviewRaw!==undefined){
  try{review=parseReview(reviewRaw);}catch(e){add("review-invalid","Invalid layered review record: "+(e instanceof Error?e.message:"invalid"));}
  if(review&&(review.bankId!==bankId||review.sourceSha256!==sourceHash))add("review-stale","Review bank or source digest differs from current source");
 }
 const indexed=new Map(review?.records.map(r=>[r.questionId,r])??[]);
 let missing=0,asserted=0,reportedEvidence=0;
 for(let i=0;i<draft.questions.length;i++){
  const q=draft.questions[i],sourceQuestion=source.questions[i],projection=projections.get(q.id),item=indexed.get(q.id);
  if(!item){missing++;add("review-missing","No semantic review record for question",q.id,"not-performed");continue;}
  const expectedQuestionHash=sha(JSON.stringify(sourceQuestion));
  if(item.questionSha256!==expectedQuestionHash||item.candidateSha256!==projection.candidateSha256){add("review-stale","Review question or candidate view changed",q.id);continue;}
  asserted++;reportedEvidence+=item.evidence?.length??0;
  if(item.solution.status!=="completed")add("solution-unresolved","Second-pass solution/reasoning is incomplete",q.id,"reviewer-claimed");
  else if(q.kind!=="free-response"&&!keyEquals(q.kind,item.solution.answer,q.answer,q.tolerance??0))add("review-key-disagreement","Reviewer solution disagrees with authored key",q.id,"reviewer-claimed");
  const declared=item.applicability,inferred=inferredApplicability(q,draft),author=sourceQuestion.qa?.applicability,visualDetected=projection.hasVisualMaterial===true;
  const flags={mathematical:declared.mathematical==="yes"||inferred.mathematical||author?.mathematical===true,
   legal:declared.legal==="yes"||inferred.legal||author?.legal===true,timeSensitive:declared.timeSensitive==="yes"||inferred.timeSensitive||author?.timeSensitive===true,
   visual:declared.visual==="yes"||visualDetected};
  if(author&&(author.legal||author.timeSensitive)&&declared.asOfDate!==author.asOfDate)add("source-asof-conflict","Reviewer as-of date conflicts with author-declared applicable date",q.id,"reviewer-claimed");
  for(const key of ["mathematical","legal","timeSensitive","visual"]){
   if(declared[key]==="pending")add("applicability-unresolved","Reviewer must explicitly classify "+key+" applicability",q.id,"reviewer-claimed");
   if(key!=="visual"&&author?.[key]===true&&declared[key]!=="yes")add("source-applicability-conflict","Reviewer must affirm author-declared "+key+" applicability",q.id,"reviewer-claimed");
   if(key!=="visual"&&inferred[key]&&declared[key]==="no")add("applicability-heuristic-conflict","Reviewer declared "+key+" not applicable but a supplementary detector found relevant material",q.id,"heuristic");
  }
  if(visualDetected&&declared.visual==="no")add("visual-applicability-conflict","Candidate material contains a visual reference but reviewer declared visual review inapplicable",q.id);
  const map=new Map(item.semanticChecks.map(x=>[x.id,x])),required=new Set(SEMANTIC_CORE);
  if(["single-choice","multiple-select"].includes(q.kind))required.add("distractor-quality");
  if(flags.mathematical)required.add("mathematical-correctness");
  if(flags.legal||flags.timeSensitive)required.add("temporal-correctness");
  if(q.provenance?.kind==="official-pyq")required.add("pyq-fidelity");
  if(flags.visual)required.add("visual-integrity");
  for(const id of required){const check=map.get(id);if(!check||check.status!=="pass")add("semantic-check-unresolved","Required semantic review not satisfied: "+id,q.id,"reviewer-claimed");}
  for(const check of item.semanticChecks)if(check.status==="fail")add("semantic-check-failed","Reviewer marked semantic failure: "+check.id,q.id,"reviewer-claimed");
  const facts=map.get("factual-correctness"),temporal=map.get("temporal-correctness"),pyq=map.get("pyq-fidelity"),mathCheck=map.get("mathematical-correctness"),visual=map.get("visual-integrity");
  const consulted=(name,check)=>{if(check?.status!=="pass")return;if(check.basis!=="source-consulted")add("source-check-basis-invalid","Source-backed pass requires source-consulted basis: "+name,q.id,"reviewer-claimed");if(!item.evidence?.length)add("review-evidence-missing","No locatable source extract recorded: "+name,q.id,"reviewer-claimed");};
  if(facts?.status==="pass"&&!["mathematical-proof","source-consulted"].includes(facts.basis))add("factual-basis-invalid","Factual correctness requires source consultation or mathematical proof",q.id,"reviewer-claimed");
  if(facts?.status==="pass"&&facts.basis==="mathematical-proof"&&!flags.mathematical)add("factual-proof-basis-invalid","Non-mathematical facts need consulted sources, not a mathematics-proof label",q.id,"reviewer-claimed");
  if(facts?.status==="pass"&&facts.basis==="source-consulted"&&!item.evidence?.length)add("review-evidence-missing","No source extract recorded for factual correctness",q.id,"reviewer-claimed");
  if(flags.mathematical&&mathCheck?.status==="pass"&&!["mathematical-proof","source-consulted"].includes(mathCheck.basis))add("mathematics-proof-required","Mathematical correctness needs a recorded proof or source consultation",q.id,"reviewer-claimed");
  if(flags.legal||flags.timeSensitive){
   if(facts?.status==="pass"&&facts.basis!=="source-consulted")add("legal-source-required","Legal or time-sensitive facts require source-consulted evidence",q.id,"reviewer-claimed");
   consulted("temporal-correctness",temporal);
   if(!declared.asOfDate)add("applicability-asof-required","Declare a question-specific as-of date for applicable law/data",q.id,"reviewer-claimed");
   if(!item.evidence?.some(e=>e.asOfDate&&e.asOfDate===declared.asOfDate&&e.publisher&&e.title&&e.locator.length>=6&&e.excerpt))add("legal-asof-evidence-required","Record an identifiable source supporting the declared as-of date",q.id,"reviewer-claimed");
  }else if(temporal?.status==="pass"&&temporal.basis==="source-consulted")consulted("temporal-correctness",temporal);
  if(q.provenance?.kind==="official-pyq")consulted("pyq-fidelity",pyq);else if(pyq?.status==="pass"&&pyq.basis==="source-consulted")consulted("pyq-fidelity",pyq);
  if(flags.visual&&visual?.status==="pass"&&visual.basis!=="rendered-claim")add("visual-render-claim-required","Visual integrity requires an actual visual/render inspection claim",q.id,"reviewer-claimed");
 }
 if(review)for(const record of review.records)if(!projections.has(record.questionId))add("review-unknown-question","Review references a question absent from the audited source",record.questionId);
 let bankPasses=0;
 if(!review?.bankReview)add("bank-review-missing","Bank-level quality review is required",undefined,"not-performed");
 else{const map=new Map(review.bankReview.checks.map(x=>[x.id,x]));for(const criterion of BANK_CHECKLIST){const check=map.get(criterion.id);if(check?.status==="pass")bankPasses++;else add("bank-check-unresolved","Bank-level review not satisfied: "+criterion.id,undefined,"reviewer-claimed");}}
 const blockingIssueCount=issues.filter(x=>x.severity==="error").length,warningIssueCount=issues.length-blockingIssueCount;
 const ready=validSource&&review!==null&&missing===0&&bankPasses===BANK_CHECKLIST.length&&blockingIssueCount===0;
 const assurance=review?.reviewMode==="self-review"?"recorded-self-review-not-independent-or-authenticated":review?.reviewMode==="clean-context"?"recorded-clean-context-claim-not-authenticated":review?.reviewMode==="independent-agent"?"recorded-independent-agent-claim-not-authenticated":"not-performed";
 const count=issues.length;
 return {format:"practice-desk-question-quality-audit",version:2,valid:ready,readyForPublication:ready,sourceSha256:sourceHash,bankId,
  questionCount:draft.questions.length,questionsMissingReview:missing,assertedReviews:asserted,blockingIssueCount,warningIssueCount,
  reviewMode:review?.reviewMode??"not-performed",reviewAssurance:assurance,factualVerification:"not-performed",externalSourceFetches:0,
  sourceEvidenceClaims:reportedEvidence,renderedCandidateUI:"not-authenticated",
  layers:{deterministic:{status:validSource?"pass":"fail",canonicalWarnings:qualityIssues.filter(x=>x.severity==="warning").length},
   semantic:{status:missing===0&&asserted===draft.questions.length?"reviewed":"incomplete",reviewedQuestions:asserted,totalQuestions:draft.questions.length},
   bank:{status:bankPasses===BANK_CHECKLIST.length?"reviewed":"incomplete",passedChecks:bankPasses,totalChecks:BANK_CHECKLIST.length}},
  canonical:{valid:report.valid,errors:qualityIssues.filter(x=>x.severity==="error").length,warnings:qualityIssues.filter(x=>x.severity==="warning").length,factualVerification:"not-performed"},
  issues:{offset,limit,total:count,nextOffset:offset+limit<count?offset+limit:null,remaining:Math.max(0,count-offset-limit),items:issues.slice(offset,offset+limit)}};
}
// The output is an exact, fillable layered review contract; no extra template-only
// properties requiring agents to repair JSON before running the validator.
function suggestedSemanticChecks(value,draft,q,projection){
 const sourceQuestion=value.questions.find(x=>x.id===q.id),inferred=inferredApplicability(q,draft),author=sourceQuestion?.qa?.applicability,
  mathematical=inferred.mathematical||author?.mathematical===true,
  sourceCritical=inferred.legal||inferred.timeSensitive||author?.legal===true||author?.timeSensitive===true,
  ids=new Set(SEMANTIC_CORE);
 if(["single-choice","multiple-select"].includes(q.kind))ids.add("distractor-quality");
 if(mathematical)ids.add("mathematical-correctness");
 if(sourceCritical)ids.add("temporal-correctness");
 if(q.provenance?.kind==="official-pyq")ids.add("pyq-fidelity");if(projection.hasVisualMaterial)ids.add("visual-integrity");
 return SEMANTIC_CHECKLIST.filter(x=>ids.has(x.id)).map(x=>({id:x.id,status:"not-reviewed",
  basis:x.id==="mathematical-correctness"?"mathematical-proof":
   x.id==="factual-correctness"?(sourceCritical?"source-consulted":mathematical?"mathematical-proof":"source-consulted"):
   ["temporal-correctness","pyq-fidelity"].includes(x.id)?"source-consulted":
   x.id==="visual-integrity"?"rendered-claim":"semantic-editorial",
  rationale:"Pending semantic assessment"}));
}
function reviewTemplate(value,sourceRaw,items){
 const draft=toAuthoringDraft(value),byId=new Map(draft.questions.map(q=>[q.id,q]));
 return {format:"practice-desk-quality-review",version:3,bankId:value.bankId,sourceSha256:sha(sourceRaw),
  reviewMode:"self-review",candidateOnlyContextClaim:false,reviewer:{id:"REPLACE_REVIEWER",kind:"ai"},
  records:items.map(item=>{const q=byId.get(item.questionId);return {questionId:item.questionId,questionSha256:item.questionSha256,candidateSha256:item.candidateSha256,
   applicability:{mathematical:"pending",legal:"pending",timeSensitive:"pending",visual:"pending",asOfDate:null},
   solution:{status:"pending",answer:"",reasoning:"Pending second-pass solution and reasoning"},
   semanticChecks:suggestedSemanticChecks(value,draft,q,item),evidence:[]};}),
  bankReview:{checks:BANK_CHECKLIST.map(x=>({id:x.id,status:"not-reviewed",basis:"bank-editorial",rationale:"Pending bank-level assessment"}))}
 };
}
async function prepareReviewWorkspace(value,raw,outputDir){
 // Build the complete candidate-only packet and the corresponding empty review source
 // locally; stdout carries no question/answer/media content.
 const draft=toAuthoringDraft(value);
 const items=draft.questions.map(q=>{
  const item=candidateProjection(draft,q);
  return {...item,questionSha256:sha(JSON.stringify(value.questions.find(x=>x.id===q.id)))};
 });
 const packets={format:"practice-desk-review-candidates",version:1,bankId:value.bankId,
  sourceSha256:sha(raw),total:items.length,candidateReferences:candidateReferenceProjection(draft),items,
  factualVerification:"not-performed",
  warning:"Text/alt only: inspect original source, equations and any visual material as required by the selected review mode."};
 const template=reviewTemplate(value,raw,items);
 const files=[["review-candidates.json",packets],["review.json",template]];
 const directory=resolve(outputDir);
 await mkdir(directory); // Exclusive: never replace an existing review directory.
 try{
  for(const [name,data] of files)await writeFile(join(directory,name),
   JSON.stringify(data,null,2)+"\n",{flag:"wx",mode:0o600});
 }catch(error){await rm(directory,{recursive:true,force:true});throw error;}
 return {format:"practice-desk-review-workspace",version:1,
  readyForPublication:false,reviewComplete:false,sourceSha256:sha(raw),
  bankId:value.bankId,questionCount:items.length,directory,
  files:files.map(([name])=>name),
  note:"Review is incomplete: explicitly classify mathematics, law, time sensitivity and visual applicability, complete a second-pass solution, supply dated evidence where applicable, then complete the required semantic checks and one bank-level review. Review mode and evidence remain attributed claims."};
}
const usage="Usage: question-quality.mjs checklist | candidate <source.json> [--offset N --limit 1..20] | template <source.json> [--offset N --limit 1..20] | prepare <source.json> <NEW-directory> | audit <source.json> [--review <review.json>] [--offset N --limit 1..50]";
const throwResult=(e)=>{
 process.stderr.write(JSON.stringify({valid:false,readyForPublication:false,code:"quality-input-invalid",
  message:e instanceof Error?e.message:"Unknown error"},null,2)+"\n");
 process.exitCode=2;
};
async function main(){
 const [op,...args]=process.argv.slice(2);
 if(op==="checklist"){
  if(args.length)fail(usage);
  emit({format:"practice-desk-quality-checklist",version:2,
   layers:{deterministic:{description:"Canonical schema/scoring, option structure, candidate secrecy/hints, hashes, duplicate candidates and optional blueprint arithmetic are machine-owned."},
    semantic:{checklist:SEMANTIC_CHECKLIST},bank:{checklist:BANK_CHECKLIST}},
   coverageMap:QUALITY_COVERAGE_MAP,reviewModes:["self-review","clean-context","independent-agent"],
   note:"All three review modes use the same substantive correctness gates. Independence and external evidence remain attributed, not authenticated."});
  return;
 }
 if(!["candidate","template","prepare","audit"].includes(op)||!args.length)fail(usage);
 const sourceFile=args[0],flags=op==="prepare"?[]:args.slice(1);
 if(op==="prepare"&&args.length!==2)fail(usage);
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
 if(op==="prepare"){
  emit(await prepareReviewWorkspace(value,raw,args[1]));return;
 }
 if(op==="candidate"||op==="template"){
  // Canonical v1 parser, without requiring a question already to pass all QA.
  const draft=toAuthoringDraft(value);
  const items=draft.questions.slice(offset,offset+limit).map(q=>{
   const item=candidateProjection(draft,q);
   return {...item,questionSha256:sha(JSON.stringify(value.questions.find(x=>x.id===q.id)))};
  });
  if(op==="template"){
   emit(reviewTemplate(value,raw,items));
   return;
  }
  emit({format:"practice-desk-review-candidates",version:1,bankId:value.bankId,
   sourceSha256:sha(raw),total:draft.questions.length,offset,limit,
   nextOffset:offset+limit<draft.questions.length?offset+limit:null,
   candidateReferences:candidateReferenceProjection(draft),items,
   factualVerification:"not-performed",
   warning:"Candidate text/alt-only review does not replace viewing actual image pixels when visual review is required."});
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
