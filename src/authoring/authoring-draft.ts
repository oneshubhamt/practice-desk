/** P47-5C: unpublished local-only question-authoring drafts.
 * Never reuse a saved draft as an executable paper, attempt, answer key or score.
 */
import type {QuestionKind,ImageAsset} from "../domain/question.ts";
import {QUESTION_KINDS} from "../domain/question.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import {plainRichDocument,validateRichDocument} from "../domain/rich-document.ts";
import {validateMediaInventory} from "../domain/media.ts";

export type AuthoringQuestion={
 readonly id:string;
 readonly section:string;
 readonly kind:QuestionKind;
 readonly prompt:RichDocument;
 readonly passage:RichDocument;
 readonly options:readonly RichDocument[];
 readonly leftItems:readonly RichDocument[];
 readonly rightItems:readonly RichDocument[];
 readonly explanation:RichDocument;
 readonly answer:string;
 readonly source:string;
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
 readonly marksCorrect:number;
 readonly marksIncorrect:number;
 readonly updatedAt:string;
 readonly assets:readonly ImageAsset[];
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
 return {id:id(),section:"General",kind,prompt:fresh(),passage:fresh(),
  options:Array.from({length:4},fresh),leftItems:Array.from({length:4},fresh),
  rightItems:Array.from({length:4},fresh),explanation:fresh(),answer:"",source:""};
}
export function newAuthoringDraft():AuthoringDraft{
 const now=new Date().toISOString();
 return {schema:1,id:id(),examId:"new-exam",paperId:"new-paper",title:"Untitled question bank",
  edition:"custom",revision:1,durationMinutes:120,marksCorrect:2.5,marksIncorrect:-0.8333333333333334,
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
  "revision","durationMinutes","marksCorrect","marksIncorrect","updatedAt","assets","questions"]);
 if(p.schema!==1)throw Error("Unsupported draft schema");
 const assets=structuredClone(list(p.assets,100,"images") as ImageAsset[]);
 validateMediaInventory([],assets);
 const known=new Set(assets.map(a=>a.id));
 const rich=(x:unknown)=>validateRichDocument(x,{knownAssets:known});
 const questions=list(p.questions,200,"questions");
 if(!questions.length)throw Error("A draft needs at least one question");
 const all=new Set<string>();
 const verified=questions.map(item=>{
  const q=rec(item,"draft question",["id","section","kind","prompt","passage","options","leftItems",
   "rightItems","explanation","answer","source"]);
  const questionId=text(q.id,"question ID",128,true);
  if(all.has(questionId))throw Error("Duplicate draft question ID");
  all.add(questionId);
  const kind=q.kind;
  if(typeof kind!=="string"||!QUESTION_KINDS.includes(kind as QuestionKind))
   throw Error("Unsupported question kind");
  const qOpts=list(q.options,4,"options"),left=list(q.leftItems,4,"matching left"),
    right=list(q.rightItems,4,"matching right");
  if(qOpts.length!==4||left.length!==4||right.length!==4)
   throw Error("Draft has invalid option/item count");
  return {id:questionId,section:text(q.section,"section",100,true),
   kind:kind as QuestionKind,prompt:rich(q.prompt),passage:rich(q.passage),
   options:qOpts.map(rich),leftItems:left.map(rich),rightItems:right.map(rich),
   explanation:rich(q.explanation),answer:text(q.answer,"draft answer",100),
   source:text(q.source,"source note",500)};
 });
 const edition=p.edition;
 if(edition!=="custom"&&edition!=="source"&&edition!=="reviewed")
  throw Error("Invalid paper edition");
 const draft:AuthoringDraft={
  schema:1,id:text(p.id,"draft ID",128,true),examId:text(p.examId,"exam ID",80,true),
  paperId:text(p.paperId,"paper ID",80,true),title:text(p.title,"paper title",180,true),
  edition,revision:num(p.revision,"revision",1,1000000),
  durationMinutes:num(p.durationMinutes,"duration",0,600),
  marksCorrect:num(p.marksCorrect,"positive marks",0.01,1000),
  marksIncorrect:num(p.marksIncorrect,"negative marks",-1000,0),
  updatedAt:text(p.updatedAt,"updated time",100,true),assets,questions:verified
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
