import type { GenericAttempt } from "../engine/generic-attempt.ts";
import type { QuestionRevisionId } from "../domain/ids.js";
import type { ItemScore } from "../engine/scoring.ts";
import { attemptEvidence,type AttemptEvidence } from "./attempt-evidence.ts";

export type QuestionSpeed="Fast"|"Typical"|"Slow"|"Not classified";

export interface AttemptQuestionLookup{
 readonly evidence:AttemptEvidence|null;
 readonly responses:ReadonlyMap<QuestionRevisionId,GenericAttempt["state"]["responses"][number]>;
 readonly visits:ReadonlyMap<QuestionRevisionId,GenericAttempt["state"]["questionVisits"][number]>;
 readonly items:ReadonlyMap<QuestionRevisionId,ItemScore>;
 readonly questions:ReadonlyMap<QuestionRevisionId,GenericAttempt["frozen"]["questions"][number]>;
 readonly sections:ReadonlyMap<QuestionRevisionId,GenericAttempt["frozen"]["paper"]["sections"][number]>;
 readonly paperNumbers:ReadonlyMap<QuestionRevisionId,number>;
 readonly sourceReviewTargets:ReadonlySet<QuestionRevisionId>;
}
/** One bounded derived view per result render; no persistent cache or mutable analytics state. */
export function attemptQuestionLookup(
 a:GenericAttempt,evidence:AttemptEvidence|null=attemptEvidence(a)
):AttemptQuestionLookup{
 const responses=new Map(a.state.responses.map(row=>[row.questionRevisionId,row]));
 const visits=new Map(a.state.questionVisits.map(row=>[row.questionRevisionId,row]));
 const items=new Map((a.result?.items??[]).map(row=>[row.questionRevisionId,row]));
 const questions=new Map(a.frozen.questions.map(row=>[row.id,row]));
 const sections=new Map<QuestionRevisionId,GenericAttempt["frozen"]["paper"]["sections"][number]>();
 const paperNumbers=new Map<QuestionRevisionId,number>();
 let paperNumber=0;
 for(const section of a.frozen.paper.sections){
  for(const id of section.questionRevisionIds){
   sections.set(id,section);paperNumbers.set(id,++paperNumber);
  }
 }
 const sourceReviewTargets=new Set(a.sourceReviewReference?.entries.map(row=>row.targetQuestionRevisionId)??[]);
 return {evidence,responses,visits,items,questions,sections,paperNumbers,sourceReviewTargets};
}

/** Cumulative foreground phases, never inferred from wall-clock timestamps.
 * The first-answer phase can span multiple cursor visits and remains immutable
 * after response edits or clearing.
 */
export interface QuestionTimingPhases {
 readonly firstVisitMs:number;
 readonly revisitMs:number;
 readonly beforeFirstAnswerMs:number|null;
 readonly totalMs:number;
 readonly visits:number;
}
export function questionTimingPhases(
 a:GenericAttempt,id:QuestionRevisionId,lookup:AttemptQuestionLookup=attemptQuestionLookup(a)
):QuestionTimingPhases|null{
 const row=lookup.responses.get(id);
 const visits=lookup.visits.get(id)?.count;
 if(!row||visits===undefined||!Number.isFinite(row.firstVisitMs)||
    !Number.isFinite(row.preFirstAnswerMs)||row.firstVisitMs<0||
    row.preFirstAnswerMs<0||row.firstVisitMs>row.timeSpentMs||
    row.preFirstAnswerMs>row.timeSpentMs)return null;
 return {firstVisitMs:row.firstVisitMs,revisitMs:row.timeSpentMs-row.firstVisitMs,
   beforeFirstAnswerMs:row.firstAnsweredAt===undefined?null:row.preFirstAnswerMs,
   totalMs:row.timeSpentMs,visits};
}

/** One speed policy for review, ledger and coaching: section median, n >= 5. */
export function questionSpeed(
 a:GenericAttempt,id:QuestionRevisionId,lookup:AttemptQuestionLookup=attemptQuestionLookup(a)
):QuestionSpeed{
 const item=lookup.items.get(id);
 if(item?.verdict!=="correct"&&item?.verdict!=="incorrect")return "Not classified";
 const ms=lookup.responses.get(id)?.timeSpentMs??0;
 const section=lookup.sections.get(id);
 const evidence=lookup.evidence?.sections.find(row=>row.sectionId===section?.id);
 const median=evidence?.medianAnsweredMs;
 if(ms<=0||!median||median<=0||(evidence?.measuredAnswered??0)<5)return "Not classified";
 return ms<median*.75?"Fast":ms>median*1.5?"Slow":"Typical";
}
/** Editorial and published-key review, including original-vs-reviewed frozen provenance. */
export function isAuditQuestion(
 a:GenericAttempt,id:QuestionRevisionId,lookup:AttemptQuestionLookup=attemptQuestionLookup(a)
):boolean{
 const q=lookup.questions.get(id);
 return Boolean(q&&(q.editorial.status!=="verified"||q.editorial.notes?.trim()||
    q.editorial.changes?.length||lookup.sourceReviewTargets.has(id)));
}
export interface LongestQuestion{readonly id:QuestionRevisionId;readonly paperNumber:number;readonly section:string;readonly milliseconds:number;readonly verdict:ItemScore["verdict"]}
/** Rank accumulated visible exposure, *not* the duration of a single uninterrupted visit. */
export function longestQuestionExposure(
 a:GenericAttempt,limit=5,lookup:AttemptQuestionLookup=attemptQuestionLookup(a)
):readonly LongestQuestion[]{
 if(!a.result)return [];
 const out:LongestQuestion[]=[];
 for(const [id,paperNumber] of lookup.paperNumbers){
  const verdict=lookup.items.get(id)?.verdict;
  if(!verdict)throw Error("Incomplete scored attempt");
  out.push({id,paperNumber,section:lookup.sections.get(id)?.title??"Unknown section",
   milliseconds:lookup.responses.get(id)?.timeSpentMs??0,verdict});
 }
 return out.filter(x=>Number.isFinite(x.milliseconds)&&x.milliseconds>0)
   .sort((x,y)=>y.milliseconds-x.milliseconds||x.paperNumber-y.paperNumber)
   .slice(0,Math.max(0,Math.min(5,Math.floor(limit))));
}
/** Bounded statements of *observed* study opportunities; no causes, predictions or mastery claims. */
export function studySuggestions(
 a:GenericAttempt,evidence:AttemptEvidence|null=attemptEvidence(a)
):readonly string[]{
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
