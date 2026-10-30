import type { AnswerKeyRevision } from "./answer-key.js";
import type { ExamDefinition, PaperRevision, SectionDefinition } from "./exam.js";
import type { QuestionRevision } from "./question.js";

const QUESTION_KINDS = [
  "single-choice", "multiple-select", "numeric-entry", "true-false", "matching", "free-response",
] as const;
import type { MarkingRule, ScoringPolicy } from "./scoring.js";

type RecordValue = Record<string, unknown>;

function record(value: unknown, path: string): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(path + ": expected an object");
  }
  return value as RecordValue;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(path + ": expected a non-empty string");
  }
  return value;
}

function finite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(path + ": expected a finite number");
  }
  return value;
}

function positiveInteger(value: unknown, path: string): number {
  const number = finite(value, path);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(path + ": expected a positive safe integer");
  }
  return number;
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(path + ": expected an array");
  return value.map((item, index) => text(item, path + "[" + index + "]"));
}

function unique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) throw new Error(path + ": duplicate identifier");
}

function hash(value: unknown, path: string): void {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(path + ": expected a lowercase SHA-256 hex digest");
  }
}

function oneOf<T extends string>(value: unknown, values: readonly T[], path: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(path + ": unsupported value");
  }
  return value as T;
}

function validateSourceReferences(value: unknown, path: string): void {
  if (!Array.isArray(value)) throw new Error(path + ": expected an array");
  value.forEach((item, index) => {
    const source = record(item, path + "[" + index + "]");
    text(source["title"], path + "[" + index + "].title");
    const url = text(source["url"], path + "[" + index + "].url");
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error(path + "[" + index + "].url: invalid URL"); }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(path + "[" + index + "].url: only http(s) URLs are allowed");
    }
  });
}

const EDITORIAL_STATUSES = [
  "draft", "verified", "corrected", "caution", "under-review", "invalid",
  "incomplete-source", "superseded",
] as const;
const EDITORIAL_CHANGES = [
  "wording", "options", "answer-key", "figure", "explanation", "source-correction", "formatting",
] as const;

export function validateExamDefinition(value: unknown): ExamDefinition {
  const exam = record(value, "exam");
  text(exam["id"], "exam.id");
  text(exam["title"], "exam.title");
  if (exam["description"] !== undefined && typeof exam["description"] !== "string") {
    throw new Error("exam.description: expected a string");
  }
  return exam as unknown as ExamDefinition;
}

