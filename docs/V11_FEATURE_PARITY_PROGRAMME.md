# v11 feature-parity restoration programme — Passes 11–16

> **CURRENT, AUTHORITATIVE FEATURE-PARITY PROGRAMME · 30 October 2026 · PASSES 11–14 VERIFIED; PASSES 15–16 OPEN**
>
> New source-to-source audit performed against frozen `baseline/v11` commit `e661822d865927e89a837790c1c6bc1cfc2562a6` and `overhaul` commit `5b9dce604faef10a714415341c7da5116bf6ff8a`. This document is the source of truth for **v11 feature parity** from Pass 11 onward, superseding the old [Pass 9 parity ledger](V11_PARITY_LEDGER.md). The plan was documentation-only at creation; Pass 11 was subsequently implemented and verified.
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
| E01 | **P0** | A–D answer, plain ←/→ navigate, M flag, F fullscreen | Exam keyboard handler only recognizes **Alt+←/→** | v11 `legacy.ts` 202; new `generic-ui.ts` 966–977 | DONE (Pass 11) |
| E02 | P1 | Keyboard navigation available during focused choice workflow | New Alt+arrow handler ignores key events from INPUT/TEXTAREA/SELECT; radios are INPUT | new `generic-ui.ts` 966–976 | DONE (Pass 11) |
| E03 | P1 | Fullscreen button in test header | Exam header lacks fullscreen action; only global Display panel controls fullscreen | v11 124–125; new `generic-ui.ts` 194–200 | DONE (Pass 11) |
| E04 | P1 | Blocked native fullscreen falls back to in-page immersive focus layout | New fullscreen code only displays unavailable notice on failure | v11 46–48; new `bootstrap.ts` | DONE (Pass 11) |
| E05 | P1 | Section tabs show answered/25 and Closed/Locked | New section buttons show names/disabled states, not the v11 per-section counts/status labels | v11 124; new `generic-ui.ts` 206–211 | DONE (Pass 11) |
| E06 | P1 | Leaving running test asks confirmation and explains running timer | New Library handler returns directly, without confirmation | v11 100; new `generic-ui.ts` 834 | DONE (Pass 11) |
| E07 | P1 | Starting another while an attempt exists requests confirmation | New Start creates another pending attempt, preserving former, without explaining behavior | v11 103; new `generic-ui.ts` 795–807 | DONE (safe retain variation) |
| E08 | P2 | Active question displays section-relative **and original paper Q number** | New exam question label primarily section-relative; paper position is not surfaced equivalently | v11 124; new `generic-ui.ts` 211–213 | DONE (Pass 11) |
| E09 | P1 | Timer settlement also runs when viewing library/history | New 1s tick returns unless `view === "exam"`; restore reconciles elapsed on reopen, but expiration UI can lag | v11 205; new `generic-ui.ts` 946–963, 728–739 | DONE (Pass 11) |

**Engine safety:** shortcuts may never mutate answers during pause, bypass locked/forward-only rules, interfere with text/numeric entry, or let letter keys trigger browser UI. For E09 ensure a consistent one-time expiration transition in any view without excessive storage writes/redraws. Strict section early-submit must still begin a full fresh 15-minute allocation.

## 4. Independent source audit: confirmed result/review gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| R01 | **P0** | For corrected Q, expandable **Compare with original PDF version**: original stem, options, page, original published key | Missing from rendered question reviews; aggregate source-key score does not replace question-level comparison | v11 167; new `generic-ui.ts` 690–725 | DONE — Pass 12 (source + browser) |
| R02 | **P0** | Correct answer and user's incorrect choice have distinct option-level highlight; image choices included | New review renders options without correct/incorrect visual classes, and reports Expected/Your answer separately | v11 114,167; new `generic-ui.ts` 584–601, 701–714 | DONE — Pass 12 (source + browser) |
| R03 | **P0** | Main score shows adjusted earned **/ eligible maximum**; section table shows attempted/right/wrong/marks/max/time | New main score card shows earned but no eligible maximum; section table is less detailed | v11 137–138; new `generic-ui.ts` 610–618, 661–678 | DONE — Pass 12 (source + browser) |
| R04 | P1 | Timing ledger includes Visits and Speed as well as Time/Changes | New ledger lacks both columns; current response model has no explicit visit count | v11 169; new `result-presentation.ts` `timingLedgerHTML` | DONE — Pass 14 real entry counters / speed ledger |
| R05 | P1 | Review filter **Key-audit notes** (corrected/caution etc.) | No equivalent filter of all review-audit items | v11 168; new `result-presentation.ts` `ReviewFilter` | DONE — Pass 14 audit-note filter |
| R06 | P1 | Filter **Typical-speed incorrect** | New filters contain fast/slow incorrect, not typical-speed incorrect | same source files | DONE — Pass 14 typical-speed incorrect |
| R07 | P1 | Five longest question visits with direct review links | Not surfaced as ranked list | v11 135,156; new `resultHTML` | DONE — Pass 14 ranked linked foreground exposure |
| R08 | P1 | **What to work on next** contextual recommendations based on low accuracy, coverage, speed | New displays descriptive evidence without equivalent recommendations | v11 140–145,157; new `resultHTML` | DONE — Pass 14 evidence-limited recommendations |
| R09 | P2 | Expandable solving approach; expanded by default when correction needed | New prints explanation as plain text, no per-question disclosure | v11 159–166; new `generic-ui.ts` 713–714 | DONE — Pass 12 (source + browser) |
| R10 | P2 | Explicit `Top ↑` review navigation | No equivalent dedicated control | v11 168; new `resultHTML` | DONE — Pass 12 (source + browser) |
| R11 | P2 | Completion labels for time expiry/section early submission | New result header does not consistently distinguish end reason | v11 152; new `resultHTML` | DONE — Pass 12 (source + browser) |
| R12 | P1 | Per-item detailed audited status, publisher vs reviewed key where changed, change log | New shows editorial status and some notes but not full individual original-version provenance | v11 167; new `resultHTML` | DONE — Pass 12 (source + browser) |

