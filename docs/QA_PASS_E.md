# Practice Desk — Pass E: assertion-evidence, redundancy and runtime audit

**Audit baseline:** `working` at `d9a44eb97f6aac9123c79733ae21680a40f62e64` (the final source change was the verified Pass D commit `78930faaed2bf4f72bcab0024e4b982004c17a3a`). **Evidence:** repository source and the successful GitHub Actions run [43569704822](https://github.com/oneshubhamt/practice-desk/actions/runs/43569704822), 14 November 2026. **Scope:** read-only QA analysis, with documentation artifacts added; no production code, tests, CI gates, or test execution changed.

The companion [case register](QA_PASS_E_CASE_REGISTER.tsv) lists **all 442 executed Node cases**, grouped by the observed Node test-reporter file ordering, with their primary provisional risk contract, classification and observed case duration. The existing [Pass A–D census](QA_CENSUS.md) remains the historical old-to-new witness map. **Do not mistake counts of test cases for counts of substantive invariants.**

## E1. Inventory, terminology and confidence

| Observed surface | Census | What the count establishes — and what it does not |
|---|---:|---|
| Node files | 35 | Domain-organised source files; many retain historical lexical blocks. |
| Node runtime cases | **442** (435 fast + 7 deep) | Passing CI cases; some source registration sites generate several runtime cases. |
| Node `test(` source call sites | **432** | Static registrations, not a 1:1 count of executed cases. |
| Node `assert.*(` source call sites | **2,995** | Lexical call-site census across the 35 files; loops may execute a call repeatedly; helpers and nested callbacks complicate dynamic cardinality. |
| Node `assert.match` / `assert.doesNotMatch` call sites | **324** | **Review queue, not 324 bad tests**. Regex may enforce crucial escaping, accessibility or secrecy. |
| Browser scenarios / executed scenario-engine combinations | **14 / 22** | 14 registry scenarios: 6 Chromium smoke, 8 Chromium deep, 4 Firefox cross, 4 WebKit cross. |
| Browser `check(` call sites | **339** | Source call sites in nine scenario modules, not runtime check executions. |
| Browser Playwright `locator(` / `getByRole(` call sites | **491 / 67** | Selector-style census only; IDs/classes can be correct for technical evidence. |
| Historical “Merged from” / “Consolidated coverage” markers | **49** | Residual consolidation scaffolding; markers do not establish semantic duplicates. |
| Targeted isolated semantic mutants | **10/10 killed** | Good local sensitivity, **not** a repository-wide mutation score. |

### Classification rules

For each **observed case**, the companion register assigns one **principal lens**: **B** behavioural state/decision; **M** mathematical/reference/property; **I** integration across boundaries; **S** security/privacy/integrity; **A** architecture/dependency; **P** presentation/accessibility; or **U** superficial/refactor-hostile candidate. A real test can protect more than one lens. The register's primary lens is **provisional**, derived from test titles and source-domain inspection; its `independence-candidate` hint is **not** independent verification. The audit below separately examines actual assertion expressions and their tested mechanism, including the regex and source-anchor exception register.

**Cheapest valid proof layers:** D = pure domain/reference/property; X = headless integration with actual stores/CLIs; G = parsed import/build graph; B = browser acceptance for visible behaviour and browser APIs; S = bounded scale/stress; H = human/manual/external verification.

**Independence standard:** A second call to the production implementation with similar inputs is *not* an independent oracle. Defensible independence requires a differently constructed expected ledger, reference/state model, metamorphic relation, adversarial transition, external standard vector, or observable state transition at a different boundary. Separate tests sharing the same production helper may be useful as boundary cases but are not independent by construction.

## E2. Risk → invariant → evidence → cheapest layer map

Status codes: **Protect** = materially distinct witness worth retaining; **Consolidate** = overlapping witnesses, keep separate independent layers; **Improve** = meaningful weakness or oracle improvement; **Manual** = not honestly certifiable through this CI.

| Risk / lens | Protected invariant (not source wording) | Existing direct witness / assertion-level examples | Cheapest layer; disposition |
|---|---|---|---|
| **SC01 M** | Correct / wrong / blank / excluded, per-item overrides, fraction/partial rules and frozen denominators produce an exact item ledger and total | `exam-scoring-and-policy`: seeded reference, six-kind bijection/permutation, exact APFC fractional deduction (around test source lines 594, 673, 798); targeted scoring mutants | **D Protect**; independently computed oracle and exact rational boundary tests are central |
| **SC02 M** | Multiselect/matching awards cannot exceed declared max; negative/blank/min bounds remain valid under unusual rules | `exam-scoring-and-policy` 744–818; `content-and-provenance` 148–165; `taxonomy-and-workspace-policy` P50 | **D Consolidate** overlapping cap examples, keep adversarial variants |
| **SC03 M/B** | Numeric-entry accepted intervals use declared absolute/relative tolerance, including boundary and signed values | `exam-scoring-and-policy` 770; `cross-domain-integration` numeric tolerance | **D Protect**, integration smoke demonstrates frozen-rule use |
| **SC04 B/I** | Source/review comparison uses exact source key identity, unchanged source fields and immutable published revision | `exam-scoring-and-policy` 139; `content-and-provenance` source-key/edition checks; `editorial-lineage-and-pdf` 103–230 | **D + X Protect** distinct source-lineage, comparison and publication witnesses |
| **TM01 M** | Whole-paper and sectional clocks conserve elapsed time, split late ticks correctly, never fabricate foreground time and close sections once | `session-and-timing` seeded independent state models 111, 164; `question-timing-phases` first/revisit/answer exposure; `result-integrity` single expiry instant | **D Protect** independent models, retain one browser lifecycle witness |
| **TM02 B/I** | Pauses, manual expiry, forbidden early submission, locked navigation and restoration enforce exam policies regardless of UI affordances | `exam-scoring-and-policy` 57–95, 395–483; `session-and-timing` 187–349; `candidate-core` | **D + B Consolidate** policy model vs real candidate journey are complementary |
| **TM03 M/I** | Question exposure, visit counts and analytics obey separately measured phase/event evidence | `question-timing-phases` 21–145; `learning-and-analytics` visit/median/pace cases | **D Protect**; strengthen metamorphic replays for hidden/paused/restore interleavings |
| **PK01 B/S** | One package schema supports six response types, invalid keys and unexpected fields are rejected without coercion | `exam-package-and-import` table-driven mutations, `authoring-domain` six-kind publisher validation | **D Protect** table, remove only equivalent hand-picked rejects |
| **PK02 B/I** | Exam modes, composition, editorial eligibility, question identity and count limits freeze a correct paper without claiming false official provenance | `exam-bank-and-policy`, `attempt-provenance`, `exam-package-and-import`, `taxonomy-and-workspace-policy` | **D + X Consolidate** correlated validation, not source text |
| **HS01 M/I** | CAS revision transitions reject stale writers; neither a stale tab nor recovery mirror rolls back newer data | `history-and-persistence` two-tab seeded interleavings 333 and 576-case reference 516; `storage-resilience` browser | **D + B Protect** distinct model and actual IDB witnesses |
| **HS02 S/I** | Corrupt rows are isolated, restored records remain immutable, backups authenticate content, additive merge is idempotent | `history-record-integrity` corrupted sibling/compact rows; `history-and-persistence` checksum, merge and frozen-key tests; `partial-recovery` | **D + X + B Protect**, do not collapse all corrupt-input witnesses into one example |
| **HS03 B/M** | History filtering preserves exact exam/mode/status/date identity, results ordering, cohort bounds and no false cross-paper comparison | `history-record-integrity` 128-combination reference 33; `history-and-persistence` adjusted-score and revision trends; History browser segment | **D + B Consolidate** many small examples into table/model; retain visible filter interaction |
| **HS04 B/I** | Terminal saves remove candidate-only scratch without altering durable result or recovery evidence | `terminal-scratch-cleanup`; `result-integrity`; real browser restore | **D + B Protect**, narrow overlap if same cleanup transition |
| **AU01 S/B** | Draft / staged / approved / published are distinct states; unverified content cannot be presented as certified or ready | `authoring-domain` draft/publish; `authoring-workspace-integrity` CAS; `content-blueprint-quality` partial/status; `authoring-publication` | **D + X + B Protect**; avoid four separate CLI stories for the same rejection |
| **AU02 I/S** | Exact SHA-bound source/review revision, reviewer decisions and publisher guard prevent silent edit, overwrite or half-written publish | `editorial-lineage-and-pdf` 103–230; `agent-authoring` guarded edits/review; `external-bank-authoring` stable identities | **X Protect**; high-value failure-injection improvement candidate |
| **AU03 S** | Candidate can never see keyed answer, explanation-only image, private alt or reviewer-only source metadata before reveal | `content-blueprint-quality` P60-C leak variants; `authoring-domain` explanation-only media; `candidate-core`, `authoring-publication`, `csp-security` | **D + B Protect**; improve cross-surface adversarial matrix, not blanket substring presence checks |
| **AU04 M/S** | Mathematical and statutory/source declarations produce explicit unresolved evidence status, not fabricated verification | `external-bank-authoring` arithmetic QA; `content-blueprint-quality` P62-C; `agent-authoring` limited claims | **D + X Protect**; truthful coverage is not a claim of real-world factual correctness |
| **AU05 I/S** | Blueprint allocation, sibling/parent quota, partial batches and duplicate detection agree with compiled question content | `content-blueprint-quality` 35–290, 625–701; `external-bank-authoring` duplicate/selection cases | **D + X Consolidate** table/model for counts, one true CLI boundary |
| **AU06 I/S** | PDF source pages, figures, TeX, externally supplied answer key and source byte identity survive ingestion without inventing certainty | `editorial-lineage-and-pdf` 470–627 and targeted corrupt-PDF mutant | **X Protect**, manual source fidelity remains outside automatic proof |
| **AU07 I** | Agent inspect/show/edit/handoff respects bounded output, create-only publishing, exact identity and stale-refusal semantics | `agent-authoring` 24 cases; `external-bank-authoring` CLI and workflow; `external-bank-authoring` 34 cases | **D + X Improve**: separate pure command contracts from fewer representative process-spawn journeys |
| **LN01 M** | FSRS review history replays deterministically; policy change does not modify recorded evidence; chronology and leech/Cost-ADR semantics hold | `learning-and-analytics` 344–449; `fsrs-scheduler-contract`; scheduler and optimizer unit contracts | **D Protect**; compare with upstream rules where independently possible |
| **LN02 M/I** | Optimizer raw/retained evidence, holdout rejection and profile activation are consistent between native and browser/WASM runtimes | `learning-and-analytics` 759–813, native/WASM parity, Worker browser probes | **D + X + B Protect**; one production pipeline across targets, but parity alone is not a correctness oracle |
| **LN03 B/I** | Revision notebook uses scoreable completed frozen answers, supports exact subject identity, survives source deletion, and does not invent measured mastery | `revision-evidence`, `learning-and-analytics`, `cross-domain-integration`, `candidate-core` | **D + B Protect** distinct revision and real-page evidence |
| **UI01 P/B** | Question navigator and flag control communicate actual answered/flagged state, visibly distinct paint in both themes, consistent after reload | `flag-palette` Node regex on HTML classes; `ui-and-navigation` status labels; `status-palette` real computed paint and ARIA | **B Protect; P/D Consolidate**: real browser is visual truth, pure model is state truth, brittle class-text assertions are not |
| **UI02 P/S** | Controls have correct accessible names, keyboard semantics, focus containment and no answer leakage | `ui-and-navigation` render matches; `media-rendering` escaping/MathML; `image-viewer`, `responsive-ui` | **D + B Improve**; semantics over incidental DOM structure; manual screen-reader coverage absent |
| **UI03 P/M** | Image viewer bounded zoom/pan, safe local media/alt, no control-click side-effect on answer selection | `media-rendering` geometry + URI rules; `image-viewer` full browser | **D + B Protect**, different mechanisms and failure modes |
| **UI04 P/I** | Navigation/reload remains within file URL, correct fragment fallback and preserved unrelated query without answer-bearing URL | `ui-and-navigation` codec + malformed-route tests; `file-navigation` engine cross-browser | **D + B Protect**, real macOS/Safari remains unverified |
| **UI05 P/I** | Responsive screen, 195px/140% scale and zoomed result surfaces work without overflow, wrong focus or hidden controls | `responsive-ui`, `status-palette`, `result-stress` | **B Improve** use bounded evidence on real layouts rather than snapshot of CSS selector text |
| **SEC01 S** | Local-offline build applies canonical CSP, no untrusted active/remote asset executes, release artefacts have deterministic content | `build-security`, `media-rendering`, `csp-security`, reproducible-build CI | **D + G + B Protect** independent build/real-execution witnesses |
| **SEC02 S/I** | Invalid/malicious/source-identity payloads cannot bypass canonical validators or change already durable data | `content-and-provenance`, `history-record-integrity`, `build-security`, `editorial-lineage-and-pdf` | **D + X Protect** negative tests must challenge the target transaction, not merely match an error word |
| **CAL01 I/B** | Scheduled mocks and scheduler settings remain strict, backed-up, restorable, and routable across browser navigation | `calendar-integration` and `calendar-integration` browser scenario | **D + B Protect**; timezone/DST and cross-feature races need explicit risk review |
| **ARCH01 A** | Foundational source layers depend only inward, controller topology is acyclic, vendors terminate at adapters | Parser/metafile graph in `architecture-boundaries` | **G Protect** direction/cycle rules; **Improve** path-specific must-import checks |
| **QA01 I** | QA runners parse, fail visibly, isolate browser contexts, keep optional visual evidence opt-in and produce trustworthy artefacts | `acceptance-script-syntax`, `visual-evidence`, acceptance runner and CI | **G/X Protect** essential runner fail-closed behavior, avoid cosmetic runner tests |
| **SCALE01 I/M** | Large authoring batches, bounded agent output, 2,000-question result and retained browser interactions stay complete | `authoring-scale`, `agent-benchmark`, `result-scale`, `result-stress` | **S Protect**, keep in deep; no arbitrary millisecond assertions |
| **TRUTH01 H** | Actual PYQ authenticity, factual answer correctness, labor-law currency, reviewer identity and physical assistive-device behavior | No automatic software assertion can establish these facts from self-asserted metadata | **H Manual**; explicitly excluded from automated green claims |

### Important interpretation

This is an **assertion-cluster-level map**: for example, `UI01` separates pure flagged-state semantics, exact textual class patterns, real computed styles, accessible labels and post-reload persisted status. The companion register supplies the **individual case-level membership**. Source-level counts and examples expose the remaining sites that must be classified manually in Pass F; we have **not** falsely labelled each of 2,995 lexical assertion calls an independent oracle.

## E3. Ranked removal/refactor and optimisation candidates

**P0 = guardrail, P1 = highest-return next pass, P2 = useful contingent cleanup, P3 = leave alone unless shown redundant.** No removal is authorised from this audit alone.

| Rank | Exact candidate / evidence | Problem and proposed action | Retain / proof requirement |
|---|---|---|---|
| **P0** | `scripts/mutation-sensitivity.mjs` ten `find`/replace exact source strings | The mutation harness is tied to exact production phrases: a legitimate refactor can fail deep CI before testing a semantic mutant. Replace brittle mutation anchors with controlled semantic transformations or stable mutation interfaces where justified. | Preserve **baseline-green → assertion-killed** for every mutant; never relax into “any failure counts.” |
| **P1** | `tests/ui-and-navigation.test.mjs` HTML assertions (57 regex sites); `flag-palette.test.mjs` (15 regex sites); `media-rendering.test.mjs` (63 regex sites) | Review each regex; retire exact class/label/heading checks when semantic state/DOM/paint/browser witness exists, and convert security/a11y checks to parsable or user-facing semantics. | Preserve answer-key secrecy, escaped unsafe text, accessibility labels, actual color-state differentiation and immutable review. |
| **P1** | `agent-authoring.test.mjs`, `content-blueprint-quality.test.mjs`, `editorial-lineage-and-pdf.test.mjs` | Their observed **case-duration sums** are ~33.52s, ~32.01s and ~14.83s: **~80.36s / 97.82s (82%)** of fast Node reported case durations. Repeated CLI/source-copy/validation cycles are candidates for unit-versus-real-CLI consolidation and fixture sharing. | Retain representative full command-transaction runs, stale/partial output refusal, source/key privacy, reviewer independence and end-to-end strict publication. Case-duration sums are **not** wall-time savings. |
| **P1** | High-cost individual cases: P60-C independent-review validation **8.19s**, full P60 QA **4.07s**, P60-E strict compile **3.73s**, P59 bad hash/refusal **3.69s**, canonical authoring fractions **3.60s**, P62-C math declaration **3.60s** | Profile subprocess startup, fixture size, hashing, duplicate setup and actual logic. Cheap boundary variants should run without re-spawning the entire CLI. | Keep enough real CLI evidence to catch wiring, serialization and atomic-output bugs. |
| **P1** | Browser `candidate-core` **17.47s**, `storage-resilience` **15.95s**, `status-palette` **14.91s**, `responsive-ui` **9.58s** | Break each into named substeps for profiling, then collapse redundant travel/setup and avoid repeated navigation, not state transitions under test. | Browser-specific CSS/IDB/focus/resize/paint and actual candidate lifecycle are irreplaceable with Node-only checks. |
| **P1** | WebKit `partial-recovery` **12.04s** vs Firefox **2.96s**, Chromium **1.02s** | Diagnose browser-specific waits, startup and storage/hydration variability; **one sample is not proof of persistent browser regression**. | Preserve cross-browser corruption/recovery checks until repeated measurement establishes an optimisation. |
| **P2** | `tests/exam-scoring-and-policy.test.mjs` policy prose patterns (~51 regex sites), `history-and-persistence` and `history-record-integrity` display checks | Separate *calculated contract* from *exact explanatory sentence*. Use one explicit user-visible disclaimer witness where wording is required; shift hard-coded phrases to semantic/visibility assertions otherwise. | Scoring exactness, truthful official/nonofficial attribution and security disclaimers cannot be weakened. |
| **P2** | `tests/architecture-boundaries.test.mjs` direct `generic-ui.ts` import-presence and named controller lists | Good parsed graph, but some “root must directly import exactly these filenames” checks constrain valid architecture changes rather than layer safety. Classify as intentional design boundary or replace with capability ownership/cycle rule. | Preserve no upward dependencies, adapter boundary, no second storage owner and no controller cycles. |
| **P2** | `tests/agent-authoring.test.mjs` P60-A documentation truth-table case; historical P47/P60 comments and 49 merge markers | Review claim wording or reference to retired future work as low-value maintenance noise; remove stale lexical-block scaffolding/aliases after case mapping. | Do not delete actual capability discovery, permissions or unsupported-command checks. |
| **P2** | `tests/exam-package-and-import.test.mjs` canonical full-fraction/identity/hash test **3.60s**; large fixture repeated in ordinary fast suite | Try smaller adversarial fixtures for mathematical/hash semantics and move only genuine capacity/performance to deep. | Preserve true upper-bound, collision, and no-truncation witnesses. |
| **P2** | Browser 491 `locator()` sites vs 67 `getByRole()` sites across scenario modules | Selectively replace visible user controls with stable accessible semantics; do **not** mechanically replace technical storage IDs, data keys, diagnostic elements or hidden inputs. | Tests must still precisely locate their intended control and remain independently runnable. |
| **P2** | CI: four separate `npm ci` and browser-install steps; `smoke`/`cross`/`deep` depend on fast | Profile checkout/install/download time separately. Cache or prebuilt artifacts only with trusted lock/key integrity and no leaking across unrelated runs. | Keep lock-clean, deterministic build, source ancestry and guarded publisher guarantees. |
| **P2** | `deep` runs on push to `working` only; `main` source pushes receive fast/smoke/cross but not deep | Verify deployment/release branch policy. If `main` is shipped or merges are treated as releases, it should not silently bypass the intended release-only adequacy gate. | One clearly documented release authority; PR path may stay cheaper if branch protection enforces the proper gate. |
| **P3** | `acceptance-script-syntax`, `visual-evidence`, `result-scale`, pinned Calendar dependency, CSP/WOFF/MathML checks | Tiny or specialized build/security costs; **do not remove for aesthetics**. Some look like strings but protect real distribution or supply-chain contracts. | Retain unless an equal or stronger existing witness is demonstrated. |

### Apparent overlap that is **not** necessarily waste

- **CAS 576-state model + two-tab browser + partial recovery** cover mathematical precedence, real storage contention and browser hydration separately; preserve the distinct layers.
- **FSRS replay + native/WASM parity + browser Worker activation** cover chronology, cross-build equality and actual Worker plumbing; parity is not an independent mathematical standard.
- **Pure image geometry + browser image viewer** cover bounds and input/focus/paint separately.
- **Source hashes + editorial lineage + source-preserving PDF** protect different ownership boundaries.
- **Colour classes in Node + computed palette in browser:** the Node *state model* is useful, but rigid serialized class-string checks are candidates for trimming.

## E4. Runtime evidence: individual Node source-file profile

**Method:** 442 `node:test` case durations extracted from the successful CI runner logs. Files are mapped to contiguous per-file reporter groups; the first title of each group was checked against the corresponding source. **“Case duration sum” is not per-file wall time**: the runner executes files concurrently, module load, process scheduling and setup can dominate, and reported case durations overlap. Treat this as a measured **hotspot proxy**, not predicted wall-time savings.

| Node file (`tests/*.test.mjs`) | Runtime cases | Case-duration sum (s) |
|---|---:|---:|
| agent-authoring | 24 | **33.52** |
| content-blueprint-quality | 34 | **32.01** |
| editorial-lineage-and-pdf | 16 | **14.83** |
| agent-benchmark *(deep)* | 1 | **4.36** |
| exam-package-and-import | 20 | **4.13** |
| history-and-persistence | 29 | **3.26** |
| external-bank-authoring | 34 | **2.85** |
| authoring-scale *(deep)* | 5 | **2.02** |
| exam-bank-and-policy | 9 | **1.34** |
| exam-scoring-and-policy | 36 | **1.34** |
| authoring-workspace-integrity | 6 | **1.21** |
| content-and-provenance | 27 | 0.59 |
| build-security | 5 | 0.42 |
| authoring-domain | 23 | 0.27 |
| learning-and-analytics | 24 | 0.25 |
| attempt-provenance | 3 | 0.25 |
| acceptance-script-syntax | 1 | 0.23 |
| history-record-integrity | 16 | 0.22 |
| media-rendering | 23 | 0.19 |
| session-and-timing | 15 | 0.15 |
| cross-domain-integration | 5 | 0.15 |
| taxonomy-and-workspace-policy | 16 | 0.12 |
| question-timing-phases | 7 | 0.12 |
| result-scale *(deep)* | 1 | 0.10 |
| revision-evidence | 7 | 0.10 |
| ui-and-navigation | 23 | 0.075 |
| calculator | 6 | 0.056 |
| calendar-integration | 4 | 0.052 |
| fsrs-scheduler-contract | 3 | 0.027 |
| flag-palette | 6 | 0.022 |
| visual-evidence | 2 | 0.016 |
| result-integrity | 2 | 0.012 |
| terminal-scratch-cleanup | 1 | 0.010 |
| architecture-boundaries | 5 | 0.005 |
| keyboard-shortcuts | 3 | 0.004 |

**Observed command durations:** fast typecheck/build/435 Node tests **38.85s**; deep 7 Node tests **4.64s**; 10 targeted mutants **7.52s**; native optimizer smoke **0.25s**; static build **0.56s**; native/WASM optimizer parity **0.69s**. Full release CI wall **2m 58s** on this runner. The fast test-case duration sum is **97.82s** while command wall is 38.85s, illustrating why case sums cannot be added to predict job completion.

## E5. Browser scenario timing profile — one successful CI observation

Elapsed durations below are computed from the timestamped **scenario group start → “ASSERTION JOURNEY PASS”** in the runner logs, rounded to 0.01s. These include per-scenario context setup and teardown *up to* the pass marker; they are not repeated medians or strict performance budgets. A dash means the engine/scenario combination is **not scheduled**, not that it failed.

| Browser scenario | Chromium (s) | Firefox (s) | WebKit (s) | Lane |
|---|---:|---:|---:|---|
| candidate-core | **17.47** | — | — | smoke |
| authoring-publication | 1.60 | — | — | smoke |
| partial-recovery | 1.02 | 2.96 | **12.04** | smoke/cross |
| file-navigation | 2.67 | 4.56 | 5.58 | smoke/cross |
| image-viewer | 4.45 | 6.20 | 8.96 | smoke/cross |
| csp-security | 0.69 | 1.03 | 1.09 | smoke/cross |
| status-palette | **14.91** | — | — | deep |
| external-bank-authoring | 4.68 | — | — | deep |
| storage-resilience | **15.95** | — | — | deep |
| image-preparation | 2.06 | — | — | deep |
| math-rendering | 1.60 | — | — | deep |
| calendar-integration | 3.38 | — | — | deep |
| responsive-ui | **9.58** | — | — | deep |
| result-stress | 1.84 | — | — | deep |

**Timed whole-lane runs:** Chromium smoke 28.22s + optimizer activation 0.67s; Chromium deep 54.31s; Firefox cross 15.29s + probe 2.26s; WebKit cross 27.96s + probe 0.92s. `status-palette` deliberately waits for settled computed styles and tests six kinds, dark/light, reload and 195px scale; its expense protects real rendering behaviour. `storage-resilience` deliberately exercises two-tab conflicts and failure fallback. Do **not** replace either with an HTML string assertion merely to reduce runtime.

## E6. Untested or weakly demonstrated high-risk behaviours

These are **evidence gaps**, not assertions that the product contains bugs. Test-name searches and representative source/browser inspection cannot prove a path absent without a separate targeted audit.

| Risk | Current bounded evidence | Proposed independent next witness | Priority |
|---|---|---|---|
| **Cross-surface pre-reveal secrecy** | Rich P60-C negative checks plus one browser authoring/candidate flow | One adversarial matrix that systematically probes candidate, navigator, drafts, import errors, persisted-reload, media alt and preflight without reading private answer source | High |
| **Partial-write/transaction atomicity** | CAS, malformed staging, create-only and publication refusal tests | Inject failure at each durable publication/backup boundary; verify no half-published package and no altered prior revision | High |
| **Real timing evidence after visibility/sleep/recovery** | Independent state models and selected browser lifecycle | Browser-driven hidden/foreground transitions plus resume, manual expiry and clock rollback in a deterministic trace; isolate OS-sleep limitations | High |
| **Human-use a11y** | ARIA/keyboard/focus/paint and zoom checks | Short manual screen-reader and keyboard-only checklist on actual supported OS/browser; automated semantic checks only where reliable | High, manual |
| **Cross-branch release assurance** | `working` full deep gate and guarded publisher; main lacks deep on direct push | Confirm which branch actually distributes the app; require release-depth evidence at that authority | High, policy |
| **Browser-specific recovery variability** | Passing real Chromium/Firefox/WebKit recovery | Multiple instrumented WebKit observations, stage-level timing and confidence interval before moving any gate | Medium |
| **Long-running large-bank UX** | 2,000-question result Node and browser stress, 500-candidate authoring tests | Bounded browser memory/interaction test on representative device and payload; test no data loss under interrupted import | Medium |
| **Calendar time boundaries** | Route/strict scheduled record/backup plus browser integration | Explicit timezone offset, DST-equivalent edge and schedule-change / restore interleavings (when feature contract permits) | Medium |
| **FSRS optimisation scientific validity** | Upstream native runtime, replay, holdout and parity | Independently expected small timelines/vectors and negative-profile inputs, not merely native versus WASM equality | Medium |
| **External factual authenticity/current law** | Provenance, evidence declarations and unverified labels | Primary-source human or externally grounded editorial review; cannot be inferred from green software tests | Manual |

## E7. Decision matrix for Pass F

For **each candidate** before deleting or replacing an assertion, record:

1. **Risk and invariant ID** from E2, plus exact source assertion or case title.
2. **Mechanism:** independent reference, product-derived assertion, rendered HTML string, real browser outcome, exact-source mutation anchor or setup preflight.
3. **Failure it detects:** concrete plausible semantic defect (ideally one reproducible mutated or adversarial counterexample).
4. **Cheapest valid owner:** D, X, G, B, S or H. Identify all surviving genuinely distinct witnesses.
5. **Cost:** case/scenario timing (plus setup timings before claiming wall savings), and estimated maintenance cost.
6. **Disposition:** protect, rewrite, merge into table/model, relocate to deep, or remove **only after proof**.

**Pass F stopping rules:** do not remove a security boundary because the assertion contains a phrase; do not replace real browser functionality with Node snapshots; do not count a production-helper mirror as independent arithmetic; do not discard test coverage merely to achieve a lower file/test count. Retain 10/10 meaningful mutations, all necessary runtime and cross-browser contracts, and track before/after p50/p90 CI wall and per-scenario timings across repeated comparable runs rather than a single point estimate.

## E8. Pass E disposition

- **Completed:** inspected test/acceptance source and active CI; recorded the **442-case risk-to-contract index**, counted assertion call sites, mapped independent/overlapping evidence at invariant level, profiled all 35 Node file case groups and all 22 browser scenario-engine combinations using actual successful CI logs, ranked actionable candidates, and identified residual evidence gaps.
- **Not done:** no production, test, QA runner or CI behavioural changes; no new tests were executed locally (GitHub-backed source/log audit). Per-file *standalone wall time*, per-statement dynamic execution count, and repeated-run timing distributions are **not available** from this CI run and must not be asserted.
- **Next:** Pass F should begin with P0 semantic mutation-anchor repair and the P1 assertion/CLI duplication review, preserving the protected independent witnesses before any deletion. Maintain this audit as a snapshot; do not merge its historical narrative into the active, short [QA_CURRENT.md](QA_CURRENT.md).
