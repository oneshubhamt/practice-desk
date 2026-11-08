/** P47-5D: vendor-neutral, deterministic publication boundary.
 * Never store Wordgard internals, DOM HTML, editable draft IDs or unsigned keys
 * as scored content. A published package enters the existing validated IDB path.
 */
import type {ExamPackage} from "../app/exam-package.ts";
import {validateExamPackage} from "../app/exam-package.ts";
import type {AuthoringDraft,AuthoringQuestion} from "./authoring-draft.ts";
import {validateAuthoringDraft} from "./authoring-draft.ts";
import type {CorrectAnswer,AnswerKeyEntry,AnswerKeyRevision} from "../domain/answer-key.ts";
import type {PaperRevision,SectionDefinition,TimingPolicy} from "../domain/exam.ts";
import {attributedTopicPath,topicAncestors} from "../learning/syllabus-taxonomy.ts";
import type {QuestionContent,QuestionRevision,QuestionKind,StimulusDefinition,ImageAsset} from "../domain/question.ts";
import type {RichBlock,RichDocument,RichInline} from "../domain/rich-document.ts";
import {validateRichDocument} from "../domain/rich-document.ts";
import {publicationPlainText} from "./plain-rich-text.ts";
import {inspectCandidateIntegrity} from "./candidate-integrity.ts";
export {publicationPlainText} from "./plain-rich-text.ts";
import type {AssetId,QuestionRevisionId,QuestionId,OptionId,MatchItemId,
 ExamId,PaperId,PaperRevisionId,SectionId,StimulusId,AnswerKeyRevisionId} from "../domain/ids.ts";
import {sha256} from "../domain/hash.ts";
import {questionRevisionHash,answerKeyRevisionHash,paperRevisionHash} from "../domain/integrity.ts";

