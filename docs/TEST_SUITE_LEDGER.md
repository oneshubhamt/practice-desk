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

## P61-C — actual browser-process consolidation and CI simplification

**Baseline exact-SHA green:** [P61-B run 42330017407](https://github.com/oneshubhamt/practice-desk/actions/runs/42330017407), five jobs, old runner. Observed CI overall elapsed 351 seconds; Chromium job 283 s; Firefox 129 s; WebKit 263 s. These are point-in-time runner measurements, not a controlled performance claim.

### Mechanism
- **Before:** CI spawned each of 32 Chromium and 20 Firefox/20 WebKit acceptance scripts in an independent Node process. Every script called `openHarness` and launched its own Playwright browser process.
- **After:** one `node scripts/acceptance-suite.mjs chromium|firefox|webkit` per engine, executing the **same script bodies sequentially** via dynamic ESM import with their existing source-resolved imports, every existing assertion and real offline context. The test-only `scripts/browser/fixtures.mjs` pools exactly one engine-specific browser per suite. Each original harness `finish()` must close **all** contexts before running the next journey, preventing shared browser session state, IndexedDB or OS profile from contaminating subsequent tests. Fatal failures stop the run; the machine report lists every executed scenario and never prints an incomplete suite as passed.
- **Manifest:** four domain groupings (authoring/content, candidate/editorial, History/recovery/learning, media/scale/navigation). Chromium still runs 32, Firefox and WebKit still run 20 each. The unused legacy vendor feasibility probe remains outside these suites and was not silently counted.
- **CI and artifacts:** the historical 52 separately named acceptance shell commands become three engine runner commands, with the same `core`, Chromium, Firefox/WebKit and guarded `publish` gating. Three *diagnostic-only* performance scripts (`benchmark-storage`, `benchmark-p48-heterogeneous`, `benchmark-ui-coordinator`) are no longer blocking every push; they remain manually runnable as written. Success screenshots are not routinely uploaded; on failure relevant evidence and the source/attempt-level JSON runner report are uploaded. The only obligatory successful artifact is the exact-source verified standalone HTML.
- **No production app or content change:** source CGL, scorer, auth/FSRS, build, import, History/backup, and device/agent boundaries unchanged.

### Contract-level acceptance
1. Existing original script files remain in the repo and are **executed, not skipped**; the runner enumerates and fails closed on missing or duplicate scenarios.
2. Every standalone scenario runs in a fresh, fully closed browser context. Browser engine-specific assertions must execute on actual Chromium/Firefox/Linux WebKit; actual physical Mac Safari remains a separate unverified gate.
3. Runner reports executed count, per-journey duration/outcome and **one** shared browser launch per engine; benchmark scripts are explicitly not correctness tests.
4. **Verify against exact changed SHA** with strict Node/typecheck/build, all 72 real offline journey executions (32+20+20), guarded source-verified publishing. Record GitHub Actions job wall times against 351s baseline only after that run finishes; environment variance limits comparability. A faster result with skipped cases is invalid.

### P61-C final independent exact-source verification — PASS

**[Five-job source-verified GitHub Actions run 42331170060](https://github.com/oneshubhamt/practice-desk/actions/runs/42331170060)** at `619a2671d86ea588ba9f0a34ee8ec9b24d34c01a`: strict TypeScript, deterministic standalone HTML build and Node suites PASS; all 32 Chromium, 20 Firefox and 20 Linux WebKit original acceptance scenarios PASS through the pooled runner; guarded HTML publisher PASS. The runner reports **one pooled browser launch for each engine**, with separate contexts per scenario. The independent Chrome persistent-profile restart inside the Chromium resilience test continues to launch/close its own process; it is not counted as a pooled harness launch.

| Metric | Prior full-green P61-B (run 42330017407) | New P61-C full-green (run 42331170060) | Observed change |
|---|---:|---:|---:|
| Whole workflow wall time (created → updated) | 351 s | 305 s | 13.1% reduction |
| Chromium job | 283 s | 161 s | 43.1% reduction |
| Firefox job | 129 s | 104 s | 19.4% reduction |
| Linux WebKit job | 263 s | 243 s | 7.6% reduction |
| Number of mandatory acceptance scenario executions | 72 | 72 | No loss |
| Mandatory browser-runner shell commands | 72 | 3 | 69 fewer |
| CI workflow lines | 354 | 172 | 51.4% fewer |

These are **two observed CI runs**, not a controlled benchmark or proof of steady-state percentage improvement. In the successful WebKit run, the 400-staged/200-published `acceptance-p58c-scale` scenario alone took about 64 seconds, and is now the clearest remaining critical-path bottleneck. It retains distinct cross-browser scale, export/restore, editing, concurrent-tab, scoring and 195px/140% user-interface assertions: **do not silently drop it just to improve a dashboard percentage**. A follow-on re-engineering pass would need an independently mapped Node+browser oracle, real WebKit coverage and measurable performance proof before adjusting its scope or sharding.

**Next evidence-driven work (NOT implemented by P61-C):** (a) claim-by-claim duplicate test classification to retire only genuinely redundant assertions; (b) review the unused `acceptance-p47-5a-vendors.mjs` and standalone `probe-p47-vendors.mjs` as historical vendor feasibility tools, checking whether current *real app* editor/KaTeX suites supersede their unique checks; (c) gate success-only screenshots behind deliberate visual-review mode while retaining automatic failure images; (d) decide whether heavy WebKit scale needs smarter orchestration rather than lower coverage. Source files under `src/`, scoring, original questions, backup, local histories, P60 unresolved issues, physical-device/release gates and branch merges remain untouched.

## P61-D — independent History reference model and lean visual evidence (7 November 2026)

**Status:** Changes committed for CI; do not mark verified until exact-source five-job workflow is green.

### Semantic assertion migration, not mere file concatenation

Three narrower overlapping tests were retired:
- tests/ui-and-navigation.test.mjs: dedicated history filters/sorts completed and in-progress records without mutating source
- tests/p47-history-filters.test.mjs: combines exam ID, exact mode, frozen paper, status, search and sort with AND
- tests/p47-history-filters.test.mjs: stable same-start ordering and no input mutation

**Successor:** `tests/p47-history-filters.test.mjs` now contains a **128-query deterministic model oracle** against an independently written reference predicate/sorter. It constructs all **24 combinations** of three exam IDs × two modes × two immutable paper IDs × two completion states, including identical timestamps that test stable ID tie-breaking. The oracle compares returned attempt IDs with independently selected/sorted records and asserts the entire frozen input is unchanged. Original focused tests for inclusive time-zone-sensitive dates, invalid dates, restored-session rejection, missing imported packages, reset/filter counts and aggregate History metrics remain separate. The existing `history-and-persistence.test.mjs` still exercises Source/Reviewed distinctions and HTML-backed storage indicators.

**Original source:** [baseline commit `e7cdd844a6e009fb5710098234345b3b711323d5`](https://github.com/oneshubhamt/practice-desk/tree/e7cdd844a6e009fb5710098234345b3b711323d5); no source test bodies are permanently lost from Git history. This removes three narrow test registrations and adds one stronger model (net −2 registrations), while preserving all distinct P0/P1 invariants.

### Browser screenshots: correct default behaviour

Seven existing real-browser journey scripts previously generated **25 routine screenshots at seven scripts' call sites per engine** without pixel assertions; none were necessary for the green CI gate, which no longer uploads routine success images. Their capture calls now route through the test-only `scripts/browser/visual-evidence.mjs`. Default: **zero green screenshots**. `PRACTICE_DESK_VISUAL_REVIEW=1 node scripts/acceptance-suite.mjs chromium` explicitly enables the same intended manual review snapshots. Geometry, 195px/140% responsive, contrast, editor, score, frozen data and other assertions remain always-on. Existing per-scenario `h.diagnose()` still captures unexpected failures. Two Node tests independently verify the opt-in gate, no default capture and a real opt-in screenshot mock path. No changes to the app's own image handling.

### Historical vendor feasibility retirement (not production QA)

- `scripts/probe-p47-vendors.mjs` was a one-off bundle-size/vendor feasibility experiment and explicitly not production inclusion.
- `scripts/acceptance-p47-5a-vendors.mjs` was an **unused**, never-CI-invoked disposable browser probe, requiring its separately generated HTML fixture. It tested a raw vendor editor, **not** the actual Practice Desk authoring UI. The vendor-only undo-button experiment is intentionally archival, **not** claimed as a live application undo test. Live app Wordgard, table creation, TeX/MathML, mount/unmount and offline flows are covered by the existing real-browser `acceptance-authoring-visual`, `acceptance-authoring-publication`, `acceptance-p47-math`, and `acceptance-p54-authoring` suites.
- Both programs remain fully available at the [immutable baseline](https://github.com/oneshubhamt/practice-desk/tree/e7cdd844a6e009fb5710098234345b3b711323d5) for a future opt-in vendor microbenchmark if needed. **No executed CI scenario or application feature was removed.**

### Exact-source acceptance criteria

- 40 prior root Node tests plus new visual evidence test: 41 files in `tests/` ending `.test.mjs`; three retired registrations plus one History reference-model and two visual-evidence tests = net unchanged test registrations overall, with stronger oracle and fewer redundant test cases.
- Browser runner still validates and executes **32 Chromium + 20 Firefox + 20 WebKit = 72 mandatory real-browser scenarios**. Its auto-discovery excludes the historical vendor probe already, so removing it is not a silent test skip.
- Test-only screenshots must default to off and opt in exactly when requested; on unexpected browser failure `h.diagnose()` remains enabled.
- Compare against previous [full-green P61-C run](https://github.com/oneshubhamt/practice-desk/actions/runs/42331170060), overall **305 s**; browser job times Chromium **161 s**, Firefox **104 s**, WebKit **243 s**. Do not claim any new speedup before a fresh exact-SHA run.

### P61-D exact-source verification — PASS

**[All five CI jobs succeeded — run 42361411781](https://github.com/oneshubhamt/practice-desk/actions/runs/42361411781)** for source commit [`337f1c7789a38b8cfdbcd86561b9488f2fd1fcc1`](https://github.com/oneshubhamt/practice-desk/commit/337f1c7789a38b8cfdbcd86561b9488f2fd1fcc1). Node.js 24 strict TypeScript/build/contract gate: **432/432 Node test cases green**, including the 128-query independent History model and exact screenshot opt-in contract. Three actual offline browser engines: Chromium **32/32**, Firefox **20/20**, Linux WebKit **20/20** original scenario executions green; each pool reported one browser launch with independent contexts. Guarded source-verified HTML publication green.

| Observed metric | P61-C (run 42331170060) | P61-D (run 42361411781) | Change |
|---|---:|---:|---:|
| Full workflow created→updated | 305 s | **267 s** | **12.5% faster** |
| Chromium job | 161 s | **141 s** | 12.4% faster |
| Firefox job | 104 s | **98 s** | 5.8% faster |
| Linux WebKit job | 243 s | **193 s** | 20.6% faster |
| Mandatory browser scenarios | 72 | **72** | no loss |
| Node test cases | — | **432 passed** | property replacement/visual opt-in verified |

Compared with the earlier P61-B [351-second baseline](https://github.com/oneshubhamt/practice-desk/actions/runs/42330017407), P61-D's 267 seconds is a **23.9% one-run reduction** through P61-C+D combined. These are observations from GitHub-hosted runners under nonidentical conditions, **not controlled repeatable performance benchmarks or guarantees**. Passing runs no longer generate 25 full screenshot captures per engine; human opt-in screenshots remain supported but full real-browser opt-in image review has not separately been performed. This is real execution and storage/I/O improvement, although **the majority of test case bodies are deliberately preserved**. More genuinely redundant tests may be retired only with explicit assertion-level evidence and adversarial/model equivalents.
