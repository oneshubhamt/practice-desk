# Practice Desk data model — clean overhaul

One validated `ExamPackage` holds the paper revision, immutable answer-key revision, ordered question revisions, stimuli/media and post-submission explanations. All exams, including built-in CGL original/reviewed and user-imported papers, share the same typed engine and UI.

CGL strict mode is sectional with four 15-minute locked sections. Flexible mode uses a single 60-minute paper clock; single-section mode freezes 25 questions and a 15-minute clock. The configured practice policy receives its own paper revision, answer key and question set. Original sources, corrections and solutions remain separate embedded JSON banks.

`GenericAttempt` freezes the paper, key, relevant shared passages/images, responses and scoring when an attempt starts. Saved attempts use an optimistic `saveRevision` for atomic IndexedDB writes; later tabs cannot silently replace a newer revision. All attempt history and imported paper packages share one IndexedDB `attempts` store in `practiceDesk.overhaul.v1` (version 1). LocalStorage fallback and emergency mirror use separate `practiceDesk.overhaul.*` keys; fallback is best effort and conflict-aware.

Unified checksum-verified backup **v3** contains all typed attempt/package/learning-card records, frozen display media and validated theme/font preferences; import adds missing record IDs only, then applies display settings. Cross-browser `file://` storage behavior varies. **No migration, old data import, v11 compatibility shim, or legacy database reader.** v11 remains in `baseline/v11`.

Analytics (per-section score, response review, timing) are derived from immutable inputs; no redundant specialized CGL analytics store or parallel library UI.

## Pass 5 learning and scheduling

The single `practiceDesk.overhaul.v1` IndexedDB store additionally holds `learning-card` records keyed by immutable `learning-card:<question-revision-id>`. A learning card pins a validated question revision and correct-answer definition from a **completed** exam, source/exam/section identity, optional explanation, note, user-defined subtopic, bookmark and user-selected error classification. Cards are independent of attempt deletion, so notebook content remains available. Related embedded images are resolved from the validated paper package without re-storing large base64 assets.

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
