# Practice Desk — Current test, release and compatibility contract

**Programme ownership:** [Consolidated P41–P48 engineering programme](ENGINEERING_PROGRAMME.md) governs future work and pass-specific quality gates. This document remains the authoritative current **executable test/CI guide**. Historical Pass36–40 QA plans have no future-work authority. P41 source-semantic publisher-key comparison is **automated verified** in [5-job CI 41336695608](https://github.com/oneshubhamt/practice-desk/actions/runs/41336695608); P42 is next, while independent P48 full-product and physical-device release gates remain OPEN.

**Updated 1 November 2026 · Development branch `overhaul` · Status: automated source/build/browser gates verified, not human/device release approval.** The old v11 parity programme is *completed and historical*. Nothing in this document requires new features, geometry, or styling to match the v11 baseline.

## Binding user decision: no regression, focused pass QA and final independent QA

Every P41–P47 pass must demonstrate **no regression** in existing supported capabilities. Step 5 is **targeted QA**, including affected Node tests, negative/malformed cases, persisted history/reopen and real affected browser journeys. Existing CI remains a required engineering safety gate; a newly executed comprehensive full-product and manual release audit belongs at P48, not at every intermediate pass. Earlier broader QA is warranted only for documented cross-cutting risk.

Current self-contained `file://` distribution remains supported and regression-tested, but its *future* deployment contract may be reconsidered when evidence justifies another origin, with explicit user approval and proven data/privacy/offline compatibility. It is not an unconditional architectural red line.

## Scope and reproducible commands

- **Required runtime:** Node.js 24 (P42 CI Node **v24.22.1**, npm **11.19.1**) with committed npm lockfile v3. Use **`npm ci --no-audit --no-fund`** from a clean checkout, not an unpinned `npm install`. The lock has **52 package entries (including root)** and integrity digests for every installed package. Direct packages: `esbuild@0.25.12` (MIT), `playwright-core@1.64.1` (Apache-2.0), `typescript@7.0.2` (Apache-2.0), `ts-fsrs@6.0.0` (MIT). All locked license declarations are MIT, Apache-2.0 or BSD-3-Clause. The registry's point-in-time `npm audit` during P42 bootstrap reported **zero advisories**; this is not a guarantee against future advisories. [P42 ledger](ENGINEERING_PROGRAMME.md) records the provenance.
- **Fast source and Node verification:** `npm run check` = strict `tsc --noEmit`, `npm run build`, `node --test tests/*.test.mjs`. Current independently observed result: **179/179** Node tests across **8 capability files** (P41 full CI 41336695608, 2026-11-01).
- **Generated artifact:** `Practice_Desk_Offline_Mock_Tests.html`, produced from `src/app/bootstrap.ts` and `src/template.html` by `scripts/build.mjs`. Open with `file://`; no live server is required. Never hand-edit the generated output or republish a build that did not pass the required tests.
- **Chromium:** an installed `google-chrome` / `chromium` binary is required. Run `npm run build` then any `node scripts/acceptance-<capability>.mjs` below. These use a real offline origin, separate browser contexts, actual IndexedDB or explicitly induced fallback, and failure-only diagnostic screenshots (where supported by the harness).
- **Firefox/WebKit:** `node node_modules/playwright-core/cli.js install --with-deps firefox` or `webkit` on supported CI Linux, followed by `node scripts/acceptance-platform.mjs firefox` and `node scripts/acceptance-safari-fallback.mjs firefox` (similarly `webkit`). These verify browser-engine behaviour; **Playwright WebKit is not a claim of physically tested Safari on macOS**.

**P41 targeted browser check:** `acceptance-editorial-provenance.mjs` now verifies that a reviewed CGL result shows an explicitly labelled comparable original-source subset rather than a misleading complete publisher-key score. Existing source/reviewed Q62, 10 edition, history, backup and offline paths remain covered. The fresh final all-app manual review is reserved for P48.

## Current mandatory browser suites

| File | Independent operational contracts |
|---|---|
| `acceptance-critical.mjs` | Source/reviewed CGL frozen attempt, scores and History; all six response kinds, manual grading and FSRS |
| `acceptance-bank-modes.mjs` | Strict/free/single, untimed reload, true edition filtering, authored APFC MCQ/NAT, exact 5/7.5 marks and 195px+140% Results |
| `acceptance-drafts.mjs` | Multiple-select draft and invalid cardinality; deterministic duplicate-matching errors |
| `acceptance-recovery.mjs` | Cancellable/two-confirm Discard, single-confirm Delete, emergency mirror, strict timer evidence, backup v3, additive restore, missing-record and fallback export |
| `acceptance-ui.mjs` | Four responsive viewports, detached Aa and nonsticky header, colours/contrast, semantics, keyboard tabs, scrolled Results/Review, History sorting/filtering, 44+ measured states |
| `acceptance-stress.mjs` | 80 saved History records/100-item Results bounded DOM and lazy-panel construction, not old SHA comparisons |
| `acceptance-platform.mjs` | Offline save/reload/export/native navigation across Chromium/Firefox/WebKit; reports unavailable native WebKit file Back after reload honestly |
| `acceptance-safari-fallback.mjs` | Feature-absent Navigation API `file://` fragment routing, browser Back/Forward, saved answer, reload/deep link/invalid-record recovery in all three engines |
| `acceptance-session-policy.mjs` | Native radio arrows, A–D/M/Alt shortcuts, fallback immersive fullscreen, leave/new-attempt cancellation, background question dwell, pause-flag and strict Closed/Locked |
| `acceptance-editorial-provenance.mjs` | Actually scored **all 10** CGL source/reviewed editions; disputed Oct 6 Q62, corrected/wording-only labels, original page/images/alt, older pinned source comparison and six-kind authored reviewed/source rules |
| `acceptance-history-evidence.mjs` | Atomic bulk delete under stale revision and storage quota, additive restore without pending/card/import harm, two compatible full papers, six pending/5-item cap, old missing-visit records, timing/audit links |
| `acceptance-resilience.mjs` | Actual competing IndexedDB and fallback tabs, rejected initial IDB reads, quota-denied emergency export and **real Chrome profile process restart** retaining result/FSRS card |
| `acceptance-learning-lifecycle.mjs` | Authored six-kind answer and writing assessment, explicit FSRS note/topic, independently frozen notebook-generated exam, lineage/backup preservation and reload |

All **13** files above are active capability tests; **zero** historical `passNN-*.mjs` or `smoke-offline.mjs` browser scripts remain in the current source or CI. Tests are not assertions of visual pixel parity or screen-reader certification. Keep unique checks when optimizing test counts; measure failure modes and provide an old→new assertion mapping before removal.

## CI and publishing

`.github/workflows/ci.yml` performs **one** Node24 check job, Chromium functional journeys, Firefox/WebKit offline scenarios, then the source-verified HTML publisher. Tests and pull requests have `contents:read`; the publisher alone has `contents:write`, only on a push to `overhaul` after every test job passes. It checks the exact source commit and refuses any intervening non-Markdown branch changes. `main` and `baseline/v11` remain untouched. A generated HTML update is not a release/merge authorization.

**Independent verified 1 November 2026 full CI:** [run 41321335800](https://github.com/oneshubhamt/practice-desk/actions/runs/41321335800), **5/5 successful jobs, 176/176 Node**, browser contracts for all three engines, gated artifact publisher; elapsed **137 seconds**. Earlier screenshot-heavy [Pass38 run 41296469053](https://github.com/oneshubhamt/practice-desk/actions/runs/41296469053) elapsed **302 seconds**; these are different coverage matrices and not a controlled speed benchmark. Immediately preceding pre-retirement [run 41306573542](https://github.com/oneshubhamt/practice-desk/actions/runs/41306573542) elapsed **129 seconds**; replacing more distinct tests with modern coverage added roughly eight observed seconds, not an unqualified speedup.

## P42 physical macOS Safari acceptance checklist — awaiting real-device evidence

**This is a manual reproducibility procedure, NOT a claim of completion.** Run with the **latest CI-verified standalone HTML** downloaded from `overhaul`; record macOS version, Safari version, HTML SHA-256, file location, local date/time and whether the URL uses `?pd=` native routes or `#pd=` fallback routes. Keep an exported backup before conducting any restore tests.

1. Open the HTML **from Finder** in Safari with internet disabled (no localhost). Confirm Library loads, preflight rules render, no unexpected remote requests, and the floating Aa control works while the header scrolls away.
2. Choose an **original SSC CGL** paper; start a strict timed attempt, answer and flag a question, navigate to another question, and return. Confirm the saved choice, timer and flag match the previous state.
3. Use **Safari Back, Forward and Reload** from Exam → Library → History and back to the saved attempt. After each route, verify that the correct attempt and screen return, no duplicate attempt is started, and the answer persists. Record the exact route/URL where a failure occurs.
4. Close the Safari tab and reopen the **same file at the same path**. Check storage permissions and saved attempt persistence; do not interpret a new Downloads filename/origin as proof that the old origin's IndexedDB data was lost.
5. Finish one attempt, inspect Results → Answer review → Question times → History, then use Back/Forward again, including after reload. Confirm stable frozen marks and proper source/reviewed provenance (including the Q62 caution where applicable).
6. Import a valid APFC MCQ/NAT bank and confirm start, scoring and History. Try an invalid or oversized JSON bank and verify a visible rejection without a saved bogus package.
7. At a narrow window and **140% app text**, visit Library, Exam, Results, History and Learning; inspect text wrapping, focus, scrolling, and image rendering. Toggle dark/light, keyboard controls and Aa.
8. Create or inspect one FSRS Learning card, export a **backup v3**, reopen the file, import the same backup and confirm it is **additive (no duplicate existing IDs or lost pending attempts)**.
9. If Safari supports the native Navigation API and Back after a `file://` reload fails, document the exact step and URL, test whether forced hash fallback is available, and mark this scenario **FAIL/UNVERIFIED**. Playwright WebKit success is not evidence of Mac-native history correctness.
10. Record **PASS / FAIL / NOT TESTED for each step**, plus screenshots/log snippets only for failures. Do not report physical Safari, VoiceOver, iOS/Android or actual OS eviction as certified without their own manual evidence.

**P42 completion boundary:** issue this exact procedure and preserve the browser-emulator caveat. Actual Mac results are **EXTERNAL / NOT TESTED** until supplied; the definitive physical-device release matrix remains P48.

## Manual and release gates — OPEN

- **Actual macOS Safari:** launch the freshly generated/downloaded HTML, check Library → Test → History → Results → Learning; Back/Forward and deep-link reload before/after saving answers, retaining attempts, appearance and imported banks. Browser-native WebKit Back after a `file://` reload was **not** verified, even though the absent-API hash fallback passes. Record the exact Safari/macOS version and route where any issue persists. Never report simulated WebKit as a physical Mac pass.
- **Touch and visual:** iPhone/iPad/Android touch, small-screen zoom incl. 195px+140% app scaling, visible keyboard focus, real viewport scrolling, blocked full-screen, variable fonts and large/dark/reduced-motion settings. Automated contrast/DOM/a11y checks are **not** WCAG or human visual signoff.
- **Assistive technology:** actual VoiceOver and NVDA/TalkBack heading order, live region announcements, radio groups, dialogs, accessible status and answer reveal; require human evaluation.
- **Hostile environment:** browser quota eviction/OS kill, browser update and storage expiration, interrupted write/backup import, huge atypical imports, offline post-reboot permission changes; simulated quota and optimistic transaction tests do not certify these.
- **Release governance:** explicit user approval before merging into `main`, changing stable `baseline/v11`, or declaring a public/physical-device release. The user-approved Oct 6 Q62 original excluded/reviewed publisher-B caution remains inviolable unless separately authorized.

**Remaining risk:** `npm install` lacks a committed lockfile, browser versions and on-device behaviour differ, and some large hostile-import or AT cases remain manual. No test suite count or CI-green result proves the absence of all defects.
