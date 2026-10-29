# v11 feature-parity restoration programme — Passes 11–16

> **CURRENT, AUTHORITATIVE FEATURE-PARITY PROGRAMME · 30 October 2026 · PLANNED, NOT IMPLEMENTED**
>
> New source-to-source audit performed against frozen `baseline/v11` commit `e661822d865927e89a837790c1c6bc1cfc2562a6` and `overhaul` commit `5b9dce604faef10a714415341c7da5116bf6ff8a`. This document is the source of truth for **v11 feature parity** from Pass 11 onward, superseding the old [Pass 9 parity ledger](V11_PARITY_LEDGER.md). No parity fixes were made by the documentation-only creation of this plan.
>
> **Verdict: full v11 UI/functionality parity NOT achieved. Release signoff NOT granted.** Existing automated success is necessary but insufficient: the source audit identified missing controls, review detail, history management, analytics and presentation differences. Physical device, assistive-technology and side-by-side rendered-visual checks remain outstanding.

## 1. Scope, ground rules and evidence hierarchy

**Goal:** Preserve every material v11 UI control, information affordance and behavioral workflow in the modern typed app **unless explicitly waived**, while keeping the newer source-integrity, exam-generic, learning, recovery, backup and data-model improvements. A redesign may look different, but may not silently omit functionality. Do **not** transplant `legacy.ts`, introduce a second exam/history runtime, make a network/server requirement, or hand-edit generated offline HTML.

