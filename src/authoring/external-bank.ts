/** P57-A: one deliberately small, vendor-neutral, offline AI/human authoring source.
 * This is NOT an editorial factual-verification service. Untrusted source and QA
 * assertions are always published with caution via the existing Wordgard compiler.
 */
import {validateExamImportBudget,validateExamPackage} from "../domain/exam-package.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import {assertTaxonomyExam,resolveTaxonomyPath,taxonomyPathNodes,validateExamTaxonomy} from "../domain/taxonomy.ts";
import type {AuthoringDraft,AuthoringQuestion,AuthoringMarkingRule} from "./authoring-draft.ts";
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
import {WORD_COUNT_POLICIES} from "../domain/word-count.ts";
import type {CandidateReferenceSource} from "../domain/candidate-reference.ts";

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
const documents=(items:unknown,path:string,known:ReadonlySet<string>,min:number,max=26):RichDocument[]=>
 array(items,path,max,min).map((v,i)=>rich(v,path+"["+i+"]",known));
const markRule=(value:unknown,path:string):AuthoringMarkingRule=>{
 const rule=object(value,path,["correctMarks","incorrectMarks","unansweredMarks"]);
 const correctMarks=num(rule.correctMarks,path+".correctMarks",0,1000);
 const incorrectMarks=num(rule.incorrectMarks,path+".incorrectMarks",-1000,0);
 const unansweredMarks=num(rule.unansweredMarks,path+".unansweredMarks",-1000,1000);
 if(unansweredMarks<incorrectMarks||unansweredMarks>correctMarks)
  return err(path+".unansweredMarks","Blank marks must lie between incorrect and correct marks");
 return {correctMarks,incorrectMarks,unansweredMarks};
};
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
  "title","edition","revision","scoring","timing","navigation","tools","practiceModes","sections",
  "references","stimuli","media","questions"]);
 if(bank.format!=="practice-desk-authoring"||bank.version!==1)
  err("$.format","Expected practice-desk-authoring version 1");
 const bankId=key(bank.bankId,"$.bankId");
 const examId=key(bank.examId,"$.examId"),paperId=key(bank.paperId,"$.paperId");
 const title=text(bank.title,"$.title",180);
 if(bank.edition!=="custom")
  err("$.edition","P57-A source files support custom only; source/reviewed authenticity awaits P57-B/C");
 const revision=num(bank.revision,"$.revision",1,1000000,true);
 const scoring=object(bank.scoring,"$.scoring",["correctMarks","incorrectMarks","unansweredMarks","decimalPlaces","byQuestionKind"]);
 const defaultRule=markRule({correctMarks:scoring.correctMarks,incorrectMarks:scoring.incorrectMarks,
  unansweredMarks:scoring.unansweredMarks??0},"$.scoring");
 const marksCorrect=defaultRule.correctMarks,marksIncorrect=defaultRule.incorrectMarks,
  marksUnanswered=defaultRule.unansweredMarks;
 const scoreDecimalPlaces=scoring.decimalPlaces===undefined?2:
  num(scoring.decimalPlaces,"$.scoring.decimalPlaces",0,6,true);
 let kindScoring:AuthoringDraft["kindScoring"];
 if(scoring.byQuestionKind!==undefined){
  const by=object(scoring.byQuestionKind,"$.scoring.byQuestionKind",QUESTION_KINDS);
  const parsed:Partial<Record<QuestionKind,AuthoringMarkingRule>>={};
  for(const [kind,value] of Object.entries(by))parsed[kind as QuestionKind]=markRule(value,"$.scoring.byQuestionKind."+kind);
  kindScoring=parsed;
 }
 let practiceModes:AuthoringDraft["practiceModes"];
 if(bank.practiceModes!==undefined){
  const values=array(bank.practiceModes,"$.practiceModes",3,1).map((value,i)=>{
   if(!["strict","free","single"].includes(String(value)))return err("$.practiceModes["+i+"]","Choose strict, free or single");
   return value as "strict"|"free"|"single";
  });
  if(new Set(values).size!==values.length)return err("$.practiceModes","Duplicate practice mode");
  practiceModes=values;
 }
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
 let calculatorTool:AuthoringDraft["calculatorTool"];
 let wordCountPolicy:AuthoringDraft["wordCountPolicy"]="auto";
 if(bank.tools!==undefined){
  const tools=object(bank.tools,"$.tools",["calculator","wordCount"]);
  if(tools.calculator!==undefined){
   if(tools.calculator!=="basic-v1")err("$.tools.calculator",'Expected "basic-v1"');
   calculatorTool="basic-v1";
  }
  if(tools.wordCount!==undefined){
   if(!WORD_COUNT_POLICIES.includes(tools.wordCount as AuthoringDraft["wordCountPolicy"]))
    err("$.tools.wordCount",'Expected "auto", "shown" or "hidden"');
   wordCountPolicy=tools.wordCount as AuthoringDraft["wordCountPolicy"];
  }
 }
 const sections=new Map<string,{title:string;minutes:number;scoringOverride?:AuthoringMarkingRule}>();
 const titles=new Set<string>();
 array(bank.sections,"$.sections",40,1).forEach((v,i)=>{
  const path="$.sections["+i+"]";
  const row=object(v,path,["id","title","minutes","scoringOverride"]);
  const id=key(row.id,path+".id");
  if(sections.has(id))err(path+".id","Duplicate physical section");
  const label=text(row.title,path+".title",100).trim();
  if(titles.has(label))err(path+".title","Physical section titles must be distinct");
  titles.add(label);
  if(timing.kind==="sectional"&&row.minutes===undefined)
   err(path+".minutes","Sectional timing requires explicit positive minutes");
  if(timing.kind!=="sectional"&&row.minutes!==undefined)
   err(path+".minutes","Section minutes require sectional timing");
  const minutes=row.minutes===undefined?0:num(row.minutes,path+".minutes",0,600,true);
  const scoringOverride=row.scoringOverride===undefined?undefined:markRule(row.scoringOverride,path+".scoringOverride");
  sections.set(id,{title:label,minutes,...(scoringOverride?{scoringOverride}:{})});
 });
 const assets=media(bank.media);
 const known=new Set(assets.map(a=>a.id as string));
 const referenceIds=new Set<string>();
 const references:CandidateReferenceSource[]=array(bank.references??[],"$.references",64).map((value,i)=>{
  const path="$.references["+i+"]",row=object(value,path,
   ["id","title","category","keywords","content"]);
  const id=key(row.id,path+".id");
  if(referenceIds.has(id))err(path+".id","Duplicate candidate reference ID");
  referenceIds.add(id);
  const document=rich(row.content,path+".content",known),assetIds=assetRefs(document);
  if(!publicationPlainText(document).trim()&&!assetIds.length)
   err(path+".content","Candidate reference must contain readable text, maths or an image");
  let keywords:string[]|undefined;
  if(row.keywords!==undefined){
   keywords=array(row.keywords,path+".keywords",24).map((item,j)=>
    text(item,path+".keywords["+j+"]",80));
   if(new Set(keywords).size!==keywords.length)err(path+".keywords","Duplicate candidate reference keyword");
  }
  return {id,title:text(row.title,path+".title",180),
   ...(row.category===undefined?{}:{category:text(row.category,path+".category",120)}),
   ...(keywords?.length?{keywords}:{}),document,...(assetIds.length?{assetIds}:{})};
 });
 const stimuli=sharedStimuli(bank.stimuli,known);
 const knownStimuli=new Set(stimuli.map(s=>s.id as string));
 const qIds=new Set<string>();
 const questions:AuthoringQuestion[]=array(bank.questions,"$.questions",200,1).map((item,i)=>{
  const path="$.questions["+i+"]";
  const q=object(item,path,["id","examSection","subject",
   "topic","subtopic","difficulty","kind","prompt","stimulusRef","options",
   "leftItems","rightItems","explanation","answer","tolerance","minSelections",
   "maxSelections","wordLimit","partialCreditEach","partialPenaltyEach","scoringOverride","provenance","qa"]);
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
    documents(q.options,path+".options",known,2):Array.from({length:4},empty);
  if(!["single-choice","multiple-select"].includes(questionKind)&&q.options!==undefined)
   err(path+".options","Options belong to choice questions only");
  const leftItems=questionKind==="matching"?documents(q.leftItems,path+".leftItems",known,1):
   Array.from({length:4},empty);
  const rightItems=questionKind==="matching"?documents(q.rightItems,path+".rightItems",known,1):
   Array.from({length:4},empty);
  if(questionKind!=="matching"&&(q.leftItems!==undefined||q.rightItems!==undefined))
   err(path+".leftItems","Matching items belong to matching questions only");
  const answer=toAnswer(q.answer,questionKind,path+".answer");
  let scoringOverride:AuthoringQuestion["scoringOverride"];
  if(q.scoringOverride!==undefined){
   scoringOverride=markRule(q.scoringOverride,path+".scoringOverride");
  }
  const tolerance=q.tolerance===undefined?0:num(q.tolerance,path+".tolerance",0,1000000);
  if(questionKind!=="numeric-entry"&&q.tolerance!==undefined)
   err(path+".tolerance","Tolerance applies only to numeric-entry questions");
  const choiceCount=Math.max(1,options.length);
  const minSelections=q.minSelections===undefined?1:
   num(q.minSelections,path+".minSelections",1,choiceCount,true);
  const maxSelections=q.maxSelections===undefined?choiceCount:
   num(q.maxSelections,path+".maxSelections",1,choiceCount,true);
  if(minSelections>maxSelections)err(path+".minSelections","Minimum exceeds maximum");
  if(questionKind!=="multiple-select"&&(q.minSelections!==undefined||q.maxSelections!==undefined))
   err(path+".minSelections","Selection limits apply only to multiple-select");
  const wordLimit=q.wordLimit===undefined?undefined:
   num(q.wordLimit,path+".wordLimit",1,10000,true);
  if(questionKind!=="free-response"&&q.wordLimit!==undefined)
   err(path+".wordLimit","Word limits apply only to written responses");
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
  const qa=object(q.qa,path+".qa",["status","applicability"]);
  let applicability:NonNullable<NonNullable<AuthoringQuestion["qa"]>["applicability"]>|undefined;
  // The author can declare applicability before review. This is a separate,
  // source-hash-bound assertion, never a fact-verified certification.
  if(qa.applicability!==undefined){
   const flags=object(qa.applicability,path+".qa.applicability",
    ["mathematical","legal","timeSensitive","asOfDate"]);
   for(const field of ["mathematical","legal","timeSensitive"]){
    if(typeof flags[field]!=="boolean")
     err(path+".qa.applicability."+field,"Explicit boolean applicability required");
   }
   if(flags.asOfDate!==null&&flags.asOfDate!==undefined){
    const asOfDate=text(flags.asOfDate,path+".qa.applicability.asOfDate",10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)||
       !Number.isFinite(Date.parse(asOfDate+"T00:00:00Z"))||
       new Date(asOfDate+"T00:00:00Z").toISOString().slice(0,10)!==asOfDate)
      err(path+".qa.applicability.asOfDate","Use a real ISO date");
   }
   if((flags.legal||flags.timeSensitive)&&!flags.asOfDate)
    err(path+".qa.applicability.asOfDate","Applicable source law/data must declare an as-of date");
   applicability={mathematical:flags.mathematical as boolean,legal:flags.legal as boolean,
    timeSensitive:flags.timeSensitive as boolean,
    ...(flags.asOfDate?{asOfDate:String(flags.asOfDate)}:{})};
  }
  if(qa.status!=="unchecked"&&qa.status!=="needs-review")
   err(path+".qa.status","Only unchecked or needs-review are accepted; no self-certification");
  const stimulusRef=q.stimulusRef===undefined?undefined:key(q.stimulusRef,path+".stimulusRef");
  if(stimulusRef&&!knownStimuli.has(stimulusRef))
   err(path+".stimulusRef","Unknown shared passage/table/chart/image");
  const subject=q.subject===undefined?"":text(q.subject,path+".subject",120,false);
  const topic=q.topic===undefined?"":text(q.topic,path+".topic",120,false);
  const subtopic=q.subtopic===undefined?"":text(q.subtopic,path+".subtopic",120,false);
  const difficulty=q.difficulty===undefined?"":q.difficulty;
  if(!["","easy","medium","hard"].includes(String(difficulty)))
   err(path+".difficulty","Invalid difficulty label");
  return {id,section:section!.title,subject,
   topic,subtopic,difficulty:difficulty as NonNullable<AuthoringQuestion["difficulty"]>,
   minSelections,maxSelections,
   ...(questionKind==="free-response"&&wordLimit!==undefined?{wordLimit}:{}),
   ...(scoringOverride?{scoringOverride}:{}),
   partialCreditEach,partialPenaltyEach,
   kind:questionKind,prompt,passage,options,leftItems,rightItems,explanation,
   answer,tolerance,source:sourceNote??"",
   ...(stimulusRef?{stimulusRef}:{}),
   sourceOrigin:{bankId,questionId:id,...(stimulusRef?{stimulusId:stimulusRef}:{})},
   provenance:{kind:provenance.kind as NonNullable<AuthoringQuestion["provenance"]>["kind"],
     ...(sourceNote===undefined?{}:{sourceNote}),
     ...(examYear===undefined?{}:{examYear}),...(sources===undefined?{}:{sources})},
   qa:{status:qa.status as NonNullable<AuthoringQuestion["qa"]>["status"],
    ...(applicability?{applicability}:{})}};
 });
 const draft:AuthoringDraft={schema:1,id:"agent:"+bankId,ingestionMode:"external-source",examId,paperId,title,
  edition:"custom",revision,durationMinutes,
  timingKind:timing.kind as AuthoringDraft["timingKind"],
  pausePolicy:pausePolicy as AuthoringDraft["pausePolicy"],
  questionNavigation:questionNavigation as AuthoringDraft["questionNavigation"],
  sectionNavigation:sectionNavigation as AuthoringDraft["sectionNavigation"],
  sectionTransition:sectionTransition as AuthoringDraft["sectionTransition"],
  allowEarlySubmit,allowReview,...(calculatorTool?{calculatorTool}:{}),wordCountPolicy,
  ...(practiceModes?{practiceModes}:{}),marksCorrect,marksIncorrect,marksUnanswered,scoreDecimalPlaces,
  ...(kindScoring&&Object.keys(kindScoring).length?{kindScoring}:{}),
  updatedAt:"1970-01-01T00:00:00.000Z",assets,
  ...(references.length?{references}:{}),
  sections:[...sections.values()].map(section=>({name:section.title,minutes:section.minutes,
   ...(section.scoringOverride?{scoringOverride:section.scoringOverride}:{})})),
  stimuli,questions};
 try{return validateAuthoringDraft(draft);}
 catch(error){return err("$",error instanceof Error?error.message:"Invalid canonical authoring draft");}
}
export function inspectExternalQuestionBank(value:unknown,existing:readonly ExamPackage[]=[],comparisonSources:readonly unknown[]=[]):ExternalBankReport {
 const questionCount=Array.isArray((value as {questions?:unknown}|null)?.questions)?
  ((value as {questions:unknown[]}).questions.length):0;
 // Give external source authors a precise structural error before conversion
 // to the canonical draft, whose sections intentionally cannot be empty.
 const raw=value as {sections?:unknown;questions?:unknown}|null;
 if(Array.isArray(raw?.sections)&&Array.isArray(raw?.questions)){
  const used=new Set(raw.questions.flatMap(item=>
   item&&typeof item==="object"&&typeof (item as {examSection?:unknown}).examSection==="string"?
    [(item as {examSection:string}).examSection]:[]));
  const empty=raw.sections.flatMap(item=>{
   if(!item||typeof item!=="object")return [];
   const id=(item as {id?:unknown}).id;
   return typeof id==="string"&&!used.has(id)?[id]:[];
  });
  if(empty.length)return {valid:false,questionCount,editorialStatus:"caution",
   factualVerification:"not-performed",issues:empty.map(id=>({
    path:"$.sections[id="+id+"]",code:"empty-exam-section",severity:"error" as const,
    message:"Physical exam section has no assigned questions"
   }))};
 }
 try{
  const draft=toAuthoringDraft(value);
  // Preserve the precise candidate-answer-leak issue code even when the
  // shared Wordgard publisher now rejects that same defect before compilation.
  const explicitLeaks=inspectCandidateIntegrity(draft).filter(x=>x.severity==="error");
  if(explicitLeaks.length)return {valid:false,questionCount:draft.questions.length,
   editorialStatus:"caution",factualVerification:"not-performed",
   issues:explicitLeaks.map(x=>({
    path:x.questionId?"$.questions[id="+x.questionId+"]."+x.field:"$."+x.field,
    code:x.code,severity:x.severity,message:x.message,
    ...(x.questionId?{questionId:x.questionId}:{}),
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

/** Bind an explicitly supplied exam taxonomy to an already canonical external-source package.
 * This never discovers taxonomy from examId. The authored Subject → Topic → Subtopic path
 * must resolve exactly (canonical label or declared alias) and source/package order parity
 * must hold before stable question-revision assignments are emitted.
 */
export function bindExternalQuestionTaxonomy(value:unknown,pkg:ExamPackage,input:unknown):ExamPackage {
 const taxonomy=validateExamTaxonomy(input);
 assertTaxonomyExam(taxonomy,pkg.examId);
 const draft=toAuthoringDraft(value);
 if(draft.examId!==pkg.examId)throw Error("Taxonomy binding source/package exam mismatch");
 if(draft.questions.length!==pkg.questions.length)
  throw Error("Taxonomy binding needs source/package question parity");
 const assignments:Record<string,string>={};
 for(let i=0;i<draft.questions.length;i++){
  const q=draft.questions[i]!,subject=(q.subject??"").trim(),
   topic=(q.topic??"").trim(),subtopic=(q.subtopic??"").trim();
  if(!subject)throw Error("Maintained taxonomy classification requires a subject: "+q.id);
  const labels=[subject,...(topic?[topic]:[]),...(subtopic?[subtopic]:[])];
  const node=resolveTaxonomyPath(taxonomy,labels);
  if(!node)throw Error("Authored classification is absent from taxonomy for "+q.id+": "+labels.join(" > "));
  const hierarchy=taxonomyPathNodes(taxonomy,node.id);
  if(hierarchy[0]?.kind!=="subject")throw Error("Taxonomy assignment must resolve from a subject root");
  assignments[pkg.questions[i]!.id]=node.id;
 }
 return validateExamPackage({...pkg,taxonomy,taxonomyAssignments:assignments});
}