**High-priority distinction:** 131 reviewed question patches, including wording/options/key updates, have **data provenance** in the modern implementation but lack the v11 **user-visible original-versus-reviewed comparison**. Preserve source questions/keys unchanged; show differences only after submission. Render chosen/correct option information from **frozen attempt key and responses**, not a mutable current paper or an implicit option index. Include both normal text and image options, editorial excluded/pending states and accessible non-color verdict text.

## 5. Independent source audit: confirmed history/settings gaps

| ID | Severity | v11 behavior | Current overhaul finding | Source anchor | State |
|---|---|---|---|---|---|
| H01 | **P0/P1** | Delete all completed records with two destructive-action confirmations | New archive supports only individual delete | v11 200; new `history-page.ts` and `generic-ui.ts` 765–781 | DONE — Pass 13 atomic bulk |
| H02 | P1 | Exact paper/edition dropdown filter | Archive search plus completion-status filter, no exact picker | v11 184–185; new `history-page.ts` | DONE — Pass 13 exact edition |
| H03 | P1 | Storage quota/usage estimate via `navigator.storage.estimate()` | Missing from current History UI | v11 186; new `history-page.ts` | DONE — Pass 13 quota estimate |
| H04 | P1 | Explicit `Protect stored data` via `navigator.storage.persist()` | Missing current action | v11 187; new `history-page.ts` | DONE — Pass 13 persistence request |
| H05 | P1 | Persist selected paper, edition, mode and practice section | New local preference schema persists only theme/font size; CGL mode and choice reset on reopen | v11 39–42,84,118–122; new `preferences.ts`, `generic-ui.ts` 256+ | DONE — Pass 13 validated preferences |
| H06 | P1 | History shows best adjusted %, papers practised | New counters replace these with attempts/status/observed accuracy | v11 184; new `history-page.ts` | DONE — Pass 13 adjusted metrics |
| H07 | P1 | History score-based progression for matching paper/mode | New trend charts observed answering accuracy for exact revisions; score progression absent | v11 173–181; new `history-page.ts` | DONE — Pass 13 comparable marks trend |
| H08 | P2/decision | Backup v1 import merges newer matching-ID records | Backup v3 import is additive/non-overwriting | v11 196–198; new `history/backup.ts`, `generic-ui.ts` | ACCEPTED VARIATION — additive backup v3 |
| H09 | P2 | Visible IndexedDB/fallback status panel in History | Failure banners exist; old status/quota panel not retained | v11 184; new `history-page.ts` | DONE — Pass 13 storage panel |
| H10 | EXCEPTION | Read previous v11 local IndexedDB/backup v1 | Clean break: new `practiceDesk.overhaul.v1` data and backup v3; no legacy migration | v11 17–20,89,196–198; new `DATA_MODEL.md` | **Accepted explicit exclusion**, unless user changes requirement |

**Safety details for H01:** delete *only completed attempt* records; leave pending attempts, learning cards, imported packages and display settings untouched; support fallback/IndexedDB, stale tab conflicts, denied writes and backup confirmation. Do not silently replace additive v3 import behavior with risky overwrite: decide H08 explicitly.

## 6. Visual / presentation / accessibility differences (not marked resolved)

