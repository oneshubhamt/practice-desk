import type { ExamPackage,GenericAttempt } from "../app/exam-package.ts";
import type { QuestionRevision,StimulusDefinition,ImageAsset } from "../domain/question.js";
import type { QuestionRevisionId,OptionId,PaperId,PaperRevisionId,AnswerKeyRevisionId } from "../domain/ids.js";
import type { MarkingRule } from "../domain/scoring.js";
import { hashJson } from "../domain/hash.ts";

/**
 * Source-key comparison is hypothetical, never a replacement for frozen audited
 * marks. V1 positional letters cannot prove identical answer semantics; accept
 * their archived records but do not certify/score them. V2 freezes a fingerprint
 * of the complete original rendered question context and compares only when it
 * equals the reviewed question's context at the moment the attempt was frozen.
 */
interface CommonReference {
 readonly paperId:PaperId;
 readonly sourcePaperRevisionId:PaperRevisionId;
 readonly sourceAnswerKeyRevisionId:AnswerKeyRevisionId;
 readonly contentHash:string;
}
interface CommonEntry {
 readonly questionRevisionId:QuestionRevisionId;
 readonly originalOptionId:OptionId;
 readonly markingRule:MarkingRule;
}
export interface LegacySourceKeyReference extends CommonReference {
 readonly schema:1;
 readonly entries:readonly CommonEntry[];
}
export interface VerifiedSourceKeyReference extends CommonReference {
 readonly schema:2;
 readonly entries:readonly (CommonEntry & {
  /** Hash of source wording, option identity/order/text and used media/passage. */
  readonly sourceSemanticHash:string;
  /** True ONLY when source and reviewed rendered question contexts match exactly. */
  readonly comparable:boolean;
 })[];
}
export type SourceKeyReference=LegacySourceKeyReference|VerifiedSourceKeyReference;
type V1Core=Omit<LegacySourceKeyReference,"contentHash">;
type V2Core=Omit<VerifiedSourceKeyReference,"contentHash">;

type Resources=Pick<ExamPackage,"stimuli"|"assets">;
/** Excludes editorial notes (which do not change answer meaning), but includes every user-visible question input. */
function semanticHash(question:QuestionRevision,resources:Resources):string{
 const c=question.content;
 const stimulus=c.stimulusId?(resources.stimuli??[]).find(s=>s.id===c.stimulusId):undefined;
 const assetIds=[...(c.assetIds??[]),
   ...(c.kind==="single-choice"||c.kind==="multiple-select"?
     c.options.flatMap(o=>o.assetIds??[]):[])];
 if(stimulus){
  if("assetIds" in stimulus)assetIds.push(...(stimulus.assetIds??[]));
  if("assetId" in stimulus)assetIds.push(stimulus.assetId);
 }
 const byAsset=new Map((resources.assets??[]).map(a=>[a.id,a]));
 const media=assetIds.map(id=>{
  const asset=byAsset.get(id);
  return {id,contentHash:asset?.contentHash??null,mediaType:asset?.mediaType??null};
 });
 return hashJson({content:c,stimulus:stimulus??null,media});
}

export function createSourceKeyReference(
 target:ExamPackage,source:ExamPackage
):VerifiedSourceKeyReference|null{
 if(target.paper.edition!=="reviewed"||source.paper.edition!=="source"||
    target.examId!==source.examId||target.paper.paperId!==source.paper.paperId)return null;
 const byQuestion=new Map(source.questions.map(q=>[q.questionId,q]));
 const byEntry=new Map(source.answerKey.entries.map(e=>[e.questionRevisionId,e]));
 const sections=new Map(source.paper.sections.flatMap(s=>s.questionRevisionIds.map(id=>[id,s] as const)));
 const entries:V2Core["entries"][number][]=[];
 for(const q of target.questions){
   const sourceQ=byQuestion.get(q.questionId);
   if(!sourceQ||q.content.kind!=="single-choice"||sourceQ.content.kind!=="single-choice")return null;
   const entry=byEntry.get(sourceQ.id),section=sections.get(sourceQ.id);
   if(!entry||entry.answer.kind!=="single-choice"||!section)return null;
   const originalOptionId=entry.answer.optionId;
   // An option identifier is NOT semantic proof: CGL A-D IDs are positional.
   const sourceSemanticHash=semanticHash(sourceQ,source);
   const comparable=sourceSemanticHash===semanticHash(q,target)&&
     q.content.options.some(o=>o.id===originalOptionId);
   const rule=entry.scoringOverride??section.scoringOverride??
      source.paper.scoring.byQuestionKind?.["single-choice"]??source.paper.scoring.defaultRule;
   entries.push({questionRevisionId:q.id,originalOptionId,markingRule:structuredClone(rule),
     sourceSemanticHash,comparable});
 }
 const core:V2Core={schema:2,paperId:target.paper.paperId,
   sourcePaperRevisionId:source.paper.id,sourceAnswerKeyRevisionId:source.answerKey.id,entries};
 return {...core,contentHash:hashJson(core)};
}

