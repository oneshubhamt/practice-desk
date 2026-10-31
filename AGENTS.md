# Practice Desk — mandatory engineering constraints

## Read before changing source

1. [Root README](README.md) and [docs index](docs/README.md).
2. [Controlling Pass24 laptop visual findings and Pass25–28 verified repair register](docs/audits/PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md) — **11/11 targeted fixes, NOT final independent whole-app v11 laptop parity**; Pass29 remains open.
3. [Original v11 findings and active implementer scratchpad](docs/audits/V11_SOURCE_AUDIT_2026-10-30.md) — durable 25 source findings, Pass17–28 implementation reasoning and live Pass29 handoff; maintain Section G before/during code work.
4. [Pass23 independent source/functional report](docs/audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) — frozen source/score parity and conditional engineering status, not a visual/physical/AT release certificate.
5. [Current architecture](docs/architecture/CURRENT_ARCHITECTURE.md), [data contracts](docs/architecture/DATA_CONTRACTS.md) and [binding decisions](docs/decisions/POLICY_REGISTER.md).
6. [Complete Passes 4–16 historical work](docs/history/PASSES_04_16.md), where context is needed; old fixture results and DONE labels do not prove new parity.

## Non-negotiable development contract

- **Branch:** only commit to `overhaul`; never modify `main` or `baseline/v11`; do not merge without explicit user approval.
- **Product:** remain a superset of all material v11 workflows and feedback, with demonstrably better accessibility, UI, architecture and generic abstractions; newly added capabilities cannot excuse lost original behavior.
- **Artifact:** one generated self-contained offline `file://` HTML, no runtime internet, analytics, remote scripts/fonts or account. Never edit generated HTML directly.
- **Engineering:** typed, modular strict TypeScript, one six-kind exam runtime, no untyped parallel v11 implementation or casual `any`/`@ts-ignore`/`@ts-nocheck`.
- **Integrity:** immutable content-hashed paper/question/key/media snapshots, original/reviewed provenance; scoring and answer events validated and frozen; race-safe `saveRevision`, checked additive backup v3, explicit self-assessed writing marks and FSRS ratings; no pre-submit key disclosure.
- **Editorial:** user-approved reviewed CGL `caution` fallback retains published key B in disputed 6 Oct Q62 and scores it (+2/−0.5), while original source invalid is excluded. Dispute is disclosed clearly only after submission. The real paper/key JSON must remain unchanged.
- **Scoring:** component partial marks must not exceed declared full credit; validated blank awards, negative mark floor, matching uniqueness and multiple-select key/cardinality envelopes were repaired in Pass 17 and independently rechecked in Pass 23. Never relax these constraints merely to satisfy fixtures.
- **Backup:** no v11 history migration (new app) and no replacing existing record IDs on v3 import.
- **Working process (MANDATORY EACH PASS):** read the [independent audit and implementer scratchpad](docs/audits/V11_SOURCE_AUDIT_2026-10-30.md) **before** coding, and maintain its Section G **throughout**, not retroactively. Follow source audit → analyze alternatives/invariants → implement → objective-by-objective source reconciliation (iterate on implementation if needed) → **targeted new QA**. Name all allocated finding IDs and track each independently. Read source consumers and adjacent flows, not just the offending line. Record exact code changes/commits, tests actually executed and remaining uncertainty; never close a finding solely from historical fixtures or prose.
- **QA cadence and release gate:** Pass23 independently checked frozen v11/current source/scoring; Passes25–28 implemented and targeted-browser-verified all 11 separate laptop findings, with before/after DOM rectangles and screenshot artifacts. **Pass29 MUST perform a fresh, broad, independent laptop screenshot and functional assessment** across Library, Exam ordinary/passage/figure, Display themes 100–140%, editorial key/caution review, Results tabs, History and generic imported six-kind workflows. Re-run targeted and Pass23 suites and investigate new regressions, but do not infer independent parity merely from historical green scripts. Real Android/iOS/macOS Safari, NVDA/VoiceOver, storage eviction/force-kill and human judgment remain external/manual gates until directly tested and explicit user promotion approval.
- **Documentation:** keep the [docs index](docs/README.md), [final independent report](docs/audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md), original findings/worklog, architecture, data contracts and decision register consistent. Do not create competing pass scratchpads.
