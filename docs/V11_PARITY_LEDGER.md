# v11 reference — superseded Pass 9 ledger (historical record)

> **SUPERSEDED 30 October 2026.** This was the Pass 9 *implemented-work and automated-check* checklist. An independent source-to-source audit subsequently identified many v11 UI and feature regressions. **Do not use the table below as evidence of complete parity.** Use **[the authoritative v11 Feature Parity Programme](V11_FEATURE_PARITY_PROGRAMME.md)** for live status, source anchors, gap IDs, Passes 11–16 and acceptance. Historical claims are retained verbatim below for traceability.

---

# v11 reference and Pass 9 parity ledger

**Frozen reference:** `baseline/v11` with `src/app/legacy.ts`, v11 CSS/template. **Current:** typed `overhaul`, no parallel legacy runtime, no v11 migration. Source behavior has been audited; Chromium automated UI and responsive regression is green. Pixel-by-pixel visual approval on real devices remains a **separate Pass 10/manual task**.

| V11 capability | Restored / improved on `overhaul` in Pass 9 | Verification and bounds |
|---|---|---|
| Designed home, selected paper and active resume | Rich home overview; mode cards; accurate timer/question/navigation preview; four summary stats; resume banner; recent attempts, learning and backup tiles | Native Chrome `file://` start/resume and mode previews |
| Dedicated history & insights | Search, sort, status filters, historical scores, resume/delete, summaries, exact revision trend and cross-paper section priorities | Browser filter/sort/search/return; null accuracy never graphed as 0; no arbitrary cross-paper mark comparison |
| Separate insights, review and timing | Three accessible keyboard-operable result tabs, frozen review, full item timing ledger and shortcuts from ledger to review | Chrome result tab/filter/ledger and keyboard tests; answers hidden until submission |
| Audited vs original score story | Original-key unadjusted score remains pinned separately; reviewed score, manual written self-assessment and revision-exam practice marks are labelled | Pass 7/8 immutable score and backup regression retained |
| Section pacing and visual status | Section progress/accuracy bars, foreground time and precise mode timer rules; exam progressbar, timer, palette/flag/status legend | Browser 390/768/desktop responsive; timers are not claims about thinking time |
| Speed×accuracy, mark opportunities, answer revisions | Section-relative speed matrix, real penalty and hypothetical wrong/skipped arithmetic, direct targeted review; now persists **actual answer events** and shows observed rescue/loss for directly replaced single-choice answers | Pure tests and Chrome review navigation; cleared/unlogged items not assigned false outcomes |
| Detailed question timing/review filters | Sortable chronological time ledger via frozen order, review by verdict/flag/speed, source page/citation/frozen images, notebook capture | Browser item ledger, filters, figure decode, source provenance; no claimed cause of errors |
| Immersive mock-test workspace | Styled question panel, progress/timer, sections, sticky navigator, palette, buttons, keyboard navigation and responsiveness | CGL all modes, custom six-kind exam, Alt+arrows and small screens |
| Compact display settings | Accessible Aa popover, saved theme/text scale, optional fullscreen, Escape/outside close | Browser preference/backup, visible popover, Escape; platform fullscreen acceptance pending |
| Learning/revision | FSRS-7 due queue and generated revision exams plus new notebook summary/error pattern cards, consistent visual system | FSRS/notes/source linkage/backup/reopen regression |
| Correctness, integrity and recovery | New strict TS, frozen revisions/media, backup v3, two-tab conflict and UNSAVED_RECOVERY retained | All 75 tests, Chromium offline smoke; no v11 runtime/data compatibility |

**Honesty boundary:** These rows indicate **functional and authored-visual parity work performed**, not proof that users will prefer the result or that every v11 pixel is duplicated. Preserve this ledger in Pass 10 for screenshot comparisons, accessibility, real devices and residual visual adjustments rather than silently declaring those verified.
