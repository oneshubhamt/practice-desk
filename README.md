# Practice Desk

Offline mock-test app, currently with five SSC CGL memory-based papers (500 source questions; original and reviewed editions).

## Development

Development requires **Node.js 24.x LTS** (CI automatically selects its latest 24.x patch) and **TypeScript 7.0.2** (exactly pinned). GitHub Actions uses checkout/setup-node **v7**.

```bash
npm install
npm run build
npm test
npm run typecheck
```

**Using the app:** Double-click **`Practice_Desk_Offline_Mock_Tests.html`**. It must run directly at `file://` with **no localhost, web server, installation, account, or internet**. Node.js is only needed to *develop/build* the app, not to take a test.

**Stable baseline:** The initial working v11 app is preserved at [`baseline/v11`](../../tree/baseline/v11). Do not replace it during future architectural work.

## Repository structure

- `src/template.html` — page structure
- `src/styles/app.css` — styling
- `src/app/legacy.ts` — preserved CGL-specific screens, advanced analytics and compatibility shell (still transitional)
- `src/app/browser-engine.ts` — typed adapter between existing CGL records and the generic engine
- `src/app/exam-package.ts`, `src/app/generic-ui.ts` — validated offline exam imports and model-driven exam workspace
- `src/engine/`, `src/history/` — tested session/scoring, frozen history, backups and write version guards
- `src/content/*.json` — source papers, review patches, and post-test explanations
- `src/content/schema.ts` — typed contracts for the preserved source/patch/solution JSON
- `src/content/validate.ts` — strict, dependency-free runtime validation
- `src/domain/` — generic exam, question, answer-key, scoring, attempt contracts and cross-entity validators
- `docs/DATA_MODEL.md` — identity, revision, immutability, normalization and data-topology decisions
- `scripts/` — tiny dependency-free build and content validation
- `tests/` — content, invariants, engine, archive, six-kind exam and concurrency tests
- `scripts/smoke-offline.mjs` — real Chrome `file://` acceptance: persistence/reopen, all question kinds, unified backup restore, tab conflicts and responsive screens
- `docs/ARCHITECTURE_AUDIT_2026-10-28.md` — architecture audit / roadmap
- `docs/PASS4_RELEASE_ACCEPTANCE.md` — verified CI scope and remaining cross-browser release gates
- `Practice_Desk_Offline_Mock_Tests.html` — generated, distributable single-file app

**Overhaul status (29 October 2026):** Passes 1–3 are CI-verified. Pass 4 now uses **one model-driven exam-question renderer** across the original CGL modes and custom exams. CGL's specialized library, historical analysis and review remain separate to avoid loss of functionality. The transitional CGL shell in `legacy.ts` still uses `@ts-nocheck`, and browser/file-origin acceptance on Firefox and Safari remains unverified. Do not claim the entire frontend has been rewritten in strict TypeScript or that final cross-browser release acceptance is complete. `main` and `baseline/v11` remain unchanged.

Local attempt history is stored by the browser, **not** inside the HTML or Git repository. Browser storage behaviour can vary for `file://` files, so export important attempts. The app is new and there is **no migration or backward-compatibility obligation** at this stage.

Run `npm run check` before committing; CI enforces type checking, the lean test suite and reproducible single-file output. The long-term goal is a fully typed, exam-agnostic implementation following the **CLEAR** development rules in `AGENTS.md`.
