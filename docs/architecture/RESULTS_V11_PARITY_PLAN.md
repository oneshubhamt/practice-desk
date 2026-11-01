# Practice Desk — Results UI parity programme

> **ARCHIVED / COMPLETED.** Dated v11 Results presentation programme implemented/verified in Pass33–35. Mandatory v11 screenshots and exact geometry are **not future-development gates**. Preserve actual Result/Review/Timing clarity and score/source correctness; future design may improve independently. See [Consolidated Engineering Programme](../ENGINEERING_PROGRAMME.md) and [current QA](../QA_CURRENT.md). Original design retained below as historical evidence.

**1 November 2026 · `overhaul` only · IMPLEMENTED + AUTOMATED VERIFIED**

Pre-implementation contract was committed before source work. Final automated evidence: [CI 41276303881](https://github.com/oneshubhamt/practice-desk/actions/runs/41276303881) **4/4 green**; [Pass33 artifact 13071368653](https://github.com/oneshubhamt/practice-desk/actions/runs/41276303881/artifacts/13071368653) contains seven measured/screenshotted result states. CI refreshed the verified offline HTML in commit `f2a4472179c419cf69b6bd7291a75045efb7c4c2`. Physical-device/AT/human aesthetic signoff remains separate.

## Goal

Restore the **v11 result-screen visual language and information hierarchy** while retaining the overhaul's stronger result semantics and generic exam capabilities. This is not a rollback of data contracts, scoring, timing, provenance, Navigation API routing, imported exams, accessibility or Learning functionality.

The design target is: **v11 hierarchy, density and progressive disclosure; overhaul evidence model underneath.**

## Screenshot/source baseline

User-provided screenshots: first four are frozen `baseline/v11`, remaining four are current `overhaul`.

Frozen source audit:
- `baseline/v11/src/app/legacy.ts` — `drawResults`, `insightsHTML`, `markOpportunityHTML`, `matrixHTML`, `answerRevisionHTML`, `questionTimesHTML`.
- `baseline/v11/src/styles/app.css` — 1130px result shell; compact scoregrid; pill result tabs; 2-column insight grid; compact metric lists, score-opportunity cards, question-speed list, zero-state discipline.
- `overhaul/src/app/generic-ui.ts` — frozen six-kind result data, source/reviewed provenance, manual grading, eligible maxima/lower bound, result routing and review actions.
- `overhaul/src/app/result-presentation.ts` — tabs, section pacing, timing ledger, longest exposure, study suggestions.
- `overhaul/src/learning/attempt-evidence.ts` / `answer-revisions.ts` — evidence calculations. Preserve them.

## Design invariants

1. **Do not change scoring or persistence.** Result UI consumes frozen result/evidence only.
2. **Do not change Navigation API semantics.** Tabs remain URL-level result routes; question-specific review actions continue to use native navigation.
3. **Do not delete overhaul-only evidence.** Reclassify it into primary, secondary, conditional, or detail disclosure.
4. **No empty analytical machinery.** When classification evidence is insufficient, render one short explanatory state; do not render zero-value Fast/Typical/Slow cards or disabled review links.
5. **No duplicate first-level metrics.** Attempt rate, accuracy, timer and foreground exposure should each have one primary home.
6. **Generic first.** Every layout must work for SSC CGL, imported APFC/NAT, six response kinds, multi-section/untimed, manual assessment and no-review exams.
7. **Accessibility remains first-class.** Existing tab roles, focus restoration, live announcements, keyboard navigation and 195px overflow protection remain.
8. **v11 is visual reference, not runtime source.** Reuse typed overhaul components/classes; never paste monolithic legacy logic.

## Target information architecture

### 1. Compact result header
- Title: **Attempt analysis**
- Human-readable line: paper title/id · edition · practice mode · completion date/time
- History + Library actions
- Move technical provenance (`Frozen exam record`, raw revision IDs, completion reason, source key details) into compact secondary detail rather than headline hierarchy.
- Desktop result width target: v11-like ~1130px.

### 2. Result tabs
- Labels: **Insights · Answer review · Question times** (use v11 terminology).
- Restore pill-like active treatment and compact border rhythm.
- Keep native route semantics and ARIA tab contract from overhaul.

### 3. Performance overview
One named panel containing:
- score standout;
- Correct / Incorrect / Unanswered / Excluded;
- concise score arithmetic/comparison line where applicable;
- compact section table.

Keep overhaul's eligible maximum and exclusion/manual semantics. Move conservative lower bound, original-source score comparison, manual self-assessment explanation and answer-disclosure policy to a compact **Scoring details** disclosure under the panel.

### 4. Time & pacing + Section diagnostics
Two-column desktop block like v11.

**Time & pacing**
- Test timer used
- Median per answered question
- Foreground question exposure captured
- Attempt rate
- Accuracy (valid/scored attempts)
- one concise methodology line

**Section diagnostics**
- per-section attempted/eligible and accuracy
- coverage progress bar
- timer value when reliably recorded
- optional secondary foreground exposure label

This replaces the current separate first-level Section pacing & coverage panel and large evidence table.

### 5. Score improvement opportunities
Use v11's three compact cards:
- observed negative marks
- wrong → correct hypothetical gain
- skipped → correct hypothetical gain
with direct review actions. Retain generic scoring arithmetic from `attemptEvidence`, never hard-code CGL marks.

### 6. Speed × accuracy
- If evidence is insufficient: one compact panel with the threshold explanation only.
- If sufficient: show three meaningful Fast / Typical / Slow cells and review links only where applicable.
- Never display large empty zero cards.

### 7. Answer revisions
- If recorded: compact badges/chips for modified, rescued, lost, other changes.
- If no sequence exists: concise unavailable explanation.
- Avoid four large metric cards for all-zero state.

### 8. Question-speed insights / longest exposure
- Compact v11-style list density.
- Keep overhaul's verdict labels and direct `Review →` actions.
- Keep distinction between cumulative foreground exposure and uninterrupted visit duration.

### 9. What to work on next
- Compact panel, evidence-based suggestions only.
- Keep overhaul's responsible caveat, but visually subordinate it.

### 10. Advanced evidence
Retain, but progressively disclose:
- original-source key comparison;
- scoring envelope/lower bound;
- manual self-assessment details;
- answer-key/review disclosure restrictions;
- raw timer/foreground methodology where useful.

## Source design

Prefer adding reusable presentation helpers in `result-presentation.ts` rather than expanding `generic-ui.ts`.

Proposed helpers:
- `resultOverviewMetaHTML`
- `resultPacingHTML`
- `scoreOpportunityHTML`
- `speedAccuracyHTML`
- `answerRevisionHTML`
- retain/rework `questionCoachingHTML`

`generic-ui.ts` remains coordinator for frozen result data, provenance and review actions.

CSS should introduce result-scoped classes/tokens rather than alter Library/History globally.

## Implementation stages

### R33-A — source audit and mapping
Document every current Result datum/action and its target location. Identify duplicate/conditional content. No code until this stage is committed.

### R33-B — shell + top hierarchy
Result width/header/tabs; Performance overview composition; Scoring details disclosure. Preserve all IDs/route tabs/actions.

### R33-C — insights composition
Build Time & pacing + Section diagnostics; Score opportunities; conditional Speed × accuracy; compact revisions; compact longest exposure and next-work sections.

### R33-D — responsive/dark/accessibility
Match v11 density at 1366/1440, preserve phone/tablet and 195px support; verify focus, tab route, scroll-to-review, no-review exams and Display controls.

### R33-E — targeted QA and regression
New actual `file://` visual/DOM journey:
- same representative v11/overhaul CGL state where feasible;
- low-data result (insufficient speed evidence);
- sufficient-data result;
- excluded/caution source vs reviewed;
- multi-section;
- generic imported six-kind/manual item;
- APFC/NAT;
- result tabs, direct review actions and Navigation API URLs;
- dark/light; 1366/1440/390/195 widths.

Keep Pass29 matrix, Pass31 compact exam shell, Pass32 native navigation, cross-browser offline jobs and existing scoring/source suites. Do not relax assertions to get green.

## Acceptance criteria

- [x] Result first fold is recognisably v11-like in hierarchy and density.
- [x] 1130px-ish desktop result shell; no unnecessary persistent analytical chrome.
- [x] Performance overview is one named primary panel.
- [x] Time/pacing and section diagnostics use compact two-column composition.
- [x] Score opportunities are compact and generic-arithmetic correct.
- [x] Insufficient speed evidence renders a short state, not zero cards.
- [x] Revision zero state is compact.
- [x] Longest exposure remains actionable via Review links.
- [x] All overhaul-only evidence remains accessible.
- [x] Native result routes, six-kind exams, manual grades, source/reviewed provenance and no-review policy show no functional regression.
- [x] New targeted browser suite + existing mandatory CI are green.

## Final automated evidence

- Frozen-v11/current desktop geometry at both 1366×768 and 1440×900: **1090px content width inside a 1130px main shell** in both. Result tab height is **47.1px** in both; heading→tabs and tabs→Performance relative spacing remains within the 6px parity gate after intentionally removing the persistent v11 masthead from the user-preferred result composition. Performance overview measured **341.8px v11 vs 351.7px overhaul** in the representative low-data state.
- Pass33 verifies low-data suppression (no empty Fast/Typical/Slow machinery), reviewed sufficient-evidence speed cells, compact revision state, scoring-details disclosure, direct opportunity→review routing, floating Display access, and no document overflow at 390px and 195px.
- Existing Pass29 expanded matrix remained green, as did Pass32 native Navigation API journeys, source/scoring suites, and Firefox/WebKit offline acceptance.
- Preserved evidence includes eligible maxima, excluded/defective handling, original-source comparison, conservative scoring bounds, manual self-assessment, timer vs foreground distinction, source/reviewed provenance, no-review policy, generic six-kind exams and APFC/NAT imports.

**Non-inference:** automated screenshot geometry and browser flows do not constitute human aesthetic approval, physical-device certification or NVDA/VoiceOver signoff.

