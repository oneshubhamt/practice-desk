import type { ExamPackage,GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevisionId,OptionId,PaperId,PaperRevisionId,AnswerKeyRevisionId } from "../domain/ids.js";
import type { MarkingRule } from "../domain/scoring.js";
import { hashJson } from "../domain/hash.ts";

/** Pinned source-edition answer comparison. Includes source-key defect items, unlike audited scoring. */
export interface SourceKeyReference {
 readonly schema:1;
 readonly paperId:PaperId;
 readonly sourcePaperRevisionId:PaperRevisionId;
 readonly sourceAnswerKeyRevisionId:AnswerKeyRevisionId;
 readonly entries:readonly {
  readonly questionRevisionId:QuestionRevisionId;
  readonly originalOptionId:OptionId;
  readonly markingRule:MarkingRule;
 }[];
 readonly contentHash:string;
}
type Content=Omit<SourceKeyReference,"contentHash">;
export function createSourceKeyReference(
 target:ExamPackage,source:ExamPackage
):SourceKeyReference|null{
 if(target.paper.edition!=="reviewed"||source.paper.edition!=="source"||
    target.examId!==source.examId||target.paper.paperId!==source.paper.paperId)return null;
 const byQuestion=new Map(source.questions.map(q=>[q.questionId,q]));
 const byEntry=new Map(source.answerKey.entries.map(e=>[e.questionRevisionId,e]));
 const sections=new Map(source.paper.sections.flatMap(s=>s.questionRevisionIds.map(id=>[id,s] as const)));
 const entries:Content["entries"][number][]=[];
 for(const q of target.questions){
   const sourceQ=byQuestion.get(q.questionId);
   if(!sourceQ||q.content.kind!=="single-choice"||sourceQ.content.kind!=="single-choice")return null;
   const entry=byEntry.get(sourceQ.id),section=sections.get(sourceQ.id);
   if(!entry||entry.answer.kind!=="single-choice"||!section)return null;
   // Options are referenced by stable semantic identity across editions.
   const originalOptionId=entry.answer.optionId;
   if(!q.content.options.some(o=>o.id===originalOptionId))return null;
   const rule=entry.scoringOverride??section.scoringOverride??
      source.paper.scoring.byQuestionKind?.["single-choice"]??source.paper.scoring.defaultRule;
   entries.push({questionRevisionId:q.id,originalOptionId,markingRule:structuredClone(rule)});
 }
 const core:Content={schema:1,paperId:target.paper.paperId,
   sourcePaperRevisionId:source.paper.id,sourceAnswerKeyRevisionId:source.answerKey.id,entries};
 return {...core,contentHash:hashJson(core)};
}
export function validateSourceKeyReference(attempt:GenericAttempt):void{
 const reference=attempt.sourceKeyReference;
 if(!reference)return;
 if(reference.schema!==1||reference.paperId!==attempt.frozen.paper.paperId||
    typeof reference.sourcePaperRevisionId!=="string"||
    typeof reference.sourceAnswerKeyRevisionId!=="string"||!Array.isArray(reference.entries)||
    reference.entries.length!==attempt.frozen.questions.length)throw Error("Invalid original source-key comparison");
 const core:Content={schema:reference.schema,paperId:reference.paperId,
   sourcePaperRevisionId:reference.sourcePaperRevisionId,sourceAnswerKeyRevisionId:reference.sourceAnswerKeyRevisionId,
   entries:reference.entries};
 if(reference.contentHash!==hashJson(core))throw Error("Original source-key reference hash mismatch");
 const allowed=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
 const seen=new Set<string>();
 for(const entry of reference.entries){
  const q=allowed.get(entry.questionRevisionId);
  if(!q||q.content.kind!=="single-choice"||seen.has(q.id)||
    !q.content.options.some(o=>o.id===entry.originalOptionId)||
    !Number.isFinite(entry.markingRule.correctMarks)||
    !Number.isFinite(entry.markingRule.incorrectMarks)||
    !Number.isFinite(entry.markingRule.unansweredMarks)||
    entry.markingRule.correctMarks<0||entry.markingRule.incorrectMarks>0)
    throw Error("Invalid original source-key answer entry");
  seen.add(q.id);
 }
}
export function sourceKeyScore(attempt:GenericAttempt):{
 marks:number;maxMarks:number;correct:number;incorrect:number;unanswered:number
}|null{
 const ref=attempt.sourceKeyReference;
 if(!ref||attempt.finishedAt===null)return null;
 validateSourceKeyReference(attempt);
 const responses=new Map(attempt.state.responses.map(row=>[row.questionRevisionId,row.response]));
 let marks=0,maxMarks=0,correct=0,incorrect=0,unanswered=0;
 for(const entry of ref.entries){
  const r=responses.get(entry.questionRevisionId);
  const rule=entry.markingRule;
  maxMarks+=rule.correctMarks;
  if(!r){unanswered++;marks+=rule.unansweredMarks;}
  else if(r.kind==="single-choice"&&r.optionId===entry.originalOptionId){correct++;marks+=rule.correctMarks;}
  else {incorrect++;marks+=rule.incorrectMarks;}
 }
 return {marks,maxMarks,correct,incorrect,unanswered};
}
