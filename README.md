# Practice Desk — offline generic examination studio

**Development branch:** `overhaul`. **Frozen feature-parity baseline:** `baseline/v11`. The current product is a self-contained HTML practice application that runs directly through `file://` with no login, server, analytics or runtime internet access.

## Documentation — read in this order

1. **[Canonical engineering record, Passes 4–16](docs/ENGINEERING_RECORD.md):** consolidated historical audit, implementation rationale, acceptance decisions, source-parity objective matrix and frozen data-model contracts. Older per-pass files were consolidated; their exact contents remain in Git history at [the pre-consolidation source tree](https://github.com/oneshubhamt/practice-desk/tree/d4c36f9286059af970be342a7a894415517087aa/docs).
2. **[Independent v11 source audit](docs/V11_INDEPENDENT_SOURCE_AUDIT.md)** — fresh comparison of `baseline/v11` and `overhaul`; separate from earlier fixtures/QA. Until its findings have been closed, do not infer complete feature parity from pass checkmarks.
3. [Contributor instructions](AGENTS.md) — mandatory safety, branches and source-first working loop.

## Product capabilities

A single typed six-kind exam runtime supports the published SSC CGL source/reviewed editions and imported generic papers; strict/free/single-section test modes; source-vs-edited question/key/media comparison after test completion; immutable score, timer and attempt data; reviewed answer explanations, optional self-graded writing; history, saved exam-selection preferences and additive checksum-verified backup v3; learning notebook, FSRS-7 self-rated cards, revision tests and bounded evidence-based analytics.

The frozen v11 is a **feature floor**, not an instruction to reintroduce its monolithic runtime or less-safe storage policies. Intentional exceptions include **no migration of old v11 history**, **safe additive backup instead of replacement**, and the user's reviewed-CGL `caution` policy for disputed published keys.

## Build and inspect

Requires Node.js 24.x.

```bash
npm install --no-audit --no-fund
npm run check
node scripts/smoke-offline.mjs
node scripts/pass16-independent.mjs
```

Build creates `Practice_Desk_Offline_Mock_Tests.html`. Never hand-edit the generated distribution. Primary source is `src/`: `app/` for UI and import, `domain/` for schema and integrity, `engine/` for sessions/scores, `history/` for persistence/backup, `learning/` for study evidence, `content/` for original immutable published data and separate patches/solutions, `styles/` and `template.html` for presentation.

## Release boundary

**Do not merge into `main` without explicit authorization.** Real Android/iOS and macOS Safari, NVDA/VoiceOver, physical data-loss/OS-kill, full keyboard-only manual usability and human visual preference are not certified by headless tests. Source parity must be determined by an independent code review, not existing QA fixture results.
