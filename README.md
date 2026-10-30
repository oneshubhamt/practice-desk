# Practice Desk — offline examination studio (`overhaul`)

Single-file offline examination and learning application. Built-in SSC CGL original/reviewed editions and validated imported exam packages share one strict TypeScript engine, frozen results, local history, backup and revision workflows.

> **Current project status — 30 October 2026:** **Passes 11–16 are source-audited, implemented and browser-verified; material v11 feature parity is conditionally accepted at the automated level.** The product is generic and retains six exam question kinds. The user-selected v11 reviewed-CGL caution policy and imported generic partial-credit ceiling are enforced. Real physical devices, Apple Safari, NVDA/VoiceOver, destructive storage failure and human release/visual approval are still unchecked. Do not merge into `main` without authorization. See the [independent Pass 16 release audit](docs/PASS16_INDEPENDENT_AUDIT.md).

## Documentation — canonical reading order

| Read | Purpose |
|---|---|
| [Engineering rules](AGENTS.md) | Non-negotiable constraints and audit → analyze → implement → check objectives → targeted QA |
| **[v11 feature-parity programme](docs/V11_FEATURE_PARITY_PROGRAMME.md)** | **LIVE** de novo v11/overhaul audit, all identified gaps, objective IDs, Passes 11–16, acceptance and progress log |
| [Pass 16 independent source and conditional release audit](docs/PASS16_INDEPENDENT_AUDIT.md) | **CURRENT** five-paper/two-edition de novo verification, generic scoring repair, user-approved caution policy and remaining manual gates |\n| [Pass 15 paired visual and accessibility audit](docs/PASS15_VISUAL_AUDIT.md) | **CURRENT** direct frozen v11/overhaul screenshot evidence, zoom/keyboard/contrast and separate unchecked manual signoff matrix |\n| [Consolidated programme status](docs/PROJECT_STATUS.md) | **LIVE** index of history, current plan, evidence and unresolved platform gates |
| [Data model](docs/DATA_MODEL.md) | **CURRENT** exam, scoring, history, backup and learning invariants |
| [Original architecture audit](docs/ARCHITECTURE_AUDIT_2026-10-28.md) | **HISTORICAL** Passes 1–10 architectural reasoning; no longer the active parity scratchpad |
| [Former Pass 9 parity ledger](docs/V11_PARITY_LEDGER.md) | **SUPERSEDED** historical checklist; not proof of full v11 feature parity |

Historical, pass-specific acceptance/design reports remain linked through [PROJECT_STATUS.md](docs/PROJECT_STATUS.md); do **not** use their “complete” labels as current feature-parity signoff.

## Build and verify

Requirements: **Node.js 24.x**, strict TypeScript and reproducible local bundle.

```bash
npm install
npm run check
node scripts/smoke-offline.mjs
node scripts/pass10-platform.mjs chromium
```

Browser scripts require the configured Playwright-core browsers. Firefox and Linux WebKit coverage runs in CI; Linux WebKit is **not** physical Safari. Build creates `Practice_Desk_Offline_Mock_Tests.html`; double-click the generated HTML to run under `file://` without localhost, account or internet. **Never hand-edit the generated HTML.**

## Runtime map

- `src/app/bootstrap.ts` — one entry point; display tools
- `src/app/generic-ui.ts` — one library, exam and result workspace
- `src/app/history-page.ts` and `result-presentation.ts` — history/result presentation
- `src/app/learning-ui.ts` — notebook, FSRS and revision
- `src/app/exam-package.ts` and `src/content/import-cgl.ts` — frozen exam packages and CGL import
- `src/domain/`, `src/engine/`, `src/history/`, `src/learning/` — validated domain, timing/scoring, storage/backup, study evidence
- `src/content/*.json` — independent source papers, editorial corrections and worked solutions
- `src/styles/app.css`, `src/template.html`, `scripts/build.mjs` — single self-contained distribution

## Hard constraints and parity policy

