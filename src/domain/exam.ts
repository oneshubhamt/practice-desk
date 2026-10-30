import type {
  AnswerKeyRevisionId,
  ContentHash,
  ExamId,
  PaperId,
  PaperRevisionId,
  QuestionRevisionId,
  SectionId,
  SourceReference,
} from "./ids.js";
import type { ScoringPolicy, MarkingRule } from "./scoring.js";

export interface ExamDefinition {
  readonly id: ExamId;
  readonly title: string;
  readonly description?: string;
}

export type PaperSourceKind = "official" | "memory-based" | "custom";

export interface PaperDefinition {
  readonly id: PaperId;
  readonly examId: ExamId;
  readonly title: string;
  readonly sourceKind: PaperSourceKind;
  readonly sourceReferences?: readonly SourceReference[];
}

export interface SectionDefinition {
  readonly id: SectionId;
  readonly title: string;
  /** Ordered references to exact question revisions, never mutable question aliases. */
  readonly questionRevisionIds: readonly QuestionRevisionId[];
  readonly scoringOverride?: MarkingRule;
}

export type PausePolicy = "allowed" | "forbidden";

export interface SectionTimeLimit {
  readonly sectionId: SectionId;
  /** Null explicitly means this section is untimed within a sectional paper. */
  readonly durationMs: number | null;
}

export type TimingPolicy =
  | { readonly kind: "untimed" }
  | {
      readonly kind: "whole-paper";
      readonly durationMs: number;
      readonly pausePolicy: PausePolicy;
    }
  | {
      readonly kind: "sectional";
      readonly sectionLimits: readonly SectionTimeLimit[];
      /** At expiry automatic moves immediately; manual freezes the section and
       * awaits an explicit advance with no further time/response consumption. */
      readonly transition: "manual" | "automatic";
      readonly allowEarlySubmit: boolean;
      readonly pausePolicy: PausePolicy;
    };

export interface NavigationPolicy {
  readonly questionNavigation: "free" | "forward-only";
  readonly sectionNavigation: "free" | "sequential-locked";
  readonly allowFlagging: boolean;
  /** Post-completion detailed question/answer/solution disclosure.
   * Exam-time revisiting is controlled only by questionNavigation.
   * Numerical results and the question timing ledger remain available. */
  readonly allowReview: boolean;
}

export type PaperEdition = "source" | "reviewed" | "custom";

export interface PaperRevision {
  /** Immutable identity for a paper's exact structure and rules. */
  readonly id: PaperRevisionId;
  readonly paperId: PaperId;
  readonly revision: number;
  readonly contentHash: ContentHash;
  readonly edition: PaperEdition;
  readonly sections: readonly SectionDefinition[];
  /** Pins the exact key used to score attempts on this paper revision. */
  readonly answerKeyRevisionId: AnswerKeyRevisionId;
  readonly timing: TimingPolicy;
  readonly navigation: NavigationPolicy;
  readonly scoring: ScoringPolicy;
  readonly createdAt?: string;
}
