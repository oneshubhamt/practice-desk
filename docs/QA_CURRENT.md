# Practice Desk — current QA contract

This is the active human-readable verification contract for the current `working` branch. Historical programme-specific runs and implementation diaries belong in [HISTORY_INDEX.md](HISTORY_INDEX.md). The executable sources of truth are the test files, `scripts/acceptance-suite.mjs`, `scripts/mutation-sensitivity.mjs` and [CI](../.github/workflows/ci.yml).

The current suite census, risk→invariant→cheapest-layer map, overlap clusters, source-shape heuristics and deep/stress classification are recorded in [QA_CENSUS.md](QA_CENSUS.md). That Pass-A map is descriptive: it authorizes no test deletion or CI weakening by itself.

## Required toolchain

Use Node.js **26.13.0** with the committed lockfiles. The main application and isolated FSRS optimizer dependency graphs must both install cleanly from those locks.

```bash
npm ci --no-audit --no-fund
npm run check
node scripts/mutation-sensitivity.mjs

npm ci --prefix tools/fsrs-optimizer --no-audit --no-fund
npm run --prefix tools/fsrs-optimizer smoke
npm run --prefix tools/fsrs-optimizer parity
npm run build:static

node scripts/acceptance-suite.mjs chromium
node scripts/acceptance-suite.mjs firefox
node scripts/acceptance-suite.mjs webkit
```

The browser suites require the corresponding Playwright browser binaries. The protected CI workflow installs them on standard GitHub-hosted runners and is the normal full-system verification path.

Markdown-only pushes and pull requests are excluded from the expensive runtime workflow because Markdown is not a build input. Any source, test, build, dependency or workflow change still enters the full gates below; a documentation-only commit therefore may legitimately have no CI run.

## Required CI gates

A current application change is release-eligible only when all of these gates pass on the same tested source ancestry:

- **Core:** strict TypeScript (including unused-local rejection), deterministic standalone build, complete Node test suite, clean dependency graph and the targeted mutation-sensitivity witnesses.
- **Optimizer:** native FSRS optimizer smoke, native/WASM semantic parity and the independently generated static Worker/WASM build.
- **Chromium:** all source-mapped offline candidate journeys plus the full browser/WASM optimizer activation path.
- **Firefox and WebKit:** all cross-browser source-mapped journeys plus the browser/WASM optimizer probe.
- **Guarded publisher:** only after the preceding gates pass may CI publish the tested standalone HTML to `working`; source drift aborts publication.

`npm run check` is necessary but not sufficient for UI, browser-storage, Worker/WASM or cross-browser changes.

For deliberate visual evidence only:

```bash
PRACTICE_DESK_VISUAL_REVIEW=1 node scripts/acceptance-suite.mjs chromium
```

Normal passing CI does not capture screenshots merely to create evidence.

## Test design rules

The Node suite is organized by stable product domains rather than historical programme/pass labels. Architecture rules are checked through the parser-backed resolved import graph in `tests/architecture-boundaries.test.mjs`; line-count, exact-helper-name and source-phrase scans are not architecture oracles.

Prefer independent expected values, state/reference models, tables, metamorphic properties and adversarial counterexamples over implementation mirroring. A changed contract needs a witness that would fail for a plausible semantic defect.

For scoring, preserve six-kind semantics, fractional/partial credit, exclusions and exact denominators. For persistence, challenge stale tabs, CAS revisions, corruption, recovery and additive backup. For authoring, challenge candidate secrecy, source lineage, publication gating and corrupt local state. For learning, challenge scheduling evidence, optimizer activation policy and privacy boundaries. Result/review analytics additionally exercise the 2,000-question package ceiling in Node. Browser tests should exercise actual user journeys rather than duplicate pure-domain assertions.

The mutation suite is intentionally targeted: every listed mutant must have a green baseline and then fail for the named assertion. It is **not** a repository-wide mutation score.

## What automated QA does not prove

Green CI establishes the bounded software contracts encoded by the suite. It does **not** independently prove factual correctness of question banks, statutory currency, authenticity of third-party source reproductions, human reviewer identity, physical-device behavior, native Mac Safari behavior, assistive-technology usability, or survival of browser data after OS/profile loss.

Those risks belong in the active [backlog](../backlog.md). Historical measurements and prior verification runs remain available through [HISTORY_INDEX.md](HISTORY_INDEX.md), but an old green run never substitutes for verification of the present source.
