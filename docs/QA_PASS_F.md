# Practice Desk — Pass F: canonical QA structure and assertion-quality closure

**Branch:** `working` · **Baseline:** Pass E, `8ca3138` · **Verified source:** `29540d9` · **Final verified CI:** [run 43577585914](https://github.com/oneshubhamt/practice-desk/actions/runs/43577585914), successful on 14 November 2026.

**Scope:** QA source files and test-only helpers. **No production source, compiled application, CI workflow or candidate behaviour was edited.** This is a refactor/contract-quality pass, not a claim that the product has no bugs. The historical Pass E [case-to-invariant ledger](QA_PASS_E_CASE_REGISTER.tsv) is retained unchanged as the exact pre-refactor evidence baseline.

## 1. Measured change

| Metric | Pass E | Pass F | Difference |
|---|---:|---:|---:|
| Node test files | 35 | 35 | Unchanged |
| Executed Node tests | 442 (435 fast + 7 deep) | **442 (435 fast + 7 deep)** | All retained |
| Top-level Node test source bytes | 641,968 | **611,172** | **−30,796 (−4.8%)** |
| Shared `tests/fixtures/` bytes | 2,301 | 3,370 | +1,069 (one reusable CLI harness) |
| Test and fixture bytes combined | 644,269 | **614,542** | **−29,727 (−4.6%)** |
| Node `assert.*(` lexical sites | 2,995 | **2,962** | −33 (not a runtime assertion count) |
| Node `assert.match`/`assert.doesNotMatch` lexical sites | 324 | **296** | −28 targeted presentation assertions |
| Historical `Merged from tests/`/`Consolidated coverage` marker sites | 49 | **0** | Synthetic merger scaffolding removed |
| Named canonical test-registration functions | — | **57** | Domain groups, no additional runtime cases |
| Browser registry scenarios | 14 | **14** | Unchanged |
| Browser scenario-engine executions | 22 | **22** | Unchanged |
| Targeted semantic mutants | 10/10 killed | **10/10 killed** | Named-assertion quality retained |

Counting conventions: test/fixture bytes are GitHub tree blob sizes; Node assertion counts are static lexical sites (loops may execute them many times). The mutation-runner refactor itself grew by approximately 1,990 bytes because source-phrase anchors were replaced with a dedicated validated semantic selector. Net QA code change including the mutation runner, but excluding documentation, is approximately **−27.7 KB**. No claim of proportionate CI speedup follows from byte-count reductions.

## 2. Canonicalisation accomplished

**F1 — historical lexical-suite removal.** Fifteen mechanically merged test files were reorganised into cohesive named domain-registration functions and static imports; 57 domain registrations now group the supported test contracts. Existing test bodies, seeded mathematical models, terminal-state checks and test names were retained. Source imports shared across historical blocks were hoisted, and repeated per-block alias scaffolding was retired. The primary changed families were:

- **Exam/policy:** `exam-scoring-and-policy`, `exam-package-and-import`, `session-and-timing`.
- **History, recovery and learning:** `history-and-persistence`, `history-record-integrity`, `learning-and-analytics`.
- **Authoring/content:** `authoring-domain`, `agent-authoring`, `content-blueprint-quality`, `editorial-lineage-and-pdf`, `external-bank-authoring`, `content-and-provenance`.
- **Presentation and taxonomy:** `ui-and-navigation`, `media-rendering`, `taxonomy-and-workspace-policy`.

These are **internal registration functions**, not new runtime layers or an additional application abstraction. Existing standalone targeted tests stay standalone. Historical identity is recorded in Pass E and Git history instead of cluttering active test bodies.

**F2 — shared test utilities.** Added `tests/fixtures/cli-test-support.mjs` for bounded real Node CLI subprocess execution with fail-closed JSON parsing, and isolated temporary directories with guaranteed clean-up. Three expensive authoring test families now reuse it. Real CLIs remain real subprocesses; the helper does not replace an independently computed correctness oracle or invent editorial verification.

**F3 — assertion-quality cleanup.** Replaced the six `flag-palette` markup/class/English-word tests with six direct frozen-session **flag / answer / clear / unflag** state-transition contracts, one for each supported response kind. The existing `status-palette` browser journey still independently checks actual computed colour, legends, ARIA names/pressed state, draft semantics, reload, light/dark themes and 195px/140% rendering.

In `ui-and-navigation`, removed nine checks that required incidental headings, navigator/CSS layout classes or an empty-state phrase. In `media-rendering`, removed four class-name checks already owned by actual rendered controls or browser media interactions. Importantly, **security escaping, answer-key withholding, ARIA semantics, author provenance warnings, MathML/alt text, image-launch behaviour, keyboard focus and score/timing mathematics were not downgraded or deleted.**

**F4 — target mutation quality.** `scripts/mutation-sensitivity.mjs` no longer depends on ten exact production-source byte substrings. It selects a uniquely matched semantic-operation pattern with whitespace tolerance, checks that the mutation changes source, and validates original and edited TS/JS through the already-pinned esbuild parser. Each mutation still requires **one named baseline-green test and one failure through that test's assertion**; other failures cannot count as kills. Target sources are mutated **only in an isolated sandbox**, restored byte-for-byte with SHA-256 verification. This is intentionally a narrow targeted sensitivity audit, not repository-wide mutation coverage.

An attempted TypeScript compiler-API approach was rejected after CI demonstrated that the locked TypeScript 7 distribution does not expose the expected JavaScript AST interface. The replacement adds no new dependency. Its selector remains tied to the intended *semantic operation*, so a legitimate change to that operation may require updating the selector; incidental whitespace and formatting should not.

## 3. Pass E case-register reconciliation

The Pass E register lists 442 observed Node test identities. Comparing the successful pre-refactor and post-refactor CI reporter names and multiplicities produced:

- **442 → 442** executed cases;
- **436 identical titles retained**;
- **6 intentional renames**, covering `single-choice`, `multiple-select`, `numeric-entry`, `true-false`, `matching`, and `free-response`:
  - Prior: `review palette uses actual session evidence for <kind>`.
  - Now: `flagged answer state remains independent of answer status for <kind>`.
- **No other vanished or invented Node test titles.**

This equivalence preserves test identity, **not a claim that every assertion is unchanged**: the six flag cases deliberately changed to stronger engine-state assertions and the 13 removed presentation assertions have independently identified real-browser or structured-domain witnesses.

| Pass E risk/invariant | Surviving authoritative witness | Pass F action |
|---|---|---|
| SC01–SC04 exact scoring, six kinds, source comparison | `exam-scoring-and-policy` seeded independent ledger and metamorphic cases; authoring/cross-domain integration | Reorganised, unchanged oracle |
| TM01–TM03 time/phase conservation and session policy | `session-and-timing`, `question-timing-phases`, `result-integrity`, candidate browser | Reorganised, preserved |
| HS01–HS04 CAS, mirror, corruption, backup/history | `history-and-persistence` 576-state model; `history-record-integrity` 128-filter reference; browser storage/recovery | Reorganised, preserved independent layers |
| AU01–AU07 source integrity, candidate secrecy, approval, PDF, agent CLI | Authoring/content suites, headless CLI paths, `authoring-publication` and `candidate-core` browser | Registrations/CLI helper consolidated, strict publication and secrecy tests retained |
| LN01–LN03 FSRS, optimiser and notebook | `learning-and-analytics`, scheduler adapter contracts, native/WASM parity, browser Worker activation | Reorganised, preserved |
| UI01 flagged/answered palette | Pure state contract `flag-palette` + computed-paint/ARIA `status-palette` | Six replacement state tests; old class-text oracle retired |
| UI02–UI05 accessibility, media, navigation, responsiveness | `ui-and-navigation`, `media-rendering`, real browser image/navigation/responsive UI | 13 redundant markup/heading checks retired; real control/security/a11y checks protected |
| SEC01–SEC02 CSP, hashes, malformed inputs and data privacy | `build-security`, media validation, `csp-security` browser, authoring/data-integrity tests | Security checks retained |
| ARCH01 dependency topology; QA01 harness integrity | `architecture-boundaries` parsed import graph, syntax preflight, CI and guarded publisher | Unchanged |
| SCALE01 large banks/results | `authoring-scale`, `agent-benchmark`, `result-scale`, `result-stress` | Unchanged |

## 4. Verification evidence and limitations

CI [43577585914](https://github.com/oneshubhamt/practice-desk/actions/runs/43577585914) passed:

- strict TS / built-artifact check and all **435 fast Node cases**;
- all **7 deep Node scale/benchmark cases**;
- **10/10** named, baseline-green, assertion-killed, source-isolated mutants with the refactored matcher;
- six Chromium smoke and eight Chromium deep application scenarios;
- four Firefox and four WebKit engine-sensitive scenarios;
- native optimizer smoke, browser Worker activation/probes, native/WASM optimizer parity;
- guarded build publication on tested source ancestry.

**Honest failure history:** intermediate run [43576148765](https://github.com/oneshubhamt/practice-desk/actions/runs/43576148765) caught a residual self-referential test alias created by consolidation; fixed and all gates passed in subsequent run 43576300344. Intermediate run [43577276058](https://github.com/oneshubhamt/practice-desk/actions/runs/43577276058) caught use of the unavailable TypeScript 7 JS AST API; the esbuild-backed correction passed at 43577585914. No failed or incomplete intermediate commit is represented as verified.

**Measured economics (illustrative, not an SLA):**

| Command | Pass E green run 43569704822 | Final Pass F green 43577585914 |
|---|---:|---:|
| Fast Node/type/build | 38.85s | **24.59s** |
| Deep Node scale/benchmark | 4.64s | 4.64s |
| Targeted mutations | 7.52s | 7.70s |
| Chromium smoke | 28.22s | 35.77s |
| Chromium deep | 54.31s | 51.79s |
| Firefox cross | 15.29s | 20.16s |
| WebKit cross | 27.96s | 36.34s |

These are **two distinct GitHub-hosted observations**, not controlled paired benchmarks. Fast Node command speed improved in the observed runs, but browser times varied; total runtime should be evaluated across multiple comparable CI runs in Pass H.

## 5. Remaining purposeful work (outside Pass F)

- **Pass G:** more independent property/state models and adversarial cross-boundary sequences where evidence gaps were identified in Pass E; do not increase test count without protecting a new meaningful invariant.
- **Pass H:** controlled repeated-run CI economics, setup-versus-test attribution, semantic mutation adequacy, release-branch policy and final equivalence after any further deletion.
- Additional string/regex assertions remain where they protect actual **escaping, accessibility, reader-facing disclosure or security**; they should be challenged individually, not removed wholesale. This audit does not claim those 296 source sites are all necessary.
- Automated QA cannot independently establish external factual/PYQ truth, legal currency, authentic reviewer identity, physical device/Safari accessibility or long-term OS/profile data survival.

**Pass F closure:** all changes confined to 16 Node test files and two test-only infrastructure files. No production, browser scenario or workflow files changed. The permanent active contract remains [QA_CURRENT.md](QA_CURRENT.md); this document is the inspectable Pass F evidence record.
