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
