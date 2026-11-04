# P48 REOPENED — source-by-source architecture and product requirement re-audit

**Source snapshot:** `overhaul` commit `81376da910bee0622a3ee7d2a26900ab4ae7628b` (3 November 2026).  
**Status:** **INDEPENDENT CODE RECONCILIATION DOCUMENTED; P48 NOT CLOSED; RELEASE HOLD.**  
**Authority:** [Consolidated engineering programme](../ENGINEERING_PROGRAMME.md) and binding [decision register](../decisions/POLICY_REGISTER.md). This is an *evidence annex*, not a competing future programme.  
**Reason for reopening:** The first P48 ledger largely audited/repaired IndexedDB corruption, added four Node cases and one browser journey, and cited a full pre-existing CI suite. That did **not** establish a fresh code-level crosswalk for all previously committed architecture, features, data contracts and nonregression obligations. A green test is not proof of an uninspected requirement.

## 1. Scope, methodology and status discipline

I independently inspected the **current production source** in `src/app/`, `src/engine/`, `src/domain/`, `src/history/`, `src/learning/`, `src/authoring/`, `src/content/`, `src/styles/`, `src/template.html`, `scripts/build.mjs`, the current CI YAML and the linked programme, baseline, architecture, contracts, authoring, QA and historical finding documents. References below are **repository-root source paths and approximate 1-based line ranges at the frozen snapshot**, not quotations from older pass-completion diaries. Cross-read the listed consumer(s) when assessing an implementation; code presence alone is not successful device acceptance.

**Vocabulary:** **SOURCE-CONFIRMED** = implemented behaviour/contract found in real current code, *not* a claim that every input/device is validated; **PARTIAL** = subset exists but stated target or hardening is incomplete; **CONDITIONAL** = future change requires an agreed workload/risk/user choice; **DEFERRED** = expressly out of current engineering scope; **EXTERNAL** = requires actual equipment, OS/browser conditions, human judgement or source content unavailable here; **AUDIT-OPEN** = a substantive source risk/differing contract requires separate investigation/decision. Prior CI is background only and cannot promote any EXTERNAL item to SOURCE-CONFIRMED. **SOURCE-CONFIRMED is not a release badge.**

**Reconciliation inventory:** the complete **26 I-issues**, **15 F findings**, **10 G findings**, **11 L findings**, **3 F29 findings**, the **28 original architecture sections**, the **target conceptual layers**, all **15 TS test-engineering issues**, **14 QB editor/import requirements**, **10 DOC consistency checks**, the P41–P48 acceptance gates and the cross-layer release/no-regression policies. Every row below gives a current source owner *or explicitly states that no applicable implementation exists*. Historical explicit user scope choices (no migration, optional remapping, optional survey/cloud/per-question clocks) are respected rather than fabricated as completed features.

## 2. Authoritative I01–I26 requirement register — NEW source disposition, not copied status

