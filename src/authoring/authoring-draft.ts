import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
/** P47-5C: unpublished local-only question-authoring drafts.
 * Never reuse a saved draft as an executable paper, attempt, answer key or score.
 */
import type {QuestionKind,ImageAsset,StimulusDefinition} from "../domain/question.ts";
import {QUESTION_KINDS} from "../domain/question.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import {plainRichDocument,validateRichDocument} from "../domain/rich-document.ts";
import {validateMediaInventory} from "../domain/media.ts";
import {attributedTopicPath,validateTopicPath} from "../learning/syllabus-taxonomy.ts";

export type AuthoringDraftSection={
 readonly name:string;
 /** Single canonical owner of this physical section's timer budget. */
 readonly minutes:number;
};
export type AuthoringQuestion={
 readonly id:string;
 readonly section:string;
 /** Semantic syllabus classification, unrelated to navigable/timed exam section. */
 readonly subject?:string;
 /** Only an explicitly chosen official heading for the currently selected exam. */
 readonly syllabusHeadingId?:string;
 /** Explicit author tags; never inferred or certified as official content. */
 readonly topic?:string;
 readonly subtopic?:string;
 readonly difficulty?:"easy"|"medium"|"hard"|""; 
  /** Multiple-select response cardinality; the correct key must satisfy it. */
 readonly minSelections?:number;
 readonly maxSelections?:number;
 /** Optional per-correct-component credit for multiple/matching only. */
 readonly partialCreditEach?:number;
 readonly partialPenaltyEach?:number;
 readonly kind:QuestionKind;
 readonly prompt:RichDocument;
 readonly passage:RichDocument;
 readonly options:readonly RichDocument[];
 readonly leftItems:readonly RichDocument[];
 readonly rightItems:readonly RichDocument[];
 readonly explanation:RichDocument;
 readonly answer:string;
 /** Absolute numeric entry tolerance; zero for exact answers. */
 readonly tolerance:number;
 readonly source:string;
 /** Attribution-only original AI source identity, not verified publisher truth. */
 readonly sourceOrigin?:{readonly bankId:string;readonly questionId:string;
  readonly stimulusId?:string};
 /** Optional shared passage/table/chart; never an in-question copy. */
 readonly stimulusRef?:string;
 /** Claims remain unverified until separate P57-B evidence review. */
 readonly provenance?:{readonly kind:"ai-original"|"manual"|"reconstruction"|"official-pyq";readonly sourceNote?:string;
 readonly examYear?:number;
 readonly sources?:readonly {readonly publisher:string;readonly title:string;readonly url?:string;
  readonly section?:string;readonly page?:string;readonly provision?:string;
  readonly publicationDate?:string;readonly asOfDate?:string;
  readonly stance?:"supports"|"disputes"}[];};
 readonly qa?:{readonly status:"unchecked"|"needs-review";
  /** Author-entered, unverified review/acceptance, never source authentication. */
  readonly review?:{readonly reviewer:string;readonly reviewedAt:string;readonly note:string;
   readonly acceptedWarningCodes:readonly string[]};};
};
export type AuthoringDraft={
 readonly schema:1;
 readonly id:string;
 /** Validated workflow provenance, independent of mutable draft IDs. */
 readonly ingestionMode:"manual"|"external-source";
 readonly examId:string;
 readonly paperId:string;
 readonly title:string;
 readonly edition:"custom"|"source"|"reviewed";
 readonly revision:number;
 readonly durationMinutes:number;
 readonly timingKind:"untimed"|"whole-paper"|"sectional";
 readonly pausePolicy:"allowed"|"forbidden";
 readonly questionNavigation:"free"|"forward-only";
 readonly sectionNavigation:"free"|"sequential-locked";
 readonly sectionTransition:"manual"|"automatic";
 readonly allowEarlySubmit:boolean;
 readonly allowReview:boolean;
 readonly calculatorTool?:"basic-v1";
 readonly marksCorrect:number;
 readonly marksIncorrect:number;
 readonly updatedAt:string;
 readonly assets:readonly ImageAsset[];
 /** Physical exam sections. This is the only draft owner of section timer budgets. */
 readonly sections:readonly AuthoringDraftSection[];
 /** Authoring-only shared stimuli, referenced by question stimulusRef. */
 readonly stimuli?:readonly StimulusDefinition[];
 readonly questions:readonly AuthoringQuestion[];
};
export type AuthoringDraftShelf={
 readonly schema:1;
 readonly activeId:string;
 readonly drafts:readonly AuthoringDraft[];
};
export const AUTHORING_KEY=STORAGE_TOPOLOGY.authoringDrafts;
export const AUTHORING_MAX_BYTES=1900000;
const id=():string=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
  "draft-"+Date.now()+"-"+Math.floor(Math.random()*1000000);
