import type { PaperRevision } from "../domain/exam.js";
import type { CandidateResponse, QuestionRevision } from "../domain/question.js";
import type { QuestionRevisionId } from "../domain/ids.js";
import type { AttemptResponseRecord } from "../domain/attempt.js";

export interface SessionState {
  readonly status: "running" | "paused" | "completed";
  readonly sectionIndex: number;
  readonly questionIndex: number;
  readonly elapsedMs: number;
  readonly sectionElapsedMs: number;
  readonly foregroundMs: number;
  readonly responses: readonly AttemptResponseRecord[];
  readonly completedSections: readonly number[];
  readonly visible: boolean;
  /** Monotonic time origin for the current live process; never persist this as a restore deadline. */
  readonly clockMs: number;
}
export type SessionEvent =
  | { readonly type: "TICK"; readonly nowMs: number }
  | { readonly type: "VISIBILITY"; readonly nowMs: number; readonly visible: boolean }
  | { readonly type: "PAUSE" | "RESUME"; readonly nowMs: number }
  | { readonly type: "NAVIGATE"; readonly nowMs: number; readonly sectionIndex: number; readonly questionIndex: number }
  | { readonly type: "ANSWER"; readonly nowMs: number; readonly response: CandidateResponse }
  | { readonly type: "CLEAR"; readonly nowMs: number }
  | { readonly type: "FLAG"; readonly nowMs: number; readonly flagged: boolean }
  | { readonly type: "SUBMIT_SECTION" | "SUBMIT_ATTEMPT"; readonly nowMs: number };

