# Practice Desk — as-built architecture

This is the canonical architectural map. It records enduring ownership and lifecycle boundaries; implementation passes, temporary fixes, exact test counts and tuning details belong in source/tests or [historical Git](../HISTORY_INDEX.md).

## 1. Distribution

The same source is built through `scripts/build-target.mjs` into two targets:

- **Standalone:** `Practice_Desk_Offline_Mock_Tests.html`, deterministic and directly runnable via `file://`.
- **Static:** `Practice_Desk_Static/`, served over localhost/HTTPS and adding the local FSRS optimizer Worker/WASM assets.

Neither generated target is derived by rewriting the other. `question-banks/catalog.json` owns only exam-family identity, root-manifest address and the preinstall switch. `scripts/build-target.mjs` follows the authoritative catalog → exam → year → paper manifest graph to assemble each enabled family. Year manifests may own an exam-data `taxonomy.json`; paper manifests own canonical editions, content/package paths and optional source-bound quality/blueprint evidence; the root catalog does not duplicate them. Exam manifests use `currentPaperRef` for a graph node; catalog loading resolves it to the embedded runtime `currentPaperRevisionId`. Any edition that declares `bank.authoring.json` treats that file as the sole maintained source and must reproduce its checked-in `package.exam.json` exactly. A declared non-null `qualityReview` or `blueprint` sidecar is re-audited against those exact authoring bytes and must be publication-ready. For a preinstalled canonical maintained mock, both passing sidecars are mandatory; null/missing evidence is a catalog error, not a weaker pass. Archive material is provenance only. SSC CGL, PFRDA and future included exams all ship through the same immutable canonical `ExamPackage` path. CGL’s preserved raw transcription/patch/solution corpus is archive evidence only; archive conversion lives under `tools/cgl-archive/` and is used solely to prove canonical-package equivalence. Setting a family to `preinstalled: false` excludes it from future builds without changing the scorer or Library runtime. Full repository-corpus removal deletes both its catalog entry and active family directory; reciprocal reachability rejects unregistered active bank files. The application has no required backend, login or cloud learner store. Generated artifacts are never hand-edited.

## 2. Ownership map

| Layer | Main modules | Owns |
|---|---|---|
| Domain | `src/domain/` | Canonical package/question/key/scoring/media/calculator contracts and validation; no runtime CGL UI policy |
| Shared workspace contracts | `src/workspace-settings.ts` | Pure persisted preference/practice-setup contracts; mode state is exam-agnostic and validated against each paper’s declared/structural eligibility |
| Engine | `src/engine/` | Generic attempt/session transitions, terminal scoring, response legality, timing and Source comparison |
| App composition | `src/app/generic-ui.ts`, `coordinator-context.ts` | One workspace composition root; feature controllers receive explicit capability slices |
| Feature UI | `src/app/*-controller.ts`, render/view modules | Library, Exam, Results, History, Learning, authoring shell, navigation and storage-health presentation |
| Persistence | `src/history/` | `WorkspaceStore`, IndexedDB and limited localStorage resilience adapters, immutable snapshots, CAS, backup/recovery/deletion |
| Learning | `src/learning/` | Evidence extraction, FSRS-7 scheduling/revision selection, optimizer profile validation/browser orchestration, and opt-in exam-scoped learner-focus reduction/personalisation |
| Authoring | `src/authoring/` | Draft/staging store, editor binding, publication workflow and canonical publisher boundary |
| Question-bank corpus | `question-banks/` | One authoritative exam → year → paper manifest graph; optional year-owned semantic taxonomies, exam-scoped PYQ/mock sources, Original/Revised editions, generated packages and a family-level preinstall catalog; no runtime policy |
| External content tools | `scripts/*bank*`, review/editorial/PDF/handoff CLIs | Structured source preparation, review/evidence sidecars, explicit file publication, and staged transactional custom-mock corpus addition/revision |

The dependency direction is deliberate: domain/engine contracts do not depend upward on application orchestration.

## 3. Exam lifecycle

```text
validated package/source
  → immutable paper/key/media/policy selection
  → frozen attempt
  → candidate events (answer/clear/flag/navigate/timing)
  → immutable score/result
  → local History/backup
  → optional notebook + FSRS revision evidence
```

Question identity and content/key revisions are separate. The frozen paper owns the immutable timer budget/navigation policy, while frozen `AttemptMode` owns enforcement: `exam-simulation` is hard-deadline, practice modes are advisory and may record overtime. Exam sections remain the only source of sectional budgets. Subject → Topic → Subtopic owns semantic classification; maintained taxonomies are versioned exam data with stable nodes, and the exact resolved taxonomy context is frozen with an attempt for historical analytics. Printed Source and corrected Reviewed editions remain distinct, and advisory comparison never rewrites historical scores.

