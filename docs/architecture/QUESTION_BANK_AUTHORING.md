# Authoring and importing examination question banks

**Current build:** Practice Desk overhaul. The app itself runs as one fully offline HTML file; imported banks and attempt records are device-local until exported. This guide describes actual implemented behavior, not a planned feature.

## P47-5D Wordgard Library Studio — authoring, validated publication and examination verified

**P47-6 / P47-7 integration:** Library authoring owns the separately mounted Wordgard adapter behind the single CoordinatorContext; exam/Results use the real immutable validated six-kind paper, key and source snapshot. No editor instance runs during an exam or Result; no editor-private state changes scoring or FSRS grades. [P47-6 CI 41656394429](https://github.com/oneshubhamt/practice-desk/actions/runs/41656394429) passed 270/270 Node and all five offline jobs. P47-7 source/objective crosswalk performed; fresh CI pending. Unpublished drafts require **separate JSON export**, while published packages/attempts are included in History backup. Real Mac/mobile/assistive-technology acceptance belongs to P48.

Approved scope is recorded in the [canonical P47-5 programme](../ENGINEERING_PROGRAMME.md#p47-5-approved-architecture-and-wordgard-archive-audit--abcd-subpasses-3-november-2026); the instructions above describe the AS-BUILT current JSON import and must not be mistaken for WYSIWYG availability.

**Current distinction:** Question text, option text and explanations are mainly plain strings, with hash-verified image assets and selected structured stimuli stored separately. Practice Desk already has a sophisticated six-kind examination, scoring, History, FSRS and frozen-source engine and now includes a graphical Wordgard Library draft studio and KaTeX 0.19.1 renderer, with publication still gated to P47-5D.

**Implemented Library draft experience and remaining publication plan (one existing offline application):** Library → Author new paper/Edit unpublished draft; author sections, question kinds, rich question stem, option text, formatted long passages, editable tables, explicit inline/display maths, diagrams and verified image IDs, worked explanations, source/editorial references and paper/timer/scoring metadata. Provide Draft → Preview → Validate → Publish as separate visible steps, with clear field errors, undo/redo, accessible keyboard controls and a real exam-style readonly preview. Creating a source/reviewed counterpart publishes a NEW separately verified frozen edition, not an overwrite of any prior source. No PDF/DOCX autoconversion is implied.

**Application ownership:** Wordgard edits a curated editor document behind an EditorPort; it does not own scoring, keys, persisted question schema, hashes or the app router. The application validates a restricted normalized rich-content AST, with explicit TeX nodes and image asset references, then freezes/publishes the new question/source/key/paper hashes via current importer policy. The exam and Results surfaces render a lightweight **read-only** AST using MathRendererPort and verified image assets; they never create a Wordgard instance or show explanations before authorised submission. No external network or remote images. KaTeX is the first math rendering candidate, with possible MathJax adapter replacement if wide-expression wrapping/accessibility is materially better. Plain CGL question strings remain valid and never magically parsed for TeX.

**Dependency policy (implemented):** Exact MIT-licensed Wordgard 0.6.2 and KaTeX 0.19.1 versions are pinned/locked; the uploaded full Wordgard source remains pristine audit material, never modified. No stored vendor JSON or external editor/CDN. One integrated Library UI within the existing single-file HTML; editor instance initialized only when authoring. The scheduler equivalent is the FSRS interface to be formalized during mandatory P47-6, not a change to current FSRS-7 behavior.

**Status (3 November 2026):** **P47-5A/B/C/D verified.** [P47-5D five-job CI 41625794227](https://github.com/oneshubhamt/practice-desk/actions/runs/41625794227) (265/265 Node, real file:// three-engine screenshot/test journeys). Choose **Test library → Author question bank**; author one or more sections/questions across six kinds, stem/options/passage/explanation, inline/display LaTeX, authenticated figures and answer keys. Before publishing, give your exam family/paper a stable ID and meaningful title, enter a valid answer for every question (MCQ: A–D; multiple-select: A,C; NAT: comma-separated numbers with absolute tolerance; true/false: True/False; matching: 1-C,2-A,3-D,4-B; written response: model/rubric). **Validate paper** lists specific errors and linked affected questions; inspect source and marks, tick the user-authored confirmation and select **Publish to Library**. Once durable, the new immutable revision appears in its exam family and is available for attempts, Results, backup and post-submit solutions. Source/reviewed editions require source notes, and reviewed requires an existing source edition of the same logical paper; never treat authored labels as official certification. Publishing the same edition+revision twice is refused; increment Revision for a new version. Draft JSON export remains necessary to protect unpublished work because the current History backup includes only published papers and attempts. No PDF/DOCX OCR/autoconversion, no advanced author-defined partial credit UI and no promised real-hardware accessibility verification. [Verified publication ledger](../ENGINEERING_PROGRAMME.md#p47-5d--verified-wordgard-draftimmutable-paper-publication-and-real-exam-3-november-2026).


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

P47-5D now verifies an integrated graphical authoring studio plus immutable publishing for the six built-in response kinds. That does **not** imply automatic high-fidelity PDF extraction, official exam keys, support for every external exam policy or advanced author-defined partial-credit UI. Manually confirm imported answer keys and marking schemes before relying on mock scores. The app does not know whether an imported question is an official PYQ unless the source/provenance is supplied and independently verified.
