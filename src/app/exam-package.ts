/** Application assembly/configuration adapters. Canonical package and attempt contracts live below app/. */
import { answerKeyRevisionHash, paperRevisionHash } from "../domain/integrity.ts";
import type { PaperRevision } from "../domain/exam.js";
import type { QuestionRevision, CandidateResponse } from "../domain/question.js";
import type { AnswerKeyRevision, CorrectAnswer } from "../domain/answer-key.js";
import type { QuestionRevisionId } from "../domain/ids.js";
import {validateExamPackage} from "../domain/exam-package.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import type {AttemptMode} from "../domain/attempt.js";
import type {PracticeMode} from "../workspace-settings.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import {paperTimeBudgetMs,sectionTimeBudgetMs} from "../domain/timing.ts";
export {validateExamImportBudget,validateExamPackage} from "../domain/exam-package.ts";
import { startSession } from "../engine/session.ts";
import { freezeAttempt } from "../history/frozen.ts";

/** Derive practice policies from any validated paper without modifying its source.
 * Only authored section limits may become individual section-practice timers;
 * never invent an equal division of a whole-paper timer. */
export function availablePracticeModes(paper:PaperRevision):readonly PracticeMode[]{
 const structural:readonly PracticeMode[]=paper.sections.length>1?["strict","free","single"]:["strict","free"];
 const declared=paper.practiceModes??structural;
 return declared.filter(mode=>structural.includes(mode));
}

export function resolvePracticeMode(paper:PaperRevision,selected:PracticeMode):PracticeMode{
 const available=availablePracticeModes(paper);
 if(available.includes(selected))return selected;
 const preferred:PracticeMode=paper.edition==="custom"?"free":"strict";
 return available.includes(preferred)?preferred:available[0]!;
}
/** One canonical initial mode rule for first mount, new families and imports. */
export function defaultPracticeMode(paper:PaperRevision):PracticeMode{
 return resolvePracticeMode(paper,paper.edition==="custom"?"free":"strict");
}

export function configurePracticeMode(base:ExamPackage,mode:PracticeMode,sectionIndex=0):ExamPackage{
 if(!availablePracticeModes(base.paper).includes(mode))
   throw new Error("Selected practice mode is unavailable for this paper");
 if(mode==="strict"){
   if(base.paper.timing.kind!=="sectional")return base;
   // A hard deadline must automatically advance, not strand the candidate
   // behind a frozen manual-expiry section. Preserve each authored limit.
   const derived={...base.paper,
     id:(base.paper.id+":practice:strict") as PaperRevision["id"],
     timing:{...base.paper.timing,transition:"automatic" as const}};
   const paper:PaperRevision={...derived,contentHash:paperRevisionHash(derived)};
   return {...base,paper};
 }
 const source=base.paper;
 // A whole-paper or untimed package with already-flexible navigation and pause
 // policy needs only the frozen advisory AttemptMode, not a duplicate paper/key.
 if(mode==="free"&&source.timing.kind!=="sectional"&&
   (source.timing.kind==="untimed"||source.timing.pausePolicy==="allowed")&&
   source.navigation.questionNavigation==="free"&&source.navigation.sectionNavigation==="free")
   return base;
 if(mode==="single"&&!source.sections[sectionIndex])throw new Error("Unknown practice section");
 const sections=mode==="single"?[source.sections[sectionIndex]!]:[...source.sections];
 const included=new Set(sections.flatMap(s=>s.questionRevisionIds));
 const questions=base.questions.filter(q=>included.has(q.id));
 const entries=base.answerKey.entries.filter(e=>included.has(e.questionRevisionId));
 const answerKey={...base.answerKey,
   id:(base.answerKey.id+":practice:"+mode+(mode==="single"?":"+sectionIndex:"")) as AnswerKeyRevision["id"],
   contentHash:answerKeyRevisionHash({entries}),entries};
 const duration=mode==="free"?paperTimeBudgetMs(source):
   source.timing.kind==="sectional"?sectionTimeBudgetMs(source,sectionIndex):
   source.timing.kind==="whole-paper"&&source.sections.length===1?
     source.timing.durationMs:null;
 const paperBase={...source,
   id:(source.id+":practice:"+mode+(mode==="single"?":"+sectionIndex:"")) as PaperRevision["id"],
   answerKeyRevisionId:answerKey.id,sections,
   timing:duration===null?{kind:"untimed" as const}:
     {kind:"whole-paper" as const,durationMs:duration,pausePolicy:"allowed" as const},
   navigation:{...source.navigation,
     questionNavigation:mode==="free"?"free" as const:source.navigation.questionNavigation,
     sectionNavigation:mode==="free"?"free" as const:"sequential-locked" as const}};
 const paper:PaperRevision={...paperBase,contentHash:paperRevisionHash(paperBase)};
 return {...base,paper,answerKey,questions,
   ...(base.explanations?{explanations:Object.fromEntries(Object.entries(base.explanations)
     .filter(([id])=>included.has(id as QuestionRevisionId)))}:{}),
   title:base.title+(mode==="free"?" · Flexible practice":" · "+sections[0]!.title+" practice")};
}
/** Optional timing override for any valid exam: never mutate the supplied paper.
 * The distinct derived paper hash/id are frozen with each new attempt.
 * Navigation, edition, keys, scoring and question order remain unchanged. */
