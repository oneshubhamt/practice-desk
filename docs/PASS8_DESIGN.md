# Pass 8 data decisions

This is a companion to the [live five-step architecture scratchpad](ARCHITECTURE_AUDIT_2026-10-28.md). Source of truth remains the scratchpad and executable code/tests.

- **Revision package:** derive a transient, validated custom paper from explicit notebook selection, never mutate original paper/key or write a second data store. Pin source question revisions and answer definitions; freeze only required referenced media, reject conflicting asset/stimulus identities and duplicate IDs. Group within the same exam, allow cards from different paper editions, and use a fixed, explicitly disclosed practice rule of +1 correct, 0 incorrect/unanswered. Use a new UUID-based paper/attempt revision identity to avoid confusing different revision sessions. Normal engine/history/backup handles the generated attempt.
- **Topic granularity:** retain section as broad fallback; add explicit question topic IDs and user-labelled topics without classification inference. Distinguish observations (multiple attempts may repeat a question) and unique question revisions, and gate interpretation by answered sample sizes/independent attempts.
- **Timed analysis:** per-question duration means foreground time in the question, not total cognitive work. Speed buckets require a section median and sufficient measured, answered items. Marks opportunities use frozen marking rules only; avoid presenting maximum opportunities for partial-credit/pending/excluded items as predictions.
- **FSRS:** cache scheduled cards keyed by immutable card object identity and clear caches when the card record changes. Never schedule a card from a mock score, never create FSRS ratings for generated revision exams.
- **UX constraints:** This pass provides functional entry points and evidence, not the final UI. Rebuild home/history/results controls and v11-level aesthetics in Pass 9 using the parity ledger.

## Implementation amendments

- Preserve `sourceAttemptId` on each frozen notebook card and a hashed `notebookLineage` on each generated attempt. This is **provenance**, not a foreign-key constraint; deleting a source record does not invalidate an independently backed-up revision test.
- For evidence strength, only **answered** unique revisions and **attempts with scored answers** count toward consistency thresholds. Skips and repeats still appear in raw coverage/observation totals but cannot independently establish high accuracy.
- Speed groups use <0.75× and >1.5× the **within-section median** of answered questions with positive foreground measurements, and only if at least five such items exist. Count answer replacements but do not infer a change from wrong to right without recording actual successive response values.
- No rank/percentile prediction and no claim that exam difficulty is comparable across different immutable paper revisions. The exact-revision longitudinal sequence remains visible.
