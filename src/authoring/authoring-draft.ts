/** P47-5C: unpublished local-only question-authoring drafts.
 * Never reuse a saved draft as an executable paper, attempt, answer key or score.
 */
import type {QuestionKind,ImageAsset,StimulusDefinition} from "../domain/question.ts";
import {QUESTION_KINDS} from "../domain/question.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import {plainRichDocument,validateRichDocument} from "../domain/rich-document.ts";
import {validateMediaInventory} from "../domain/media.ts";
import {attributedTopicPath,validateTopicPath} from "../learning/syllabus-taxonomy.ts";

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
 /** For sectional policies, minutes per section must agree across its questions. */
 readonly sectionMinutes?:number;
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
 /** Optional shared passage/table/chart; never an in-question copy. */
 readonly stimulusRef?:string;
 /** Claims remain unverified until separate P57-B evidence review. */
 readonly provenance?:{readonly kind:"ai-original"|"manual"|"reconstruction"|"official-pyq";readonly sourceNote?:string;
 readonly examYear?:number;
 readonly sources?:readonly {readonly publisher:string;readonly title:string;readonly url?:string;
  readonly section?:string;readonly page?:string;readonly provision?:string;
  readonly publicationDate?:string;readonly asOfDate?:string;
  readonly stance?:"supports"|"disputes"}[];};
 readonly qa?:{readonly status:"unchecked"|"needs-review"};
};
export type AuthoringDraft={
 readonly schema:1;
 readonly id:string;
 readonly examId:string;
 readonly paperId:string;
 readonly title:string;
 readonly edition:"custom"|"source"|"reviewed";
 readonly revision:number;
 readonly durationMinutes:number;
 /** Absent values retain the existing authoring defaults. */
 readonly timingKind?:"untimed"|"whole-paper"|"sectional";
 readonly pausePolicy?:"allowed"|"forbidden";
 readonly questionNavigation?:"free"|"forward-only";
 readonly sectionNavigation?:"free"|"sequential-locked";
 readonly sectionTransition?:"manual"|"automatic";
 readonly allowEarlySubmit?:boolean;
 readonly allowReview?:boolean;
 readonly marksCorrect:number;
 readonly marksIncorrect:number;
 readonly updatedAt:string;
 readonly assets:readonly ImageAsset[];
 /** Authoring-only shared stimuli, referenced by question stimulusRef. */
 readonly stimuli?:readonly StimulusDefinition[];
 readonly questions:readonly AuthoringQuestion[];
};
export type AuthoringDraftShelf={
 readonly schema:1;
 readonly activeId:string;
 readonly drafts:readonly AuthoringDraft[];
};
export const AUTHORING_KEY="practiceDesk.authoring.drafts.v1";
export const AUTHORING_MAX_BYTES=1900000;
const id=():string=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
  "draft-"+Date.now()+"-"+Math.floor(Math.random()*1000000);
