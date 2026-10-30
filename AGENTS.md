# Practice Desk — engineering rules

## Before editing `overhaul`

Read, in order: [README](README.md) → **[live v11 feature-parity programme](docs/V11_FEATURE_PARITY_PROGRAMME.md)** → [current consolidated status](docs/PROJECT_STATUS.md) → [data model](docs/DATA_MODEL.md). For Pass 15/16 visual checks also read [paired v11/overhaul screenshots and manual signoff](docs/PASS15_VISUAL_AUDIT.md). After Pass 16, use [independent final source audit and conditional release decision](docs/PASS16_INDEPENDENT_AUDIT.md); do not resurrect pre-approval CGL exclusion or uncapped generic partial scoring. Use [original architecture audit](docs/ARCHITECTURE_AUDIT_2026-10-28.md), [historical Passes 4–10 reports](docs/PROJECT_STATUS.md#consolidated-completed-development-history-passes-110) and [superseded v11 ledger](docs/V11_PARITY_LEDGER.md) only for context. **Do not treat historical acceptance checkmarks or passing test fixtures as proof of parity.**

For each Pass 11–16, follow **audit → analyze → implement → check objectives → targeted QA**. Before writing code, trace the exact v11 DOM, controls, handlers, engine behavior, information and CSS against the actual overhaul implementation. Record the audit and plan in the live parity programme. Afterwards reconcile *every relevant matrix ID* with code-level + rendered behavior evidence; do not simply repeat existing tests. Update the live programme status and unresolved items; verify CI at the exact final HEAD. At Pass 16 perform a wholly independent, new source parity comparison.

## Non-negotiable implementation constraints

- **CLEAR:** Clean, Lean, Efficient, Elegant, Reliable.
- Work on `overhaul` only; keep `main` and frozen `baseline/v11` unchanged. No unrequested merges.
- One **self-contained offline HTML** opening by double-click under `file://`. No runtime network, server, external assets or module imports. Build from sources; never hand-edit `Practice_Desk_Offline_Mock_Tests.html`.
- Modular **strict TypeScript** with accurate types and state invariants. No new `any`, `@ts-ignore` or `@ts-nocheck`; do not reinstate the v11 `legacy.ts` runtime.
- One validated model-driven exam/learning/history path with immutable paper/question/key/media snapshots, integrity hashes, safe optimistic save revisions, checksum-verified backup v3 and correct scoring. No silent changes to editorial keys, test timers, backup overwrite safety or FSRS schedules.
- Preserve published source text/figures, independently reviewed corrections and post-test solutions as separate resources; never expose keys, detailed fixes or explanations before submission.
- Keep the deliberately accepted **no v11 historical-data migration** decision unless the user explicitly changes it.
- Keep QA focused but complete: source review, direct user-visible behavior, real representative paper content, relevant failure modes, accessibility and regression to new features; existing tests are a floor, not evidence of missing features.
- Manual Safari/iOS/Android, physical data loss, screen-reader testing and visual preference must not be asserted complete without actual evidence. Clearly state any unavailable gates.
