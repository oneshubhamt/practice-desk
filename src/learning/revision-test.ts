import type { LearningCard } from "./learning.ts";
import { validateLearningCard } from "./learning.ts";
import type { ExamPackage } from "../app/exam-package.ts";
import { validateExamPackage } from "../app/exam-package.ts";
import type { ImageAsset,StimulusDefinition } from "../domain/question.js";
import type { PaperRevision } from "../domain/exam.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { ExamId,PaperId,PaperRevisionId,AnswerKeyRevisionId,SectionId } from "../domain/ids.js";
import { answerKeyRevisionHash,paperRevisionHash } from "../domain/integrity.ts";

export const REVISION_MAX_QUESTIONS=25;
export const REVISION_SCORING={correctMarks:1,incorrectMarks:0,unansweredMarks:0} as const;
export const SCOREABLE_STATUSES=["verified","corrected","caution"] as const;

function mergeUnique<T extends {readonly id:string}>(items:readonly T[],into:Map<string,T>,kind:string):void{
 for(const item of items){
   const existing=into.get(item.id);
   if(existing&&JSON.stringify(existing)!==JSON.stringify(item))
     throw new Error("Conflicting frozen "+kind+" identity: "+item.id);
   if(!existing)into.set(item.id,item);
 }
}

/** A new, short, fully offline paper built from exact notebook revisions.
 * It does NOT rewrite the source paper, rate FSRS cards, or claim official marks.
 */
export function makeRevisionPackage(cards:readonly LearningCard[],paperNonce:string):ExamPackage{
 if(!cards.length||cards.length>REVISION_MAX_QUESTIONS)
   throw new Error("Select 1–"+REVISION_MAX_QUESTIONS+" notebook cards for revision");
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(paperNonce))
   throw new Error("Invalid revision-test identity");
 const validated=cards.map(validateLearningCard);
 const examId=validated[0]!.examId;
 if(validated.some(card=>card.examId!==examId))
   throw new Error("Revision tests cannot mix different exams");
 const questions=validated.map(card=>card.question);
 if(new Set(questions.map(q=>q.id)).size!==questions.length)
   throw new Error("Duplicate question revisions in revision test");
 if(questions.some(q=>!SCOREABLE_STATUSES.some(status=>status===q.editorial.status)))
   throw new Error("A notebook question is no longer editorially eligible for scoring");
 const images=new Map<string,ImageAsset>(),stimuli=new Map<string,StimulusDefinition>();
 for(const card of validated){
   mergeUnique(card.assets,images,"image");
   mergeUnique(card.stimuli,stimuli,"stimulus");
 }
 const paperId=("notebook-revision:"+paperNonce) as PaperId;
 const revisionId=(paperId+":paper") as PaperRevisionId;
 const keyId=(paperId+":key") as AnswerKeyRevisionId;
 const entries=validated.map(card=>({questionRevisionId:card.question.id,answer:card.answer}));
 const answerKey:AnswerKeyRevision={
   id:keyId,paperId,revision:1,entries,contentHash:answerKeyRevisionHash({entries})
 };
 const section={id:(paperId+":section") as SectionId,title:"Notebook revision",
   questionRevisionIds:questions.map(q=>q.id)};
 const source:Omit<PaperRevision,"contentHash">={
   id:revisionId,paperId,revision:1,edition:"custom",sections:[section],
   answerKeyRevisionId:keyId,
   timing:{kind:"untimed"},
   navigation:{questionNavigation:"free",sectionNavigation:"free",allowFlagging:true,allowReview:true},
   scoring:{defaultRule:REVISION_SCORING}
 };
 const paper:PaperRevision={...source,contentHash:paperRevisionHash(source)};
 const explanations=Object.fromEntries(validated.filter(c=>c.explanation).map(c=>[c.question.id,c.explanation!]));
 const packageValue:ExamPackage={format:"practice-desk-exam",version:1,
   examId:examId as ExamId,title:"Notebook revision · "+examId,
   paper,answerKey,questions,
   stimuli:[...stimuli.values()],assets:[...images.values()],explanations};
 return validateExamPackage(packageValue);
}
