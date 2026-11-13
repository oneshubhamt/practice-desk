# Practice Desk — as-built architecture

This is the canonical architectural map. It records enduring ownership and lifecycle boundaries; implementation passes, temporary fixes, exact test counts and tuning details belong in source/tests or [historical Git](../HISTORY_INDEX.md).

## 1. Distribution

The same source is built through `scripts/build-target.mjs` into two targets:

- **Standalone:** `Practice_Desk_Offline_Mock_Tests.html`, deterministic and directly runnable via `file://`.
- **Static:** `Practice_Desk_Static/`, served over localhost/HTTPS and adding the local FSRS optimizer Worker/WASM assets.

Neither generated target is derived by rewriting the other. The application has no required backend, login or cloud learner store. Generated artifacts are never hand-edited.

## 2. Ownership map

| Layer | Main modules | Owns |
|---|---|---|
| Domain | `src/domain/` | Canonical package/question/key/scoring/media/calculator contracts and validation; no runtime CGL UI policy |
| Shared workspace contracts | `src/workspace-settings.ts` | Pure persisted preference/practice-setup contracts, including built-in CGL runtime mode; no browser storage |
| Engine | `src/engine/` | Generic attempt/session transitions, terminal scoring, response legality, timing and Source comparison |
| App composition | `src/app/generic-ui.ts`, `coordinator-context.ts` | One workspace composition root; feature controllers receive explicit capability slices |
| Feature UI | `src/app/*-controller.ts`, render/view modules | Library, Exam, Results, History, Learning, authoring shell, navigation and storage-health presentation |
| Persistence | `src/history/` | `WorkspaceStore`, IndexedDB and limited localStorage resilience adapters, immutable snapshots, CAS, backup/recovery/deletion |
| Learning | `src/learning/` | Evidence extraction, FSRS-7 scheduling/revision selection, optimizer profile validation/browser orchestration |
| Authoring | `src/authoring/` | Draft/staging store, editor binding, publication workflow and canonical publisher boundary |
| External content tools | `scripts/*bank*`, review/editorial/PDF/handoff CLIs | Structured source preparation, review/evidence sidecars and explicit file publication |

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

Question identity and content/key revisions are separate. Exam sections own timing/navigation; Subject → Topic → Subtopic owns semantic classification. Printed Source and corrected Reviewed editions remain distinct, and advisory comparison never rewrites historical scores.

Candidate-visible resources are narrower than reviewer/solution resources: keys, explanations, disputes and explanation-only assets stay outside the permitted pre-review surface. Attempt mode is chosen explicitly when an attempt is created; runtime CGL selection is not part of `ExamPackage`, and evidence-selected/custom compositions freeze as `custom-practice`.

## 4. Persistence and recovery

Application orchestration talks to one `WorkspaceStore` interface. IndexedDB is the primary durable backend; a bounded localStorage implementation is a current resilience fallback, not a compatibility layer. Backend-specific CAS/import/deletion/authoritative-read/recovery behavior stays behind that boundary.

Attempts use compact records plus deduplicated immutable snapshots. Stale sibling-tab writes fail closed; terminal/newer records defeat older emergency mirrors. Backup restore is additive, bounded and integrity-checked. Corrupt/dangling data is surfaced or quarantined rather than silently repaired into invented history.

Storage-health/quota/persistence prompts are application presentation concerns. Backup validation consumes the pure workspace-settings contract rather than importing application storage adapters. Terminal attempt persistence is also the single owner of candidate-only scratch cleanup, so calculator state and unsaved choice drafts cannot outlive a completed attempt. Authoring drafts/staging and attempt History are separate persistence/export lifecycles.

## 5. Authoring and content publication

`AuthoringWorkspaceStore` owns unpublished shelf/staging persistence, corruption protection and cross-tab CAS. `authoring-workflow.ts` owns staged handoff and validate → acknowledge → revalidate publication sequencing. `authoring-studio-view.ts` owns pure authoring field projection and HTML generation; the studio owns editor state/event orchestration but not browser-storage mechanics or a second publisher.

Wordgard/manual and external-agent flows converge on the same canonical `practice-desk-authoring` → validated exam-package boundary. Advanced external review can add quota blueprints, blind quality review, Source/Reviewed decisions and supplied-document evidence, but those files do not become a second scoring/runtime model.

See the [agent quickstart](../AGENT_AUTHORING_QUICKSTART.md) and [advanced pipeline](AGENT_CONTENT_PIPELINE.md).

## 6. Learning and FSRS

Learning derives from frozen attempt evidence and learner ratings without changing historical exam marks. The application uses FSRS-7 through a replaceable scheduler boundary.

Native Node and browser/WASM optimization are adapters around one shared optimizer pipeline/activation policy. Training evidence is validated chronologically; v5 profiles distinguish raw review/card counts from converter-retained optimizer item/card counts. Candidate personalized weights must show strictly lower held-out log loss than stock FSRS-7, with no RMSE-bins regression, and replacements must also beat the active personalized profile on the same holdout before use. The static build can train locally in a Worker/WASM environment; the standalone `file://` build retains scheduling/import/export but intentionally omits in-app training. Review history is not uploaded to an optimizer backend.

A Learning review stores rating/timestamp as replay truth plus foreground duration evidence measured from card presentation through rating. Duration is split into recall-before-reveal and post-reveal checking; hidden-tab time is excluded and visibility interruption is retained as a reliability flag. The scheduler replay boundary deliberately does not consume duration metadata.

The scheduler policy is a discriminated fixed-retention/Cost-ADR contract: fixed retention exposes a bounded 75–97% target, while Cost-ADR is one upstream-default preset rather than a raw tuning surface. Policy changes replay the same immutable review evidence to recompute future schedules; they never rewrite ratings, timestamps or exam history. The scheduler uses ts-fsrs's native leech suspension status for optional automatic queue suspension; remediation priority and explicit learner suspension remain application policy. Exact optimizer evidence floors, chronology settings, profile fields and upstream binding versions are implementation/test contracts, not architectural duplication points. No minimum effect-size threshold is asserted without empirical justification.

## 7. Rendering and navigation

Feature controllers receive narrow `…ControllerContext` capability slices from the composition root. The exam renderer selectively reconciles changed UI so focus and unsaved candidate inputs are not casually destroyed. Results build one bounded per-render question/evidence lookup rather than repeatedly rescanning the frozen attempt; no persistent analytics cache is maintained.

Native Navigation API is preferred where available; the tested fragment-route fallback preserves same-file `file://` operation. Responsive support includes narrow/zoom cases such as 195px at 140% scale. Linux WebKit automation does not certify physical Mac Safari, touch/IME or assistive technology.

## 8. Trust and deferred boundaries

Hashes attest internal byte consistency, not publisher identity or factual truth. External source/PDF transcription, official answers, current law and reviewer independence require separate evidence. Physical-device/accessibility, real OS/profile storage loss and human release/usability approval remain outside automated CI and are tracked in the [backlog](../../backlog.md).

**References:** [data contracts](DATA_CONTRACTS.md) · [QA](../QA_CURRENT.md) · [backlog](../../backlog.md) · [historical evidence](../HISTORY_INDEX.md).
