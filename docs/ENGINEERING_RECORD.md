# Practice Desk — canonical engineering and decision record (Passes 4–16)

> **Consolidated 30 October 2026, `overhaul`.** Frozen reference: `baseline/v11` at `e661822d865927e89a837790c1c6bc1cfc2562a6`. This file replaces historical per-pass acceptance, architectural scratchpads, and parity-programme Markdown files. Original source documents are preserved in Git at [`d4c36f928605`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/). All embedded historical DONE/OPEN/QA statements are **time-stamped records**, not substitutes for a fresh source-code audit.

## 1. Binding contract, decisions and release boundary

**Invariants:** single self-contained offline `file://` HTML; modular strict TypeScript and one model-driven six-question-kind runtime; no `legacy.ts` fork; immutable hash-validated question/paper/key/media and attempts; safe optimistic local history, checked additive backup v3, separate FSRS and manual grading; no live-test solution disclosure; no analytics, account or runtime network dependencies. Work only in `overhaul`, preserve `main` and `baseline/v11`.

**User-approved editorial policy:** In the *source* edition, source-invalid CGL questions remain excluded. In *reviewed* editions, unpatched source-invalid/caution become scoreable **caution** with the original published answer retained; independently evidenced changes require reviewed patches. For 6 October 2026 Q62, source exclusion and reviewed published **B** (+2, D −0.5) must coexist with visible after-submission dispute. The reported published key is not declared independently correct.

**Generic scoring invariant:** imported multi-select/matching nonidentical component-scored answers cannot exceed an item's declared `correctMarks`. Full-credit denominator must remain meaningful. Other negatives and optional `floorAtZero` preserve rule semantics.

**Accepted historical differences:** safer v3 additive, non-overwriting backups (v11 replace-newer was not retained); **no migration of old v11 history** because this is a new app with no live legacy users; section-relative actual foreground exposure never reconstructed for old data; cohort comparisons require frozen revision/mode equivalence; native accessible controls improve on legacy. Generic six-kind exams and FSRS are added capabilities, not CGL assumptions.

**Release gate:** Prior automated CI and simulated browsers are *historical evidence* only. Actual Android/iOS touch and storage, Apple Safari, NVDA/VoiceOver, OS-kill/eviction, manual keyboard/visual preference, and explicit user merge authorization are **not complete**.

## 2. Pass-by-pass verified engineering scope (historical record)

| Pass | Scope | Status at consolidation |
|---|---|---|
| 4 | One unified CGL+generic exam engine, offline UI, source revisions | Implemented; original physical release gates open |
| 5 | Learning/FSRS notebook, notes, review evidence | Implemented |
| 6 | Frozen media/key/paper, validation, backup v3, persistence | Implemented |
| 7 | Six-kind scoring/manual written assessment/source review | Implemented |
| 8 | Notebook-built revision exams and evidence-limited analytics | Implemented |
| 9 | Rich exam/results/history presentation and QA | Implemented, with later v11 gaps fixed in Passes 11–14 |
| 10 | Storage backend fallback, browser persistence/stress acceptance | Implemented; physical device gates unresolved |
| 11 | Direct keyboard/navigation/fullscreen/section and timer parity | Implemented |
| 12 | Detailed frozen original/review results, option states, maximum marks | Implemented |
| 13 | Atomic completed deletion, storage panel, comparable history, selected setup | Implemented |
| 14 | Actual visits, speed, audit filters, linked longest items and study prompts | Implemented |
| 15 | v11 paired visual source review, responsive/focus/contrast | Automated implemented; human/real-device gates open |
| 16 | New CGL source/edition audit, corrected scoring policy, generic ceiling, learning focus | Automated implemented; separate de novo audit to follow |

## 3. Original Passes 4–10 acceptance/design records (preserved)

> The full original text is retained below for design provenance. Any report-level “complete” or “pending” assessment is a historical statement; later explicit policy and implementation override older scratchpad suggestions.


### Historical PASS4_RELEASE_ACCEPTANCE.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS4_RELEASE_ACCEPTANCE.md)

# Pass 4 — clean overhaul release acceptance

Architecture: **one typed runtime**, one offline library/history/results path. No `legacy.ts`, CGL bridge, v11 storage compatibility or migration. The complete v11 reference stays untouched on `baseline/v11`.

