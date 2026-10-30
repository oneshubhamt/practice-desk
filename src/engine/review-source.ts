import type { ExamPackage, GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevision, StimulusDefinition, ImageAsset } from "../domain/question.js";
import type { CorrectAnswer } from "../domain/answer-key.js";
import type { ExamId, PaperId, PaperRevisionId, AnswerKeyRevisionId, QuestionRevisionId } from "../domain/ids.js";
import { validateAnswerKeyRevision, validateQuestionRevision } from "../domain/validate.ts";
import { questionRevisionHash, answerKeyRevisionHash } from "../domain/integrity.ts";
import { selectDisplayResources, validateMediaInventory, validateQuestionMediaReferences } from "../domain/media.ts";
import { hashJson } from "../domain/hash.ts";

/**
 * Optional, format-independent post-attempt provenance. Both the original
 * question (including source diagrams/passages) and its original key are
 * frozen at start. A changed paper in the library cannot rewrite history.
 */
export interface SourceReviewReference {
 readonly schema: 1;
 readonly examId: ExamId;
 readonly paperId: PaperId;
 readonly targetPaperRevisionId: PaperRevisionId;
 readonly sourcePaperRevisionId: PaperRevisionId;
 readonly sourceAnswerKeyRevisionId: AnswerKeyRevisionId;
 readonly entries: readonly {
  readonly targetQuestionRevisionId: QuestionRevisionId;
  readonly sourceQuestion: QuestionRevision;
  readonly sourceAnswer: CorrectAnswer;
 }[];
 readonly stimuli: readonly StimulusDefinition[];
 readonly assets: readonly ImageAsset[];
 readonly contentHash: string;
}
type Core=Omit<SourceReviewReference,"contentHash">;

export function createSourceReviewReference(
 target:ExamPackage, source:ExamPackage
):SourceReviewReference|null{
 if(target.paper.edition!=="reviewed"||source.paper.edition!=="source"||
    target.examId!==source.examId||target.paper.paperId!==source.paper.paperId)return null;
 const byQuestion=new Map(source.questions.map(q=>[q.questionId,q]));
 const sourceKeys=new Map(source.answerKey.entries.map(e=>[e.questionRevisionId,e.answer]));
 const targetKeys=new Map(target.answerKey.entries.map(e=>[e.questionRevisionId,e.answer]));
 const sourceAssets=new Map((source.assets??[]).map(a=>[a.id,a.contentHash]));
 const targetAssets=new Map((target.assets??[]).map(a=>[a.id,a.contentHash]));
 const selected:Core["entries"][number][]=[];
 for(const question of target.questions){
   const original=byQuestion.get(question.questionId);
   if(!original)continue; // An imported revised paper may add independent new questions.
   const sourceAnswer=sourceKeys.get(original.id),currentAnswer=targetKeys.get(question.id);
   if(!sourceAnswer||!currentAnswer)continue;
   const mediaChanged=[...(original.content.assetIds??[]),
     ...(original.content.kind==="single-choice"||original.content.kind==="multiple-select"?
       original.content.options.flatMap(o=>o.assetIds??[]):[])]
     .some(id=>sourceAssets.get(id)!==targetAssets.get(id));
   if(original.contentHash===question.contentHash&&
      JSON.stringify(sourceAnswer)===JSON.stringify(currentAnswer)&&!mediaChanged)continue;
   selected.push({targetQuestionRevisionId:question.id,
     sourceQuestion:structuredClone(original),sourceAnswer:structuredClone(sourceAnswer)});
 }
 if(!selected.length)return null;
 const resources=selectDisplayResources(selected.map(e=>e.sourceQuestion),
   source.stimuli??[],source.assets??[]);
 const core:Core={schema:1,examId:target.examId,paperId:target.paper.paperId,
   targetPaperRevisionId:target.paper.id,sourcePaperRevisionId:source.paper.id,
   sourceAnswerKeyRevisionId:source.answerKey.id,entries:selected,...resources};
 return {...core,contentHash:hashJson(core)};
}

export function validateSourceReviewReference(attempt:GenericAttempt):void{
 const ref=attempt.sourceReviewReference;
 if(!ref)return; // Pre-Pass-12 records stay valid; never backfill from a mutable library.
 const frozen=attempt.frozen;
 if(ref.schema!==1||frozen.paper.edition!=="reviewed"||
    ref.examId!==frozen.snapshot.examId||ref.paperId!==frozen.paper.paperId||
    ref.targetPaperRevisionId!==frozen.paper.id||
    typeof ref.sourcePaperRevisionId!=="string"||!ref.sourcePaperRevisionId||
    typeof ref.sourceAnswerKeyRevisionId!=="string"||!ref.sourceAnswerKeyRevisionId||
    !Array.isArray(ref.entries)||!ref.entries.length||
    ref.entries.length>frozen.questions.length||
    !Array.isArray(ref.stimuli)||!Array.isArray(ref.assets))
   throw new Error("Invalid frozen source-review reference");
 const core:Core={schema:ref.schema,examId:ref.examId,paperId:ref.paperId,
   targetPaperRevisionId:ref.targetPaperRevisionId,
   sourcePaperRevisionId:ref.sourcePaperRevisionId,
   sourceAnswerKeyRevisionId:ref.sourceAnswerKeyRevisionId,
   entries:ref.entries,stimuli:ref.stimuli,assets:ref.assets};
 if(ref.contentHash!==hashJson(core))throw new Error("Frozen source-review hash mismatch");
 const targets=new Map(frozen.questions.map(q=>[q.id,q]));
 const seen=new Set<string>(),originalQuestions:QuestionRevision[]=[];
 const keyEntries:{questionRevisionId:QuestionRevisionId;answer:CorrectAnswer}[]=[];
 for(const entry of ref.entries){
   const target=targets.get(entry.targetQuestionRevisionId);
   const original=entry.sourceQuestion;
   if(!target||!original||seen.has(target.id)||
      original.questionId!==target.questionId||original.id===target.id)
     throw new Error("Frozen source-review question identity mismatch");
   validateQuestionRevision(original);
   if(questionRevisionHash(original)!==original.contentHash)
     throw new Error("Frozen source-review question content mismatch");
   seen.add(target.id);originalQuestions.push(original);
   keyEntries.push({questionRevisionId:original.id,answer:entry.sourceAnswer});
   // When the separate aggregate source-key snapshot exists, its published
   // single-choice key must agree with the original item-level snapshot.
   const aggregate=attempt.sourceKeyReference?.entries.find(e=>e.questionRevisionId===target.id);
   if(aggregate&&entry.sourceAnswer.kind==="single-choice"&&
      aggregate.originalOptionId!==entry.sourceAnswer.optionId)
     throw new Error("Frozen source-review published key mismatch");
 }
 validateAnswerKeyRevision({id:ref.sourceAnswerKeyRevisionId,paperId:ref.paperId,
   revision:1,entries:keyEntries,contentHash:answerKeyRevisionHash({entries:keyEntries})},originalQuestions);
 validateMediaInventory(ref.stimuli,ref.assets);
 validateQuestionMediaReferences(originalQuestions,ref.stimuli,ref.assets);
}
