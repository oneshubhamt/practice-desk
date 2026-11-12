import type {
  AnswerKeyRevisionId,
  AttemptId,
  ExamId,
  PaperId,
  PaperRevisionId,
  QuestionRevisionId,
} from "./ids.js";
import type { ScoringPolicy } from "./scoring.js";
import type { CandidateResponse, ImageAsset, QuestionRevision, StimulusDefinition } from "./question.js";
import type { PaperRevision } from "./exam.js";
import type { AnswerKeyRevision } from "./answer-key.js";

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
  /** Accumulated foreground milliseconds on the first cursor visit. */
  readonly firstVisitMs:number;
  /** Foreground time across visits before the first committed answer. */
  readonly preFirstAnswerMs:number;
  readonly firstAnsweredAt?: string;
  readonly answerChangeCount: number;
  /** Explicit response sequence, when captured. Mock history stores the choices,
   * not a claim about why a changed answer improved or worsened.
   */
  readonly answerEvents?: readonly {
    readonly at: string;
    readonly from?: CandidateResponse;
    readonly to?: CandidateResponse;
  }[];
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


/** Immutable paper/key/resources captured for one attempt. */
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

/** User-entered assessment only; never mutates the machine-scored snapshot. */
export interface ManualGrade {
  readonly questionRevisionId: QuestionRevisionId;
  readonly marks: number;
  readonly note: string;
  readonly gradedAt: string;
}

export interface PracticeFilters {
  readonly sectionId?: string;
  readonly topicId?: string;
  readonly difficulty?: string;
}

/** Frozen provenance for a generated practice subset. */
export interface PracticeComposition {
  readonly schema: 1;
  readonly sourceExamId: string;
  readonly sourcePaperRevisionId: string;
  readonly sourcePaperHash: string;
  readonly sourceAnswerKeyRevisionId: string;
  readonly sourceAnswerKeyHash: string;
  readonly seed: string;
  readonly filters: PracticeFilters;
  readonly eligibleCount: number;
  readonly selectedQuestionRevisionIds: readonly string[];
  readonly selectedQuestionHashes: readonly string[];
  readonly generatedPaperRevisionId: string;
  readonly generatedAnswerKeyRevisionId: string;
  readonly contentHash: string;
}

export interface RevisionSelectionProvenance {
  readonly schema: 1;
  readonly examId: string;
  readonly reasons: readonly ("wrong"|"blank"|"slow"|"repeated"|"flagged"|"bookmarked"|"due")[];
  readonly eligibleCount: number;
  readonly selectedQuestionIds: readonly string[];
}

/** Frozen lineage from notebook questions back to their source attempts. */
export interface NotebookLineage {
  readonly schema: 1;
  readonly selection?: RevisionSelectionProvenance;
  readonly entries: readonly {
    readonly cardId: string;
    readonly questionRevisionId: string;
    readonly sourceAttemptId: string;
    readonly sourcePaperId: string;
    readonly sourcePaperEdition: string;
    readonly sourceSectionTitle: string;
  }[];
  readonly contentHash: string;
}