**Frozen reference files:**
- [v11 runtime](https://github.com/oneshubhamt/practice-desk/blob/baseline/v11/src/app/legacy.ts) — view builders and event handlers, in particular lines 42–49 (appearance), 50–112 (session, timing, storage), 113–125 (home and exam), 126–171 (results and review), 172–200 (history/backup).
- [v11 stylesheet](https://github.com/oneshubhamt/practice-desk/blob/baseline/v11/src/styles/app.css) and [v11 template](https://github.com/oneshubhamt/practice-desk/blob/baseline/v11/src/template.html).
- [overhaul exam and results UI](../src/app/generic-ui.ts), [session engine](../src/engine/session.ts), [history UI](../src/app/history-page.ts), [result presentation](../src/app/result-presentation.ts), [preferences](../src/app/preferences.ts), [bootstrap](../src/app/bootstrap.ts), [CGL importer](../src/content/import-cgl.ts), [package/model](../src/app/exam-package.ts), [stylesheet](../src/styles/app.css) and [template](../src/template.html).
- Immutable data: `src/content/papers.json`, `patches.json`, `solutions.json` (original question banks remain separate).
- [Data-model guarantees](DATA_MODEL.md), [consolidated programme/status record](PROJECT_STATUS.md), [historic architecture audit](ARCHITECTURE_AUDIT_2026-10-28.md).

**Evidence precedence:** inspect the actual source of *both* branches -> trace rendering + real event handler + state/engine + persistence + display/score output -> compare behavior on realistic source content -> targeted automated E2E and direct side-by-side screenshots -> physical devices/AT when applicable. Unit tests, historic QA fixtures, prior ledgers, CI-green indicators, code-name matches and claims from earlier passes **are not themselves evidence that a v11 feature exists**.

**Status tags:** `PRESENT` = directly traced, `PARTIAL` = only some of the v11 behavior is present, `MISSING` = no equivalent surfaced in examined runtime, `CHANGED/DECISION` = non-identical behavior to accept or address, `UNVERIFIED` = requires browser/device/visual confirmation, `DONE` = repaired and independently checked. **Every entry in the gap matrix starts OPEN**; do not mark DONE when code was merely authored.

## 2. Direct-source baseline inventory: functionality already substantially preserved

| v11 capability | Source-traced overhaul equivalent | Audit status / limit |
|---|---|---|
| Five SSC CGL papers and original/reviewed editions | `importCglBank`, `builtinCglPackages`; same source/review/solution JSON banks | PRESENT; rendering of corrections not fully preserved |
| Four locked, sequential 15-minute CGL sections | `configureCglPractice(strict)`, sectional engine, `SUBMIT_SECTION`, engine section locks | PRESENT |
| Flexible full paper: 60 min and cross-section navigation | `configureCglPractice(free)`, whole-paper clock + free sections | PRESENT |
| Selected-section practice: 25 Q / 15 min | `configureCglPractice(single)` | PRESENT |
| A–D answer selection, clear, flag, prev/next, 25-Q palette | `renderModelExam`, `renderGenericControls`, `dispatch` | PRESENT via click/touch; keyboard parity MISSING |
| Pausing only outside strict mode, reopening saved attempts | Policy-aware session engine, frozen history, recovery | PRESENT; timer display away from exam differs |
| Correct/wrong/unanswered/excluded scoring | Typed `scoreAttempt`, frozen keys, result UI | PRESENT; some visible score context omitted |
| Home paper picker, modes, resume, recent tests | `listHTML` | PRESENT but edition selection and setting retention changed |
| Result overview, sections, time, question review | `resultHTML`, `result-presentation.ts` | PARTIAL: detailed v11 analysis/review affordances missing |
| Source page, editorial notes, source references, worked solutions | `import-cgl.ts`, `builtinCglPackages`, `frozenReviewMedia`, `resultHTML` | PRESENT in data; original-versus-reviewed comparison MISSING |
| History list, delete one, chronological sorting, JSON export/import | `historyHTML`, generic history handlers/backup v3 | PRESENT; bulk delete/filter/quota/persist and v1 backup behavior changed |
| Light/dark theme, font 85–140%, popover, fullscreen request | `bootstrap.ts`, `preferences.ts` | PARTIAL: immersive fallback and exam entry point absent |
| Responsive layout, offline single HTML | `app.css`, `template.html`, build | PRESENT in implementation; actual visual/device parity UNVERIFIED |

**Existing improvements that MUST survive:** generic six-question-kind exam model; strict TS; frozen and hashed content and media; separated original/source scoring; honest manual grading; FSRS-7 user-rated cards; generated revision exams; optimistic stale-tab rejection; atomic/additive checksum-verified backup v3; localStorage fallback and UNSAVED_RECOVERY; keyboard access on existing new result tabs; honest descriptive analytics. Do not degrade these to recreate v11.

**Content audit facts:** 5 papers × 100 questions = 500 source questions (10 editions). 433 source questions `ok`, 34 `invalid`, 33 `caution`. Reviewed patch bank: 131 patched questions, including 121 stem edits, 25 option edits, 47 key edits and 131 editorial notes. Source media includes 32 stem-image questions, 15 questions with option images, and 25 passage-linked questions. Preserve multiline text, source/option diagrams, passages and source keys in both active and historical review; verify representative actual examples, not only a synthetic fixture.

## 3. Independent source audit: confirmed exam-workspace gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| E01 | **P0** | A–D answer, plain ←/→ navigate, M flag, F fullscreen | Exam keyboard handler only recognizes **Alt+←/→** | v11 `legacy.ts` 202; new `generic-ui.ts` 966–977 | OPEN |
| E02 | P1 | Keyboard navigation available during focused choice workflow | New Alt+arrow handler ignores key events from INPUT/TEXTAREA/SELECT; radios are INPUT | new `generic-ui.ts` 966–976 | OPEN |
| E03 | P1 | Fullscreen button in test header | Exam header lacks fullscreen action; only global Display panel controls fullscreen | v11 124–125; new `generic-ui.ts` 194–200 | OPEN |
| E04 | P1 | Blocked native fullscreen falls back to in-page immersive focus layout | New fullscreen code only displays unavailable notice on failure | v11 46–48; new `bootstrap.ts` | OPEN |
| E05 | P1 | Section tabs show answered/25 and Closed/Locked | New section buttons show names/disabled states, not the v11 per-section counts/status labels | v11 124; new `generic-ui.ts` 206–211 | OPEN |
| E06 | P1 | Leaving running test asks confirmation and explains running timer | New Library handler returns directly, without confirmation | v11 100; new `generic-ui.ts` 834 | OPEN |
| E07 | P1 | Starting another while an attempt exists requests confirmation | New Start creates another pending attempt, preserving former, without explaining behavior | v11 103; new `generic-ui.ts` 795–807 | OPEN |
| E08 | P2 | Active question displays section-relative **and original paper Q number** | New exam question label primarily section-relative; paper position is not surfaced equivalently | v11 124; new `generic-ui.ts` 211–213 | OPEN |
| E09 | P1 | Timer settlement also runs when viewing library/history | New 1s tick returns unless `view === "exam"`; restore reconciles elapsed on reopen, but expiration UI can lag | v11 205; new `generic-ui.ts` 946–963, 728–739 | OPEN / DESIGN REVIEW |

**Engine safety:** shortcuts may never mutate answers during pause, bypass locked/forward-only rules, interfere with text/numeric entry, or let letter keys trigger browser UI. For E09 ensure a consistent one-time expiration transition in any view without excessive storage writes/redraws. Strict section early-submit must still begin a full fresh 15-minute allocation.

## 4. Independent source audit: confirmed result/review gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| R01 | **P0** | For corrected Q, expandable **Compare with original PDF version**: original stem, options, page, original published key | Missing from rendered question reviews; aggregate source-key score does not replace question-level comparison | v11 167; new `generic-ui.ts` 690–725 | OPEN |
| R02 | **P0** | Correct answer and user's incorrect choice have distinct option-level highlight; image choices included | New review renders options without correct/incorrect visual classes, and reports Expected/Your answer separately | v11 114,167; new `generic-ui.ts` 584–601, 701–714 | OPEN |
| R03 | **P0** | Main score shows adjusted earned **/ eligible maximum**; section table shows attempted/right/wrong/marks/max/time | New main score card shows earned but no eligible maximum; section table is less detailed | v11 137–138; new `generic-ui.ts` 610–618, 661–678 | OPEN |
| R04 | P1 | Timing ledger includes Visits and Speed as well as Time/Changes | New ledger lacks both columns; current response model has no explicit visit count | v11 169; new `result-presentation.ts` `timingLedgerHTML` | OPEN |
| R05 | P1 | Review filter **Key-audit notes** (corrected/caution etc.) | No equivalent filter of all review-audit items | v11 168; new `result-presentation.ts` `ReviewFilter` | OPEN |
| R06 | P1 | Filter **Typical-speed incorrect** | New filters contain fast/slow incorrect, not typical-speed incorrect | same source files | OPEN |
| R07 | P1 | Five longest question visits with direct review links | Not surfaced as ranked list | v11 135,156; new `resultHTML` | OPEN |
| R08 | P1 | **What to work on next** contextual recommendations based on low accuracy, coverage, speed | New displays descriptive evidence without equivalent recommendations | v11 140–145,157; new `resultHTML` | OPEN |
| R09 | P2 | Expandable solving approach; expanded by default when correction needed | New prints explanation as plain text, no per-question disclosure | v11 159–166; new `generic-ui.ts` 713–714 | OPEN |
| R10 | P2 | Explicit `Top ↑` review navigation | No equivalent dedicated control | v11 168; new `resultHTML` | OPEN |
| R11 | P2 | Completion labels for time expiry/section early submission | New result header does not consistently distinguish end reason | v11 152; new `resultHTML` | OPEN |
| R12 | P1 | Per-item detailed audited status, publisher vs reviewed key where changed, change log | New shows editorial status and some notes but not full individual original-version provenance | v11 167; new `resultHTML` | OPEN / overlaps R01 |

**High-priority distinction:** 131 reviewed question patches, including wording/options/key updates, have **data provenance** in the modern implementation but lack the v11 **user-visible original-versus-reviewed comparison**. Preserve source questions/keys unchanged; show differences only after submission. Render chosen/correct option information from **frozen attempt key and responses**, not a mutable current paper or an implicit option index. Include both normal text and image options, editorial excluded/pending states and accessible non-color verdict text.

## 5. Independent source audit: confirmed history/settings gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| H01 | **P0/P1** | Delete all completed records with two destructive-action confirmations | New archive supports only individual delete | v11 200; new `history-page.ts` and `generic-ui.ts` 765–781 | OPEN |
| H02 | P1 | Exact paper/edition dropdown filter | Archive search plus completion-status filter, no exact picker | v11 184–185; new `history-page.ts` | OPEN |
| H03 | P1 | Storage quota/usage estimate via `navigator.storage.estimate()` | Missing from current History UI | v11 186; new `history-page.ts` | OPEN |
| H04 | P1 | Explicit `Protect stored data` via `navigator.storage.persist()` | Missing current action | v11 187; new `history-page.ts` | OPEN |
| H05 | P1 | Persist selected paper, edition, mode and practice section | New local preference schema persists only theme/font size; CGL mode and choice reset on reopen | v11 39–42,84,118–122; new `preferences.ts`, `generic-ui.ts` 256+ | OPEN |
| H06 | P1 | History shows best adjusted %, papers practised | New counters replace these with attempts/status/observed accuracy | v11 184; new `history-page.ts` | OPEN |
| H07 | P1 | History score-based progression for matching paper/mode | New trend charts observed answering accuracy for exact revisions; score progression absent | v11 173–181; new `history-page.ts` | OPEN |
| H08 | P2/decision | Backup v1 import merges newer matching-ID records | Backup v3 import is additive/non-overwriting | v11 196–198; new `history/backup.ts`, `generic-ui.ts` | OPEN / DECISION |
| H09 | P2 | Visible IndexedDB/fallback status panel in History | Failure banners exist; old status/quota panel not retained | v11 184; new `history-page.ts` | OPEN |
| H10 | EXCEPTION | Read previous v11 local IndexedDB/backup v1 | Clean break: new `practiceDesk.overhaul.v1` data and backup v3; no legacy migration | v11 17–20,89,196–198; new `DATA_MODEL.md` | **Accepted explicit exclusion**, unless user changes requirement |

**Safety details for H01:** delete *only completed attempt* records; leave pending attempts, learning cards, imported packages and display settings untouched; support fallback/IndexedDB, stale tab conflicts, denied writes and backup confirmation. Do not silently replace additive v3 import behavior with risky overwrite: decide H08 explicitly.

## 6. Visual / presentation / accessibility differences (not marked resolved)

| ID | Severity | Difference or unverified property | Acceptance requirement | State |
|---|---|---|---|---|
| V01 | P1 | v11 header vs redesigned header and Display placement | Side-by-side desktop/mobile inspection; retain accessibility and keyboard access | UNVERIFIED |
| V02 | P1 | v11 paper/date picker + explicit two-choice edition toggle vs combined dropdown | Restore clear edition distinction and inspect ease of selection | OPEN |
| V03 | P1 | v11 large custom A–D selection buttons vs native radio labels | Keep accessible native semantics **and** restore obvious visual affordance, keyboard shortcuts and image handling | OPEN |
| V04 | P1 | v11 review option highlights and status hierarchy vs generic response listing | Non-color accessible correct/incorrect/excluded visualization; R02 | OPEN |
| V05 | P1 | v11 result max-marks/section table hierarchy vs new summary | Show equivalent metrics prominently; R03 | OPEN |
| V06 | P1 | v11 history management information and storage panel vs new archive | H01–H09 available and readable on all target sizes | OPEN |
| V07 | P1 | v11 templates included `aria-live="polite"` on `#app`; new template removes it | Verify dynamic announcements with AT; avoid chatty full-page live region if better targeted status regions | UNVERIFIED |
| V08 | P1 | Responsive layouts structurally redesigned, not pixel-identical | Side-by-side desktop/tablet/phone screenshots, touch hit areas, no clipping, scroll/focus/zoom | UNVERIFIED |
| V09 | P1 | Global fullscreen uses native API only | Restore v11 functional immersive fallback; E03–E04 | OPEN |
| V10 | P2 | Theme two distinct Light/Dark buttons changed to one toggle | Either restore explicit selection or document/evaluate equivalent discoverability, screen-reader state | OPEN / DECISION |

**Visual audit boundary:** Both branches have responsive CSS; newer CSS includes focus indicators, dark-mode variables and responsive grids. **No pixel-parity, preference ranking or actual physical-device approval is inferred from CSS alone.** Source stylesheets have distinct DOM/selector architectures, so tests for element existence cannot stand in for screenshots. Visual design may improve while preserving functional floor; pixel-identical reimplementation is **not** required.

## 7. Explicit policy and semantics requiring decisions

| ID | Issue | Decision / handling |
|---|---|---|
| C01 | Source-invalid reviewed CGL item: 6 Oct 2026 Q62 is not patched; v11 reviewed transformer treated source invalid/caution as caution, whereas new importer retains invalid | **Do not silently alter scoring** to mimic old behavior. Examine source, audit rationale and original/reviewed semantics; document why exclusion or caution is warranted. Regression is a genuine score-policy difference. |
| C02 | v11 backup v1 / local data migration | **Accepted out of scope**, because overhaul is a new product, not a migration of real production history; review only if user changes this. |
| C03 | v11 newer-copy import replacement vs safer additive v3 | Retain additive v3 by default; document explicit difference, decide whether separate *review/replace* action is desirable. No blind overwrite. |
| C04 | v11 score-based trends vs new observed accuracy | Add score-based view for **identical frozen paper/key/mode**; keep accuracy trends. Never compare arbitrary paper difficulties as if normalized scores were interchangeable. |
| C05 | v11 single-question timing visits and wall clock | Record real visits going forward; never fabricate for existing stored attempts. Foreground exposure is not thinking time; monotonic live clock cannot authenticate offline wall time. |
| C06 | Modern semantic accessibility | Keep native controls, focus, ARIA, sufficient contrast, reduced-motion, and no key interception in editable fields. Historical keyboard bindings may need scope adjustments to protect accessibility. |

## 8. Six-pass implementation plan (Passes 11–16)

Each implementation pass **must** run five phases: **(1) Audit** actual v11 and new sources + update this file; **(2) Analyze** design/invariants, UI states, policy, risk; **(3) Implement** minimal well-typed changes on `overhaul`; **(4) Check each matrix row against its acceptance criteria** (no generic assertion); **(5) Targeted QA** of changed feature *and nearby existing behavior*, using direct browser comparison where relevant. On failure, iterate within the same pass. Record exact commit, evidence and remaining gaps. Start each pass by reading [AGENTS](../AGENTS.md), this document and [data model](DATA_MODEL.md).

### Pass 11 — Exam-taking UX, shortcuts and policy consistency

**Targets:** E01–E09, related V03/V09; ensure no answer leakage or exam-policy bypass.
- Inspect v11 home/exam markup, all key handlers, fullscreen CSS, timer state and prompts. Compare with modern render and focus/keyboard routing on actual question options.
- Restore **A–D**, M, F, normal arrows in exam context; retain optional Alt+arrows. Key handlers only when safe (no typing controls/contenteditable, modal/popup, unsafe modifiers); if a focused choice control needs custom handling, implement deliberately with ARIA semantics and no duplicate selection.
- Restore exam-header fullscreen trigger and immersive layout fallback, accessible toggle/exit state.
- Restore section answered count, Closed/Locked wording, original Q number, meaningful confirmation on navigation away and creation of concurrent attempts.
- Make expiry and header state consistent across page navigation/reopen, with engine-owned timing and bounded persistence.
- **Acceptance:** actual CGL all modes; keyboard vs touch parity; radio focus; strict locks and early-submit independent 15 min; pause, expired/hidden/resumed, fullscreen rejected; no duplicate writes/navigation. Comparison screenshot for exam route. Update each E row.

### Pass 12 — Result fidelity, original-version comparison and scoring display

**Targets:** R01–R03, R09–R12, V04–V05 (and preserve learning actions).
- Compare original/reviewed patch overlay for corrected/caution/invalid questions; build a frozen source-reference snapshot when necessary so old attempts stay independently reviewable after package changes.
- In review show original stem/options/figures/source page/publisher key alongside frozen reviewed version in an accessible disclosure; do not leak answers during exam; account for unchanged originals and partial patch changes.
- Restore visually obvious chosen/correct/incorrect option states including option images; use text/icons as well as color; excluded/pending states non-misleading.
- Restore adjusted score **earned / eligible max**, section attempts/right/wrong/score/max/time, source-key comparison distinct from corrected score and separate self-grading.
- Restore useful solution disclosures, status/completion label and review-top affordance; preserve source links/media and study-card controls.
- **Acceptance:** direct screenshots of actual corrected key/option/stem and a passage/figure; CGL original/reviewed both; wrong/right/skip/excluded; single section; arbitrary imported response kinds; frozen-reopen; zero eligible max; screen-reader labels. Update R rows.

### Pass 13 — History, preferences, storage and backup experience

**Targets:** H01–H10, V02/V06/V10; H10 stays explicit exclusion unless directed otherwise.
- Restore bulk deletion of completed attempt records (double confirm, accurate scoping); preserve in-progress/learning/imported data. Ensure transaction outcomes and conflicts are reported, not assumed.
- Restore exact paper/edition filter while retaining free-text search, status, date sort and newer archive navigation.
- Restore honest best adjusted percentage and papers-practised metric; distinguish full versus single-section comparisons.
- Restore quota estimate and optional persistence request with graceful handling if browser/file context forbids it; show storage backend, fallback and meaningful warnings.
- Persist selected exam/paper/edition/mode/section with validated prefs, bounded fallbacks for missing packages. Maintain safe backup v3 behavior.
- Explicitly resolve H08/C03: **default additive import** remains unless a separately designed, opt-in replacement flow is justified. Do not implement v11 schema migration automatically.
- **Acceptance:** fallback, quota denied, active+complete mixed data deletion, v3 import additive, reloaded selection, corrupt preferences, offline file constraints, mobile view. Update H rows.

### Pass 14 — Fine-grained analytics, review filters and trends

**Targets:** R04–R08, H07, C04–C05.
- Restore real **visit count** collection from engine events (recorded entry/return semantics), per-item Fast/Typical/Slow label and ledger columns; label missing legacy visit data “Not recorded,” never fake zeros.
- Add audit-notes and typical-speed-wrong review filters, plus direct item jump and top-of-review navigation.
- Restore five longest measured question visits with links, and evidence-based **What to work on next** suggestions (minimum samples, no causal claims).
- Offer comparable **adjusted score progression** alongside existing exact-revision answering-accuracy trend. Avoid mixing CGL original/reviewed, modes, changing scored denominators or synthesized revision exams.
- Preserve the current `attempt-evidence` speed thresholds and sample gating unless deliberately amended with independently reasoned provenance; never relabel arbitrary long questions as slow for cross-paper comparison.
- **Acceptance:** original actual exam records with multiple visits/answer replacements, short/long/no timing, insufficient samples, excluded/pending, negative score and restored old records; verify all review links.

### Pass 15 — Visual/interaction restitution and accessibility

**Targets:** V01–V10, unresolved design/focus/contrast issues from earlier passes.
- Use reproducible, identical viewport screenshots of v11 and overhaul for: 390px phone; 768px tablet; desktop ~1280px; light/dark where supported; library, selected paper/edition, active strict/free/single exam, late/paused state, results overview, corrected question review, time ledger and history (with/without records).
- Compare information hierarchy, click/touch discoverability, font scaling 85/100/140%, long/multiline stems, reading passage, stem/option images, 200% zoom, horizontal overflow, focus after rerender, screen-reader status and reduced motion.
- Preserve familiar v11 UI affordances **and** improve with modern native semantics; avoid a pixel clone or replacing new functionality to make screenshot diffs look smaller.
- Add a **human/device signoff matrix** for physical Android/iOS/Desktop Safari, keyboard-only, VoiceOver/NVDA. Unavailable testing must remain unchecked.
- **Acceptance:** every v11 screen feature discoverable; no cutoff/overlap; clear answer states and status; screenshots with review commentary. Browser screenshot automation does not certify screen readers or real devices.

### Pass 16 — Independent, de novo verification and release decision

**Targets:** Every E/R/H/V/C row, plus all preserved and newly added functionality.
- **Do not merely re-run QA fixtures, quote prior passes or trust this plan's DONE statuses.** Independently enumerate original v11 DOM, event handlers, state changes, session/timer operations, result calculations, history/settings/backup and CSS; trace each against the final actual overhaul code.
- Compare the same five original papers/ten editions, real source revisions, full and sectional exam modes, answer changes, images/passages, scores, storage and backup workflows. Inspect generated `file://` artifact, not only source.
- Review adverse conditions: simultaneous tabs, rejected writes, hidden and pagehide/restore, timed section expiry, unexpected close, import conflicts, corrupt/frozen history, large datasets and keyboard/focus.
- Perform targeted browser comparisons and screenshot evidence; track physical devices and screen-reader signoffs separately. Fix anything found and re-audit affected surfaces **before** completion.
- **Exit requirement:** every feature either **DONE with source and direct behavioral evidence**, or **ACCEPTED EXCEPTION** with reason and explicit approval; all P0/P1 regressions resolved; no failing targeted QA; exact final `overhaul` commit CI successful; manual release constraints explicitly called out. **No merge to `main` or declaration of comprehensive parity without separate authorization.**

## 9. Per-item objective reconciliation / evidence template

Copy this into a dated checkpoint **in this file** for every touched item:

```md
### Pass NN checkpoint — YYYY-MM-DD — commit <sha>
Audit: <v11 source:line + current source:line + observed difference>
Analyze: <UI/engine/data invariants and design choice>
Implement: <paths and precise change, or explicit accepted exception>
Objective check: <IDs; expected and actual UI/behavior; screenshot comparison if relevant>
Targeted QA: <scenario, fresh browser/real content, failure modes, exact commit/CI>
Remaining: <IDs still OPEN/UNVERIFIED; manual/device gates>
```

**Do not write `DONE` in the matrix until the corresponding checkpoint supplies direct source trace and user-visible behavior evidence.** For new event counters or preferences, document migration behavior for in-branch stored data, validate backup v3 round trips and avoid breaking frozen old records.

## 10. Project release boundaries and outstanding verification

- Current source audited: v11 `e661822`; overhaul `5b9dce6`. **No parity code fix implemented yet** when this programme was authored.
- Historic Pass 9 acceptance establishes an earlier engineering milestone only; the old [parity ledger](V11_PARITY_LEDGER.md) overstates completeness and is superseded.
- Pass 10 automated checks (Chromium, Firefox Playwright and Linux WebKit) were green on final historical HEAD `5b9dce6` [CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096); **Linux WebKit is not actual Safari/iOS**.
- Manual outstanding: real Firefox/Safari `file://`; physical Android/iOS; screen readers/AT; abrupt OS/browser termination; actual quota/eviction and recovery; thousands of cards/history on slower devices; direct side-by-side visual and user approval.
- No production old-storage migration: explicitly waived `H10`; backup merge overwrite remains a decision `H08`, not a completed feature.
- This is a **planning and documentation pass only**. The source, generated HTML, `main` and `baseline/v11` are left untouched.

## 11. Live programme status

| Pass | Stage | Objective status | Evidence / notes |
|---|---|---|---|
| 11 — Exam UX | PLANNED | E01–E09 OPEN | None yet |
| 12 — Result fidelity | PLANNED | R01–R03/R09–R12 OPEN | None yet |
| 13 — History & settings | PLANNED | H01–H09 OPEN; H10 exclusion | None yet |
| 14 — Analytics | PLANNED | R04–R08/H07 OPEN | None yet |
| 15 — Visual/AT | PLANNED | V01–V10 OPEN/UNVERIFIED | No screenshot/device signoff |
| 16 — Independent final audit | PLANNED | NO PARITY SIGNOFF | Requires de novo source+browser review |

**Next step:** Pass 11 begins with exact source inspection and a written audit/design checkpoint here, not implementation from historical CI claims.
