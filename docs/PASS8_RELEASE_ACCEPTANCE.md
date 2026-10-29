# Pass 8 — Advanced revision and trustworthy analytics

Status: **In progress.** Maintain this alongside [architecture scratchpad](ARCHITECTURE_AUDIT_2026-10-28.md), [data model](DATA_MODEL.md), [v11 parity ledger](V11_PARITY_LEDGER.md), and [engineering rules](../AGENTS.md). All work remains on `overhaul`.

## Acceptance checklist — no check without verification

- [ ] Build a genuine exam-engine revision attempt from notebook cards, with immutable frozen question/answer/media references; filter by explicit criteria, prohibit mixing incompatible exams, never expose keys during an active attempt and persist/reopen/backup as a regular attempt.
- [ ] Make revision-test scoring clearly a **practice scoring policy** rather than pretending original source marks; exclude editorial-invalid material; avoid duplicated question revisions or conflicting shared assets.
- [ ] Improve taxonomy evidence using explicit source topic IDs, section names and user-supplied tags, with observation counts, distinct question coverage and honest minimum sample sizes; no inferred topic labels.
- [ ] Provide question-time / pace, section-performance, speed–accuracy, negative-mark and hypothetical opportunity arithmetic computed from frozen responses/marking rules; guard missing timings, partial-credit, pending and editorial exclusions.
- [ ] Provide same-revision longitudinal comparisons and conservatively qualified evidence progression across independent attempts. Never claim ranks, percentiles, calibrated mastery or causal effects of answer changes.
- [ ] Make FSRS due-date handling bounded and efficient for repeated UI redraws; only explicit self-ratings alter FSRS schedules.
- [ ] Unit and browser QA: cross-paper notebook revision, answer secrecy, frozen-media handling, no notebook cards, odd grading/status policies, due queue and existing 64+ tests, saved history/backup, responsiveness.
- [ ] Audit → analyze → implement → check each objective → targeted QA recorded in the live architecture scratchpad; final-head CI verified.
- [ ] Preserve [Pass 9 v11-grade visual and feature parity](V11_PARITY_LEDGER.md) as an explicit release requirement; Pass 8 may expose data simply without claiming finished visual design.

## Separate release limitations

Manual Firefox/Safari `file://`, real-device storage/forced termination, assistive tech and v11 UI parity remain Passes 9–10. Analytics are observations from selected tests and are not standardized psychometric measures.
