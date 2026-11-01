# Practice Desk — Current test, release and compatibility contract

**Updated 1 November 2026 · Development branch `overhaul` · Status: automated source/build/browser gates verified, not human/device release approval.** The old v11 parity programme is *completed and historical*. Nothing in this document requires new features, geometry, or styling to match the v11 baseline.

## Scope and reproducible commands

- **Required runtime:** Node.js 24, local checkout of `overhaul`, `npm install --no-audit --no-fund`. `package.json` pins direct dependencies but **no committed `package-lock.json` exists**; therefore npm transitive resolution is *not* guaranteed reproducible and `npm ci` is unsupported. Address as a separate intentional dependency-lock decision.
- **Fast source and Node verification:** `npm run check` = strict `tsc --noEmit`, `npm run build`, `node --test tests/*.test.mjs`. Current independently observed result: **176/176** Node tests across **8 capability files** (2026-11-01).
- **Generated artifact:** `Practice_Desk_Offline_Mock_Tests.html`, produced from `src/app/bootstrap.ts` and `src/template.html` by `scripts/build.mjs`. Open with `file://`; no live server is required. Never hand-edit the generated output or republish a build that did not pass the required tests.
- **Chromium:** an installed `google-chrome` / `chromium` binary is required. Run `npm run build` then any `node scripts/acceptance-<capability>.mjs` below. These use a real offline origin, separate browser contexts, actual IndexedDB or explicitly induced fallback, and failure-only diagnostic screenshots (where supported by the harness).
- **Firefox/WebKit:** `node node_modules/playwright-core/cli.js install --with-deps firefox` or `webkit` on supported CI Linux, followed by `node scripts/acceptance-platform.mjs firefox` and `node scripts/acceptance-safari-fallback.mjs firefox` (similarly `webkit`). These verify browser-engine behaviour; **Playwright WebKit is not a claim of physically tested Safari on macOS**.

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

## Manual and release gates — OPEN

- **Actual macOS Safari:** launch the freshly generated/downloaded HTML, check Library → Test → History → Results → Learning; Back/Forward and deep-link reload before/after saving answers, retaining attempts, appearance and imported banks. Browser-native WebKit Back after a `file://` reload was **not** verified, even though the absent-API hash fallback passes. Record the exact Safari/macOS version and route where any issue persists. Never report simulated WebKit as a physical Mac pass.
- **Touch and visual:** iPhone/iPad/Android touch, small-screen zoom incl. 195px+140% app scaling, visible keyboard focus, real viewport scrolling, blocked full-screen, variable fonts and large/dark/reduced-motion settings. Automated contrast/DOM/a11y checks are **not** WCAG or human visual signoff.
- **Assistive technology:** actual VoiceOver and NVDA/TalkBack heading order, live region announcements, radio groups, dialogs, accessible status and answer reveal; require human evaluation.
- **Hostile environment:** browser quota eviction/OS kill, browser update and storage expiration, interrupted write/backup import, huge atypical imports, offline post-reboot permission changes; simulated quota and optimistic transaction tests do not certify these.
- **Release governance:** explicit user approval before merging into `main`, changing stable `baseline/v11`, or declaring a public/physical-device release. The user-approved Oct 6 Q62 original excluded/reviewed publisher-B caution remains inviolable unless separately authorized.

**Remaining risk:** `npm install` lacks a committed lockfile, browser versions and on-device behaviour differ, and some large hostile-import or AT cases remain manual. No test suite count or CI-green result proves the absence of all defects.
