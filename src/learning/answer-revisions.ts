import type { GenericAttempt } from "../app/exam-package.ts";

/** A factual record of single-choice answer transitions.
 * Clearing and reselecting breaks a direct-replacement trajectory.
 * We never claim revision *caused* a score change.
 */
export interface AnswerRevisionEvidence {
 readonly recorded:number;
 readonly changed:number;
 readonly rescued:number;
 readonly lost:number;
 readonly other:number;
}
export function answerRevisionEvidence(a:GenericAttempt):AnswerRevisionEvidence{
 if(!a.result||a.finishedAt===null)return {recorded:0,changed:0,rescued:0,lost:0,other:0};
 let recorded=0,changed=0,rescued=0,lost=0,other=0;
 for(const row of a.state.responses){
  const events=row.answerEvents;
  if(!events?.length)continue;
  recorded++;
  const replacements=events.filter(e=>e.from&&e.to&&JSON.stringify(e.from)!==JSON.stringify(e.to));
  if(!replacements.length)continue;
  changed++;
  const question=a.frozen.questions.find(q=>q.id===row.questionRevisionId);
  const key=a.frozen.key.entries.find(e=>e.questionRevisionId===row.questionRevisionId)?.answer;
  const unsafe=question&&["draft","invalid","incomplete-source","under-review","superseded"].includes(question.editorial.status);
  const containsClear=events.some(e=>!e.to);
  const first=events[0]?.to,last=row.response;
  if(unsafe||containsClear||question?.content.kind!=="single-choice"||
    key?.kind!=="single-choice"||first?.kind!=="single-choice"||last?.kind!=="single-choice"||
    events[0]?.from!==undefined){
    other++;continue;
  }
  if(first.optionId!==key.optionId&&last.optionId===key.optionId)rescued++;
  else if(first.optionId===key.optionId&&last.optionId!==key.optionId)lost++;
  else other++;
 }
 return {recorded,changed,rescued,lost,other};
}
