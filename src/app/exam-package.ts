import { validateAnswerKeyRevision, validatePaperRevision, validateQuestionRevision } from "../domain/validate.ts";
import { importCglBank } from "../content/import-cgl.ts";
import { sha256 } from "../domain/hash.ts";
import { assertRevisionHashes, answerKeyRevisionHash, paperRevisionHash } from "../domain/integrity.ts";
import { validateMediaInventory, validateQuestionMediaReferences } from "../domain/media.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import type { PaperRevision } from "../domain/exam.js";
import type { QuestionRevision, StimulusDefinition, ImageAsset, CandidateResponse } from "../domain/question.js";
import type { AnswerKeyRevision, CorrectAnswer } from "../domain/answer-key.js";
import type { ExamId, QuestionRevisionId } from "../domain/ids.js";
import { validateResponse } from "../engine/response.ts";
import { startSession, transition } from "../engine/session.ts";
import type { SessionState, SessionEvent } from "../engine/session.ts";
import { scoreAttempt } from "../engine/scoring.ts";
import { freezeAttempt } from "../history/frozen.ts";
import type { FrozenAttemptContent } from "../history/frozen.ts";
import type { ManualGrade } from "../engine/manual-grading.ts";
import type { SourceKeyReference } from "../engine/source-comparison.ts";
import type { SourceReviewReference } from "../engine/review-source.ts";
import type { NotebookLineage } from "../learning/revision-test.ts";

export interface ExamPackage {
 readonly format: "practice-desk-exam";
 readonly version: 1;
 readonly examId: ExamId;
 readonly title: string;
 readonly paper: PaperRevision;
 readonly answerKey: AnswerKeyRevision;
 readonly questions: readonly QuestionRevision[];
 readonly stimuli?: readonly StimulusDefinition[];
 readonly assets?: readonly ImageAsset[];
 readonly explanations?: Readonly<Record<string,string>>;
 /** Runtime mode chosen by the user for derived CGL policies; never trusted as imported exam content. */
 readonly practiceMode?: CglPracticeMode;
}

/** Every supplied question, key and attachment is validated before becoming visible. */
export function validateExamPackage(value: unknown): ExamPackage {
 if (!value || typeof value !== "object") throw new Error("Exam package must be an object");
 const raw = value as Record<string, unknown>;
 if (raw.format !== "practice-desk-exam" || raw.version !== 1 ||
    typeof raw.examId !== "string" || !raw.examId.trim() ||
    typeof raw.title !== "string" || !raw.title.trim() ||
    !Array.isArray(raw.questions) || raw.questions.length > 2000)
    throw new Error("Invalid exam package header or question count");
 const questions = raw.questions.map(x => validateQuestionRevision(x));
 const key = validateAnswerKeyRevision(raw.answerKey, questions);
 const paper = validatePaperRevision(raw.paper, questions, key);
 const ids = new Set(paper.sections.flatMap(s => s.questionRevisionIds));
 if (ids.size !== questions.length || questions.some(q => !ids.has(q.id)))
    throw new Error("Every question must belong to this paper exactly once");
 const {stimuli,assets}=validateMediaInventory(raw.stimuli??[],raw.assets??[]);
 validateQuestionMediaReferences(questions,stimuli,assets);
 assertRevisionHashes(questions,key,paper);
 const explanations=raw.explanations;
 if(explanations!==undefined){
   if(!explanations || typeof explanations!=="object" || Array.isArray(explanations))
     throw new Error("Invalid explanations");
   for(const [id,text] of Object.entries(explanations)){
     if(!ids.has(id as QuestionRevisionId) || typeof text!=="string" || text.length>20000) throw new Error("Invalid explanation reference");
   }
 }
 return value as ExamPackage;
}

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
export type CglPracticeMode = "strict" | "free" | "single";
export function configureCglPractice(base: ExamPackage, mode:CglPracticeMode, sectionIndex=0):ExamPackage {
 if(base.examId!=="ssc-cgl")return base;
 if(mode==="strict"){
   // The raw editorial/source package is an immutable document with a manual
   // transition declaration. The actual v11-like exam simulation must instead
   // explicitly freeze an AUTOMATIC 15-minute section policy; otherwise a
   // correctly implemented manual expiry would strand the strict exam.
   if(base.paper.timing.kind!=="sectional")throw new Error("Strict CGL requires sectional timing");
   const derived={...base.paper,
     id:(base.paper.id+":practice:strict") as PaperRevision["id"],
     timing:{...base.paper.timing,transition:"automatic" as const}};
   const paper:PaperRevision={...derived,contentHash:paperRevisionHash(derived)};
   return {...base,paper,practiceMode:"strict"};
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
 return {...base,paper,answerKey,questions,practiceMode:mode,
   ...(base.explanations?{explanations:Object.fromEntries(Object.entries(base.explanations)
     .filter(([id])=>included.has(id as QuestionRevisionId)))}:{}),
   title:base.title+(mode==="free"?" · Flexible practice":" · "+sections[0]!.title+" practice")};
}
export interface GenericAttempt {
 readonly recordType: "generic-attempt";
 readonly saveRevision?: number;
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
 /** Explicit completion cause, only populated on newly finished attempts. */
 readonly completionReason?: "time-expired" | "submitted" | "section-submitted";
 readonly notebookLineage?: NotebookLineage;
 readonly explanations?: Readonly<Record<string,string>>;
}
export function startGenericAttempt(bundle: ExamPackage, id: string, timestamp: number): GenericAttempt {
 const validated = validateExamPackage(bundle);
 const mode=validated.paper.edition==="custom"?"custom-practice":validated.examId==="ssc-cgl" ?
   validated.practiceMode==="free"?"full-paper-practice":
   validated.practiceMode==="single"?"section-practice":"exam-simulation":
   "exam-simulation";
 const frozen = freezeAttempt(validated.paper,validated.answerKey,validated.questions,
   validated.stimuli??[],validated.assets??[],mode,new Date(timestamp).toISOString(),validated.examId);
 return {recordType:"generic-attempt",id,packageId:bundle.paper.id,startedAt:timestamp,
   updatedAt:timestamp,finishedAt:null,frozen,state:startSession(bundle.paper,timestamp),
   ...(validated.explanations?{explanations:structuredClone(validated.explanations)}:{})};
}
export function transitionGenericAttempt(
 attempt: GenericAttempt, event: SessionEvent, questionMap: ReadonlyMap<QuestionRevisionId,QuestionRevision>,
): GenericAttempt {
 if (attempt.finishedAt !== null) return attempt;
 const paper = attempt.frozen.paper;
 if (event.type === "ANSWER") {
   const id=paper.sections[attempt.state.sectionIndex]?.questionRevisionIds[attempt.state.questionIndex];
   const q=id && questionMap.get(id);
   if (!q) throw new Error("No question at the cursor");
   validateResponse(q,event.response);
 }
 const state=transition(paper,attempt.state,event);
 const finished = state.status === "completed";
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
    ...(finished ? {completionReason,result:scoreAttempt(paper,attempt.frozen.key,attempt.frozen.questions,
      state.responses,new Date(event.nowMs).toISOString())}: {})};
}
export function responseFor(state: SessionState, questionId: QuestionRevisionId): CandidateResponse | undefined {
 return state.responses.find(r=>r.questionRevisionId===questionId)?.response;
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
