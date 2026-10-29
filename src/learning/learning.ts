import type { GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevision, StimulusDefinition, ImageAsset } from "../domain/question.js";
import { questionRevisionHash, answerKeyRevisionHash } from "../domain/integrity.ts";
import { selectDisplayResources, validateMediaInventory, validateQuestionMediaReferences } from "../domain/media.ts";
import type { CorrectAnswer } from "../domain/answer-key.js";
import type { QuestionRevisionId } from "../domain/ids.js";
import type { DefaultScheduler, Grade } from "ts-fsrs";
import { validateQuestionRevision, validateAnswerKeyRevision } from "../domain/validate.ts";

export const ERROR_LABELS=["conceptual","calculation","interpretation","time-pressure","guessing","careless","knowledge-gap","other"] as const;
export type ErrorLabel=typeof ERROR_LABELS[number];
export type ReviewGrade=1|2|3|4;
export interface LearningCard {
 readonly recordType:"learning-card";
 readonly id:string;
 readonly saveRevision?:number;
 readonly question:QuestionRevision;
 readonly answer:CorrectAnswer;
 readonly stimuli:readonly StimulusDefinition[];
 readonly assets:readonly ImageAsset[];
 readonly examId:string;
 readonly paperId:string;
 readonly paperEdition:string;
 readonly sectionTitle:string;
 readonly sourceTitle:string;
 readonly explanation?:string;
 readonly note:string;
 readonly errorLabel:ErrorLabel|null;
 readonly customTopic:string;
 readonly bookmarked:boolean;
 readonly createdAt:string;
 readonly updatedAt:string;
 /** Explicit user ratings. Replay on FSRS-7 instead of storing Date objects or derived scheduling state. */
 readonly reviews:readonly {at:string;rating:ReviewGrade}[];
}
const validDate=(x:unknown):x is string=>typeof x==="string"&&Number.isFinite(Date.parse(x));
export function validateLearningCard(input:unknown):LearningCard{
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid learning card");
 const raw=input as Partial<LearningCard>;
 if(raw.recordType!=="learning-card"||typeof raw.id!=="string"||
    !raw.id.startsWith("learning-card:")||typeof raw.examId!=="string"||!raw.examId||
    typeof raw.paperId!=="string"||!raw.paperId||typeof raw.paperEdition!=="string"||
    typeof raw.sectionTitle!=="string"||typeof raw.sourceTitle!=="string"||
    typeof raw.note!=="string"||raw.note.length>8000||
    typeof raw.customTopic!=="string"||raw.customTopic.length>120||
    typeof raw.bookmarked!=="boolean"||
    !(raw.errorLabel===null||ERROR_LABELS.includes(raw.errorLabel as ErrorLabel))||
    !validDate(raw.createdAt)||!validDate(raw.updatedAt)||
    (raw.explanation!==undefined&&(typeof raw.explanation!=="string"||raw.explanation.length>20000))||
    !Array.isArray(raw.reviews)||raw.reviews.length>10000)
   throw Error("Invalid learning card fields");
 const question=validateQuestionRevision(raw.question);
 if(question.contentHash!==questionRevisionHash(question))throw Error("Learning card question hash mismatch");
 if(!Array.isArray(raw.stimuli)||!Array.isArray(raw.assets))throw Error("Learning card display media missing");
 const media=validateMediaInventory(raw.stimuli,raw.assets);
 validateQuestionMediaReferences([question],media.stimuli,media.assets);
 if(raw.id!=="learning-card:"+question.id)throw Error("Learning card question identity mismatch");
 // Reuse the real answer-key validator, even for cards imported from a JSON backup.
 const entries=[{questionRevisionId:question.id,answer:raw.answer!}];
 validateAnswerKeyRevision({id:"learning-key",paperId:raw.paperId!,revision:1,
   contentHash:answerKeyRevisionHash({entries}),entries},[question]);
 let previous=Date.parse(raw.createdAt);
 for(const review of raw.reviews){
   if(!review||!validDate(review.at)||!([1,2,3,4] as readonly number[]).includes(review.rating)||
      Date.parse(review.at)<previous||Date.parse(review.at)>Date.parse(raw.updatedAt))
     throw Error("Invalid or unordered learning review history");
   previous=Date.parse(review.at);
 }
 return input as LearningCard;
}
export function addLearningCard(attempt:GenericAttempt,id:QuestionRevisionId,at:string):LearningCard{
 if(attempt.finishedAt===null)throw Error("Learning notebook is available only after submission");
 if(!validDate(at))throw Error("Invalid learning-card timestamp");
 const question=attempt.frozen.questions.find(q=>q.id===id);
 const key=attempt.frozen.key.entries.find(x=>x.questionRevisionId===id);
 const section=attempt.frozen.paper.sections.find(s=>s.questionRevisionIds.includes(id));
 if(!question||!key||!section)throw Error("Question not in completed exam");
 const display=selectDisplayResources([question],attempt.frozen.stimuli,attempt.frozen.assets);
 const record:LearningCard={
   recordType:"learning-card",id:"learning-card:"+id,
   examId:attempt.frozen.snapshot.examId,paperId:attempt.frozen.paper.paperId,
   paperEdition:attempt.frozen.paper.edition,sectionTitle:section.title,
   sourceTitle:attempt.frozen.paper.paperId,question:structuredClone(question),
   answer:structuredClone(key.answer),...display,note:"",customTopic:"",errorLabel:null,bookmarked:false,
   ...(attempt.explanations?.[id]?{explanation:attempt.explanations[id]}:{}),
   createdAt:at,updatedAt:at,reviews:[]
 };
 return validateLearningCard(record);
}
export function scheduledCard(item:LearningCard,scheduler:DefaultScheduler){
 let card=scheduler.newCard({cardId:item.id,now:new Date(item.createdAt)});
 for(const review of item.reviews)
   card=scheduler.review({card,grade:review.rating as Grade,now:new Date(review.at)}).card;
 return card;
}
export function rateLearningCard(item:LearningCard,rating:ReviewGrade,at:string,scheduler:DefaultScheduler):LearningCard{
 if(!validDate(at)||Date.parse(at)<Date.parse(item.reviews.at(-1)?.at??item.createdAt))
   throw Error("Review time must be monotonic");
 // Verify that the selected FSRS grade is schedulable before recording it.
 scheduler.review({card:scheduledCard(item,scheduler),grade:rating as Grade,now:new Date(at)});
 return validateLearningCard({...item,reviews:[...item.reviews,{rating,at}],updatedAt:at});
}
export interface TopicMetrics {
 id:string;label:string;examId:string;total:number;answered:number;correct:number;incorrect:number;skipped:number;
 accuracy:number|null;coverage:number;evidence:"insufficient"|"measured";
 /** Repeated answers are observations, not additional distinct questions. */
 attempts:number;distinctQuestions:number;kind:"section"|"source-topic"|"user-topic";
}
export function topicMetrics(attempts:readonly GenericAttempt[],cards:readonly LearningCard[]=[]):TopicMetrics[]{
 const manual=new Map(cards.filter(c=>c.customTopic.trim()).map(c=>[c.question.id,c.customTopic.trim()]));
 const rows=new Map<string,TopicMetrics>();
 const distinct=new Map<string,Set<string>>(),independent=new Map<string,Set<string>>();
 for(const attempt of attempts){
   if(!attempt.result||attempt.finishedAt===null)continue;
   const sections=attempt.frozen.paper.sections;
   const questions=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
   for(const item of attempt.result.items){
     if(item.verdict==="excluded"||item.verdict==="pending")continue;
     const q=questions.get(item.questionRevisionId);
     const section=sections.find(s=>s.questionRevisionIds.includes(item.questionRevisionId));
     if(!q||!section)continue;
     const labels:{label:string;kind:TopicMetrics["kind"]}[]=[
       {label:section.title,kind:"section"},
       ...(q.content.topicIds??[]).map(label=>({label,kind:"source-topic" as const})),
       ...(manual.get(q.id)?[{label:manual.get(q.id)!,kind:"user-topic" as const}]:[])
     ];
     const unique=new Set<string>();
     for(const {label,kind} of labels){
       if(!label.trim())continue;
       const examId=attempt.frozen.snapshot.examId;
       const key=examId+"|"+kind+"|"+label;
       if(unique.has(key))continue;
       unique.add(key);
       const row:TopicMetrics=rows.get(key)??{id:key,label,kind,examId,total:0,answered:0,correct:0,
         incorrect:0,skipped:0,accuracy:null,coverage:0,evidence:"insufficient",
         attempts:0,distinctQuestions:0};
       row.total++;
       if(item.verdict==="correct"){row.correct++;row.answered++;}
       if(item.verdict==="incorrect"){row.incorrect++;row.answered++;}
       if(item.verdict==="unanswered")row.skipped++;
       const distinctIds=distinct.get(key)??new Set<string>();
       distinctIds.add(q.id);distinct.set(key,distinctIds);
       const attemptIds=independent.get(key)??new Set<string>();
       attemptIds.add(attempt.id);independent.set(key,attemptIds);
       row.distinctQuestions=distinctIds.size;
       row.attempts=attemptIds.size;
       row.accuracy=row.answered?row.correct/row.answered:null;
       row.coverage=row.answered/row.total;
       // Five answers is the minimum to display raw observed accuracy,
       // never a declaration of topic mastery.
       row.evidence=row.answered>=5?"measured":"insufficient";
       rows.set(key,row);
     }
   }
 }
 return [...rows.values()].sort((a,b)=>a.examId.localeCompare(b.examId)||
   a.kind.localeCompare(b.kind)||a.label.localeCompare(b.label));
}
export interface ComparableTrend {paperRevisionId:string;label:string;count:number;points:{at:number;accuracy:number|null;coverage:number;marks:number}[]}
export function comparableTrends(attempts:readonly GenericAttempt[]):ComparableTrend[]{
 const groups=new Map<string,ComparableTrend>();
 for(const a of attempts){
   if(!a.result||a.finishedAt===null)continue;
   // Exact revision: same questions, edition, scoring, timing and navigation. Never blend unrelated exams.
   const id=a.frozen.paper.id;
   const group=groups.get(id)??{paperRevisionId:id,label:a.frozen.paper.paperId+" · "+a.frozen.paper.edition,count:0,points:[]};
   const s=a.result.snapshot;
   const attempted=s.correctCount+s.incorrectCount;
   const total=attempted+s.unansweredCount;
   group.count++;
   group.points.push({at:a.finishedAt,accuracy:attempted?s.correctCount/attempted:null,
     coverage:total?attempted/total:0,marks:s.earnedMarks});
   groups.set(id,group);
 }
 return [...groups.values()].map(g=>({...g,points:g.points.sort((a,b)=>a.at-b.at)}))
   .sort((a,b)=>b.count-a.count);
}
