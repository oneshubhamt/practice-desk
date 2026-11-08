# Practice Desk — testing and verification

This is the **only active human-readable test strategy**. The source of truth is the actual test suite, `scripts/acceptance-suite.mjs`, mutation runner and [CI workflow](../.github/workflows/ci.yml). Prior pass-specific regression diaries are accessible in [historical Git evidence](HISTORY_INDEX.md), not repeated here.

## Execute the gates

Use Node.js **24**, installed dependencies and Playwright browser binaries appropriate to the host.

```bash
npm ci --no-audit --no-fund
npm run check                  # strict TS + reproducible build + Node tests
node scripts/mutation-sensitivity.mjs
node scripts/acceptance-suite.mjs chromium
node scripts/acceptance-suite.mjs firefox
node scripts/acceptance-suite.mjs webkit
```

For deliberate visual inspection only (not the normal passing CI path):

```bash
PRACTICE_DESK_VISUAL_REVIEW=1 node scripts/acceptance-suite.mjs chromium
```

Unexpected failures produce diagnostics/screenshots. Optional `benchmark-*.mjs` scripts are **measurements**, not substitutes for correctness gates; do not infer speed improvements from uncontrolled hosted-runner comparisons.

## Required protected CI

The last verified closure run on `overhaul` is [five-job CI 42433146976](https://github.com/oneshubhamt/practice-desk/actions/runs/42433146976): **408/408 Node tests, ten of ten selected source-isolated semantic mutations detected, 32/32 Chromium, 20/20 Firefox and 20/20 Linux WebKit browser journeys, plus guarded source-verified HTML publishing**.

- **Core:** strict typecheck/build; validated imported source, paper/scoring, candidate disclosure, History/CAS, backup/recovery, authoring, provenance, PDF intake and FSRS. An independent 200-seed scoring rule model is complemented by 128 seeded six-kind questions, a 576-case recovered-record reference and seeded CAS/merge models.
- **Browser suites:** one pooled browser launch per engine, with **independent and fully closed contexts per journey**. Scripts are enumerated against a fail-closed manifest; a missing/failed scenario fails the suite. Keep `file://` operation, keyboard/navigation fallback, editing, source comparison, 195px/140% layout and the 400-staged/200-selected scale journey.
- **Mutation sensitivity:** temporary source copies prove selected retained tests fail under ten deliberate faults (e.g., wrong blank penalty, recovery/CAS revision error, changed authoring marks, trimmed rich text, incorrect multi-select, skipped backup SHA/PDF EOF and FSRS rating drift). This is **not** a global mutation score.
- **Publisher:** publish offline HTML **only after** core and all three browser gates succeed, with source ancestry/non-Markdown drift controls. Never hand-edit the generated artifact.

## How to design or reduce tests

A changed contract needs an independent expected-value oracle, model-based state transition or meaningful adversarial counterexample. Prioritise unique safety coverage over low-level click counts, repeated screenshots or superficial test-file reduction.

1. Identify the exact **source owner, user risk and contract**; map surviving witnesses across pure unit tests, persistence, production CLI and real user browser journeys.
2. For scoring, preserve fractional/partial credit, exclusions, exact denominator and six-kind semantics. For storage, challenge stale tabs, crash/restore, duplicate snapshots and fraudulent backups. For authoring/PDF, challenge pre-submit secrecy and incorrect external source claims; for Learning, challenge distinct-question counts, FSRS and privacy gating.
3. Add stronger tests **before** retiring overlap; map every retired assertion to a surviving, executed check. If a selected mutation survives, strengthen the witness rather than deleting the mutant.
4. Execute focused tests, then **the entire protected five-job CI** when changes affect shared contracts, browser runtime or distribution. Log the exact SHA and distinguish observed runtimes from controlled benchmarks.

## Verified scope versus still-unverified evidence

Automated CI verifies bounded software behaviors, not actual statutory/PYQ answer correctness, independent PDF visual transcription, publisher/reviewer identity, native Mac Safari, physical mobile/IME/screen-reader accessibility, OS-level storage loss or human visual/release approval. Those remain separately in the [backlog](../backlog.md).

**Historical performance and assertion-retirement trace:** pinned [P61 final audit and detailed ledger](HISTORY_INDEX.md#test-bench-consolidation-archive). There is no open P61 implementation pass.
