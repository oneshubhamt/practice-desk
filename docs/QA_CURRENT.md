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

## What is actually in the repository
At the baseline: **45 files in `tests/` (including one fixture)**. P61-A reduces this to **41** (40 root Node suites + one fixture) by preserving 27 source cases in `tests/authoring-domain.test.mjs` and adding one deterministic property test. P61-B combines the native/fallback navigation witnesses into one real browser journey: **33 acceptance scripts, 51 scripts in total**. See [assertion-retirement ledger](TEST_SUITE_LEDGER.md). A script count is not a test-case count: many non-acceptance scripts are production bank/compiler/agent commands and must not be mistaken for deletable tests. Older docs listing 23 Node or 24 browser files describe prior checkpoints, not this tree.

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
