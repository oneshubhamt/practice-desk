import { validatePaperRevision, validateAnswerKeyRevision } from "../domain/validate.ts";
import { transition, rebaseSession } from "../engine/session.ts";
import type { SessionState } from "../engine/session.ts";
import type { PaperRevision } from "../domain/exam.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { QuestionRevision, StimulusDefinition, ImageAsset } from "../domain/question.js";
import { assertRevisionHashes } from "../domain/integrity.ts";
import { selectDisplayResources, validateMediaInventory, validateQuestionMediaReferences } from "../domain/media.ts";
import type { AttemptSnapshot, AttemptMode, FrozenAttemptContent } from "../domain/attempt.js";
import type { ExamId } from "../domain/ids.js";
import type {ExamTaxonomy,TaxonomyAssignments} from "../domain/taxonomy.ts";
import {assertTaxonomyExam,validateExamTaxonomy,validateTaxonomyAssignments} from "../domain/taxonomy.ts";

/** Freeze exact scoring/display resources into the canonical attempt contract. */
export function freezeAttempt(
  paper: PaperRevision, key: AnswerKeyRevision, questions: readonly QuestionRevision[],
  stimuli:readonly StimulusDefinition[],assets:readonly ImageAsset[],
  mode: AttemptMode, frozenAt: string, examId: ExamId,
  taxonomy?:ExamTaxonomy,taxonomyAssignments?:TaxonomyAssignments,
): FrozenAttemptContent {
  validateAnswerKeyRevision(key, questions);
  validatePaperRevision(paper, questions, key);
  assertRevisionHashes(questions,key,paper);
  const display=selectDisplayResources(questions,stimuli,assets);
  if(taxonomy){
    const checked=validateExamTaxonomy(taxonomy);assertTaxonomyExam(checked,examId);
    validateTaxonomyAssignments(checked,taxonomyAssignments,new Set(questions.map(q=>q.id as string)));
  }else if(taxonomyAssignments)throw Error("Frozen taxonomy assignments require taxonomy");
  const snapshot: AttemptSnapshot = {
    examId, paperId: paper.paperId, paperRevisionId: paper.id,
    answerKeyRevisionId: key.id, scoringPolicy: paper.scoring, mode,
  };
  return structuredClone({ schema: 2 as const, frozenAt, snapshot, paper, key, questions, ...display,
    ...(taxonomy?{taxonomy,taxonomyAssignments:taxonomyAssignments??{}}:{}) });
}
export function assertFrozenContent(value: FrozenAttemptContent): FrozenAttemptContent {
  if (!value || value.schema !== 2 ||
      !value.snapshot || !value.paper || !value.key || !Array.isArray(value.questions) ||
      !Array.isArray(value.stimuli) || !Array.isArray(value.assets) ||
      typeof value.snapshot.examId !== "string" || value.snapshot.examId.length === 0 ||
      value.snapshot.paperId !== value.paper.paperId ||
      value.snapshot.paperRevisionId !== value.paper.id ||
      value.snapshot.answerKeyRevisionId !== value.key.id ||
      JSON.stringify(value.snapshot.scoringPolicy) !== JSON.stringify(value.paper.scoring) ||
      !Number.isFinite(Date.parse(value.frozenAt))) {
    throw new Error("Invalid or mismatched frozen attempt content");
  }
  validatePaperRevision(value.paper, value.questions, value.key);
  assertRevisionHashes(value.questions,value.key,value.paper);
  validateMediaInventory(value.stimuli,value.assets);
  validateQuestionMediaReferences(value.questions,value.stimuli,value.assets);
  if(value.taxonomy){
    const taxonomy=validateExamTaxonomy(value.taxonomy);
    assertTaxonomyExam(taxonomy,value.snapshot.examId);
    validateTaxonomyAssignments(taxonomy,value.taxonomyAssignments,
      new Set(value.questions.map(q=>q.id as string)));
  }else if(value.taxonomyAssignments)throw Error("Frozen taxonomy assignments require taxonomy");
  return value;
}
export interface RestoredSession {
  readonly state: SessionState;
  readonly expired: boolean;
}
/**
 * On a file:// reopen, the saved clock origin is no longer a safe monotonic
 * source. Account for actual wall-clock absence without charging foreground
 * question time; paused attempts remain paused. Hard deadlines remain hard;
 * advisory practice budgets may continue into overtime.
 */
export function restoreSession(
  paper: PaperRevision, saved: SessionState, wallNowMs: number, visible: boolean,mode:AttemptMode,
): RestoredSession {
  if (!Number.isFinite(wallNowMs)) throw new Error("Invalid restoration time");
  const aligned = wallNowMs < saved.clockMs
    ? rebaseSession({ ...saved, visible: false }, wallNowMs)
    : transition(paper, { ...saved, visible: false }, { type: "TICK", nowMs: wallNowMs },mode);
  return { state: { ...aligned, visible }, expired: aligned.status === "completed" };
}
export interface RecoveryCandidate {
  readonly id: string;
  readonly startedAt?: number | null;
  readonly finishedAt?: number | null;
  readonly updatedAt?: number | null;
  readonly saveRevision: number;
}
/** Terminal records win over stale in-progress mirrors for the same ID. */
export function chooseRecovered<T extends RecoveryCandidate>(stored: T | undefined, mirror: T | undefined): T | undefined {
  if (!stored) return mirror;
  if (!mirror || stored.id !== mirror.id) return stored;
  // Version precedence comes first: even a completed mirror can be stale when
  // another tab has already persisted a newer revision of the same attempt.
  if (stored.saveRevision >= mirror.saveRevision) return stored;
  if (stored.finishedAt && !mirror.finishedAt) return stored;
  if (mirror.finishedAt && !stored.finishedAt) return mirror;
  return (mirror.updatedAt ?? 0) > (stored.updatedAt ?? 0) ? mirror : stored;
}
