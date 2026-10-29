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
