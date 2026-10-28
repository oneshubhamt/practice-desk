import type {
  AnswerKeyRevisionId,
  ContentHash,
  MatchItemId,
  PaperId,
  QuestionRevisionId,
  OptionId,
} from "./ids.js";
import type { MarkingRule } from "./scoring.js";

export type CorrectAnswer =
  | { readonly kind: "single-choice"; readonly optionId: OptionId }
  | { readonly kind: "multiple-select"; readonly optionIds: readonly OptionId[] }
  | {
      readonly kind: "numeric-entry";
      readonly acceptedValues: readonly number[];
      readonly absoluteTolerance?: number;
      readonly relativeTolerance?: number;
    }
  | { readonly kind: "true-false"; readonly value: boolean }
  | { readonly kind: "matching"; readonly pairs: readonly CorrectMatchingPair[] }
  | { readonly kind: "free-response"; readonly evaluation: "manual"; readonly rubricId?: string };

export interface CorrectMatchingPair {
  readonly leftId: MatchItemId;
  readonly rightId: MatchItemId;
}

export interface AnswerKeyEntry {
  readonly questionRevisionId: QuestionRevisionId;
  readonly answer: CorrectAnswer;
  /** Explicit override for questions with special marking rules. */
  readonly scoringOverride?: MarkingRule;
}

export interface AnswerKeyRevision {
  /** Immutable key identity; changing a key creates a new revision. */
  readonly id: AnswerKeyRevisionId;
  readonly paperId: PaperId;
  readonly revision: number;
  readonly contentHash: ContentHash;
  readonly entries: readonly AnswerKeyEntry[];
}
