# Practice Desk — as-built system architecture

This is the **canonical architectural map**, independent of implementation pass numbers. It records enduring responsibilities, lifecycle boundaries and trade-offs; individual fixes, commits, screenshots and test retirements are deliberately excluded. The TypeScript source is authoritative for exact behavior.

## 1. Distribution and execution

`src/app/bootstrap.ts` + `src/template.html` are bundled by `scripts/build.mjs` into **`Practice_Desk_Offline_Mock_Tests.html`**. The app runs locally through `file://` without a server or login. Modules and vendored dependencies are compiled into a deterministic standalone document with integrity/security constraints; **the generated artifact is never hand-edited**. User History is maintained locally, not synchronized to GitHub or an external agent.

The runtime separates **domain and immutable data**, **pure exam state/scoring**, **transactional storage**, **learning**, **authoring** and **UI orchestration**. External content-generation CLIs run outside the app and do not become a second scoring engine.

## 2. Ownership map

| Layer | Main modules | Responsibility |
|---|---|---|
| Exam domain | `src/domain/{exam,question,answer-key,scoring,validate,integrity,media,rich-document}.ts` | Six question kinds, immutable revisions, rich/media bounds, paper/key schemas and validated rules |
| Session and scoring | `src/engine/{session,response,clock,scoring,score-ceiling,manual-grading,review-source,source-comparison}.ts` | Legal attempts/events, elapsed-time policy, exact score ledger, capped partial credit, review/privacy and non-destructive Source comparison |
| Application coordinator | `src/app/{bootstrap,coordinator-context,screen-controller,screen-renderer,exam-controller,exam-dom-reconcile,lifecycle-controller}.ts` | One screen/attempt lifecycle, controlled render invalidation and preservation of unsaved candidate inputs |
| Feature UI | `src/app/{library-controller,exam-view,result-controller,history-controller,learning-controller,authoring-controller,navigation}.ts` | Library, Exam, Results, History, Learning, local Wordgard UI and native/fallback routing |
| Persistence | `src/history/{shared-store,concurrency,frozen,backup,backup-file,deletion-policy}.ts` | Compact attempt metadata, immutable shared snapshots, optimistic revision/CAS, checked additive v4 backups, recovery and deletion |
| Learning | `src/learning/{learning,syllabus-taxonomy,attempt-evidence,question-analytics,revision-selection,fsrs-scheduler-adapter,revision-settings,fsrs-optimizer}.ts` | Source-bounded notebook, Subject/Topic/Subtopic hierarchy, evidence-derived aggregates, FSRS-7 policy/optimizer evidence and revision paper preparation |
| Authoring | `src/authoring/{authoring-studio,authoring-draft,authoring-staging,authoring-publisher,authoring-preview,wordgard-adapter,external-bank}.ts` | Graphical rich editing, drafts/selection, strict authoring/QA, immutable validated publication |
| External-agent CLI | `scripts/question-bank-*.mjs`, `content-blueprint.mjs`, `question-quality.mjs`, `editorial-editions.mjs`, `pdf-ingest.mjs`, `agent-handoff.mjs` | Structured file authoring, quotas, blind reviews, paired editions, source-document provenance and permission-scoped handoff |

Use [data contracts](DATA_CONTRACTS.md) for accepted formats and [authoring](QUESTION_BANK_AUTHORING.md) for producing banks.

## 3. End-to-end lifecycle

```text
Author-supplied source / built-in edition / Wordgard draft
   → strict validation and optional evidence-based editorial QA
   → canonical immutable exam package, key and stimuli/media
   → exam preflight and frozen policy/source/key selection
   → candidate-only exam events (answer, clear, flag, navigate, timing)
   → immutable score/result + checked local persistence
   → Results / Source-vs-Reviewed comparison / History / backup
   → explicit notebook and FSRS grading → scoped revision practice
```