export function configureUntimedPractice(base:ExamPackage,enabled:boolean):ExamPackage{
 if(!enabled||base.paper.timing.kind==="untimed")return base;
 const derived={...base.paper,
   id:(base.paper.id+":practice:untimed") as PaperRevision["id"],
   timing:{kind:"untimed" as const}};
 const paper:PaperRevision={...derived,contentHash:paperRevisionHash(derived)};
 return {...base,paper};
}

export function attemptModeForPractice(mode:PracticeMode):AttemptMode{
 return mode==="free"?"full-paper-practice":mode==="single"?"section-practice":"exam-simulation";
}

export function startGenericAttempt(
 bundle: ExamPackage,id:string,timestamp:number,mode?:AttemptMode
): GenericAttempt {
 const validated=validateExamPackage(bundle);
 const frozenMode=mode??(validated.paper.edition==="custom"?"custom-practice":"exam-simulation");
 const frozen=freezeAttempt(validated.paper,validated.answerKey,validated.questions,
   validated.stimuli??[],validated.assets??[],frozenMode,new Date(timestamp).toISOString(),validated.examId);
 return {recordType:"generic-attempt",saveRevision:0,id,packageId:validated.paper.id,startedAt:timestamp,
   updatedAt:timestamp,finishedAt:null,completionReason:null,frozen,state:startSession(validated.paper,timestamp),
   ...(validated.explanations?{explanations:structuredClone(validated.explanations)}:{})};
}

/** Resolve display labels from frozen question definitions, not option positions or keys. */
export function readableAnswer(q:QuestionRevision,
 answer:CorrectAnswer | CandidateResponse | undefined):string{
 if(!answer)return "Unanswered";
 const content=q.content;
 switch(answer.kind){
 case "single-choice":
   return content.kind==="single-choice"||content.kind==="multiple-select"?
     content.options.find(o=>o.id===answer.optionId)?.text??"Unknown option":"Unknown option";
 case "multiple-select":
   return content.kind==="multiple-select"?
     content.options.filter(o=>answer.optionIds.includes(o.id)).map(o=>o.text).join("; "):"Invalid response";
 case "numeric-entry":
   return "acceptedValues" in answer?answer.acceptedValues.join(", "):String(answer.value);
 case "true-false":return answer.value?"True":"False";
 case "matching":return content.kind==="matching"?answer.pairs.map(pair=>{
   const left=content.leftItems.find(item=>item.id===pair.leftId)?.text??pair.leftId;
   const right=content.rightItems.find(item=>item.id===pair.rightId)?.text??pair.rightId;
   return left+" → "+right;
 }).join("; "):"Invalid response";
 case "free-response":return "text" in answer?answer.text:"Manual assessment required";
 }
}
