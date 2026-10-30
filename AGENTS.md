# Practice Desk — mandatory engineering constraints

## Read before changing source

1. [Root README](README.md) and [docs index](docs/README.md).
2. [Active independent v11 source audit](docs/audits/V11_SOURCE_AUDIT_2026-10-30.md) — material open regressions and generic correctness gaps; do not assume v11 ⊆ overhaul.
3. [Current architecture](docs/architecture/CURRENT_ARCHITECTURE.md), [data contracts](docs/architecture/DATA_CONTRACTS.md) and [binding decisions](docs/decisions/POLICY_REGISTER.md).
4. [Complete Passes 4–16 historical work](docs/history/PASSES_04_16.md), where context is needed; old fixture results and DONE labels do not prove new parity.

## Non-negotiable development contract

- **Branch:** only commit to `overhaul`; never modify `main` or `baseline/v11`; do not merge without explicit user approval.
- **Product:** remain a superset of all material v11 workflows and feedback, with demonstrably better accessibility, UI, architecture and generic abstractions; newly added capabilities cannot excuse lost original behavior.
- **Artifact:** one generated self-contained offline `file://` HTML, no runtime internet, analytics, remote scripts/fonts or account. Never edit generated HTML directly.
- **Engineering:** typed, modular strict TypeScript, one six-kind exam runtime, no untyped parallel v11 implementation or casual `any`/`@ts-ignore`/`@ts-nocheck`.
- **Integrity:** immutable content-hashed paper/question/key/media snapshots, original/reviewed provenance; scoring and answer events validated and frozen; race-safe `saveRevision`, checked additive backup v3, explicit self-assessed writing marks and FSRS ratings; no pre-submit key disclosure.
- **Editorial:** user-approved reviewed CGL `caution` fallback retains published key B in disputed 6 Oct Q62 and scores it (+2/−0.5), while original source invalid is excluded. Dispute is disclosed clearly only after submission. The real paper/key JSON must remain unchanged.
- **Scoring:** component partial marks must not exceed full credit; **additional score-ceiling and answer-key validity gaps remain OPEN** in the current audit. Repair at the source/engine level; never relax validation to make QA pass.
- **Backup:** no v11 history migration (new app) and no replacing existing record IDs on v3 import.
- **Working process (MANDATORY EACH PASS):** read the [independent audit and implementer scratchpad](docs/audits/V11_SOURCE_AUDIT_2026-10-30.md) **before** coding, and maintain its Section G **throughout**, not retroactively. Follow source audit → analyze alternatives/invariants → implement → objective-by-objective source reconciliation (iterate on implementation if needed) → **targeted new QA**. Name all allocated finding IDs and track each independently. Read source consumers and adjacent flows, not just the offending line. Record exact code changes/commits, tests actually executed and remaining uncertainty; never close a finding solely from historical fixtures or prose.
- **QA cadence:** keep each implementation pass focused on the relevant new behavioral/regression tests, plus appropriate typecheck/build smoke verification. **Pass 23** is the independent whole-app source-to-source v11 audit and broad/full QA; do not falsely imply device coverage from CI. Real Android/iOS/macOS Safari, NVDA/VoiceOver, storage eviction/force-kill and human UI judgment remain unverified until directly tested.
- **Documentation:** update [docs index](docs/README.md), active audit, architecture, data contracts and decision register, not a new redundant pass scratchpad.
