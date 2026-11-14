# Practice Desk — permanent QA contract

**Canonical contract:** one Node test inventory, one tagged browser registry, one guarded release publisher. Executable truth lives in `tests/`, `scripts/node-suite.mjs`, `scripts/acceptance-suite.mjs`, `scripts/mutation-sensitivity.mjs`, and [CI](../.github/workflows/ci.yml). Historical rationale, evidence maps and measured changes: [QA census](QA_CENSUS.md) · [Pass E risk/case ledger](QA_PASS_E.md) · [Pass F](QA_PASS_F.md) · [Pass G](QA_PASS_G.md) · [Pass H](QA_PASS_H.md) · [Pass I residual assertion audit](QA_PASS_I.md) · [Pass J evidence-gap strengthening](QA_PASS_J.md) · [Pass K economics + final adequacy](QA_PASS_K.md). The authoritative de novo E–H objective check and corrected controlled economics are in [QA_CLOSURE_AUDIT.md](QA_CLOSURE_AUDIT.md).

## Required gates and publication authority

| Gate | When | Non-negotiable scope |
|---|---|---|
| **Fast** | Every relevant PR/push | Node **26.13.0**, locked dependencies, strict TS, deterministic offline HTML, **445** non-deep Node tests, isolated FSRS optimizer smoke and static Worker/WASM build |
| **Smoke** | Every relevant PR/push; needs Fast | **6** real Chrome journeys including candidate→History and author→Publish→Review; complete browser/WASM optimizer activation |
| **Cross** | Every relevant PR/push; needs Fast | **4** genuine engine-sensitive scenarios **each** on Playwright Firefox and WebKit, plus WASM optimizer probes on both |
| **Deep** | Push to `working`; needs Fast | **7** scale/benchmark Node cases, **14** named assertion-killed mutations and native/WASM parity run as one contract lane **concurrently in the same runner** with the **8** serial Chrome browser scenarios |
| **Publish** | Push to `working` **only** | Requires **successful Fast + Smoke + both Cross legs + Deep**; checks tested-head ancestry, no unverified source/CI/artifact drift, publishes only the tested deterministic HTML |

The full Node inventory is **39 files / 452 cases** (445 fast + 7 deep). The browser registry has **14 scenarios / 22 engine executions**. The deep gate is not a routine PR gate, but **no `working` publication can bypass it**. Markdown-only changes do not trigger executable CI. Never weaken a required gate solely to improve timings.

## Local reproducibility

```bash
npm ci --no-audit --no-fund
npm run qa:fast
npm run qa:deep
node scripts/mutation-sensitivity.mjs
npm ci --prefix tools/fsrs-optimizer --no-audit --no-fund
npm run --prefix tools/fsrs-optimizer smoke
npm run --prefix tools/fsrs-optimizer parity
npm run build:static
node scripts/acceptance-suite.mjs chromium --tag=smoke
node scripts/acceptance-suite.mjs chromium --tag=deep
node scripts/acceptance-suite.mjs firefox --tag=cross-browser
node scripts/acceptance-suite.mjs webkit --tag=cross-browser
```

Install the locked browser toolchain and its host dependencies when running locally. Chrome smoke/deep (including the Chromium WASM probe) use the **same installed Chrome binary**; Firefox/WebKit use their separately installed Playwright browsers. Acceptance scenarios use one process per engine, **fresh contexts and serial journeys**. CI runs independent lanes concurrently only after the Fast artifact gate. Within Deep, the contract lane overlaps the Chromium lane because mutations use a temporary sandbox while the browser reads immutable Fast artifacts; the eight browser journeys themselves remain serial. Never parallelize journeys that share harness context teardown, IndexedDB/profile state or browser-global fixtures.

## Quality invariants and selection

- **Scoring:** independent six-kind and seeded policy reference ledgers, exact fractional penalties and partial credit, exclusions, per-item/section identities, manual-pending and semantic mutations.
- **Timing/session:** independent clocks, visibility/pause/section expiry, visit and answer evidence, terminal immutability, restore/rebase, event batching invariance, plus real-browser pagehide/off-document/reopen recovery.
- **Persistence:** CAS, stale tabs, shared snapshot SHA, backups, intentional deletion, corrupt rows, fallback/read/quota failures and atomic publication retries.
- **Authoring:** signed lineage, reviewer evidence, exact publication revision, pre-reveal private-key/explanation isolation, browser adversaries for stem/shared-stimulus/media-alt leakage, QA refusal, offline publish→score→review→reload.
- **Learning:** deterministic scheduling/replay, an independent published FSRS-7 dual-trace retrievability reference, upstream/native/WASM parity, actual browser Worker activation, explicit optimizer/profile privacy.
- **Calendar:** canonical temporal records plus an Asia/Kolkata datetime-local→UTC year-boundary browser witness with reload preservation.
- **UI/security:** actual browser paint, ARIA/keyboard/focus, file navigation, responsive 195px/140% layout, media, CSP, no remote dependence.

For every proposed test deletion or move, first name **risk → invariant → surviving independent witness → cheapest valid layer**. Preserve real subprocesses for CLI transactions, actual IndexedDB and browser/process-restart witnesses, and meaningful security/a11y assertions. Mere source phrases, CSS classes or success-only mocks are not proof. The **14 mutants** require baseline-green and the named test's assertion failure; they are sensitivity spot checks, **not** a global mutation score.

## Timing, evidence and limits

`scripts/timed-run.mjs` reports per-lane `QA_TIMING` JSON; Node reporter gives case timings; `scripts/acceptance-suite.mjs` emits scenario IDs/outcomes, per-scenario elapsed time and actual browser version/executable provenance. Compare repeated green runs on **the same source** and separate setup, execution, runner contention and guarded-publication wall time. The closure benchmark uses three baseline and three final same-source attempts: median pre-publication gate runner consumption **351→325 s (−7.4%)** and median gate critical path **157→153 s (−2.5%)**; the eliminated duplicate Chromium installs have a baseline median cost of **32.77 s/attempt**. Do not enforce arbitrary millisecond thresholds. Keep expensive reviewer-authority checks in Fast: moving them to a release-only gate would weaken PR screening. Retain WebKit dependencies rather than silently substituting Chrome for a different engine.

**Pass K retained economics (three green same-source attempts each):** J baseline executable `b387514` had median pre-publication runner consumption **315 s**, median gate critical path **154 s**, median full Fast→Publish path **163 s**, and median Deep job **88 s**. The retained K topology (`415a973`; identical executable tree at final verification `41a4d50`) measured **313 s (−0.6%)**, **144 s (−6.5%)**, **155 s (−4.9%)**, and **70 s (−20.5%)** respectively. No test was removed or moved. A pinned Playwright browser-cache experiment improved the WebKit job but not whole-pipeline economics enough to justify its cache state/dependency, so it was reverted. See [Pass K](QA_PASS_K.md) for raw attempts, the rejected experiment and final adequacy evidence.

Passing CI does **not** establish historical PYQ authenticity, current legal facts, real reviewer identity, physical-device Safari, assistive-technology usability or survival of power loss/OS-profile loss. Address those outside the bounded automated contracts. See [Pass K](QA_PASS_K.md) for the latest measured economics and final adequacy evidence; [Pass H](QA_PASS_H.md) retains the earlier A–H survivor mapping and closure benchmark.