export type PublicationIssue={
 readonly questionId?:string;
 readonly field:string;
 readonly reason:string;
};
export class PublicationValidationError extends Error{
 readonly issues:readonly PublicationIssue[];
 constructor(issues:readonly PublicationIssue[]){
  super(issues.map(i=>(i.questionId?"Question "+i.questionId+" · ":"")+i.field+": "+i.reason).join("\n"));
  this.name="PublicationValidationError";
  this.issues=issues;
 }
}
const letters=["A","B","C","D"] as const;
const id=(label:string,value:string)=>label+":"+sha256(value).slice(0,24);
const shell=(doc:RichDocument):RichDocument=>validateRichDocument(doc,{
 knownAssets:new Set([...collectAssets(doc)])
});
function collectAssets(doc:RichDocument):Set<string>{
 const ids=new Set<string>();
 const row=(items:readonly RichInline[])=>{for(const item of items)if(item.type==="image")ids.add(item.assetId);};
 for(const block of doc.blocks){
  if(block.type==="paragraph"||block.type==="heading")row(block.content);
  else if(block.type==="list")block.items.forEach(row);
  else if(block.type==="table")block.rows.forEach(cells=>cells.forEach(row));
  else if(block.type==="image")ids.add(block.assetId);
 }
 return ids;
}
const resources=(doc:RichDocument):AssetId[]=>[...collectAssets(doc)] as AssetId[];
const hasContent=(doc:RichDocument):boolean=>publicationPlainText(doc).length>0;
const name=(n:number)=>"Question "+n;
const answerText=(raw:string,kind:QuestionKind):CorrectAnswer=>{
 const value=raw.trim();
 if(kind==="single-choice"){
  const option=value.toUpperCase();
  if(!letters.includes(option as typeof letters[number]))throw Error("Enter one correct option A, B, C or D");
  return {kind,optionId:option as OptionId};
 }
 if(kind==="multiple-select"){
  const options=value.toUpperCase().replace(/[\s,;+]/g,"");
  if(!/^[A-D]{1,4}$/.test(options)||new Set(options).size!==options.length)
    throw Error("Use unique option letters, e.g. A,C or B,D");
  return {kind,optionIds:[...options].sort() as OptionId[]};
 }
 if(kind==="numeric-entry"){
  const parts=value.split(",").map(x=>x.trim());
  if(!parts.length||parts.length>20||
     parts.some(x=>!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(x)))
    throw Error("Enter 1–20 finite numbers separated by commas (e.g. 4, 4.5)");
  const acceptedValues=parts.map(Number);
  if(acceptedValues.some(x=>!Number.isFinite(x)))throw Error("Numeric answer must be finite");
  return {kind,acceptedValues,absoluteTolerance:0};
 }
 if(kind==="true-false"){
  if(!["true","false"].includes(value.toLowerCase()))throw Error("Enter True or False");
  return {kind,value:value.toLowerCase()==="true"};
 }
 if(kind==="matching"){
  // Preferred: 1-C,2-A,3-D,4-B; abbreviated equivalent: C,A,D,B.
  const entries=value.toUpperCase().split(",").map(s=>s.trim());
  if(entries.length!==4)throw Error("Enter four matching pairs: 1-C,2-A,3-D,4-B");
  const mapped=entries.map((x,i)=>{
   const m=/^([1-4])\s*[-:=]\s*([A-D])$/.exec(x);
   if(m)return {left:Number(m[1]),right:m[2]!};
   if(/^[A-D]$/.test(x))return {left:i+1,right:x};
   throw Error("Matching format: 1-C,2-A,3-D,4-B (or C,A,D,B)");
  });
  if(new Set(mapped.map(x=>x.left)).size!==4||new Set(mapped.map(x=>x.right)).size!==4)
   throw Error("Match each left and right item exactly once");
  return {kind,pairs:mapped.sort((a,b)=>a.left-b.left)
   .map(pair=>({leftId:("L"+pair.left) as MatchItemId,rightId:pair.right as MatchItemId}))};
 }
 return {kind:"free-response",evaluation:"manual"};
};
const keyFrom=(q:AuthoringQuestion):CorrectAnswer=>{
 const result=answerText(q.answer,q.kind);
 if(result.kind==="numeric-entry")return {...result,absoluteTolerance:q.tolerance??0};
 return result;
};
const sourceId=(d:AuthoringDraft)=>("authored:"+d.examId+":"+d.paperId) as PaperId;
const revisionId=(d:AuthoringDraft)=>sourceId(d)+":r"+d.revision+":"+d.edition;
function validIdentity(s:string):boolean{return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s);}
function issuesFor(d:AuthoringDraft,existing:readonly ExamPackage[]):PublicationIssue[]{
 const issues:PublicationIssue[]=[];
 const put=(field:string,reason:string,questionId?:string)=>issues.push({
  field,reason,...(questionId?{questionId}:{})
 });
 if(!validIdentity(d.examId)||["new-exam"].includes(d.examId))
  put("Exam family ID","Replace the placeholder with a stable ID using letters, digits, _ or -");
 if(!validIdentity(d.paperId)||["new-paper"].includes(d.paperId))
  put("Paper ID","Replace the placeholder with a stable ID using letters, digits, _ or -");
 if(/^untitled question bank$/i.test(d.title.trim()))
  put("Paper title","Give this bank a meaningful title");
 const timingKind=d.timingKind??(d.durationMinutes?"whole-paper":"untimed");
 if(timingKind==="whole-paper"&&
    (!d.durationMinutes||!Number.isSafeInteger(d.durationMinutes)))
  put("Duration","Whole-paper timing requires positive whole minutes");
 if(timingKind==="sectional"&&d.sectionNavigation!=="sequential-locked")
  put("Section navigation","Sectional timers require sequential-locked sections");
 const sectionTimes=new Map<string,number>();
 for(const q of d.questions){
  if(timingKind!=="sectional")break;
  const duration=q.sectionMinutes??15;
  if(sectionTimes.has(q.section)&&sectionTimes.get(q.section)!==duration)
    put("Sectional timing","All questions in section "+q.section+" must have the same duration");
  sectionTimes.set(q.section,duration);
 }
 if(d.revision!==Math.trunc(d.revision))put("Revision","Revision must be a positive integer");
 const fullId=revisionId(d);
 if(existing.some(x=>x.paper.id===fullId))
  put("Revision","This paper/edition revision is already published. Increment Revision; never overwrite an earlier publication.");
 if(d.edition==="reviewed"&&!existing.some(x=>
  x.paper.paperId===sourceId(d)&&x.paper.edition==="source"))
  put("Edition","Publish a corresponding user-supplied Source transcription first; Reviewed must have an existing source counterpart");
 // The Wordgard/manual publisher must obey the same candidate-visible
 // explicit-answer leak blockers as AI source import, including rich stimuli.
 for(const issue of inspectCandidateIntegrity(d))
  if(issue.severity==="error")put("Candidate view · "+issue.field,issue.message,issue.questionId);
 for(const [index,q] of d.questions.entries()){
  const prefix=name(index+1),questionId=q.id;
  const item=(field:string,reason:string)=>put(prefix+" · "+field,reason,questionId);
  if(!hasContent(q.prompt))item("Question stem","Write a nonempty question or explicit equation");
  if(q.stimulusRef&&hasContent(q.passage))item("Shared stimulus","Choose a shared stimulus or a private passage, not both");
  if(d.edition!=="custom"&&q.source.trim().length<6)
   item("Provenance","Provide a source/reference note for each Source or Reviewed question");
  if(["single-choice","multiple-select"].includes(q.kind))
   q.options.forEach((o,i)=>{if(!hasContent(o))item("Option "+letters[i],"Option cannot be blank");});
  if(q.kind==="matching"){
   q.leftItems.forEach((o,i)=>{if(!hasContent(o))item("Left "+(i+1),"Matching item cannot be blank");});
   q.rightItems.forEach((o,i)=>{if(!hasContent(o))item("Right "+letters[i],"Matching item cannot be blank");});
  }
  if(q.kind==="multiple-select"){
   try{
    const key=keyFrom(q);
    if(key.kind==="multiple-select"&&
       (key.optionIds.length<(q.minSelections??1)||
        key.optionIds.length>(q.maxSelections??4)))
       item("Answer key","Correct option count must respect the published selection bounds");
   }catch{/* Separate answer-key error below has exact input details. */}
  }
  if((q.partialCreditEach??0)>0&&q.kind!=="multiple-select"&&q.kind!=="matching")
   item("Partial credit","Only matching and multiple-select support per-component credit");
  if((q.partialPenaltyEach??0)>0&&!q.partialCreditEach)
   item("Partial credit","A component penalty requires a positive partial-credit award");
  if(q.kind==="free-response"&&!hasContent(q.explanation)&&!q.answer.trim())
   item("Manual rubric","Supply an explanation or written model answer for manual evaluation");
  try{keyFrom(q);}catch(e){item("Answer key",e instanceof Error?e.message:"Invalid answer");}
  for(const [field,doc] of [
    ["Question stem",q.prompt],["Passage",q.passage],["Worked explanation",q.explanation],
    ...q.options.map((o,i)=>["Option "+letters[i],o] as const),
    ...q.leftItems.map((o,i)=>["Left "+(i+1),o] as const),
    ...q.rightItems.map((o,i)=>["Right "+letters[i],o] as const)
  ] as (readonly [string,RichDocument])[]){
   try{
    const normalized=shell(doc);
    if(JSON.stringify(doc)!==JSON.stringify(normalized))item(field,"Noncanonical document");
   }catch(e){item(field,e instanceof Error?e.message:"Malformed rich document");}
  }
 }
 return issues;
}
/** Authoritative dry-run: a green readiness report includes the EXACT compiled,
 * domain-validated immutable package that Publish will submit. An invalid draft
 * or a latent compiler/domain error can never be labelled "Ready to publish".
 * No persistent write, question-bank mutation or external effect is performed.
 */
