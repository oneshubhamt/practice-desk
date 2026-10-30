import type { GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevisionId } from "../domain/ids.js";
import type { ItemScore } from "../engine/scoring.ts";
import { attemptEvidence } from "./attempt-evidence.ts";

export type QuestionSpeed="Fast"|"Typical"|"Slow"|"Not classified";

/** One speed policy for review, ledger and coaching: section median, n >= 5. */
export function questionSpeed(a:GenericAttempt, id:QuestionRevisionId):QuestionSpeed{
 const item=a.result?.items.find(row=>row.questionRevisionId===id);
 if(item?.verdict!=="correct"&&item?.verdict!=="incorrect")return "Not classified";
 const ms=a.state.responses.find(r=>r.questionRevisionId===id)?.timeSpentMs??0;
 const section=a.frozen.paper.sections.find(s=>s.questionRevisionIds.includes(id));
 const evidence=attemptEvidence(a)?.sections.find(s=>s.sectionId===section?.id);
 const median=evidence?.medianAnsweredMs;
 if(ms<=0||!median||median<=0||(evidence?.measuredAnswered??0)<5)return "Not classified";
 return ms<median*.75?"Fast":ms>median*1.5?"Slow":"Typical";
}
/** Editorial and published-key review, including original-vs-reviewed frozen provenance. */
export function isAuditQuestion(a:GenericAttempt,id:QuestionRevisionId):boolean{
 const q=a.frozen.questions.find(row=>row.id===id);
 return Boolean(q&&(q.editorial.status!=="verified"||q.editorial.notes?.trim()||
    q.editorial.changes?.length||
    a.sourceReviewReference?.entries.some(x=>x.targetQuestionRevisionId===id)));
}
export interface LongestQuestion{readonly id:QuestionRevisionId;readonly paperNumber:number;readonly section:string;readonly milliseconds:number;readonly verdict:ItemScore["verdict"]}
/** Rank accumulated visible exposure, *not* the duration of a single uninterrupted visit. */
export function longestQuestionExposure(a:GenericAttempt,limit=5):readonly LongestQuestion[]{
 if(!a.result)return [];
 const rows=new Map(a.state.responses.map(x=>[x.questionRevisionId,x]));
 const scored=new Map(a.result.items.map(x=>[x.questionRevisionId,x]));
 const items=a.frozen.paper.sections.flatMap(s=>s.questionRevisionIds.map(id=>({id,section:s.title})));
 return items.map((item,i)=>({id:item.id,paperNumber:i+1,section:item.section,
   milliseconds:rows.get(item.id)?.timeSpentMs??0,verdict:scored.get(item.id)!.verdict}))
   .filter(x=>Number.isFinite(x.milliseconds)&&x.milliseconds>0)
   .sort((x,y)=>y.milliseconds-x.milliseconds||x.paperNumber-y.paperNumber)
   .slice(0,Math.max(0,Math.min(5,Math.floor(limit))));
}
/** Bounded statements of *observed* study opportunities; no causes, predictions or mastery claims. */
export function studySuggestions(a:GenericAttempt):readonly string[]{
 const evidence=attemptEvidence(a);
 if(!a.result||!evidence)return [];
 const sections=evidence.sections;
 const valid=sections.reduce((n,s)=>n+s.answered+s.unanswered,0);
 const answered=sections.reduce((n,s)=>n+s.answered,0);
 if(!answered)return ["No scored answers were recorded. Review available solutions and complete a practice section to establish a useful baseline."];
 const notes:string[]=[];
 const weak=sections.filter(s=>s.answered>=4&&s.incorrect>=3)
   .sort((x,y)=>(x.correct/x.answered)-(y.correct/y.answered)||y.answered-x.answered)[0];
 if(weak)notes.push("Review "+weak.title+": "+weak.incorrect+" incorrect among "+
   weak.answered+" scored responses ("+Math.round(weak.correct/weak.answered*100)+"% observed accuracy).");
 const fast=evidence.speed.buckets.find(x=>x.label==="Fast")?.incorrect??0;
 const slow=evidence.speed.buckets.find(x=>x.label==="Slow")?.incorrect??0;
 if(fast>=2)notes.push(fast+" incorrect responses had relatively short foreground exposure in their sections. Recheck these questions; timing alone does not explain the errors.");
 if(slow>=2)notes.push(slow+" incorrect responses had relatively long foreground exposure in their sections. Review the solving steps and time allocation; timing alone does not establish the cause.");
 if(valid>=10&&answered/valid<.7)notes.push("You answered "+answered+" of "+valid+
   " scoreable questions ("+Math.round(100*answered/valid)+"% coverage). Consider practising question selection and pacing.");
 if(!notes.length)notes.push("Review incorrect and unanswered scoreable questions against their worked explanations. There is not enough evidence for a more specific study priority.");
 return notes.slice(0,3);
}
