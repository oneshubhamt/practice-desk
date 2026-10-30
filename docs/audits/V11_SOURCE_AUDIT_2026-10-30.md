# Independent V11 → Overhaul source audit — 30 October 2026

**Verdict: broader capabilities and stronger engineering, but V11 practical functionality/UX superset NOT YET DEMONSTRATED; release signoff not approved.**

- Baseline source branch: `baseline/v11` at `e661822d865927e89a837790c1c6bc1cfc2562a6`.
- Target inspected: `overhaul` at `ccb07a249ada45cfb054e911041ae7ee7a2cde57` (documentation-only edits after `d4c36f9286059af970be342a7a894415517087aa`; no app-source modifications during this audit).
- Method: **new manual code inspection** of baseline `src/app/legacy.ts`, baseline CSS/template, the source-paper tree, and present implementation across `src/app/`, `src/domain/`, `src/engine/`, `src/history/`, `src/learning/`, `src/content/`, CSS, and template. The existing pass-specific QA assertions, acceptance writeups and screenshots were deliberately **not used as proof**. This is a code-to-code semantic audit, not a fresh physical device/runtime usability trial. No fixture success or old audit's DONE flag is counted.
- **Set-theoretic acceptance:** Let V be the set of material v11 user-visible capabilities and O those of overhaul. Require every element in V to have the same or a demonstrably better functional counterpart in O (explicit approved, safer behavior may be a qualified exception), **plus** preserve timing/data/safety semantics. Adding generic features does not compensate for V\O. Useful v11 capability/UX inclusion is **not established**; literal identical implementation or visual replication is not the goal. This report deliberately keeps both positive and negative results.
- Priority: P0 critical irreversible user loss/key exposure; P1 significant functional/behavioral/UI gap or inconsistent imported rules; P2 presentation, feedback, accessibility, or lower-risk workflow difference; P3 cleanup/polish. **Open findings are source-supported, not claims of user reproduction.**

## 0. Governing acceptance touchstone and implementation plan (clarification, 30 October 2026)

**User decision:** The target is a **superior, generic, well-engineered, familiar-to-v11 application** — not a pixel clone or a restoration of its internal architecture. Preserve *every useful v11 function and workflow* and the ease, clarity and predictability of its UI, or improve upon each with a defensible user-facing benefit. Additional features must not compensate for a removed v11 benefit. Preserve the original question banks, user-approved disputed Q62 caution policy, and single-file offline design. Do not reinstall less-safe legacy backup or monolithic architecture solely for exact equivalence.

**Visual reference:** Keep v11's intuitive library, selected paper/mode, compact controls, full exam shell, 4-section layout and question navigator, timers, answer/flag states, worked review, insights/history, and always-accessible display settings recognizable. Better contrast, typography, information hierarchy, responsive layout and native accessibility are welcome; no pixel-for-pixel matching is required. Whether a redesigned screen is actually better needs paired human UI assessment, not a source assertion.

**Important classification:** The **25 IDs stay intact**: F01–F15 (15 v11-facing) plus G01–G10 (10 generic/data). Original severity counts: **9 P1, 16 P2**. These are source observations, not 25 proven runtime failures. **G10 is an already-approved intentional improvement** (non-migrated legacy data and safer v3 additive backup), so it needs *no code change*. **24 IDs require implementation or explicit evidence-based disposition**, not necessarily 24 patches. F12 is a potential performance risk pending measurement, not a proven slowdown. F09's alternative fast/slow ratios are not inherently inferior; retain the more useful, coherently documented definition. F11 should retain both native-radio accessibility *and* useful exam navigation, not mimic v11's button markup. F10 requires preserving the practical ability to mark during permitted pauses unless an explicitly justified better workflow replaces it.

**Closure rules:** For each open ID, compare the actual user task and UI path in both branches. Choose (a) preserve/extend the useful function, (b) repair a genuine logic or import-contract defect, or (c) justify with observable evidence an equally usable improvement. Do not close an issue merely because the old behavior is different, the UI looks more modern, or prior QA passed. Stronger typed abstractions and sound persistence are mandatory. Real-device/manual accessibility and aesthetic signoff remain separately pending.

### Delivery estimate: 7 passes — Passes 17–23

Six implementation/reconciliation passes, then one **independent** whole-app source/UI acceptance pass. Each pass uses **audit → analyze → implement → verify every assigned objective → targeted new QA**, with attention to adjacent-feature regressions.

| Pass | Cohesive scope | Assigned audit IDs | Required outcome |
|---|---|---|---|
| **17** | Generic exam engine, score rules and import validation | **G01 G02 G03 G04 G05 G06 G09** | All accepted timing/navigation/review rules are executable and correctly scored, or clearly rejected; valid keys must be answerable; maxima honest |
| **18** | Session timing, saved evidence and deletion safeguards | **F01 F09 F13** | Preserve actual sectional wall time *alongside* foreground metrics, useful elapsed/attempt-rate presentation, and safe unfinished/discard controls |
| **19** | Historical analytics and recent results | **F03 F04 F05** | Restore marks-based section priorities *alongside* accuracy analysis, per-attempt denominators and distinct completed-results versus pending-resume access |
| **20** | v11-familiar library and global layout | **F02 F06 F14 F15** | Clear pretest max/rules/editorial provenance, detailed help, accessible always-available display settings, appropriate independence notice, improved responsive composition |
| **21** | Exam/review UI and accessibility | **F07 F08 F10 F11** | Contextual figure alt text, meaningful review labels, pause-time marking utility, nonconflicting native-radio/exam keyboard interaction |
| **22** | Generic question interactions and real UI performance | **G07 G08 F12** | No misleading unsaved checkbox state, recoverable matching errors, performant results based on measured heavy views; cross-screen integration checks |
| **23** | Independent de novo complete v11-to-overhaul audit | **Recheck F01–F15, G01–G09; record G10 as accepted** | Show a superior practical v11 capability/UX superset and generic correctness; no unconditional release claim without real devices, AT, storage-failure and human visual review |

