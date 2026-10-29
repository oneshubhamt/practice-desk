# Practice Desk data model — clean overhaul

One validated `ExamPackage` holds the paper revision, immutable answer-key revision, ordered question revisions, stimuli/media and post-submission explanations. All exams, including built-in CGL original/reviewed and user-imported papers, share the same typed engine and UI.

CGL strict mode is sectional with four 15-minute locked sections. Flexible mode uses a single 60-minute paper clock; single-section mode freezes 25 questions and a 15-minute clock. The configured practice policy receives its own paper revision, answer key and question set. Original sources, corrections and solutions remain separate embedded JSON banks.

`GenericAttempt` freezes the paper, key, responses and scoring when an attempt starts. Saved attempts use an optimistic `saveRevision` for atomic IndexedDB writes; later tabs cannot silently replace a newer revision. All attempt history and imported paper packages share one IndexedDB `attempts` store in `practiceDesk.overhaul.v1` (version 1). LocalStorage fallback and emergency mirror use separate `practiceDesk.overhaul.*` keys; fallback is best effort and conflict-aware.

Unified checksum-verified backup v2 contains versioned attempt/package records and an additive restore plan, never overwrites existing IDs. Cross-browser `file://` storage behavior varies. **No migration, old data import, v11 compatibility shim, or legacy database reader.** v11 remains in `baseline/v11`.

Analytics (per-section score, response review, timing) are derived from immutable inputs; no redundant specialized CGL analytics store or parallel library UI.
