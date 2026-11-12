import type {FrozenAttemptContent,ManualGrade,NotebookLineage,PracticeComposition} from "../domain/attempt.js";
import type {CandidateResponse,QuestionRevision} from "../domain/question.js";
import type {QuestionRevisionId} from "../domain/ids.js";
import type {SessionState,SessionEvent} from "./session.ts";
import {transition} from "./session.ts";
import {validateResponse} from "./response.ts";
import {scoreAttempt} from "./scoring.ts";
import type {SourceKeyReference} from "./source-comparison.ts";
import type {SourceReviewReference} from "./review-source.ts";

export type CompletionReason="time-expired"|"submitted"|"section-submitted";

export interface GenericAttempt {
 readonly recordType: "generic-attempt";
 /** 0 before first durable write; persistence advances monotonically from 1. */
 readonly saveRevision: number;
 readonly id: string;
 readonly packageId: string;
 readonly startedAt: number;
 readonly updatedAt: number;
 readonly finishedAt: number | null;
 readonly frozen: FrozenAttemptContent;
 readonly state: SessionState;
 readonly result?: ReturnType<typeof scoreAttempt>;
 readonly manualGrades?: readonly ManualGrade[];
 readonly sourceKeyReference?: SourceKeyReference;
 /** Optional frozen original wording, media and source answer for revised exams. */
 readonly sourceReviewReference?: SourceReviewReference;
 /** Null while unfinished; mandatory provenance once the attempt completes. */
 readonly completionReason: CompletionReason|null;
 readonly notebookLineage?: NotebookLineage;
 /** Hash-covered seed, filter and source revision manifest for an authored custom subset. */
 readonly practiceComposition?: PracticeComposition;
 readonly explanations?: Readonly<Record<string,string>>;
}

/** Pure attempt state transition and terminal scoring. Browser/app policy stays above engine/. */
export function transitionGenericAttempt(
 attempt:GenericAttempt,event:SessionEvent,
 questionMap:ReadonlyMap<QuestionRevisionId,QuestionRevision>
):GenericAttempt{
 if(attempt.finishedAt!==null)return attempt;
 const paper=attempt.frozen.paper;
 if(event.type==="ANSWER"){
   const id=paper.sections[attempt.state.sectionIndex]?.questionRevisionIds[attempt.state.questionIndex];
   const q=id&&questionMap.get(id);
   if(!q)throw new Error("No question at the cursor");
   validateResponse(q,event.response);
 }
 const state=transition(paper,attempt.state,event);
 const finished=state.status==="completed";
 const expired=finished&&(paper.timing.kind==="whole-paper"?
   state.elapsedMs>=paper.timing.durationMs:
   paper.timing.kind==="sectional"?(()=>{
     const section=paper.sections[state.sectionIndex];
     const limit=paper.timing.sectionLimits.find(x=>x.sectionId===section?.id)?.durationMs;
     return limit!==undefined&&limit!==null&&state.sectionElapsedMs>=limit;
   })():false);
 const completionReason=expired?"time-expired":
   event.type==="SUBMIT_SECTION"?"section-submitted":"submitted";
 return {...attempt,state,updatedAt:event.nowMs,finishedAt:finished?event.nowMs:null,
   completionReason:finished?completionReason:null,
   ...(finished?{result:scoreAttempt(paper,attempt.frozen.key,attempt.frozen.questions,
     state.responses,new Date(event.nowMs).toISOString())}:{})};
}

export function responseFor(
 state:SessionState,questionId:QuestionRevisionId
):CandidateResponse|undefined{
 return state.responses.find(row=>row.questionRevisionId===questionId)?.response;
}