export function validateQuestionRevision(value: unknown): QuestionRevision {
  const question = record(value, "question");
  text(question["id"], "question.id");
  text(question["questionId"], "question.questionId");
  positiveInteger(question["revision"], "question.revision");
  hash(question["contentHash"], "question.contentHash");

  const content = record(question["content"], "question.content");
  const kind = oneOf(content["kind"], QUESTION_KINDS, "question.content.kind");
  text(content["prompt"], "question.content.prompt");
  if (content["stimulusId"] !== undefined) text(content["stimulusId"], "question.content.stimulusId");
  for (const field of ["assetIds", "topicIds", "tags"] as const) {
    if (content[field] !== undefined) {
      const values = stringArray(content[field], "question.content." + field);
      if (field !== "tags") unique(values, "question.content." + field);
    }
  }

  if (kind === "single-choice" || kind === "multiple-select") {
    const options = content["options"];
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error("question.content.options: expected at least two options");
    }
    const ids: string[] = [];
    options.forEach((item, index) => {
      const path = "question.content.options[" + index + "]";
      const option = record(item, path);
      ids.push(text(option["id"], path + ".id"));
      text(option["text"], path + ".text");
      if (option["assetIds"] !== undefined) stringArray(option["assetIds"], path + ".assetIds");
    });
    unique(ids, "question.content.options");
    if (kind === "multiple-select") {
      const min = content["minSelections"] === undefined ? 1 : positiveInteger(content["minSelections"], "question.content.minSelections");
      const max = content["maxSelections"] === undefined ? options.length : positiveInteger(content["maxSelections"], "question.content.maxSelections");
      if (min > max || max > options.length) throw new Error("question.content: invalid selection bounds");
    }
  } else if (kind === "numeric-entry") {
    const rules = record(content["numericRules"], "question.content.numericRules");
    for (const field of ["minimum", "maximum"] as const) {
      if (rules[field] !== undefined) finite(rules[field], "question.content.numericRules." + field);
    }
    if (typeof rules["minimum"] === "number" && typeof rules["maximum"] === "number" && rules["minimum"] > rules["maximum"]) {
      throw new Error("question.content.numericRules: minimum exceeds maximum");
    }
    if (rules["decimalPlaces"] !== undefined) {
      const places = finite(rules["decimalPlaces"], "question.content.numericRules.decimalPlaces");
      if (!Number.isSafeInteger(places) || places < 0 || places > 15) throw new Error("question.content.numericRules.decimalPlaces: expected integer from 0 to 15");
    }
    if (rules["allowNegative"] !== undefined && typeof rules["allowNegative"] !== "boolean") {
      throw new Error("question.content.numericRules.allowNegative: expected a boolean");
    }
  } else if (kind === "matching") {
    for (const side of ["leftItems", "rightItems"] as const) {
      const items = content[side];
      if (!Array.isArray(items) || items.length === 0) throw new Error("question.content." + side + ": expected a non-empty array");
      const ids: string[] = [];
      items.forEach((item, index) => {
        const path = "question.content." + side + "[" + index + "]";
        const matchItem = record(item, path);
        ids.push(text(matchItem["id"], path + ".id"));
        text(matchItem["text"], path + ".text");
      });
      unique(ids, "question.content." + side);
    }
  } else if (kind === "free-response") {
    const rules = record(content["responseRules"], "question.content.responseRules");
    for (const field of ["minWords", "maxWords"] as const) {
      if (rules[field] !== undefined) positiveInteger(rules[field], "question.content.responseRules." + field);
    }
    if (typeof rules["minWords"] === "number" && typeof rules["maxWords"] === "number" && rules["minWords"] > rules["maxWords"]) {
      throw new Error("question.content.responseRules: minWords exceeds maxWords");
    }
  }

  const editorial = record(question["editorial"], "question.editorial");
  oneOf(editorial["status"], EDITORIAL_STATUSES, "question.editorial.status");
  if (editorial["notes"] !== undefined && typeof editorial["notes"] !== "string") throw new Error("question.editorial.notes: expected a string");
  if (editorial["changes"] !== undefined) {
    if (!Array.isArray(editorial["changes"])) throw new Error("question.editorial.changes: expected an array");
    editorial["changes"].forEach((change, index) => oneOf(change, EDITORIAL_CHANGES, "question.editorial.changes[" + index + "]"));
  }
  if (editorial["sourcePage"] !== undefined) positiveInteger(editorial["sourcePage"],"question.editorial.sourcePage");
  if (editorial["sources"] !== undefined) validateSourceReferences(editorial["sources"], "question.editorial.sources");
  return question as unknown as QuestionRevision;
}