const fresh=()=>plainRichDocument("");
export function newAuthoringQuestion(kind:QuestionKind="single-choice"):AuthoringQuestion{
 return {id:id(),section:"General",subject:"",syllabusHeadingId:"",
  topic:"",subtopic:"",difficulty:"",
  minSelections:1,maxSelections:4,
  partialCreditEach:0,partialPenaltyEach:0,
  kind,prompt:fresh(),passage:fresh(),
  options:Array.from({length:4},fresh),leftItems:Array.from({length:4},fresh),
  rightItems:Array.from({length:4},fresh),explanation:fresh(),answer:"",tolerance:0,source:""};
}
export function newAuthoringDraft():AuthoringDraft{
 const now=new Date().toISOString();
 return {schema:1,id:id(),ingestionMode:"manual",examId:"new-exam",paperId:"new-paper",title:"Untitled question bank",
  edition:"custom",revision:1,durationMinutes:120,timingKind:"whole-paper",
  pausePolicy:"allowed",questionNavigation:"free",sectionNavigation:"free",
  sectionTransition:"manual",allowEarlySubmit:true,allowReview:true,
  marksCorrect:2.5,marksIncorrect:-0.8333333333333334,
  updatedAt:now,assets:[],sections:[{name:"General",minutes:15}],questions:[newAuthoringQuestion()]};
}
const rec=(x:unknown,label:string,keys:readonly string[]):Record<string,unknown>=>{
 if(!x||typeof x!=="object"||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)
  throw Error("Invalid "+label);
 const r=x as Record<string,unknown>;
 if(Object.keys(r).some(k=>!keys.includes(k)))throw Error("Unexpected "+label+" field");
 return r;
};
const text=(value:unknown,label:string,max:number,required=false):string=>{
 if(typeof value!=="string"||value.length>max||(required&&!value.trim())||
   /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))
   throw Error("Invalid "+label);
 return value;
};
const num=(value:unknown,label:string,min:number,max:number):number=>{
 if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)
  throw Error("Invalid "+label);
 return value;
};
const list=(value:unknown,max:number,label:string):unknown[]=>{
 if(!Array.isArray(value)||value.length>max)throw Error("Invalid "+label);
 return value;
};
export function validateAuthoringDraft(value:unknown):AuthoringDraft{
 const p=rec(value,"authoring draft",["schema","id","ingestionMode","examId","paperId","title","edition",
  "revision","durationMinutes","timingKind","pausePolicy","questionNavigation",
  "sectionNavigation","sectionTransition","allowEarlySubmit","allowReview","calculatorTool",
  "marksCorrect","marksIncorrect","updatedAt","assets","sections","stimuli","questions"]);
 if(p.schema!==1)throw Error("Unsupported draft schema");
 if(p.ingestionMode!=="manual"&&p.ingestionMode!=="external-source")
  throw Error("Invalid authoring ingestion mode");
 const assets=structuredClone(list(p.assets,100,"images") as ImageAsset[]);
 const sections=list(p.sections,40,"sections").map((item,i)=>{
  const s=rec(item,"section "+i,["name","minutes"]);
  const name=text(s.name,"section name",100,true).trim();
  validateTopicPath([name]);
  const minutes=num(s.minutes,"section minutes",0,600);
  if(!Number.isSafeInteger(minutes))throw Error("Section minutes must be whole numbers");
  return {name,minutes};
 });
 if(!sections.length)throw Error("A draft needs at least one exam section");
 if(new Set(sections.map(s=>s.name)).size!==sections.length)throw Error("Duplicate exam section");
 const sectionNames=new Set(sections.map(s=>s.name));
 const stimuli=structuredClone(list(p.stimuli??[],200,"stimuli") as StimulusDefinition[]);
 validateMediaInventory(stimuli,assets);
 const stimulusIds=new Set(stimuli.map(s=>s.id as string));
 const known=new Set(assets.map(a=>a.id));
 const rich=(x:unknown)=>validateRichDocument(x,{knownAssets:known});
 const questions=list(p.questions,200,"questions");
 if(!questions.length)throw Error("A draft needs at least one question");
 const all=new Set<string>();
 const verified=questions.map(item=>{
  const q=rec(item,"draft question",["id","section","kind","prompt","passage","options","leftItems",
   "rightItems","explanation","answer","tolerance","source",
   "subject","syllabusHeadingId","topic","subtopic","difficulty",
    "minSelections","maxSelections",
   "partialCreditEach","partialPenaltyEach","stimulusRef","sourceOrigin","provenance","qa"]);
  const questionId=text(q.id,"question ID",128,true);
  if(all.has(questionId))throw Error("Duplicate draft question ID");
  all.add(questionId);
  let sourceOrigin:AuthoringQuestion["sourceOrigin"];
  if(q.sourceOrigin!==undefined){
   const origin=rec(q.sourceOrigin,"source origin",["bankId","questionId","stimulusId"]);
   const stable=(v:unknown,label:string,max:number)=>{
    const x=text(v,label,max,true);
    if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(x))throw Error("Invalid "+label);
    return x;
   };
   sourceOrigin={
    bankId:stable(origin.bankId,"origin bank ID",128),
    questionId:stable(origin.questionId,"origin question ID",128),
    ...(origin.stimulusId===undefined?{}:{stimulusId:stable(origin.stimulusId,"origin stimulus ID",128)})
   };
  }
  let provenance:AuthoringQuestion["provenance"];
  if(q.provenance!==undefined){
   const source=rec(q.provenance,"provenance",["kind","sourceNote","examYear","sources"]);
   if(!["ai-original","manual","reconstruction","official-pyq"].includes(String(source.kind)))
    throw Error("Invalid provenance origin");
   provenance={kind:source.kind as NonNullable<AuthoringQuestion["provenance"]>["kind"],
     ...(source.sourceNote===undefined?{}:{sourceNote:text(source.sourceNote,"source note",300)}),
     ...(source.examYear===undefined?{}:{examYear:num(source.examYear,"exam year",1900,2100)}),
     ...(source.sources===undefined?{}:{sources:list(source.sources,12,"evidence sources").map((v,i)=>{
      const citation=rec(v,"source "+i,["publisher","title","url","section","page",
       "provision","publicationDate","asOfDate","stance"]);
      const out={
       publisher:text(citation.publisher,"source publisher",180,true),
       title:text(citation.title,"source title",240,true),
       ...(citation.url===undefined?{}:{url:text(citation.url,"source URL",2048,true)}),
       ...(citation.section===undefined?{}:{section:text(citation.section,"source section",180)}),
       ...(citation.page===undefined?{}:{page:text(citation.page,"source page",80)}),
       ...(citation.provision===undefined?{}:{provision:text(citation.provision,"source provision",140)}),
       ...(citation.publicationDate===undefined?{}:{publicationDate:text(citation.publicationDate,"source publication date",10,true)}),
       ...(citation.asOfDate===undefined?{}:{asOfDate:text(citation.asOfDate,"source as-of date",10,true)}),
       ...(citation.stance===undefined?{}:{stance:citation.stance as "supports"|"disputes"})
      };
      if(out.url!==undefined&&!/^https:\/\/[^\s@]+$/iu.test(out.url))
       throw Error("Source URL must be HTTPS with no embedded credentials");
      for(const date of [out.publicationDate,out.asOfDate]){
       if(date!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||
        Number.isNaN(Date.parse(date+"T00:00:00.000Z"))||
        new Date(date+"T00:00:00.000Z").toISOString().slice(0,10)!==date))
        throw Error("Invalid source calendar date");
      }
      if(out.stance!==undefined&&out.stance!=="supports"&&out.stance!=="disputes")
       throw Error("Invalid claimed source stance");
      return out;
     })})};
  }
  let qa:AuthoringQuestion["qa"];
  if(q.qa!==undefined){
   const checking=rec(q.qa,"QA metadata",["status","review"]);
   if(checking.status!=="unchecked"&&checking.status!=="needs-review")
    throw Error("Unsupported unverified QA status");
   let review:NonNullable<NonNullable<AuthoringQuestion["qa"]>["review"]>|undefined;
   if(checking.review!==undefined){
    const value=rec(checking.review,"authored review",["reviewer","reviewedAt","note","acceptedWarningCodes"]);
    const reviewedAt=text(value.reviewedAt,"review date",35,true);
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(reviewedAt)||
       Number.isNaN(Date.parse(reviewedAt))||new Date(reviewedAt).toISOString().slice(0,10)!==reviewedAt.slice(0,10))
     throw Error("Invalid author-entered review date");
    const codes=list(value.acceptedWarningCodes,50,"accepted QA codes").map((code,i)=>{
     const named=text(code,"warning code "+i,100,true);
     if(!/^[a-z][a-z0-9-]*$/.test(named))throw Error("Invalid QA warning code");
     return named;
    });
    if(new Set(codes).size!==codes.length)throw Error("Duplicate accepted QA warning code");
    review={reviewer:text(value.reviewer,"reviewer claim",120,true),
     reviewedAt,note:text(value.note,"review note",500,true),acceptedWarningCodes:codes};
   }
   qa={status:checking.status,...(review?{review}:{})};
  }
  const kind=q.kind;
  if(typeof kind!=="string"||!QUESTION_KINDS.includes(kind as QuestionKind))
   throw Error("Unsupported question kind");
  const qOpts=list(q.options,4,"options"),left=list(q.leftItems,4,"matching left"),
    right=list(q.rightItems,4,"matching right");
  if(qOpts.length!==4||left.length!==4||right.length!==4)
   throw Error("Draft has invalid option/item count");
  const section=text(q.section,"section",100,true).trim();
  if(!sectionNames.has(section))throw Error("Question references unknown exam section");
  const stimulusRef=q.stimulusRef===undefined?undefined:text(q.stimulusRef,"stimulus reference",128,true);
  if(stimulusRef&&!stimulusIds.has(stimulusRef))throw Error("Unknown shared stimulus "+stimulusRef);
  validateTopicPath([section]);
  const subject=text(q.subject??"","subject",120).trim();
  const syllabusHeadingId=text(q.syllabusHeadingId??"","syllabus heading ID",80).trim();
  const topic=text(q.topic??"","topic",120).trim();
  const subtopic=text(q.subtopic??"","subtopic",120).trim();
  // A genuine syllabus root is a user choice, not the navigation section.
  attributedTopicPath(text(p.examId,"exam ID",80,true),subject,
    syllabusHeadingId||undefined,topic,subtopic);
  const difficulty=q.difficulty??"";
  if(!["","easy","medium","hard"].includes(String(difficulty)))
    throw Error("Invalid authored difficulty");
  const minSelections=num(q.minSelections??1,"minimum selections",1,4);
  const maxSelections=num(q.maxSelections??4,"maximum selections",1,4);
  if(!Number.isInteger(minSelections)||!Number.isInteger(maxSelections)||
     minSelections>maxSelections)throw Error("Invalid selection bounds");
  return {id:questionId,section,subject,syllabusHeadingId,
   topic,subtopic,difficulty:difficulty as ""|"easy"|"medium"|"hard",
   minSelections,maxSelections,
   partialCreditEach:num(q.partialCreditEach??0,"partial-credit component",0,1000),
   partialPenaltyEach:num(q.partialPenaltyEach??0,"partial penalty",0,1000),
   kind:kind as QuestionKind,prompt:rich(q.prompt),passage:rich(q.passage),
   options:qOpts.map(rich),leftItems:left.map(rich),rightItems:right.map(rich),
   explanation:rich(q.explanation),answer:text(q.answer,"draft answer",100),
   tolerance:num(q.tolerance??0,"numeric tolerance",0,1000000),
   source:text(q.source,"source note",500),...(stimulusRef?{stimulusRef}:{}),
   ...(sourceOrigin?{sourceOrigin}:{}),
   ...(provenance?{provenance}:{}),...(qa?{qa}:{})};
 });
 const edition=p.edition;
 if(edition!=="custom"&&edition!=="source"&&edition!=="reviewed")
  throw Error("Invalid paper edition");
 const timingKind=p.timingKind,pausePolicy=p.pausePolicy,
  questionNavigation=p.questionNavigation,sectionNavigation=p.sectionNavigation,
  sectionTransition=p.sectionTransition;
 if(!["untimed","whole-paper","sectional"].includes(String(timingKind))||
    !["allowed","forbidden"].includes(String(pausePolicy))||
    !["free","forward-only"].includes(String(questionNavigation))||
    !["free","sequential-locked"].includes(String(sectionNavigation))||
    !["manual","automatic"].includes(String(sectionTransition))||
    typeof p.allowEarlySubmit!=="boolean"||typeof p.allowReview!=="boolean")
   throw Error("Invalid authored timing or navigation settings");
 const calculatorTool=p.calculatorTool;
 if(calculatorTool!==undefined&&calculatorTool!=="basic-v1")
   throw Error("Invalid authored calculator tool");
 const draft:AuthoringDraft={
  schema:1,id:text(p.id,"draft ID",128,true),
  ingestionMode:p.ingestionMode as "manual"|"external-source",
  examId:text(p.examId,"exam ID",80,true),
  paperId:text(p.paperId,"paper ID",80,true),title:text(p.title,"paper title",180,true),
  edition,revision:num(p.revision,"revision",1,1000000),
  durationMinutes:num(p.durationMinutes,"duration",0,600),
  timingKind:timingKind as AuthoringDraft["timingKind"],
  pausePolicy:pausePolicy as AuthoringDraft["pausePolicy"],
  questionNavigation:questionNavigation as AuthoringDraft["questionNavigation"],
  sectionNavigation:sectionNavigation as AuthoringDraft["sectionNavigation"],
  sectionTransition:sectionTransition as AuthoringDraft["sectionTransition"],
  allowEarlySubmit:p.allowEarlySubmit as boolean,allowReview:p.allowReview as boolean,
  ...(calculatorTool?{calculatorTool:"basic-v1" as const}:{}),
  marksCorrect:num(p.marksCorrect,"positive marks",0.01,1000),
  marksIncorrect:num(p.marksIncorrect,"negative marks",-1000,0),
  updatedAt:text(p.updatedAt,"updated time",100,true),assets,sections,
  ...(stimuli.length?{stimuli}:{}),questions:verified
 };
 const usedSections=new Set(verified.map(q=>q.section));
 if(sections.some(s=>!usedSections.has(s.name)))throw Error("Draft contains an unused exam section");
 const bytes=JSON.stringify(draft).length;
 if(bytes>AUTHORING_MAX_BYTES)throw Error("Draft size exceeds local storage budget; export and reduce images");
 return draft;
}
export function validateAuthoringShelf(value:unknown):AuthoringDraftShelf{
 const s=rec(value,"draft shelf",["schema","activeId","drafts"]);
 if(s.schema!==1)throw Error("Unsupported draft collection version");
 const drafts=list(s.drafts,20,"draft collection").map(validateAuthoringDraft);
 const ids=drafts.map(d=>d.id);
 if(new Set(ids).size!==ids.length)throw Error("Duplicate stored draft");
 const activeId=text(s.activeId,"active draft ID",128);
 if(activeId&& !ids.includes(activeId))throw Error("Unknown active draft");
 const result:AuthoringDraftShelf={schema:1,activeId,drafts};
 if(JSON.stringify(result).length>AUTHORING_MAX_BYTES)throw Error("Draft shelf is too large");
 return result;
}
export function defaultAuthoringShelf():AuthoringDraftShelf{
 const draft=newAuthoringDraft();
 return {schema:1,activeId:draft.id,drafts:[draft]};
}

/** An ID is author-editable, not a security boundary. An external workflow or
 * imported per-question provenance requires deterministic offline QA even when
 * the identifier has been renamed. Existing plain manual drafts remain manual.
 */
export function requiresExternalQuality(draft:AuthoringDraft):boolean{
 return draft.ingestionMode==="external-source"||draft.questions.some(q=>q.provenance!==undefined);
}