**Pass discipline:** Pass 17 protects the generic contract first; Passes 18–19 restore actual measurable benefits; Passes 20–21 preserve the look, feel, information and controls users liked in v11; Pass 22 verifies generic usability/performance; Pass 23 independently challenges the *whole* app, not only the 24 remediations. Findings discovered during fixes are logged and scoped rather than overlooked. No implementation is claimed by this planning amendment.

**Status:** The audit remains **OPEN**, not a demonstrated complete v11 functional/UX superset; the seven passes are prospective only. Only `overhaul` may be edited; `main` and `baseline/v11` remain frozen. No release merge is authorized.

## A. Immutable content and branch integrity

**No source-bank regression:** The Git blob SHA for `src/content/papers.json` is identical on both branches (`1d2c388a91a82c49feb57ccd86a8a40eb7388473`); patches (`37328784aadd53810a786550ce02ff3105fccbd7`) and post-test solutions (`ada93d1f27c091023d6a26e9f89dd8956ebaf55e`) also match *byte for byte*. The app has been reimplemented, not silently replaced with new paper content. `main` and `baseline/v11` are outside change scope.

**Still present by direct code path:** CGL five dates/paired editions and their source/review distinction (`import-cgl.ts`, `exam-package.ts`, `generic-ui.ts:listHTML`); original/reviewed key separation and Q62 caution policy; the three CGL strict/free/single modes; A–D, arrows, flags, clear, palette and full-screen fallback; section-close and background timer settlement; results/marks/eligibility and solution disclosure after completion; original version comparisons; review filters and long-question links; history open/sort/filter, persistent selection, storage estimate/persist, export/import and double-confirmed bulk completed-history deletion; light/dark/85–140% text scaling, responsive CSS; session freeze and optimistic data validation. These are **source path mappings only**, not assertions of empirical device behavior.

## B. v11 feature-by-feature reconciliation

| ID | v11 material capability | Overhaul direct source location | Disposition |
|---|---|---|---|
| V-01 | Source paper by date and explicit original/reviewed toggle | `legacy.ts:drawHome` → `generic-ui.ts:listHTML` | Equivalent, though overlapping paper+edition selectors |
| V-02 | Three CGL modes, four 15-minute locked sections, 60-minute free, 15-minute single | `legacy.ts:makeAttempt/strictNext/drawExam` → `exam-package.ts:configureCglPractice`, `session.ts` | Core present; UI metrics gaps below |
| V-03 | Direct answer/clear, M flag, left/right movement, palette, fullscreen | `legacy.ts:drawExam/keydown` → `generic-ui.ts:renderModelExam/keyboard`, `bootstrap.ts` | Core present; native-radio conflict below |
| V-04 | Pause in flexible/single, time elapses hidden, restored deadlines | `legacy.ts:togglePause/settleTimer` → `session.ts:checkpoint`, `frozen.ts:restoreSession`, timer in `generic-ui.ts` | Core present; no real-device expiry guarantee |
| V-05 | Original visible source question no premature answer disclosure | `legacy.ts:qHTML/optionsHTML` → `generic-ui.ts:renderModelExam`, `exam-package.ts` | Core present |
| V-06 | Review correct/wrong/invalid visuals, notes, source PDF comparison, explanations | `legacy.ts:reviewOneHTML/reviewedSolutionHTML` → `generic-ui.ts:frozenReviewMedia/sourceReviewHTML/resultHTML` | Core present; feedback language changes |
| V-07 | CGL adjusted +2/−0.5, published key comparison and excluded questions | `legacy.ts:calculate/scoreCards` → `import-cgl.ts`, `scoring.ts`, `source-comparison.ts` | Present; disputed Q62 user policy acknowledged |
| V-08 | Exact 100-question section/paper max, per-section marks and progress | `legacy.ts:scoreCards/sectionTable` → `score-ceiling.ts`, `resultHTML` | Marks present; wall-time presentation lost |
| V-09 | Time/pace, section diagnostics, answer revisions, opportunity arithmetic | `legacy.ts:insightsHTML/analytic` → `attempt-evidence.ts`, `result-presentation.ts` | Present in altered form; specific metrics absent |
| V-10 | Key audit, flags, wrong/skipped, fast/typical/slow review filters | `legacy.ts:reviewHTML` → `result-presentation.ts:reviewFiltersHTML/reviewMatch` | Present; threshold semantics differ |
| V-11 | Five longest question timings with review jump | `legacy.ts:analytic/insightsHTML` → `question-analytics.ts`, `questionCoachingHTML` | Present |
| V-12 | Recent **completed** attempts on library | `legacy.ts:drawHome` → `generic-ui.ts:listHTML` | **Differing**: now includes in-progress |
| V-13 | History attempts, best adjusted %, source edition, comparable-score trend | `legacy.ts:drawHistory/historyTrendHTML` → `history-page.ts/history-metrics.ts` | Broadly present; per-record denominator and weighted priorities missing |
| V-14 | Delete individual **completed** attempt, 2-step delete all completed | `legacy.ts:deleteOne/clearHistory` → `generic-ui.ts:removeSavedAttempt/deleteAllCompleted` | Bulk preserved; individual deletion scope enlarged (risk) |
| V-15 | Estimate/persist, offline warnings, local storage status | `legacy.ts:showQuota/requestPersist` → `generic-ui.ts`, `history-page.ts` | Present |
| V-16 | Preferences, manual restore/import/export of backups | `legacy.ts:initStorage/importBackup/exportBackup` → `preferences.ts`, `practice-selection.ts`, `backup.ts` | Present with intentionally incompatible safer format |
| V-17 | Expandable exact exam rules, published/editorial legend | `legacy.ts:drawHome` → `generic-ui.ts:listHTML` | Reduced specificity and editorial counts |
| V-18 | Full-screen native with focus-layout fallback | `legacy.ts:toggleFullscreen` → `bootstrap.ts:toggleFullscreen` | Present |
| V-19 | Per-question image/passages and multiline rationale | `legacy.ts:qHTML/reviewedSolutionHTML` → `exam-package.ts`, `generic-ui.ts` and `app.css` | Present, but alt text less descriptive |
| V-20 | Screen-readable state and keyboard interactions | `legacy.ts:template aria-live` → `template.html:screen-announcement`, `generic-ui.ts:draw` | More targeted announcements; AT confirmation not possible from code alone |

