# Data contracts, invariants and supported exam rules

**Read with:** [architecture](CURRENT_ARCHITECTURE.md), [policy decisions](../decisions/POLICY_REGISTER.md), and [source audit](../audits/V11_SOURCE_AUDIT_2026-10-30.md). This is the **current-source contract**; historical schema decisions remain in [Passes 4–16](../history/PASSES_04_16.md).

## Immutable content

- Exam identity; immutable paper/answer-key/question revision IDs; editorial statuses; data/media/stimulus IDs and hashes. Questions belong to exactly one paper section, answer-key entries refer to the precise frozen revision, and the content hashes prevent silent mutation.
- Six kinds: `single-choice`, `multiple-select`, `numeric-entry`, `true-false`, `matching`, `free-response`. Rich passages/cases, tables, chart/image assets are packaged as self-contained records. `source`, `reviewed`, `custom` are distinct editions.
- Validated `ExamPackage` is imported as JSON, not executable code. Source CGL JSON, review patches, and solutions have identical Git blob SHAs to baseline/v11. Corrections are not official exam answer keys.

## Session and assessment

- `SessionState` tracks elapsed, current section elapsed, foreground, responses, genuine visits (new records), completed sections, visibility and current clock origin. `SessionEvent` is the transition interface; immutable frozen attempt persists selected mode, question revision, score policy, resources and answers.
- Rules support untimed, whole-paper and sectional budgets; pause policy; free/forward-only question navigation; free/sequential section navigation; positive, negative and unanswered marks; overrides per section, kind and key item; partial credit and separate written/manual grades.
- **CGL editorial user decision:** source-invalid is excluded in source edition; unpatched invalid/caution converts to scoreable reviewed caution retaining publisher key. The dispute of 6 October 2026 Q62 is *visible after submission*. No independent correction is claimed.
- **No premature disclosure** of keys, worked explanations, edited answer comparison, editorial dispute notes or marked solution until complete.
- **Score limit:** a partially correct component-based result is capped by `correctMarks`; however imported `unansweredMarks` currently has no such ceiling guarantee — see audit G03. Do not claim the denominator is universally safe until repaired.

## Persistence

- Store types: `generic-attempt`, `generic-package`, `learning-card`. Stored attempts recalculate frozen item verdicts/totals on read; answer event continuity, ids, hashes, provenance and manual grades are validated.
- IndexedDB with per-record `saveRevision` compare-and-swap; fallback localStorage has cross-tab stamp conflicts; emergency mirror and explicitly labelled unsaved recovery export. Local storage is subject to browser eviction.
- **Backup v3:** `practice-desk-backup` records + saved appearance/optional exam selection + manifest `sha256`, count, export time; verify checksum and validate every record before additive merge. Existing same-ID records never overwritten; v11 v1 backups and history are not migrated by design.
- `LearningCard` saves exact question/key/media and manually confirmed error label, note, bookmark and FSRS review logs; mistake revision generates a new custom timed/untimed policy, never substitutes ratings for exam marks.
- Historical cases have absent visit counters when unknown. Treat foreground exposure, elapsed wall time, assessed written marks and score as different measurements. Trend comparisons require the same frozen revision, key and mode; do not infer national rank or percentile.

## Validation issues to resolve, not disguise

`validatePaperRevision` accepts combinations that are not navigable (`whole-paper+sequential-locked`), allows sectional `manual` expiration that the engine auto-advances, and `validateAnswerKeyRevision` does not ensure multiselect key cardinality/matching injectivity matches user-response constraints. See the source audit for exact code locations, severity and repair suggestions.