function validateMarkingRule(value: unknown, path: string): MarkingRule {
  const rule = record(value, path);
  const correct = finite(rule["correctMarks"], path + ".correctMarks");
  const incorrect = finite(rule["incorrectMarks"], path + ".incorrectMarks");
  const unanswered = finite(rule["unansweredMarks"], path + ".unansweredMarks");
  if (correct < 0) throw new Error(path + ".correctMarks: must be non-negative");
  if (incorrect > 0) throw new Error(path + ".incorrectMarks: must be non-positive");
  // A blank cannot outscore a fully correct answer or be punished more severely
  // than a wrong answer. Individual component penalties remain explicit.
  if (unanswered > correct || unanswered < incorrect) throw new Error(path + ".unansweredMarks: must lie between incorrectMarks and correctMarks");
  // Bounded imports avoid overflowing a 2,000-question score or its component ledger.
  if ([correct,incorrect,unanswered].some(mark => Math.abs(mark)>1000000))
    throw new Error(path + ": mark magnitudes must not exceed 1000000");
  if (rule["partialCredit"] !== undefined) {
    const partial = record(rule["partialCredit"], path + ".partialCredit");
    oneOf(partial["kind"], ["per-correct-component"] as const, path + ".partialCredit.kind");
    const component = finite(partial["marksPerCorrectComponent"], path + ".partialCredit.marksPerCorrectComponent");
    if (component < 0 || component > 1000000) {
      throw new Error(path + ".partialCredit.marksPerCorrectComponent: expected 0 to 1000000");
    }
    if (partial["penaltyPerIncorrectComponent"] !== undefined &&
        (finite(partial["penaltyPerIncorrectComponent"], path + ".partialCredit.penaltyPerIncorrectComponent") < 0 ||
         (partial["penaltyPerIncorrectComponent"] as number) > 1000000)) {
      throw new Error(path + ".partialCredit.penaltyPerIncorrectComponent: expected 0 to 1000000");
    }
    if (partial["floorAtZero"] !== undefined && typeof partial["floorAtZero"] !== "boolean") {
      throw new Error(path + ".partialCredit.floorAtZero: expected a boolean");
    }
  }
  return rule as unknown as MarkingRule;
}

function validateScoringPolicy(value: unknown, path: string): ScoringPolicy {
  const policy = record(value, path);
  validateMarkingRule(policy["defaultRule"], path + ".defaultRule");
  if (policy["byQuestionKind"] !== undefined) {
    const overrides = record(policy["byQuestionKind"], path + ".byQuestionKind");
    for (const [kind, rule] of Object.entries(overrides)) {
      oneOf(kind, QUESTION_KINDS, path + ".byQuestionKind key");
      validateMarkingRule(rule, path + ".byQuestionKind." + kind);
    }
  }
  if (policy["decimalPlaces"] !== undefined) {
    const places = finite(policy["decimalPlaces"], path + ".decimalPlaces");
    if (!Number.isSafeInteger(places) || places < 0 || places > 6) throw new Error(path + ".decimalPlaces: expected integer from 0 to 6");
  }
  return policy as unknown as ScoringPolicy;
}

