# Practice Desk — current engineering status

**Current development branch: `working`**

Practice Desk is a strict-TypeScript, offline-first examination and learning application. The normal standalone distribution is one deterministic `file://` HTML file; the static distribution adds a local Worker/WASM FSRS optimizer without adding an application backend.

## Canonical architecture

The active topology is intentionally small and one-directional:

- **Domain:** immutable exam/package contracts, questions, scoring rules, media and validation live below the application layer.
- **Engine:** generic attempt/session transitions and scoring consume domain contracts without depending on `app/`.
- **Application composition:** `generic-ui.ts` assembles one workspace state object; feature controllers receive explicit capability slices rather than an unrestricted coordinator contract.
- **Persistence:** application orchestration uses one `WorkspaceStore` contract. IndexedDB and the limited localStorage resilience fallback own their backend mechanics behind that boundary. Storage-health presentation is separate.
- **Authoring:** the studio owns editor/UI orchestration; `AuthoringWorkspaceStore` owns unpublished shelf/staging persistence and cross-tab CAS; `authoring-workflow.ts` owns staging handoff and publication/QA sequencing.
- **Learning:** FSRS scheduling remains local. Native and browser/WASM optimization are adapters around one shared optimizer pipeline and activation policy.
- **Builds:** standalone and static distributions are generated independently from the same target builder/configuration; one generated artifact is never rewritten to create the other.

See [CURRENT_ARCHITECTURE.md](architecture/CURRENT_ARCHITECTURE.md), [DATA_CONTRACTS.md](architecture/DATA_CONTRACTS.md) and [QUESTION_BANK_AUTHORING.md](architecture/QUESTION_BANK_AUTHORING.md) for the enduring contracts.

## Clean-slate policy

This is a new application. Current production code should express one canonical schema/topology rather than carry migration readers, compatibility aliases, dual-write paths or retired workflow branches. Resilience mechanisms that protect current data—such as the IndexedDB fallback, emergency active-attempt mirror, immutable frozen history and corrupt-data quarantine—are current product behavior, not legacy compatibility.

Historical implementation evidence remains in Git and is indexed from [HISTORY_INDEX.md](HISTORY_INDEX.md). Do not keep old programme diaries, temporary pass instructions or obsolete CI experiments in the active architecture merely for provenance.

## Completion discipline

A change is complete only after source ownership and dependency direction are checked and the relevant automated gates pass. The current full verification contract is [QA_CURRENT.md](QA_CURRENT.md); the actual test suite and [CI workflow](../.github/workflows/ci.yml) are authoritative.

For substantive shared-runtime changes, verify:

1. strict TypeScript and complete Node contracts;
2. targeted mutation witnesses;
3. deterministic standalone build and clean dependency graph;
4. native/WASM FSRS optimizer parity and static build;
5. Chromium, Firefox and WebKit user journeys;
6. guarded publication of the exact tested standalone artifact.

Passing tests do not authenticate external sources or prove educational/factual quality. Those and physical-device/accessibility/storage-loss risks remain in the [backlog](../backlog.md).

## Engineering rule

Prefer the smallest boundary that removes a real duplicate responsibility or dependency inversion. Do not introduce frameworks, abstractions or file splits merely to reduce line counts. Preserve candidate secrecy, scoring correctness, immutable history, local privacy, offline operation and recoverability while making the source easier to reason about.
