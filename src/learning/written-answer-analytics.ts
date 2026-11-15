import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {QuestionRevisionId} from "../domain/ids.js";
import {countWords} from "../domain/word-count.ts";
import {paperTimeBudgetMs,overtimeMs} from "../domain/timing.ts";
import {manualGradeLimit} from "../engine/manual-grading.ts";

export interface WrittenAnswerEvidence{
 readonly questionRevisionId:QuestionRevisionId;
 readonly paperNumber:number;
 readonly section:string;
 readonly answered:boolean;
 readonly wordCount:number;
 readonly wordLimit:number|null;
 readonly foregroundMs:number;
 readonly postDeadlineMs:number;
 readonly selfAssessedMarks:number|null;
 readonly selfAssessedMaximum:number|null;
 readonly assessmentNote:string;
}
export interface WrittenAttemptEvidence{
 readonly rows:readonly WrittenAnswerEvidence[];
 readonly answered:number;
 readonly limited:number;
 readonly withinLimit:number;
 readonly paperBudgetMs:number|null;
 readonly actualMs:number;
 readonly paperOvertimeMs:number;
 readonly attributedOvertimeMs:number;
}

/** Objective written-response evidence only. Content quality remains manual.
 * Word count is always derived from the frozen response text, never persisted. */
export function writtenAnswerEvidence(a:GenericAttempt):WrittenAttemptEvidence{
 const responses=new Map(a.state.responses.map(row=>[row.questionRevisionId,row]));
 const grades=new Map(a.manualGrades?.map(row=>[row.questionRevisionId,row])??[]);
 const rows:WrittenAnswerEvidence[]=[];
 let paperNumber=0;
 for(const section of a.frozen.paper.sections){
   for(const id of section.questionRevisionIds){
     paperNumber++;
     const q=a.frozen.questions.find(row=>row.id===id);
     if(q?.content.kind!=="free-response")continue;
     const response=responses.get(id),text=response?.response?.kind==="free-response"?
       response.response.text:"";
     const grade=grades.get(id),limit=q.content.responseRules.wordLimit??null;
     rows.push({
       questionRevisionId:id,paperNumber,section:section.title,
       answered:Boolean(text.trim()),wordCount:countWords(text),wordLimit:limit,
       foregroundMs:response?.timeSpentMs??0,postDeadlineMs:response?.postDeadlineMs??0,
       selfAssessedMarks:grade?.marks??null,
       selfAssessedMaximum:manualGradeLimit(a,id),
       assessmentNote:grade?.note??""
     });
   }
 }
 const limitedRows=rows.filter(row=>row.wordLimit!==null&&row.answered);
 const budget=paperTimeBudgetMs(a.frozen.paper);
 return {
   rows,answered:rows.filter(row=>row.answered).length,
   limited:limitedRows.length,
   withinLimit:limitedRows.filter(row=>row.wordCount<=(row.wordLimit??Infinity)).length,
   paperBudgetMs:budget,actualMs:a.state.elapsedMs,
   paperOvertimeMs:overtimeMs(a.state.elapsedMs,budget),
   attributedOvertimeMs:a.state.responses.reduce((sum,row)=>sum+row.postDeadlineMs,0)
 };
}