| ID | Target checked against authoritative programme | Direct current-source evidence / actual limitation | Re-audit disposition |
|---|---|---|---|
| **I01** | Same letter must not falsely compare altered source/reviewed answer options | `src/engine/source-comparison.ts:44–59` hashes original/reviewed question content, stimulus and referenced image digests; `:62–89` sets comparable only on exact semantic-context match; `:140–162` computes *subset* only. No inferred correspondence by A–D letter. | **SOURCE-CONFIRMED** conservative comparator; not semantic human adjudication |
| **I02** | Frozen original/reviewed CGL results; 6 Oct Q62 exception | `src/content/import-cgl.ts:14–90` generates independent editions and source-invalid→reviewed caution without key rewrite; `src/engine/scoring.ts:54–80` excludes invalid source but scores caution; `src/app/editorial-labels.ts:7–21` distinguishes labels. Source JSON not modified in this re-audit. | **SOURCE-CONFIRMED** editorial software policy, not independent truth of question/key |
| **I03** | Reproducible pinned Node24/dependency build | `package.json` Node >=24, pins TypeScript 7.0.2/esbuild 0.25.12/Playwright 1.64.1/Wordgard 0.6.2/KaTeX 0.19.1/ts-fsrs 6.0.0; `package-lock.json` present; `.github/workflows/ci.yml` uses `npm ci` and gated deterministic build. | **SOURCE-CONFIRMED** configuration; this re-audit did not independently run a new clean installation or security advisory sweep |
| **I04** | Family→paper→edition→mode Library beyond CGL | `src/app/exam-families.ts:14–48` groups by actual examId, distinguishes trusted bundled identities and imported; `src/app/library-controller.ts:27–72,130–159,230–264` filters editions and paired paper choices. | **SOURCE-CONFIRMED**; content for other official exams is not thereby supplied |
| **I05** | Independent per-family setup, stored/restored and backed up | `src/app/practice-selection.ts:4–54` schema-2 family map; `src/app/library-controller.ts:202–230` apply/persist; `src/history/backup.ts:31–51,64–89` optional setups. | **SOURCE-CONFIRMED**; no old-version preference migration required |
| **I06** | Source-scoped deterministic custom subset by requested count and real supplied tags | `src/app/practice-compose.ts:50–65` admits eligible questions; `:89–164` deterministic seed + frozen hash manifest/paper/key/resources, rejects too few/duplicates; Library builder `library-controller.ts:81–106,300–351`. Does **not** mix arbitrary incompatible exam families, appropriately. | **SOURCE-CONFIRMED** scoped implementation |
| **I07** | Wrong/blank/slow/repeated/flagged/bookmarked/due targeted sets | `src/learning/revision-selection.ts:9–10,52–147` computes exact-hash source evidence, reason flags and insufficient evidence; `src/learning/revision-test.ts:29–74` creates separately graded frozen test; `src/app/learning-ui.ts:138–180` preview builder. | **SOURCE-CONFIRMED**; evidence-based only, not automatic skill diagnosis |
| **I08** | Scalable History/persistence; eliminate costly whole-history duplication | `src/history/shared-store.ts:9–11,35–62` two object stores, SHA-content shared once, compact attempts. **But** `src/app/persistence-controller.ts:391–395` still reads *all attempts and all snapshots* using two `getAll()` at startup; `:32–38` all attempts for backup. No paged loading or indexed metadata query. | **PARTIAL / CONDITIONAL**: dedup reduces payload, *not* lazy/paged cold loading; user-visible necessity requires more heterogeneous measured workloads |
| **I09** | Storage health/recovery, progress, warnings, safe backup | `src/app/persistence-controller.ts:123–215` CAS with explicit save lock; `:327–377` health; `:398–434` quarantines damaged local rows but locks writes and exports healthy-only; `:65–115` strict additive backup import. No safe in-app one-click recovery of original damaged items or complete lost browser-origin history. | **PARTIAL** recoverability limits and honest manual export; previous P48 repair real, not full failure-domain coverage |
| **I10** | Source topics, user topic, optional formal APFC **hierarchy**, cross-attempt accuracy/coverage | `src/learning/syllabus-taxonomy.ts:10–23` includes nine flat APFC headings (no tree/nested subtopic schema); `src/learning/learning.ts:113–176` separates section/source/user/syllabus metrics; `src/app/learning-ui.ts` user-editable topic labels. | **PARTIAL**: broad headings + free labels, **not** structured hierarchical subtopics or fully controlled taxonomy |
| **I11** | Physical macOS Safari file route/Back/Forward/reload | `src/app/navigation.ts:109–173` hash fallback; `:176–245` native intercept fallback. No physical macOS Safari execution log or Safari version/HTML hash supplied in this source. | **EXTERNAL — NOT TESTED**; release gate |
| **I12** | First visit, revisit, before-first-answer foreground phase time | `src/engine/session.ts:107–139,222–229` records real interval/first answer; `src/learning/question-analytics.ts:19–32` derives phases or unavailable. | **SOURCE-CONFIRMED** with honest optional evidence limits |
| **I13** | Archive filter frozen exam/mode/paper/status/search and inclusive local dates | `src/app/history-query.ts:27–48,61–79` validated local date and AND filters; `src/app/history-controller.ts:17–69` row-only refresh retains controls and metrics. | **SOURCE-CONFIRMED** |
| **I14** | Offline contextual figure dialog, zoom/pan/focus + safe pre-freeze image sizing | `src/app/image-viewer.ts:83–311` native dialog, local image URI, bounded up-to-8× pan and focus return; `src/app/image-preparation.ts:23–35,110–274` explicit diagram preservation, optional WebP at 0.98, ≥15% savings + fidelity/approval. | **SOURCE-CONFIRMED** code; actual device touch/AT and human figure readability still EXTERNAL |
| **I15** | Offline math, source-owned rich AST, Wordgard Library editing, immutable publication | `src/domain/rich-document.ts:48–123`, `src/app/katex-math-adapter.ts:7–37`, `src/authoring/vendor-ports.ts`, `wordgard-adapter.ts`, `authoring-studio.ts:150–568`, `authoring-publisher.ts:122–282`. Vendor authority is isolated from hashes/papers; signed-content claims mean **unkeyed SHA digests**, not publisher identity authentication. Draft shelf is separate from History backup. | **SOURCE-CONFIRMED** renderer/authoring; **LIMITS** separate draft export, manual math speech/IME and provenance |
| **I16** | Safe shortcuts, keyboard/focus priority, optionally configurable mappings | `src/app/exam-shortcuts.ts:9–26` fixed A–D/Alt-arrow/M/F; `src/app/lifecycle-controller.ts:32–77` modal/form/radio priority. **No user-editable shortcut mapping** or real NVDA/VoiceOver/TalkBack evidence. | **PARTIAL** for configuration; remapping **CONDITIONAL** not an approved mandatory feature; AT **EXTERNAL** |
| **I17** | Replace UI monolith with real typed controllers and eliminate fragile redraw | `src/app/generic-ui.ts:63–270` ~270-line composition; `src/app/coordinator-context.ts:31–123` shared typed owner; real route/library/exam/result/history/learning/persistence controllers. **But** `src/app/screen-renderer.ts:43` still reconstructs the whole root with `innerHTML` for ordinary redraws; `src/app/learning-ui.ts:100,147` replaces learning root. Targeted History filters avoid wholesale redraw. | **PARTIAL**: genuine modular stateful extraction **done**, but ordinary full DOM-replacement/focus churn remains; treat any "no whole-screen redraws" claim as incorrect |
| **I18** | Per-question/calendar deadlines | `src/domain/exam.ts:45–60` supports untimed/whole-paper/sectional only; no question-calendar deadline state, intentionally outside approved scope. | **DEFERRED optional**, not a P48 failure |
| **I19** | Dedicated unscored survey | `src/domain/question.ts:14–23` six examination response kinds only; no survey-specific nonexam workflow. | **DEFERRED optional** |
| **I20** | Actual Android/iOS, touch, assistive technology, reboot/OS eviction | Source has touch handlers and ARIA, but cannot prove device/browser/OS outcomes. No physical device, AT report, true storage eviction/reboot record. | **EXTERNAL — NOT TESTED**, release gate |
| **I21** | Verified complete APFC, CAT, UPSC, RBI content banks | `src/content/papers.json` contains bundled CGL, `src/app/bank-import.ts:182–198` only placeholder APFC/NAT two-question template; engine can import other exams but cannot supply missing official validated questions. | **PARTIAL CONTENT**, separate user/content/editorial work, not "built and verified" |
| **I22** | Threat model, hostile import, URLs/HTML, file limits, CSP/privacy | `src/app/exam-package.ts:42–85` 32MiB/150k nodes/depth 48 and `:88–115` keys/hash validation; `src/domain/media.ts:37–102` data URI/size/hash; `src/domain/rich-document.ts` restricted AST; `html-escape.ts` and output escaping. **But** `src/template.html:1–15` has no Content-Security-Policy meta; generic domain `validate.ts:13,96–192,317–397` validates *known fields* without universally rejecting unexpected extra keys. Threat-model hardening and physical OS exhaustion remain unproven. | **PARTIAL / AUDIT-OPEN** for CSP/schema hardening and independent security review; no unsupported claim that XSS is exploitable |
| **I23** | Five-store/event normalization, metadata indexes/cursor paging when evidence requires | Current two-store shared content/attempt architecture `src/history/shared-store.ts:9–11`, no event store, no cursor paged History loading; full getAll() as I08. P45 opted against five-store rewrite without measurements. | **CONDITIONAL, NOT IMPLEMENTED** normalized/event-index design; no unjustified migration requirement |
| **I24** | PWA/hosted origin/cloud accounts/telemetry/predicted national rank | `src/template.html` and `scripts/build.mjs` generate one offline standalone file with no account/cloud sync; policy explicitly defers alternatives. | **DEFERRED** user decision |
| **I25** | Clear layering, one six-kind scoring engine, one authoritative state and no debug time cheats | `src/domain/validate.ts`, `src/engine/{session,scoring,clock}.ts` are generic; `src/app/generic-ui.ts` one owner; CGL constants remain in `src/app/exam-package.ts:159–192` adapter. No release debug time branch located in reviewed engine. Shared mutable `CoordinatorContext` and full root redraw remain architectural costs. | **SOURCE-CONFIRMED engine, PARTIAL UI isolation**; code modularity ≠ no coupling |
| **I26** | Honest official vs user/imported labels and actual selected rules | `src/app/exam-families.ts:14–48` trusted bundled ID; `src/app/exam-preflight.ts:43–140` correct selected max, timing/section mode and external-source disclaimer; `src/template.html:9` global non-affiliation. | **SOURCE-CONFIRMED** distinction; no official APFC publication claim |

**Mandatory versus conditional:** I08 paged loading, I16 user remapping and I23 normalized stores are not automatically required rewrites: accepted direction is evidence-led, narrow and clean. **I11/I20 cannot be marked tested without a real device**. I21 cannot be manufactured by an engineering audit. I18/I19/I24 are explicit user-deferred features.