export function validateAnswerKeyRevision(
  value: unknown,
  questions: readonly QuestionRevision[],
): AnswerKeyRevision {
  const key = record(value, "answerKey");
  text(key["id"], "answerKey.id");
  text(key["paperId"], "answerKey.paperId");
  positiveInteger(key["revision"], "answerKey.revision");
  hash(key["contentHash"], "answerKey.contentHash");
  if (!Array.isArray(key["entries"])) throw new Error("answerKey.entries: expected an array");

  const questionByRevision = new Map(questions.map(question => [question.id as string, question]));
  const seen = new Set<string>();
  key["entries"].forEach((rawEntry, index) => {
    const path = "answerKey.entries[" + index + "]";
    const entry = record(rawEntry, path);
    const questionRevisionId = text(entry["questionRevisionId"], path + ".questionRevisionId");
    const question = questionByRevision.get(questionRevisionId);
    if (!question) throw new Error(path + ": references an unknown question revision");
    if (seen.has(questionRevisionId)) throw new Error(path + ": duplicate answer-key entry");
    seen.add(questionRevisionId);
    const answer = record(entry["answer"], path + ".answer");
    const expectedKind = question.content.kind;
    if (answer["kind"] !== expectedKind) throw new Error(path + ".answer.kind: does not match question kind");
    if (expectedKind === "single-choice") {
      const optionIds = question.content.kind === "single-choice" ? question.content.options.map(option => option.id as string) : [];
      if (!optionIds.includes(text(answer["optionId"], path + ".answer.optionId"))) throw new Error(path + ".answer.optionId: unknown option");
    } else if (expectedKind === "multiple-select") {
      const optionIds = question.content.kind === "multiple-select" ? question.content.options.map(option => option.id as string) : [];
      const selected = stringArray(answer["optionIds"], path + ".answer.optionIds");
      if (selected.length === 0) throw new Error(path + ".answer.optionIds: expected at least one option");
      unique(selected, path + ".answer.optionIds");
      if (selected.some(id => !optionIds.includes(id))) throw new Error(path + ".answer.optionIds: unknown option");
      if (question.content.kind === "multiple-select" &&
          (selected.length < (question.content.minSelections ?? 1) ||
           selected.length > (question.content.maxSelections ?? optionIds.length)))
        throw new Error(path + ".answer.optionIds: answer cardinality violates question selection bounds");
    } else if (expectedKind === "numeric-entry") {
      const accepted = answer["acceptedValues"];
      if (!Array.isArray(accepted) || accepted.length === 0) throw new Error(path + ".answer.acceptedValues: expected at least one value");
      accepted.forEach((number, valueIndex) => finite(number, path + ".answer.acceptedValues[" + valueIndex + "]"));
      for (const field of ["absoluteTolerance", "relativeTolerance"] as const) {
        if (answer[field] !== undefined && finite(answer[field], path + ".answer." + field) < 0) throw new Error(path + ".answer." + field + ": must be non-negative");
      }
    } else if (expectedKind === "true-false") {
      if (typeof answer["value"] !== "boolean") throw new Error(path + ".answer.value: expected a boolean");
    } else if (expectedKind === "matching") {
      const pairs = answer["pairs"];
      if (!Array.isArray(pairs)) throw new Error(path + ".answer.pairs: expected an array");
      const content = question.content.kind === "matching" ? question.content : undefined;
      const left = new Set(content?.leftItems.map(item => item.id as string) ?? []);
      const right = new Set(content?.rightItems.map(item => item.id as string) ?? []);
      const seenLeft: string[] = [], seenRight: string[] = [];
      pairs.forEach((rawPair, pairIndex) => {
        const pair = record(rawPair, path + ".answer.pairs[" + pairIndex + "]");
        const l = text(pair["leftId"], path + ".answer.pairs[" + pairIndex + "].leftId");
        const r = text(pair["rightId"], path + ".answer.pairs[" + pairIndex + "].rightId");
        if (!left.has(l) || !right.has(r)) {
          throw new Error(path + ".answer.pairs[" + pairIndex + "]: references an unknown match item");
        }
        seenLeft.push(l);seenRight.push(r);
      });
      unique(seenLeft, path + ".answer.pairs left");
      unique(seenRight, path + ".answer.pairs right");
      if (seenLeft.length === 0) throw new Error(path + ".answer.pairs: expected at least one pair");
    } else if (expectedKind === "free-response") {
      oneOf(answer["evaluation"], ["manual"] as const, path + ".answer.evaluation");
      if (answer["rubricId"] !== undefined) text(answer["rubricId"], path + ".answer.rubricId");
    }
    if (entry["scoringOverride"] !== undefined) validateMarkingRule(entry["scoringOverride"], path + ".scoringOverride");
  });
  return key as unknown as AnswerKeyRevision;
}

