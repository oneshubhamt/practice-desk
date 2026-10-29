# Practice Desk — consolidated programme status and documentation index

> **Current status and document map (30 October 2026).** This consolidates the *meaning*, decisions, acceptance boundaries and links from earlier pass Markdown files. Historic reports remain accessible **as archival engineering evidence**, not as current feature-parity acceptance. For live Passes 11–16, use [V11_FEATURE_PARITY_PROGRAMME.md](V11_FEATURE_PARITY_PROGRAMME.md).

## Read this first: source-of-truth order

1. [`../AGENTS.md`](../AGENTS.md): non-negotiable constraints and five-step workflow.
2. [`V11_FEATURE_PARITY_PROGRAMME.md`](V11_FEATURE_PARITY_PROGRAMME.md): **current** audit, complete feature-gap matrix, Passes 11–16 implementation plan and live checklist. Overrides conflicting historical parity claims.
3. [`DATA_MODEL.md`](DATA_MODEL.md): **current** schema, persistence, integrity, score and learning invariants.
4. [`../README.md`](../README.md): build, running offline and high-level architecture.
5. [`ARCHITECTURE_AUDIT_2026-10-28.md`](ARCHITECTURE_AUDIT_2026-10-28.md): historic architectural design reasoning and Passes 1–10 sequence; **archive**, not the active progress tracker.
6. Pass-specific release/design ledgers below: dated historical checkpoints only.

**If a document contradicts another:** inspect current `overhaul` code and frozen `baseline/v11`; resolve and log the decision in the live parity programme. Historical checkmarks are never retroactively interpreted as proof of exact v11 feature coverage.

## Baselines, branches and operating contract

| Reference | Role |
|---|---|
| `baseline/v11`: `e661822d865927e89a837790c1c6bc1cfc2562a6` | Frozen original UI and functionality reference — do not modify |
| `main`: `075210795b29515dfe6ff253b74780e206ff4cf1` | Frozen stable branch — no unrequested merge |
| `overhaul` at the source audit: `5b9dce604faef10a714415341c7da5116bf6ff8a` | New typed runtime at start of Pass 11 programme |
| `Practice_Desk_Offline_Mock_Tests.html` | Build-generated, standalone `file://` artifact — never hand-edit |

**Five-step loop:** audit actual source → analyze risks, invariants and UI → implement → check objectives row by row → targeted QA and independently inspect changes. Verify exact final HEAD CI before stating a pass is complete. Node 24, strict TypeScript, no `any`/new `@ts-nocheck`, separate content banks, one runtime, no network dependency.

## Consolidated completed development history (Passes 1–10)

