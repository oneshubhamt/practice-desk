/** P57-A: one deliberately small, vendor-neutral, offline AI/human authoring source.
 * This is NOT an editorial factual-verification service. Untrusted source and QA
 * assertions are always published with caution via the existing Wordgard compiler.
 */
import {validateExamImportBudget} from "../app/exam-package.ts";
import type {ExamPackage} from "../app/exam-package.ts";
import type {AuthoringDraft,AuthoringQuestion} from "./authoring-draft.ts";
import {validateAuthoringDraft} from "./authoring-draft.ts";
import {inspectAuthoringPublication,publicationPlainText} from "./authoring-publisher.ts";
import type {ImageAsset,QuestionKind,StimulusDefinition} from "../domain/question.ts";
import type {AssetId} from "../domain/ids.ts";
import {QUESTION_KINDS} from "../domain/question.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import {plainRichDocument,validateRichDocument} from "../domain/rich-document.ts";
import {validateMediaInventory} from "../domain/media.ts";
import {sha256} from "../domain/hash.ts";
import {inspectExternalQuality} from "./external-bank-qa.ts";
import {inspectCandidateIntegrity} from "./candidate-integrity.ts";
import type {QualityIssue,QualityResult} from "./external-bank-qa.ts";

export type ExternalBankIssue=QualityIssue;
export interface ExternalBankReport {
 readonly valid:boolean;
 readonly questionCount:number;
 readonly issues:readonly ExternalBankIssue[];
 readonly editorialStatus:"caution";
 readonly factualVerification:"not-performed";
 readonly quality?:QualityResult;
 readonly compiled?:ExamPackage;
}
export class ExternalBankError extends Error {
 readonly issues:readonly ExternalBankIssue[];
 constructor(issues:readonly ExternalBankIssue[]) {
  super(issues.map(i=>i.path+": "+i.message).join("\n"));
  this.name="ExternalBankError";
  this.issues=issues;
 }
}
type Row=Record<string,unknown>;
const err=(path:string,message:string):never=>{
 throw new ExternalBankError([{path,code:"source-invalid",severity:"error",message}]);
};
const object=(value:unknown,path:string,keys:readonly string[]):Row=>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  return err(path,"Expected a plain object");
 const row=value as Row;
 for(const key of Object.keys(row))
  if(!keys.includes(key))err(path+"."+key,"Unsupported authoring field");
 return row;
};
const array=(value:unknown,path:string,max:number,min=0):unknown[]=>{
 if(!Array.isArray(value)||value.length<min||value.length>max)
  return err(path,"Expected "+min+"–"+max+" items");
 return value;
};
const text=(value:unknown,path:string,max:number,required=true):string=>{
 if(typeof value!=="string"||value.length>max||
   (required&&!value.trim())||/[\u0000-\u001f\u007f]/u.test(value))
  return err(path,"Invalid text; maximum "+max+" characters");
 return value;
};
const key=(value:unknown,path:string):string=>{
 const valueText=text(value,path,80);
 if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(valueText))
  return err(path,"Use letters, numbers, underscores or hyphens");
 return valueText;
};
const num=(value:unknown,path:string,min:number,max:number,whole=false):number=>{
 if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max||
    (whole&&!Number.isSafeInteger(value)))
  return err(path,"Expected "+(whole?"a whole ":"a finite ")+"number from "+min+" to "+max);
 return value;
};
const bool=(value:unknown,path:string):boolean=>{
 if(typeof value!=="boolean")return err(path,"Expected a boolean");
 return value;
};
const noHtml=(value:string,path:string):void=>{
 if(/<\s*\/?\s*[a-z][^>]*>/iu.test(value))
  err(path,"HTML markup is not supported; use plain text or canonical rich AST");
};
const rich=(value:unknown,path:string,known:ReadonlySet<string>):RichDocument=>{
 try{
  if(typeof value==="string"){
   text(value,path,20000,false);
   noHtml(value,path);
   return plainRichDocument(value);
  }
  return validateRichDocument(value,{knownAssets:known});
 }catch(error){
  if(error instanceof ExternalBankError)throw error;
  return err(path,error instanceof Error?error.message:"Invalid rich document");
 }
};
const empty=()=>plainRichDocument("");
const assetRefs=(doc:RichDocument):AssetId[]=>{
 const ids=new Set<string>();
 const row=(items:readonly import("../domain/rich-document.ts").RichInline[])=>{
  for(const item of items)if(item.type==="image")ids.add(item.assetId);
 };
 for(const block of doc.blocks){
  if(block.type==="paragraph"||block.type==="heading")row(block.content);
  else if(block.type==="list")block.items.forEach(row);
  else if(block.type==="table")block.rows.forEach(cells=>cells.forEach(row));
  else if(block.type==="image")ids.add(block.assetId);
 }
 return [...ids] as AssetId[];
};
const four=(items:unknown,path:string,known:ReadonlySet<string>):RichDocument[]=>
 array(items,path,4,4).map((v,i)=>rich(v,path+"["+i+"]",known));
