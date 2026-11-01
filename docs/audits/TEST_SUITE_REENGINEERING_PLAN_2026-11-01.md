# Practice Desk — Test-Suite Re-engineering Programme and Live Scratchpad

**Status:** PLAN APPROVED FOR PREPARATION; IMPLEMENTATION NOT STARTED  
**Prepared:** 1 November 2026  
**Branch:** overhaul only  
**Audited base:** 12f2156d5967f73eabd74b0443bcc28f789167da  
**Baseline successful workflow:** [CI 41283842614](https://github.com/oneshubhamt/practice-desk/actions/runs/41283842614)  
**Scope/order:** **Tests first (Passes 36–42) → browser scripts and CI second (Passes 43–49) → documentation and final acceptance last (Pass 50).**

> This file is the programme's **sole evolving implementation plan, traceability register and work scratchpad**. Update it *during* each pass: audit, alternatives/decision, change ledger, objective-by-objective check, actual targeted QA and remaining uncertainty. Do not rely on chat history as the source of truth. Existing [AGENTS.md](../../AGENTS.md), [Section G of the original source audit](V11_SOURCE_AUDIT_2026-10-30.md), [decision register](../decisions/POLICY_REGISTER.md) and historical audit artifacts remain controlling for existing product/source/editorial contracts until the final documentation reconciliation. This new programme does not reopen v11 feature-parity decisions or authorise feature regressions.

## 0. Scope, intent, hard constraints

The objective is **better assurance per maintained test and per CI minute**, not to reduce tests for the sake of an arbitrary file-count or runtime target. The current application is a generic, single-file offline exam engine; it is not an SSC CGL-specific runtime. Its intended superset relationship to v11 is a **product contract**, not a requirement to execute v11 on every source change.

1. **No product regression:** preserve all material user-visible features of overhaul, including v11-derived functionality, Results hierarchy, compact exam layout, floating detached Aa, *non-sticky* main header, generic six-kind exams, imported APFC/NAT banks, review/source provenance, native Navigation API, FSRS Learning, offline storage, and responsive/accessible controls.
2. **No changes to frozen data:** preserve papers.json, patches.json and solutions.json identities, original/reviewed separation and the expressly approved 6 October CGL Q62 rule: original invalid/excluded; reviewed caution is scoreable using disputed published B (+2/−0.5). Preserve the other approved corrected-key semantics. Keep content hash checks and tamper resistance.
3. **No scoring regressions:** explicit rule precedence, proper positive/negative/unanswered marks, exact configured fractions up to normal floating arithmetic, partial-credit cap at full marks, conservative floor, manual-pending separation, and frozen eligible denominators. No answers pre-submission.
4. **No storage/data loss:** immutable attempts, compare-and-swap revision safety, stale-tab rejection, quota/fallback/error handling, additive checked v3 backup import, no silent replacement or v11-history migration.
5. **No architecture rollback:** native Navigation API only (no compatibility/router shims), modular typed source, a single six-kind engine, one generated self-contained HTML. Never hand-edit generated HTML.
6. **Only overhaul changes; no merge to main or baseline/v11.** CI-generated HTML publication remains gated on successful verification, with safe source drift detection.
7. **Preserve old CI gates until replacements demonstrably pass.** Do not remove Pass29 or another mandatory legacy check just because it looks redundant; prove the mapped modern test(s) and documented acceptance before retiring it. Current AGENTS.md mandates Pass29 and Pass30, so its update/override is part of Pass50; before that, use additive checks and preserve legacy gates.
8. **Phase discipline:** Passes 36–42 may edit test files, fixtures, test-only dependencies and the minimum test discovery/config needed; avoid changing existing browser scripts or CI. Passes 43–49 may edit scripts/test-runner/CI and remove superseded scripts only after coverage migration. Existing README, AGENTS, architecture/docs-index and historic audit prose are updated in Pass50 only; this plan/scratchpad is the explicit planning exception.
9. **Production defects found by stronger tests:** record a finding, reproduce with a red test, inspect source consumers, fix the smallest valid source area if needed, and prove no collateral regression. Do not relax the test, invent unsupported product policy, or silently redefine scoring to get green CI.
10. **Evidence honesty:** headless Playwright is not real-device, human aesthetic, or NVDA/VoiceOver certification. Do not label an area certified merely because simulated states pass.

### Current measured baseline (not performance targets)

| Measure | Audited finding / evidence |
|---|---|
| Application source excluding large JSON content | 49 src files, ~447,778 bytes |
| Ordinary tests | 31 .test.mjs files + one fixture; ~181,848 bytes together; approximately 156 named tests |
| Bespoke QA scripts | 25 scripts, ~286,011 bytes (excluding build.mjs and paper-select.mjs) |
| QA code vs source code | ~467,859 / 447,778 bytes = **1.04×**, size alone does not establish waste |
| Latest successful CI | Four parallel jobs; main checks ~4m18s; end-to-end workflow ~4m22s; runner minutes across jobs approximately 7m |
| npm run check in main job | ~7 seconds including TypeScript/build/Node tests |
| Duplicated checks | npm run check performed in four jobs |
| Browser hot spots | 20+ sequential Chromium-oriented scripts; duplicate Pass15 regular + laptop matrix; independent Pass29 job |
| Pass29 provenance | 184 scenes / 56 frozen-v11 paired states, ~26 MB historical screenshot artifact |
| Visual coverage limitations | no real device/AT or human aesthetic signoff; most new feature journeys Chromium-specific |
| Dependency provenance | package.json pins direct versions, but audited branch tree contains no tracked package-lock.json; npm install runs separately in CI |

These measurements are **specific to 1 November 2026 CI**. Remeasure the same metrics after changes on comparable runner(s). Do not infer precise per-script savings solely from file sizes or screenshot counts.

## 1. Finding register and non-negotiable acceptance coverage

Use these stable IDs in pass logs, commits and objective checks.

| ID | Priority | Problem / contract to fix | Scheduled pass(es) |
|---|---|---|---|
| TS-01 | High | Historical pass-number test files obscure feature ownership and produce overlap | 36, 42 |
| TS-02 | High | Mathematical tests are example-heavy; independent property and boundary oracles missing | 37, 38, 39 |
| TS-03 | High | NAT/relative tolerance, decimal precision and scoring bounds need deeper adversarial coverage | 37, 39 |
| TS-04 | High | State-machine interleavings, resume timing, stale tabs and data integrity need stronger generated checks | 38, 40 |
| TS-05 | High | Generic exam import, large-but-valid and malicious input boundaries have limited assurance | 39, 41, 47 |
| TS-06 | Medium | Learning, stats/analytics and UI-state contracts are scattered across passes | 41, 42 |
| TS-07 | High | Many independently launched overlapping E2E scripts and fixtures | 43–45 |
| TS-08 | High | Frozen-v11 paired screenshots and exact historical geometry overstay their migration purpose | 45, 49 |
| TS-09 | High | Multi-browser breadth misses modern critical user journeys; native API support must be tested truthfully | 46 |
| TS-10 | Medium | Accessibility audit lacks a rules-based semantic gate and realistic keyboard/zoom route coverage | 41, 45, 46 |
| TS-11 | High | CI repeatedly runs core checks; browser orchestration, artifacts and write permissions are oversized | 43, 48 |
| TS-12 | Medium | Historical Pass21-versus-Pass22 DOM benchmark remains a live regression gate | 47, 49 |
| TS-13 | High | Old AGENTS and doc index mandate an obsolete future acceptance structure | 50 |
| TS-14 | Medium | No explicit one-to-one legacy-check → durable contract migration ledger | 36 and every later pass |
| TS-15 | Medium | Flakiness, deterministic fixtures, artifacts, runner/browser/dependency reproducibility need explicit policy | 36, 43, 46, 48 |

### Product contract matrix — never delete its last independent check

| Contract family | Must remain demonstrably tested |
|---|---|
| Content/provenance | Exact frozen CGL banks, five originals + five reviewed editions, editorials/Q62, hashing, image/stimulus refs, self-contained offline HTML |
| Exam setup | Original vs Reviewed controls filter actual paper options; custom imports separately grouped; saved selection; strict/flexible/single and optional untimed freeze appropriate policy |
| Generic input | All six answer kinds; valid/invalid checkbox drafts; matching uniqueness; NAT numeric boundary; written manual grading; no pre-submit keys |
| Marks | Section/question/kind/default rule precedence; correctness, wrong, blank, excluded, pending, partial and ceiling/floor; negative totals; exact APFC −5/6 and CGL rules |
| Time/navigation | Whole-paper/sectional/untimed; locked sections; pause/expiry/overshoot/background/rollback; native Back/Forward/reload/deep links; accessible result-tab routes |
| Frozen evidence | Score/date/revision/edition/eligible maximum; time and visits accounting; no rewriting completed scores; honest unavailable states |
| Persistence | IndexedDB, fallback, quota-denial recovery, resume, stale-tab conflicts, backup checksum/additive import, delete/discard lifecycle |
| Learning | FSRS user rating, notebooks/revision lineage, analytics/methodology, frozen media, no false mastery from tiny sample |
| UI/accessibility | First-fold Library Start and Exam answer/actions where intended; nonsticky header with detached fixed Aa; popover placement/focus; responsive/tiny zoom and contrast; low-data Results conditional cards; keyboard and ARIA |
| Platform/release | Actual file://, no network requirement, generated-distribution deterministic check, representative Chromium/Firefox/WebKit journey or explicit unsupported-engine result |

### Testing standards and mathematical oracle rules

- Keep **example tests** for intentional editorial policy, historical regressions and comprehensible boundary cases. Add seeded property/model-based tests where a *general invariant* exists; do not make randomly generated “coverage” obscure failures.
- Seed and record every generated case; failures must be reproducible and ideally shrink to the minimal case. Select a maintained property-test library only if its added complexity is justified, otherwise implement a small deterministic generator; avoid two competing frameworks.
- **Independent oracle:** derive expected arithmetic from the written contract or a tiny reference model, not by invoking the production function under test to calculate both expected and observed values.
- **Floating arithmetic:** no false claims of exact binary rational representation. Test −5/6 with a mathematically justified tolerance; compute totals before presentation rounding. For equality of large sums use an absolute/relative epsilon scaled to magnitudes, and separately test displayed decimal formatting and negative zero.
- **Core score invariants:** item marks sum to snapshot earned; positives minus penalties equals earned; scored result lies between conservative lower bound and nominal full-credit maximum; excluded = zero; pending automated = zero; no partial exceeds full marks; valid correct/blank use the applicable override; no presentation setting changes the underlying score.
- **Response validity:** multiple-select set uniqueness/cardinality; matching endpoint uniqueness; NAT exactly on/outside tolerances and multiple accepted values; manual evaluation remains separate; invalid/unknown responses never acquire an apparently correct score.
- **Timing invariants:** monotonic/nonnegative accounted elapsed, no double assignment, pause/expiry freezes the appropriate state, sectional allocation respects the selected policy, terminal session cannot resume or alter scored results; timestamps are synthetic, not sleep-based.
- **Analytics invariants:** percentage denominators are the frozen scoreable maximum, distinguish actual correctness from coverage, do not classify speed without sufficient sample, do not invent times when data is absent, do not aggregate incompatible paper revisions.
- **No fragile benchmarks:** memory/time measurements require stable setup and tolerance; no fixed Pass21/P22 baseline SHA or browser-specific pixel equality as an ongoing product invariant.

## 2. Migration ledger: ordinary tests (Phase I)

The target is capability ownership, not a fixed number of target files. Do not remove the last test for a unique behaviour. Names below describe **intended ownership**, not a command to mechanically concatenate.

| Planned owner | Current test files (substantive cases to map) | Primary pass |
|---|---|---|
| Content and provenance | content.test, import-cgl.test, cgl-practice.test, pass16-independent, pass23-independent | 36, 42 |
| Schema and generic import | domain.test, exam-package.test, generic-exam-flow.test, pass12-review, pass17-contracts, pass30-bank | 39, 42 |
| Scoring and numerical policy | engine.test, pass16-independent, pass17-contracts, pass20-preflight, pass23-independent, pass30-bank | 37, 42 |
| Session/timing/navigation semantics | engine.test, pass7-engine, pass17-contracts, pass18-timing-deletion, pass32-navigation | 38, 42 |
| Persistence/recovery/history | backup.test, storage-concurrency.test, history.test, pass6-integrity, pass13-history, pass18-timing-deletion, pass19-history | 40, 42 |
| Results/evidence/analytics | pass9-ui, pass14-analytics, pass19-history, pass20-preflight, pass21-contracts, pass22-response, pass28-semantics | 41, 42 |
| Learning and review lineage | learning.test, pass8-learning, pass12-review, pass14-analytics | 41, 42 |
| UI model/markup and security | build.test, generic-ui.test, pass9-ui, pass21-contracts, pass22-response, pass28-semantics | 41, 42 |
| Shared fixtures | tests/fixtures/six-kinds.mjs and inline reconstructed states | 36–42 |

**Implementation rule:** for *each* original test case (not merely each file), mark **retained unchanged / migrated / merged into a stronger test / historical-only / intentionally removed**; supply replacement path and assertion identity for anything merged/removed. Source-hash and Q62 explicit cases are permanent. Keep test discovery accurate throughout (current package script uses tests/*.test.mjs, so either preserve flat file discoverability until deliberate script changes, or prove nested discovery before moving).

## 3. Migration ledger: browser scripts (Phase II)

Every script below must have a disposal decision tied to real capability assertions **before deletion**. “Remove from mandatory CI” and “delete source file” are separate decisions. Preserve the historical commit/artifact URL in final docs; never commit large screenshot archives to the repo.

| Current script | Distinct behaviour that must transfer | Provisional destination / disposition |
|---|---|---|
| smoke-offline.mjs | Offline CGL and generic end-to-end, restart, quota, backups, Learning | **Retain substance**, divide into coherent modern smoke journeys |
| pass10-platform.mjs | Real browser storage/load/reload, 80-record smoke | Fold into shared cross-browser critical journeys |
| pass11-parity.mjs | Keyboard, immersive, section states, confirmation, background clock | Port missing user-observable assertions |
| pass12-parity.mjs | Source/review media, corrected key, generic review/source attribution | Data contract tests + focused browser review journey |
| pass13-history.mjs | Local selection, quota/fallback, filtered history, additive backup, deletion | History/persistence browser journey |
| pass14-parity.mjs | Visits, long-question drilldowns, audit filters, speed evidence | Results/analytics journey |
| pass15-visual.mjs (run twice) | Viewport/contrast/zoom and v11 paired screenshots | Move uniquely useful **modern-only** UX invariants; archive paired evidence |
| pass16-independent.mjs | All ten CGL editions, Q62, frozen archive, Learning route focus | Data tests + critical CGL browser journey |
| pass18-targeted.mjs | Destructive intent, unfinished discard vs completed delete, timer | History & safety E2E |
| pass19-targeted.mjs | Multiple resumables, recents, frozen history denominator | History & scoring E2E |
| pass20-targeted.mjs | Mode setup, preflight, tiny screen, popover/focus | UI contract journey |
| pass21-targeted.mjs | Keyboard radio controls, paused mark, contextual image text, editorials | Accessibility/browser contract |
| pass22-targeted.mjs | Drafts and matching, lazy Results pane, 100-question DOM | Port durable assertions; **retire historical Pass21 benchmark** |
| pass23-independent.mjs | Independent numeric/source review, generic no-review, history | Preserve unique product assertions, archive paired comparison |
| pass25-library.mjs | Library Start first-fold, accessible selection/actions | Modern-only Library viewport contract |
| pass26-exam.mjs | Exam/navigator first-fold and responsive geometry | Modern-only Exam contract |
| pass27-history-results.mjs | History/Results first-fold/content | Modern-only History/Results contract |
| pass28-semantics.mjs | Labels, editorial/timing + display state | Data + browser semantics contract |
| pass29-independent-matrix.mjs | Broad 184-scene historical parity, 56 paired states, generic six-kind journey | **Archive v11 paired harness** only after modern journey/visual coverage is green; keep useful generic journey |
| pass30-ui.mjs | Edition filtering, untimed, template, APFC/NAT import, 195px overflow | **Explicitly retain** substantive critical-path coverage |
| pass31-ui.mjs | Compact navigator/header, marked state, generic + strict journeys | Modern-only layout/interaction contract |
| pass32-native-navigation.mjs | Native API Back/Forward/deep-link/reload and malformed route | Modern navigation E2E, no legacy fallback |
| pass33-results-parity.mjs | Results hierarchy, no false speed cards, review action, mobile/zoom | Modern-only Results contract; retire exact v11 spacing |
| pass34-v11-display.mjs | Aa/focus/popover/theme/scroll; exact v11 visual geometry | Modern-only Display contract; archive exact pixel parity |
| pass35-detached-display.mjs | Detached direct-body Aa, nonsticky header, scrolled routes | **Keep as product invariant** in consolidated UI journey |

**Known overlap clusters:** Pass15 + Pass24 + Pass25–29 + Pass31 + Pass33–35 (screens/geometry); smoke + Pass11–16 + Pass18–23 (flow); Pass22 + Pass33 (Results lazy rendering); Pass34 + Pass35 (Display, with newer intentional nonsticky header). Do not automatically assume all assertions are duplicates: use the per-scenario ledger.

## 4. Pass-by-pass implementation plan

### Phase I — tests first, current browser scripts/CI remain unchanged

**Pass 36 — Baseline, assertion-level map and test architecture**

- **Audit:** record current HEAD, exact Node test enumeration/count, test/fixture imports, all 25 browser scripts and active CI steps, timings and artifacts; read relevant source consumers and legacy Section G.
- **Analyze:** mark invariant vs historical acceptance vs duplicates; produce explicit **assertion-level** migration map and classify essential, useful, optional evidence; choose target test folder/fixture convention, discovery strategy and deterministic generator approach.
- **Implement (test-side only):** create/refine shared pure fixtures and test helpers if justified; establish named contract inventory so future file moves cannot silently drop a scenario; do **not** remove tests.
- **Objective reconciliation:** each existing named Node case and each browser-script capability has a registered owner; baseline measurements reproducible; no source/data drift.
- **Targeted QA:** npm run check, test discovery listing, and relevant fixture consumers. Old full CI remains active. **Gate to P37:** inventory 100% mapped, unresolved scenarios explicitly marked.

**Pass 37 — Mathematical scoring and precision properties**

- Add reproducible adversarial/property tests covering all six scoring kinds, default/kind/section/question overrides, blanks, negatives, excluded/pending, partial cap/floor, correct + incorrect component combinations, maximum/lower bound and precision.
- Maintain a small independent oracle; test APFC 2.5/−5/6 and aggregate rounding only at presentation; CGL +2/−0.5; negative totals; no hidden double counting; numeric display extremes and negative zero.
- Validate unusually generous/harsh partial-credit rules and impossible configurations, not only normal examples.
- **Gate:** all scoring properties pass with recorded seeds; trace existing scoring cases to retained or stronger cases; production fixes only for genuine red-test bugs; no scoring/data changes without demonstrated cause.

**Pass 38 — Session, timing and navigation model-based tests**

- Build deterministic state-machine sequences that exercise legal/illegal events and asynchronous-looking orderings (TICK/ANSWER/NAVIGATE/SUBMIT_SECTION/PAUSE/RESUME/background/restore), multiple timers and huge time jumps.
- Use an independent reference ledger for accounted elapsed and sectional closures; verify pause, expired/terminal immutability, rollback, overshoot and no duplicate time.
- Preserve native Navigation API codec route tests and non-disclosure of answer keys on active routes.
- **Gate:** every existing timer/lock regression maps to a named invariant; property/model suites reproduce seeds and can minimise failures.

**Pass 39 — Numeric entry, answer validity, generic bank and importer boundaries**

- Explicit NAT tests: exactly on/outside absolute tolerance, relative tolerance, zero/negative expected values, combined tolerance, multiple accepted values, representable/nonrepresentable floating boundaries, candidate min/max and nonfinite rejection.
- Test six-kind answer schema and user-reproducibility of keys, multiple-select cardinality, matching right/left uniqueness, manually graded writing and draft unsaved semantics.
- Add fast pure near-limit imports, malformed/adversarial keys, caps and revision-hash/data validation; compare author-friendly APFC/NAT converter output against independent expected policy. Do not make every 2,000-item case a browser test.
- **Gate:** no importer silently truncates or mis-scores; large/invalid inputs fail safely and deterministically; old simple-bank + advanced-package tests still pass.

**Pass 40 — Persistence, frozen records, conflicts and backup integrity**

- Expand deterministic interleaving tests for stale-tab writes, revision collision, active/completed mirror precedence, crash/reload checkpoints and reject-invalid record paths.
- Exercise checksum and merge laws (idempotent, additive, non-destructive, no existing-record overwrite); preserve no-migration policy; ensure deletion/discard lifecycle separation; test backup payload attacks and edge counts.
- Preserve duration/accounted evidence when records reload or move between compatible storage paths.
- **Gate:** immutable saved results and integrity invariants hold; reference source state machine independently where feasible; pure tests remain fast.

**Pass 41 — Analytics, Learning, UI-state/a11y contracts, lightweight stress**

- Consolidate mathematical metrics: frozen denominators, exact section totals, visit counting, timing/median, sufficiency thresholds, negative marks, evidence progression and no unsupported mastery claims.
- Preserve FSRS explicit ratings, notebook source identity, media and revision-test integrity; test non-CGL subject/edition separation.
- Add pure DOM/UI model assertions: display controls/accessibility labels, no pre-submit answer leakage, results conditional cards and review policy; accessible markup checks that can be done without browser are not a substitute for browser audit in Phase II.
- Add deterministic pure maximum-size and hostile content boundaries in memory/runtime budgets.
- **Gate:** stats/learning results have independent expected values; no unsupported historical data is fabricated.

**Pass 42 — Test consolidation and Phase-I exit**

- Merge/rename pass-numbered Node suites into capability files; eliminate *semantically duplicated* examples **only after** comparing assertions and strengthening independent tests. Keep clear fixtures and one test framework.
- Refresh the test-case migration ledger with before/after counts, coverage families and uncovered items; ensure Node runner discovers every migrated test.
- **Targeted QA:** affected capability suites per edit; **full npm run check and unchanged four-job CI** once at the Phase-I exit (not after every case move); report any failures and remedies.
- **Hard gate to Phase II:** no loss of a unique essential assertion, no remaining opaque pass-number Node suite without documented reason, no product/regression drift, old E2E CI green. Do not retire old browser scripts yet.

### Phase II — browser scripts and CI; preserve old gates until replacement coverage is proven

**Pass 43 — Common browser runner, fixtures and measured execution model**

- Establish one maintainable browser acceptance runner (may use Playwright runner or a small shared orchestrator—justify choice), fixtures for file:// distribution, browser creation, isolated profile/storage, exam selection, source/review selection, stable input, viewport, error capture and evidence on failure.
- Pin Playwright-managed browser revisions or clearly documented browser versions; avoid geometry assertions against an uncontrolled system Chrome. No network required by application under test.
- Keep tests independent with clean contexts, avoid timing sleeps and brittle global state; purposeful test sharding/parallelism only when deterministic.
- **Gate:** common runner reproduces representative existing journeys; new and old checks pass before script deletion.

**Pass 44 — Consolidated offline critical E2E journeys**

- Implement coherent **modern app** journeys for Library → Exam → Results → History → Resume, CGL strict/flexible/single plus optional untimed; original/review source; generic six kinds, writing manual grade and review policy; APFC/NAT author import, scoring and offline template.
- Add backup/restore, storage fallback/quota, interruption/stale-tab/delete safety, FSRS revision/learning journey as targeted flows where browser interaction adds value. Reuse pure tests rather than repeating calculations needlessly.
- Explicitly exercise source-review caution/invalid and prevent answer disclosure before submitting.
- **Gate:** mapping ledger proves each unique flow from smoke/Pass11–23/Pass30 has a new home; run old and new journeys with actual file:// before retiring old ones.

**Pass 45 — Modern-only UI, visual and accessibility acceptance**

- Replace v11 visual comparators with **current product contracts**: Library first-fold Start; compact Exam navigator and response actions; Results hierarchy and conditional empty/sufficient-data views; History/Learning; fixed body-sibling Aa while ordinary header scrolls away; popover/focus; no document horizontal overflow.
- Sample purposeful viewports: representative laptop 1366×768 (and 1440 if distinct), phone 390, tablet 768, narrow 195 CSS-px zoom-equivalent; light/dark and 100/140% where meaningful. Add keyboard/aria/focus and a rules-based accessibility audit if tooling is justified.
- Avoid arbitrary pixel lock to v11: test measurable task success, content order, max widths/containment and explicit intentional UI design properties. If a screenshot is necessary, keep a small curated modern-only set and upload mainly on failure or explicit visual review.
- **Gate:** modern-only assertions independently catch known L01–L11, F29-01–03, Pass33/34/35 regressions; prove with targeted test mutations or known failing states where safe; old Pass29 still runs at this point.

**Pass 46 — Cross-browser critical-path coverage**

- Establish real Chromium/Firefox/WebKit smoke paths for load/import/answer/save/reload/result/navigation/Display using each engine's real support envelope. Never silently claim native Navigation API support from an unrelated fallback, and never insert a compatibility shim merely to satisfy a test.
- When a browser lacks required modern platform support, capture an **explicit product-support decision / unsupported test outcome** rather than false-pass, accidental skip, or downgrading native-only architecture.
- Add semantic accessibility checks in browser where appropriate, plus keyboard/zoom/focus and reduced-motion; do not claim physical devices or screen readers are certified.
- **Gate:** cross-browser matrix accurately identifies supported vs blocked journeys and failures; no narrower regression assurance than current Firefox/WebKit persistence coverage.

**Pass 47 — Stress/performance boundaries and historical benchmark replacement**

- Test near-limit generic bank load, max-size key/media and large attempt/history/backup operations using fixed capped fixtures; separate pure stress and slower release stress from always-on critical paths.
- Replace Pass22 Pass21-SHA DOM-node comparison with **current invariants**: only active Results pane materialises its heavy content; no 100-question hidden review/timing rendering; acceptable bounded DOM and practical performance under a representative history. Use measured distributions rather than unstable single elapsed milliseconds.
- Establish honest thresholds on same CI environment only after measurements; no arbitrary unexplained budgets.
- **Gate:** performance meaningfully guarded without any historical app executable; resource budgets are observed and documented, no flaky wall-clock gate.

**Pass 48 — CI orchestration, permissions and artifacts**

- Design narrow stages: core validation/build exactly once; critical offline Chromium suite; targeted cross-browser matrix; optional/release visual/stress job triggered by explicit events or relevant changes. Source/data changes still run consequential score, import, integrity and critical offline E2E checks.
- Ensure generated HTML publication happens **only after all required jobs pass**, and a docs-only commit never needs a full historical screenshot matrix. Separate read-only tests from minimal contents:write publishing permission. Preserve safe rebase/drift logic.
- Avoid a change-based filter that silently skips a necessary product gate; document trigger policy and test it with representative paths (source, CSS, content JSON, package config, docs, CI and generated artifact).
- Improve reproducibility: review introduction of lockfile + npm ci and controlled Playwright engine revisions; preserve Node 24 and pinned dependencies; avoid installing browsers unused by a job.
- Retain failure artifacts only when useful; avoid numerous duplicate 30-day screenshot uploads. Measure CI runner-minutes and wall time before/after.
- **Gate:** full new workflow green; all mandatory invariants covered; document-only and failed-build/publish safety paths demonstrated; deployment never publishes unverified generated HTML.

**Pass 49 — Browser-script retirement and independent migration audit**

- For all 25 legacy QA scripts, finish a **scenario/assertion-by-assertion** disposition table with exact replacement tests and pass logs. Delete or remove from required CI **only** if a distinct assertion has a verified successor or is explicitly historical-only.
- Archive frozen-v11 screenshot methodology, Pass15/24 and Pass29 evidence, per-commit benchmark rationale as *Git history + provenance links*, not live executables or enormous Git blobs. Unmodified baseline/v11 remains accessible.
- Check no accidental imports, package scripts, AGENTS instructions, workflow references or CI paths point to removed code. Existing AGENTS mandatory-Pass29 text must remain respected until Pass50 reconciliation; sequence retiring and instruction update safely (temporary dual-compatibility may be needed).
- Perform independent full new-stack automated acceptance, plus targeted source/branch diff review and simulated failure path. **Gate:** legacy scripts removed from active CI without reducing essential coverage, phase-II runs demonstrably shorter, and final editorial/content/history contracts unchanged.

### Phase III — documentation last, full programme closure

**Pass 50 — Documentation, governance and final independent QA**

- Only after Phases I and II are green, update AGENTS.md, root README.md, docs/README.md, CURRENT_ARCHITECTURE.md, DATA_CONTRACTS.md and relevant policy/QA guidance to reflect **current capability-based suites**, not chronological pass gates. Existing historic reports remain accurate and labelled historical, not rewritten as if they never existed.
- Explicitly replace outdated AGENTS text requiring Pass29/Pass30 old filenames with modern equivalent **contract requirements**; archive Section G as legacy feature audit and make this file the completed, indexed test-reengineering programme record. Keep one clear active scratchpad for future work.
- Document commands and CI triggers for fast local core, modern offline E2E, cross-browser, full release visual/stress, evidence retention, deterministic reproduction, failure triage, user signoff.
- Independent final audit: exact coverage/register reconciliation, no orphaned or skipped essential assertions, current-source checks, full new CI, browser support caveats, artifact publication safety, manual/physical/AT outstanding list. Compare measured wall/runner cost, build size and QA maintenance size honestly.
- **Programme exit:** tests organised by capability; mathematical/property assurance stronger; real offline browser critical paths and Firefox/WebKit coverage truthful; no active frozen-v11 UI comparison dependence; no obsolete historical SHA performance gates; concise CI with limited artifacts; all legitimate product guarantees intact; docs accurate. **No main merge or product release without express user approval.**

## 5. Decision protocol, independence and acceptance rules

Every implementation pass follows **five mandatory stages**; the scratchpad is updated as the work proceeds, not reconstructed after success:

1. **Audit source:** current HEAD; this plan; relevant original Section G/AGENTS; exact target/consumers/tests/CI; map coverage and risks.
2. **Analyze alternatives:** identify current invariant, duplicate/historical evidence, options, tradeoffs, selected approach and why it protects user contracts.
3. **Implement:** narrow scoped changes; keep frozen material and unrelated modules intact; note changed paths/commits.
4. **Reconcile each objective against source:** explicitly verify every numbered pass objective and affected downstream consumer. Re-open work if incomplete—do not close a pass because only unit tests passed.
5. **Targeted QA:** run new/affected old unit and real file:// browser checks. At phase milestones and completion run full CI; distinguish measured evidence from claims. Capture failed seeds/contexts; do not delete tests to make failures disappear.

**Replacement proof (necessary for every deletion):** old assertion ID and behaviour → new assertion path/title → what it asserts → execution evidence → independent/failure detection rationale → retirement decision. Count coverage by **behavioural contract and failure mode**, not screenshot count, test count or lines of code. Maintain a cross-browser support matrix; modern-only assertions do not need a v11 comparison.

**Risk flags requiring explicit stop:** content bank hash drift; scoring/eligible maximum change not authorised; UI route/answer leak; corrupted stored attempt or nonadditive backup; missing offline file://; missing browser support disguised as green; failed CI distribution safety; unsupported assumption that a screen-reader audit occurred.

**Runtime goals are directional, not release acceptance by fiat:** lower current ~4m22s wall and runner-minute cost substantially, aim for roughly half or better *if attained without weaker gates*. Measure paired runs with the same baseline configuration, including CI setup and browser install; do not claim success from estimates or trimmed coverage.

## 6. Live pass ledger (update during implementation)

| Pass | Phase | Status | Finding IDs | Source commit(s) | New/retired tests/scripts | QA/CI evidence | Open items |
|---|---|---|---|---|---|---|---|
| 36 | Tests | NOT STARTED | TS-01,14,15 | — | — | — | Assertion-level inventory |
| 37 | Tests | NOT STARTED | TS-02,03 | — | — | — | Independent scoring oracle |
| 38 | Tests | NOT STARTED | TS-02,04 | — | — | — | Model-based session events |
| 39 | Tests | NOT STARTED | TS-03,05 | — | — | — | NAT/generic boundary |
| 40 | Tests | NOT STARTED | TS-04 | — | — | — | Data & concurrency |
| 41 | Tests | NOT STARTED | TS-05,06,10 | — | — | — | Analytics/learning/UI pure |
| 42 | Tests | NOT STARTED | TS-01,06,14 | — | — | — | Phase-I consolidation gate |
| 43 | Scripts | NOT STARTED | TS-07,11,15 | — | — | — | Shared browser harness |
| 44 | Scripts | NOT STARTED | TS-07 | — | — | — | Durable journeys |
| 45 | Scripts | NOT STARTED | TS-08,10 | — | — | — | Modern-only UI/visual |
| 46 | Scripts | NOT STARTED | TS-09,10,15 | — | — | — | Cross-browser/platform |
| 47 | Scripts | NOT STARTED | TS-05,12 | — | — | — | Stress/performance |
| 48 | Scripts/CI | NOT STARTED | TS-11,15 | — | — | — | CI orchestration/publish |
| 49 | Scripts | NOT STARTED | TS-07,08,12,14 | — | — | — | Historical retirement gate |
| 50 | Docs/final | NOT STARTED | TS-13,14 | — | — | — | Documentation & final QA |

### Current working checkpoint — append per pass, don't overwrite historical checkpoints

**P36 preflight (2026-11-01):** Audit-only baseline verified, no tests/scripts/CI changed. Existing AGENTS source-first and Pass29 mandatory wording remains in effect. No pass is complete. Next action: enumerate all existing Node assertions and browser scenarios; build exact contract mapping before modifying test files.

Use this structure for **each** future pass checkpoint:

- **Pass / date / starting HEAD / current status:**
- **Audit:** source and test consumers actually read; objective IDs; contradictions or pre-existing defects.
- **Reasoned decision:** alternatives and chosen invariant/migration scope; no unsupported assumptions.
- **Implementation ledger:** changed paths; commits; old → new assertion mapping; production fixes, if any.
- **Objective reconciliation:** each objective PASS/FAIL/BLOCKED with source path and evidence; iterate as needed.
- **Targeted QA:** exact commands and results; failing seeds; browser engine/version; CI run URL when executed; no invented measurements.
- **Risk / leftovers / next pass gate:**

## 7. Source pointers

- [Mandatory engineering constraints](../../AGENTS.md)
- [Existing source-audit Section G and original parity findings](V11_SOURCE_AUDIT_2026-10-30.md)
- [Current CI workflow](../../.github/workflows/ci.yml)
- [Package scripts](../../package.json)
- [Existing unit tests](../../tests)
- [Existing QA scripts](../../scripts)
- [Pass29 historical matrix](PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md)
- [Pass24 original laptop findings](PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md)
- [Pass23 independent source audit](PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md)
- [Current data contracts](../architecture/DATA_CONTRACTS.md)
- [Current architecture](../architecture/CURRENT_ARCHITECTURE.md)
- [Results UI design contract](../architecture/RESULTS_V11_PARITY_PLAN.md)

**Document status:** This is a plan and active scratchpad, not evidence that any pass or new test was executed. All implementation statuses remain NOT STARTED until recorded source changes and passing QA exist.