## Automated CI gates — passed in [CI #40855216283](https://github.com/oneshubhamt/practice-desk/actions/runs/40855216283)
- [x] Node 24, TypeScript 7.0.2, one reproducible `file://` HTML and no external assets
- [x] 10 built-in CGL source/reviewed editions; strict/flexible/single-section modes through the same engine
- [x] Imported six-response-kind exam, frozen scoring and section/question review
- [x] IndexedDB new-profile save/reopen and stale-tab rejection; localStorage fallback conflict
- [x] SHA-256 backup export/import and rejection of corrupt archives
- [x] Source/reviewed images from inlined data and 390px/768px responsive screens

## Platform-dependent manual release checks
- [ ] Firefox and Safari `file://` open/reopen behavior and storage permissions
- [ ] Device storage-quota denial, private browsing, browsers with blocked IndexedDB
- [ ] Mobile touch/keyboard, assistive technology, reduced-motion and zoomed layouts

**Pass 4 engineering complete and Chromium CI green (29 October 2026).** The unchecked platform-specific items above are real-device/browser release acceptance checks, not remaining legacy-code work. Neither Firefox nor Safari has been claimed as tested.

Pass 5 (mastery evidence, error notebook, FSRS-7 and revision sets) is tracked in `docs/PASS5_RELEASE_ACCEPTANCE.md`.


### Historical PASS5_RELEASE_ACCEPTANCE.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS5_RELEASE_ACCEPTANCE.md)

# Pass 5 — learning and revision acceptance

Status: **Implemented and Chrome `file://` CI verified on 29 October 2026**. Keep `main` and `baseline/v11` unchanged; no v11 migration or separate legacy runtime.

## Automated [CI #40858120327](https://github.com/oneshubhamt/practice-desk/actions/runs/40858120327)

- [x] `ts-fsrs` **6.0.0 stable**, its current FSRS-7 scheduler and explicit user ratings; deterministic replay from saved ISO review logs.
- [x] Notebook questions and correct answers pinned to completed, frozen revisions; cannot create learning cards from unfinished exams.
- [x] Custom user-confirmed error categories, bookmarks, bounded editable notes and manual subtopics; no inferred error diagnoses.
- [x] Individual result-card capture and one-click revision sets from incorrect and skipped questions.
- [x] Responsive review queue, answer hidden until user reveal, Again/Hard/Good/Easy input and FSRS due-card scheduling.
- [x] Topic accuracy, coverage and sample-size evidence from completed attempts; imported topic identifiers and section fallbacks; exact-paper-revision comparable trend groups.
- [x] Learning records in existing IndexedDB/concurrency/fallback storage; validated backup export/import, round-trip and same-profile `file://` reopen.
- [x] 51 Node tests and real headless Chrome user flows for Pass 5 and earlier features.

## Manual release acceptance (not claimed complete)

- [ ] Firefox and Safari `file://` notebook save/reopen and FSRS due-card scheduling.
- [ ] Android/iOS touch, keyboard, zoom and assistive technology.
- [ ] Quota exhaustion, blocked storage and large history/card-count performance on devices.

The app intentionally avoids automatic mock-result grading, AI-derived topic labels, or unvalidated percentile/readiness estimates. Changing `ts-fsrs` or FSRS parameters after storing real user reviews requires a deliberate scheduling-compatibility decision.


### Historical PASS6_RELEASE_ACCEPTANCE.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS6_RELEASE_ACCEPTANCE.md)

# Pass 6 — Integrity and persistence hardening

