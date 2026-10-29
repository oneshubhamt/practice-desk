import { importCglBank } from "../content/import-cgl.ts";
import { transition, startSession } from "../engine/session.ts";
import { freezeAttempt, assertFrozenContent, restoreSession, chooseRecovered } from "../history/frozen.ts";
import type { FrozenAttemptContent } from "../history/frozen.ts";
import { scoreAttempt } from "../engine/scoring.ts";
import { makeBackup,verifyBackup,archiveDisplayRevision,planBackupMerge } from "../history/backup.ts";
import { validateResponse } from "../engine/response.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import type { PaperRevision } from "../domain/exam.js";
import type { SessionState, SessionEvent } from "../engine/session.ts";
import type { AttemptResponseRecord } from "../domain/attempt.js";
import type { QuestionRevision } from "../domain/question.js";
import type { ExamId } from "../domain/ids.js";

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
  frozen?: FrozenAttemptContent;
}
export function createBrowserEngine(sources: SourcePaperBank, patches: ReviewPatchBank) {
  const imported = importCglBank(sources, patches);
  const verifiedBundles = new WeakSet<object>();
  const editions = new Map(imported.map(e => [
    e.paper.paperId + (e.paper.edition === "reviewed" ? "-reviewed" : ""), e,
  ]));
  function context(attempt: LegacyAttempt) {
    if (attempt.frozen) {
      const frozen = attempt.frozen;
      if (!verifiedBundles.has(frozen)) { assertFrozenContent(frozen); verifiedBundles.add(frozen); }
      if (frozen.paper.paperId !== attempt.paperId.replace(/-reviewed$/, "")) throw new Error("Frozen paper identity mismatch");
      return frozen;
    }
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
  function capture(a: LegacyAttempt, wallNowMs: number): FrozenAttemptContent {
    if (!a.frozen) {
      const { paper, key, questions } = context(a);
      const mode = a.mode === "strict" ? "exam-simulation" : a.mode === "single" ? "section-practice" : "full-paper-practice";
      a.frozen = freezeAttempt(paper, key, questions, mode, new Date(wallNowMs).toISOString(), "ssc-cgl" as ExamId);
    }
    if (!verifiedBundles.has(a.frozen)) { assertFrozenContent(a.frozen); verifiedBundles.add(a.frozen); }
    return a.frozen;
  }
  /** Prevent a later changed figure from being displayed beside frozen older text. */
  function assetMatches(a: LegacyAttempt, questionNumber: number): boolean {
    const live = editions.get(a.paperId)?.questions.find(q => Number(q.questionId.split(":").at(-1)) === questionNumber);
    const frozen = a.frozen?.questions.find(q => Number(q.questionId.split(":").at(-1)) === questionNumber);
    return !!live && !!frozen && live.id === frozen.id;
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
    capture(a, nowMs);
    const { paper } = context(a);
    if (a.engineState && a.enginePaperRevisionId === paper.id) return a.engineState;
    let state = startSession(paper, a.startedAt);
    if (nowMs >= a.startedAt && nowMs > a.startedAt) {
      state = transition(paper, { ...state, visible: false }, { type: "TICK", nowMs });
      state = { ...state, visible: true };
    }
    const sectionIndex = a.mode === "single" ? 0 : a.section;
    state = { ...state,
      sectionIndex: Math.min(sectionIndex, paper.sections.length - 1),
      questionIndex: a.cursors[a.section] ?? 0,
      responses: responseRecords(a), clockMs: nowMs };
    a.engineState = state;
    a.enginePaperRevisionId = paper.id;
    return state;
  }
  function restore(a: LegacyAttempt, wallNowMs: number, visible: boolean) {
    const { paper } = context(a);
    if (!a.engineState) ensure(a, wallNowMs);
    const restored = restoreSession(paper, a.engineState!, wallNowMs, visible);
    a.engineState = restored.state;
    return restored;
  }
  function event(a: LegacyAttempt, event: SessionEvent): SessionState {
    const { paper } = context(a);
    const current = ensure(a, event.nowMs);
    const safeEvent = { ...event, nowMs: Math.max(event.nowMs, current.clockMs) } as SessionEvent;
    const next = transition(paper, current, safeEvent);
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
  return { context, capture, assetMatches, chooseRecovered, makeBackup, verifyBackup, planBackupMerge,
    archiveDisplayRevision, ensure, restore, event, answer, score, importedCount: imported.length, questionCount: imported.reduce((n,e)=>n+e.questions.length,0) };
}