export function inspectAuthoringPublication(
 draft:unknown,existing:readonly ExamPackage[]=[]
):{readonly valid:boolean;readonly issues:readonly PublicationIssue[];
 readonly estimatedQuestions:number;readonly compiled?:ExamPackage}{
 let d:AuthoringDraft;
 try{d=validateAuthoringDraft(draft);}
 catch(error){
  const reason=error instanceof Error?error.message:"Invalid authoring draft";
  return {valid:false,issues:[{field:"Draft structure",reason}],estimatedQuestions:0};
 }
 const issues=issuesFor(d,existing);
 if(issues.length)return {valid:false,issues,estimatedQuestions:d.questions.length};
 try{
  // Deliberately invoke the identical publisher (including exact frozen hash,
  // question, key, paper, media and rule validation) that the Publish action uses.
  const compiled=compileAuthoringPublication(d,existing);
  return {valid:true,issues:[],estimatedQuestions:d.questions.length,compiled};
 }catch(error){
  if(error instanceof PublicationValidationError)
   return {valid:false,issues:error.issues,estimatedQuestions:d.questions.length};
  return {valid:false,issues:[{field:"Publication integrity",
    reason:error instanceof Error?error.message:"Compiled package rejected"}],
    estimatedQuestions:d.questions.length};
 }
}
/** Generate content-addressed, SHA-256-validated exam data from the app-owned draft.
 * An unkeyed digest cannot authenticate the author or certify an exam source. */
