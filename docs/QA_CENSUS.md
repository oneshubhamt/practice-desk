# Practice Desk QA census and canonical contract map — Pass A

> Scope: documentation-only census of the `working` branch at source head `89068e83f26057c50fac47db6ac1741774aa8fef`. No production code, test behavior, or CI behavior is changed by this pass.

## 1. Baseline

The current QA surface contains **48 Node test files / 441 Node test cases**, **33 executable browser acceptance scripts** (plus the acceptance harness), and specialized FSRS-browser and targeted mutation runners. The dedicated Node tests plus acceptance/browser support are about **1.03 MB**, compared with about **1.86 MB** under `src/`. The current CI executes 33 Chromium journeys and 21 journeys in each of Firefox and WebKit: **75 browser-journey executions** per full source run.

Pass A does not authorize removals. It classifies the existing suite so later consolidation can preserve invariants rather than preserve historical filenames.

### Legend

| Field | Meaning |
|---|---|
| risk | Product risk primarily protected. |
| invariant | What must remain true independent of implementation shape. |
| cheapest valid layer | Lowest layer that can prove the invariant without losing realism. |
| disposition | Pass-A assessment only: keep, consolidate, rewrite heuristic, deep/stress, or optimize support. |
| overlap group | Stable capability cluster for finding duplicate witnesses. |

Layers progress from `domain-property` through `integration-contract`, `architecture-graph/build-contract`, `browser-acceptance`, and `deep-stress`. `support-preflight` is QA-harness behavior rather than product correctness.

## 2. Canonical contract map

| Overlap group | Canonical witness direction | Existing overlap | Pass-B rule |
|---|---|---|---|
| `scoring-policy` | Canonical: exam-scoring-and-policy + session-and-timing | content/provenance caps; package/import; p56 audit; bank/session/critical browser journeys | Node reference/property model owns mathematics; browser only controls/visibility/one score smoke. |
| `timing-evidence` | Canonical: session-and-timing + question-timing-phases + cleer-invariants | learning timing; revision pacing; recovery/session browser journeys | Node state model owns time conservation; browser only visibility/lifecycle integration. |
| `persistence-recovery` | Canonical: history-and-persistence + p48-recovery-integrity + cleer-terminal-cleanup | p58 workspace; p56 audit; partial-recovery/recovery/resilience/history browser journeys | Keep real IDB failure/concurrency in browser; combinatorics and CAS in Node. |
| `authoring-core` | Canonical: authoring-domain + p57c staging + p58 exchange | p54/p56/p60 handoff plus multiple authoring browser journeys | Retain one publication browser journey and one staging/editorial journey. |
| `content-lineage` | Canonical: content-and-provenance + p60d editorial-editions | p57 external bank, p60f handoff, editorial-provenance browser | Node hashes/lineage canonical; browser verifies no leak and edition switching. |
| `learning-fsrs` | Canonical: learning-and-analytics + revision-evidence + optimizer runtime smoke | critical/learning-lifecycle/p55 browser scripts | Scheduler/optimizer mathematics in Node/native; one browser lifecycle plus Worker/WASM boundary. |
| `history-filters` | Canonical: p47-history-filters + history-and-persistence | history-filters/history-evidence browser | 128-case Node model canonical; browser one filter/query/restore smoke. |
| `media-image` | Canonical: p47-image-preparation + p47-image-viewer | authoring media, provenance, image browser journeys | Geometry/hash/security in Node; actual file input/modal/focus in browser. |
| `taxonomy` | Canonical: p53-taxonomy-separation + p49-p52 enhancements | bank composition, p56 audit, p49-p53 browser | Node hierarchy canonical; browser authoring/publish smoke only. |
| `external-agent` | Canonical: p57a/b/c + p59 + p60 capability suites | p57/p58 browser journeys and cross-domain handoffs | Keep headless/CLI integration; browser only user-visible staging/publication interactions. |
| `UI-navigation` | Canonical: ui-and-navigation + p47-shortcuts | flag palette, image UI, p48 UX, UI/navigation/drafts/flag browser | Pure route/command semantics in Node; browser for file:// routing, focus, CSS, responsive/a11y. |
| `architecture` | Future canonical: one parsed import/dependency graph + build artifact contracts | authoring-studio-view, p47-coordinator and source-scan tails elsewhere | Replace phrase/name/line-count checks; do not duplicate behavioral cleanup-owner or FSRS semantics. |
| `scale` | Canonical deep: large-result + p58c scale + browser stress | 500-question import and 200-question agent output | Move to deep/release lane; avoid three-engine replication absent browser-specific risk. |

## 3. Node test census — all 441 cases mapped

Every Node test case is covered by its file row below. A row applies to **all cases in that file unless a specific source-shape exception is listed in §5**. No existing Node case is left unclassified.

