import type {PaperRevision} from "../domain/exam.ts";
import type {SessionState} from "../engine/session.ts";
import {canNavigateToQuestion} from "../engine/session.ts";

export type CandidateJumpKind="unanswered"|"flagged";
export type CandidateNavigationTarget=Readonly<{sectionIndex:number;questionIndex:number}>;

function matches(state:SessionState,questionId:string,kind:CandidateJumpKind):boolean{
 const row=state.responses.find(record=>record.questionRevisionId===questionId);
 return kind==="unanswered"?!row?.response:Boolean(row?.flagged);
}

/** Find the next legal matching question in authored paper order.
 * Free-navigation papers may wrap after the current cursor. Forward-only
 * policy naturally prevents any wrapped/backward destination through the
 * shared engine legality predicate.
 */
export function findNextCandidateQuestion(
 paper:PaperRevision,state:SessionState,kind:CandidateJumpKind
):CandidateNavigationTarget|null{
 if(state.status!=="running"||(kind==="flagged"&&!paper.navigation.allowFlagging))return null;
 const ordered:CandidateNavigationTarget[]=[];
 for(let sectionIndex=0;sectionIndex<paper.sections.length;sectionIndex++){
  const section=paper.sections[sectionIndex]!;
  for(let questionIndex=0;questionIndex<section.questionRevisionIds.length;questionIndex++)
   ordered.push({sectionIndex,questionIndex});
 }
 const current=ordered.findIndex(target=>
  target.sectionIndex===state.sectionIndex&&target.questionIndex===state.questionIndex);
 if(current<0)return null;
 const after=ordered.slice(current+1),before=ordered.slice(0,current);
 for(const target of [...after,...before]){
  if(!canNavigateToQuestion(paper,state,target.sectionIndex,target.questionIndex))continue;
  const id=paper.sections[target.sectionIndex]!.questionRevisionIds[target.questionIndex]!;
  if(matches(state,id,kind))return target;
 }
 return null;
}
