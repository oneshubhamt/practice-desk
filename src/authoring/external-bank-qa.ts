/** P57-B: deterministic, bounded QA. This is NOT a source-fetcher or fact checker.
 * Structural failures block compilation. Heuristic flags require human resolution.
 * SHA-256 here is a comparison fingerprint, never source authentication.
 */
import type {AuthoringDraft,AuthoringQuestion} from "./authoring-draft.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import {publicationPlainText} from "./authoring-publisher.ts";
import {scoreAttempt} from "../engine/scoring.ts";
import type {CandidateResponse} from "../domain/question.ts";
import type {CorrectAnswer} from "../domain/answer-key.ts";
import type {AttemptResponseRecord} from "../domain/attempt.ts";
import {inspectCandidateIntegrity} from "./candidate-integrity.ts";

export type QualityIssue={
 readonly path:string;
 readonly code:string;
 readonly severity:"error"|"warning"|"info";
 readonly message:string;
 readonly questionId?:string;
 readonly basis?:"deterministic"|"heuristic"|"unverified";
 readonly evidence?:string;
 readonly suggestion?:string;
};
export type QualityCheck="pass"|"issue"|"unverified";
export type QuestionQuality={
 readonly questionId:string;
 readonly sourceCount:number;
 /** Author-supplied full citation/date fields for inspectable QA exports.
  * The checks below must never treat these as externally corroborated.
  */
 readonly citations:NonNullable<NonNullable<AuthoringQuestion["provenance"]>["sources"]>;
 readonly checks:{
  readonly schema_valid:QualityCheck;
  readonly key_consistent:QualityCheck;
  readonly solution_checked:QualityCheck;
  readonly source_corroborated:"unverified";
  readonly human_reviewed:"unverified";
 };
 readonly recommendedStatus:"unchecked"|"needs-review";
};
export type DuplicateCandidate={
 readonly first:{readonly bankId:string;readonly revision:number;readonly questionId:string};
 readonly second:{readonly bankId:string;readonly revision:number;readonly questionId:string};
 readonly classification:"exact"|"same-stem"|"near";
 readonly similarity:number;
 readonly evidence:string;
 readonly resolution:"human-review-required";
};
export type QualitySummary={
 readonly errors:number;
 readonly warnings:number;
 readonly infos:number;
 readonly questionsNeedingReview:number;
 readonly duplicateCandidates:number;
 /** The list contains at most 500 candidates. Never imply the scan completed
  * when the next candidate would exceed this bounded review budget. */
 readonly duplicateTruncated:boolean;
 readonly duplicateCandidateLimit:500;
 readonly duplicatePairsInspected:number;
 readonly duplicatePairsPossible:number;
 readonly sourceReferences:number;
 readonly mathSolutionsChecked:number;
 readonly externalSourceFetches:0;
 readonly factualVerification:"not-performed";
};
export type QualityResult={
 readonly issues:readonly QualityIssue[];
 readonly questions:readonly QuestionQuality[];
 readonly duplicates:readonly DuplicateCandidate[];
 readonly summary:QualitySummary;
};
type CompareBatch={readonly bankId:string;readonly revision:number;readonly draft:AuthoringDraft};
type Item={bankId:string;revision:number;q:AuthoringQuestion;stem:string;options:string[];tokens:Set<string>};
const compact=(s:string):string=>s.normalize("NFKC").toLowerCase()
 .replace(/^\s*(?:q(?:uestion)?\s*)?\d+[.)\s]+/iu,"")
 .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/gu," ");
/** Option identity must preserve mathematical signs and decimal points.
 * The bag-of-words stem normalizer is intentionally lossy and must never
 * decide whether +2/3 and -2/3 (or 1.2 and 12) are duplicate answers. */
