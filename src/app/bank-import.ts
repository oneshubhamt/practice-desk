/** Minimal, locally validated MCQ/NAT authoring contract.
 * The full signed exam-package v1 remains the advanced six-kind interface.
 * This adapter never treats user-supplied editorial or scoring as official.
 */
import type { ExamPackage } from "./exam-package.ts";
import {compileExternalQuestionBank} from "../authoring/external-bank.ts";
import { validateExamPackage,validateExamImportBudget } from "./exam-package.ts";
import type { QuestionRevision } from "../domain/question.js";
import type { AnswerKeyEntry } from "../domain/answer-key.js";
import type { SectionDefinition, PaperEdition, PaperRevision } from "../domain/exam.js";
import type { ExamId, PaperId, PaperRevisionId, QuestionRevisionId, QuestionId, OptionId, SectionId, AnswerKeyRevisionId } from "../domain/ids.js";
import { questionRevisionHash,answerKeyRevisionHash,paperRevisionHash } from "../domain/integrity.ts";
import { sha256 } from "../domain/hash.ts";
import { validateMediaInventory } from "../domain/media.ts";
import type { ImageAsset } from "../domain/question.js";
import type { AssetId } from "../domain/ids.js";

type Input=Record<string,unknown>;
function obj(value:unknown,name:string):Input{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error(name+" must be an object");
 if(![Object.prototype,null].includes(Object.getPrototypeOf(value)))
   throw Error(name+" must be a plain object");
 return value as Input;
}
function only(value:Input,fields:readonly string[],name:string):void{
 for(const field of Object.keys(value))
   if(!fields.includes(field))throw Error(name+"."+field+": unsupported field");
}
function str(value:unknown,name:string,max=240):string{
 if(typeof value!=="string"||!value.trim()||value.length>max)throw Error(name+" must be nonempty text (up to "+max+" characters)");
 return value.trim();
}
function key(value:unknown,name:string):string{
 const v=str(value,name,80);
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(v))throw Error(name+" may contain only letters, numbers, underscores and hyphens");
 return v;
}
function number(value:unknown,name:string):number{
 if(typeof value!=="number"||!Number.isFinite(value))throw Error(name+" must be a finite number");
 return value;
}
function maybeNumber(value:unknown,name:string):number|undefined{
 return value===undefined?undefined:number(value,name);
}
function ensure(condition:boolean,message:string):void{if(!condition)throw Error(message)}
const LETTERS="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function importSimpleQuestionBank(value:unknown):ExamPackage{
 validateExamImportBudget(value);
 const bank=obj(value,"Question bank");
 only(bank,["format","version","bankId","examId","title","revision","edition",
   "scoring","timing","tools","questions","media"],"Question bank");
 ensure(bank["format"]==="practice-desk-bank"&&bank["version"]===1,
   "Not a Practice Desk simple bank v1");
 const bankId=key(bank["bankId"],"bankId");
 const examId=key(bank["examId"],"examId");
 const title=str(bank["title"],"title",200);
 const revision=bank["revision"]===undefined?1:number(bank["revision"],"revision");
 ensure(Number.isSafeInteger(revision)&&revision>0,"revision must be a positive integer");
 const edition=bank["edition"]??"custom";
 ensure(edition==="custom"||edition==="source"||edition==="reviewed","Unsupported bank edition");
 const scoring=obj(bank["scoring"],"scoring");
 only(scoring,["correctMarks","negativeFraction","incorrectMarks","unansweredMarks"],"scoring");
 const correctMarks=number(scoring["correctMarks"],"scoring.correctMarks");
 const fraction=maybeNumber(scoring["negativeFraction"],"scoring.negativeFraction");
 ensure(fraction===undefined||(fraction>=0&&fraction<=1),
   "negativeFraction must be between 0 and 1");
 ensure(fraction===undefined||scoring["incorrectMarks"]===undefined,
   "Choose negativeFraction or incorrectMarks, not both");
 const incorrectMarks=scoring["incorrectMarks"]!==undefined?
   number(scoring["incorrectMarks"],"scoring.incorrectMarks"):
   fraction!==undefined?-correctMarks*fraction:0;
 const unansweredMarks=number(scoring["unansweredMarks"]??0,"scoring.unansweredMarks");
 ensure(correctMarks>=0&&incorrectMarks<=correctMarks&&unansweredMarks<=correctMarks,
   "Scoring values are outside supported marking bounds");
 const rule={correctMarks,incorrectMarks,unansweredMarks};
 const rawQuestions=bank["questions"];
 if(!Array.isArray(rawQuestions)||rawQuestions.length===0||rawQuestions.length>2000)
   throw Error("Bank must have 1–2000 questions");
 // Optional authored image inventory. This is an UNHASHED authoring envelope:
 // calculate the correct asset SHA before building verified question revisions.
 // Never silently optimize a fully signed/frozen exam package.
 const incomingMedia=bank["media"]??[];
 if(!Array.isArray(incomingMedia)||incomingMedia.length>1000)
   throw Error("Simple bank media must be an array of at most 1000 image objects");
 const assets:ImageAsset[]=incomingMedia.map((value,i)=>{
   const m=obj(value,"media["+(i+1)+"]");
   if(Object.keys(m).some(x=>!["id","dataUri","altText"].includes(x)))
     throw Error("Simple bank media objects allow only id, dataUri and altText");
   const id=key(m["id"],"media["+(i+1)+"].id") as AssetId;
   const uri=str(m["dataUri"],"media["+(i+1)+"].dataUri",14*1024*1024);
   const match=/^data:(image\/(?:png|jpeg|webp|avif|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(uri);
   if(!match)throw Error("Unsupported or malformed embedded image in media "+id);
   const bytes=Uint8Array.from(atob(match[2]!),c=>c.charCodeAt(0));
   const alt=m["altText"]===undefined?undefined:str(m["altText"],"media["+(i+1)+"].altText",500);
   return {id,dataUri:uri,mediaType:match[1]! as ImageAsset["mediaType"],
     contentHash:sha256(bytes) as ImageAsset["contentHash"],...(alt?{altText:alt}:{})};
 });
 validateMediaInventory([],assets);
 const mediaIds=new Set(assets.map(a=>a.id as string));
 const imageIds=(value:unknown,location:string):AssetId[]=>{
   if(value===undefined)return [];
   if(!Array.isArray(value)||value.length>100)throw Error(location+" requires an image ID array");
   const ids=value.map((id,i)=>key(id,location+"["+(i+1)+"]") as AssetId);
   if(new Set(ids).size!==ids.length||ids.some(id=>!mediaIds.has(id)))
     throw Error(location+" contains an unknown or repeated image ID");
   return ids;
 };
 const paperId=("bank:"+bankId) as PaperId;
 const qIds=new Set<string>();
 const sections=new Map<string,{title:string;ids:QuestionRevisionId[]}>();
 const questions:QuestionRevision[]=[];
 const entries:AnswerKeyEntry[]=[];
 const explanations:Record<string,string>={};
 for(let n=0;n<rawQuestions.length;n++){
   const prefix="questions["+(n+1)+"]";
   const q=obj(rawQuestions[n],prefix);
   only(q,["id","section","question","prompt","type","options","answer",
     "explanation","imageIds","optionImageIds","tolerance"],prefix);
   const id=key(q["id"]??"q"+(n+1),prefix+".id");
   ensure(!qIds.has(id),"Duplicate question ID "+id);qIds.add(id);
   const sec=str(q["section"]??"General",prefix+".section",120);
   const prompt=str(q["question"]??q["prompt"],prefix+".question",20000);
   const kind=q["type"]??"mcq";
   const qid=(paperId+":q:"+id+":r"+revision) as QuestionRevisionId;
   const questionImages=imageIds(q["imageIds"],prefix+".imageIds");
   let content:QuestionRevision["content"];
   let answer:AnswerKeyEntry["answer"];
   if(kind==="mcq"||kind==="single-choice"){
     const rawOptions=q["options"];
     if(!Array.isArray(rawOptions)||rawOptions.length<2||rawOptions.length>26)
       throw Error(prefix+" requires 2–26 answer options");
     const rawOptionImages=q["optionImageIds"];
     if(rawOptionImages!==undefined&&
       (!Array.isArray(rawOptionImages)||rawOptionImages.length!==rawOptions.length))
       throw Error(prefix+".optionImageIds must align with the answer options");
     const options=rawOptions.map((option:unknown,i:number)=>({
       id:LETTERS[i]! as OptionId,text:str(option,prefix+".options["+(i+1)+"]",5000),
       ...(rawOptionImages===undefined?{}:
         {assetIds:imageIds((rawOptionImages as unknown[])[i]??[],
           prefix+".optionImageIds["+(i+1)+"]")})
     }));
     const letter=str(q["answer"],prefix+".answer",1).toUpperCase();
     ensure(LETTERS.indexOf(letter)>=0&&LETTERS.indexOf(letter)<options.length,
       prefix+" answer must be one of its option letters");
     content={kind:"single-choice",prompt,options,...(questionImages.length?{assetIds:questionImages}:{})};
     answer={kind:"single-choice",optionId:letter as OptionId};
   }else if(kind==="nat"||kind==="numeric-entry"){
     const values=Array.isArray(q["answer"])?q["answer"]:[q["answer"]];
     ensure(values.length>=1&&values.length<=20,"NAT needs 1–20 accepted numeric answers");
     const acceptedValues=values.map((v,i)=>number(v,prefix+".answer["+(i+1)+"]"));
     const tolerance=number(q["tolerance"]??0,prefix+".tolerance");
     ensure(tolerance>=0&&tolerance<=1000000,"NAT tolerance out of range");
     content={kind:"numeric-entry",prompt,numericRules:{allowNegative:true},...(questionImages.length?{assetIds:questionImages}:{})};
     answer={kind:"numeric-entry",acceptedValues,absoluteTolerance:tolerance};
   }else throw Error(prefix+" unsupported simple-bank type: use mcq or nat (full exam JSON supports all six kinds)");
   const editorial={status:"caution" as const,
     notes:"User-imported simple bank; answer and provenance have not been independently certified."};
   const source={id:qid,questionId:(paperId+":q:"+id) as QuestionId,revision,content,editorial};
   const question={...source,contentHash:questionRevisionHash(source)};
   questions.push(question);
   entries.push({questionRevisionId:question.id,answer});
   const explanation=q["explanation"];
   if(explanation!==undefined)explanations[qid]=str(explanation,prefix+".explanation",20000);
   const group=sections.get(sec)??{title:sec,ids:[]};
   group.ids.push(qid);sections.set(sec,group);
 }
 const sectionList:SectionDefinition[]=[...sections].map(([name,group],index)=>({
  id:(paperId+":section:"+(index+1)) as SectionId,title:name,questionRevisionIds:group.ids
 }));
 const keyId=(paperId+":key:r"+revision) as AnswerKeyRevisionId;
 const answerKey={id:keyId,paperId,revision,entries,contentHash:answerKeyRevisionHash({entries})};
 const rawTiming=bank["timing"];
 let timing:ExamPackage["paper"]["timing"]={kind:"untimed"};
 if(rawTiming!==undefined){
   const t=obj(rawTiming,"timing");
   only(t,t["kind"]==="untimed"?["kind"]:["kind","minutes"],"timing");
   if(t["kind"]==="whole-paper"){
     const minutes=number(t["minutes"],"timing.minutes");
     ensure(minutes>0&&minutes<=1440,"timing.minutes must be 1–1440");
     timing={kind:"whole-paper",durationMs:minutes*60000,pausePolicy:"allowed"};
   }else ensure(t["kind"]==="untimed","Simple bank timing must be untimed or whole-paper");
 }
 let candidateTools:PaperRevision["candidateTools"]|undefined;
 const rawTools=bank["tools"];
 if(rawTools!==undefined){
   const tools=obj(rawTools,"tools");
   only(tools,["calculator"],"tools");
   ensure(tools["calculator"]==="basic-v1",'tools.calculator must be "basic-v1"');
   candidateTools={calculator:"basic-v1"};
 }
 const paperBase={
  id:(paperId+":paper:r"+revision) as PaperRevisionId,paperId,revision,
  edition:edition as PaperEdition,answerKeyRevisionId:keyId,sections:sectionList,timing,
  ...(candidateTools?{candidateTools}:{}),
  navigation:{questionNavigation:"free" as const,sectionNavigation:"free" as const,
   allowFlagging:true,allowReview:true},
  scoring:{defaultRule:rule}
 };
 const paper:PaperRevision={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const packageValue={format:"practice-desk-exam" as const,version:1 as const,
  examId:examId as ExamId,title,questions,answerKey,paper,explanations,...(assets.length?{assets}:{})};
 return validateExamPackage(packageValue);
}

/** Offline author starter, not a verified exam question bank. Edit and import
 * without manually supplying any internal revision/hash IDs. */
export const APFC_NAT_BANK_TEMPLATE={
 format:"practice-desk-bank",version:1,bankId:"my-apfc-bank",examId:"upsc-epfo-apfc",
 title:"My APFC practice bank",revision:1,edition:"custom",
 scoring:{correctMarks:2.5,negativeFraction:1/3,unansweredMarks:0},
 timing:{kind:"untimed"},
 questions:[
  {id:"q1",section:"Labour and Social Security",type:"mcq",
   question:"Replace this with a source-verified APFC question.",
   options:["First option","Second option","Third option","Fourth option"],
   answer:"A",explanation:"Replace this explanation with a verified reference."},
  {id:"q2",section:"Numerical answer practice",type:"nat",
   question:"Example: find the arithmetic mean of 2, 4 and 6.",
   answer:4,tolerance:0.01,explanation:"(2 + 4 + 6) / 3 = 4."}
 ]
} as const;

/** Autodetect the intentionally simpler bank envelope without weakening full-package validation. */
export function importAuthoredExam(value:unknown):ExamPackage{
 if(value&&typeof value==="object"&&!Array.isArray(value)){
   if((value as Input)["format"]==="practice-desk-authoring")return compileExternalQuestionBank(value);
   if((value as Input)["format"]==="practice-desk-bank")return importSimpleQuestionBank(value);
 }
 return validateExamPackage(value);
}