const fresh=()=>plainRichDocument("");
export function newAuthoringQuestion(kind:QuestionKind="single-choice"):AuthoringQuestion{
 return {id:id(),section:"General",subject:"",syllabusHeadingId:"",
  topic:"",subtopic:"",difficulty:"",
  sectionMinutes:15,minSelections:1,maxSelections:4,
  partialCreditEach:0,partialPenaltyEach:0,
  kind,prompt:fresh(),passage:fresh(),
  options:Array.from({length:4},fresh),leftItems:Array.from({length:4},fresh),
  rightItems:Array.from({length:4},fresh),explanation:fresh(),answer:"",tolerance:0,source:""};
}
export function newAuthoringDraft():AuthoringDraft{
 const now=new Date().toISOString();
 return {schema:1,id:id(),examId:"new-exam",paperId:"new-paper",title:"Untitled question bank",
  edition:"custom",revision:1,durationMinutes:120,timingKind:"whole-paper",
  pausePolicy:"allowed",questionNavigation:"free",sectionNavigation:"free",
  sectionTransition:"manual",allowEarlySubmit:true,allowReview:true,
  marksCorrect:2.5,marksIncorrect:-0.8333333333333334,
  updatedAt:now,assets:[],questions:[newAuthoringQuestion()]};
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
 const p=rec(value,"authoring draft",["schema","id","examId","paperId","title","edition",
  "revision","durationMinutes","timingKind","pausePolicy","questionNavigation",
  "sectionNavigation","sectionTransition","allowEarlySubmit","allowReview",
  "marksCorrect","marksIncorrect","updatedAt","assets","stimuli","questions"]);
 if(p.schema!==1)throw Error("Unsupported draft schema");
 const assets=structuredClone(list(p.assets,100,"images") as ImageAsset[]);
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
    "sectionMinutes","minSelections","maxSelections",
   "partialCreditEach","partialPenaltyEach","stimulusRef","provenance","qa"]);
  const questionId=text(q.id,"question ID",128,true);
  if(all.has(questionId))throw Error("Duplicate draft question ID");
  all.add(questionId);
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
       ...(citation.stance===undefined?{}:{stance:citation.stance})
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
   const checking=rec(q.qa,"QA metadata",["status"]);
   if(checking.status!=="unchecked"&&checking.status!=="needs-review")
    throw Error("Unsupported unverified QA status");
   qa={status:checking.status};
  }
  const kind=q.kind;
  if(typeof kind!=="string"||!QUESTION_KINDS.includes(kind as QuestionKind))
   throw Error("Unsupported question kind");
  const qOpts=list(q.options,4,"options"),left=list(q.leftItems,4,"matching left"),
    right=list(q.rightItems,4,"matching right");
  if(qOpts.length!==4||left.length!==4||right.length!==4)
   throw Error("Draft has invalid option/item count");
  const section=text(q.section,"section",100,true).trim();
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
  const sectionMinutes=num(q.sectionMinutes??15,"section minutes",0,600);
  if(!Number.isInteger(sectionMinutes))throw Error("Section minutes must be whole numbers");
  return {id:questionId,section,subject,syllabusHeadingId,
   topic,subtopic,difficulty:difficulty as ""|"easy"|"medium"|"hard",
   sectionMinutes,minSelections,maxSelections,
   partialCreditEach:num(q.partialCreditEach??0,"partial-credit component",0,1000),
   partialPenaltyEach:num(q.partialPenaltyEach??0,"partial penalty",0,1000),
   kind:kind as QuestionKind,prompt:rich(q.prompt),passage:rich(q.passage),
   options:qOpts.map(rich),leftItems:left.map(rich),rightItems:right.map(rich),
   explanation:rich(q.explanation),answer:text(q.answer,"draft answer",100),
   tolerance:num(q.tolerance??0,"numeric tolerance",0,1000000),
   source:text(q.source,"source note",500),...(stimulusRef?{stimulusRef}:{}),
   ...(provenance?{provenance}:{}),...(qa?{qa}:{})};
 });
 const edition=p.edition;
 if(edition!=="custom"&&edition!=="source"&&edition!=="reviewed")
  throw Error("Invalid paper edition");
 const timingKind=p.timingKind??(p.durationMinutes===0?"untimed":"whole-paper");
  const pausePolicy=p.pausePolicy??"allowed",questionNavigation=p.questionNavigation??"free";
  const sectionNavigation=p.sectionNavigation??"free",sectionTransition=p.sectionTransition??"manual";
  if(!["untimed","whole-paper","sectional"].includes(String(timingKind))||
     !["allowed","forbidden"].includes(String(pausePolicy))||
     !["free","forward-only"].includes(String(questionNavigation))||
     !["free","sequential-locked"].includes(String(sectionNavigation))||
     !["manual","automatic"].includes(String(sectionTransition))||
     (p.allowEarlySubmit!==undefined&&typeof p.allowEarlySubmit!=="boolean")||
     (p.allowReview!==undefined&&typeof p.allowReview!=="boolean"))
    throw Error("Invalid authored timing or navigation settings");
 const draft:AuthoringDraft={
  schema:1,id:text(p.id,"draft ID",128,true),examId:text(p.examId,"exam ID",80,true),
  paperId:text(p.paperId,"paper ID",80,true),title:text(p.title,"paper title",180,true),
  edition,revision:num(p.revision,"revision",1,1000000),
  durationMinutes:num(p.durationMinutes,"duration",0,600),
  timingKind:timingKind as NonNullable<AuthoringDraft["timingKind"]>,
  pausePolicy:pausePolicy as NonNullable<AuthoringDraft["pausePolicy"]>,
  questionNavigation:questionNavigation as NonNullable<AuthoringDraft["questionNavigation"]>,
  sectionNavigation:sectionNavigation as NonNullable<AuthoringDraft["sectionNavigation"]>,
  sectionTransition:sectionTransition as NonNullable<AuthoringDraft["sectionTransition"]>,
  allowEarlySubmit:p.allowEarlySubmit??true,allowReview:p.allowReview??true,
  marksCorrect:num(p.marksCorrect,"positive marks",0.01,1000),
  marksIncorrect:num(p.marksIncorrect,"negative marks",-1000,0),
  updatedAt:text(p.updatedAt,"updated time",100,true),assets,
  ...(stimuli.length?{stimuli}:{}),questions:verified
 };
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
