# Practice Desk — current data and correctness contracts

This is the concise owner-level contract. **The actual TypeScript validators and frozen source records decide exact accepted fields**; do not invent JSON attributes based on a guide. A saved source hash is an unkeyed content-integrity witness, not authentication.

## Question/answer/paper
- `src/domain/question.ts`: `single-choice`, `multiple-select`, `numeric-entry`, `true-false`, `matching`, `free-response`. Revisions have stable question identities and content hashes; stimuli/media are independently identified and validated.
- `src/domain/exam.ts`, `answer-key.ts`, `scoring.ts`, `validate.ts`: paper sections, per-paper/per-item timing, navigation, grading, score bounds and key/answer schema. Only candidate-selectable and valid answer keys are admitted.
- Partial multiple-select/matching marks are bounded by full question credit, correct/incorrect/blank definitions are controlled by the authored policy, and unsupported free-text self-assessment is **not** silently auto-graded.
- Physical exam sections and semantic taxonomy are separate. Subject root → optional topic → optional subtopic; the same parent may have many question revisions without counting each as a distinct underlying question.

## Start, attempt and completion
1. Select and validate a package/edition, freeze exact question/key/stimulus/media/policy revisions and source/original reference where applicable.
2. Accept only legal events for current state (answer/clear/flag/navigate/pause/resume/submit/expiry), using nondecreasing clock evidence; don't credit background time to a specific item without measurements.
3. Protect candidate view from unpublished answers, worked explanations, source-key disputes and reviewer-only metadata. `allowReview` gates detailed post-test explanations.
4. Completed scoring is frozen; History/timing display is derived from persisted evidence. Separate learner self-assessments and FSRS grades do not rewrite frozen marks.
5. A Source/Reviewed comparison is hypothetical and display-only. Never override the actual scored attempt; only semantically comparable, correctly paired original answers may be compared.

## Persistence, recovery and trust
- `practiceDesk.shared.v1`: compact attempts and deduplicated immutable snapshots in IndexedDB; version/revision-checked transactions and fallback paths. Do not treat in-memory or fallback copies as authenticated sources of truth.
- `practice-desk-backup` v4: SHA-checked compact attempts/snapshots, additive conflict-checked restore, separate archive of user-authored drafts/staging. No old v11/v3 backup migration is promised.
- Explicit deletion/discard guards; corrupted or dangling data must be surfaced or quarantined, never repaired by guessing an answer or silently resetting a scored record.
- Content hashes verify consistency of bytes, not official PYQ source, legal effective date, reviewer identity or PDF visual fidelity.

## External authoring formats
- **AI/manual source:** `practice-desk-authoring` v1; see [authoring](QUESTION_BANK_AUTHORING.md).
- **Compiled exam:** `practice-desk-exam` v1; only use canonical compiler/validator for immutable IDs, hashes and policy.
- **Simplified import:** `practice-desk-bank` for MCQ/NAT where supported.
- **Review/pairing/PDF:** distinct review, original/reviewed and document-provenance sidecars; they are not alternate question-key schemas. External CLI artifacts are not auto-imported into a user's browser.
- **Capability discovery:** versioned `docs/contracts/practice-desk-capabilities.v1.json`, read by `scripts/practice-desk-capabilities.mjs`; descriptions cannot overrule actual source.

**Non-negotiable editorial case:** original 6 October SSC CGL Q62 invalid/excluded; reviewed caution against publisher B remains scoreable without pretest answer exposure. New imported material remains author-claimed, not officially authenticated.

Other contracts: [AGENTS](../../AGENTS.md) · [architecture](CURRENT_ARCHITECTURE.md) · [content pipeline](AGENT_CONTENT_PIPELINE.md) · [policy](../decisions/POLICY_REGISTER.md).