export function compileAuthoringPublication(
 input:unknown,existing:readonly ExamPackage[]=[]
):ExamPackage{
 const d=validateAuthoringDraft(input);
 const issues=issuesFor(d,existing);
 if(issues.length)throw new PublicationValidationError(issues);
 const paperId=sourceId(d),base=revisionId(d),keyId=(base+":key") as AnswerKeyRevisionId;
 const known=new Set(d.assets.map(a=>a.id));
 const questions:QuestionRevision[]=[];
 const entries:AnswerKeyEntry[]=[];
 const mediaDigests=new Map(d.assets.map(a=>[a.id,a.contentHash]));
 const stimuli:StimulusDefinition[]=(d.stimuli??[]).map(s=>{
  const mediaRefs=s.kind==="passage"||s.kind==="case"?(s.assetIds??[]):
   s.kind==="image"||s.kind==="chart"?[s.assetId]:[];
  const linkedMedia=mediaRefs.map(ref=>[ref,mediaDigests.get(ref)]);
  return {...s,id:id("stimulus",sourceId(d)+":"+s.id+":"+
    JSON.stringify(s)+":"+JSON.stringify(linkedMedia)) as StimulusId};
 });
 const sharedStimuli=new Map<string,StimulusDefinition>((d.stimuli??[]).map(
  (s,i):[string,StimulusDefinition]=>[s.id,stimuli[i]!]));
 const usedStimuli=new Set<string>();
 const explanationTexts:Record<string,string>={};
 const groups=new Map<string,QuestionRevisionId[]>();
 const referenced=new Set<string>();
 const addRefs=(items:readonly string[])=>{for(const ref of items)referenced.add(ref);};
 for(const q of d.questions){
  const suffix=id("q",q.id);
  const revisionId=(base+":"+suffix) as QuestionRevisionId;
  const questionId=(paperId+":"+suffix) as QuestionId;
  const normalized=(doc:RichDocument)=>validateRichDocument(doc,{knownAssets:known});
  const prompt=normalized(q.prompt),explanation=normalized(q.explanation),passage=normalized(q.passage);
  // Only prompt figures belong to the candidate-visible assetIds field.
  // Explanation figures remain in the signed package for post-submit review.
  const stemRefs=[...new Set(resources(prompt))];
  const explanationRefs=[...new Set(resources(explanation))];
  addRefs(stemRefs);
  addRefs(explanationRefs);
  const hierarchy=topicAncestors(attributedTopicPath(d.examId,q.subject??"",
    q.syllabusHeadingId||undefined,q.topic??"",q.subtopic??"")).map(n=>n.id);
  const shared=q.stimulusRef?sharedStimuli.get(q.stimulusRef):undefined;
  if(shared){
   usedStimuli.add(shared.id);
   if(shared.kind==="passage"||shared.kind==="case")addRefs(shared.assetIds??[]);
   else if(shared.kind==="image"||shared.kind==="chart")addRefs([shared.assetId]);
  }
  const baseContent={
   prompt:publicationPlainText(prompt).slice(0,20000),
   topicIds:hierarchy as unknown as NonNullable<QuestionContent["topicIds"]>,
   ...(q.difficulty?{tags:["difficulty:"+q.difficulty]}:{}),
   richPrompt:prompt,
   ...(hasContent(explanation)?{richExplanation:explanation}:{}),
   ...(stemRefs.length?{assetIds:stemRefs}:{}),
   ...(explanationRefs.length?{explanationAssetIds:explanationRefs}:{}),
   ...(shared?{stimulusId:shared.id}:
      hasContent(passage)?{stimulusId:(revisionId+":stimulus") as StimulusId}:{})
  };
  if(hasContent(passage)&&!shared){
   const assetIds=resources(passage);
   addRefs(assetIds);
   usedStimuli.add((revisionId+":stimulus") as StimulusId);
   stimuli.push({id:(revisionId+":stimulus") as StimulusId,kind:"passage",
     text:publicationPlainText(passage).slice(0,20000),richText:passage,
     ...(assetIds.length?{assetIds}:{})});
  }
  let content:QuestionContent;
  const item=(doc:RichDocument,id:string)=>{
   const richText=normalized(doc),assetIds=resources(richText);
   addRefs(assetIds);
   return {id:id as OptionId,text:publicationPlainText(richText).slice(0,20000),richText,
     ...(assetIds.length?{assetIds}:{})};
  };
  if(q.kind==="single-choice"||q.kind==="multiple-select"){
   const options=q.options.map((doc,i)=>item(doc,letters[i]!));
   content=q.kind==="single-choice"?{...baseContent,kind:q.kind,options}:
    {...baseContent,kind:q.kind,options,
      minSelections:q.minSelections??1,maxSelections:q.maxSelections??4};
  }else if(q.kind==="numeric-entry"){
   content={...baseContent,kind:q.kind,numericRules:{allowNegative:true}};
  }else if(q.kind==="true-false"){
   content={...baseContent,kind:q.kind};
  }else if(q.kind==="matching"){
   const items=(docs:readonly RichDocument[],labels:readonly string[])=>docs.map((doc,i)=>{
    const result=item(doc,labels[i]!);
    return {...result,id:result.id as unknown as MatchItemId};
   });
   content={...baseContent,kind:q.kind,
    leftItems:items(q.leftItems,["L1","L2","L3","L4"]),
    rightItems:items(q.rightItems,letters)};
  }else{
   content={...baseContent,kind:"free-response",responseRules:{minWords:1,maxWords:10000}};
  }
  const editorial={
   status:"caution" as const,
   ...(q.provenance?.sources?.some(s=>s.url)?{sources:q.provenance.sources.filter(
    (s):s is typeof s & {url:string}=>typeof s.url==="string")
     .map(s=>({title:s.publisher+" — "+s.title,url:s.url}))}:{}),
   notes:"User-authored "+d.edition+" question; answer and source have not been independently certified."+
    (q.provenance?" Claimed origin: "+q.provenance.kind+" (not authenticated).":"")+
    (q.qa?" Author QA state: "+q.qa.status+".":"")+
    (q.qa?.review?" Author-entered review/QA acknowledgement (identity NOT authenticated): "+
      "claimed reviewer "+q.qa.review.reviewer+"; timestamp "+q.qa.review.reviewedAt+
      "; accepted warning codes "+(q.qa.review.acceptedWarningCodes.join(", ")||"none")+
      "; author's note: "+q.qa.review.note+".":"")+
    (q.provenance?.examYear?" Claimed exam year: "+q.provenance.examYear+".":"")+
    (q.sourceOrigin?" Original AI input identity (author-attributed): bank "+
      q.sourceOrigin.bankId+", question "+q.sourceOrigin.questionId+
      (q.sourceOrigin.stimulusId?", stimulus "+q.sourceOrigin.stimulusId:"")+".":"")+
    (q.provenance?.sources?.length?" Author-supplied citations: "+
       q.provenance.sources.map(s=>s.publisher+" / "+s.title+
        (s.url?" / URL "+s.url:"")+
        (s.section?" / section "+s.section:"")+
        (s.page?" / page "+s.page:"")+
        (s.provision?" / provision "+s.provision:"")+
        (s.publicationDate?" / published "+s.publicationDate:"")+
        (s.asOfDate?" / as of "+s.asOfDate:"")+
        (s.stance?" / author stance "+s.stance:"")).join("; ")+
       " (NOT independently fetched or verified).":"")+
    (q.source.trim()?" Source/reference: "+q.source.trim():"")
  };
  const signed={id:revisionId,questionId,revision:d.revision,content,editorial};
  questions.push({...signed,contentHash:questionRevisionHash(signed)});
  const partialCredit=q.partialCreditEach??0;
  entries.push({questionRevisionId:revisionId,answer:keyFrom(q),
    ...(partialCredit>0&&["multiple-select","matching"].includes(q.kind)?{
      scoringOverride:{correctMarks:d.marksCorrect,incorrectMarks:d.marksIncorrect,
        unansweredMarks:0,partialCredit:{kind:"per-correct-component" as const,
          marksPerCorrectComponent:partialCredit,
          penaltyPerIncorrectComponent:q.partialPenaltyEach??0,floorAtZero:true}}
    }:{})});
  if(hasContent(explanation)||q.kind==="free-response"){
   const plain=hasContent(explanation)?publicationPlainText(explanation):q.answer.trim();
   if(plain)explanationTexts[revisionId]=plain.slice(0,20000);
  }
  const group=groups.get(q.section)??[];group.push(revisionId);groups.set(q.section,group);
 }
 const sections:SectionDefinition[]=[...groups.entries()].map(([title,ids])=>({
  id:(paperId+":section:"+sha256(title).slice(0,12)) as SectionId,title,questionRevisionIds:ids
 }));
 const answerBase={id:keyId,paperId,revision:d.revision,entries};
 const answerKey:AnswerKeyRevision={...answerBase,contentHash:answerKeyRevisionHash(answerBase)};
 const kind=d.timingKind??(d.durationMinutes?"whole-paper":"untimed");
 const sectionTimes=new Map(d.questions.map(q=>[q.section,q.sectionMinutes??15]));
 const timing:TimingPolicy=kind==="sectional"?{
   kind:"sectional",sectionLimits:sections.map(section=>({
     sectionId:section.id,durationMs:(sectionTimes.get(section.title)??15)*60000||null
   })),transition:d.sectionTransition??"manual",
   allowEarlySubmit:d.allowEarlySubmit??true,pausePolicy:d.pausePolicy??"allowed"
 }:kind==="whole-paper"?{
   kind:"whole-paper",durationMs:d.durationMinutes*60000,pausePolicy:d.pausePolicy??"allowed"
 }:{kind:"untimed"};
 const paperBase={
  id:base as PaperRevisionId,paperId,revision:d.revision,edition:d.edition,sections,
  answerKeyRevisionId:answerKey.id,
  timing,
  navigation:{questionNavigation:d.questionNavigation??"free",
   sectionNavigation:d.sectionNavigation??"free",
   allowFlagging:true,allowReview:d.allowReview??true},
  scoring:{defaultRule:{correctMarks:d.marksCorrect,incorrectMarks:d.marksIncorrect,
   unansweredMarks:0}}
 };
 const paper:PaperRevision={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const assets:ImageAsset[]=d.assets.filter(x=>referenced.has(x.id));
 const includedStimuli=stimuli.filter(s=>usedStimuli.has(s.id));
 const compiled:ExamPackage={
  format:"practice-desk-exam",version:1,examId:d.examId as ExamId,
  title:d.title,questions,answerKey,paper,
  ...(includedStimuli.length?{stimuli:includedStimuli}:{}),...(assets.length?{assets}:{}),
  ...(Object.keys(explanationTexts).length?{explanations:explanationTexts}:{})
 };
 return validateExamPackage(compiled);
}
