import type {GenericAttempt} from "../app/exam-package.ts";
import type {LearningCard} from "./learning.ts";
import {addLearningCard} from "./learning.ts";
import {questionSpeed} from "./question-analytics.ts";
import {hashJson} from "../domain/hash.ts";
import {REVISION_MAX_QUESTIONS} from "./revision-test.ts";

/** These are observations or explicit learner choices, never cognitive diagnoses. */
export const REVISION_REASONS=["wrong","blank","slow","repeated","flagged","bookmarked","due"] as const;
export type RevisionReason=typeof REVISION_REASONS[number];
export interface RevisionEvidence {
 readonly questionId:string;
 readonly questionHash:string;
 readonly sourceAttemptId:string;
 readonly sourcePaperId:string;
 readonly examId:string;
 readonly prompt:string;
 readonly reasons:readonly RevisionReason[];
 readonly wrongAttempts:number;
 readonly observedAttempts:number;
 readonly measuredForegroundMs:number|null;
 readonly visits:number|null;
 readonly card:LearningCard;
}
export interface RevisionSelection {
 readonly examId:string;
 readonly reasons:readonly RevisionReason[];
 readonly eligibleCount:number;
 readonly selected:readonly RevisionEvidence[];
 readonly insufficient:readonly string[];
}
interface MutableEvidence {
 card:LearningCard;questionId:string;questionHash:string;sourceAttemptId:string;
 sourcePaperId:string;examId:string;prompt:string;finishedAt:number;
 reasons:Set<RevisionReason>;wrongAttempts:Set<string>;observedAttempts:Set<string>;
 measuredForegroundMs:number|null;visits:number|null;
}
export function isRevisionAttempt(a:GenericAttempt):boolean{
 return Boolean(a.notebookLineage)||a.frozen.paper.paperId.startsWith("notebook-revision:");
}
export function mockEvidenceAttempts(attempts:readonly GenericAttempt[]):GenericAttempt[]{
 return attempts.filter(a=>a.finishedAt!==null&&a.result&&!isRevisionAttempt(a));
}
/** Build from source-frozen, scoreable, review-releasable questions only.
 * Exact question AND answer content hash keeps incompatible key revisions apart.
 * A later genuine observation is the source of the displayed snapshot.
 */
