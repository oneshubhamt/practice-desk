import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAnswerKeyRevision,
  validatePaperRevision,
  validateQuestionRevision,
} from "../src/domain/validate.ts";

const hash = "a".repeat(64);
const question = (overrides = {}) => ({
  id: "question-rev-1",
  questionId: "question-1",
  revision: 1,
  contentHash: hash,
  content: {
    kind: "single-choice",
    prompt: "Which option is correct?",
    options: [
      { id: "option-a", text: "A" },
      { id: "option-b", text: "B" },
    ],
  },
  editorial: { status: "verified" },
  ...overrides,
});
const scoring = {
  defaultRule: { correctMarks: 2, incorrectMarks: -0.5, unansweredMarks: 0 },
};
const paper = (overrides = {}) => ({
  id: "paper-rev-1",
  paperId: "paper-1",
  revision: 1,
  contentHash: hash,
  edition: "reviewed",
  answerKeyRevisionId: "key-rev-1",
  sections: [{ id: "section-1", title: "Section 1", questionRevisionIds: ["question-rev-1"] }],
  timing: { kind: "sectional", sectionLimits: [{ sectionId: "section-1", durationMs: 900000 }], transition: "manual", allowEarlySubmit: true, pausePolicy: "forbidden" },
  navigation: { questionNavigation: "free", sectionNavigation: "sequential-locked", allowFlagging: true, allowReview: true },
  scoring,
  ...overrides,
});
const answerKey = (overrides = {}) => ({
  id: "key-rev-1",
  paperId: "paper-1",
  revision: 1,
  contentHash: hash,
  entries: [{ questionRevisionId: "question-rev-1", answer: { kind: "single-choice", optionId: "option-b" } }],
  ...overrides,
});

test("accepts a valid question, paper revision and matching answer key", () => {
  const q = validateQuestionRevision(question());
  const key = validateAnswerKeyRevision(answerKey(), [q]);
  const p = validatePaperRevision(paper(), [q], key);
  assert.equal(p.sections[0].questionRevisionIds[0], q.id);
  assert.equal(key.entries[0].answer.optionId, "option-b");
});

test("rejects duplicate option identities and malformed hashes", () => {
  const duplicateOptions = question({
    content: { kind: "single-choice", prompt: "Choose", options: [{ id: "same", text: "A" }, { id: "same", text: "B" }] },
  });
  assert.throws(() => validateQuestionRevision(duplicateOptions), /duplicate identifier/);
  assert.throws(() => validateQuestionRevision(question({ contentHash: "not-a-hash" })), /SHA-256/);
});

test("rejects incompatible answer kinds and unknown option IDs", () => {
  const q = validateQuestionRevision(question());
  assert.throws(() => validateAnswerKeyRevision(answerKey({
    entries: [{ questionRevisionId: q.id, answer: { kind: "single-choice", optionId: "not-an-option" } }],
  }), [q]), /unknown option/);
  assert.throws(() => validateAnswerKeyRevision(answerKey({
    entries: [{ questionRevisionId: q.id, answer: { kind: "true-false", value: true } }],
  }), [q]), /does not match question kind/);
});

test("rejects duplicate section membership and missing sectional limits", () => {
  const q = validateQuestionRevision(question());
  const duplicated = paper({
    sections: [
      { id: "section-1", title: "One", questionRevisionIds: [q.id] },
      { id: "section-2", title: "Two", questionRevisionIds: [q.id] },
    ],
    timing: { kind: "untimed" },
  });
  assert.throws(() => validatePaperRevision(duplicated, [q]), /multiple sections/);
  assert.throws(() => validatePaperRevision(paper({
    timing: { kind: "sectional", sectionLimits: [], transition: "manual", allowEarlySubmit: true, pausePolicy: "forbidden" },
  }), [q]), /exactly one limit/);
});

test("rejects scoring rules with a positive wrong-answer penalty", () => {
  const q = validateQuestionRevision(question());
  assert.throws(() => validatePaperRevision(paper({
    scoring: { defaultRule: { correctMarks: 2, incorrectMarks: 0.5, unansweredMarks: 0 } },
  }), [q]), /non-positive/);
});

test("rejects an answer key that omits a question in the paper", () => {
  const q = validateQuestionRevision(question());
  const key = validateAnswerKeyRevision(answerKey({ entries: [] }), [q]);
  assert.throws(() => validatePaperRevision(paper(), [q], key), /missing answer-key entry/);
});
