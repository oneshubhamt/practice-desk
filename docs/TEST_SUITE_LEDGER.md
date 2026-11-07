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

## P61-E — semantic duplicate retirement in four domains (7 November 2026)

**Baseline:** immutable verified P61-D commit [`24831f7bd475e042cfa8b12529b6c462201022d8`](https://github.com/oneshubhamt/practice-desk/tree/24831f7bd475e042cfa8b12529b6c462201022d8), [CI 42361411781](https://github.com/oneshubhamt/practice-desk/actions/runs/42361411781), **432 Node tests passed**, **72 browser journeys passed**. Retired individual test bodies remain recoverable at the pinned baseline. This pass is **not verified until exact-source CI passes**.

| Domain | Retired narrow test(s), baseline source | Stronger current owner / evidence preserved |
|---|---|---|
| Scoring and exam policy | `content-and-provenance`: G01/G02/F01/F09 session timer smoke | `session-and-timing`: independent seeded timing model, manual expiry, frozen section durations; `exam-scoring-and-policy`: G01 and G02 engine invariants |
| Scoring | `content-and-provenance`: G03/G09 marks ceiling/floor smoke | `exam-scoring-and-policy`: G03 per-level legality tests, seeded **200-policy independent scoring/reference arithmetic and marks ceiling/floor** |
| Scoring | `content-and-provenance`: G04/G05 invalid answer key smoke | `exam-scoring-and-policy`: dedicated G04 multi-select cardinality plus G05 matching distinct-endpoint rejection (includes both duplicate-right and duplicate-left) |
| Scoring/privacy | `content-and-provenance`: G06 no-review results tab smoke | `exam-scoring-and-policy`: G06 source-frozen no-review full completed attempt, navigation and summary/timing tabs |
| Candidate response | `content-and-provenance`: G07/G08 transient draft / matching duplicates smoke | `ui-and-navigation`: detailed G07 unsaved draft and rendered controls, G08 multiple duplicate/endpoints/blank targets |
| Storage | `history-and-persistence`: additive merge illustrative case | Retained `generated additive merge is deterministic, idempotent, ordered and non-destructive`: **200 seeds**, independently derived first-encounter oracle with active-ID guard |
| Storage | `history-and-persistence`: new-record CAS illustrative case | Retained `seeded two-tab compare-and-swap interleavings`: **250 seeds × 150 transitions**, and `new-record CAS, current revision zero and saved revision progression` explicit missing/zero/stale matrix |
| Authoring | `authoring-domain`: separate six-kind publisher-to-scorer smoke | **Moved each original scoring assertion** (4 correct, 1 incorrect, 1 pending, exact 4×2.5−5/6) into the existing `P47-5D all six kinds publish` test; **one publication** now validates hashes, policy and actual scoring |
| Authoring | `authoring-domain`: literal dollar/HTML text example | Existing **128 deterministic Unicode/math/HTML-rich validation cases** augmented with explicit retired sentinel text, script-looking content, and idempotence |
| Learning/revision | `revision-evidence`: five measured slow answers separate fixture | `learning-and-analytics`: the same five measured answers now verify both bucket median/speed counts **and** `revisionInventory` selected slow items, observed attempts and distinction between slow-wrong and slow-correct |

### Quantitative impact and gates
- **10 removed test registrations** across five files; **no new registration**. Expected total **432 → 422** while retaining all distinct behavioural assertions; this is a substantive duplicate retirement, not merely renaming suites.
- In the five changed modules, expected source length falls by about **5.8 KB**. The authoring-to-scoring publication and learning-to-revision fixtures now execute only **once** each instead of constructing two equivalent source records; exact original assertions remain in the surviving tests. The 200-case scoring oracle, 250×150 CAS model, 200-case merge reference, 128-case rich validation, and actual three-engine browser witnesses stay intact.
- No changes to application code (`src/`), production import/authoring rules, FSRS, frozen records, exams, historical banks, CI thresholds, or guarded publication. Existing **32 Chromium + 20 Firefox + 20 Linux WebKit** acceptance journeys remain the regression gate.
- QA claim must be supported by exact-commit GitHub Actions result: strict Node/TypeScript/build, 422/422 Node tests (if all pass), 72/72 real browser journeys, guarded source-verified HTML publication. If a moved assertion fails, fix the test or reject the consolidation, **not** the production logic or a distinct invariant.

### P61-E final exact-source QA — PASS

**[GitHub Actions run 42370584683](https://github.com/oneshubhamt/practice-desk/actions/runs/42370584683)** independently ran the five-job gate for [`741c19d257c2c6254810a43d0cb85dd7102c8426`](https://github.com/oneshubhamt/practice-desk/commit/741c19d257c2c6254810a43d0cb85dd7102c8426).

- Node 24 TypeScript, reproducible build and Node contracts: **422/422 passed**. Verified in the job log.
- Real offline browser assertion journeys: **32/32 Chromium**, **20/20 Firefox**, **20/20 Linux WebKit**, each with one pooled browser launch and explicit per-scenario PASS records in the respective logs (72/72 total).
- Guarded publisher: **PASS**, after all other jobs succeeded.
- Whole workflow wall time: **261 seconds**; baseline previous P61-D 267 seconds. One-run difference **6 seconds (2.2%)**, not a trustworthy steady-state latency claim. The meaningful improvement in this pass is **ten genuinely overlapping case registrations retired and reused integration fixtures**, not advertised CI speed.
- Git compare from P61-D source `24831f7bd475e042cfa8b12529b6c462201022d8` to `741c19d257c2c6254810a43d0cb85dd7102c8426` confirmed changes only to **five `tests/` files and two documentation files**: zero changes to `src/`, question content, CI, scripts, compiled HTML or releases.

**Residual programme:** P61-E is closed with measurable duplicate retirement. The overall semantic test-bench consolidation remains iterative: remaining domain tests must be mapped case by case before further retirement; distinct browser/real PDF/full-scale/recovery/FSRS/safety coverage must never be removed for a lower suite count. Current pass does not claim to solve any deferred P60 application defects or actual physical Safari/accessibility verification.

## P61-F — four-domain assertion ownership, property-based recovery and fixture deduplication (7 November 2026)

**Pinned baseline:** [P61-E final branch commit](https://github.com/oneshubhamt/practice-desk/tree/bee1f838361c0383227a056d67a32992a60e30f8), [P61-E exact-source full-green CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42370584683): **422 Node cases** and **72 actual browser journey executions**. Original retired test bodies can be inspected at this immutable Git SHA; no information depends on descriptive deletion claims alone.

### Assertion-by-assertion disposition

| Domain / prior registration (exact title abbreviated) | Independent retained owner or migrated evidence | Treatment |
|---|---|---|
| Session: `overshoot splits sectional timing and closes sections without double counting` | `seeded sectional automatic overshoot splits exact limits and closes each section once`; `F01: automatic multi-section clock stores exactly one closure` | Retired short smoke; keep independent elapsed/response/section conservation reference |
| Scoring: `scoring uses explicit rules and excludes invalid questions` | `seeded independent scoring reference: precedence, marks ledger, verdicts, exclusions and bounds` (200 reproducible seeds) | Retired three-assertion example; seed model checks invalid/under-review, wrong, marks, counts and bounds |
| Session: `G02 adjacent: automatic sectional expiry still advances across overshoot; early submission works` | Seeded automatic sectional state model plus `delayed submit cannot accidentally finish the next section after a timeout` | Retired overlapping integration example; distinct manual-expiry and no-early-submit tests retained |
| Six-kind scoring: `all six answer kinds and written pending have a frozen automated ceiling` | `a non-CGL paper completes all six response types through the same engine`, P47-5D published/scored six kinds and 90-seed six-kind analytics denominator (10 automatic marks, pending free-response, blank count) | Retired direct duplicate; kept executable engine journey and scoreable max proof |
| Package import: `validated advanced six-kind package still retains manual grading separation` | Same actual six-kind engine journey and analytics model, plus P47-5D manual pending | Retired second direct pending/ceiling smoke |
| Storage validation: `P48-4 current legitimate timer and response rows still validate` | Added both original positive controls to `P48-4 reject impossible clock/timer snapshots` before its negative adversarial matrix | Retired redundant standalone setup, no safety check removed |
| Authoring: `P47-5D rejects tampered already-published mathematical/source/key hashes` | Moved all three exact negative checks into the **existing real six-kind publication** test; added a six-kind mutation loop tampering independently with each published question's prompt and asserting the authentic source is unchanged | Retired separate compilation, materially strengthened content integrity |
| Learning: `evidence progression requires independent attempts and distinct questions` | 300-seed independent `evidenceProgression` model covers classifications/thresholds; the specific two attempts/one question, unanswered topic metrics assertions moved into `topic evidence and trends never compare different paper revisions` | Retired duplicate fixture and preserved all topic counters |
| Storage: `complete backup v4 preserves records and preferences` | Moved exact heterogeneous note/package/learning record controls into existing 0,1,7,101,5000-record SHA-bound backup property, including modified-field rejection; duplicate IDs already checked there | Retired separate backup creation |
| Recovery: `completed record always defeats stale active mirror` | New independent **576-combination** reference/selection contract, retaining old fixed examples verbatim | Replaced |
| Recovery: `revision-aware recovery cannot revive an older tab's emergency mirror` | Same exhaustive model tests missing, equal, older and newer save revisions vs all terminal and updated timestamps; exact old examples retained | Replaced |
| Recovery: `an older completed mirror cannot supersede a newer in-progress revision` | Same reference model verifies protected stored revision before completed-older mirror; original directed check retained | Replaced |

The three recovery unit tests become **one property/reference-model test**. Its cross-product comprises 4 save-revision states × 4 mirror revisions × 2 completion states × 2 mirror completion states × 3 stored timestamps × 3 mirror timestamps = **576 deterministic cases**. Every case checks returned object identity and nonmutation of both inputs; the original directed boundaries plus absent/mismatched IDs remain explicit. The reference model is coded in the test and does not invoke production `chooseRecovered` to derive its expected result.

### Measured static scope and mandatory evidence

- **12 original individual test registrations removed, one new property test introduced**: expected Node total **422 → 411 (−11)**. Six affected Node modules in four requested domains plus `history-and-persistence`; ordinary and adversarial retained tests remain individually registered.
- No path under `src/`, question packages, release HTML, browser runner, CI workflow or browser acceptance scripts is changed. **32 Chromium + 20 Firefox + 20 Linux WebKit** real offline journeys remain mandatory.
- Keep the existing independent **200-seed scoring reference**, **250×150 two-tab CAS model**, **200-seed additive backup model**, **128-rich-input Unicode model** and **300-seed learning evidence progression model**. Prevent inadvertent weakening of those established guards.
- **Verification status: pending the exact changed-commit CI**. Required evidence: 411/411 Node cases, strict TypeScript/build, all 72 source-mapped actual browser journeys and guarded verified source publisher. Only a green run may close P61-F; if model assumptions prove incorrect, repair the test oracle from real domain contract, not by suppressing checks or modifying production source.

### Limitations

This pass removes duplicated illustrative tests and makes recovery coverage more exhaustive; it **does not demonstrate mutation-testing percentage** or validate real Mac Safari, assistive technology or physical-device storage. Do not equate lower Node case count with stronger overall quality without comparing surviving assertion contracts. Deferred P60 product defects remain outside this programme.

### P61-F independently verified completion — PASS

**[Five-job exact-source run 42373176697](https://github.com/oneshubhamt/practice-desk/actions/runs/42373176697)**, source commit [`56a10e7cf754e90f3499ef1994bc872591d92a8f`](https://github.com/oneshubhamt/practice-desk/commit/56a10e7cf754e90f3499ef1994bc872591d92a8f), completed successfully. Read **raw execution logs**, not only UI badges:

- **411/411 Node 24 tests passed**, zero failures; including the new 576-case saved/mirror reference property, six-kind authenticated publication/tamper checks, strict TypeScript and deterministic build.
- Browser journey log entries: **Chromium 32 unique /32 expected**, **Firefox 20 unique /20 expected**, **Linux WebKit 20 unique /20 expected**. Each runner reported one shared browser launch with independent contexts. Total **72/72 actual source-mapped scenarios passed**, unchanged from P61-E.
- Guarded source-verified standalone offline HTML publication: **passed**.
- Raw GitHub workflow duration created→updated: **251 s**; P61-E's 261 s previously, single-run difference **10 s (~3.8%)**. Job durations: core 40 s, Chromium 169 s, Firefox 132 s, WebKit 196 s, publish 6 s. Browser process timings vary with shared GitHub runners, so do not claim reliable speed improvement; the **substantive effect** is stronger reference coverage and 11 fewer overlapping test registrations.
- GitHub exact-source compare shows **only seven `tests/` files and two `docs/` files changed** from P61-E baseline [`bee1f838`](https://github.com/oneshubhamt/practice-desk/tree/bee1f838361c0383227a056d67a32992a60e30f8); **zero** production `src/`, question bank, acceptance-script, CI, build or release changes.

P61-F can be marked **closed**. Further reductions remain an evidence-driven programme, not an instruction to delete uniquely valuable test bodies for a lower count. Native Mac Safari, mobile/assistive technology, and deferred P60 application defects were not assessed here.

## P61-G — assertion ownership and real mutation-sensitivity gate (7 November 2026)

**Pre-P61-G source:** [`3bfd7dc2d97e7c74c2d93289b6648fc716118b50`](https://github.com/oneshubhamt/practice-desk/tree/3bfd7dc2d97e7c74c2d93289b6648fc716118b50); [P61-F five-job green CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42373176697), with **411 Node tests / 72 browser journeys**. **Verification:** completed at the exact changed source SHA and CI run recorded below.

### Semantic duplicate dispositions

| Retired registration | Preserved original assertions and stronger live owner |
|---|---|
| `content-and-provenance`: `rejects unknown options and out-of-bounds responses` | `exam-package-and-import` has an independent six-kind validation matrix: accepted single choice and five other kinds, unknown choice, under/over-selected multi-choice, finite/numeric bounds and duplicate pair endpoints |
| `content-and-provenance`: `generic scoring matches CGL configured marking rules` | `October 6 Q62` source-vs-reviewed witness asserts **+2 for correct, −0.5 for wrong and exclusion in original**, with all five frozen source/reviewed families pinned. The 200-seed scoring model independently checks per-item ledger arithmetic |
| `p48-security-integrity`: `existing six-kind authored package stays importable under the strict schema` | Both positive controls (valid six-kind schema and the 2-question APFC/NAT simple-bank import) **moved verbatim** into the retained 18-boundary unsigned-field adversarial test; neither validator's acceptance behavior was deleted |
| `p48-security-integrity`: `backup v4 refuses arbitrary envelope or manifest fields even with a matching canonical digest` | Exact success control and envelope/manifest rejection assertions **moved verbatim** into the `history-and-persistence` 0/1/7/101/5000-record SHA/size/id/timestamp backup reference test |

**Net:** 4 narrower standalone Node registrations retired, both positive fixture cases and exact backup unauthorized-field cases retained inside stronger tests. Expected **411 → 407 Node tests**. No original test behavior retired without a source-mapped living check. User-visible app/production TypeScript is unchanged.

### New executable mutation-sensitivity guard, not merely a static audit

`scripts/mutation-sensitivity.mjs` runs in the CI **core gate after the full Node test suite**. It creates a disposable copy of `src/`, `tests/`, `scripts/`, `examples/` and `package.json`, with a symlink to installed dependencies. For **each of six independent semantic mutants**, it:

1. Checks the expected production-source string occurs **exactly once**, then executes precisely one named **unmodified baseline test**, requiring one PASS and zero FAIL.
2. Injects **one** defect into the *temporary copied source only*, reruns that same named test and requires a **named assertion failure** (not missing module, syntax/load failure, exit signal, skipped test or unrelated test).
3. Restores the original sandbox bytes in `finally`, checks their SHA-256, and removes the entire sandbox even on error. All mutants must be killed; any escape is a mandatory CI failure.

| Domain | Deliberate test-only mutation | Detection contract |
|---|---|---|
| Scoring | Unanswered item accidentally receives incorrect-answer marks | 200-seed independent scoring reference |
| Persistence/recovery | Equal stored and mirror revisions no longer protect persisted record | 576-combination independent recovery oracle |
| Persistence/CAS | Next save revision increments by two | Seeded 250×150 tab-interleaving state model |
| Authoring | Published correct-answer value silently inflated by 0.5 | Authenticated six-kind publication→actual scoring |
| Rich content | Plain literal text silently trimmed | Explicit Unicode/HTML/dollar sentinels + 128-input rich-document property |
| Learning | “Insufficient” answered-count threshold erroneously increased tenfold | 300-seed independent progression classification model |

**Interpretation:** a future regression that makes any one of those six test witnesses insensitive to the chosen fault breaks CI. This verifies **six selected faults**, not a full mutation score, proves no outside factual accuracy, and does not validate all code lines. Never claim the new gate is green until it has genuinely run on GitHub.

### Unchanged hard boundaries

- CI must still pass the existing strict TypeScript, reproducible build, 407 Node cases (expected), **32 Chromium + 20 Firefox + 20 Linux WebKit real offline journeys**, and guarded source-verified HTML publishing.
- No changes under `src/`, `examples/`, exam bank files, source vendor code, browser acceptance scripts or public app output; only 3 Node-test files, one new isolated mutation runner, CI wiring and docs.
- Mutation harness is an **additional correctness gate** and may increase core-job wall time; do not confuse it with CI speed optimization.
- Unique tests (PDF extraction, independent scale, FSRS, provenance/privacy, source-content integrity, three-browser journeys) remain intact; physical Safari/assistive-device and deferred P60 defects stay out of scope.

### P61-G exact-source verification — PASS

**[Five-job GitHub Actions run 42375387122](https://github.com/oneshubhamt/practice-desk/actions/runs/42375387122)** finished **successfully** at code commit [`eeecdd51331ff2a847b63f8f0c52e9ad9a354fa2`](https://github.com/oneshubhamt/practice-desk/commit/eeecdd51331ff2a847b63f8f0c52e9ad9a354fa2). This was independently checked against original job logs.

- **407/407 Node tests passed**, no failures, with TypeScript/build/determinism gate green. The four redundant test registrations were removed, while the positive six-kind and APFC/NAT package controls and the malicious v4-backup envelope/manifest rejection were migrated unchanged into stronger surviving matrices.
- **Six of six selected semantic mutations were detected by assertion failures**, after each mutated test also passed against the unmodified source. The gate tests actual temporary mutated implementations, not whether a test file contains expected words; every temp source file was hash-restored.
- Browser execution logs report **Chromium 32/32 unique named journeys, Firefox 20/20, Linux WebKit 20/20**. Each engine retained one pooled browser launch and independent per-journey context. Total **72/72 real browser scenario executions**.
- Guarded source-verified offline HTML publisher: **PASS**, after core and all three browser engines.
- Observed GitHub workflow elapsed **244 s**, compared with P61-F **251 s**; this is a **single pair of hosted-runner observations**, not controlled performance improvement. Core job took **53 s** versus prior **40 s**, incorporating the extra mutation gate; Chromium **173 s**, Firefox **104 s**, WebKit **160 s**, publisher **8 s**.
- GitHub comparison from original P61-F closing docs to exact tested commit contains only three amended test modules, one amended authoring property test, one new isolated mutation script, two docs and a two-line workflow addition. **No production source (`src/`), exam content, browser scenario, published application build contract or release logic changed.**

**Detected and repaired blind spot:** the first P61-G run, [42375118704](https://github.com/oneshubhamt/practice-desk/actions/runs/42375118704) on pre-fix commit `eaaa1367440226e0991045f65a34884d69fd8b11`, correctly **failed** because the original rich-text property allowed a deliberately introduced `trim()` defect to survive. We did **not** remove that mutant. Instead, the existing authoring property gained explicit leading/trailing-whitespace sentinels and four deterministic boundary variants for each of 128 generated strings, then all six mutations were killed on rerun. This is concrete evidence that the mutation gate improved test sensitivity.

**P61-G status: COMPLETE.** This pass improves confidence in selected contracts, not a measured global mutation score. Further semantic reductions should preserve unique source, PDF, FSRS, recovery, browser and statutory-content safeguards. No merger into `overhaul` was performed.

## P61-H — independent coverage and mutation-sensitivity audit (8 November 2026)

**Status:** Pending changed-source CI verification. The authoritative 12-contract audit is [P61-H independent coverage matrix](audits/P61_H_INDEPENDENT_COVERAGE_AUDIT_2026-11-08.md); do not duplicate its source/case crosswalk here.

- Reinspected surviving 41 Node suite files, production contracts and the 32/20/20 browser manifest. **No further mass deletion is justified** by test-name similarity: PDF intake, source review and revised-edition lineage protect different stages; the same applies to scoring vs signed package vs browser, and backup checksum vs snapshot vs corrupt-sibling quarantine.
- Found the 200-seed independent scorer model is **single-choice only**. Added a 128-seed six-kind independent reference with bijective answer-ID remapping and input permutations (expected Node 407→408); this is additive, not a replacement for integration tests.
- Expanded six baseline semantic mutations to **ten named source-isolated faults**, adding exact multi-select set matching, v4 backup SHA, actual corrupt-PDF EOF recognition and explicit FSRS rating preservation. Only named baseline-green and mutated assertion-fail outcomes count.
- Recorded unresolved **P60-01/02/03/04/05/07**, non-independent PDF transcription/authenticity, actual Mac Safari/mobile/assistive tech and human UI approval as separate release/content work.
- Corrected stale Satyam-only authorization in `AGENTS.md` and outdated CI-per-script descriptions in `docs/TEST_STRATEGY.md`; current scope is user-authorized `overhaul`.
- **Mandatory closure:** changed SHA with strict TypeScript/rebuild, 408/408 Node tests, 10/10 named mutants killed, all 72 three-engine journeys executed, and protected publishing. P61-I remains for final programme-wide source/ledger reconciliation.
