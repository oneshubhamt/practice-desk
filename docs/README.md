# Practice Desk documentation — canonical map

**Reference:** frozen `baseline/v11` · **implementation:** `overhaul`. **Pass29 (31 Oct): Independent expanded visual/use-case journey matrix PASS** — **184 screenshots/measured scenes, 56 direct frozen-v11 paired CGL comparisons, 7 viewport sizes**, strict/free/single CGL modes, original/reviewed and disputed-key scenarios, 100/140% theme, figure/passage, Results/History and full generic six-kind/FSRS Learning journeys. The broader matrix found and verified **three additional repairs**: History saved-result reopen state (F29-01), zoomed History text overflow (F29-02), zoomed Learning text overflow (F29-03), beyond the 11 original L01–L11 fixes. [Current independent Pass29 report](audits/PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md) · [full CI 4/4 success](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047) · [downloadable scene/geometry/image artifact](https://github.com/oneshubhamt/practice-desk/actions/runs/41164616047/artifacts/13028401081). **Conditional automated acceptance ONLY**: human screenshot appraisal, physical macOS Safari/mobile, NVDA/VoiceOver, device-kill/storage, arbitrary/stress imports and explicit merge/release approval are not established. [Pass23 source/scoring report](audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) remains authoritative for its original source findings.

**Pass30 (31 Oct) — user-requested multiexam Library fixes AUTOMATED-VERIFIED:** [CI 41219746648](https://github.com/oneshubhamt/practice-desk/actions/runs/41219746648) **4/4 green**. The Library now restores accessible **Original / Reviewed** segmented buttons and **actually filters the paper options** to the active edition (custom imports separately grouped); an independent persisted **Untimed practice** checkbox applies to strict/flexible/single and imported examinations with new content-hashed frozen timing; and the app can **download a simple offline APFC/NAT template and import MCQ/NAT banks without user-authored revision hashes**, while retaining the full six-kind JSON contract. New F30-01 extreme-width generic Results overflow source-fixed and browser-verified. [30 measured images / actual three-viewport user journeys](https://github.com/oneshubhamt/practice-desk/actions/runs/41219746648/artifacts/13049019003) · [source-first five-step scratchpad](audits/V11_SOURCE_AUDIT_2026-10-30.md) · [simple and advanced bank authoring guide](architecture/QUESTION_BANK_AUTHORING.md). Source CGL data, `main`, frozen `baseline/v11` unchanged; physical-device/AT/manual release gates remain OPEN.

**Pass31 (1 Nov) — compact v11 exam header/navigator + Mark for review AUTOMATED-VERIFIED:** [CI run 41269749418](https://github.com/oneshubhamt/practice-desk/actions/runs/41269749418) **4/4 successful**. Restored v11's narrow 1130px global header/exam workspace and **240px desktop/252px full-screen question navigator**, 5-column palette, three live section-local status tiles and short answer-key privacy notice; moved lengthy keyboard instructions into accessible expandable help; removed the **redundant top answered/viewed/flagged counter** while preserving labelled timer/coverage bar and visible paper-vs-section clock caption. The former **Flag** action now explicitly shows **Mark for review / Unmark** with active amber highlight, pressed state and marked palette, maintaining shortcuts and lock rules. [13 actual frozen-v11/modern screenshot/geometry scenes and interaction record](https://github.com/oneshubhamt/practice-desk/actions/runs/41269749418/artifacts/13069130854). The expanded Pass29 184-scene matrix still passes. Verified self-contained HTML refreshed on `overhaul` via CI commit [`dd69059d`](https://github.com/oneshubhamt/practice-desk/commit/dd69059d7cfc280c8fd6d9f98fd90a9c66f50ec4); original/reviewed content, `main` and frozen `baseline/v11` unchanged. **Human visual, actual devices/AT and release/merge gates remain open.** [Active five-stage audit and QA record](audits/V11_SOURCE_AUDIT_2026-10-30.md).

**Pass32 (1 Nov) — native Navigation API + renderer separation AUTOMATED-VERIFIED:** Practice Desk now uses the browser's **native Navigation API only** for Library/History/Learning/Exam/Result screen navigation, with same-file query routes, Back/Forward, push/replace and saved-screen reloads; there is **no hash router, History API fallback, compatibility layer or migration path**. `screen-renderer.ts` owns DOM/focus/announcements while `generic-ui.ts` coordinates frozen session checkpoint/restore. The final Results CI below re-ran the native file:// Back/Forward/reload/bad-attempt/result-tab journey plus Firefox/WebKit successfully. [Architecture plan](architecture/NATIVE_NAVIGATION_REFACTOR_PLAN.md) · [active audit record](audits/V11_SOURCE_AUDIT_2026-10-30.md).

**Pass33 (1 Nov) — v11-style Results hierarchy with overhaul evidence AUTOMATED-VERIFIED:** [CI 41276303881](https://github.com/oneshubhamt/practice-desk/actions/runs/41276303881) **4/4 green**. The Results screen now uses v11's compact information architecture: **1130px shell, compact Attempt analysis header, pill Insights / Answer review / Question times tabs, one Performance overview, paired Time & pacing + Section diagnostics, compact score opportunities, evidence-gated Speed × accuracy, compact answer revisions, dense actionable longest-question visits and next-work coaching**. The persistent brand masthead is intentionally absent on Results while fixed `Aa` Display access remains. Overhaul-only eligible maxima, exclusions, source-key comparison, scoring bounds, manual assessment, timer/foreground evidence, source/reviewed provenance, no-review policy, six-kind imports and APFC/NAT remain. [7 measured frozen-v11/current + responsive result scenes](https://github.com/oneshubhamt/practice-desk/actions/runs/41276303881/artifacts/13071368653); desktop result content is 1090px inside the same 1130px main shell in v11/current, and representative Performance overview is 341.8px v11 vs 351.7px current. Verified generated HTML: [`f2a44721`](https://github.com/oneshubhamt/practice-desk/commit/f2a4472179c419cf69b6bd7291a75045efb7c4c2). **Manual aesthetics, physical devices and screen-reader signoff remain open; no merge to `main` is implied.** [Results design contract](architecture/RESULTS_V11_PARITY_PLAN.md).

**Pass34 (1 Nov) — v11 Aa display button AUTOMATED-VERIFIED:** [CI 41280845213](https://github.com/oneshubhamt/practice-desk/actions/runs/41280845213) **4/4 green**. The `Aa` control now matches v11's **compact floating top-right trigger** on Library, History, Learning, Exam and Results: 43×41px desktop / 39×38px phone, light/dark styles, compact anchored popover and fixed-on-scroll position. **Overhaul-only controls remain**: persisted font scaling, Light/Dark plus toggle, full-screen fallback, screen-reader label and Escape/close focus. [25 actual frozen-v11/current/cross-screen measured screenshot states](https://github.com/oneshubhamt/practice-desk/actions/runs/41280845213/artifacts/13072898582) · [verified offline HTML commit `1dfff21d`](https://github.com/oneshubhamt/practice-desk/commit/1dfff21d38ac6c5c9e7aa2cda2482addb691f90f). Source scoring, persistence, native navigation, generic imports and previous Results parity remain untouched; frozen v11's 195px overflow is not copied. Physical-device/AT/human screenshot signoff remains open; no merge to `main`. [Five-step scratchpad](audits/V11_SOURCE_AUDIT_2026-10-30.md).

## Read in this order

| Need | Canonical location | Type |
|---|---|---|
| **Add APFC/NAT question banks and reusable exams** | [Easy authored MCQ/NAT JSON bank guide and exact format](architecture/QUESTION_BANK_AUTHORING.md) | Lightweight hash-free import plus advanced six-kind versioned packages; file:// offline, question scoring and timers unchanged |
| **Current independent multi-journey visual audit** | [Pass29, 184-screen matrix, 56 paired v11 scenarios, three new findings](audits/PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md) | Automated 4/4 CI PASS; conditional, manual/physical/AT release gate still open |
| **Original visual regression and repair history** | [Pass24 laptop source and Passes25–29 repair register](audits/PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md) | 11 original + three newer findings source-fixed and browser-verified |
| **Final verification / outstanding release gates** | [Pass 23 final independent audit and release report](audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) | All 25 current finding dispositions, six actual paired score/max checks, full automated CI evidence, explicit physical/AT/manual limitations and conditional status |
| **Original findings and chronological worklog** | [Independent V11 source audit / active scratchpad](audits/V11_SOURCE_AUDIT_2026-10-30.md) | Preserves the 25 original problem statements, Passes 17–23 reasoning, evidence, accepted deviations and handoffs |
| **Current architecture** | [Source topology, modules and lifecycle](architecture/CURRENT_ARCHITECTURE.md) | Current system, not historic proposals |
| **Data and scoring integrity rules** | [Data contracts](architecture/DATA_CONTRACTS.md) | Current contracts and known implementation gaps |
| **Non-negotiable engineering choices** | [Decision/policy register](decisions/POLICY_REGISTER.md) | Binding user-approved decisions, accepted exceptions |
| **All Passes 4–16 work, original checklists and full parity matrix** | [Consolidated historical engineering record](history/PASSES_04_16.md) | Complete archived implementation rationale and older acceptance notes |
| **Why overhaul began / early v11 audit** | [Frozen original v11 architectural assessment](history/BASELINE_V11_ARCHITECTURE.md) | Historic starting diagnosis, not current status |
| **Contribution and build** | [Root README](../README.md) · [root AGENTS](../AGENTS.md) | Entry, branch safety, five-step source-first workflow |

## Information hierarchy

```text
README.md                    concise product / build / entry points
AGENTS.md                    binding developer constraints
docs/
  README.md                  this navigation and evidence hierarchy
  architecture/
    CURRENT_ARCHITECTURE.md  present source/runtime map
    DATA_CONTRACTS.md        immutable records, rule invariants, persistence
  decisions/
    POLICY_REGISTER.md       approved decisions and deliberate exceptions
  audits/
    V11_SOURCE_AUDIT_2026-10-30.md  original 25 findings and active engineering worklog
    PASS29_INDEPENDENT_VISUAL_MATRIX_2026-10-31.md  current paired journey and screenshot report
    PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md  conditional final audit and manual-release gates
  history/
    BASELINE_V11_ARCHITECTURE.md    frozen original audit
    PASSES_04_16.md                complete development history
```

## Evidence and status precedence

1. **Verified current code** for what actually exists; source-only assessment does not prove behavior on a real device.
2. **Explicit user policy decisions**, written in the decision register, control intentional deviations and releases.
3. **Independent audit findings**, with current automated verification in the Pass 23 report. Differentiate previously repaired code from actual physical-device/human risks and unapproved release gates.
4. Existing automated tests/CI/screenshots are regression evidence; the **new** Pass 23 paired frozen v11-versus-current browser tests add independent representative source/behavior proof, **not** exhaustive UI/device/assistive-technology proof.
5. Historical per-pass checkmarks and preliminary scratchpad hypotheses are **archival**, not live release certification.

The original 15 `docs/*.md` files that informed Passes 4–16 were consolidated without silently discarding their text. The entire prior document tree remains permanently available at [Git commit `d4c36f928605`](https://github.com/oneshubhamt/practice-desk/tree/d4c36f9286059af970be342a7a894415517087aa/docs). Their working content and design decisions are folded into [PASSES_04_16.md](history/PASSES_04_16.md); the original v11 audit is separately archived.

## Changes and maintenance

- Keep this index and root README short. The dated Pass 23 report is the single final independent evidence matrix, not a competing implementer scratchpad. Do **not** recreate per-pass acceptance documents or duplicate historical checklists.
- Update architecture/data contracts only for actually implemented changes.
- Append explicit user-approved deviations to the decision register; don't bury decisions in a dated narrative.
- Create dated audits in `docs/audits/` with source branch SHAs, v11 comparison matrix, severities and open/closed reasons. Keep audit findings OPEN until code is repaired, re-reviewed and objectively verified.
- When implementing fixes: **audit → analyze → implement → reconcile objectives → targeted new QA**. Avoid relying solely on preexisting fixtures.
- Separate automatic source/runtime verification from real iOS/Android/macOS Safari, NVDA/VoiceOver, forced storage loss, manual keyboard navigation and human visual signoff.
- Only the user can approve merging into `main`; retain frozen `baseline/v11` intact.