Preserve `baseline/v11` and `main` untouched; implement only on `overhaul`. Keep one exam engine (no legacy runtime), strict TS, immutable paper/key/media snapshots, offline `file://`, checksum-verified backup v3 and user-driven FSRS. **No v11 data migration** is the explicitly accepted exception.

The **six-pass programme (11–16)** restore actual feature coverage first (exam UI, review, history, analytics, comparative visuals), then independently re-audit the full v11 codebase against the final implementation. See the authoritative [objective-by-objective matrix](docs/V11_FEATURE_PARITY_PROGRAMME.md); exam interaction, result/review and history/settings functional gaps have been verified; fine-grained analytics and final visual/device parity remain open.

## Generic exam review (Pass 12)

The app is not restricted to SSC CGL. All six question kinds, imported custom scoring and optional matching `source` / `reviewed` exam revisions use the same typed exam, frozen attempt and result pipeline. An original question, source answer and its images/passages are captured only for grounded paired revisions, then integrity-checked before historical review. Original CGL versions are a test dataset, not a hardcoded application dependency. Score maxima come from each frozen paper/key/section's rules; manual-only questions are separated from the automated denominator. See the [Pass 12 objective evidence](docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-12-closure--30-october-2026).

## Pass 13: generic history and backup

History supports exact revision/edition filtering, comparable adjusted marks, two-confirmation completed-only atomic deletion, storage health/quota/persistence and safe denial handling. Paper/edition/mode/section choices—including imported exam packages—persist locally and optionally travel in checksum-covered, additive **backup v3**. No legacy v11 migration or automatic replacement of existing attempts is performed. [Pass 13 source/QA checklist](docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-13-five-step-closure--30-october-2026).

## Pass 14: trustworthy timing and study review

New attempts measure actual question entries and returns, while older attempts explicitly show **Not recorded**. The shared five-sample section-median policy drives Fast/Typical/Slow labels in timing and review; audit notes and typical-speed mistakes are filterable. The five longest recorded cumulative foreground exposures link to their question reviews; evidence-based study prompts never claim a cause or predict future scores. These features work for original/reviewed CGL and imported six-question-kind exams. [Pass 14 source audit and browser evidence](docs/V11_FEATURE_PARITY_PROGRAMME.md#pass-14-five-step-closure--30-october-2026).

## Pass 15 visual and accessibility acceptance

Automated v11/overhaul screenshot comparison runs under `file://` at 390, 768 and 1280 pixels, including real reviewed CGL source correction, option image, passage, result, history, separate 85/100/140% text-size and light/dark states. The `scripts/pass15-visual.mjs` screenshot matrix also checks narrow 200%-zoom-equivalent layout, keyboard focus and targeted screen reader status, reduced motion, and computed AA contrast. Each CI run publishes `pass15-v11-overhaul-visual-evidence` as a PNG/JSON artifact. **These automated tests do not certify physical devices or NVDA/VoiceOver.** Full findings and required manual gates are listed in [PASS15_VISUAL_AUDIT.md](docs/PASS15_VISUAL_AUDIT.md); independent v11 source parity and release decision remain Pass 16.

## Pass 16 — final independent automated verification

The independent comparison against frozen v11 source covered all five CGL papers (500 questions) and **10 original/reviewed editions in a new offline browser acceptance**, as well as the real disputed 6 October 2026 Q62. Under the v11 policy selected by the user, the original source-invalid Q62 remains excluded, while the reviewed edition presents an editorial **caution**, scores against the retained published **B** (+2 for B; −0.5 for D) and explains the dispute after submission. Generic imported multi-select and matching partial-credit responses are capped at each question's full marks. The Learning Desk also announces route navigation and focuses the page heading. New tests run with the existing Passes 11–15 tests in CI. See [Pass 16 independent audit](docs/PASS16_INDEPENDENT_AUDIT.md). **Conditional automated readiness does not replace physical-device/AT testing or user authorization to merge.**
