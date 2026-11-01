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
**Phase: scripts/CI.** Documentation other than this scratchpad remains untouched.

- Audit all 25 legacy script scenarios against the replacement suite. Retire old scripts/CI runs **only after** proof that each unique behaviour has a modern successor or is strictly historical evidence. Preserve archival links and commits; do not import large screenshot binaries into Git.
- Phase out v11 two-app screenshot/pixel parity, including duplicated Pass15/24, Pass25–28, Pass31/33/34, the 56 paired scenes of Pass29 and SHA-specific Pass22 benchmark. Keep independent content/score/editorial invariants and modern Pass35 detached-Aa behaviour.
- Keep **AGENTS-mandated Pass29 and Pass30 executable and running** until Pass40 coordinated policy handoff; the other obsolete scripts may be retired once their coverage is proven.
- CI structure: shared core typecheck/build/Node once; offline Chromium critical journeys; selective cross-browser; optional/release visual/stress; targeted artifacts and no duplicate 30-day screenshot warehouses.
- Check publication/security: tests read-only; minimum `contents:write` only for verified HTML publishing, with correct upstream `needs` dependencies and safe source-drift/rebase checks. Test push/PR/docs-only/source/CI change classes and failure-to-publish cases.
- Improve reproducibility with a controlled browser install and justified lockfile/npm ci decision; retain Node 24 and verified self-contained file:// distribution.
- **Acceptance:** new mandatory CI is green **alongside the temporarily retained Pass29/30 gates**, no unique contract lost, all pending policy changes recorded for Pass40, timings captured. Intermediate CI may not yet show full runtime savings while the two legacy requirements still run.

### Pass 40 — Documentation, coordinated legacy-gate handoff and final independent acceptance
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
| 36 | Tests hardening | IN PROGRESS — AUDIT/ANALYSE | TS-01–06,10,14,15 | — | — | — | Test baseline and independent oracle |
| 37 | Tests organisation | NOT STARTED | TS-01,06,14 | — | — | — | Phase-I exit with full old CI green |
| 38 | Browser scripts | NOT STARTED | TS-05,07–10,12,14,15 | — | — | — | Cross-browser/visual/stress replacement |
| 39 | Scripts + CI | NOT STARTED | TS-07,08,11,12,14,15 | — | — | — | CI safety; Pass29/30 temporarily mandated |
| 40 | Docs + final acceptance | NOT STARTED | TS-08,11,13,14 | — | — | — | Policy/CI synchronized final handoff |

### Pass 36 — LIVE checkpoint A: audit and analysis (2026-11-01)

**Starting branch HEAD:** `d2da82ae3313a3eab66f42b37fc77a01186a126b`. Only `overhaul`. **Finding IDs:** TS-01, TS-02, TS-03, TS-04, TS-05, TS-06, TS-10, TS-14, TS-15. Old Pass29/30 and all existing CI jobs remain mandatory.

**Source and consumers actually inspected:** `src/engine/{scoring,score-ceiling,session}.ts`, `src/domain/{question,exam,scoring}.ts`, `src/history/{concurrency,backup}.ts`, `src/app/bank-import.ts`, `src/learning/question-analytics.ts`; source references and all named tests in the 31 existing Node suites; `AGENTS.md`, original Section G, current architecture, CI and working plan. Existing browser-script inventory in Section 3 is provisional at scenario level pending assert-by-assert browser migration in Pass38.

**Baseline enumeration:** 31 Node `.test.mjs` files, **156 statically declared named `test(...)` cases** (64 cases across the first 15 files + 92 across the remaining 16); one shared six-kind fixture; 25 browser QA scripts plus build/helper scripts. The tree and actual declarations were read through the GitHub connector. Existing run 41283842614 measured ~7 sec core checks and ~4m22s workflow wall; this is prior run, **not a Pass36 QA result**.

**Test ownership decision:** Add `tests/contract-*.test.mjs` hardening suites with stable explicit seeds and independent arithmetic/state oracles. Retain all 156 original cases and existing old browser gates in Pass36. Reorganising old tests belongs to Pass37. No new dependency (Node 24 native `node:test`), no production code changes unless a reproducible failing invariant proves a defect. Direct scoring API tests and separately validated package/import tests each test their own level; do not pretend a direct unvalidated `scoreAttempt` call proves importer validation. Floating-point equality uses mathematically motivated approximate comparisons and exact binary-fraction boundary fixtures. Synthetic session clocks, no sleeps.

**Pre-existing risk / rejected alternatives:** large property-based library adds unneeded dependency and lock complexity for this pass; fixed-seed xorshift generator with scenario/seed in failure output is smaller, inspectable and reproducible. Rejected identical implementation-as-oracle. Pure tests cannot establish actual `file://`, browser quota denial or a11y; those remain Pass38 browser commitments. No assertion deletions before Pass37 migration mapping.

**Implementation checkpoint B (2026-11-01, test-side only):** Added five native Node test suites: `contract-scoring-properties` (seeded overrides/marks/ceilings/partial/NAT/APFC); `contract-session-model` (160 seeded event streams + sectional overshoot/expiry/tamper); `contract-persistence-properties` (250 stale-tab interleavings, 200 additive merges, backup tamper/5000 boundary); `contract-import-boundaries` (75 seeded banks, full 2000-question limit, unsafe inputs, six-kind response validation); `contract-analytics-properties` (300 progression datasets, 90 frozen six-kind attempts). Old 156 named tests, all 25 browser scripts, CI, production sources, content JSON and generated HTML unchanged. Commits: `78f65b1`, `7f9e751`, `b93dc21`, `b9e2483`, `13eb9ff` plus fixture-expectation corrections. Initial on-commit CI (run 41286606569) failed a newly asserted **false hash uniqueness property**; distinct IDs may share the same semantic content hash, so corrected only the test to check distinct IDs and complete key mapping in commit `bcd3e14`. **This is not a production bug.** Wait for a green full CI on the corrected head before marking Pass36 verified. Browser and semantics gating still remains legacy-mandated.

**Implementation status at checkpoint A:** no source/tests/scripts/CI changed; scratchpad update only. Next: add seeded maths/session/persistence/import tests, verify CI and reconcile findings independently.

**Initial checkpoint — 2026-11-01:** Original 15-pass planning document condensed into five substantial milestones after user feedback. No production code, tests, browser scripts or workflow have changed as part of the planning revision. Existing AGENTS and Pass29/30 requirements remain active. **Next action: Pass36 assertion inventory and stronger tests.**

For every pass, log (1) date, starting/current HEAD and status; (2) the source/consumer/tests actually audited; (3) alternatives and chosen invariants; (4) every changed path/commit and old→new assertion IDs; (5) objective-by-objective PASS/FAIL/BLOCKED and remediation; (6) exact targeted commands/results, seeds, browser versions and workflow run links; (7) residual risks and next gate. Maintain these **during** implementation, not retroactively.

**Do not equate a pass with a single commit.** Multiple focused commits, checklists, and fixes belong to one substantive pass. Only explicitly reopened unsatisfied objectives can keep a pass incomplete.

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
