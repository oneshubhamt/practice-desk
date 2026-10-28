# Practice Desk — development notes

- This is a **new app**; no migration or backward-compatibility requirements.
- Preserve working test behaviour unless a change is explicitly requested.
- Keep the HTML template, CSS, TypeScript and question data separate; build one self-contained offline HTML.
- `Practice_Desk_Offline_Mock_Tests.html` is generated: do not edit it manually.
- Do not reveal hints, solutions or keys while a test is in progress.
- Preserve original source questions; record editorial repairs separately.
- Before committing, run `npm run check`. Tests should remain lean, deterministic and contract-oriented.
- The audit in `docs/ARCHITECTURE_AUDIT_2026-10-28.md` is a roadmap, not a completed refactor.
