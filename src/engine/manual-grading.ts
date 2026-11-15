import type { GenericAttempt } from "./generic-attempt.ts";
import type { ManualGrade } from "../domain/attempt.js";
export type {ManualGrade} from "../domain/attempt.js";
import type { QuestionRevisionId } from "../domain/ids.js";
import {effectiveMarkingRule} from "./scoring.ts";

export function manualGradeLimits(attempt:GenericAttempt):ReadonlyMap<QuestionRevisionId,number>{
 const limits=new Map<QuestionRevisionId,number>();
 if(attempt.finishedAt===null||attempt.state.status!=="completed"||!attempt.result)return limits;
 const paper=attempt.frozen.paper;
 const sections=new Map<QuestionRevisionId,typeof paper.sections[number]>();
 for(const section of paper.sections)
   for(const id of section.questionRevisionIds)sections.set(id,section);
 const questions=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
 const entries=new Map(attempt.frozen.key.entries.map(entry=>[entry.questionRevisionId,entry]));
 const results=new Map(attempt.result.items.map(item=>[item.questionRevisionId,item]));
 for(const [id,section] of sections){
   const question=questions.get(id),entry=entries.get(id),result=results.get(id);
   if(question?.content.kind!=="free-response"||entry?.answer.kind!=="free-response"||
      result?.verdict!=="pending")continue;
   limits.set(id,effectiveMarkingRule(paper,section,question,entry).correctMarks);
 }
 return limits;
}
export function manualGradeLimit(attempt:GenericAttempt,id:QuestionRevisionId):number|null{
 return manualGradeLimits(attempt).get(id)??null;
}
export function validateManualGrades(attempt:GenericAttempt):void{
 const grades=attempt.manualGrades??[];
 if(!Array.isArray(grades)||grades.length>attempt.frozen.questions.length)
   throw new Error("Invalid manual grading records");
 if(attempt.finishedAt===null&&grades.length)throw new Error("Cannot grade an active attempt");
 const ids=new Set<string>(),limits=manualGradeLimits(attempt);
 for(const grade of grades){
   if(!grade||typeof grade.questionRevisionId!=="string"||ids.has(grade.questionRevisionId))
     throw new Error("Duplicate or invalid manual grade");
   ids.add(grade.questionRevisionId);
   const maximum=limits.get(grade.questionRevisionId)??null;
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