| File | Cases | Risk | Core invariant | Cheapest valid layer | Disposition | Overlap group |
|---|---:|---|---|---|---|---|
| `tests/acceptance-script-syntax.test.mjs` | 1 | build/tooling | standalone scripts parse under locked Node | `support-preflight` | **SUPPORT-OPTIMIZE** | `syntax-preflight` |
| `tests/authoring-domain.test.mjs` | 27 | authoring/publication | canonical rich authoring, publication validation, immutable revisions, secrecy | `domain-property + integration-contract` | **KEEP-MIXED** | `authoring-core` |
| `tests/authoring-studio-view.test.mjs` | 1 | architecture/UI | studio delegates view generation and remains pure | `architecture-graph` | **HEURISTIC-REWRITE** | `architecture-boundaries` |
| `tests/calculator.test.mjs` | 6 | calculator | versioned deterministic calculator semantics, frozen policy and recoverable scratch | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `calculator` |
| `tests/calendar-integration.test.mjs` | 4 | calendar | route, scheduled record, backup and host-owned integration contract | `integration-contract` | **KEEP-MIXED** | `calendar` |
| `tests/cleer-attempt-provenance.test.mjs` | 3 | exam/provenance | practice policy stays runtime-only and frozen attempt mode is exact | `domain-property` | **KEEP-INDEPENDENT** | `attempt-provenance` |
| `tests/cleer-invariants.test.mjs` | 2 | session/results | single monotonic expiry instant and immutable completed score | `integration-contract` | **KEEP-INDEPENDENT** | `timing-results` |
| `tests/cleer-large-result-analytics.test.mjs` | 1 | results/scale | 2,000-question analytics and review completeness | `deep-stress` | **DEEP-STRESS** | `scale-results` |
| `tests/cleer-terminal-cleanup.test.mjs` | 1 | persistence/privacy | terminal save clears candidate-only scratch while preserving recovery mirror | `integration-contract` | **KEEP-INDEPENDENT** | `terminal-cleanup` |
| `tests/content-and-provenance.test.mjs` | 27 | content/provenance | source/review lineage, content integrity, hashes, media and stored-result immutability | `domain-property + integration-contract` | **KEEP-MIXED** | `content-lineage` |
| `tests/exam-bank-and-policy.test.mjs` | 9 | bank/composition | author bank validation, attempt policy, catalog and deterministic composition | `domain-property` | **KEEP-INDEPENDENT** | `bank-policy` |
| `tests/exam-package-and-import.test.mjs` | 24 | package/import | schema validation, six response kinds, import bounds, backup integrity | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `package-validation` |
| `tests/exam-scoring-and-policy.test.mjs` | 33 | scoring/policy | exact scoring, bounds, policies, provenance and navigation/timing rules | `domain-property` | **KEEP-INDEPENDENT** | `scoring-policy` |
| `tests/flag-palette.test.mjs` | 2 | UI/status | flagged/answered palette semantics and light/dark CSS distinction | `presentation-contract` | **OVERLAP-CONSOLIDATE** | `flag-palette` |
| `tests/history-and-persistence.test.mjs` | 21 | persistence/history | ranking/filter identity, CAS, backup, offline time and 576-case recovery model | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `persistence-recovery` |
| `tests/learning-and-analytics.test.mjs` | 25 | learning/FSRS | analytics evidence, FSRS replay, Cost-ADR/leech, optimizer gate and portability | `domain-property + integration-contract` | **KEEP-MIXED** | `learning-fsrs` |
| `tests/p47-coordinator.test.mjs` | 9 | architecture/dependencies | composition ownership, layer boundaries, storage and FSRS adapter ownership | `architecture-graph` | **HEURISTIC-REWRITE** | `architecture-boundaries` |
| `tests/p47-history-filters.test.mjs` | 7 | history/query | 128-case filter model, dates, restore bounds and metric isolation | `domain-property` | **KEEP-INDEPENDENT** | `history-filters` |
| `tests/p47-image-preparation.test.mjs` | 5 | media/integrity | image hashing, import fidelity, validation and preparation choice | `domain-property + architecture-graph` | **KEEP-MIXED** | `image-preparation` |
| `tests/p47-image-viewer.test.mjs` | 7 | media/UI | viewer geometry, zoom/pan bounds, URI safety, alt and launcher semantics | `domain-property + presentation-contract` | **KEEP-MIXED** | `image-viewer` |
| `tests/p47-math-renderer.test.mjs` | 7 | math/rendering | KaTeX safety, fallback, rich math integrity and local release assets | `domain-property + build-contract` | **KEEP-MIXED** | `math-rendering` |
| `tests/p47-pure-modules.test.mjs` | 7 | presentation/security | escaping, six-kind controls, frozen review and validator purity | `domain-property + architecture-graph` | **KEEP-MIXED** | `presentation-purity` |
| `tests/p47-shortcuts.test.mjs` | 3 | keyboard/UI | shortcut command table, blocking contexts and paused policy | `domain-property` | **KEEP-INDEPENDENT** | `keyboard` |
| `tests/p48-independent-record-invariants.test.mjs` | 4 | persistence/integrity | reject impossible timing/session rows and unsigned candidate fields | `domain-property` | **KEEP-INDEPENDENT** | `record-integrity` |
| `tests/p48-recovery-integrity.test.mjs` | 5 | persistence/recovery | partial corruption quarantine, compact-row integrity and cursor equivalence | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `persistence-recovery` |
| `tests/p48-security-integrity.test.mjs` | 5 | security/build | unsigned-field rejection and canonical compiled CSP/build contract | `domain-property + build-contract` | **KEEP-INDEPENDENT** | `build-security` |
| `tests/p49-p52-enhancements.test.mjs` | 10 | taxonomy/scoring/keyboard | hierarchy identity, sectional policy, component scoring and remap persistence | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `taxonomy-enhancements` |
| `tests/p53-taxonomy-separation.test.mjs` | 6 | taxonomy | physical sections remain separate from semantic syllabus/taxonomy | `domain-property` | **KEEP-INDEPENDENT** | `taxonomy` |
| `tests/p56-integration-audit.test.mjs` | 5 | end-to-end contracts | publication→session→revision→notebook lineage across six kinds | `integration-contract` | **OVERLAP-CONSOLIDATE** | `cross-domain-integration` |
| `tests/p57a-external-bank.test.mjs` | 7 | external-bank/import | external bank compile, shared stimuli, immutable IDs, CLI determinism | `integration-contract` | **KEEP-INDEPENDENT** | `external-bank` |
| `tests/p57b-external-bank-qa.test.mjs` | 14 | external-bank/QA | structural QA, deterministic math, duplicates, legal/date/source claims and CLI behaviour | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `external-bank-qa` |
| `tests/p57c-authoring-staging.test.mjs` | 10 | authoring/staging | unverified staging, selection, correction, stable IDs and publication ownership | `integration-contract` | **KEEP-INDEPENDENT** | `authoring-staging` |
| `tests/p58b-editorial-gap.test.mjs` | 3 | authoring/editorial | fork-on-change, duplicate-screen completeness and media namespace safety | `integration-contract` | **OVERLAP-CONSOLIDATE** | `authoring-editorial` |
| `tests/p58b-exchange-and-recovery.test.mjs` | 6 | authoring/persistence | lossless exchange, malicious input rejection, workspace CAS/corruption/reset | `integration-contract` | **KEEP-INDEPENDENT** | `authoring-workspace` |
| `tests/p58c-independent-scale.test.mjs` | 5 | authoring/scale | 400/200/500 boundaries, immutable history and provenance at scale | `deep-stress` | **DEEP-STRESS** | `authoring-scale` |
| `tests/p59-agent-native-authoring.test.mjs` | 9 | agent-authoring | bounded inspection, guarded deltas, immutable revisions and low-context output | `integration-contract` | **KEEP-MIXED** | `agent-authoring` |
| `tests/p60a-agent-capabilities.test.mjs` | 5 | agent/capabilities | versioned capability discovery, bounded output and privilege limits | `integration-contract` | **KEEP-MIXED** | `agent-capabilities` |
| `tests/p60b-content-blueprint.test.mjs` | 16 | blueprint/content | quota/count consistency, sidecars, partial batches and publication gating | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `content-blueprint` |
| `tests/p60c-question-quality.test.mjs` | 18 | candidate-secrecy/QA | answer leakage prevention, blinded review, complete external review and reviewer declarations | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `candidate-secrecy` |
| `tests/p60d-editorial-editions.test.mjs` | 9 | editorial-lineage | paired original/reviewed exactness, stale-decision rejection and source-key comparability | `integration-contract` | **KEEP-INDEPENDENT** | `editorial-lineage` |
| `tests/p60e-pdf-ingest.test.mjs` | 7 | PDF/source-ingest | page-bound extraction ledger, source identity, corrupt input and strict publication handoff | `integration-contract` | **KEEP-INDEPENDENT** | `pdf-ingest` |
| `tests/p60f-agent-benchmark.test.mjs` | 1 | agent/performance | matched synthetic agent-task benchmark with caveat preservation | `deep-stress` | **DEEP-STRESS** | `agent-benchmark` |
| `tests/p60f-agent-handoff.test.mjs` | 10 | agent/handoff | bounded answer-private handoff, review/publication gating, stale/ref mismatch rejection | `integration-contract` | **KEEP-INDEPENDENT** | `agent-handoff` |
| `tests/question-timing-phases.test.mjs` | 7 | timing/evidence | first-visit/answer/revisit phases, pause/visibility and backup integrity | `domain-property` | **KEEP-INDEPENDENT** | `timing-evidence` |
| `tests/revision-evidence.test.mjs` | 7 | revision/learning | exam-scoped revision evidence, due cards, authenticated selection and pacing | `domain-property + integration-contract` | **KEEP-INDEPENDENT** | `revision-evidence` |
| `tests/session-and-timing.test.mjs` | 15 | session/timing | state-machine time conservation, section closure, expiry and destructive lifecycle | `domain-property` | **KEEP-INDEPENDENT** | `session-timing` |
| `tests/ui-and-navigation.test.mjs` | 23 | UI/navigation | presentation semantics, response drafts, route codecs and fallback navigation | `presentation-contract + domain-property` | **KEEP-MIXED** | `ui-navigation` |
| `tests/visual-evidence.test.mjs` | 2 | QA-support | visual-review opt-in and screenshot side-effect isolation | `support-preflight` | **SUPPORT-OPTIMIZE** | `visual-evidence` |