| ID | Severity | Difference or unverified property | Acceptance requirement | State |
|---|---|---|---|---|
| V01 | P1 | v11 header vs redesigned header and Display placement | Side-by-side desktop/mobile inspection; retain accessibility and keyboard access | UNVERIFIED |
| V02 | P1 | v11 paper/date picker + explicit two-choice edition toggle vs combined dropdown | Restore clear edition distinction and inspect ease of selection | FUNCTIONAL DONE — visual review Pass 15 |
| V03 | P1 | v11 large custom A–D selection buttons vs native radio labels | Keep accessible native semantics **and** restore obvious visual affordance, keyboard shortcuts and image handling | PARTIAL (visual signoff pending) |
| V04 | P1 | v11 review option highlights and status hierarchy vs generic response listing | Non-color accessible correct/incorrect/excluded visualization; R02 | PARTIAL — functional Pass 12 done; visual signoff Pass 15 |
| V05 | P1 | v11 result max-marks/section table hierarchy vs new summary | Show equivalent metrics prominently; R03 | PARTIAL — functional Pass 12 done; visual signoff Pass 15 |
| V06 | P1 | v11 history management information and storage panel vs new archive | H01–H09 available and readable on all target sizes | FUNCTIONAL DONE — visual review Pass 15 |
| V07 | P1 | v11 templates included `aria-live="polite"` on `#app`; new template removes it | Verify dynamic announcements with AT; avoid chatty full-page live region if better targeted status regions | UNVERIFIED |
| V08 | P1 | Responsive layouts structurally redesigned, not pixel-identical | Side-by-side desktop/tablet/phone screenshots, touch hit areas, no clipping, scroll/focus/zoom | UNVERIFIED |
| V09 | P1 | Global fullscreen uses native API only | Restore v11 functional immersive fallback; E03–E04 | DONE (Pass 11) |
| V10 | P2 | Theme two distinct Light/Dark buttons changed to one toggle | Either restore explicit selection or document/evaluate equivalent discoverability, screen-reader state | FUNCTIONAL DONE — AT/visual review Pass 15 |

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

**Targets (original plan):** R04–R08 and C05. **H07/C04 was already closed in Pass 13** and must not be redone.
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
- No production old-storage migration: explicitly waived `H10`. `H08` is accepted as a **safer variation**: checksum-verified backup v3 is additive rather than automatically replacing existing attempts.
- This is a **planning and documentation pass only**. The source, generated HTML, `main` and `baseline/v11` are left untouched.

## 11. Live programme status

