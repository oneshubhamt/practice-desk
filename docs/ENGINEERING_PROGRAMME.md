# Practice Desk — Consolidated Engineering Programme

**Canonical forward-looking implementation plan | Created 1 November 2026 | Branch `overhaul` | Status: P41 AUTOMATED-VERIFIED; P42 NEXT; FINAL P48 CROSS-PRODUCT QA AND MANUAL RELEASE OPEN**

> **Single source of future work.** This programme consolidates the open recommendations of the **28 October 2026 architecture audit**, the **1 November source-verification/gap analysis**, the completed original-v11 feature-parity and visual programmes, the earlier architecture/state/data passes, and Passes 36–40 test-suite consolidation. **Historical reports remain preserved as evidence; they are not active development queues.** No change to application source, the question banks, the generated HTML, or `main` / `baseline/v11` is authorized merely by writing this plan.

## 0. Fast handoff — what to read and do next

1. Read **this file** for all OPEN work, ordered passes, decisions, risk and release gates. **P41 completed with source-level and browser regression verification. Next is P42**, dependency/security and import-hardening work. Do not skip P42's audit and targeted QA.
2. For an assigned pass, inspect the **current actual `overhaul` HEAD** and relevant `src/`, the [active binding decisions](decisions/POLICY_REGISTER.md), [data contracts](architecture/DATA_CONTRACTS.md) and [QA commands](QA_CURRENT.md). Past claims cannot supersede current source.
3. Use the **five-step cycle** in `9 and record audit → analysis → implementation → objective reconciliation → targeted QA **in the live ledger in `11, not in a new chronological Markdown document**. Any discovered issue receives a stable ID.
4. Don't call a pass verified until changed-source inspection and all required CI jobs are green. Keep manual Mac/AT/device checks separate from automated simulation.
5. Historical parity is **closed**. Do not reintroduce old screenshot matrices, source-v11 paired runs, per-pass numbered browser script files, or visual “must look exactly like v11” mandates.