### Independent direct-JSON source-option audit (NOT the historical test fixture)

Read current `src/content/papers.json` and `src/content/patches.json` directly, matched patch numbers to each actual question, compared the **entire A–D option arrays**, the publisher's answer-letter text at the same position, and source vs reviewed letters. This is an independent source inventory, **not** a semantic adjudication of which option is truly correct. Five papers ×100 = **500** source items; **131** edited patch entries; **25** patches alter options; in **21/25** the source key's **same-letter option text changes**; **10** patch keys differ across *all* 131 patches (only **3** coincide with altered-options cases). Even among the four same-letter-text-retained cases, a changed option context could alter choice semantics: **no automatic "comparable" score is warranted**. A differently worded reviewed source may be educationally better without certifying the original key. The live comparator conservatively marks changed contexts unavailable.

| CGL paper (2026) | Question | Published → reviewed key | Text at published key letter | Original-key comparison |
|---|---:|:---:|---|---|
| 09-30 | 81 | B → B | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 14 | C → C | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 32 | B → B | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 50 | A → B | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 56 | A → A | Retained | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 77 | D → D | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 78 | B → B | Retained | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 81 | C → C | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-05 | 92 | D → D | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-06 | 21 | B → B | Retained | **Unavailable**: altered option context, no certified semantic mapping |
| 10-06 | 41 | A → A | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-06 | 87 | A → A | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-06 | 100 | B → B | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-07 | 8 | D → A | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-07 | 29 | B → B | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-07 | 46 | B → B | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-07 | 79 | A → A | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-07 | 83 | C → C | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-08 | 7 | D → D | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-08 | 23 | B → B | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-08 | 54 | D → D | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-08 | 79 | A → B | Retained | **Unavailable**: altered option context, no certified semantic mapping |
| 10-08 | 86 | A → A | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-08 | 93 | D → D | Changed | **Unavailable**: altered option context, no certified semantic mapping |
| 10-08 | 100 | D → D | Changed | **Unavailable**: altered option context, no certified semantic mapping |

**Adversarial mandatory item:** 5 October Q32 retains **B** as the published and reviewed letter, but the original published B (“Most targets were met, except agricultural output due to famine”) and reviewed B (“Actual GDP growth exceeded the Plan’s targeted rate...”) have different meanings. `src/engine/source-comparison.ts:78–80` must mark it **unavailable**, not score letter B as semantically identical. **Q62:** 6 October Q62 remains *source invalid/excluded*; absence of a reviewed patch is interpreted by `src/content/import-cgl.ts:32–46` as reviewed scoreable **caution**, retaining publisher key **B** without falsely calling it a verified official correction. Counts are calculated from the actual checked-in JSON at the audit snapshot. They do **not** certify their external accuracy.

## 3. Original F01–F15 — individual present-source implementation crosswalk

| ID | Specific earlier deficiency | Direct source behaviour now located | Source verdict |
|---|---|---|---|
| **F01** | No actual section consumed-clock duration | `src/engine/session.ts:79–98,236–270` closes recorded sequential section durations | PRESENT; only evidenced sections |
| **F02** | Missing executable pre-test score/editorial ceiling | `src/app/exam-preflight.ts:43–140` computes configured paper/key maximum, excluded/manual and policy | PRESENT |
| **F03** | Missing cross-paper *adjusted marks* priority | `src/app/history-priorities.ts:33–113` compatible cohort and summed earned/eligible max, separate from accuracy | PRESENT; not difficulty-adjusted |
| **F04** | Historical attempts omit frozen earned/eligible denominator | `src/app/history-score.ts:8–18`, `history-page.ts:54–74` | PRESENT |
| **F05** | Unfinished attempts mixed with last completed | `src/app/library-controller.ts:27–35,111–123,175–183` separately 5 resumable and 3 complete | PRESENT |
| **F06** | Rules lose timing/navigation/audit explanations | `src/app/exam-preflight.ts:75–187` freezes preflight/complete selected rules | PRESENT |
| **F07** | CGL image alt lacks question/option context | `src/app/exam-package.ts:118–158`, `question-content-view.ts:7–35` authored alt priority + source context | PRESENT; real AT comprehension EXTERNAL |
| **F08** | Editorial label conflates key correction/caution | `src/content/import-cgl.ts:48–64`, `src/app/editorial-labels.ts:7–22` explicit changes and independent caution | PRESENT |
| **F09** | Timing/pace absent or falsely labelled | `src/app/result-presentation.ts:40–103` measured times, coverage, per-section timer vs foreground | PRESENT |
| **F10** | Cannot mark flagged during paused exam | `src/engine/session.ts:170–176`, `src/app/exam-shortcuts.ts:16` flag-only paused | PRESENT |
| **F11** | Arrow keys conflict with native radio selection | `src/app/exam-shortcuts.ts:12–22`, `lifecycle-controller.ts:32–77` respects radio focus; Alt arrows navigate | PRESENT |
| **F12** | All Results panes eagerly materialize | `src/app/result-controller.ts:37,130–220` renders only active overview/review/timing content | PRESENT |
| **F13** | Delete allows unfinished attempts without guard | `src/history/deletion-policy.ts:10–31`, `persistence-controller.ts:216–325` double-confirm discard and version check | PRESENT |
| **F14** | Floating Display/Aa absent/inaccessible during scroll | `src/template.html:5`, `src/app/bootstrap.ts:48–65`, `src/styles/app.css:1069–1112` | PRESENT in source; physical zoom EXTERNAL |
| **F15** | Source/exam official independence disclaimer absent | `src/template.html:9`, `src/app/exam-preflight.ts:115–126` bundled/import distinction | PRESENT |

## 4. Original G01–G10 — individual generic-engine issue crosswalk

| ID | Specific earlier defect | Direct live-code evidence | Source verdict |
|---|---|---|---|
| **G01** | Whole-paper sequentially locked sections impassable | `src/engine/session.ts:179–211` explicit `SUBMIT_SECTION` transitions without resetting whole clock | PRESENT |
| **G02** | Manual sectional expiry ignored | `src/engine/session.ts:141–145,157–162` expired lock until explicit continuation | PRESENT |
| **G03** | Blank rewards exceed full correct mark | `src/domain/validate.ts:194–206` incorrect ≤ blank ≤ correct, finite bounds | PRESENT |
| **G04** | Multi-select key impossible under selection limits | `src/domain/validate.ts:243–315` validates answer entry against actual content min/max | PRESENT |
| **G05** | Matching key repeats left or right endpoints | `src/domain/validate.ts:285–314` enforces uniqueness against left/right inventories | PRESENT |
| **G06** | `allowReview=false` doesn't withhold question/key | `src/app/route-controller.ts:52–55` blocks review route, `result-controller.ts:38–41` hides detail | PRESENT; embedded offline bytes are not encrypted |
| **G07** | Under-minimum multi-select draft disagrees with committed answer | `src/app/exam-controller.ts:49–67` explicit UI draft and `CLEAR` of stale committed score response | PRESENT, on-page drafts not durable by design |
| **G08** | Matching UI accepts duplicate right side though engine rejects | `src/app/exam-controller.ts:72–126` detects duplicate targets and disables Save with ARIA | PRESENT |
| **G09** | Partial credit can exceed full ceiling or misstate floor | `src/engine/scoring.ts:27–42,69–75` clamps partial ≤ full; `src/engine/score-ceiling.ts:15–66` conservative lower bound | PRESENT |
| **G10** | Historic v11 migration/restore expectations | **Binding D38:** none required. `src/history/backup.ts:13–26` v4 only; **but** `src/engine/source-comparison.ts:25–40,91–125` retains a legacy schema-1 source-key comparison *read path* and `result-controller.ts:63,106–108` legacy warning. | **ACCEPTED no migration; small avoidable legacy seam still present** — evaluate before removing |

