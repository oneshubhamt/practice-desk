import type { GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevisionId } from "../domain/ids.js";
import type { MarkingRule } from "../domain/scoring.js";
import type { Verdict } from "../engine/scoring.ts";

export interface SectionEvidence {
 sectionId:string;title:string;total:number;answered:number;correct:number;incorrect:number;unanswered:number;
 excluded:number;pending:number;marks:number;positive:number;penalties:number;
 foregroundMs:number;measuredAnswered:number;medianAnsweredMs:number|null;
 coverage:number;accuracy:number|null;
}
export interface SpeedBucket{
 label:"Fast"|"Typical"|"Slow";correct:number;incorrect:number;items:number;
}
export interface AttemptEvidence{
 readonly paperRevisionId:string;
 readonly sections:readonly SectionEvidence[];
 readonly speed:{readonly measured:number;readonly classified:number;readonly buckets:readonly SpeedBucket[]};
 readonly timing:{readonly foregroundMs:number;readonly elapsedMs:number;readonly questionMeasuredMs:number;readonly changedAnswers:number;readonly timedAnswers:number};
 readonly opportunity:{readonly observedPenalty:number;readonly wrongToCorrect:number;readonly skippedToCorrect:number;readonly countWrong:number;readonly countSkipped:number};
}
function median(values:readonly number[]):number|null{
 if(!values.length)return null;
 const x=[...values].sort((a,b)=>a-b),middle=Math.floor(x.length/2);
 return x.length%2===0?((x[middle-1]??0)+(x[middle]??0))/2:(x[middle]??null);
}
const scoringRule=(a:GenericAttempt,id:QuestionRevisionId):MarkingRule=>{
 const section=a.frozen.paper.sections.find(s=>s.questionRevisionIds.includes(id));
 const question=a.frozen.questions.find(q=>q.id===id);
 if(!section||!question)throw Error("Question not in frozen attempt");
 const override=a.frozen.key.entries.find(e=>e.questionRevisionId===id)?.scoringOverride;
 return override??section.scoringOverride??a.frozen.paper.scoring.byQuestionKind?.[question.content.kind]??
   a.frozen.paper.scoring.defaultRule;
};
function addCounts(row:SectionEvidence,verdict:Verdict,marks:number):void{
 row.total++;
 row.marks+=marks;
 row.positive+=Math.max(0,marks);
 row.penalties+=Math.max(0,-marks);
 if(verdict==="correct")row.correct++;
 if(verdict==="incorrect")row.incorrect++;
 if(verdict==="unanswered")row.unanswered++;
 if(verdict==="excluded")row.excluded++;
 if(verdict==="pending")row.pending++;
 if(verdict==="correct"||verdict==="incorrect")row.answered++;
}
/** Descriptive calculations from frozen marks and question foreground time.
 * No population norm, predicted score, or claim about the cause of answer changes.
 */
export function attemptEvidence(a:GenericAttempt):AttemptEvidence|null{
 if(a.finishedAt===null||!a.result)return null;
 const byId=new Map(a.state.responses.map(r=>[r.questionRevisionId,r]));
 const results=new Map(a.result.items.map(i=>[i.questionRevisionId,i]));
 const sectionRows:SectionEvidence[]=[];
 const speeds:SpeedBucket[]=[
   {label:"Fast",correct:0,incorrect:0,items:0},
   {label:"Typical",correct:0,incorrect:0,items:0},
   {label:"Slow",correct:0,incorrect:0,items:0}
 ];
 let measured=0,classified=0,wrongToCorrect=0,skippedToCorrect=0,countWrong=0,countSkipped=0;
 for(const section of a.frozen.paper.sections){
   const row:SectionEvidence={sectionId:section.id,title:section.title,total:0,answered:0,correct:0,incorrect:0,unanswered:0,
     excluded:0,pending:0,marks:0,positive:0,penalties:0,foregroundMs:0,measuredAnswered:0,
     medianAnsweredMs:null,coverage:0,accuracy:null};
   const times:number[]=[];
   for(const id of section.questionRevisionIds){
     const item=results.get(id);
     if(!item)throw Error("Incomplete scored attempt");
     const answer=byId.get(id);
     addCounts(row,item.verdict,item.marks);
     row.foregroundMs+=answer?.timeSpentMs??0;
     if((item.verdict==="correct"||item.verdict==="incorrect")&&(answer?.timeSpentMs??0)>0)
       times.push(answer!.timeSpentMs);
     if(item.verdict==="incorrect"){
       wrongToCorrect+=scoringRule(a,id).correctMarks-item.marks;countWrong++;
     }else if(item.verdict==="unanswered"){
       skippedToCorrect+=scoringRule(a,id).correctMarks-item.marks;countSkipped++;
     }
   }
   row.coverage=row.answered+row.unanswered?row.answered/(row.answered+row.unanswered):0;
   row.accuracy=row.answered?row.correct/row.answered:null;
   row.measuredAnswered=times.length;row.medianAnsweredMs=median(times);
   measured+=times.length;
   // A section with fewer than five measured answers has no defensible
   // relative speed classification.
   if(times.length>=5 && row.medianAnsweredMs!==null && row.medianAnsweredMs>0){
     for(const id of section.questionRevisionIds){
       const item=results.get(id)!;
       const ms=byId.get(id)?.timeSpentMs??0;
       if(ms<=0||(item.verdict!=="correct"&&item.verdict!=="incorrect"))continue;
       const bucket=speeds[ms<row.medianAnsweredMs*0.75?0:ms>row.medianAnsweredMs*1.5?2:1]!;
       bucket.items++;
       if(item.verdict==="correct")bucket.correct++;else bucket.incorrect++;
       classified++;
     }
   }
   sectionRows.push(row);
 }
 const responses=a.state.responses;
 const timedAnswers=responses.filter(r=>r.timeSpentMs>0&&r.response!==undefined).length;
 return {
   paperRevisionId:a.frozen.paper.id,sections:sectionRows,
   speed:{measured,classified,buckets:speeds},
   timing:{foregroundMs:a.state.foregroundMs,elapsedMs:a.state.elapsedMs,
     questionMeasuredMs:responses.reduce((n,r)=>n+r.timeSpentMs,0),
     changedAnswers:responses.filter(r=>r.answerChangeCount>0).length,timedAnswers},
   opportunity:{
     observedPenalty:a.result.snapshot.penaltyMarks,
     wrongToCorrect:Math.max(0,wrongToCorrect),skippedToCorrect:Math.max(0,skippedToCorrect),
     countWrong,countSkipped
   }
 };
}
export interface ProgressionEvidence {
 examId:string;topic:string;attempts:number;answered:number;distinctQuestions:number;accuracy:number|null;
 label:"insufficient"|"repeated-items"|"moderate-observed"|"mixed"|"consistently-accurate";
}
export function evidenceProgression(rows:readonly {
 examId:string;label:string;answered:number;correct:number;attempts?:number;distinctQuestions?:number;
}[]):ProgressionEvidence[]{
 return rows.map(r=>{
   const attempts=r.attempts??0,distinctQuestions=r.distinctQuestions??0;
   const accuracy=r.answered>0?r.correct/r.answered:null;
   const label=attempts<2||r.answered<10?"insufficient":
     distinctQuestions<5?"repeated-items":
     accuracy!==null&&accuracy>=0.8?"consistently-accurate":
     accuracy!==null&&accuracy>=0.6?"moderate-observed":"mixed";
   return {examId:r.examId,topic:r.label,answered:r.answered,attempts,distinctQuestions,accuracy,label};
 });
}
