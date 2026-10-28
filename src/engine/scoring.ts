import type { AnswerKeyRevision, CorrectAnswer } from "../domain/answer-key.js";
import type { AttemptResponseRecord, AttemptScoreSnapshot } from "../domain/attempt.js";
import type { PaperRevision } from "../domain/exam.js";
import type { CandidateResponse, QuestionRevision } from "../domain/question.js";
import type { MarkingRule } from "../domain/scoring.js";
import type { QuestionRevisionId } from "../domain/ids.js";

export type Verdict = "correct" | "incorrect" | "unanswered" | "excluded" | "pending";
export interface ItemScore { readonly questionRevisionId: QuestionRevisionId; readonly verdict: Verdict; readonly marks: number; }
export interface ScoreResult { readonly items: readonly ItemScore[]; readonly snapshot: AttemptScoreSnapshot; }

function equal(a: CorrectAnswer, b: CandidateResponse): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "single-choice": return b.kind === a.kind && a.optionId === b.optionId;
    case "multiple-select": return b.kind === a.kind && a.optionIds.length === b.optionIds.length &&
      new Set(b.optionIds).size === b.optionIds.length && a.optionIds.every(id => b.optionIds.includes(id));
    case "numeric-entry": return b.kind === a.kind && Number.isFinite(b.value) &&
      a.acceptedValues.some(value => Math.abs(value - b.value) <= Math.max(a.absoluteTolerance ?? 0, (a.relativeTolerance ?? 0) * Math.abs(value)));
    case "true-false": return b.kind === a.kind && a.value === b.value;
    case "matching": return b.kind === a.kind && a.pairs.length === b.pairs.length &&
      new Set(b.pairs.map(p => p.leftId)).size === b.pairs.length &&
      a.pairs.every(pair => b.pairs.some(candidate => candidate.leftId === pair.leftId && candidate.rightId === pair.rightId));
    case "free-response": return false;
  }
}
function componentMarks(answer: CorrectAnswer, response: CandidateResponse, rule: MarkingRule): number | null {
  const partial = rule.partialCredit;
  if (!partial || answer.kind !== response.kind) return null;
  if (answer.kind === "multiple-select" && response.kind === "multiple-select") {
    const selected = new Set(response.optionIds);
    if (selected.size !== response.optionIds.length) throw new Error("Duplicate selected option");
    const correct = response.optionIds.filter(id => answer.optionIds.includes(id)).length;
    return correct * partial.marksPerCorrectComponent - (selected.size - correct) * (partial.penaltyPerIncorrectComponent ?? 0);
  }
  if (answer.kind === "matching" && response.kind === "matching") {
    if (new Set(response.pairs.map(p => p.leftId)).size !== response.pairs.length) throw new Error("Duplicate matching left item");
    const correct = response.pairs.filter(pair => answer.pairs.some(a => a.leftId === pair.leftId && a.rightId === pair.rightId)).length;
    return correct * partial.marksPerCorrectComponent - (response.pairs.length - correct) * (partial.penaltyPerIncorrectComponent ?? 0);
  }
  return null;
}
export function scoreAttempt(paper: PaperRevision, key: AnswerKeyRevision, questions: readonly QuestionRevision[], responses: readonly AttemptResponseRecord[], calculatedAt: string): ScoreResult {
  if (paper.answerKeyRevisionId !== key.id || paper.paperId !== key.paperId) throw new Error("Answer key does not match paper revision");
  const questionMap = new Map(questions.map(q => [q.id, q]));
  const answerMap = new Map(key.entries.map(e => [e.questionRevisionId, e]));
  const responseMap = new Map(responses.map(r => [r.questionRevisionId, r]));
  const ids = paper.sections.flatMap(s => s.questionRevisionIds);
  if (new Set(ids).size !== ids.length || responseMap.size !== responses.length) throw new Error("Duplicate question or response");
  if (responses.some(r => !ids.includes(r.questionRevisionId))) throw new Error("Response references question outside paper");
  const items: ItemScore[] = [];
  let earnedMarks = 0, positiveMarks = 0, penaltyMarks = 0;
  let correctCount = 0, incorrectCount = 0, unansweredCount = 0, excludedCount = 0;
  for (const section of paper.sections) for (const id of section.questionRevisionIds) {
    const question = questionMap.get(id);
    const entry = answerMap.get(id);
    if (!question || !entry) throw new Error("Missing question or answer key entry");
    const rule = entry.scoringOverride ?? section.scoringOverride ?? paper.scoring.byQuestionKind?.[question.content.kind] ?? paper.scoring.defaultRule;
    const response = responseMap.get(id)?.response;
    if (response && response.kind !== question.content.kind) throw new Error("Response kind mismatch");
    let verdict: Verdict;
    let marks: number;
    if (["invalid", "incomplete-source", "under-review", "superseded"].includes(question.editorial.status)) { verdict = "excluded"; marks = 0; excludedCount++; }
    else if (!response) { verdict = "unanswered"; marks = rule.unansweredMarks; unansweredCount++; }
    else if (entry.answer.kind === "free-response") { verdict = "pending"; marks = 0; }
    else if (equal(entry.answer, response)) { verdict = "correct"; marks = rule.correctMarks; correctCount++; }
    else {
      verdict = "incorrect"; incorrectCount++;
      const partial = componentMarks(entry.answer, response, rule);
      marks = partial === null ? rule.incorrectMarks : (rule.partialCredit?.floorAtZero ? Math.max(0, partial) : partial);
    }
    earnedMarks += marks;
    positiveMarks += Math.max(0, marks);
    penaltyMarks += Math.max(0, -marks);
    items.push({ questionRevisionId: id, verdict, marks });
  }
  return { items, snapshot: { earnedMarks, positiveMarks, penaltyMarks, correctCount, incorrectCount, unansweredCount, excludedCount, calculatedAt } };
}
