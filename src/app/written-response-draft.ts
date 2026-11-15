import type {QuestionRevisionId} from "../domain/ids.js";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import {transitionGenericAttempt} from "../engine/generic-attempt.ts";
import {hardDeadlineReached} from "../engine/session.ts";

export interface WrittenResponseDraft{
 readonly questionId:QuestionRevisionId;
 readonly text:string;
 readonly editedAt:number;
}
export type WrittenResponseDraftStore=Map<string,WrittenResponseDraft>;

export const writtenDraftKey=(attemptId:string,questionId:QuestionRevisionId):string=>
 attemptId+"|"+questionId;

function currentQuestionId(attempt:GenericAttempt):QuestionRevisionId|undefined{
 return attempt.frozen.paper.sections[attempt.state.sectionIndex]
   ?.questionRevisionIds[attempt.state.questionIndex];
}

/** Stage visible text only while a hard attempt is still legally editable.
 * The prior pre-deadline snapshot is retained if an input event races the deadline tick. */
export function stageWrittenResponseDraft(
 store:WrittenResponseDraftStore,attempt:GenericAttempt,questionId:QuestionRevisionId,
 text:string,editedAt:number
):"staged"|"deadline"{
 if(hardDeadlineReached(attempt.frozen.paper,attempt.state,attempt.frozen.snapshot.mode,editedAt))
   return "deadline";
 store.set(writtenDraftKey(attempt.id,questionId),{questionId,text,editedAt});
 return "staged";
}

export function discardCurrentWrittenDraft(
 store:WrittenResponseDraftStore,attempt:GenericAttempt
):void{
 const id=currentQuestionId(attempt);
 if(id)store.delete(writtenDraftKey(attempt.id,id));
}

/** Commit the current transient written draft at a meaningful state boundary.
 * No keystroke history is persisted; the attempt stores only the latest response. */
export function commitCurrentWrittenDraft(
 store:WrittenResponseDraftStore,attempt:GenericAttempt,boundaryNow:number
):GenericAttempt{
 const id=currentQuestionId(attempt);
 if(!id)return attempt;
 const key=writtenDraftKey(attempt.id,id),draft=store.get(key);
 if(!draft)return attempt;
 const question=attempt.frozen.questions.find(row=>row.id===id);
 if(question?.content.kind!=="free-response"){
   store.delete(key);return attempt;
 }
 if(draft.editedAt>boundaryNow)throw new Error("Written draft timestamp is ahead of its checkpoint");
 const commitAt=Math.max(attempt.state.clockMs,draft.editedAt);
 if(hardDeadlineReached(attempt.frozen.paper,attempt.state,attempt.frozen.snapshot.mode,commitAt))
   return attempt;
 const questions=new Map(attempt.frozen.questions.map(row=>[row.id,row]));
 const next=transitionGenericAttempt(attempt,draft.text.trim()
   ?{type:"ANSWER",nowMs:commitAt,response:{kind:"free-response",text:draft.text}}
   :{type:"CLEAR",nowMs:commitAt},questions);
 store.delete(key);
 return next;
}
