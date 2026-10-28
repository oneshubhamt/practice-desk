import type { SourceReference } from "../domain/ids.js";

export type ChoiceKey = "a" | "b" | "c" | "d";
export type SourceEditorialStatus = "ok" | "caution" | "invalid";
export type ReviewEditorialStatus = "corrected" | "caution";
export type FourOptions = readonly [string, string, string, string];

export interface SourceQuestionImages {
  readonly stem?: string;
  readonly options?: Readonly<Record<string, string>>;
}

/** Faithful transcription layer: preserve source wording, options and published key. */
export interface SourceQuestion {
  readonly n: number;
  readonly stem: string;
  readonly opts: FourOptions;
  readonly key: ChoiceKey;
  readonly original: ChoiceKey;
  readonly status: SourceEditorialStatus;
  readonly review: string;
  readonly explanation: string;
  readonly images: SourceQuestionImages;
  readonly sourcePage: number;
  readonly edition: "original";
  readonly transcription: string;
  readonly sources?: readonly SourceReference[];
  readonly passageRef?: string;
}

export interface SourcePaper {
  readonly id: string;
  readonly date: string;
  readonly name: string;
  readonly kind: string;
  readonly questions: readonly SourceQuestion[];
  readonly passages: Readonly<Record<string, string>>;
}

export interface QuestionPatch {
  readonly stem?: string;
  readonly opts?: FourOptions;
  readonly key?: ChoiceKey;
  readonly status?: ReviewEditorialStatus;
  readonly review?: string;
  readonly explanation?: string;
  readonly revised?: boolean;
  readonly sources?: readonly SourceReference[];
}

export type SourcePaperBank = Readonly<Record<string, SourcePaper>>;
export type ReviewPatchBank = Readonly<Record<string, Readonly<Record<string, QuestionPatch>>>>;
export type SolutionBank = Readonly<Record<string, Readonly<Record<string, string>>>>;
