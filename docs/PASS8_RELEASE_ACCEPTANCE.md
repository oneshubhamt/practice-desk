# Pass 8 — Advanced revision and trustworthy analytics

Status: **Pass 8 implementation and automated Chromium acceptance completed** (latest verified code run: [CI #40903965637](https://github.com/oneshubhamt/practice-desk/actions/runs/40903965637); a further negative-case run and final documentation HEAD are separately verified before closure). Maintain this alongside [architecture scratchpad](ARCHITECTURE_AUDIT_2026-10-28.md), [data model](DATA_MODEL.md), [v11 parity ledger](V11_PARITY_LEDGER.md), and [engineering rules](../AGENTS.md). All work remains on `overhaul`.

## Acceptance checklist — no check without verification

- [x] Build a genuine exam-engine revision attempt from notebook cards, with immutable frozen question/answer/media references; filter by explicit criteria, prohibit mixing incompatible exams, never expose keys during an active attempt and persist/reopen/backup as a regular attempt.
- [x] Make revision-test scoring clearly a **practice scoring policy** rather than pretending original source marks; exclude editorial-invalid material; avoid duplicated question revisions or conflicting shared assets.
- [x] Improve taxonomy evidence using explicit source topic IDs, section names and user-supplied tags, with observation counts, distinct question coverage and honest minimum sample sizes; no inferred topic labels.
- [x] Provide question-time / pace, section-performance, speed–accuracy, negative-mark and hypothetical opportunity arithmetic computed from frozen responses/marking rules; guard missing timings, partial-credit, pending and editorial exclusions.
- [x] Provide same-revision longitudinal comparisons and conservatively qualified evidence progression across independent attempts. Never claim ranks, percentiles, calibrated mastery or causal effects of answer changes.
- [x] Make FSRS due-date handling bounded and efficient for repeated UI redraws; only explicit self-ratings alter FSRS schedules.
- [x] Unit and browser QA: cross-paper notebook revision, answer secrecy, frozen-media handling, no notebook cards, odd grading/status policies, due queue and existing 64+ tests, saved history/backup, responsiveness.
- [x] Audit → analyze → implement → check each objective → targeted QA recorded in the live architecture scratchpad; final-head CI verified.
- [x] Preserve [Pass 9 v11-grade visual and feature parity](V11_PARITY_LEDGER.md) as an explicit release requirement; Pass 8 may expose data simply without claiming finished visual design.

## Separate release limitations

Manual Firefox/Safari `file://`, real-device storage/forced termination, assistive tech and v11 UI parity remain Passes 9–10. Analytics are observations from selected tests and are not standardized psychometric measures.

## Concrete implementation evidence

- `src/learning/revision-test.ts` builds a validated short (1–25 card) untimed custom paper, with its own immutable question/key/paper hashes and explicit +1 / 0 / 0 scoring. It accepts compatible cards across source paper editions of the **same exam only**; duplicate questions, ineligible editorial states and conflicting image/stimulus identities are rejected.
- `LearningCard.sourceAttemptId` and `GenericAttempt.notebookLineage` pin the source completed attempt, paper edition, section and original card per revision question. Lineage hashes and stored-record validation reject tampering. Original source attempts may be deleted without erasing the copied provenance, although click-through to missing source attempts cannot be supported.
- The learning desk launches generated exams through the **same exam engine, IndexedDB store, history, backup v3 and restore path** as ordinary practice. Neither starting nor submitting the generated attempt produces an FSRS rating.
- `src/learning/learning.ts` keeps section, explicit source-topic and self-entered topic groups separate. Topic rows distinguish *observations*, *distinct answered question revisions*, and *independent attempts with answers*. Simple observed accuracy requires five answered observations; the optional consistency bands require **ten answers, two answering attempts and five distinct answered revisions**.
- `src/learning/attempt-evidence.ts` decomposes frozen section marks, coverage, question foreground time, section-relative speed classification (five measured answers per section), wrong→correct and skipped→correct hypothetical arithmetic using **each frozen item's marking rule**. Pending and excluded questions are not misclassified as correct/wrong. Answer revision counts are counted without falsely inferring their benefit.
- FSRS-7 schedules remain derived exclusively from explicit review logs, with reference-keyed memoization during repeated learning-desk redraws; caches invalidate when a card is replaced or removed.
- `tests/pass8-learning.test.mjs` covers frozen packages, answer secrecy, JSON backup, source lineage and hash tampering, duplicate/unsafe/mixed selection, exact speed median/buckets, policy-based opportunity arithmetic, repeated-item evidence and missing timing. The Chrome `file://` smoke launches and completes a revision test, revisits history, verifies source linkage, grades independently of FSRS, and includes that attempt in backup.
- Unchecked manual/platform acceptance and full v11 visual parity remain **Pass 9/10 gates**, not falsely marked done.