Status: **Engineering and automated Chromium acceptance complete**, [CI #40863482395](https://github.com/oneshubhamt/practice-desk/actions/runs/40863482395) green, **55/55 unit tests** and real `file://` browser smoke passed. `overhaul` only; `main` and `baseline/v11` are unchanged.

## Engineering scope

- [x] Canonical, recomputed question/key/paper SHA-256 hashes for imported and frozen content; embedded images digest-verified
- [x] Strict five-kind stimulus validation and referential checks for question/option/stimulus assets; bounded media bytes
- [x] Completed attempt validation checks recomputed **item-level verdicts/marks** and aggregate totals
- [x] Exact historical display media frozen in attempts and notebook records; question review can remain self-contained
- [x] Backup v3 with validated all-record snapshots and display preferences; additive atomic IndexedDB record import
- [x] Save promises complete only after IndexedDB commit or localStorage write; UI ratings, notebook edits and package imports do not prematurely announce success
- [x] On storage/write failure, block more edits, display a persistent fault message, preserve in-memory changes and export an explicitly named `UNSAVED_RECOVERY` file
- [x] Tests for hashes, malformed stimuli, missing/corrupt media, frozen media retention, per-item score tampering, backup/preferences restore and browser quota/write failure

## Remaining platform release acceptance

- [ ] Firefox and Safari `file://` storage and export/reimport acceptance
- [ ] Real Android/iOS testing, assistive technology and zoom/keyboard navigation
- [ ] Device-level storage-quota exhaustion and long-history performance; write-rejection simulation is **not** physical-device coverage
- [ ] Independently verify browser-close/pagehide behavior under forced termination

## Deliberate design boundaries

- No migration from v11, backup v2 or frozen attempt schema 1: there are no existing production users of this branch.
- Browser writes remain best-effort on `file://`. An emergency recovery backup is generated from the in-memory state only if the user explicitly exports it; it cannot be guaranteed after a crash.
- Preferences are stored in localStorage and cannot participate in the IndexedDB record transaction. If preference restoration fails after records import, the outcome is reported as partial.
- Canonical digests detect accidental or mismatched content, **not** deliberate forgery of both content and digest. Backup SHA-256 is corruption detection, not authentication.
- Mastery/advanced analytics, exam policy features and larger UI restructuring are Passes 7–9, not claimed by Pass 6.


### Historical PASS7_RELEASE_ACCEPTANCE.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS7_RELEASE_ACCEPTANCE.md)

# Pass 7 — Exam and review correctness

**Status:** Pass 7 correctness engineering complete and verified by [GitHub Actions #40899786917](https://github.com/oneshubhamt/practice-desk/actions/runs/40899786917): **64/64 Node tests**, strict TypeScript, one standalone offline HTML, and headless Chrome `file://` end-to-end smoke green. Implemented on `overhaul`. Keep `main` and `baseline/v11` unchanged. Follow the [five-step workflow and file map](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/README.md#architecture-and-execution-map); full reasoning and evidence are in the [architecture scratchpad](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md).

## Objective-by-objective acceptance

- [x] **Engine policy ownership:** `SUBMIT_ATTEMPT` can no longer bypass sectional timers or section locks; `SUBMIT_SECTION` honours `allowEarlySubmit` and delayed clicks cannot submit two sections. Pure tests cover automatic expiry, forward-only navigation, disallowed pause and flag actions.
- [x] **Clock safety within a live tab:** `createSessionClock` measures time from monotonic elapsed duration rather than mutable wall clock; a backward sample never generates negative time or double counts. Existing restart/visibility/expiry tests pass.
- [x] **Frozen attempt-mode correctness:** strict simulation, flexible whole-paper practice, section practice and custom practice freeze their distinct mode labels and paper revisions; tested on built-in CGL and imported six-response-kind exam.
- [x] **Frozen historical review:** Results render the exact frozen passages, tables/charts, stem media, choice media and matching media independently of a currently selected package, preserving escaped text and input/read-only separation. Chrome decodes real CGL figures after submission.
- [x] **Source provenance:** built-in questions retain original `sourcePage`, validated source links and review-patch citations without inventing references. Hashes include editorial provenance.
- [x] **Original vs reviewed score correctness:** reviewed CGL attempts optionally pin an independently validated original-source answer-key reference at start; an explicitly labelled *unadjusted* comparison includes the original source key's defective items, separately from frozen reviewed/audited marks. The comparison is not asserted to be an official score.
- [x] **Editorial/scoring rules:** draft, invalid, incomplete-source, under-review and superseded questions are excluded from scoring. Tests cover excluded draft despite a matching response.
- [x] **Written-response workflow:** answered free-response questions remain `pending` in automated scoring; optional self-assessed marks (0–configured correct marks) and notes are separately validated, persisted and recoverable, never overwrite the immutable automated score. UI waits for durable writes.
- [x] **Targeted QA & earlier regression:** pure policy/score/recovery tests plus complete real Chrome `file://` CGL (all 3 modes), custom six kinds, rich review, manual grading, source comparison, backup v3, reopen, IndexedDB conflicts, injected quota denial and 390/768 px responsiveness.
- [x] **Five-step documentary process:** original code audit, design choices, implementation map, objective ledger and targeted QA evidence recorded in the architecture scratchpad.

## Remaining independent release gates

- [ ] **Cross-restart adversarial wall-clock changes / forced tab termination:** no purely offline clock can authenticate the real time elapsed while the browser and device are off or while the system clock is deliberately modified. Current restore uses the best-available wall interval; do not promise anti-tamper enforcement.
- [ ] Manual Firefox/Safari `file://`, Android/iOS, device quota behavior and assistive technology (Pass 10).
- [ ] **v11-grade feature and visual parity**: home, distinct history, insight/review tabs, speed–accuracy, pacing, filters, polished exam navigator, display popover and fullscreen (Passes 8–9). Track each in the [v11 parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md).

Pass 7 is exam/review **correctness**, not the end of the product overhaul or a claim that the simpler current UI matches v11.


### Historical PASS8_DESIGN.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS8_DESIGN.md)

# Pass 8 data decisions

This is a companion to the [live five-step architecture scratchpad](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md). Source of truth remains the scratchpad and executable code/tests.

- **Revision package:** derive a transient, validated custom paper from explicit notebook selection, never mutate original paper/key or write a second data store. Pin source question revisions and answer definitions; freeze only required referenced media, reject conflicting asset/stimulus identities and duplicate IDs. Group within the same exam, allow cards from different paper editions, and use a fixed, explicitly disclosed practice rule of +1 correct, 0 incorrect/unanswered. Use a new UUID-based paper/attempt revision identity to avoid confusing different revision sessions. Normal engine/history/backup handles the generated attempt.
- **Topic granularity:** retain section as broad fallback; add explicit question topic IDs and user-labelled topics without classification inference. Distinguish observations (multiple attempts may repeat a question) and unique question revisions, and gate interpretation by answered sample sizes/independent attempts.
- **Timed analysis:** per-question duration means foreground time in the question, not total cognitive work. Speed buckets require a section median and sufficient measured, answered items. Marks opportunities use frozen marking rules only; avoid presenting maximum opportunities for partial-credit/pending/excluded items as predictions.
- **FSRS:** cache scheduled cards keyed by immutable card object identity and clear caches when the card record changes. Never schedule a card from a mock score, never create FSRS ratings for generated revision exams.
- **UX constraints:** This pass provides functional entry points and evidence, not the final UI. Rebuild home/history/results controls and v11-level aesthetics in Pass 9 using the parity ledger.

## Implementation amendments

- Preserve `sourceAttemptId` on each frozen notebook card and a hashed `notebookLineage` on each generated attempt. This is **provenance**, not a foreign-key constraint; deleting a source record does not invalidate an independently backed-up revision test.
- For evidence strength, only **answered** unique revisions and **attempts with scored answers** count toward consistency thresholds. Skips and repeats still appear in raw coverage/observation totals but cannot independently establish high accuracy.
- Speed groups use <0.75× and >1.5× the **within-section median** of answered questions with positive foreground measurements, and only if at least five such items exist. Count answer replacements but do not infer a change from wrong to right without recording actual successive response values.
- No rank/percentile prediction and no claim that exam difficulty is comparable across different immutable paper revisions. The exact-revision longitudinal sequence remains visible.


### Historical PASS8_RELEASE_ACCEPTANCE.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS8_RELEASE_ACCEPTANCE.md)

# Pass 8 — Advanced revision and trustworthy analytics

Status: **Pass 8 implementation and automated Chromium acceptance completed** (final documentation HEAD verified in [CI #40904651689](https://github.com/oneshubhamt/practice-desk/actions/runs/40904651689): 70/70 Node tests, strict TypeScript, standalone HTML generation, and Chromium `file://` regression passed). Maintain this alongside [architecture scratchpad](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md), [data model](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/DATA_MODEL.md), [v11 parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md), and [engineering rules](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/AGENTS.md). All work remains on `overhaul`.

## Acceptance checklist — no check without verification

- [x] Build a genuine exam-engine revision attempt from notebook cards, with immutable frozen question/answer/media references; filter by explicit criteria, prohibit mixing incompatible exams, never expose keys during an active attempt and persist/reopen/backup as a regular attempt.
- [x] Make revision-test scoring clearly a **practice scoring policy** rather than pretending original source marks; exclude editorial-invalid material; avoid duplicated question revisions or conflicting shared assets.
- [x] Improve taxonomy evidence using explicit source topic IDs, section names and user-supplied tags, with observation counts, distinct question coverage and honest minimum sample sizes; no inferred topic labels.
- [x] Provide question-time / pace, section-performance, speed–accuracy, negative-mark and hypothetical opportunity arithmetic computed from frozen responses/marking rules; guard missing timings, partial-credit, pending and editorial exclusions.
- [x] Provide same-revision longitudinal comparisons and conservatively qualified evidence progression across independent attempts. Never claim ranks, percentiles, calibrated mastery or causal effects of answer changes.
- [x] Make FSRS due-date handling bounded and efficient for repeated UI redraws; only explicit self-ratings alter FSRS schedules.
- [x] Unit and browser QA: cross-paper notebook revision, answer secrecy, frozen-media handling, no notebook cards, odd grading/status policies, due queue and existing 64+ tests, saved history/backup, responsiveness.
- [x] Audit → analyze → implement → check each objective → targeted QA recorded in the live architecture scratchpad; final-head CI verified.
- [x] Preserve [Pass 9 v11-grade visual and feature parity](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md) as an explicit release requirement; Pass 8 may expose data simply without claiming finished visual design.

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


### Historical PASS9_RELEASE_ACCEPTANCE.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS9_RELEASE_ACCEPTANCE.md)

> **DOCUMENT STATUS (30 Oct 2026): HISTORICAL / SUPERSEDED FEATURE-PARITY CLAIM.** The authoritative current v11 feature audit and Passes 11–16 are in [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md); historical green CI or an older “parity complete” claim **does not prove full feature parity**. See [consolidated project status](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PROJECT_STATUS.md).

# Pass 9 — v11-grade product interface and feature restoration

**Status:** **Complete for engineering and automated Chromium acceptance** on `overhaul`: [verified final CI #40916049802](https://github.com/oneshubhamt/practice-desk/actions/runs/40916049802), **75/75 Node tests**, strict TypeScript, generated offline HTML and the full Chromium `file://` suite green. `main` and `baseline/v11` are protected. This is source-and-automated-UI parity, **not a claim of pixel-identical appearance or physical-device signoff**.

Read the [architecture audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md), [v11 parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md), [data model](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/DATA_MODEL.md) and [AGENTS.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/AGENTS.md).

## Objective-by-objective engineering acceptance

- [x] **Designed home:** [`src/app/generic-ui.ts`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/generic-ui.ts) shows selected-paper details, correct mode-specific question count/time/navigation, mode cards, completion/in-progress statistics, latest attempt links, active-attempt resume banner, learning/backup entry, offline and scoring guidance.
- [x] **Separate history:** [`src/app/history-page.ts`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/history-page.ts) implements a real standalone route with search, status filter, old/new sorting, completed/in-progress resume, backup controls, metrics, newest eligible same-revision comparable trend and cross-paper descriptive section priorities. Missing/unanswered scores never appear as invented zero-percent trend points. Notebook-revision exercises are excluded from main section priority rankings.
- [x] **Tabbed results and review:** [`src/app/result-presentation.ts`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/result-presentation.ts) plus generic UI expose Insights, Question review, Time ledger with accessible tabs; exact source/reviewed key and self-assessed written marks remain distinct. Review filters include wrong, skipped, correct, excluded, pending, flagged, fast wrong and slow wrong. Frozen media, source pages/links, explanations, notebook buttons and grading remain intact.
- [x] **Richer analysis:** Section progress/accuracy bars, frozen foreground-time ledger, speed×accuracy summary, original source-key explanation, actual penalty and rule-based hypothetical mark opportunities. Opportunity/speed cells link into targeted question-review filters.
- [x] **Actual answer revisions:** [`src/engine/session.ts`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/engine/session.ts) records first answer/replacement/clear event snapshots with time; [`src/learning/answer-revisions.ts`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/learning/answer-revisions.ts) computes observed wrong→correct and correct→wrong *direct single-choice transitions only*, excludes clear/reselect and unverified material and never asserts causation. Unrecorded older attempts display an explicit limitation, not fabricated outcomes.
- [x] **Immersive exam:** Section/timer progressbar, strong low-time clock, accurate answered/viewed/flagged status, section controls, sticky question palette and legend, keyboard Alt+arrow question navigation, native accessible inputs/focus and policy-based disabled controls. No answer/key leak into active exam.
- [x] **Compact display:** [`src/template.html`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/template.html) and [`bootstrap.ts`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/bootstrap.ts) add accessible Aa appearance popover, saved light/dark and text scale, fullscreen/exit with browser-denial warning, Escape/outside close and proper keyboard focus. Backup preference contract v3 unchanged.
- [x] **Learning integration:** Existing FSRS-7 notebook, source-linked revision exams and topic analytics preserved, and enhanced with due/review/bookmark summary cards and self-reported error-pattern counts in the same visual system.
- [x] **Visual design and responsiveness:** CSS [`src/styles/app.css`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/styles/app.css) now gives coherent hierarchy, progress tracks, responsive panels/tables, premium card styles, dark-mode tokens, focus-visible and reduced-motion handling. Chrome automated no-horizontal-overflow checks span **390px and 768px** for library, history, exam, insights, review, time ledger and learning.
- [x] **Regression QA:** 75 strict Node tests, build-generated offline HTML, real Chromium `file://` end-to-end CGL three modes, six imported question kinds, frozen media, self-assessment, FSRS, generated revision, backup/reopen, optimistic multi-tab conflicts, fallback collisions, injected quota failure and responsive tests.
- [x] **Five-step execution:** architecture scratchpad tracks audit→analysis→implementation→objective reconciliation→targeted QA with explicit limitations and evidence; the complete implementation and documentation HEAD was verified in CI #40916049802.

## Separate Pass 10/manual release gates (not claimed met)

- [ ] Side-by-side real visual signoff against v11 screenshots and representative desktop/mobile browsers; source audit and computed-style/browser smoke do not establish *pixel parity* or subjective design satisfaction.
- [ ] Firefox/Safari `file://`, actual Android/iOS input/keyboard/touch, fullscreen quirks and screen reader AT.
- [ ] Long-history/high-card-count performance, forced tab termination and device-level storage quota behavior (simulated write failure is not device-level evidence).
- [ ] Deliberately changing device clock while browser is closed cannot be conclusively prevented by a standalone offline file.
- [ ] No real-user production data migration or old v11 database importer exists (clean overhaul remains intentional).

These are transparent release gates, not grounds to return to the rudimentary pre-Pass-9 UI.


### Historical PASS10_RELEASE_ACCEPTANCE.md

[Original at frozen commit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS10_RELEASE_ACCEPTANCE.md)

> **DOCUMENT STATUS (30 Oct 2026): HISTORICAL RELEASE-HARDENING LEDGER.** The authoritative current v11 feature audit and Passes 11–16 are in [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md); historical green CI or an older “parity complete” claim **does not prove full feature parity**. See [consolidated project status](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PROJECT_STATUS.md).

# Pass 10 — release hardening and independent acceptance

**Status: IN PROGRESS.** Started 29 October 2026, `overhaul` only. This ledger distinguishes automated engineering checks from physical-device release approval; do not merge into `main` or change `baseline/v11`.

## 1. Audit

**Baseline:** Pass 9 accepted 75 Node tests, strict TypeScript, Chromium `file://` end-to-end scenarios, backup v3, stale-tab protection, quota-failure simulation and responsive layouts. [Pass 9 ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS9_RELEASE_ACCEPTANCE.md) and [v11 parity](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md) remain regression sources.

**Confirmed risk:** IndexedDB may open successfully but fail when loading initial history. Previously the startup exception switched the visible history to localStorage fallback while leaving the failed `db` handle active. Later saves could target the abandoned IndexedDB handle rather than the displayed fallback store.

**Other pending risks:** Real Safari/Firefox Android/iOS storage semantics, forced renderer kill, quota eviction, large history/card sets, assistive technology and side-by-side v11 visual signoff.

## 2. Analysis / invariants

- A failed IndexedDB startup/read must close and clear its handle before using fallback, so both reads and writes use the same store.
- User-visible success must follow acknowledged storage writes; backup must reflect committed records or explicitly identify unsaved memory recovery.
- Keep one strict TypeScript exam engine, frozen revisions, validated FSRS and backup v3, standalone `file://` HTML with no runtime network or v11 migration.
- Use Chromium full regression; add Playwright Firefox and WebKit offline workflows. Linux WebKit is not physical Safari/iOS.
- A bounded history benchmark can detect catastrophic regressions, but does not certify slow devices or thousands of real cards.

## 3. Implementation inventory

- [x] `src/app/generic-ui.ts`: close/reset IndexedDB after any bootstrap failure before populating localStorage fallback.
- [x] `scripts/smoke-offline.mjs`: inject initial `getAll()` failure after successful database open; require subsequent answer save in fallback store.
- [x] `scripts/pass10-platform.mjs`: cross-browser offline answer persistence, backup, reload and answer recovery; Chromium-only 80-record history guardrail.
- [x] `.github/workflows/ci.yml`: Chromium original full smoke plus new Pass 10 test; Firefox and WebKit jobs with installed Playwright browsers.

## 4. Objective and targeted-QA ledger

- [x] Strict TypeScript, reproducible offline HTML build and **75/75 Node tests**; [Pass 10 source CI #40921780620](https://github.com/oneshubhamt/practice-desk/actions/runs/40921780620) green.
- [x] Original full Chromium `file://` suite, including SSC modes, six question kinds, FSRS, backup/restore, two-tab stale-write and simulated quota failure.
- [x] Injected IndexedDB *initial read* failure now produces working localStorage fallback writes (real Chromium browser).
- [x] Firefox Playwright `file://` saved answer → backup → reload → recovered selection.
- [x] Linux WebKit Playwright `file://` saved answer → backup → reload → recovered selection.
- [x] Bounded Chromium 80-record frozen-history loading/rendering: **438 ms** measured in CI #40921780620 (runner-specific).
- [x] Generated `Practice_Desk_Offline_Mock_Tests.html` refreshed after successful source checks in auto-commit `840e070`.
- [ ] Final documentation-only HEAD CI verification; do not claim its result before it completes.
- [ ] Manual browser, actual devices, crash/OS-kill, screen reader and screenshot signoff remain separate (below).

## 5. Independent manual/platform release gates

- [ ] Real desktop Firefox/Safari `file://` reopen, history and backups (not just headless Playwright).
- [ ] Physical Android/iOS touch, on-screen keyboard, orientation, zoom, fullscreen, save/export and reimport.
- [ ] NVDA/VoiceOver and keyboard-only accessibility, focus, announcements and contrast.
- [ ] Direct desktop/tablet/phone screenshot comparison with frozen v11; user visual approval.
- [ ] Forced renderer/OS termination before/during/after an unacknowledged IndexedDB transaction. An ordinary close/reload test is **not** an abrupt-crash test.
- [ ] Real quota exhaustion/private/blocked storage/eviction and actual recovery-file usability.
- [ ] High-card-count/multi-thousand-attempt workloads and measured performance on slower devices.
- [ ] Explicit release signoff, including any remaining constraints.

## 6. Verified evidence and release decision

Before Pass 10: final Pass 9 HEAD `70c63d6`, [CI #40916405833](https://github.com/oneshubhamt/practice-desk/actions/runs/40916405833) green.

**Pass 10 automated source/Chromium/Firefox/Linux WebKit gates: GREEN** in [CI #40921780620](https://github.com/oneshubhamt/practice-desk/actions/runs/40921780620). Source commit `8eb82a7`; CI-generated offline HTML commit `840e070`. Earlier individual runs on `d71bc68` through `1d3c0e9` failed only because the generated-HTML publishing step raced with newer commits; browser and tests passed. Branch CI now has `cancel-in-progress` concurrency.

**Release decision: NOT YET APPROVED.** Exact final documentation HEAD verification and physical-device/manual signoff remain open; do not convert automated results to device approvals.


## 7. Post-ledger verification and current programme correction (30 October 2026)

The previously pending docs-only final HEAD `5b9dce604faef10a714415341c7da5116bf6ff8a` subsequently **passed all three jobs** in [CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096). This resolves the **automated final HEAD verification** row above without rewriting dated original history. It does **not** satisfy device, accessibility, forced-exit or visual signoff. A further **independent source audit identified nontrivial v11 functional/UI gaps**; current status is [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md). Passes 11–16 are planned; no parity fix was made in this documentation update.

