> **DOCUMENT STATUS (30 Oct 2026): HISTORICAL / SUPERSEDED FEATURE-PARITY CLAIM.** The authoritative current v11 feature audit and Passes 11–16 are in [V11_FEATURE_PARITY_PROGRAMME.md](V11_FEATURE_PARITY_PROGRAMME.md); historical green CI or an older “parity complete” claim **does not prove full feature parity**. See [consolidated project status](PROJECT_STATUS.md).

# Pass 9 — v11-grade product interface and feature restoration

**Status:** **Complete for engineering and automated Chromium acceptance** on `overhaul`: [verified final CI #40916049802](https://github.com/oneshubhamt/practice-desk/actions/runs/40916049802), **75/75 Node tests**, strict TypeScript, generated offline HTML and the full Chromium `file://` suite green. `main` and `baseline/v11` are protected. This is source-and-automated-UI parity, **not a claim of pixel-identical appearance or physical-device signoff**.

Read the [architecture audit](ARCHITECTURE_AUDIT_2026-10-28.md), [v11 parity ledger](V11_PARITY_LEDGER.md), [data model](DATA_MODEL.md) and [AGENTS.md](../AGENTS.md).

## Objective-by-objective engineering acceptance

- [x] **Designed home:** [`src/app/generic-ui.ts`](../src/app/generic-ui.ts) shows selected-paper details, correct mode-specific question count/time/navigation, mode cards, completion/in-progress statistics, latest attempt links, active-attempt resume banner, learning/backup entry, offline and scoring guidance.
- [x] **Separate history:** [`src/app/history-page.ts`](../src/app/history-page.ts) implements a real standalone route with search, status filter, old/new sorting, completed/in-progress resume, backup controls, metrics, newest eligible same-revision comparable trend and cross-paper descriptive section priorities. Missing/unanswered scores never appear as invented zero-percent trend points. Notebook-revision exercises are excluded from main section priority rankings.
- [x] **Tabbed results and review:** [`src/app/result-presentation.ts`](../src/app/result-presentation.ts) plus generic UI expose Insights, Question review, Time ledger with accessible tabs; exact source/reviewed key and self-assessed written marks remain distinct. Review filters include wrong, skipped, correct, excluded, pending, flagged, fast wrong and slow wrong. Frozen media, source pages/links, explanations, notebook buttons and grading remain intact.
- [x] **Richer analysis:** Section progress/accuracy bars, frozen foreground-time ledger, speed×accuracy summary, original source-key explanation, actual penalty and rule-based hypothetical mark opportunities. Opportunity/speed cells link into targeted question-review filters.
- [x] **Actual answer revisions:** [`src/engine/session.ts`](../src/engine/session.ts) records first answer/replacement/clear event snapshots with time; [`src/learning/answer-revisions.ts`](../src/learning/answer-revisions.ts) computes observed wrong→correct and correct→wrong *direct single-choice transitions only*, excludes clear/reselect and unverified material and never asserts causation. Unrecorded older attempts display an explicit limitation, not fabricated outcomes.
- [x] **Immersive exam:** Section/timer progressbar, strong low-time clock, accurate answered/viewed/flagged status, section controls, sticky question palette and legend, keyboard Alt+arrow question navigation, native accessible inputs/focus and policy-based disabled controls. No answer/key leak into active exam.
- [x] **Compact display:** [`src/template.html`](../src/template.html) and [`bootstrap.ts`](../src/app/bootstrap.ts) add accessible Aa appearance popover, saved light/dark and text scale, fullscreen/exit with browser-denial warning, Escape/outside close and proper keyboard focus. Backup preference contract v3 unchanged.
- [x] **Learning integration:** Existing FSRS-7 notebook, source-linked revision exams and topic analytics preserved, and enhanced with due/review/bookmark summary cards and self-reported error-pattern counts in the same visual system.
- [x] **Visual design and responsiveness:** CSS [`src/styles/app.css`](../src/styles/app.css) now gives coherent hierarchy, progress tracks, responsive panels/tables, premium card styles, dark-mode tokens, focus-visible and reduced-motion handling. Chrome automated no-horizontal-overflow checks span **390px and 768px** for library, history, exam, insights, review, time ledger and learning.
- [x] **Regression QA:** 75 strict Node tests, build-generated offline HTML, real Chromium `file://` end-to-end CGL three modes, six imported question kinds, frozen media, self-assessment, FSRS, generated revision, backup/reopen, optimistic multi-tab conflicts, fallback collisions, injected quota failure and responsive tests.
- [x] **Five-step execution:** architecture scratchpad tracks audit→analysis→implementation→objective reconciliation→targeted QA with explicit limitations and evidence; the complete implementation and documentation HEAD was verified in CI #40916049802.

## Separate Pass 10/manual release gates (not claimed met)

- [ ] Side-by-side real visual signoff against v11 screenshots and representative desktop/mobile browsers; source audit and computed-style/browser smoke do not establish *pixel parity* or subjective design satisfaction.
- [ ] Firefox/Safari `file://`, actual Android/iOS input/keyboard/touch, fullscreen quirks and screen reader AT.
- [ ] Long-history/high-card-count performance, forced tab termination and device-level storage quota behavior (simulated write failure is not device-level evidence).
- [ ] Deliberately changing device clock while browser is closed cannot be conclusively prevented by a standalone offline file.
- [ ] No real-user production data migration or old v11 database importer exists (clean overhaul remains intentional).

These are transparent release gates, not grounds to return to the rudimentary pre-Pass-9 UI.
