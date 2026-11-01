import test from "node:test";
import assert from "node:assert/strict";
import { startSession, transition, rebaseSession } from "../src/engine/session.ts";
import { scoreAttempt } from "../src/engine/scoring.ts";

const q = (id, kind = "single-choice", status = "verified") => ({
  id, content: { kind, prompt: "Test", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] },
  editorial: { status },
});
const paper = (timing = { kind: "sectional", sectionLimits: [{ sectionId: "s1", durationMs: 1000 }, { sectionId: "s2", durationMs: 2000 }], allowEarlySubmit: true, pausePolicy: "allowed" }) => ({
  id: "pr", paperId: "p", answerKeyRevisionId: "key", sections: [
    { id: "s1", questionRevisionIds: ["q1"] }, { id: "s2", questionRevisionIds: ["q2"] },
  ], timing, navigation: { questionNavigation: "free", sectionNavigation: "sequential-locked", allowFlagging: true },
  scoring: { defaultRule: { correctMarks: 2, incorrectMarks: -0.5, unansweredMarks: 0 } },
});
const key = { id: "key", paperId: "p", entries: [
  { questionRevisionId: "q1", answer: { kind: "single-choice", optionId: "a" } },
  { questionRevisionId: "q2", answer: { kind: "single-choice", optionId: "b" } },
] };
const evt = (type, nowMs, extra = {}) => ({ type, nowMs, ...extra });

test("visibility change commits the preceding visible interval exactly once", () => {
  const p = paper({ kind: "whole-paper", durationMs: 100000, pausePolicy: "allowed" });
  let s = startSession(p, 0);
  s = transition(p, s, evt("VISIBILITY", 12000, { visible: false }));
  assert.equal(s.responses[0].timeSpentMs, 12000);
  s = transition(p, s, evt("TICK", 15000));
  assert.equal(s.responses[0].timeSpentMs, 12000);
  assert.equal(s.elapsedMs, 15000);
  s = transition(p, s, evt("VISIBILITY", 15000, { visible: true }));
  s = transition(p, s, evt("TICK", 16000));
  assert.equal(s.responses[0].timeSpentMs, 13000);
});

test("overshoot splits sectional timing and closes sections without double counting", () => {
  const p = paper();
  const s = transition(p, startSession(p, 0), evt("TICK", 5000));
  assert.equal(s.status, "completed");
  assert.equal(s.elapsedMs, 3000);
  assert.deepEqual(s.completedSections, [0, 1]);
  assert.equal(s.responses.find(r => r.questionRevisionId === "q1").timeSpentMs, 1000);
  assert.equal(s.responses.find(r => r.questionRevisionId === "q2").timeSpentMs, 2000);
});

test("pause freezes countdown; resume rebases; completion is terminal", () => {
  const p = paper({ kind: "whole-paper", durationMs: 5000, pausePolicy: "allowed" });
  let s = transition(p, startSession(p, 0), evt("PAUSE", 1000));
  s = transition(p, s, evt("TICK", 4000));
  assert.equal(s.elapsedMs, 1000);
  s = transition(p, s, evt("RESUME", 4000));
  s = transition(p, s, evt("TICK", 8000));
  assert.equal(s.status, "completed");
  assert.equal(s.elapsedMs, 5000);
  assert.equal(transition(p, s, evt("ANSWER", 9000, { response: { kind: "single-choice", optionId: "a" } })).responses.length, 1);
  assert.equal(rebaseSession(s, 3).clockMs, 3);
});

test("locked navigation, early section submission and answer clearing", () => {
  const p = paper();
  let s = startSession(p, 0);
  s = transition(p, s, evt("NAVIGATE", 1, { sectionIndex: 1, questionIndex: 0 }));
  assert.equal(s.sectionIndex, 0);
  s = transition(p, s, evt("ANSWER", 2, { response: { kind: "single-choice", optionId: "a" } }));
  s = transition(p, s, evt("CLEAR", 3));
  assert.equal(s.responses[0].response, undefined);
  s = transition(p, s, evt("SUBMIT_SECTION", 4));
  assert.equal(s.sectionIndex, 1);
  assert.deepEqual(s.completedSections, [0]);
});

test("scoring uses explicit rules and excludes invalid questions", () => {
  const p = paper();
  const result = scoreAttempt(p, key, [q("q1"), q("q2", "single-choice", "invalid")], [
    { questionRevisionId: "q1", response: { kind: "single-choice", optionId: "b" } },
    { questionRevisionId: "q2", response: { kind: "single-choice", optionId: "b" } },
  ], "2026-10-28T00:00:00Z");
  assert.equal(result.snapshot.earnedMarks, -0.5);
  assert.equal(result.snapshot.excludedCount, 1);
  assert.equal(result.snapshot.incorrectCount, 1);
});
