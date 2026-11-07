# Test/script consolidation — implementation evidence ledger

## Baseline and branch
- Authorization: user requests smaller, stronger test/script bench, beginning now; **P61-A** is a narrow first migration, not overall completion.
- Source branch: `Satyam`, source baseline [`807d01060fc6c2350873f19f4442ffbae73f4f2c`](https://github.com/oneshubhamt/practice-desk/tree/807d01060fc6c2350873f19f4442ffbae73f4f2c); earlier [full CI success](https://github.com/oneshubhamt/practice-desk/actions/runs/42326635746) confirms the documentation-only baseline, not this new change.
- Pre-change: **44 root Node `*.test.mjs` suites + one fixture**, **34 browser acceptance scripts**, 52 `scripts/` files. Existing production CLI tools are out of test-retirement scope.
- CI is still the unchanged exact-source gate: TypeScript + build + Node tests, Chromium journeys, Firefox/WebKit offline journeys and guarded HTML publishing.

## P61-A — authoring domain suite, exact assertion preservation
Mechanically combined the following five root test modules into [`tests/authoring-domain.test.mjs`](../tests/authoring-domain.test.mjs). Each old body is preserved within an independent lexical block, with static ESM imports hoisted and deduplicated; old `import.meta.url` paths still resolve relative to `tests/`. The original modules are removed from HEAD but retained at the pinned baseline commit.

| Original module | Preserved cases | Original blob SHA |
|---|---:|---|
| [`tests/p47-rich-document.test.mjs`](https://github.com/oneshubhamt/practice-desk/blob/807d01060fc6c2350873f19f4442ffbae73f4f2c/tests/p47-rich-document.test.mjs) | 6 | `6eb45817f1a6075e3e1c28080fd4f52f30103974` |
| [`tests/p47-authoring.test.mjs`](https://github.com/oneshubhamt/practice-desk/blob/807d01060fc6c2350873f19f4442ffbae73f4f2c/tests/p47-authoring.test.mjs) | 5 | `bb7d1b8042b74afa4f4bff19b0fdecb048311298` |
| [`tests/p47-publication.test.mjs`](https://github.com/oneshubhamt/practice-desk/blob/807d01060fc6c2350873f19f4442ffbae73f4f2c/tests/p47-publication.test.mjs) | 9 | `785fa9c52dabad40e806cb9afd1f6375225ee7b8` |
| [`tests/p54-authoring-integrity.test.mjs`](https://github.com/oneshubhamt/practice-desk/blob/807d01060fc6c2350873f19f4442ffbae73f4f2c/tests/p54-authoring-integrity.test.mjs) | 5 | `42ff0f713fd36624d2c26e10d66269ddee12501c` |
| [`tests/p58a-authoring-integrity.test.mjs`](https://github.com/oneshubhamt/practice-desk/blob/807d01060fc6c2350873f19f4442ffbae73f4f2c/tests/p58a-authoring-integrity.test.mjs) | 2 | `8b1dbf14f6bdb5382c4988250274f3c5fd83844a` |
| **Total preserved** | **27** | |

Added **one new seeded 128-input metamorphic property test** asserting that literal content—including HTML-like, Unicode and math-like text—survives `plainRichDocument → validateRichDocument` without reinterpretation and validates idempotently. This tests a property, not a second copy of the implementation's expected object.

**Actual structure after P61-A:** 41 total `tests/` entries (40 Node `*.test.mjs` + one fixture); 34 acceptance scripts unchanged in P61-A. Core TypeScript/build/Node CI passed on commit [`c6dd448`](https://github.com/oneshubhamt/practice-desk/commit/c6dd44817a838ea2f75ec9d9c2c9b77df5f6552d). Existing 27 test names and body assertions retained. CI confirmation must be recorded **only after** the exact changed SHA run succeeds.

## Whole-suite coverage inventory and migration priorities
| Contract area | Existing representative Node files | Browser witnesses | Priority |
|---|---|---|---|
| Scoring, marking policy and terminal session model | `exam-scoring-and-policy`, `session-and-timing`, `exam-package-and-import` | `acceptance-critical`, `acceptance-bank-modes`, `acceptance-session-policy` | P0: independently derived score, bounds, pause/expiry |
| Frozen source, corrected key, no candidate leakage | `content-and-provenance`, `p48-security-integrity`, `p60c-question-quality`, `p60d-editorial-editions` | `acceptance-editorial-provenance`, `acceptance-p58b-editorial` | P0: source edition/key/answer secrecy |
| CAS, recovery, backup/History | `history-and-persistence`, `p48-recovery-integrity`, `p48-independent-record-invariants` | `acceptance-recovery`, `acceptance-resilience`, `acceptance-p56-integration` | P0: adversarial state and transactional invariants |
| Authoring, rich media, source QA, PDF, pipeline | **`authoring-domain`**, `p57a/b/c`, `p58b/c`, `p59`, `p60a/b/c/d/e/f`, media tests | `acceptance-authoring-*`, `acceptance-p57a-bank`, `acceptance-p54-authoring` | P0/P1: publication/invalid inputs/source trust |
| Learning/revision and timing evidence | `learning-and-analytics`, `revision-evidence`, `question-timing-phases` | `acceptance-learning-lifecycle`, `acceptance-p55-learning` | P1: no invented timing/mastery, source-frozen cards |
| UI/keyboard/navigation/media | `ui-and-navigation`, `p47-shortcuts`, `p47-image-viewer`, `flag-palette` | `acceptance-platform`, `acceptance-safari-fallback`, `acceptance-ui`, `acceptance-image-viewer` | P1: focus, overflow and physical vs simulated support |

## Browser/script audit: do not delete blindly
- CI currently references 33 of 34 acceptance files. `scripts/acceptance-p47-5a-vendors.mjs` is *not* called by the current workflow. It is a historical standalone vendor feasibility probe requiring a separately generated fixture, with Wordgard type/undo/teardown and KaTeX MathML assertions. Before retirement, map these **specific** assertions to current `acceptance-authoring-visual`, `acceptance-authoring-publication` and `acceptance-p47-math` and verify an equivalent actual-browser witness.
- CI runs several overlapping authoring/editorial/History journeys and unconditional screenshot uploads. **No browser acceptance script or CI job is retired in P61-A.**
- Keep production `scripts/agent-handoff.mjs`, `question-quality.mjs`, `editorial-editions.mjs`, `pdf-ingest.mjs`, `question-bank-cli.mjs`, `build.mjs` and other actual tools separate from test harnesses/benchmarks; these are application capabilities, not gratuitous QA scripts.

## Later passes (not yet implemented)
1. **P61-B:** derive per-case Node assertion map, consolidate another cohesive domain (storage/record or learning), and add independent stateful/reference model before retiring originals. Keep complete/blank/error paths.
2. **P61-C:** map browser assertions and consolidate genuine full journeys (source → publish → exam → result → History/FSRS), with captured counterexamples. Confirm each removed script's unique checks in three engines.
3. **P61-D:** split mandatory correctness CI from opt-in measurement/screenshot artifacts; reduce duplicate browser setup only after identical or stronger coverage on exact tested SHA. Guarded HTML publishing and no regression remain mandatory.
4. **P61-E:** independent source/CI reconciliation, mutation-detection spot checks, measured runtime and coverage report; no hardware/accessibility/content truth claim.

**Truth boundary:** A green test cannot independently authenticate an official PYQ, actual PDF page fidelity, legal answer key, publisher identity or physical Safari/screen-reader behaviour. Previous P60 findings remain deferred.

## P61-B — one browser launch for native + absent-API routing

Replaced the two formerly independent scripts below by [`scripts/acceptance-navigation.mjs`](../scripts/acceptance-navigation.mjs):

| Prior browser script | Source blob | Preserved direct `check()` calls |
|---|---|---|
| [`acceptance-platform.mjs`](https://github.com/oneshubhamt/practice-desk/blob/c6dd44817a838ea2f75ec9d9c2c9b77df5f6552d/scripts/acceptance-platform.mjs) | `b77e7a5f64f95b1d3ac26638393da94d9ebf29ea` | 10 |
| [`acceptance-safari-fallback.mjs`](https://github.com/oneshubhamt/practice-desk/blob/c6dd44817a838ea2f75ec9d9c2c9b77df5f6552d/scripts/acceptance-safari-fallback.mjs) | `0263b81b2a889c62a8cfcb5c3a0dfe0634be82b2` | 14 |
| **Total** | | **24** |

Both original scenario bodies, page-level assertions, URL identity, save/reload/backup, actual native browser Back/Forward and forced-absent Navigation API fallback checks are retained. Two separately isolated contexts now share one browser launch. The standalone browser is closed only after both journeys (or on failure). Old script paths are removed from the three-engine CI commands, replaced by one `acceptance-navigation.mjs <engine>` invocation per engine. No branch release/production app code is changed. **CI must pass the exact new SHA** before declaring P61-B browser verified.

**Expected structure:** 40 Node test files + one fixture, 33 browser acceptance scripts, 51 scripts total; no old production CLI or genuinely distinct acceptance contract retired.