## 4. Browser acceptance census — all 33 executable scenarios mapped

`both` is the current Chromium + Firefox + WebKit manifest; `chromium-only` is current Chromium-only execution. This records present execution, not the recommended future matrix.

| Script | Current engines | Risk | Browser invariant | Cheapest valid layer | Disposition | Overlap group |
|---|---|---|---|---|---|---|
| `scripts/acceptance-authoring-publication.mjs` | `both` | authoring/publication | real file:// author→validate→immutable publish→score→review | `browser-acceptance` | **BROWSER-CANONICAL** | `authoring-core` |
| `scripts/acceptance-authoring-visual.mjs` | `both` | authoring/UI | real offline editor interaction and user-facing authoring state | `browser-acceptance` | **BROWSER-OVERLAP** | `authoring-ui` |
| `scripts/acceptance-bank-modes.mjs` | `chromium-only` | bank/modes/UI | edition/mode/untimed selection and responsive library/preflight behaviour | `browser-acceptance` | **BROWSER-OVERLAP** | `bank-policy` |
| `scripts/acceptance-calendar.mjs` | `both` | calendar | file:// routing, durability actions, backup/restore and static target integration | `browser-acceptance` | **BROWSER-OVERLAP** | `calendar` |
| `scripts/acceptance-critical.mjs` | `chromium-only` | critical user flows | reviewed CGL lifecycle plus imported six-kind/manual/FSRS lifecycle | `browser-acceptance` | **BROWSER-CANONICAL** | `critical-smoke` |
| `scripts/acceptance-drafts.mjs` | `chromium-only` | response/UI | multi-select/matching draft and duplicate-right user contracts | `browser-acceptance` | **BROWSER-OVERLAP** | `response-drafts` |
| `scripts/acceptance-editorial-provenance.mjs` | `chromium-only` | content/provenance | edition/source/review/media integrity in real offline UI | `browser-acceptance` | **BROWSER-OVERLAP** | `content-lineage` |
| `scripts/acceptance-flag-palette.mjs` | `both` | UI/status | flag-only vs answered+flagged palette across kinds, reload and dark mode | `browser-acceptance` | **BROWSER-CANONICAL** | `flag-palette` |
| `scripts/acceptance-history-evidence.mjs` | `chromium-only` | history/revision | bulk deletion, backup, progress/pending panels and visit evidence | `browser-acceptance` | **BROWSER-OVERLAP** | `history-evidence` |
| `scripts/acceptance-history-filters.mjs` | `chromium-only` | history/query | actual History filtering, restore and mobile negative checks | `browser-acceptance` | **BROWSER-OVERLAP** | `history-filters` |
| `scripts/acceptance-image-preparation.mjs` | `both` | media/authoring | offline image preparation, import, digest and clarity guard | `browser-acceptance` | **BROWSER-OVERLAP** | `image-preparation` |
| `scripts/acceptance-image-viewer.mjs` | `both` | media/UI | modal focus, zoom/pan, figure launch, narrow layout and paused isolation | `browser-acceptance` | **BROWSER-CANONICAL** | `image-viewer` |
| `scripts/acceptance-learning-lifecycle.mjs` | `chromium-only` | learning/FSRS | attempt→manual mark→learning card→backup→retest lifecycle | `browser-acceptance` | **BROWSER-OVERLAP** | `learning-lifecycle` |
| `scripts/acceptance-navigation.mjs` | `both` | navigation/browser-compat | native Navigation API and fragment fallback on file:// | `browser-acceptance` | **BROWSER-CANONICAL** | `navigation` |
| `scripts/acceptance-p47-math.mjs` | `both` | math/rendering | imported math, pre-submit secrecy and post-submit rendering | `browser-acceptance` | **BROWSER-CANONICAL** | `math-rendering` |
| `scripts/acceptance-p48-architecture.mjs` | `both` | browser architecture/persistence | same-question redraw/focus and IDB cursor startup behaviour | `browser-acceptance` | **BROWSER-CANONICAL** | `browser-architecture` |
| `scripts/acceptance-p48-security.mjs` | `both` | security/CSP | compiled file boots while unrelated inline script/handler are blocked | `browser-acceptance` | **BROWSER-CANONICAL** | `build-security` |
| `scripts/acceptance-p48-ux.mjs` | `both` | UI/a11y | user-facing offline UX checks | `browser-acceptance` | **BROWSER-OVERLAP** | `ui-navigation` |
| `scripts/acceptance-p49-p52-enhancements.mjs` | `both` | taxonomy/keyboard/UI | live hierarchy/scoring/remap enhancements | `browser-acceptance` | **BROWSER-OVERLAP** | `taxonomy-enhancements` |
| `scripts/acceptance-p53-taxonomy.mjs` | `both` | taxonomy/authoring | single physical section with mixed semantic roots through authoring and attempt | `browser-acceptance` | **BROWSER-OVERLAP** | `taxonomy` |
| `scripts/acceptance-p54-authoring.mjs` | `both` | authoring/end-to-end | preflight, six-kind preview, section timer edit, publish and partial-mark exam | `browser-acceptance` | **BROWSER-OVERLAP** | `authoring-core` |
| `scripts/acceptance-p55-learning.mjs` | `both` | learning/UI | Learning keyed UI, unsaved editor and measured redraw behaviour | `browser-acceptance` | **BROWSER-OVERLAP** | `learning-ui` |
| `scripts/acceptance-p56-integration.mjs` | `both` | persistence/concurrency | real IndexedDB two-tab shared-digest import and hostile digest rejection | `browser-acceptance` | **BROWSER-CANONICAL** | `persistence-recovery` |
| `scripts/acceptance-p57a-bank.mjs` | `both` | external-bank/authoring | staging, QA, publication, frozen attempts and responsive rendering | `browser-acceptance` | **BROWSER-OVERLAP** | `external-bank` |
| `scripts/acceptance-p58a-integrity.mjs` | `both` | authoring/integrity | offline integrity probes across authoring/publication | `browser-acceptance` | **BROWSER-OVERLAP** | `authoring-integrity` |
| `scripts/acceptance-p58b-editorial.mjs` | `both` | authoring/editorial | staging, citations, exchange, iterative selection and recovery | `browser-acceptance` | **BROWSER-OVERLAP** | `authoring-editorial` |
| `scripts/acceptance-p58c-scale.mjs` | `both` | authoring/scale | 400-question/200-selected/500-warning scale, conflict, archives and scoring | `deep-stress` | **DEEP-STRESS** | `authoring-scale` |
| `scripts/acceptance-partial-recovery.mjs` | `both` | persistence/recovery | real IDB partial corruption quarantine and healthy-record recovery | `browser-acceptance` | **BROWSER-CANONICAL** | `persistence-recovery` |
| `scripts/acceptance-recovery.mjs` | `chromium-only` | persistence/lifecycle | discard/delete, backup restore, invalid routes, fallback and strict timer evidence | `browser-acceptance` | **BROWSER-OVERLAP** | `persistence-recovery` |
| `scripts/acceptance-resilience.mjs` | `chromium-only` | persistence/concurrency | two-tab races, unavailable IDB, first-read and quota-denied write resilience | `browser-acceptance` | **BROWSER-CANONICAL** | `persistence-resilience` |
| `scripts/acceptance-session-policy.mjs` | `chromium-only` | session/UI | strict/flexible controls and foreground timing | `browser-acceptance` | **BROWSER-OVERLAP** | `session-timing` |
| `scripts/acceptance-stress.mjs` | `chromium-only` | results/history scale | lazy Results DOM and 80-record History stress | `deep-stress` | **DEEP-STRESS** | `scale-results` |
| `scripts/acceptance-ui.mjs` | `chromium-only` | UI/a11y/responsive | responsive layout, keyboard and accessibility contracts | `browser-acceptance` | **BROWSER-OVERLAP** | `ui-navigation` |

