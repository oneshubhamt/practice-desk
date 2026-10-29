# Practice Desk — overhaul

Strictly typed, exam-agnostic offline practice desk. Built-in SSC CGL source/reviewed papers and validated imported exam packages use one exam library, session engine, history and analysis flow.

## Architecture and execution map (read before each pass)

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Non-negotiable engineering and execution discipline |
| [README.md](README.md) | Entry point, build, repository/document map |
| [Architecture audit / live scratchpad](docs/ARCHITECTURE_AUDIT_2026-10-28.md) | **Authoritative current pass goals, evidence, decisions, QA and outstanding work**; historic entries superseded by later dated entries |
| [Data model](docs/DATA_MODEL.md) | Schemas, integrity, persistence and invariants |
| [v11 feature-parity ledger](docs/V11_PARITY_LEDGER.md) | Side-by-side UX/function inventory; mandatory regression targets for Pass 9 |
| [Pass 9 acceptance](docs/PASS9_RELEASE_ACCEPTANCE.md) | Completed automated UI and feature-parity objectives |
| [Pass 10 acceptance](docs/PASS10_RELEASE_ACCEPTANCE.md) | **Current release hardening, cross-browser and physical-device acceptance ledger** |
| [Pass 4 acceptance](docs/PASS4_RELEASE_ACCEPTANCE.md) | Clean typed app and offline engine baseline |
| [Pass 5 acceptance](docs/PASS5_RELEASE_ACCEPTANCE.md) | Learning/FSRS baseline |
| [Pass 6 acceptance](docs/PASS6_RELEASE_ACCEPTANCE.md) | Content integrity, frozen media and backup v3 baseline |
| [Pass 7 acceptance](docs/PASS7_RELEASE_ACCEPTANCE.md) | Completed exam/review correctness baseline |
| [Pass 8 acceptance](docs/PASS8_RELEASE_ACCEPTANCE.md) | Completed learning and analytics baseline |
| [Pass 8 design](docs/PASS8_DESIGN.md) | Revision-test/metrics data policies and explicit uncertainty |

**Required execution loop for every pass:** (1) **audit** existing sources and baseline plus relevant documents; (2) **analyze** exact invariants, data risks, user-facing regressions and design boundaries in architecture scratchpad; (3) **implement** on `overhaul` only; (4) **check objectives** one-by-one in the same scratchpad; (5) **targeted QA** of both new and existing scenarios, inspect CI and record evidence. No "complete" designation for unchecked objectives. Document new or deferred items precisely and do not hide regression behind a redesigned UI.

**Product sequencing:** Pass 7 exam/review correctness; Pass 8 learning and deeper analytics; Pass 9 **v11-grade feature/UI parity plus improvements** (not a minimal dashboard); Pass 10 scale, cross-browser/device acceptance and release hardening. Keep separate legacy code off `overhaul` while using `baseline/v11` as the behavior/visual reference.

## Build and test
Node.js 24.x, TypeScript 7.0.2, GitHub Actions checkout/setup-node v7.

```bash
npm install
npm run check
node scripts/smoke-offline.mjs
```

Double-click **Practice_Desk_Offline_Mock_Tests.html** to run offline without a server, internet, account or installation.

## Design
- `src/app/bootstrap.ts`: one app entry point and display settings
- `src/app/generic-ui.ts`: single typed library, exam and result UI for all exam types
- `src/app/exam-package.ts`: validated packages and CGL policy configuration
- `src/engine`, `src/domain`, `src/history`: typed session, scoring, persistence and backup invariants
- `src/content`: independent original paper bank, reviewed corrections and solutions
- `scripts/build.mjs`: one self-contained offline HTML, no runtime imports
- `docs/PASS4_RELEASE_ACCEPTANCE.md`: automated and manual release gates

**No v11 runtime, compatibility, historical-data migration, or duplicated CGL storage path.** The reference app remains at [baseline/v11](../../tree/baseline/v11); this branch is an intentionally fresh product. No earlier browser data is loaded. Browser-local persistence is best effort under `file://`; export backups periodically.

Development stays on `overhaul`. `main` and `baseline/v11` remain unchanged.

