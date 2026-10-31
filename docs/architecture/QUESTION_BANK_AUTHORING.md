# Authoring and importing examination question banks

**Current build:** Practice Desk overhaul. The app itself runs as one fully offline HTML file; imported banks and attempt records are device-local until exported. This guide describes actual implemented behavior, not a planned feature.

## Fastest path: MCQs and numerical-answer (NAT) questions

1. Open the Practice Desk **Test library** and choose **Download APFC/NAT bank template**.
2. Edit that plain JSON file in any text editor. Change `bankId` for each **distinct** bank; increment `revision` when supplying a genuinely new version of that bank.
3. Place questions under `questions`. Each question may have `section` (a subject grouping), `question`, `type`, `answer` and optionally `explanation`. For MCQs use `options` as an array of strings and `answer` as an uppercase option letter. For NAT use `answer` as a number (or several accepted numbers), `tolerance` as a nonnegative numeric absolute tolerance.
4. Select **Import question bank**, choose your edited `.json` file, and start the newly added item under **Imported / custom examinations**. The bank is saved offline after strict validation; no precomputed content hashes, question revision IDs, key IDs or media records are required from the author.
5. Select **Untimed practice** for a no-expiry attempt; uncheck it to use any time limit supplied in your bank. Existing original/reviewed CGL source and its corrections are not changed by imported banks.

### Copyable minimal example

```json
{
  "format": "practice-desk-bank",
  "version": 1,
  "bankId": "my-apfc-mixed-set-01",
  "examId": "upsc-epfo-apfc",
  "title": "APFC mixed practice",
  "revision": 1,
  "edition": "custom",
  "scoring": {
    "correctMarks": 2.5,
    "negativeFraction": 0.3333333333333333,
    "unansweredMarks": 0
  },
  "timing": { "kind": "untimed" },
  "questions": [
    {
      "id": "labour-01",
      "section": "Labour and Social Security",
      "type": "mcq",
      "question": "Replace with a source-verified APFC four-option question.",
      "options": ["A", "B", "C", "D"],
      "answer": "B",
      "explanation": "Replace with source-backed explanation."
    },
    {
      "id": "nat-01",
      "section": "Numerical Answers",
      "type": "nat",
      "question": "What is the mean of 3, 4 and 5?",
      "answer": 4,
      "tolerance": 0.01,
      "explanation": "Sum 12 divided by 3."
    }
  ]
}
```

For an APFC *practice* scale using the historical 120-question working mock format, `correctMarks:2.5` and `negativeFraction:1/3` give a full one-third penalty (**5/6 marks** per wrong answer), with **no per-question rounding**. These numbers are a working mock assumption; verify any revised UPSC notification before using them for a real 2026 exam. For a generic NAT examination, choose that examination's own score and tolerance instead; APFC scoring is not hard-coded.

**Timing format:** `{"kind":"untimed"}`, or `{"kind":"whole-paper","minutes":120}`. The user's separate Untimed practice toggle can override the latter **for a new attempt** while preserving every other rule. The review includes exact answer keys only after submission. Changing the bank later cannot change prior saved results.

**Limits and safeguards:** The simple format supports MCQ and NAT and produces source-independent `custom` editions by default. Other editions can be labelled `source` or `reviewed` only when genuinely supplied as separate banks; the app does not magically review their correctness. Each import supports at most 2,000 questions and 25 MiB, requires unique question IDs, reasonable numeric tolerances, finite marks, valid answer letters and valid revision identities, and refuses an existing paper revision ID instead of overwriting it. It does not currently parse PDFs, DOCX, CSV or unstructured pasted questions into banks; those need transformation into the supported author format.

## Full six-kind advanced package

The **same** app also accepts `practice-desk-exam` format `version:1` containing already prepared versioned/hashes-protected paper, answer key and questions. Use this for multiple-select, true/false, matching, free-response, figures, shared passages, rich editorial records, specialised partial-credit rules, sectional and sequential navigation/timers, and detailed custom scoring. The advanced package is strict because it guarantees immutable source, answer-key integrity and historical reproducibility. See `tests/fixtures/six-kinds.mjs`, `src/app/exam-package.ts`, `src/domain/` and [current data contracts](DATA_CONTRACTS.md). It is also the route by which an assistant can transform a supplied APFC or NAT source bank into a validated exam file without changing application code.

## Original vs Reviewed selector

The **Original PDF / Reviewed & Corrected** buttons select one edition at a time. The native Paper dropdown contains only **that** edition's available source/review papers; imported **custom** banks appear under a separate optgroup. Switching editions preserves the same paper family when a counterpart exists. Edition selection is a view of distinct immutable source/review editions, not a mutation of a stored question or score.

## What is not claimed

Being extensible at the engine/data level is **not** proof of a complete graphical authoring studio or automated high-fidelity PDF extraction, and unsupported exams may require preparation of their full exam package. Manually confirm imported answer keys and marking schemes before relying on mock scores. The app does not know whether an imported question is an official PYQ unless the source/provenance is supplied and independently verified.
