import type {ExamPackage} from "../domain/exam-package.ts";
import type {GenericAttempt} from "./generic-attempt.ts";
import type { QuestionRevision } from "../domain/question.js";
import type { QuestionRevisionId,OptionId,PaperId,PaperRevisionId,AnswerKeyRevisionId } from "../domain/ids.js";
import type { MarkingRule } from "../domain/scoring.js";
import { hashJson } from "../domain/hash.ts";

/** Hypothetical original-key score. Never changes the actual frozen result.
 * Only the canonical current representation is accepted.
 */
interface CommonReference {
 readonly paperId:PaperId;
 readonly sourcePaperRevisionId:PaperRevisionId;
 readonly sourceAnswerKeyRevisionId:AnswerKeyRevisionId;
 readonly contentHash:string;
}
interface SingleChoiceEntry {
 readonly questionRevisionId:QuestionRevisionId;
 readonly originalOptionId:OptionId;
 readonly markingRule:MarkingRule;
 readonly sourceSemanticHash:string;
 readonly comparable:boolean;
}
type SourceKeyEntry=
 | (SingleChoiceEntry&{readonly kind:"single-choice"})
 | {readonly kind:"unavailable";readonly questionRevisionId:QuestionRevisionId;
    readonly comparable:false;readonly reason:"unsupported-kind"|"missing-original"|"source-key-unavailable"};
export interface VerifiedSourceKeyReference extends CommonReference {
 readonly schema:3;
 readonly entries:readonly SourceKeyEntry[];
}
export type SourceKeyReference=VerifiedSourceKeyReference;
type SourceKeyReferenceCore=Omit<VerifiedSourceKeyReference,"contentHash">;
type Resources=Pick<ExamPackage,"stimuli"|"assets">;

/** Only candidate-visible scoring inputs, never solution, tags or editorial
 * metadata. Images include their accessible alt text and content digest.
 * New resource IDs can conservatively suppress comparability, not invent it.
 */
function candidateSemanticHash(question:QuestionRevision,resources:Resources):string{
 const c=question.content;
 if(c.kind!=="single-choice")throw Error("Candidate comparison requires single-choice");
 const stimulus=c.stimulusId?(resources.stimuli??[]).find(s=>s.id===c.stimulusId):undefined;
 const ids=new Set<string>([...(c.assetIds??[]),...c.options.flatMap(o=>o.assetIds??[])]);
 if(stimulus){
  if("assetIds" in stimulus)for(const id of stimulus.assetIds??[])ids.add(id);
  if("assetId" in stimulus)ids.add(stimulus.assetId);
 }
 const mediaIndex=new Map<string,NonNullable<Resources["assets"]>[number]>((resources.assets??[]).map(a=>[a.id,a]));
 const media=[...ids].sort().map(id=>{
  const asset=mediaIndex.get(id);
  return {id,contentHash:asset?.contentHash??null,
   mediaType:asset?.mediaType??null,altText:asset?.altText??null};
 });
 // The stimulus ID is an internal reference, not content displayed to users.
 const visibleStimulus=stimulus?Object.fromEntries(Object.entries(stimulus)
   .filter(([name])=>name!=="id")):null;
 return hashJson({
  kind:c.kind,prompt:c.prompt,richPrompt:c.richPrompt??null,
  assetIds:c.assetIds??[],stimulus:visibleStimulus,
  options:c.options.map(o=>({id:o.id,text:o.text,richText:o.richText??null,
    assetIds:o.assetIds??[]})),media
 });
}

/** Source comparison is valid only for the exact Source revision/key
 * hash-bound into the reviewed paper. No unbound or heuristic pairing exists. */
function matchesPair(target:ExamPackage,source:ExamPackage):boolean{
 return target.paper.edition==="reviewed"&&source.paper.edition==="source"&&
  target.examId===source.examId&&target.paper.paperId===source.paper.paperId&&
  target.paper.sourcePaperRevisionId===source.paper.id&&
  target.paper.sourceAnswerKeyRevisionId===source.answerKey.id;
}

export function createSourceKeyReference(
 target:ExamPackage,source:ExamPackage
):VerifiedSourceKeyReference|null{
 if(!matchesPair(target,source))return null;
 const byQuestion=new Map(source.questions.map(q=>[q.questionId,q]));
 const byEntry=new Map(source.answerKey.entries.map(e=>[e.questionRevisionId,e]));
 const sections=new Map(source.paper.sections.flatMap(s=>s.questionRevisionIds.map(id=>[id,s] as const)));
 const entries:SourceKeyEntry[]=[];
 for(const q of target.questions){
  const original=byQuestion.get(q.questionId);
  if(!original){
   entries.push({kind:"unavailable",questionRevisionId:q.id,
     comparable:false,reason:"missing-original"});continue;
  }
  if(q.content.kind!=="single-choice"||original.content.kind!=="single-choice"){
   entries.push({kind:"unavailable",questionRevisionId:q.id,
     comparable:false,reason:"unsupported-kind"});continue;
  }
  const sourceEntry=byEntry.get(original.id),section=sections.get(original.id);
  if(!sourceEntry||sourceEntry.answer.kind!=="single-choice"||!section){
   entries.push({kind:"unavailable",questionRevisionId:q.id,
     comparable:false,reason:"source-key-unavailable"});continue;
  }
  const originalOptionId=sourceEntry.answer.optionId;
  const sourceSemanticHash=candidateSemanticHash(original,source);
  const comparable=sourceSemanticHash===candidateSemanticHash(q,target)&&
   q.content.options.some(o=>o.id===originalOptionId);
  const rule=sourceEntry.scoringOverride??section.scoringOverride??
   source.paper.scoring.byQuestionKind?.["single-choice"]??source.paper.scoring.defaultRule;
  entries.push({kind:"single-choice",questionRevisionId:q.id,originalOptionId,
   markingRule:structuredClone(rule),sourceSemanticHash,comparable});
 }
 const core:SourceKeyReferenceCore={schema:3,paperId:target.paper.paperId,
   sourcePaperRevisionId:source.paper.id,sourceAnswerKeyRevisionId:source.answerKey.id,entries};
 return {...core,contentHash:hashJson(core)};
}

