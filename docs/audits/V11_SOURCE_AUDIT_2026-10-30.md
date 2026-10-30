# Independent V11 → Overhaul source audit — 30 October 2026

**Verdict: NOT A STRICT FEATURE SUPERSET. FULL PARITY NOT APPROVED.**

- Baseline source branch: `baseline/v11` at `e661822d865927e89a837790c1c6bc1cfc2562a6`.
- Target inspected: `overhaul` at `ccb07a249ada45cfb054e911041ae7ee7a2cde57` (documentation-only edits after `d4c36f9286059af970be342a7a894415517087aa`; no app-source modifications during this audit).
- Method: **new manual code inspection** of baseline `src/app/legacy.ts`, baseline CSS/template, the source-paper tree, and present implementation across `src/app/`, `src/domain/`, `src/engine/`, `src/history/`, `src/learning/`, `src/content/`, CSS, and template. The existing pass-specific QA assertions, acceptance writeups and screenshots were deliberately **not used as proof**. This is a code-to-code semantic audit, not a fresh physical device/runtime usability trial. No fixture success or old audit's DONE flag is counted.
- **Set-theoretic acceptance:** Let V be the set of material v11 user-visible capabilities and O those of overhaul. Require every element in V to have the same or a demonstrably better functional counterpart in O (explicit approved, safer behavior may be a qualified exception), **plus** preserve timing/data/safety semantics. Adding generic features does not compensate for V\O. Strict V ⊆ O is **not established**. This report deliberately keeps both positive and negative results.
- Priority: P0 critical irreversible user loss/key exposure; P1 significant functional/behavioral/UI gap or inconsistent imported rules; P2 presentation, feedback, accessibility, or lower-risk workflow difference; P3 cleanup/polish. **Open findings are source-supported, not claims of user reproduction.**

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

`src/history/backup.ts` v3 SHA-256 additive import, `src/history/frozen.ts` immutable paper/key/media, `src/history/concurrency.ts` optimistic revisions are safer. However, v11 backup v1 direct restore and old saved record migration are not supported by current code. This is an **approved deliberate product boundary**, not a silently passed element of a mathematically literal “superset of every old behavior.” Clarify the acceptance exception rather than claim exact inclusion.

## E. Cross-layer source observations (not full regression determinations)

1. **Data model:** clear improvement over monolithic `legacy.ts`: branded IDs, independently hashed revisions, media and stimuli, per-question marking override, 6 kinds, generic original/review references and separate manual grading.
2. **Persistence:** IndexedDB optimistic concurrency and all-record v3 checksum backup significantly exceed v11's simplistic in-place history update, but true crash/multi-device durability remains beyond source inspection. `generic-ui.ts` remains a large (~1,462-line) combined UI/storage/controller with `innerHTML` rerenders; modularity is improved overall, not uniformly.
3. **Timing:** monotonic source + frozen wall clock restore is stronger, yet elapsed wall time/foreground exposure/section-specific timers are not completely interchangeable. See F01/F09 and G02.
4. **UI:** labeled Display trigger, native controls, responsive CSS, semantic tabs/landmarks and scoped announcement are good changes; source cannot establish a visually superior experience without manual inspection.
5. **Security:** text/HTML are generally escaped before `innerHTML`; embedded image media is validated and self-contained, and source URLs are validated as HTTP(S). A separate security review would still be needed for hostile oversized/exotic imports and runtime storage exhaustion.
6. **Learning:** v11 had no corresponding notebook/FSRS pathway; overhaul adds real functionality. Treat this as **O\V**, not as evidence that F01–F13 disappear.
7. **No fixture reliance:** previous Passes 11–16 reports may be useful as historical rationale but were intentionally not accepted as independent audit proof; this audit's source observations are new and sometimes contradict their complete-parity language.

## F. Repair and release gate — explicit order

**Stage 1 (parity):** F01 sectional wall time; F02 selected paper scoring/audit preflight; F03 marks-based cross-paper priorities; F04 denominator; F13 safe deletion; F07 image labels; F09 clock/attempt-rate; F11 keyboard radio behavior. Preserve v11 semantics or record an approved better replacement.

**Stage 2 (generic core):** G01/G02 unsupported navigation and transition modes, G03 over-maximum unanswered scoring, G04/G05 impossible answer keys; G06 policy semantics. These are correctness concerns and should be addressed before claiming generic examiner reliability.

**Stage 3 (polish/reliability):** F05/F06/F08/F10/F12 and G07–G09; test focus/layout and performance without relying solely on old fixture expectations.

**Stage 4 (independent retest):** A separate source-code comparison with the frozen baseline **after corrections**, targeted new adversarial tests derived from each finding, then fresh browser/manual inspection. Do not close findings by editing documents or loosening assertions. Real Safari/Android/iOS, assistive-technology, OS kill/storage pressure and human visual judgement remain distinct manual gates.

**Final decision:** Current overhaul is substantially more general and architecturally disciplined and preserves much of the v11 experience, but **there are material lost/changed v11 behaviors and valid imported contracts the engine doesn't honor**. It is **not yet demonstrably V11 ⊆ Overhaul**. No release merge or unconditional feature-parity signoff.