## C. Open v11-facing UI/behavior regressions — do not close on previous tests

### P1 · F01 — Per-section wall-clock duration is not preserved as a visible result metric

**Baseline:** `src/app/legacy.ts:segment/strictNext/durationOfSection/sectionTable/paceBars/insightsHTML` records independent section start/end times and shows each section's **actual elapsed time used**. **Overhaul:** `src/engine/session.ts:SessionState` has only `elapsedMs`, **current** `sectionElapsedMs` and per-question `timeSpentMs`; `advance()` resets sectionElapsedMs to zero. `src/engine/score-ceiling.ts:sectionScoreSummaries` and `src/app/result-presentation.ts:sectionPaceHTML` instead show foreground question exposure. Foreground viewing is useful, but not a substitute for each strict section's actual wall-clock duration. **Impact:** one v11 report capability is lost, particularly early-submitted sectional analysis. **Repair:** freeze per-section consumed wall time/completion reason in newly started session records, show wall vs foreground separately without fabricating old records. Any schema migration must remain optional/non-destructive.

### P1 · F02 — Pre-test score ceiling and editorial/audit counts disappear from the paper summary

**Baseline:** `legacy.ts:drawHome` has visible **200 original maximum**, `+2/−0.5/0` rules and explicit reviewed patch counts, unresolved defects/cautions, source-versus-reviewed provenance explanation. **Overhaul:** `generic-ui.ts:listHTML` preview instead offers question count/time/sections/navigation and a generic promise of frozen rules. **Impact:** a user cannot verify scoring size and editorial trust/cautions before starting from the same screen. **Repair:** add generic *calculated* max/rule summary and status/patch counts where metadata supports them, plus clear “publisher key versus independently reviewed” wording. Avoid hard-coding SSC-only information for imported exams.

### P1 · F03 — v11 cross-paper adjusted-marks section priority analysis has no equivalent

**Baseline:** `legacy.ts:historyPrioritiesHTML` selects up to eight recent full-paper attempts and ranks sections by **audited marks / eligible max** while disclosing accuracy. **Overhaul:** `history-page.ts:sectionPriorities` aggregates by exam + section title and ranks only observed accuracy; no weighted section score ratio, and single-section attempts are included. **Impact:** that actionable marks-based comparative workflow was replaced rather than extended. **Repair:** retain the modern accuracy lens, add an explicitly labelled v11-compatible score-priority lens for comparable exam format with frozen per-section denominators, avoiding false cross-exam normalization.

### P2 · F04 — Completed archive entries no longer show marks denominator

**Baseline:** `legacy.ts:drawHistory` displays each record as **marks / maximum**. **Overhaul:** `history-page.ts:historyHTML` archive row gives only “X marks · Y correct,” with a denominator only after opening results. This weakens a crucial 25-question versus 100-question distinction. **Repair:** show `earned / scoreableMaximum` and explicit exam mode in each archived entry and recent completed card.

### P2 · F05 — Library “Recent attempts” mixes unfinished into the completed-result shortlist

**Baseline:** `legacy.ts:drawHome` filters recent rows to completed attempts and puts the single active session in a separate Resume banner. **Overhaul:** `generic-ui.ts:listHTML` calculates `latest=all.slice(0,3)`, including pending entries, while showing a separate unfinished banner. The latest three **completed results** can disappear from the library's quick links. **Repair:** keep an independent completed-only recent list; offer a separate multi-pending resume section.

### P2 · F06 — Concrete rules and audit help text simplified substantially

**Baseline:** `legacy.ts:drawHome` spells out early-submit timing, no transfer of unused section minutes, +2/−0.5, local backup limitations, original vs reviewed answer provenance, and full shortcuts. **Overhaul:** `generic-ui.ts:listHTML` one short expandable rules paragraph omits multiple operative details. **Repair:** restore a concise but complete rules panel generated from selected timing/navigation/scoring policies, with CGL provenance notes only where applicable.

### P2 · F07 — Original CGL image alt labels lost question/option identity