export function validateSourceKeyReference(attempt:GenericAttempt):void{
 const ref=attempt.sourceKeyReference;
 if(!ref)return;
 const frozen=attempt.frozen;
 if(typeof ref!=="object"||Array.isArray(ref)||
    Object.keys(ref).some(key=>!["schema","paperId","sourcePaperRevisionId",
     "sourceAnswerKeyRevisionId","contentHash","entries"].includes(key)))
   throw Error("Invalid original source-key comparison fields");
 if(ref.schema!==3)throw Error("Invalid original source-key comparison schema");
 if(ref.paperId!==frozen.paper.paperId||
   typeof ref.sourcePaperRevisionId!=="string"||!ref.sourcePaperRevisionId||
   typeof ref.sourceAnswerKeyRevisionId!=="string"||!ref.sourceAnswerKeyRevisionId||
   ref.sourcePaperRevisionId!==frozen.paper.sourcePaperRevisionId||
   ref.sourceAnswerKeyRevisionId!==frozen.paper.sourceAnswerKeyRevisionId||
   !Array.isArray(ref.entries)||ref.entries.length!==frozen.questions.length)
   throw Error("Invalid original source-key comparison");
 const core:SourceKeyReferenceCore={schema:3,paperId:ref.paperId,
   sourcePaperRevisionId:ref.sourcePaperRevisionId,
   sourceAnswerKeyRevisionId:ref.sourceAnswerKeyRevisionId,entries:ref.entries};
 // Reject unexpected nested fields before digest validation.
 for(const item of ref.entries){
  if(!item||typeof item!=="object")throw Error("Invalid source-key entry fields");
  const allowed="kind" in item&&item.kind==="unavailable"?
   ["kind","questionRevisionId","comparable","reason"]:
   ["kind","questionRevisionId","originalOptionId","markingRule",
      "sourceSemanticHash","comparable"];
  if(Object.keys(item).some(field=>!allowed.includes(field)))
   throw Error("Invalid source-key entry fields");
 }
 if(ref.contentHash!==hashJson(core))throw Error("Original source-key reference hash mismatch");
 const questions=new Map(frozen.questions.map(q=>[q.id,q]));
 const seen=new Set<string>();
 for(const entry of ref.entries){
  if(!entry||typeof entry!=="object")throw Error("Invalid source-key entry");
  const q=questions.get(entry.questionRevisionId);
  if(!q||seen.has(q.id))throw Error("Invalid source-key question identity");
  seen.add(q.id);
  if("kind" in entry&&entry.kind==="unavailable"){
   if(Object.keys(entry).some(key=>!["kind","questionRevisionId","comparable","reason"].includes(key))||
     entry.comparable!==false||
     !["unsupported-kind","missing-original","source-key-unavailable"].includes(entry.reason))
    throw Error("Invalid unavailable source-key entry");
   continue;
  }
  if(Object.keys(entry).some(key=>!["kind","questionRevisionId","originalOptionId",
    "markingRule","sourceSemanticHash","comparable"].includes(key))||
    !("kind" in entry)||entry.kind!=="single-choice"||
    q.content.kind!=="single-choice")
   throw Error("Invalid source-key answer entry");
  const choice=entry as SingleChoiceEntry;
  if(!choice.markingRule||!Number.isFinite(choice.markingRule.correctMarks)||
    !Number.isFinite(choice.markingRule.incorrectMarks)||
    !Number.isFinite(choice.markingRule.unansweredMarks)||
    choice.markingRule.correctMarks<0||choice.markingRule.incorrectMarks>0||
    typeof choice.comparable!=="boolean"||
    !/^[0-9a-f]{64}$/.test(choice.sourceSemanticHash)||
    (choice.comparable&&(!q.content.options.some(o=>o.id===choice.originalOptionId)||
       choice.sourceSemanticHash!==candidateSemanticHash(q,{
        stimuli:frozen.stimuli,assets:frozen.assets}))))
   throw Error("Invalid source-key semantic correspondence");
 }
}

/** Score only the comparable frozen subset, never rewrite the actual score. */
export function sourceKeyScore(attempt:GenericAttempt):{
 marks:number;maxMarks:number;correct:number;incorrect:number;unanswered:number;
 comparable:number;unavailable:number;total:number;
}|null{
 const ref=attempt.sourceKeyReference;
 if(!ref||attempt.finishedAt===null)return null;
 validateSourceKeyReference(attempt);
 const responses=new Map(attempt.state.responses.map(row=>[row.questionRevisionId,row.response]));
 let marks=0,maxMarks=0,correct=0,incorrect=0,unanswered=0,comparable=0;
 for(const entry of ref.entries){
  if(!entry.comparable)continue;
  comparable++;
  const r=responses.get(entry.questionRevisionId),rule=entry.markingRule;
  maxMarks+=rule.correctMarks;
  if(!r){unanswered++;marks+=rule.unansweredMarks;}
  else if(r.kind==="single-choice"&&r.optionId===entry.originalOptionId){correct++;marks+=rule.correctMarks;}
  else {incorrect++;marks+=rule.incorrectMarks;}
 }
 return {marks,maxMarks,correct,incorrect,unanswered,
   comparable,unavailable:ref.entries.length-comparable,total:ref.entries.length};
}