### Browser/support runners

| Path | Role | Disposition | Pass-A note |
|---|---|---|---|
| `scripts/acceptance-suite.mjs` | Acceptance harness | **SUPPORT-REWRITE** | Historical filename-driven manifest; future registry should be capability/risk-tag driven. |
| `scripts/fsrs-browser-optimizer-smoke.mjs` | Worker/WASM optimizer boundary | **KEEP-INDEPENDENT** | Specialized runtime contract; full/probe modes can map to release vs cross-browser smoke. |
| `scripts/mutation-sensitivity.mjs` | Ten targeted semantic mutants | **KEEP-INDEPENDENT / DEEP-QUALITY** | High-signal adequacy witness; not a global mutation score. |

## 5. Source-shape / refactor-hostile exception register

These are cases where the intent may be sound but the present oracle materially depends on source wording, exact names, line counts, forbidden phrases, or CSS text.

| File | Test case | Replacement direction |
|---|---|---|
| `tests/authoring-domain.test.mjs` | P47-5A app-owned ports do not import vendors, persist data or mutate application engines | Replace import/source scans with dependency graph rules. |
| `tests/authoring-domain.test.mjs` | P47-5C vendor is quarantined to adapter; no global published schema or FSRS changes | Replace package-name/source-text checks with dependency graph + public-contract tests. |
| `tests/authoring-domain.test.mjs` | P47-5D publisher depends on domain hashes and validated packages, never editor or storage | Architecture boundary belongs in graph rule. |
| `tests/authoring-domain.test.mjs` | Authoring topology keeps persistence and staging/publication orchestration out of the studio | Replace regex ownership checks with import graph/capability boundary. |
| `tests/authoring-studio-view.test.mjs` | authoring studio delegates pure field/view generation without creating a second controller | Line-count, exact import, helper-name and forbidden-word assertions. |
| `tests/calendar-integration.test.mjs` | Practice Desk pins Calendar to the verified commit and keeps Calendar durability host-owned | Keep exact submodule identity; rewrite controller/style ownership regex into graph/theme contract. |
| `tests/flag-palette.test.mjs` | light/dark status CSS declares distinct yellow/orange for both navigator and review button | Prefer actual browser computed-state/palette witness. |
| `tests/learning-and-analytics.test.mjs` | Native and browser optimizer entrypoints are runtime adapters, not duplicate training pipelines | Replace source-string duplicate checks with single-pipeline dependency ownership. |
| `tests/p47-coordinator.test.mjs` | P47-6 full coordinator is a small composition root, not a relocated second monolith | Remove arbitrary line limit/exact-call regexes; enforce graph/capability boundaries. |
| `tests/p47-coordinator.test.mjs` | P47-6 independently owned route, Library, exam, Results, History, persistence and lifecycle handlers are real and typed | Exact interface/import/function names and line limits are refactor-hostile. |
| `tests/p47-coordinator.test.mjs` | P47-6 controller modules do not introduce runtime cycles, mutable parallel contexts or duplicate scheduling vendor imports | Retain no-cycle/vendor boundary as graph rule; remove expression regexes. |
| `tests/p47-coordinator.test.mjs` | P47-6 no undeclared global event subscriptions or duplicate clock authority | Prefer lifecycle behavior + event-owner graph rather than exact string counts. |
| `tests/p47-coordinator.test.mjs` | Persistence orchestration has one backend contract and no raw storage fork | Retain backend contract; replace source-word scans with dependency rule. |
| `tests/p47-coordinator.test.mjs` | Lower-layer modules cannot depend on application composition | Good invariant; implement through parsed import graph. |
| `tests/p47-coordinator.test.mjs` | CLEER package, attempt and composition ownership stays canonical | Retain ownership intent through graph/export contracts, not function-name regex. |
| `tests/p47-coordinator.test.mjs` | terminal candidate scratch has one persistence cleanup owner | Behavior already tested by cleer-terminal-cleanup; ownership can be graph-based. |
| `tests/p47-image-preparation.test.mjs` | P47-3B image preparation is separate from verified package, persistence and network | Replace forbidden-word scan with dependency/capability rule. |
| `tests/p47-image-viewer.test.mjs` | P47-3 module source is transient: no OPFS, IndexedDB, network or object URLs | Use dependency graph plus runtime network tripwire if warranted. |
| `tests/p47-pure-modules.test.mjs` | P47-1 independent presentation and validation modules have no coordinator or DOM dependency | Retain through import graph rather than source regex. |
| `tests/p60a-agent-capabilities.test.mjs` | P60-A: documentation truth table excludes claims that later P60 work already exists | Move to documentation consistency or retire if no executable invariant. |

