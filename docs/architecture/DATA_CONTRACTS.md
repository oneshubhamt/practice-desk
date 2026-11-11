# Practice Desk — domain and trust contracts

This guide expresses **stable design invariants**. Use the source TypeScript validators, schemas and current machine capability contract for exact fields and numeric bounds. Never manufacture fields from examples or infer examination law from an exam title.

## Question, answer and paper

- Six validated kinds: `single-choice`, `multiple-select`, `numeric-entry`, `true-false`, `matching` and `free-response`. Keys and allowed responses must match their declared type. Single/multiple options, numeric tolerances, matching cardinality/uniqueness and rich/media references are constrained.
- An exam package identifies the paper, source/edition, underlying questions and immutable revisions, keys, section policies, time/navigation rules, explicit candidate tools and stimuli. Candidate tools are hash-bound paper policy: calculator availability is never inferred from an exam name. The current calculator profile is `candidateTools.calculator = "basic-v1"`; any intentional semantic change requires a new profile/version. The executable paper must retain exactly what the candidate attempted.
- Scores use the **declared paper/key policy**; correct, incorrect, unanswered and partial components obey bounds. Partial score cannot exceed a fully correct question, and a manually assessed written answer is **not silently machine-graded**.
- The printer/original `Source` and editorial `Reviewed` editions have distinct identities and changes. Every Reviewed paper revision hash-binds the exact Source paper/key revision IDs; unbound or ambiguous pairing is invalid. Source comparisons use only the current schema-3 representation, retaining comparable MCQs beside individually unavailable question types and hashing candidate-visible wording/options/media/stimuli but not private explanations or classification tags. The advisory Source comparison never changes scored History. **6 Oct CGL Q62:** original invalid/excluded, reviewed caution scores publisher B.
- A conceptual question ID may have multiple revisions; do not equate a question revision count with underlying distinct-question count.

## Candidate calculator semantics

`basic-v1` is a frozen behavioural contract, not a generic promise that may silently change. Binary operators execute immediately left-to-right; `=` executes one pending operation once; `%` is unary `x/100`; square root and reciprocal are unary; division by zero, reciprocal of zero and square root of a negative value produce `Error`. Candidate entry is capped at 15 digits (excluding sign/decimal point), finite results are displayed through 12 significant digits, and `C` clears the active calculation while preserving the single memory register. Memory operations are `MC/MR/MS/M+/M-`; non-finite arithmetic fails safely. The pure state machine lives in the domain layer; HTML, keyboard/focus behavior and persistence are adapters around that contract.

Calculator display, pending operation, memory and open/closed state are recoverable **candidate workspace scratch state**. They are validated and stored separately from attempts, frozen content, answers, scoring and portable History backups. A completed or explicitly deleted attempt clears that scratch state. Failure or corruption of scratch storage must reset the calculator safely and must never block or alter the exam record.

## Exam lifecycle and candidate-facing security

1. Validate and preflight the source package; freeze paper/key/media/policy/edition and source-reference IDs **at start**, not on post-submit rendering.
2. Accept legal `answer`, `clear`, `flag`, `navigate`, `pause`, `resume`, `submit` and `expiry` events for the selected navigation/timer policy. Prevent late submissions, double counting, clock rollback and illegal cross-section responses.
3. Candidate content is narrower than reviewer/answer-key data. Solutions, explanations, editorial disputes, answer-only media and privileged annotations must not leak before the permitted review boundary.
4. On completion, store the exact result/ledger. A later correction or notebook rating must not modify those frozen marks.
5. Preserve raw measured timing/event evidence; do not assign invented per-question time or mastery merely because an item was opened.

## Subject hierarchy and sections

- An **exam section** can have timing/navigation limits and includes many unrelated subjects.
- **Subject → Topic → Subtopic** are semantic labels; permitted parent-only classifications must count, without fabricated topic defaults. Stable underlying IDs and proper path ancestry are needed for roll-ups, revision evidence and duplicate controls.
- Source-provided tags and learner notebook labels have different attribution. Keep them explicit and exam-scoped; do not conflate derived mastery with verified syllabus classification.

## Local persistence, revision safety and backups

- `practiceDesk.shared.v1` stores compact attempts plus deduplicated immutable snapshot bodies. Transactions verify both source identity and revision where applicable.
- CAS/optimistic concurrency uses revision `0` only for a new in-memory record before its first durable write. Persisted rows and backups require revisions `1+`; stale sibling-tab writes are rejected and terminal results cannot be revived by an older emergency mirror.
- `practice-desk-backup` v4 is SHA-checked, bounded, additive and conflict-aware. It cannot authenticate a maliciously authored backup: strictly validate records, fields, structural hashes and snapshots on restore.
- Corrupted or missing snapshot references should be surfaced or quarantined, not silently replaced with newly computed key/marks. Explicit deletion/discard, stable archive IDs and recovery precedence apply.
- Drafts/staging and local browser History are **separate export lifecycles**; do not promise v11/v3 migration or implicit remote synchronization.

## Authoring and external sources

- AI/human source: `practice-desk-authoring` v1, with explicit origins, section/subject differentiation, stable question IDs, author-supplied explanations, question-kind keys and declared scoring. Physical section definitions own their timer budgets; questions only reference their assigned section. The canonical compiler emits `practice-desk-exam` v1. There is no second simple-bank runtime format.
- Source can be staged in bounded batches and selectively authored/published (maximum published/draft question count is enforced by validators; large imports must be split). Publication must be atomic with valid hashes, keys, source-hash-bound provenance and candidate-only separation.
- Blind quality review, quota blueprint, original/reviewed editorial mapping and supplied-document/PDF manifests have their own versioned sidecars and source-bound freshness. **They do not override answer key schemas or act as independently authenticated official sources.**
- External agents can read provided files and create new outputs with permission, but cannot read private IndexedDB, fetch authenticated laws inside the offline app or auto-import into Library.

## Truth and evidence boundaries

Hashes establish **internal consistency, not publisher identity**; a PDF page census or printed-key claim is an agent assertion until independently checked. Current law, primary-source provenance, figures, formulae and answer accuracy require real external evidence. FSRS scheduling and scored attempts are separate; revision cards do not revise History results. Physical Safari/mobile/assistive technology is not proved by cross-platform emulation alone.

**Source orientation:** `src/domain/` for validated schema, `src/engine/` for rules and state, `src/history/` for persistence, `src/learning/` for evidence and FSRS, `src/authoring/` and `scripts/` for content pathways. See [architecture](CURRENT_ARCHITECTURE.md), [source authoring](QUESTION_BANK_AUTHORING.md), [pipeline](AGENT_CONTENT_PIPELINE.md), [policy](../decisions/POLICY_REGISTER.md) and [backlog](../../backlog.md).
