# Current architecture — Practice Desk `overhaul`

**Pass25 Library reflow (30 Oct 2026):** `generic-ui.ts:listHTML` now prioritizes paper, edition, CGL practice modes and Start in `home-grid` ahead of `home-stats` (preserved below utilities), with a non-duplicated screen-reader H2 and desktop-only home selectors in `app.css`. The freeze-safe `examPreflight`, imported generic paper picker, ongoing attempts, learning and backup actions retain their code paths and IDs. [Independent old-v-new real-browser geometry](https://github.com/oneshubhamt/practice-desk/actions/runs/41105425460) shows Start y551 vs v11 y702 at 1366x768; only **L01 closed**. Exam/History/Results visual density fixes L02–L11 and Pass29 independent visual signoff remain open.

**Scope:** current source/runtime map. Pass 23 independently verified representative v11/current parity through actual paired `file://` browser scoring and CI, but **physical-device/AT/human release gates remain open**. Read [final independent Pass 23 report](../audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) before any release decision; the [original findings and worklog](../audits/V11_SOURCE_AUDIT_2026-10-30.md) and [Passes 4–16 history](../history/PASSES_04_16.md) remain preserved.

## 1. Topology

```text
src/content/*.json (published, independent patches, post-test solutions)
       │  validateContent (build) + importCglBank
       ▼
ExamPackage ── validateExamPackage ─── imported JSON
       │                │
       ▼                ▼
PaperRevision, AnswerKeyRevision, QuestionRevision, stimuli/media
       │    ids and immutable content hashes
       ▼
startGenericAttempt → freezeAttempt (paper/key/media/questions/mode)
       │
       ▼
SessionState ── SessionEvent transition, checkpoint, rebase/restore
       │
       ├── response validation → frozen scoreAttempt
       │     ├── scoreableMaximum / section evidence
       │     └── manual written self-assessment (separately labeled)
       │
       ├── frozen source-key/reference provenance
       │
       └── optimistic persisted RecordItem (IndexedDB / localStorage fallback)
                  │
                  ├── SHA-256 backup v3 (all records, optional preferences)
                  ├── history/review/results UI
                  └── LearningCard/FSRS → notebook revision ExamPackage
```

## 2. Source modules

| Layer | Files | Responsibility |
|---|---|---|
| Build/entry | `scripts/build.mjs`, `src/template.html`, `src/app/bootstrap.ts` | One script/style/content-embedded file, appearance, global events |
| CGL+external import | `src/content/import-cgl.ts`, `validate.ts`, `src/app/exam-package.ts` | Immutable original/reviewed editions, six-kind package intake |
| Domain contracts | `src/domain/{ids,question,exam,answer-key,scoring,integrity,media,validate}.ts` | IDs, revisions, content hashes, answer and media validation |
| Session/scoring | `src/engine/{session,clock,response,scoring,score-ceiling,manual-grading}.ts` | Policy-driven timer/navigation/input and score |
| Source provenance | `src/engine/{source-comparison,review-source}.ts` | Original key and original question/media comparison after submit |
| Data/history | `src/history/{frozen,backup,concurrency,deletion-policy}.ts` | Immutable attempts, clock restoration, checked backup, optimistic writes |
| Learning | `src/learning/*.ts`, `src/app/learning-ui.ts` | Notebook, FSRS-7, honest analytics, revision exams |
| UI | `src/app/{exam-preflight,editorial-labels,response-drafts,generic-ui,history-page,history-priorities,history-score,result-presentation,history-metrics,preferences,practice-selection}.ts`, `src/template.html`, CSS | Executable-policy scoring/editorial preflight, source-aware help, sticky accessible Display/footer; library, history, exams, results and learning |

## 3. State lifecycle

- Start: validate selected package, derive CGL mode if relevant, freeze exact revision/key, initialize timer and first question visit; source comparison snapshot only for compatible paired reviewed editions.
- Edit: UI dispatches validated `ANSWER/CLEAR/FLAG/NAVIGATE/PAUSE/RESUME`; engine checkpoints time; new state/records optimistically saved.
- Finish: whole-paper or untimed sequential locks explicitly advance via `SUBMIT_SECTION` while maintaining total time. Pass 18 archives exact consumed timer duration and reason when closing each sequential/single section, without inventing such information for old or freely navigated multi-section attempts. Automatic sectional expiry advances; manual sectional expiry freezes a `section-expired` boundary until the candidate continues, with no waiting-time debit. Final submission/expiry produces an immutable score; editorially invalid/excluded questions are omitted and written answers remain separately pending.
- Restore: open frozen record, reconcile wall-time away from the page, avoid attributing hidden time to a question, and surface results if expired. All history computation derives from saved frozen evidence.
- Persistence: `saveRevision` checked on record updates, loaded IndexedDB first; localStorage fallback is separately version-guarded; uncommitted recovery exports are labelled. Completed-result Delete and double-confirmed unfinished-test Discard use distinct lifecycle/status guards, rechecked inside transactions; a deleted attempt's recovery mirror is cleared. Downloaded backups are checksum-covered and additive.
- Reuse: stored question revision enters a LearningCard; FSRS rating is explicit feedback, not a rescoring of mock answer accuracy; revision exam is a fresh untimed custom paper with provenance and its own +1/0 rules.

## 4. Engineering quality and known boundaries

- **Strengths over v11:** no monolithic untyped scoring engine, exact frozen exam definitions, generic six-kind input, typed rule/response model, source revisions, content and backup integrity, checked concurrency, separately attributable learning evidence.
- **Debt:** `src/app/generic-ui.ts` still combines storage, routing, event handling and HTML construction in a large module. Pass 22 eliminated unnecessary hidden result-pane content and verified real DOM-size reductions; further source modularisation and real-device latency profiling remain open to the independent Pass 23 audit, not assumed from code size.
- **Pass 17 generic policy closure (targeted-source QA verified):** sequentially locked whole-paper/untimed sections can advance, manual sectional expiry freezes correctly, conflicting sectional/free navigation is rejected, unanswered rewards are bounded by full credit, multiple-selection/matching keys match candidate constraints, and post-test `allowReview` disclosure is enforced. An explicit conservative score lower bound is shown. The detailed QA record is in [the active audit scratchpad](../audits/V11_SOURCE_AUDIT_2026-10-30.md#pass-17--implementation-verification-and-handoff-30-october-2026). **Other v11 behavior/UI issues remain open; do not imply whole-app parity.**
- **Pass 18 source and focused CI verified:** accurate frozen section clocks, overall timer/attempt-rate/median, and protected deletion; see the [audit scratchpad](../audits/V11_SOURCE_AUDIT_2026-10-30.md) and [successful CI run](https://github.com/oneshubhamt/practice-desk/actions/runs/41018428835). Full v11 UX parity remains unapproved.\n- **Pass 19 focused QA verified:** frozen earned/eligible denominators in archive/recent completed cards, up to eight comparable cross-paper full-paper marks priorities alongside accuracy, and independent multi-resume access for up to five pending items plus a filtered View all route. Comparability is explicitly by exam/edition/mode/section blueprint/grading and normalized sectional budgets, **not** difficulty-adjusted ability. See [active audit scratchpad](../audits/V11_SOURCE_AUDIT_2026-10-30.md) and [successful CI 41022109906](https://github.com/oneshubhamt/practice-desk/actions/runs/41022109906). Full v11 UI and device parity remain unapproved.\n- **Pass 20 focused QA verified:** `exam-preflight.ts` computes the *selected configured* exam's eligible automated ceiling and scoring/edition/status policy, with independently reviewed built-in SSC provenance and author-supplied external labels. Detailed timing/navigation/help and non-affiliation footer are visible without exposing keys. A sticky header/compact immersive Display access and bounded popover at 195–1280 CSS px pass new Chromium and existing Pass 15 visual QA, along with Firefox/WebKit matrix. See [scratchpad](../audits/V11_SOURCE_AUDIT_2026-10-30.md) and [CI run 41025829416](https://github.com/oneshubhamt/practice-desk/actions/runs/41025829416). Physical-device/screen reader/manual parity still require Pass 23.\n- **Pass 21 source and focused QA verified:** All built-in question/option image assets carry frozen contextual alt text; imported semantic alt text is preserved with contextual fallback. Post-test descriptive editorial labels distinguish caution from recorded correction and avoid falsely certifying imported/source keys. Paused candidates can mark the current question without changing answers, clock, navigation or completion; radio arrows operate natively when focused and Alt+arrows handle question navigation. See [active audit](../audits/V11_SOURCE_AUDIT_2026-10-30.md) and [successful CI 41037995399](https://github.com/oneshubhamt/practice-desk/actions/runs/41037995399). F12/G07/G08 and independent hardware/AT Pass 23 remain open.\n- **Pass 22 targeted implementation and measured QA verified:** incomplete multiple-select selections render as clearly unscored, in-tab drafts and clear any outdated committed answer; duplicate matching targets annotate every affected native select with accessible conflict text and prevent saving until corrected. Results render the selected pane only while preserving ARIA tabpanel references and the frozen scoring/review/ledger contracts. A direct headless Chromium 100-Q comparison against Pass 21 measured Overview DOM 4,337→246, Review 4,337→2,892 and Timing 4,337→1,231 nodes; timing differences varied by tab and are not guaranteed device speed. All three jobs in [CI 41044460765](https://github.com/oneshubhamt/practice-desk/actions/runs/41044460765) passed. See [source audit](../audits/V11_SOURCE_AUDIT_2026-10-30.md); Pass 23 remains a separate independent release gate.\n- **Pass 23 independent automated engineering recheck:** Actual frozen v11/current HTML successfully completed 12 paired browser flows across six CGL scenarios, with six numeric equalities for earned/eligible marks, source exclusion/reviewed Q62 caution, History/review/policy checks; independent Node tests verify all ten CGL edition schemas, original SHA-verified content, generic rule admission/rejection and backup invariants. Five responsive widths (195–1280 CSS px) showed no overflow in tested Library scenes. All Node24/Chromium/Firefox/WebKit jobs passed [CI 41057021116](https://github.com/oneshubhamt/practice-desk/actions/runs/41057021116). See [final report](../audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) and distinguish *conditional engineering candidate* from unverified real-device/AT/human approval.\n- **Offline:** no live network calls, local browser storage is best-effort, one self-contained HTML; appearance and local selection stored by browser.

## 5. Non-inferences

Source architecture does not prove iOS/Safari storage correctness, actual keyboard/screen reader speech, touch reachability, OS-kill recovery, content authoring accuracy or human superiority of aesthetics. Keep these separate from automated build evidence.
