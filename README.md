# Practice Desk

Offline mock-test app, currently with five SSC CGL memory-based papers (500 source questions; original and reviewed editions).

## Development

Requires Node.js 22+ and TypeScript **7.0.2** (pinned).

```bash
npm install
npm run build
npm test
npm run typecheck
```

Open **`Practice_Desk_Offline_Mock_Tests.html`** in your browser. No server, account, or network connection is required for the released file.

## Repository structure

- `src/template.html` — page structure
- `src/styles/app.css` — styling
- `src/app/legacy.ts` — preserved v11 runtime (transitional TypeScript source)
- `src/content/*.json` — source papers, review patches, and post-test explanations
- `src/content/schema.ts` — initial typed content contracts
- `scripts/` — tiny dependency-free build and content validation
- `tests/` — lean content-integrity and artifact checks using Node's built-in test runner
- `docs/ARCHITECTURE_AUDIT_2026-10-28.md` — architecture audit / roadmap
- `Practice_Desk_Offline_Mock_Tests.html` — generated, distributable single-file app

The legacy runtime has `@ts-nocheck` to preserve its existing behaviour **during initial repository setup**. The upcoming architecture work will replace it with properly typed modules for exam configuration, state, scoring, persistence and UI. This setup is not a claim that the legacy runtime has already been refactored.

Local attempt history is stored by the browser, **not** in the HTML or Git repository. No data migration is required at this stage.
