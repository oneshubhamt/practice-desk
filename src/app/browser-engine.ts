import { importCglBank } from "../content/import-cgl.js";
import { transition, startSession, rebaseSession } from "../engine/session.js";
import { scoreAttempt } from "../engine/scoring.js";
import { validateResponse } from "../engine/response.js";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import type { PaperRevision } from "../domain/exam.js";
import type { SessionState, SessionEvent } from "../engine/session.js";
import type { AttemptResponseRecord } from "../domain/attempt.js";
import type { QuestionRevision } from "../domain/question.js";

interface LegacyAttempt {
  paperId: string;
  mode: "strict" | "free" | "single";
  singleSection: number;
  startedAt: number;
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  section: number;
  cursors: number[];
  engineState?: SessionState;
  enginePaperRevisionId?: string;
}
export function createBrowserEngine(sources: SourcePaperBank, patches: ReviewPatchBank) {
  const imported = importCglBank(sources, patches);
  const editions = new Map(imported.map(e => [
    e.paper.paperId + (e.paper.edition === "reviewed" ? "-reviewed" : ""), e,
  ]));
  function context(attempt: LegacyAttempt) {
    const base = editions.get(attempt.paperId);
    if (!base) throw new Error("Unknown paper edition");
    const paper: PaperRevision = attempt.mode === "strict" ? base.paper : {
      ...base.paper,
      sections: attempt.mode === "single" ? [base.paper.sections[attempt.singleSection]!] : base.paper.sections,
      timing: { kind: "whole-paper", durationMs: attempt.mode === "single" ? 900000 : 3600000, pausePolicy: "allowed" },
      navigation: { ...base.paper.navigation, sectionNavigation: attempt.mode === "free" ? "free" : "sequential-locked" },
    };
    return { ...base, paper };
  }
  function responseRecords(a: LegacyAttempt): AttemptResponseRecord[] {
    const { questions } = context(a);
    return questions.filter(q => {
      const n = Number(q.questionId.split(":").at(-1));
      return a.answers[n] || a.flags[n];
    }).map(q => {
      const n = Number(q.questionId.split(":").at(-1));
      const letter = a.answers[n];
      return { questionRevisionId: q.id, flagged: Boolean(a.flags[n]), timeSpentMs: 0, answerChangeCount: 0,
        ...(letter && q.content.kind === "single-choice"
          ? { response: { kind: "single-choice" as const, optionId: q.content.options["abcd".indexOf(letter)]!.id } }
          : {}) };
    });
  }
  function ensure(a: LegacyAttempt, nowMs: number): SessionState {
    const { paper } = context(a);
    if (a.engineState && a.enginePaperRevisionId === paper.id) return a.engineState;
    let state = startSession(paper, a.startedAt);
    const sectionIndex = a.mode === "single" ? 0 : a.section;
    state = { ...state, sectionIndex, questionIndex: a.cursors[a.section] ?? 0, responses: responseRecords(a),
      // Existing attempts have wall-clock start times, not a monotonic-origin snapshot.
      elapsedMs: Math.max(0, nowMs - a.startedAt), clockMs: nowMs };
    a.engineState = state;
    a.enginePaperRevisionId = paper.id;
    return state;
  }
  function event(a: LegacyAttempt, event: SessionEvent): SessionState {
    const { paper } = context(a);
    const current = ensure(a, event.nowMs);
    const next = transition(paper, current, event);
    a.engineState = next;
    return next;
  }
  function answer(a: LegacyAttempt, letter: string, nowMs: number): boolean {
    const { questions, paper } = context(a);
    const current = ensure(a, nowMs);
    const id = paper.sections[current.sectionIndex]?.questionRevisionIds[current.questionIndex];
    const question = questions.find(q => q.id === id);
    if (!question || question.content.kind !== "single-choice") return false;
    const index = "abcd".indexOf(letter);
    const option = question.content.options[index];
    if (!option) return false;
    const response = { kind: "single-choice" as const, optionId: option.id };
    validateResponse(question, response);
    const next = event(a, { type: "ANSWER", nowMs, response });
    return next !== current && next.status === "running";
  }
  function score(a: LegacyAttempt, calculatedAt: string) {
    const { paper, key, questions } = context(a);
    return scoreAttempt(paper, key, questions, responseRecords(a), calculatedAt);
  }
  return { context, ensure, event, answer, score, importedCount: imported.length, questionCount: imported.reduce((n,e)=>n+e.questions.length,0) };
}