**Baseline:** `legacy.ts:qHTML/optionsHTML` uses “Diagram for question N” and “Option A” for image alternatives. **Overhaul:** `exam-package.ts:asImage` generates assets without `altText`; `generic-ui.ts:assetHTML` falls back to generic “Question image.” **Impact:** screen-reader users receive less context for original figure/option images. **Repair:** attach question/option-number context in imported CGL assets, and preserve richer explicit authored alt text for general exams.

### P2 · F08 — Review/status labels lose v11's descriptive editorial messaging

**Baseline:** `legacy.ts:reviewOneHTML` emits “Defective · excluded,” “Key corrected,” “Wording caution,” and “Refined” badges. **Overhaul:** `generic-ui.ts:resultHTML` currently prints raw editorial status strings in a small metadata line (though notes and color statuses remain). **Repair:** map frozen editorial states to accessible descriptive labels; never suggest that “caution” means a key is independently established.

### P2 · F09 — Timing/pace semantics changed and some v11 visible metrics are absent

**Baseline:** `legacy.ts:insightsHTML` directly shows “Test time used,” answered attempt rate and overall median time, as well as section wall time. **Overhaul:** `attempt-evidence.ts` computes elapsed and section median, but the central overview emphasizes foreground totals and section medians, without a comparable explicit global time-used or attempt-rate card. Fast/slow thresholds also changed from 0.6×/1.6× to 0.75×/1.5× section median (`question-analytics.ts`). **Repair:** show both original and improved metrics with clear labels, document speed-policy differences as policy not silently identical classifications.

### P2 · F10 — Flag action is disabled while paused whereas v11 permitted it

**Baseline:** `legacy.ts:markQuestion` doesn't reject paused state; `drawExam` Mark is enabled even while pauses disable answer options. **Overhaul:** `generic-ui.ts:renderModelExam` disables `#g-flag` whenever session is paused. **Repair:** choose and document policy explicitly; unless needed for exam integrity, preserve paused review markers for flexible CGL.

### P2 · F11 — Native radio arrow control conflicts with global previous/next shortcut

**Baseline:** v11 used ordinary buttons and ArrowLeft/Right meant question navigation. **Overhaul:** `generic-ui.ts:renderGenericControls` changes answers to native radios, but `generic-ui.ts:keyboard` still intercepts ArrowLeft/Right even when a `generic-answer` radio is focused and `preventDefault()` is called. Native radio arrow-key behavior no longer functions normally. **Repair:** prioritize radio native arrows when a radio is focused or require modified navigation chords in that focus context; preserve A–D and accessible Next/Previous buttons.

### P2 · F12 — Result-route DOM eagerly materializes nonselected views

**Baseline:** `legacy.ts:drawResults` creates the active tab's content only. **Overhaul:** `generic-ui.ts:resultHTML` constructs the overview, a filtered potentially 100-question review and timing ledger in one HTML string even when `hidden`. **Impact:** expensive redraw of image-heavy review lists and all tabs on every result interaction, with potential latency on mobile. **Repair:** render tab content lazily by current `resultTab`, preserving tab semantics and dedicated scroll/focus behavior. **Risk from source; runtime performance not measured here.**

### P1 · F13 — Individual archive deletion now includes in-progress attempts

**Baseline:** `legacy.ts:deleteOne` checks `!a.finishedAt` and refuses unfinished records. **Overhaul:** `history-page.ts:historyHTML` renders a Delete button for **all** records and `generic-ui.ts:removeSavedAttempt` accepts any `isAttempt` including unfinished; it may remove the currently active session after a single generic confirmation. This is a destructive affordance change, not only a stylistic preference. **Repair:** separate “Discard unfinished attempt” with explicit state/answer-loss warning and dedicated confirmation from ordinary completed-result delete; make historical completed-only delete the default.

### P2 · F14 — Always-accessible floating Display control removed

**Baseline:** `src/styles/app.css` sets `.display-tools { position:fixed; right:14px; top:12px; z-index:80 }`. Its Aa/Display control is reachable while scrolled deep into a long question, a 100-item review, or history. **Overhaul:** `src/styles/app.css` sets `.display-tools { position:relative }` inside a non-sticky `header`; the control scrolls out of view. **Impact:** the user must scroll back to the top to change text size/theme or invoke global full screen, especially costly during long mobile reviews. **Repair:** preserve a non-obstructing, keyboard-accessible sticky/floating access path that works on tiny screens and does not cover content; validate focus and overlay bounds.

### P2 · F15 — Original exam-source independence disclaimer omitted

**Baseline:** `legacy.ts:drawHome` includes an explicit “Not affiliated with SSC” footer, together with source/review educational edit provenance. **Overhaul:** `src/template.html` has no corresponding footer and `generic-ui.ts:listHTML` shows neither an SSC independence disclaimer nor equally explicit reviewed-answer limitations in the pre-test screen. **Impact:** trust/provenance messaging is less clear even though the edited source can include disputed published keys. **Repair:** use a generic non-affiliation/source-label footer, with exam-specific wording only for a verified built-in source; avoid implying official provenance for imported exams.

## D. New generic-engine correctness issues discovered without QA fixtures

The following are **new abstraction-contract gaps**, not necessarily existing SSC CGL regressions. They matter because the purpose of overhaul was a trustworthy general exam studio.

### P1 · G01 — Valid whole-paper + sequential-locked multi-section exam is impassable

