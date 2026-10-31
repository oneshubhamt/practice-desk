# Practice Desk — offline examination studio

**Development branch:** `overhaul` · **frozen comparison:** `baseline/v11`.

Practice Desk is a single-file offline exam application with a typed six-kind generic engine, built-in original/reviewed SSC CGL papers, imported exams, frozen source/answer-key revisions, configurable scoring and timing, post-submit corrections, detailed history, validated backup v3, learning notebook, FSRS-7 and evidence-based practice.

## Documentation and source audit

**[Read the documentation index](docs/README.md)** for the current architecture, data contracts, engineering decisions, complete Passes 4–16 historical record, and an independent **source-to-source v11 versus overhaul audit**.

**Current verification (31 October 2026):** Pass29 ran a **fresh independent 184-scene visual and user-journey acceptance matrix**, with **56 actual paired frozen-v11 CGL comparisons** at four laptop widths and modern-only tablet/phone/195px-zoom checks, strict/flexible/single-section, original/reviewed source, themes and 140% scale, figure/passage, Results/History and imported **six-kind generic → written self-grade → Learning → History**. [Full independent findings, scenario coverage and limitations](docs/audits/PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md) · [paired images/geometry manifest](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047/artifacts/13028401081) · [Node24 + Chromium + Firefox + WebKit CI](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047): **4/4 green**, verified offline HTML rebuilt. The matrix independently reconfirmed L01–L11 repairs and found/repaired **three additional** defects (reopening a saved result on stale Timing tab, 195px/140% History overflow, 195px/140% Learning overflow). The reviewed CGL 6 Oct Q62 caution and all original paper/key files remain unchanged. **Automated task-level parity does not constitute pixel-identical UI, human aesthetic signoff or physical-device/AT approval**; actual macOS Safari/iOS/Android, NVDA/VoiceOver, storage eviction/OS-kill, hostile/large imports and explicit release/merge approval remain outstanding. `overhaul` only; `main` and frozen `baseline/v11` unchanged.

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
