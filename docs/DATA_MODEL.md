# Domain model and data topology

## Scope

The generic domain types describe the target model; the current SSC CGL JSON banks remain the untouched source/transcription layer until a later migration-by-replacement is deliberately implemented. This pass does not change runtime behaviour or rewrite the generated HTML.

## Identity and revision rules

- `ExamDefinition` identifies an exam family (for example, SSC CGL or APFC).
- `PaperDefinition` identifies a particular source paper independently of its editions.
- `PaperRevision` freezes section order, question membership, timing, navigation, scoring and an answer-key revision. Its content hash is a lowercase SHA-256 digest.
- `QuestionRevision` freezes prompt, options/response rules, stimuli/assets references and editorial state. `questionId` links revisions of the same conceptual item; `id` identifies one immutable revision.
- `AnswerKeyRevision` is versioned separately so answer-key corrections do not silently alter historical attempts.
- `AttemptSnapshot` stores the exact paper/key revision and scoring policy used at start. The attempt and its score snapshot are user records; analytics are derived and rebuildable.
- Stable option IDs, not displayed letters or positions, identify choices. This avoids comparing original and reviewed answer letters after options are rearranged.

## Data ownership

| Data | Authority | Mutability |
|---|---|---|
| Source transcription and source PDF provenance | Source paper bank | Immutable after ingestion; corrections are separate records |
| Reviewed wording/options/editorial status | Question revision/editorial record | New revision for each accepted change |
| Correct answers | Answer-key revision | Immutable; correction creates a new revision |
| Paper structure and rules | Paper revision | Immutable |
| Attempts, response events and timing | User-record store | Append/update only while an attempt is active; completed attempts are frozen |
| Insights and aggregates | Analytics functions | Derived; may be recalculated without rewriting attempt facts |
| Image/passages assets | Asset/stimulus registry, keyed by stable ID and content hash | Immutable and deduplicated |

## Normalization decisions

- Store an asset once and refer to it by ID/hash instead of duplicating the same image in each question.
- Store a shared passage, case, table or chart once and reference it from related questions.
- Keep source transcription, reviewed patches, answer keys and explanations logically separate; do not conflate editorial comments with test-facing content.
- Persist question responses/timing separately from immutable paper content. A paper revision references ordered question-revision IDs; a completed attempt pins its paper revision.
- Use indexes for actual query patterns (exam/paper/revision, status/date, question/revision) and paginate history. Do not add stores or indexes until access patterns justify them.
- Derived analytics are not authoritative records. Preserve the score snapshot used at completion alongside the frozen inputs needed for later audited recalculation.

## Runtime invariants

1. IDs are non-empty and unique within their entity collection; revisions are positive integers.
2. Content hashes are SHA-256 hex digests, computed over a documented canonical serialization before publication.
3. A paper revision references known question revisions and exactly one timing limit per section when sectional timing is enabled.
4. A question revision occurs in one section at most once in a paper revision.
5. A supplied answer-key revision belongs to that paper and contains an entry for every scored question revision.
6. Every answer must match the question response kind and refer only to options/items present in that revision.
7. Invalid, incomplete-source or under-review questions cannot become scoreable by default; any override must be explicit and auditable.
8. Source keys and reviewed keys are never compared by option letter unless semantic mapping is verified.
9. External JSON is `unknown` until runtime validation succeeds. Do not trust a TypeScript cast as validation.
10. The released artifact remains a self-contained HTML file runnable from `file://` without network, server, external module or asset dependencies.

## What is intentionally deferred

- IndexedDB object-store design and transaction APIs: Pass 3.
- Session transitions, timer semantics and scoring calculation: Pass 2.
- Converting the 500 current records into normalized question revisions, assigning content hashes and de-duplicating their 92 image assets: a later content-packaging step after the domain contract is accepted.
- UI integration and rendering changes: Pass 4.

This is a target topology, not a claim that the current runtime or persisted data already implements it.