`src/domain/exam.ts:TimingPolicy/NavigationPolicy` and `src/domain/validate.ts:validatePaperRevision` admit a multi-section `whole-paper` paper with `sectionNavigation="sequential-locked"`. `session.ts:transition/NAVIGATE` rejects changing section when sequential-locked; `advance()` is only called on sectional completion. No whole-paper transition advances a section. The UI `renderModelExam` additionally disables all other section buttons. Result: the user can only see section 1 and then submit/expire, making sections 2+ unreachable. **Repair:** define an explicit next-section action for this combination or reject the configuration with a clear schema error.

### P1 · G02 — Declared sectional “manual” transition isn't honored by the timer

`src/domain/exam.ts:TimingPolicy` explicitly admits `transition:"manual"|"automatic"`; `src/domain/validate.ts` validates it. In `src/engine/session.ts:checkpoint`, every time a sectional limit expires it unconditionally calls `advance()`, regardless of `transition`. **Repair:** implement the explicit expired/waiting-for-manual state or remove “manual” from validated imported policies until supported.

### P1 · G03 — Unanswered mark awards may exceed the declared full maximum

`src/domain/validate.ts:validateMarkingRule` checks `unansweredMarks` is *finite*, but not `unansweredMarks ≤ correctMarks`. `src/engine/scoring.ts:scoreAttempt` awards `unansweredMarks` when blank, whereas `src/engine/score-ceiling.ts:scoreableMaximum` totals only `correctMarks`. A fully skipped question with `correctMarks=2`, `unansweredMarks=5` displays eligible max 2 but earns 5. Pass 16's partial-credit cap does **not** cover this. **Repair:** restrict rules or compute mathematically honest maximum under all legally supported response outcomes; keep frozen score compatibility explicit.

### P1 · G04 — Validated multiple-select answer can be impossible to submit

`src/domain/validate.ts:validateAnswerKeyRevision` checks key options exist, but does **not** reconcile `answer.optionIds.length` with `question.content.minSelections/maxSelections`. `src/engine/response.ts:validateResponse` rejects selections outside those ranges. Example: a valid imported package whose key selects 3 options but whose `maxSelections=2`: the correct response is unsubmitable. **Repair:** cross-validate answer cardinality and user response bounds at package import.

### P1 · G05 — Answer-key matching shape lacks the uniqueness constraints enforced on users

`src/domain/validate.ts:validateAnswerKeyRevision` checks that matching pairs reference known left and right IDs, but doesn't enforce uniqueness, while `src/engine/response.ts:validateResponse` rejects repeated left or right matches. Thus an imported paper can declare a repeated-right answer that no submitted response can reproduce. **Repair:** validate answer-key injectivity/coverage against the same constraints as candidate responses.

### P2 · G06 — Declared `navigation.allowReview` has no meaningful engine/UI enforcement

`src/domain/exam.ts:NavigationPolicy` and `src/domain/validate.ts` accept `allowReview=false`, but `src/app/generic-ui.ts:resultHTML` always exposes the complete question-review tab and `src/engine/session.ts` never consults the flag. Clarify whether this policy means *in-exam revisit*, *post-completion detailed disclosure* or both. **Repair:** give it explicit documented semantics, enforce accordingly and reject ambiguous imported combinations.

### P2 · G07 — Incomplete multiple-select edits can leave UI and saved response divergent

In `src/app/generic-ui.ts`, checkbox changes below `minSelections` show a warning without dispatching `ANSWER`/ `CLEAR`. A previous valid stored selection can remain saved when the currently checked UI has fewer selections. Navigating away then restores the old response. **Repair:** explicit draft-editing state or rollback checked controls/announce “previous response unchanged,” and clearly distinguish “draft” from “saved”.

### P2 · G08 — Matching input permits duplicate targets that the engine rejects

`src/app/generic-ui.ts:renderGenericControls` lets each left side independently pick any right item. `src/engine/response.ts:validateResponse` rejects duplicate right-side choices; generic “Invalid matching response” appears after Save without identifying conflicting matches. **Repair:** prevent duplicate right choices, or highlight duplicates and support keyboard correction.

### P2 · G09 — Score/accounting settings can still describe unusual punitive or reward schemes unclearly

`src/domain/validate.ts:validateMarkingRule` allows arbitrary finite negative `unansweredMarks`, partial-component penalties unbounded below, and scoring precision that is presentation-only; `score-ceiling.ts` assumes a positive full-credit maximum even for unusual rule combinations. Define the supported mathematical rule envelope and publish both floor/ceiling and net mark conventions. This is distinct from G03 and cannot be dismissed by the Pass 16 max-partial-credit patch.

### P2 · G10 — Frozen data and source provenance are stronger but intentionally not backward-compatible with v11

`src/history/backup.ts` v3 SHA-256 additive import, `src/history/frozen.ts` immutable paper/key/media, `src/history/concurrency.ts` optimistic revisions are safer. However, v11 backup v1 direct restore and old saved record migration are not supported by current code. **Already accepted exception, not an open defect.** This is a deliberate safer policy for a new app without live v11 user data. No v11 backup migration is required.

## E. Cross-layer source observations (not full regression determinations)