## 5. Original visual/semantic L01–L11 + additional F29-01–03 — code paths, not screenshot self-certification

| ID | User-facing requirement | Source owner and exact implementation cue | Source verdict |
|---|---|---|---|
| **L01** | Paper selection and Start before ancillary dashboard | `src/app/library-controller.ts:130–159` primary paper/edition/mode/start, statistics at `:188–199` afterward | PRESENT; physical first-fold quality EXTERNAL |
| **L02** | Compact exam question, visible Next and Flag | `src/app/exam-view.ts:68–115` and responsive exam CSS `src/styles/app.css:550–640` | PRESENT; no fresh human screenshot inspection in this source audit |
| **L03** | Long passages not consuming entire initial viewport | `src/app/question-content-view.ts:80–97` stimulus; `src/styles/app.css:607–612` scrollable/keyboard region | PRESENT; actual viewport quality EXTERNAL |
| **L04** | Figure choices usable and not lost below task | `src/app/question-content-view.ts:7–35` with media; CSS image sizing and P47 viewer `image-viewer.ts:83–311` | PRESENT; physical readability EXTERNAL |
| **L05** | History saved rows precede secondary charts | `src/app/history-page.ts:110–150` archive before lower analytics/storage | PRESENT |
| **L06** | Results section-performance near top | `src/app/result-controller.ts:80–86,130–156` table in Overview preceding scoring details | PRESENT |
| **L07** | Display Light/Dark control text wrapping at 140% | `src/template.html:5`, `src/styles/app.css:688–700` theme choices/reflow | PRESENT; physical zoom EXTERNAL |
| **L08** | Only actually changed key labelled Key corrected | `src/content/import-cgl.ts:48–64` records effective answer/wording change; `editorial-labels.ts:7–22` | PRESENT |
| **L09** | Whole-paper timer not wrongly called Section timer | `src/app/exam-view.ts:46–57` label branches on frozen timing kind | PRESENT |
| **L10** | Friendly CGL practice names, no raw mode slug | `src/app/exam-view.ts:8–17`, `src/app/exam-preflight.ts` | PRESENT |
| **L11** | Stable Result H1 across selected tabs | `src/app/result-controller.ts:130–138` constant “Attempt analysis” | PRESENT |
| **F29-01** | Reopened result resets stale selected tab/filter | `src/app/route-controller.ts:71–73` resets review filter on record/view change; selected tab is route-specific | PRESENT |
| **F29-02** | 195px/140% History overflow | `src/styles/app.css:700–741` intrinsic-width fixes; `history-page.ts` structure | SOURCE GUARD PRESENT; exact geometry cannot be established by source alone |
| **F29-03** | 195px/140% Learning overflow | `src/styles/app.css:741–760`, `src/app/learning-ui.ts` | SOURCE GUARD PRESENT; exact geometry cannot be established by source alone |

**Visual evidence boundary:** prior screenshot matrices are historical evidence of particular browser/viewport runs; they were **not re-run and visually inspected afresh in this source-only re-audit**. Do not use their green result to certify current laptop aesthetics. The current user's demand was to verify actual architecture and implementation, not reinstate mandatory pixel parity with v11.

## 6. Original 28 October architecture audit, sections 1–28, accounted for explicitly

| Original section | Original concern / actual target or nature | Where covered now |
|---|---|---|
| 1 | Executive summary, assessment (not discrete feature) | Entire I register; release distinction |
| 2 | Source/runtime audit scope | This source inventory and documented limitations |
| 3 | SSC hard coding → generic engine | I04–I06, I25/I26, G01–G09 |
| 4 | Formal state machine | I12/I25, G01–G02, F10; `engine/session.ts` |
| 5 | Wall-clock, foreground and section timer | I12, F01/F09; `session.ts`, `clock.ts`, `frozen.ts` |
| 6 | Score rules and publisher comparison | I01/I02/I26, G03/G09, P41 |
| 7 | Immutable question/key revisions | I01/I02, `domain/integrity.ts`, `history/frozen.ts` |
| 8 | Editorial source/review quality controls | I01/I02/I26, F08/L08; Q62 binding exception |
| 9 | IndexedDB model/normalization | I08/I23: current two stores, no cursors/pages |
| 10 | Persistence/recovery/backup | I09, F13, P48-R01; explicit no OS proof |
| 11 | Separate source, attempt and learning data | `domain/*`, `history/shared-store.ts`, `learning/learning.ts` |
| 12 | More question types | Six kinds `domain/question.ts:14–23`, `engine/response.ts`, `question-content-view.ts`; survey deferred I19 |
| 13 | Exam/paper/edition hierarchy | I04/I21, `exam-families.ts` |
| 14 | Saved test presets | I05/I26, `practice-selection.ts` |
| 15 | Existing analytics limitations | I07/I10/I12, `attempt-evidence.ts` |
| 16 | Immediate, topic, error and longitudinal levels | I07/I10, F03/F09, `history-metrics.ts`, `learning.ts` |
| 17 | Additional evidence-rich analytics, no invented rankings | I07/I10/I12, `question-analytics.ts`; optional predictions deferred I24 |
| 18 | Revision/notebook short practice engine | I07, `revision-selection.ts`, `revision-test.ts` |
| 19 | Existing UI strengths (retention constraint) | F/L/UI source matrix |
| 20 | Library, History and test UX refinements | I13–I17, L/F29 and manual release |
| 21 | Payload/media/performance and source modularity | I03/I08/I14/I15/I23/I25 |
| 22 | Security/privacy/import validation | I09/I22 and CSP/schema evidence gap |
| 23 | Functional regression suites and real-world gates | P42/P48 current source CI design and external matrix |
| 24 | Conceptual independent application layers | Layer inventory below |
| 25 | Generic example definition, not official exam | I04/I05/I21/I26, six-kind package |
| 26 | Five-phase architecture upgrade sequence | P41–P47 software owner crosswalk; P48 independently reopened |
| 27 | Retain/redesign/remove list incl. old-debug timer | I08/I09/I12/I17/I23/I25, plus standalone artifact |
| 28 | Generic local-first final direction | Implemented engine core; remaining source risks and manual release |

