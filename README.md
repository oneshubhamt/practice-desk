# Practice Desk — offline examination studio

**Development branch:** `overhaul` · **historical reference only:** `baseline/v11` (parity programme completed).

Practice Desk is a single-file offline exam application with a typed six-kind generic engine, built-in original/reviewed SSC CGL papers, imported exams, frozen source/answer-key revisions, configurable scoring and timing, post-submit corrections, detailed history, validated backup v3, learning notebook, FSRS-7 and evidence-based practice.

**Mac offline navigation and extreme-width Results update (1 November 2026):** Native Navigation API is preferred, but the offline file now supports same-file fragment navigation on older Safari/WebKit when the API is missing or rejects file navigation. Actual fallback browser tests verified Back/Forward, reload, saved answer and invalid-link recovery on Chromium, Firefox and WebKit. Results now fit **195px logical width combined with 140% app text scaling**, including APFC/NAT and CGL modes. [Green verification](https://github.com/oneshubhamt/practice-desk/actions/runs/41303947780). Native WebKit file Back after reload and physical Mac Safari manual signoff are different constraints; test the newly rebuilt HTML locally.

## Next development: consolidated architecture programme

**[One authoritative engineering programme — requirements, priorities, P41–P48 passes, acceptance tests, risk register and live ledger](docs/ENGINEERING_PROGRAMME.md).** It consolidates the 28 October architecture audit, 1 November gap verification, historical feature-parity and test migration programmes, and remaining generic-exam, learning, storage and UI work. First pending P0 fix: original-key comparison is misleading when reviewed options change meaning. This documentation pass does **not** modify the app.

## Current testing and future development (1 November 2026)

The historical v11 feature/UI parity programme is **complete**. Further work is forward-looking: preserve the current multi-exam product contracts while adding capabilities beyond v11. **Do not run routine v11 visual comparisons or generate screenshot warehouses.** Current automated gates comprise Node24 strict TypeScript/build and **176 independently running Node tests** (two proven duplicates consolidated after the previous 178 count), modern `file://` Chromium journeys (including independently verified source/reviewed CGL, APFC/NAT bank import, strict/free/single untimed, six question kinds, manual grading, Learning/FSRS, backup/recovery, responsive UI and bounded history/Results stress), and Firefox/WebKit persistence/navigation. **All eight formerly remaining historical browser scripts have now been retired** after mapping their distinct behaviours into five current-app capability journeys; **zero** chronological `passNN` or smoke scripts remain in routine CI. Core protective assertions remain independently tested. Screenshots are saved only for failures or an explicitly requested visual review. See [current engineering policy](AGENTS.md) and [completed Pass36–40 test migration evidence](docs/audits/TEST_SUITE_REENGINEERING_PLAN_2026-11-01.md). Physical-device, assistive-technology and human visual approval remain distinct.

**Historical reports below describe earlier milestones; their screenshot artifacts are archival, not today's mandatory CI.**

**Historical interim consolidation verification (1 November 2026):** [5-job CI run #41306573542](https://github.com/oneshubhamt/practice-desk/actions/runs/41306573542) passed **176/176 Node tests**, two modern critical journeys, enhanced recovery including intentional cancellation and destructive confirms, and current-app preflight/Results/Aa checks after removing two genuinely redundant legacy browser suites. Eight distinct older-name screenshot-free safety suites remain, pending assertion-by-assertion successor coverage. See the active test-suite scratchpad for the exact mapping; no product source or exam keys changed in this consolidation.

**Pass40 full historical browser migration COMPLETE (1 November 2026):** All eight screenshot-free old-name scripts (`smoke-offline`, Passes 11/12/13/14/16/19/21) were **actually removed**, with meaningful replacement protections in `acceptance-session-policy`, `acceptance-editorial-provenance`, `acceptance-history-evidence`, `acceptance-resilience`, and `acceptance-learning-lifecycle`. Existing critical/bank/recovery/UI suites were also strengthened. Verified [full five-job CI run #41321335800](https://github.com/oneshubhamt/practice-desk/actions/runs/41321335800): **176/176 Node tests**, Chromium, Firefox, WebKit and guarded standalone HTML publication **all successful**. No app `src/`, original content/keys or `main` changes; current work extends beyond the completed v11 parity exercise. [QA commands, capability coverage and release limitations](docs/QA_CURRENT.md) · [complete scenario migration and independent audit](docs/audits/TEST_SUITE_REENGINEERING_PLAN_2026-11-01.md). **Actual macOS Safari and assistive-device release approval are still open.**

## Documentation and source audit

**[Read the documentation index](docs/README.md)** for the current architecture, data contracts, engineering decisions, complete Passes 4–16 historical record, and an independent **source-to-source v11 versus overhaul audit**.

**Pass30 source and UI acceptance (31 October 2026):** Restored **mutually exclusive Original/Reviewed paper lists** under a two-button v11-style edition switch, added independently persisted **Untimed practice** for strict/flexible/single CGL and imported exams, and added a one-click offline APFC/NAT starter template plus a fully validated simplified MCQ/NAT JSON importer. Real Chromium `file://` checks cover 1366×768 laptop, 390px phone and 195px zoom-equivalent, including saved choices, 5 papers per selected edition, correct strict untimed section locks, resumed timed policy, MCQ/NAT scoring and zero document overflow. The only additional regression discovered, a narrow generic Results metrics track (F30-01), was source-fixed and verified. **[CI 41219746648](https://github.com/oneshubhamt/practice-desk/actions/runs/41219746648): all four jobs SUCCESS** · [30 screenshot states](https://github.com/oneshubhamt/practice-desk/actions/runs/41219746648/artifacts/13049019003) · [bank authoring guide](docs/architecture/QUESTION_BANK_AUTHORING.md). No merge/release, no original CGL data edits.

**Current verification (31 October 2026):** Pass29 ran a **fresh independent 184-scene visual and user-journey acceptance matrix**, with **56 actual paired frozen-v11 CGL comparisons** at four laptop widths and modern-only tablet/phone/195px-zoom checks, strict/flexible/single-section, original/reviewed source, themes and 140% scale, figure/passage, Results/History and imported **six-kind generic → written self-grade → Learning → History**. [Full independent findings, scenario coverage and limitations](docs/audits/PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md) · [paired images/geometry manifest](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047/artifacts/13028401081) · [Node24 + Chromium + Firefox + WebKit CI](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047): **4/4 green**, verified offline HTML rebuilt. The matrix independently reconfirmed L01–L11 repairs and found/repaired **three additional** defects (reopening a saved result on stale Timing tab, 195px/140% History overflow, 195px/140% Learning overflow). The reviewed CGL 6 Oct Q62 caution and all original paper/key files remain unchanged. **Automated task-level parity does not constitute pixel-identical UI, human aesthetic signoff or physical-device/AT approval**; actual macOS Safari/iOS/Android, NVDA/VoiceOver, storage eviction/OS-kill, hostile/large imports and explicit release/merge approval remain outstanding. `overhaul` only; `main` and frozen `baseline/v11` unchanged.

Historical source and earlier separate Markdown records remain available in Git at [pre-consolidation `d4c36f928605`](https://github.com/oneshubhamt/practice-desk/tree/d4c36f9286059af970be342a7a894415517087aa/docs), and their full decisions/worklogs are consolidated in [Passes 4–16 history](docs/history/PASSES_04_16.md).

## Create APFC, NAT and other examination banks

Practice Desk is **one typed six-kind generic examination engine**; it does not require a separate application for APFC, NAT or another examination. The paper's own sections, positive/negative scoring, timer, navigation and provenance are input data. There are two import paths:

- **Simplified MCQ/NAT bank:** Download the editable APFC/NAT starter JSON directly from the Library, fill in questions, options/answer letters, numerical answers/tolerances and scoring, then **Import question bank**. Revision hashes and internal IDs are generated automatically. A [complete example](examples/apfc-mcq-nat-starter.json) and [step-by-step authoring contract](docs/architecture/QUESTION_BANK_AUTHORING.md) are provided.
- **Full six-kind advanced exam package:** Import the validated `practice-desk-exam` v1 format for multiple-select, matching, true/false, free-response, figures, passages and more involved timing/credit rules. Source/review editions are preserved separately.

**Edition selection:** v11-style **Original PDF / Reviewed & Corrected** segmented buttons; the Paper dropdown lists only the active edition's papers and distinctly groups imported/custom banks. **Untimed practice:** an independent saved checkbox available alongside all CGL strict/flexible/single modes and for imported exams. It freezes an untimed policy only for the new attempt; existing attempts, navigation and marking remain unchanged. The offline app does not yet parse arbitrary PDFs/CSV/pasted text directly; those must first be converted to one of its documented JSON forms.

## Build and runtime

Requires Node.js 24.x; this is an offline **`file://`** app with no account, analytics or runtime server.

```bash
npm install --no-audit --no-fund
npm run check
node scripts/smoke-offline.mjs
node scripts/pass16-independent.mjs
node scripts/pass23-independent.mjs
```

Generated distribution: `Practice_Desk_Offline_Mock_Tests.html` (do **not** hand edit). Code: `src/content/` published original banks/patches; `src/domain/` schema and integrity; `src/engine/` timing and scoring; `src/history/` frozen records/backup; `src/learning/` FSRS and evidence; `src/app/` UI controller and history/results; `src/styles/` CSS and `src/template.html`.

## Release safety

**Conditional engineering acceptance only.** Headless browser coverage and a clean CI run are not real iOS/Android/VoiceOver/NVDA/device-storage sign-off. The [Pass 23 final report](docs/audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) lists explicit manual test and release authorization gates; the application remains on `overhaul`.

Write only to `overhaul`. Preserve `main` and `baseline/v11`. No migration of old v11 user records, and v3 backups merge additively without silent overwrites, by explicit policy. CGL 6 October Q62 retains the disputed published B in *reviewed caution* scoring while excluding the original invalid item, as specifically approved. Manual Safari/Android/iOS/assistive technology, OS-kill/eviction and human design signoff are outstanding. **No merge without user authorization.**
