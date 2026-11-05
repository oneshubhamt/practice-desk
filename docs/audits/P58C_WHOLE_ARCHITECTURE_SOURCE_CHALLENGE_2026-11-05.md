# P58-C — Independent source and maximum-bound acceptance audit (5 November 2026)

**Authority:** User explicitly approved P58-C under the [12-finding whole-source re-audit](WHOLE_ARCHITECTURE_SOURCE_REAUDIT_2026-11-05.md) and [five-step engineering programme](../ENGINEERING_PROGRAMME.md). **Initial `overhaul` SHA `665927212a498066a9db668ad9e7bece6935fcb6`.** This is an independently reopened software/requirements challenge after [P58-B's exact-source CI 42053356625](https://github.com/oneshubhamt/practice-desk/actions/runs/42053356625), **not a historical 5/5 CI substitution**. P58-C cannot certify physical devices, source authenticity, user visual acceptance, release, or merge. Do not edit `main` or `baseline/v11`.

## 1. Method and actual source reinspection

Inspected at the current `overhaul` branch, using the GitHub file contents and source identifiers rather than solely past result labels:

- Requirements: this source re-audit (all F01–F12), `docs/audits/P48_REQUIREMENT_BY_REQUIREMENT_SOURCE_REAUDIT_2026-11-03.md` (original 28 sections, I01–I26, F01–F15, G01–G10, L01–L11, F29, TS01–TS15, QB01–QB14, DOC01–DOC10), `P56_INDEPENDENT_INTEGRATION_SOURCE_AUDIT_2026-11-05.md`, `docs/architecture/P57_AI_FIRST_QUESTION_BANK_PIPELINE_PLAN.md` and `QUESTION_BANK_AUTHORING.md`, `docs/ENGINEERING_PROGRAMME.md`, `AGENTS.md`, `CURRENT_ARCHITECTURE.md`, `DATA_CONTRACTS.md`, `POLICY_REGISTER.md`, both README entrypoints and actual current CI.
- Exam and SHA ownership: `src/domain/{exam,question,validate,integrity,media,rich-document,answer-key}.ts`, `src/engine/{session,scoring,clock,source-comparison,response,manual-grading,score-ceiling}.ts`.
- Storage and evidence: `src/history/{backup,frozen,shared-store,concurrency}.ts`, `src/app/{persistence-controller,stored-record-validator,record-cursor-reader,history-page}.ts`.
- Views/controller composition: `src/app/{generic-ui,library-controller,exam-controller,result-controller,learning-ui,screen-renderer,exam-dom-reconcile,route-controller,navigation,exam-families,practice-selection,practice-compose,exam-shortcuts,exam-preflight,image-viewer,image-preparation,katex-math-adapter}.ts`.
- Learning: `src/learning/{learning,revision-selection,revision-test,syllabus-taxonomy,question-analytics}.ts`.
- Editorial and distribution: `src/authoring/{authoring-staging,authoring-studio,authoring-draft,authoring-publisher,external-bank,external-bank-qa,authoring-exchange,vendor-ports}.ts`; `src/app/bank-import.ts`, `src/content/import-cgl.ts`, `src/template.html`, `src/styles/app.css`, `scripts/build.mjs`, `scripts/browser/fixtures.mjs`, `scripts/acceptance-p58a-integrity.mjs`, `scripts/acceptance-p58b-editorial.mjs` and `.github/workflows/ci.yml`.
- Test work introduced **before** any potential P58-C application fix: `scripts/p58c-synthetic-fixture.mjs`, `tests/p58c-independent-scale.test.mjs`, `scripts/acceptance-p58c-scale.mjs` in all three engines. The fixture explicitly labels each question synthetic and unverified; it is **not** an APFC PYQ bank or a scored practice feature shipped to users.

**Verification hierarchy:** A module and function being present is SOURCE evidence, not sufficient runtime evidence. New tests measure the full `file://` path at 8 files/400 questions and 200 edited/published, with actual frozen score and 195px/140% screenshots; failure/retries must be explained. Real user device and assistive technology are outside Linux Playwright and cannot be invented.

## 2. Original October architecture — every one of the 28 sections

| § | Specific objective / actual owner found | Independent disposition, subject to final full gate |
|---|---|---|
| 1 | Executive product assessment | Historical rationale, not a runtime capability; **SOURCE RECONCILED** |
| 2 | Source/reliability audit scope | Direct inspections and adversarial CI here; **AUDIT REOPENED** |
| 3 | SSC-independent exam core | `domain/exam.ts`, `validate.ts`, `engine/scoring.ts`; six kinds, **SOURCE PRESENT** |
| 4 | Formal state transitions | `engine/session.ts` exported `startSession/transition`; **SOURCE PRESENT** |
| 5 | Section/whole clock | `engine/clock.ts`, `session.ts`, `history/frozen.ts`; actual recorded time only |
| 6 | Marking and publisher comparison | `scoring.ts`, `score-ceiling.ts`, `source-comparison.ts`; conservative exact-context comparison, not approximate official rank |
| 7 | Immutable revision keys/content | `domain/integrity.ts` canonical hashes, `history/frozen.ts`; integrity ≠ official authentication |
| 8 | Source vs reviewed editorial truth | `content/import-cgl.ts`, `editorial-labels.ts`, `authoring-publisher.ts`; disputed CGL Q62 preserved; AI claims remain caution |
| 9 | IndexedDB structure | `history/shared-store.ts` two-store content/attempt design; source identity shared once; metadata paging remains a **CONDITIONAL, not completed feature** |
| 10 | Safe recovery and portability | `record-cursor-reader.ts` atomic cursor collection, `persistence-controller.ts`, `history/backup.ts` v4; physical OS eviction **UNTESTED**; Wordgard/staging exported separately |
| 11 | Question source/attempt/learning separation | Distinct `domain`, `history`, `learning` and package contracts |
| 12 | More response types | `domain/question.ts` six kinds, `engine/response.ts`, `manual-grading.ts`; dedicated survey **DEFERRED** |
| 13 | Exam/paper/edition hierarchy | `exam-families.ts`, `library-controller.ts`; imported content not official by default |
| 14 | Per-family exam setup | `practice-selection.ts` single `setups.v2` model, source-scoped rules |
| 15 | Reliable attempt analytics | `result-controller.ts`, `question-analytics.ts`, `history-page.ts`; only measured time |
| 16 | Immediate, source-topic and historical learning | `learning.ts`, `question-analytics.ts`, History; no invented skill inference |
| 17 | Evidence-rich aggregates | `score-ceiling.ts`, `revision-selection.ts`, priority code; no invented difficulty normalization/rank |
| 18 | Revision/notebook quiz | `revision-selection.ts`, `revision-test.ts`; independently frozen selection and scored revision |
| 19 | Prior UI conveniences | `library-controller.ts`, `exam-view.ts`, `screen-renderer.ts`; v11 screenshot pixel parity intentionally **NOT REQUIRED** |
| 20 | Library/History/Results usability | `history-page.ts`, `result-controller.ts`, `learning-ui.ts`, CSS; current browser checks only, **HUMAN UX HOLD** |
| 21 | Payload/media/performance | `scripts/build.mjs`, `media.ts`, `image-viewer.ts`, image preparation; source build reproducible; real-device memory **UNTESTED** |
| 22 | Import security / privacy | `validate.ts`, `rich-document.ts`, `media.ts`; `scripts/build.mjs` actually **injects hashed executable CSP** into the template's `PD:CSP` marker (the source-only old template claim was stale) |
| 23 | Regression test engineering | Node property/source contracts + actual `file://` Chromium/Firefox/WebKit CI; systematic WCAG/AT **NOT DONE** |
| 24 | Separation of application layers | Typed `generic-ui.ts` composition, route/persistence/views and independent engines; whole-root UI redraw remains, not a VDOM rewrite |
| 25 | Generic exam example | Template/importer exists; **no independently verified full APFC/CAT/UPSC/RBI content banks** |
| 26 | Sequential upgrade method | P41–P58 in the single engineering programme; archived earlier claims not retroactively certified |
| 27 | Retain/refine/remove choices | CGL, early-results/persistent Aa, score and source provenance preserved; no redundant migration |
| 28 | Local-first product boundary | Self-contained `file://` HTML with no cloud/PWA/network dependencies; hosted/sync **DEFERRED** |

## 3. Original I/F/G/L/TS/QB/DOC corrective registers — source-aware reconciliation

These are **independently sampled current source owners** and the [itemized historical register](P48_REQUIREMENT_BY_REQUIREMENT_SOURCE_REAUDIT_2026-11-03.md), not newly invented pass/fail results. All prior supported behaviours remain subject to current CI on exact source.

| Register / covered IDs | Source-level check and **actual** boundary |
|---|---|
| **I01–I07** | Original options/key compare requires exact semantics; CGL Q62 original excluded and reviewed caution remains; pinned build, families, presets, seeded practice and evidence-based revision functions present. Source `source-comparison.ts`, `import-cgl.ts`, `exam-families.ts`, `practice-selection.ts`, `practice-compose.ts`, `revision-selection.ts`. |
| **I08–I12** | Actual `record-cursor-reader.ts` uses cursor transactions, **not** the earlier audit's pre-P48 `getAll()` description; still retains full records for some views/exports, no universal paging. CAS, strict backup and bounded recovery are present, not proof against eviction. APFC nine headings are flat with authored topic/subtopic, not a complete official nested taxonomy; Mac Safari remains external. Session timing evidence is preserved, never inferred. |
| **I13–I17** | History filtering, local images/focus/zoom, safe rich AST/KaTeX/Wordgard, `exam-shortcuts.ts` **does implement user remapping** (earlier old-audit unsupported status is superseded), and typed coordinator modules exist. Screen root still redrawn on some transitions; Learning keyed editing is scoped. |
| **I18–I26** | Per-question-calendar deadline, dedicated survey, PWA/cloud and rank prediction intentionally deferred (I18/I19/I24). I20 physical AT/device **NOT TESTED**. I21 factual content banks **NOT SUPPLIED**. I22 CSP is generated by `scripts/build.mjs`, while no third-party independent security audit is claimed. I23 a five-store/event model remains intentionally unimplemented; I25 one engine is present; I26 imported non-affiliation preflight remains. |
| **F01–F05** | Actual sectional timer evidence, preflight marks, compatible-cohort aggregate, frozen score and separated pending/completed source paths present in `session`, `exam-preflight`, History, Library. |
| **F06–F10** | Honest rules, authored-alt, corrected-vs-caution, foreground timing and paused flag supported; `import-cgl.ts` change-field calculation is based on actual changed source fields. |
| **F11–F15** | `exam-shortcuts/lifecycle-controller` native radio priority, lazy result view, deletion version guard, floating Aa and non-affiliation footer present. Physical AT remains untested. |
| **G01–G05** | Section/whole-paper transitions and explicit expiry, score bounds, multi-select key constraints, matching unique endpoints in `engine/session`, `domain/validate`. |
| **G06–G10** | Optional withheld review, unsaved choice drafts, matching conflict correction, clamped component score/eligible ceiling and accepted no-v11-migration policy. Remaining legacy source-key format reader is not a new required migration. |
| **L01–L06** | Library task-first start, exam Next/Flag, scrollable passage, contained local images, History rows-first and Result section marks; current CSS/actual browser verification required for pixel/layout assertions. |
| **L07–L11 / F29-01–03** | Adaptive Aa/theme, true key-correction badge, appropriate whole-paper timer, human-friendly modes, stable Result H1 and keyed reopen; narrow History/Learning requires actual geometry, not a status copied from historical docs. |
| **TS01–TS05** | Source-independent capability suites, independent scorer/model policies, NAT bounds, stale-tab/frozen backup adversaries and bounded hostile imports exist; P58-C adds a larger new synthetic challenge. |
| **TS06–TS10** | Consolidated topic/learning suites and one shared browser fixture; pixel-parity tests retired, actual three engines retained. **No comprehensive automated WCAG/real screen-reader gate** (TS10) — HOLD. |
| **TS11–TS15** | Explicit CI permission/gated publisher, diagnostic benchmarks without false speed thresholds, AGENTS/docs synchronization, archived test retirement mapping and pinned deterministic dependencies. An intermittent resilience check is a test quality issue requiring reproducible robust handling, not permission to skip CAS protection. |
| **QB01–QB05** | Simple-v1, true six-kind, embedded Wordgard, canonical rich AST, local mathematical accessible text; outside math speech quality still AT HOLD. |
| **QB06–QB10** | Strict media hash/alt/image preparation, figure/passage editor/preview, explicit validated immutable Publish, distinct source/reviewed and no pre-submit solution disclosure. This is author-attributed, not officially verified content. |
| **QB11–QB14** | Opt-in separate validated Wordgard draft-shelf/staged-source backup + exact draft exchange now exist after P58-B; advanced section/partial rules exist; arbitrary PDF/DOCX/OCR parsing intentionally absent; vendor source isolated and deployment is pruned/inlined. |
| **DOC01–DOC04** | Engineering programme active; archived reports immutable history; CGL/Q62 labelled honestly; current suite counts derive from current exact-source CI, not stale 238/274/350 values. |
| **DOC05–DOC08** | Wordgard guide and current architecture need current-first headers, unkeyed SHA must never be called official source authentication, real-device/manual signoff stays HOLD. |
| **DOC09–DOC10** | No old installed-user migration, v4 strict backup, deliberate separate unpublished archives; CSP is generated at build (not absent), remaining comprehensive threat model/AT external validation not claimed. |

## 4. P58-C F01–F12 closure/reopening register

| Finding | Current evidence and disposition |
|---|---|
| F01/F02/F07 | P58-A red-first source/regular-save/cross-tab safeguards, prior full three-engine CI, retained for P58-C **NEW** full regression; localStorage best-effort stamp not atomic distributed CAS. |
| F03/F04/F05 | P58-B editor source fields, exact lossless draft exchange, CLI and repeatable non-destructive handoff. Original AI input v1 intentionally narrower; edits must use versioned draft exchange. |
| F06/F08/F09 | Bounded duplicate report now reveals 500 cap/inspected coverage; bank-scoped media IDs rewritten; per-item source/QA/triage displays author claims, never authenticated signoff. |
| **F10** | **AUTOMATED VERIFIED — [exact-source CI 42063617352](https://github.com/oneshubhamt/practice-desk/actions/runs/42063617352)**: 8×50 = 400 *fictional* mixed six-kind AI source questions; 200 selected; full 500 duplicate candidate disclosure with incomplete-pairs counter; source QA and stage archive; two-tab stale-stage warning; true 200-item Wordgard **second-answer B→D correction**, durable shelf/archive, exact draft exchange and fresh browser reimport; immutable 200-item publisher and true scored attempt; 195px/140% staging, Wordgard, Library, Exam, Results and Learning across actual offline Chromium, Firefox and WebKit. **362/362 Node and all browser suites passed.** Visual checks show no horizontal document overflow, but awkward midword wrapping at 195px remains. Only runner-observed, not physical-device, performance. |
| **F11** | **SOURCE/DOC SYNCHRONIZATION CLOSED FOR CURRENT AUTHORITATIVE HEADERS:** top sections in `AGENTS.md`, root/docs READMEs, engineering programme, current architecture, data contracts, authoring guide, current QA, P57 proposal and active decisions now distinguish [P58-C 5/5 verified software](https://github.com/oneshubhamt/practice-desk/actions/runs/42063617352) from older dated unapproved/P57-only paragraphs. This new independent audit provides the active exhaustive source crosswalk; historic CI runs and unresolved physical/factual/release gates remain honestly labelled, not retroactively rewritten. |
| F12 | P58-B chose strict separately exportable/importable unpublished source and shelf archives, not History v4 changes. Import rejects malformed/oversize; no silent overwrite or auto-merge. |

## 5. Exact-source final QA, visual evidence and release gates

**P58-C software QA verdict: 5/5 SUCCESS.** [Full CI 42063617352](https://github.com/oneshubhamt/practice-desk/actions/runs/42063617352) tested source **`438cd409a92186d6dcbe6f442e6b63c362b2452d`**, strict TypeScript, **362/362 Node**, all complete retained and new `file://` Chromium + Firefox + WebKit tests and deterministic guarded HTML-only publishing. Resulting generated HTML SHA-256 **`b69a0796d58391342ae9776cba282373036e1a0e96ecd1a8643940cb8fdd953b`**, publication commit **`a5df3e0f922fbf495177f5db236e6c489aced6f0`**; GitHub commit comparison proves only `Practice_Desk_Offline_Mock_Tests.html` changed between tested source and publisher. Original starting HEAD was `665927212a498066a9db668ad9e7bece6935fcb6`; targeted P58-C product change was limited to `src/styles/app.css` mobile intrinsic-width reflow; no CGL/Q62 content, vendor, scorer, frozen History/v4 backup/FSRS, DB or security boundary modification.

**Red-first proof and incident accounting.** [Red run 42058933465](https://github.com/oneshubhamt/practice-desk/actions/runs/42058933465) reproduced **203px** document width at 195px/140% in Chromium and Firefox after successful 8/400 staging/200-publish. [Later layout geometry 42060935232](https://github.com/oneshubhamt/practice-desk/actions/runs/42060935232) identified the unshrinkable 155px Recent H2 in a 99px Library flex row; the scoped CSS now permits wrapping and fixes analogous Learning heading. Initial script's Playwright `uncheck()` error on a correctly restored stale checkbox was corrected to `click()` and *not* called a product bug. A pre-existing Chromium CAS resilience test had an overly narrow expected warning when Tab A had already synchronized with Tab B's answer; it now distinguishes safe synchronized state from a genuine stale attempt that must fail by CAS. [Run 42061691640](https://github.com/oneshubhamt/practice-desk/actions/runs/42061691640) was canceled after Chromium/WebKit/Node passed because Firefox did not finish Playwright dependency installation; **not counted** as Firefox or 5/5 evidence. The later full [42063617352](https://github.com/oneshubhamt/practice-desk/actions/runs/42063617352) resolved all five gates.

**Actually inspected browser screenshots and runner observations.** Downloaded CI evidence zips `p58c-scale-{chromium,firefox,webkit}` from the exact successful run and visually inspected 195×844 viewport captures of staging/Wordgard/Library/Exam/Results/Learning. Programmatic document-scroll overflow assertions passed in all three. Selected-paper content, 200-question selector, source QA warning and main navigation remain present. **Several headings/buttons break midword and look cramped at this intentionally extreme 195px and in-app 140% scale; screenshot viewport positions differ by browser.** This is a *documented cosmetic/usability caveat*, **not** human design approval or a real phone test. The real-browser tests also verify Tab, selection/focus, auto-saved correction, source exchange and score/freeze. Observed CI-runner times (milliseconds, *not* user-device estimates, SLA or comparative benchmark):

| Browser engine | 8-file/400-stage | 200-question handoff | 200-question publish |
| --- | ---: | ---: | ---: |
| Chromium | 1,005 | 700 | 332 |
| Firefox | 1,257 | 1,200 | 532 |
| WebKit on Linux | 1,521 | 1,758 | 669 |

**External/product HOLD — never inferred from software green:** real user-owned macOS Safari from Finder under `file://`, Back/Forward/reload and browser Origin persistence; real Android/iOS touch/zoom; VoiceOver/NVDA/TalkBack and spoken TeX; native hardware IME and keyboard; actual OS kill/eviction/quota/reboot and tested disaster recovery; external authentication of every official PYQ/statute/source/reviewer claim for any deployed new bank; end-user visual signoff, distribution and merge. Unpublished drafts/staging require explicit *separate* archives, not History backup v4. The contents here are synthetic fixtures, not complete verified APFC/CAT/UPSC/RBI question banks. Deliberately optional PWA/cloud, survey, extra storage normalization, all-history paging and exact distributed localStorage CAS remain deferred/conditional rather than being falsely marked implemented.

**Independent software conclusion:** All explicitly authorized P58-A, P58-B and P58-C **automated source/contract/CI gates are closed**. The broader conceptual architecture is source-present with the documented intentional deferrals and device/content/human-release HOLD gates; the earlier historical statement “P57-C and P58 incomplete” is superseded for this bounded software scope only.

## 6. One-to-one original requirement register — independent current-source disposition

This is the *itemized* owner/disposition check behind §3's grouped summary. It does not turn a particular source function's existence into a real-device or exhaustive behavioral certification. For each old requirement, source ownership was re-read against the current module or current built-gate code rather than accepting the old P48 completion field; the complete [CI 42063617352](https://github.com/oneshubhamt/practice-desk/actions/runs/42063617352) then exercised the retained automated journeys. **PRESENT** means current implementation source and relevant regression exist, not proof of factual content accuracy; **CONDITIONAL/EXTERNAL/DEFERRED** are real limitations, not quietly dismissed gaps.

### I01–I26 — source, data and core product architecture

| ID | Rechecked current source owner / actual target | Independent current status and qualification |
| --- | --- | --- |
| I01 | engine/source-comparison.ts, domain/integrity.ts | **PRESENT:** compare original/reviewed key only on exact immutable displayed context; letter-only matching is not sufficient |
| I02 | content/import-cgl.ts, content/papers.json/patches.json, scoring.ts | **PRESENT:** five original/five reviewed, 6 Oct Q62 original invalid and reviewed caution; no key rewrite |
| I03 | package-lock.json, scripts/build.mjs, CI core/publisher | **PRESENT:** pinned Node dependencies, reproducible HTML/CSP SHA, guarded publish with drift rejection |
| I04 | app/exam-families.ts, library-controller.ts | **PRESENT:** true exam-family/paper/edition selection, custom import not official by default |
| I05 | app/practice-selection.ts, history/backup.ts | **PRESENT:** one family-scoped setups.v2 preference, current v4 backup preservation |
| I06 | app/practice-compose.ts | **PRESENT:** deterministic eligible subset from one frozen source paper and real authored tags |
| I07 | learning/revision-selection.ts, revision-test.ts | **PRESENT:** evidence-based wrong/blank/slow/flagged/due review and distinct frozen revision result |
| I08 | app/record-cursor-reader.ts, history/shared-store.ts | **PARTIAL / conditional:** atomic cursor reads and shared immutable snapshot compression; not full lazy pagination or proof of low peak memory |
| I09 | app/persistence-controller.ts, history/backup.ts, stored-record-validator.ts | **PRESENT within local contract; EXTERNAL recovery limit:** atomic CAS, strict v4 import and quarantine; true OS eviction cannot be reconstructed |
| I10 | learning/syllabus-taxonomy.ts, learning.ts; authored subject/topic/subtopic | **PRESENT within defined scope:** APFC nine broad roots, explicit author/user hierarchy and root rollup; not a factually authenticated detailed syllabus taxonomy |
| I11 | app/navigation.ts, bootstrap.ts and browser fallback suites | **EXTERNAL:** Linux Playwright WebKit not actual macOS Safari/Finder Origin/back-forward persistence |
| I12 | engine/session.ts, learning/question-analytics.ts | **PRESENT:** recorded foreground visit/answer timing phases; unobserved time not invented |
| I13 | app/history-query.ts, history-controller.ts, history-page.ts | **PRESENT:** inclusive local-date and source/mode/status/search filter semantics |
| I14 | app/image-viewer.ts, image-preparation.ts, domain/media.ts | **PRESENT:** bounded local figure zoom/pan, preparation and alt; physical gesture/clarity still human gate |
| I15 | domain/rich-document.ts, authoring/vendor-ports.ts, wordgard-adapter.ts, app/katex-math-adapter.ts | **PRESENT:** canonical AST, isolated vendors, math linear alternatives; spoken math/IME quality EXTERNAL |
| I16 | app/exam-shortcuts.ts, lifecycle-controller.ts, template.html | **PRESENT and corrected versus old audit:** persisted configurable key remaps with native radio/editable priority |
| I17 | app/generic-ui.ts, coordinator-context.ts, screen-renderer.ts, exam-dom-reconcile.ts | **PARTIAL by design:** typed modular controllers and targeted keyed updates; whole-root replacement remains in some transitions, no global VDOM |
| I18 | domain/exam.ts | **DEFERRED optional:** untimed/whole-paper/sectional supported; no calendar/per-question deadlines |
| I19 | domain/question.ts and engine/scoring.ts | **DEFERRED optional:** six examination response types, not a separate unscored survey product |
| I20 | mobile layout/ARIA in CSS and view modules | **EXTERNAL:** actual Android/iOS, touch, AT, OS restart/storage loss not executed |
| I21 | content/papers.json, app/bank-import.ts, question-bank CLI | **CONTENT NOT DONE:** bundled CGL and synthetic APFC/NAT examples; verified full APFC/CAT/UPSC/RBI banks not supplied |
| I22 | scripts/build.mjs, domain/validate.ts, rich-document.ts, media.ts | **PRESENT bounded CSP/import controls, independent full threat-model OPEN:** build substitutes the CSP placeholder with exact runtime hash; untrusted boundaries remain limited, not certified against all attacks |
| I23 | history/shared-store.ts, record-cursor-reader.ts | **CONDITIONAL accepted design:** current two-store compact model, not proposed five-store/event/paged DB redesign |
| I24 | template.html, build.mjs | **DEFERRED:** offline standalone without PWA/cloud/rank telemetry; no implicit hosted-origin migration |
| I25 | domain/validate.ts and engine/session/scoring.ts; app/generic-ui.ts | **PRESENT engine; scoped UI coupling:** one six-kind engine and no debug time cheat; composition root still coordinates UI |
| I26 | app/exam-families.ts, exam-preflight.ts, template non-affiliation footer | **PRESENT:** truthful source/custom labelling and actual selected policy/score disclosure |

### F01–F15 and G01–G10 — earlier behavior/correctness defects

| ID | Current source owner | Independent disposition |
| --- | --- | --- |
| F01 | engine/session.ts, history/frozen.ts | **PRESENT:** recorded section clock consumption, not inferred missing events |
| F02 | app/exam-preflight.ts, engine/score-ceiling.ts | **PRESENT:** ceiling and editorial exclusions disclosed before test |
| F03 | app/history-priorities.ts, history-score.ts | **PRESENT:** source-compatible denominator/marks priorities, not fictitious difficulty normalization |
| F04 | app/history-page.ts, history-score.ts | **PRESENT:** frozen earned/eligible denominators |
| F05 | app/library-controller.ts | **PRESENT:** unfinished attempts shown separately from completed |
| F06 | app/exam-preflight.ts | **PRESENT:** timing, review, pause and score rules are from actual paper |
| F07 | app/exam-package.ts, question-content-view.ts | **PRESENT:** source/author figure context and validated alt; AT experience external |
| F08 | content/import-cgl.ts, editorial-labels.ts | **PRESENT:** key corrected only where actual source key differs; caution distinct |
| F09 | app/result-presentation.ts, learning/question-analytics.ts | **PRESENT:** evidence-backed pace and measured time, honest unavailability |
| F10 | engine/session.ts, app/exam-shortcuts.ts | **PRESENT:** flag during pause is permitted, scoring response changes not |
| F11 | app/lifecycle-controller.ts, exam-shortcuts.ts | **PRESENT:** native focused radio/navigation and edit-box keyboard priority |
| F12 | app/result-controller.ts | **PRESENT:** active Results pane lazy materialization |
| F13 | history/deletion-policy.ts, app/persistence-controller.ts | **PRESENT:** unfinished deletion confirmation and CAS protection |
| F14 | template.html, bootstrap.ts, styles/app.css | **PRESENT:** persistent floating Aa/display control; physical zoom still untested |
| F15 | template.html, exam-preflight.ts | **PRESENT:** independent educational/non-affiliation claims |
| G01 | engine/session.ts | **PRESENT:** sequential locked whole-paper section progression |
| G02 | engine/session.ts | **PRESENT:** manual sectional expiry keeps section locked until transition |
| G03 | domain/validate.ts | **PRESENT:** blank reward cannot exceed full correctness ceiling |
| G04 | domain/validate.ts, engine/response.ts | **PRESENT:** multiple-select key respects min/max selection |
| G05 | domain/validate.ts | **PRESENT:** matching key unique endpoints in fixed inventory |
| G06 | app/route-controller.ts, result-controller.ts | **PRESENT:** disabled review does not expose detailed post-test review in UI |
| G07 | app/exam-controller.ts | **PRESENT:** below-minimum multiple-select draft not silently committed |
| G08 | app/exam-controller.ts | **PRESENT:** duplicate matching right-hand values blocked/announced |
| G09 | engine/scoring.ts, score-ceiling.ts | **PRESENT:** component score clamp and conservative bounds |
| G10 | history/backup.ts, engine/source-comparison.ts | **ACCEPTED no installed-user migration:** current v4 only; retained historical comparison reader is a minor conditional seam |

### L01–L11 and F29-01–03 — layout and labeling

| ID | Current source owner | Independent disposition |
| --- | --- | --- |
| L01 | app/library-controller.ts, styles/app.css | **PRESENT software layout:** paper and Start prioritized; actual Mac fold requires human signoff |
| L02 | app/exam-view.ts, styles/app.css | **PRESENT:** compact exam controls, Next and review state |
| L03 | app/question-content-view.ts, styles/app.css | **PRESENT:** passage scroll region; small real devices untested |
| L04 | app/question-content-view.ts, image-viewer.ts | **PRESENT:** local figure controls/alt; physical perceptual clarity external |
| L05 | app/history-page.ts | **PRESENT:** saved rows before secondary charts |
| L06 | app/result-controller.ts | **PRESENT:** section marks/overview near top |
| L07 | template.html, styles/app.css, bootstrap.ts | **PRESENT:** light/dark and Aa line-wrap; 195px screenshots visually cramped |
| L08 | content/import-cgl.ts, editorial-labels.ts | **PRESENT:** actual changed-key badge only |
| L09 | app/exam-view.ts | **PRESENT:** whole-paper timer labelled whole-paper |
| L10 | app/exam-view.ts, exam-preflight.ts | **PRESENT:** friendly paper/practice labels |
| L11 | app/result-controller.ts | **PRESENT:** stable attempt-analysis heading across panes; extreme narrow text may wrap |
| F29-01 | app/route-controller.ts, result-controller.ts | **PRESENT:** reopened Result pane/filter derives from current selected record |
| F29-02 | styles/app.css, history-page.ts | **PRESENT automated geometry, physical HOLD:** no 195px/140% horizontal scroll in current browser tests |
| F29-03 | styles/app.css, learning-ui.ts | **PRESENT automated geometry, physical HOLD:** P58-C red-first narrow Learning heading repair plus three-browser no-scroll |

### TS01–TS15 — test engineering

| ID | Present source/evidence | Independent disposition |
| --- | --- | --- |
| TS01 | tests/*.test.mjs, scripts/acceptance-*.mjs | **PRESENT:** capability-oriented Node/browser tests, not frozen v11 screenshot parity |
| TS02 | tests/exam-scoring-and-policy.test.mjs, session-and-timing.test.mjs | **PRESENT:** independent scorer/model oracles; not mathematical proof of all states |
| TS03 | tests/exam-scoring-and-policy.test.mjs | **PRESENT:** numeric tolerance/precision boundaries |
| TS04 | acceptance-resilience/partial-recovery/P56/P58A tests | **PRESENT:** red-reproduced concurrent write/corrupt SHA/adversarial backups; OS kill external |
| TS05 | exam-package-and-import.test.mjs, acceptance-stress.mjs, benchmark-storage.mjs | **PRESENT:** bounded hostile-import and 0–1600 historical records test/measurements |
| TS06 | learning-and-analytics tests, revision-evidence suites | **PRESENT:** evidence/learning/selector-specific checks |
| TS07 | scripts/browser/fixtures.mjs | **PRESENT:** shared browser harness; legacy numbered scripts retired |
| TS08 | actual screenshots for Wordgard/retained UX gates | **PRESENT:** feature-specific image QA only, no mandatory v11 pixel parity |
| TS09 | .github/workflows/ci.yml | **PRESENT:** actual Chromium/Firefox/WebKit full tests; WebKit Linux ≠ native Safari |
| TS10 | keyboard/ARIA/focus tests, P58-C screenshots | **PARTIAL:** no systematic rule-based WCAG suite or real screen reader/AT |
| TS11 | CI core/browser/publish jobs, checkout/write guard | **PRESENT:** five-job guarded publisher and exact tested source drift check |
| TS12 | benchmark-ui-coordinator.mjs, benchmark-storage.mjs | **PRESENT:** diagnostics are informational; no ungrounded v11 speed gate |
| TS13 | AGENTS.md, engineering programme, docs/README, QA_CURRENT | **PRESENT active documentation:** P58-C exact-source status supersedes old pass-only labels |
| TS14 | docs/audits/TEST_SUITE_REENGINEERING_PLAN_2026-11-01.md | **PARTIAL historical trace:** old→new unique assertion mapping exists; this P58-C reran current suites, not every old retired assertion in isolation |
| TS15 | package-lock.json, npm ci, scripts/build.mjs, CI logs | **PRESENT reproducibility; intermittent CI installer caveat:** canceled Firefox install run 42061691640 not falsely counted; final 42063617352 5/5 succeeded |

### QB01–QB14 and DOC01–DOC10 — editable bank source and document truthfulness

| ID | Current source owner / requirement | Independent disposition |
| --- | --- | --- |
| QB01 | app/bank-import.ts, external-bank.ts, question-bank-cli.mjs | **PRESENT:** simple MCQ/NAT and AI author format, hashes computed by app |
| QB02 | domain/question.ts, validate.ts, engine/scoring.ts | **PRESENT:** six scored kinds and advanced imports share one engine |
| QB03 | app/authoring-controller.ts, authoring/authoring-studio.ts | **PRESENT:** in-Library Wordgard authoring UI and preflight |
| QB04 | domain/rich-document.ts, authoring/document bridge | **PRESENT:** canonical structured AST, no vendor HTML as paper truth |
| QB05 | app/katex-math-adapter.ts, rich-content-view.ts | **PRESENT:** inline/display mathematical markup plus text alternative; spoken AT untested |
| QB06 | authoring-studio.ts, domain/media.ts, image-preparation.ts | **PRESENT:** bounded image hash/alt and source preparation |
| QB07 | authoring/wordgard-adapter.ts, authoring-studio.ts | **PRESENT:** editing commands and preview; hardware IME/undo fidelity remains a human/device gate |
| QB08 | authoring-publisher.ts, app/authoring-controller.ts | **PRESENT:** publish only validated immutable candidate/review revision, no direct staging score |
| QB09 | authoring-publisher.ts, app/exam-families.ts | **PRESENT:** separate original/reviewed/paper identity and explicit caution |
| QB10 | app/exam-view.ts, result-controller.ts, history/frozen.ts | **PRESENT:** no UI pre-submit key disclosure; local JSON bytes not cryptographically secret |
| QB11 | authoring-exchange.ts, authoring-staging.ts, authoring-studio.ts | **PRESENT qualified:** strict separate unpublished draft/shelf + staged archives; History v4 intentionally excludes them; actual OS loss may still erase unexported data |
| QB12 | authoring-publisher.ts, authoring-sections.ts, authoring-studio.ts | **PRESENT within P50/P54 scope:** custom sections, six-kind component rules and preflight; no CA actuarial product |
| QB13 | app/bank-import.ts and source guide | **DEFERRED:** no automatic general PDF/DOCX/CSV/OCR question conversion |
| QB14 | scripts/build.mjs, vendor-ports.ts, package-lock.json | **PRESENT:** untouched vendor sources, selectively bundled standalone CSS/fonts/JS and licenses |
| DOC01 | docs/ENGINEERING_PROGRAMME.md | **PRESENT:** one active programme and evidence ledger |
| DOC02 | docs/history/, docs/audits/ | **PRESENT, dated:** historical reports remain archived and are labelled earlier-state evidence |
| DOC03 | content/import-cgl.ts, docs/decisions/POLICY_REGISTER.md | **PRESENT:** CGL Q62 source-invalid/reviewed-caution accurately reflected |
| DOC04 | docs/QA_CURRENT.md, actual exact source CI 42063617352 | **PRESENT:** current 362 Node/5 jobs, never historical 238/274 |
| DOC05 | docs/architecture/QUESTION_BANK_AUTHORING.md | **PRESENT current-first:** Wordgard/P58-B versioned exchange and high-volume acceptance explicitly documented |
| DOC06 | docs/architecture/CURRENT_ARCHITECTURE.md | **PRESENT current-first:** typed bounded composition and remaining root redraw stated |
| DOC07 | domain/hash.ts, contracts/authoring guides | **PRESENT cautious labels:** unkeyed SHA proves byte consistency, not official source authentication |
| DOC08 | docs/QA_CURRENT.md and release gate | **EXTERNAL OPEN:** no physical device, AT, OS loss or user visual signoff invented |
| DOC09 | decisions D38/D73, history/backup.ts | **PRESENT:** old internal migration explicitly waived; current strict v4 and separate unpublished archives |
| DOC10 | scripts/build.mjs, template CSP injection, domain validators | **PRESENT bounded CSP/inputs; independent threat-model OPEN:** template marker replaced with runtime-hash CSP, no blanket all-attacks certification |

**Residual obligations are not buried:** the real Mac/mobile/AT/IME/OS tests, sourced APFC/CAT/UPSC/RBI content accuracy, 195px cosmetic wrapping, optional advanced storage design and human release approval remain the explicit HOLD/DEFERRED items in §5 and D73. This annex does not convert EXTERNAL or DEFERRED to DONE merely by enumerating them.