### Conceptual target layers (original §24), reconciled against actual ownership

| Layer/component | Actual code owner | Architecture judgement |
|---|---|---|
| Presentation | `src/app/{library-controller,exam-view,result-controller,history-page,learning-ui}.ts`, CSS/template | Real UI modules; root/learning HTML rebuild persists |
| Exam configuration | `src/domain/exam.ts`, `validate.ts`, `exam-package.ts` | Generic, versioned, rule-specific; CGL constants adapter-scoped |
| Question bank | `src/domain/question.ts`, `answer-key.ts`, `integrity.ts`, `src/content/`, `authoring-publisher.ts` | Frozen SHA integrity, source/reviewed distinction; content authenticity not externally certified |
| Session engine | `src/engine/{session,clock,response}.ts` | Deterministic core, clocks, navigation |
| Scoring engine | `src/engine/{scoring,score-ceiling,manual-grading}.ts` | Policy-driven not CGL-only |
| Persistence | `src/history/{shared-store,frozen,backup,concurrency}.ts`, `persistence-controller.ts` | Two-store architecture, transactional CAS, strict backup, partial local corruption quarantine; startup getAll |
| Analytics/Learning | `src/learning/*.ts`, `src/app/history-{metrics,priorities}.ts` | Evidence-led topic/revision and FSRS; flat APFC headings |
| Application services | `src/app/{generic-ui,coordinator-context,route,library,screen,persistence}-controller.ts`, import/validation | Cohesive controllers but broad common mutable interface and whole-root render continue |

## 6A. Original Pass36–40 test-suite engineering programme — all 15 TS findings rechecked

This is **testing architecture evidence**, not proof that exam behaviour is correct. Checked the actual current `tests/*.test.mjs` inventory (**21 capability files**), `scripts/acceptance-*.mjs` (**21 browser scripts, including 13 permanent core journeys and P47/P48 feature-specific extensions**), `package.json`, `.github/workflows/ci.yml` and test runner assets, rather than the earlier programme's historical completion claim. No `scripts/passNN-*.mjs` or `smoke-offline.mjs` remains. The core browser suite count **13** is not the same as the total current number of browser scripts **21**. The last green CI ran 274 Node tests, but a current structural inspection is not a fresh execution.

| TS issue | Target in archived test re-engineering programme | Live code/QA topology and remaining boundary | Source conclusion |
|---|---|---|---|
| **TS-01** | Replace chronological pass-number tests with capability ownership | `tests/{content-and-provenance,exam-scoring-and-policy,history-and-persistence,learning-and-analytics,...}.test.mjs` and P47/P48 named focused suites. Some consolidated files still contain old “Legacy suite” source annotations. | **PRESENT**, minor historic naming/comment debt |
| **TS-02** | Independent/property/model scoring and state oracle | `tests/exam-scoring-and-policy.test.mjs` contains seeded independent scorer and precedence/negative mark checks; `tests/session-and-timing.test.mjs` model transitions. Code still needs new adversarial tests when fresh source flaws emerge. | **SOURCE OF INDEPENDENT ORACLES PRESENT**; not full proof over all state space |
| **TS-03** | NAT tolerance, precision, exact boundary cases | `src/engine/scoring.ts:18–20` numeric absolute-vs-relative tolerance; `tests/exam-scoring-and-policy.test.mjs` boundary test cases. | **PRESENT** testing capability |
| **TS-04** | Time interleavings, stale-tab, backup and recovery models | `tests/{history-and-persistence,session-and-timing,p48-recovery-integrity}.test.mjs`, `scripts/{acceptance-resilience,acceptance-partial-recovery}.mjs`; actual OS-origin eviction still external. | **PRESENT; external failure domain remains** |
| **TS-05** | Hostile imports and large-history/response stress | `tests/exam-package-and-import.test.mjs`, `scripts/{acceptance-bank-modes,acceptance-stress,benchmark-storage}.mjs`. | **PRESENT**, security/CSP gap separately tracked R48-07 |
| **TS-06** | Consolidated learning/analytics/UI-state tests | `tests/{learning-and-analytics,revision-evidence,ui-and-navigation}.test.mjs`. | **PRESENT** |
| **TS-07** | Remove duplicated ad-hoc browser launches | One `scripts/browser/fixtures.mjs` and current capability browser scripts; no old `scripts/passNN*` files. | **PRESENT**; 21 current scripts still require justified ownership |
| **TS-08** | Retire routine v11 screenshot parity | No historic passNN screenshot parity scripts; targeted Wordgard authoring screenshot QA remains because newly introduced user-visible editor needs inspection. | **PRESENT** (do not treat every screenshot as waste) |
| **TS-09** | Broaden Firefox and WebKit | `.github/workflows/ci.yml` builds/tests Chromium+Firefox+WebKit; current authoring, maths, image and P48 recovery test steps available across engines. | **SOURCE-CONFIRMED** pipeline wiring; not physical Safari |
| **TS-10** | Automated rules-oriented accessibility audit | Browser tests inspect ARIA/focus/contrast/overflow; `package.json` includes no dedicated axe-core or equivalent comprehensive accessibility engine, and no real AT is run. A few targeted rules do **not** equal a systematic WCAG or AT audit. | **PARTIAL / EXTERNAL**; identify required testing standard before adding tooling |
| **TS-11** | CI duplicate work/artifacts/permissions and publisher gates | `.github/workflows/ci.yml:1–225` Node/build, separate browser jobs, publisher with write only after green and tested SHA/source drift check. | **SOURCE-CONFIRMED** constraints; runner efficiency remains workload-specific |
| **TS-12** | Retire Pass21→22 old SHA/DOM benchmark gate | Old numbered script absent; current `benchmark-ui-coordinator.mjs` and `benchmark-storage.mjs` profile features without enforcing frozen v11 pixel/DOM measurements. | **PRESENT** |
| **TS-13** | Canonical AGENTS/docs must not prescribe old pass gates | `AGENTS.md`, `docs/ENGINEERING_PROGRAMME.md` active; archived old reports preserved. This audit found stale active headers/metrics and documents them as R48-14, rather than pretending all docs were current. | **PARTIAL documentation drift**, currently under correction |
| **TS-14** | Assertion-by-assertion old→new trace before retirement | `docs/audits/TEST_SUITE_REENGINEERING_PLAN_2026-11-01.md` includes historical mapping and the present tree has no retired browser scripts. Independent verification of *every* old assertion against present source is not performed in this re-audit. | **SOURCE MAPPING EXISTS; INDEPENDENT REVALIDATION LIMITED** |
| **TS-15** | Deterministic dependencies, fixtures, CI; avoid flaky tests | Pinned `package-lock.json`, Node24 CI, source build equality, explicit browser engines and seeded model tests. The prior P48 interim failed stale-tab and editor startup runs show nondeterministic risks require ongoing attention, not just a pass count. | **PRESENT CONTROLS, continuous flakiness monitoring still CONDITIONAL** |

### 6B. Question bank, editor and data contract guide — granular controls