## 6. Deep/stress register

These are legitimate tests, but they are not ordinary fast-path correctness witnesses:

- `tests/cleer-large-result-analytics.test.mjs` — 2,000-question Results/review boundary.
- `tests/p58c-independent-scale.test.mjs` — 8 banks / 400 questions / 200 selected / 500-candidate boundary.
- `tests/p60f-agent-benchmark.test.mjs` — synthetic agent benchmark.
- `tests/p59-agent-native-authoring.test.mjs` — its 200-question bounded-output case is performance/scale-oriented even though the rest of the file is ordinary integration coverage.
- `scripts/acceptance-p58c-scale.mjs` — real-browser high-volume authoring/conflict scenario.
- `scripts/acceptance-stress.mjs` — lazy Results DOM plus 80-record History stress.
- `scripts/mutation-sensitivity.mjs` — deep quality/adequacy gate rather than basic functionality.

These should remain available; a later CI pass can decide whether they belong in release/manual/nightly lanes rather than every source push.

## 7. Independent witnesses worth protecting

Pass B should preserve these semantics even when files are renamed or merged:

- exact scoring reference, answer-ID bijection/permutation invariance, partial-credit caps, numeric tolerance boundaries, exact APFC one-third negative accumulation, and negative-zero handling;
- seeded whole-paper/sectional timing models, first-visit/answer/revisit evidence, and single-instant expiry;
- 576-case recovery precedence model, seeded CAS interleavings, additive/idempotent merge, and corruption quarantine;
- 128-combination History filter model;
- canonical hash/source-review lineage, candidate-vs-explanation media separation, and stored-result tamper rejection;
- literal rich-text preservation and deterministic authoring/publication hashes;
- FSRS deterministic replay, held-out optimizer regression gate, Cost-ADR/leech behavior, and native/WASM boundary;
- actual browser CSP enforcement, real IndexedDB corruption/concurrency, `file://` Navigation/fallback, image modal/focus, KaTeX DOM integration, and actual flag-palette rendering.