export function revisionInventory(
 attempts:readonly GenericAttempt[],cards:readonly LearningCard[],
 dueIds:ReadonlySet<string>,examId:string,reasons:readonly RevisionReason[]
):RevisionSelection {
 if(!examId||!reasons.length||reasons.some(r=>!REVISION_REASONS.includes(r)))
   return {examId,reasons:[],eligibleCount:0,selected:[],insufficient:["Choose an exam and at least one evidence filter."]};
 const selectedReasons=[...new Set(reasons)];
 const observations=new Map<string,MutableEvidence>();
 const byId=new Map<string,MutableEvidence>();
 const cardBySignature=new Map(cards.filter(c=>c.examId===examId).map(c=>
   [c.question.id+"|"+c.question.contentHash+"|"+hashJson(c.answer),c] as const));
 const sources=mockEvidenceAttempts(attempts).filter(a=>a.frozen.snapshot.examId===examId &&
   a.frozen.paper.navigation.allowReview!==false).sort((a,b)=>(b.finishedAt??0)-(a.finishedAt??0)||a.id.localeCompare(b.id));
 for(const a of sources){
  const scored=new Map(a.result!.items.map(i=>[i.questionRevisionId,i]));
  const responses=new Map(a.state.responses.map(r=>[r.questionRevisionId,r]));
  const key=new Map(a.frozen.key.entries.map(e=>[e.questionRevisionId,e]));
  for(const q of a.frozen.questions){
   if(!["verified","corrected","caution"].includes(q.editorial.status))continue;
   const item=scored.get(q.id),answer=key.get(q.id),response=responses.get(q.id);
   if(!item||!answer||item.verdict==="pending"||item.verdict==="excluded")continue;
   const signature=q.id+"|"+q.contentHash+"|"+hashJson(answer.answer);
   let row=observations.get(signature);
   if(!row){
    // Date is used only to construct an ephemeral, exact frozen revision source.
    const card=cardBySignature.get(signature)??addLearningCard(a,q.id,new Date(a.finishedAt!).toISOString());
    row={card,questionId:q.id,questionHash:q.contentHash,sourceAttemptId:a.id,
      sourcePaperId:a.frozen.paper.paperId,examId,prompt:q.content.prompt,finishedAt:a.finishedAt!,
      reasons:new Set(),wrongAttempts:new Set(),observedAttempts:new Set(),
      measuredForegroundMs:response?.timeSpentMs??null,
      visits:a.state.questionVisits?.find(v=>v.questionRevisionId===q.id)?.count??null};
    observations.set(signature,row);
   }
   row.observedAttempts.add(a.id);
   if(item.verdict==="incorrect"){row.reasons.add("wrong");row.wrongAttempts.add(a.id);}
   if(item.verdict==="unanswered")row.reasons.add("blank");
   if(response?.flagged)row.reasons.add("flagged");
   if(questionSpeed(a,q.id)==="Slow")row.reasons.add("slow");
  }
 }
 // Stored notebook cards survive deletion of their source attempts and can still
 // supply genuinely bookmarked or FSRS-due revisions without guessing answers.
 for(const card of cards.filter(c=>c.examId===examId)){
  if(!["verified","corrected","caution"].includes(card.question.editorial.status))continue;
  const signature=card.question.id+"|"+card.question.contentHash+"|"+hashJson(card.answer);
  let row=observations.get(signature);
  if(!row){
   row={card,questionId:card.question.id,questionHash:card.question.contentHash,
     sourceAttemptId:card.sourceAttemptId,sourcePaperId:card.paperId,examId,
     prompt:card.question.content.prompt,finishedAt:Date.parse(card.updatedAt),
     reasons:new Set(),wrongAttempts:new Set(),observedAttempts:new Set(),
     measuredForegroundMs:null,visits:null};
   observations.set(signature,row);
  }
  if(card.bookmarked)row.reasons.add("bookmarked");
  if(dueIds.has(card.id))row.reasons.add("due");
 }
 for(const row of observations.values())if(row.wrongAttempts.size>=2)row.reasons.add("repeated");
 // One frozen answer per question revision ID per revision test. Colliding IDs
 // with different keys are NOT merged; take the newest exact provenance.
 for(const row of [...observations.values()].sort((a,b)=>b.finishedAt-a.finishedAt||
   a.questionId.localeCompare(b.questionId)||a.questionHash.localeCompare(b.questionHash))){
   if(!byId.has(row.questionId))byId.set(row.questionId,row);
 }
 const eligible=[...byId.values()].filter(r=>selectedReasons.some(x=>r.reasons.has(x)))
   .sort((a,b)=>b.wrongAttempts.size-a.wrongAttempts.size||b.finishedAt-a.finishedAt||
     a.questionId.localeCompare(b.questionId));
 const found=new Set(eligible.flatMap(r=>[...r.reasons]));
 const insufficient=selectedReasons.filter(r=>!found.has(r)).map(r=>
   r==="slow"?"No eligible slow questions have sufficient within-section measured answers.":
   r==="repeated"?"Repeated mistakes require at least two independent completed source attempts of the same exact answer revision.":
   r==="due"?"No due FSRS cards are available in this exam.":
   "No eligible "+r+" questions were observed in this exam.");
 const selected=eligible.map(r=>({
   questionId:r.questionId,questionHash:r.questionHash,sourceAttemptId:r.sourceAttemptId,
   sourcePaperId:r.sourcePaperId,examId:r.examId,prompt:r.prompt,
   reasons:[...r.reasons].filter(x=>selectedReasons.includes(x)),wrongAttempts:r.wrongAttempts.size,
   observedAttempts:r.observedAttempts.size,measuredForegroundMs:r.measuredForegroundMs,
   visits:r.visits,card:r.card
 }));
 return {examId,reasons:selectedReasons,eligibleCount:selected.length,selected,insufficient};
}
export function revisionTake(selection:RevisionSelection,count:number):readonly RevisionEvidence[]{
 if(!Number.isSafeInteger(count)||count<1||count>REVISION_MAX_QUESTIONS)
   throw Error("Select 1–"+REVISION_MAX_QUESTIONS+" revision questions");
 if(selection.eligibleCount<count)throw Error("Only "+selection.eligibleCount+
   " eligible revision questions. Reduce the count or change filters.");
 return selection.selected.slice(0,count);
}
