import { validatePaperRevision, validateAnswerKeyRevision } from "../domain/validate.ts";
import { transition, rebaseSession } from "../engine/session.ts";
import type { SessionState } from "../engine/session.ts";
import type { PaperRevision } from "../domain/exam.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { QuestionRevision, StimulusDefinition, ImageAsset } from "../domain/question.js";
import { assertRevisionHashes } from "../domain/integrity.ts";
import { selectDisplayResources, validateMediaInventory, validateQuestionMediaReferences } from "../domain/media.ts";
import type { AttemptSnapshot, AttemptMode } from "../domain/attempt.js";
import type { ExamId } from "../domain/ids.js";

/**
 * The content used to score an attempt belongs to that attempt, not to the
 * mutable library selection or a later application release. All fields are
 * ordinary structured-clone-compatible data so IndexedDB writes remain atomic.
 * Exact display resources are frozen with the attempt so historical questions remain renderable.
 */
export interface FrozenAttemptContent {
  readonly schema: 2;
  readonly frozenAt: string;
  readonly snapshot: AttemptSnapshot;
  readonly paper: PaperRevision;
  readonly key: AnswerKeyRevision;
  readonly questions: readonly QuestionRevision[];
  readonly stimuli: readonly StimulusDefinition[];
  readonly assets: readonly ImageAsset[];
}
export function freezeAttempt(
  paper: PaperRevision, key: AnswerKeyRevision, questions: readonly QuestionRevision[],
  stimuli:readonly StimulusDefinition[],assets:readonly ImageAsset[],
  mode: AttemptMode, frozenAt: string, examId: ExamId,
): FrozenAttemptContent {
  validateAnswerKeyRevision(key, questions);
  validatePaperRevision(paper, questions, key);
  assertRevisionHashes(questions,key,paper);
  const display=selectDisplayResources(questions,stimuli,assets);
  const snapshot: AttemptSnapshot = {
    examId, paperId: paper.paperId, paperRevisionId: paper.id,
    answerKeyRevisionId: key.id, scoringPolicy: paper.scoring, mode,
  };
  return structuredClone({ schema: 2 as const, frozenAt, snapshot, paper, key, questions, ...display });
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
  return value;
}
export interface RestoredSession {
  readonly state: SessionState;
  readonly expired: boolean;
}
/**
 * On a file:// reopen, the saved clock origin is no longer a safe monotonic
 * source. Account for actual wall-clock absence without charging foreground
 * question time; paused attempts remain paused. Never extend a deadline.
 */
export function restoreSession(
  paper: PaperRevision, saved: SessionState, wallNowMs: number, visible: boolean,
): RestoredSession {
  if (!Number.isFinite(wallNowMs)) throw new Error("Invalid restoration time");
  const aligned = wallNowMs < saved.clockMs
    ? rebaseSession({ ...saved, visible: false }, wallNowMs)
    : transition(paper, { ...saved, visible: false }, { type: "TICK", nowMs: wallNowMs });
  return { state: { ...aligned, visible }, expired: aligned.status === "completed" };
}
export interface RecoveryCandidate {
  readonly id: string;
  readonly startedAt?: number | null;
  readonly finishedAt?: number | null;
  readonly updatedAt?: number | null;
  readonly schema?: number;
  readonly saveRevision?: number;
}
/** Terminal records win over stale in-progress mirrors for the same ID. */
export function chooseRecovered<T extends RecoveryCandidate>(stored: T | undefined, mirror: T | undefined): T | undefined {
  if (!stored) return mirror;
  if (!mirror || stored.id !== mirror.id) return stored;
  // Version precedence comes first: even a completed mirror can be stale when
  // another tab has already persisted a newer revision of the same attempt.
  if (Number.isSafeInteger(stored.saveRevision) && Number.isSafeInteger(mirror.saveRevision) &&
      (stored.saveRevision as number) >= (mirror.saveRevision as number)) return stored;
  if (stored.finishedAt && !mirror.finishedAt) return stored;
  if (mirror.finishedAt && !stored.finishedAt) return mirror;
  return (mirror.updatedAt ?? 0) > (stored.updatedAt ?? 0) ? mirror : stored;
}
