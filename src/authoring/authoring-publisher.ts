/** P47-5D: vendor-neutral, deterministic publication boundary.
 * Never store Wordgard internals, DOM HTML, editable draft IDs or unsigned keys
 * as scored content. A published package enters the existing validated IDB path.
 */
import type {ExamPackage} from "../app/exam-package.ts";
import {validateExamPackage} from "../app/exam-package.ts";
import type {AuthoringDraft,AuthoringQuestion} from "./authoring-draft.ts";
import {validateAuthoringDraft} from "./authoring-draft.ts";
import type {CorrectAnswer,AnswerKeyEntry,AnswerKeyRevision} from "../domain/answer-key.ts";
import type {PaperRevision,SectionDefinition} from "../domain/exam.ts";
import type {QuestionContent,QuestionRevision,QuestionKind,StimulusDefinition,ImageAsset} from "../domain/question.ts";
import type {RichBlock,RichDocument,RichInline} from "../domain/rich-document.ts";
import {validateRichDocument} from "../domain/rich-document.ts";
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
 constructor(readonly issues:readonly PublicationIssue[]){
  super(issues.map(i=>(i.questionId?"Question "+i.questionId+" · ":"")+i.field+": "+i.reason).join("\n"));
  this.name="PublicationValidationError";
 }
}
const letters=["A","B","C","D"] as const;
const id=(label:string,value:string)=>label+":"+sha256(value).slice(0,24);
const shell=(doc:RichDocument):RichDocument=>validateRichDocument(doc,{
 knownAssets:new Set([...collectAssets(doc)])
});
const inlinePlain=(item:RichInline):string=>{
 switch(item.type){
  case "text":return item.text;
  case "math":return item.linearText;
  case "image":return item.altText;
 }
};
const rowPlain=(row:readonly RichInline[]):string=>row.map(inlinePlain).join("");
export function publicationPlainText(doc:RichDocument):string{
 const blocks=doc.blocks.map(block=>{
  switch(block.type){
   case "paragraph":case "heading":return rowPlain(block.content);
   case "list":return block.items.map(row=>rowPlain(row)).join("\n");
   case "table":return block.rows.map(row=>row.map(rowPlain).join(" | ")).join("\n");
   case "display-math":return block.linearText;
   case "image":return block.altText;
  }
 });
 return blocks.join("\n").trim();
}
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
 if(d.durationMinutes!==0&&!Number.isSafeInteger(d.durationMinutes))
  put("Duration","Use whole minutes (0 for untimed)");
 if(d.revision!==Math.trunc(d.revision))put("Revision","Revision must be a positive integer");
 const fullId=revisionId(d);
 if(existing.some(x=>x.paper.id===fullId))
  put("Revision","This paper/edition revision is already published. Increment Revision; never overwrite an earlier publication.");
 if(d.edition==="reviewed"&&!existing.some(x=>
  x.paper.paperId===sourceId(d)&&x.paper.edition==="source"))
  put("Edition","Publish a corresponding user-supplied Source transcription first; Reviewed must have an existing source counterpart");
 for(const [index,q] of d.questions.entries()){
  const prefix=name(index+1),questionId=q.id;
  const item=(field:string,reason:string)=>put(prefix+" · "+field,reason,questionId);
  if(!hasContent(q.prompt))item("Question stem","Write a nonempty question or explicit equation");
  if(d.edition!=="custom"&&q.source.trim().length<6)
   item("Provenance","Provide a source/reference note for each Source or Reviewed question");
  if(["single-choice","multiple-select"].includes(q.kind))
   q.options.forEach((o,i)=>{if(!hasContent(o))item("Option "+letters[i],"Option cannot be blank");});
  if(q.kind==="matching"){
   q.leftItems.forEach((o,i)=>{if(!hasContent(o))item("Left "+(i+1),"Matching item cannot be blank");});
   q.rightItems.forEach((o,i)=>{if(!hasContent(o))item("Right "+letters[i],"Matching item cannot be blank");});
  }
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
/** This report has no side effects and cannot publish any draft or answer key. */
export function inspectAuthoringPublication(
 draft:unknown,existing:readonly ExamPackage[]=[]
):{readonly valid:boolean;readonly issues:readonly PublicationIssue[];readonly estimatedQuestions:number}{
 const d=validateAuthoringDraft(draft);
 const issues=issuesFor(d,existing);
 return {valid:issues.length===0,issues,estimatedQuestions:d.questions.length};
}
/** Generate authenticated exam content using only the app-owned draft contract. */
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
 const stimuli:StimulusDefinition[]=[];
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
  const stemRefs=[...new Set([...resources(prompt),...resources(explanation)])];
  addRefs(stemRefs);
  const baseContent={
   prompt:publicationPlainText(prompt).slice(0,20000),
   richPrompt:prompt,
   ...(hasContent(explanation)?{richExplanation:explanation}:{}),
   ...(stemRefs.length?{assetIds:stemRefs}:{}),
   ...(hasContent(passage)?{stimulusId:(revisionId+":stimulus") as StimulusId}:{})
  };
  if(hasContent(passage)){
   const assetIds=resources(passage);
   addRefs(assetIds);
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
    {...baseContent,kind:q.kind,options,minSelections:1,maxSelections:4};
  }else if(q.kind==="numeric-entry"){
   content={...baseContent,kind:q.kind,numericRules:{allowNegative:true}};
  }else if(q.kind==="true-false"){
   content={...baseContent,kind:q.kind};
  }else if(q.kind==="matching"){
   const items=(docs:readonly RichDocument[],labels:readonly string[])=>docs.map((doc,i)=>{
    const result=item(doc,labels[i]!);
    return {...result,id:result.id as MatchItemId};
   });
   content={...baseContent,kind:q.kind,
    leftItems:items(q.leftItems,["L1","L2","L3","L4"]),
    rightItems:items(q.rightItems,letters)};
  }else{
   content={...baseContent,kind:"free-response",responseRules:{minWords:1,maxWords:10000}};
  }
  const editorial={
   status:"caution" as const,
   notes:"User-authored "+d.edition+" question; answer and source have not been independently certified."+
    (q.source.trim()?" Source/reference: "+q.source.trim():"")
  };
  const signed={id:revisionId,questionId,revision:d.revision,content,editorial};
  questions.push({...signed,contentHash:questionRevisionHash(signed)});
  entries.push({questionRevisionId:revisionId,answer:keyFrom(q)});
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
 const paperBase={
  id:base as PaperRevisionId,paperId,revision:d.revision,edition:d.edition,sections,
  answerKeyRevisionId:answerKey.id,
  timing:d.durationMinutes?{kind:"whole-paper" as const,durationMs:d.durationMinutes*60000,
   pausePolicy:"allowed" as const}:{kind:"untimed" as const},
  navigation:{questionNavigation:"free" as const,sectionNavigation:"free" as const,
   allowFlagging:true,allowReview:true},
  scoring:{defaultRule:{correctMarks:d.marksCorrect,incorrectMarks:d.marksIncorrect,
   unansweredMarks:0}}
 };
 const paper:PaperRevision={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const assets:ImageAsset[]=d.assets.filter(x=>referenced.has(x.id));
 const compiled:ExamPackage={
  format:"practice-desk-exam",version:1,examId:d.examId as ExamId,
  title:d.title,questions,answerKey,paper,
  ...(stimuli.length?{stimuli}:{}),...(assets.length?{assets}:{}),
  ...(Object.keys(explanationTexts).length?{explanations:explanationTexts}:{})
 };
 return validateExamPackage(compiled);
}
