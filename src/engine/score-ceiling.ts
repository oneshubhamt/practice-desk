import type { PaperRevision, SectionDefinition } from "../domain/exam.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { QuestionRevision } from "../domain/question.js";
import type { MarkingRule } from "../domain/scoring.js";
import type { GenericAttempt } from "../app/exam-package.ts";
import type { ScoreResult } from "./scoring.ts";
import { sectionTimerDuration } from "./session.ts";

const excluded=new Set(["draft","invalid","incomplete-source","under-review","superseded"]);

/** Maximum nominal automated marks under this exact frozen paper/key policy.
 * Pending written responses belong to separate manual self-assessment, not
 * this automated maximum. No SSC CGL-specific 2-point/50-point assumptions.
 */
export function scoreableMaximum(
 paper:PaperRevision,key:AnswerKeyRevision,questions:readonly QuestionRevision[],
 section?:SectionDefinition
):number{
 const qs=new Map(questions.map(q=>[q.id,q]));
 const entries=new Map(key.entries.map(e=>[e.questionRevisionId,e]));
 return (section?[section]:paper.sections).reduce((total,part)=>
   total+part.questionRevisionIds.reduce((sum,id)=>{
     const q=qs.get(id),entry=entries.get(id);
     if(!q||!entry)throw new Error("Cannot derive maximum for missing frozen question or key");
     if(excluded.has(q.editorial.status)||q.content.kind==="free-response")return sum;
     const rule:MarkingRule=entry.scoringOverride??part.scoringOverride??
       paper.scoring.byQuestionKind?.[q.content.kind]??paper.scoring.defaultRule;
     return sum+rule.correctMarks;
   },0),0);
}

/** Conservative automated score floor under a validated scoring policy.
 * A component-based wrong response may incur penalties per incorrect selected
 * component, so a simple sum of incorrectMarks is not necessarily a floor.
 * The bound is never presented as an attainable worst-case score. */
export function scoreableLowerBound(
 paper:PaperRevision,key:AnswerKeyRevision,questions:readonly QuestionRevision[],
 section?:SectionDefinition
):number{
 const qs=new Map(questions.map(q=>[q.id,q]));
 const entries=new Map(key.entries.map(e=>[e.questionRevisionId,e]));
 return (section?[section]:paper.sections).reduce((total,part)=>
   total+part.questionRevisionIds.reduce((sum,id)=>{
     const q=qs.get(id),entry=entries.get(id);
     if(!q||!entry)throw new Error("Cannot derive lower bound for missing frozen question or key");
     if(excluded.has(q.editorial.status)||q.content.kind==="free-response")return sum;
     const rule:MarkingRule=entry.scoringOverride??part.scoringOverride??
       paper.scoring.byQuestionKind?.[q.content.kind]??paper.scoring.defaultRule;
     let floor=Math.min(rule.correctMarks,rule.incorrectMarks,rule.unansweredMarks);
     if(rule.partialCredit){
       const count=q.content.kind==="multiple-select"?
         q.content.maxSelections??q.content.options.length:
         q.content.kind==="matching"?
           Math.min(q.content.leftItems.length,q.content.rightItems.length):0;
       if(count>0){
         const componentFloor=rule.partialCredit.floorAtZero?0:
           -count*(rule.partialCredit.penaltyPerIncorrectComponent??0);
         floor=Math.min(floor,componentFloor);
       }
     }
     return sum+floor;
   },0),0);
}

/** Explicit bounds distinguish a nominal full-credit ceiling from a conservative
 * lower bound when unusual imported partial-credit penalties are allowed. */
export function scoreableBounds(
 paper:PaperRevision,key:AnswerKeyRevision,questions:readonly QuestionRevision[],
 section?:SectionDefinition
):{readonly lowerBound:number;readonly maximum:number}{
 return {lowerBound:scoreableLowerBound(paper,key,questions,section),
   maximum:scoreableMaximum(paper,key,questions,section)};
}

export interface SectionScoreSummary {
 readonly sectionId:string;
 readonly title:string;
 readonly questions:number;
 readonly attempted:number;
 readonly correct:number;
 readonly incorrect:number;
 readonly unanswered:number;
 readonly pending:number;
 readonly excluded:number;
 readonly marks:number;
 readonly eligibleMax:number;
 readonly foregroundMs:number;
 /** Closed sequential-section timer time; null for old/free multi-section data. */
 readonly timerMs:number|null;
 readonly timerReason:"time-expired"|"submitted"|null;
}
export function sectionScoreSummaries(attempt:GenericAttempt,result:ScoreResult):SectionScoreSummary[]{
 const paper=attempt.frozen.paper;
 const scores=new Map(result.items.map(x=>[x.questionRevisionId,x]));
 const responses=new Map(attempt.state.responses.map(x=>[x.questionRevisionId,x]));
 return paper.sections.map(section=>{
   let attempted=0,correct=0,incorrect=0,unanswered=0,pending=0,excluded=0,marks=0,foregroundMs=0;
   for(const id of section.questionRevisionIds){
     const item=scores.get(id);
     if(!item)throw new Error("Missing frozen section verdict");
     const row=responses.get(id);
     foregroundMs+=row?.timeSpentMs??0;
     marks+=item.marks;
     if(item.verdict==="correct")correct++;
     else if(item.verdict==="incorrect")incorrect++;
     else if(item.verdict==="unanswered")unanswered++;
     else if(item.verdict==="pending")pending++;
     else excluded++;
     if(row?.response&&item.verdict!=="excluded")attempted++;
   }
   return {sectionId:section.id,title:section.title,questions:section.questionRevisionIds.length,
     attempted,correct,incorrect,unanswered,pending,excluded,marks,foregroundMs,
     eligibleMax:scoreableMaximum(paper,attempt.frozen.key,attempt.frozen.questions,section),
     timerMs:sectionTimerDuration(attempt.state,paper.sections.indexOf(section)),
     timerReason:attempt.state.completedSectionTimings?.find(z=>z.sectionId===section.id)?.reason??null};
 });
}
