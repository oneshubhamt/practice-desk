# Active engineering decisions and exceptions

**Authority:** explicit user decisions and source contracts in this register override preliminary historical scratchpad suggestions in [Passes 4–16](../history/PASSES_04_16.md). Findings from [independent source audit](../audits/V11_SOURCE_AUDIT_2026-10-30.md) remain OPEN unless code is actually repaired. Never change statuses to “resolved” based on a Markdown edit.

| ID | Status | Active decision / boundary |
|---|---|---|
| D01 | Binding | Preserve immutable original five CGL published banks and separate patch/solution files; no invented official status |
| D02 | User approved | Reviewed unpatched CGL `invalid/caution` → **scoreable caution** with publisher key; source edition invalid remains excluded |
| D03 | User approved | CGL 6 October 2026 Q62: original excluded; reviewed caution retains published B (+2) despite dispute, clearly disclosed only post-test |
| D04 | Binding | Generic multiple-select/matching component partial score not above question `correctMarks`; other score-ceiling issues remain open |
| D05 | User approved | No historical v11 app-user database/backup migration; new application has no legacy live data |
| D06 | User approved | Backup v3 SHA-256 and additive/no-silent-overwrite import, not v11 replace-newer-on-ID |
| D07 | Binding | One generic six-kind engine, no CGL-only parallel runtime, strict TS, one offline single-file artifact |
| D08 | Binding | Freeze questions, key, media, scoring policy, solutions/source provenance and response events; preserve honesty of historic evidence |
| D09 | Implemented + binding | Pass 18 records exact consumed sequential/single-section timer durations only for new sessions, reports elapsed timer, attempted/non-excluded rate, global measured scored-answer median and question exposure separately; old/free multi-section timers remain unknown. Never fabricate historical durations |
| D10 | Binding | FSRS review is explicit, cannot be inferred from test mark or used to regrade source attempt |
| D11 | Binding | No premature answer/editorial/solution disclosure |
| D12 | Binding | Comparisons require truly matching paper/key/mode; no projected rank, national percentile or arbitrary psychometrics |
| D13 | Unapproved | Unconditional release/merge; physical Android/iOS/macOS Safari/NVDA/VoiceOver and OS-kill/eviction and human UI signoff |
| D14 | Open | Full v11 behavioral/UI superset. See F01–F15; no “parity attained” claim |
| D15 | Open | Valid generic rule envelope. See G01–G10; external paper acceptance must reflect actually executable semantics |
| D16 | User approved | Maintain the **active source audit Section G as the durable implementation scratchpad**. Each pass: audit, analyze, implement, reconcile each assigned objective, and targeted NEW QA; iterate repairs before QA when needed. Comprehensive whole-app source/UI audit and broad QA belong in Pass 23, with physical-device/AT caveats honest |
| D17 | User approved | Preserve the useful v11 UI layout, navigation convenience, clarity and material workflows, but implement demonstrably better design and reusable generic abstractions where helpful; pixel-perfect imitation and restoration of unsafe legacy behavior are not required |

**Rule for edits:** audit → analyze invariants → implement → reconcile requirements → targeted independent QA. Preserve `main`/`baseline/v11`; all changes to `overhaul` only, except explicit release authorization.

**Documentation boundaries:** [docs index](../README.md) is entry point; [architecture](../architecture/CURRENT_ARCHITECTURE.md) and [contracts](../architecture/DATA_CONTRACTS.md) are concise current state; history preserves original dated records; audit is a separate source-backed findings register.
