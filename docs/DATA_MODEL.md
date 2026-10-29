# Practice Desk data model — clean overhaul

One validated `ExamPackage` holds the paper revision, immutable answer-key revision, ordered question revisions, stimuli/media and post-submission explanations. All exams, including built-in CGL original/reviewed and user-imported papers, share the same typed engine and UI.

CGL strict mode is sectional with four 15-minute locked sections. Flexible mode uses a single 60-minute paper clock; single-section mode freezes 25 questions and a 15-minute clock. The configured practice policy receives its own paper revision, answer key and question set. Original sources, corrections and solutions remain separate embedded JSON banks.

`GenericAttempt` freezes the paper, key, responses and scoring when an attempt starts. Saved attempts use an optimistic `saveRevision` for atomic IndexedDB writes; later tabs cannot silently replace a newer revision. All attempt history and imported paper packages share one IndexedDB `attempts` store in `practiceDesk.overhaul.v1` (version 1). LocalStorage fallback and emergency mirror use separate `practiceDesk.overhaul.*` keys; fallback is best effort and conflict-aware.

Unified checksum-verified backup v2 contains versioned attempt/package records and an additive restore plan, never overwrites existing IDs. Cross-browser `file://` storage behavior varies. **No migration, old data import, v11 compatibility shim, or legacy database reader.** v11 remains in `baseline/v11`.

Analytics (per-section score, response review, timing) are derived from immutable inputs; no redundant specialized CGL analytics store or parallel library UI.

## Pass 5 learning and scheduling

The single `practiceDesk.overhaul.v1` IndexedDB store additionally holds `learning-card` records keyed by immutable `learning-card:<question-revision-id>`. A learning card pins a validated question revision and correct-answer definition from a **completed** exam, source/exam/section identity, optional explanation, note, user-defined subtopic, bookmark and user-selected error classification. Cards are independent of attempt deletion, so notebook content remains available. Related embedded images are resolved from the validated paper package without re-storing large base64 assets.

Cards store **append-only explicit user rating events**, with ISO timestamps and monotonic ordering. They do not persist derived FSRS dates: `ts-fsrs@6.0.0` `DefaultScheduler({version:"FSRS-7",desiredRetention:0.9,enableFuzz:false})` replays the ordered events to calculate due dates. Version and settings are pinned to prevent unexpected changes to reviews; reconsider/replay rules before future algorithm or default-parameter upgrades. Mock-test answers are never interpreted as FSRS reviews.

On input and backup import, the question and answer-key shape are validated, revisions checked, review grades limited to 1–4, history timestamps checked and notes bounded. The same optimistic versioned IndexedDB writes protect learning-card edits across tabs. The checksum-verified v2 backup includes all accepted `learning-card` records with attempts and imported exam packages, with additive ID-aware restores.

Topic analytics aggregate correctness/coverage only from **completed, frozen, scoreable** attempts, grouped by exam and provided topic IDs; the default fallback is the section title. User-submitted custom subtopics are added as separate labels rather than inferred heuristically. Fewer than five answered items is explicitly insufficient evidence. Longitudinal comparisons group by the **exact frozen paper revision ID**, avoiding false comparisons across exams, editions or rules. These are descriptive observations, not validated estimates of percentile, rank or examination readiness.
