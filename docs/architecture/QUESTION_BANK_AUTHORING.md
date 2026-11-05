# Authoring and importing examination question banks

**Planned AI-agent pathway, NOT available yet (5 November 2026):** For the next development session, see the [P57 AI-first CAT/APFC bank pipeline proposal](P57_AI_FIRST_QUESTION_BANK_PIPELINE_PLAN.md) covering a single agent-facing format, deterministic CLI compiler, factual/source/evidence and duplicate triage, optional Wordgard manual corrections, and safe bulk publication. Current simple `practice-desk-bank` v1 and Wordgard flows described below remain as-built; this plan **does not** imply automatic AI generation, fact checking, bulk staging or P57 implementation. Notably, v1 simple imports assign `verified` unconditionally—do not treat this as independent proof of question correctness.


**Current P56 authoring→frozen-source→Learning integration verification (5 November 2026; D70):** [P56 CI 41957996370](https://github.com/oneshubhamt/practice-desk/actions/runs/41957996370) **5/5 success; 312/312 Node, strict TypeScript, full offline Chromium/Firefox/WebKit**; tested source `9f1d2b97f61f7c6fec2a4acb09be4c067febb989`, generated-HTML-only publisher `489069071a057087ed11fad62f30bb7ad5dc0565` (2,341,265 bytes, SHA-256 `962fa5cc93d181ddc8fd2177eb5a83a952d51f51e1b73f645acce168f766dd87`). P56's five new Node tests challenge exact Wordgard publisher preflight equality, three official APFC semantic roots independent of two physical exam sections, six live question-kind rules, numeric tolerance and partial/matching scoring, source-frozen History/topic counts, separate +1/0 notebook retest and strict v4 backup. No authoring source/vendor or question banks changed; the only production defect repaired is the *independent* concurrent immutable-snapshot import transaction. [independent source/28-section evidence](../audits/P56_INDEPENDENT_INTEGRATION_SOURCE_AUDIT_2026-11-05.md). Author-created questions remain explicitly uncertified; manual/editorial content and release signoff NOT DONE.

**Historical P54 Wordgard authoring flow (5 November 2026 IST; D68):** [five-job P54 CI 41892402257](https://github.com/oneshubhamt/practice-desk/actions/runs/41892402257) **5/5 success, 307/307 Node and offline Chromium/Firefox/WebKit**, tested source `5dcba7044f57cd0350890555b212ce0d0d904d1f`, guarded HTML-only publisher `a6b144b56fba6ebf8cc606fdbc3f2ea9063a6cf9`, standalone HTML 2,338,937 bytes (SHA-256 `3e5ec06e4b49824d447075281a8efc1a957e2190bc5a1bffb0640ca7eae65d51`). In Library → Wordgard, distinguish **Actual exam section** (timing/navigation) from academic subject; the section manager changes the one timer for every assigned question, including new/reassigned items. **Validate paper** dry-runs the exact immutable compiler/domain check used by **Publish to Library**. **Preview question** shows all six real candidate response controls in a read-only/inert panel, compiled effective exam rules, genuine scorer-derived partial examples, and a separate initially collapsed author-only key/model rubric. Incomplete drafts show an explicitly unvalidated layout; inconsistent imported section timers and invalid/empty durations cannot silently publish. Full `file://` draft→publish→timed exam→partial score→complete six-item review/reload passed on Chromium/Firefox/WebKit (390px and 195px/140% screenshots retained). [P54 closeout](../ENGINEERING_PROGRAMME.md#0e-p54--authoritative-wordgard-preflight-actual-six-kind-author-preview-and-coherent-section-rules-4-november-2026). Unpublished drafts still require distinct JSON export; standard History backup excludes them; no automatic official question bank authentication, PDF/DOCX/CSV conversion, hardware/AT/IME certification or public release implied.

**P53 authoring taxonomy correction (4 November 2026; D67; QA 5/5, 302/302):** [CI 41864597927](https://github.com/oneshubhamt/practice-desk/actions/runs/41864597927) confirmed the real offline Wordgard author→publish→custom filtered exam path across Chromium/Firefox/WebKit. In each authoring question, **Actual exam section** controls physical timing/navigation grouping; **Academic subject** is separate custom classification, or choose an explicit **Official broad syllabus subject** from the APFC catalogue. The two semantic options are mutually exclusive; changing the chosen broad heading does not create another exam section. Topic and Subtopic are optional below this subject; a subject with no Topic is still counted/filtered. If no semantic subject is chosen, publisher emits the explicit `Unclassified` root and never assumes official status. This separation correctly supports *one 120-question APFC exam section containing multiple academic subjects*. Library Practice presents readable grouped subject and topic filters, while Learning counts distinct conceptual questions separately from revised source editions. [As-built five-step ledger](../ENGINEERING_PROGRAMME.md#0d-p53--semantic-taxonomy-separation-accurate-evidence-and-meaningful-selectors-4-november-2026). **Not delivered by P53:** P50's faithful six-kind preview, authoritative preflight and section-level timing editor (proposed P54), P51 Learning DOM refinement (proposed P55). No new question-bank data or release/real-device signoff.

**P49/P50 advanced graphical authoring automated verified (4 Nov 2026; D65):** [Five-job offline CI 41828561650](https://github.com/oneshubhamt/practice-desk/actions/runs/41828561650), **296/296 Node and Chromium/Firefox/WebKit**. In Library → Wordgard Author, Paper settings now expose `untimed / whole-paper / sectional`, pause allowed/forbidden, forward-only/free question navigation, sequential-locked/free section navigation, manual/automatic expiry, early section submission and post-exam detailed review. Per question the studio exposes Section/subject, author-supplied Topic and Subtopic, difficulty, sectional minutes (0 means untimed), multiple-select minimum/maximum choices, and per-correct-component marks/incorrect-component penalty for multiple-select or matching. Authors must give the **same sectional duration for every question in one section**; invalid keys, component rules, conflicting section budgets or unlocked sectional movement block publication. Compilation pins actual timed rules, source/answer identities, topic ancestor IDs and scoring overrides into immutable SHA-validated exam revision and shows user-authored provenance; the preview and frozen exam remain separate. Unpublished drafts are still stored locally and require separate **Export draft JSON** (not included in standard History backup). No official question bank, PDF/DOCX/CSV automatic extraction, or user/device signoff implied. [Current code and QA matrix](../ENGINEERING_PROGRAMME.md#0b-p49p52-source-led-five-step-implementation-ledger-4-november-2026).

**P48-3 live-editor lifecycle (4 November 2026; automated verified):** [Five-job offline CI 41790738425](https://github.com/oneshubhamt/practice-desk/actions/runs/41790738425) **5/5 success, 281 Node**, real Chromium/Firefox/WebKit editor test. Background Library state redraws no longer unmount an actively edited Wordgard draft; manual **Close studio** refreshes Library, while a successfully committed **Publish to Library** explicitly closes the editor before refreshing the published paper list. This is a scoped lifecycle guarantee, not hardware IME/AT or real-device acceptance. Unpublished draft JSON still requires separate export; History backup does not include it. [Source reconciliation](../ENGINEERING_PROGRAMME.md#p48-3--stable-libraryresults-ux-and-protected-wordgard-editing-4-november-2026).

**Current build:** Practice Desk overhaul. The app itself runs as one fully offline HTML file; imported banks and attempt records are device-local until exported. This guide describes actual implemented behavior, not a planned feature.

**P48-1 import/authoring assurance, 4 Nov 2026:** [P48-1 five-job source-verified CI 41756480372](https://github.com/oneshubhamt/practice-desk/actions/runs/41756480372) **5/5 green, 280 Node**, all actual offline Chromium/Firefox/WebKit flows. The integrated Wordgard Publisher and strict simple-bank JSON importer now **reject unrecognised fields**; current SHA-256/contentHashes protect identity of frozen data against accidental changes but are not cryptographic user/publisher signatures. Real offline single-file CSP is hashed against the exact compiled inline runtime and blocks unrelated injected scripts/handlers. No bank content, authored source keys or six-kind/exam scoring policy changed. Unpublished Wordgard shelf still needs independent JSON export; the standard History backup does not include drafts. [Five-step security record](../ENGINEERING_PROGRAMME.md#p48-1--source-led-security-content-integrity-recovery-and-lean-legacy-closure-4-november-2026); physical Safari/mobile/IME/AT and overall P48 release unverified.

## P47-5D Wordgard Library Studio — authoring, validated publication and examination verified

**Current P48 integration verification (3 Nov 2026):** [P48 full five-job CI 41682515168](https://github.com/oneshubhamt/practice-desk/actions/runs/41682515168) passed **274/274 Node** and all offline Chromium/Firefox/WebKit jobs. The Wordgard Library authoring button is disabled during initial IndexedDB/localStorage hydration, preventing an editor instance from being torn down by the pending startup redraw; it becomes available once the selected library is ready. Existing validated six-kind immutable paper/key publication and editor-owned draft JSON export behaviour remain unchanged. Actual hardware IME and independent accessibility/physical Safari signoff remain NOT TESTED.

Approved scope is recorded in the [canonical P47-5 programme](../ENGINEERING_PROGRAMME.md#p47-5-approved-architecture-and-wordgard-archive-audit--abcd-subpasses-3-november-2026); the simple JSON-import instructions below remain an alternative to the **currently implemented** Library Wordgard WYSIWYG Draft → Preview → Validate → Publish workflow. No PDF/DOCX/CSV automatic conversion is claimed.

**Current distinction:** Question text, option text and explanations are mainly plain strings, with hash-verified image assets and selected structured stimuli stored separately. Practice Desk already has a sophisticated six-kind examination, scoring, History, FSRS and frozen-source engine and now includes a graphical Wordgard Library draft studio and KaTeX 0.19.1 renderer, with durable new-revision publication **implemented through** `src/authoring/authoring-publisher.ts` and `src/app/authoring-controller.ts` (P47-5D). The author's supplied answers/references are not independently certified; mathematical alternatives and source digests are data-integrity checks, not publisher signatures.

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