Candidate-visible resources are narrower than reviewer/solution resources: keys, explanations, disputes and explanation-only assets stay outside the permitted pre-review surface. Choice questions expose candidate-owned strike/elimination controls whose state is stored only in durable `candidateScratch` against stable option IDs; this never changes answer eligibility or scoring. Candidate text highlighting is likewise scratch-only: prompts and eligible stimulus text expose plain canonical-text anchors or rich structural text-leaf anchors (`block/item/cell/inline` path plus local offsets). Existing authored marks/lists/tables remain the renderer's structure, while KaTeX math and images have no text-leaf anchor and stay atomic. The question navigator also exposes Next unanswered / Next flagged, with destinations computed through the same engine navigation-legality predicate used by ordinary `NAVIGATE` events, so forward-only, sectional, sequential-locked and completed-section rules cannot be bypassed. Paper-authored reference documents use a generic candidate-reference resource contract; `candidateTools.references` binds each permitted resource by stable ID plus SHA-256 content hash, and attempt start freezes the exact bound resources/assets. The runtime never infers a formula sheet, statutory extract, lab table or other reference from an exam name. Strict and flexible-full-paper are user workspace choices for any exam package; section-only practice is offered only when the author declares multiple physical sections. These choices derive from source timing, navigation and scoring, never from an exam name or a new `ExamPackage` mode field. Flexible practice combines declared section limits where all are known; section-only practice uses an authored per-section limit or stays untimed, never an invented allocation. Newly imported custom papers default to advisory flexible practice; Source/Reviewed packages default to strict simulation unless their authored `practiceModes` eligibility excludes it. Evidence-selected/custom compositions still freeze as `custom-practice`.

## 4. Persistence and recovery

Application orchestration talks to one `WorkspaceStore` interface. IndexedDB is the primary durable backend; a bounded localStorage implementation is a current resilience fallback, not a compatibility layer. Backend-specific CAS/import/deletion/authoritative-read/recovery behavior stays behind that boundary.

Attempts use compact records plus deduplicated immutable snapshots. Durable candidate annotations (`candidateScratch`) live on the per-attempt row, separately from responses and the immutable source snapshot; option eliminations use stable option IDs and highlights use source-validated text anchors. A browser selection is translated back to those frozen-source anchors before persistence; redraw/reload renders decoration from scratch evidence without rewriting the frozen `QuestionRevision` or stimulus. They survive completion and portable backup for later explicit review/handoff, but never participate in scoring. Stale sibling-tab writes fail closed; terminal/newer records defeat older emergency mirrors. Backup restore is additive, bounded and integrity-checked. Corrupt/dangling data is surfaced or quarantined rather than silently repaired into invented history.

Storage-health/quota/persistence prompts are application presentation concerns. Backup validation consumes the pure workspace-settings contract rather than importing application storage adapters. Terminal attempt persistence is also the single owner of **transient workspace** cleanup, so calculator state, unsaved choice drafts and transient written-response drafts cannot outlive a completed attempt. This is distinct from durable `candidateScratch`, which is attempt evidence and is deleted only with the attempt itself. Authoring drafts/staging and attempt History are separate persistence/export lifecycles.

## 5. Authoring and content publication

`AuthoringWorkspaceStore` owns unpublished shelf/staging persistence, corruption protection and cross-tab CAS. `authoring-workflow.ts` owns staged handoff and validate → acknowledge → revalidate publication sequencing. `authoring-studio-view.ts` owns pure authoring field projection and HTML generation; the studio owns editor state/event orchestration but not browser-storage mechanics or a second publisher.

Wordgard/manual and external-agent flows converge on the same canonical `practice-desk-authoring` → validated exam-package boundary. Authoring drafts may carry generic candidate reference documents; the canonical publisher validates their rich content/media, computes each resource hash and emits the corresponding paper binding rather than creating a domain-specific reference format. Per-question marking is one optional authoring field that compiles to the existing answer-key `scoringOverride`; it does not create a second scoring path. Advanced external review can add quota blueprints, layered quality review, Source/Reviewed decisions and supplied-document evidence, but those files do not become a second scoring/runtime model. When a maintained authoring edition binds a quality review or blueprint in its manifest, catalog validation treats that sidecar as a freshness/publication gate for that exact source revision. Repository-maintained exam content is organized under `question-banks/<exam>/<year>/...`, where a year may bind `taxonomy.json` and papers live under `pyqs|mocks/<paper>/...`; the application source contains no CGL-specific content importer. Archive-only CGL schema/conversion/validation lives under `tools/cgl-archive/` and is excluded from runtime/build policy. Appending a maintained paper changes its year/paper manifests, not the family catalog or scorer. Maintained custom mocks may use `question-bank-corpus.mjs`: the command validates a staged complete corpus before acquiring a lock and applying create-only folder + atomic manifest changes, then revalidates and rolls back its own writes on failure. Source/Reviewed/PDF material keeps its separate provenance pipeline.

