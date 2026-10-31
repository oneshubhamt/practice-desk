# Practice Desk — offline examination studio

**Development branch:** `overhaul` · **frozen comparison:** `baseline/v11`.

Practice Desk is a single-file offline exam application with a typed six-kind generic engine, built-in original/reviewed SSC CGL papers, imported exams, frozen source/answer-key revisions, configurable scoring and timing, post-submit corrections, detailed history, validated backup v3, learning notebook, FSRS-7 and evidence-based practice.

## Documentation and source audit

**[Read the documentation index](docs/README.md)** for the current architecture, data contracts, engineering decisions, complete Passes 4–16 historical record, and an independent **source-to-source v11 versus overhaul audit**.

**Current verification (31 October 2026):** Passes **25–27** have repaired and source/browser-verified **L01–L06 and L11** of the 11 v11 desktop first-fold/semantic findings. In matched 1366×768 `file://` CGL screens, Library Start and exam Next/Flag/passage/figure answers fit the first viewport; Pass27's History first saved record y326 vs v11 y604 and Results section table y457 vs v11 y476. [Pass24–27 screenshot audit and open finding register](docs/audits/PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md) · [Pass27 CI 41159414829](https://github.com/oneshubhamt/practice-desk/actions/runs/41159414829) (Node24/Chromium, Firefox, WebKit **3/3 successful**). **L07–L10 remain OPEN for Pass28.** Overall laptop parity, independent final Pass29 review, actual physical Safari/Android/iOS, NVDA/VoiceOver, storage/OS-kill, human UI approval and distribution/merge are **not certified**. Pass23's original source/scoring/functional independent verification is [conditional](docs/audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md). No original question bank, `main` or frozen `baseline/v11` was modified.

Historical source and earlier separate Markdown records remain available in Git at [pre-consolidation `d4c36f928605`](https://github.com/oneshubhamt/practice-desk/tree/d4c36f9286059af970be342a7a894415517087aa/docs), and their full decisions/worklogs are consolidated in [Passes 4–16 history](docs/history/PASSES_04_16.md).

## Build and runtime

Requires Node.js 24.x; this is an offline **`file://`** app with no account, analytics or runtime server.

```bash
npm install --no-audit --no-fund
npm run check
node scripts/smoke-offline.mjs
node scripts/pass16-independent.mjs
node scripts/pass23-independent.mjs
```

Generated distribution: `Practice_Desk_Offline_Mock_Tests.html` (do **not** hand edit). Code: `src/content/` published original banks/patches; `src/domain/` schema and integrity; `src/engine/` timing and scoring; `src/history/` frozen records/backup; `src/learning/` FSRS and evidence; `src/app/` UI controller and history/results; `src/styles/` CSS and `src/template.html`.

## Release safety

**Conditional engineering acceptance only.** Headless browser coverage and a clean CI run are not real iOS/Android/VoiceOver/NVDA/device-storage sign-off. The [Pass 23 final report](docs/audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) lists explicit manual test and release authorization gates; the application remains on `overhaul`.

Write only to `overhaul`. Preserve `main` and `baseline/v11`. No migration of old v11 user records, and v3 backups merge additively without silent overwrites, by explicit policy. CGL 6 October Q62 retains the disputed published B in *reviewed caution* scoring while excluding the original invalid item, as specifically approved. Manual Safari/Android/iOS/assistive technology, OS-kill/eviction and human design signoff are outstanding. **No merge without user authorization.**
