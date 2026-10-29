import type {
  AssetId,
  ContentHash,
  MatchItemId,
  OptionId,
  QuestionId,
  QuestionRevisionId,
  StimulusId,
  SourceReference,
  TopicId,
} from "./ids.js";

export const QUESTION_KINDS = [
  "single-choice",
  "multiple-select",
  "numeric-entry",
  "true-false",
  "matching",
  "free-response",
] as const;

export type QuestionKind = (typeof QUESTION_KINDS)[number];

export type EditorialStatus =
  | "draft"
  | "verified"
  | "corrected"
  | "caution"
  | "under-review"
  | "invalid"
  | "incomplete-source"
  | "superseded";

export type EditorialChange =
  | "wording"
  | "options"
  | "answer-key"
  | "figure"
  | "explanation"
  | "source-correction"
  | "formatting";

export interface EditorialRecord {
  readonly status: EditorialStatus;
  readonly notes?: string;
  /** Page of the transcribed source document, if known; not an invented URL. */
  readonly sourcePage?: number;
  readonly changes?: readonly EditorialChange[];
  readonly sources?: readonly SourceReference[];
}

export interface QuestionOption {
  /** Stable within the option's semantic identity; never use display position as an ID. */
  readonly id: OptionId;
  readonly text: string;
  readonly assetIds?: readonly AssetId[];
}

interface QuestionContentBase {
  readonly prompt: string;
  /** Shared passage, case, table or chart; kept outside the question to avoid duplication. */
  readonly stimulusId?: StimulusId;
  readonly assetIds?: readonly AssetId[];
  readonly topicIds?: readonly TopicId[];
  readonly tags?: readonly string[];
}

export type QuestionContent =
  | (QuestionContentBase & {
      readonly kind: "single-choice";
      readonly options: readonly QuestionOption[];
    })
  | (QuestionContentBase & {
      readonly kind: "multiple-select";
      readonly options: readonly QuestionOption[];
      readonly minSelections?: number;
      readonly maxSelections?: number;
    })
  | (QuestionContentBase & {
      readonly kind: "numeric-entry";
      readonly numericRules: {
        readonly minimum?: number;
        readonly maximum?: number;
        readonly decimalPlaces?: number;
        readonly allowNegative?: boolean;
      };
    })
  | (QuestionContentBase & {
      readonly kind: "true-false";
    })
  | (QuestionContentBase & {
      readonly kind: "matching";
      readonly leftItems: readonly MatchItem[];
      readonly rightItems: readonly MatchItem[];
    })
  | (QuestionContentBase & {
      readonly kind: "free-response";
      readonly responseRules: {
        readonly minWords?: number;
        readonly maxWords?: number;
      };
    });

export interface MatchItem {
  readonly id: MatchItemId;
  readonly text: string;
  readonly assetIds?: readonly AssetId[];
}

export interface QuestionRevision {
  /** Immutable identity for this exact wording/options/media revision. */
  readonly id: QuestionRevisionId;
  /** Stable identity linking editorial revisions of the same underlying question. */
  readonly questionId: QuestionId;
  readonly revision: number;
  readonly contentHash: ContentHash;
  readonly content: QuestionContent;
  readonly editorial: EditorialRecord;
}

export type StimulusDefinition =
  | {
      readonly id: StimulusId;
      readonly kind: "passage" | "case";
      readonly title?: string;
      readonly text: string;
      readonly assetIds?: readonly AssetId[];
    }
  | {
      readonly id: StimulusId;
      readonly kind: "table";
      readonly title?: string;
      readonly columns: readonly string[];
      readonly rows: readonly (readonly string[])[];
    }
  | {
      readonly id: StimulusId;
      readonly kind: "chart" | "image";
      readonly title?: string;
      readonly assetId: AssetId;
      readonly altText: string;
      readonly caption?: string;
    };

export type ImageMediaType =
  | "image/avif"
  | "image/webp"
  | "image/png"
  | "image/jpeg"
  | "image/gif";

/** Assets are separate from question wording and can be deduplicated by contentHash. */
export interface ImageAsset {
  readonly id: AssetId;
  readonly mediaType: ImageMediaType;
  /** Packaged data URI: released tests must not need network access to render it. */
  readonly dataUri: string;
  readonly contentHash: ContentHash;
  readonly altText?: string;
}

export type CandidateResponse =
  | { readonly kind: "single-choice"; readonly optionId: OptionId }
  | { readonly kind: "multiple-select"; readonly optionIds: readonly OptionId[] }
  | { readonly kind: "numeric-entry"; readonly value: number }
  | { readonly kind: "true-false"; readonly value: boolean }
  | { readonly kind: "matching"; readonly pairs: readonly MatchingPair[] }
  | { readonly kind: "free-response"; readonly text: string };

export interface MatchingPair {
  readonly leftId: MatchItemId;
  readonly rightId: MatchItemId;
}