| Phase | Historical deliverable | Prior evidence / archival document | Current boundary |
|---|---|---|---|
| Pass 1 | Typed domain entities, question kinds, paper/key revision and data validation foundation | [Architecture audit](ARCHITECTURE_AUDIT_2026-10-28.md) Pass 1 addenda | Engineering history; not feature parity |
| Pass 2 | Typed exam engine, source integration, CGL mode configuration | [Architecture audit](ARCHITECTURE_AUDIT_2026-10-28.md) Pass 2 addenda | Functional source needs independent comparison |
| Pass 3 | Immutable attempt snapshots, storage, restore, backup integration | [Architecture audit](ARCHITECTURE_AUDIT_2026-10-28.md) Pass 3 addenda | Deliberate clean break from v11 stored records |
| Pass 4 | Single typed library/workspace, CGL/imported exam, offline artifact, storage and browser smoke | [Pass 4 acceptance](PASS4_RELEASE_ACCEPTANCE.md) · [CI #40855216283](https://github.com/oneshubhamt/practice-desk/actions/runs/40855216283) | Automated gate only; manual checks separate |
| Pass 5 | Learning notebook, FSRS-7, manual tags, targeted review and exact-revision evidence | [Pass 5 acceptance](PASS5_RELEASE_ACCEPTANCE.md) · [CI #40858120327](https://github.com/oneshubhamt/practice-desk/actions/runs/40858120327) | Scores do not automatically rate FSRS |
| Pass 6 | Content/media hashes, frozen historical media, score validation, backup v3, write-failure handling | [Pass 6 acceptance](PASS6_RELEASE_ACCEPTANCE.md) · [CI #40863482395](https://github.com/oneshubhamt/practice-desk/actions/runs/40863482395) | Browser storage remains best effort |
| Pass 7 | Strict section policies, scoring/rendering correctness, source-key comparison, manual grading | [Pass 7 acceptance](PASS7_RELEASE_ACCEPTANCE.md) · [CI #40899786917](https://github.com/oneshubhamt/practice-desk/actions/runs/40899786917) | No v11 complete-UI claim |
| Pass 8 | Generated revision tests, lineage, topic evidence, descriptive speed/mark analytics | [Pass 8 design](PASS8_DESIGN.md) · [Pass 8 acceptance](PASS8_RELEASE_ACCEPTANCE.md) · [CI #40904651689](https://github.com/oneshubhamt/practice-desk/actions/runs/40904651689) | No causal/predictive claims |
| Pass 9 | Redesign of library, history, result tabs and exam layout; keyboard/accessibility improvements | [Pass 9 acceptance](PASS9_RELEASE_ACCEPTANCE.md) · [former parity ledger](V11_PARITY_LEDGER.md) · [CI #40916049802](https://github.com/oneshubhamt/practice-desk/actions/runs/40916049802) | **Historic checkmarks NOT complete feature parity.** See current de novo audit and missing elements. |
| Pass 10 | Failed-IndexedDB-initial-read fallback repair, cross-browser `file://` checks, bounded 80-record history benchmark, workflow concurrency | [Pass 10 acceptance](PASS10_RELEASE_ACCEPTANCE.md) · [final source/docs CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096) | Automated portion green; no physical/device/AT/crash/visual approval |

**Status correction:** Older [Pass 9](PASS9_RELEASE_ACCEPTANCE.md) and [v11 ledger](V11_PARITY_LEDGER.md) statements regarding “parity” described their then-tested implementation goals. A **new direct-source comparison on 30 Oct 2026** found multiple genuine missing v11 features. Their successful tests are not disputed; their sufficiency for complete parity is.

**Pass 10 documentary correction:** The dated Pass 10 report initially said final docs-only HEAD CI was pending. That historical final HEAD `5b9dce6` subsequently passed [CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096) (Chromium checks, Firefox, Linux WebKit). Manual release gates remain open.

## Current forward plan

| Pass | Focus | Primary targets | Current status |
|---|---|---|---|
| 11 | Exam experience, keyboard, fullscreen, timer and navigation | E01–E09 DONE | DONE — [CI #40940761995](https://github.com/oneshubhamt/practice-desk/actions/runs/40940761995) |
| 12 | Question review, original-version diff, correct/incorrect styling, score max | R01–R03, R09–R12 | PLANNED |
| 13 | History operations, persistence and preferences | H01–H09 | PLANNED |
| 14 | Timing visits, review filters, recommendations, comparable marks trends | R04–R08, H07 | PLANNED |
| 15 | Visual side-by-side, mobile and accessibility | V01–V10 | PLANNED |
| 16 | **Independent new v11 source audit**, final targeted browser comparison and parity decision | All rows | PLANNED |

**Pass 11 is completed and independently browser-checked; Passes 12–16 remain open.** Progress is updated ONLY in the [feature-parity programme](V11_FEATURE_PARITY_PROGRAMME.md), not in archived pass-level reports. Historical architecture scratchpad may receive a small redirect marker but is no longer the live parity log.

## Decisions and exclusions retained

- **No legacy data migration** from v11 IndexedDB, fallback localStorage or backup v1. This is an explicitly accepted exception, not “fixed.”
- **Additive backup v3** remains the safety default; restoring v11 newer-record overwrite is an open design decision.
- **Frozen paper/key/media and canonical hashes** remain mandatory; no mutable answer-key retroactive grading.
- **Scoring on defective/reviewed questions must be investigated**, not blindly forced to match incorrect historical arithmetic.
- **Question foreground timing is an observation, not cognitive duration**; missing visit samples and unmeasured answers cannot be invented.
- **No inferred topic diagnoses, percentile predictions, unsupervised FSRS ratings or cross-paper equal-difficulty assumptions.**
- **Must preserve new features** from Passes 4–10 while restoring old interaction features.

## Manual / external release gates (all unresolved unless evidenced later)

- [ ] Physical Android/iOS including touch, orientation, offline save/export and import
- [ ] Real desktop Firefox and Safari reopen/storage behavior
- [ ] VoiceOver/NVDA, keyboard-only workflows and zoom/contrast
- [ ] Genuine forced OS/browser termination, device-level quota exhaustion/eviction and safe recovery
- [ ] Larger history/card scale on slower hardware
- [ ] Side-by-side v11 desktop/tablet/phone screenshot review and explicit user signoff
- [ ] Exact final verified branch HEAD and separate release decision

Retain earlier Markdown acceptance files unchanged as historic evidence **except explicit status/supersession annotations**. Do not delete or rewrite away proof of previous decisions and quality checks.
