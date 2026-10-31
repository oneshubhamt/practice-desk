/** Minimal, locally validated MCQ/NAT authoring contract.
 * The full signed exam-package v1 remains the advanced six-kind interface.
 * This adapter never treats user-supplied editorial or scoring as official.
 */
import type { ExamPackage } from "./exam-package.ts";
import { validateExamPackage } from "./exam-package.ts";
import type { QuestionRevision } from "../domain/question.js";
import type { AnswerKeyEntry } from "../domain/answer-key.js";
import type { SectionDefinition, PaperEdition, PaperRevision } from "../domain/exam.js";
import type { ExamId, PaperId, PaperRevisionId, QuestionRevisionId, QuestionId, OptionId, SectionId, AnswerKeyRevisionId } from "../domain/ids.js";
import { questionRevisionHash,answerKeyRevisionHash,paperRevisionHash } from "../domain/integrity.ts";

type Input=Record<string,unknown>;
function obj(value:unknown,name:string):Input{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error(name+" must be an object");
 return value as Input;
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
 const bank=obj(value,"Question bank");
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
 const correctMarks=number(scoring["correctMarks"],"scoring.correctMarks");
 const incorrectMarks=scoring["incorrectMarks"]!==undefined?
   number(scoring["incorrectMarks"],"scoring.incorrectMarks"):
   scoring["negativeFraction"]!==undefined?
   -correctMarks*number(scoring["negativeFraction"],"scoring.negativeFraction"):0;
 const unansweredMarks=number(scoring["unansweredMarks"]??0,"scoring.unansweredMarks");
 ensure(correctMarks>=0&&incorrectMarks<=correctMarks&&unansweredMarks<=correctMarks,
   "Scoring values are outside supported marking bounds");
 const rule={correctMarks,incorrectMarks,unansweredMarks};
 const rawQuestions=bank["questions"];
 if(!Array.isArray(rawQuestions)||rawQuestions.length===0||rawQuestions.length>2000)
   throw Error("Bank must have 1–2000 questions");
 const paperId=("bank:"+bankId) as PaperId;
 const qIds=new Set<string>();
 const sections=new Map<string,{title:string;ids:QuestionRevisionId[]}>();
 const questions:QuestionRevision[]=[];
 const entries:AnswerKeyEntry[]=[];
 const explanations:Record<string,string>={};
 for(let n=0;n<rawQuestions.length;n++){
   const prefix="questions["+(n+1)+"]";
   const q=obj(rawQuestions[n],prefix);
   const id=key(q["id"]??"q"+(n+1),prefix+".id");
   ensure(!qIds.has(id),"Duplicate question ID "+id);qIds.add(id);
   const sec=str(q["section"]??"General",prefix+".section",120);
   const prompt=str(q["question"]??q["prompt"],prefix+".question",20000);
   const kind=q["type"]??"mcq";
   const qid=(paperId+":q:"+id+":r"+revision) as QuestionRevisionId;
   let content:QuestionRevision["content"];
   let answer:AnswerKeyEntry["answer"];
   if(kind==="mcq"||kind==="single-choice"){
     const rawOptions=q["options"];
     if(!Array.isArray(rawOptions)||rawOptions.length<2||rawOptions.length>26)
       throw Error(prefix+" requires 2–26 answer options");
     const options=rawOptions.map((option:unknown,i:number)=>({
       id:LETTERS[i]! as OptionId,text:str(option,prefix+".options["+(i+1)+"]",5000)}));
     const letter=str(q["answer"],prefix+".answer",1).toUpperCase();
     ensure(LETTERS.indexOf(letter)>=0&&LETTERS.indexOf(letter)<options.length,
       prefix+" answer must be one of its option letters");
     content={kind:"single-choice",prompt,options};
     answer={kind:"single-choice",optionId:letter as OptionId};
   }else if(kind==="nat"||kind==="numeric-entry"){
     const values=Array.isArray(q["answer"])?q["answer"]:[q["answer"]];
     ensure(values.length>=1&&values.length<=20,"NAT needs 1–20 accepted numeric answers");
     const acceptedValues=values.map((v,i)=>number(v,prefix+".answer["+(i+1)+"]"));
     const tolerance=number(q["tolerance"]??0,prefix+".tolerance");
     ensure(tolerance>=0&&tolerance<=1000000,"NAT tolerance out of range");
     content={kind:"numeric-entry",prompt,numericRules:{allowNegative:true}};
     answer={kind:"numeric-entry",acceptedValues,absoluteTolerance:tolerance};
   }else throw Error(prefix+" unsupported simple-bank type: use mcq or nat (full exam JSON supports all six kinds)");
   const editorial={status:"verified" as const};
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
   if(t["kind"]==="whole-paper"){
     const minutes=number(t["minutes"],"timing.minutes");
     ensure(minutes>0&&minutes<=1440,"timing.minutes must be 1–1440");
     timing={kind:"whole-paper",durationMs:minutes*60000,pausePolicy:"allowed"};
   }else ensure(t["kind"]==="untimed","Simple bank timing must be untimed or whole-paper");
 }
 const paperBase={
  id:(paperId+":paper:r"+revision) as PaperRevisionId,paperId,revision,
  edition:edition as PaperEdition,answerKeyRevisionId:keyId,sections:sectionList,timing,
  navigation:{questionNavigation:"free" as const,sectionNavigation:"free" as const,
   allowFlagging:true,allowReview:true},
  scoring:{defaultRule:rule}
 };
 const paper:PaperRevision={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const packageValue={format:"practice-desk-exam" as const,version:1 as const,
  examId:examId as ExamId,title,questions,answerKey,paper,explanations};
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
 if(value&&typeof value==="object"&&!Array.isArray(value)&&
    (value as Input)["format"]==="practice-desk-bank")return importSimpleQuestionBank(value);
 return validateExamPackage(value);
}
