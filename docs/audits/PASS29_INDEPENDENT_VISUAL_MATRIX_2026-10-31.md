# Pass 29 — Independent expanded visual and use-case journey matrix

**31 October 2026 · independent automated review of `overhaul` against frozen `baseline/v11`**  
**Disposition: AUTOMATED MATRIX PASS, CONDITIONAL engineering candidate; human visual/physical-device/AT/release approval NOT established.**  
**Reference:** frozen `baseline/v11` commit `e661822d865927e89a837790c1c6bc1cfc2562a6`; `main` commit `075210795b29515dfe6ff253b74780e206ff4cf1` unchanged. Active code strictly on `overhaul`; source banks `papers.json`, `patches.json`, `solutions.json` untouched.

## Evidence and reproducibility

- **[Pass29 CI run 41164616047](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047): all 4/4 jobs SUCCESS** — new independent expanded Chromium visual/journey matrix, ordinary checks/Node24/build and old suites, Firefox and WebKit offline acceptance.
- **[184 screenshot states + 56 paired frozen v11 CGL comparisons (artifact)](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047/artifacts/13028401081)**. Includes `pass29-coverage.json` (every scene's dimensions/metadata, actual DOM geometry, first-viewport controls, overflow and comparison records), `pass29-review-index.md` (one row per screenshot with view/edition/mode/theme/scale/visible landmarks) and the paired/modern-only PNGs. Rough artifact size 25.96 MB.
- **New runnable script:** [`scripts/pass29-independent-matrix.mjs`](../../scripts/pass29-independent-matrix.mjs); **CI job:** `independent-journey-matrix` in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). The test loads **actual frozen v11 single-file HTML** via `git show origin/baseline/v11:Practice_Desk_Offline_Mock_Tests.html` and the regenerated overhaul `file://` HTML, not historical screenshots or mocked markup. Screenshots are not evidence of pixel-identical designs or user aesthetic approval.
- **Source and chronological worklog:** [canonical Section G scratchpad](V11_SOURCE_AUDIT_2026-10-30.md), including initial failed tests, diagnostic DOM offender traces, fixed source and reruns. Original [Pass24 11-finding desktop register](PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md) remains the baseline symptom record. [Pass23 independent source/scoring](PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) remains separate evidence for original 25 findings.

## 1. Coverage model — deliberately sampled, not exhaustive Cartesian combinations

Seven **actual CSS viewport** configurations: **1280×800, 1366×768, 1440×900, 1536×864, 768×1024 tablet, 390×844 phone, and 195×844 zoom-equivalent narrow window**. Sampled **light and dark**, **100% and 140% text**, `prefers-reduced-motion`, reviewed/source editorial editions, 30 September and 6 October CGL papers, strict/whole-paper flexible/single-section and imported generic. Existing Pass15 and Pass28 additionally cover 85% and other Display/theme/viewport cases. A sample is not proof of all scale, browser, device, language or content combinations.

The first four laptop sizes run a **full *paired* comparable CGL journey**, not isolated route screenshots; extra paired mode variations are exercised on the 1366×768 laptop. Tablet/phone/zoom cases and the generic six-kind exam are inspected as **modern-only** where no genuine v11 equivalent exists. The artifact contains **184 individually recorded screens** and **56 actual paired v11/overhaul comparison state pairs**; every screenshot has a scenario record, not just a filename.

### A. Paired frozen-v11 journeys — four laptop widths

| Journey stage / named scene | State or variation | Independent checks and evidence | Disposition |
|---|---|---|---|
| Library paper setup | Same 30 Sep reviewed CGL edition and free mode | Selected paper/Start DOM bounds, initial-fold presence at all four laptop widths, source/review setup retained | PASS |
| Appearance settings | Open Display, dark theme, 140% | Identical selected paper in both apps; screenshots of open popup and Library at dark/140%; change back to 100% light before performance comparisons | PASS |
| Ordinary test start | First response selected | First option, question, Next, Flag DOM bounds; first-fold Next/Flag fully visible on all four widths | PASS |
| Annotation and pause | Flag selected, pause, resume | Both apps' flagged and paused states captured; modern paused Next disabled while Flag remains enabled; resume preserves flow | PASS |
| Figure question | Real image-bearing source question | Navigate via actual question palette; figure remains present, first option initial-viewport visible at laptop widths | PASS |
| Reading passage | Real shared CGL reading-passage question | Cross-section navigation, full passage region retained; first choice visible in laptop initial viewport | PASS |
| Submit and overview | Same saved response pattern | Score panel, section performance table, result tabs captured in both; modern section table visible initially | PASS |
| Post-submit review | Review tab | Both question-review screens captured; actual changed 30 Sep Q6 key editorial label checked, without premature key disclosure during test | PASS |
| Timing ledger | Timing tab | Both Timing screens captured; navigation verified in actual completed attempt | PASS |
| Saved History | Populated archive | Paired first saved row, archive task discoverability, modern first saved row fully visible at laptop heights | PASS |
| Filter and search | In-progress-only, no-match search, oldest sort | Modern History filtered state and empty-match screenshots; records preserved | PASS |
| Reopen existing result | From History **after selecting Timing** in prior result | Score and section table visible again; Overview selected, no stale Timing state (new F29-01 fix) | PASS |

