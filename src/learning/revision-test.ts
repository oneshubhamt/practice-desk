import type { LearningCard } from "./learning.ts";
import { validateLearningCard } from "./learning.ts";
import type { ExamPackage } from "../app/exam-package.ts";
import { validateExamPackage } from "../app/exam-package.ts";
import type { ImageAsset,StimulusDefinition } from "../domain/question.js";
import type { PaperRevision } from "../domain/exam.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { ExamId,PaperId,PaperRevisionId,AnswerKeyRevisionId,SectionId } from "../domain/ids.js";
import { answerKeyRevisionHash,paperRevisionHash } from "../domain/integrity.ts";
import { hashJson } from "../domain/hash.ts";
import type { GenericAttempt } from "../app/exam-package.ts";

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

/** A verifiable trail from each revision item to the completed original attempt.
 * Source attempts may subsequently be deleted: identifiers/labels remain frozen.
 */
export interface NotebookLineage{
 readonly schema:1;
 readonly entries:readonly {
   readonly cardId:string;
   readonly questionRevisionId:string;
   readonly sourceAttemptId:string;
   readonly sourcePaperId:string;
   readonly sourcePaperEdition:string;
   readonly sourceSectionTitle:string;
 }[];
 readonly contentHash:string;
}
export function createNotebookLineage(cards:readonly LearningCard[]):NotebookLineage{
 if(!cards.length||cards.length>REVISION_MAX_QUESTIONS)
   throw Error("Invalid revision source selection");
 const entries=cards.map(value=>{
   const c=validateLearningCard(value);
   return {cardId:c.id,questionRevisionId:c.question.id,sourceAttemptId:c.sourceAttemptId,
     sourcePaperId:c.paperId,sourcePaperEdition:c.paperEdition,sourceSectionTitle:c.sectionTitle};
 });
 if(new Set(entries.map(x=>x.questionRevisionId)).size!==entries.length)
   throw Error("Duplicate notebook source question");
 return {schema:1,entries,contentHash:hashJson({schema:1,entries})};
}
export function validateNotebookLineage(attempt:GenericAttempt):void{
 const lineage=attempt.notebookLineage;
 if(!lineage)return;
 if(lineage.schema!==1||!Array.isArray(lineage.entries)||
   attempt.frozen.paper.edition!=="custom"||
   !attempt.frozen.paper.paperId.startsWith("notebook-revision:")||
   lineage.entries.length!==attempt.frozen.questions.length)
   throw Error("Invalid notebook revision lineage");
 const eligible=new Set(attempt.frozen.questions.map(x=>x.id));
 const seen=new Set<string>();
 for(const entry of lineage.entries){
   if(!entry||typeof entry.questionRevisionId!=="string"||!eligible.has(entry.questionRevisionId)||
      seen.has(entry.questionRevisionId)||entry.cardId!=="learning-card:"+entry.questionRevisionId||
      ![entry.sourceAttemptId,entry.sourcePaperId,entry.sourcePaperEdition,entry.sourceSectionTitle]
        .every(x=>typeof x==="string"&&!!x&&x.length<=200))
     throw Error("Invalid notebook revision lineage entry");
   seen.add(entry.questionRevisionId);
 }
 if(lineage.contentHash!==hashJson({schema:1,entries:lineage.entries}))
   throw Error("Notebook revision lineage hash mismatch");
}