## 8. Main overlap finding

The dominant bloat is not 441 entirely redundant cases. It is **re-proving the same risk at several layers**. Persistence/recovery, authoring/publication, provenance, learning/FSRS, History filters, taxonomy, and broad UI/navigation have strong deterministic Node witnesses plus browser journeys that frequently repeat the policy mathematics.

The consolidation rule should therefore be: **one cheapest authoritative witness per invariant, plus a browser witness only when the invariant depends on real browser behavior**. Cross-domain end-to-end journeys can remain as smoke tests, but should not reassert every lower-layer edge case.

## 9. Pass-B entry criteria

Pass A authorizes no deletion. Before a test is removed or merged in Pass B, the replacement must identify the same invariant in this map and meet at least one condition:

1. a stronger independent/model/property test supersedes it;
2. a real-browser scenario supersedes a source/markup heuristic for a browser fact; or
3. an architecture graph/artifact contract supersedes a source-word/name/line-count assertion.

Deep/stress cases move lanes rather than disappear.

The acceptance manifest should ultimately become capability/risk-tag driven instead of requiring every historical `acceptance-*.mjs` filename to exist forever. That is a later pass, not part of this census.


## 10. Pass B outcome — Node suite consolidation

Pass B was completed and fully verified at source commit `14bef1e3cb4efc2046f19e3355d09438cf580cc9`. This section records the post-consolidation state; §§1–9 remain the Pass-A baseline/census used to justify each replacement.

