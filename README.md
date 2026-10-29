# Practice Desk — overhaul

Strictly typed, exam-agnostic offline practice desk. Built-in SSC CGL source/reviewed papers and validated imported exam packages use one exam library, session engine, history and analysis flow.

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