See the [agent quickstart](../AGENT_AUTHORING_QUICKSTART.md) and [advanced pipeline](AGENT_CONTENT_PIPELINE.md).

## 6. Learning and FSRS

Learning derives from frozen attempt evidence and learner ratings without changing historical exam marks. The application uses FSRS-7 through a replaceable scheduler boundary.

The learner-to-authoring bridge is local and opt-in. `learner-focus.ts` reduces one selected exam's completed non-revision attempts, notebook evidence and current FSRS-due state into a bounded `practice-desk-learner-focus` packet. Off shares nothing; Focused exposes aggregates; Detailed may expose bounded wrong objective-response/question evidence but omits correct responses, learner free-response text and candidate scratch annotations (eliminations/highlights). The Learning desk can inspect/copy/export that packet or combine it locally with a standard Authoring Brief. The same personalisation function is used by `content-blueprint.mjs --learner-focus`; external agents still have no raw browser-History API. Exam-simulation personalisation remains blueprint-first.

Native Node and browser/WASM optimization are adapters around one shared optimizer pipeline/activation policy. Training evidence is validated chronologically; v5 profiles distinguish raw review/card counts from converter-retained optimizer item/card counts. Candidate personalized weights must show strictly lower held-out log loss than stock FSRS-7, with no RMSE-bins regression, and replacements must also beat the active personalized profile on the same holdout before use. The static build can train locally in a Worker/WASM environment; the standalone `file://` build retains scheduling/import/export but intentionally omits in-app training. Review history is not uploaded to an optimizer backend.

A Learning review stores rating/timestamp as replay truth plus foreground duration evidence measured from card presentation through rating. Duration is split into recall-before-reveal and post-reveal checking; hidden-tab time is excluded and visibility interruption is retained as a reliability flag. The scheduler replay boundary deliberately does not consume duration metadata.

The scheduler policy is a discriminated fixed-retention/Cost-ADR contract: fixed retention exposes a bounded 75–97% target, while Cost-ADR is one upstream-default preset rather than a raw tuning surface. Policy changes replay the same immutable review evidence to recompute future schedules; they never rewrite ratings, timestamps or exam history. The scheduler uses ts-fsrs's native leech suspension status for optional automatic queue suspension; remediation priority and explicit learner suspension remain application policy. Exact optimizer evidence floors, chronology settings, profile fields and upstream binding versions are implementation/test contracts, not architectural duplication points. No minimum effect-size threshold is asserted without empirical justification.

## 7. Rendering and navigation

Feature controllers receive narrow `…ControllerContext` capability slices from the composition root. The exam renderer selectively reconciles changed UI so focus and unsaved candidate inputs are not casually destroyed. Written text is staged transiently and checkpointed at meaningful attempt/lifecycle boundaries; those checkpoints replace the current response without retaining typing/revision telemetry. Results derive written word counts, timer budget/overtime and post-deadline foreground exposure from frozen attempt evidence; no derived word count or persistent analytics cache is maintained.

Exam-question navigation is owned by the session engine. Numbered palette jumps, ordinary previous/next movement and derived quick-jump affordances must all satisfy the same frozen paper policy; application helpers may select a target but cannot weaken engine legality. Native Navigation API is preferred where available; the tested fragment-route fallback preserves same-file `file://` operation. Responsive support includes narrow/zoom cases such as 195px at 140% scale. Linux WebKit automation does not certify physical Mac Safari, touch/IME or assistive technology.

## 8. Trust and deferred boundaries

Hashes attest internal byte consistency, not publisher identity or factual truth. External source/PDF transcription, official answers, current law and reviewer independence require separate evidence. Physical-device/accessibility, real OS/profile storage loss and human release/usability approval remain outside automated CI and are tracked in the [backlog](../../backlog.md).

**References:** [data contracts](DATA_CONTRACTS.md) · [QA](../QA_CURRENT.md) · [backlog](../../backlog.md) · [historical evidence](../HISTORY_INDEX.md).