const optionSignature=(value:string):string=>value.normalize("NFKC").toLocaleLowerCase("en")
 .replace(/[\u2212\u2010-\u2015]/gu,"-")
 .replace(/[^\p{L}\p{N}+\-×÷/*^%=<>().]+/gu," ")
 .replace(/\s+/gu," ").trim();
const wording=(q:AuthoringQuestion)=>compact(publicationPlainText(q.prompt));
const options=(q:AuthoringQuestion)=>q.kind==="single-choice"||q.kind==="multiple-select"?
 q.options.map(o=>optionSignature(publicationPlainText(o))).sort():[];
const grams=(stem:string):Set<string>=>{
 const words=stem.split(" ").filter(Boolean);
 const values=new Set<string>();
 for(let i=0;i<words.length-1;i++)values.add(words[i]+" "+words[i+1]);
 return values;
};
const jaccard=(a:Set<string>,b:Set<string>):number=>{
 if(!a.size||!b.size)return 0;
 let common=0;for(const x of a)if(b.has(x))common++;
 return common/(a.size+b.size-common);
};
const expected=(answer:CorrectAnswer):CandidateResponse|undefined=>{
 switch(answer.kind){
  case "single-choice":return {kind:answer.kind,optionId:answer.optionId};
  case "multiple-select":return {kind:answer.kind,optionIds:answer.optionIds};
  case "numeric-entry":return {kind:answer.kind,value:answer.acceptedValues[0]!};
  case "true-false":return {kind:answer.kind,value:answer.value};
  case "matching":return {kind:answer.kind,pairs:answer.pairs};
  case "free-response":return undefined;
 }
};
const dateIsValid=(d:string):boolean=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
 const date=new Date(d+"T00:00:00.000Z");
 return !Number.isNaN(date.valueOf())&&date.toISOString().startsWith(d);
};
const arithmetic=(stem:string):number|undefined=>{
 const m=/^(?:what is|calculate|evaluate|compute)\s+(-?\d+(?:\.\d+)?)\s*([+\-*×÷/])\s*(-?\d+(?:\.\d+)?)\s*\??$/iu.exec(stem.trim());
 if(!m)return undefined;
 const a=Number(m[1]),b=Number(m[3]);
 const r=m[2]==="+"?a+b:m[2]==="-"?a-b:
  m[2]==="*"||m[2]==="×"?a*b:b===0?NaN:a/b;
 return Number.isFinite(r)?r:undefined;
};
const locate=(id:string,field:string)=>"$.questions[id="+id+"]."+field;
export function inspectExternalQuality(
 draft:AuthoringDraft,compiled:ExamPackage,bankId:string,
 comparisons:readonly CompareBatch[]=[],original?:unknown
):QualityResult{
 const issues:QualityIssue[]=[];
 const add=(code:string,severity:QualityIssue["severity"],message:string,
  id:string|undefined,field:string,basis:QualityIssue["basis"]="deterministic",
  evidence?:string,suggestion?:string):void=>{
  issues.push({path:id?locate(id,field):"$."+field,code,severity,message,basis,
   ...(id?{questionId:id}:{}),...(evidence?{evidence}:{}),...(suggestion?{suggestion}:{})});
 };
 // P60-C: apply high-confidence answer leaks to every source import/publication,
 // not solely to the opt-in external review sidecar.
 for(const hint of inspectCandidateIntegrity(draft))
  add(hint.code,hint.severity,hint.message,hint.questionId,hint.field,
   hint.severity==="error"?"deterministic":"heuristic",undefined,hint.suggestion);
 const source=original as {sections?:readonly {id:string;title:string}[];
   questions?:readonly {examSection:string}[]}|undefined;
 if(source?.sections&&source.questions){
  const used=new Set(source.questions.map(q=>q.examSection));
  for(const section of source.sections)if(!used.has(section.id))
   add("empty-exam-section","error",
    "Declared physical exam section contains no questions and would disappear on publication",
    undefined,"sections[id="+section.id+"]","deterministic",section.title,
    "Remove the unused section or assign at least one question to it");
 }
 const all:Item[]=[...draft.questions.map(q=>({bankId,revision:draft.revision,q,
  stem:wording(q),options:options(q),tokens:grams(wording(q))})),
  ...comparisons.flatMap(b=>b.draft.questions.map(q=>({
   bankId:b.bankId,revision:b.revision,q,stem:wording(q),options:options(q),tokens:grams(wording(q))
  })))];
 const own=all.slice(0,draft.questions.length);
 const duplicates:DuplicateCandidate[]=[];
 // Bounded candidate display, with an explicit incomplete result if a 501st
 // is discovered. Count examined comparisons, not just accepted candidates.
 if(all.length>1800)throw Error("QA comparison exceeds 1,800 questions");
 const duplicatePairsPossible=own.length*(own.length-1)/2+
  own.length*(all.length-own.length);
 let duplicatePairsInspected=0,duplicateTruncated=false;
 scan: for(let i=0;i<own.length;i++)
  for(let j=i+1;j<all.length;j++){
  duplicatePairsInspected++;
  const a=own[i]!,b=all[j]!;
  if(a.q.kind!==b.q.kind||!a.stem||!b.stem)continue;
  const same=a.stem===b.stem;
  // Candidate similarity does not rely on duplicated RC/DILR shared context.
  const bigramScore=jaccard(a.tokens,b.tokens);
  const unigramScore=jaccard(new Set(a.stem.split(" ")),new Set(b.stem.split(" ")));
  const score=same?1:
    a.stem.length>=55&&b.stem.length>=55&&
    unigramScore>=0.78&&bigramScore>=0.62?unigramScore:0;
  if(score<0.78)continue;
  if(duplicates.length>=500){duplicateTruncated=true;break scan;}
  const exact=same&&JSON.stringify(a.options)===JSON.stringify(b.options);
  const classification=exact?"exact":same?"same-stem":"near";
  duplicates.push({
   first:{bankId:a.bankId,revision:a.revision,questionId:a.q.id},
   second:{bankId:b.bankId,revision:b.revision,questionId:b.q.id},
   classification,similarity:Math.round(score*1000)/1000,
   evidence:classification==="exact"?"Normalized stem and answer choices match (choice order ignored)":
    classification==="same-stem"?"Normalized stem matches; answer options differ":
    "High overlapping word-bigram similarity in stems",
   resolution:"human-review-required"
  });
  add("duplicate-candidate","warning","Potential "+classification+
   " duplicate; inspect both question IDs before accepting",a.q.id,"prompt",
   "heuristic",b.bankId+"/r"+b.revision+"/"+b.q.id,
   "Review provenance and both keys; do not automatically remove either question");
 }
 const results:QuestionQuality[]=[];
 let checked=0,sourcesCount=0;
 for(let i=0;i<draft.questions.length;i++){
  const q=draft.questions[i]!;
  const prompt=publicationPlainText(q.prompt).trim();
  const explanation=publicationPlainText(q.explanation).trim();
  const src=q.provenance?.sources??[];
  sourcesCount+=src.length;
  if(/(?:^|[-_])apfc$/iu.test(draft.examId)&&!q.syllabusHeadingId)
   add("apfc-heading-missing","error",
    "APFC question requires an explicitly assigned official broad syllabus heading",
    q.id,"syllabusHeadingId","deterministic",undefined,
    "Select one of the nine already supported APFC heading IDs; do not infer it from section");
  else if(!q.syllabusHeadingId&&!q.subject)
   add("subject-unattributed","warning",
    "Academic subject is missing; it is not equivalent to the exam section",
    q.id,"subject","unverified",undefined,
    "Supply an explicit subject or applicable official syllabus heading");
  if(["single-choice","multiple-select"].includes(q.kind)){
   const labels=q.options.map(o=>optionSignature(publicationPlainText(o)));
   for(let x=0;x<labels.length;x++)if(!labels[x])
    add("empty-option","error","An answer option has no readable text",q.id,"options["+x+"]");
   const seen=new Map<string,number>();
   for(let x=0;x<labels.length;x++){
    const prior=seen.get(labels[x]!);
    if(prior!==undefined)add("duplicate-option","error",
     "Options "+String.fromCharCode(65+prior)+" and "+String.fromCharCode(65+x)+
     " have equivalent text",q.id,"options["+x+"]","deterministic",
     labels[x],"Replace the duplicate distractor with a distinct defensible option");
    else seen.set(labels[x]!,x);
   }
  }
  if(q.kind==="matching"){
   for(const [field,items] of [["leftItems",q.leftItems],["rightItems",q.rightItems]] as const){
    const seen=new Set<string>();
    for(const [n,doc] of items.entries()){
     const text=compact(publicationPlainText(doc));
     if(!text||seen.has(text))
      add("duplicate-matching-label","error",
       "Matching labels must be present and distinguishable",
       q.id,field+"["+n+"]","deterministic",text,
       "Use distinct left and right labels and verify each key pair");
     seen.add(text);
    }
   }
  }
  if(q.kind==="numeric-entry"){
   const answer=compiled.answerKey.entries[i]!.answer;
   if(answer.kind==="numeric-entry"&&answer.acceptedValues.length>1){
    const tolerance=answer.absoluteTolerance??0;
    const overlap=answer.acceptedValues.some((n,k)=>answer.acceptedValues.slice(k+1)
     .some(other=>Math.abs(other-n)<=2*tolerance));
    if(overlap)add("numeric-alternatives-overlap","warning",
     "Numeric alternatives are repeated or accepted tolerance intervals overlap",
     q.id,"answer","deterministic",undefined,
     "Keep only purposeful alternatives; review the published tolerance");
   }
  }
  if(!explanation&&q.kind!=="free-response")
   add("missing-explanation","warning","No worked explanation or reasoning is supplied",
    q.id,"explanation","unverified",undefined,"Add a source-backed rationale");
  if(q.provenance?.kind==="official-pyq"){
   if(!q.provenance.examYear)
    add("pyq-year-missing","warning","Official PYQ is an unverified author claim; year is absent",
     q.id,"provenance.examYear","unverified",undefined,"Record year and independent primary-source evidence");
   if(!src.length)add("pyq-primary-source-missing","warning",
    "Official PYQ identity has no cited source",q.id,"provenance.sources","unverified");
  }
  const law=/(?:\b(?:Act|Code|Rules|Regulations|Gazette|Notification)\b(?:\s+[A-Za-z&\x27-]+){0,8}\s*,?\s*(?:19|20)\d{2}\b|\b(?:commenc(?:ed|ement)|amend(?:ed|ment)|section\s+\d+|effective\s+(?:from|on))\b)/iu
    .test(prompt+" "+explanation);
  if(law){
   if(!src.some(s=>s.asOfDate&&s.provision))
    add("legal-asof-evidence-missing","warning",
     "Time-sensitive legal claim lacks a dated, provision-specific citation",
     q.id,"provenance.sources","unverified",undefined,
     "Provide Act/Code, provision, as-of date and authoritative publication");
   add("legal-currentness-unverified","warning",
    "No statute commencement or current amendment was checked against a primary source",
    q.id,"provenance.sources","unverified",undefined,
    "Confirm current law, effective date and relevant rules outside this offline tool");
  }
  if(src.some(s=>s.stance==="disputes")&&src.some(s=>s.stance==="supports"))
   add("source-disagreement","warning",
    "Author reports mutually disagreeing sources; factual resolution requires review",
    q.id,"provenance.sources","heuristic",undefined,"Compare full source text and dates");
  if(src.some(s=>s.publicationDate&&!dateIsValid(s.publicationDate)))
   add("source-date-invalid","error","Source publication date is not a real calendar date",
    q.id,"provenance.sources");
  const exact=arithmetic(prompt);
  let math:"pass"|"issue"|"unverified"="unverified";
  if(exact!==undefined&&(q.kind==="numeric-entry"||q.kind==="single-choice")){
   const answer=compiled.answerKey.entries[i]!.answer;
   const chosen=answer.kind==="numeric-entry"?answer.acceptedValues:
    answer.kind==="single-choice"?
     [Number(publicationPlainText(q.options["ABCD".indexOf(answer.optionId)]!).trim())]:[];
   if(chosen.length&&chosen.every(Number.isFinite)){
    checked++;
    const tolerance=answer.kind==="numeric-entry"?answer.absoluteTolerance??0:0;
    if(chosen.some(n=>Math.abs(n-exact)<=tolerance+1e-9))math="pass";
    else{
     math="issue";
     add("math-answer-conflict","error",
      "Exact one-step arithmetic does not agree with the keyed answer",
      q.id,"answer","deterministic","Expected "+exact,
      "Repair the numeric result or correct-option letter; re-run QA");
    }
   }
  }
  if(q.kind==="single-choice"){
   const m=/(?:^|\.\s+)(?:the\s+)?(?:correct\s+)?answer\s+(?:is|:)\s*([A-D])\b/iu.exec(explanation);
   if(m&&q.answer.trim().toUpperCase()!==m[1]!.toUpperCase())
    add("explanation-key-conflict","warning",
     "Explicit answer letter in explanation differs from the key",
     q.id,"explanation","heuristic","Explanation: "+m[1]+"; key: "+q.answer,
     "Check wording, final key and solution; automated text comparison is not a proof");
  }
  // Real engine oracle, NOT a parallel implementation of marking logic.
  const entry=compiled.answerKey.entries[i]!,question=compiled.questions[i]!;
  const response=expected(entry.answer);
  if(response){
   const record:AttemptResponseRecord={questionRevisionId:question.id,response,
    flagged:false,timeSpentMs:0,firstVisitMs:0,preFirstAnswerMs:0,answerChangeCount:0};
   const result=scoreAttempt(compiled.paper,compiled.answerKey,compiled.questions,
    [record],"1970-01-01T00:00:00.000Z");
   const item=result.items.find(r=>r.questionRevisionId===question.id);
   const section=compiled.paper.sections.find(s=>s.questionRevisionIds.includes(question.id));
   const rule=entry.scoringOverride??section?.scoringOverride??
    compiled.paper.scoring.byQuestionKind?.[q.kind]??compiled.paper.scoring.defaultRule;
   if(!item||item.verdict!=="correct"||Math.abs(item.marks-rule.correctMarks)>1e-9)
    add("scoring-oracle-conflict","error",
     "Canonical scorer did not award full credit to the exact published key",
     q.id,"answer","deterministic");
  }
  const concerning=issues.some(x=>x.questionId===q.id&&x.severity!=="info");
  results.push({questionId:q.id,sourceCount:src.length,
   citations:src,
   checks:{schema_valid:"pass",
    key_consistent:issues.some(x=>x.severity==="error"&&x.questionId===q.id)?"issue":"pass",
    solution_checked:math,source_corroborated:"unverified",human_reviewed:"unverified"},
   recommendedStatus:concerning||q.qa?.status==="needs-review"?"needs-review":"unchecked"});
 }
 // Detect unused shared context without confusing a shared passage with a duplicate.
 const used=new Set(draft.questions.map(q=>q.stimulusRef).filter(Boolean));
 for(const stimulus of draft.stimuli??[])if(!used.has(stimulus.id))
  add("unused-stimulus","warning","No question references this shared stimulus",
   undefined,"stimuli[id="+stimulus.id+"]","deterministic");
 const summary:QualitySummary={
  errors:issues.filter(x=>x.severity==="error").length,
  warnings:issues.filter(x=>x.severity==="warning").length,
  infos:issues.filter(x=>x.severity==="info").length,
  questionsNeedingReview:results.filter(x=>x.recommendedStatus==="needs-review").length,
  duplicateCandidates:duplicates.length,duplicateTruncated,
  duplicateCandidateLimit:500,duplicatePairsInspected,duplicatePairsPossible,
  sourceReferences:sourcesCount,
  mathSolutionsChecked:checked,externalSourceFetches:0,factualVerification:"not-performed"
 };
 return {issues,questions:results,duplicates,summary};
}
