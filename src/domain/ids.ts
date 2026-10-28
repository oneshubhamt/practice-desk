/**
 * Branded identifiers prevent accidentally mixing IDs from different domain entities.
 * Validate IDs at external-data boundaries before assigning these types.
 */
declare const idBrand: unique symbol;
declare const hashBrand: unique symbol;

export type EntityId<Kind extends string> = string & {
  readonly [idBrand]: Kind;
};

export type ExamId = EntityId<"exam">;
export type PaperId = EntityId<"paper">;
export type PaperRevisionId = EntityId<"paper-revision">;
export type SectionId = EntityId<"section">;
export type QuestionId = EntityId<"question">;
export type QuestionRevisionId = EntityId<"question-revision">;
export type OptionId = EntityId<"option">;
export type MatchItemId = EntityId<"match-item">;
export type StimulusId = EntityId<"stimulus">;
export type AssetId = EntityId<"asset">;
export type TopicId = EntityId<"topic">;
export type AnswerKeyRevisionId = EntityId<"answer-key-revision">;
export type AttemptId = EntityId<"attempt">;

/** SHA-256 in a canonical, lowercase hexadecimal representation. */
export type ContentHash = string & {
  readonly [hashBrand]: "sha256";
};

export interface SourceReference {
  readonly title: string;
  readonly url: string;
}
