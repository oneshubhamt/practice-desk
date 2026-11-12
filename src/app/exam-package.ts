/** Application assembly/configuration adapters. Canonical package and attempt contracts live below app/. */
import { importCglBank } from "../content/import-cgl.ts";
import { sha256 } from "../domain/hash.ts";
import { answerKeyRevisionHash, paperRevisionHash } from "../domain/integrity.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import type { PaperRevision } from "../domain/exam.js";
import type { QuestionRevision, StimulusDefinition, ImageAsset, CandidateResponse } from "../domain/question.js";
import type { AnswerKeyRevision, CorrectAnswer } from "../domain/answer-key.js";
import type { ExamId, QuestionRevisionId } from "../domain/ids.js";
import {validateExamPackage} from "../domain/exam-package.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import type {AttemptMode} from "../domain/attempt.js";
import type {CglPracticeMode} from "../workspace-settings.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
export {validateExamImportBudget,validateExamPackage} from "../domain/exam-package.ts";
import { startSession } from "../engine/session.ts";
import { freezeAttempt } from "../history/frozen.ts";

/** Convert existing CGL content without changing the original bank or editions. */
export function builtinCglPackages(sources: SourcePaperBank, patches: ReviewPatchBank,
  solutions: Readonly<Record<string,Readonly<Record<string,string>>>> = {}): ExamPackage[] {
 const editions = importCglBank(sources, patches);
 return editions.map(({ paper, key, questions }) => {
   const source = sources[paper.paperId];
   if (!source) throw new Error("Missing CGL source");
   const assets: ImageAsset[] = [];
   const stimuli: StimulusDefinition[] = [];
   const explanations: Record<string,string> = {};
   const patchMap = paper.edition === "reviewed" ? patches[paper.paperId] ?? {} : {};
   for (const [id, text] of Object.entries(source.passages))
      stimuli.push({id: `${paper.paperId}:passage:${id}` as StimulusDefinition["id"],kind:"passage",text});
   // CGL images are pre-embedded as data URIs. Never request remote resources.
   for (const question of questions) {
     const n = Number(question.questionId.split(":").at(-1));
     const original = source.questions.find(q => q.n === n)!;
     const merged = {...original, ...(patchMap[String(n)] ?? {})};
     const explanation = merged.explanation || solutions[paper.paperId]?.[String(n)] || "";
     if (explanation) explanations[question.id] = explanation;
     const stemId = `${paper.paperId}:q:${n}:stem`;
     // The immutable packaged media should identify its question/option to
     // assist screen readers in both the live paper and frozen post-test review.
     const asImage=(id:string, uri:string, altText:string):ImageAsset=>({
       id:id as ImageAsset["id"],mediaType:(uri.match(/^data:(image\/[a-z]+);/)?.[1]??"image/webp") as ImageAsset["mediaType"],
       dataUri:uri,contentHash:sha256(Uint8Array.from(atob(uri.slice(uri.indexOf(",")+1)),char=>char.charCodeAt(0))) as ImageAsset["contentHash"],
       altText
     });
     if (merged.images.stem) assets.push(asImage(stemId,merged.images.stem,"Diagram for question "+n));
     merged.images.options?.forEach((uri,i)=>{
       if(uri)assets.push(asImage(`${paper.paperId}:q:${n}:option:${i}`,uri,
         "Image for option "+String.fromCharCode(65+i)+" of question "+n));
     });
   }
   return {format:"practice-desk-exam",version:1,examId:"ssc-cgl" as ExamId,
     title:`${source.name} · ${paper.edition === "reviewed" ? "Reviewed" : "Original"}`,
     paper,answerKey:key,questions,stimuli,assets,explanations};
 });
}

