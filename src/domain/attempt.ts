import type {
  AnswerKeyRevisionId,
  AttemptId,
  ExamId,
  PaperId,
  PaperRevisionId,
  QuestionRevisionId,
} from "./ids.js";
import type { ScoringPolicy } from "./scoring.js";
import type { CandidateResponse } from "./question.js";

export type AttemptMode =
  | "exam-simulation"
  | "full-paper-practice"
  | "section-practice"
  | "custom-practice";

export type AttemptStatus = "in-progress" | "completed" | "abandoned";

/**
 * Frozen references and rules captured at attempt start.
 * Historical attempts must never be silently re-scored with today's paper or key.
 */
export interface AttemptSnapshot {
  readonly examId: ExamId;
  readonly paperId: PaperId;
  readonly paperRevisionId: PaperRevisionId;
  readonly answerKeyRevisionId: AnswerKeyRevisionId;
  readonly scoringPolicy: ScoringPolicy;
  readonly mode: AttemptMode;
}

export interface AttemptResponseRecord {
  readonly questionRevisionId: QuestionRevisionId;
  /** Missing response means unanswered; it is not a special answer value. */
  readonly response?: CandidateResponse;
  readonly flagged: boolean;
  /** Cumulative foreground time for this question, in milliseconds. */
  readonly timeSpentMs: number;
  readonly firstViewedAt?: string;
  readonly firstAnsweredAt?: string;
  readonly answerChangeCount: number;
}

export interface AttemptScoreSnapshot {
  readonly earnedMarks: number;
  readonly positiveMarks: number;
  /** Penalty magnitude, stored as a non-negative number for clear reporting. */
  readonly penaltyMarks: number;
  readonly correctCount: number;
  readonly incorrectCount: number;
  readonly unansweredCount: number;
  readonly excludedCount: number;
  readonly calculatedAt: string;
}

export interface AttemptRecord {
  readonly id: AttemptId;
  readonly snapshot: AttemptSnapshot;
  readonly status: AttemptStatus;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly responses: readonly AttemptResponseRecord[];
  readonly scoreSnapshot?: AttemptScoreSnapshot;
}
