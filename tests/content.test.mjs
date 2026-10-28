import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateContent } from '../src/content/validate.ts';

const load = async name => JSON.parse(
  await readFile(new URL('../src/content/' + name + '.json', import.meta.url), 'utf8')
);
const loadContent = async () => ({
  papers: await load('papers'),
  patches: await load('patches'),
  solutions: await load('solutions'),
});
const countEntries = bank => Object.values(bank).reduce(
  (total, pack) => total + Object.keys(pack).length, 0
);

test('current library satisfies schema and all cross-bank references', async () => {
  const data = await loadContent();
  const summary = validateContent(data);
  assert.equal(summary.sourcePapers, Object.keys(data.papers).length);
  assert.equal(summary.questions, Object.values(data.papers).reduce((n, paper) => n + paper.questions.length, 0));
  assert.equal(summary.patches, countEntries(data.patches));
  assert.equal(summary.solutions, countEntries(data.solutions));
  assert.ok(summary.sourcePapers > 0);
  assert.ok(summary.questions > 0);
});

test('validator rejects duplicate question numbers and invalid answer keys', async () => {
  const duplicate = await loadContent();
  const paperId = Object.keys(duplicate.papers)[0];
  const questions = duplicate.papers[paperId].questions;
  questions[1].n = questions[0].n;
  assert.throws(() => validateContent(duplicate), /duplicate question number/);

  const badKey = await loadContent();
  const firstPaperId = Object.keys(badKey.papers)[0];
  badKey.papers[firstPaperId].questions[0].key = 'e';
  assert.throws(() => validateContent(badKey), /expected one of a, b, c or d/);
});

test('validator rejects orphaned patches, missing stimuli and unknown fields', async () => {
  const orphanPatch = await loadContent();
  const paperId = Object.keys(orphanPatch.papers)[0];
  orphanPatch.patches[paperId]['999'] = { key: 'a' };
  assert.throws(() => validateContent(orphanPatch), /references a question that does not exist/);

  const missingPassage = await loadContent();
  const firstPaperId = Object.keys(missingPassage.papers)[0];
  const passageQuestion = missingPassage.papers[firstPaperId].questions.find(q => q.passageRef);
  assert.ok(passageQuestion);
  passageQuestion.passageRef = 'missing-passage';
  assert.throws(() => validateContent(missingPassage), /references missing passage/);

  const unknownField = await loadContent();
  const patchPaperId = Object.keys(unknownField.papers)[0];
  unknownField.patches[patchPaperId]['1'] = { unexpected: true };
  assert.throws(() => validateContent(unknownField), /unknown field/);
});