| Pass | Stage | Objective status | Evidence / notes |
|---|---|---|---|
| 11 — Exam UX | DONE — tested | E01–E09 done; V09 done | CI #40940761995; device and visual gates remain |
| 12 — Result fidelity | **DONE — source + real CGL and generic browser QA** | R01–R03/R09–R12 DONE; V04/V05 visual signoff pending | [CI #40988982138](https://github.com/oneshubhamt/practice-desk/actions/runs/40988982138) · 81/81 Node, Chromium, Firefox, Linux WebKit |
| 13 — History & settings | **DONE — source + browser QA** | H01–H07/H09 DONE, H08 safe variation, H10 exclusion; V02/V06/V10 visual pending | [CI #40992327902](https://github.com/oneshubhamt/practice-desk/actions/runs/40992327902) |
| 14 — Analytics | **DONE — source + multi-engine browser QA** | R04–R08 DONE; H07 preserved from Pass 13; C05 historic visits honest | [CI #40994179081](https://github.com/oneshubhamt/practice-desk/actions/runs/40994179081) · 90 Node, Chromium/Firefox/Linux WebKit |
| 15 — Visual/AT | PLANNED | V01–V10 OPEN/UNVERIFIED | No screenshot/device signoff |
| 16 — Independent final audit | PLANNED | NO PARITY SIGNOFF | Requires de novo source+browser review |

**Next step:** Pass 15 — side-by-side rendered visual comparisons, accessible interaction/zoom/focus and physical-device/AT signoff. Pass 16 remains the independent de novo audit and release decision.


## Pass 11 checkpoint — 30 October 2026

**Audit:** Directly compared v11 exam/render/keyboard/fullscreen/navigation/timer handlers with the typed overhaul source. **Analysis:** preserve engine-owned policies; make shortcuts safe with focused radios and disabled in typing fields; avoid foreground time accumulation and periodic competing-tab writes when in the library. Starting another exam asks first but retains the previous pending attempt; this is a deliberate safer alternative to v11's discard. **Implementation:** changes in `src/app/generic-ui.ts`, `src/app/bootstrap.ts`, `src/styles/app.css`, `scripts/pass11-parity.mjs`, browser smoke/platform harnesses and CI. **Objective check:** E01–E09 addressed: A–D, arrow/Alt-arrow, M/F; focused-choice shortcuts; exam fullscreen button and rejected-API focus fallback; answered/Closed/Locked tabs; cancelable leave and new-start prompts; original paper Q number; continued off-screen timer without added question foreground duration. **Targeted QA:** [CI #40940761995](https://github.com/oneshubhamt/practice-desk/actions/runs/40940761995) passed TypeScript, 75 Node tests, existing and new real-CGL Chromium `file://` regression, Firefox and Linux WebKit offline acceptance. A two-tab collision due to background autosave and a duplicate browser-dialog listener were identified and repaired during this pass. Browser-generated offline HTML was rebuilt. Source commits: `718ea4a`, `08f0fa3`, `6998897`.

**Limits:** This is functional Pass 11 acceptance, not full v11 parity, device fullscreen approval, screen-reader verification or pixel visual signoff. Those and Passes 12–16 remain open. Neither `main` nor `baseline/v11` was edited.


## Pass 12 active scratchpad — audit and design (30 October 2026)

**Audit:** Re-read v11 `legacy.ts` `optionsHTML`, `scoreCards`, `sectionTable`, `reviewedSolutionHTML`, `reviewOneHTML`, and modern `generic-ui.ts` result/review rendering, `scoring.ts`, `source-comparison.ts`, `exam-package.ts`, `history/frozen.ts` and `DATA_MODEL.md`. Identified R01–R03 and R09–R12 as still open. R04–R08 remain explicitly assigned to Pass 14.

**Design decisions:** Generic engine and all six question kinds remain primary. Implement an optional versioned, hash-checked **source-edition review snapshot** for any compatible imported source/reviewed exam pair, captured when an attempt starts (not reconstructed later from a changed paper). The CGL originals are a representative source-pair test, not an app-specific dependency. Correct/chosen rendering must use frozen key and stable option IDs, not letter indices; excluded and pending cases must be labelled honestly. Eligible maximum must resolve actual per-question/per-section marking rules and exclude unscored/manual-only items. Old records without new optional source or completion-reason metadata remain loadable. Preserve the single six-kind engine, immutable source/media, backup v3, offline file use and learning/FSRS. Test genuine changed CGL wording/key/media as well as imported non-CGL six-kind data. No user-visible source/key disclosure before an attempt finishes.

**Five-step state:** 1 Audit DONE; 2 Analyze DONE; 3 Implement DONE; 4 Objective reconciliation DONE for R01–R03/R09–R12; 5 Targeted browser/CI verification DONE. V04/V05 still need independent visual/device signoff in Pass 15. R04–R08 remain Pass 14.

## Pass 12 closure — 30 October 2026

**1. Audit:** Reinspected the actual v11 `legacy.ts` original-PDF comparison, review options, result score cards, section table, worked solutions, review Top and completion indicators against the overhaul `generic-ui.ts`, `result-presentation.ts`, `scoring.ts`, `source-comparison.ts`, `exam-package.ts`, persisted record validation and data-model rules. E01–E09 from Pass 11 remain covered. The original snapshot/option styling/adjusted denominator/solution/status gaps were confirmed directly; old green fixtures were not used to declare parity.

**2. Analyze (generic-first):** An SSC-specific patch renderer would be a regression in product scope. Keep the **one generic six-kind engine** and add a validated, optional source-edition comparison for any exam with matched, versioned `source` and `reviewed` packages. Freeze the original question, actual source answer, and its needed image/passage/table/chart resources **at attempt start**, including editorial-only and stimulus-only changes. Stable question IDs/option IDs carry semantic identity; never infer a key from the answer's display letter. Keep the original-source-key aggregate score separate, since arbitrary imported formats may not have a comparable one. Preserve old stored attempts: optional fields mean no schema-breaking migration. For *only* older built-in CGL attempts having a pinned original paper/key revision, a read-only fallback verifies the exact bundled source revision; it does not rewrite frozen history. No current/mutable-paper guesses or silent generic backfill.

**3. Implement (actual files):**
- `src/engine/review-source.ts`: optional `SourceReviewReference`, frozen original answer/question/stimuli/assets, revision binding, SHA-256 content hash and full source question/key/media validation. Detect prompt/options/figure/key changes **and passage-only changes even if question ID is unchanged**.
- `src/engine/score-ceiling.ts`: full-credit automated eligible maximum and section-level attempted/correct/incorrect/pending/excluded/marks/time, derived from **frozen question/section/entry scoring policies**; no +2/−0.5 or 25-question assumption. Editorially excluded and manual-only responses are kept out of the automated denominator.
- `src/app/exam-package.ts`: optional frozen source-review and explicit `time-expired` / `submitted` / `section-submitted` completion reason, without changing the engine scoring policy.
- `src/app/generic-ui.ts`: archive source review at start, validate before reading/importing, render genuine original vs reviewed wording/media/options/published key after finishing; provenance labels use “original PDF” for CGL, generic “source edition” for other exams. Correct option green, chosen wrong red and both with **text** labels (single-choice, multiple-select, true/false). Worked solutions use disclosures, auto-open on incorrect/unanswered; review Top button; adjusted score earned/max and complete section breakdown; submission/expiration labels, truthful excluded/manual states. Historical CGL exact-revision read-only fallback.
- `src/styles/app.css`: consistent responsive status emphasis, disclosure and option visuals. `tests/pass12-review.test.mjs`, `scripts/pass12-parity.mjs` and `.github/workflows/ci.yml` enforce real source and generic cases.

**4. Objective reconciliation:** R01 DONE (original revision, question/options/image/passage/key/source page, frozen and reopened); R02 DONE (key- and response-derived correct/incorrect option-level states including option images and true/false); R03 DONE (policy-derived adjusted total/section maxima, attempts, correct/wrong, measured question foreground time); R09 DONE (worked solution disclosure and automatic expansion for mistakes/skips); R10 DONE (Top review action); R11 DONE (completion reason with old-record compatibility); R12 DONE (source/current key and audit provenance, frozen original item, reviewed status and notes). R04–R08 remain explicitly Pass 14. **V04/V05** are functionally implemented but remain **PARTIAL** pending side-by-side phone/tablet/desktop and assistive-technology checks in Pass 15.

**5. Targeted QA and evidence:** [Source-head CI #40988982138](https://github.com/oneshubhamt/practice-desk/actions/runs/40988982138) is green: **81 Node tests passed**, full existing Chromium `file://` smoke and storage recovery, Pass 11 real-paper E2E, new Pass 12 E2E, Chromium platform checks, Firefox and Linux WebKit platform acceptance. Direct Pass 12 test opens a corrected real CGL item, verifies original source prompt/published key, visual wrong/correct options, source diagrams and images, eligible score max, section breakdown, solution disclosure and completion badge; saves/reopens the attempt; simulates an older CGL attempt without new source snapshot and verifies pinned-source fallback; imports non-CGL source/reviewed exams with **all six response kinds**, multi-kind custom marking, and checks boolean states/manual assessment. Unit tests cover source reference tampering, original corrected key, CGL single-section max, generic full-credit policy overrides, stimulus-only revision, deadline vs voluntary completion, and old saved records.

**Release limitations and decisions:** No automatic legacy v11 data migration (accepted existing exception). Historical imported generic attempts without original source snapshots have no fabricated comparison; new paired imports do. Section times are explicitly *foreground question exposure*, not elapsed section wall-clock. Unusual partial-credit policies are described with **nominal full-credit maximum**, not an unproved global theoretical best. No claim of pixel-identical visuals, genuine iOS/Safari/Android fullscreen, screen-reader signoff, or complete v11 application parity. `main` and frozen `baseline/v11` unchanged. **Pass 13 is next.**

**Final generic-precision follow-up:** A subsequent direct review caught a two-decimal presentation assumption. The adjusted main mark/eligible maximum and every section's mark/maximum now respect the frozen paper's declared `scoring.decimalPlaces` (zero through six), defaulting to two only when the paper has no explicit precision. `scripts/pass12-parity.mjs` now imports a non-CGL paper declaring three decimals and requires `/ 14.000`. Source code [`3c6d665`](https://github.com/oneshubhamt/practice-desk/commit/3c6d66522786edb4eba44dac8c0f6718e8f789a1), targeted test [`fbf4802`](https://github.com/oneshubhamt/practice-desk/commit/fbf48029c4d4933103291bc005470c807cd285c4), verified [CI #40989428264](https://github.com/oneshubhamt/practice-desk/actions/runs/40989428264) (81 Node tests, source-driven Chromium/browser parity, Firefox and Linux WebKit). This was completed **within Pass 12**; it is not deferred to a later pass.

## Pass 13 working checkpoint — audit and analysis (30 October 2026)

**Audit:** Read frozen v11 `legacy.ts` history (lines 172–200), quota/persistence, deletion, backup merge and prefs; compared with current `history-page.ts`, `preferences.ts`, `generic-ui.ts`, `backup.ts`, scoring and exact-revision trends. H01–H09 are initially OPEN and H10 is an accepted exclusion; V02/V06/V10 need functional restore with visual signoff left for Pass 15.

**Design:** Keep imported exams and all six question kinds. User-selected paper/revision/mode/section must persist in a separately validated local selection preference with safe fallback if the package was removed. Surface source versus reviewed edition explicitly for paired packages; do not replace the compatible `g-papers` picker or force CGL-centric assumptions. Bulk delete only completed attempt records, use *one* IndexedDB readwrite transaction with per-row optimistic version checks, or a single fallback localStorage replace with exact prior stamp. Require two confirmations; never delete learning cards, imported packages or pending attempts; report errors and do not claim success on failure. Quota/storage persistence are capability checks and report unavailable/denied outcomes, never promises. Keep checksum-verified v3 additive/non-overwriting import as the explicitly accepted H08/C03 difference and keep the H10 no-v11-migration exception. Calculate best adjusted % from frozen nominal eligible maximum; distinguish unlike modes. For comparable score progression use identical frozen paper/key/mode (not paper title alone), preserving existing observed accuracy. V10 restore explicit theme choice without removing the existing toggle. **Status: audit DONE; analysis DONE; implementation/open QA pending.**

## Pass 13 five-step closure — 30 October 2026

**1. Audit:** Compared frozen v11 `legacy.ts` history UI, controls, quota/persistent storage, selection settings, metrics, scored trends, backup merge and delete handlers (especially lines 39–42, 84, 172–200) to the current `overhaul` `generic-ui.ts`, `history-page.ts`, `preferences.ts`, `history/backup.ts`, scoring and persistence. Read the live parity programme and DATA_MODEL invariants first; the initial source gaps H01–H09 were recorded in the Pass 13 working checkpoint above.

**2. Analyze:** Preserve one *generic* exam/history/learning runtime (not an SSC-specific replacement), all six response kinds, frozen paper/key/media and FSRS. Bulk delete must target only **completed** attempts, require **two confirmations**, and be one IndexedDB transaction with per-row optimistic revision/status checks; fallback uses single prior-stamp comparison and one localStorage replacement. Denied writes, stale tabs, canceled prompts and imported/learning/pending records must be safe. Device preferences identify exact paper/edition, mode and section and restore after asynchronous imported-package loading; missing/corrupted selections fall back safely. Browser quota/persistence are optional best effort. Score progression requires identical frozen paper revision, key hash, practice mode and real answered items. Preserve prior observed accuracy separately. The optional exam setup is included in integrity-covered backup v3 **without changing v3 version or rejecting older archives**. **H08/C03** intentionally retains additive, non-overwriting import. **H10/C02** remains an accepted no-v11-migration exclusion.

**3. Implemented:**
- `src/app/history-page.ts`: exact paper/revision/edition filter, papers-practised and best-adjusted metrics, comparable adjusted-score progression beside existing accuracy, storage backend/estimate/persistence and bulk-delete interface.
- `src/app/history-metrics.ts`: policy-derived eligible adjusted percentages and exact-identity score trends, excluding unmeasured 0%-looking series.
- `src/app/practice-selection.ts`: schema-validated device-local exam selection independent from display preferences; `generic-ui.ts` binds paper/edition/mode/section and restores imported exams after async package registration.
- `src/app/generic-ui.ts`: double-confirm bulk deletion, atomic optimistic IDB/fallback writes, truthful failure/status messages, optional storage API reporting, and backup selection export/restore.
- `src/history/backup.ts`: optional, validated, checksum-hashed exam selection in existing v3 format; additive merge and older v3 compatibility preserved.
- `src/template.html`, `src/app/bootstrap.ts`, `src/styles/app.css`: explicit accessible Light/Dark selection alongside original toggle and responsive history storage/management.
- `tests/pass13-history.test.mjs`, `scripts/pass13-history.mjs`, `.github/workflows/ci.yml`: strict unit and direct browser acceptance tests.

**4. Objective-by-objective check:** H01 DONE: only completed attempts; two confirms; cancellation; one IDB readwrite transaction with whole-batch rollback under competing tab, quota-rejected fallback changes nothing; pending, imported packages, learning cards survive. H02 DONE: exact revision filter composed with search/status/sort, including imported exams. H03 DONE: approximate browser-wide storage usage/quota with denied/unsupported reporting. H04 DONE: persistence request with grant/denial/unavailable messages, no false guarantee. H05 DONE: validated saved paper/edition/mode/section, including asynchronous imported-exam reload and optional backup restoration. H06 DONE: papers practised and eligible-score best %, with cross-mode caveat. H07 DONE: frozen same paper/key/mode adjusted score trend, answers required, observed accuracy kept separate. H08/C03 **accepted safe non-overwrite variation**. H09 DONE: explicit IndexedDB/fallback health panel, quota, storage and backup controls. H10/C02 **accepted exclusion**. V02/V06/V10 functionally restored but **visual/physical-device/AT signoff pending Pass 15**.

**5. Targeted QA:** [CI #40992327902](https://github.com/oneshubhamt/practice-desk/actions/runs/40992327902) completed successfully on tested source HEAD `d5909a13`: **85 Node tests, strict TypeScript, Chromium `file://` main smoke and Pass 11/12/13 real-browser workflows, cross-browser Firefox and Linux WebKit offline suites**, generated HTML self-contained and verified. Pass 13's browser QA directly tested paired edition picker, theme buttons, choice/mode/section persistence and corrupt recovery, imported generic paper persistence after async reload, history metrics/filter/score trend, denied storage estimate/persist, double-confirm cancel, a genuinely competing record revision forcing full transaction rollback, IndexedDB bulk deletion, quota-denied fallback unchanged plus successful retry, preserved pending/cards/packages, optional checksum-covered v3 selection and additive backup restore without overwriting existing IDs. The older main smoke assertions were corrected to expect the expanded history metrics, semantic theme state and deliberate persistence of imported exam selection; none of their original behaviors was removed.

**Release boundary:** H01–H07/H09 have directly supported functional acceptance; H08/H10 are explicit accepted differences. R04–R08 remain for Pass 14. V02/V06/V10 plus overall visual, physical device and assistive technology testing remain for Pass 15; independent full source parity remains Pass 16. No merge or full v11 release signoff; `main` and `baseline/v11` untouched.

## Pass 14 working checkpoint — 30 October 2026 (audit and design before implementation)

**Audit:** Re-read the original `baseline/v11/src/app/legacy.ts` `timing`/`speedTag`/`deriveTips`/`reviewHTML`/`questionTimesHTML`/`insightsHTML` and new `src/engine/session.ts`, `src/learning/attempt-evidence.ts`, `src/app/result-presentation.ts`, `src/app/generic-ui.ts`, `src/app/history-metrics.ts` plus immutable record checks. **Open:** R04 (Visits/Speed), R05 (key-audit review), R06 (typical-speed incorrect), R07 (top five longest with jump), R08 (careful next-study recommendations), C05 (truthful historic time/visit semantics). **Already closed in Pass 13:** H07/C04 comparable adjusted-score progression: preserve it, do not rewrite.

**Design:** Keep generic six-question-kind engine, all exam scoring/navigation policies and frozen result semantics. Add an *optional, bounded* `SessionState.questionVisits` snapshot initialized when a **new** attempt enters its first question, incremented only on genuine question navigation or automatic sectional advance. Old attempt states without it remain absent throughout their lifecycle: label visits **Not recorded**, never backfill zeros from time or answer events. The visit counter is independently validated against the frozen question list. Foreground exposure remains the existing `timeSpentMs`; neither a visit nor a long timer measures cognitive effort. Reuse existing evidence thresholds: section median of at least five measured valid answered items, Fast below 0.75× and Slow above 1.5×; otherwise Typical or Not classified; never label exclusions, pending/manual, unanswered or zero-time items. A shared classifier must drive both review filter and timing ledger to avoid inconsistent thresholds. Add audit-notes and typical-speed incorrect filters; show filter counts and accessible review jumps. Top five longest are a **rank of recorded foreground exposure** (may include unattempted items, but not zero-time rows), not a claim about duration of a single uninterrupted visit. Suggestions are conditional statements supported by observed samples (scored answers, sections with enough answers, coverage and relatively fast/slow incorrect) and never assert cause, predicted improvement or intrinsic intelligence. Existing Pass 12 source/provenance, Pass 13 scoring progression, backup v3/additive import and FSRS remain unchanged.

**Five-step state:** (1) source audit DONE; (2) design DONE; (3) implementation PENDING; (4) objective evidence PENDING; (5) targeted QA PENDING. **Next actions:** implement engine + validation, one shared analytics module, UI handlers, unit and browser regression; then update R04–R08 and this checkpoint based only on verified evidence.

## Pass 14 five-step closure — 30 October 2026

**1. Audit actual sources:** Re-read the frozen v11 `legacy.ts` question timing, `speedTag`, `reviewHTML`, `questionTimesHTML`, `analytic` and `deriveTips`, and the real overhaul `src/engine/session.ts`, `src/domain/attempt.ts`, `src/learning/attempt-evidence.ts`, `src/app/result-presentation.ts`, `src/app/generic-ui.ts` and frozen-record validation. Identified R04–R08/C05 as still missing while H07's adjusted-score trend was already completed in Pass 13. The design and objective plan were saved in the working checkpoint **before** changes.

**2. Analyze semantics:** A question visit is a genuine entry of the session cursor into a question: first question at attempt start, a different question selected by navigation, or entering a newly unlocked section at sectional completion. Ticks, answering, flagging and navigating to the current question do not increase visits. Older attempts without the optional `questionVisits` field remain **Not recorded**; no attempt to infer visits from exposure, answer changes or timestamps. Foreground time remains accumulated visual exposure, never inferred thinking time or a continuous visit. Speed uses the existing section-median policy (**at least 5 measured scored answers**, Fast below **0.75×**, Slow above **1.5×**, Typical otherwise; missing, excluded, pending, unanswered and zero-exposure items are **Not classified**). Same classification helper drives ledger and all three incorrect-speed filters. “Longest” ranks accumulated positive foreground question exposure rather than falsely labelling continuous visits. Recommendations require explicit observations and minimum samples, avoid speculative causes or promised score improvements; show a conservative alternative when no meaningful signal exists. All CGL and six-kind imported exams use the same engine and source-frozen results.

**3. Implemented source:**
- `src/engine/session.ts` adds optional `SessionState.questionVisits` initialized for new attempts, increments genuine entries and sectional transitions, and keeps older records without the field untouched. `src/app/generic-ui.ts` checks non-negative bounded, unique and paper-valid counters before accepting saved/imported records.
- `src/learning/question-analytics.ts` implements shared sample-gated speed classification, editorial/source-audit matching, top-five measured exposure and bounded evidence-limited study suggestions. Uses frozen results and existing `attemptEvidence`; does **not** change the 0.75/1.5 threshold or scoring.
- `src/app/result-presentation.ts` restores Visits and Speed to the timing ledger, adds **Key-audit notes** and **Typical-speed incorrect** filters, and renders the ranked clickable top-five plus **What to work on next** cards with measurement caveats. `src/app/generic-ui.ts` displays timing/visits/speed for each review item, adds the Typical incorrect shortcut and preserves the same deep-link behavior between overview, ledger and review.
- `src/styles/app.css` adds a compact responsive list and coaching layout. New `tests/pass14-analytics.test.mjs` and `scripts/pass14-parity.mjs` are required by `.github/workflows/ci.yml`; the older smoke test's timing-jump selector was scoped to the visible timing tab after new overview links were introduced.
- `src/app/history-metrics.ts`, `history/backup.ts`, display settings, FSRS scheduling, paper/key hashes and the six-kind exam scoring policy remain unchanged.

**4. Objective reconciliation:** **R04 DONE** — actual new-session visit entry counts plus Speed column and in-review display; historic **Not recorded** survives reopening. **R05 DONE** — editorial status, notes, changes and frozen source review provenance expose Key-audit notes on generic exams. **R06 DONE** — Typical-speed incorrect is filtered using the same section median and sample gate as Fast/Slow; corresponding result shortcut. **R07 DONE** — five greatest positive recorded foreground question exposures (stable ranked ties) with direct review links, preserving excluded/unanswered provenance and never calling this a continuous visit. **R08 DONE** — up to three low-accuracy, limited-coverage or fast/slow incorrect study prompts with minimum observations; conservative message when no signal, no causal explanation or performance prediction. **C05 DONE** — explicit new-only visit counts, historic absence preserved, time caveats clear. **H07/C04 remains DONE from Pass 13** — not reimplemented. All objectives are functional checks, **not a claim of side-by-side visual or assistive-tech signoff**.

**5. Targeted QA:** [CI #40994179081](https://github.com/oneshubhamt/practice-desk/actions/runs/40994179081) source run `222d0beb` succeeded: **90/90 Node tests**, strict TS, established Chromium offline smoke and Passes 11/12/13 browser regressions, new **Pass 14 Chromium `file://`** acceptance and Firefox + Linux WebKit offline platform checks; generated HTML verification passed. Direct unit tests exercise six response kinds under one mixed section, five timed scored responses with Fast/Typical/Slow and median gate, repeated navigation, unchanged visits after flags/ticks/answers, sectional auto-advance, old states remaining unrecorded, invalid/duplicate saved visit histories, audit and typical filters, correct/wrong/unanswered/pending/excluded, negative frozen marks, no-time samples, five longest and at most three evidence-backed prompts. Browser QA drives a **real reviewed SSC CGL paper** through revisit and submission, checks persisted count 2, actual audit/typical filter controls and longest-item jump, timing-ledger Speed/Visits, then removes visit metadata from an old completed record and verifies **Not recorded** on reopen; an independently imported six-kind exam verifies manual/insufficient-sample exclusion. Prior timing smoke selected a hidden overview jump after the new ranked links appeared; the test now explicitly selects the visible ledger jump, preserving functional coverage.

**Remaining:** Pass 15 responsive visual/keyboard/AT/physical-device checks, Pass 16 independent full source+screen parity audit and final release decision. No migration of v11 saved data, no backup overwrite, no changes to `main` or `baseline/v11`. **No full release signoff.**
