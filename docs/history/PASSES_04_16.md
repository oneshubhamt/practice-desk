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


## 4. Passes 4–10 architecture worklog and design reasoning

> Selected direct implementation worklog from the original [architecture audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md). Earlier Passes 1–3 and superseded initial analyses remain in frozen Git history. The extract is intentionally historical and may contain past TODOs no longer current.

### Pass 4 first implementation — model-driven exam workspace

- Added `src/app/exam-package.ts` as a validated, self-contained examination package contract (paper/key/questions/stimuli/embedded images), alongside adapters for the five existing CGL source/reviewed editions.
- Introduced `src/app/generic-ui.ts` as a schema-driven exam workspace accessible from the existing library. It uses the same generic session/scoring engine and supports single-choice, multiple-select, numeric, true/false, matching and written responses; sections/timers/navigation derive from the paper definition.
- Local JSON packages can be loaded without a network. Generic attempts and imported packs are written to the existing IndexedDB attempts store with distinct record types, leaving the CGL history filtered separately. LocalStorage is a best-effort fallback.
- Existing CGL home/exam/results/history flows remain untouched except the exam-workspace entry point. All code bundles into the single offline HTML.
- Pass 4 remains in progress: generic and existing histories should be unified, complete multi-kind browser tests are needed, image/asset checking needs more coverage, and final file:// acceptance across browsers is outstanding.


### Pass 4 CGL fidelity in generic workspace
- Added option-image references to the typed CGL importer and embedded option-image assets to generic exam packages, preserving figure-based questions in the new UI.
- Explanations are carried separately into each generic package, with the solution bank supplying missing inline explanations; editorial notes and answer keys remain hidden during the attempt.
- The original CGL library and result screens remain unmodified; this work targets the new model-driven workspace only.


### Pass 4 integrity and result transparency
- Images in imported packages are checked against their actual decoded byte SHA-256 hashes. Assets are content-addressed by image bytes rather than data-URI text.
- Attempt results show human-readable option labels, numbers, true/false values, matching labels and manual-response status, with expected answers and source explanations only after submission.
- The frozen generic attempt now carries its explanation text for historical review even if an uploaded package is subsequently edited.


### Pass 4 storage and UI workload checkpoint

- Generic exam workspace timer now checkpoints to IndexedDB at most every 10 seconds during stable countdown; answers, section changes and submission are persisted immediately.
- Added synchronous emergency mirror for the current attempt, reconciled against IndexedDB on reopening with completed records taking precedence.
- Import rejects a package attempting to reuse an existing paper revision ID, preventing silent replacement of built-in or previously imported content.
- An actual multi-browser file:// reopen test is still pending. Browser persistence remains best-effort; signed provenance is not provided by the import checksum.


### Pass 4 integration checkpoint — cross-exam history and generic backup

- The existing History screen now includes completed attempts made in the generic exam workspace, with deep links to their frozen answer review. Metrics count completed generic and CGL attempts, but heterogeneous exams remain excluded from CGL-only analytics trends.
- Generic workspace exports/imports checksum-verified version-2 archives of generic attempts and uploaded package definitions, with additive transactional IDB merge. Incoming records undergo schema, frozen-revision, response and completed-score validation before writes; existing attempt IDs are never replaced.
- Explicitly maintain separate CGL and generic backup export actions; the old CGL import pipeline does not silently accept generic records.
- Deferred acceptance: browser reopen and full file:// smoke tests; consider a unified all-data backup flow before release.


### Pass 4 — actual offline browser acceptance gate

- Added a real Chrome/Chromium headless `file://` CI smoke test: double-click equivalent loads the generated standalone HTML, enters the generic workspace, starts a CGL exam, saves a selected response into IndexedDB, shuts down the browser, reopens **the same file URL and profile**, and checks that the response is restored.
- This supplements (not replaces) pure TypeScript tests and static single-file reproducibility verification.
- The test uses the runner's preinstalled Chrome/Chromium, without changing browser dependencies shipped to users.
- CI run is required before calling the browser acceptance gate verified.


### Pass 4 verified checkpoint — 29 October 2026