function questionId(paper: PaperRevision, state: SessionState): QuestionRevisionId {
  const id = paper.sections[state.sectionIndex]?.questionRevisionIds[state.questionIndex];
  if (!id) throw new Error("Invalid session cursor");
  return id;
}
function record(state: SessionState, id: QuestionRevisionId): AttemptResponseRecord {
  return state.responses.find(r => r.questionRevisionId === id) ?? {
    questionRevisionId: id, flagged: false, timeSpentMs: 0, answerChangeCount: 0,
  };
}
function put(state: SessionState, value: AttemptResponseRecord): SessionState {
  return { ...state, responses: [...state.responses.filter(r => r.questionRevisionId !== value.questionRevisionId), value] };
}
export function startSession(paper: PaperRevision, nowMs: number): SessionState {
  if (!Number.isFinite(nowMs) || !paper.sections[0]?.questionRevisionIds.length) throw new Error("Invalid session start");
  return {
    status: "running", sectionIndex: 0, questionIndex: 0, elapsedMs: 0,
    sectionElapsedMs: 0, foregroundMs: 0, responses: [], completedSections: [],
    visible: true, clockMs: nowMs,
  };
}
function advance(paper: PaperRevision, state: SessionState): SessionState {
  const completedSections = [...state.completedSections, state.sectionIndex];
  const next = state.sectionIndex + 1;
  return next >= paper.sections.length
    ? { ...state, completedSections, status: "completed" }
    : { ...state, completedSections, sectionIndex: next, questionIndex: 0, sectionElapsedMs: 0 };
}
function sectionLimit(paper: PaperRevision, sectionIndex: number): number | null {
  if (paper.timing.kind !== "sectional") return null;
  const sectionId = paper.sections[sectionIndex]?.id;
  const limit = paper.timing.sectionLimits.find(s => s.sectionId === sectionId);
  if (!limit) throw new Error("Missing sectional timer");
  return limit.durationMs;
}
/** Consume a monotonic interval without assigning time after expiry to a completed question. */
function checkpoint(paper: PaperRevision, state: SessionState, nowMs: number): SessionState {
  if (!Number.isFinite(nowMs) || nowMs < state.clockMs) throw new Error("Clock must be monotonic");
  let remaining = state.status === "running" ? nowMs - state.clockMs : 0;
  let next: SessionState = { ...state, clockMs: nowMs };
  if (state.status !== "running") return next;
  // Every iteration either consumes time, advances a section, or terminates.
  while (next.status === "running") {
    const limit = paper.timing.kind === "whole-paper"
      ? Math.max(0, paper.timing.durationMs - next.elapsedMs)
      : sectionLimit(paper, next.sectionIndex) === null
        ? Infinity : Math.max(0, (sectionLimit(paper, next.sectionIndex) ?? Infinity) - next.sectionElapsedMs);
    const spent = Math.min(remaining, limit);
    if (spent > 0) {
      next = { ...next, elapsedMs: next.elapsedMs + spent, sectionElapsedMs: next.sectionElapsedMs + spent,
        foregroundMs: next.foregroundMs + (next.visible ? spent : 0) };
      if (next.visible) {
        const id = questionId(paper, next);
        const previous = record(next, id);
        next = put(next, { ...previous, timeSpentMs: previous.timeSpentMs + spent });
      }
    }
    remaining -= spent;
    if (limit !== Infinity && spent === limit) {
      if (paper.timing.kind === "whole-paper") return { ...next, status: "completed" };
      next = advance(paper, next);
      continue;
    }
    break;
  }
  return next;
}
export function transition(paper: PaperRevision, state: SessionState, event: SessionEvent): SessionState {
  const current = checkpoint(paper, state, event.nowMs);
  if (event.type === "VISIBILITY") return { ...current, visible: event.visible };
  if (current.status === "completed") return current;
  if (event.type === "TICK") return current;
  if (event.type === "PAUSE") {
    if (current.status !== "running" || paper.timing.kind === "untimed" || paper.timing.pausePolicy !== "allowed") return current;
    return { ...current, status: "paused" };
  }
  if (event.type === "RESUME") return current.status === "paused" ? { ...current, status: "running" } : current;
  if (current.status !== "running") return current;
  if (event.type === "SUBMIT_ATTEMPT") return { ...current, status: "completed" };
  if (event.type === "SUBMIT_SECTION") {
    if (paper.timing.kind !== "sectional" || !paper.timing.allowEarlySubmit) return current;
    return advance(paper, current);
  }
  if (event.type === "NAVIGATE") {
    const section = paper.sections[event.sectionIndex];
    if (!section?.questionRevisionIds[event.questionIndex] || current.completedSections.includes(event.sectionIndex)) return current;
    if (paper.timing.kind === "sectional" && event.sectionIndex !== current.sectionIndex) return current;
    if (paper.navigation.sectionNavigation === "sequential-locked" && event.sectionIndex !== current.sectionIndex) return current;
    if (paper.navigation.questionNavigation === "forward-only" &&
        (event.sectionIndex < current.sectionIndex ||
         (event.sectionIndex === current.sectionIndex && event.questionIndex < current.questionIndex))) return current;
    return { ...current, sectionIndex: event.sectionIndex, questionIndex: event.questionIndex,
      sectionElapsedMs: event.sectionIndex === current.sectionIndex ? current.sectionElapsedMs : 0 };
  }
  const id = questionId(paper, current);
  const previous = record(current, id);
  if (event.type === "FLAG") return paper.navigation.allowFlagging ? put(current, { ...previous, flagged: event.flagged }) : current;
  if (event.type === "CLEAR") {
    const { response: _removed, ...rest } = previous;
    return put(current, { ...rest, answerChangeCount: previous.response ? previous.answerChangeCount + 1 : previous.answerChangeCount });
  }
  if (event.type === "ANSWER") {
    return put(current, { ...previous, response: event.response,
      answerChangeCount: previous.response && JSON.stringify(previous.response) !== JSON.stringify(event.response)
        ? previous.answerChangeCount + 1 : previous.answerChangeCount });
  }
  return current;
}
/** Rebase a saved session onto a fresh monotonic origin after a process restart. */
export function rebaseSession(state: SessionState, nowMs: number): SessionState {
  if (!Number.isFinite(nowMs)) throw new Error("Invalid restore clock");
  return { ...state, clockMs: nowMs };
}