/** Runtime-only CGL practice policies share the same versioned model as every exam. */
export function configureCglPractice(base: ExamPackage, mode:CglPracticeMode, sectionIndex=0):ExamPackage {
 if(base.examId!=="ssc-cgl")return base;
 if(mode==="strict"){
   // The raw editorial/source package is an immutable document with a manual
   // transition declaration. The actual exam simulation must instead
   // explicitly freeze an AUTOMATIC 15-minute section policy; otherwise a
   // correctly implemented manual expiry would strand the strict exam.
   if(base.paper.timing.kind!=="sectional")throw new Error("Strict CGL requires sectional timing");
   const derived={...base.paper,
     id:(base.paper.id+":practice:strict") as PaperRevision["id"],
     timing:{...base.paper.timing,transition:"automatic" as const}};
   const paper:PaperRevision={...derived,contentHash:paperRevisionHash(derived)};
   return {...base,paper};
 }
 const source=base.paper;
 if(mode==="single"&&!source.sections[sectionIndex])throw new Error("Unknown practice section");
 const sections=mode==="single"?[source.sections[sectionIndex]!]:[...source.sections];
 const included=new Set(sections.flatMap(s=>s.questionRevisionIds));
 const questions=base.questions.filter(q=>included.has(q.id));
 const entries=base.answerKey.entries.filter(e=>included.has(e.questionRevisionId));
 const answerKey={...base.answerKey,
   id:(base.answerKey.id+":practice:"+mode+(mode==="single"?":"+sectionIndex:"")) as AnswerKeyRevision["id"],
   contentHash:answerKeyRevisionHash({entries}),entries};
 const paperBase={...source,
   id:(source.id+":practice:"+mode+(mode==="single"?":"+sectionIndex:"")) as PaperRevision["id"],
   answerKeyRevisionId:answerKey.id,sections,
   timing:{kind:"whole-paper" as const,durationMs:mode==="single"?900000:3600000,pausePolicy:"allowed" as const},
   navigation:{...source.navigation,sectionNavigation:mode==="free"?"free" as const:"sequential-locked" as const}};
 const paper:PaperRevision={...paperBase,contentHash:paperRevisionHash(paperBase)};
 return {...base,paper,answerKey,questions,
   ...(base.explanations?{explanations:Object.fromEntries(Object.entries(base.explanations)
     .filter(([id])=>included.has(id as QuestionRevisionId)))}:{}),
   title:base.title+(mode==="free"?" · Flexible practice":" · "+sections[0]!.title+" practice")};
}
/** Optional timing override for any valid exam: never mutate the supplied paper.
 * The distinct derived paper hash/id are frozen with each new attempt.
 * Navigation, edition, keys, scoring and question order remain unchanged. */
export function configureUntimedPractice(base:ExamPackage,enabled:boolean):ExamPackage{
 if(!enabled||base.paper.timing.kind==="untimed")return base;
 const derived={...base.paper,
   id:(base.paper.id+":practice:untimed") as PaperRevision["id"],
   timing:{kind:"untimed" as const}};
 const paper:PaperRevision={...derived,contentHash:paperRevisionHash(derived)};
 return {...base,paper};
}

export function cglAttemptMode(mode:CglPracticeMode):AttemptMode{
 return mode==="free"?"full-paper-practice":mode==="single"?"section-practice":"exam-simulation";
}

export function startGenericAttempt(
 bundle: ExamPackage,id:string,timestamp:number,mode?:AttemptMode
): GenericAttempt {
 const validated=validateExamPackage(bundle);
 const frozenMode=mode??(validated.paper.edition==="custom"?"custom-practice":"exam-simulation");
 const frozen=freezeAttempt(validated.paper,validated.answerKey,validated.questions,
   validated.stimuli??[],validated.assets??[],frozenMode,new Date(timestamp).toISOString(),validated.examId);
 return {recordType:"generic-attempt",saveRevision:0,id,packageId:validated.paper.id,startedAt:timestamp,
   updatedAt:timestamp,finishedAt:null,completionReason:null,frozen,state:startSession(validated.paper,timestamp),
   ...(validated.explanations?{explanations:structuredClone(validated.explanations)}:{})};
}

/** Resolve display labels from frozen question definitions, not option positions or keys. */
export function readableAnswer(q:QuestionRevision,
 answer:CorrectAnswer | CandidateResponse | undefined):string{
 if(!answer)return "Unanswered";
 const content=q.content;
 switch(answer.kind){
 case "single-choice":
   return content.kind==="single-choice"||content.kind==="multiple-select"?
     content.options.find(o=>o.id===answer.optionId)?.text??"Unknown option":"Unknown option";
 case "multiple-select":
   return content.kind==="multiple-select"?
     content.options.filter(o=>answer.optionIds.includes(o.id)).map(o=>o.text).join("; "):"Invalid response";
 case "numeric-entry":
   return "acceptedValues" in answer?answer.acceptedValues.join(", "):String(answer.value);
 case "true-false":return answer.value?"True":"False";
 case "matching":return content.kind==="matching"?answer.pairs.map(pair=>{
   const left=content.leftItems.find(item=>item.id===pair.leftId)?.text??pair.leftId;
   const right=content.rightItems.find(item=>item.id===pair.rightId)?.text??pair.rightId;
   return left+" → "+right;
 }).join("; "):"Invalid response";
 case "free-response":return "text" in answer?answer.text:"Manual assessment required";
 }
}