function media(value:unknown):ImageAsset[]{
 const source=array(value??[],"media",100);
 const ids=new Set<string>();
 const assets=source.map((v,i)=>{
  const path="media["+i+"]",row=object(v,path,["id","dataUri","altText"]);
  const id=key(row.id,path+".id");
  if(ids.has(id))err(path+".id","Duplicate image ID");
  ids.add(id);
  const dataUri=text(row.dataUri,path+".dataUri",14*1024*1024);
  const type=/^data:(image\/(?:png|jpeg|webp|avif|gif));base64,([A-Za-z0-9+/]+={0,2})$/u.exec(dataUri);
  if(!type)return err(path+".dataUri","Use an embedded data:image/...;base64 URI, never a remote URL");
  let bytes:Uint8Array;
  try{bytes=Uint8Array.from(atob(type[2]!),c=>c.charCodeAt(0));}
  catch{return err(path+".dataUri","Invalid base64 image");}
  return {id:id as ImageAsset["id"],dataUri,mediaType:type[1]! as ImageAsset["mediaType"],
   contentHash:sha256(bytes) as ImageAsset["contentHash"],
   altText:text(row.altText,path+".altText",500)};
 });
 try{validateMediaInventory([],assets);}catch(error){
  err("media",error instanceof Error?error.message:"Invalid embedded image");
 }
 return assets;
}
function sharedStimuli(value:unknown,known:ReadonlySet<string>):StimulusDefinition[]{
 const source=array(value??[],"stimuli",200);
 const ids=new Set<string>();
 const stimuli=source.map((v,i):StimulusDefinition=>{
  const path="stimuli["+i+"]",row=object(v,path,
   ["id","kind","title","text","columns","rows","mediaRef","altText","caption"]);
  const id=key(row.id,path+".id");
  if(ids.has(id))err(path+".id","Duplicate shared stimulus ID");
  ids.add(id);
  const title=row.title===undefined?undefined:text(row.title,path+".title",180);
  const head=title?{title}:{};
  if(row.kind==="passage"||row.kind==="case"){
   const document=rich(row.text,path+".text",known);
   const fallback=publicationPlainText(document);
   if(!fallback)err(path+".text","Shared passage must not be empty");
   const assetIds=assetRefs(document);
   return {id:id as StimulusDefinition["id"],kind:row.kind,...head,
    text:fallback,richText:document,...(assetIds.length?{assetIds}:{})};
  }
  if(row.kind==="table"){
   const columns=array(row.columns,path+".columns",12,1).map((x,j)=>
    text(x,path+".columns["+j+"]",5000));
   const rows=array(row.rows,path+".rows",40,1).map((item,j)=>
    array(item,path+".rows["+j+"]",columns.length,columns.length).map((cell,k)=>
     text(cell,path+".rows["+j+"]["+k+"]",5000,false)));
   return {id:id as StimulusDefinition["id"],kind:"table",...head,columns,rows};
  }
  if(row.kind==="image"||row.kind==="chart"){
   const mediaRef=key(row.mediaRef,path+".mediaRef");
   if(!known.has(mediaRef))err(path+".mediaRef","Unknown embedded image");
   return {id:id as StimulusDefinition["id"],kind:row.kind,...head,
    assetId:mediaRef as ImageAsset["id"],
    altText:text(row.altText,path+".altText",500),
    ...(row.caption===undefined?{}:{caption:text(row.caption,path+".caption",500)})};
  }
  return err(path+".kind","Choose passage, case, table, image or chart");
 });
 return stimuli;
}
function toAnswer(value:unknown,kind:QuestionKind,path:string):string{
 if(kind==="numeric-entry"){
  const values=Array.isArray(value)?array(value,path,20,1):[value];
  return values.map((item,i)=>String(num(item,path+"["+i+"]",-1e12,1e12))).join(",");
 }
 if(kind==="true-false"){
  if(typeof value==="boolean")return value?"True":"False";
  if(value!=="True"&&value!=="False")return err(path,"Use true/false or True/False");
  return value;
 }
 return text(kind==="free-response"&&value===undefined?"":value,path,100,kind!=="free-response");
}
export function toAuthoringDraft(value:unknown):AuthoringDraft {
 validateExamImportBudget(value);
 const bank=object(value,"$",["format","version","bankId","examId","paperId",
  "title","edition","revision","scoring","timing","navigation","sections",
  "stimuli","media","questions"]);
 if(bank.format!=="practice-desk-authoring"||bank.version!==1)
  err("$.format","Expected practice-desk-authoring version 1");
 const bankId=key(bank.bankId,"$.bankId");
 const examId=key(bank.examId,"$.examId"),paperId=key(bank.paperId,"$.paperId");
 const title=text(bank.title,"$.title",180);
 if(bank.edition!=="custom")
  err("$.edition","P57-A source files support custom only; source/reviewed authenticity awaits P57-B/C");
 const revision=num(bank.revision,"$.revision",1,1000000,true);
 const scoring=object(bank.scoring,"$.scoring",["correctMarks","incorrectMarks"]);
 const marksCorrect=num(scoring.correctMarks,"$.scoring.correctMarks",0.01,1000);
 const marksIncorrect=num(scoring.incorrectMarks,"$.scoring.incorrectMarks",-1000,0);
 const timing=object(bank.timing,"$.timing",
  ["kind","minutes","pausePolicy","sectionTransition","allowEarlySubmit"]);
 if(!["untimed","whole-paper","sectional"].includes(String(timing.kind)))
  err("$.timing.kind","Unknown timing kind");
 if(timing.kind==="whole-paper"&&timing.minutes===undefined)
  err("$.timing.minutes","Whole-paper timing requires a positive duration");
 if(timing.kind!=="whole-paper"&&timing.minutes!==undefined)
  err("$.timing.minutes","Minutes belong on whole-paper timing; sectional minutes belong on sections");
 const durationMinutes=timing.kind==="whole-paper"?
  num(timing.minutes,"$.timing.minutes",1,600,true):0;
 const pausePolicy=timing.pausePolicy??"allowed";
 if(pausePolicy!=="allowed"&&pausePolicy!=="forbidden")
  err("$.timing.pausePolicy","Invalid pause policy");
 const sectionTransition=timing.sectionTransition??"manual";
 if(sectionTransition!=="manual"&&sectionTransition!=="automatic")
  err("$.timing.sectionTransition","Invalid section transition");
 const allowEarlySubmit=timing.allowEarlySubmit===undefined?true:
  bool(timing.allowEarlySubmit,"$.timing.allowEarlySubmit");
 const navigation=object(bank.navigation,"$.navigation",
  ["questionNavigation","sectionNavigation","allowReview"]);
 const questionNavigation=navigation.questionNavigation??"free";
 const sectionNavigation=navigation.sectionNavigation??"free";
 const allowReview=navigation.allowReview===undefined?true:
  bool(navigation.allowReview,"$.navigation.allowReview");
 if(questionNavigation!=="free"&&questionNavigation!=="forward-only")
  err("$.navigation.questionNavigation","Invalid question navigation");
 if(sectionNavigation!=="free"&&sectionNavigation!=="sequential-locked")
  err("$.navigation.sectionNavigation","Invalid section navigation");
 if(timing.kind==="sectional"&&sectionNavigation!=="sequential-locked")
  err("$.navigation.sectionNavigation","Sectional timing requires sequential-locked sections");
 const sections=new Map<string,{title:string;minutes:number}>();
 const titles=new Set<string>();
 array(bank.sections,"$.sections",40,1).forEach((v,i)=>{
  const path="$.sections["+i+"]";
  const row=object(v,path,["id","title","minutes"]);
  const id=key(row.id,path+".id");
  if(sections.has(id))err(path+".id","Duplicate physical section");
  const label=text(row.title,path+".title",100).trim();
  if(titles.has(label))err(path+".title","Physical section titles must be distinct");
  titles.add(label);
  if(timing.kind==="sectional"&&row.minutes===undefined)
   err(path+".minutes","Sectional timing requires explicit positive minutes");
  if(timing.kind!=="sectional"&&row.minutes!==undefined)
   err(path+".minutes","Section minutes require sectional timing");
  const minutes=row.minutes===undefined?0:num(row.minutes,path+".minutes",1,600,true);
  sections.set(id,{title:label,minutes});
 });
 const assets=media(bank.media);
 const known=new Set(assets.map(a=>a.id as string));
 const stimuli=sharedStimuli(bank.stimuli,known);
 const knownStimuli=new Set(stimuli.map(s=>s.id as string));
 const qIds=new Set<string>();
 const questions:AuthoringQuestion[]=array(bank.questions,"$.questions",200,1).map((item,i)=>{
  const path="$.questions["+i+"]";
  const q=object(item,path,["id","examSection","subject","syllabusHeadingId",
   "topic","subtopic","difficulty","kind","prompt","stimulusRef","options",
   "leftItems","rightItems","explanation","answer","tolerance","minSelections",
   "maxSelections","partialCreditEach","partialPenaltyEach","provenance","qa"]);
  const id=key(q.id,path+".id");
  if(qIds.has(id))err(path+".id","Duplicate semantic question ID");
  qIds.add(id);
  const sectionId=key(q.examSection,path+".examSection");
  const section=sections.get(sectionId);
  if(!section)err(path+".examSection","Unknown physical exam section");
  const kind=q.kind;
  if(typeof kind!=="string"||!QUESTION_KINDS.includes(kind as QuestionKind))
   err(path+".kind","Choose one of the six supported question kinds");
  const questionKind=kind as QuestionKind;
  const prompt=rich(q.prompt,path+".prompt",known);
  if(!publicationPlainText(prompt))err(path+".prompt","Question stem is empty");
  const explanation=rich(q.explanation??"",path+".explanation",known);
  const passage=empty();
  const options=questionKind==="single-choice"||questionKind==="multiple-select"?
    four(q.options,path+".options",known):Array.from({length:4},empty);
  if(!["single-choice","multiple-select"].includes(questionKind)&&q.options!==undefined)
   err(path+".options","Options belong to choice questions only");
  const leftItems=questionKind==="matching"?four(q.leftItems,path+".leftItems",known):
   Array.from({length:4},empty);
  const rightItems=questionKind==="matching"?four(q.rightItems,path+".rightItems",known):
   Array.from({length:4},empty);
  if(questionKind!=="matching"&&(q.leftItems!==undefined||q.rightItems!==undefined))
   err(path+".leftItems","Matching items belong to matching questions only");
  const answer=toAnswer(q.answer,questionKind,path+".answer");
  const tolerance=q.tolerance===undefined?0:num(q.tolerance,path+".tolerance",0,1000000);
  if(questionKind!=="numeric-entry"&&q.tolerance!==undefined)
   err(path+".tolerance","Tolerance applies only to numeric-entry questions");
  const minSelections=q.minSelections===undefined?1:
   num(q.minSelections,path+".minSelections",1,4,true);
  const maxSelections=q.maxSelections===undefined?4:
   num(q.maxSelections,path+".maxSelections",1,4,true);
  if(minSelections>maxSelections)err(path+".minSelections","Minimum exceeds maximum");
  if(questionKind!=="multiple-select"&&(q.minSelections!==undefined||q.maxSelections!==undefined))
   err(path+".minSelections","Selection limits apply only to multiple-select");
  const partialCreditEach=q.partialCreditEach===undefined?0:
   num(q.partialCreditEach,path+".partialCreditEach",0,1000);
  const partialPenaltyEach=q.partialPenaltyEach===undefined?0:
   num(q.partialPenaltyEach,path+".partialPenaltyEach",0,1000);
  if(!["multiple-select","matching"].includes(questionKind)&&
     (q.partialCreditEach!==undefined||q.partialPenaltyEach!==undefined))
   err(path+".partialCreditEach","Component marks belong to multiple/matching");
  const provenance=object(q.provenance,path+".provenance",["kind","sourceNote","examYear","sources"]);
  if(!["ai-original","manual","reconstruction","official-pyq"].includes(String(provenance.kind)))
   err(path+".provenance.kind","Provenance must name an author-supplied origin");
  const sourceNote=provenance.sourceNote===undefined?undefined:
   text(provenance.sourceNote,path+".provenance.sourceNote",300,false);
  const examYear=provenance.examYear===undefined?undefined:
   num(provenance.examYear,path+".provenance.examYear",1900,2100,true);
  const sources=provenance.sources===undefined?undefined:
   array(provenance.sources,path+".provenance.sources",12).map((v,k)=>{
    const at=path+".provenance.sources["+k+"]";
    const s=object(v,at,["publisher","title","url","section","page","provision",
     "publicationDate","asOfDate","stance"]);
    const clean:Record<string,string>={publisher:text(s.publisher,at+".publisher",180),
     title:text(s.title,at+".title",240)};
    for(const field of ["url","section","page","provision","publicationDate","asOfDate","stance"]){
     if(s[field]!==undefined)clean[field]=text(s[field],at+"."+field,
      field==="url"?2048:field==="page"?80:field.includes("Date")?10:180);
    }
    if(clean.url!==undefined&&!/^https:\/\/[^\s/@]+(?::[0-9]+)?(?:\/[^\s]*)?$/iu.test(clean.url))
     err(at+".url","Use only HTTPS URLs with a host and no embedded credentials");
    for(const field of ["publicationDate","asOfDate"]){
     const date=clean[field];
     if(date!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||
       Number.isNaN(Date.parse(date+"T00:00:00.000Z"))||
       new Date(date+"T00:00:00.000Z").toISOString().slice(0,10)!==date))
      err(at+"."+field,"Use a real ISO calendar date YYYY-MM-DD");
    }
    if(clean.stance!==undefined&&!["supports","disputes"].includes(clean.stance))
     err(at+".stance","Use supports or disputes, as an unverified author claim");
    return clean as NonNullable<NonNullable<AuthoringQuestion["provenance"]>["sources"]>[number];
   });
  const qa=object(q.qa,path+".qa",["status"]);
  if(qa.status!=="unchecked"&&qa.status!=="needs-review")
   err(path+".qa.status","Only unchecked or needs-review are accepted; no self-certification");
  const stimulusRef=q.stimulusRef===undefined?undefined:key(q.stimulusRef,path+".stimulusRef");
  if(stimulusRef&&!knownStimuli.has(stimulusRef))
   err(path+".stimulusRef","Unknown shared passage/table/chart/image");
  const subject=q.subject===undefined?"":text(q.subject,path+".subject",120,false);
  const syllabusHeadingId=q.syllabusHeadingId===undefined?"":text(q.syllabusHeadingId,path+".syllabusHeadingId",80,false);
  if(syllabusHeadingId&&subject)err(path+".subject","Use official heading OR custom subject");
  const topic=q.topic===undefined?"":text(q.topic,path+".topic",120,false);
  const subtopic=q.subtopic===undefined?"":text(q.subtopic,path+".subtopic",120,false);
  const difficulty=q.difficulty===undefined?"":q.difficulty;
  if(!["","easy","medium","hard"].includes(String(difficulty)))
   err(path+".difficulty","Invalid difficulty label");
  return {id,section:section!.title,subject,syllabusHeadingId,
   topic,subtopic,difficulty:difficulty as NonNullable<AuthoringQuestion["difficulty"]>,
   sectionMinutes:section!.minutes,minSelections,maxSelections,
   partialCreditEach,partialPenaltyEach,
   kind:questionKind,prompt,passage,options,leftItems,rightItems,explanation,
   answer,tolerance,source:sourceNote??"",
   ...(stimulusRef?{stimulusRef}:{}),
   sourceOrigin:{bankId,questionId:id,...(stimulusRef?{stimulusId:stimulusRef}:{})},
   provenance:{kind:provenance.kind as NonNullable<AuthoringQuestion["provenance"]>["kind"],
     ...(sourceNote===undefined?{}:{sourceNote}),
     ...(examYear===undefined?{}:{examYear}),...(sources===undefined?{}:{sources})},
   qa:{status:qa.status as NonNullable<AuthoringQuestion["qa"]>["status"]}};
 });
 const draft:AuthoringDraft={schema:1,id:"agent:"+bankId,ingestionMode:"external-source",examId,paperId,title,
  edition:"custom",revision,durationMinutes,
  timingKind:timing.kind as NonNullable<AuthoringDraft["timingKind"]>,
  pausePolicy:pausePolicy as NonNullable<AuthoringDraft["pausePolicy"]>,
  questionNavigation:questionNavigation as NonNullable<AuthoringDraft["questionNavigation"]>,
  sectionNavigation:sectionNavigation as NonNullable<AuthoringDraft["sectionNavigation"]>,
  sectionTransition:sectionTransition as NonNullable<AuthoringDraft["sectionTransition"]>,
  allowEarlySubmit,allowReview,marksCorrect,marksIncorrect,
  updatedAt:"1970-01-01T00:00:00.000Z",assets,stimuli,questions};
 try{return validateAuthoringDraft(draft);}
 catch(error){return err("$",error instanceof Error?error.message:"Invalid canonical authoring draft");}
}
export function inspectExternalQuestionBank(value:unknown,existing:readonly ExamPackage[]=[],comparisonSources:readonly unknown[]=[]):ExternalBankReport {
 const questionCount=Array.isArray((value as {questions?:unknown}|null)?.questions)?
  ((value as {questions:unknown[]}).questions.length):0;
 try{
  const draft=toAuthoringDraft(value);
  // Preserve the precise candidate-answer-leak issue code even when the
  // shared Wordgard publisher now rejects that same defect before compilation.
  const explicitLeaks=inspectCandidateIntegrity(draft).filter(x=>x.severity==="error");
  if(explicitLeaks.length)return {valid:false,questionCount:draft.questions.length,
   editorialStatus:"caution",factualVerification:"not-performed",
   issues:explicitLeaks.map(x=>({path:"$.questions[id="+x.questionId+"]."+x.field,
    code:x.code,severity:x.severity,message:x.message,questionId:x.questionId,
    basis:"deterministic" as const,suggestion:x.suggestion}))};
  const check=inspectAuthoringPublication(draft,existing);
  if(!check.valid||!check.compiled){
   return {valid:false,questionCount:draft.questions.length,editorialStatus:"caution",
    factualVerification:"not-performed",issues:(check.issues.length?check.issues:[{
     field:"Publication integrity",reason:"Publisher returned no compiled package"
    }]).map(issue=>({
     path:issue.questionId?"$.questions[id="+issue.questionId+"]."+issue.field:
      "$."+issue.field,
     code:"publication-invalid" as const,severity:"error" as const,
     message:issue.reason,...(issue.questionId?{questionId:issue.questionId}:{})
    }))};
  }
  const comparisons=comparisonSources.map((raw,i)=>{
   try{
    const source=raw as {bankId?:unknown;revision?:unknown};
    const bankId=key(source?.bankId,"comparisons["+i+"].bankId");
    const revision=num(source?.revision,"comparisons["+i+"].revision",1,1000000,true);
    return {bankId,revision,draft:toAuthoringDraft(raw)};
   }catch(error){return err("comparisons["+i+"]",error instanceof Error?error.message:"Invalid comparison source");}
  });
  const bankId=key((value as {bankId?:unknown}).bankId,"$.bankId");
  const quality=inspectExternalQuality(draft,check.compiled,bankId,comparisons,value);
  return {valid:quality.summary.errors===0,questionCount:draft.questions.length,
   issues:quality.issues,quality,editorialStatus:"caution",
   factualVerification:"not-performed",
   ...(quality.summary.errors===0?{compiled:check.compiled}:{})};
 }catch(error){
  const issues=error instanceof ExternalBankError?error.issues:[{
   path:"$",code:"source-invalid" as const,severity:"error" as const,
   message:error instanceof Error?error.message:"Invalid authoring source"
  }];
  return {valid:false,questionCount,issues,editorialStatus:"caution",
   factualVerification:"not-performed"};
 }
}
export function compileExternalQuestionBank(value:unknown,existing:readonly ExamPackage[]=[],comparisonSources:readonly unknown[]=[]):ExamPackage {
 const report=inspectExternalQuestionBank(value,existing,comparisonSources);
 if(!report.valid||!report.compiled)throw new ExternalBankError(report.issues);
 return report.compiled;
}