1. **Data model:** clear improvement over monolithic `legacy.ts`: branded IDs, independently hashed revisions, media and stimuli, per-question marking override, 6 kinds, generic original/review references and separate manual grading.
2. **Persistence:** IndexedDB optimistic concurrency and all-record v3 checksum backup significantly exceed v11's simplistic in-place history update, but true crash/multi-device durability remains beyond source inspection. `generic-ui.ts` remains a large (~1,462-line) combined UI/storage/controller with `innerHTML` rerenders; modularity is improved overall, not uniformly.
3. **Timing:** monotonic source + frozen wall clock restore is stronger, yet elapsed wall time/foreground exposure/section-specific timers are not completely interchangeable. See F01/F09 and G02.
4. **UI:** labeled Display trigger, native controls, responsive CSS, semantic tabs/landmarks and scoped announcement are good changes; source cannot establish a visually superior experience without manual inspection.
5. **Security:** text/HTML are generally escaped before `innerHTML`; embedded image media is validated and self-contained, and source URLs are validated as HTTP(S). A separate security review would still be needed for hostile oversized/exotic imports and runtime storage exhaustion.
6. **Learning:** v11 had no corresponding notebook/FSRS pathway; overhaul adds real functionality. Treat this as **O\V**, not as evidence that F01–F15 disappear.
7. **No fixture reliance:** previous Passes 11–16 reports may be useful as historical rationale but were intentionally not accepted as independent audit proof; this audit's source observations are new and sometimes contradict their complete-parity language.

## F. Controlling implementation schedule

**Section 0 is the sole active Passes 17–23 plan.** Earlier stage groupings have been retired to avoid two competing orders. Preserve the numbered findings and their original evidence in Sections B–E. No finding is closed through documentation alone.

---

## G. IMPLEMENTER SCRATCHPAD — operational working area, not a release report

**Purpose:** This is the durable, pass-by-pass engineering memory *within the active audit itself*. Before touching source, load Sections 0, B–E, this section, `docs/decisions/POLICY_REGISTER.md`, `docs/architecture/DATA_CONTRACTS.md`, relevant historic context, and the **current** branch source. If the scratchpad disagrees with current source, update it with the reason; never silently assume old observations still apply. This log is intentionally for execution discipline, not a user-facing achievements list.

### Rules for maintaining this scratchpad

1. **At pass start:** save branch HEAD and changed file set; enumerate all assigned IDs, relevant source locations, exact v11 user benefit where applicable, generic contracts, adjacent functionality, potential regressions and immutable content constraints.
2. **AUDIT:** read existing source paths *and consumers*, not just the code cited in one finding. Note the observed behavior with file references and distinguish proven code logic from suspected runtime/visual risk.
3. **ANALYZE:** log the chosen design, rejected alternatives, state/validation/backward-compatibility implications and **why the replacement preserves or improves the v11 user task**. Keep generic behavior reusable; keep detailed repair notes here rather than editing 25 original findings into speculative success statements.
4. **IMPLEMENT:** list exact files and commits, migrations or deliberate rejections, and any scope discoveries. Don't introduce new actions/rules that UI, persistence, restoration and scoring cannot honor.
5. **OBJECTIVE CHECK:** reconcile *each* assigned ID individually using live source and observable output; label `OPEN`, `IMPLEMENTED — QA PENDING`, `VERIFIED`, `BLOCKED`, or `ACCEPTED DIFFERENCE` with evidence. Never turn a complete pass green while an assigned item is unfinished.
6. **TARGETED QA:** add new positive, negative, adversarial and adjacent-regression checks focused on changed contracts; record **commands actually run** and their results, plus CI link/status if verified. Existing fixtures may supplement, not replace, fresh independent probes. Run necessary typecheck/build smoke checks but **do not repeat whole-app/full-device QA at every pass**.
7. **After pass:** record commit HEAD, open risks and handoff for the next pass. Source of truth = actual code, not this log; keep `main` and `baseline/v11` frozen. Pass **23** performs independent complete source-to-source and paired UI review plus broad release QA; physical mobile/Safari/AT/storage testing is a separate gate until done.

**Five-step cycle:** `AUDIT → ANALYZE → IMPLEMENT → OBJECTIVE RECONCILIATION → TARGETED QA`. Corrections uncovered at step 4 loop back to implementation **before** step 5; this is the intended repeated implementation/check sequence. Avoid pass-level approval solely from green CI.

### Pass register — never infer implementation from this schedule

| Pass | Assigned IDs | Status | Evidence / handoff |
|---|---|---|---|
| 17 | G01, G02, G03, G04, G05, G06, G09 | **IMPLEMENTED — QA PENDING** | Source fixes and independent new tests committed; verify latest CI before promoting any ID to VERIFIED |
| 18 | F01, F09, F13 | NOT STARTED | Read Pass 17 changes before choosing session record schema |
| 19 | F03, F04, F05 | NOT STARTED | Consume truthful frozen timing/scoring denominator from previous passes |
| 20 | F02, F06, F14, F15 | NOT STARTED | v11-informed layout and preflight; no hardcoded SSC-only generic UI |
| 21 | F07, F08, F10, F11 | NOT STARTED | Contextual media/status, pause markers, native keyboard and screen-reader paths |
| 22 | G07, G08, F12 | NOT STARTED | Response draft correctness and measured results performance |
| 23 | F01–F15 and G01–G09 recheck; G10 accepted | NOT STARTED | Independent whole-app source/UI audit, full QA and explicit physical-device caveats |

**Standing accepted exception:** G10 — new app needs no v11 saved-history or backup-v1 migration; SHA-256-verified v3 additive backup stays. Do not reopen without an explicit user change.

### Pass 17 — pre-implementation source inspection and unanswered design decisions

