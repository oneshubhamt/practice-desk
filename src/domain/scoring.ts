import type { QuestionKind } from "./question.js";

/**
 * Marks are explicit policy data, not constants embedded in the exam engine.
 * Negative marks are represented as negative numbers.
 */
export interface MarkingRule {
  readonly correctMarks: number;
  readonly incorrectMarks: number;
  readonly unansweredMarks: number;
  readonly partialCredit?: {
    readonly kind: "per-correct-component";
    readonly marksPerCorrectComponent: number;
    readonly penaltyPerIncorrectComponent?: number;
    readonly floorAtZero?: boolean;
  };
}

export interface ScoringPolicy {
  readonly defaultRule: MarkingRule;
  readonly byQuestionKind?: Partial<Record<QuestionKind, MarkingRule>>;
  /** Number of decimal places used when presenting a computed score. */
  readonly decimalPlaces?: number;
}