Source guide: `docs/architecture/QUESTION_BANK_AUTHORING.md`; primary current code: `src/authoring/`, `src/app/bank-import.ts`, `src/app/authoring-controller.ts`, `src/app/exam-package.ts`, `src/domain/{integrity,media,rich-document}.ts`. These are capabilities of the **current user-facing application**, not claims of accurate officially verified authored questions.

| QB ID | Authored/import feature | Current code evidence and qualification | Source disposition |
|---|---|---|---|
| **QB01** | Edit plain JSON simple MCQ + NAT bank, no manual SHA authoring | `src/app/bank-import.ts:40–180,182–205` constructs validated signed revisions from simple source | **PRESENT** |
| **QB02** | Non-CGL full six-kind answer engine and advanced import | `src/app/exam-package.ts:88–115`, `src/domain/validate.ts:96–192,243–315`, `src/engine/response.ts` | **PRESENT** |
| **QB03** | Graphical integrated Library Wordgard draft studio | `src/authoring/authoring-studio.ts:150–568`, `src/app/library-controller.ts:154–159,381–385` | **PRESENT**, editor instantiated on demand in Library |
| **QB04** | Source-owned rich AST, no vendor HTML in persisted question | `src/domain/rich-document.ts:48–123`, `src/authoring/wordgard-document-bridge.ts:19–142`, `vendor-ports.ts` | **PRESENT** |
| **QB05** | Inline and display maths/accessible linear alternative | `src/app/katex-math-adapter.ts`, `src/authoring/authoring-studio.ts:493–513`, `src/app/rich-content-view.ts` | **PRESENT**; real spoken math quality EXTERNAL |
| **QB06** | Local image IDs/alt/strict image digest and pre-freeze preparation | `src/authoring/authoring-studio.ts:243–270,514–539`, `src/domain/media.ts:37–102`, `src/app/image-preparation.ts` | **PRESENT** |
| **QB07** | WYSIWYG passage, editable table, formatting/undo/redo, readonly preview | `src/authoring/authoring-studio.ts:100–141,386–391,450–512`, `wordgard-adapter.ts` editing commands. Undo/redo exact browser UX/IME fidelity not independently exercised here. | **SOURCE-PRESENT; interaction quality EXTERNAL** |
| **QB08** | Validate errors and publish immutable six-kind new paper/key/source revision | `src/authoring/authoring-publisher.ts:122–180,180–282`, `src/app/authoring-controller.ts:12–34` waits durable save before Library selection | **PRESENT**, user keys not officially certified |
| **QB09** | Source/Reviewed separately with provenance and no overwrite | `src/authoring/authoring-publisher.ts:136–147` requires reviewed counterpart/source note, `:243–272` unique edition/revision; `src/app/authoring-controller.ts:18–32` refuses duplicate | **PRESENT** |
| **QB10** | Hide expected answers/solutions before finish and keep old snapshots stable | `src/app/exam-view.ts`, `src/app/result-controller.ts:33–156`, `src/history/frozen.ts:28–60`; imported package is frozen on start | **PRESENT** in UI/session architecture; JSON source/backup are not secret-encrypted against a motivated local owner |
| **QB11** | Keep mutable unpublished drafts backed up | `src/authoring/authoring-studio.ts:168–194,232–242` localStorage shelf + independent JSON export; **not** included in History backup. | **PARTIAL USER-DATA PROTECTION / explicitly disclosed separate export**, no invisible auto-backup |
| **QB12** | Author-defined advanced partial-credit/timer/section policies in WYSIWYG | Studio publisher `src/authoring/authoring-publisher.ts:262–272` uses default uniform rule and whole-paper/untimed; advanced six-kind imported package supports sectional/overrides elsewhere. | **PARTIAL EDITOR CAPABILITY; user expressly did NOT require CA-level/all-exam authoring controls** |
| **QB13** | Automatic PDF/DOCX/CSV/PDF screenshot conversion into editable questions | No parsers/connectors for such sources in `src/app/bank-import.ts` or studio; guide expressly excludes them. | **DEFERRED**, not falsely claimed implemented |
| **QB14** | Vendor source pristine; selective self-contained runtime, no CDN | `package.json` exact pinned vendors; `scripts/build.mjs:4–47` esbuild bundle and locally inlined KaTeX fonts; `src/template.html` standalone injection | **PRESENT BUILD DESIGN**; no fresh vendor source-file audit or install-license sweep in this re-audit |

### 6C. Documentation/contract consistency and strict traceability

| DOC ID | Exact documentation requirement | Source/doc observation | Status |
|---|---|---|---|
| **DOC01** | Engineering programme is single active future plan | `docs/ENGINEERING_PROGRAMME.md` current register; linked standalone source annex is *evidence*, not an independent product roadmap. | **PRESENT**, P48 now reopened |
| **DOC02** | Old reports archived not current claims | `docs/history/` and `docs/audits/` preserved. Some dated passages use “OPEN” as the then-correct state; current headers must label these historical. | **PARTIAL doc drift** R48-14 |
| **DOC03** | Source-only CGL/Q62 and import policy described accurately | `src/content/import-cgl.ts`, `src/app/exam-preflight.ts`, `POLICY_REGISTER.md` D02/D03. | **SOURCE PRESENT**, external answer-key truth not reverified |
| **DOC04** | Current QA test counts and scripts actually match tree | Tree has **21** `tests/*.test.mjs` and **21** `scripts/acceptance-*.mjs` (13 core), last CI **274/274**. `docs/QA_CURRENT.md` formerly labelled **238/238** as current; its live current section is now corrected to 21 Node suite files, 21 browser scripts and 274/274 at last historical CI. | **DOCUMENTATION CORRECTED in this source-only review**; not a runtime bug |
| **DOC05** | Authoring guide accurately describes current WYSIWYG/Publish | `docs/architecture/QUESTION_BANK_AUTHORING.md:9,11` still says WYSIWYG unavailable/publishing gated even though same guide :19 and source `authoring-controller.ts` show it live. | **STALE CONFLICT — CORRECT** |
| **DOC06** | Architecture as-built doesn't still call coordinator monolith | `docs/architecture/CURRENT_ARCHITECTURE.md:112` historical “Debt” says `generic-ui.ts` still combines storage/routing (pre-P47-6) while current file is a 270-line composition root. | **STALE CONFLICT — CORRECT** |
| **DOC07** | Avoid misleading “authenticated” source or “signed SHA” | `src/domain/hash.ts` plain unkeyed SHA-256; no publisher signature/issuer verification. | **LANGUAGE GAP** R48-08 |
| **DOC08** | Physical-device/manual result separately listed, no false approval | `docs/QA_CURRENT.md` physical Safari checklist; this new annex's manual matrix. | **PRESENT external stop gate; devices NOT TESTED** |
| **DOC09** | No migration/compat requirement D38 | `docs/decisions/POLICY_REGISTER.md` D38 binding, current v4 backup only, but schema-1 publisher-comparison bridge remains in code. | **PARTIAL LEAN IMPLEMENTATION** R48-09 |
| **DOC10** | Security policy says “strict schema” and “correct offline CSP” | `src/domain/validate.ts:13` accepts generic object fields without universal unknown-key rejection, `src/template.html` lacks CSP. | **OPEN / source issue**, do not fabricate exploit |