**Branch basis:** `overhaul` after documentation commit `e21098d377b7e76fee26e320a05da297ca5c2143`. At this point these notes concern **existing source**, not changed runtime code. **Next action:** finish cross-layer analysis, choose supported semantics, implement all seven IDs, then targeted new QA. Do not publish a Pass 17 completion claim from this pre-audit.

| ID | Concrete source observation | Required design/QA decision before closure |
|---|---|---|
| G01 | `domain/exam.ts` declares whole-paper + sequential-locked; `domain/validate.ts` accepts it; `engine/session.ts:NAVIGATE` forbids section jump; `app/generic-ui.ts:renderModelExam` disables noncurrent section tabs; `advance()` only called for sectional transition | Prefer a genuinely useful generic next-section action with clear irreversible lock semantics; otherwise explicitly reject an unsupported combination **at package import**. QA multi-section whole-paper accessibility, expiry, and attempted-back navigation |
| G02 | Sectional policy declares `transition:"manual"`; `engine/session.ts:checkpoint` advances unconditionally on expiry | Prefer real expired/manual boundary and unambiguous Next action, including background/offline restore; only if that is safely unsupported, reject manual transition explicitly. QA no extra time consumed or answer edits after expiry |
| G03 | `validateMarkingRule` checks only finite unanswered; `scoreAttempt` awards it; `scoreableMaximum` sums correct marks | Define supported rule envelope so no answer/blank earns above displayed maximum; test over-rewarded blank, per-item override, negative blank and full-paper denominators; don't change frozen original CGL |
| G04 | `validateAnswerKeyRevision` does not compare multiselect key count with `minSelections/maxSelections`; `validateResponse` enforces candidate limits | Cross-validate the key against exact question selection bounds; test both too-many and too-few key choices plus valid minima/maxima |
| G05 | Matching key only verifies referenced IDs; candidate matching rejects duplicate left/right IDs | Require unique left/right answer pairs and key shape consistent with usable response controls; test duplicate left, duplicate right, valid one-to-one and potentially partial matching |
| G06 | `navigation.allowReview` is accepted; no effective in-exam or post-completion enforcement exists | Define its meaning explicitly: in-exam revisit vs after-test solution visibility; preserve no-premature-key-disclosure. Enforce documented semantics across NAVIGATE and UI, or refuse unsupported imports; test user-facing paths |
| G09 | Unanswered values and unbounded partial penalties can produce counterintuitive score floors/denominators; UI score policy assumptions are narrower | Specify mathematically consistent upper/lower bounds and presentation, separate automated pending free-response from graded scores, test adverse imported overrides and never silently clamp a previously frozen result |

**Cross-layer inspection already performed for planning:** `src/domain/{exam,question,answer-key,scoring,validate}.ts`, `src/engine/{session,response,scoring,score-ceiling}.ts`, `src/app/{generic-ui,exam-package}.ts`, `src/history/frozen.ts`, and existing `tests/{domain,engine,pass7-engine,generic-ui}.test.mjs`. Current tests cover some built-in strict CGL and standard six-kind flows but are **not proof** that the seven adversarial imported contracts work. Check call sites and frozen-record verification again once actual source work starts.

**Pass 17 protected invariants:** all five source CGL banks/published and reviewed editions unchanged; disputed 6 October Q62 original excluded and reviewed scoreable caution; no answers revealed before submission; CGL strict 4×15 minutes, free and single still function; source/key/media hashes and frozen attempt scoring remain coherent; no unsafe data-rewriting migration; UI affordances correspond to engine transitions; changes compile to one offline HTML. New rules must be tested at engine + import + UI + persisted-restore boundaries as applicable.

**Pass 17 targeted QA queue (not executed):** import rejects impossible multiselect/matching key; valid one-to-one matching and valid bounded multi-select score; whole-paper locked multi-section advances or is explicitly rejected before start; manual sectional expiry obeys declared behavior or rejects at import; zero/negative/oversized unanswered and unusual partial credit cannot falsify the max; review policy works as documented; CGL strict sectional expiry and early submit remain unchanged; roundtrip of in-progress frozen attempts stays valid. After QA, record exact commits/results against **all seven IDs**, not a blanket green label.

### Pass 17 — implementation record and objective reconciliation (30 October 2026)

**Audit (read, not assumed):** Checked current `domain/{exam,question,answer-key,scoring,validate}`, `engine/{session,response,scoring,score-ceiling}`, `app/{exam-package,generic-ui,result-presentation}`, `history/frozen`, and existing engine/history/UI/generic-flow/CGL regression tests. The raw CGL importer has `transition:"manual"`; the actual configured v11-like strict mode uses `transition:"automatic"`. This distinction is critical for assessing expiry correctly. Inspected result controls and frozen attempt validation, not only the validator and transition snippets. Baseline meaningful behavior protected: strict CGL four automatic 15-minute sections, original/reviewed source bank, source commentary only after exam, current result and history semantics.

