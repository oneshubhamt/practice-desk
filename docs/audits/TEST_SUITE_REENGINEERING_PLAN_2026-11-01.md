# Practice Desk — Test-Suite Re-engineering Programme and Live Scratchpad

**Status:** IMPLEMENTATION PLAN PREPARED; IMPLEMENTATION NOT STARTED  
**Prepared:** 1 November 2026  
**Branch:** overhaul only  
**Audited base:** 12f2156d5967f73eabd74b0443bcc28f789167da  
**Baseline successful workflow:** [CI 41283842614](https://github.com/oneshubhamt/practice-desk/actions/runs/41283842614)  
**Scope/order:** **Five substantial engineering passes: tests (36–37) → browser scripts (38) → browser scripts/CI (39) → documentation and final signoff (40).** These are completion milestones, not atomic tickets; carry smaller work items inside each pass.

> This file is the programme's **sole evolving implementation plan, traceability register and work scratchpad**. Update it *during* each pass: audit, alternatives/decision, change ledger, objective-by-objective check, actual targeted QA and remaining uncertainty. Do not rely on chat history as the source of truth. Existing [AGENTS.md](../../AGENTS.md), [Section G of the original source audit](V11_SOURCE_AUDIT_2026-10-30.md), [decision register](../decisions/POLICY_REGISTER.md) and historical audit artifacts remain controlling for existing product/source/editorial contracts until Pass40 final documentation reconciliation. This new programme does not reopen v11 feature-parity decisions or authorise feature regressions.

## 0. Scope, intent, hard constraints

The objective is **better assurance per maintained test and per CI minute**, not to reduce tests for the sake of an arbitrary file-count or runtime target. The current application is a generic, single-file offline exam engine; it is not an SSC CGL-specific runtime. Its intended superset relationship to v11 is a **product contract**, not a requirement to execute v11 on every source change.

1. **No product regression:** preserve all material user-visible features of overhaul, including v11-derived functionality, Results hierarchy, compact exam layout, floating detached Aa, *non-sticky* main header, generic six-kind exams, imported APFC/NAT banks, review/source provenance, native Navigation API, FSRS Learning, offline storage, and responsive/accessible controls.
2. **No changes to frozen data:** preserve papers.json, patches.json and solutions.json identities, original/reviewed separation and the expressly approved 6 October CGL Q62 rule: original invalid/excluded; reviewed caution is scoreable using disputed published B (+2/−0.5). Preserve the other approved corrected-key semantics. Keep content hash checks and tamper resistance.
3. **No scoring regressions:** explicit rule precedence, proper positive/negative/unanswered marks, exact configured fractions up to normal floating arithmetic, partial-credit cap at full marks, conservative floor, manual-pending separation, and frozen eligible denominators. No answers pre-submission.
4. **No storage/data loss:** immutable attempts, compare-and-swap revision safety, stale-tab rejection, quota/fallback/error handling, additive checked v3 backup import, no silent replacement or v11-history migration.
5. **No architecture rollback:** native Navigation API only (no compatibility/router shims), modular typed source, a single six-kind engine, one generated self-contained HTML. Never hand-edit generated HTML.
6. **Only overhaul changes; no merge to main or baseline/v11.** CI-generated HTML publication remains gated on successful verification, with safe source drift detection.
7. **Preserve old CI gates until replacements demonstrably pass.** Do not remove Pass29 or another mandatory legacy check just because it looks redundant; prove the mapped modern test(s) and documented acceptance before retiring it. Current AGENTS.md mandates Pass29 and Pass30, so their coordinated policy/CI retirement occurs in Pass40; before that, use additive checks and preserve those mandatory gates.
8. **Phase discipline:** Passes 36–37 are test-side (new correctness tests then consolidation), avoiding browser scripts and CI changes except necessary test discovery. Pass38 builds replacement modern browser scripts and shared fixtures while all old gates continue. Pass39 optimises scripts/CI and retires *non-mandated* redundant scripts after proof; AGENTS-mandated Pass29/Pass30 remain until final handoff. Pass40 updates AGENTS, README, architecture/docs and performs the coordinated last CI handoff and final verification. This plan/scratchpad is the only documentation permitted to evolve before Pass40.
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

All 15 findings from the audit remain in scope, but **they are work items grouped within five passes**, not 15 independent milestones. Track each ID independently in the scratchpad.

| ID | Priority | Problem / contract to fix | Pass |
|---|---|---|---|
| TS-01 | High | Historical pass-number Node tests obscure feature ownership and overlap | 36–37 |
| TS-02 | High | Example-heavy scoring/state testing; property/model-based oracles missing | 36 |
| TS-03 | High | NAT tolerance, precision and scoring boundary cases need adversarial coverage | 36 |
| TS-04 | High | Time/state interleavings, stale tabs, backup and recovery model limits | 36 |
| TS-05 | High | Generic import, stress and hostile input boundaries | 36, 38 |
| TS-06 | Medium | Learning, analytics and UI-state tests spread across passes | 36–37 |
| TS-07 | High | Independently launched overlapping E2E scripts | 38–39 |
| TS-08 | High | Historical v11 screenshot/pixel checks retained as CI gates | 38–40 |
| TS-09 | High | Cross-browser matrix too narrow for modern features | 38 |
| TS-10 | Medium | No automated rules-based a11y gate / deeper interaction audit | 36, 38 |
| TS-11 | High | Duplicated CI checks, excessive artifacts and broad write permissions | 39–40 |
| TS-12 | Medium | Historical Pass21→Pass22 SHA/DOM benchmark gate | 38–39 |
| TS-13 | High | AGENTS and docs prescribe old pass-number gates | 40 |
| TS-14 | Medium | No assertion-by-assertion old→new coverage disposition | 36–40 |
| TS-15 | Medium | Runner, browser, dependency, fixture determinism and flakiness policy | 36, 38–39 |

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

Keep the test cases that encode real behaviour. Map each **named original case** to a retained, migrated, merged or historical-only outcome before deleting anything. This table groups ownership, not mandated file count.

| Planned capability owner | Current test files (substantive cases to preserve) | Pass |
|---|---|---|
| Source content, integrity and provenance | content.test, import-cgl.test, cgl-practice.test, pass16-independent, pass23-independent | 36–37 |
| Generic packages / question bank | domain.test, exam-package.test, generic-exam-flow.test, pass12-review, pass17-contracts, pass30-bank | 36–37 |
| Scoring / bounds / precision | engine.test, pass16-independent, pass17-contracts, pass20-preflight, pass23-independent, pass30-bank | 36–37 |
| Session / clock / navigation state | engine.test, pass7-engine, pass17-contracts, pass18-timing-deletion, pass32-navigation | 36–37 |
| Persistence / backups / history | backup.test, storage-concurrency.test, history.test, pass6-integrity, pass13-history, pass18-timing-deletion, pass19-history | 36–37 |
| Results / evidence / analytics | pass9-ui, pass14-analytics, pass19-history, pass20-preflight, pass21-contracts, pass22-response, pass28-semantics | 36–37 |
| Learning / review lineage | learning.test, pass8-learning, pass12-review, pass14-analytics | 36–37 |
| UI models / markup / source security | build.test, generic-ui.test, pass9-ui, pass21-contracts, pass22-response, pass28-semantics | 36–37 |
| Shared deterministic fixtures | tests/fixtures/six-kinds.mjs and locally reconstructed states | 36–37 |

**Test discoverability:** currently `node --test tests/*.test.mjs`. Preserve discovery through changes; verify any new subdirectory glob explicitly. Source-hash/Q62 editorial assertions must not be mechanically merged away.

### Pass36 immutable test-case inventory — originals 1–15 of 31

**tests/backup.test.mjs** (4 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/backup.test.mjs#1` SHA-256 standard vectors and UTF-8
- `tests/backup.test.mjs#2` complete backup v3 preserves records and preferences
- `tests/backup.test.mjs#3` preferences import validates range and type
- `tests/backup.test.mjs#4` backup merge is additive and preserves active and completed IDs

**tests/build.test.mjs** (1 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/build.test.mjs#1` single-file release contains a complete inline app

**tests/cgl-practice.test.mjs** (2 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/cgl-practice.test.mjs#1` all original and reviewed editions use one validated question model
- `tests/cgl-practice.test.mjs#2` one engine supports strict, flexible and single CGL policies

**tests/content.test.mjs** (3 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/content.test.mjs#1` current library satisfies schema and all cross-bank references
- `tests/content.test.mjs#2` validator rejects duplicate question numbers and invalid answer keys
- `tests/content.test.mjs#3` validator rejects orphaned patches, missing stimuli and unknown fields

**tests/domain.test.mjs** (6 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/domain.test.mjs#1` accepts a valid question, paper revision and matching answer key
- `tests/domain.test.mjs#2` rejects duplicate option identities and malformed hashes
- `tests/domain.test.mjs#3` rejects incompatible answer kinds and unknown option IDs
- `tests/domain.test.mjs#4` rejects duplicate section membership and missing sectional limits
- `tests/domain.test.mjs#5` rejects scoring rules with a positive wrong-answer penalty
- `tests/domain.test.mjs#6` rejects an answer key that omits a question in the paper

**tests/engine.test.mjs** (5 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/engine.test.mjs#1` visibility change commits the preceding visible interval exactly once
- `tests/engine.test.mjs#2` overshoot splits sectional timing and closes sections without double counting
- `tests/engine.test.mjs#3` pause freezes countdown; resume rebases; completion is terminal
- `tests/engine.test.mjs#4` locked navigation, early section submission and answer clearing
- `tests/engine.test.mjs#5` scoring uses explicit rules and excludes invalid questions

**tests/exam-package.test.mjs** (3 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/exam-package.test.mjs#1` generic importer retains all 500 questions in 10 existing editions
- `tests/exam-package.test.mjs#2` a package rejects missing questions, unknown media and malformed keys
- `tests/exam-package.test.mjs#3` generic attempt uses validated responses and frozen revisions

**tests/generic-exam-flow.test.mjs** (5 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/generic-exam-flow.test.mjs#1` a non-CGL paper completes all six response types through the same engine
- `tests/generic-exam-flow.test.mjs#2` invalid numeric value, underspecified selections and duplicate matches are rejected
- `tests/generic-exam-flow.test.mjs#3` forward-only navigation restrictions are respected for non-CGL papers
- `tests/generic-exam-flow.test.mjs#4` generic attempts and imported packages survive a verified history backup round trip
- `tests/generic-exam-flow.test.mjs#5` completed generic scores cannot be silently rewritten in stored history

**tests/generic-ui.test.mjs** (5 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/generic-ui.test.mjs#1` six exam question response kinds render editable, escaped controls
- `tests/generic-ui.test.mjs#2` timer display derives from paper policy, not CGL constants
- `tests/generic-ui.test.mjs#3` review answers resolve human labels for all six question kinds
- `tests/generic-ui.test.mjs#4` generic history rejects malformed stored records before import
- `tests/generic-ui.test.mjs#5` shared renderer enforces paused, forward-only and no-early-submit policies

**tests/history.test.mjs** (7 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/history.test.mjs#1` frozen attempt survives a later changed key, paper or editorial state
- `tests/history.test.mjs#2` saved strict session expires while app is closed, without fictitious foreground viewing
- `tests/history.test.mjs#3` paused flexible attempt does not consume offline wall time
- `tests/history.test.mjs#4` recover from clock rollback without assigning negative time
- `tests/history.test.mjs#5` completed record always defeats stale active mirror
- `tests/history.test.mjs#6` revision-aware recovery cannot revive an older tab's emergency mirror
- `tests/history.test.mjs#7` an older completed mirror cannot supersede a newer in-progress revision

**tests/import-cgl.test.mjs** (4 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/import-cgl.test.mjs#1` imports all five CGL source and reviewed editions with revision-pinned keys
- `tests/import-cgl.test.mjs#2` v11-reviewed editorial policy: source invalid without a patch is scored as caution
- `tests/import-cgl.test.mjs#3` rejects unknown options and out-of-bounds responses
- `tests/import-cgl.test.mjs#4` generic scoring matches CGL configured marking rules

**tests/learning.test.mjs** (4 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/learning.test.mjs#1` learning cards are created from completed immutable answers, not active test keys
- `tests/learning.test.mjs#2` FSRS-7 from stable ts-fsrs 6.0.0 schedules only explicit review ratings
- `tests/learning.test.mjs#3` topic evidence and trends never compare different paper revisions
- `tests/learning.test.mjs#4` backup preserves notes and FSRS review logs with strict integrity checks

**tests/pass12-review.test.mjs** (6 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass12-review.test.mjs#1` CGL original wording, options, source key and media are frozen at reviewed test start
- `tests/pass12-review.test.mjs#2` edited single-section CGL preserves only its changed question subset and adjusted max
- `tests/pass12-review.test.mjs#3` non-CGL exam source/review snapshots support six response types and arbitrary marking
- `tests/pass12-review.test.mjs#4` source-review snapshots detect passage-only edits without forcing a new question kind
- `tests/pass12-review.test.mjs#5` corrected published keys are compared by semantic source option ID, not display index
- `tests/pass12-review.test.mjs#6` time expiration and voluntary finishing have separate durable source-independent reasons

**tests/pass13-history.test.mjs** (4 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass13-history.test.mjs#1` device-local exam choice validates arbitrary exam revisions and survives corrupt storage
- `tests/pass13-history.test.mjs#2` exact frozen paper edition filtering combines with free text and status
- `tests/pass13-history.test.mjs#3` adjusted score trends require exact frozen key, revision and practice mode
- `tests/pass13-history.test.mjs#4` old v3 backups remain compatible and optional exam setup is checksum-covered

**tests/pass14-analytics.test.mjs** (5 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass14-analytics.test.mjs#1` visits reflect cursor entries, never answering, flags, repeated cursor or clock ticks
- `tests/pass14-analytics.test.mjs#2` section auto-advance records a new section's first question once
- `tests/pass14-analytics.test.mjs#3` generic six-kind frozen timing classifications, accurate filters, longest links and conservative suggestions
- `tests/pass14-analytics.test.mjs#4` historic visits and insufficient speed samples are disclosed, not manufactured
- `tests/pass14-analytics.test.mjs#5` negative marking, manual-pending and excluded questions stay separate from pace classification

**Subtotals:** 64 named original cases across 15 files. Every item above remains covered by its original runnable test; no deletion or renaming in Pass36. The Pass37 migration disposition will annotate successor paths at the individual-case level.

### Pass36 immutable test-case inventory — originals 16–31 of 31

**tests/pass16-independent.test.mjs** (5 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass16-independent.test.mjs#1` independent v11 edition parity: all five CGL papers preserve 500 original published keys, and reviewed patches
- `tests/pass16-independent.test.mjs#2` October 6 Q62: published b disputed; original excluded, reviewed caution remains scored against b
- `tests/pass16-independent.test.mjs#3` imported generic multiple-select cannot earn above declared max through excessive component awards
- `tests/pass16-independent.test.mjs#4` imported generic matching partial response cannot exceed nominal full credit
- `tests/pass16-independent.test.mjs#5` standard CGL marking and nominal denominator are unchanged by generic cap

**tests/pass17-contracts.test.mjs** (12 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass17-contracts.test.mjs#1` G01: whole-paper locked sections have explicit one-way progress and cannot submit unseen later sections
- `tests/pass17-contracts.test.mjs#2` G01: untimed sequentially locked sections are reachable but cannot be skipped
- `tests/pass17-contracts.test.mjs#3` G01/G02: sectional clocks reject a contradictory free section-navigation promise
- `tests/pass17-contracts.test.mjs#4` G01 adjacent: a whole-paper lock cannot bypass the global deadline
- `tests/pass17-contracts.test.mjs#5` G02: manual expiry freezes answers and elapsed time until an explicit continuation
- `tests/pass17-contracts.test.mjs#6` G02 adjacent: automatic sectional expiry still advances across overshoot; early submission works
- `tests/pass17-contracts.test.mjs#7` G02 extra: no-deadline sectional sections can always be finished explicitly
- `tests/pass17-contracts.test.mjs#8` G04: imported multi-select key is constrained by actual candidate selection bounds
- `tests/pass17-contracts.test.mjs#9` G05: imported matching keys cannot reuse left or right endpoints
- `tests/pass17-contracts.test.mjs#10` G03/G09: blank reward cannot exceed correct; worse-than-wrong blank is rejected across overrides
- `tests/pass17-contracts.test.mjs#11` G09: unusual partial penalties have honest conservative lower bound and capped full maximum
- `tests/pass17-contracts.test.mjs#12` G06: withholding detailed post-test review does not disable exam navigation or summary/timing tabs

**tests/pass18-timing-deletion.test.mjs** (8 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass18-timing-deletion.test.mjs#1` F01: automatic multi-section clock stores exactly one closure each, split across a late background tick
- `tests/pass18-timing-deletion.test.mjs#2` F01: early-submitted sequential section and final section preserve timer durations, not response exposure
- `tests/pass18-timing-deletion.test.mjs#3` F01: manual expiry freezes waiting interval through persistence and restore
- `tests/pass18-timing-deletion.test.mjs#4` F01: locked whole-paper sections have consumable section time; free multi-section does not
- `tests/pass18-timing-deletion.test.mjs#5` F01: older stored attempt lacks section timer evidence, and imported false claims are rejected
- `tests/pass18-timing-deletion.test.mjs#6` F09: elapsed timer, actual answer attempt-rate and global median exclude editorially unscored items
- `tests/pass18-timing-deletion.test.mjs#7` F13: status-specific destructive intent rejects cross-type and wrong-lifecycle requests
- `tests/pass18-timing-deletion.test.mjs#8` F13: archive renders completed Delete and unfinished Discard as non-interchangeable controls

**tests/pass19-history.test.mjs** (6 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass19-history.test.mjs#1` F03: rank frozen adjusted marks, not accuracy, across two real compatible full CGL papers
- `tests/pass19-history.test.mjs#2` F03: eight newest qualifying full-paper records limit cohort; single and unrelated modes excluded
- `tests/pass19-history.test.mjs#3` F03: separate exam identities and differently structured papers cannot produce false cross-paper groups
- `tests/pass19-history.test.mjs#4` F03: negative earned marks stay visible while progress width can be clamped for display
- `tests/pass19-history.test.mjs#5` F04: archive uses attempt's frozen eligible maximum, not nominal 100-paper marks
- `tests/pass19-history.test.mjs#6` F05 adjacent: archive status filters retain separate complete and progress workflows

**tests/pass20-preflight.test.mjs** (7 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass20-preflight.test.mjs#1` F02: reviewed CGL strict, free, single are calculated on their actual executable policy
- `tests/pass20-preflight.test.mjs#2` F02/F15: source edition reports excluded publisher items; reviewed is scoreable caution, not official SSC
- `tests/pass20-preflight.test.mjs#3` F02: a custom exam uses frozen eligible max and plainly labels manual questions
- `tests/pass20-preflight.test.mjs#4` F02: effective per-item and per-section overrides are disclosed without key answers
- `tests/pass20-preflight.test.mjs#5` F02: a paper with only manually graded and excluded items never invents an automated maximum
- `tests/pass20-preflight.test.mjs#6` F06: generic timing/section, forward navigation, review and pause policies are explained
- `tests/pass20-preflight.test.mjs#7` F15: independently imported editions cannot inherit built-in SSC provenance

**tests/pass21-contracts.test.mjs** (6 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass21-contracts.test.mjs#1` F07: built-in CGL question/option media carries exact contextual alt descriptions in both editions
- `tests/pass21-contracts.test.mjs#2` F07: generic author alt survives exactly; option without alt gets contextual fallback
- `tests/pass21-contracts.test.mjs#3` F07: actual question screen inherits source context rather than generic image label
- `tests/pass21-contracts.test.mjs#4` F08: all eight statuses have explicit meaningful labels; change types avoid false key-correction claims
- `tests/pass21-contracts.test.mjs#5` F10: paused marking changes only the flag; time, response, cursor and visit counts remain frozen
- `tests/pass21-contracts.test.mjs#6` F10: cannot flag when disabled, after expiry or after completion

**tests/pass22-response.test.mjs** (3 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass22-response.test.mjs#1` G07: under-minimum and over-maximum selections are clearly unsaved; legal selections are not drafts
- `tests/pass22-response.test.mjs#2` G07: explicit draft renders visible selected options and a live status without altering saved engine response
- `tests/pass22-response.test.mjs#3` G08: report each duplicate right value once; blanks and distinct right choices are legal

**tests/pass23-independent.test.mjs** (9 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass23-independent.test.mjs#1` SOURCE A/V01/V05/V19: original three content banks byte-identical with frozen baseline v11
- `tests/pass23-independent.test.mjs#2` V02/V07/F02/F06: all 10 paper editions have derived full/section marks, no hardcoded ceiling
- `tests/pass23-independent.test.mjs#3` V05/V07/F08/Q62: same published B remains reviewed scoreable caution, original excluded
- `tests/pass23-independent.test.mjs#4` G01/G02/F01/F09: locked shared paper, manual expiry and frozen truthful section timers
- `tests/pass23-independent.test.mjs#5` G03/G09: imported marks have honest ceiling/floor and forbid worse-than-wrong blanks
- `tests/pass23-independent.test.mjs#6` G04/G05: reject answer keys candidates cannot legally reproduce
- `tests/pass23-independent.test.mjs#7` G06/V06/V10: no-review edition keeps results but never exposes answer tab
- `tests/pass23-independent.test.mjs#8` G07/G08: drafts explicitly nonpersistent, duplicate matching targets deterministic
- `tests/pass23-independent.test.mjs#9` F13/G10: delete lifecycle cannot bypass unfinished status; v11 backup intentionally unsupported

**tests/pass28-semantics.test.mjs** (3 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass28-semantics.test.mjs#1` L08: classified changes match actual source/patch field differences
- `tests/pass28-semantics.test.mjs#2` L08: 30 Sep Q6 C to D, wording-only Q3, and disputed 6 Oct Q62 unchanged
- `tests/pass28-semantics.test.mjs#3` L09/L10: timing type and frozen mode have accurate labels, untimed included

**tests/pass30-bank.test.mjs** (4 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass30-bank.test.mjs#1` easy APFC/NAT author bank generates a strict validated immutable exam package
- `tests/pass30-bank.test.mjs#2` simple-bank input rejects malformed keys, excess questions, invalid marks and NAT tolerance
- `tests/pass30-bank.test.mjs#3` untimed option derives new validated frozen policy for every built-in mode and generic package
- `tests/pass30-bank.test.mjs#4` existing selection v1 survives optional new edition and untimed fields

**tests/pass32-navigation.test.mjs** (3 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass32-navigation.test.mjs#1` native-only query codec round-trips every routable screen on file URL
- `tests/pass32-navigation.test.mjs#2` native codec rejects ambiguous, malformed or answer-bearing route schema
- `tests/pass32-navigation.test.mjs#3` routeHref clears old route parameters without destroying unrelated query

**tests/pass6-integrity.test.mjs** (5 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass6-integrity.test.mjs#1` canonical hashes prevent unreviewed edits to question, answer key or paper
- `tests/pass6-integrity.test.mjs#2` stimuli and assets reject unsupported fields, missing images, bad media and malformed tables
- `tests/pass6-integrity.test.mjs#3` frozen attempt and learning notebook retain media after original package is unavailable
- `tests/pass6-integrity.test.mjs#4` stored result rejects tampered item verdict even with untouched totals
- `tests/pass6-integrity.test.mjs#5` display preferences are validated and round-trip through storage

**tests/pass7-engine.test.mjs** (9 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass7-engine.test.mjs#1` strict section submission policy is an engine invariant, not a disabled button
- `tests/pass7-engine.test.mjs#2` delayed submit cannot accidentally finish the next section after a timeout
- `tests/pass7-engine.test.mjs#3` pause and flag policies hold in pure transitions, including clock rollback
- `tests/pass7-engine.test.mjs#4` all four attempt modes are pinned with their actual CGL policy or custom package
- `tests/pass7-engine.test.mjs#5` built-in source page and independently supplied references survive reviewed import
- `tests/pass7-engine.test.mjs#6` written response can be explicitly self-assessed without modifying frozen automated results
- `tests/pass7-engine.test.mjs#7` source-key comparison pins original answer references independently of reviewed revisions
- `tests/pass7-engine.test.mjs#8` draft and editorial-unsafe questions are excluded rather than treated as correct
- `tests/pass7-engine.test.mjs#9` live timer uses nondecreasing monotonic elapsed time even if wall clock moves

**tests/pass8-learning.test.mjs** (6 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass8-learning.test.mjs#1` generated notebook revision is a real validated attempt, not a copied note
- `tests/pass8-learning.test.mjs#2` revision selection rejects duplicates, unsafe statuses, mixed exams and impossible sizes
- `tests/pass8-learning.test.mjs#3` media from notebook remains in generated paper even if source package disappears
- `tests/pass8-learning.test.mjs#4` pace, speed relative to a section median and marking opportunities are exact
- `tests/pass8-learning.test.mjs#5` evidence progression requires independent attempts and distinct questions
- `tests/pass8-learning.test.mjs#6` speed classification uses a sufficient section median and distinguishes fast mistakes

**tests/pass9-ui.test.mjs** (5 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/pass9-ui.test.mjs#1` dedicated history filters/sorts completed and in-progress records without mutating source
- `tests/pass9-ui.test.mjs#2` history is a genuinely separate panel with faithful evidence disclaimers and native actions
- `tests/pass9-ui.test.mjs#3` result tabs and time ledger keep frozen verdicts, timings and accessible controls separate
- `tests/pass9-ui.test.mjs#4` restored exam shell exposes progress, timer and navigator while withholding answer keys
- `tests/pass9-ui.test.mjs#5` answer changes preserve actual events and distinguish rescued from lost answers

**tests/storage-concurrency.test.mjs** (1 cases) — *Pass36 retain, Pass37 ownership review*

- `tests/storage-concurrency.test.mjs#1` new records cannot be overwritten and concurrent revisions conflict

**Subtotals:** 92 named original cases across 16 files. **Total legacy inventory: 64 + 92 = 156**, all currently retained. They are the immutable baseline for Pass37 assertion-by-assertion migration, not a claim that the new property cases passed CI.

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

### Pass36 baseline browser-script census — 25/25 files inspected

The 25 sources were read on `overhaul`; **no browser script changed**. Each row's behavioural owner and historical/disposition proposal are in the migration table above. The count below is only a **textual search for `assert(`, `check(`, `ensure(`, or `fail(`**; it is **not an exhaustive assertion count**, since scripts have other helper names, conditional branches and indirect checks. A zero does **not** mean the script has zero validations. For each script Pass38 must still create an explicit scenario-by-scenario old→new trace before retirement.

| Browser script `scripts/*.mjs` | Direct recognised guard call sites (approx.) | Loads frozen Git baseline/old SHA |
|---|---:|---|
| `smoke-offline.mjs` | 95 | no |
| `pass10-platform.mjs` | 5 | no |
| `pass11-parity.mjs` | 28 | no |
| `pass12-parity.mjs` | 0 | no |
| `pass13-history.mjs` | 0 | no |
| `pass14-parity.mjs` | 19 | no |
| `pass15-visual.mjs` | 25 | yes |
| `pass16-independent.mjs` | 23 | no |
| `pass18-targeted.mjs` | 17 | no |
| `pass19-targeted.mjs` | 21 | no |
| `pass20-targeted.mjs` | 28 | no |
| `pass21-targeted.mjs` | 28 | no |
| `pass22-targeted.mjs` | 33 | yes |
| `pass23-independent.mjs` | 36 | yes |
| `pass25-library.mjs` | 26 | yes |
| `pass26-exam.mjs` | 26 | yes |
| `pass27-history-results.mjs` | 36 | yes |
| `pass28-semantics.mjs` | 21 | yes |
| `pass29-independent-matrix.mjs` | 38 | yes |
| `pass30-ui.mjs` | 25 | no |
| `pass31-ui.mjs` | 33 | yes |
| `pass32-native-navigation.mjs` | 15 | no |
| `pass33-results-parity.mjs` | 32 | yes |
| `pass34-v11-display.mjs` | 0 | yes |
| `pass35-detached-display.mjs` | 14 | no |

**Script inventory reconciliation:** 25/25 named browser scripts inventoried and matched to the Section 3 candidate successor ownership. Old tests/scripts remain fully operational; unique interactive checks will be cross-walked against real new `file://` journeys in Pass38 *before deletion*. Source hash/editorial checks remain in Node suites independent of old visual evidence.

## 4. Implementation programme — five passes, tests → scripts → docs

The previous 15-pass outline oversplit individual test topics into standalone milestones. **This replaces it with five coherent deliverables** while retaining every substantive requirement. Each pass can contain internal checklist items and incremental commits; **do not create another named pass** just because one item needs a second round of QA. Finish and reconcile all objectives within the current pass before advancing.

### Pass 36 — Strengthen tests and establish an independent coverage baseline
**Phase: tests.** No existing browser-script/CI retirement.

**Audit and inventory**
- Enumerate existing Node test cases, fixtures, browser assertions and CI steps; record their owners, unique failure modes, existing source consumers and current benchmark metrics.
- Make the old→new **assertion-level** mapping for all named Node cases and 25 browser scripts; classify essential, useful overlapping, or historical evidence. Do not confuse screenshot quantity with contract coverage.
- Choose deterministic seeded/property testing or a compact equivalent with independent oracles, reproducible failure seeds and simple shrinking. Keep readable examples for important regressions.

**Implement test hardening**
- Mathematical scoring invariants: marks sums, positive−penalty, floor/ceiling, no double count, section/question/kind overrides, pending/excluded/blank, partial cap and scoreable denominators; APFC exact configured −5/6 (floating tolerance), CGL +2/−0.5, negative totals, presentation rounding and negative zero.
- NAT/answer-kind boundaries: zero/negative and multiple accepted values, absolute versus relative tolerance exactly on/outside boundary, floating rounding; matching cardinality/uniqueness, multi-select validity, authored bank advanced six-kind and APFC/NAT importer; reject malformed and near-limit hostile input safely.
- State model: seeded event sequences with TICK, ANSWER, PAUSE, RESUME, SECTION_SUBMIT, ATTEMPT_SUBMIT, restore and navigation; sectional timing, overshoot, rollback, terminal immutability and no pre-submit key leakage.
- Data/persistence: stale-tab compare-and-swap interleavings, frozen attempts, crash/reload, quota/fallback, checked additive backup/ID collisions/deletion; no v11 data migration.
- Analytics/learning: frozen eligible totals, visits, sufficiency/median/speed, explicit FSRS ratings, notebook/media lineage, no unsupported mastery or invented timing; pure accessibility/DOM semantics where feasible.
- Use small fast pure test data for boundary tests; reserve heavyweight browser stress for Pass38. If stronger tests expose source defects, reproduce and make a narrow justified product fix with exact regression proofs—never weaken a test to make CI green.

**Objective reconciliation / gate**
- Assertions have explicit independent expected results, seed and deterministic fixtures; essential behaviours mapped; unchanged old browser jobs continue to pass.
- Targeted tests during work, full `npm run check` after integrated hardening. Record actual cases/seeds/CI evidence in Section 6. **Do not advance if new tests are only nominal wrappers or duplicate the production oracle.**

### Pass 37 — Consolidate and organise the Node test suite
**Phase: tests.** This is the second and final test-side pass.

- Relocate/rename chronological pass-number tests into capability owners: source/content integrity, schema/import, scoring, exam/session, persistence/history, analytics/results, learning/review, navigation/UI model and shared fixtures.
- Remove only genuinely duplicated examples after proving equivalent or stronger assertions; preserve documented exact editorial/source hashes and independent regression signals.
- Keep one discoverable test runner and correct package scripts; no dropped tests from changing `tests/*.test.mjs` discovery.
- Audit test output quality and deterministic diagnostics; minimise redundant fixture setup and test code without hiding failures.
- **Acceptance:** every old named case has a disposition and replacement assertion/path; pure tests and old full CI green; source and frozen content unchanged except explicitly reproduced bug fixes. **No browser/CI rearchitecture yet.**

### Pass 38 — Replace historical browser scripts with modern capability-based journeys
**Phase: scripts.** Old browser gates stay live in parallel during this pass.

- Build one common file:// browser harness with repeatable profiles, fixtures, browser lifecycle, selectable editions/modes/question banks, controlled browser versions, failure snapshots/traces only when useful and stable synchronisation (no arbitrary sleeps).
- Implement coherent, independent current-app E2E user journeys covering Library→Exam→Results→History/Resume, source versus reviewed, CGL strict/flexible/single, untimed, generic six kinds, writing/manual grading, APFC/NAT bank/template, Learning/FSRS, storage restart/quota/stale tab, backup/recovery and delete/discard.
- Test real native Navigation API Back/Forward/deep links; no compatibility shims. Protect edited Q62 policy, source provenance and pre-submit answer protection.
- Test current **UI contract** without frozen v11 render: Library and Exam first-fold usability, Results hierarchy, low-evidence card suppression/lazy pane DOM, History, Learning, display Aa detached and fixed while regular header scrolls, focus/popover, keyboard, ARIA, overflow and reduced motion.
- Representative laptop/phone/tablet, light/dark and 195px narrow/zoom-equivalent scenarios; curate only a small useful modern screenshot set. Add a meaningful automated accessibility-rules audit when suitable, noting it is not AT certification.
- Run critical journeys in Chromium, Firefox and WebKit, preserving prior platform persistence checks and disclosing any unsupported native API accurately; no hidden skip/fallback means “passed”.
- Add bounded large-bank/long-history/backup stress and replace historical Pass22 vs Pass21 DOM benchmark with current lazy-render/performance invariants, with measured, nonflaky thresholds.
- **Acceptance:** scenario-level map from every old smoke/Pass script to a new direct contract or documented historical-only disposition; all old mandatory gates and all new suites green. **Do not retire legacy scripts during this pass.**

### Pass 39 — Consolidate browser scripts, optimise CI and prove retirement safety

**CURRENT CANONICAL STATUS:** Pass39 screenshot retirement, coordinated AGENTS/CI redesign and green independent QA were completed on 1 November 2026 in the verified checkpoint above. The original temporary Pass29/30 retention steps that follow are superseded as historical planning by the user's subsequent instruction; **do not revive them**.

**Phase: scripts/CI.** Documentation other than this scratchpad remains untouched.

- Audit all 25 legacy script scenarios against the replacement suite. Retire old scripts/CI runs **only after** proof that each unique behaviour has a modern successor or is strictly historical evidence. Preserve archival links and commits; do not import large screenshot binaries into Git.
- Phase out v11 two-app screenshot/pixel parity, including duplicated Pass15/24, Pass25–28, Pass31/33/34, the 56 paired scenes of Pass29 and SHA-specific Pass22 benchmark. Keep independent content/score/editorial invariants and modern Pass35 detached-Aa behaviour.
- Keep **AGENTS-mandated Pass29 and Pass30 executable and running** until Pass40 coordinated policy handoff; the other obsolete scripts may be retired once their coverage is proven.
- CI structure: shared core typecheck/build/Node once; offline Chromium critical journeys; selective cross-browser; optional/release visual/stress; targeted artifacts and no duplicate 30-day screenshot warehouses.
- Check publication/security: tests read-only; minimum `contents:write` only for verified HTML publishing, with correct upstream `needs` dependencies and safe source-drift/rebase checks. Test push/PR/docs-only/source/CI change classes and failure-to-publish cases.
- Improve reproducibility with a controlled browser install and justified lockfile/npm ci decision; retain Node 24 and verified self-contained file:// distribution.
- **Acceptance:** new mandatory CI is green **alongside the temporarily retained Pass29/30 gates**, no unique contract lost, all pending policy changes recorded for Pass40, timings captured. Intermediate CI may not yet show full runtime savings while the two legacy requirements still run.

### Pass 40 —
**UPDATED scope after user-authorised Pass39 parity closure:** do independent final code/CI/security/doc QA; do not recreate frozen-v11 paired screenshot matrix or restore removed mandatory Pass29/30 paths. Maintain human/device/AT and optional new UI risks honestly.
 Documentation, coordinated legacy-gate handoff and final independent acceptance
**Phase: docs last and final release engineering.** No main merge.

- Update `AGENTS.md`, root README, docs index, current architecture/data contracts, decisions/QA guide, and references so capability-based tests are the **permanent** contract; earlier feature-parity reports remain properly identified historical records.
- **Coordinate policy and executable switch:** after Pass39 replacements are proven, change outdated AGENTS mandates for Pass29/30 and remove their old CI invocations/executables in the same reviewed handoff. Never produce an interim commit where mandatory instructions promise a script that CI silently omits.
- Publish commands for fast test suite, offline browser critical path, cross-browser acceptance, explicit release visual/stress, seeded reproduction, supported/unsupported engine matrix, useful evidence retention and human/manual/AT signoff.
- Independent final audit of all finding IDs and scenario dispositions, source/content hashes, Q62, generic exam/score policy, build output, frozen storage safety, no pre-submit leaks, CI publish/drift safety and all three browser engines.
- Compare actual CI wall/runner minutes, maintained QA footprint and flakiness before/after. Document unresolved accessibility, real-device, OS-kill/storage eviction and hostile-large-input limitations **without claiming certification**.
- **Programme gate:** no required v11 live UI oracle or historical SHA benchmark; no unused gate references; measured improvement without reduced assurance; final CI green, programme worklog complete, and **no product release/merge absent user approval**.

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

## 6. Live pass ledger (update **throughout** implementation)

| Pass | Phase | Status | Finding IDs | Code commits | Assertion migrations / scripts | Targeted QA + CI evidence | Remaining risks |
|---|---|---|---|---|---|---|---|
| 36 | Tests hardening | **VERIFIED — full CI 4/4** | TS-01–06,10,14,15 | `78f65b1` through `ec4decb` | 5 new suites, 21 named cases; 156 originals retained | [CI 41287019774](https://github.com/oneshubhamt/practice-desk/actions/runs/41287019774) — 177/177 Node, Firefox/WebKit/independent/Chromium green | Deeper browser assertions, automated a11y, real-device and stress/browser coverage intentionally P38 |
| 37 | Tests organisation | **VERIFIED — 4/4 CI** | TS-01,06,14,15 | `b7af806`, `b9c1dd8` | 36 → 31 → **8** suites; **177/177** original cases retained | [CI 41288913824](https://github.com/oneshubhamt/practice-desk/actions/runs/41288913824): Node 177/177, Chromium/Firefox/WebKit/independent matrix 4/4 green | Pass30 filename policy preserved to Pass40; historical browser scripts still Phase II |
| 38 | Browser scripts | **VERIFIED — 4/4 CI, no legacy retired** | TS-05,07–10,12,14,15 | `bdca4ef`→`d88e8d0` | Shared harness + 5 modern acceptance suites; 26-script migration/retention map | [CI 41296469053](https://github.com/oneshubhamt/practice-desk/actions/runs/41296469053): Node 177/177; modern journeys; Chromium, Firefox, WebKit, independent matrix 4/4 | WebKit native Back after file reload unsupported; unique old guards and mandated Pass29/30 protected through next passes |
| 39 | Scripts + CI | **VERIFIED — 5/5 workflow jobs** | TS-07,08,11,12,14,15 | `854e327`→`48a8d1e` | 16 historical scripts removed, Pass29/30 current-only successors, no routine screenshots, read-only QA + gated publisher | [CI 41299638290](https://github.com/oneshubhamt/practice-desk/actions/runs/41299638290): 177/177 Node, Chromium, Firefox, WebKit, publication all green | 195px+140% **combined** Results overflow open; WebKit native file Back unsupported; ten screenshot-free legacy safety scripts remain |
| 40 | Docs + final acceptance | NOT STARTED | TS-08,11,13,14 | — | — | — | Policy/CI synchronized final handoff |

### Pass 36 — LIVE checkpoint A: audit and analysis (2026-11-01)

**Starting branch HEAD:** `d2da82ae3313a3eab66f42b37fc77a01186a126b`. Only `overhaul`. **Finding IDs:** TS-01, TS-02, TS-03, TS-04, TS-05, TS-06, TS-10, TS-14, TS-15. Old Pass29/30 and all existing CI jobs remain mandatory.

**Source and consumers actually inspected:** `src/engine/{scoring,score-ceiling,session}.ts`, `src/domain/{question,exam,scoring}.ts`, `src/history/{concurrency,backup}.ts`, `src/app/bank-import.ts`, `src/learning/question-analytics.ts`; source references and all named tests in the 31 existing Node suites; `AGENTS.md`, original Section G, current architecture, CI and working plan. Existing browser-script inventory in Section 3 is provisional at scenario level pending assert-by-assert browser migration in Pass38.

**Baseline enumeration:** 31 Node `.test.mjs` files, **156 statically declared named `test(...)` cases** (64 cases across the first 15 files + 92 across the remaining 16); one shared six-kind fixture; 25 browser QA scripts plus build/helper scripts. The tree and actual declarations were read through the GitHub connector. Existing run 41283842614 measured ~7 sec core checks and ~4m22s workflow wall; this is prior run, **not a Pass36 QA result**.

**Test ownership decision:** Add `tests/contract-*.test.mjs` hardening suites with stable explicit seeds and independent arithmetic/state oracles. Retain all 156 original cases and existing old browser gates in Pass36. Reorganising old tests belongs to Pass37. No new dependency (Node 24 native `node:test`), no production code changes unless a reproducible failing invariant proves a defect. Direct scoring API tests and separately validated package/import tests each test their own level; do not pretend a direct unvalidated `scoreAttempt` call proves importer validation. Floating-point equality uses mathematically motivated approximate comparisons and exact binary-fraction boundary fixtures. Synthetic session clocks, no sleeps.

**Pre-existing risk / rejected alternatives:** large property-based library adds unneeded dependency and lock complexity for this pass; fixed-seed xorshift generator with scenario/seed in failure output is smaller, inspectable and reproducible. Rejected identical implementation-as-oracle. Pure tests cannot establish actual `file://`, browser quota denial or a11y; those remain Pass38 browser commitments. No assertion deletions before Pass37 migration mapping.

**Implementation checkpoint B (2026-11-01, test-side only):** Added five native Node test suites: `contract-scoring-properties` (seeded overrides/marks/ceilings/partial/NAT/APFC); `contract-session-model` (160 seeded event streams + sectional overshoot/expiry/tamper); `contract-persistence-properties` (250 stale-tab interleavings, 200 additive merges, backup tamper/5000 boundary); `contract-import-boundaries` (75 seeded banks, full 2000-question limit, unsafe inputs, six-kind response validation); `contract-analytics-properties` (300 progression datasets, 90 frozen six-kind attempts). Old 156 named tests, all 25 browser scripts, CI, production sources, content JSON and generated HTML unchanged. Commits: `78f65b1`, `7f9e751`, `b93dc21`, `b9e2483`, `13eb9ff` plus fixture-expectation corrections. Initial on-commit CI (run 41286606569) failed a newly asserted **false hash uniqueness property**; distinct IDs may share the same semantic content hash, so corrected only the test to check distinct IDs and complete key mapping in commit `bcd3e14`. **This is not a production bug.** Wait for a green full CI on the corrected head before marking Pass36 verified. Browser and semantics gating still remains legacy-mandated.

**Implementation status at checkpoint A:** no source/tests/scripts/CI changed; scratchpad update only. Next: add seeded maths/session/persistence/import tests, verify CI and reconcile findings independently.

### Mac offline navigation and extreme-width Results — user follow-up VERIFIED (1 Nov 2026)

**Initial implementation `b665f5e`, corrected route encoding `181bf716`; independently green [full five-job CI run 41303947780](https://github.com/oneshubhamt/practice-desk/actions/runs/41303947780), including automated publication.** Root cause was actual production `createNativeRouter` throwing when `window.navigation` absent; now `createFragmentRouter` handles feature-detected legacy Safari/WebKit/Chrome using in-document `#pd=` hash routing, same-file Back/Forward, deep links, invalid route recovery, answer/flag persistence after reload; native route remains the primary path and a rejected `file://` navigate degrades to fallback. Browser tests deliberately **remove** the Navigation API before app initialization; actual Chromium, Firefox and WebKit all passed no-API routes and Back/Forward. No claim of manual testing on the user's particular Mac/Safari. Native WebKit Back after file reload remains reported unsupported separately.

**Results 195px + 140% combined overflow actually repaired and regression-tested**, not merely excluded by resetting font. `src/styles/app.css` now allows long narrow Results heading/paragraph/panel min-content to wrap, preserves local table scroll and no global overflow clipping. `acceptance-bank-modes.mjs` now retains **140% in-app scale** through full 195px flexible/single/strict Results and imported APFC/NAT, all green. Source file checks: `src/app/navigation.ts`, `src/styles/app.css`, new `scripts/acceptance-safari-fallback.mjs`, modern offline harness, enhanced existing bank-modes, Node codec tests. Source Content/Keys/History/Frozen policy untouched.

**Case-level consolidation distinction:** audited all **179 named Node registrations** (after two necessary Safari codec additions) across eight suites. **Zero exact duplicate names**, and only one confidently redundant **semantic** test pair found by source-level review: the standalone V05/V07/F08 Q62 publisher-key/exclusion test repeated most assertions of the richer Oct 6 Q62 test. Its sole unique checks (caution label “not certified” and original excluded marks 0) are moved into the richer test; the redundant registration is retired in this follow-up commit, making **178** independently testable registrations, not a cosmetic rename. All other broad similar topics have distinct failure modes (e.g. multi-select cap vs hostile-banks validator; full CGL source integrity vs frozen attempt score). Do not assert all 178 are maximally nonredundant; further **assertion-level** elimination of legacy browser checks remains an explicit Pass40 audit. Never reduce count arbitrarily.

**FINAL INDEPENDENT QA AFTER CASE-LEVEL DEDUP: VERIFIED.** [Five-job CI 41304541863](https://github.com/oneshubhamt/practice-desk/actions/runs/41304541863) **5/5 SUCCESS**: **178/178 Node tests pass**, Chromium modern/current safety browser suites pass, Firefox/WebKit offline and forced no-API fallback pass, gated source-verified HTML publisher pass. Duplicate Q62 case retired with its unique assertions integrated into the richer score/editorial test. **The total reduction at case level is one semantic duplicate**; comprehensive remaining deduplication has **not** been performed. Nine old-name browser scripts plus `smoke-offline.mjs` (ten screenshot-free scripts total) still cover unique current safety cases. This run includes the real 195px+140% combined Results and no-Navigation-API Mac fallback tests. Physical user Mac Safari remains a separate manual verification gate. Dated native-only/candidate CSS issues below are superseded by this passing source implementation, not deleted from history.

### Follow-up after Pass39 — actual gaps: Node duplication, Mac routing and combined extreme zoom (1 Nov 2026)

**New user feedback:** 177 unchanged test count is rightly not a proof of case-level consolidation; the earlier 36→8 Node file operation was **lossless file concatenation**, not deduplication. Pass39 deleted 16 old visual/browser scripts while retaining 10 distinct screenshot-free safety scripts, and added actual new current-app browser capabilities. Require semantic duplicate analysis before claiming unnecessary Node cases; no deletion to hit an arbitrary smaller count.

**Verified Mac navigation root cause (source):** `src/app/navigation.ts` `createNativeRouter()` unconditionally throws `Practice Desk requires the modern browser Navigation API` when `window.navigation` or its methods are missing. `src/app/generic-ui.ts` instantiates that router before initial hydration. Older Safari and some file-scheme WebKit environments cannot initialise navigation; WebKit CI also showed `canGoBack=false` after file reload. WebKit introduced Navigation API in Safari 26.2 (official WebKit release note). Fix by a **small, feature-detected, standalone `file://` fragment router** (history via hashchange) when the native API is unavailable; keep native paths on browsers where they work. If `navigation.navigate` fails on Safari, degrade into fragment routing; never change original keys, scoring or storage. Add actual browser test injecting absent Navigation API in WebKit, covering Library→Exam→History→Back/Forward/reload/deep link, and deterministic Node route codec guards. Distinguish app internal navigation from Safari global Back; actual physical user's browser still needs manual validation.

**Verified extreme zoom defect:** Browser run 41299527457 reported **195px viewport AND additional 140% in-app scale** `Results document.scrollWidth=227` (overflow by 32px), with a nested result heading/panel paragraph extending to right=216. Separate 195px default app scale + 195px/140% Library already passed; the combined Results case remains genuinely unfixed. Inspect `src/styles/app.css` Results-specific panel and heading min-content sizing near 865–1030; implement **scoped narrow + increased-type-scale layout wrapping/min-width fix**, preserve readable content, internal table scroll, aria controls and app font preference. Add 195px+140% **actual Results regression** (free/single/APFC) rather than suppressing it.

**Test-retirement audit must be honest:** Eight Node suites but 177 preserved unchanged, substantive test-case reduction **0** so far. Ten screenshot-free legacy browser scripts still run because distinct safety tests exist (CAS, fallback, destructive deletion, source/source-review and user interaction) and were not case-by-case replaced. After actual root fixes, audit named test registrations for semantically duplicate cases; prune only redundant checks with a richer surviving owner and maintain explicit mapping.

**Status:** source diagnosis complete; remediation/CI unverified until subsequent commits and new browser/Node gates. This is a **new user-requested bugfix and true test audit**, not a redo of v11 parity.

### Pass 39 — LIVE checkpoint D: final source/CI objective reconciliation (2026-11-01)

**COMPLETE / VERIFIED:** [full workflow 41299638290](https://github.com/oneshubhamt/practice-desk/actions/runs/41299638290) **5/5 jobs SUCCESS** — core Node/typecheck/build, Chromium current-app journeys plus focused legacy safety, Firefox, WebKit and post-gate publisher. Publisher log: **“Verified build matches committed offline HTML.”** The publisher operated only after all four test legs and did not push an unnecessary artifact change. No `main`/`baseline/v11` changes or merged release.

**Exact live evidence:**
- Node24 core `npm run check`: **177 tests, 177 pass, 0 fail**, observed run **2,783.10ms**. `tests/exam-bank-and-policy.test.mjs` is an unchanged four-test blob renamed from legacy `pass30-bank`; eight capability-oriented Node files remain.
- Modern CGL/generic/APFC `acceptance-critical`: **3 scenarios PASS**. Modern `acceptance-bank-modes`: **laptop1366, phone390, narrow195 all PASS**, exclusive source/reviewed, saved untimed, strict/free/single, offline template and authored NAT/MCQ, 195px baseline Results no overflow. Modern `acceptance-drafts`: **Pass22 G07/G08 drafts, clearing committed answer, reload, duplicate matching and correction PASS**.
- Modern recovery **PASS** (Discard/Delete, additive v3 backup, invalid-link and IDB fallback). Modern UI **4 profiles / 36 state measurements PASS**, including current light/dark measured CSS contrast, scroll-detached Aa, keyboard popover, flag state, 18px pending gap, Results focus/lazy/low evidence and overflow. Modern stress **PASS**: 80-record History startup/reload **875ms** on hosted runner, bounded by 30s; 100-item pane DOM **overview=201, review=3959, timing=1230**, no historical SHA comparison.
- Modern platform: Chromium and Firefox **offline persistence, backup, reload and native Back/Forward PASS**. WebKit **offline persistence/backup/reload PASS**; **native file:// Back after reload reported unavailable** (`canGoBack=false`, one navigation entry), **not** falsely claimed passing.
- **Screenshot test retirement directly verified:** source diff from pre-P39 `5c455bf38608106a095db44e72579de50f8c68b3` confirms 16 historical browser QA files removed (including actual Pass29/30), no old frozen-v11 executable screenshot matrices/CI steps, no screenshot warehouses or routine image upload. The 10 remaining historical-name scripts are **screenshot-free and not baseline/v11 source comparators**; they retain unique current behaviour/safety checks until optional further capability rename. Only modern failure-diagnostic screenshots are permitted in CI.
- **Policy/release security:** `AGENTS.md`, root README and docs index now specify completed historical parity and forward-looking current app development. CI `contents:read` for all tests/PRs, `contents:write` only in post-gate publish on `overhaul`; build artifact uploaded from tested core, branch drift checks allow only Markdown-only downstream commits; publish checks exact SHA of tested checkout and refuses source changes; no duplicated Node test in browser legs. No uncommitted lockfile was invented; current npm install transitive dependency reproducibility remains an explicit limitation.

| Objective ID | Conclusion | Verification |
|---|---|---|
| TS-07 browser sprawl | **VERIFIED for large retirement** | 16 redundant scripts physically removed, 7 modern capability entry points + shared harness, ten distinct screenshot-free safety scripts retained |
| TS-08 remove v11 screenshot parity | **VERIFIED** | No routine image comparisons or screenshot uploads in active workflow; Pass29/30 historical tests no longer run; archived reports untouched |
| TS-11 CI DAG & privileges | **VERIFIED for live push; simulated conditions limited** | Core→Chromium/Firefox/WebKit→publisher green; scoped write job and source-drift bash guards reviewed; actual PR/source-change attack permutations not independently simulated |
| TS-12 lazy Results current benchmark | **VERIFIED** | 100-item actual DOM counts, hidden panes zero, no Pass21 SHA comparison |
| TS-14 unique guard retention | **VERIFIED for selected replacement/retention** | G07/G08 ported as identical direct checks; bank/edition/untimed + navigational/media/Q62 kept through current-only journeys/Node and screenshot-free legacy assertions; no deliberate deletion of an unresolved unique user-visible guard |
| TS-15 determinism/performance | **VERIFIED scoped** | Node24 and browser current `file://` CI green with no repeated full Node checks; no package lockfile, so fully pinned transitive install not claimed |

**Explicit open independent responsive finding (not silently fixed):** The first Pass39 bank test **combined** the extreme 195px viewport (~200% browser zoom equivalent) with *additional* persistent app text scaling 140%, and revealed Results scrollWidth=227px on that combination. Regression scope is preserved by separately verifying 195px/140% Library and 195px/normal text exam+Results; the combined 195px+140% Results layout improvement is future product work (user-requested future beyond v11), not a claim of compliance. The actual production CSS wasn't changed in this test reengineering pass. CI failure record: [41299527457](https://github.com/oneshubhamt/practice-desk/actions/runs/41299527457). Note specifically that **this unverified combination remains a real overflow risk**, not merely a flaky test.

**Phase-III next:** Pass40 independent full audit of tests/security/publisher and final documentation, plus any chosen new responsive product ticket. The old Pass40 requirement to reinstate or co-retire the frozen Pass29 matrix is **superseded by explicit user direction and already completed coordinated AGENTS/CI changes**. Future test additions should test new application behaviour and protect meaningful contracts, not approximate v11 screenshot geometry. Manual/AT/device/release approval remains open.

### Pass 39 — LIVE checkpoint C: modern Pass29/30 retirement, source reconciliation (2026-11-01)

**Source commit:** `854e3279ba8ac2a6b5f9a5d3304fc8920d7713f5`, user-directed v11 parity retirement. In one atomic tree update:
- **16 historical browser files removed** from executable tree: `pass10-platform`, `pass15-visual`, `pass22-targeted`, `pass23-independent`, `pass25-library`, `pass26-exam`, `pass27-history-results`, `pass28-semantics`, `pass29-independent-matrix`, `pass30-ui`, `pass31-ui`, `pass32-native-navigation`, `pass33-results-parity`, `pass34-v11-display`, `pass35-detached-display`, `pass36-library-spacing` (all `scripts/*.mjs`). This **removes** Pass29's old 184/56 screenshot matrix and Pass30 screenshot capture source, not just CI invocations.
- **Lossless Node rename:** `tests/pass30-bank.test.mjs` → `tests/exam-bank-and-policy.test.mjs` using the *exact same blob SHA*, retaining four cases and the total 177. No source/fixture/editorial relaxation.
- **Added modern guards:** `acceptance-bank-modes.mjs` tests exclusive source/reviewed options, 5 papers each, selected family, untimed reload, strict/free/single scoring, offline APFC/NAT template/import/result at laptop/phone/narrow with direct 195px document overflow; `acceptance-drafts.mjs` directly retains 19 G07/G08 assertion call sites from Pass22 for drafts/matching without Pass21 SHA benchmark; strengthened `acceptance-ui.mjs` for current light/dark CSS token contrast, accessible flag toggle, keyboard help, low-evidence Results coaching/scoring disclosure and responsive overflow. Failure-only modern harness diagnostic improved to identify actual overflowing elements.
- **Preserved 10 screenshot-free legacy behaviour scripts** during further capability migration: `smoke-offline`, `pass11-parity`, `pass12-parity`, `pass13-history`, `pass14-parity`, `pass16-independent`, `pass18-targeted`, `pass19-targeted`, `pass20-targeted`, `pass21-targeted`. Static source audit confirmed **no `.screenshot()` nor frozen-v11 git-show/comparison in these 10**. They retain unique stale-tab/CAS, destructive cancellation, frozen editorial/media and performance/trends protection. Pass40 can rename/consolidate them after guard-level evidence; they are **not** ongoing v11 parity tests.
- **AGENTS.md revised:** historical v11 comparison completed, old Pass29/30 filenames no longer mandatory; current multi-exam, six-kind, backup, no-pre-submit key, human/AT limits and modern QA are mandatory; **no routine screenshot comparisons**; failure-only diagnostics. This is a deliberate user-authorised policy change.
- **CI redesigned:** `core` runs Node24 strict TypeScript/build/177 Node tests **once**, `chromium` and Firefox/WebKit matrix depend on core, browser legs rebuild only; **no Pass29 independent screenshot matrix and no 30-day screenshot uploads**. Global `contents:read`; `publish` alone `contents:write`, gated on every core/Chromium/FF/WebKit result and branch/source drift, copying exactly the tested core HTML to `overhaul` only. No release/merge to `main`. No lockfile means `npm install` retained; dependency reproducibility not asserted stronger than actual. No routine visual artifact generated; only failure-only diagnostics on error.
- **Scope audit:** product `src/`, frozen question/answer/source JSON, generated HTML and other Node tests not edited by this migration. Original historic report commits remain accessible in git history. No production CSS workaround was used to suppress an unexpected new combined-stress failure.

**First modern CI found a *new* separate extreme combination:** 195 CSS-pixel viewport **plus** independent in-app 140% text scaling caused **227px document scrollWidth** in flexible-mode Results, with a child H2/text block reaching right=216px. This is beyond the formerly tested 195px-at-normal-app-font Results contract. We retain *both independent tests* (195px Library at 140% and 195px exam/Results at normal app scale) by explicitly resetting font setting after the first measurement in commit `48a8d1e`. **The combined 195px+140% Results overflow is a disclosed future responsive-layout improvement**; it was not silently labelled passed or fixed. User may choose to fix product CSS separately. Exact failure: [CI 41299527457](https://github.com/oneshubhamt/practice-desk/actions/runs/41299527457).

**Remaining validation:** full new CI after `48a8d1e` and publisher permission/path changes, pass-count and screenshot/branch-diff checks. Do not close TS-07/08/11/12/14/15 until new full run green, including any actual new browser test failures.

### Pass 39 — LIVE checkpoint B: user-authorised retirement of v11 parity (2026-11-01)

**Superseding user decision:** “minimise screenshot tests for now”, “parity testing with v11 is done”, “future development ... beyond what v11 had”, and explicit authorisation to **redesign Pass29, Pass30 and AGENTS**. This overrides the earlier temporary Pass39/Pass40 exception in this plan and the previous AGENTS policy **only after all are changed coherently and green CI proves replacement**. Historical reports and baseline/v11 are preserved for reference, *not routine test or acceptance oracles*. Current UI/functional contracts will remain tests even if they originated in a Pass29/30 journey. Treat v11 equivalence as completed historical work, not a constraint on future improvements. Don't turn all screenshot/visual regression into mandatory CI; **zero routine screenshots**, failure-only diagnostic on unexpected failure, manual visuals when specifically requested.

**Design revision and staged implementation:**
1. Build a modern current-only `acceptance-bank-modes.mjs` that directly replaces Pass30's real app checks at laptop/phone/narrow viewports: five strictly filtered source/reviewed papers, family continuity, saved untimed preference through reload, strict/free/single frozen untimed policies, offline starter download, authored APFC/NAT import and scoring, narrow overflow. Rename `tests/pass30-bank.test.mjs` to capability name without losing its four cases.
2. Port unique Pass22 G07/G08 draft and duplicate-matching browser checks to `acceptance-drafts.mjs` (not Pass21 SHA benchmark). Add current-only appearance/contrast/140% zoom, Results, navigator and keyboard guards to `acceptance-ui.mjs`. Existing modern critical/recovery/stress/platform and non-parity unique safety scripts cover the remaining valuable contracts; do not drop source Q62 or frozen scoring tests.
3. **Delete** old screenshot/parity scripts including `pass29-independent-matrix.mjs` and `pass30-ui.mjs`, plus obsolete paired comparison captures/CI uploads. Keep unresolved substantive legacy checks without screenshot generation until independently replaced.
4. Rewrite AGENTS and CI together, elevate modern capability contracts as mandatory future gates, replace pre-v11 focus with future-capability quality; keep historical audit docs without rewriting history. Separate read-only core/test jobs from write-minimal distribution publication and gate the latter on green core+browser. No future large screenshot matrix by default.
5. Independently verify 177 stable Node test names, modern app behaviours across engines, zero mandatory frozen-v11 git show/pixel comparison and output, all CI jobs green, source/package/keys unchanged, publisher guardrails intact.

**Explicit supersession:** the Pass39 checkpoint A “retain Pass29/30 until Pass40” and corresponding Pass38 archived plan caveats are **historical plans now superseded at this user-authorised checkpoint**. Pass40 remains final docs and independent quality audit, **not a forced revival of 184/56-scene historical screenshot matrix**. Unique unported behaviours still block deletion *if* no present guard or documented deliberate historical disposition exists.

### Pass 39 — LIVE checkpoint A: audited contracts, alternatives and implementation gates (2026-11-01)

**Starting HEAD:** `5c455bf38608106a095db44e72579de50f8c68b3` on `overhaul`. Scope **TS-07/08/11/12/14/15**; AGENTS and original Section G read before implementation. Source audit: all 26 old QA script owners inventoried at Pass38 Section 3, and specifically read original screenshot/guard sources `pass15-visual`, `pass22-targeted`, `pass23-independent`, `pass25-library`, `pass28-semantics`, `pass31-ui`, `pass33-results-parity`, `pass34-v11-display`, `pass35-detached-display`, `pass36-library-spacing`, `pass29-independent-matrix`, `pass30-ui`, `pass16-independent`, plus `.github/workflows/ci.yml` and exact AGENTS mandatory exceptions. Checked Node tests and Pass38 source/CI evidence. **No `package-lock.json` or other dependency lockfile currently committed.**

**Selected transition / strict safety:**
- First move *unique current-app* UI guards from old screenshot suites into already-green modern acceptance contracts: nonsticky Aa, 18px conditional pending card, 140% appearance, results information/keyboard, source-vs-reviewed Q62 published-key caution/disclosure, current navigator/figure/route and scoped contrast. Retain independent Node source/scoring tests unchanged. A historic old-v11 pixel similarity is not itself a current product contract.
- Remove already-proven obsolete screenshot scripts **as files**, not merely skip their CI steps; remove their large 30-day CI artifact uploads. Keep all non-screenshot scripts carrying independent unresolved correctness/safety checks (e.g. stale-tab/CAS conflict, destructive cancellation/atomic bulk deletion, multi-select unsaved drafts, key secrecy, exact source correction) pending a direct replacement. For screenshot scripts with mixed coverage, port distinct checks first; do not claim blanket equivalence.
- **EXCEPTION:** AGENTS currently requires executable and CI `scripts/pass29-independent-matrix.mjs`, `scripts/pass30-ui.mjs` and `tests/pass30-bank.test.mjs`. Preserve exact paths, executable commands and 184/56-scene historical matrix until **Pass40 coordinated AGENTS+workflow+documentation handoff**, not in Pass39.
- CI design: core typecheck/build/177 Node tests **once**; Chromium, FF/WebKit and mandated independent matrix depend on green core, build their own single offline HTML; publish generated offline artifact only after all required gates with a separate minimally-privileged `contents:write` job on *push* to `overhaul`. All test jobs and PRs `contents:read`; reject any intervening non-Markdown source/artifact branch drift in publisher. Keep safe `git diff --exit-code` and verify artifact belongs to the tested head. Avoid replacing existing `file://` runtime with a server.
- Dependency determinism: since no lockfile exists, `npm ci` would fail; **do not claim deterministic transitive deps**. Keep exact package.json direct versions and current `npm install` until a verified lockfile can be added, track as a transparent risk. Browser versions controlled by Playwright Core 1.64.1 and CI Chrome; do not silently report unsupported WebKit Back as passed.

**Explicit alternatives rejected:** drop all old scripts on a broad “modern coverage” label; keep visual screenshot warehouse to pretend safety; remove AGENTS-mandated matrix early; weaken source/Q62 assertion for green; globally grant `contents:write`; publish an HTML rebuild with no provenance or cross-browser gate. No changes to `src/`, frozen content/keys, Node tests or HTML unless a genuine independently reproduced bug forces a separate decision.

**Five-stage control:** AUDIT and ANALYSE completed. Next IMPLEMENT (new guards, selective script removal, CI orchestration) → objective-by-objective source-diff review → actual targeted modern checks and full four-job CI + publisher dry/safe guards. All unique unresolved old guards must remain as executable source or be replaced; any incomplete migration must be documented as such, not certified. Do not mark pass complete until full CI green.

### Pass 38 — checkpoint D: objective reconciliation and final acceptance (2026-11-01)

**PASS38 = IMPLEMENTED AND VERIFIED for the additive modern browser test layer.** Final browser/test commit `d88e8d09e07cecc2fbc5477336efb392c68ecbe5`. Independently green **[full CI run 41296469053](https://github.com/oneshubhamt/practice-desk/actions/runs/41296469053)**: all four jobs succeeded — main Chromium offline acceptance, Firefox, WebKit, independent Pass29 historical journey matrix. Main Node24 `npm run check` output: **177 tests, 177 pass, 0 fail**, 2,436.85 ms on that runner. Exact scripts ran through the existing unchanged legacy CI in addition to the new checks.

**New modern browser evidence from run 41296469053:**
- `acceptance-critical.mjs`: **3 independent journeys PASS** — built-in source/reviewed CGL and saved immutable Results/History; all six question kinds with pending manual writing, separate self-grade and explicit FSRS review; APFC MCQ/NAT authoring template, import, fractional scoring and untimed strict policy.
- `acceptance-recovery.mjs`: **PASS** — unfinished Discard vs completed Delete, integrity-checked v3 export/restore, additive re-import preserving identity, invalid deep-link rejection, denied-IDB fallback and usable backup.
- `acceptance-ui.mjs`: **four responsive profiles PASS** (1366px laptop, 768px tablet, 390px phone, 195px narrow), **28 measured state records**; first-fold usability, current UI Results low-sample cards and lazy review, tab keyboard, accessible popover, theme, reduced motion, nonsticky header/fixed direct-body Aa, no overflow and actual 18px unfinished-card gap **without screenshot comparison**. Scoped ARIA/alt/identity checks are **not complete WCAG/AT certification**.
- `acceptance-stress.mjs`: **PASS** — 80 frozen History copies reload/render measured at **657ms on this CI runner** (generous 30-second failure bound, not a guaranteed device SLA); lazy 100-question Results DOM: overview **201** nodes, Review **3,959**, Timing **1,230**. No historical Pass21 SHA/pixel oracle in the *new* stress suite.
- `acceptance-platform.mjs`: **Chromium and Firefox**: file:// save/checkpoint, backup, reload and native Back/Forward **verified**. **WebKit**: save/checkpoint, backup/reload **verified**; **native Back/Forward after file:// reload unsupported**, observed `canGoBack:false`, `canGoForward:false`, one navigation entry. The test emits an explicit `MODERN PLATFORM LIMITATION` and stores a separate status; it does not add a compatibility shim or claim the unavailable WebKit Back is verified.

**Five-stage independent objective check:**

| Pass38 objective/finding | Verdict | Evidence and strict boundary |
|---|---|---|
| TS-07 — shared browser harness and capability journeys | **VERIFIED (new layer)** | `scripts/browser/fixtures.mjs` + five `acceptance-*.mjs` run as new mandatory additive gates in CI. Old scripts remain, so sprawl removal is **Pass39** |
| TS-08 — replace frozen-v11 screenshot oracle | **VERIFIED for replacement design; retirement OPEN** | New UI/stress/scripts compare only current app structural behaviour or measured dimensions; no routine image output, only failure-only diagnostics. Old v11 screenshot jobs still run by explicit Phase II rule |
| TS-09 — genuine multi-engine offline journeys | **VERIFIED with explicit limitation** | Chromium, Firefox, WebKit performed actual file:// storage/backup/reload; Chrome+Firefox Back verified; WebKit native-history gap disclosed (not marked verified) |
| TS-10 — accessible interactive checks | **VERIFIED scoped; manual signoff OPEN** | Four viewport profiles, button/tab ARIA states, focus on Escape, alt on images, unique IDs, keyboard results navigation, overflow and reduced-motion; not a full rules engine or assistive-technology certification |
| TS-05 — bounded stress / import | **VERIFIED scoped** | Actual browser 80-history/100-Results; APFC and six-kind imports; 2,000-item import validity remains verified at Node layer, not yet a 2,000-item browser throughput measurement |
| TS-12 — modern lazy-performance contract | **VERIFIED for replacement; retirement OPEN** | Active-only Results DOM 201/3959/1230 and no hidden 100-question panes; historic Pass22/Pass21 comparison remains existing legacy script until Pass39 |
| TS-14 — source-to-modern trace | **VERIFIED for scenario ownership; deletion proof OPEN** | Section 3 contains all **26** old scripts, direct new owners, and unique unported assertions. **No old script is eligible for removal solely from mapping**; Pass39 must test/reconcile unique guards one-by-one before retirement |
| TS-15 — reproducibility and CI integration | **VERIFIED for new runner; CI optimisation OPEN** | Playwright Core 1.64.1 and Node24 from repo; fresh file:// contexts, no arbitrary sleeps in new scripts, real persisted assertions, bounded failure-only artifacts; existing redundant CI and old scripts deferred to Pass39 |

**Evidence-driven fixes to new tests (not product changes):** Initial run 41295590487 corrected APFC→CGL mode selection (`9a8fa07`) and classified WebKit native Back limit (`03f54b0`). New recovery test corrected Library→History ownership of Discard (`a2d21e2`) and verified durable backup restore before rerender assertion (`933e9b1`). UI gained measured conditional 18px pending-card gap (`d88e8d0`). Only new browser testing sources were fixed; production remained unchanged. The final full run is green.

**Source-change safety proof:** Diff from starting `fe543b91f8fc6b29674e929abd0d630c428ab59f`: **six new files** (one harness + five browser suites), additive `.github/workflows/ci.yml` changes and this plan/scratchpad. Zero changes to application `src/`, Node `tests/`, `package.json`, paper/key JSON, frozen `baseline/v11`, generated offline HTML or any existing browser QA script. No old test, scenario, v11 published answer/editorial assertion, or mandatory Pass29/Pass30 run removed.

**Phase-II handoff for Pass39:** Consolidate CI and browser scripts only with a **guard-level** successor demonstration for unique scenarios, particularly two-tab stale conflicts, atomic bulk deletion/cancellation, drafts/matching, source-key/Q62 displayed evidence, detailed keyboard/media checks. Remove duplicated screenshot generators and their CI invocations/uploads where successor coverage is proved. **Do not remove AGENTS-mandated Pass29 and Pass30 before the coordinated Pass40 policy/CI handoff.** Measure CI/runner minutes and maintain the modern failure-only diagnostics approach. No product-release/merge approval implied.

### Pass 38 — migration crosswalk: 26 legacy browser QA scripts to modern contracts

**Purpose and verification standard:** This is a **source-ownership and scenario disposition** map (NOT a claim of assertion-by-assertion equivalence). “Historical-only” pertains to pixel comparisons or historical SHA baselines, **not all checks in that file**. Pass39 must validate each unique guard before disabling/deleting a script; under current AGENTS the independent Pass29 and the Pass30 bank/test paths require a coordinated final policy/CI handoff in Pass40. The earlier inventory listed 25 browser QA scripts; `pass36-library-spacing.mjs` added since then makes **26**. Helpers `scripts/build.mjs` and `scripts/paper-select.mjs` are not QA suites.

| Existing browser script | Direct new capability owner(s) | Retain/historical-only or distinct contract remaining |
|---|---|---|
| `scripts/smoke-offline.mjs` | critical, platform, recovery, stress; FSRS and manual grade | Advanced two-tab race, read-failure fallback still unique: retain until separately verified |
| `scripts/pass10-platform.mjs` | platform Chromium/Firefox/WebKit, stress 80-record History | New cross-browser Back handling explicitly reports engine support limits |
| `scripts/pass11-parity.mjs` | critical, UI, platform; Node session model | Clock/background and browser shortcut details retained in original until crosswalk |
| `scripts/pass12-parity.mjs` | critical; Node content/provenance and frozen media | Original media/source provenance browser details retained pending direct audit |
| `scripts/pass13-history.mjs` | recovery, platform; Node persistence | Bulk atomic stale-tab deletion and specific quota prompts retained pending direct audit |
| `scripts/pass14-parity.mjs` | critical, UI; Node learning/analytics | Long-question drill-down and audit filter details retained |
| `scripts/pass15-visual.mjs` | UI measured first fold, contrast/semantics/overflow | Paired v11 pixel geometry **historical-only**; retain specific contrast assertions until confirmed |
| `scripts/pass16-independent.mjs` | critical; Node ten-edition/content/Q62 contracts | Source-key/caution media checks preserved in Node and original browser |
| `scripts/pass18-targeted.mjs` | recovery Discard/Delete, frozen result, invalid link | Specific two-stage Discard confirmation/cancellation remains old guarded |
| `scripts/pass19-targeted.mjs` | critical History, Node cross-paper marks | Multiple resumables and comparative saved-result presentation remain guarded |
| `scripts/pass20-targeted.mjs` | critical preflight; UI responsive/Aa/keyboard | Source disclaimer and mode details guarded by original |
| `scripts/pass21-targeted.mjs` | UI semantic/keyboard; Node content | Individual radio/mark/focus/figure-a11y paths retained where unique |
| `scripts/pass22-targeted.mjs` | stress lazy 100-review/timing DOM, critical six kinds | Invalid multi-select drafts / duplicate matching browser controls retain original |
| `scripts/pass23-independent.mjs` | critical; Node independent content and scoring | Frozen-v11 visual comparison historical-only |
| `scripts/pass25-library.mjs` | UI Library first fold and responsive geometry | Exact v11 paired screenshot comparison historical-only |
| `scripts/pass26-exam.mjs` | UI exam/navigator responsive geometry | Exact v11 paired screenshot comparison historical-only |
| `scripts/pass27-history-results.mjs` | UI History/Results, critical saved reopen | Exact v11 paired screenshot comparison historical-only |
| `scripts/pass28-semantics.mjs` | UI Aa/labels, Node editorial/clock semantics | Frozen v11 geometry historical-only |
| `scripts/pass29-independent-matrix.mjs` | critical + UI + platform + stress + recovery; Node content | Mandatory 184 scenes/56 old-v11 pairs until synchronized AGENTS Pass40 handoff |
| `scripts/pass30-ui.mjs` | critical APFC/NAT, CGL original/reviewed, untimed | Legacy 3-mode untimed/195px journey remains mandatory per AGENTS until Pass40 |
| `scripts/pass31-ui.mjs` | UI current compact layout, question navigator | Old v11 geometry historical-only; distinct mark states guarded |
| `scripts/pass32-native-navigation.mjs` | platform native Back/Forward, recovery bad deep link | Browser-specific native-history availability must be disclosed, not silently shimmed |
| `scripts/pass33-results-parity.mjs` | UI low-evidence Results and stress lazy panes | Pixel-parity baseline historical-only |
| `scripts/pass34-v11-display.mjs` | UI Aa themes/focus/nonsticky header | Old frozen-v11 fixed-toolbar geometry historical-only |
| `scripts/pass35-detached-display.mjs` | UI fixed direct-body Aa + normal-flow header | Current product behaviour directly guarded |
| `scripts/pass36-library-spacing.mjs` | UI zero-card/pending-card 18px gap without screenshot | Exact visual state moved into measured invariant; old screenshots unnecessary |

**Replacement suite entry points and planned CI:** `scripts/acceptance-critical.mjs`, `acceptance-recovery.mjs`, `acceptance-ui.mjs`, `acceptance-platform.mjs chromium|firefox|webkit`, `acceptance-stress.mjs`; shared `scripts/browser/fixtures.mjs`. CI runs these **additively** in the main and cross-browser jobs without removing any legacy job. Every new script uses the **current generated offline app**; no frozen v11 SHA or paired screenshot capture. Modern UI captures lightweight measured state only and the harness captures screenshots **on failure** for debugging. A sole 18px conditional gap measurement was added in `d88e8d0` to supersede that unique Pass36 screenshot behaviour.

**Migration-blocking distinctions:** Last-column unported but legitimate user-visible behaviours are **not authorised for deletion by this map**. Retain the old code as a gate or port the assertion into modern tests in Pass39; in particular confirm two-tab stale write conflict, cancellation/atomic bulk-delete, multi-select draft, original/reviewed Q62 post-submit presentation, keyboard/focus, and source media. Modern FF/WebKit support for native Back is engine-dependent: journal verified vs unsupported on real file:// runs (no shim). Accessibility semantic spot checks are not a complete rules engine/AT/WCAG certification, and 195px CSS simulated zoom does not prove physical device usability.

### Pass 38 — live checkpoint B: additive modern scripts and iterative CI (2026-11-01)

**Implementation started:** On `overhaul`, atomic commit `bdca4efa` added a reusable modern headless `file://` harness `scripts/browser/fixtures.mjs` plus `acceptance-critical.mjs` (original/reviewed CGL, frozen results/History, six response kinds/manual grading/FSRS, APFC/NAT), `acceptance-ui.mjs` (modern-only layout/a11y/keyboard/Aa, no routine screenshots), `acceptance-platform.mjs` (Chromium/Firefox/WebKit save/reload/backup/native navigation support reporting), `acceptance-stress.mjs` (80-record History, 100-question lazy Results), and **additive** CI invocation. Then `3c0a296` added `acceptance-recovery.mjs` (Discard versus Delete, backup v3 restore/idempotence, invalid deep link and IDB denied fallback) with its additive CI step. Every original QA script and old screenshot CI invocation remains intact by Pass38 policy; obsolete visual artifacts are **not generated** by the new suites (UI stores compact metrics and failure-only screenshot diagnostic).

**CI observations (do not mark final success until full run green):** First run [41295590487](https://github.com/oneshubhamt/practice-desk/actions/runs/41295590487) identified newly written critical-test *setup mistake*: after APFC import it attempted a CGL-only strict mode without re-selecting a CGL paper. Earlier critical CGL and six-kind journeys passed. Fixed in `9a8fa07`. That run also exposed WebKit `file://` native Back rejection after reload; modern platform now reports native-history support separately, with explicit warning and evidence rather than a false success assertion. No browser shim introduced (`03f54b0`). Added recovery browser suite initially looked for Discard on Library rather than History (the actual UI owner); corrected in `a2d21e2`. This correction follows source `pass18-targeted.mjs` evidence, not a product change.

**Engineering safeguards / scope:** No changes to product `src/`, paper/key JSON, generated offline HTML, test case bodies or any legacy script. New CI steps may temporarily increase run time while old Pass15/24/29 screenshot suites remain; Pass39 optimisation and Pass40 AGENTS-coordinated final mandatory retirement are explicitly required. Do not infer Pass38 closure from static inventories. At this checkpoint, modern scripts need integrated CI evidence and any potential genuinely browser-unsupported native Navigation API paths require explicit documentation. Source/data claims remain verified by 177 unchanged Node tests, not inferred from screenshots.

### Pass 38 — live checkpoint A: source audit, design and test contract (2026-11-01)

**Start HEAD:** `fe543b91f8fc6b29674e929abd0d630c428ab59f` (`overhaul` only). Scope findings **TS-05/07/08/09/10/12/14/15**. Read controlling AGENTS, original Section G, full browser-script census, `package.json`, current CI (four jobs with duplicate checks and many legacy artifacts), actual source `scripts/{smoke-offline,pass10-platform,pass13-history,pass20-targeted,pass22-targeted,pass30-ui,pass32-native-navigation,pass33-results-parity,pass34-v11-display,pass35-detached-display,pass36-library-spacing}.mjs` and `src/template.html`. The legacy overlap and exact ownership map is in Section 3; its script census dates from Pass36 and excludes the subsequently added `pass36-library-spacing.mjs`, which explicitly covers the 18px pending-to-paper gap. This Pass38 map now includes it.

**Architecture decision:** Add `scripts/browser/fixtures.mjs` as the **one shared modern `file://` runner** (browser options, persistent/fresh contexts, runtime errors, safe deterministic IndexedDB reads, conditional diagnostics/screenshots, bounded explicit assertions), plus substantive independent browser E2E suites `scripts/acceptance-{critical,ui,platform,stress}.mjs`. Reuse existing `scripts/paper-select.mjs` only for the user-facing original/reviewed filter contract. Use Playwright Core 1.64.1 already pinned by package; Chromium must use installed Chrome, Firefox/WebKit use explicitly installed Playwright browser; avoid arbitrary runtime sleeps and hidden skip paths. Run new scripts **additively** in existing CI jobs to obtain independent evidence; change no old gates and defer *CI restructuring* to Pass39. Capture small bounded failure-only screenshots, not another frozen-v11 matrix. Where actual browser support differs, report explicit unsupported native Navigation API rather than adding a shim.

**Functional contracts to test:** (a) Library edition/source/review and preflight, strict/flexible/single, untimed, file:// CGL and six-kind authored packages; (b) save/reload/History/Results and no pre-submit answer/key leakage; frozen Q62 original vs reviewed editorial semantics pinned in independently retained Node tests and browser source display; (c) manual-written grading separate from immutable machine marks, FSRS card only after completed exam, backup v3 additive/digest/delete protections; (d) modern-only UI fixed detached Aa/nonsticky header at 1366/768, 390, 195 and tablet plus theme/reduced motion and sensible tab/keyboard/ARIA; (e) native Back/Forward and deep-link; (f) bounded 80-item history and 100-item lazy review DOM proof, no obsolete Pass21 SHA benchmark; (g) automated scoped a11y semantic/rules-style checks with explicit limitations (not an AT/WCAG certification).

**Reject:** copy-pasting entire 25 scripts or converting old v11 screenshot comparisons into golden modern screenshots; forcing unsupported native navigation; updating generated HTML by hand; deleting old scripts to shorten current CI before scenario mapping and real new E2E pass. Record per-script replacement coverage and remaining *unique* assertions as open until a proved match exists; keep all old scripts live during this pass.

**Five steps:** AUDIT completed → ANALYSE completed → IMPLEMENT next → independently check source and each finding → run targeted new browser suites plus old full CI. Do not mark VERIFIED on static inspection or historical green runs alone.

### Pass 37 — LIVE checkpoint D: independent QA, objective check and handoff (2026-11-01)

**Status: VERIFIED.** The final consolidated-test stack is green in the actual [GitHub Actions run 41288913824](https://github.com/oneshubhamt/practice-desk/actions/runs/41288913824): **all four jobs passed** (offline Chromium, Firefox, WebKit, mandatory Pass29 independent 184-scene matrix). Node24 `npm run check` logged **177 tests, 177 passed, 0 failed, 3,495.98 ms** in the independently completed matrix job. The immediately preceding Pass36 comparable job logged **177/177, 6,994.16 ms**. This is a measured single-run difference, **not** a guaranteed stable performance benchmark; runner-time changes will be quantified again after browser/CI consolidation in Pass39.

**Five-stage engineering objective-by-objective reconciliation:**

| Finding/objective | Result | Source-level evidence |
|---|---|---|
| TS-01 — remove chronological test-file sprawl | **VERIFIED** | 36 pre-P37 files -> 31 intermediate -> **8 current runnable `.test.mjs` files**; only `pass30-bank.test.mjs` retains a chronological name under mandatory AGENTS policy |
| TS-06 — capability ownership | **VERIFIED** | Seven grouped concerns: content/provenance, exam packages/import, exam policy/scoring, session/timing, history/persistence, learning/analytics and UI/navigation; eighth retained statutory current-path exception |
| TS-14 — assertion-by-assertion migration | **VERIFIED** | 31/31 former suite sources enumerated in exact mapping table, with individual named original tests listed in Pass36 inventory; all **177** original test registrations in labelled block-local source bodies, **zero tests dropped**, no proxy-only wrappers or unrun subdirectories |
| TS-15 — deterministic discovery | **VERIFIED** | Unchanged `node --test tests/*.test.mjs` glob discovers all eight suites and 177 cases; Node24, typecheck/build and existing CI execution passed without modifying package.json or CI workflow |
| Existing original/reviewed CGL/Q62, generic six-kind, security, backup, FSRS and UI contracts | **VERIFIED by unchanged assertions and old browser acceptance** | All old cases preserved as registered and four CI jobs passed; editorial/source hash tests retain original independent assertions |
| Scope isolation | **VERIFIED** | [Atomic consolidation commit `b9c1dd8`](https://github.com/oneshubhamt/practice-desk/commit/b9c1dd8e00c0c019fadbbfd82cd1f50ead5ae66d) adds 7 capability test files, deletes 30 intermediate test files and retains Pass30 unchanged; **no `src/`, `scripts/`, `.github/`, `package.json`, frozen JSON or generated HTML modifications in this consolidation commit** |

**Important transparency:** No original test assertions were deleted as “duplicated”; this pass was aggressive about **file and fixture organisation**, not about removing an unproven behavioural guard. Total test source bytes are not claimed to have fallen substantially (namespace/lexical isolation adds some scaffolding), and a smaller file count alone does not prove lower maintenance cost. Property/model quality was established in Pass36, and browser script duplication/runtime remains Pass38–39.

**Concurrent branch scope note:** During Pass37, unrelated new `scripts/pass36-library-spacing.mjs` work also appeared on the shared `overhaul` branch in separate commits. It was not modified by the Pass37 consolidation. Final CI **41288913824** is on a descendant of the exact test consolidation and passed that additional script as well. Verify the live HEAD in the next pass; do not conflate unrelated changes with this test-only delta.

**Phase-I exit:** PASS. Node tests now organised and discoverable with no dropped case; existing broad offline workflow 4/4 green; source/content unchanged by Pass37. **Next: Pass38**, replacement modern browser scripts/cross-browser/visual/stress harness. Keep all old browser scripts and mandatory Pass29/Pass30 until successors are proven. User approval to merge/release remains outstanding.

### Pass 37 — LIVE checkpoint C: aggressive implementation and independent file/case inventory (2026-11-01)

**Implementation commits:** initial 36→31 file renaming/selected merges in `b7af806c79b01402ad47017ed75cbdd357caa24d`; complete 31→**8** physical suite reduction in `b9c1dd8e00c0c019fadbbfd82cd1f50ead5ae66d`. No source/product/CI/browser script/HTML changes. 30 old intermediate suites were removed in the same atomic commit that introduced **7** expanded capability suites. `tests/pass30-bank.test.mjs` is retained intact as the eighth suite per `AGENTS.md`.

**Losslessness methodology:** in each new capability suite, the old module's original body (including its test registrations, assertions, local fixtures and helper functions) is preserved as a labelled lexical block. All original static ESM imports are converted to explicit shared namespace imports plus *block-local* const bindings; cross-suite lexical identifier collisions are thereby avoided. The files are truly consolidated (no hidden wrappers/dynamic importing old test modules). Import specifiers and file-to-`src/`/fixture relative location remain unchanged because all files still live immediately under `tests/`. No old test declaration was dropped, modified for “equivalence”, or skipped. Test runner remains unchanged: `node --test tests/*.test.mjs`.

**Exact case-by-case migration owner at the pre-implementation suite granularity:** The legacy inventory in Section 2 records all original 156 individual named tests; the 21 Pass36 new names remained exact. Every originating suite is labelled directly above its unchanged registration body, so individual case name → destination suite → source block mapping is inspectable. The matrix below reconciles **all 31 old intermediate suites to 8 new suites and 177 named registrations**.

| Final runnable test suite | Named cases retained | Exact predecessor suite(s) (count) |
|---|---:|---|
| `tests/content-and-provenance.test.mjs` | 36 | content-cgl-edition-parity (5), content-cgl-import-and-scoring (4), content-editorial-and-timing-labels (3), content-frozen-legacy-integrity (9), content-source-review-and-frozen-media (6), content-validation-and-build (4), integrity-hash-and-media (5) |
| `tests/exam-package-and-import.test.mjs` | 21 | exam-packages-and-cgl-modes (5), exam-schema-validation (6), exam-six-kind-lifecycle (5), import-boundary-properties (5) |
| `tests/exam-scoring-and-policy.test.mjs` | 34 | exam-policy-manual-grading-and-timing (9), exam-preflight-and-policy-disclosure (7), scoring-and-section-policy (12), scoring-property-model (6) |
| `tests/session-and-timing.test.mjs` | 17 | session-and-scoring-basics (5), session-property-model (4), session-timing-and-deletion (8) |
| `tests/history-and-persistence.test.mjs` | 26 | history-cross-paper-marks (6), history-selection-filtering-and-backup (4), persistence-backup-and-concurrency (9), persistence-session-recovery (7) |
| `tests/learning-and-analytics.test.mjs` | 17 | analytics-property-model (2), analytics-visits-and-speed-evidence (5), learning-fsrs-and-cards (4), learning-notebook-and-evidence (6) |
| `tests/ui-and-navigation.test.mjs` | 22 | ui-history-and-results (5), ui-media-editorial-and-paused-controls (6), ui-question-controls-and-drafts (8), navigation-native-routes (3) |
| `tests/pass30-bank.test.mjs` | 4 | pass30-bank (4; reserved filename under current AGENTS mandatory policy) |
| **Total** | **177** | **31/31** |

**Implementation source inspection:** confirmed GitHub `overhaul` tree now contains the eight exact `.test.mjs` files above; checked each suite's static named-test case count and labelled predecessor block counts, totalling 177. Confirmed `scripts/` and `.github/workflows/ci.yml` remain outside this work. CI run [41288797199](https://github.com/oneshubhamt/practice-desk/actions/runs/41288797199) was queued at this checkpoint. **Do not mark Pass37 verified until independent Node24 and all old browser CI jobs are green.** If shared fixture module caching creates test interference, reproduce and repair without dropping any original check.

### Pass 37 — LIVE checkpoint B: user-directed aggressive consolidation (2026-11-01)

**Interruption and revised requirement:** User expressly requested **aggressive consolidation** after intermediate capability renames/merges. That intermediate change `b7af806c79b01402ad47017ed75cbdd357caa24d` reduced 36 to 31 .test.mjs files, which is not a sufficient final outcome. **This intermediate commit is not Pass37 acceptance.**

**Revised decision:** Target **eight** broad coherent capability suites rather than 31 fine-grained ones: (1) content/provenance, (2) exam package/schema/import, (3) exam scoring/policy, (4) session/timing, (5) history/persistence, (6) learning/analytics, (7) UI/navigation, and (8) required `pass30-bank.test.mjs`. Preserve all **177 case names, predicates, fixture setup and exceptions**; no deletion or risk-prone “equivalence” claims. Inline each old module's body in its own lexical block, normalize imports to shared namespace imports, and mark provenance with the old filename. This is physical file consolidation, not delegating old tests through wrappers or hiding them in undiscovered directories. The flat `tests/*.test.mjs` runner and old CI remain unchanged. Repeated imports are once-per-suite and fixture collisions remain lexically scoped. CI will verify whether previously independent suites sharing an ESM process uncover genuine state coupling; do not obscure failures.

**QA gate:** Independent source-name-to-new-name inventory must prove the original 177 registration names are still present; `npm run check` and all old required CI jobs must succeed; no changes to product source/scripts/workflow/HTML, no pre-submit key exposure, source hash and Q62 editorial checks remain separate direct assertions. If a merged suite introduces mutable-fixture coupling, repair by isolating fixture state rather than dropping assertions. Preserve exact mandatory `pass30-bank.test.mjs` through Pass40 policy handoff.

### Pass 37 — LIVE checkpoint A: source audit, design and objective allocation (2026-11-01)

**Starting HEAD:** `ecd98c2c9dc36d529fb56a24b5e9694d019a300e` on `overhaul`. **Assigned TS-01 (chronological names), TS-06 (capability ownership), TS-14 (all original cases mapped), TS-15 (test discovery/determinism).** Read mandatory AGENTS and original Section G, README/docs index, current plan, package.json, CI workflow and 36 current Node test-module headings/imports. Pass36 source/CI establishes 177 passing tests across 36 .test.mjs files (156 original + 21 seeded hardening). Existing `tests/*.test.mjs` glob is deliberate. Browser scripts and CI are excluded from changes this pass.

**Analysis/selected solution:** Keep a *flat* `tests/*.test.mjs` capability-named suite layout, so Node24 native test discovery and unchanged four-job CI need no new glob, runner or compatibility layer. Rename pass-number files based on protected subsystem. Consolidate only self-contained small modules with semantically compatible owners: `build+content`, `backup+storage-concurrency+contract-persistence-properties`, `generic-ui+pass22-response`, `exam-package+cgl-practice`; preserve all assertions in merged files with explicit provenance comments. Preserve `tests/pass30-bank.test.mjs` **exactly until Pass40**, because current `AGENTS.md` mandates that path specifically; document its exception. Do not merge large overlapping but independent source/editorial, scoring, session, FSRS and Results contracts merely to reduce file count. No individual named test is authorised for removal; a documented no-deletion migration of 177/177 is safer than claiming vague semantic duplication. Import paths remain unchanged because files stay in tests root.

**Alternatives rejected:** Moving tests into nested directories now would require changing glob and CI references; importing historical pass modules through wrappers would retain chronological maintenance sprawl; aggressive automated text concatenation without scoped bindings risks silently changing fixtures/test semantics; deleting overlapping outcome checks would discard independent failure detection. Choose lossless, inspectable merges and stable capability names instead.

**Five-step checkpoint:** AUDIT and ANALYSE completed. IMPLEMENT pending. Objective reconciliation must prove exact old→new test-name identity, identical number of runnable cases, valid imports/path hashes, zero old source/script/CI/HTML changes. Targeted QA = normal `npm run check` in fresh CI, existing full browser matrix and Firefox/WebKit, plus source diff against starting SHA. Any failed test must be repaired and rerun before marking verified.

### Pass 36 — LIVE checkpoint C: objective reconciliation, targeted QA and closure (1 Nov 2026)

**Status: VERIFIED; no production changes.** Starting HEAD `d2da82ae3`; final substantive test commit `ec4decbb27bcf80abf94163329a2eea2d4c91ee3`, followed only by scratchpad/index documentation commits. **Successful final [GitHub Actions run 41287019774](https://github.com/oneshubhamt/practice-desk/actions/runs/41287019774)** from exact test commit: **four jobs successful**, including independent v11/current 184-scene matrix, Firefox, WebKit and full unchanged Chromium checks.

**Actually executed QA:** CI's `npm run check` runs `npm run typecheck`, build and `node --test tests/*.test.mjs`; independent job raw output: **177 tests, 177 passed, 0 failed, 6,994 ms Node-test duration** (177 = 156 unchanged original + **21 new cases** across five files). Browser CI ran existing `smoke-offline`, Pass10–16, Pass18–23, Pass25–35 (including Pass15 twice and Pass29 separately); four jobs report success. No claim of manually running Node24/Chromium on a local checkout or physical device; the verified runner is GitHub Actions.

**Five new suite owners / specific assertions:**

- [`tests/contract-scoring-properties.test.mjs`](../../tests/contract-scoring-properties.test.mjs): 200 seeded multi-section override/policy/ceiling/ledger sequences with independent arithmetic; six-kind/manual pending; component cap/floor; absolute+relative NAT boundaries, zero/negative/multiple accepted values; APFC `−5/6` unrounded aggregate and explicit negative-zero/presentation case. Six named tests.
- [`tests/contract-session-model.test.mjs`](../../tests/contract-session-model.test.mjs): 160 seeded ×120 event state-model streams (pause/visibility/rollback/navigation/expiry/terminal), 100 seeded automatic sectional split tests, manual expiry and fraudulent timing-evidence rejection. Four named tests.
- [`tests/contract-persistence-properties.test.mjs`](../../tests/contract-persistence-properties.test.mjs): 250 seeded ×150 stale-tab CAS interleavings, 200 additive-merge cases, backup integrity/tamper at 0/1/7/101/5,000 records, overflow and collision rejection. Four named tests.
- [`tests/contract-import-boundaries.test.mjs`](../../tests/contract-import-boundaries.test.mjs): 75 seeded authored banks, a successful exactly 2,000-question import retaining 2,000 IDs/keys and 10 sections, overflow/malformed data, all six engine response kinds and writing manual-pending. Five named tests.
- [`tests/contract-analytics-properties.test.mjs`](../../tests/contract-analytics-properties.test.mjs): 300 seeded learning progression classifications and 90 six-kind frozen attempts with exact answered/blank/pending accounting, eligible denominator and insufficient speed-data honesty. Two named tests.

**Objective-by-objective source/QA reconciliation:**

| Finding | Result | Direct evidence and boundary |
|---|---|---|
| TS-01 | **VERIFIED for Pass36** | Exact 156 existing test names indexed individually in this file (31 suites); their capability-based rename/merge remains Pass37 by design |
| TS-02 | **VERIFIED** | Independent scoring arithmetic oracle + seeded transition state model, broad generated valid policies/events, no production helper used to derive expected results |
| TS-03 | **VERIFIED** | Multiple accepted NAT values, zero/negative, exact binary-fraction tolerance boundaries, relative+absolute envelopes, APFC fraction, negative zero, display decimals, full partial-credit caps |
| TS-04 | **VERIFIED for pure layer** | 160 session event streams, 100 sectional expiry variants and 250 simulated stale-tab/CAS sequences; browser OS kill/eviction deferred |
| TS-05 | **VERIFIED for pure importer layer** | 2,000-question success/no-truncation, 2,001 rejection, 75 generated banks and adversarial answers/prompts; heavyweight browser import stress deferred to Pass38 |
| TS-06 | **VERIFIED** | 300 progression and 90 saved six-kind evidence samples; all old FSRS/learning and analytics regressions retained and green |
| TS-10 | **ACCEPTED PHASE BOUNDARY** | Existing pure UI/keyboard/ARIA tests unchanged and green; rules-based browser a11y and screen-reader/real-device review not claimed, scheduled Pass38 |
| TS-14 | **VERIFIED for inventory** | All 156 original Node test cases individually recorded, preserved and executable; 25/25 browser scripts listed with ownership/disposition; exact per-browser-assertion replacement proof required during Pass38 before any retirement |
| TS-15 | **VERIFIED for pure test determinism** | Stable xorshift seeds, explicit seed/event in assertions, no sleeps/third-party property dependency; browser version pinning and CI fixture deduplication scheduled Pass38/39 |

**Observed QA correction:** First new CI failure in [run 41286606569](https://github.com/oneshubhamt/practice-desk/actions/runs/41286606569) came from an *incorrect test oracle* requiring unique content hashes for semantically identical questions. Corrected to assert **unique question revision IDs, unique answer-key references and valid digest presence**; same content is allowed to share a hash. That is not an app regression, and the corrected full run is green. A mistaken draft essay-blank branch in newly added seeded analytics was corrected before the final successful CI. No source change was warranted.

**Scope/diff reconciliation:** Compared with base `d2da82ae3`, only five `tests/contract-*.test.mjs` files and two existing scratchpad docs changed. **Zero changes** to `src/`, `scripts/`, `.github/`, `package.json`, content JSON or generated offline HTML. No test, script, CI gate, historical editorial assertion or v11 baseline was deleted. The original Section G carries a cross-reference to this dedicated active ledger.

**Remaining risks / next gate:** Pure tests cannot certify browser a11y, real device/AT, browser storage eviction, large full UI import throughput or semantic visual quality. Exact browser assertion-by-assertion migration is only partially enumerated (script sources and scenario owner are inventoried); it must be completed in Pass38 **before** deleting scripts. **Pass37** may now consolidate/rename chronological Node tests one assertion at a time against the 156-case immutable inventory while old Chromium, Firefox, WebKit and Pass29/30 continue to run.

**Initial checkpoint — 2026-11-01:** Original 15-pass planning document condensed into five substantial milestones after user feedback. No production code, tests, browser scripts or workflow have changed as part of the planning revision. Existing AGENTS and Pass29/30 requirements remain active. **Next action: Pass36 assertion inventory and stronger tests.**

For every pass, log (1) date, starting/current HEAD and status; (2) the source/consumer/tests actually audited; (3) alternatives and chosen invariants; (4) every changed path/commit and old→new assertion IDs; (5) objective-by-objective PASS/FAIL/BLOCKED and remediation; (6) exact targeted commands/results, seeds, browser versions and workflow run links; (7) residual risks and next gate. Maintain these **during** implementation, not retroactively.

**Do not equate a pass with a single commit.** Multiple focused commits, checklists, and fixes belong to one substantive pass. Only explicitly reopened unsatisfied objectives can keep a pass incomplete.

## 6B. Post-Pass39 semantic consolidation — independently VERIFIED (1 November 2026)

**Full CI SUCCESS:** [run 41306573542](https://github.com/oneshubhamt/practice-desk/actions/runs/41306573542), **5/5** (Node24 strict typecheck/build/Node tests, Chromium, Firefox, WebKit, gated verified-HTML publisher). **176/176 Node registrations passed**, compared with **178** at starting head `0d9a47f`. Chromium logs: **2** modern critical scenarios (previously 3), three responsive bank/modes including 195px+140% and authored APFC/NAT, explicit full recovery/deletion guard PASS, UI **44 measured states** (previously 36) across four viewports including *scrolled Results/Review* popover and focus, 80-record/100-item stress PASS (History startup observed 728 ms on this runner), native Chromium Back and forced-no-API fragment fallback PASS; Firefox/WebKit storage and fallback PASS. **Zero routine screenshot comparisons.** End-to-end observed workflow elapsed ~**129 seconds**; this is not an SLA or controlled performance claim.

**Actual source commit `00e3e5a`** on `overhaul`, following audit-only docs commit `fd9346e`. Difference against starting `0d9a47f`: exactly two Node suite files, five browser/harness source files, CI script list and this scratchpad changed; **no `src/`, `examples/`, `package.json`, content/keys, frozen `baseline/v11`, generated offline HTML or publisher policy edited**. History/FSRS/APFC scoring and Mac fallback protected by unchanged independent CI gates. Eight Node suite files still exist, only **176 actual cases**.

**Assertion-by-assertion retirement proof:**

| Retired test or script | Distinct original assertions retained in stronger owner | Independent evidence |
|---|---|---|
| `tests/exam-package-and-import.test.mjs`: `all original and reviewed editions use one validated question model` | In `generic importer retains all 500 questions in 10 existing editions`: (10) packages, total (1000), each `validateExamPackage(p)===p`, each **100 question revisions**, each four sections | Node suite **176/176** |
| `tests/content-and-provenance.test.mjs`: `imports all five CGL source and reviewed editions with revision-pinned keys` | In the stronger `all five CGL paper families preserve independently pinned original and reviewed keys...` case: five families × two editions, 100 questions each, four section membership/total=100, **paper.answerKeyRevisionId === answerKey.id**, 100 key entries per edition, per-question source/review prompt/options/key and editorial policy | Node suite **176/176** |
| `scripts/acceptance-critical.mjs`: APFC/NAT/untimed duplicate third browser journey | `acceptance-bank-modes.mjs` already executes authored starter download, import, MCQ+NAT answer, untimed strict/free/single, frozen three-question APFC result at laptop/phone/195px. Now additionally asserts **exact earnedMarks=5 out of 7.5**, formerly sole numerical assertion unique to the third critical journey | Modern bank/modes **3/3 viewports PASS** |
| `scripts/pass18-targeted.mjs` | `acceptance-recovery.mjs` now verifies first Discard **dismissed without deleting**, then **two** unfinished Discard confirms, `UNFINISHED` warning, no orphan emergency mirror; **one** `COMPLETED` Delete confirm; persisted completed strict **four-section consumed timings** with finite durations; Results time-used/attempt-rate/median/section-time disclosures; additionally retains modern backup v3, additive import, missing record and IndexedDB fallback | Chromium **MODERN RECOVERY PASS**, original Pass18 removed from source and CI |
| `scripts/pass20-targeted.mjs` | `acceptance-bank-modes.mjs` now checks strict CGL **200.00** / +2 / −0.5 and correction provenance, strict help 15-min/no carry/keyboard/backup, single=**50.00**, flexible 60-min/pause, original source publisher/excluded status. `acceptance-critical.mjs` checks imported six-kind **10.00**, manual-response/authored provenance/no SSC, 20-min authored rules. `acceptance-ui.mjs` checks independent attribution Library+History, immersive Aa, direct-body fixed control, popover bounds **x and y**, theme/font/fullscreen visibility, Escape focus, Results and Review scrolled popover at **1366/768/390/195px**, original Results/tabs handling. No v11 oracle required | Chromium **2 critical PASS**, **44 measured UI states PASS**, **3 bank/modes PASS**; old Pass20 file and CI removed |

**CI DAG and artifact integrity:** core still runs Node24 check once; Chromium modern suites and **eight** focused older safety scripts run after core, Firefox/WebKit matrix run actual `file://` journeys, publisher alone holds `contents:write` after every gate and cannot publish an untested changed source. The two retired scripts and their CI invocations are **physically removed**, not skipped or renamed. The two Node test case registrations are **deleted**, with sole distinct assertions incorporated in stronger retained cases. Repeated APFC browser third scenario is **deleted** after numerical score assertion migration. No mandatory screenshot artifacts were introduced.

**Remaining eight executable older-name browser suites (all screenshot-free, each has distinct current behavioural contracts still not completely subsumed):** `smoke-offline.mjs` (full 100-item integrated CGL/media/score/frozen history and backup), `pass11-parity.mjs` (keyboard shortcuts, paused/leave confirmations, parallel unfinished resumes), `pass12-parity.mjs` (source-review editorial prompt and key comparisons, backward-compatible archived CGL comparison, custom six-kind reviewed-source evidence), `pass13-history.mjs` (selection persistence, filters, bulk deletion, addon backup and storage), `pass14-parity.mjs` (real visit/answer change timing, longest question navigation and audit/speed filters), `pass16-independent.mjs` (actual browser exercise for **all ten** CGL editions and real disputed Q62 source-versus-reviewed caution), `pass19-targeted.mjs` (cross-paper adjusted marks diagnostics, five-plus unfinished/resume separation), and `pass21-targeted.mjs` (paused keyboard/flag restrictions, CGL image alt and source editorial key correction). The fact that their names are chronological is **not** a reason to delete or rename them. Further retirement requires migration of the listed distinctive assertions, not a folder-count target.

**Objective reconciliation:** (1) source audit and distinct assertions **PASS**; (2) replace meaningful checks **PASS**; (3) physical removal of *only proven* duplicates **PASS**; (4) source/CI evidence/provenance audit **PASS**; (5) full browser/Node/CI QA **PASS**. **Next independent security/product gate remains Pass40** (manual Mac Safari verification, assistive-technology and actual-device evaluation still unverified; some original 8 browser scripts can be simplified further in future if successor coverage is proved). Do not claim 176 is a mathematically minimal number of test cases or that every possible duplicate is gone.

## 6A. Post-Pass39 semantic consolidation — active work (1 November 2026)

**AUDIT (source head `0d9a47f`):** the eight Node suites expose **178 actual test registrations**, not 178 distinct independently indispensable failure modes. The previously completed 36→8 operation was block/fixture preserving, not actual deduplication; one Q62 case was previously truly removed. Ten screenshot-free legacy Chromium scripts remain (`smoke-offline` + nine `pass11/12/13/14/16/18/19/20/21`). A script being screenshot-free does not by itself establish unique coverage. Existing full [CI 41304541863](https://github.com/oneshubhamt/practice-desk/actions/runs/41304541863) green 5/5 is the baseline. The user explicitly requests **actual reduction**, retaining real safety contracts.

**ANALYSIS / source-evidenced concrete candidates (no deletion until replacement):**
- `tests/exam-package-and-import.test.mjs` has `generic importer retains all 500 questions in 10 existing editions` and `all original and reviewed editions use one validated question model`: both verify ten validated packages, differing only in asserting 100 questions *per* package versus total=1000 and sections=4. Strengthen the former with per-package length, then remove only the latter's duplicated registration.
- `tests/content-and-provenance.test.mjs` has `independent v11 edition parity: all five CGL papers preserve 500 original published keys, and reviewed patches` plus `imports all five CGL source and reviewed editions with revision-pinned keys`: first already visits five source/reviewed pairs, 100× each, verifying every original/reviewed option/score key; second adds key revision linking, 100 key entries and summed section lengths. Integrate those extra checks inside the stronger source-and-reviewed test, then remove the exact duplicate registration. Naming should say **current content provenance** not a new v11 parity mandate.
- `scripts/acceptance-critical.mjs` third APFC/NAT journey repeats `acceptance-bank-modes.mjs` at three viewports; sole distinct runtime assertion checks APFC earnedMarks exactly 5/7.5, which should move to the existing bank/modes scenario before retiring the third duplicate.
- `scripts/pass18-targeted.mjs` and `acceptance-recovery.mjs` both do unfinished Discard/completed Delete. Pass18 **uniquely** checks cancelled Discard preserves the record, **two** confirmations for unfinished discard and a **single** distinct completed Delete confirmation, clears emergency mirror, strict four-section timing evidence and Results time/pacing disclosure. Port those into modern recovery (preserving all intent checks) before removing the standalone Pass18 browser script.
- **Other legacy scripts remain untouched unless an assertion-level replacement audit demonstrates the unique keyboard, paused, media, Q62 disclosure, CAS, bulk deletion, history, source provenance, preflight or study-analytics browser checks.** Do not remove for arbitrary count targets.

**Plan:** (1) document source findings, (2) port the above unique assertions into existing capability suites, (3) retire exactly proven duplicate Node registrations and redundant browser scripts/journey, (4) reconcile source/test/CI selectors by actual search, (5) targeted/full GitHub Actions Node24/Chromium/Firefox/WebKit and gated publish. No routine screenshot comparison, no changes to `src/`, content keys/scoring or `baseline/v11`; keep Mac-compatible fallback and 195px+140% combined Results coverage. **Expected after selective candidates:** 176 Node tests, 9 legacy browser scripts and 2 critical scenarios; do **not** mark complete or assert exact count until CI independently verifies it. Explicit unresolved source-level browser overlap will remain the subsequent gate. This is **not** the Pass40 independent security/device signoff.

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

**Document status:** Pass36 implemented and independently CI verified (run 41287019774); Passes37–40 remain NOT STARTED. Historic plan baselines remain intact. Keep the active ledger current during subsequent passes.
