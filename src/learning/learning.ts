import type { GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevision } from "../domain/question.js";
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
 if(raw.id!=="learning-card:"+question.id)throw Error("Learning card question identity mismatch");
 // Reuse the real answer-key validator, even for cards imported from a JSON backup.
 validateAnswerKeyRevision({id:"learning-key",paperId:raw.paperId,revision:1,
   contentHash:"0".repeat(64),entries:[{questionRevisionId:question.id,answer:raw.answer}]},[question]);
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
 const record:LearningCard={
   recordType:"learning-card",id:"learning-card:"+id,
   examId:attempt.frozen.snapshot.examId,paperId:attempt.frozen.paper.paperId,
   paperEdition:attempt.frozen.paper.edition,sectionTitle:section.title,
   sourceTitle:attempt.frozen.paper.paperId,question:structuredClone(question),
   answer:structuredClone(key.answer),note:"",customTopic:"",errorLabel:null,bookmarked:false,
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
}
export function topicMetrics(attempts:readonly GenericAttempt[]):TopicMetrics[]{
 const rows=new Map<string,TopicMetrics>();
 for(const attempt of attempts){
   if(!attempt.result||attempt.finishedAt===null)continue;
   const sections=attempt.frozen.paper.sections;
   const questions=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
   for(const item of attempt.result.items){
     if(item.verdict==="excluded"||item.verdict==="pending")continue;
     const q=questions.get(item.questionRevisionId);
     const section=sections.find(s=>s.questionRevisionIds.includes(item.questionRevisionId));
     if(!q||!section)continue;
     const topics=q.content.topicIds?.length?q.content.topicIds.map(id=>String(id)):[section.title];
     for(const topic of topics){
       const id=attempt.frozen.snapshot.examId;
       const key=id+"|"+topic;
       const r=rows.get(key)??{id:key,label:topic,examId:id,total:0,answered:0,correct:0,incorrect:0,skipped:0,accuracy:null,coverage:0,evidence:"insufficient" as const};
       r.total++;
       if(item.verdict==="correct"){r.correct++;r.answered++;}
       if(item.verdict==="incorrect"){r.incorrect++;r.answered++;}
       if(item.verdict==="unanswered")r.skipped++;
       r.accuracy=r.answered?r.correct/r.answered:null;
       r.coverage=r.answered/r.total;
       r.evidence=r.answered>=5?"measured":"insufficient";
       rows.set(key,r);
     }
   }
 }
 return [...rows.values()].sort((a,b)=>a.examId.localeCompare(b.examId)||a.label.localeCompare(b.label));
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