**CI success:** [40751917786](https://github.com/oneshubhamt/practice-desk/actions/runs/40751917786) — strict TS, existing engine/content tests, generic backup round-trip and immutable-score validation, single-file build, real Chrome `file://` launch/save/reopen with the same browser profile, keyboard focus persistence after selecting an answer, and generated HTML reproducibility all passed.

**Implemented since the earlier checkpoint:** Main History lists completed generic attempts and opens their frozen reviews without mixing unlike exams in CGL analytics. Generic workspace has SHA-256-verified export/import of saved attempts and uploaded packs, adds records atomically, refuses duplicate record IDs, validates stored responses and frozen scores, and disables Start until storage initializes. Question navigator exposes the current item and flag state to assistive technology.

**Not yet release-complete:** Unified one-click backup across legacy and generic data, manual Firefox/Safari `file://` reopen acceptance, cross-tab write-conflict testing, and removing the parallel CGL-specific user interface in favour of one exam-agnostic presentation. `main` and `baseline/v11` remain unchanged.


### Pass 4 continuation — unified all-data history backup

- Combined the former CGL-only History export/import with generic exam attempts and imported exam-package records in one SHA-256-verified v2 archive; includes CGL frozen display revisions.
- Import validates every record with its own existing domain validator before an atomic IndexedDB `add()` transaction and skips IDs already present. There is no overwrite of completed attempts or installed exam packages.
- History now labels the one-click action `Export all data` and clarifies what is included. Generic workspace's separate export remains available.
- Extended Chrome `file://` acceptance: use the original CGL test UI, save an answer, export a downloaded archive, and verify both generic and CGL records are present.
- Requires CI validation; localStorage fallback cannot provide atomicity across two keys and must clearly surface save failures. This is not a multi-tab edit-lease implementation.

### Pass 4 reliability checkpoint — generic multi-tab write conflicts

- Generic records now include an optional integer `saveRevision` (missing means zero) checked atomically inside an IndexedDB readwrite transaction; failed checks never overwrite another tab's changes.
- A conflict stops further editing in the stale tab, clears its emergency mirror and reloads the last saved record with a warning.
- LocalStorage fallback and the original CGL UI are not yet cross-tab guarded; do not claim complete cross-tab safety.
- Focused version-guard tests added. Real two-tab Chromium verification remains part of the acceptance suite.

### Pass 4 two-tab browser regression gate

- Extended Chrome headless `file://` smoke: two simultaneous tabs reopen the same generic attempt. The second tab commits a newer revision, then the first attempts a stale update.
- The first tab must display a storage-conflict warning and the persisted record must retain the second tab's revision. This is an automated gate for generic attempts only; original CGL tab conflicts and browser-specific fallback behaviour remain deferred.

### Pass 4 verified incremental acceptance — 29 October 2026

**CI run 40805453923 passed:** strict TypeScript, all tests, single offline HTML build and real Chrome `file://` smoke. Browser smoke now covers *both* exam entry points: CGL start/answer, unified backup download including generic and CGL attempts, generic reopen, and simultaneous tabs where an outdated attempt edit is rejected without overwriting the newer IndexedDB revision.

**Current state:** Unified all-data backup and generic IndexedDB optimistic-concurrency guards are implemented. These are real checks, not a claim of final Pass 4 completion. Open acceptance items: original CGL multi-tab edits, consistent localStorage fallback conflict handling, collapsing duplicate fixed-CGL UI into the model-driven workspace, and Firefox/Safari offline manual tests. Preserve `main` and `baseline/v11`.


### Pass 4 reliability and browser-acceptance expansion — 29 October 2026

- The original four-section CGL UI now has optimistic IndexedDB write versions, matching the generic workspace's compare-before-write transaction. A stale CGL tab halts editing, warns and reloads persisted history instead of silently overwriting another tab's answers.
- CGL completion/recovery and deletion paths were strengthened: emergency mirrors are ordered by saved revision, fallback-journal recovery uses a version-guarded transaction, and deletion checks its expected revision.
- The generic localStorage fallback checks for changed records before writes and listens for cross-tab storage changes. Both UIs fail closed and warn on competing fallback edits. This is **best-effort conflict detection**, not a claim of atomic localStorage writes or atomic two-key fallback imports.
- The Chrome `file://` CI gate now tests real **CGL and generic two-tab races**, generic fallback with IndexedDB deliberately unavailable, unified export and actual file-picker import/restore, plus the **six question kinds** in a non-CGL package through submission and frozen historical review.
- Responsive browser gates cover 390 px mobile and 768 px tablet layouts without whole-page horizontal overflow. No external runtime assets, server, localhost or account were added.
- Verified: [CI run 40811155245](https://github.com/oneshubhamt/practice-desk/actions/runs/40811155245) succeeded with strict typecheck, unit tests, reproducible offline build and browser smoke checks.

**Pass 4 remains open.** The remaining substantive implementation is collapsing the fixed-CGL exam and analytics screens into the model-driven workspace without losing existing CGL-specific modes, detailed insights or presentation. The original `legacy.ts` retains `@ts-nocheck`. Manual Firefox/Safari offline testing and quota-exhaustion acceptance are also not verified here. Do not mark final release acceptance complete based on Chrome CI alone. Keep `main` and `baseline/v11` stable.


### Pass 4 shared exam-surface integration — 29 October 2026

- Extracted a pure, strictly typed model-driven `renderModelExam` presentation. The original CGL shell now calls that same renderer using its revision-frozen paper and generic engine state; custom exams already use it.
- Removed the duplicate fixed-CGL active exam markup. All three original CGL modes (locked sectional simulation, free-navigation full paper, and selected single section) retain the legacy CGL history/insights workflow and revision-aware persistence, but draw questions and controls from the generic model. Cached CGL package assets are reused.
- Original CGL and generic rendering both preserve keyboard focus on answer changes. The model-view response form is disabled while a session is paused.
- CI expanded to launch the original CGL free and single-section modes with the shared rendering, test keyboard A-D answer control, section switching, pause/resume and post-submission analytics; existing strict-mode, generic six-kind, multi-tab and backup/file-origin tests remain.
- **Verified Chrome `file://` CI:** [40812177739](https://github.com/oneshubhamt/practice-desk/actions/runs/40812177739) — typecheck, tests, generated artifact, original CGL and non-CGL end-to-end, mobile/tablet responsive gates, full backup import and concurrent-write protection passed.

**Remaining release-boundary limitations:** The CGL-specialized home, rich analytics and historical review still live in the transitional `legacy.ts` shell under `@ts-nocheck`; their removal must be preceded by feature-equivalent typed components, not a silent downgrade. Manual Firefox/Safari `file://` acceptance and quota-exhaustion behaviour are still unverified. The best-effort localStorage fallback cannot offer multi-key atomicity. Keep all changes isolated to `overhaul` until those release qualifications are addressed.


### Pass 4 final Chromium acceptance checkpoint — 29 October 2026

**Verified browser run:** [40848082790](https://github.com/oneshubhamt/practice-desk/actions/runs/40848082790) — Node 24, strict new-module typecheck, all Node tests, standalone `file://` Chrome browser flows and regenerated distribution passed.

**Implemented and verified:**
- One typed `renderModelExam` question/answer interface now handles all three SSC CGL modes and generic/custom tests, including the original/reviewed paper figures and option-image data URIs.
- All six generic response types work through result submission and reopen of a frozen attempt. Min-selection feedback is in-place and accessible; answer inputs are mapped to validated option/matching identities without `as any`.
- Shared controls honor pause, forward-only navigation and no-early-section-submission policies. The question palette disables previously visited positions in forward-only mode.
- Both CGL and generic indexed attempts reject stale-tab writes. Emergency recovery respects saved revisions; fallback storage has best-effort conflict warnings and permits exporting the latest stored generic history even after a conflict.
- Chrome `file://` regression checks restore both generic and CGL history from one checksum-verified export, exercise active-session reopen and two-tab conflicts, check 390/768-pixel layouts and decode real question/option images.
- The shared renderer indexes response records once per redraw rather than repeatedly scanning all answers for each question navigator entry.

**Acceptance decision:** The **Pass 4 shared exam presentation and Chromium regression implementation** is complete. **Final cross-browser release acceptance is not complete**: Firefox and Safari `file://` reopen/storage/backup behaviour, quota-exhaustion recovery and assistive-technology/manual interaction checks require platform testing. The original specialized CGL home, analytics and historical review remain functional but in the `@ts-nocheck` transitional shell; replacing that shell without preserving full feature parity is a separate outstanding architectural cleanup. Do not claim a fully strict-TypeScript frontend.

See `docs/PASS4_RELEASE_ACCEPTANCE.md` for remaining verification. Do not merge to `main` or overwrite `baseline/v11` before deciding on these release gates.


### Pass 4 clean-break overhaul — 29 October 2026 (supersedes earlier Pass 4 architecture notes)

**User decision:** v11 lives on `baseline/v11` as the frozen reference. There are zero current user records to migrate. Do not maintain a second legacy implementation or build backwards-compatibility storage adapters.

**Completed:** Replaced the entire `src/app/legacy.ts` runtime and `src/app/browser-engine.ts` adapter with a single `src/app/bootstrap.ts` entry, strictly typed `src/app/generic-ui.ts`, and versioned `src/app/exam-package.ts` policy configuration. The old files and their adapter tests were deleted from `overhaul` only. One library shows all ten CGL original/reviewed editions and imported exams. CGL strict, flexible and section-practice modes are revisioned paper policies, not separate renderers/engines. One history and result path presents frozen answer keys, editorial notes, explanations, per-section performance and per-question time. Users can resume, delete, export checksum-verified backups, import additive records and switch themes and type scale.

**Storage reset:** Fresh IndexedDB database `practiceDesk.overhaul.v1` (single `attempts` store) and fresh overhaul-prefixed localStorage fallback/mirror/settings keys. No reading or migrating v11 browser data. The source/paper/review/solution JSON remains separate; all execution is single-file offline.

**Verified:** CI [#40855216283](https://github.com/oneshubhamt/practice-desk/actions/runs/40855216283) passed Node 24 / strict TS 7.0.2 / unit tests / new Chrome `file://` smoke. The smoke covers all four CGL sectional submissions, free/single CGL practices, CGL image decode, custom six-response exam, frozen results, backup round trip, persistent-profile restart, IndexedDB stale-tab rejection, blocked-IDB localStorage fallback conflict/export, 390/768 px widths, and page errors. The GitHub Actions build publishes the generated self-contained HTML back to `overhaul` after successful checks. `main` and `baseline/v11` remain untouched.

**Manual release checks only:** Firefox/Safari `file://` persistence/reopen, quota exhaustion and physical-device touch/screen-reader tests remain unverified. These platform-dependent release checks must not be described as completed. Pass 5 is separate.


### Pass 5 — Learning/revision implementation (29 October 2026)

**Runtime decision:** Pin the latest stable `ts-fsrs@6.0.0` (published 28 October 2026), use its asynchronous `DefaultScheduler` with explicit FSRS-7, no homegrown scheduler and no pre-release/beta. Esbuild packages the scheduler into the one standalone `file://` HTML. Node 24 and TypeScript 7.0.2 remain pinned in CI. Retention 0.9, fuzzing disabled for deterministic replay.

**Completed:**
- `src/learning/learning.ts`: strictly validated, revision-frozen notebook cards with self-reported error type, bounded notes, explicit manual subtopics/bookmarks and ISO-ordered review-grade logs. Each card is created only after exam submission, never from an answer preview.
- `src/app/learning-ui.ts`: one responsive learning desk with notebook editing, due-card queue, answer reveal, four explicit FSRS review grades, user filters and descriptive topic/comparable-attempt metrics. The review UI discloses solutions only after revealing.
- `src/app/generic-ui.ts`: individual completed-result question bookmarking and one-click revision set from incorrect/unanswered items. The same validated IndexedDB store, write-revision guards, localStorage fallback and checksum-verified all-data backup now include learning cards. No new migration or duplicate legacy code.
- Evidence taxonomy: source `topicIds`, user-labelled subtopic and section fallback, grouped by exam; minimum 5 answered items before drawing conclusions. Comparable trends require identical immutable paper revision and policy. No rank/percentile prediction.
- `tests/learning.test.mjs`: frozen references and answer-key validation, FSRS-7 deterministic review replay, manual subtopics, fair comparable trend cohorts and backup integrity.
- `scripts/smoke-offline.mjs`: actual Chrome `file://` flow checks save-to-notebook, first review answer hidden/revealed, FSRS grading, note and error classification, backup, close/reopen persistence and previous CGL/generic/regression tests.

**Verified:** [GitHub Actions #40858120327](https://github.com/oneshubhamt/practice-desk/actions/runs/40858120327) — Node 24, TS 7.0.2 strict typecheck, 51 unit tests, single-file build, real Chrome `file://` smoke including Pass 5, IDB recovery/conflict and responsive layouts. Old `main` and `baseline/v11` remain unchanged.

**Release gates still manual:** Firefox and Safari `file://` storage, quota-denial recovery, iOS/Android input and accessibility. FSRS review feedback is self-rated; do not infer its grades from mock scores or claim statistically calibrated readiness.


### Pass 6 — integrity and persistence hardening (29 October 2026)

**Supersedes all older recovery, media and backup-format implementation notes above.** Pass 4/5 checkpoint statements in this historical roadmap refer to the state at the time, not the current branch.

- **Canonical revision integrity:** New `src/domain/hash.ts` and `src/domain/integrity.ts` recalculate hashes for question content/editorial, answer key entries, paper sections/policies/key references and all embedded image bytes. Both built-in SSC paper import and custom fixtures use the canonical hashing rules. Imported exam packages and stored frozen content are independently checked. SHA-256 detects corruption, not malicious forgery.
- **Complete stimulus/media checks:** `src/domain/media.ts` validates passage, case, table, image and chart schemas; references, unique IDs, encoded media types and content digests; media size/count ceilings. Questions cannot reference unavailable figures or stimuli.
- **Historical display durability:** Attempt snapshots now use frozen **schema 2** with the exact referenced stimuli and image assets. Learning cards also pin their own question-specific display media, allowing history and reviews without reliance on a still-available imported package. It intentionally duplicates some image data across records in return for reliable visual history.
- **Scoring integrity:** Completed history import validates every item-level verdict and mark against recomputed scoring in addition to aggregate scores. Stale or altered history with mismatched scoring is rejected.
- **Durable write acknowledgements:** `generic-ui.ts` resolves `save(record)` only after IndexedDB `transaction.oncomplete` or successful fallback write. Notebook edits, explicit FSRS review grades and imported-package UI messages await that result; non-conflict write failures block further edits and retain an exportable in-memory emergency snapshot. Stale-tab guards remain active.
- **Complete backups:** Backup **v3**, replacing v2 in the clean overhaul, includes typed attempt/package/notebook records, frozen media and validated dark-mode/font preferences. Normal exports await pending writes and snapshot authoritative IndexedDB; storage failures use an explicitly labelled `UNSAVED_RECOVERY` file instead. Imports are additive and atomic for records within IndexedDB; preference restoration occurs separately and reports failure if browser storage refuses it. `src/app/preferences.ts` centralizes preference validation.
- **Verified automated gates:** [GitHub Actions #40863482395](https://github.com/oneshubhamt/practice-desk/actions/runs/40863482395): Node 24, strict TypeScript, **55/55 unit tests**, single-file HTML generated (~1.12 MB), and genuine headless Chrome `file://` smoke. Includes full backups/preferences roundtrip, same-profile restart, IndexedDB stale-tab rejection, blocked-IndexedDB fallback conflicts, deliberately rejected `put()` with `QuotaExceededError`, unsaved recovery export, and 390/768-pixel layouts.
- **No migration:** There are no production v11 records to migrate; v11 stays on `baseline/v11`. Fresh frozen schema 2 and backup v3 are clean-break formats in `overhaul`.

**Still unverified and not claimed release-complete:** Firefox/Safari `file://` storage behavior, physical Android/iOS quota and touch tests, forced termination/pagehide data loss, accessibility/screen readers and large-history scaling. Passes 7–9 remain for exam-policy correctness, advanced learning and final UI/release hardening. See `docs/PASS6_RELEASE_ACCEPTANCE.md`.

## Pass 7 current-work scratchpad — audit and design (29 October 2026)

**1 · Audit evidence (current HEAD `69871878`, v11 `e661822d`):**
- Seven Markdown files mapped in [README.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/README.md) and [AGENTS.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/AGENTS.md), with this document as the sole live design scratchpad and `PASS7_RELEASE_ACCEPTANCE.md` as the explicit objective list.
- `src/engine/session.ts` handles section expiry and forward-only navigation; **`SUBMIT_ATTEMPT` ignores sectional policy** and `RESUME` does not verify that pausing was allowed; UI offers sectional submission only, but engine contract is bypassable.
- `src/engine/scoring.ts` scores `draft` editorial content despite excluded invalid/under-review/incomplete/superseded statuses; no explicit self-evaluated written response workflow.
- `src/app/exam-package.ts` always freezes mode `exam-simulation` despite separate CGL flexible/section and generic practice paths.
- `src/app/generic-ui.ts` result HTML does **not render frozen stimulus or images**, although `frozen.schema=2` retains them; result only has a long text-only list.
- `src/content/import-cgl.ts` preserves optional source URLs, but loses `sourcePage` and source/patch distinction unless explicitly restored.
- v11 CSS ~28.7 KB vs new CSS ~7.3 KB, and v11 legacy app offers dedicated history, insights, nuanced review, speed/accuracy, question timings, polished navigators and display popover. Overhaul is deliberately cleaner but **visually and functionally below the v11 baseline**. The explicit [v11 parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md) prevents treating this as acceptable; Pass 9 restores/refines it, while Pass 8 supplies richer analytic data and Pass 10 is platform hardening.

**2 · Design constraints and decisions:**
- Keep frozen content and scored snapshot immutable; source and reviewed answer keys must never be conflated. Original-key comparisons require a pinned, validated provenance basis; no newly guessed original scores.
- Enforce timing and navigation in pure engine, not only disabled buttons. CGL strict four 15-minute sections and early section submit **remain supported**. Whole-paper flexible is allowed to end early. For no-early-submit sectional papers, direct submission and premature section submit must be rejected.
- Maintain source-page provenance and explicit original vs reviewed citations in editorial records, verify hashes, and leave unknown sources unknown.
- For written responses, auto result remains `pending`; explicit user self-assessment may add a separately labelled persisted marks layer, never alter the original frozen `scoreAttempt` result.
- Restore all figure/passage/tabular context in results using frozen snapshot even after current package disappearance; HTML escaped and data-URI bounded.
- Run targeted engine + imported synthetic policy tests, immutable result review, v11 CGL smoke, multi-tab and backup/regression. Update this section with outcome when verified.

**3 · Implementation ledger — changes on `overhaul`:**
- `src/engine/session.ts`: sectional attempts require section transitions; direct overall submission cannot bypass them; early-submit policy and delayed section-click after timeout enforced at the pure transition boundary. Clock-rollbacks cannot cause negative time and `RESUME` checks pause policy.
- `src/engine/clock.ts` plus `src/app/generic-ui.ts`: use an epoch-anchored monotonic in-tab clock, replacing `Date.now()` for live exam event timestamps. Offline duration after a browser restart remains a best-effort wall-clock estimate (no anti-tampering claim).
- `src/app/exam-package.ts`: snapshots now distinguish `exam-simulation`, `full-paper-practice`, `section-practice` and `custom-practice`; remains a single generic engine.
- `src/domain/question.ts`, `src/domain/validate.ts`, `src/content/import-cgl.ts`: typed positive `editorial.sourcePage`, with source/review references and hashes preserved. `src/engine/scoring.ts` excludes `draft`.
- `src/engine/manual-grading.ts`: validates optional user-entered marks/notes on submitted pending free-response items; original automatically scored snapshot remains immutable. `generic-ui.ts` awaits durable save and explicitly displays independent self-assessed totals.
- `src/engine/source-comparison.ts`: captures a pinned, integrity-checked original-source key basis for reviewed attempts. Includes original-key unadjusted excluded items, **separately** from audited reviewed marks; only generated when matching source and reviewed revision identities exist.
- `src/app/generic-ui.ts`: historical review now renders frozen passage/table/image/option/matching media, source page, source URLs and answer context; not dependent on currently installed package.
- `tests/pass7-engine.test.mjs`, `tests/exam-package.test.mjs`, `scripts/smoke-offline.mjs`: comprehensive new negative engine tests and preservation of existing Chrome/offline release gates.

**4 · Objective reconciliation:**
1. Policy enforcement — **met**: no-early, strict CGL, delayed click, forward-only, pause/flag in engine tests.
2. Time integrity — **met for in-tab monotonic clock and tested restore/visibility**, **not a guaranteed anti-tamper clock across device shutdown or altered wall clock**; platform release limitation explicitly retained.
3. Mode / source provenance / editorial status — **met** with hash-covered fields and pure tests.
4. Pinned source-key comparator — **met** with separate presentation and mutation rejection.
5. Frozen visual review — **met** in Chrome with decoded built-in CGL figures; media integrity inherited from Pass 6.
6. Written response manual assessment — **met**; original result unchanged and separately persisted, backup and reopen checked.
7. Comprehensive v11 UI/feature parity — **intentionally not met in Pass 7**; feature-by-feature mandatory scope preserved in `docs/V11_PARITY_LEDGER.md`, dedicated Pass 9.
8. Offline platform QA — **Chrome automated met**, Firefox/Safari/manual touch/screen reader/storage remains Pass 10.

**5 · Targeted QA evidence:**
- Strict TS 7.0.2 / Node 24, unit testing and generated offline HTML;
- Engine tests: strict sectional rejection; no-early and automatic timeouts; delayed double-submission prevention; forward-only/flag/pause; monotonic live clock rollback;
- Import/review: draft exclusions, source-page and citation preservation, original-key integrity/tamper, full 100-item CGL frozen media decoding;
- Free response: pending automatic result, durable user-rated mark/note, unchanged scored snapshot, backup v3 and reopen;
- Chromium `file://`: strict/flexible/section modes, six answer kinds, learning/FSRS, backup/preferences, two-tab stale write conflict, fallback collision, simulated quota denial, mobile/tablet widths and no console page errors.
- [Baseline green run #40898692499](https://github.com/oneshubhamt/practice-desk/actions/runs/40898692499) — **63/63 unit tests and full Chrome smoke**, before the later targeted backup/reopen and monotonic-clock additions. The **final-HEAD CI** passed at [GitHub Actions #40899786917](https://github.com/oneshubhamt/practice-desk/actions/runs/40899786917): **64/64 tests**; all Chrome `file://` smoke checks, including manual marks and source references in backup/reopen, passed. This is an engineering/Chromium acceptance result, not cross-browser or v11 product-UI parity.

**Unresolved / next:** Pass 8 deepen learning and analytics without guessing; Pass 9 deliberately recover **v11-or-better** UI and functionality rather than perpetuating the rudimentary implementation; Pass 10 scale/real-device/cross-browser release hardening. Keep v11 frozen as the reference, not as a duplicate runtime in overhaul.


## Pass 8 — live five-step scratchpad (29 October 2026)

**1 · Audit (source, docs, v11 comparison):** `src/learning/learning.ts` has per-question frozen cards, FSRS-7 review replay, section/topic labels with a 5-answered observation gate, and exact-paper comparison, but **no executable revision sets**, no distinct-question or independent-attempt evidence, and no questions' pace/speed–accuracy/negative-mark decomposition. `src/app/learning-ui.ts` presently only lists and edits cards/reviews; `src/app/generic-ui.ts` supports add-to-notebook but not a derived exam. Every redraw calls `scheduledCard` for each item multiple times. The v11 baseline contains richer analytics and dedicated history/insights, recorded in `docs/V11_PARITY_LEDGER.md` and reserved for visual parity in Pass 9. Pass 7 resulted in 64 Node tests and Chrome offline acceptance; do not regress them.

**2 · Analyze/design:** Use one transient, custom revision exam through the existing `ExamPackage` validator, frozen attempt and generic engine. Source cards may be mixed across paper revisions **only within one exam ID**; deduplicate IDs, reject conflicting shared media and unscoreable editorial statuses, and announce +1/0 practice scoring. Revision history must retain all source media even without the original package. Analytics separate raw observation counts, unique questions, and independent attempts, use section-relative measured speed, recompute from frozen responses and marking rules, and avoid rank/causal/predictive claims. Prevent repeated full FSRS schedule replays during the same redraw by caching state keyed to unchanged card objects. [Design details](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS8_DESIGN.md). Pass 9 remains a **mandatory v11-or-better UX** gate, not optional polish.

**3 · Implement (on `overhaul`):**
- `src/learning/revision-test.ts`: build 1–25 card validated, one-exam, untimed custom practice exams using frozen question/key/media and fixed +1/0/0 marks; reject duplicate/unsafe questions and conflicting shared assets; add integrity-hashed `notebookLineage` tracing each source card to its completed source attempt/paper/section.
- `src/learning/learning.ts`: saved notebook cards now pin the source completed attempt ID. Topic categories distinguish source-provided topic IDs, section labels and user-entered labels; record raw observations, distinct answered revisions and independent **answering** attempts.
- `src/learning/attempt-evidence.ts`: pure, frozen-input section summaries; measurable question time, speed–accuracy with explicit thresholds, actual penalties, hypothetical wrong/skipped improvement arithmetic, and descriptive topic consistency bands that reject repeated-item false confidence.
- `src/app/learning-ui.ts`: "Start revision test" from current due/bookmarked/all filter, scoped to a single exam and up to 25 eligible cards; FSRS-7 schedule cache keyed by unchanged records, invalidated on replacement/deletion; richer topic evidence and consistency tables. Original FSRS rating workflow and answer-reveal behavior unchanged.
- `src/app/generic-ui.ts`: start revision through ordinary validated engine + committed history, show separate result evidence and source-note lineage; generated attempts reopen and export through backup v3 without new parallel storage.
- `src/styles/app.css`: compact responsive metric and evidence layout while explicitly deferring sophisticated home/exam/insights shell to Pass 9; no v11 runtime introduced.

**4 · Objective reconciliation:**
1. **True generated revision exams — met.** Original immutable card questions/keys/media, no active answer leak, validated custom scoring (not official), unique attempt/paper identities, history/backup/reopen and source-attempt lineage.
2. **Topic taxonomy and evidence — met.** Only explicit section/source/user labels, observation versus unique answered question versus answering attempts, five-answer measurement gate and stricter ten-answer/two-attempt/five-unique consistency gate.
3. **Detailed analytics — met as descriptive computations.** Section marks, positive/penalty, coverage, measured time, median-relative speed buckets, changes counted, exact hypothetical score swings; no causation or invented elapsed mental effort.
4. **Longitudinal evidence — met.** Prior exact-paper trend sequence preserved; consistency groups never claim calibrated mastery or compare differing keys/editions as identical.
5. **Efficient FSRS — met.** Cache prevents repeated replay for unchanged cards, invalidates on changes; no automatic rating from mock/revision scores.
6. **v11 visual parity — not claimed.** Dedicated Pass 9 remains mandatory for complete history/insights, rich result tabs, speed and pacing presentation, examiner-grade shell and full display controls.
7. **Cross-browser/manual release acceptance — not claimed.** Firefox/Safari, mobile touch, screen readers, actual quota and forced termination remain Pass 10.

**5 · Targeted QA:**
- New pure tests: genuine revision package and automatic scoring, raw source/answer-media identity, inherited backup v3, unsafe/draft and mixed-exam rejections, valid cross-paper sources within one exam, conflicting asset identities, source lineage tampering, min sample/unique question gates, speed medians and unclassified insufficiency, exact opportunity arithmetic.
- Chromium `file://` end-to-end: create notebook→FSRS rating and note→generate revision→answer hidden→complete→pacing evidence→reopen→backup→restore. Confirm FSRS rating log unchanged by generated exam.
- All previous CGL strict/free/section, six-kind custom, manual scoring, hashed media, offline backup, IndexedDB multi-tab and quota denial, 390/768-pixel responsive gates retained.
- [Green intermediate implementation CI #40903965637](https://github.com/oneshubhamt/practice-desk/actions/runs/40903965637) confirms full test suite/browser flows after lineage integration. Final documentation HEAD [CI #40904651689](https://github.com/oneshubhamt/practice-desk/actions/runs/40904651689) passed: **70/70 Node tests**, strict TS/build, all real Chromium `file://` smoke including generated revision and provenance, FSRS noninterference, complete backups/reopen, CGL/custom modes, stale-tab/fallback/quota failure and responsive layouts.



## Pass 9 — five-step UI and v11 parity scratchpad (29 October 2026)

**1 · Audit:** Current `generic-ui.ts` has one combined library/history listing, exam shell of two panels with plain timer and palette, and a continuous result page with every review rendered. `learning-ui.ts` displays FSRS, revision and topic evidence but remains a raw two-column form/table. Current CSS is ~8 KB versus v11's ~29 KB, and the current header exposes four permanent display buttons instead of v11's compact popover/fullscreen. v11 `legacy.ts` supplies dedicated home, compact in-progress resume, comprehensive history with trend/priorities, tabbed results, review filters, item timings, progress bars, speed×accuracy and mark-swing cards, and a polished immersive exam shell. The **new typed engine, FSRS, backups, provenance, draft/score integrity and offline restrictions are preserved**; no v11 code/DB migrations. [Feature parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md).

**2 · Analyze:** Implement presentation as distinct `library`, `history`, `exam`, `result`, `learning` views using existing record/map/engine; dedicated history sorting/filtering and revision-cohort trends must derive from frozen record data, not invented psychometrics. Result tabs separate overview, question review and timing, with scoped filters; keep original key/manual grades/provenance media available and no answers visible in exams. Add responsive, visually designed home, active-attempt notice, metric cards/visual pacing, enhanced exam navigator/timer, display popover/fullscreen without breaking dark/scale persistence. Preserve all historical tests and add actual Chrome `file://` UI interactions at 390px, 768px and desktop. Pass 10 remains cross-browser/screen-reader/performance/forced-exit QA.

**3 · Implementation (typed, on `overhaul` only):**
- **Home:** `generic-ui.ts` `listHTML` now returns designed page hierarchy (paper/mode card, accurate selected mode stats, active resume, recent attempts, progress summaries, learning and backup utilities, offline rules). The same existing exam store, source banks and engine are used; the new view is not an imported v11 runtime.
- **History:** new `src/app/history-page.ts`, `view:"history"`, query state and event bindings. Search/filter/sort; resume/delete, import/export; same-revision longitudinal visual trend (plotted only for measured accuracy, 2+ eligible points); cross-paper *descriptive* section priorities (no notebook-revision synthetic cohorts).
- **Results:** new `src/app/result-presentation.ts`, stateful `overview/review/timing` tabs, keyboard arrows, scoped review filters, tabpanel labels and frozen question timing rows. Existing immutable scored items/manual grades/media/provenance intact. Score-opportunity and speed-miss controls jump into filtered rich review. Section coverage bars and a coherent scorecard hierarchy.
- **Exam:** `renderModelExam` now renders active mode, high-salience remaining clock and low-time state, accessible timer/coverage progressbar, answered/viewed/flagged counts, section buttons, rich question surface and sticky palette with legend; Alt+arrows navigate via the same typed `transition` as buttons, never bypassing policy.
- **Answer revisions:** session transitions capture actual timestamped per-question selection/clear events; bounded optional histories are validated on every store/backup import (linked events, final response, time bounds and answer shapes). New `src/learning/answer-revisions.ts` computes truthful single-choice wrong→correct / correct→wrong sequences; clears and missing historic logs explicitly do **not** generate outcomes. Previous summary-only answer-change counts still available.
- **Display:** compact header `Aa` settings popover in `src/template.html`, bootstrap keyboard/outside dismiss, font-theme persistence and optional fullscreen with failure reporting. `src/styles/app.css` now contains a consistent responsive tokenized palette, stronger typography, cards, visual hierarchies, history/score/learning and dark state with reduced-motion guard. No runtime network or UI library.
- **Learning:** `src/app/learning-ui.ts` gains due/bookmarked/reviewed summary and self-reported error-pattern cards, maintaining FSRS-7 and source-linked revision behavior.

**4 · Objective reconciliation against [parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md):**
1. Home identity/selected paper/resume — **met** in source + Chromium user flows.
2. Dedicated history/insights — **met** with valid cohort selection, correctly excluded synthetic revisions and accessible archive filters; *not* claiming rank/percentile.
3. Results tabs, source/modified scoring, review filters, ledger — **met** with frozen data and positive/negative paths.
4. Real answer revisions — **met for newly captured direct single-choice edits**; older attempts and clear/reselect events appropriately cannot show rescues/losses.
5. Timed exam shell/palette/keyboard — **met** in strict/flexible/single and generic exams.
6. Appearance popover/theme/size/fullscreen control — **met as browser-supported controls**; actual fullscreen permission behavior remains platform-specific.
7. Integrated learning visuals — **met**; scheduled FSRS records never mutated by mock attempts.
8. Responsive/adaptive CSS and keyboard — **met in automated Chrome 390/768/desktop tests**, **manual real-device visual/accessibility signoff unverified**.
9. Preserved core invariants — **met**: previous 70 Node tests and expanded Pass 9 tests, offline distribution, frozen scoring, media, storage conflict and recovery all retained.
10. Screenshot pixel-perfect parity / all-platform release — **not claimed**. Requires visual review and device testing in Pass 10.

**5 · Targeted QA and evidence:**
- New `tests/pass9-ui.test.mjs`: dedicated history status/search/sort and non-mutating order, empty/null trend behavior, content-safe archive, result tabs/time ledger/review filters, exam shell/no active key leak and recorded answer event rescue/loss with tamper rejection.
- Expanded `scripts/smoke-offline.mjs`: premium home summaries, actual history search/sort/status/return and safe resume, result tabs/keyboard/ledger deep links, filtered review and source media, settings popover/Escape/theme/preferences restoration, accurate free/section mode preview, Alt+arrow exam navigation, desktop and 390/768px overflow across library, history, exam, insights, review, time ledger and learning.
- Existing full flows: strict/whole/section SSC CGL, imported six response kinds, complete original/reviewed scoring, manual written assessment, FSRS cards, notebook-generated exams, backup restore/reopen, IndexedDB stale-tab rejection (assert *newer answer* persists even with timer commits), fallback conflicts, deliberately denied quota save and emergency recovery export.
- [Latest verified pre-documentation Chrome run #40915424874](https://github.com/oneshubhamt/practice-desk/actions/runs/40915424874): **75/75 Node tests**, strict TypeScript, one self-contained HTML and complete `file://` smoke green. Verified final implementation/documentation CI [#40916049802](https://github.com/oneshubhamt/practice-desk/actions/runs/40916049802) passed: **75/75 unit tests**, strict TypeScript, 1,205,906-byte self-contained offline HTML, all Chromium `file://` paths including full CGL/custom and FSRS/revision flows, backup/restore, stale-tab protection, simulated quota denial and mobile/tablet overflow checks. The final recordkeeping-only correction has its own CI.

**Still open as manual Pass 10 signoff:** visual screenshot comparisons with original v11 in browsers, Firefox/Safari/mobile/screen readers, long-history and force-quit recovery, physical device quota and native fullscreen support. None of these are concealed under 'Pass 9 complete'.



## Pass 10 — five-step release and recovery scratchpad (29 October 2026)

**1 · Audit:** Previous Pass 9 Chromium/headless and 75 Node tests were green, but real browser/device behavior, stress, forced exit, accessibility and v11 screenshot signoff were unverified. A source review of `generic-ui.ts` found that a successful IndexedDB open followed by a failed initial `getAll()` left `db` nonnull when the catch selected localStorage fallback; subsequent writes could therefore target the wrong storage backend. [Pass 10 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS10_RELEASE_ACCEPTANCE.md) tracks detailed gates.

**2 · Analyze:** One storage failure must have one coherent fallback backend for both displayed data and future writes; close/clear the defective handle before entering fallback. Test this browser path, not just domain helpers. Keep the current single-file offline distribution and immutable scoring/backup invariants. Use Playwright Chromium, Firefox and Linux WebKit for targeted `file://` persistence and backup checks, plus a bounded 80-attempt history stress screen. Real Safari/iOS, force-crash semantics and screen readers are separate manual gates, not inferable from headless success.

**3 · Implement:** `src/app/generic-ui.ts` closes/sets `db=null` in startup catch. `scripts/smoke-offline.mjs` injects a throw from initial IndexedDB `getAll()`, then verifies a new saved answer reaches localStorage fallback. New `scripts/pass10-platform.mjs` exercises save → export → reload → saved answer in browsers and stresses Chromium with 80 uniquely identified frozen attempts. CI runs these in dedicated jobs using Playwright Firefox and WebKit, in addition to original Chromium smoke and TypeScript/test gates. `README.md`, `AGENTS.md` and this live scratchpad link to `docs/PASS10_RELEASE_ACCEPTANCE.md`.

**4 · Objective reconciliation (pending final-head CI):** Recovery-code fix and tests authored; do not mark multi-browser, scale, final HTML or CI objectives verified until the exact branch HEAD run passes. Existing historical score, provenance, backup and FSRS requirements remain non-regression gates. Additional manual acceptance remains intentionally separate.

**5 · Targeted QA (pending final-head CI):** Check browser jobs and step logs, repair any actual failures, record evidence in the dedicated Pass 10 ledger. Outstanding physical Firefox/Safari/Android/iOS, assistive technology, forced renderer termination and visual screenshot approval cannot be declared passed from the available headless runner.

**Pass 10 automated QA checkpoint — 29 October 2026:** [CI #40921780620](https://github.com/oneshubhamt/practice-desk/actions/runs/40921780620) passed all jobs (full Chromium checks, Firefox, Linux WebKit), 75/75 Node tests, initial-IDB-read-failure fallback regression, all existing browser recovery/score/learning regressions and 80-record history rendering (438 ms on runner). The verified generated distribution was committed as `840e070`. Earlier CI failures were generated-file push races during rapid commits, not browser regressions; workflow concurrency now cancels superseded runs. Final docs-only HEAD CI is pending. Real Safari/iOS/Android, screen readers, forced termination and screenshot approval are still **not** claimed; see [Pass 10 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS10_RELEASE_ACCEPTANCE.md).




## 5. Passes 11–16 full feature parity matrix, source findings and working plan

> Original: [docs/V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md). Historical status statements and pre-approval hypotheses are superseded by **Section 1 binding policy** and the final pass-closure conclusions; the de novo audit reports separately.

# v11 feature-parity restoration programme — Passes 11–16

> **CURRENT, AUTHORITATIVE FEATURE-PARITY PROGRAMME · 30 October 2026 · PASSES 11–16 AUTOMATED VERIFIED · CONDITIONAL PARITY ACCEPTANCE · PHYSICAL DEVICE/SCREEN READER SIGNOFF PENDING**
>
> New source-to-source audit performed against frozen `baseline/v11` commit `e661822d865927e89a837790c1c6bc1cfc2562a6` and `overhaul` commit `5b9dce604faef10a714415341c7da5116bf6ff8a`. This document is the source of truth for **v11 feature parity** from Pass 11 onward, superseding the old [Pass 9 parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md). The plan was documentation-only at creation; Pass 11 was subsequently implemented and verified.
>
> **Current verdict (Pass 16): automated v11 material UI/functionality parity conditionally accepted following independent source and real browser comparison.** The preceding gaps were repaired across Passes 11–16; deliberate H08/H10 new-app exceptions remain. **Unconditional release/merge is NOT approved** without user authorization. Real device, Apple Safari, NVDA/VoiceOver and OS-kill/eviction tests remain unverified; automated side-by-side visual checks are completed. See [Pass 16 independent audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md).

## 1. Scope, ground rules and evidence hierarchy

**Goal:** Preserve every material v11 UI control, information affordance and behavioral workflow in the modern typed app **unless explicitly waived**, while keeping the newer source-integrity, exam-generic, learning, recovery, backup and data-model improvements. A redesign may look different, but may not silently omit functionality. Do **not** transplant `legacy.ts`, introduce a second exam/history runtime, make a network/server requirement, or hand-edit generated offline HTML.

**Frozen reference files:**
- [v11 runtime](https://github.com/oneshubhamt/practice-desk/blob/baseline/v11/src/app/legacy.ts) — view builders and event handlers, in particular lines 42–49 (appearance), 50–112 (session, timing, storage), 113–125 (home and exam), 126–171 (results and review), 172–200 (history/backup).
- [v11 stylesheet](https://github.com/oneshubhamt/practice-desk/blob/baseline/v11/src/styles/app.css) and [v11 template](https://github.com/oneshubhamt/practice-desk/blob/baseline/v11/src/template.html).
- [overhaul exam and results UI](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/generic-ui.ts), [session engine](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/engine/session.ts), [history UI](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/history-page.ts), [result presentation](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/result-presentation.ts), [preferences](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/preferences.ts), [bootstrap](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/bootstrap.ts), [CGL importer](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/content/import-cgl.ts), [package/model](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/app/exam-package.ts), [stylesheet](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/styles/app.css) and [template](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/src/template.html).
- Immutable data: `src/content/papers.json`, `patches.json`, `solutions.json` (original question banks remain separate).
- [Data-model guarantees](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/DATA_MODEL.md), [consolidated programme/status record](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PROJECT_STATUS.md), [historic architecture audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md).

**Evidence precedence:** inspect the actual source of *both* branches -> trace rendering + real event handler + state/engine + persistence + display/score output -> compare behavior on realistic source content -> targeted automated E2E and direct side-by-side screenshots -> physical devices/AT when applicable. Unit tests, historic QA fixtures, prior ledgers, CI-green indicators, code-name matches and claims from earlier passes **are not themselves evidence that a v11 feature exists**.

**Status tags:** `PRESENT` = directly traced, `PARTIAL` = only some of the v11 behavior is present, `MISSING` = no equivalent surfaced in examined runtime, `CHANGED/DECISION` = non-identical behavior to accept or address, `UNVERIFIED` = requires browser/device/visual confirmation, `DONE` = repaired and independently checked. **Every entry in the gap matrix starts OPEN**; do not mark DONE when code was merely authored.

## 2. Direct-source baseline inventory: functionality already substantially preserved

| v11 capability | Source-traced overhaul equivalent | Audit status / limit |
|---|---|---|
| Five SSC CGL papers and original/reviewed editions | `importCglBank`, `builtinCglPackages`; same source/review/solution JSON banks | PRESENT; rendering of corrections not fully preserved |
| Four locked, sequential 15-minute CGL sections | `configureCglPractice(strict)`, sectional engine, `SUBMIT_SECTION`, engine section locks | PRESENT |
| Flexible full paper: 60 min and cross-section navigation | `configureCglPractice(free)`, whole-paper clock + free sections | PRESENT |
| Selected-section practice: 25 Q / 15 min | `configureCglPractice(single)` | PRESENT |
| A–D answer selection, clear, flag, prev/next, 25-Q palette | `renderModelExam`, `renderGenericControls`, `dispatch` | PRESENT via click/touch; keyboard parity MISSING |
| Pausing only outside strict mode, reopening saved attempts | Policy-aware session engine, frozen history, recovery | PRESENT; timer display away from exam differs |
| Correct/wrong/unanswered/excluded scoring | Typed `scoreAttempt`, frozen keys, result UI | PRESENT; some visible score context omitted |
| Home paper picker, modes, resume, recent tests | `listHTML` | PRESENT but edition selection and setting retention changed |
| Result overview, sections, time, question review | `resultHTML`, `result-presentation.ts` | PARTIAL: detailed v11 analysis/review affordances missing |
| Source page, editorial notes, source references, worked solutions | `import-cgl.ts`, `builtinCglPackages`, `frozenReviewMedia`, `resultHTML` | PRESENT in data; original-versus-reviewed comparison MISSING |
| History list, delete one, chronological sorting, JSON export/import | `historyHTML`, generic history handlers/backup v3 | PRESENT; bulk delete/filter/quota/persist and v1 backup behavior changed |
| Light/dark theme, font 85–140%, popover, fullscreen request | `bootstrap.ts`, `preferences.ts` | PARTIAL: immersive fallback and exam entry point absent |
| Responsive layout, offline single HTML | `app.css`, `template.html`, build | PRESENT in implementation; actual visual/device parity UNVERIFIED |

**Existing improvements that MUST survive:** generic six-question-kind exam model; strict TS; frozen and hashed content and media; separated original/source scoring; honest manual grading; FSRS-7 user-rated cards; generated revision exams; optimistic stale-tab rejection; atomic/additive checksum-verified backup v3; localStorage fallback and UNSAVED_RECOVERY; keyboard access on existing new result tabs; honest descriptive analytics. Do not degrade these to recreate v11.

**Content audit facts:** 5 papers × 100 questions = 500 source questions (10 editions). 433 source questions `ok`, 34 `invalid`, 33 `caution`. Reviewed patch bank: 131 patched questions, including 121 stem edits, 25 option edits, 47 key edits and 131 editorial notes. Source media includes 32 stem-image questions, 15 questions with option images, and 25 passage-linked questions. Preserve multiline text, source/option diagrams, passages and source keys in both active and historical review; verify representative actual examples, not only a synthetic fixture.

## 3. Independent source audit: confirmed exam-workspace gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| E01 | **P0** | A–D answer, plain ←/→ navigate, M flag, F fullscreen | Exam keyboard handler only recognizes **Alt+←/→** | v11 `legacy.ts` 202; new `generic-ui.ts` 966–977 | DONE (Pass 11) |
| E02 | P1 | Keyboard navigation available during focused choice workflow | New Alt+arrow handler ignores key events from INPUT/TEXTAREA/SELECT; radios are INPUT | new `generic-ui.ts` 966–976 | DONE (Pass 11) |
| E03 | P1 | Fullscreen button in test header | Exam header lacks fullscreen action; only global Display panel controls fullscreen | v11 124–125; new `generic-ui.ts` 194–200 | DONE (Pass 11) |
| E04 | P1 | Blocked native fullscreen falls back to in-page immersive focus layout | New fullscreen code only displays unavailable notice on failure | v11 46–48; new `bootstrap.ts` | DONE (Pass 11) |
| E05 | P1 | Section tabs show answered/25 and Closed/Locked | New section buttons show names/disabled states, not the v11 per-section counts/status labels | v11 124; new `generic-ui.ts` 206–211 | DONE (Pass 11) |
| E06 | P1 | Leaving running test asks confirmation and explains running timer | New Library handler returns directly, without confirmation | v11 100; new `generic-ui.ts` 834 | DONE (Pass 11) |
| E07 | P1 | Starting another while an attempt exists requests confirmation | New Start creates another pending attempt, preserving former, without explaining behavior | v11 103; new `generic-ui.ts` 795–807 | DONE (safe retain variation) |
| E08 | P2 | Active question displays section-relative **and original paper Q number** | New exam question label primarily section-relative; paper position is not surfaced equivalently | v11 124; new `generic-ui.ts` 211–213 | DONE (Pass 11) |
| E09 | P1 | Timer settlement also runs when viewing library/history | New 1s tick returns unless `view === "exam"`; restore reconciles elapsed on reopen, but expiration UI can lag | v11 205; new `generic-ui.ts` 946–963, 728–739 | DONE (Pass 11) |

**Engine safety:** shortcuts may never mutate answers during pause, bypass locked/forward-only rules, interfere with text/numeric entry, or let letter keys trigger browser UI. For E09 ensure a consistent one-time expiration transition in any view without excessive storage writes/redraws. Strict section early-submit must still begin a full fresh 15-minute allocation.

## 4. Independent source audit: confirmed result/review gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| R01 | **P0** | For corrected Q, expandable **Compare with original PDF version**: original stem, options, page, original published key | Missing from rendered question reviews; aggregate source-key score does not replace question-level comparison | v11 167; new `generic-ui.ts` 690–725 | DONE — Pass 12 (source + browser) |
| R02 | **P0** | Correct answer and user's incorrect choice have distinct option-level highlight; image choices included | New review renders options without correct/incorrect visual classes, and reports Expected/Your answer separately | v11 114,167; new `generic-ui.ts` 584–601, 701–714 | DONE — Pass 12 (source + browser) |
| R03 | **P0** | Main score shows adjusted earned **/ eligible maximum**; section table shows attempted/right/wrong/marks/max/time | New main score card shows earned but no eligible maximum; section table is less detailed | v11 137–138; new `generic-ui.ts` 610–618, 661–678 | DONE — Pass 12 (source + browser) |
| R04 | P1 | Timing ledger includes Visits and Speed as well as Time/Changes | New ledger lacks both columns; current response model has no explicit visit count | v11 169; new `result-presentation.ts` `timingLedgerHTML` | DONE — Pass 14 real entry counters / speed ledger |
| R05 | P1 | Review filter **Key-audit notes** (corrected/caution etc.) | No equivalent filter of all review-audit items | v11 168; new `result-presentation.ts` `ReviewFilter` | DONE — Pass 14 audit-note filter |
| R06 | P1 | Filter **Typical-speed incorrect** | New filters contain fast/slow incorrect, not typical-speed incorrect | same source files | DONE — Pass 14 typical-speed incorrect |
| R07 | P1 | Five longest question visits with direct review links | Not surfaced as ranked list | v11 135,156; new `resultHTML` | DONE — Pass 14 ranked linked foreground exposure |
| R08 | P1 | **What to work on next** contextual recommendations based on low accuracy, coverage, speed | New displays descriptive evidence without equivalent recommendations | v11 140–145,157; new `resultHTML` | DONE — Pass 14 evidence-limited recommendations |
| R09 | P2 | Expandable solving approach; expanded by default when correction needed | New prints explanation as plain text, no per-question disclosure | v11 159–166; new `generic-ui.ts` 713–714 | DONE — Pass 12 (source + browser) |
| R10 | P2 | Explicit `Top ↑` review navigation | No equivalent dedicated control | v11 168; new `resultHTML` | DONE — Pass 12 (source + browser) |
| R11 | P2 | Completion labels for time expiry/section early submission | New result header does not consistently distinguish end reason | v11 152; new `resultHTML` | DONE — Pass 12 (source + browser) |
| R12 | P1 | Per-item detailed audited status, publisher vs reviewed key where changed, change log | New shows editorial status and some notes but not full individual original-version provenance | v11 167; new `resultHTML` | DONE — Pass 12 (source + browser) |

**High-priority distinction:** 131 reviewed question patches, including wording/options/key updates, have **data provenance** in the modern implementation but lack the v11 **user-visible original-versus-reviewed comparison**. Preserve source questions/keys unchanged; show differences only after submission. Render chosen/correct option information from **frozen attempt key and responses**, not a mutable current paper or an implicit option index. Include both normal text and image options, editorial excluded/pending states and accessible non-color verdict text.

## 5. Independent source audit: confirmed history/settings gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| H01 | **P0/P1** | Delete all completed records with two destructive-action confirmations | New archive supports only individual delete | v11 200; new `history-page.ts` and `generic-ui.ts` 765–781 | DONE — Pass 13 atomic bulk |
| H02 | P1 | Exact paper/edition dropdown filter | Archive search plus completion-status filter, no exact picker | v11 184–185; new `history-page.ts` | DONE — Pass 13 exact edition |
| H03 | P1 | Storage quota/usage estimate via `navigator.storage.estimate()` | Missing from current History UI | v11 186; new `history-page.ts` | DONE — Pass 13 quota estimate |
| H04 | P1 | Explicit `Protect stored data` via `navigator.storage.persist()` | Missing current action | v11 187; new `history-page.ts` | DONE — Pass 13 persistence request |
| H05 | P1 | Persist selected paper, edition, mode and practice section | New local preference schema persists only theme/font size; CGL mode and choice reset on reopen | v11 39–42,84,118–122; new `preferences.ts`, `generic-ui.ts` 256+ | DONE — Pass 13 validated preferences |
| H06 | P1 | History shows best adjusted %, papers practised | New counters replace these with attempts/status/observed accuracy | v11 184; new `history-page.ts` | DONE — Pass 13 adjusted metrics |
| H07 | P1 | History score-based progression for matching paper/mode | New trend charts observed answering accuracy for exact revisions; score progression absent | v11 173–181; new `history-page.ts` | DONE — Pass 13 comparable marks trend |
| H08 | P2/decision | Backup v1 import merges newer matching-ID records | Backup v3 import is additive/non-overwriting | v11 196–198; new `history/backup.ts`, `generic-ui.ts` | ACCEPTED VARIATION — additive backup v3 |
| H09 | P2 | Visible IndexedDB/fallback status panel in History | Failure banners exist; old status/quota panel not retained | v11 184; new `history-page.ts` | DONE — Pass 13 storage panel |
| H10 | EXCEPTION | Read previous v11 local IndexedDB/backup v1 | Clean break: new `practiceDesk.overhaul.v1` data and backup v3; no legacy migration | v11 17–20,89,196–198; new `DATA_MODEL.md` | **Accepted explicit exclusion**, unless user changes requirement |

**Safety details for H01:** delete *only completed attempt* records; leave pending attempts, learning cards, imported packages and display settings untouched; support fallback/IndexedDB, stale tab conflicts, denied writes and backup confirmation. Do not silently replace additive v3 import behavior with risky overwrite: decide H08 explicitly.

## 6. Visual / presentation / accessibility differences (not marked resolved)

| ID | Severity | Difference or unverified property | Acceptance requirement | State |
|---|---|---|---|---|
| V01 | P1 | v11 header vs redesigned header and Display placement | Side-by-side desktop/mobile inspection; retain accessibility and keyboard access | AUTOMATED DONE — browser screenshot/keyboard checked; human/device/AT signoff UNCHECKED |
| V02 | P1 | v11 paper/date picker + explicit two-choice edition toggle vs combined dropdown | Restore clear edition distinction and inspect ease of selection | AUTOMATED DONE — browser screenshot/keyboard checked; human/device/AT signoff UNCHECKED |
| V03 | P1 | v11 large custom A–D selection buttons vs native radio labels | Keep accessible native semantics **and** restore obvious visual affordance, keyboard shortcuts and image handling | AUTOMATED DONE — browser screenshot/keyboard checked; human/device/AT signoff UNCHECKED |
| V04 | P1 | v11 review option highlights and status hierarchy vs generic response listing | Non-color accessible correct/incorrect/excluded visualization; R02 | AUTOMATED DONE — browser screenshot/keyboard checked; human/device/AT signoff UNCHECKED |
| V05 | P1 | v11 result max-marks/section table hierarchy vs new summary | Show equivalent metrics prominently; R03 | AUTOMATED DONE — browser screenshot/keyboard checked; human/device/AT signoff UNCHECKED |
| V06 | P1 | v11 history management information and storage panel vs new archive | H01–H09 available and readable on all target sizes | AUTOMATED DONE — browser screenshot/keyboard checked; human/device/AT signoff UNCHECKED |
| V07 | P1 | v11 templates included `aria-live="polite"` on `#app`; new template removes it | Verify dynamic announcements with AT; avoid chatty full-page live region if better targeted status regions | AUTOMATED DONE — scoped live announcements and focus; NVDA/VoiceOver manual signoff UNCHECKED |
| V08 | P1 | Responsive layouts structurally redesigned, not pixel-identical | Side-by-side desktop/tablet/phone screenshots, touch hit areas, no clipping, scroll/focus/zoom | AUTOMATED DONE — three viewports, zoom, light/dark, 85–140%; physical-device signoff UNCHECKED |
| V09 | P1 | Global fullscreen uses native API only | Restore v11 functional immersive fallback; E03–E04 | DONE (Pass 11) |
| V10 | P2 | Theme two distinct Light/Dark buttons changed to one toggle | Either restore explicit selection or document/evaluate equivalent discoverability, screen-reader state | AUTOMATED DONE — browser screenshot/keyboard checked; human/device/AT signoff UNCHECKED |

**Visual audit boundary:** Both branches have responsive CSS; newer CSS includes focus indicators, dark-mode variables and responsive grids. **No pixel-parity, preference ranking or actual physical-device approval is inferred from CSS alone.** Source stylesheets have distinct DOM/selector architectures, so tests for element existence cannot stand in for screenshots. Visual design may improve while preserving functional floor; pixel-identical reimplementation is **not** required.

## 7. Explicit policy and semantics requiring decisions

| ID | Issue | Decision / handling |
|---|---|---|
| C01 | Source-invalid reviewed CGL item: 6 Oct 2026 Q62 unpatched, v11 reviewed status caution versus prior overhaul invalid exclusion | **DONE — user explicitly selected v11 reviewed caution scoring**. Original source remains invalid/excluded; reviewed CGL caution scores original published B, but notes clearly flag dispute and no independent correction. Confirmed against all 500 original/reviewed source questions and actual Q62 browser review. |
| C02 | v11 backup v1 / local data migration | **Accepted out of scope**, because overhaul is a new product, not a migration of real production history; review only if user changes this. |
| C03 | v11 newer-copy import replacement vs safer additive v3 | Retain additive v3 by default; document explicit difference, decide whether separate *review/replace* action is desirable. No blind overwrite. |
| C04 | v11 score-based trends vs new observed accuracy | Add score-based view for **identical frozen paper/key/mode**; keep accuracy trends. Never compare arbitrary paper difficulties as if normalized scores were interchangeable. |
| C05 | v11 single-question timing visits and wall clock | Record real visits going forward; never fabricate for existing stored attempts. Foreground exposure is not thinking time; monotonic live clock cannot authenticate offline wall time. |
| C06 | Modern semantic accessibility | Keep native controls, focus, ARIA, sufficient contrast, reduced-motion, and no key interception in editable fields. Historical keyboard bindings may need scope adjustments to protect accessibility. |

## 8. Six-pass implementation plan (Passes 11–16)

Each implementation pass **must** run five phases: **(1) Audit** actual v11 and new sources + update this file; **(2) Analyze** design/invariants, UI states, policy, risk; **(3) Implement** minimal well-typed changes on `overhaul`; **(4) Check each matrix row against its acceptance criteria** (no generic assertion); **(5) Targeted QA** of changed feature *and nearby existing behavior*, using direct browser comparison where relevant. On failure, iterate within the same pass. Record exact commit, evidence and remaining gaps. Start each pass by reading [AGENTS](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/AGENTS.md), this document and [data model](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/DATA_MODEL.md).

### Pass 11 — Exam-taking UX, shortcuts and policy consistency

**Targets:** E01–E09, related V03/V09; ensure no answer leakage or exam-policy bypass.
- Inspect v11 home/exam markup, all key handlers, fullscreen CSS, timer state and prompts. Compare with modern render and focus/keyboard routing on actual question options.
- Restore **A–D**, M, F, normal arrows in exam context; retain optional Alt+arrows. Key handlers only when safe (no typing controls/contenteditable, modal/popup, unsafe modifiers); if a focused choice control needs custom handling, implement deliberately with ARIA semantics and no duplicate selection.
- Restore exam-header fullscreen trigger and immersive layout fallback, accessible toggle/exit state.
- Restore section answered count, Closed/Locked wording, original Q number, meaningful confirmation on navigation away and creation of concurrent attempts.
- Make expiry and header state consistent across page navigation/reopen, with engine-owned timing and bounded persistence.
- **Acceptance:** actual CGL all modes; keyboard vs touch parity; radio focus; strict locks and early-submit independent 15 min; pause, expired/hidden/resumed, fullscreen rejected; no duplicate writes/navigation. Comparison screenshot for exam route. Update each E row.

### Pass 12 — Result fidelity, original-version comparison and scoring display

**Targets:** R01–R03, R09–R12, V04–V05 (and preserve learning actions).
- Compare original/reviewed patch overlay for corrected/caution/invalid questions; build a frozen source-reference snapshot when necessary so old attempts stay independently reviewable after package changes.
- In review show original stem/options/figures/source page/publisher key alongside frozen reviewed version in an accessible disclosure; do not leak answers during exam; account for unchanged originals and partial patch changes.
- Restore visually obvious chosen/correct/incorrect option states including option images; use text/icons as well as color; excluded/pending states non-misleading.
- Restore adjusted score **earned / eligible max**, section attempts/right/wrong/score/max/time, source-key comparison distinct from corrected score and separate self-grading.
- Restore useful solution disclosures, status/completion label and review-top affordance; preserve source links/media and study-card controls.
- **Acceptance:** direct screenshots of actual corrected key/option/stem and a passage/figure; CGL original/reviewed both; wrong/right/skip/excluded; single section; arbitrary imported response kinds; frozen-reopen; zero eligible max; screen-reader labels. Update R rows.

### Pass 13 — History, preferences, storage and backup experience

**Targets:** H01–H10, V02/V06/V10; H10 stays explicit exclusion unless directed otherwise.
- Restore bulk deletion of completed attempt records (double confirm, accurate scoping); preserve in-progress/learning/imported data. Ensure transaction outcomes and conflicts are reported, not assumed.
- Restore exact paper/edition filter while retaining free-text search, status, date sort and newer archive navigation.
- Restore honest best adjusted percentage and papers-practised metric; distinguish full versus single-section comparisons.
- Restore quota estimate and optional persistence request with graceful handling if browser/file context forbids it; show storage backend, fallback and meaningful warnings.
- Persist selected exam/paper/edition/mode/section with validated prefs, bounded fallbacks for missing packages. Maintain safe backup v3 behavior.
- Explicitly resolve H08/C03: **default additive import** remains unless a separately designed, opt-in replacement flow is justified. Do not implement v11 schema migration automatically.
- **Acceptance:** fallback, quota denied, active+complete mixed data deletion, v3 import additive, reloaded selection, corrupt preferences, offline file constraints, mobile view. Update H rows.

### Pass 14 — Fine-grained analytics, review filters and trends

**Targets (original plan):** R04–R08 and C05. **H07/C04 was already closed in Pass 13** and must not be redone.
- Restore real **visit count** collection from engine events (recorded entry/return semantics), per-item Fast/Typical/Slow label and ledger columns; label missing legacy visit data “Not recorded,” never fake zeros.
- Add audit-notes and typical-speed-wrong review filters, plus direct item jump and top-of-review navigation.
- Restore five longest measured question visits with links, and evidence-based **What to work on next** suggestions (minimum samples, no causal claims).
- Offer comparable **adjusted score progression** alongside existing exact-revision answering-accuracy trend. Avoid mixing CGL original/reviewed, modes, changing scored denominators or synthesized revision exams.
- Preserve the current `attempt-evidence` speed thresholds and sample gating unless deliberately amended with independently reasoned provenance; never relabel arbitrary long questions as slow for cross-paper comparison.
- **Acceptance:** original actual exam records with multiple visits/answer replacements, short/long/no timing, insufficient samples, excluded/pending, negative score and restored old records; verify all review links.

### Pass 15 — Visual/interaction restitution and accessibility

**Targets:** V01–V10, unresolved design/focus/contrast issues from earlier passes.
- Use reproducible, identical viewport screenshots of v11 and overhaul for: 390px phone; 768px tablet; desktop ~1280px; light/dark where supported; library, selected paper/edition, active strict/free/single exam, late/paused state, results overview, corrected question review, time ledger and history (with/without records).
- Compare information hierarchy, click/touch discoverability, font scaling 85/100/140%, long/multiline stems, reading passage, stem/option images, 200% zoom, horizontal overflow, focus after rerender, screen-reader status and reduced motion.
- Preserve familiar v11 UI affordances **and** improve with modern native semantics; avoid a pixel clone or replacing new functionality to make screenshot diffs look smaller.
- Add a **human/device signoff matrix** for physical Android/iOS/Desktop Safari, keyboard-only, VoiceOver/NVDA. Unavailable testing must remain unchecked.
- **Acceptance:** every v11 screen feature discoverable; no cutoff/overlap; clear answer states and status; screenshots with review commentary. Browser screenshot automation does not certify screen readers or real devices.

### Pass 16 — Independent, de novo verification and release decision

**Targets:** Every E/R/H/V/C row, plus all preserved and newly added functionality.
- **Do not merely re-run QA fixtures, quote prior passes or trust this plan's DONE statuses.** Independently enumerate original v11 DOM, event handlers, state changes, session/timer operations, result calculations, history/settings/backup and CSS; trace each against the final actual overhaul code.
- Compare the same five original papers/ten editions, real source revisions, full and sectional exam modes, answer changes, images/passages, scores, storage and backup workflows. Inspect generated `file://` artifact, not only source.
- Review adverse conditions: simultaneous tabs, rejected writes, hidden and pagehide/restore, timed section expiry, unexpected close, import conflicts, corrupt/frozen history, large datasets and keyboard/focus.
- Perform targeted browser comparisons and screenshot evidence; track physical devices and screen-reader signoffs separately. Fix anything found and re-audit affected surfaces **before** completion.
- **Exit requirement:** every feature either **DONE with source and direct behavioral evidence**, or **ACCEPTED EXCEPTION** with reason and explicit approval; all P0/P1 regressions resolved; no failing targeted QA; exact final `overhaul` commit CI successful; manual release constraints explicitly called out. **No merge to `main` or declaration of comprehensive parity without separate authorization.**

## 9. Per-item objective reconciliation / evidence template

Copy this into a dated checkpoint **in this file** for every touched item:

```md
### Pass NN checkpoint — YYYY-MM-DD — commit <sha>
Audit: <v11 source:line + current source:line + observed difference>
Analyze: <UI/engine/data invariants and design choice>
Implement: <paths and precise change, or explicit accepted exception>
Objective check: <IDs; expected and actual UI/behavior; screenshot comparison if relevant>
Targeted QA: <scenario, fresh browser/real content, failure modes, exact commit/CI>
Remaining: <IDs still OPEN/UNVERIFIED; manual/device gates>
```

**Do not write `DONE` in the matrix until the corresponding checkpoint supplies direct source trace and user-visible behavior evidence.** For new event counters or preferences, document migration behavior for in-branch stored data, validate backup v3 round trips and avoid breaking frozen old records.

## 10. Project release boundaries and outstanding verification

- Current source audited: v11 `e661822`; overhaul `5b9dce6`. **No parity code fix implemented yet** when this programme was authored.
- Historic Pass 9 acceptance establishes an earlier engineering milestone only; the old [parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md) overstates completeness and is superseded.
- Pass 10 automated checks (Chromium, Firefox Playwright and Linux WebKit) were green on final historical HEAD `5b9dce6` [CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096); **Linux WebKit is not actual Safari/iOS**.
- Manual outstanding: real Firefox/Safari `file://`; physical Android/iOS; screen readers/AT; abrupt OS/browser termination; actual quota/eviction and recovery; thousands of cards/history on slower devices; direct side-by-side visual and user approval.
- No production old-storage migration: explicitly waived `H10`. `H08` is accepted as a **safer variation**: checksum-verified backup v3 is additive rather than automatically replacing existing attempts.
- This is a **planning and documentation pass only**. The source, generated HTML, `main` and `baseline/v11` are left untouched.

## 11. Live programme status

| Pass | Stage | Objective status | Evidence / notes |
|---|---|---|---|
| 11 — Exam UX | DONE — tested | E01–E09 done; V09 done | CI #40940761995; device and visual gates remain |
| 12 — Result fidelity | **DONE — source + real CGL and generic browser QA** | R01–R03/R09–R12 DONE; V04/V05 visual signoff pending | [CI #40988982138](https://github.com/oneshubhamt/practice-desk/actions/runs/40988982138) · 81/81 Node, Chromium, Firefox, Linux WebKit |
| 13 — History & settings | **DONE — source + browser QA** | H01–H07/H09 DONE, H08 safe variation, H10 exclusion; V02/V06/V10 visual pending | [CI #40992327902](https://github.com/oneshubhamt/practice-desk/actions/runs/40992327902) |
| 14 — Analytics | **DONE — source + multi-engine browser QA** | R04–R08 DONE; H07 preserved from Pass 13; C05 historic visits honest | [CI #40994179081](https://github.com/oneshubhamt/practice-desk/actions/runs/40994179081) · 90 Node, Chromium/Firefox/Linux WebKit |
| 15 — Visual/AT | **AUTOMATED DONE — source + paired screenshot QA** | V01–V10 browser behavior audited; real device/NVDA/VoiceOver approval UNCHECKED | [Pass 15 visual audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS15_VISUAL_AUDIT.md) · [CI #40998410079](https://github.com/oneshubhamt/practice-desk/actions/runs/40998410079) · 390/768/1280, figure/passage, zoom, contrast, keyboard, 85–140% and light/dark screenshots |
| 16 — Independent final audit | **AUTOMATED COMPLETE — CONDITIONAL ACCEPTANCE** | E/R/H/V/C re-audited; C01 user-approved v11 policy, imported scoring ceiling repaired, Learning Desk announcement fixed; human/AT/platform gates UNCHECKED | [De novo audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md) · [CI #41001307679](https://github.com/oneshubhamt/practice-desk/actions/runs/41001307679) 95 Node tests, 10 CGL editions and Q62 in new browser E2E |

**Next step:** No planned engineering passes remain. Maintain [Pass 16 conditional acceptance and outstanding manual gates](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md); obtain user permission before any production merge. Do not claim actual iOS/macOS Safari, physical-device or NVDA/VoiceOver testing completed.


## Pass 11 checkpoint — 30 October 2026

**Audit:** Directly compared v11 exam/render/keyboard/fullscreen/navigation/timer handlers with the typed overhaul source. **Analysis:** preserve engine-owned policies; make shortcuts safe with focused radios and disabled in typing fields; avoid foreground time accumulation and periodic competing-tab writes when in the library. Starting another exam asks first but retains the previous pending attempt; this is a deliberate safer alternative to v11's discard. **Implementation:** changes in `src/app/generic-ui.ts`, `src/app/bootstrap.ts`, `src/styles/app.css`, `scripts/pass11-parity.mjs`, browser smoke/platform harnesses and CI. **Objective check:** E01–E09 addressed: A–D, arrow/Alt-arrow, M/F; focused-choice shortcuts; exam fullscreen button and rejected-API focus fallback; answered/Closed/Locked tabs; cancelable leave and new-start prompts; original paper Q number; continued off-screen timer without added question foreground duration. **Targeted QA:** [CI #40940761995](https://github.com/oneshubhamt/practice-desk/actions/runs/40940761995) passed TypeScript, 75 Node tests, existing and new real-CGL Chromium `file://` regression, Firefox and Linux WebKit offline acceptance. A two-tab collision due to background autosave and a duplicate browser-dialog listener were identified and repaired during this pass. Browser-generated offline HTML was rebuilt. Source commits: `718ea4a`, `08f0fa3`, `6998897`.

**Limits:** This is functional Pass 11 acceptance, not full v11 parity, device fullscreen approval, screen-reader verification or pixel visual signoff. Those and Passes 12–16 remain open. Neither `main` nor `baseline/v11` was edited.


## Pass 12 active scratchpad — audit and design (30 October 2026)

**Audit:** Re-read v11 `legacy.ts` `optionsHTML`, `scoreCards`, `sectionTable`, `reviewedSolutionHTML`, `reviewOneHTML`, and modern `generic-ui.ts` result/review rendering, `scoring.ts`, `source-comparison.ts`, `exam-package.ts`, `history/frozen.ts` and `DATA_MODEL.md`. Identified R01–R03 and R09–R12 as still open. R04–R08 remain explicitly assigned to Pass 14.

**Design decisions:** Generic engine and all six question kinds remain primary. Implement an optional versioned, hash-checked **source-edition review snapshot** for any compatible imported source/reviewed exam pair, captured when an attempt starts (not reconstructed later from a changed paper). The CGL originals are a representative source-pair test, not an app-specific dependency. Correct/chosen rendering must use frozen key and stable option IDs, not letter indices; excluded and pending cases must be labelled honestly. Eligible maximum must resolve actual per-question/per-section marking rules and exclude unscored/manual-only items. Old records without new optional source or completion-reason metadata remain loadable. Preserve the single six-kind engine, immutable source/media, backup v3, offline file use and learning/FSRS. Test genuine changed CGL wording/key/media as well as imported non-CGL six-kind data. No user-visible source/key disclosure before an attempt finishes.

**Five-step state:** 1 Audit DONE; 2 Analyze DONE; 3 Implement DONE; 4 Objective reconciliation DONE for R01–R03/R09–R12; 5 Targeted browser/CI verification DONE. V04/V05 still need independent visual/device signoff in Pass 15. R04–R08 remain Pass 14.

## Pass 12 closure — 30 October 2026

**1. Audit:** Reinspected the actual v11 `legacy.ts` original-PDF comparison, review options, result score cards, section table, worked solutions, review Top and completion indicators against the overhaul `generic-ui.ts`, `result-presentation.ts`, `scoring.ts`, `source-comparison.ts`, `exam-package.ts`, persisted record validation and data-model rules. E01–E09 from Pass 11 remain covered. The original snapshot/option styling/adjusted denominator/solution/status gaps were confirmed directly; old green fixtures were not used to declare parity.

**2. Analyze (generic-first):** An SSC-specific patch renderer would be a regression in product scope. Keep the **one generic six-kind engine** and add a validated, optional source-edition comparison for any exam with matched, versioned `source` and `reviewed` packages. Freeze the original question, actual source answer, and its needed image/passage/table/chart resources **at attempt start**, including editorial-only and stimulus-only changes. Stable question IDs/option IDs carry semantic identity; never infer a key from the answer's display letter. Keep the original-source-key aggregate score separate, since arbitrary imported formats may not have a comparable one. Preserve old stored attempts: optional fields mean no schema-breaking migration. For *only* older built-in CGL attempts having a pinned original paper/key revision, a read-only fallback verifies the exact bundled source revision; it does not rewrite frozen history. No current/mutable-paper guesses or silent generic backfill.

**3. Implement (actual files):**
- `src/engine/review-source.ts`: optional `SourceReviewReference`, frozen original answer/question/stimuli/assets, revision binding, SHA-256 content hash and full source question/key/media validation. Detect prompt/options/figure/key changes **and passage-only changes even if question ID is unchanged**.
- `src/engine/score-ceiling.ts`: full-credit automated eligible maximum and section-level attempted/correct/incorrect/pending/excluded/marks/time, derived from **frozen question/section/entry scoring policies**; no +2/−0.5 or 25-question assumption. Editorially excluded and manual-only responses are kept out of the automated denominator.
- `src/app/exam-package.ts`: optional frozen source-review and explicit `time-expired` / `submitted` / `section-submitted` completion reason, without changing the engine scoring policy.
- `src/app/generic-ui.ts`: archive source review at start, validate before reading/importing, render genuine original vs reviewed wording/media/options/published key after finishing; provenance labels use “original PDF” for CGL, generic “source edition” for other exams. Correct option green, chosen wrong red and both with **text** labels (single-choice, multiple-select, true/false). Worked solutions use disclosures, auto-open on incorrect/unanswered; review Top button; adjusted score earned/max and complete section breakdown; submission/expiration labels, truthful excluded/manual states. Historical CGL exact-revision read-only fallback.
- `src/styles/app.css`: consistent responsive status emphasis, disclosure and option visuals. `tests/pass12-review.test.mjs`, `scripts/pass12-parity.mjs` and `.github/workflows/ci.yml` enforce real source and generic cases.

**4. Objective reconciliation:** R01 DONE (original revision, question/options/image/passage/key/source page, frozen and reopened); R02 DONE (key- and response-derived correct/incorrect option-level states including option images and true/false); R03 DONE (policy-derived adjusted total/section maxima, attempts, correct/wrong, measured question foreground time); R09 DONE (worked solution disclosure and automatic expansion for mistakes/skips); R10 DONE (Top review action); R11 DONE (completion reason with old-record compatibility); R12 DONE (source/current key and audit provenance, frozen original item, reviewed status and notes). R04–R08 remain explicitly Pass 14. **V04/V05** are functionally implemented but remain **PARTIAL** pending side-by-side phone/tablet/desktop and assistive-technology checks in Pass 15.

**5. Targeted QA and evidence:** [Source-head CI #40988982138](https://github.com/oneshubhamt/practice-desk/actions/runs/40988982138) is green: **81 Node tests passed**, full existing Chromium `file://` smoke and storage recovery, Pass 11 real-paper E2E, new Pass 12 E2E, Chromium platform checks, Firefox and Linux WebKit platform acceptance. Direct Pass 12 test opens a corrected real CGL item, verifies original source prompt/published key, visual wrong/correct options, source diagrams and images, eligible score max, section breakdown, solution disclosure and completion badge; saves/reopens the attempt; simulates an older CGL attempt without new source snapshot and verifies pinned-source fallback; imports non-CGL source/reviewed exams with **all six response kinds**, multi-kind custom marking, and checks boolean states/manual assessment. Unit tests cover source reference tampering, original corrected key, CGL single-section max, generic full-credit policy overrides, stimulus-only revision, deadline vs voluntary completion, and old saved records.

**Release limitations and decisions:** No automatic legacy v11 data migration (accepted existing exception). Historical imported generic attempts without original source snapshots have no fabricated comparison; new paired imports do. Section times are explicitly *foreground question exposure*, not elapsed section wall-clock. Unusual partial-credit policies are described with **nominal full-credit maximum**, not an unproved global theoretical best. No claim of pixel-identical visuals, genuine iOS/Safari/Android fullscreen, screen-reader signoff, or complete v11 application parity. `main` and frozen `baseline/v11` unchanged. **Pass 13 is next.**

**Final generic-precision follow-up:** A subsequent direct review caught a two-decimal presentation assumption. The adjusted main mark/eligible maximum and every section's mark/maximum now respect the frozen paper's declared `scoring.decimalPlaces` (zero through six), defaulting to two only when the paper has no explicit precision. `scripts/pass12-parity.mjs` now imports a non-CGL paper declaring three decimals and requires `/ 14.000`. Source code [`3c6d665`](https://github.com/oneshubhamt/practice-desk/commit/3c6d66522786edb4eba44dac8c0f6718e8f789a1), targeted test [`fbf4802`](https://github.com/oneshubhamt/practice-desk/commit/fbf48029c4d4933103291bc005470c807cd285c4), verified [CI #40989428264](https://github.com/oneshubhamt/practice-desk/actions/runs/40989428264) (81 Node tests, source-driven Chromium/browser parity, Firefox and Linux WebKit). This was completed **within Pass 12**; it is not deferred to a later pass.

## Pass 13 working checkpoint — audit and analysis (30 October 2026)

**Audit:** Read frozen v11 `legacy.ts` history (lines 172–200), quota/persistence, deletion, backup merge and prefs; compared with current `history-page.ts`, `preferences.ts`, `generic-ui.ts`, `backup.ts`, scoring and exact-revision trends. H01–H09 are initially OPEN and H10 is an accepted exclusion; V02/V06/V10 need functional restore with visual signoff left for Pass 15.

**Design:** Keep imported exams and all six question kinds. User-selected paper/revision/mode/section must persist in a separately validated local selection preference with safe fallback if the package was removed. Surface source versus reviewed edition explicitly for paired packages; do not replace the compatible `g-papers` picker or force CGL-centric assumptions. Bulk delete only completed attempt records, use *one* IndexedDB readwrite transaction with per-row optimistic version checks, or a single fallback localStorage replace with exact prior stamp. Require two confirmations; never delete learning cards, imported packages or pending attempts; report errors and do not claim success on failure. Quota/storage persistence are capability checks and report unavailable/denied outcomes, never promises. Keep checksum-verified v3 additive/non-overwriting import as the explicitly accepted H08/C03 difference and keep the H10 no-v11-migration exception. Calculate best adjusted % from frozen nominal eligible maximum; distinguish unlike modes. For comparable score progression use identical frozen paper/key/mode (not paper title alone), preserving existing observed accuracy. V10 restore explicit theme choice without removing the existing toggle. **Status: audit DONE; analysis DONE; implementation/open QA pending.**

## Pass 13 five-step closure — 30 October 2026

**1. Audit:** Compared frozen v11 `legacy.ts` history UI, controls, quota/persistent storage, selection settings, metrics, scored trends, backup merge and delete handlers (especially lines 39–42, 84, 172–200) to the current `overhaul` `generic-ui.ts`, `history-page.ts`, `preferences.ts`, `history/backup.ts`, scoring and persistence. Read the live parity programme and DATA_MODEL invariants first; the initial source gaps H01–H09 were recorded in the Pass 13 working checkpoint above.

**2. Analyze:** Preserve one *generic* exam/history/learning runtime (not an SSC-specific replacement), all six response kinds, frozen paper/key/media and FSRS. Bulk delete must target only **completed** attempts, require **two confirmations**, and be one IndexedDB transaction with per-row optimistic revision/status checks; fallback uses single prior-stamp comparison and one localStorage replacement. Denied writes, stale tabs, canceled prompts and imported/learning/pending records must be safe. Device preferences identify exact paper/edition, mode and section and restore after asynchronous imported-package loading; missing/corrupted selections fall back safely. Browser quota/persistence are optional best effort. Score progression requires identical frozen paper revision, key hash, practice mode and real answered items. Preserve prior observed accuracy separately. The optional exam setup is included in integrity-covered backup v3 **without changing v3 version or rejecting older archives**. **H08/C03** intentionally retains additive, non-overwriting import. **H10/C02** remains an accepted no-v11-migration exclusion.

**3. Implemented:**
- `src/app/history-page.ts`: exact paper/revision/edition filter, papers-practised and best-adjusted metrics, comparable adjusted-score progression beside existing accuracy, storage backend/estimate/persistence and bulk-delete interface.
- `src/app/history-metrics.ts`: policy-derived eligible adjusted percentages and exact-identity score trends, excluding unmeasured 0%-looking series.
- `src/app/practice-selection.ts`: schema-validated device-local exam selection independent from display preferences; `generic-ui.ts` binds paper/edition/mode/section and restores imported exams after async package registration.
- `src/app/generic-ui.ts`: double-confirm bulk deletion, atomic optimistic IDB/fallback writes, truthful failure/status messages, optional storage API reporting, and backup selection export/restore.
- `src/history/backup.ts`: optional, validated, checksum-hashed exam selection in existing v3 format; additive merge and older v3 compatibility preserved.
- `src/template.html`, `src/app/bootstrap.ts`, `src/styles/app.css`: explicit accessible Light/Dark selection alongside original toggle and responsive history storage/management.
- `tests/pass13-history.test.mjs`, `scripts/pass13-history.mjs`, `.github/workflows/ci.yml`: strict unit and direct browser acceptance tests.

**4. Objective-by-objective check:** H01 DONE: only completed attempts; two confirms; cancellation; one IDB readwrite transaction with whole-batch rollback under competing tab, quota-rejected fallback changes nothing; pending, imported packages, learning cards survive. H02 DONE: exact revision filter composed with search/status/sort, including imported exams. H03 DONE: approximate browser-wide storage usage/quota with denied/unsupported reporting. H04 DONE: persistence request with grant/denial/unavailable messages, no false guarantee. H05 DONE: validated saved paper/edition/mode/section, including asynchronous imported-exam reload and optional backup restoration. H06 DONE: papers practised and eligible-score best %, with cross-mode caveat. H07 DONE: frozen same paper/key/mode adjusted score trend, answers required, observed accuracy kept separate. H08/C03 **accepted safe non-overwrite variation**. H09 DONE: explicit IndexedDB/fallback health panel, quota, storage and backup controls. H10/C02 **accepted exclusion**. V02/V06/V10 functionally restored but **visual/physical-device/AT signoff pending Pass 15**.

**5. Targeted QA:** [CI #40992327902](https://github.com/oneshubhamt/practice-desk/actions/runs/40992327902) completed successfully on tested source HEAD `d5909a13`: **85 Node tests, strict TypeScript, Chromium `file://` main smoke and Pass 11/12/13 real-browser workflows, cross-browser Firefox and Linux WebKit offline suites**, generated HTML self-contained and verified. Pass 13's browser QA directly tested paired edition picker, theme buttons, choice/mode/section persistence and corrupt recovery, imported generic paper persistence after async reload, history metrics/filter/score trend, denied storage estimate/persist, double-confirm cancel, a genuinely competing record revision forcing full transaction rollback, IndexedDB bulk deletion, quota-denied fallback unchanged plus successful retry, preserved pending/cards/packages, optional checksum-covered v3 selection and additive backup restore without overwriting existing IDs. The older main smoke assertions were corrected to expect the expanded history metrics, semantic theme state and deliberate persistence of imported exam selection; none of their original behaviors was removed.

**Release boundary:** H01–H07/H09 have directly supported functional acceptance; H08/H10 are explicit accepted differences. R04–R08 remain for Pass 14. V02/V06/V10 plus overall visual, physical device and assistive technology testing remain for Pass 15; independent full source parity remains Pass 16. No merge or full v11 release signoff; `main` and `baseline/v11` untouched.

## Pass 14 working checkpoint — 30 October 2026 (audit and design before implementation)

**Audit:** Re-read the original `baseline/v11/src/app/legacy.ts` `timing`/`speedTag`/`deriveTips`/`reviewHTML`/`questionTimesHTML`/`insightsHTML` and new `src/engine/session.ts`, `src/learning/attempt-evidence.ts`, `src/app/result-presentation.ts`, `src/app/generic-ui.ts`, `src/app/history-metrics.ts` plus immutable record checks. **Open:** R04 (Visits/Speed), R05 (key-audit review), R06 (typical-speed incorrect), R07 (top five longest with jump), R08 (careful next-study recommendations), C05 (truthful historic time/visit semantics). **Already closed in Pass 13:** H07/C04 comparable adjusted-score progression: preserve it, do not rewrite.

**Design:** Keep generic six-question-kind engine, all exam scoring/navigation policies and frozen result semantics. Add an *optional, bounded* `SessionState.questionVisits` snapshot initialized when a **new** attempt enters its first question, incremented only on genuine question navigation or automatic sectional advance. Old attempt states without it remain absent throughout their lifecycle: label visits **Not recorded**, never backfill zeros from time or answer events. The visit counter is independently validated against the frozen question list. Foreground exposure remains the existing `timeSpentMs`; neither a visit nor a long timer measures cognitive effort. Reuse existing evidence thresholds: section median of at least five measured valid answered items, Fast below 0.75× and Slow above 1.5×; otherwise Typical or Not classified; never label exclusions, pending/manual, unanswered or zero-time items. A shared classifier must drive both review filter and timing ledger to avoid inconsistent thresholds. Add audit-notes and typical-speed incorrect filters; show filter counts and accessible review jumps. Top five longest are a **rank of recorded foreground exposure** (may include unattempted items, but not zero-time rows), not a claim about duration of a single uninterrupted visit. Suggestions are conditional statements supported by observed samples (scored answers, sections with enough answers, coverage and relatively fast/slow incorrect) and never assert cause, predicted improvement or intrinsic intelligence. Existing Pass 12 source/provenance, Pass 13 scoring progression, backup v3/additive import and FSRS remain unchanged.

**Five-step state:** (1) source audit DONE; (2) design DONE; (3) implementation PENDING; (4) objective evidence PENDING; (5) targeted QA PENDING. **Next actions:** implement engine + validation, one shared analytics module, UI handlers, unit and browser regression; then update R04–R08 and this checkpoint based only on verified evidence.

## Pass 14 five-step closure — 30 October 2026

**1. Audit actual sources:** Re-read the frozen v11 `legacy.ts` question timing, `speedTag`, `reviewHTML`, `questionTimesHTML`, `analytic` and `deriveTips`, and the real overhaul `src/engine/session.ts`, `src/domain/attempt.ts`, `src/learning/attempt-evidence.ts`, `src/app/result-presentation.ts`, `src/app/generic-ui.ts` and frozen-record validation. Identified R04–R08/C05 as still missing while H07's adjusted-score trend was already completed in Pass 13. The design and objective plan were saved in the working checkpoint **before** changes.

**2. Analyze semantics:** A question visit is a genuine entry of the session cursor into a question: first question at attempt start, a different question selected by navigation, or entering a newly unlocked section at sectional completion. Ticks, answering, flagging and navigating to the current question do not increase visits. Older attempts without the optional `questionVisits` field remain **Not recorded**; no attempt to infer visits from exposure, answer changes or timestamps. Foreground time remains accumulated visual exposure, never inferred thinking time or a continuous visit. Speed uses the existing section-median policy (**at least 5 measured scored answers**, Fast below **0.75×**, Slow above **1.5×**, Typical otherwise; missing, excluded, pending, unanswered and zero-exposure items are **Not classified**). Same classification helper drives ledger and all three incorrect-speed filters. “Longest” ranks accumulated positive foreground question exposure rather than falsely labelling continuous visits. Recommendations require explicit observations and minimum samples, avoid speculative causes or promised score improvements; show a conservative alternative when no meaningful signal exists. All CGL and six-kind imported exams use the same engine and source-frozen results.

**3. Implemented source:**
- `src/engine/session.ts` adds optional `SessionState.questionVisits` initialized for new attempts, increments genuine entries and sectional transitions, and keeps older records without the field untouched. `src/app/generic-ui.ts` checks non-negative bounded, unique and paper-valid counters before accepting saved/imported records.
- `src/learning/question-analytics.ts` implements shared sample-gated speed classification, editorial/source-audit matching, top-five measured exposure and bounded evidence-limited study suggestions. Uses frozen results and existing `attemptEvidence`; does **not** change the 0.75/1.5 threshold or scoring.
- `src/app/result-presentation.ts` restores Visits and Speed to the timing ledger, adds **Key-audit notes** and **Typical-speed incorrect** filters, and renders the ranked clickable top-five plus **What to work on next** cards with measurement caveats. `src/app/generic-ui.ts` displays timing/visits/speed for each review item, adds the Typical incorrect shortcut and preserves the same deep-link behavior between overview, ledger and review.
- `src/styles/app.css` adds a compact responsive list and coaching layout. New `tests/pass14-analytics.test.mjs` and `scripts/pass14-parity.mjs` are required by `.github/workflows/ci.yml`; the older smoke test's timing-jump selector was scoped to the visible timing tab after new overview links were introduced.
- `src/app/history-metrics.ts`, `history/backup.ts`, display settings, FSRS scheduling, paper/key hashes and the six-kind exam scoring policy remain unchanged.

**4. Objective reconciliation:** **R04 DONE** — actual new-session visit entry counts plus Speed column and in-review display; historic **Not recorded** survives reopening. **R05 DONE** — editorial status, notes, changes and frozen source review provenance expose Key-audit notes on generic exams. **R06 DONE** — Typical-speed incorrect is filtered using the same section median and sample gate as Fast/Slow; corresponding result shortcut. **R07 DONE** — five greatest positive recorded foreground question exposures (stable ranked ties) with direct review links, preserving excluded/unanswered provenance and never calling this a continuous visit. **R08 DONE** — up to three low-accuracy, limited-coverage or fast/slow incorrect study prompts with minimum observations; conservative message when no signal, no causal explanation or performance prediction. **C05 DONE** — explicit new-only visit counts, historic absence preserved, time caveats clear. **H07/C04 remains DONE from Pass 13** — not reimplemented. All objectives are functional checks, **not a claim of side-by-side visual or assistive-tech signoff**.

**5. Targeted QA:** [CI #40994179081](https://github.com/oneshubhamt/practice-desk/actions/runs/40994179081) source run `222d0beb` succeeded: **90/90 Node tests**, strict TS, established Chromium offline smoke and Passes 11/12/13 browser regressions, new **Pass 14 Chromium `file://`** acceptance and Firefox + Linux WebKit offline platform checks; generated HTML verification passed. Direct unit tests exercise six response kinds under one mixed section, five timed scored responses with Fast/Typical/Slow and median gate, repeated navigation, unchanged visits after flags/ticks/answers, sectional auto-advance, old states remaining unrecorded, invalid/duplicate saved visit histories, audit and typical filters, correct/wrong/unanswered/pending/excluded, negative frozen marks, no-time samples, five longest and at most three evidence-backed prompts. Browser QA drives a **real reviewed SSC CGL paper** through revisit and submission, checks persisted count 2, actual audit/typical filter controls and longest-item jump, timing-ledger Speed/Visits, then removes visit metadata from an old completed record and verifies **Not recorded** on reopen; an independently imported six-kind exam verifies manual/insufficient-sample exclusion. Prior timing smoke selected a hidden overview jump after the new ranked links appeared; the test now explicitly selects the visible ledger jump, preserving functional coverage.

**Remaining:** Pass 15 responsive visual/keyboard/AT/physical-device checks, Pass 16 independent full source+screen parity audit and final release decision. No migration of v11 saved data, no backup overwrite, no changes to `main` or `baseline/v11`. **No full release signoff.**


## Pass 15 working checkpoint — 30 October 2026 (audit and design before implementation)

**Audit — direct v11 vs overhaul sources:** Compared `baseline/v11/src/template.html` (header branding, fixed Aa Display, `#app[aria-live=polite]` and `#toast[role=status]`), `baseline/v11/src/styles/app.css` mobile section tabs, large button options, immersive behavior, history/result grids, high text-scale and disclosure states, plus v11 `legacy.ts` screen renderers with `overhaul/src/template.html`, `src/styles/app.css`, `src/app/bootstrap.ts`, `src/app/generic-ui.ts`, `src/app/history-page.ts`, `src/app/result-presentation.ts` and Pass 11–14 browser scripts. **Functional baseline**: paired-edition picker, saved theme explicit buttons, option-review states, adjusted score, history/storage functions and immersive fallback are already present. **Unproven**: genuinely matched 390/768/1280 screenshots, text scaling up to 140%, 200%-zoom (~195 CSS px), focus continuity after redraw, targeted dynamic announcements, long stem and high-contrast choices, keyboard-only disclosure/tab/dismiss, overlap/overflow and real device/screen reader signoff. v11 had a full-app live region, but an entire question-result grid re-announcement would be chatty; replace with targeted polite route/status updates rather than blindly copying its broad live region.

**Analysis / design:** Keep native radios and six-kind engine, keyboard shortcuts, frozen questions/marks, FSRS and backup untouched. Use a *repeatable browser matrix* that opens the actual frozen v11 single-file distribution and the built/overhaul single-file distribution with identical viewports and screenshot names; include source-backed CGL figure/review and generic six-kind imported content where possible. Save machine-readable layout assertions, responsive screenshot evidence and known v11/overhaul design differences; do **not** use pixel similarity as a parity criterion. Add modest CSS and live-region/focus improvements where tested problems are found. A browser viewport with emulated mobile is **not** a physical phone, Linux WebKit is **not** macOS/iOS Safari, and accessibility role/focus assertions are **not** NVDA/VoiceOver signoff. Record manual gates as unchecked.

**Five-step state:** (1) audit recorded; (2) design recorded; (3) implementation PENDING; (4) V01–V10 reconciliation PENDING; (5) targeted screenshot/keyboard/zoom/browser QA PENDING. Next: screenshot harness, correct observed issues, automated checks plus manual signoff matrix.


## Pass 15 five-step closure — 30 October 2026

**1. Audit:** Re-opened actual frozen v11 `src/template.html`, `src/styles/app.css`, `legacy.ts` home/exam/review/history controls and actual overhaul `src/template.html`, `src/styles/app.css`, `bootstrap.ts`, `generic-ui.ts`, `history-page.ts` and all ten visual matrix rows. Rendered **both real single-file offline versions** in the same Chromium browser at **390×844, 768×1024 and 1280×800** and checked home, edition, exam, corrected item, figure, shared passage, result overview, review, timing and history. More detail and screenshot filenames: [Pass 15 visual audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS15_VISUAL_AUDIT.md). The original v11 and the remodelled generic UI are not expected to match pixel-for-pixel.

**2. Analyze:** Keep all richer generic multi-exam functionality and native, keyboard-accessible controls; reject a v11 runtime/pixel clone. A whole-app live region would announce potentially hundreds of changed elements and timer updates, so use **one scoped polite status** for actual route/question/result-pane changes. Focus a new route's heading and the selected result tab after redraw; do not steal focus during timer ticks. Preserve existing mode/theme/FSRS/key/scoring semantics. Make menu geometry and available width observable, not only document scrollWidth.

**3. Implemented:** `src/template.html`: scoped `#screen-announcement` outside `#app` with `role=status` and polite atomic live text. `src/app/generic-ui.ts`: announce only true screen/question/result-tab transitions; keyboard focus after routing or ArrowLeft/ArrowRight result tabs, no timer chatter. `src/styles/app.css`: screen-reader-only status, accessible focus rings for choice/disclosures, 44px phone targets, text heading scale following saved 85–140%, safe 195 CSS-pixel responsive layout, **left-anchored in-viewport Display popover** and mobile timer/Library/immersive controls on one line. `scripts/pass15-visual.mjs` and `.github/workflows/ci.yml`: mandatory **matched v11/overhaul screenshot evidence**, generated PNG/JSON CI artifact, viewport/overlay metrics, native CGL corrected item/figure/passage, keyboard controls, tab focus, appearance, 85%/100%/140%, dark/light contrast AA, reduced motion and zoom approximation. The Pass 12 browser persistence test now awaits the authoritative queued IndexedDB save rather than an immediate racing read; no exam/storage semantics changed.

**4. Matrix reconciliation:** **V01** browser screenshots show labelled Display in redesigned header with focus; **V02** independent paper and source/review edition selection remains discoverable; **V03** A–D native full-row option targets, figures, keyboard and focus ring; **V04** frozen correct/wrong text and color for reviewed answers with original PDF disclosure; **V05** eligible-max score and complete section breakdown, with phone-local scrolling table; **V06** history and storage/export controls at all viewports; **V07** targeted live screen/question/tab changes plus keyboard focus instead of a whole-page live region; **V08** tested light/dark and 85/100/140% at 390/768/1280, figure and passage, 195 CSS px zoom-equivalent, no document or popup clipping, reduced-motion; **V09** retains independently tested immersive fallback from Pass 11; **V10** explicit Light/Dark `aria-pressed` with 4.5:1 measured token-pair contrast. **AUTOMATED objectives are verified**, not real-device or screen-reader signoff.

**5. Targeted QA and actual findings:** Direct screenshot comparisons discovered: (a) initial 200%-equivalent Display caused **205px scroll width at 195px**, (b) fixing width alone still left popup **offscreen left** (caught only by inspecting the PNG), (c) phone exam Full screen button wrapped onto a separate row above the question, (d) `h1/h2/h3` were not following 140% text size, and (e) lack of scoped dynamic announcements and route focus. Each received source fixes and regression checks. Screenshot matrix preserves identical viewport outputs of genuine v11 and overhaul; visual layout JSON describes 0 horizontal document overflow after repairs and tests Display **bounding-box** left and right edges, not merely scrollWidth. Light palette contrast for main/muted/correct/wrong: about **14.07 / 4.91 / 6.96 / 6.46**; dark: about **15.94 / 7.93 / 8.30 / 7.31**. The stage still cannot establish actual NVDA/VoiceOver speech or real iOS/Android/macOS Safari behavior. Those remain UNCHECKED in [manual signoff matrix](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS15_VISUAL_AUDIT.md#explicitly-unapproved-humanplatform-signoff).

**Release boundary:** Complete the **automated** V01–V10 restitution with paired rendered evidence; do **not** call physical-device/AT/manual approval completed. **Pass 16 is still open**, as are final independent source audit and user release authorization. Never merge to `main` or change `baseline/v11` automatically.

**Verified visual checkpoint:** [CI #40998410079](https://github.com/oneshubhamt/practice-desk/actions/runs/40998410079) passed **90 Node tests**, established Chromium `file://` smoke plus Passes 11–14 browser acceptance, new **87-screenshot Pass 15 v11/overhaul evidence matrix**, and Firefox/Linux WebKit acceptance. [Download screenshots and JSON report](https://github.com/oneshubhamt/practice-desk/actions/runs/40998410079/artifacts/12952705607) (30-day retained CI artifact). Exam phone viewport now shows timer, Library and Full screen on one row. Final 195px Display geometry **left 10px / right 185px**; zero outer document overflow across recorded modern views; all tested text-status palette contrasts >=4.5:1. Real screen-reader, Apple Safari and physical mobile signoffs remain unchecked.

## Pass 16 independent source-audit scratchpad — 30 October 2026 (opened before implementation)

**Mandated five steps:** (1) DE NOVO actual source audit, (2) analyze risks and preservation, (3) implement fixes only with frozen-data compatibility, (4) reconcile every E/R/H/V/C objective against source and direct behavior, (5) targeted real-content browser + CI, including the actual generated HTML and exact final HEAD. The 11–15 accepted test reports are **background only**, not proof. No merge; no unapproved physical/AT signoff.

**Sources re-read independently:** frozen `baseline/v11/src/app/legacy.ts` question editions (source initialization, direct original/reviewed status overlay), exam keyboard/timer and result/review/history; `baseline/v11/src/template.html` and CSS. New `src/content/import-cgl.ts`, actual CGL paper and patch banks, `src/app/exam-package.ts`, `src/engine/session.ts`, `scoring.ts`, `response.ts`, `score-ceiling.ts`, `src/app/generic-ui.ts` (complete storage save, resume, import, exam/render/keyboard, visibility and redraw routes), `history/frozen.ts`, `history/backup.ts`, `domain/validate.ts`, `domain/question.ts`, `src/app/practice-selection.ts`, `src/app/history-page.ts`, `src/app/bootstrap.ts`. Plan a fresh baseline-vs-overhaul browser acceptance across **all five actual CGL source papers and both editions**, three CGL modes, freeze/reopen, figure and passage, and non-CGL six-kind score/policy behavior; do not merely repeat Pass 15 screenshots.

**Direct finding F16-01 (known but previously unresolved C01):** `baseline/v11/src/app/legacy.ts` lines 7–12 coerces **any** source `invalid` or `caution` to reviewed `caution` when not overridden. Overhaul `src/content/import-cgl.ts` lines 32–37 preserves source `invalid` in reviewed editions with no correction. Actual **6 Oct 2026 Q62** has source `status=invalid`, publisher `key=b`, stem about tangents and alternate interior angles, options with “Only 2” in choice **d**, no reviewed patch. Therefore v11 reviewed would *score the apparently wrong publisher b*, whereas overhaul excludes the item entirely. This is a consequential **score-policy divergence**, not a harmless CSS difference. Do NOT silently substitute a new key or reclassify the original PDF. Preserve the safe exclusion unless a separately sourced editorial correction is explicitly approved; prove both edition statuses and max-score difference in the independent acceptance. Mark the *full v11 scoring semantics* as a documented exception requiring explicit user approval before unconditional release signoff.

**Direct finding F16-02 (new generic high-severity scoring boundary):** `src/engine/scoring.ts` computes nonidentical multi-select/matching response component marks without bounding them at `rule.correctMarks`. `src/domain/validate.ts` allows any nonnegative `marksPerCorrectComponent`, so an imported paper can earn **more than full credit for an incorrect response**, while `scoreableMaximum()` still presents `correctMarks` as nominal eligible maximum. Any remedy must preserve immutable **previously saved** completed attempt scores and backup roundtrips, avoid rewriting the frozen paper/key hash and avoid changing SSC CGL (+2, −0.5). Analyze versioned score semantics versus validation/migration; test a deliberately adversarial imported generic package and historic record.

**Direct finding F16-03 (navigation/accessibility):** `generic-ui.ts` `draw()` returns early for `view="learning"` before updating `lastScreenKey`, targeted screen-reader `#screen-announcement` or route focus. The newly added Pass 15 route announcement is therefore absent for notebook navigation; check and fix without interfering with the Learning Desk's own focus/timing behavior.

**Status:** source re-audit IN PROGRESS; design/implementation/targeted independent QA OPEN. Retain manual Android/iOS/macOS Safari, NVDA/VoiceOver, actual storage eviction, OS kill and subjective visual approval as UNCHECKED. Preserve H08 additive backup and H10 accepted no-v11-migration decisions.

## Pass 16 closure — user-approved decisions supersede opening hypotheses

**Audit → analyze → implement → reconcile → targeted QA: DONE** (source/browser, not unverified physical or AT tests). [Read the complete independent fresh-source audit and release boundaries](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md). The original Pass 16 scratchpad recorded *pre-approval* hypotheses that initially recommended excluding unpatched invalid Q62 and preserving hypothetical pre-release aberrant partial-credit records. The user explicitly **overrode both**: (1) use the **v11 reviewed caution scoring policy**, retain original publisher B despite dispute and show post-result caution; (2) fix overscoring directly because the app is new, has no live user data, and needs no old-score migration. Those initial cautions are **superseded**, not live objections. The original source edition still excludes Q62; the reviewed edition scores the published B (+2) and marks D (−0.5), while explaining that the published key is disputed.

**Independent actual-source findings and fixes:** F16-01 CGL edition mapping in `src/content/import-cgl.ts`, F16-02 generic partial cap in `src/engine/scoring.ts`, and F16-03 scoped Learning Desk route status/focus in `src/app/generic-ui.ts`. Original CGL JSON/patch/solution banks unchanged, no separate runtime, no changes to CGL scoring constants. **All five published CGL papers** tested at all 100 source/reviewed question mappings; ten source/reviewed editions plus real Q62 run as independently authored `file://` browser tests. Adversarial non-CGL six-kind scoring tests ensure incomplete matching/multiple-select cannot earn above full marks. `tests/import-cgl.test.mjs` updated to user-authorized policy, not weakened to skip the case. `tests/pass16-independent.test.mjs`, `scripts/pass16-independent.mjs` and CI workflow are new acceptance gates.

**Proven source/CI checkpoint:** [CI #41001307679](https://github.com/oneshubhamt/practice-desk/actions/runs/41001307679) passed **95 Node tests**, established Passes 11–15 end-to-end checks, new Pass 16 ten-edition browser matrix and actual reviewed disputed-key scoring, Chromium platform checks, Firefox and Linux WebKit. This checkpoint is the verified **source implementation**. Final documentation-only HEAD must separately pass CI before declaring exact-HEAD success. User-signoff and real platform gates remain unverified and separate from automated acceptance. `main` and `baseline/v11` remain untouched.



## 6. Pass 15 visual, accessibility and manual-gate report

> Original: [docs/PASS15_VISUAL_AUDIT.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS15_VISUAL_AUDIT.md). Historical status statements and pre-approval hypotheses are superseded by **Section 1 binding policy** and the final pass-closure conclusions; the de novo audit reports separately.

# Pass 15 — v11 versus overhaul rendered visual and accessibility audit

> **30 October 2026 — source- and screenshot-backed automated visual restitution; physical devices, real Safari and assistive-technology signoff remain UNCHECKED.** Authoritative programme: [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md). Engineering rules: [AGENTS.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/AGENTS.md).

## Reproducible evidence — not pixel-clone scoring

`scripts/pass15-visual.mjs` uses the actual **frozen `baseline/v11:Practice_Desk_Offline_Mock_Tests.html`** from `git show`, not a guessed recreation. It opens both real standalone offline `file://` HTML distributions in Chromium. Matching viewports are **390×844** (phone), **768×1024** (tablet) and **1280×800** (desktop), reduced motion on. Both versions use the same actual reviewed CGL source paper, with a real corrected question, real figure and shared reading passage. The harness snapshots **library, Display open, Light and Dark, 85%/140% text size, answered exam, audited exam question, figure, passage, results overview, per-question review, original-source correction, timing ledger, populated history**. It also measures a 195 CSS-pixel phone viewport (a **200%-zoom-equivalent effective width**, not a claim to reproduce every browser's zoom engine) for library, Display and exam.

Screenshots and `visual-layout-report.json` are uploaded as the **`pass15-v11-overhaul-visual-evidence`** CI artifact; see the [overhaul CI workflow runs](https://github.com/oneshubhamt/practice-desk/actions/workflows/ci.yml?query=branch%3Aoverhaul). The artifact lists exact screenshot names `v11-{phone390,tablet768,desktop1280}-{screen}.png` and `overhaul-...`. Both viewport and local document width, visible control positioning, text contrast and inspection exceptions are recorded. Screenshots are **not graded by raw pixel similarity** because the generic UX deliberately has a new hierarchy and supports more exam types and learning/history capabilities.

The render and compare script also tests actual CGL navigation, per-option images, reading passage presentation, original-versus-reviewed disclosure, saved/history routes, dark/light toggle state, 140% and 85% text preferences, keyboard-only Aa opening/Escape dismissal and trigger focus restoration, result-tab ArrowLeft/ArrowRight focus movement, correct route announcements, reduced-motion CSS, and computed WCAG AA contrast for normal, muted, correct and incorrect text (all at least **4.5:1**). It fails if the outer document overflows or the Display popup itself is offscreen.

## Direct visual findings and verified fixes

| Objective | Side-by-side finding from actual rendered output | Implementation / validation |
|---|---|---|
| V01 — header + Display | v11 floats a small `Aa` at upper right; overhaul embeds a larger labelled `Aa Display` in the header. Both were visible at 390/768/1280; modern was not obstructing content. | Keep improved labelled trigger; semantic button `aria-expanded`, Escape and outside click; browser checks focus and screenshots. |
| V02 — paper and edition | v11 has date picker plus separate reviewed/original toggle. Overhaul retains paired paper + clearly named separate edition picker, and imported exams appear in the same generic selector. | The edition remains visible, explicit, selected and persistent, not buried in title copy. |
| V03 — answer selection | v11 uses custom large rectangular A–D buttons; overhaul uses native single-choice radios within full-width touch labels, but preserves A–D, selected treatment and option figures. | Native focus and focus-within ring, >=44px label targets on phones, actual figure/stem/passages and Pass 11 keyboard shortcuts. No exam engine fork. |
| V04 — reviewed answer status | v11 marks correct and chosen-wrong options using colored blocks and text. Overhaul uses corresponding green/red classes **plus textual** `Correct answer`, `Your choice` and `Incorrect choice`, frozen images and original PDF disclosure. | Actual audited CGL review screenshots and Pass 12 completed-result regression, no answer disclosure during exam. |
| V05 — score hierarchy | v11 shows audit-adjusted marks/max and section breakdown. Overhaul renders stronger score cards, explicit eligible maximum, more detailed section table and separate published-key source comparison. At phone widths, section table scrolls **inside** its own `.scroll-table`, not the whole page. | Same key denominators and statuses; browser screenshots in all three viewports. |
| V06 — history and storage | v11 history has compact score/history and storage column. Overhaul expands summary/trends/filters and storage, quota and export/delete actions, with distinct labels. | History screenshots with completed records at all three widths; exact-revision search/filter and safe delete separately tested in Pass 13. |
| V07 — dynamic announcements | v11 puts `aria-live=polite` on the entire app; overhaul previously had **no** live view transition. The all-app region would over-announce a 100-question rerender and every timer tick. | Add visually hidden, scoped polite `#screen-announcement`, announce only screen/question/result-tab changes; preserve explicit saved/quota error `role=status` regions. Transfer keyboard focus to new route heading or selected result tab; test announcements and ArrowLeft/Right. A real screen-reader must still verify how this sounds. |
| V08 — phone/tablet/desktop, zoom, text | Original visual runs identified an actual **10px** document overflow at 195 CSS px when Display was open. Screenshot inspection revealed its popup was also placed partly **offscreen to the left**, even after scroll width was fixed. Initial phone exam had a spare Full screen control row above the question; headings did not follow 140% user text scaling. | Add narrow reflow and **left-anchored** in-viewport popup with explicit popup geometry assertion; one-row usable phone exam action controls; headings scale 85–140%; automatic aligned-before-capture screenshots at 390/768/1280, dark/light and 195 CSS px; measured 4.5:1 contrast; reduced-motion checked. |
| V09 — immersive | v11 has an in-page immersive fallback for browsers denying native fullscreen; overhaul Pass 11 already restores that fallback and correct pressed state. | Preserve shared immersive action and Pass 11 browser acceptance; no new fullscreen-specific engine. |
| V10 — theme selector | v11 uses separate Light and Dark buttons; Pass 13 restored both in overhaul, retaining the extra toggle button. Light/Dark explicit state remains discoverable. | Screenshot dark and light; verify `aria-pressed` and normal/muted/correct/wrong text contrast in both themes. |

**Source touched in Pass 15:** `src/template.html` (scoped announcement), `src/app/generic-ui.ts` (route/tab announcements and focus), `src/styles/app.css` (focus-visible, responsive layout, popup, scaled headings and answer targets), `scripts/pass15-visual.mjs` (direct baseline/overhaul visual QA), and `.github/workflows/ci.yml` (baseline availability, required browser matrix and uploaded PNG/JSON evidence). `scripts/pass12-parity.mjs` receives a targeted, bounded wait for the **authoritative committed** IndexedDB result instead of a timing-dependent immediate read. Scoring, storage engine, exam imports, FSRS, content banks, mark policy and source keys are unchanged.

## Explicitly unapproved human/platform signoff

| Gate | Status | Why it cannot be inferred from CI |
|---|---|---|
| Real Android device (touch, font/zoom, installed/offline single file) | **UNCHECKED** | Desktop Chromium phone viewport is an emulation |
| Real iPhone/iPad and iOS Safari `file://` | **UNCHECKED** | CI Linux WebKit is not iOS Safari |
| Desktop macOS Safari `file://` | **UNCHECKED** | Linux WebKit is not Apple Safari |
| Keyboard-only manual usability across all routes | **UNCHECKED** | Automated focus, tab/shortcut and Escape checks do not model all user strategies |
| NVDA (Windows) / VoiceOver (macOS/iOS) speech, rotor, announcement fatigue | **UNCHECKED** | Role/ARIA presence cannot certify screen-reader behavior |
| Human subjective visual-design preference and final release approval | **UNCHECKED** | An audit establishes readable/comparable behavior, not designer acceptance |
| Actual OS process kill, storage eviction and real device quota stress | **UNCHECKED** | Existing recovery simulations are not physical-device failure tests |

**Decision:** This pass can close the *automated source/visual interaction implementation* of V01–V10 when its exact-HEAD CI and screenshots pass. **Do not mark the human screen-reader/device signoff as completed**. Preserve the remaining explicit manual gates into Pass 16 and any separate release approval. No merge to `main` or `baseline/v11`.

## Successful verified run and screenshot package

[**CI #40998410079 — completed successfully**](https://github.com/oneshubhamt/practice-desk/actions/runs/40998410079) includes **90 passing Node tests**, complete Chromium offline smoke, individual Pass 11–14 browser regressions, paired Pass 15 Chromium source baseline vs overhaul and Firefox plus Linux WebKit acceptance. [**Screenshot/JSON artifact (87 PNG snapshots)**](https://github.com/oneshubhamt/practice-desk/actions/runs/40998410079/artifacts/12952705607) is downloadable through GitHub Actions (retained through **29 November 2026**). Directly inspected the final screenshots: the phone exam action controls now fit on one row; the 195px Display popup is entirely inside the screen (left **10px**, right **185px**, no truncation), and none of the recorded modern viewports overflow horizontally. The two palette contrast tables and every viewport screenshot are represented in `visual-layout-report.json`. Physical/AT manual signoff remains unchecked, as above.



## 7. Pass 16 independent source-audit and release report

> Original: [docs/PASS16_INDEPENDENT_AUDIT.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md). Historical status statements and pre-approval hypotheses are superseded by **Section 1 binding policy** and the final pass-closure conclusions; the de novo audit reports separately.

# Pass 16 — Independent source parity audit and conditional release decision

> 30 October 2026 · `overhaul` ONLY · Authoritative row statuses: [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md). **This is an independent pass, not a replay of historic QA fixture results.**

## 1. Audit — actual frozen v11 vs current source

Read the real `baseline/v11/src/app/legacy.ts` source-edition overlay (lines 7–12), home/start/answer/section/timer/navigation, original-PDF comparison, review feedback, result and timing tables, history, backup and display controls, plus `baseline/v11/src/template.html` and `src/styles/app.css`. Compared directly with the current typed `src/content/import-cgl.ts`, original `src/content/papers.json` and reviewed `patches.json`, `src/app/exam-package.ts`, `generic-ui.ts`, `result-presentation.ts`, `history-page.ts`, `learning-ui.ts`, `src/engine/session.ts`, `response.ts`, `scoring.ts`, `score-ceiling.ts`, `review-source.ts`, `src/history/frozen.ts`, `backup.ts`, `src/domain/validate.ts`, `bootstrap.ts` and the source-backed v11 visual audit.

The **CGL 6 October 2026 Q62** original has editorial `invalid`, published **B**, and a review note saying the correct mathematical choice appears to be **D** (“Only 2”). There is **no reviewed patch** for Q62. v11's *reviewed* overlay turns unpatched `invalid` and `caution` into scoreable `caution`, keeping the published key. The initial overhaul incorrectly left this reviewed question `invalid` and unscored. The user explicitly **selected the v11 policy** during Pass 16. The source edition must remain excluded, the reviewed edition caution must remain scoreable against published B, and the dispute must be conspicuous *after submission*. The published key and original question bank were **not** modified.

The independent generic scoring audit also found partial-credit imported multiple-select/matching responses could receive **more marks than the frozen paper's declared full mark**. The user confirmed that this new application has no live data to migrate and asked for a direct correction. An independent accessibility check found the Learning Desk bypassed the Pass 15 route announcer and heading focus because the parent `draw()` returned early.

## 2. Analyze and decide

- **CGL editorial policy — approved user decision, not a hidden exception:** For source edition, honor `invalid` as excluded; for reviewed edition, honor an explicit reviewed correction/caution patch, else map an unpatched source `invalid` or `caution` to **caution**, score against the actual recorded published answer. A caution badge and notes must not imply independent verification of a disputed answer. An actual independently sourced key correction needs a separate reviewed patch/revision.
- **Generic scoring invariant:** Under imported partial-credit component rules, cap nonidentical multiple-select/matching answer awards at that item's `correctMarks`; retain an optional `floorAtZero` and other negative scoring logic. This guarantees the declared full-credit denominator is a meaningful ceiling for automated *partial-credit* awards. Standard single-choice and CGL +2/−0.5 are unchanged. Because **no live app user data exists**, there is no migration layer for hypothetical pre-release records with out-of-range old scores. The existing frozen history checksum/score-recalculation validator remains strict.
- **Accessibility:** Announce entry into Learning/Spaced Revision once, focus the main heading when rendered, preserve nested FSRS controls and avoid repeated live-region updates on ratings or notebook edits.
- **Explicitly retain** accepted intentional differences: H08 safe additive SHA-256 backup v3, H10 no v11 history/v1 backup migration; newer generic exam kinds, typed engine, improved accessibility, source correction provenance and FSRS learning desk. Do not produce a pixel clone of v11 or reinstate a second runtime.

## 3. Implement

| Finding | Actual source change | Evidence |
|---|---|---|
| F16-01 / C01 | `src/content/import-cgl.ts`: version-specific reviewed `caution` fallback; preserve source `invalid` and source/edited answer IDs; caution note explicitly states published answer retained and disputed | 5-paper, 500-question original/reviewed policy test; original/reviewed Q62 direct item marks and actual browser review |
| F16-02 / generic | `src/engine/scoring.ts`: `Math.min(rule.correctMarks, ...) ` on partial-credit component awards | Imported arbitrary six-kind exam with adversarial component values 8/9 and declared full mark 2; eligible maximum remains coherent |
| F16-03 / V07/C06 | `src/app/generic-ui.ts`: route-change announcement and initial heading focus in `view="learning"` branch | Browser goes Library → Learning and back, asserting spoken-status text and focused H1 |
| Test design | `tests/pass16-independent.test.mjs`, updated superseded source-status regression, `scripts/pass16-independent.mjs`, CI mandatory step | No test expectations pre-assume new answers; cross-check frozen source and reviewed overlays, saved browser results |

No changes to source papers, patches, answer key data, screenshot assets, score policy constants for CGL, FSRS intervals, backup schema, current storage schema or v11 code.

## 4. Objective-by-objective reconciliation

**E01–E09:** Keyboard A–D, navigation, focused native radio, fullscreen action/fallback, answered/locked section tabs, leave/start confirm, original question number, background timer settlement all remain in the actual generic exam renderer/session and Pass 11 real-paper E2E. **R01–R12:** Frozen original vs reviewed per-question comparison, marked options and asset images, policy-derived score/eligible max, reason for completion, collapsible solution, review Top, real visits, time/changes/speed, eligible review filters, longest-question links, guarded recommendations remain in the single typed result path; Pass 12 and Pass 14 browser checks still pass. **H01–H10:** Atomic completed-only deletion, exact edition history filter, quota/persistence request, saved paper/mode/section, adjusted-score trend, backend visibility remain; H08 additive restore and H10 no-v11-migration are accepted, labelled intentional differences. All remain covered by Pass 13 actual IndexedDB/fallback browser checks. **V01–V10:** Independent v11 vs overhaul rendered images at desktop/tablet/phone, real figure/passage and corrected review, 85–140% font, 195px zoom-equivalent, colour/keyboard/focus and reduced motion; Pass 15 evidence remains relevant. V07's Learning Desk entry is now addressed. Human device/AT signoff is separately pending. **C01** fixed per explicit user policy; **C02/C03** approved new-app migration and additive-backup exceptions; **C04** exact-revision score trend; **C05** real measured visits without fabricated history; **C06** accessibility focus/keyboard route. No unacknowledged P0/P1 browser-source regression in the covered flows.

## 5. Targeted QA, proof and remaining signoff

**Independent source-level checks:** 5 published CGL papers × 100 questions, source and reviewed stem/options/published key, all patch states, source-invalid → reviewed caution fallback, real 6 Oct Q62 B correct for reviewed (+2) and incorrect D (−0.5), source Q62 excluded. Non-CGL partial-credit multiple-select and matching awards cannot exceed 2, and nominal eligible maximum stays consistent. Source-level validation and runtime scores continue to check their frozen hashes.

**Independent new `file://` browser acceptance:** Visit **each of ten CGL editions**, answer a real question, finish, check scored eligible maximum and post-test review, and visit saved history. Separately run Q62 source and reviewed, choose published B, finish, confirm exclusion vs credited caution, visible dispute, and frozen source comparison. Enter Learning Desk and return with announcement/focus checks. Existing 87-screenshot paired v11/overhaul test, all earlier browser regressions and cross-browser jobs must pass at exact HEAD.

**Manual/unavailable gates — NEVER label passed:** Actual Android/iOS mobile touch/installed `file://`, genuine macOS/iOS Safari, NVDA/VoiceOver announcements and speech, manual keyboard-only full navigation, human visual-design approval, genuine storage eviction/OS-kill behavior and user authorization to merge into `main`. Desktop Chromium mobile emulation and Linux WebKit are not substitutes.

**Decision:** **Automated implementation/parity source audit: ACCEPTED CONDITIONALLY** once the final-head CI is green. **Unconditional production release/merge: NOT APPROVED** until the user authorizes it and any required manual platform/AT gates are conducted. Preserve `main` and `baseline/v11` unchanged. The app is generic and no CGL-only parallel runtime exists.



## 8. Domain/data/backup/history/learning contracts

> Original: [docs/DATA_MODEL.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/DATA_MODEL.md). Historical status statements and pre-approval hypotheses are superseded by **Section 1 binding policy** and the final pass-closure conclusions; the de novo audit reports separately.

> **Documentation coordination (30 Oct 2026):** This file remains authoritative for **data structures/invariants**. Live v11 **feature** parity, user-visible gaps, Passes 11–16 and new evidence belong in [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md). Do not copy old presentation behavior into the data model as an implicit migration requirement. The no-v11-history-migration and additive-backup-v3 decisions remain explicit.

# Practice Desk data model — clean overhaul

One validated `ExamPackage` holds the paper revision, immutable answer-key revision, ordered question revisions, stimuli/media and post-submission explanations. All exams, including built-in CGL original/reviewed and user-imported papers, share the same typed engine and UI.

CGL strict mode is sectional with four 15-minute locked sections. Flexible mode uses a single 60-minute paper clock; single-section mode freezes 25 questions and a 15-minute clock. The configured practice policy receives its own paper revision, answer key and question set. Original sources, corrections and solutions remain separate embedded JSON banks.

`GenericAttempt` freezes the paper, key, relevant shared passages/images, responses and scoring when an attempt starts. Saved attempts use an optimistic `saveRevision` for atomic IndexedDB writes; later tabs cannot silently replace a newer revision. All attempt history and imported paper packages share one IndexedDB `attempts` store in `practiceDesk.overhaul.v1` (version 1). LocalStorage fallback and emergency mirror use separate `practiceDesk.overhaul.*` keys; fallback is best effort and conflict-aware.

Unified checksum-verified backup **v3** contains all typed attempt/package/learning-card records, frozen display media and validated theme/font preferences; import adds missing record IDs only, then applies display settings. Cross-browser `file://` storage behavior varies. **No migration, old data import, v11 compatibility shim, or legacy database reader.** v11 remains in `baseline/v11`.

Analytics (per-section score, response review, timing) are derived from immutable inputs; no redundant specialized CGL analytics store or parallel library UI.

## Pass 5 learning and scheduling

The single `practiceDesk.overhaul.v1` IndexedDB store additionally holds `learning-card` records keyed by immutable `learning-card:<question-revision-id>`. A learning card pins a validated question revision and correct-answer definition from a **completed** exam, source/exam/section identity, optional explanation, note, user-defined subtopic, bookmark and user-selected error classification. Cards are independent of attempt deletion, so notebook content remains available. Question-specific figures and stimuli are frozen with each card rather than resolved from a possibly removed current package; this intentionally retains required data.

Cards retain their own question-specific frozen display resources and store **append-only explicit user rating events**, with ISO timestamps and monotonic ordering. They do not persist derived FSRS dates: `ts-fsrs@6.0.0` `DefaultScheduler({version:"FSRS-7",desiredRetention:0.9,enableFuzz:false})` replays the ordered events to calculate due dates. Version and settings are pinned to prevent unexpected changes to reviews; reconsider/replay rules before future algorithm or default-parameter upgrades. Mock-test answers are never interpreted as FSRS reviews.

On input and backup import, the question and answer-key shape are validated, revisions checked, review grades limited to 1–4, history timestamps checked and notes bounded. The same optimistic versioned IndexedDB writes protect learning-card edits across tabs. The checksum-verified v3 backup includes all accepted `learning-card` records with attempts and imported exam packages, with additive ID-aware restores.

Topic analytics aggregate correctness/coverage only from **completed, frozen, scoreable** attempts, grouped by exam and provided topic IDs; the default fallback is the section title. User-submitted custom subtopics are added as separate labels rather than inferred heuristically. Fewer than five answered items is explicitly insufficient evidence. Longitudinal comparisons group by the **exact frozen paper revision ID**, avoiding false comparisons across exams, editions or rules. These are descriptive observations, not validated estimates of percentile, rank or examination readiness.

## Pass 6 validation and failure rules

- Frozen attempt **schema 2** and individual learning cards retain validated referenced images and stimuli, independent of later package selection or deletion; assets are intentionally copied into history in exchange for durable visual replay.
- Canonical SHA-256 digests are verified for all question revisions (content + editorial), answer keys (ordered entries), paper revisions (sections, timing, navigation, scoring, key identity, edition) and embedded image bytes. Optional explanations remain untrusted display text; the backup digest protects exported snapshots.
- Stored completed exam scores must match both recomputed snapshot totals and each item verdict and mark. Imported media is bounded in count and bytes, and all stimulus kinds have schema and asset reference checks.
- The optimistic UI can display a pending in-memory answer while IndexedDB commits. Only the transaction completion confirms durability. On failure, the writer locks further edits and preserves the memory state for an explicitly named **UNSAVED_RECOVERY** export; this is an emergency recovery file, not evidence of a durable browser save.
- Backup export drains queued writes before taking the in-memory snapshot. Backup v3 imports records atomically within one IndexedDB transaction, then saves preferences separately; if localStorage refuses preference restoration, the UI explicitly reports that partial outcome. No cross-storage transaction is implied.
- The application is new and uses a clean-break schema. Backup v2 and frozen schema 1 are not read by the new branch; no migration/legacy reader is claimed.

## Pass 7 exam and review correctness

- A paper's timing/navigation policy is enforced by the pure session engine. Sectional `SUBMIT_ATTEMPT` events cannot finish the entire test; `SUBMIT_SECTION` obeys early-submission and expiry boundaries. Clock events use an epoch-anchored **monotonic live-tab source**; restored offline time still uses untrusted device wall time, so deliberate clock tampering across shutdown is out of scope.
- Mode on the frozen attempt snapshot is the actual selected practice kind: `exam-simulation`, `full-paper-practice`, `section-practice` or `custom-practice`.
- Built-in transcriptions preserve `sourcePage` and supplied source references with question/editorial hashes. All unsafe editorial states, including `draft`, are excluded from automatic marking.
- A reviewed built-in CGL attempt can freeze `sourceKeyReference`, a digest-verified collection of the matching original-source answers and marking rules, cross-referenced by stable question identities. The **unadjusted source-key score** is derived independently and includes source questions that the reviewed score excludes; it never overwrites the reviewed score snapshot and is not labelled official.
- Result review renders the exact frozen visual context independently of any installed paper package. Free responses remain automated-`pending`; user-entered `manualGrades` (question revision, finite bounded marks, short note, timestamp) are validated, stored on completed attempts, included in backup v3 and displayed as a clearly separate self-assessed total, not a tampered automatic grade.

## Pass 8 revision tests and evidence integrity

- Each notebook card includes `sourceAttemptId` identifying the completed exam attempt from which it was captured. The card remains an independent snapshot (question, answer, media, notes, FSRS logs) even after the original exam or package is deleted.
- A generated revision attempt is a **real custom `ExamPackage`** with one untimed section, up to 25 frozen notebook question revisions, stable referenced media, uniquely hashed key/paper revisions, and the disclosed +1/0/0 practice marking policy. It is strictly confined to one exam ID; source **papers** may differ. It is saved in the same validated attempt store, and backup v3 carries it unchanged.
- `GenericAttempt.notebookLineage` contains a corruption-checked `schema:1` list of notebook card IDs, source attempt IDs, source paper/edition/section and question revision IDs. On storage import the lineage must match the frozen question set; changing IDs or source labels invalidates the hash. It is provenance, not a live database foreign key.
- Topic groups distinguish section labels, explicit source-topic IDs and user-entered topics; the observations (including repeats and skipped items) are not confused with `distinctAnsweredQuestions` or `answeredAttempts`. Descriptive consistency requires at least 10 answered observations across two answering attempts and five different answered question revisions. No calibrated learning mastery, percentile, predicted rank or extrapolated difficulty equivalence is claimed.
- `attemptEvidence` derives exact marks/penalty and bounded hypothetical changes from frozen item rules, foreground question-exposure time, section medians (five measured answers required for relative speed labels) and answer revision **counts**, not purported recovered/lost marks. The data will power the richer Pass 9 UI.
- FSRS-7 card schedules are still recomputed from explicit ratings only; the learning UI memoizes replay against stable card object identity to avoid repeated work on a redraw and discards invalidated cache entries.

## Pass 9 authored visual parity and answer event provenance

- All screens still share the same typed exam engine and IndexedDB `practiceDesk.overhaul.v1` store: `library`, `history`, `exam`, `result`, `learning` are **presentation routes**, not separate legacy/CGL stores. A new `history-page.ts` computes from stored frozen records. Results use `result-presentation.ts` for tabs, per-item timing and review filters; no score mutation.
- `AttemptResponseRecord.answerEvents?` logs the actual option/response sequence `{at,from?,to?}` captured by `src/engine/session.ts` on first answer, meaningful replacement or clear, and `firstAnsweredAt` marks first saved response. Events are optional for histories without previously recorded sequences; `validateGenericStoredRecord` checks finite/in-range timestamps, response shapes, linked event history and final-response congruence, rejecting malformed backups. This is **not** a migration from v11.
- `answerRevisionEvidence` identifies first wrong→final correct and first correct→final wrong only for direct **single-choice** replacements with an initial recorded selection, no clearing and no editorial invalidation. Other changes are counted but not labelled rescued/lost; this avoids falsely claiming causality or inventing answer histories. Immutable item score snapshots remain as captured; annotation/history data do not change marking.
- The dedicated history chart only displays repeated exact paper revisions with at least two **measured answered** accuracy points; null-accuracy attempts never become fake 0% lines. Cross-paper section-priority summaries use descriptive answered accuracy and exclude synthesized notebook-revision exercises from the main section-priority pool; no predicted readiness/rank.
- Appearance remains solely in validated local preferences (light/dark, text scale), included in backup v3. Fullscreen depends on browser policy, is not saved or required for exam operation. Presentation adds no external libraries/assets/network activity. Browser-level screenshot, real devices, assistive tech and heavy data performance are still independent release acceptance gates.

## Pass 12 frozen generic review and result-policy invariants

- A `GenericAttempt` may carry an optional `sourceReviewReference`: a versioned and SHA-256-hashed original-source question/answer/media snapshot, created only when a validated `source` exam package and matching `reviewed` package are available at start. This references the frozen reviewed paper revision; each original question revision has its own verified content hash, answer-kind validation, option identity and validated media inventory. Original image, passage, table and chart resources are separately preserved. A change confined to a shared stimulus can create a reference even if question wording/ID is unchanged.
- `sourceReviewReference` is independent of `sourceKeyReference`. The latter is a constrained original-key **aggregate score** snapshot when comparison is meaningful; it is not the original-wording archive. Both may be absent for arbitrary custom packages, and all old attempt records without these optional fields remain valid. Neither reference nor actual answers may be rendered before completion.
- For *previously saved built-in CGL attempts only*, an original-key reference pins source paper and key revision IDs. A read-only display fallback can use the exact verified bundled source revision when both IDs match; it does **not** update saved records or assume a different source paper. Older generic attempts lacking a frozen original reference have no invented comparison.
- `scoreableMaximum` and `sectionScoreSummaries` calculate the **nominal full-credit automated maximum** from the exact frozen paper, key, section overrides, question-kind rules and entry-level scoring overrides. Excluded editorial items and written free-response items that require manual marking do not contribute nominal automated maximum. Score, partial credit and verdicts still come exclusively from the existing `scoreAttempt` engine; a manual self-grade remains separate.
- `completionReason` is optional observational metadata set for newly finished attempts: `time-expired`, `submitted`, `section-submitted`. Existing saved attempts without it remain readable; the app must not invent reasons retrospectively.
- Frozen original review and completion metadata travel inside the existing checksum-verified v3 backup; no v11 migration, backup schema reset, extra runtime engine or network service was introduced. The authoritative source-audited objectives and QA status are in [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md), Pass 12.


## Pass 13 generic history, settings and backup invariants

- `PracticeSelection` is separately validated (exact paper revision/edition, CGL runtime mode and section), stored locally and, when present, restored after the asynchronous imported-package inventory loads. Corrupt/missing selections use bounded defaults; exam setup never alters an existing frozen attempt.
- Double-confirmed completed-history deletion operates on **finished attempts only**. IndexedDB handles all selected records in one readwrite transaction, checking each record's optimistic `saveRevision` and completed status; any conflict aborts the whole batch. The localStorage fallback uses an exact prior-stamp comparison and single replacement. Denied writes leave current durable data intact. Never delete pending sessions, learning cards, imported packages or preferences in this action.
- Best adjusted % uses each completed exam's nominal eligible automated max from its frozen scoring policy. Score progression includes only matching paper revision, frozen key hash and practice mode with observed scored responses; completely unanswered attempts do not become artificial 0% trend lines. The original separate observed-accuracy chart is preserved.
- `navigator.storage.estimate()` and `persist()` are optional best-effort browser APIs; quota values are browser-wide estimates, not app-specific quotas or storage guarantees. Fallback/unsupported/denial messages must not imply success.
- Backup remains **version 3**, SHA-256-verified and additive by record ID. New archives may carry an **optional** validated selection in the checksum-covered core; earlier v3 archives without it remain valid. Existing saved IDs are never overwritten on import, and no v11 backup v1 migration is attempted. Display preferences still validate independently from exam setup. Explicit Light/Dark controls and the existing theme toggle apply the same display state.

Direct QA is listed in [Pass 13](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-13-five-step-closure--30-october-2026). Full physical-device, screenshot and screen-reader approval is still a separate Pass 15 gate.


## Pass 14 question visits and coaching invariants

- New `SessionState.questionVisits` is an optional array of paper-valid unique question revision IDs with positive bounded integer counts. It begins at the first question, increments only on a real different-question cursor entry or sectional automatic advance, and is independently validated when reading/importing saved attempts. Old records with no `questionVisits` never get an invented partial count on resume; result UI says **Not recorded**. These counts are navigational entries, not uninterrupted reading time or evidence of concentration.
- Recorded `AttemptResponseRecord.timeSpentMs` remains **cumulative visible foreground exposure**. It is never interpreted as a stopwatch of a single continuous visit, nor as thinking time. Top-five longest lists measured positive exposure, with stable tie-breaking by frozen paper order and accessible jump links.
- The shared `questionSpeed` policy classifies only **correct/incorrect** scored responses with positive measured exposure in a section with **at least five such measured answers** and positive section median: Fast below 0.75×, Slow above 1.5× and Typical otherwise. Excluded, pending, unanswered, unmeasured or insufficient-sample questions remain **Not classified**. Review filters and timing-ledger labels invoke this same helper; do not introduce v11's obsolete 0.6×/1.6× thresholds silently.
- Key-audit filtering examines frozen editorial statuses, notes, change flags and frozen original/reviewed source provenance; no mutable current-paper assumption. Suggestions are derived only from scored counts and sufficiently sampled section/pace evidence, with at most three noncausal study pointers or a conservative fallback. Frozen score arithmetic, old backup v3 semantics and FSRS scheduling remain unchanged. See [Pass 14 evidence](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-14-five-step-closure--30-october-2026).

## Pass 16 source-edition and scoring invariants

- **Reviewed CGL editorial policy matches frozen v11**, as expressly directed by the user in Pass 16. In the **source** edition, `invalid` remains excluded. In the **reviewed** edition, source `invalid` or `caution` without an explicit reviewed patch becomes scoreable `caution`. A separately patched reviewed `corrected` or `caution` status takes precedence. Published source text and keys are never silently changed. The 6 October 2026 Q62 reviewed status is `caution`, source-invalid remains excluded, and the published answer **B** is retained for reviewed scoring with a post-test warning that the key is disputed.
- Generic scoring now caps every nonidentical multiple-select/matching **per-component partial-credit award** at its frozen marking rule's `correctMarks`, preserving floor-at-zero where configured. This applies to all imported exams, not only CGL. The nominal automated eligible maximum retains the same frozen policy-derived definition. Single-choice correct/incorrect CGL +2/−0.5 and all question/asset/answer hash inputs are untouched.
- The new app has **no live legacy user data**, as explicitly confirmed by the user. No migration of hypothetical pre-release records with historically over-max partial-credit scores is implemented. The existing strict validation of recalculated scores against frozen histories remains enabled rather than rewriting a completed result invisibly.
- The Learning Desk is a distinct visible route within the same overall app, not a second exam runtime. On first entry, the main route sends a scoped polite announcement and moves keyboard focus to its heading; nested FSRS grade/edit redraws do not generate route announcements.
- The independent [Pass 16 audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md) and [authoritative programme](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md) govern the conditional automated release decision. Additive backup v3 and the agreed no-v11-import exception remain; platform/AT manual gates are still unchecked.



## 9. Historical consolidated project status (superseded by this record)

> Original: [docs/PROJECT_STATUS.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PROJECT_STATUS.md). Historical status statements and pre-approval hypotheses are superseded by **Section 1 binding policy** and the final pass-closure conclusions; the de novo audit reports separately.

# Practice Desk — consolidated programme status and documentation index

> **Current status and document map (30 October 2026).** This consolidates the *meaning*, decisions, acceptance boundaries and links from earlier pass Markdown files. Historic reports remain accessible **as archival engineering evidence**, not as current feature-parity acceptance. For live Passes 11–16, use [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md).

## Read this first: source-of-truth order

1. [`../AGENTS.md`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/AGENTS.md): non-negotiable constraints and five-step workflow.
2. [`V11_FEATURE_PARITY_PROGRAMME.md`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md): **current** audit, complete feature-gap matrix, Passes 11–16 implementation plan and live checklist. Overrides conflicting historical parity claims.
3. [`DATA_MODEL.md`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/DATA_MODEL.md): **current** schema, persistence, integrity, score and learning invariants.
4. [`../README.md`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/README.md): build, running offline and high-level architecture.
5. [`ARCHITECTURE_AUDIT_2026-10-28.md`](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md): historic architectural design reasoning and Passes 1–10 sequence; **archive**, not the active progress tracker.
6. Pass-specific release/design ledgers below: dated historical checkpoints only.

**If a document contradicts another:** inspect current `overhaul` code and frozen `baseline/v11`; resolve and log the decision in the live parity programme. Historical checkmarks are never retroactively interpreted as proof of exact v11 feature coverage.

## Baselines, branches and operating contract

| Reference | Role |
|---|---|
| `baseline/v11`: `e661822d865927e89a837790c1c6bc1cfc2562a6` | Frozen original UI and functionality reference — do not modify |
| `main`: `075210795b29515dfe6ff253b74780e206ff4cf1` | Frozen stable branch — no unrequested merge |
| `overhaul` at the source audit: `5b9dce604faef10a714415341c7da5116bf6ff8a` | New typed runtime at start of Pass 11 programme |
| `Practice_Desk_Offline_Mock_Tests.html` | Build-generated, standalone `file://` artifact — never hand-edit |

**Five-step loop:** audit actual source → analyze risks, invariants and UI → implement → check objectives row by row → targeted QA and independently inspect changes. Verify exact final HEAD CI before stating a pass is complete. Node 24, strict TypeScript, no `any`/new `@ts-nocheck`, separate content banks, one runtime, no network dependency.

## Consolidated completed development history (Passes 1–10)

| Phase | Historical deliverable | Prior evidence / archival document | Current boundary |
|---|---|---|---|
| Pass 1 | Typed domain entities, question kinds, paper/key revision and data validation foundation | [Architecture audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md) Pass 1 addenda | Engineering history; not feature parity |
| Pass 2 | Typed exam engine, source integration, CGL mode configuration | [Architecture audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md) Pass 2 addenda | Functional source needs independent comparison |
| Pass 3 | Immutable attempt snapshots, storage, restore, backup integration | [Architecture audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/ARCHITECTURE_AUDIT_2026-10-28.md) Pass 3 addenda | Deliberate clean break from v11 stored records |
| Pass 4 | Single typed library/workspace, CGL/imported exam, offline artifact, storage and browser smoke | [Pass 4 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS4_RELEASE_ACCEPTANCE.md) · [CI #40855216283](https://github.com/oneshubhamt/practice-desk/actions/runs/40855216283) | Automated gate only; manual checks separate |
| Pass 5 | Learning notebook, FSRS-7, manual tags, targeted review and exact-revision evidence | [Pass 5 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS5_RELEASE_ACCEPTANCE.md) · [CI #40858120327](https://github.com/oneshubhamt/practice-desk/actions/runs/40858120327) | Scores do not automatically rate FSRS |
| Pass 6 | Content/media hashes, frozen historical media, score validation, backup v3, write-failure handling | [Pass 6 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS6_RELEASE_ACCEPTANCE.md) · [CI #40863482395](https://github.com/oneshubhamt/practice-desk/actions/runs/40863482395) | Browser storage remains best effort |
| Pass 7 | Strict section policies, scoring/rendering correctness, source-key comparison, manual grading | [Pass 7 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS7_RELEASE_ACCEPTANCE.md) · [CI #40899786917](https://github.com/oneshubhamt/practice-desk/actions/runs/40899786917) | No v11 complete-UI claim |
| Pass 8 | Generated revision tests, lineage, topic evidence, descriptive speed/mark analytics | [Pass 8 design](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS8_DESIGN.md) · [Pass 8 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS8_RELEASE_ACCEPTANCE.md) · [CI #40904651689](https://github.com/oneshubhamt/practice-desk/actions/runs/40904651689) | No causal/predictive claims |
| Pass 9 | Redesign of library, history, result tabs and exam layout; keyboard/accessibility improvements | [Pass 9 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS9_RELEASE_ACCEPTANCE.md) · [former parity ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md) · [CI #40916049802](https://github.com/oneshubhamt/practice-desk/actions/runs/40916049802) | **Historic checkmarks NOT complete feature parity.** See current de novo audit and missing elements. |
| Pass 10 | Failed-IndexedDB-initial-read fallback repair, cross-browser `file://` checks, bounded 80-record history benchmark, workflow concurrency | [Pass 10 acceptance](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS10_RELEASE_ACCEPTANCE.md) · [final source/docs CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096) | Automated portion green; no physical/device/AT/crash/visual approval |

**Status correction:** Older [Pass 9](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS9_RELEASE_ACCEPTANCE.md) and [v11 ledger](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md) statements regarding “parity” described their then-tested implementation goals. A **new direct-source comparison on 30 Oct 2026** found multiple genuine missing v11 features. Their successful tests are not disputed; their sufficiency for complete parity is.

**Pass 10 documentary correction:** The dated Pass 10 report initially said final docs-only HEAD CI was pending. That historical final HEAD `5b9dce6` subsequently passed [CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096) (Chromium checks, Firefox, Linux WebKit). Manual release gates remain open.

## Current forward plan

| Pass | Focus | Primary targets | Current status |
|---|---|---|---|
| 11 | Exam experience, keyboard, fullscreen, timer and navigation | E01–E09 DONE | DONE — [CI #40940761995](https://github.com/oneshubhamt/practice-desk/actions/runs/40940761995) |
| 12 | **Generic result/review parity**: source revision, correct/wrong option states, scoring denominator, solutions, completion labels | R01–R03, R09–R12 DONE; V04/V05 visual approval pending | **COMPLETED** — [CI #40988982138](https://github.com/oneshubhamt/practice-desk/actions/runs/40988982138) |
| 13 | Atomic completed-only deletion, exact edition, saved setup, storage controls, comparable scores and safe backup v3 | H01–H07/H09 DONE; H08 safe variation, H10 exception | **COMPLETED** — [CI #40992327902](https://github.com/oneshubhamt/practice-desk/actions/runs/40992327902) |
| 14 | Genuine visits, section-gated speed, key-audit/typical filters, top-five review links and conservative study guidance | R04–R08 and C05 DONE; H07 preserved | **COMPLETED** — [CI #40994179081](https://github.com/oneshubhamt/practice-desk/actions/runs/40994179081) |
| 15 | Paired v11/generic screenshot audit, 390/768/1280, 85–140%, 200%-equivalent zoom, scoped live updates, keyboard focus and contrast | V01–V10 automated verified; physical-device/AT pending | **AUTOMATED COMPLETE** — [visual audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS15_VISUAL_AUDIT.md) |
| 16 | **Independent new v11 source audit**, all five CGL papers / ten editions, generic scoring ceiling, approved editorial caution and conditional release decision | E/R/H/V/C reconciled, manual AT/platform gates unchecked | **AUTOMATED COMPLETE** — [independent source audit](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md), [CI #41001307679](https://github.com/oneshubhamt/practice-desk/actions/runs/41001307679) |

**Passes 11–16 are implemented and source/browser-checked, with conditional automated parity acceptance.** Physical devices, Apple Safari and NVDA/VoiceOver signoff remain UNCHECKED; no release merge is authorized. Progress is updated ONLY in the [feature-parity programme](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md), not in archived pass-level reports. Historical architecture scratchpad may receive a small redirect marker but is no longer the live parity log.

## Decisions and exclusions retained

- **No legacy data migration** from v11 IndexedDB, fallback localStorage or backup v1. This is an explicitly accepted exception, not “fixed.”
- **Additive backup v3** is an accepted safer non-overwriting difference; optional validated exam setup is integrity-protected, and older v3 archives stay compatible.
- **Frozen paper/key/media and canonical hashes** remain mandatory; no mutable answer-key retroactive grading.
- **Scoring on defective/reviewed questions must be investigated**, not blindly forced to match incorrect historical arithmetic.
- **Question foreground timing is an observation, not cognitive duration**; missing visit samples and unmeasured answers cannot be invented.
- **No inferred topic diagnoses, percentile predictions, unsupervised FSRS ratings or cross-paper equal-difficulty assumptions.**
- **Must preserve new features** from Passes 4–10 while restoring old interaction features.

## Manual / external release gates (all unresolved unless evidenced later)

- [ ] Physical Android/iOS including touch, orientation, offline save/export and import
- [ ] Real desktop Firefox and Safari reopen/storage behavior
- [ ] VoiceOver/NVDA, keyboard-only workflows and zoom/contrast
- [ ] Genuine forced OS/browser termination, device-level quota exhaustion/eviction and safe recovery
- [ ] Larger history/card scale on slower hardware
- [ ] Side-by-side v11 desktop/tablet/phone screenshot review and explicit user signoff
- [ ] Exact final verified branch HEAD and separate release decision

Retain earlier Markdown acceptance files unchanged as historic evidence **except explicit status/supersession annotations**. Do not delete or rewrite away proof of previous decisions and quality checks.


## Pass 12 consolidation — 30 October 2026

The post-v11 overhaul remains a **generic multi-exam app**, not a CGL-only viewer. Pass 12 added optional version-pinned source/reviewed comparisons for any compatible exam revision, including generic passage/table/chart changes and all six question types, plus per-section scoring denominators derived from the paper's policies. New reviews use frozen original questions/keys/media; older CGL attempts with a *matching pinned original source revision* may display a read-only verified bundled source comparison. Original-source comparison is available only when grounded; never fabricated for older custom exams. New question-level review states distinguish chosen wrong, correct option, excluded and manual-only results. Completion causes, explanations and review navigation are restored. Direct real CGL and imported generic browser tests plus 81 Node tests passed in [CI #40988982138](https://github.com/oneshubhamt/practice-desk/actions/runs/40988982138); source HEAD is recorded in the [live parity programme](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md). Physical/assistive-technology/side-by-side visual signoff remains Pass 15, independent final parity audit Pass 16.


## Pass 13 consolidation — 30 October 2026

Generic history now includes exact paper/edition filtering, papers-practised and adjusted-best statistics, and a separate comparable adjusted-score trend based on matching frozen paper, key and mode. Completed-history deletion requires two confirmations and is atomic in IndexedDB or a single validated localStorage fallback write; stale tabs or refused writes do not partially clear history. In-progress attempts, imported exam packages and FSRS notebook cards are excluded. Browser storage estimates and persistence requests are clearly best effort. Saved paper/edition/mode/section—including imported exams loaded asynchronously—survive reload. The existing checksum-verified additive backup v3 may optionally carry that setup, while old v3 backups still work. v11 historical storage/v1 backups are not migrated. Full source review, acceptance and remaining manual limits: [Pass 13 checkpoint](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-13-five-step-closure--30-october-2026).


## Pass 14 consolidation — 30 October 2026

The new optional `SessionState.questionVisits` records **real question entries for new attempts**; old results have no reconstructed visits. Speed labels (Fast/Typical/Slow/Not classified) and filters share the **existing** median thresholds and at least five measured answered responses per section. Generic result review, the timing ledger and ranked top-five cumulative foreground exposures link to specific frozen questions. Audit-note and typical-speed-wrong filters and up to three cautious evidence-based recommendations complete R04–R08/C05. Negative marking, manual pending/excluded results, interrupted/zero-time entries and old persisted records are covered. Source and browser evidence: [Pass 14 closure](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-14-five-step-closure--30-october-2026), [CI #40994179081](https://github.com/oneshubhamt/practice-desk/actions/runs/40994179081). H07's comparable score trend remains Pass 13 work. Only visual/AT Pass 15 and de novo Pass 16 now remain.


## Pass 15 automated visual/AT-source consolidation — 30 October 2026

The source and screenshot evidence is in [PASS15_VISUAL_AUDIT.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS15_VISUAL_AUDIT.md), reconciled item-by-item in [V11_FEATURE_PARITY_PROGRAMME.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-15-five-step-closure--30-october-2026). Both **actual** standalone `file://` HTML versions (frozen v11 and current overhaul) were captured under matched desktop, tablet and phone viewports, including corrected reviews, exam figures/passages, question options, score sections, timers, history and Display light/dark. New `scripts/pass15-visual.mjs` publishes PNG/JSON evidence with every CI run; checks explicitly include keyboard Aa/Escape and review tabs, targeted route announcements, 85–140% font, WCAG-AA 4.5:1 token pairs, reduced motion, 200%-equivalent viewport and offscreen popover geometry. **Real screenshot inspection**, not CSS existence checks, uncovered and drove fixes to the overly wide and off-left zoom popup and unnecessarily wrapped mobile Full screen action. The new `#screen-announcement` replaces v11's noisy entire-app live region with scoped status updates. The manual signoff checklist still flags physical Android/iOS/macOS Safari, NVDA/VoiceOver and human visual approval as **UNCHECKED**. Next: independent Pass 16 audit and release decision, not automatic merge.

**Pass 15 verification:** [CI #40998410079](https://github.com/oneshubhamt/practice-desk/actions/runs/40998410079) green, with [87-screenshot v11/overhaul artifact](https://github.com/oneshubhamt/practice-desk/actions/runs/40998410079/artifacts/12952705607) including measured 195px zoom Display geometry and contrast. Visual findings, code changes and all manual approval gaps: [PASS15_VISUAL_AUDIT.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS15_VISUAL_AUDIT.md).

## Pass 16 independent final audit — 30 October 2026

The complete new, direct-source audit and release findings are in [PASS16_INDEPENDENT_AUDIT.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/PASS16_INDEPENDENT_AUDIT.md) and the reconciled [live programme](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-16-closure--user-approved-decisions-supersede-opening-hypotheses). It identified three real source gaps and fixed them: **C01** reviewed unpatched source-invalid CGL items must be caution and scoreable under the v11 policy expressly selected by the user (original invalid remains unscored, no change to the published key); **F16-02** imported generic partial-credit component responses cannot exceed declared full marks; **F16-03** Learning Desk navigation now triggers scoped announcement and route heading focus. No live app user data requires migration. 500 original/reviewed CGL item mappings and a new `file://` ten-edition source/reviewed browser run (including the published-key-disputed October 6 Q62) provide independent checks. [CI #41001307679](https://github.com/oneshubhamt/practice-desk/actions/runs/41001307679) passed 95 Node tests, existing Passes 11–15 browser checks and cross-browser offline acceptance. **Conditional automated acceptance only**; physical Android/iOS/macOS Safari, screen readers and actual device storage failure testing remain unchecked, and `main` is not merged.



## 10. Superseded Pass 9 parity ledger (archive only)

> Original: [docs/V11_PARITY_LEDGER.md](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_PARITY_LEDGER.md). Historical status statements and pre-approval hypotheses are superseded by **Section 1 binding policy** and the final pass-closure conclusions; the de novo audit reports separately.

# v11 reference — superseded Pass 9 ledger (historical record)

> **SUPERSEDED 30 October 2026.** This was the Pass 9 *implemented-work and automated-check* checklist. An independent source-to-source audit subsequently identified many v11 UI and feature regressions. **Do not use the table below as evidence of complete parity.** Use **[the authoritative v11 Feature Parity Programme](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/V11_FEATURE_PARITY_PROGRAMME.md)** for live status, source anchors, gap IDs, Passes 11–16 and acceptance. Historical claims are retained verbatim below for traceability.

---

# v11 reference and Pass 9 parity ledger

**Frozen reference:** `baseline/v11` with `src/app/legacy.ts`, v11 CSS/template. **Current:** typed `overhaul`, no parallel legacy runtime, no v11 migration. Source behavior has been audited; Chromium automated UI and responsive regression is green. Pixel-by-pixel visual approval on real devices remains a **separate Pass 10/manual task**.

| V11 capability | Restored / improved on `overhaul` in Pass 9 | Verification and bounds |
|---|---|---|
| Designed home, selected paper and active resume | Rich home overview; mode cards; accurate timer/question/navigation preview; four summary stats; resume banner; recent attempts, learning and backup tiles | Native Chrome `file://` start/resume and mode previews |
| Dedicated history & insights | Search, sort, status filters, historical scores, resume/delete, summaries, exact revision trend and cross-paper section priorities | Browser filter/sort/search/return; null accuracy never graphed as 0; no arbitrary cross-paper mark comparison |
| Separate insights, review and timing | Three accessible keyboard-operable result tabs, frozen review, full item timing ledger and shortcuts from ledger to review | Chrome result tab/filter/ledger and keyboard tests; answers hidden until submission |
| Audited vs original score story | Original-key unadjusted score remains pinned separately; reviewed score, manual written self-assessment and revision-exam practice marks are labelled | Pass 7/8 immutable score and backup regression retained |
| Section pacing and visual status | Section progress/accuracy bars, foreground time and precise mode timer rules; exam progressbar, timer, palette/flag/status legend | Browser 390/768/desktop responsive; timers are not claims about thinking time |
| Speed×accuracy, mark opportunities, answer revisions | Section-relative speed matrix, real penalty and hypothetical wrong/skipped arithmetic, direct targeted review; now persists **actual answer events** and shows observed rescue/loss for directly replaced single-choice answers | Pure tests and Chrome review navigation; cleared/unlogged items not assigned false outcomes |
| Detailed question timing/review filters | Sortable chronological time ledger via frozen order, review by verdict/flag/speed, source page/citation/frozen images, notebook capture | Browser item ledger, filters, figure decode, source provenance; no claimed cause of errors |
| Immersive mock-test workspace | Styled question panel, progress/timer, sections, sticky navigator, palette, buttons, keyboard navigation and responsiveness | CGL all modes, custom six-kind exam, Alt+arrows and small screens |
| Compact display settings | Accessible Aa popover, saved theme/text scale, optional fullscreen, Escape/outside close | Browser preference/backup, visible popover, Escape; platform fullscreen acceptance pending |
| Learning/revision | FSRS-7 due queue and generated revision exams plus new notebook summary/error pattern cards, consistent visual system | FSRS/notes/source linkage/backup/reopen regression |
| Correctness, integrity and recovery | New strict TS, frozen revisions/media, backup v3, two-tab conflict and UNSAVED_RECOVERY retained | All 75 tests, Chromium offline smoke; no v11 runtime/data compatibility |

**Honesty boundary:** These rows indicate **functional and authored-visual parity work performed**, not proof that users will prefer the result or that every v11 pixel is duplicated. Preserve this ledger in Pass 10 for screenshot comparisons, accessibility, real devices and residual visual adjustments rather than silently declaring those verified.



## 11. Documentation sanitation, evidence hierarchy and future updates

1. **Canonical source** for pass history, requirements, decision log, data model and accepted exceptions is this file. Other previous `docs/*.md` were deliberately consolidated; the exact original contents remain accessible at [pre-consolidation Git HEAD](https://github.com/oneshubhamt/practice-desk/blob/d4c36f9286059af970be342a7a894415517087aa/docs/).
2. Read decisions in Section 1 before historical extracts. Earlier conflicting scratchpad notes are not active requirements; the user-approved reviewed CGL caution policy and partial-ceiling rule override preliminary Pass 16 concerns.
3. **Source code is implementation truth**. Pass-specific tests and reports are regression evidence, not substitute for a de novo line-by-line comparison. Any new independent audit is a separate dated report and must cite actual source code locations and classify evidence limitations.
4. Any discovered regression or release blocker must have a concrete reproducible source-to-source trace, risk/severity, targeted repair plan and status. Do not silently mark it complete from a fixture or prior CI.
5. Keep `README.md` for entry/setup, `AGENTS.md` for edit constraints, **this document for all engineering history**, and a separate independent source-audit report. Avoid recreating overlapping checklists and chronological scratchpads.