export function validatePaperRevision(
  value: unknown,
  questions: readonly QuestionRevision[],
  answerKey?: AnswerKeyRevision,
): PaperRevision {
  const paper = record(value, "paperRevision");
  text(paper["id"], "paperRevision.id");
  const paperId = text(paper["paperId"], "paperRevision.paperId");
  positiveInteger(paper["revision"], "paperRevision.revision");
  hash(paper["contentHash"], "paperRevision.contentHash");
  oneOf(paper["edition"], ["source", "reviewed", "custom"] as const, "paperRevision.edition");
  const keyId = text(paper["answerKeyRevisionId"], "paperRevision.answerKeyRevisionId");
  if (!Array.isArray(paper["sections"]) || paper["sections"].length === 0) throw new Error("paperRevision.sections: expected a non-empty array");

  const questionByRevision = new Map(questions.map(question => [question.id as string, question]));
  const sectionIds: string[] = [];
  const includedQuestionIds = new Set<string>();
  paper["sections"].forEach((rawSection, index) => {
    const path = "paperRevision.sections[" + index + "]";
    const section = record(rawSection, path);
    sectionIds.push(text(section["id"], path + ".id"));
    text(section["title"], path + ".title");
    const ids = stringArray(section["questionRevisionIds"], path + ".questionRevisionIds");
    if (ids.length === 0) throw new Error(path + ".questionRevisionIds: section must contain questions");
    unique(ids, path + ".questionRevisionIds");
    ids.forEach(id => {
      if (!questionByRevision.has(id)) throw new Error(path + ": references an unknown question revision");
      if (includedQuestionIds.has(id)) throw new Error(path + ": question revision occurs in multiple sections");
      includedQuestionIds.add(id);
    });
    if (section["scoringOverride"] !== undefined) validateMarkingRule(section["scoringOverride"], path + ".scoringOverride");
  });
  unique(sectionIds, "paperRevision.sections");

  const timing = record(paper["timing"], "paperRevision.timing");
  const timingKind = oneOf(timing["kind"], ["untimed", "whole-paper", "sectional"] as const, "paperRevision.timing.kind");
  if (timingKind === "whole-paper") {
    positiveInteger(timing["durationMs"], "paperRevision.timing.durationMs");
    oneOf(timing["pausePolicy"], ["allowed", "forbidden"] as const, "paperRevision.timing.pausePolicy");
  } else if (timingKind === "sectional") {
    oneOf(timing["transition"], ["manual", "automatic"] as const, "paperRevision.timing.transition");
    oneOf(timing["pausePolicy"], ["allowed", "forbidden"] as const, "paperRevision.timing.pausePolicy");
    if (typeof timing["allowEarlySubmit"] !== "boolean") throw new Error("paperRevision.timing.allowEarlySubmit: expected a boolean");
    if (!Array.isArray(timing["sectionLimits"])) throw new Error("paperRevision.timing.sectionLimits: expected an array");
    const limits = new Map<string, unknown>();
    timing["sectionLimits"].forEach((rawLimit, index) => {
      const path = "paperRevision.timing.sectionLimits[" + index + "]";
      const limit = record(rawLimit, path);
      const sectionId = text(limit["sectionId"], path + ".sectionId");
      if (limits.has(sectionId)) throw new Error(path + ": duplicate section time limit");
      if (limit["durationMs"] !== null) positiveInteger(limit["durationMs"], path + ".durationMs");
      limits.set(sectionId, limit["durationMs"]);
    });
    if (limits.size !== sectionIds.length || sectionIds.some(id => !limits.has(id))) {
      throw new Error("paperRevision.timing.sectionLimits: must define exactly one limit for every section");
    }
  }

  const navigation = record(paper["navigation"], "paperRevision.navigation");
  oneOf(navigation["questionNavigation"], ["free", "forward-only"] as const, "paperRevision.navigation.questionNavigation");
  oneOf(navigation["sectionNavigation"], ["free", "sequential-locked"] as const, "paperRevision.navigation.sectionNavigation");
  for (const field of ["allowFlagging", "allowReview"] as const) {
    if (typeof navigation[field] !== "boolean") throw new Error("paperRevision.navigation." + field + ": expected a boolean");
  }
  validateScoringPolicy(paper["scoring"], "paperRevision.scoring");

  if (answerKey !== undefined) {
    if (answerKey.id !== keyId) throw new Error("paperRevision.answerKeyRevisionId: does not match supplied answer key");
    if (answerKey.paperId !== paperId) throw new Error("paperRevision.paperId: does not match supplied answer key");
    const keyQuestions = new Set(answerKey.entries.map(entry => entry.questionRevisionId as string));
    for (const id of includedQuestionIds) {
      if (!keyQuestions.has(id)) throw new Error("paperRevision: missing answer-key entry for question revision " + id);
    }
  }
  return paper as unknown as PaperRevision;
}
