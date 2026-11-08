# Practice Desk — current verification

## Commands
```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run build
npm test
# or: npm run check   # typecheck + build + all Node tests
node scripts/acceptance-critical.mjs
node scripts/acceptance-suite.mjs chromium
node scripts/acceptance-suite.mjs firefox
node scripts/acceptance-suite.mjs webkit
```
Node.js 24. The browser harness requires installed Playwright browser binaries; CI installs them. `npm test` builds and invokes `node --test tests/*.test.mjs`. The complete existing browser matrix and guarded HTML publisher are controlled by [.github/workflows/ci.yml](../.github/workflows/ci.yml), not by the shorter examples above.

## Current verified repository test inventory

**P61-H exact-source verified baseline** (CI [42410827277](https://github.com/oneshubhamt/practice-desk/actions/runs/42410827277)): **41 root `*.test.mjs` Node suite files plus one fixture; 408/408 Node registrations passed; 10/10 selected source-isolated semantic mutation probes detected; 33 `acceptance-*.mjs` scripts including the pooled runner, providing 32/32 Chromium, 20/20 Firefox and 20/20 Linux WebKit independently executed journeys; 52 scripts total**. The P61-I final audit is [here](audits/P61_I_FINAL_PROGRAMME_SOURCE_AUDIT_2026-11-08.md); its own final CI is mandatory before formal closure.

Original P61 baseline: **44 Node suites plus one fixture, 431/431 passing Node tests, 34 acceptance-prefixed scripts and 52 total scripts**. A distinct scenario script is not the same as a test registration or engine execution. Current test source is **slightly larger** than the original (+1,087 bytes; +121 net changed lines), an explicit quality-versus-volume trade-off documented in the final report. The single shared browser per engine replaced 72 former individual acceptance-runner commands, not the 72 protected real scenario executions. Older phase counts are historical only.

Core Node tests cover content/schema, scoring, policies, frozen provenance, race-safe persistence, authoring/editorial/pipeline, study evidence and security. Browser acceptance covers exam/History/backup/learning/publishing and special failures such as no Navigation API, quota errors, competing tabs, 195px at 140% scaling and six-kind inputs. Cross-browser CI checks real Chromium/Firefox/Linux WebKit; that is not physical Safari/mobile validation.

## Requirements for any *future* test reduction
Use [TEST_STRATEGY.md](TEST_STRATEGY.md). Build a **contract-to-assertion map first**, identify redundant witnesses, add stronger independent/property/stateful oracles where needed, then migrate one capability cluster at a time. Don't delete the last independent test of a safety contract. Count unique behaviours, adversarial edges and mutation sensitivity—not just number of test files or buttons clicked.

## Evidence categories
- **Pure contracts:** deterministic independent expected values, property tests, impossible-state rejection.
- **Stateful/transactional:** model sequences, reload, interruptions, conflicting writes, stable snapshots.
- **Browser user journeys:** author/import → exam → Results → History/backup → Learning, focus and candidate-only disclosure.
- **Cross-engine:** Chromium, Firefox and Linux WebKit for sensitive browser-facing behaviours, physical Safari separately.
- **Measured diagnostics:** profilers/benchmarks should report actual measured distributions, not invented performance guarantees.
- **Human release:** independently inspect device/OS, accessibility, real source truth, UI and content. Green CI is insufficient.

Screenshots only on failure or focused visual-review request; avoid legacy v11 parity, routine pixel-golden matrices, giant stored screenshot warehouses. P61 is authorized to consolidate tests/browser harnesses with exact assertion mapping and CI gates. The previous P60 app defects, production CLIs and user data remain out of scope.

## Current P61-C CI contract

Use one source-mapped real browser runner per engine: **32 Chromium, 20 Firefox, 20 WebKit** original acceptance scripts, each in independently closed contexts. The common test harness pools the browser process but not the page/IndexedDB profile; every failure is fatal and yields a per-scenario report. The static syntax test still checks each underlying script. Diagnostic benchmarks (`node scripts/benchmark-storage.mjs`, `node scripts/benchmark-p48-heterogeneous.mjs`, `node scripts/benchmark-ui-coordinator.mjs`) are intentionally **manual**, not gating verification. P61-C changes no product source or user-facing app contracts. See [source→scenario trace](TEST_SUITE_LEDGER.md). Actual CI job timings must be added only after the exact-source run.

**Measured P61-C verification (7 Nov 2026):** [five-job exact-source run 42331170060](https://github.com/oneshubhamt/practice-desk/actions/runs/42331170060) successful at `619a2671d86ea588ba9f0a34ee8ec9b24d34c01a`. Full suite execution: 32 Chromium + 20 Firefox + 20 Linux WebKit retained, one pooled browser per engine; source-verified publishing succeeded. Previous 351-second workflow ran in 305 seconds (single-run 13.1% improvement). See [P61 implementation ledger](TEST_SUITE_LEDGER.md) for per-job timings, caveats and remaining 400/200 WebKit scale bottleneck.

## P61-D scenario and visual QA commands

The History filter suite now uses an independent 128-query reference model (24 distinct frozen metadata combinations). Browser journeys still run all 72 scenarios and retain failure screenshots.

Normal CI/local run (no routine successful image captures):
```bash
npm run check
node scripts/acceptance-suite.mjs chromium
```

For intentional visual review only:
```bash
PRACTICE_DESK_VISUAL_REVIEW=1 node scripts/acceptance-suite.mjs chromium
```

The historical vendor feasibility probe scripts are archived at the pre-P61-D commit; they were not current-app CI gates. The standalone diagnostic benchmarks remain explicit/manual. Full evidence and de-duplication mapping are in [TEST_SUITE_LEDGER.md](TEST_SUITE_LEDGER.md).

**P61-D current verified gate:** [run 42361411781](https://github.com/oneshubhamt/practice-desk/actions/runs/42361411781) passed at `337f1c7789a38b8cfdbcd86561b9488f2fd1fcc1`: 432/432 Node tests; 32 Chromium + 20 Firefox + 20 Linux WebKit browser journeys; guarded standalone HTML publisher. Running all five jobs took 267 s versus 305 s in P61-C (two hosted-runner measurements, not a benchmark). Passing screenshots remain opt-in through `PRACTICE_DESK_VISUAL_REVIEW=1`; failure diagnostics are always active. See [ledger](TEST_SUITE_LEDGER.md).

### P61-E semantic coverage pass (pending exact-source verification)

Working focus is retiring 10 genuinely overlapping examples, retaining the stronger 200-seed independent scoring oracle, 250×150 CAS model, 200-seed storage merge reference, 128-case rich text model and both the published/scored and measured/revision integration contracts. See [evidence map](TEST_SUITE_LEDGER.md). Full strict+3-engine CI and guarded source publisher are required before the P61-E pass may be called green. No production source code changed.

**Verified P61-E:** [CI 42370584683](https://github.com/oneshubhamt/practice-desk/actions/runs/42370584683) passed on source commit `741c19d257c2c6254810a43d0cb85dd7102c8426`: 422/422 Node tests; full 32 Chromium/20 Firefox/20 Linux WebKit browser journeys; guarded source publisher. See [assertion-retirement map](TEST_SUITE_LEDGER.md) for the ten retired examples and stronger replacements. Full workflow 261 s versus P61-D 267 s (individual run observations; no performance guarantee). No production code changes.

### P61-F (pending exact-source CI)

Twelve narrow test registrations across scoring, storage, authoring and learning are replaced with one 576-case independent recovery precedence/reference model and stronger assertions inside existing seeded/integration tests; **expected 411 Node tests**. The implementation does not change production code or the 72 mandatory source-mapped Chromium/Firefox/WebKit journeys. Source and coverage trace: [P61-F ledger](TEST_SUITE_LEDGER.md). Closure requires the full five-job CI and guarded publishing to pass at the exact changed commit.

**Verified P61-F (7 November 2026):** [full five-job CI 42373176697](https://github.com/oneshubhamt/practice-desk/actions/runs/42373176697) succeeded at `56a10e7cf754e90f3499ef1994bc872591d92a8f`: 411/411 Node tests, 32/32 Chromium, 20/20 Firefox, 20/20 Linux WebKit real browser journeys and guarded source-verified publisher. One new 576-case recovery oracle replaced three examples; 12 narrow registrations retired, one oracle introduced, net −11. Only test and documentation sources changed. Observed workflow 251 seconds vs 261 seconds P61-E (not controlled benchmarking). See [P61-F ledger](TEST_SUITE_LEDGER.md).

### P61-G verified mutation-sensitivity and semantic consolidation

Expected 407 Node registrations, all 72 previous browser journeys, and six isolated source-level semantic mutation witnesses that must be detected by existing individual named tests. The new `node scripts/mutation-sensitivity.mjs` is an additional mandatory CI core gate and may increase execution time. See [P61-G assertion mapping](TEST_SUITE_LEDGER.md) for exact retired cases, mutation contracts and isolation guarantees. Full exact-source CI completed successfully (details below).

**P61-G verified:** [five-job CI 42375387122](https://github.com/oneshubhamt/practice-desk/actions/runs/42375387122) passed at `eeecdd51331ff2a847b63f8f0c52e9ad9a354fa2`: **407/407 Node tests**, **six of six deliberate source mutants killed** by named assertion tests, **32 Chromium + 20 Firefox + 20 Linux WebKit** original real-browser journeys, and guarded HTML publishing. An initial red CI correctly found that the rich-text property was insensitive to trimming; the test was strengthened with 512 deterministic whitespace variants and rerun green. Full suite 244 s versus prior 251 s (noncontrolled observations). [Assertion map and full evidence](TEST_SUITE_LEDGER.md).

### P61-H independent audit — verified and complete (8 November 2026)

[12-contract audit, source witnesses and residual limits](audits/P61_H_INDEPENDENT_COVERAGE_AUDIT_2026-11-08.md). The prior 200-seed scoring policy model generated single-choice items, so the **new 128-seed six-kind independently calculated metamorphic model** tests marking and answer-ID/input permutation invariance. Mutation gate now targets 10 selected defects (four new probes: scorer set equality, backup SHA, PDF EOF, explicit FSRS rating). No unique tests or browser journeys retired. **Expected:** 408 Node cases, 10 selected mutants, unchanged 32 Chromium/20 Firefox/20 WebKit journeys. Exact-source [five-job CI 42410337888](https://github.com/oneshubhamt/practice-desk/actions/runs/42410337888) passed: 408 Node tests, ten isolated mutations killed, 72 original browser scenarios, guarded publishing.

### P61-I final audit — pending exact-source closure gate (8 November 2026)

The [final original-objective-to-actual-source audit](audits/P61_I_FINAL_PROGRAMME_SOURCE_AUDIT_2026-11-08.md) verifies implementation evidence for P61-A–H, registry counts, protected-browser scenarios, opt-in visual evidence, 10-mutation detection, source-exact guarded publisher and approved trade-offs. Historical guides were corrected from `Satyam` to the authorized `overhaul` branch. The production application has not been changed in P61. **P61-I closes only after its own changed-SHA full five-job CI is successful.** Real Mac Safari/AT/mobile, independent PDF/PYQ correctness, and P60-01–07 remain outside this closure.