### Measured structural result

| Measure | Pass A baseline | Pass B | Change |
|---|---:|---:|---:|
| Node test files | 48 | **35** | −13 (−27.1%) |
| Node test bytes | 647,989 | **641,835** | −6,154 (−0.9%) |
| Historical `p47`–`p60` / `cleer-*` filenames | 30+ | **0** | eliminated |
| Final executed Node tests | — | **442/442 passed** | measured in CI |
| Targeted semantic mutants | 10 | **10/10 killed** | preserved |

The small byte reduction is deliberate: Pass B primarily removed organisational duplication and refactor-hostile oracles while retaining substantive assertions. It did not chase line-count reduction by discarding independent evidence.

### Canonical domain filenames

| Historical suites | Canonical Pass-B suite |
|---|---|
| P47 image preparation/viewer/math/pure presentation | `media-rendering.test.mjs` |
| P47 History filters + P48 record/recovery integrity | `history-record-integrity.test.mjs` |
| P49–P53 taxonomy/workspace enhancements | `taxonomy-and-workspace-policy.test.mjs` |
| P57 external-bank QA/staging + P58 editorial-gap | `external-bank-authoring.test.mjs` |
| P56 integration audit | `cross-domain-integration.test.mjs` |
| P58 authoring exchange/recovery | `authoring-workspace-integrity.test.mjs` |
| P58 scale | `authoring-scale.test.mjs` |
| P59 agent authoring + P60 capabilities/handoff | `agent-authoring.test.mjs` |
| P60 blueprint + question quality | `content-blueprint-quality.test.mjs` |
| P60 editorial editions + PDF ingest | `editorial-lineage-and-pdf.test.mjs` |
| P60 agent benchmark | `agent-benchmark.test.mjs` |
| P47 shortcuts / P48 build security | `keyboard-shortcuts.test.mjs` / `build-security.test.mjs` |
| CLEER attempt/result/scale/terminal suites | `attempt-provenance.test.mjs`, `result-integrity.test.mjs`, `result-scale.test.mjs`, `terminal-scratch-cleanup.test.mjs` |

### Architecture oracle

The former line-count, helper-name, import-string and forbidden-phrase architecture checks were replaced by `architecture-boundaries.test.mjs`. It derives the resolved runtime import graph from the already-pinned esbuild parser/metafile and checks dependency direction, controller cycles, composition ownership, vendor boundaries, authoring boundaries, storage ownership and media/calendar topology.

The graph also exposed a fact hidden by the old regex tests: `fsrs-optimizer.ts` legitimately consumes the upstream FSRS-7 model contract while scheduling runtime/middleware remain isolated in `fsrs-scheduler-adapter.ts`. The canonical rule now encodes that actual boundary instead of a textual approximation.

Source-shape checks were removed only where their invariant is now covered by this graph, a stronger runtime contract, or an existing real-browser witness. The Calendar submodule revision remains an exact build dependency fact; flag-palette styling remains covered by the real browser palette journey.

### Model / table / metamorphic direction

Pass B retained the strongest existing mathematical witnesses and promoted their role as canonical:

- independent seeded scoring reference plus answer-ID bijection/input-permutation metamorphic scoring;
- seeded whole-paper/sectional timing state models;
- 576-case saved-vs-mirror recovery reference;
- 128-combination History-filter reference;
- rich-text preservation property cases;
- FSRS deterministic replay and held-out optimizer gate.

It also replaced repeated schema rejection examples with one table-driven structural-mutation matrix, added a table-driven FSRS scheduler configuration/invalid-policy contract, and changed standalone-script syntax checking from one child Node process per script to an in-process esbuild parse.

### Verification

CI run `43556401035` on the Pass-B source commit passed every existing release gate:

- strict TypeScript/build + **442/442 Node tests**;
- **10/10** targeted mutations baseline-green and assertion-killed;
- native FSRS optimizer smoke and native/WASM parity;
- Chromium **33/33** acceptance journeys + full browser optimizer activation;
- Firefox **21/21** acceptance journeys + optimizer probe;
- WebKit **21/21** acceptance journeys + optimizer probe;
- guarded standalone publisher.

The observed `npm run check` step was 36 seconds and the complete CI run about 4 minutes 47 seconds. CI runner timings are observational, not performance SLAs. Browser acceptance structure/runtime remains intentionally unchanged in Pass B; that is the subject of Pass C.


## 11. Pass C outcome — browser consolidation

Pass C was completed and fully verified at source commit `b8fc682e0044d14a7ac6f89f76d35a2daeb99128`. The historical browser filename manifest is no longer executable architecture.

### Measured structural result

| Measure | Pass-B browser baseline | Pass C | Change |
|---|---:|---:|---:|
| Historical top-level `acceptance-*.mjs` scenario files | 33 | **0** | eliminated |
| Stable browser-domain modules | — | **9** | canonical |
| Registry scenarios | 33 | **14** | −19 (−57.6%) |
| Chromium journey executions | 33 | **14** | −57.6% |
| Firefox journey executions | 21 | **4** | −81.0% |
| WebKit journey executions | 21 | **4** | −81.0% |
| Total browser journey executions | 75 | **22** | −70.7% |

