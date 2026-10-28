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
- `src/app/legacy.ts` — preserved v11 runtime (transitional TypeScript source)
- `src/content/*.json` — source papers, review patches, and post-test explanations
- `src/content/schema.ts` — typed contracts for the preserved source/patch/solution JSON
- `src/content/validate.ts` — strict, dependency-free runtime validation
- `src/domain/` — generic exam, question, answer-key, scoring and attempt contracts
- `scripts/` — tiny dependency-free build and content validation
- `tests/` — lean content-integrity and artifact checks using Node's built-in test runner
- `docs/ARCHITECTURE_AUDIT_2026-10-28.md` — architecture audit / roadmap
- `Practice_Desk_Offline_Mock_Tests.html` — generated, distributable single-file app

The legacy runtime has `@ts-nocheck` to preserve its existing behaviour **during initial repository setup**. The upcoming architecture work will replace it with properly typed modules for exam configuration, state, scoring, persistence and UI. This setup is not a claim that the legacy runtime has already been refactored.

Local attempt history is stored by the browser, **not** inside the HTML or Git repository. Browser storage behaviour can vary for `file://` files, so export important attempts. The app is new and there is **no migration or backward-compatibility obligation** at this stage.

Run `npm run check` before committing; CI enforces type checking, the lean test suite and reproducible single-file output. The long-term goal is a fully typed, exam-agnostic implementation following the **CLEAR** development rules in `AGENTS.md`.
