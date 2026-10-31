# Pass 23 — independent final v11 / overhaul audit

> **SUBSEQUENT PASS29 UPDATE (31 October 2026; this Pass23 report remains historical):** Passes25–28 source-repaired the eleven Pass24 desktop issues, then a **fresh, broader independent 184-screen/56-paired-v11 user-journey matrix** in [Pass29](PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md) found and repaired three additional navigation and extreme-zoom issues. [CI 41164616047](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047) **4/4 SUCCESS**; [screenshot/geometry/index evidence](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047/artifacts/13028401081). The immediate *automated* desktop first-fold/route defects documented below are no longer current blockers in the tested scenarios. **Actual human visual appraisal, physical macOS Safari/mobile, NVDA/VoiceOver, OS lifecycle/storage and merge/release signoff remain unresolved**. Do not interpret either Pass23 or Pass29 as unconditional certification.

> **POST-AUDIT CORRECTION (30 October 2026):** The [subsequent Pass24 laptop screenshot/geometry comparison](PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md) found **material desktop visual/task-discoverability regressions**, despite this report's successful behavioral, scoring and broad responsive CI. Start, Next/Flag and saved attempt rows are shifted below the first viewport; the full-paper timer label is misleading. The conditional status below **does not establish desktop v11 visual parity**. A visual remediation pass and manual review are still required.