The stable modules are `candidate`, `authoring`, `storage`, `navigation`, `media`, `security`, `calendar`, `ui` and `scale`. `scripts/acceptance/registry.mjs` owns scenario identity and capability tags; the runner no longer compares a hard-coded filename list against a directory scan.

### Canonical scenario registry

| Scenario | Core tags | Firefox/WebKit? |
|---|---|---|
| `candidate-core` | smoke, candidate, history, learning | No |
| `status-palette` | candidate, visual-state | No |
| `authoring-publication` | smoke, authoring, publication | No |
| `external-bank-authoring` | authoring, import, editorial | No |
| `storage-resilience` | storage, recovery, concurrency | No |
| `partial-recovery` | storage, recovery | **Yes** |
| `file-navigation` | navigation, file-url | **Yes** |
| `image-viewer` | media, focus, keyboard | **Yes** |
| `image-preparation` | media, authoring, file-input | No |
| `math-rendering` | media, math | No |
| `csp-security` | security, csp | **Yes** |
| `calendar-integration` | calendar, integration | No |
| `responsive-ui` | ui, responsive, a11y | No |
| `result-stress` | results, history, scale, deep | No |

The independent browser/WASM FSRS optimizer probe remains outside this registry because it tests the specialized Worker/WASM runtime boundary rather than an application journey.

The runner also accepts an optional focused capability filter, for example `node scripts/acceptance-suite.mjs chromium --tag=storage`.

### Retired overlapping journeys and surviving witnesses

No historical browser journey was removed merely because its filename was old. Each retirement has a cheaper or stronger surviving witness:

| Retired journey | Surviving authoritative witness |
|---|---|
| `acceptance-authoring-visual` | `authoring-publication` + `responsive-ui` + Node authoring contracts |
| `acceptance-p49-p52-enhancements` | Node `taxonomy-and-workspace-policy` + candidate/browser smoke |
| `acceptance-p53-taxonomy` | Node taxonomy separation + `external-bank-authoring` |
| `acceptance-p54-authoring` | `authoring-publication` + Node authoring/scoring contracts |
| `acceptance-p58b-editorial` | `external-bank-authoring` + Node editorial-lineage contracts |
| `acceptance-p58a-integrity` | `authoring-publication` + Node content/provenance integrity |
| `acceptance-p48-architecture` | parser-backed `architecture-boundaries` + storage/navigation browser witnesses |
| `acceptance-p48-ux` | `responsive-ui` |
| `acceptance-session-policy` | Node session/timing state models + `candidate-core` |
| `acceptance-editorial-provenance` | Node content/editorial lineage + retained authoring journeys |
| `acceptance-bank-modes` | Node exam-bank/policy contracts + `candidate-core` |
| `acceptance-drafts` | Node response-draft/UI contracts + six-kind candidate flow |
| `acceptance-history-evidence` | Node history/persistence contracts + `candidate-core` History smoke |
| `acceptance-history-filters` | 128-combination Node History-filter model + History smoke |
| `acceptance-p55-learning` | Node learning/FSRS contracts + `candidate-core` learning lifecycle |
| `acceptance-p56-integration` | Node cross-domain/shared-store contracts + retained recovery/resilience scenarios |
| `acceptance-learning-lifecycle` | Node learning lifecycle + `candidate-core` |
| `acceptance-recovery` | `storage-resilience` + `partial-recovery` + Node recovery/CAS models |
| `acceptance-p58c-scale` | Node `authoring-scale` + retained `result-stress` browser witness |

### Selector policy

Primary candidate navigation and other visible controls were moved toward Playwright role/name locators, including Start, Library/Test library, History, Calendar and Learning controls. The consolidation deliberately does **not** replace every selector mechanically. Technical evidence surfaces such as hidden file inputs, immutable attempt rows, exact persisted IDs, and app-specific diagnostic controls may retain stable IDs/data attributes when those are the contract being exercised or when a user-facing role is ambiguous.

A semantic selector that initially used a broad `/library/i` match was rejected by Firefox because both “Library” and “Test library” were visible. The final suite uses context-exact accessible names instead. This is a useful example of the new policy: resilient user-facing locators should be precise enough to express the intended interaction, not merely avoid CSS/ID selectors.

### Verification and observed CI economics

CI run `43567342498` passed every release gate on the final Pass-C source:

- strict TypeScript/build + **442/442 Node tests**;
- **10/10** targeted semantic mutants killed;
- native optimizer smoke and native/WASM parity;
- Chromium **14/14** tagged application scenarios + full browser optimizer activation;
- Firefox **4/4** cross-browser scenarios + optimizer probe;
- WebKit **4/4** cross-browser scenarios + optimizer probe;
- guarded publisher.

Observed browser-journey execution time changed from about **341 seconds aggregate** in the Pass-B verification run (145s Chromium + 72s Firefox + 124s WebKit) to about **122 seconds aggregate** in Pass C (71s + 18s + 33s), a ~64% reduction. Total CI wall time changed from about **4m47s** to **2m58s**, roughly 38% lower on these two GitHub-hosted runs. These are observations rather than performance SLAs because runner provisioning and browser installation vary.

The in-process script syntax preflight also fell from about 286 ms to about 119 ms after the browser script surface was consolidated.
