# Practice Desk — offline examination studio

**Development branch:** `overhaul` · **frozen comparison:** `baseline/v11`.

Practice Desk is a single-file offline exam application with a typed six-kind generic engine, built-in original/reviewed SSC CGL papers, imported exams, frozen source/answer-key revisions, configurable scoring and timing, post-submit corrections, detailed history, validated backup v3, learning notebook, FSRS-7 and evidence-based practice.

## Documentation and source audit

**[Read the documentation index](docs/README.md)** for the current architecture, data contracts, engineering decisions, complete Passes 4–16 historical record, and an independent **source-to-source v11 versus overhaul audit**.

**Current finding:** The October 30 independent source audit identifies **material behavior and user-interface regressions** and **unsupported imported exam-rule combinations**. Overhaul is architecturally and functionally broader, but **full v11-superset feature parity has not yet been established**. The current corrective worklist is [the independent audit](docs/audits/V11_SOURCE_AUDIT_2026-10-30.md). Do not treat passing Pass 16 automated fixtures as a release-parity signoff.

Historical source and earlier separate Markdown records remain available in Git at [pre-consolidation `d4c36f928605`](https://github.com/oneshubhamt/practice-desk/tree/d4c36f9286059af970be342a7a894415517087aa/docs), and their full decisions/worklogs are consolidated in [Passes 4–16 history](docs/history/PASSES_04_16.md).

## Build and runtime

Requires Node.js 24.x; this is an offline **`file://`** app with no account, analytics or runtime server.

```bash
npm install --no-audit --no-fund
npm run check
node scripts/smoke-offline.mjs
node scripts/pass16-independent.mjs
```

Generated distribution: `Practice_Desk_Offline_Mock_Tests.html` (do **not** hand edit). Code: `src/content/` published original banks/patches; `src/domain/` schema and integrity; `src/engine/` timing and scoring; `src/history/` frozen records/backup; `src/learning/` FSRS and evidence; `src/app/` UI controller and history/results; `src/styles/` CSS and `src/template.html`.

## Release safety

Write only to `overhaul`. Preserve `main` and `baseline/v11`. No migration of old v11 user records, and v3 backups merge additively without silent overwrites, by explicit policy. CGL 6 October Q62 retains the disputed published B in *reviewed caution* scoring while excluding the original invalid item, as specifically approved. Manual Safari/Android/iOS/assistive technology, OS-kill/eviction and human design signoff are outstanding. **No merge without user authorization.**
