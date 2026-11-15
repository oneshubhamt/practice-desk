/**
 * Recover the original Day 1 question text from the user's public ChatGPT share.
 *
 * Usage (from the repository root):
 *   curl -fsSL 'https://chatgpt.com/s/t_6af93d7f091881918cf9123723691cef' |
 *     node question-banks/pfrda/2026/mocks/day-01/build-from-share.mjs
 *
 * This is an extraction/transcription tool, not an answer-key verifier. It does
 * not execute code found in the shared page. Keep the generated source snapshot
 * and independently review the supplied answers before publication.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const shareUrl = 'https://chatgpt.com/s/t_6af93d7f091881918cf9123723691cef';
let page = '';
for await (const chunk of process.stdin) page += chunk.toString('utf8');

const start = page.indexOf('{@body const questions = [');
const nextBlock = page.indexOf('const [answers', start);
if (start < 0 || nextBlock <= start) {
  throw new Error('Original question array not found in the supplied shared page');
}

// The shared page's streamed HTML embeds the answer-free UI source as a
// twice-JSON-escaped string. Decode the string data; do not run/evaluate it.
const raw = page.slice(start, nextBlock);
const once = JSON.parse('"' + raw + '"');
const code = JSON.parse('"' + once + '"');
const arrayStart = code.indexOf('[');
const arrayEnd = code.indexOf('\n]}', arrayStart);
if (arrayStart < 0 || arrayEnd < 0) throw new Error('Truncated question array');
const arrayLiteral = code.slice(arrayStart, arrayEnd + 2);
const json = arrayLiteral.replaceAll('{t:', '{"t":').replaceAll(',o:', ',"o":');
const originals = JSON.parse(json);
if (originals.length !== 50 || originals.some(q =>
  typeof q.t !== 'string' || q.t.length < 20 || !Array.isArray(q.o) ||
  q.o.length !== 4 || q.o.some(o => typeof o !== 'string' || !o.trim()))) {
  throw new Error('Expected 50 complete MCQs (one stem, four options each)');
}

const hintMarkdown = readFileSync(join(directory, 'archive', 'general-stream-answer-index.md'), 'utf8');
const rows = [...hintMarkdown.matchAll(/^\|\s*(\d+)\s*\|\s*([A-D])\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*$/gm)];
if (rows.length !== 50 || rows.some((row, i) => Number(row[1]) !== i + 1)) {
  throw new Error('Recovered answer/hint index is missing or out of order');
}

const englishMarkdown = readFileSync(join(directory, 'archive', 'descriptive-english.md'), 'utf8');
const heading = '## Original passage: Retirement Security in a Changing Economy\n\n';
const englishStart = englishMarkdown.indexOf(heading);
const englishEnd = englishMarkdown.indexOf('\n## Manual evaluation reference', englishStart);
if (englishStart < 0 || englishEnd < 0) throw new Error('Original English passage unavailable');
const passage = englishMarkdown.slice(englishStart + heading.length, englishEnd).trim();
const modelMatch = englishMarkdown.match(/\*\*Suggested title:\*\* ([^\n]+)\n\n([\s\S]*?)\n\n\*\*Unofficial assessment rubric/);
if (!modelMatch) throw new Error('English evaluation reference unavailable');
const richParagraphs = text => ({
  format: 'practice-desk-rich', version: 1,
  blocks: text.split(/\n\s*\n/).map(paragraph => ({
    type: 'paragraph', content: [{ type: 'text', text: paragraph.trim() }],
  })),
});

const source = {
  shareUrl,
  sourceKind: 'original-ai-generated-day1-test',
  recoveredAt: '2026-11-15',
  questions: originals.map((q, i) => ({ number: i + 1, prompt: q.t, options: q.o })),
};

const legalQuestions = new Set([1, 7, 9, 13, 19, 21, 25, 31, 35, 41, 43, 44, 46, 48, 49]);
const changingQuestions = new Set([2, 14, 21, 26, 36, 48, 50]);
const mathematicalQuestions = new Set([3, 6, 20, 27, 29, 32, 36, 40, 47]);
const primarySources = {
  pfrda: { publisher: 'India Code', title: 'PFRDA Act, 2013', url: 'https://upload.indiacode.nic.in/showfile?actid=AC_CEN_2_45_00007_201323_1517807327819&filename=201323.pdf&type=actfile', stance: 'supports' },
  companies: { publisher: 'Ministry of Corporate Affairs', title: 'Companies Act, 2013', url: 'https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf', stance: 'supports' },
  budget: { publisher: 'Ministry of Finance', title: 'Union Budget 2026–27: Fiscal Policy Strategy Statement', url: 'https://www.indiabudget.gov.in/doc/frbm1.pdf', stance: 'supports' },
  survey: { publisher: 'Ministry of Finance', title: 'Economic Survey 2025–26, Chapter 1', url: 'https://www.indiabudget.gov.in/economicsurvey/doc/echapter.pdf', stance: 'supports' },
  apy: { publisher: 'PFRDA', title: 'Atal Pension Yojana FAQs', url: 'https://pfrda.org.in/web/pfrda/w/faqs/atal-pension-yojana', stance: 'supports' },
  nps: { publisher: 'PFRDA', title: 'NPS for All Citizen Models', url: 'https://pfrda.org.in/en/schemes/national-pension-system/nps-for-all-citizen-models', stance: 'supports' },
};
const provisionByQuestion = {
  1: 'Section 1(4)', 7: 'Section 42', 13: 'Section 14(2)(f)',
  19: 'Section 63', 25: 'Sections 51 and 52', 31: 'Section 123',
  35: 'Section 14(2)(d)', 41: 'Section 143', 44: 'Section 149',
  46: 'Section 62', 49: 'Sections 173 and 410',
};
const sourcesFor = (number, subject) => {
  if (subject === 'PFRDA Act' || subject === 'Companies Act') {
    const src = subject === 'PFRDA Act' ? primarySources.pfrda : primarySources.companies;
    return [{ ...src, provision: provisionByQuestion[number], asOfDate: '2026-11-15' }];
  }
  if (number === 2 || number === 14 || number === 36) return [primarySources.budget];
  if (number === 26 || number === 50) return [primarySources.survey];
  if (number === 21) return [primarySources.apy];
  if (number === 48) return [primarySources.nps];
  return [];
};

const bank = {
  format: 'practice-desk-authoring', version: 1,
  bankId: 'pfrda-grade-a-2026-day1', examId: 'pfrda-grade-a-2026-phase-ii',
  paperId: 'pfrda-grade-a-2026-day1',
  title: 'PFRDA Grade A 2026 — Day 1', edition: 'custom', revision: 1,
  scoring: { correctMarks: 2, incorrectMarks: -0.5 },
  timing: { kind: 'sectional', pausePolicy: 'forbidden', sectionTransition: 'automatic', allowEarlySubmit: true },
  navigation: { questionNavigation: 'free', sectionNavigation: 'sequential-locked', allowReview: true },
  sections: [
    { id: 'descriptive', title: 'Paper 1 — Descriptive English (Day 1 précis practice)', minutes: 20 },
    { id: 'general', title: 'Paper 2 — General Stream', minutes: 40 },
  ],
  stimuli: [{ id: 'day1-precis-passage', kind: 'passage', title: 'Retirement Security in a Changing Economy', text: richParagraphs(passage) }],
  questions: [
    {
      id: 'day1-english-precis', examSection: 'descriptive', subject: 'Descriptive English',
      topic: 'Précis writing', kind: 'free-response', stimulusRef: 'day1-precis-passage',
      prompt: 'Write a précis in approximately 110 words (target 100–120 words) and supply a suitable title. This is the original 20-minute Day 1 practice exercise; the full official Paper 1 is 60 minutes. Your answer needs manual assessment.',
      answer: '',
      explanation: richParagraphs('Illustrative title: ' + modelMatch[1] + '\n\nModel précis: ' + modelMatch[2] + '\n\nUnofficial practice rubric (/20): fidelity and coverage 8; compression 4; logical structure 3; language and grammar 3; title 2. Manually assess writing; the model is not the only acceptable response.'),
      provenance: { kind: 'ai-original', sourceNote: 'Original Day 1 ChatGPT précis practice in the user’s PFRDA project; source text preserved verbatim.' },
      qa: { status: 'needs-review' },
    },
    ...originals.map((q, i) => {
      const number = i + 1;
      const [, , answer, rawSubject, rawHint] = rows[i];
      const subject = rawSubject.trim(), explanation = rawHint.trim();
      const sources = sourcesFor(number, subject);
      const flags = { mathematical: mathematicalQuestions.has(number), legal: legalQuestions.has(number), timeSensitive: changingQuestions.has(number) };
      if (flags.legal || flags.timeSensitive) flags.asOfDate = '2026-11-15';
      return {
        id: `day1-general-${String(number).padStart(2, '0')}`,
        examSection: 'general', subject, kind: 'single-choice',
        prompt: q.t, options: q.o, answer,
        explanation,
        provenance: {
          kind: 'ai-original',
          sourceNote: `Verbatim Day 1 ChatGPT diagnostic Q${number}; original stem/options recovered from public share; answer/hint drawn from subsequent evaluation. Not an official PYQ.`,
          ...(sources.length ? { sources } : {}),
        },
        qa: { status: 'needs-review', applicability: flags },
      };
    }),
  ],
};

writeFileSync(join(directory, 'archive', 'original-50-questions.json'), JSON.stringify(source, null, 2) + '\n');
writeFileSync(join(directory, 'archive', 'recovered-day1.authoring.json'), JSON.stringify(bank, null, 2) + '\n');
console.log('Recovered 50 original stems and all 200 options; wrote 51-question two-section Practice Desk authoring source.');
