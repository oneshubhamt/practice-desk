import { validateAnswerKeyRevision, validatePaperRevision, validateQuestionRevision } from "../domain/validate.ts";
import { importCglBank, sha256 } from "../content/import-cgl.ts";
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
 const stimuli = raw.stimuli ?? [];
 const assets = raw.assets ?? [];
 if (!Array.isArray(stimuli) || stimuli.length > 200 || !Array.isArray(assets) || assets.length > 1000)
    throw new Error("Invalid media inventory");
 const stimulusIds = new Set<string>();
 for (const item of stimuli) {
   if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id || stimulusIds.has(item.id))
      throw new Error("Duplicate or invalid stimulus");
   if (!["passage","case","table","chart","image"].includes(item.kind)) throw new Error("Unsupported stimulus");
   if (["passage","case"].includes(item.kind) && typeof item.text !== "string")
      throw new Error("Missing stimulus text");
   if (item.kind === "table" && (!Array.isArray(item.columns) || !Array.isArray(item.rows) ||
       item.rows.some((row: unknown) => !Array.isArray(row) || row.length !== item.columns.length)))
       throw new Error("Invalid stimulus table");
   stimulusIds.add(item.id);
 }
 const assetIds = new Set<string>();
 for (const item of assets) {
   if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id || assetIds.has(item.id))
      throw new Error("Duplicate or invalid media asset");
   if (!["image/png","image/jpeg","image/webp","image/avif","image/gif"].includes(item.mediaType) ||
       typeof item.dataUri !== "string" || !item.dataUri.startsWith("data:" + item.mediaType + ";base64,") ||
       !/^[A-Za-z0-9+/=]+$/.test(item.dataUri.split(",")[1] ?? "") ||
       typeof item.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(item.contentHash))
       throw new Error("Media must be an embedded image with a SHA-256 hash");
   const encoded=item.dataUri.slice(item.dataUri.indexOf(",")+1);
   const decoded=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
   if (sha256(decoded)!==item.contentHash) throw new Error("Embedded image digest does not match its content hash");
   assetIds.add(item.id);
 }
 for (const q of questions) {
   if (q.content.stimulusId && !stimulusIds.has(q.content.stimulusId)) throw new Error("Missing stimulus");
   for (const id of q.content.assetIds ?? []) if (!assetIds.has(id)) throw new Error("Missing question image");
   if (q.content.kind === "single-choice" || q.content.kind === "multiple-select")
      for (const option of q.content.options)
        for (const id of option.assetIds ?? []) if (!assetIds.has(id)) throw new Error("Missing option image");
   if (q.content.kind === "matching") for (const item of [...q.content.leftItems, ...q.content.rightItems])
      for (const id of item.assetIds ?? []) if (!assetIds.has(id)) throw new Error("Missing matching image");
 }
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
     const asImage=(id:string, uri:string):ImageAsset=>({
       id:id as ImageAsset["id"],mediaType:(uri.match(/^data:(image\/[a-z]+);/)?.[1]??"image/webp") as ImageAsset["mediaType"],
       dataUri:uri,contentHash:sha256(Uint8Array.from(atob(uri.slice(uri.indexOf(",")+1)),char=>char.charCodeAt(0))) as ImageAsset["contentHash"],
     });
     if (merged.images.stem) assets.push(asImage(stemId,merged.images.stem));
     merged.images.options?.forEach((uri,i)=>{
       if(uri)assets.push(asImage(`${paper.paperId}:q:${n}:option:${i}`,uri));
     });
   }
   return {format:"practice-desk-exam",version:1,examId:"ssc-cgl" as ExamId,
     title:`${source.name} · ${paper.edition === "reviewed" ? "Reviewed" : "Original"}`,
     paper,answerKey:key,questions,stimuli,assets,explanations};
 });
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
 readonly explanations?: Readonly<Record<string,string>>;
}
export function startGenericAttempt(bundle: ExamPackage, id: string, timestamp: number): GenericAttempt {
 const validated = validateExamPackage(bundle);
 const frozen = freezeAttempt(validated.paper,validated.answerKey,validated.questions,
   "exam-simulation",new Date(timestamp).toISOString(),validated.examId);
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
 return {...attempt,state,updatedAt:event.nowMs,finishedAt:finished?event.nowMs:null,
    ...(finished ? {result:scoreAttempt(paper,attempt.frozen.key,attempt.frozen.questions,
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
