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

The most recent recorded P62-D predecessor-branch verification is [five-job CI 42508271948](https://github.com/oneshubhamt/practice-desk/actions/runs/42508271948) at `0a571a01443d`: **417/417 Node tests; ten of ten targeted source-isolated mutations; 32 Chromium, 20 Firefox and 20 Linux WebKit journeys; and guarded source-verified HTML publishing**. These are current run results, not a measure of factual question quality.

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

## P62-D focused source and authoring verification (8 November 2026)

The [separate P62-D live-source run](https://github.com/oneshubhamt/practice-desk/actions/runs/42508271893) reuses **five targeted regressions covering six defects**: solution-only image secrecy; incomplete blueprint publication refusal; pinned Source revisions; 19 comparable MCQs beside a numerical question; semantic edits (private explanation versus visible stem/options/media/stimuli); and an unkeyworded legal question with author-declared applicability that a reviewer may not contradict. **5/5 selected tests passed.** Source-level review revealed two and fixed two genuine issues: mathematical option normalization had collapsed signed fractions (`2/3` vs `-2/3`); and source-declared legal applicability previously could be contradicted by a reviewer.

A separate live run downloaded **three third-party published PDF files**, then used **two actual CAT 2024 QA source pages** (from a 24-page 2IIM paper), one separate published answer-key page and independently reproduced APFC 2023 English questions. These are **source-grounded reconstructions**, not authenticated original IIM/UPSC papers. Independent mathematical/lexical answer oracles agreed on **four of four curated answers** (two APFC English, two CAT Quant). The full PDF → intake → Reviewed QA → compile → frozen Source pairing → candidate rendering workflow passed for two CAT questions; the actual PDF comparison remains attributed human/agent review, **not** software-proven visual/source fidelity. Plain-text extraction omitted mathematical glyphs (including `32768`), although answer value `540` was recovered. No claim of full 24-page coverage or source-authenticated publisher identity is warranted.

**Actual CLI measurements:** eight subprocess calls, **1.293 s aggregate subprocess wall time** (excludes downloads, reviewer/model work). Candidate packet versus authored-source bytes: CAT **2,303/2,571**; APFC **2,361/2,410**. The aggregate output reduction is only **317/4,981 bytes (~6.4%)** on this tiny sample, not proof of reduced model context or superior agent efficiency. **Model tokens, independent agent baseline, generation time, distractor quality, calibrated difficulty and source-transcription error rate were not measured.** The sidecar remains `recorded-self-attestation-not-authenticated`; factual verification remains `not-performed`. The measured JSON report is in the [temporary live-run artifact](https://github.com/oneshubhamt/practice-desk/actions/runs/42508271893) (seven-day retention). 

## Verified scope versus still-unverified evidence

Automated CI verifies bounded software behaviors, not actual statutory/PYQ answer correctness, independent PDF visual transcription, publisher/reviewer identity, native Mac Safari, physical mobile/IME/screen-reader accessibility, OS-level storage loss or human visual/release approval. Those remain separately in the [backlog](../backlog.md).

**Historical performance and assertion-retirement trace:** pinned [P61 final audit and detailed ledger](HISTORY_INDEX.md#test-bench-consolidation-archive). There is no open P61 implementation pass.
