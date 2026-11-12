import { validateAnswerKeyRevision, validatePaperRevision, validateQuestionRevision } from "./validate.ts";
import { assertRevisionHashes } from "./integrity.ts";
import { validateMediaInventory, validateQuestionMediaReferences } from "./media.ts";
import type { PaperRevision } from "./exam.js";
import type { QuestionRevision, StimulusDefinition, ImageAsset } from "./question.js";
import type { AnswerKeyRevision } from "./answer-key.js";
import type { ExamId, QuestionRevisionId } from "./ids.js";

export type CglPracticeMode = "strict" | "free" | "single";

export interface ExamPackage {
  readonly format: "practice-desk-exam";
  readonly version: 1;
  readonly examId: ExamId;
  readonly title: string;
  readonly paper: PaperRevision;
  readonly answerKey: AnswerKeyRevision;
  readonly questions: readonly QuestionRevision[];
  readonly stimuli?: readonly StimulusDefinition[];
  readonly assets?: readonly ImageAsset[];
  readonly explanations?: Readonly<Record<string,string>>;
  /** Runtime mode chosen by the user for derived CGL policies; never trusted as imported exam content. */
  readonly practiceMode?: CglPracticeMode;
}

/** Reject hostile deep/broad/oversized authored JSON before hashing or cloning it. */
export function validateExamImportBudget(value:unknown):void{
 const MAX_TOTAL_CHARS=32*1024*1024;
 const MAX_NODES=150000;
 const MAX_DEPTH=48;
 const seen=new WeakSet<object>();
 let chars=0,nodes=0;
 const walk=(v:unknown,depth:number,field:string):void=>{
  if(++nodes>MAX_NODES)throw Error("Exam import exceeds structural complexity limit");
  if(depth>MAX_DEPTH)throw Error("Exam import exceeds nesting limit");
  if(typeof v==="string"){
    chars+=v.length;
    if(chars>MAX_TOTAL_CHARS)throw Error("Exam import exceeds 32 MiB text budget");
    if(field==="dataUri"){
      if(v.length>14*1024*1024)throw Error("Exam import image data URI too large");
    }else if(v.length>20000){
      throw Error("Exam import text field exceeds 20,000 characters");
    }
    if(/(?:^id$|Id$|^bankId$|^examId$|^optionId$|^rubricId$|^questionRevisionIds$)/.test(field)&&v.length>512)
      throw Error("Exam import identifier too long");
    return;
  }
  if(v===null||typeof v!=="object")return;
  if(seen.has(v))throw Error("Exam import contains repeated/cyclic object references");
  seen.add(v);
  if(Array.isArray(v)){
    if(v.length>MAX_NODES)throw Error("Exam import array is too large");
    for(const item of v)walk(item,depth+1,field);
  }else{
    const pairs=Object.entries(v as Record<string,unknown>);
    if(pairs.length>MAX_NODES)throw Error("Exam import object is too large");
    for(const [key,item] of pairs){
      if(key.length>512)throw Error("Exam import field name too long");
      chars+=key.length;
      if(chars>MAX_TOTAL_CHARS)throw Error("Exam import exceeds 32 MiB text budget");
      walk(item,depth+1,key);
    }
  }
  seen.delete(v);
 };
 walk(value,0,"");
}

/** Every supplied question, key and attachment is validated before becoming visible. */
export function validateExamPackage(value: unknown): ExamPackage {
 validateExamImportBudget(value);
 if (!value || typeof value !== "object") throw new Error("Exam package must be an object");
 const raw = value as Record<string, unknown>;
 if(![Object.prototype,null].includes(Object.getPrototypeOf(value)))
   throw new Error("Exam package must be a plain object");
 const fields=["format","version","examId","title","paper","answerKey","questions",
   "stimuli","assets","explanations","practiceMode"];
 for(const field of Object.keys(raw))
   if(!fields.includes(field))throw new Error("Exam package."+field+": unsupported field");
 if(raw.practiceMode!==undefined&&
   (raw.examId!=="ssc-cgl"||!["strict","free","single"].includes(String(raw.practiceMode))))
   throw new Error("Exam package: invalid runtime practice mode");
 if (raw.format !== "practice-desk-exam" || raw.version !== 1 ||
    typeof raw.examId !== "string" || !raw.examId.trim() ||
    typeof raw.title !== "string" || !raw.title.trim() ||
    !Array.isArray(raw.questions) || raw.questions.length > 2000)
    throw new Error("Invalid exam package header or question count");
 const questions = raw.questions.map(x => validateQuestionRevision(x));
 const key = validateAnswerKeyRevision(raw.answerKey, questions);
 const paper = validatePaperRevision(raw.paper, questions, key);
 const ids = new Set(paper.sections.flatMap(s => s.questionRevisionIds));
 if (ids.size !== questions.length || questions.some(q => !ids.has(q.id)))
    throw new Error("Every question must belong to this paper exactly once");
 const {stimuli,assets}=validateMediaInventory(raw.stimuli??[],raw.assets??[]);
 validateQuestionMediaReferences(questions,stimuli,assets);
 assertRevisionHashes(questions,key,paper);
 const explanations=raw.explanations;
 if(explanations!==undefined){
   if(!explanations || typeof explanations!=="object" || Array.isArray(explanations))
     throw new Error("Invalid explanations");
   for(const [id,text] of Object.entries(explanations)){
     if(!ids.has(id as QuestionRevisionId) || typeof text!=="string" || text.length>20000)
       throw new Error("Invalid explanation reference");
   }
 }
 return value as ExamPackage;
}