**Pass 4 (29 October 2026):** Code overhaul complete, [Chromium offline CI green](https://github.com/oneshubhamt/practice-desk/actions/runs/40855216283). Manual Firefox/Safari and device-level quota/accessibility release acceptance still pending.

## Pass 5 — Learning and targeted revision

- In a completed result, **Add to notebook** for one question or **Add mistakes & skips** for a revision set.
- Open **Learning & revision** from the library: user-confirmed error types, editable notes, manual subtopic labels, bookmarks and due-card review.
- **`ts-fsrs@6.0.0`**, the latest stable release as of 29 October 2026, runs **FSRS-7**. It is bundled locally; no server is needed. Cards are rated **Again / Hard / Good / Easy only after revealing the answer**. Original mock scores never silently rate spaced-repetition cards.
- Topic accuracy/coverage and sample sizes are drawn from completed frozen exam results, not guessed labels. Imported per-question `topicIds` and user-entered subtopics are supported; SSC CGL defaults to section-level topics unless specifically tagged.
- Compare attempts only on the **identical frozen paper revision** (edition, key, timing and question set). The learning view shows accuracy, marks and sample counts, without percentile/rank predictions.
- Notebook notes and review history are validated and included with exam attempts in the same checksum-verified backup and fresh IndexedDB store.

See [Pass 5 acceptance](docs/PASS5_RELEASE_ACCEPTANCE.md). The Android/iOS/Firefox/Safari physical-device release checks remain manual.

## Pass 6 — Integrity, durability and complete recovery

- Imported exams validate all stimuli, embedded media, references, sizes, SHA-256 image hashes and canonical question/key/paper revision hashes. Changing exam content requires a new hash.
- A completed saved attempt validates **every item-level verdict and mark**, not only aggregate marks. Historical attempts now carry the exact passage/figure resources needed for subsequent offline review; learning cards pin their own relevant media.
- The versioned **backup v3** exports saved attempts, imported packages, learning cards, frozen media and display preferences together. Import is additive; after committing records it restores theme and text size. Backups do **not** overwrite existing IDs.
- Notebook ratings, notes and imported packages report success only after the browser acknowledges a committed write. Failed IndexedDB/localStorage writes lock further edits, display a warning and allow an **UNSAVED_RECOVERY** export containing the in-memory changes. Exports wait for queued writes before capturing a snapshot.
- This is a fresh product with no prior production user data: the new frozen-record schema and backup version deliberately have **no legacy compatibility reader**. The established v11 reference still lives in `baseline/v11`.
- Browser storage, emergency mirror writes and quota limits are inherently best-effort; periodically export backups. Firefox/Safari and device/assistive-technology manual release acceptance still remain.

See [Pass 6 acceptance](docs/PASS6_RELEASE_ACCEPTANCE.md).

## Pass 7 — Exam and review correctness

- Enforce sectional submission locks, early-submit policy and forward-only/flag/pause decisions **in the engine**, not only in disabled buttons. Live timers use a monotonic source; offline intervals can only trust the device's wall clock.
- Frozen attempts capture the actual practice mode. Source and reviewed editions preserve source-page references; invalid, draft and unverified questions are never counted as automatically scoreable.
- Completed review renders the question's frozen figures, reading passages, tables, choices and provenance. A revised SSC CGL attempt may show a **separate original-source key comparison**, pinned at attempt start, without conflating it with reviewed marks.
- Answered free-response items remain `pending` in the automatic result; optional **self-assessment** is a separately persisted, validated annotation and cannot rewrite the original score.
- All work follows the documented [audit → analyze → implement → check objectives → targeted QA](docs/ARCHITECTURE_AUDIT_2026-10-28.md) loop. The visual/interaction experience is **not yet equivalent to v11**; [v11 parity targets](docs/V11_PARITY_LEDGER.md) are mandatory in Pass 9.

See [Pass 7 acceptance](docs/PASS7_RELEASE_ACCEPTANCE.md). Pass 8 handles deeper analytics/revision, Pass 9 v11-grade UI/function parity, Pass 10 platform and scale release acceptance.

## Pass 8 — executable revision tests and advanced analytics

- **Start revision test** in Learning & revision: uses the current notebook filter (all, bookmarked, due), scoped to one exam, up to 25 eligible cards. It creates a real **untimed** practice exam with 1 correct / 0 incorrect / 0 skipped marking, not a source/examination score. Frozen keys/images remain answer-hidden until submission.
- Revision attempts carry a validated source trail to the originating notebook cards and completed source attempts, and persist in the same IndexedDB history and backup v3 as all other exams. Generated exams **never** automatically rate FSRS cards.
- Topic evidence now separates section/source/user labels and counts measured answers, distinct answered questions and independent answering attempts. The learning desk shows descriptive consistency bands only after adequate evidence. No artificial mastery, percentile or examination-readiness forecast is asserted.
- Completed results contain section-relative speed–accuracy, foreground timing, actual negative marks, and mathematically derived **hypothetical** wrong/skipped mark opportunities. Exact-revision trends remain separate from comparisons across different paper revisions. Unmeasured or undersampled timing is labelled as such.
- Cached FSRS-7 schedules avoid repeated full review-log replay when a card hasn't changed. The richer v11-quality visual treatment remains a **required Pass 9 gate**, not waived by these functional additions.

See [Pass 8 acceptance](docs/PASS8_RELEASE_ACCEPTANCE.md), [Pass 8 design](docs/PASS8_DESIGN.md), the [architecture scratchpad](docs/ARCHITECTURE_AUDIT_2026-10-28.md) and [v11 parity ledger](docs/V11_PARITY_LEDGER.md).

## Pass 9 — redesigned v11-grade exam studio

- The minimal one-screen selector has been replaced by a richer **home** with correct mode-specific paper preview, test statistics, recent attempts, dedicated resume and clear learning/backup actions.
- **History & insights** is its own searchable, sortable route with progress summaries, source-backed section priorities and defensible same-revision trends. It does not plot absent answers as fabricated 0% accuracy.
- Completed **results** have keyboard-operable Insights / Question review / Time ledger tabs, exact reviewed/source score explanation, detailed frozen-media review filters, direct links from speed/mark opportunities and real recorded answer-replacement insights when those events exist.
- Active **exams** use a stronger timer/progress header, section status, labelled question palette, native focus and Alt+arrow keyboard navigation, without weakening locked-section/forward-only engine policies.
- The header now uses a compact **Aa display popover** with saved theme, text scaling and optional fullscreen. Learning & revision has clearer FSRS/due/bookmark cards and self-reported error patterns.
- All changes remain modular strict TypeScript and a single self-contained `file://` HTML, with no v11 runtime copied in or storage migration. **Functional/browser parity is not a claim of pixel-identical or personally approved design.** See [Pass 9 objective acceptance](docs/PASS9_RELEASE_ACCEPTANCE.md), [v11 parity ledger](docs/V11_PARITY_LEDGER.md) and [architecture scratchpad](docs/ARCHITECTURE_AUDIT_2026-10-28.md).

**Pass 10:** release engineering, performance/long-history stress, real-device and multi-browser behavior, accessibility, forced-exit recovery and direct screenshot-based visual signoff against v11. See [the active Pass 10 acceptance ledger](docs/PASS10_RELEASE_ACCEPTANCE.md). Linux WebKit automation is not physical Safari/iOS approval.