**Date:** 30 October 2026 · **Repository:** `oneshubhamt/practice-desk` · **Development branch:** `overhaul`  
**Frozen v11 reference:** `baseline/v11` at `e661822d865927e89a837790c1c6bc1cfc2562a6`  
**Final verified source CI HEAD:** `efe362675c120ca0c21fc7a9425cde4c52362126` (later documentation-only commits are `[skip ci]`)  
**Fresh independent CI:** [run 41057021116](https://github.com/oneshubhamt/practice-desk/actions/runs/41057021116), **3/3 jobs SUCCESS**  
**Legacy main untouched:** `075210795b29515dfe6ff253b74780e206ff4cf1` at readback. **Do not merge or deploy.**

## Executive determination

**Conditional engineering candidate, not an unconditional release or human accessibility sign-off.** All 15 originally identified v11 behavior/UI findings F01–F15 and 9 generic correctness findings G01–G09 have their assigned *code repair plus targeted automated QA* on Passes 17–22. Pass 23 re-ran the full prior suite **and added new independent tests** comparing actual frozen v11 against actual overhaul `file://` HTML and challenging generic import/engine/backup boundaries. The accepted G10 exception remains exactly as authorized: no old v11 saved-history/backup migration, as this is a new application.

No independently reproducible functional regression within the newly exercised automated sample remained after the Pass 23 QA corrections. This **does not** mean every UI state or real device was tested, that the current UI has been human-approved, or that content from examining authorities has been independently verified. Manual device/assistive technology, storage eviction/OS-kill and release authority remain explicitly **OPEN**. Preserve this difference in any announcement.

## 1. Five-step source/QA sequence and evidence

1. **Audit original code afresh.** Opened `baseline/v11:src/app/legacy.ts` home, exam, result and history; compared its selected behaviors and disclosures against `overhaul` current domain, imported package, session clock, scoring, UI, history, backup, question-rendering and CSS source. Re-read all 25 original findings in [the controlling scratchpad](V11_SOURCE_AUDIT_2026-10-30.md), architecture and decision register instead of adopting historical DONE prose.
2. **Analyze risk and intended differences.** Audited original published-key versus independently reviewed labels, early-submit timing, original-versus-reviewed Q62, exact eligible denominators, scoreable excluded questions, explicit generic examiner policy envelopes, external-import untrusted text, single-file offline safety, persistence, edit draft honesty, accessible keyboard navigation and review-release permissions. Differentiated *source-code presence* from *browser observations*, and *automated accessibility assertions* from actual screen-reader use.
3. **Implement new independent checks (no app code edits).** Added `tests/pass23-independent.test.mjs` for baseline source Git blobs, all ten editions, Q62, strict/free/single executable policy, fresh manual/locked transition boundaries, scoring floor/ceiling, invalid generic keys, review permission, draft/match diagnostics, destructive safeguards and intentionally incompatible v11 backup. Added `scripts/pass23-independent.mjs` to launch both actual frozen v11 and modern offline HTML, play 12 paired browser exam scenarios (6 cases × 2 builds), compare numeric adjusted marks and eligible maxima, inspect result/history navigation, adversarial HTML-escaped imported exam with `allowReview=false`, and test Display access plus overflow at five viewports. Wired to CI, retaining Passes 11–22 and all established smoke/visual/integrity tests.
4. **Reconcile every assigned finding.** Reviewed F01–F15 and G01–G09 individually against working code and targeted tests (matrix below). The earlier user-approved Q62 policy remained unchanged; no source bank or scoring engine was altered to force the tests green.
5. **QA and repair.** Final `npm run check`, Node 24 strict TypeScript/build/Node suite, real offline Chromium/Firefox/WebKit acceptance, independent paired browser cases, previous Passes 11–22 targeted checks and Pass 15 paired visual screenshots all passed [CI 41057021116](https://github.com/oneshubhamt/practice-desk/actions/runs/41057021116). Earlier test-harness repairs included: referencing exported/public validators rather than an internal function; counting per-section elapsed from its correct boundary; checking frozen **Git blob hashes** instead of a branch name unavailable in shallow Firefox/WebKit checkout; and selecting current `.archive-entry` rather than an obsolete History row class. Finally, six independently observed score/maximum pairs were converted from log-only measurements to explicit CI-failing numeric equality assertions. No application source repair was required by the final independent scenarios.

## 2. Content immutability and editorial integrity

| Invariant | Evidence | State |
|---|---|---|
| Five original paper families, 500 source questions, ten source/reviewed editions | Independent Pass 23 direct import + browser pairs; prior Pass 16 all-ten-edition workflow | **PASS** |
| `src/content/papers.json` | Git blob **`1d2c388a91a82c49feb57ccd86a8a40eb7388473`** matches frozen v11 | **PASS** |
| `src/content/patches.json` | Git blob **`37328784aadd53810a786550ce02ff3105fccbd7`** matches frozen v11 | **PASS** |
| `src/content/solutions.json` | Git blob **`ada93d1f27c091023d6a26e9f89dd8956ebaf55e`** matches frozen v11 | **PASS** |
| 6 October 2026 question 62 | Source: invalid/excluded, B gives **0**; Reviewed: editorial **caution**, published B retained and earns **+2**; explanatory dispute only post-test | **PASS; user-approved editorial policy** |
| One offline self-contained HTML | Build/smoke with file:// and no network dependency; output on `overhaul`, not baseline | **PASS (automated)** |
| `main` and `baseline/v11` unmodified | Readback independent of generated HTML, no branch merge/delete | **PASS** |

**Do not accidentally reinterpret Q62 as an independently validated corrected D** or silently remove it from reviewed scoring. Distinguish source preservation from editorial correctness and political/institutional affiliation.

## 3. Numeric parity of actual v11 and overhaul results

Independent `scripts/pass23-independent.mjs` selects the same source date/edition/mode in **both actual HTML apps**, answers the same first and/or selected question, completes the same test, then parses the adjusted result's earned marks and eligible maximum. Unicode minus and decimal formatting are normalized; equality is asserted numerically on every paired case.

| CGL paper | Edition | Mode | v11 earned / eligible max | Overhaul earned / eligible max | Result |
|---|---|---|---:|---:|---|
| 30 September | Source | Full flexible | 2 / 180 | 2 / 180 | **equal** |
| 30 September | Reviewed | Full flexible | 2 / 200 | 2 / 200 | **equal** |
| 6 October | Source | Full flexible | 2 / 190 | 2 / 190 | **equal** |
| 6 October | Reviewed | Full flexible | 2 / 200 | 2 / 200 | **equal** |
| 30 September | Reviewed | Strict 4 × 15-minute sections | 2 / 200 | 2 / 200 | **equal** |
| 6 October | Source | Single section (third) | −0.5 / 48 | −0.5 / 48 | **equal** |

These are **six reproducible representative scenarios, not an exhaustive answer-by-answer comparison of all 1,000 published/reviewed CGL items**. Existing Node scoring tests cover broader combinations; do not extrapolate a universal proof from these six examples.

### Browser / accessibility observations

- Actual frozen v11 and overhaul pages completed **12 paired exam flows** (six each) on `file://`: paper/edition/mode selection, answer, flag, pause/resume when supported, navigation, section or paper completion, result and time tabs, and saved History.
- Actual modern UI protected an imported non-CGL exam with `allowReview=false`: no Review tab/answer-key markup after submission; summary/timing accessible. An imported prompt containing HTML `<img ... onerror=...>` appeared as literal text, not an injected DOM image or executing script; author-source provenance was labelled as importer-supplied.
- Independent responsive browser checks: width **195**, **320**, **390**, **768** and **1280 CSS pixels**; sticky Display trigger and popover visible/in viewport, Escape returned focus, **0 horizontal document overflow** in sampled Library scenes.
- Existing Pass 15 paired `file://` visual checks additionally exercised v11 versus overhaul snapshots for phone 390, tablet 768, desktop 1280, light/dark, 85–140% scaling and 200%-equivalent phone zoom. [CI screenshot evidence](https://github.com/oneshubhamt/practice-desk/actions/runs/41057021116/artifacts/12976653468). **Automated screenshot capture does not equal human aesthetic approval.**

## 4. Original 25 findings: independent closure matrix

The original dated problem statements in [Sections C/D](V11_SOURCE_AUDIT_2026-10-30.md) are retained verbatim and never rewritten to describe the post-repair state. This matrix records current dispositions and active evidence, distinguishing direct Pass 23 checks from earlier targeted regression tests.

| ID | Current outcome / source path | Independent check or retained targeted evidence | Decision |
|---|---|---|---|
| **F01** | Frozen sequential section consumed wall-time in `session.ts`; separate from foreground exposure | Pass23 locked/section-expired engine and Pass18 timing | **VERIFIED automated** |
| **F02** | Selected executable exam preflight shows eligible ceiling, marks and editorial provenance | Pass23 all 10 editions/scoring, Pass20 library | **VERIFIED automated** |
| **F03** | Compatible cross-paper marks priority ranking, accuracy retained separately, max eight records | Pass19 source/cohort history tests; Pass23 code recheck | **VERIFIED automated** |
| **F04** | Historical earned / frozen eligible maximum, mode in archive and recent cards | Pass23 actual completed History; Pass19 unit | **VERIFIED automated** |
| **F05** | Pending Resume separate from last three completed | Pass18/19 actual pending/completed UI; Pass23 source recheck | **VERIFIED automated** |
| **F06** | Full executable timing/navigation/key-policy/storage rules | Pass23 paired selected mode and Pass20 rules | **VERIFIED automated** |
| **F07** | Authored alt preserved; built-in figures identify Q and option | Pass21 source/actual imaged CGL; Pass23 ten-bank media | **VERIFIED automated** |
| **F08** | Qualified editorial status/unknown key correction labels only post-test | Pass23 Q62/caution and Pass21 reviewed/source review | **VERIFIED automated** |
| **F09** | Elapsed, attempt rate, global median, section timer/foreground distinction | Pass23 timing engine, Pass18/14 analytics and browser | **VERIFIED automated** |
| **F10** | Flag/M permitted while paused, no answer/navigation/time mutation | Pass23 paired free pause + Pass21 engine | **VERIFIED automated** |
| **F11** | Native radio arrows, Alt+arrows question navigation, A–D remains | Pass21 focused Chromium, Pass11 regression, Pass23 source recheck | **VERIFIED automated** |
| **F12** | Active-only result markup; no heavyweight hidden review/timing | Pass23 modern Overview DOM; Pass22 direct 100-Q measured comparison | **VERIFIED automated** |
| **F13** | Completed Delete versus two-step unfinished Discard with lifecycle guard | Pass23 deletion policy, Pass18 destructive browser cases | **VERIFIED automated** |
| **F14** | Sticky, keyboard-accessible Display panel even at phone 200% zoom | Pass23 widths 195–1280; Pass20 and Pass15 visual | **VERIFIED automated** |
| **F15** | Persistent independent educational attribution; bundled SSC vs author/import | Pass23 actual paired library/custom import and Pass20 footer | **VERIFIED automated** |
| **G01** | Locked multi-section shared-paper progress is executable | Pass23 locked engine, Pass17 policy tests | **VERIFIED automated** |
| **G02** | Manual sectional expiry freezes till candidate continues | Pass23 manual expiry, Pass17 transition tests | **VERIFIED automated** |
| **G03** | Unanswered award bounded by full credit; ceiling consistent | Pass23 invalid rule rejection/score bound, Pass17 | **VERIFIED automated** |
| **G04** | Multi-select key cardinality validated against candidate bounds | Pass23 adversarial key, Pass17 | **VERIFIED automated** |
| **G05** | Matching key enforces unique right/left endpoints | Pass23 adversarial key, Pass17 | **VERIFIED automated** |
| **G06** | `allowReview=false` enforces post-test answer withholding | Pass23 malicious-author imported real browser + engine, Pass17 | **VERIFIED automated** |
| **G07** | Partial multiple-select edit visible as unsaved, obsolete scored answer cleared | Pass22 durable IndexedDB edit/reload and engine; Pass23 source recheck | **VERIFIED automated** |
| **G08** | Duplicate match rows flagged, labelled and uncommittable until corrected | Pass22 real user interaction, Pass23 duplicate helper | **VERIFIED automated** |
| **G09** | Legal marking envelope, conservative floor, no misleading full ceiling | Pass23 invalid/valid mark bounds, Pass17 extra edge cases | **VERIFIED automated** |
| **G10** | No v11 backup or saved-record migration | Explicit user-approved new-app decision D05/D06; Pass23 v1 backup reject | **ACCEPTED intentional incompatibility** |

**Finding count:** 15 F + 10 G = **25**; **24 automated-verified repairs**, **1 intentional accepted incompatibility**. These are *not* 25 independent physical-device/AT tests. The original audit evidence and implementing source remain the controlling record.

## 5. Release block / untested evidence

**Release assessment: CONDITIONAL.** No automated blocker was reproduced by the final paired CI suite, but actual cross-platform and human approval gates remain outstanding. In particular:

| Outstanding gate | What is actually required | Current state |
|---|---|---|
| Real-device offline lifecycle | Open/reopen/download on actual iOS Safari, Android Chrome, macOS Safari, Windows browser; switch apps, background, force-kill, restore and timer expiry, without data loss or inventing time | **NOT TESTED physically** |
| Real assistive technology | VoiceOver macOS/iOS and NVDA/Windows: landmark order, actual announcements, choices, comparison images, native radio arrows, matching conflict live status, screen focus after tab/route and Display popover | **NOT VERIFIED** |
| Human visual/UX | Review paired v11/current screenshots for usability, readability and content integrity; touch targets, zoom, keyboard-only flow and mobile/desktop ergonomics with real users | **NOT SIGNED OFF** |
| Hostile / large external import | Stress 2,000-question mixed-kind packages, oversized media/backup, storage quota denial/eviction, adversarial security and performance on lower-memory devices | **PARTIALLY tested only; separate audit recommended** |
| Real persistent storage resilience | Browser private mode/space eviction, multi-tab collision and OS-kill recovery on physical devices | **Automated race tests pass; physical failure scenarios open** |
| Published-key and legal endorsements | Independent verification of 500 source items and 131 review patches against legally authoritative official papers; attribution/copyright assessment | **NOT independently authenticated here** |
| Release authorization | Explicit user approval to merge, distribute or declare production-ready | **NOT GRANTED** |

**Next decision:** Use `overhaul` as an engineering acceptance candidate for hands-on validation; do not merge to `main` or declare unconditional v11-superset release until requested manual gates are addressed and the user authorizes promotion. Keep frozen source and branch policy intact. No tool-executed testing has been represented as a physical test.

## 6. Reproducibility and source-of-truth

- Final source tests: `tests/pass23-independent.test.mjs`; browser: `scripts/pass23-independent.mjs` (wired in `.github/workflows/ci.yml`, Node 24, Chromium `file://`).
- Regression suite: `npm run check`, `scripts/smoke-offline.mjs`, targeted Pass18–22, browser Pass11–16 (including actual v11 screenshots), Firefox and WebKit `pass10-platform.mjs`.
- CI evidence: [run 41057021116](https://github.com/oneshubhamt/practice-desk/actions/runs/41057021116) (**checks / Firefox / WebKit all green**) and [paired visual artifact](https://github.com/oneshubhamt/practice-desk/actions/runs/41057021116/artifacts/12976653468).
- Frozen source blob SHA checks run on every Node CI job, including shallow checkouts; main job also checks actual baseline v11 HTML by direct `git show`.
- Original audit and chronological implementer scratchpad: [V11_SOURCE_AUDIT_2026-10-30.md](V11_SOURCE_AUDIT_2026-10-30.md). Current state: [architecture](../architecture/CURRENT_ARCHITECTURE.md), [contracts](../architecture/DATA_CONTRACTS.md), [decisions](../decisions/POLICY_REGISTER.md).
