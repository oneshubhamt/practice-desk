# Practice Desk — engineering contract

## Reading order

1. [README](README.md): build, current design and release boundary.
2. [Canonical Passes 4–16 record](docs/ENGINEERING_RECORD.md): decisions, source matrix, historical work, frozen data model and accepted exceptions.
3. [Independent v11 source audit](docs/V11_INDEPENDENT_SOURCE_AUDIT.md), when available: verified gaps and their status. It is **not** a replacement for actual source inspection.
4. Direct code comparison between `baseline/v11` and current `overhaul`; never mistake old passing QA fixtures or documentary DONE labels for parity proof.

## Safety and architecture

- Write **only** on `overhaul`; leave `main` and `baseline/v11` frozen, with no unrequested merge.
- Maintain a **self-contained** generated offline `file://` HTML application; no runtime network, analytics, external fonts or server dependencies. Do not edit the generated HTML by hand.
- Use strict modular TypeScript; no new `any`, `@ts-nocheck`, `@ts-ignore` or parallel v11 runtime. Keep one generic validated six-kind engine, not CGL-specific forks.
- Preserve frozen paper/question/key/media/response snapshots, calculated score integrity, optimistic save revisions, v3 additive checksum backup, separately labelled manual scores, explicit FSRS feedback, stable revisions and event timings.
- Hide source answers, corrections and detailed explanations until submission. Keep independent published source data and editorial corrections separate.
- **Binding user decision:** unpatched source-invalid/caution CGL questions are excluded in source edition, but scoreable as `caution` in reviewed edition with published key; disputed 6 Oct Q62 retains B for reviewed scoring and conspicuously notes dispute after submission.
- Generic multi-select and matching partial-component awards may **not exceed** the item's declared full `correctMarks`.
- No v11 legacy-user-history migration; backup imports remain additive, never silently replace same-ID local records.
- Follow **source audit → analysis → implementation → objective-by-objective reconciliation → targeted QA**. Do not treat automated checks as independent functional parity verification.
- Manual actual Apple Safari, Android/iOS, NVDA/VoiceOver, OS storage eviction/force kill and visual judgement are pending until tested on those platforms. Explicit user authorization is required for release/merge.
- Keep engineering history in the canonical record. New independent source-to-source audit findings belong in the dated audit report; avoid recreating redundant pass documents.
