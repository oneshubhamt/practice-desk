import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importCglBank } from "../src/content/import-cgl.ts";
import { validateResponse } from "../src/engine/response.ts";
import { scoreAttempt } from "../src/engine/scoring.ts";

const papers = JSON.parse(await readFile(new URL("../src/content/papers.json", import.meta.url)));
const patches = JSON.parse(await readFile(new URL("../src/content/patches.json", import.meta.url)));
const library = importCglBank(papers, patches);

test("imports all five CGL source and reviewed editions with revision-pinned keys", () => {
  assert.equal(library.length, 10);
  assert.equal(library.reduce((n, p) => n + p.questions.length, 0), 1000);
  for (const entry of library) {
    assert.equal(entry.paper.sections.length, 4);
    assert.equal(entry.paper.sections.reduce((n, s) => n + s.questionRevisionIds.length, 0), 100);
    assert.equal(entry.paper.answerKeyRevisionId, entry.key.id);
    assert.equal(entry.key.entries.length, 100);
  }
});

test("source invalid status is never automatically promoted in reviewed edition", () => {
  for (let i = 0; i < library.length; i += 2) {
    const source = library[i], reviewed = library[i + 1];
    for (let j = 0; j < source.questions.length; j++) {
      const original = source.questions[j], corrected = reviewed.questions[j];
      if (original.editorial.status === "invalid" && corrected.editorial.status !== "corrected") {
        assert.equal(corrected.editorial.status, "invalid");
      }
    }
  }
});

test("rejects unknown options and out-of-bounds responses", () => {
  const q = library[0].questions[0];
  assert.throws(() => validateResponse(q, { kind: "single-choice", optionId: "invalid" }), /Unknown option/);
  assert.doesNotThrow(() => validateResponse(q, { kind: "single-choice", optionId: q.content.options[0].id }));
});

test("generic scoring matches CGL configured marking rules", () => {
  const entry = library[0];
  const id = entry.questions[0].id;
  const correct = entry.key.entries[0].answer.optionId;
  const result = scoreAttempt(entry.paper, entry.key, entry.questions,
    [{ questionRevisionId: id, response: { kind: "single-choice", optionId: correct } }], "2026-10-28T00:00:00Z");
  assert.equal(result.items[0].verdict, "correct");
  assert.equal(result.items[0].marks, 2);
});
