# Practice Desk — current QA contract

This is the active human-readable verification contract for the current `working` branch. Historical programme-specific runs and implementation diaries belong in [HISTORY_INDEX.md](HISTORY_INDEX.md). The executable sources of truth are the test files, `scripts/node-suite.mjs`, `scripts/acceptance-suite.mjs`, `scripts/mutation-sensitivity.mjs` and [CI](../.github/workflows/ci.yml).

The suite census and completed consolidation/equivalence evidence are recorded in [QA_CENSUS.md](QA_CENSUS.md).

Pass E's invariant-level audit and case ledger are in [QA_PASS_E.md](QA_PASS_E.md) and [QA_PASS_E_CASE_REGISTER.tsv](QA_PASS_E_CASE_REGISTER.tsv). The verified Pass F canonicalisation, assertion-witness mapping and before/after evidence are in [QA_PASS_F.md](QA_PASS_F.md). Pass G adds source-backed independent state/property evidence in [QA_PASS_G.md](QA_PASS_G.md).

## Required toolchain

Use Node.js **26.13.0** with the committed lockfiles. The main application and isolated FSRS optimizer dependency graphs must both install cleanly from those locks.

Useful local entry points:

```bash
npm ci --no-audit --no-fund

# Fast deterministic lane: 36 Node files / 443 tests plus type/build.
npm run qa:fast

# Deep Node subset: 3 scale/benchmark files / 7 tests.
npm run qa:deep
node scripts/mutation-sensitivity.mjs

npm ci --prefix tools/fsrs-optimizer --no-audit --no-fund
npm run --prefix tools/fsrs-optimizer smoke
npm run --prefix tools/fsrs-optimizer parity
npm run build:static

# Browser lanes.
node scripts/acceptance-suite.mjs chromium --tag=smoke
node scripts/acceptance-suite.mjs chromium --tag=deep
node scripts/acceptance-suite.mjs firefox --tag=cross-browser
node scripts/acceptance-suite.mjs webkit --tag=cross-browser

# Optional focused capability run.
node scripts/acceptance-suite.mjs chromium --tag=storage
```

The browser suites require the corresponding Playwright browser binaries. The protected CI workflow installs them on GitHub-hosted runners and is the normal full-system verification path.

Markdown-only pushes and pull requests are excluded from runtime CI because Markdown is not a build input. Any source, test, build, dependency or workflow change enters the applicable executable gates.

## Required CI gates

The workflow is deliberately cost-tiered.

- **Fast — every source PR/push.** Strict TypeScript, deterministic standalone build, the **443 non-deep Node tests**, clean dependency graphs, native FSRS optimizer smoke and the source-verified static Worker/WASM build. This is the earliest deterministic feedback lane.
- **Smoke — every source PR/push.** Six critical Chromium user journeys tagged `smoke` plus the complete browser/WASM optimizer activation path.
- **Cross — every source PR/push.** The four scenarios tagged `cross-browser` on Firefox and WebKit, plus the browser/WASM optimizer probe. Do not replicate Chromium-only product policy here.
- **Deep — required on `working` release pushes.** Three scale/benchmark Node files (**7 tests**), the **14 targeted semantic mutants**, native/WASM optimizer parity and eight Chromium scenarios tagged `deep`. Ordinary pull requests do not pay this cost.
- **Guarded publisher — `working` only.** Publication occurs only after fast, smoke, both cross-browser legs and deep pass on the tested source ancestry; source drift aborts publication.

The complete Node inventory is **39 files / 450 tests**: 443 fast + 7 deep. `npm run check` still runs the complete Node suite when explicitly requested, but the CI lane split avoids paying deep costs in the earliest feedback path.

## Timing evidence

`scripts/timed-run.mjs` wraps timed CI commands. It emits a machine-readable `QA_TIMING` JSON record, appends JSONL to the lane artifact, and writes a concise GitHub step-summary entry.

Treat timing values as observations, not thresholds. GitHub-hosted provisioning, browser installation and machine contention vary; timing evidence is intended to reveal sustained regressions and support lane placement, not create brittle millisecond budgets.

## Browser test design

The browser registry is capability/risk tagged rather than filename driven. Chromium owns the complete retained browser-risk surface; Firefox/WebKit own only genuine engine-sensitive scenarios.

Browser tests should exercise visible user behaviour and browser-specific contracts instead of duplicating pure-domain mathematics. Prefer Playwright role/name and other user-facing locators for visible interactions. Stable IDs/data attributes remain appropriate for hidden file inputs, immutable persisted-record identities, exact diagnostic surfaces or other technical evidence where the identifier itself is part of the contract.

Each scenario must be independently runnable. Helpers must wait for their own setup state rather than relying on a previous scenario to have selected a family, rendered an edition control or hydrated imported content.

For deliberate visual evidence only:

```bash
PRACTICE_DESK_VISUAL_REVIEW=1 node scripts/acceptance-suite.mjs chromium
```

Normal passing CI does not capture screenshots merely to create evidence.

## Node test design

The Node suite is organized by stable product domains rather than historical programme/pass labels. Related tests use named domain-registration functions and shared test-only CLI/temporary-directory helpers; incidental layout/text snapshots are not substitutes for state, accessibility or actual browser witnesses. Architecture rules are checked through the parser-backed resolved import graph in `tests/architecture-boundaries.test.mjs`; line-count, exact-helper-name and source-phrase scans are not architecture oracles.

Prefer independent expected values, state/reference models, tables, metamorphic properties and adversarial counterexamples over implementation mirroring. A changed contract needs a witness that would fail for a plausible semantic defect.

For scoring, preserve six-kind semantics, fractional/partial credit, exclusions and exact denominators. For persistence, challenge stale tabs, CAS revisions, corruption, recovery and additive backup. For authoring, challenge candidate secrecy, source lineage, publication gating and corrupt local state. For learning, challenge scheduling evidence, optimizer activation policy and privacy boundaries.

The mutation suite is intentionally targeted: every listed mutant must have a green baseline and then fail for the named assertion. It is **not** a repository-wide mutation score.

## Equivalence status

The former 33/21 historical browser suite was restored temporarily from its verified Pass-B commit and run side by side with the canonical tagged suite against the same current source. All old and new engine legs passed, all 33 legacy Chromium scenarios were mapped to surviving browser/Node witnesses, and the original targeted mutation set remained **10/10 killed** (Pass D historical equivalence). The current Pass G sensitivity audit is **14/14 killed**.

The temporary legacy runner, historical acceptance scripts and equivalence auditor were then deleted. They are not part of the current QA topology; historical measurements are recorded in [QA_CENSUS.md](QA_CENSUS.md).

## What automated QA does not prove

Green CI establishes the bounded software contracts encoded by the suite. It does **not** independently prove factual correctness of question banks, statutory currency, authenticity of third-party source reproductions, human reviewer identity, physical-device behavior, native Mac Safari behavior, assistive-technology usability, or survival of browser data after OS/profile loss.

Those risks belong in the active [backlog](../backlog.md). Historical measurements and prior verification runs remain available through [HISTORY_INDEX.md](HISTORY_INDEX.md), but an old green run never substitutes for verification of the present source.