## 7. P41–P48 detailed acceptance and technical constraints — no test-based shortcuts

| Pass/contract | Current implementation trace | Re-audit judgement / what is not established |
|---|---|---|
| P41-01–06 comparator/25 altered options/Q32, preserve key and 10 editions | `source-comparison.ts:44–162`, `import-cgl.ts`, `content/papers.json`, `patches.json`, `result-controller.ts:42–125` | Software conservative exact matching present. **The 25 altered-option patches were independently enumerated from the checked-in JSON above**, but the original answers were not externally re-certified; original source content is not thereby substantively re-certified |
| P42 pinned tools/hostile import/release limitations | `package.json`, `package-lock.json`, CI, `exam-package.ts:42–115`, `domain/media.ts:37–102` | Build/source gates exist; **current CSP and unknown-field policy require security decision**; real OS/supply-chain sweep not executed |
| P43 independent family setup + source/reviewed selector | `exam-families.ts`, `practice-selection.ts`, `library-controller.ts`, `backup.ts` | Code path present, not proof of a ready-to-use full CAT/APFC content bank |
| P44 immutable selection/source manifest/deterministic seed | `practice-compose.ts:50–164`, `library-controller.ts:81–106,300–351` | Present for compatible one-paper source; mixing exams appropriately refused |
| P45 cold profile/2-store decision/health | `shared-store.ts:9–145`, `persistence-controller.ts:26–115,123–215,327–465` | Compression/dedup present, but all rows/snapshots eagerly loaded. New heterogenous corpus measurements needed before calling scaling final |
| P46 evidence/error/FSRS/topic taxonomy | `revision-selection.ts`, `revision-test.ts`, `learning.ts`, `syllabus-taxonomy.ts`, FSRS adapter | Evidence selection present; hierarchy is not tree-shaped, true cognitive cause not inferred |
| P47-0/1 independent module profiling/extraction | `benchmark-ui-coordinator.mjs`, `generic-ui.ts` + controllers | Substantive extraction present; no “zero whole-screen redraws” claim |
| P47-2 History AND filters/local dates/orphan | `history-query.ts`, `history-controller.ts`, `history-page.ts` | Present from source |
| P47-3/3B local media enlarged/prepared without alteration | `image-viewer.ts`, `image-preparation.ts` and signed media | Present; actual touch/human optical readability not measured here |
| P47-4 shortcuts/focus/retained History inputs | `exam-shortcuts.ts`, `lifecycle-controller.ts`, `history-controller.ts` | Fixed shortcuts and row-only History update present; remapping conditional, AT manual |
| P47-5A–D neutral AST/KaTeX/Wordgard/publish | `rich-document.ts`, `katex-math-adapter.ts`, `wordgard-adapter.ts`, `authoring-studio.ts`, `authoring-publisher.ts` | Present in source; editing shelf separate backup, hardware IME/exact math speech not witnessed |
| P47-6 **complete stateful coordinator replacement** | `generic-ui.ts` + `coordinator-context.ts` + feature controllers | Real stateful decomposition present; **single broad mutable owner remains and ordinary whole-root re-render persists** |
| P47-7 remove dead paths/reconcile obligations | `source-comparison.ts:25–40` legacy snapshot bridge, `result-controller.ts:42–51` old bundled fallback | More residual compatibility code exists than “none left”; screen redraw debt not eliminated, requires conscious accept/remove rationale |
| **P48** independent **all** foregoing + real device/manual release | This separate annex demonstrates why prior P48 source audit was incomplete. Earlier CI covers limited automated pathways but is not an independent new implementation check for everything. | **REOPENED. Do not mark P48 complete until each material gap has documented acceptance/disposition, mandatory manual evidence is provided or expressly waived, and release decision separately approved.** |

**Cross-layer contracts rechecked from code:** one offline HTML; source/edition separation; original CGL exception; six validated responses; answer/solution embargo via active-exam vs result renderer; finite score and capped partials; section/whole/untimed policies; replayed foreground time; immutable attempts with media; same-bookmark source hashes; no UI-derived official certification; CAS/no-overwrite; explicit unsafe storage lock; post-submit manual pending separated; honest comparable marks. These are source implementation observations. The absence of a newly introduced independent adversarial test for each does not itself make the software wrong, but prohibits calling the re-audit complete based only on earlier test fixtures.

## 8. New consolidated risk and gap register with actionable ownership