**Analyze — choices and rejected shortcuts:**
- G01: implement explicit irreversible `SUBMIT_SECTION` for both whole-paper and untimed `sequential-locked` multi-section exams; preserve a *continuous whole-paper clock*. Rejected silent section jumps and rejecting this useful exam configuration. Opposite promise `sectional + free section-navigation` is rejected during validation because per-section clocks remain locked.
- G02: implement `section-expired` frozen state on *manual* sectional expiry; stop consuming time; enable a visible continue action, prohibit answer/flag/navigation/pause changes while expired, preserve via storage and restore. `automatic` stays automatic. Untimed sectional sections can be submitted even if normal early-submit is disabled, because they cannot expire. Rejected falsely treating `manual` as `automatic`.
- G03/G09: validate `incorrectMarks ≤ unansweredMarks ≤ correctMarks`, no positive wrong marks/negative correct marks, and finite magnitudes ≤ 1,000,000 to protect bound calculations. Existing Pass 16 component full-credit cap remains. Keep negative-but-not-worse-than-wrong blank marks supported. Show nominal full-credit max and separate **conservative lower bound**, explicitly not an attainable worst-case claim. Avoid silently rewriting frozen marks.
- G04/G05: key validation now enforces multiselect correct-option count within exact question min/max and matching unique left/right choices, matching what a candidate can submit. Explicitly reject empty matching answer keys because current UI has no representable saved empty-pairs response.
- G06: `allowReview=false` explicitly means *no post-completion detailed question/key/solution disclosure*. It does not prevent navigation during the exam or deny score/timing reporting. Hide the review tab, question cards/solutions and dead cross-links, preserve timing statistics and neutral question identifiers. This is honest **UI disclosure**, not a cryptographic hiding mechanism for locally frozen keys.

**Implementation files:**
`src/domain/validate.ts`, `src/domain/exam.ts`, `src/engine/session.ts`, `src/engine/score-ceiling.ts`, `src/app/generic-ui.ts`, `src/app/result-presentation.ts`, `docs/architecture/DATA_CONTRACTS.md`, `tests/pass17-contracts.test.mjs` and the corrected `tests/history.test.mjs`. Commits began at `f11e797` (validation) and continue through current `overhaul`; inspect current Git commit as authoritative.

**Objective checks (source level; targeted CI is the remaining gate):**

| ID | Current state | Exact evidence / unfinished gate |
|---|---|---|
| G01 | IMPLEMENTED — QA PENDING | Session `SUBMIT_SECTION` advances whole-paper/untimed locked section; navigation and early `SUBMIT_ATTEMPT` remain blocked; matching UI button + handler; contradictory sectional/free rejected; new locked progression/expiry tests |
| G02 | IMPLEMENTED — QA PENDING | Manual expiry enters frozen `section-expired`; explicit continuation; no charged waiting time; UI status and persisted validation; untimed sectional explicit progression; auto CGL untouched; new expiry/restore tests |
| G03 | IMPLEMENTED — QA PENDING | Validated per-rule blank reward cannot exceed `correctMarks` or punish worse than wrong, including item/section overrides; original full-score max remains coherent; negative blank edge tests |
| G04 | IMPLEMENTED — QA PENDING | Key cardinality checked against question bounds at import/freeze; too-many/too-few and valid tests |
| G05 | IMPLEMENTED — QA PENDING | Key left/right uniqueness and nonempty shape checked; duplicate-left/right tests |
| G06 | IMPLEMENTED — QA PENDING | `allowReview` meaning documented in domain; review tab, detailed cards and key links withheld in UI, but scores and time ledger remain; new policy/UI-level tests; **real-browser route inspection still needed for final acceptance** |
| G09 | IMPLEMENTED — QA PENDING | Magnitudes bounded; `scoreableLowerBound` conservative floor, `scoreableMaximum` full-credit ceiling, and explicitly labeled result explanation; harsh component and overflow-adjacent tests |

**Targeted QA:**
- Added `tests/pass17-contracts.test.mjs`: accepted/rejected key shapes, score bounds, manual expiry including save/restore, whole-paper and untimed locked progress, automatic expiry, and explicit review policy.
- CI run `41007821731` compiled TypeScript and built the offline single-file HTML, then exposed two test expectation issues: legacy `history.test` checked automatic expiry on the *raw manual importer*, and new manual test incorrectly expected five rather than six unanswered questions. The assertions were **corrected against actual contracts**. No engine validation was weakened to satisfy tests.
- Subsequent runs are automatically cancelled when superseded by new commits. **Latest final CI run/result must be inspected and recorded here before VERIFICATION.** Do not claim Pass 17 complete from a queued workflow.
- Additional device, AT, visual/layout and full release QA remain Pass 23 gates, not claims made by Pass 17.

**Pass 18 handoff:** session now has an explicit `section-expired` status for manual transitions; any new per-section wall-time archival records in F01 must not count frozen waiting intervals. Whole-paper locked forward moves and automatic expiry must preserve honest total elapsed time. When changing session schemas or recording duration, validate historical records without inventing missing section clocks; preserve automatic CGL status handling. Do not conflate this Pass 17 result-view policy with Pass 21 review-label UX.

### Per-pass worklog template — copy beneath this section at pass start

```text
PASS NN | start HEAD | date | scope IDs | status OPEN
AUDIT: baseline/user task; current source; consumers; adjacent risks; verified evidence.
ANALYZE: alternatives; chosen reusable design; invariants; persistence/UX; reason better than v11.
IMPLEMENT: changed files; commits; schema/compatibility notes; intentionally deferred pieces.
OBJECTIVES: [ID → OPEN / IMPLEMENTED–QA PENDING / VERIFIED / BLOCKED / ACCEPTED DIFFERENCE + evidence] for every assigned ID.
TARGETED QA: exact NEW test cases; command/output; adjacent regression checks; CI state if verified.
HANDOFF: finish HEAD; unresolved risks; changes requiring next pass; external/manual gates.
```
