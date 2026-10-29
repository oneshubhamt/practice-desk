import type { GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevisionId } from "../domain/ids.js";

/** User-entered assessment only; cannot mutate the immutable machine-scored snapshot. */
export interface ManualGrade {
 readonly questionRevisionId:QuestionRevisionId;
 readonly marks:number;
 readonly note:string;
 readonly gradedAt:string;
}
function maxFor(attempt:GenericAttempt,id:QuestionRevisionId):number|null{
 const paper=attempt.frozen.paper;
 const section=paper.sections.find(x=>x.questionRevisionIds.includes(id));
 const question=attempt.frozen.questions.find(x=>x.id===id);
 const entry=attempt.frozen.key.entries.find(x=>x.questionRevisionId===id);
 if(!section||question?.content.kind!=="free-response"||entry?.answer.kind!=="free-response")return null;
 const result=attempt.result?.items.find(x=>x.questionRevisionId===id);
 if(result?.verdict!=="pending")return null;
 return entry.scoringOverride?.correctMarks??section.scoringOverride?.correctMarks??
   paper.scoring.byQuestionKind?.["free-response"]?.correctMarks??paper.scoring.defaultRule.correctMarks;
}
export function manualGradeLimit(attempt:GenericAttempt,id:QuestionRevisionId):number|null{
 if(attempt.finishedAt===null||attempt.state.status!=="completed")return null;
 return maxFor(attempt,id);
}
export function validateManualGrades(attempt:GenericAttempt):void{
 const grades=attempt.manualGrades??[];
 if(!Array.isArray(grades)||grades.length>attempt.frozen.questions.length)
   throw new Error("Invalid manual grading records");
 if(attempt.finishedAt===null&&grades.length)throw new Error("Cannot grade an active attempt");
 const ids=new Set<string>();
 for(const grade of grades){
   if(!grade||typeof grade.questionRevisionId!=="string"||ids.has(grade.questionRevisionId))
     throw new Error("Duplicate or invalid manual grade");
   ids.add(grade.questionRevisionId);
   const maximum=manualGradeLimit(attempt,grade.questionRevisionId);
   if(maximum===null||!Number.isFinite(grade.marks)||grade.marks<0||grade.marks>maximum||
      !Number.isFinite(maximum)||typeof grade.note!=="string"||grade.note.length>2000||
      typeof grade.gradedAt!=="string"||!Number.isFinite(Date.parse(grade.gradedAt))||
      Date.parse(grade.gradedAt)<(attempt.finishedAt??0))
     throw new Error("Invalid manual grade for pending written response");
 }
}
export function setManualGrade(
 attempt:GenericAttempt,id:QuestionRevisionId,marks:number,note:string,at:string
):GenericAttempt{
 if(manualGradeLimit(attempt,id)===null)throw new Error("Only submitted pending written responses can be manually assessed");
 const grade:ManualGrade={questionRevisionId:id,marks,note,gradedAt:at};
 const next={...attempt,manualGrades:[...(attempt.manualGrades??[]).filter(x=>x.questionRevisionId!==id),grade],
   updatedAt:Math.max(attempt.updatedAt,Date.parse(at))};
 validateManualGrades(next);
 return next;
}
export function manualGradeSummary(attempt:GenericAttempt):{
 total:number;graded:number;pending:number
}{
 validateManualGrades(attempt);
 const grades=attempt.manualGrades??[];
 const eligible=attempt.result?.items.filter(x=>x.verdict==="pending").length??0;
 return {total:grades.reduce((sum,x)=>sum+x.marks,0),graded:grades.length,
   pending:Math.max(0,eligible-grades.length)};
}
