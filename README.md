# Practice Desk — offline examination studio

**Development branch:** `overhaul` · **frozen comparison:** `baseline/v11`.

Practice Desk is a single-file offline exam application with a typed six-kind generic engine, built-in original/reviewed SSC CGL papers, imported exams, frozen source/answer-key revisions, configurable scoring and timing, post-submit corrections, detailed history, validated backup v3, learning notebook, FSRS-7 and evidence-based practice.

## Documentation and source audit

**[Read the documentation index](docs/README.md)** for the current architecture, data contracts, engineering decisions, complete Passes 4–16 historical record, and an independent **source-to-source v11 versus overhaul audit**.

**Current verification (31 October 2026):** Passes **25–28 repaired and targeted-browser/source-verified all 11 of the 11 documented laptop usability findings L01–L11**, against a frozen `baseline/v11` reference. Library/Exam/History/Results first-fold geometry is checked at 1280, 1366, 1440, 1536 widths; Pass28 also verifies unwrapped Display Light/Dark at 100–140% including 195px zoom, source-backed real key changes rather than generic correction labels, correct whole-paper/section progress information, and readable practice modes. 6 Oct CGL Q62 disputed-key scoring remains unchanged. [Desktop finding audit and measured record](docs/audits/PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md) · [Pass28 complete CI 41161903751](https://github.com/oneshubhamt/practice-desk/actions/runs/41161903751): **3/3 green** Node24/Chromium, Firefox, WebKit, with offline HTML generated and published after test completion. **Pass29 independent full v11-vs-overhaul visual/functional review remains OPEN**, as do physical macOS Safari/Android/iOS, NVDA/VoiceOver, storage eviction/OS-kill, human user acceptance and explicit release/merge approval. The prior [Pass23 independent functional/source review](docs/audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) remains conditional, not a blanket UI/device certificate. All work is confined to `overhaul`; `main`, frozen `baseline/v11` and original paper/key JSON were not changed.

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