**Baseline verified at authoring:** `60ec07c60bed3497d077d5d2246bf972a6bf8dcc` on `overhaul`; [Pass40 CI 41321335800](https://github.com/oneshubhamt/practice-desk/actions/runs/41321335800) **5/5 jobs**, **176/176 Node registrations**, **13 capability-based browser suites**, actual offline Chromium plus Firefox/WebKit platform/fallback; no routine v11 screenshots; generated HTML published only after gates. **This is a test-suite baseline, not a certification that all 28 October recommendations were built.**

### Binding user decision: no-regression, targeted QA, deployment flexibility (1 November 2026)

**Hardline: zero regressions in all existing supported workflows and independently verified contracts.** Every new pass must preserve scores, frozen questions/history, persistence/backups, exam timing, navigation, accessibility and current import/source rules, demonstrated through impact-mapped tests. A necessary incompatible choice requires an *advance* written case, affected-user/data migration and rollback plan, and **explicit user approval**; never hide failure by deleting a meaningful assertion.

**Fifth step is targeted QA:** audit → analyse → implement → reconcile every objective → **targeted QA** (positive, negative/adversarial, frozen-reopen and directly affected browser tests), together with existing CI. A **fresh comprehensive independent full-app QA** runs at P48 after the programme; an earlier broad audit is permissible only for a documented cross-cutting risk, dependency or failure. Preserve existing CI baseline; do not bring back v11 screenshot warehouses.

**`file://` is the current supported default, not an inviolable design limitation.** An alternative origin/distribution may be justified by browser/storage reliability, security, maintainability or new requirements, following user approval, migration, privacy/offline and rollback checks. Until then all current offline contracts and tests remain in effect. No unannounced account/cloud/telemetry migration.

**Documentation map:** the comprehensive uploaded 28 October assessment is already preserved in [archived baseline architecture audit](history/BASELINE_V11_ARCHITECTURE.md)—avoid duplication. [Current architecture](architecture/CURRENT_ARCHITECTURE.md) describes the actual implementation, [data contracts](architecture/DATA_CONTRACTS.md) preserve invariants, [decision register](decisions/POLICY_REGISTER.md) holds binding choices, [QA handbook](QA_CURRENT.md) gives current test gates, and **this one programme** contains all live passes and scratchpad entries.

### Status vocabulary — evidence, not aspiration

| Label | Exact meaning |
|---|---|
| **VERIFIED** | Inspected production source **and** passing relevant automated evidence at a named commit/run. Scope limited to tested conditions. |
| **PARTIAL** | Useful working subset exists but audited objective is incomplete. |
| **OPEN** | Not implemented or user-facing objective not demonstrated; current source locators recorded. |
| **DEFERRED** | Deliberately not in the near-term programme; reason, revisit trigger and owner recorded; not portrayed as implemented. |
| **CONDITIONAL** | Implement only if an agreed benchmark, risk or product scenario justifies it. |
| **EXTERNAL** | Manual/device/OS/browser/account constraints cannot be certified by current CI. |
| **BLOCKED** | A dependency, source-data decision or verification problem prevents honest completion. |

No artificial numerical completeness percentages or “all recommendations done” claim. A planned pass stays OPEN until executed and verified.

## 1. Authority, consolidation boundaries and historical programme closure

### 1.1 Document precedence when instructions differ

1. **Explicit new user decision** and actual immutable source/policy constraints.
2. This **current consolidated programme** for future scope, sequencing, gates and live status.
3. [Active decision register](decisions/POLICY_REGISTER.md) for enduring product/editorial exceptions; any new decision must be appended there.
4. [Current data contracts](architecture/DATA_CONTRACTS.md), [architecture](architecture/CURRENT_ARCHITECTURE.md), [QA/release guide](QA_CURRENT.md), [authoring guide](architecture/QUESTION_BANK_AUTHORING.md) for actual supported behaviour.
5. Dated historical implementation/audit records for evidence, **never as a conflicting TODO or a requirement to restore old UI/screenshot tests**.

**Do not delete historical evidence simply to reduce file count.** Consolidation means **one operational backlog, one status ledger, one procedure and one navigation map**; archived files still supply traceability, provenance, scenario IDs and completed-pass test evidence. Do not silently rewrite past failures to reflect later fixes. `AGENTS.md` must link here first for future implementation.

### 1.2 Historical programme and documentation disposition (exhaustive repo Markdown map at baseline)

| Existing document | Disposition | Material absorbed or retained |
|---|---|---|
| `AGENTS.md` | **Binding engineering rulebook**, points here | Branch, six-kind/offline/source, five steps, QA and Q62. |
| `README.md` | Product/readme entry only, points here | Build, current features and navigation to programme. |
| `docs/README.md` | Index only, points here | Historical programmes demarcated. |
| `docs/QA_CURRENT.md` | Active **execution/release handbook** | 176 tests, 13 browser suites, five-job CI, physical release limits. |
| `docs/decisions/POLICY_REGISTER.md` | Active **decisions/exceptions** | D01–D29 binding; new roadmap adoption D30. |
| `docs/architecture/CURRENT_ARCHITECTURE.md` | Active **as-built reference** | Layer boundaries and Safari `file://` hash fallback; avoid reviving native-only claim. |
| `docs/architecture/DATA_CONTRACTS.md` | Active **invariant reference** | Frozen revisions, exact policy, backups and comparability. |
| `docs/architecture/QUESTION_BANK_AUTHORING.md` | Active **authoring manual** | MCQ/NAT simple and advanced six-kind imports, limitations. |
| `docs/architecture/NATIVE_NAVIGATION_REFACTOR_PLAN.md` | **ARCHIVED original design** | Pass32 native-only design **superseded** by feature-detected Safari hash fallback; no future mandate. |
| `docs/architecture/RESULTS_V11_PARITY_PLAN.md` | **ARCHIVED completed UI programme** | Result composition, timing and reading clarity as current regression guarantees, not pixel targets. |
| `docs/audits/V11_SOURCE_AUDIT_2026-10-30.md` | **ARCHIVED detailed source/implementation record** | F01–F15, G01–G10 and Pass17–35; explicit exceptions, old Section G scratchpad **closed**. |
| `docs/audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md` | **ARCHIVED independent source evidence** | 24 source repairs/one intentional incompatibility, not real-device certification. |
| `docs/audits/PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md` | **ARCHIVED 11 desktop findings** | L01–L11 repaired in sampled automated states; original failed screenshots retained as history. |
| `docs/audits/PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md` | **ARCHIVED completed v11 visual matrix** | 184 sampled states and 56 paired historic comparisons; no future recurring requirement. |
| `docs/audits/TEST_SUITE_REENGINEERING_PLAN_2026-11-01.md` | **ARCHIVED Pass36–40 migration ledger** | 36→8 Node file consolidation, 178→176 meaningful case reduction, 26→0 historical Chromium scripts and successor mapping; Pass40 CI verified. |
| `docs/history/BASELINE_V11_ARCHITECTURE.md` | **ARCHIVED original 28 Oct audit** | Original architecture goals, 28 findings, CLEAR standard and single-file contract; use with user-provided audit. |
| `docs/history/PASSES_04_16.md` | **ARCHIVED historical detailed implementation** | Original state/schema/data/learning work and specific earlier decisions. |
| **This document** (`docs/ENGINEERING_PROGRAMME.md`) | **ONLY ACTIVE FUTURE PROGRAMME** | Gap ledger, pass definitions, proof criteria, dependency graph, change log, owner/QA/status and release gates. |

If a historical paragraph says “still OPEN” but a later verified programme closed it, report the dated scope; **do not reopen unless current source or a new failing test demonstrates regression**. Likewise a historical “native API only” statement does not override current Safari-compatible routing. All historical links remain resolvable.

### 1.3 Completed programmes — do not schedule again

- **P01–P16:** generic TypeScript exam, validation, immutable content, session/scoring, storage and learning foundations implemented with later repairs.
- **P17–P23:** source audit F/G repairs and independent content/score/engine acceptance. Retain **the user-approved 6 Oct CGL Q62 exception**: source-invalid excluded; reviewed scoreable **caution** with publisher option **B** retained, +2/−0.5 under CGL rules; not independently certified. Explicit D02/D03 overrides generic “unverified invalid always exclude” philosophy for this editorially disclosed case.
- **P24–P35:** historical v11 desktop/results/layout/Aa/navigation parity and final screenshot reviews **completed and retired as a comparator**. The current app may improve appearance without paired v11 matching. Native-only Pass32 was superseded by Safari `file://` fallback.
- **P36–P40:** QA programme complete; 176 Node tests and 13 current-app browser suites, **zero historical chronological scripts**, five-job CI [41321335800](https://github.com/oneshubhamt/practice-desk/actions/runs/41321335800). Historical test counts and old script names are not active instructions.
- **Live baseline protections:** exact frozen scoring, no premature keys/solutions, source/reviewed separation, additive v3 backups and CAS, early-submit/expiry, real answers and manual grades, FSRS separate from test marks, original data integrity, app-wide offline `file://`, scrolled Aa, responsive 195 CSS px + 140% type scale, current Mac fallback and no new browser/network dependencies.

## 2. Consolidated gap register — exhaustive architectural audit reconciliation

The 28 October document is a **target vision**, not a claim that every optional feature is obligatory. The 1 November source comparison is the current **gap hypothesis** and the starting scope; each pass rechecks against fresh HEAD. The critical score-comparison bug is independently traceable to current `src/content/import-cgl.ts` (option IDs use positional A–D) and `src/engine/source-comparison.ts` (the original key assumes the same IDs imply the same semantics).

| ID / priority | Requirement or concern | Baseline classification | Source owner / next action |
|---|---|---|---|
| **I01 / P0** | Original-publisher-key comparison must not equate changed options merely because A/B/C/D IDs match | **VERIFIED P41** for conservative exact rendered-content comparison and unavailable/legacy handling; 25 option changes, 21 source-answer-text changes | `source-comparison.ts`, Results, frozen records, unit/browser proof [CI 41336695608](https://github.com/oneshubhamt/practice-desk/actions/runs/41336695608) |
| **I02 / P0** | Preserve CGL verified result and frozen historical source/Q62 editorial status while fixing I01 | **VERIFIED invariant** requiring regression protection | `review-source.ts`, `scoring.ts`, Q62 docs/tests → **P41** |
| **I03 / P1** | Dependency versions reproducible; deterministic CI installs | **OPEN** (no lockfile; uses `npm install`) | `package.json`, CI, lockfile and vulnerability/licence review → **P42** |
| **I04 / P1** | Exam-family navigation and hierarchical Library that scales beyond CGL | **PARTIAL** (one paper selector, edition toggle and custom optgroup) | `generic-ui.ts`, catalogue service/selector, accessible family list → **P43** |
| **I05 / P1** | Independent per-exam saved setup, simulation/default/section options | **PARTIAL** (one global `selection.v1`) | `practice-selection.ts`, policy-driven presets → **P43** |
| **I06 / P1** | Generic reusable practice-set composition by count, topic, difficulty and evidence | **PARTIAL** (imported custom package; notebook revision only up to 25) | question selection/`revision-test.ts` → **P44** |
| **I07 / P1** | Wrong, blank, slow, flagged/bookmarked, due and recurrent-errors targeted practice | **PARTIAL** (notebook/FSRS exists; broad automatic selection absent) | learning evidence + selection engine → **P44/P46** |
| **I08 / P1** | Persistent record scale: full `getAll()`, whole-record rewriting, single attempts store | **PARTIAL**, performance architecture requires measurement, not automatic schema rewrite | `generic-ui.ts` storage/History → **P45 conditional** |
| **I09 / P1** | In-app storage health, warning/repair/export status and recoverability | **PARTIAL** (existing status/warnings/backup/export) | data health/History view → **P45** |
| **I10 / P1** | Topic hierarchy and credible cross-attempt consistency/coverage | **PARTIAL** (sections/source topic IDs/custom labels and observed trends, not a hierarchy) | `learning/learning.ts` and user-defined taxonomy → **P46** |
| **I11 / P1** | Actual Mac Safari on-device native/fallback navigation, file reload/back | **EXTERNAL OPEN**, WebKit simulator not physical Safari | manual documented matrix → **P42 and P48** |
| **I12 / P2** | Finer question-time ledger: first-answer dwell vs subsequent revision/visits | **PARTIAL**, cumulative visible exposure/visit counts already work | `session.ts` evidence schema, if sample confidence sufficient → **P46** |
| **I13 / P2** | History filtering by exam, date range, mode and paper revision | **PARTIAL** (paper/revision/text/status/newest-oldest) | `history-page.ts` query model → **P47** |
| **I14 / P2** | Accessible figure enlargement/pan/zoom, without breaking text/images offline | **OPEN dedicated interaction**; figures render and table scroll exist | `generic-ui.ts` / media viewer → **P47** |
| **I15 / P2** | Robust authored maths rendering without remote scripts or answer leaks | **OPEN generic math typesetting**; current text and image support only | optional local math subset or bundled local renderer → **P47 conditional** |
| **I16 / P2** | Configurable key shortcuts, improved focus and AT disclosure | **PARTIAL** (documented fixed shortcuts, ARIA and simulated tests) | keyboard map/settings; actual screen reader → **P47/P48** |
| **I17 / P2** | Reduce unnecessary whole-screen HTML regeneration; large coordinator `generic-ui.ts` | **PARTIAL** (screen renderer and lazy tabs; ~113KB coordinator) | profile concrete rerender/focus hotspots; targeted extraction **P47 conditional** |
| **I18 / P2** | First-class per-question deadlines or fixed calendar deadline policies | **OPEN optional**; no proven exam demand in present presets | **DEFER** until a defined exam package/user case requires it |
| **I19 / P2** | Dedicated unscored survey assessment | **OPEN optional**, six scored/gradable kinds already suffice | **DEFER** unless explicit use case |
| **I20 / P2** | Physical Android/iOS/touch, NVDA/VoiceOver/TalkBack and hostile OS eviction | **EXTERNAL OPEN** (automated test simulation not enough) | device/AT evidence and user approval → **P48** |
| **I21 / P2** | Full APFC, CAT, UPSC, RBI banks and official-like presets | **PARTIAL/CONTENT NOT SUPPLIED**; engine supports authored rules; APFC/NAT starter only | separate verified data acquisition/editorial review, **not** fabricated in UI engineering |
| **I22 / P2** | Import threat model beyond happy-path (gigantic/malformed payload, URLs/HTML) | **PARTIAL** (schema, hash and size limits; physical memory/OS stress untested) | adversarial bounded tests and actual file security review → **P42/P48** |
| **I23 / P2** | More elaborate storage stores/cursors/transaction-normalized response events | **CONDITIONAL**: only if P45 thresholds justify costs | explicit architectural design RFC, no premature migration |
| **I24 / P2** | Portable PWA/server origin, cloud sync/account/telemetry, AI percentile predictions | **DEFERRED / out of scope** for offline single HTML, privacy and evidence constraints | new explicit user choice required |
| **I25 / P2** | Clean architecture, full typed modules and one engine, no hidden debug timing shortcuts | **LARGELY VERIFIED**; maintain as hard regression constraints | all passes |
| **I26 / P1** | Practice profiles and authored exams must accurately disclose official-vs-custom rules/labels | **VERIFIED foundation** requiring extension without misrepresentation | preflight, authoring schema, all new presets |

**Audit-to-register coverage:** Original sections 3–8 map I01/I02/I25/I26; 9–11 map I08/I09/I23/I24; 12–14 map I04–I07/I18/I19/I21; 15–18 map I07/I10/I12; 19–20 map I13–I17/I20; 21–22 map I03/I08/I14/I15/I22/I25; 23–25 map P42/P48 and `9; 26–28 map all phases. No original advanced suggestion is silently declared implemented.

## 3. Core engineering boundaries for every future pass

**CLEAR:** Clean · Lean · Efficient · Elegant · Reliable. Prefer a few strong invariants over elaborate abstractions, repeated one-off wrappers or dozens of new tests that merely check the same behaviour.

1. **One six-kind engine and immutable policies:** `src/domain/*`, `src/engine/*`, `src/history/frozen.ts`, not a second CGL-only path. SSC constants may remain **only in its CGL adapter**, not the generic engine.
2. **Current distribution default:** generate offline `file://` HTML from modular TS/CSS/content with no remote dependencies or telemetry, never hand-edit output. Alternate delivery is possible only under the binding user-approved evidence/migration/non-regression decision above.
3. **Editorial integrity:** original/reviewed independent; no silent option-ID semantic mapping, no new score certifications, no answer/editorial/explanation leaks until submission; Q62 D02/D03 untouched. Preserve prior original data and all completed attempt scores.
4. **State and time:** deterministic transitions, monotonic live time, honest recovered wall-time uncertainty, real not fabricated section timing, no late response after locked expiry, no double submission.
5. **Storage:** single-writer CAS/revision or stronger, atomic durable writes, frozen question/key/media/scoring, additive no-overwrite backup v3, export unfinished and Learning cards, explicit **failure/unsaved** messages. New schema complexity only after measured need; no live user-data migration burden was approved for the old v11 baseline, **but current `overhaul` may now have user test data**, so never silently discard it.
6. **Security and privacy:** imported content untrusted; strict schema/size/timing/URL/data-URI checks, escaped text and attributes, correct CSP/offline fallback; do not trust self-provided label “official.” No credentials, user tracking or remote execution.
7. **User experience:** source/reviewed genuinely filter; no forced new mode for CGL; preserve untimed, timers, blank/answer, flag, manual mark, FSRS, backups, responsive 195px+140%, accessible Aa independent of header, browser navigation. Improve visuals on their own merits, **not pixel parity**.
8. **Verification:** no “rename equals consolidation”; preserve distinct failure modes. Prefer focused deterministic Node tests, real offline browser journeys for user-facing workflows, failure screenshots only, GitHub-gated artifact publication. Human device/AT/operating system outcomes require real-world checks.

## 4. Implementation programme: dependencies, passes and gates

**Order is deliberate, but later optional enhancements may be omitted by a documented user choice.** Each pass must close with a demonstrable feature, a negative/adversarial case, relevant regression checks and source evidence. Pass labels are **new P41–P48**, avoiding any claim that historical P01–P40 is still active.

`P41 (correctness) → P42 (security/dependency baseline) → P43 (multiexam UX) → P44 (custom practice builder) → P45 (measure storage + justified fixes) → P46 (learning expansion) → P47 (targeted UI refinements) → P48 (independent audit/release readiness).`

Parallel preparation of requirements/test fixtures is allowed, but **do not merge later feature work while I01 score semantics remain open**.

### P41 — Correct source/publisher-key comparison [P0, first implementation]

**Scope:** I01, I02 and affected Results/provenance. **Inspect** `src/content/import-cgl.ts`, `src/content/papers.json` and `patches.json`, `src/engine/source-comparison.ts`, `review-source.ts`, `generic-ui.ts` Results, `tests/content-and-provenance.test.mjs`, `acceptance-editorial-provenance.mjs`, and backup/frozen representations. The **25 altered-option CGL patches / 21 changed source-correct option texts** are the audit's current count; rederive from checked-in source at start and attach the exact case list. Anchor adversarial **5 Oct Q32**; also test a benign punctuation-only edit and options genuinely rearranged.

**Decision before code:** represent whether each **individual** revised response can be mapped unambiguously back to source *by semantic identity*, not by letter. Same-position/same-letter IDs do **not** prove identity if text/meaning changed. Conservative mapping: all option texts and identities unchanged, or an explicitly reviewed option correspondence documented with source evidence. Similar-looking strings alone are not verified semantic equivalence. If any option is ambiguous, its **original-key comparison is unavailable**; retain the original source text and key for display as provenance, not as a certified alternative score. Preserve valid mappings only if independently checked.

**Display and mathematics:** distinguish “reviewed attempt score” (unchanged, frozen) from “source-key hypothetical comparison.” Never display an apparently full-paper original-key score when some items cannot be compared. Either suppress the aggregate and show coverage/count of unavailable items, or show a clearly labelled **comparable subset only** with a subset denominator; choose via explicit source audit and user-facing clarity. No change to the frozen actual result, section marks, Q62 policy or source JSON. Existing records with a pinned but ambiguous aggregate need an explicit “legacy comparison unavailable/unverified” treatment; no silent retroactive rescore.

**Acceptance (must all PASS):**
- P41-01: deterministic **table of all 25 option-changing patches**, why comparable/unavailable; Q32 cannot falsely score revised B as identical publisher B.
- P41-02: source-key frozen/reference representation and exporter/importer validation cannot claim false semantic comparability, even after library update/reload.
- P41-03: exact original/reviewed Q62 score/editorial and unchanged published banks, all 10 CGL editions and every reviewed item retain their original intended actual result.
- P41-04: explicit original-key unavailable/partial presentation, accurate denominators/labels, no answer leakage pre-submit and clear post-submit explanation.
- P41-05: two independent negative tests (**same letter, different meaning**; **reordered same text**) plus positive identity mapping and legacy stored record; relevant Node plus real `file://` Chromium end-to-end green, then full five-job CI.
- P41-06: reconciliation diff proves no accidental mutation of `papers.json`, `patches.json`, `solutions.json`, CGL scoring rules, user's frozen attempt score, editor D02/D03 and no unaffected option comparison changes.

**Pass done only after** meaningful score/provenance proof and CI, not a UI label that hides the error.

### P42 — Dependency reproducibility, threat model and audit baseline [P1]

**Scope:** I03, I11, I22. Lock direct and transitive dependency versions, adopt `npm ci` only **after** a valid committed lockfile is generated from Node24/npm and tested from a clean checkout. Audit executable dependencies (bundler, `playwright-core`, `ts-fsrs` etc.) against actual package versions/licenses/security guidance; do not blindly upgrade everything in one pass. If an advisement requires a runtime upgrade, isolate and test it.

**Acceptance:** deterministic `npm ci` build whose committed HTML matches a reproducible source hash except expected metadata; lockfile/no-network-at-runtime verified; import fuzz cases for unsupported schemes, giant declared string/payload, excess question IDs, invalid media hashes and corrupted backup; controlled recovery warning on failed write/read; update CI without weakening publish branch/source-drift checks. Record evidence of what was and was not possible offline. Issue an exact **manual Mac Safari reproduction checklist** and collect user's device result if available; otherwise keep I11 EXTERNAL.

**Scope limit:** a lockfile is source/tooling work, not permission to deploy hosted services or change content/answers.

### P43 — Exam-family Library and independent presets [P1]

**Scope:** I04/I05/I26. Build a restrained **family → paper → edition → mode/start** path with SSC CGL plus **imported** families sorted/grouped by their actual `examId`; optional category icons, not hard-coded false “official CAT/RBI/APFC” collections. Distinguish user-authored/imported, source and reviewed; preserve edition pairing. Define a **per-exam setup map** keyed by stable exam ID (current paper revision, edition, mode/section, untimed), plus safe default from the actual paper policy; keep stale IDs from crashing app, and never substitute another exam silently. Maintain the global legacy `selection.v1` only via explicit compatibility/replacement policy; new-app existing saved selection remains safe.

**Acceptance:** start SSC CGL strict, flexible, single, untimed with 4×25 and exact CGL scoring; import two genuinely different exam definitions (e.g. 3-question APFC MCQ/NAT template and existing six-kind package) and switch them with independent remembered choices; imported timer/scoring/section structure unchanged; clear unsupported vs available exam families; keyboard/screen reader selection and 195px/140% no-overflow; backup round trip for settings; no pre-submit answer leakage. **Do not advertise a 2026 APFC 120-question specification as official if that question count is a working historical mock assumption.**

### P44 — Transparent custom practice composition [P1]

**Scope:** I06 and selection part of I07. Create reusable selection/filter component operating on already validated immutable question revisions: user chooses paper/edition or compatible pool, topic tags, count, explicit mode/timing, optionally self-curated difficulty **only when metadata is supplied**, and a seeded reproducible draw. Excluded/caution rules and originally frozen answer/media source references follow selected questions; do not invent topic/difficulty tags.

**Acceptance:** exactly N available eligible questions, deterministic seed+manifest, no duplicates across sections, frozen selected question/key/source IDs, truthful maximum, chosen timing/navigation preserved, no leakage to exam screen, user-facing "fewer than N eligible" explanation rather than fabricated questions. Keep original bank immutable; no arbitrary mixing of incompatible score policies or exam families. Complete/reopen/backup and cross-device import new practice results without altering source attempts. Existing 1–25 notebook revision tests continue to function and remain independently scored.

### P45 — Measure storage and History; repair only proven bottlenecks [P1 / CONDITIONAL]

**Scope:** I08/I09/I23. Source `generic-ui.ts` currently opens IndexedDB v1 with a single `attempts` store and `getAll()` on startup; History sorts in memory. First build reliable **repeatable offline profiles** (0, 100, 1,000, and an agreed feasible larger workload; mix completed/in-progress/imported/FSRS, realistic images and prompts). Measure cold open, record save latency/bytes, History filter/sort, backup generation/memory and crash recovery in Chromium; avoid an arbitrary “slow” claim from one runner.

**Decision gate:** if existing whole-record saves and `getAll()` meet user-visible targets, **retain the simple model** and add only high-value diagnostics, safe error messages and limits. If measured performance/memory or recoverability fails, write a small design decision comparing cursor/index pagination, keyed paged listing, separate small metadata index and normalized response/event transactions. Choose the smallest adequate design and implement incrementally. Existing saved `overhaul` records must migrate/recover atomically or a user-approved clean break must be explicit; **never silently truncate**. Do not create five stores just because the 28 Oct audit illustrated them.

**Acceptance:** measured before/after numbers with environment, repeat count and dataset; no loss of completed score, pending work, packages, FSRS, backup or old-version restore; IDB read/write failure and CAS conflict remain conspicuous; History can be inspected without eager costly full-result rendering; full CI and new real-browser stress tests. Practical user-visible data-health status shows authority (IDB/fallback), pending writes, last failure, backup guidance and non-claims (local file can lose browser storage).

### P46 — Topic evidence, stronger diagnostics and revision assembly [P1/P2]

**Scope:** I07/I10/I12. Preserve existing `topicMetrics` separation between imported topic IDs, source section labels and self-authored labels, and current FSRS-7 separate from mock marks. Add a **versioned optional syllabus taxonomy**, ideally first with source-supported APFC headings and separately authored subtopics; no guessed classification. Build review-set rules from wrong, blank, slow, repeatedly missed, flagged, bookmarked and due cards where evidence exists; explicit filter preview count and provenance.

**Acceptance:** deterministic wrong/blank/slow/due selection with insufficient-evidence messages, no auto-diagnosis of “careless” or “mastered”, sample-size/difficulty/attempt-reuse disclosure, no mixing exams/revisions without stated comparability. User-chosen self-report labels remain editable. Timed question metrics stay foreground-only and do not infer cognitive cause; add first-answer vs revisit times **only if underlying event timestamps and restored history can support them accurately**, otherwise show unavailable. FSRS reviews do not rescore an exam, and revision attempts do not pollute official-style CGL history statistics. Auto-composed short practice sets must freeze all revisions and score policies.

### P47 — Focused usability, media and architectural friction [P2/CONDITIONAL]

**Scope:** I13–I17. Add History exam-family/mode/date-range filters that compose predictably with existing search/status/paper revision and disclose result counts; keep archive results even when paper no longer installed. Provide accessible click-to-enlarge/pan/zoom **for image assets only** with keyboard Escape, focus return, bounded scale and no unsafe URLs; retain alt text. For mathematical notation, first inventory actual authored math needs; choose lightweight accessible plaintext/semantic alternatives or a locally bundled, tested renderer if demand justifies its size, **never runtime CDN**. Consider shortcut remapping only after avoiding native-radio collisions; preserve fixed keyboard alternatives. Measure focused keyboard/AT errors and rerender costs before extracting `generic-ui.ts` coordinator seams; no framework rewrite for style alone.

**Acceptance:** 195px width + additional 140% type, dark/light, reduced motion, no document overflow; meaningful keyboard focus/labels/live announcements; existing image, passage, matching and manual response operations unchanged; no premature editorials/solutions. If math/shortcuts/refactor are deferred, record why and acceptance of the limitation explicitly (do not silently label done).

### P48 — Independent end-to-end review and release handoff [gate]

**Scope:** all outstanding P41–P47 outcomes; I11/I20/I21/I22 and future manual gates. Perform new-source review by failure mode, not review of scratchpad prose alone. Inspect package integrity, no content/edit changes without authorisation, exact scoring of CGL and representative authored APFC/NAT plus six-kind custom, all three timer policies, navigation/reload, source-history separation, backup with actual pending/complete packages and FSRS, negative/malicious imports, import limits and large-history experience.

**Automated acceptance:** Node24 exact dependencies/clean `npm ci` (if adopted), TypeScript build, each of the 13 current browser journeys or defensible successor mapping, full Chromium/Firefox/WebKit `file://` routing, extreme-width Results, gate publisher and no regression of first-class exam controls. Audit exact question revisions, Q62, source-key comparability, content hashes and source-change history; use tests with explicit known maths, not screenshots as the only oracle.

**Manual evidence matrix:** physical macOS Safari (Library→Exam→History→Result→Learning; Back/Forward, reload, native/fallback and image/media), actual iOS and Android touch/zoom, real VoiceOver and NVDA/TalkBack (focus, radio groups, announcements, modal), interrupted/OS-killed session, real storage eviction/quota/reboot and an exported backup recovery. **Mark NOT TESTED when equipment or user validation is unavailable**. No fabricated claims or “passes on Mac” based only on Playwright WebKit.

**Release decision:** no merger to `main`, alterations to `baseline/v11`, distribution outside tested `overhaul` or assertion of human aesthetic approval without explicit user decision. CI publication to the existing `overhaul` artifact is not release approval.

## 5. Acceptance traceability and nonregression matrix

| Contract | Numerical/negative oracle | Existing baseline coverage / new owner |
|---|---|---|
| Corrected CGL source vs reviewed mark | Exact option semantics; changed-option mapping unavailable unless independently audited | `tests/content-and-provenance.test.mjs`; `acceptance-editorial-provenance.mjs` → P41 |
| Published Q62 | Source invalid 0; reviewed caution scores published B under CGL `+2/−0.5`, dispute post-submit | Historical D02/D03, modern editorial suite; all passes |
| Generic APFC scoring | Authored 3-item fixture yields `5/7.5`; blank 0, no fictional verified official APFC answer bank | `acceptance-bank-modes.mjs`; P43/P44 |
| Partial credit | Component earned never exceeds full correct; bounded score maximum even with adversarial imports | `tests/exam-scoring-and-policy.test.mjs`, six-kind browser; all |
| Exact frozen history | Key/question/options/media/scoring result unchanged after source edit/import/reload/backup | `src/history/frozen.ts` and recovery/critical suites |
| Timer | foreground visible exposure, section expiry, manual/automatic advance, pause and no double submission | `tests/session-and-timing.test.mjs` and `acceptance-session-policy.mjs` |
| Source/reviewed selector | true option filtering and same-paper pair; separate custom, no title conflation | `acceptance-bank-modes.mjs` |
| Failure and race | no silent overwrite after CAS conflict, recovery export available, failed write displayed | `acceptance-resilience.mjs` / recovery |
| Learning | FSRS only by explicit rating, separate frozen revision practice, no official-style regrading | `acceptance-learning-lifecycle.mjs` |
| macOS file routes | real browser Back/Forward/reload and forced-no-API fallback; native WebKit exception disclosed | `acceptance-platform.mjs`, `acceptance-safari-fallback.mjs`, **manual P48** |
| UI/accessibility | focus, tab ARIA, no horizontal 195+140 overflow, usable Aa while scrolled, honest caveats | `acceptance-ui.mjs`, bank/modes; manual P48 |
| Offline artifact | self-contained no account/network, selected source build, CI publisher checks protected branch | `scripts/build.mjs`, `.github/workflows/ci.yml` |

For every new feature add **positive, negative/adversarial, frozen-reopen and offline browser** coverage when applicable, but avoid copying the entire old suite into a new file. Tests may be consolidated when the **last independent unique assertion** is retained with evidence.

## 6. Explicit product choices and things NOT to smuggle into scope

- **Preserve:** the stable v11 branch; modern generic app, CGL original/reviewed model, exact author's correction policy, inline proof of exam rules, user-owned offline history and backups, lightweight UI, standalone `file://` distributable.
- **Do not require:** 120 MCQs as a confirmed 2026 APFC paper; unverified key or exam marks; AI percentile/selection prediction; external “official” labels on user-authored papers; cloud sync/PWA/account; infinite question types; a new framework; mandatory storage normalization without metrics; a heavy local LaTeX engine for no demonstrated demand; regular v11 screenshot comparisons.
- **Never use a data migration excuse to discard existing saved `overhaul` attempts**. Historical “no v11 migration burden” is **not** permission to overwrite current user data.
- **No silent substitutions:** question selection cannot draw from a different syllabus merely to reach target count; publisher-key comparison cannot use a guessed semantic mapping; when device/browser features are unsupported, show a clear limitation; when manual device test is unavailable say unverified.
- User may direct reprioritisation, accepted differences or feature simplification. Record decision ID, reason, impact on acceptance and current source/tests in this file and policy register.

## 7. Dependencies, risks and rollback plan

| Risk | Earliest signal | Mitigation and safe rollback |
|---|---|---|
| Source-comparison “same letter” inflates publisher-key marks | P41 adversarial Q32/changed option | Freeze actual reviewed score; disable uncertifiable comparison; restore last green code if discrepancy found; no source bank edit |
| Family-preset migration corrupts global setting | selected paper disappears after import/switch | Validate saved map, explicit fallback and backup settings; test stale paper/edition |
| User-selected practice invalidates key/mark ceiling | mixed kinds/scoring, skipped excludes | Validate newly generated package with existing domain validation; freeze selected keys, no mixing |
| Storage normalization loses data | IDB v2 upgrade/cursor fails | Backup-first manifest, old-record migration canary, atomic transaction/roll-back, idempotent retry; defer if no measured need |
| Overengineered analytics incorrectly infers mastery | low sample/repeat bias | Evidence thresholds, exact cohort keys, no predictions, user-reported error tags |
| Safari routing fails on actual Mac | browser Back after reload or unsupported Navigation API | Device/version logs and forced hash fallback; do not declare fixed on physical Mac until tested |
| Dependency lockfile breaks offline standalone build | nondeterministic HTML or build failure | Repro from clean checkout, compare artifact, revert lock change without relaxing CI |
| New math/image/keyboard UI breaks accessibility | focus trap, wrong alt or clipped zoom | native controls, focus return, WCAG-oriented automated+human tests, scoped rollback |

**Small commits and audit trail:** isolate source changes from generated-HTML publisher, tests and docs. On failure, preserve failed CI seed/log and make a narrow repair commit; **never remove a failing assertion without showing why its contract is wrong and what replaces it**. Publisher remains guarded and tests read-only. Do not force-push history or modify frozen `baseline/v11`.

## 8. Engineering architecture guidelines (for maintainers)

- **Layering:** domain (paper/question/scoring) → pure session/score/clock/review engine → storage/backup/learning services → app orchestration → renderer/UI; keep DOM and localStorage out of pure math. Different exam families contribute validated data/presets, not brand-specific scoring branches.
- **Contracts:** all imports start as `unknown`, validate shape/limits/references/hash/media and policy envelopes; immutable IDs include content revision; freeze at attempt start; explicit pure transition events; exact number formatting only at display (no per-item negative rounding).
- **Architecture decisions:** new storage schema, package format, library preference map, scorer-comparability snapshot and native/fallback route behaviour require a short decision note in `11` plus a Dxx entry when binding, rather than a new uncontrolled plan.
- **Performance:** measure representative datasets and hardware/test browser; report medians/ranges and memory where possible, not just one CI latency. Make optimizations reversible and user-visible. Favor lazy result views; run targeted QA before broad suites.
- **Change review:** every implementation pass must list touched path, adjacent consumers (source → score → saved record → UI → export), risk/rollback and independent negative or mutation-oriented test.

## 9. Mandatory five-step execution discipline

Use exactly this cycle on **every** future implementation pass; keep a live scratchpad **inside this document**.

| Step | Work required | Evidence recorded |
|---|---|---|
| **1. AUDIT** | Read current head, issue IDs, original criteria, actual source/consumers, baseline tests, historical exceptions and competing decisions. Identify the **existing** code path before writing new code. | HEAD, source paths/functions, reproduction, expected vs actual; any ambiguity/decision request. |
| **2. ANALYSE** | Examine at least two feasible approaches if material, select the cleanest scoped fix, anticipate scoring/timing/storage/history/UX regressions, decide policy/compatibility and validation. | Alternatives and rejected tradeoffs; invariant map, success/negative scenarios, rollback. |
| **3. IMPLEMENT** | Make coherent small changes on `overhaul`, with strict types, defensive validation, no generated-HTML hand edits; add/adjust owned tests. | Commit SHA, exact file diff, new/retired tests with assertion mapping. |
| **4. OBJECTIVE RECONCILIATION** | Walk **every acceptance ID** and check actual source/DOM/Math against requirement. A green unrelated test does not mean an objective is done. Fix incomplete work before continuing. | `ID → VERIFIED / PARTIAL / BLOCKED` and direct evidence; intentional differences labelled. |
| **5. TARGETED QA & RELEASE GATES** | Run affected Node fixtures, relevant real `file://` Chromium journeys, negative/adversarial cases; existing mandatory commit CI; a new comprehensive full-app QA belongs at P48 unless cross-cutting evidence justifies earlier breadth. Verify output and durable saved content. | Exact commands/run links, logs/test counts, failed seeds, regression results, manual limits, stop/go. |

**Hard stopping rules:** after a red test do not jump to the next pass; after a missing device claim mark EXTERNAL; after a source/answer change request get user editorial permission; after a scope shift update this programme first; no repeated 20+ passes to compensate for partial implementations. A task is **DONE** only when its full objective/negative/rollback evidence is recorded, not because files compiled or test counts were preserved.

## 10. Operational verification and release support matrix

| Environment | Automated proof supported today | Do not claim without separate evidence |
|---|---|---|
| Node24 TypeScript/unit/scoring | `npm run check`, 176 Node tests at baseline | mathematically all possible cases checked; current count invariant after future edits |
| Chromium actual offline `file://` | 13 modern capability tests plus passive failure diagnostics | user's real Safari/Chrome/mobile UI judged visually |
| Firefox/WebKit actual offline `file://` | `acceptance-platform` + forced-no-API `acceptance-safari-fallback` | **native** WebKit `file://` Back after reload; physical Mac Safari |
| 195 CSS px + 140% in-app text | current responsive overflow tests | every physical zoom/OS font combination |
| History/storage | CAS, quota/fallback, backup and real Chromium profile restart | all OS kill, browser eviction, private mode, file origin survival |
| Accessibility | ARIA, focus, keyboard, contrast/DOM checks | actual NVDA, VoiceOver, TalkBack and complete WCAG approval |
| CI build/publish | after all job gates, source SHA/rebase verification, scoped `contents:write` | merge to `main` or public release without explicit approval |

**Current commands:** [`docs/QA_CURRENT.md`](QA_CURRENT.md). Do not use removed `scripts/passNN*.mjs` or screenshot parity tests. **Public/physical-device release requires explicit approval**.

## 11. Live implementation ledger — keep it here, not in a fresh pass diary

### Master pass register (created 1 November 2026)

| Pass | Issue ownership | Initial status | Exit artifact and authority |
|---|---|---|---|
| **P41** | I01/I02 source/publisher-key semantics | **AUTOMATED VERIFIED — DONE** | [Five-job green CI 41336695608](https://github.com/oneshubhamt/practice-desk/actions/runs/41336695608), 179/179 Node, source semantic v2, old v1 score disabled |
| **P42** | I03/I11/I22 dependency, security and manual Mac test plan | **OPEN — NEXT** | lockfile/`npm ci`/adversarial import gate, device matrix opened |
| **P43** | I04/I05/I26 family Library, per-exam preset preferences | **OPEN** | full modern exam switching/restore/imported no-mislabel journey |
| **P44** | I06/I07 custom subset/practice configuration | **OPEN** | deterministic frozen selection, seed, count, policy tests |
| **P45** | I08/I09/I23 storage stress and health | **OPEN/CONDITIONAL** | measured keep-or-refactor decision, diagnostics and nonloss proof |
| **P46** | I07/I10/I12 taxonomy, revision targeting, measured pacing | **OPEN** | sources/coverage cohort rules and tagged revision selection |
| **P47** | I13–I17 History/media/math/keyboard/refactor | **OPEN/PARTLY CONDITIONAL** | scoped accessibility/UI and performance proof |
| **P48** | I11/I20/I21/I22 independent audit/release | **OPEN; EXTERNAL subgates** | exact CI/environment matrix + human/manual limitation register |

**One pass may be split into substages only when each has an independent measurable user contract;** use sub-ID `P43-A`, `P43-B` within this file. Do **not** invent a new programme document or claim an arbitrary calendar estimate.

### P42 — LIVE checkpoint A: source audit and bounded design (2 November 2026; IN PROGRESS)

**Start HEAD:** `de7e0541c17924e313ad2517432075b3538859c6`. **Status:** AUDIT/ANALYSE; not yet a completed P42 pass. No P42 test results should be inferred from P41's green CI. P41 automated verification remains the baseline.

**Inspected exact paths:** `package.json` (4 exact direct packages; Node >=24), `.github/workflows/ci.yml` (four `npm install` sites; guarded publisher checks branch/source SHA), `.gitignore` (no excluded committed lock), `scripts/build.mjs` (bundles local code/content without external runtime), `src/app/generic-ui.ts` (`file.size` 25MiB bank / 75MiB backup limits, actionable save/read fallback warnings, atomic writes, no silent replacement), `src/app/exam-package.ts`, `src/app/bank-import.ts`, `src/domain/validate.ts` and `src/domain/media.ts` (kind/count/media/hash/scoring checks), `src/history/backup.ts` (versioned digest/additive import), and [current QA](QA_CURRENT.md).

**Verified baseline gaps:** no committed package-lock or clean `npm ci` path; direct versions pinned but transitive installs can drift. Imported advanced packages reject >2,000 questions and malformed hashes/media; URL references are constrained to http(s), but some authored text/ID fields lack explicit bounds until hashing. Browser import caps exist; direct programmatic validators should also reject oversized textual envelopes. A separate physical Mac Safari native history/back-reload result does **not** exist. There is no requirement to add network permissions or cloud deployment.

**Chosen limited approach:** (A) generate and commit npm lockfile using actual Node24/npm CI, then adopt `npm ci` consistently and check deterministic standalone build; assess executable dependency tree and security findings separately, without speculative upgrades; (B) add bounded source-level validation for untrusted imported textual data and hostile cases, preserving real CGL content, original/reviewed sources, scoring/historical snapshots; (C) test unsupported schemes, oversize text/IDs/question counts, media digest mismatch, corrupt backups and existing read/write recovery via isolated Node and targeted `file://` browser suites; (D) document exact manual macOS Safari test steps and mark NOT TESTED until physical evidence.

**Alternatives rejected:** hand-written unsourced `integrity` hashes; broad npm major upgrades just to be current; replacing the offline file format; changing IDB schema or existing backup v3; inventing Mac Safari pass based on WebKit automation.

**Non-regression:** preserve every CGL source/key/Q62 decision, six-kind scoring/FSRS, frozen attempts/history, backup v3, browser fallback and 195px+140% responsive journeys. Every change requires the stated five-step process and targeted QA plus existing CI. **Rollback:** revert only P42 source/tooling changes if a real failure is found; do not overwrite existing user's records. Keep P42 OPEN until all acceptance requirements and CI are evidenced.

### P41 — LIVE audit checkpoint A (1 Nov 2026; NOT IMPLEMENTED)

**HEAD inspected:** `33c59037ff9b2ea8c76d740bb9af80cac18bf090` (source unchanged during documentation pass). **AUDIT complete for the reported data defect:** parsed real `src/content/papers.json` and `patches.json`: exactly **25** option-changing patches; **21** change text at the original correct option, **4** leave that option text but change another option. All **25** are conservatively noncomparable without verified option correspondence; even a same-key-letter match is not semantic proof. A changed stem/prompt can independently defeat comparability; the next source-level audit must check changes to wording, passage and media too.

| Changed-option paper/question | Original key | Source-correct-position text | Stem changed? | Conservative treatment |
|---|---|---|---|---|
| 09-30 Q81 | B | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-05 Q14 | C | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-05 Q32 | B | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-05 Q50 | A | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-05 Q56 | A | Same at key; other option changed | No | **Unavailable until individually source-mapped** |
| 10-05 Q77 | D | Changed at original key | No | **Unavailable until individually source-mapped** |
| 10-05 Q78 | B | Same at key; other option changed | Yes | **Unavailable until individually source-mapped** |
| 10-05 Q81 | C | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-05 Q92 | D | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-06 Q21 | B | Same at key; other option changed | Yes | **Unavailable until individually source-mapped** |
| 10-06 Q41 | A | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-06 Q87 | A | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-06 Q100 | B | Changed at original key | No | **Unavailable until individually source-mapped** |
| 10-07 Q8 | D | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-07 Q29 | B | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-07 Q46 | B | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-07 Q79 | A | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-07 Q83 | C | Changed at original key | No | **Unavailable until individually source-mapped** |
| 10-08 Q7 | D | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-08 Q23 | B | Changed at original key | No | **Unavailable until individually source-mapped** |
| 10-08 Q54 | D | Changed at original key | No | **Unavailable until individually source-mapped** |
| 10-08 Q79 | A | Same at key; other option changed | Yes | **Unavailable until individually source-mapped** |
| 10-08 Q86 | A | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-08 Q93 | D | Changed at original key | Yes | **Unavailable until individually source-mapped** |
| 10-08 Q100 | D | Changed at original key | No | **Unavailable until individually source-mapped** |

**Reproduction:** 5 Oct Q32's original source B means *“Most targets were met, except agricultural output due to famine.”*; reviewed B instead says *“Actual GDP growth exceeded the Plan’s targeted rate, although estimates vary by method”*. Both have positional `q:option:b`. `src/content/import-cgl.ts` manufactures A–D positional IDs, and `src/engine/source-comparison.ts` currently equates the same IDs with the same answer meaning; `sourceKeyScore()` consequently presents a potentially false full-paper aggregate in `src/app/generic-ui.ts`.

**Consumers and frozen data:** `GenericAttempt.sourceKeyReference` (`src/app/exam-package.ts`), `validateSourceKeyReference()` on stored records, `validateSourceReviewReference()` cross-checking actual publisher key, `src/history/backup.ts` v3 payload, cached source fallback for older Results, current editorial tests and `scripts/acceptance-editorial-provenance.mjs`. Preserve unchanged `papers.json`/`patches.json`/`solutions.json`, CGL Q62 scoreable reviewed caution versus excluded original, and already-frozen actual attempt marks.

**Analysis / proposed safe direction (not yet implemented):** introduce **versioned** per-item source-comparability evidence for new attempts, distinguishing original publisher key for *provenance* from an eligible hypothetical comparison. Without documented and verified option identity across versions, **exclude an item from this comparison**, never pretend to know what its letter means. Do not re-score any frozen reviewed attempt. Treat legacy positional-only source comparison as **unverified** rather than silently reinterpreting it. Display only a clearly labelled comparable subset with truthful counts/denominators, or omit the aggregate when none. Test same-letter-different-meaning, reordered-identical options, punctuation edits, Q32, Q62, original/reviewed ten edition invariants, backup/reopen and actual browser Results. This is a design proposal requiring code/tests and independent verification; **P41 remains OPEN**.

**QA status:** DATA AUDIT ONLY. No implementation, targeted test, CI or manual device success claimed in this checkpoint.


### P41 — FINAL implementation / objectives / targeted QA (1 November 2026)

**Status: AUTOMATED VERIFIED; all six P41 acceptance conditions met in tested environments.** Starting source HEAD: `33c59037ff9b2ea8c76d740bb9af80cac18bf090`. Verified implementation and test HEAD: [`2b358c66`](https://github.com/oneshubhamt/practice-desk/commit/2b358c66946b925e27a5fd6da50ea5d6a9a51b79). [Five-job green CI 41336695608](https://github.com/oneshubhamt/practice-desk/actions/runs/41336695608): **179/179 Node tests; current-app Chromium journeys, Firefox, WebKit and guarded HTML publication all SUCCESS.**

**1. AUDIT:** Source and reviewed CGL data were parsed from checked-in `papers.json`/`patches.json`, independently establishing all 25 changed-option items and 21 altered texts at the publisher-correct position (table above). Source 5 October Q32 shows why positional B cannot be treated as the same answer. Inspected `import-cgl.ts`, `source-comparison.ts`, `review-source.ts`, `generic-ui.ts`, stored attempt validator, backup and editorial browser test consumers.

**2. ANALYSE:** Considered restoring legacy full-paper scores by letter (unsafe), heuristic text similarity (not defensible for subtle meaning changes), and **exact equality of rendered question content plus referenced stimulus/media** (selected). Equality must include option text/identity/order, question prompt and referenced stimulus/asset hashes. Even punctuation-only changes are marked unavailable unless separately source-audited; no unsupported semantic equivalence is inferred. Historical v1 snapshots remain loadable but their positional aggregate is **unverified and hidden**. Revised actual scores are neither recalculated nor altered. Source-key hypothetical scores now cover **only an explicitly denominated comparable subset**; source originals and editorial notes remain preserved separately for post-submit provenance.

**3. IMPLEMENT:** `src/engine/source-comparison.ts` now issues source semantic fingerprinted schema v2 entries with per-item `comparable`; validates those claims against the frozen reviewed question and media on load, and excludes unavailable questions from hypothetical totals. Legacy schema v1 records validate without producing a certified numeric comparison. `src/app/generic-ui.ts` distinguishes full/partial/none/legacy source-key states and keeps the actual frozen score unchanged. Source banks, scoring rules, result snapshots and Q62 policy untouched. Expanded `tests/exam-scoring-and-policy.test.mjs` (25/21 census; Q32 identical-letter changed-meaning; reordered options; punctuation, media; positive exact identity; forged hash-recomputed comparability; old v1) and `scripts/acceptance-editorial-provenance.mjs` (actual `file://` Results partial-subset clarity).

**4. OBJECTIVE RECONCILIATION:**
- **P41-01 VERIFIED:** 25-case table above, independent test inventory; 5 Oct Q32 B is unavailable in source-score comparison.
- **P41-02 VERIFIED:** versioned semantic fingerprint, frozen target validation, import/stored reference verification, adversarial rehashed false-comparability rejection. Future source changes cannot relabel a frozen target response.
- **P41-03 VERIFIED:** source `papers.json`, `patches.json`, `solutions.json` are **unchanged** in [baseline→P41 source comparison](https://github.com/oneshubhamt/practice-desk/compare/33c59037ff9b2ea8c76d740bb9af80cac18bf090...2b358c66946b925e27a5fd6da50ea5d6a9a51b79); all 10 CGL editions, original Q62 exclusion / reviewed publisher-B caution +2 and existing assessed marks protected by Node/browser tests.
- **P41-04 VERIFIED:** no new pre-submit disclosure; Results labels "comparable subset only" with subset marks and counts, or "unavailable" for legacy/none; reviewed actual marks are separate and unchanged. Offline Chromium end-to-end check passed.
- **P41-05 VERIFIED:** independent changed-letter, reorder, punctuation, altered-media, unchanged-positive, legacy schema and adversarial reference tests; **179/179 Node**, real offline Chromium plus independent Firefox/WebKit platform checks green.
- **P41-06 VERIFIED:** compare diff changes only `AGENTS.md`, active docs/decision/QA, `source-comparison.ts`, `generic-ui.ts`, and the targeted tests. No source content bank, imported scoring rule, historical actual result or protected branch altered.

**5. TARGETED QA:** source semantic unit/adversarial tests, real Chromium `acceptance-editorial-provenance` with source/reviewed Q62, CGL all-edition score and post-submit source key, existing persistence/navigation/regression suites; full *mandatory automated CI* 5/5 passed as an additional safety gate. This is **not** the new comprehensive final independent P48 product/device QA. Physical macOS Safari/iOS/Android, assistive technology and OS eviction remain **EXTERNAL / NOT TESTED**, not silently certified.

**Rollback:** restore the previous green comparison/Results code and retain frozen v2 snapshots; do not retroactively score them with the unsafe v1 positional assumption. Any backwards-incompatible storage change would require an explicit migration. **P42 next**: dependency reproducibility, import threat model, and physical Mac manual reproduction procedure.

### Live pass entry template (copy/append directly beneath this section)

```text
PASS: P__ | START HEAD: ______ | DATE: ______ | OWNER: ______
SCOPE: I__ / acceptance IDs: ______
AUDIT: actual source/consumer paths; reproducer and frozen invariant
ANALYSE: alternatives; decision; risk and rollback; user permission if needed
IMPLEMENT: commit(s), exact paths and test case changes
OBJECTIVES: P__-01 ... status + source/test/link for EACH
TARGETED QA: command, browser/device, log, positive/negative/rollback
FULL CI: run URL + SHA + results, or NOT RUN (reason)
MANUAL: TESTED / NOT TESTED; environment and evidence
HANDOFF: next dependency, remaining issue IDs, STOP/GO
```

**P41 source implementation and verification recorded above.** P42 is next and remains OPEN. The mandatory independent comprehensive P48 QA and physical device/manual release authorisation remain future work; CI success does not imply public release approval.

## 12. Maintenance and audit-quality rules

- Update this file's master register **in the same code change set** when assigning/closing a pass; append evidence after successful checks, not speculative success claims. Update `docs/README.md` and `AGENTS.md` only when authority, process, links or CI names truly change.
- For a new binding product/policy choice, append `D30+` to [policy register](decisions/POLICY_REGISTER.md) with user approval/source evidence; preserve older decisions as historically dated, clearly note later supersession instead of deleting.
- If current code contradicts this plan, mark issue **RECHECK NEEDED** and cite source; do not quietly replace an unsatisfied objective with a convenient feature or trust earlier self-reported green runs blindly.
- Every improvement should reduce risk or user friction without creating an unchecked feature suite. No speculative refactor, duplicate docs, gratuitous dependencies or case-count targets.
- Keep **one current as-built description** in architecture/data contracts, **one actual QA guide**, **one enduring decision register**, and **this one operational implementation programme**. Earlier docs stay historical, indexed and searchable, not active execution checklists.
