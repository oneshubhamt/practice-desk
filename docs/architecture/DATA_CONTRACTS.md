# Data contracts, invariants and supported exam rules

**Read with:** [architecture](CURRENT_ARCHITECTURE.md), [policy decisions](../decisions/POLICY_REGISTER.md), and [source audit](../audits/V11_SOURCE_AUDIT_2026-10-30.md). This is the **current-source contract**; historical schema decisions remain in [Passes 4–16](../history/PASSES_04_16.md).

## Immutable content

- Exam identity; immutable paper/answer-key/question revision IDs; editorial statuses; data/media/stimulus IDs and hashes. Questions belong to exactly one paper section, answer-key entries refer to the precise frozen revision, and the content hashes prevent silent mutation.
- Six kinds: `single-choice`, `multiple-select`, `numeric-entry`, `true-false`, `matching`, `free-response`. Rich passages/cases, tables, chart/image assets are packaged as self-contained records. `source`, `reviewed`, `custom` are distinct editions.
- Validated `ExamPackage` is imported as JSON, not executable code. Source CGL JSON, review patches, and solutions have identical Git blob SHAs to baseline/v11. Corrections are not official exam answer keys.

## Session and assessment

- `SessionState` tracks elapsed, current section elapsed, foreground, responses, genuine visits (new records), completed sections, visibility and current clock origin. `SessionEvent` is the transition interface; immutable frozen attempt persists selected mode, question revision, score policy, resources and answers.
- Rules support untimed, whole-paper and sectional budgets; pause policy; free/forward-only question navigation; free/sequential section navigation; positive, negative and unanswered marks; overrides per section, kind and key item; partial credit and separate written/manual grades. **Pass 17 executable semantics:** untimed/whole-paper sequential-locked sections advance only by explicit `SUBMIT_SECTION`; whole-paper time stays continuous; sectional timing requires sequential-locked sections. Automatic sectional expiry advances immediately, whereas manual expiry enters a frozen `section-expired` state and requires `SUBMIT_SECTION` without accruing waiting time or allowing answer changes. Untimed sectional sections may be advanced explicitly even when early submission is otherwise forbidden. `allowReview=false` withholds the post-completion detailed question/key/solution review UI but **does not** prevent in-exam navigation or suppress numerical results and time analytics. It is a UI disclosure policy, not cryptographic protection of embedded offline content.
- **CGL editorial user decision:** source-invalid is excluded in source edition; unpatched invalid/caution converts to scoreable reviewed caution retaining publisher key. The dispute of 6 October 2026 Q62 is *visible after submission*. No independent correction is claimed.
- **No premature disclosure** of keys, worked explanations, edited answer comparison, editorial dispute notes or marked solution until complete.
- **Validated score envelope (Pass 17):** `incorrectMarks ≤ unansweredMarks ≤ correctMarks`, `correctMarks ≥ 0`, `incorrectMarks ≤ 0`, and bounded finite marking values (absolute magnitude ≤ 1,000,000). Component-based partial credit cannot exceed `correctMarks`. `scoreableMaximum` is the nominal full-credit ceiling; `scoreableLowerBound` is a **conservative bound, not necessarily an attainable floor**, accounting for potentially negative component penalties. Pending written responses stay outside the automated ceiling. These rules apply at package/frozen-record validation; historic unvalidated source should never be silently rescored or rewritten.

## Persistence

- Store types: `generic-attempt`, `generic-package`, `learning-card`. Stored attempts recalculate frozen item verdicts/totals on read; answer event continuity, ids, hashes, provenance and manual grades are validated.
- IndexedDB with per-record `saveRevision` compare-and-swap; fallback localStorage has cross-tab stamp conflicts; emergency mirror and explicitly labelled unsaved recovery export. Local storage is subject to browser eviction.
- **Backup v3:** `practice-desk-backup` records + saved appearance/optional exam selection + manifest `sha256`, count, export time; verify checksum and validate every record before additive merge. Existing same-ID records never overwritten; v11 v1 backups and history are not migrated by design.
- `LearningCard` saves exact question/key/media and manually confirmed error label, note, bookmark and FSRS review logs; mistake revision generates a new untimed custom paper, never substitutes ratings for exam marks.
- Historical cases have absent visit counters when unknown. Treat foreground exposure, elapsed wall time, assessed written marks and score as different measurements. Trend comparisons require the same frozen revision, key and mode; do not infer national rank or percentile.

## Validation and release-evidence boundary

The Pass 17 source changes address G01/G02/G03/G04/G05/G06/G09 through explicit engine transitions, UI controls, package/key cross-validation, and score-envelope reporting. **Implementation is not independent proof:** the audit scratchpad records targeted new QA and actual CI results for each finding. Original CGL source/review metadata, edition scoring, and frozen keys remain unchanged. Pass 18 will separately add truthful frozen *per-section wall-clock* evidence; Pass 23 will independently challenge the complete v11 practical capability/UX superset.