### B. CGL mode, edition, source and dispute variations

| Case | Mode / edition / paper | Evidence and checks | Result |
|---|---|---|---|
| Simulation | Strict; reviewed; 30 Sep | Paired Library and live Exam; sectional timer label, readable mode, frozen source task retained | PASS |
| Section practice | Single section; **original/source**; 30 Sep | Paired Library, live Exam, submitted score; **numerical scored marks/eligible maximum match v11** | PASS |
| Flexible different date | Whole-paper free; reviewed; **6 Oct** | Paired Library/Exam/Result and numerical score/max parity; reviewed Q62 displays caution and publisher B option text, not fabricated correction | PASS |
| Pre/post editorial release | 30 Sep Q6 and 6 Oct Q62 | Q6 changed publisher C→reviewed D labelled only after test; Q62 source invalid/reviewed caution retains B scoring rule | PASS |
| Alternate CGL edition | Original and reviewed key policies | Frozen selected variant, source key history and answer-disclosure timing verified in other Pass23/28 full checks, not inferred solely from screenshots | PASS in combined CI |

### C. Modern-responsive and imported generic use-case matrix

| Category | View(s) | Journey/scenes | Test outcome |
|---|---|---|---|
| Responsive Library | tablet 768, phone 390, zoom195 | Initial setup, dark/140% Library, Display popup within viewport | PASS |
| Small-screen History | same three | No-record History and archive/filter area, retained analytics and backup sections, no document horizontal overflow | PASS |
| Small-screen Learning | same three | Empty Learning & revision dashboard, card/priority and evidence-area presence, no document horizontal overflow | PASS |
| Small-screen Exam | same three | Start free-mode CGL, answer and navigation controls present; naturally vertical scroll allowed, **horizontal document overflow forbidden** | PASS |
| Generic imported exam | laptop 1366, phone 390 | Import valid six-kind JSON, select and start custom test | PASS |
| All six response modes | same | **Before/after screenshots** for single-choice, multi-select (two valid selections), numeric entry (3.5), true/false, two-target matching and actual submitted written response | PASS |
| Generic Results | same | Frozen score overview and six-item review, including pending written-response grading | PASS |
| Manual writing assessment | same | **Actual written response** becomes pending; explicit manual self-grade entered/saved separately from automated mark | PASS |
| Review → notebook → Learning | same | Add reviewed question to notebook; Learning & revision populated screen and card presence | PASS |
| Generic History and offline safeguards | same | Saved generic attempt listed in History; Export, Import and storage status controls remain present | PASS |

**Not automatically claimed:** all strict-section time-expiry branches, every huge/malicious imported document, every possible card schedule, unbounded record volume, every edition-paper-mode permutation, screen reader correctness, or human aesthetics. Existing source/contract-specific tests cover some additional paths independently; the full use-case matrix is intentionally bounded and reproducible.

## 2. New findings from independent cross-journey testing

Pass29 did **not** simply approve the prior L01–L11 fixes. Its first attempt found additional state and zoom interactions omitted by the earlier isolated tests:

