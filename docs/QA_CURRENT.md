# Practice Desk — current verification

## Commands
```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run build
npm test
# or: npm run check   # typecheck + build + all Node tests
node scripts/acceptance-critical.mjs
node scripts/acceptance-navigation.mjs chromium
node scripts/acceptance-navigation.mjs webkit
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