**FSRS-7 scheduling:** Learning cards keep the learner's explicit Again/Hard/Good/Easy event log as the scheduling truth and additionally record measured reveal-to-rating duration plus the derived pre-review FSRS state as optimizer evidence. Schedules are still reconstructed from rating/time replay through the single `ts-fsrs@6.0.0` vendor adapter; persisted state is never trusted as a second scheduler. The adapter explicitly selects FSRS-7, fractional-day dual traces, standard 1m/10m learning and 10m relearning steps, model override, reproducible fuzzing, statistics and the 36,500-day cap. Fixed 90% retention remains the default; Cost-ADR is an explicit alternative that replaces, rather than stacks with, fixed desired-retention middleware. Review lapses feed an application-owned leech policy: remediation priority is the default, automatic suspension is optional, and a learner can manually suspend a card without deleting it. The app exports optimizer CSV evidence and imports only schema-checked 34-weight FSRS-7 profiles that have passed a later chronological holdout against stock FSRS-7: a validation candidate trained on the historical prefix must improve holdout log loss without worsening holdout RMSE bins, after minimum evidence guards, before final weights are retrained on all eligible evidence. Optimizer timezone and next-day rollover are mandatory so FSRS-7 fractional study days are constructed in the learner's intended local chronology. The beta `@open-spaced-repetition/binding@0.6.1` trainer lives in `tools/fsrs-optimizer` outside the standalone `file://` UI, preserving the one-file offline runtime while keeping trained profiles portable; long runs expose progress, clean interruption and an optional hard deadline through the binding progress callback. Its `computeOptimalSteps` API is retained only as a separate advisory diagnostic because upstream defines it as a single-decay fitter that is not applicable to FSRS-7's dual-trace mixture curve; Practice Desk never imports or auto-applies those heuristic step recommendations. The isolated optimizer runtime is exercised by CI independently of the app dependency graph.

**Important data boundaries:**

- **Question identity vs revision:** one underlying question can have several immutable content/key revisions. IDs, source signatures, per-attempt evidence and corrections must not be conflated; old scored attempts remain immutable.
- **Exam section vs semantic taxonomy:** physical sections impose navigation and time limits. A single section can contain Labour, Accountancy and Economy subjects; hierarchical Subject → Topic → Subtopic labels serve filtering, grouping and learning, not timers. Never synthesize sections solely to represent subjects.
- **Source vs Reviewed:** printed-original data/key must survive unchanged alongside a separately corrected version. Comparisons are **display-only**, conservatively allowed only for semantically comparable, correctly paired items; they never change stored historical scores.
- **Candidate vs reviewer:** no explanation, unpublished key, reviewer dispute or explanation-only asset before permitted reveal. Do not put answer-only data in candidate resources as a convenience.
- **Draft vs published vs attempted:** unpublished edits, staged imports, immutable published paper and completed attempts are distinct entities. The active exam UI should reconcile only the changed screen/controls without silently discarding unsaved responses.

## 4. Storage and recovery

The browser uses IndexedDB with **deduplicated immutable snapshots** and compact attempt records. Transactional revision/CAS protects against stale concurrent writes; a saved terminal record and newer revision must defeat stale emergency mirrors. Restore is additive and conflict-checked; backup v4 has strict bounds and a SHA-bound manifest. Corrupt or dangling records should be surfaced/quarantined rather than fabricating history.

Wordgard drafts/staging do **not** implicitly become completed-attempt History backups. Export the corresponding archives separately. Local persistence is not cloud sync, cross-device backup, or physical-OS eviction certification.

## 5. Rendering, interaction and devices

The application uses modular controller/render ownership and a selective exam DOM reconciler to preserve in-progress edits, focus, choices, review flags and accessibility semantics across supported updates. Native Navigation API is preferred where available with `file://` fragment-route fallback where absent. UI must handle 195px width at 140% scaling; failures require source-level investigation and real browser journeys, not pixel-perfect v11 duplication.

Wordgard renders rich structured content; mathematics/media pass through replaceable adapters. Vendor inclusion in the production HTML is minimized by the build; dependencies may remain fuller in source. Actual Mac Safari, touch/IME, screen readers and real hardware storage loss remain **separate release tests**; Linux WebKit does not certify them.

## 6. External AI and document pipeline

External models or humans create a versioned `practice-desk-authoring` v1 JSON; agents may inspect a single question, validate, propose bounded patches and produce **new files** through explicit local CLI steps. Advanced stages add syllabus quotas, candidate-only blind review, attributed 20-dimension QA, Source/Reviewed editorial decisions and supplied-PDF page/key/media evidence. All stages converge on **one canonical publisher and exam engine**. See [the focused pipeline](AGENT_CONTENT_PIPELINE.md).

The application does **not** embed an LLM, OCR service, web research agent, automatic file importer, publisher identity authority, or browser/device History bridge. Hashes only attest byte consistency; visually accurate PDF transcription and official-answer/legal correctness require independent source review. Partial quotas are not automatic finished-publication readiness.

## 7. Known and intentionally deferred boundaries

Some existing P60 source-audit findings concern explanation-only media leakage, blueprint readiness and Source/Reviewed comparability/lineage. These are tracked in the [backlog](../../backlog.md) and are **not resolved by this architecture document**. Release also requires authentic content review, physical-device/assistive verification and user acceptance.

**References:** [data contracts](DATA_CONTRACTS.md) · [current programme](../ENGINEERING_PROGRAMME.md) · [policy](../decisions/POLICY_REGISTER.md) · [QA](../QA_CURRENT.md) · [historical design material](../HISTORY_INDEX.md).