export function validateSourceKeyReference(attempt:GenericAttempt):void{
 const reference=attempt.sourceKeyReference;
 if(!reference)return;
 if((reference.schema!==1&&reference.schema!==2)||
    reference.paperId!==attempt.frozen.paper.paperId||
    typeof reference.sourcePaperRevisionId!=="string"||
    typeof reference.sourceAnswerKeyRevisionId!=="string"||
    !Array.isArray(reference.entries)||
    reference.entries.length!==attempt.frozen.questions.length)
    throw Error("Invalid original source-key comparison");
 const core=reference.schema===1?
   {schema:1 as const,paperId:reference.paperId,
     sourcePaperRevisionId:reference.sourcePaperRevisionId,
     sourceAnswerKeyRevisionId:reference.sourceAnswerKeyRevisionId,
     entries:reference.entries}:
   {schema:2 as const,paperId:reference.paperId,
     sourcePaperRevisionId:reference.sourcePaperRevisionId,
     sourceAnswerKeyRevisionId:reference.sourceAnswerKeyRevisionId,
     entries:reference.entries};
 if(reference.contentHash!==hashJson(core))throw Error("Original source-key reference hash mismatch");
 const allowed=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
 const seen=new Set<string>();
 for(const entry of reference.entries){
  const q=allowed.get(entry.questionRevisionId);
  if(!q||q.content.kind!=="single-choice"||seen.has(q.id)||
    !Number.isFinite(entry.markingRule.correctMarks)||
    !Number.isFinite(entry.markingRule.incorrectMarks)||
    !Number.isFinite(entry.markingRule.unansweredMarks)||
    entry.markingRule.correctMarks<0||entry.markingRule.incorrectMarks>0)
    throw Error("Invalid original source-key answer entry");
  seen.add(q.id);
  if(reference.schema===1){
   // Retain stored legacy data as-is; its same-letter comparison is unverified.
   if(!q.content.options.some(o=>o.id===entry.originalOptionId))
     throw Error("Invalid legacy source-key answer option");
  }else{
   const v2=entry as VerifiedSourceKeyReference["entries"][number];
   if(!/^[0-9a-f]{64}$/.test(v2.sourceSemanticHash)||
      typeof v2.comparable!=="boolean"||
      (v2.comparable&&(!q.content.options.some(o=>o.id===entry.originalOptionId)||
        v2.sourceSemanticHash!==semanticHash(q,{
          stimuli:attempt.frozen.stimuli,assets:attempt.frozen.assets
        }))))
     throw Error("Invalid source-key semantic correspondence");
  }
 }
}

/** Returns only the defensibly comparable subset; V1 positional history is unavailable. */
export function sourceKeyScore(attempt:GenericAttempt):{
 marks:number;maxMarks:number;correct:number;incorrect:number;unanswered:number;
 comparable:number;unavailable:number;total:number;
}|null{
 const ref=attempt.sourceKeyReference;
 if(!ref||attempt.finishedAt===null)return null;
 validateSourceKeyReference(attempt);
 if(ref.schema===1)return null;
 const responses=new Map(attempt.state.responses.map(row=>[row.questionRevisionId,row.response]));
 let marks=0,maxMarks=0,correct=0,incorrect=0,unanswered=0,comparable=0;
 for(const entry of ref.entries){
  if(!entry.comparable)continue;
  comparable++;
  const r=responses.get(entry.questionRevisionId);
  const rule=entry.markingRule;
  maxMarks+=rule.correctMarks;
  if(!r){unanswered++;marks+=rule.unansweredMarks;}
  else if(r.kind==="single-choice"&&r.optionId===entry.originalOptionId){correct++;marks+=rule.correctMarks;}
  else {incorrect++;marks+=rule.incorrectMarks;}
 }
 return {marks,maxMarks,correct,incorrect,unanswered,
   comparable,unavailable:ref.entries.length-comparable,total:ref.entries.length};
}
