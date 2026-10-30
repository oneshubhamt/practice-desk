# Pass 24 — laptop screenshot-based v11 versus overhaul visual/function audit

**30 October 2026** · working branch `overhaul` · frozen baseline `baseline/v11` untouched.  
**Browser evidence:** [GitHub Actions run 41074613784](https://github.com/oneshubhamt/practice-desk/actions/runs/41074613784), all three CI jobs successful; [new 1366/1440/1536 laptop screenshots](https://github.com/oneshubhamt/practice-desk/actions/runs/41074613784/artifacts/12985554065), including `visual-layout-report.json`; [existing 1280 baseline screenshots](https://github.com/oneshubhamt/practice-desk/actions/runs/41057021116/artifacts/12976653468).

## Finding

**Material laptop visual/first-viewport task parity FAILED**, even though the previous source/functional CI passed. This audit directly inspected paired screenshots of the *real built v11* and *current overhaul* and measured DOM element geometry with `getBoundingClientRect` at **1366×768, 1440×900, 1536×864**, plus the previously captured 1280×800. Matched routes: Library, Display light/dark/100–140%, ordinary answered exam, audited question, figure question, reading passage, results Overview/Review/Timing, corrected item and populated History. The 1366 screen is specifically important for real laptops.

**Do not equate success of the old Pass 15 visual test with visually equivalent layout**: it checked screenshots existed, broad behavior and absence of horizontal overflow, but not first-fold positions or reasonable information density. Real screenshots reveal major regression even though all automated actions remain clickable after scripted scroll. The prior Pass23 declaration of *conditional engineering candidate* remains **limited to the tested code/flows**; any implication of desktop visual parity was premature.

## Measured first-viewport differences (1366×768 CSS pixels)

| Item | v11 y (px) | Overhaul y (px) | Shift | Usability result |
|---|---:|---:|---:|---|
| Library Start | 702 | 942 | +240 | Only v11 visible without scrolling |
| Paper selector | 225 | 490 | +265 | Setup begins substantially lower |
| Ordinary question top | 257 | 381 | +124 | Space lost before task |
| Ordinary first option | 393 | 597 | +204 | Larger question layout |
| Ordinary **Next** | 675 | 954 | +279 | **Overhaul offscreen** at all three tested laptop heights |
| Ordinary **Flag/Mark** | 675 | 875 | +200 | **Overhaul offscreen** at all three tested laptop heights |
| Long passage first answer | 653 | 1014 | +361 | **Overhaul below first viewport** |
| Figure first option | 693 | 857 | +164 | Overhaul below first viewport |
| Results Overview section table | 476 | 766 | +290 | Modern table below 768px screen |
| First saved History record | 604 | 1243 | +639 | **Overhaul below first viewport** at every tested laptop height |

The ordinary question card height increased from **487 to 734 px (+50.7%)**; long passage **747 to 1151 px (+54.1%)**; figure **1129 to 1650 px (+46.1%)**. At **1440×900 and 1536×864**, Start and Next still remain below the fold. Browser size and test state were matched. These are measured structural differences, not opinions about aesthetic preference.

## Screenshots reviewed and issues

| ID | Priority | Observed regression and effect | Evidence scenario |
|---|---|---|---|
| L01 | HIGH | Library adds dashboard and repeated paper/edition setup before Start, moving primary action below fold | `library` |
| L02 | HIGH | Exam header and question cards substantially taller; Next and Flag leave initial viewport; source/v11 navigator summary is more immediately scannable | `exam-answered` |
| L03 | HIGH | Long passages consume almost the entire initial screen and push first option to y1014 | `exam-passage` |
| L04 | MEDIUM | Figure option choices displaced by expanded layout; first at y857 | `exam-figure` |
| L05 | HIGH | History summary panels precede saved attempts; first record moves to y1243 | `history-populated` |
| L06 | MEDIUM | Extra results explanatory panels move the core performance-by-section table down to y766 | `results-overview` |
| L07 | MEDIUM | Display Light/Dark controls wrap letters into vertical stacks at 140% text scaling; screenshot shows v11 labels remain on one line | `display-text140` |
| L08 | MEDIUM | Reviewed correction feedback is less precise: v11 badge **Key corrected** versus generic `Editorial correction recorded`; CGL source importer does not populate `editorial.changes`, including where source/reviewed key actually differs (30 Sep Q6 **C→D**, verified in original JSON). Must derive change types accurately rather than imply all corrections changed a key | `corrected-review` |
| L09 | MEDIUM | **Confirmed misleading functional-information label:** flexible **whole-paper** progress bar says **Section timer**. In `src/app/generic-ui.ts:renderModelExam`, `timeLimit` is set to the whole-paper duration and the bar label uses `timeLimit!==null ? "Section timer" ...`, so it does not distinguish whole-paper vs sectional. The calculation itself uses the correct duration | `exam-answered` |
| L10 | LOW | Generic `full-paper-practice` mode slug exposed in test header; user-facing full-paper language in v11 is clearer | `exam-answered` |
| L11 | LOW | Page heading `Performance overview` persists even while actual Question Review or Timing Ledger tab selected; v11 uses stable generic `Attempt analysis` title | `results-review`, `results-timing` |

This audit does **not** assert broken answer scoring, lost data or disabled buttons. Earlier v11/current exact numerical score/eligible-max comparisons (6/6), CGL original/caution handling, timer/review/history saved flows, multi-kind engine tests and Firefox/WebKit automated acceptance remain green. The new evidence identifies *user-visible hierarchy, discoverability and semantics* regressions that those tests failed to recognize.

## Pass 25 implementation status — one of eleven findings repaired (30 Oct 2026)

**L01 (HIGH): AUTOMATED-VERIFIED / REPAIRED** on `overhaul`, only for the primary Library task. The underlying audit observation remains historically true for *pre-Pass25* snapshots, but is not a current unresolved Library blocker. The overhaul now renders primary paper/edition/mode/Start above nonessential statistic totals, with compact home-scoped desktop styles. Exact same-paper/edition `file://` screenshot and landmark comparisons (30 Sep reviewed) at 1280×800, 1366×768, 1440×900, 1536×864 show **Start y551 vs old overhaul y942 and v11 y702; paper selector y203 vs old overhaul y490 and v11 y225**. All four Start buttons fit inside the laptop viewport. All source/review, free/strict/single, learning, backup, preflight and status cards remain available. 140%-text and mobile/tablet sanity checks passed. [Full CI 41105425460](https://github.com/oneshubhamt/practice-desk/actions/runs/41105425460): **3/3 green**; [paired screenshots and measured JSON](https://github.com/oneshubhamt/practice-desk/actions/runs/41105425460/artifacts/12999829929).

**L02–L11 remain OPEN**; specifically Next/Flag, passage/figure answers, History and Results first-fold usability were **not repaired by Pass25**. The earlier pre-Pass25 table and measurements are retained for comparison and should not be misconstrued as updated current measurements. Passes 26–28 own the remaining repairs and Pass 29 the independent final visual review.

## Pass 26 implementation status — exam L02/L03/L04 repaired (31 Oct 2026)

**L02 (HIGH), L03 (HIGH), L04 (MEDIUM): AUTOMATED-VERIFIED / REPAIRED** for ordinary CGL, source figure and reading-passage scenarios at 1280×800, 1366×768, 1440×900 and 1536×864, compared with the same 30 Sep 2026 reviewed CGL paper and flexible mode in the frozen v11 HTML. The new actual `file://` `scripts/pass26-exam.mjs` fails CI if initial ordinary Next/Flag are below the viewport, if question layout drifts excessively below v11, if passage or figure first choice is below fold, if original imagery/alt/full passage is lost, if the scrollable passage is not keyboard-operable, or if mobile/tablet/140%-scaling checks overflow.

| 1366×768 measured top, CSS px | Frozen v11 | Prior overhaul (Pass24) | After Pass26 |
|---|---:|---:|---:|
| Ordinary Next | 675 | 954 | **611** |
| Ordinary Flag/Mark | 675 | 875 | **611** |
| Figure first option | 693 | 857 | **637** |
| Passage first option | 653 | 1014 | **598** |

All four modern viewport results were identical for these sampled landmarks; Next and Flag completely within viewport. The passage remains full-text and keyboard-scrollable in a 210px tall area; figure retains original data and alt and is scaled down only in desktop presentation with `object-fit:contain`. Buttons remain fully active and source score/history rules did not change. New desktop styles are scoped to >=981px; mobile/tablet/140% overflow checks and the existing prior regression suite passed. [CI 41113295966](https://github.com/oneshubhamt/practice-desk/actions/runs/41113295966) **3/3 green**; [screenshot and geometry artifact](https://github.com/oneshubhamt/practice-desk/actions/runs/41113295966/artifacts/13003588788). Original Pass24 pre-repair measurements above remain archival. Full human/physical desktop visual signoff still belongs to Pass29. Detailed changes, test corrections and source reconciliation are in the canonical [audit scratchpad](V11_SOURCE_AUDIT_2026-10-30.md).

**L05–L11 remain OPEN** for Passes 27–28, with Pass29 as independent final review. L09 remains a known misleading whole-paper timer label; do not call this programme or overall laptop UI parity complete.

## Recommended repair programme — originally all items open (L01–L04 now automated-repaired)

**Priority 1:** Reestablish v11-like *compact, action-first CGL UI* for Library and Exam at 1366×768 and 1440×900; keep richer generic engine and optional metrics in expandable/secondary areas rather than above essential controls. Specifically require Start, ordinary Next/Flag and first answer for typical passage items to remain visible to the same degree as v11 in the first viewport. Adopt DOM rectangle assertions, not just screenshot existence/no-overflow checks.

**Priority 2:** Restore immediately accessible saved attempt rows and section-performance summaries; reduce oversized exam cards, margins, header stacking, passage and figure display whitespace. Preserve readability/zoom instead of globally shrinking text.

**Priority 3:** Fix `Section timer` label for whole-paper, correct explicit source-reviewed key-change metadata in CGL importer without changing original content or Q62 policy; prevent theme buttons wrapping at 100–140% and improve human-friendly tab headings/slugs.

**Release status:** Conditional engineering candidate **fails desktop first-viewport visual parity**. Cannot certify v11-equivalent laptop usability until above repairs and fresh side-by-side screenshot assessment pass. Physical macOS Safari, NVDA, VoiceOver and actual laptop user testing remain unverified. Do not merge or release without explicit authorization.

**Reproducibility:** Existing `scripts/pass15-visual.mjs` now accepts optional `PASS15_VIEWPORTS`, emitting paired screenshots plus geometry; `.github/workflows/ci.yml` captures and uploads the three laptop widths as a separate CI artifact. All source content JSON, `main` and `baseline/v11` remain untouched.