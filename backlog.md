# Practice Desk — active backlog

Use [the engineering programme](docs/ENGINEERING_PROGRAMME.md) for current authorization and evidence. This file tracks **unimplemented or deferred matters**, not historical pass diaries. Confirm each against current source before implementing.

## Deferred P60 source-audit findings (no fixes authorized during P61 test-bench consolidation)
| ID | Risk / question to reconcile later | Source ownership |
|---|---|---|
| P60-01 | Explanation-only assets may become visible in pre-submit question resources | `src/authoring/authoring-publisher.ts`, `src/app/exam-view.ts` |
| P60-02 | Permitted partial blueprint delivery may be described as final publication readiness | `scripts/content-blueprint.mjs`, `scripts/question-bank-cli.mjs` |
| P60-03 | Reviewed editions may select an incorrect original revision when several exist | `src/app/library-controller.ts`, `src/app/exam-families.ts` |
| P60-04 | A mixed-kind paper may lose every original-key comparison due to one unsupported item | `src/engine/source-comparison.ts` |
| P60-05 | Explanation/taxonomy metadata may cause false semantic incomparability | `src/engine/source-comparison.ts` |
| P60-06 | Older AI guidance contradicted deployed P60 stages | Documentation cross-reference corrected in this cleanup; verify contract/source on future P60 audit |
| P60-07 | Heuristic temporal/quality classification and self-asserted citations cannot prove factual truth | `scripts/question-quality.mjs`; requires external primary-source review |

These are prior static-source audit findings, **not** claims of reproduced live failures or fixes. Do not silently close them after documentation edits. Actual-source, independent question/content assessment and device/release approval remain separate.

## Deferred product proposals — no current implementation authorization
- **Calendar-based learning planning:** fuller schedule and due-work calendar beyond existing FSRS due dates.
- **Survey-based responses:** a separate unscored feedback/form engine, distinct from six-kind exam authoring. Scope first.
- Syllabus-based, source-verified question generation: current blueprint structure exists; genuine classification and factual correctness need content review.

## Test/script re-engineering — active, regression-gated
Use [test strategy](docs/TEST_STRATEGY.md) and [implementation ledger](docs/TEST_SUITE_LEDGER.md). P61-A Node tests and P61-B native/fallback browser journeys are being migrated with exact old→new assertion witnesses. Other test/script retirement, benchmark/CI pruning and production source changes remain out of scope until separately audited.

## Release constraints
Real Mac Safari/mobile, screen-reader/IME use, OS loss/eviction, real PDF/PYQ authentication, independently checked banks and human UI approval are not established by green synthetic CI. The old chronological decisions and programme records are retrievable through [the history index](docs/HISTORY_INDEX.md).