| ID / rank | Evidence-backed discrepancy, not a historical TODO echo | Engineering response / accepted exception / precise gate |
|---|---|---|
| **R48-01 / RELEASE-BLOCKING** | I11/I20 physical Safari/native file routing, Android/iOS touch, actual screen readers, hardware IME, OS eviction/reboot have **not been observed**. | Keep physical matrix **NOT TESTED**; use `docs/QA_CURRENT.md` Safari 10-step checklist and a separate device/AT report with OS/browser versions, exact standalone HTML hash, PASS/FAIL evidence. No main merge or public approval. |
| **R48-02 / AUDIT PROCESS** | Original “P48 automated verified” narrative records a narrow IndexedDB corruption fix and CI counts rather than the entire current code-to-objective reconciliation. | This source annex is the **first complete requirement inventory**; keep P48 OPEN until its findings are independently reviewed/accepted and unresolved relevant gaps triaged. Do not relabel earlier tests as new discoveries. |
| **R48-03 / P2 CONDITIONAL PERFORMANCE** | Two-store dedup reduces memory footprint, but `persistence-controller.ts:391–395` still executes unbounded full `getAll()` on every startup and serializes all rows for backup. | Profile realistically heterogeneous 0/100/1000/1600+ records, nontrivial images, imported families, pending sessions, FSRS cards and desktop/mobile cold-open. Decide only then whether cursor/index/paged metadata is justified. |
| **R48-04 / P2 TOPIC MODEL** | APFC nine broad syllabus headings are a flat array; only per-question editable free-text user label supplements them, not a formal subtopic tree. | Clarify whether user requires hierarchical classified subtopics beyond the accepted optional first-step catalogue. If required, add explicit opt-in nested taxonomy with provenance, editable classification, no inferred topics. |
| **R48-05 / CONDITIONAL SHORTCUTS** | Current keyboard map is fixed; no remap UI. | Already explicitly conditional: document as **NOT IMPLEMENTED / NOT REQUIRED**, revisit only upon real request. Real AT remains release-gated. |
| **R48-06 / P2 UI LIFECYCLE** | Typed modular extraction coexists with `screen-renderer.ts:43` root `innerHTML` recreation and `learning-ui.ts:100,147` Learning redrawing. Focus restoration is heuristic. | Audit high-frequency redraws, file:// route switch, editor/IME focus, screen reader announcements and cleanup. Repair *demonstrated* focus/data loss, not arbitrary rewrite based on LOC. |
| **R48-07 / P2 SECURITY DESIGN — P48-1 CODE APPLIED, BROWSER QA PENDING** | Earlier absent CSP and permissive unknown fields were independently reproduced. `scripts/build.mjs` now hashes the **exact inline runtime bytes** into a pre-script file:// meta CSP; `src/domain/validate.ts`, full/simple package import and backup v4 use strict unknown-key rejection. `tests/p48-security-integrity.test.mjs` + new three-engine browser injection gate. No proof of cross-browser CSP enforcement until final successful current-source CI. | **SOURCE FIX APPLIED, FINAL QA PENDING.** Browser-only and actual-device exclusions remain explicit. |
| **R48-08 / P2 PROVENANCE LANGUAGE — P48-1 SOURCE/UI REPAIRED** | Unkeyed SHA-256 is content-integrity/corruption detection, **not** an author or publisher identity signature. Updated visible Library, authoring and History/recovery language, versioned backup comments, publisher documentation; generated runtime meta CSP separately hashes executable script bytes. | **SOURCE + USER TEXT UPDATED**, with unkeyed-content-authentication limits documented. |
| **R48-09 / LEAN ARCHITECTURE REVIEW — P48-1 FIX APPLIED** | Removed deprecated `LegacySourceKeyReference.schema=1` reader and mutable current-Library source lookup from Results. Current schema-2 source-key and current-format frozen `SourceReviewReference.schema=1` (separate type) are preserved; frozen display package remains required for result media. Old migration tests now assert fail-closed. | **SOURCE FIX APPLIED**, full CI pending; D38 clean break. |
| **R48-10 / P2 STORAGE RECOVERY LIMIT — SAFE GUIDANCE UPDATED, FORENSIC RESTORE OUT OF SCOPE** | Partial/quarantined local storage remains read-only, original damaged bytes retained; exported archive contains **only accessible verified records** and can omit damage. Added explicit on-screen clean-profile restore/retention guidance; checksum is not identity proof. | **SAFE DISCLOSURE IMPLEMENTED**, in-place repair/true OS eviction NOT TESTED. |
| **R48-11 / DESIGN DISCLOSURE** | Wordgard unpublished shelf lives in localStorage and is *not* included in standard History backup; separately downloadable JSON only. | Already an explicit product design. Keep prominent warning and ideally evaluate one consolidated user-data export **only with approval**, no unannounced schema changes. |
| **R48-12 / CONTENT WORKSTREAM** | Only bundled CGL and placeholder authored APFC/NAT starter; no full separately source-verified official APFC/CAT/UPSC/RBI paper bank. | Separate content acquisition/editorial verification. Never describe engine flexibility as official question-bank coverage. |
| **R48-13 / UI HUMAN SIGNOFF** | CSS guards and prior screenshots do not establish that the latest Library/Exam/History/Results/Wordgard designs are good on the user's laptop/phone. | New independent current-app screenshots plus human look/feel review can be organised without reinstating v11 pixel-parity tests; physical visual signoff remains separate. |
| **R48-14 / LIVE DOC ACCURACY (REPAIRED)** | Actual source/doc crosswalk found `docs/QA_CURRENT.md` wrongly labelled older 238/238 as current, Wordgard authoring guide both confirmed and denied published WYSIWYG, and current architecture guide still called the old monolith active. These **live** passages were corrected to current 21 Node/21 browser suite files and latest historical 274/274, actual published Wordgard and current composition root. Older dated stage reports are intentionally preserved. | **DOC-ONLY REPAIR COMPLETE**. Prior misleading docs were real and exposed weakness in P48’s previous “closed” conclusion; no application code, key, score, schema or test was changed. |

## 9. Physical/manual evidence matrix (not computer-simulated)

| Requirement | Source support | Actual external evidence | Status |
|---|---|---|---|
| macOS Safari `file://` Library→Exam→History→Result→Learning, Back/Forward/reload and Wordgard/image | Native/fallback router and local assets exist | No macOS/Safari build/version, live navigation log or device screenshots | **NOT TESTED** |
| iOS/iPadOS/Android touch, 195px/140% real scale, pan/zoom/keyboard | Pointer/touch + CSS paths | No device/browser outcomes | **NOT TESTED** |
| NVDA, VoiceOver, TalkBack, math speech/dialog/radios/live status | ARIA and MathML markup | No independent AT interaction transcript | **NOT TESTED** |
| Hardware composition/IME (Wordgard, numeric and text answer) | Input/editing event handlers | No physical IME test | **NOT TESTED** |
| OS-kill, reboot, real origin quota eviction, bank/history/FSRS backup recovery | Local IndexedDB, emergency mirror, backup4 | No OS-kill/reboot/eviction evidence, only bounded browser simulation/Chrome profile restart in prior CI | **NOT TESTED** |
| Human approval of 1366/1440 laptop and mobile visual ergonomics | CSS and UI code present | No current user/human source-head visual signoff | **NOT APPROVED** |
| Merge/distribution beyond `overhaul` | GitHub guarded publisher present | User has not approved merge to `main` or changes to `baseline/v11` | **NOT APPROVED** |

## 10. Reopened P48 implementation/verification ledger — sequenced, not “one bug then close”

| Stage | Acceptance and tangible output | Current status |
|---|---|---|
| **48-R0** Freeze current SHA, inspect every authoritative document/26 I issues, 25 F/G, 14 L/F29 and 28 original sections *against actual source* | This annex, complete one-by-one crosswalk | **SOURCE INVENTORY DOCUMENTED**; user review/independent challenge welcome |
| **48-R1** Reproduce and resolve any demonstrable P0/P1 contradiction in score/data/authoring/OS; preserve source and rollback | No new unproven P0 asserted; prior corrupt DB startup fix retained and traced | **REVIEWED; keep open for new source findings and adversarial checks** |
| **48-R2** Triage R48-03–14: mandatory issue vs explicitly optional/deferred; assign decision, testable acceptance and exact fix if required | Distinguish performance/UX/security ambiguity, known non-goals and missing evidence | **OPEN** |
| **48-R3** Independent targeted negative tests where source review reveals previously untested failure modes; run strict build/full CI **after** any actual source change | No green check assumed from earlier run, no duplicate cosmetic tests | **NOT STARTED for any new fixes** |
| **48-R4** New current-source responsive screenshots and genuinely human/device/AT/IME/eviction matrix | Log PASS/FAIL/NOT TESTED, Safari support and evidence identity | **EXTERNAL OPEN / NOT TESTED** |
| **48-R5** Final exhaustive discrepancy closure, source diff, security/lean review, reproducible build, guarded artifact and explicit user's merge/release decision | Mark only what evidence supports; no automatic public distribution | **OPEN, RELEASE HOLD** |

**Current decision:** The old D59 narrow P48 automated result stands as a historical successful test, **not** a verified comprehensive P48 closure. The complete P48 programme is **REOPENED**. A green Node/browser CI suite is *necessary but insufficient* to complete this record or approve release.