| Finding | Severity and reproduction | Root cause / source repair | Verification |
|---|---|---|---|
| **F29-01** stale result context | **Medium**: CGL Results → Timing → History → reopen completed record; reopened result still showed previous Timing tab instead of score Overview | `src/app/generic-ui.ts:openSaved` reused `resultTab` and `reviewFilter`; commit `a4908ba8` resets both for a newly opened **finished** attempt, retaining all frozen marks and unfinished-resume behavior | New assert requires visible scored table and Overview ARIA selection after reopen; full matrix passed |
| **F29-02** zoomed History intrinsic width | **Medium**: 195px/140%, dark, **empty History** extends document width by **21px** | Progression panel H2/note and backup-management panel H2 held min-content widths. Commit `8b7796b7`: <=300px History panels shrink to 1fr and wrap. No metrics/backup removed | New strict no-horizontal-overflow check passed in later full journey |
| **F29-03** zoomed Learning intrinsic width | **Medium**: 195px/140%, dark, **empty Learning** extends document width by **23px** | Learning summary metrics, revision-callout and insights headings resisted shrink. Commit `103ed699`: <=300px one-column summary, shrink and wrap; evidence table remains independently scrollable | Same matrix now reaches next step and passed all responsive journeys |

**Test-methodology corrections (not counted as product defects):** initial reopen assertion mapped the old Timing-only result state to an Overview score; fixing the application was justified by the actual route-state source/behavior. Later the initial generic test expected manual marking after leaving a written question **blank**; `manualGradeLimit` correctly requires a **submitted pending** written answer. The matrix was strengthened in `db5011d9` to actually submit all six types and then grade the written response. Earlier failed runs, strict diagnostics and subsequent green rerun remain available through the chronological scratchpad. **No failing test was silenced to claim parity.**

## 3. Visual performance and v11 reference limits

Previously measured original first-viewport regressions remain in [Pass24 register](PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md), and Pass29 independently exercised the same tasks again with new browser sessions. At 1366×768, matched reviewed flexible CGL:

| Key first-viewport anchor (top, CSS px) | Frozen v11 | After Passes 25–27 | Interpret |
|---|---:|---:|---|
| Library Start | 702 | 551 | Start above fold in all tested laptop widths |
| Ordinary Next / Mark | 675 / 675 | 611 / 611 | Both usable on first screen |
| First choice after long passage | 653 | 598 | Full source passage retained in controlled scroller |
| First figure choice | 693 | 637 | Original imagery retained |
| Results section table | 476 | 457 | Core section marks immediately findable |
| First saved History attempt | 604 | 326 | Archive before supplemental analytics |

**Provenance:** numeric after-repair values come from Pass25–27 paired screenshot/DOM reports; Pass29 reran and passed first-fold task predicates against freshly generated v11/current UIs. These are design/usability guardrails, not pixel-matching requirements or subjective aesthetic ratings.

## 4. Engineering assurance and outstanding gates

- **Automated source/CI evidence:** full four-job CI PASS, previous independent source bank hashes, six v11/current paired numerical score/max cases, generic six-kind validation, frozen provenance, backups, media, timers and FSRS checks remain green. The generated offline HTML is published only from source that passed CI. New true issues F29-01–F29-03 were fixed without modifying CGL question/key source JSON or the approved 6 October Q62 scoring policy.
- **Accessibility proxies:** DOM/role/pressed/focus states, reduced-motion browser configuration, popup/response discoverability, contained horizontal overflow, color contrast checks from prior Pass15, font scaling at 140%, keyboard interactions from prior suites. **These do not certify real NVDA/VoiceOver or WCAG conformance.**
- **Not verified / release blocking:** actual macOS Safari, iOS/Android touch and OS lifecycle, 200% system zoom on real laptop device, screen readers NVDA/VoiceOver, live human side-by-side aesthetic judgement of the 184 PNGs, real device storage eviction/forced-kill recovery, arbitrary hostile/stress imports, real-world performance under large user histories, and explicit user approval to merge/release. Screenshots are **available for human inspection**, but they were not independently signed off by a person.
- **Decision:** **Pass29 expanded independent automated visual/journey acceptance PASS; 11/11 original laptop findings plus 3 new cross-journey defects have code repairs and passing automated acceptance. Conditional engineering candidate only.** The `overhaul` branch and offline distribution should not be merged/promoted until the outstanding manual/physical/device gates are addressed or explicitly accepted by the user.

## 5. How to review the 184-screen evidence

Download the [Pass29 matrix artifact ZIP](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047/artifacts/13028401081), open `pass29-review-index.md`, and use its scene names/IDs to inspect corresponding `v11--…png` and `overhaul--…png`. For programmatic comparison use `pass29-coverage.json`: it records the exact sampled viewport, mode, edition, theme, scale, screen, first-viewport element geometry and paired measurement shifts. For additional pre-repair evidence see the Pass24 artifact and remediation screenshots linked above.

**All recorded UI work was performed in `overhaul`; frozen baseline and `main` were not changed.**
