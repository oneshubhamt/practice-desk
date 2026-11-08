# Practice Desk — agent engineering contract

Read only what the task needs: [repository overview](README.md), [current documents](docs/README.md), [current programme](docs/ENGINEERING_PROGRAMME.md), [QA](docs/QA_CURRENT.md), [data contracts](docs/architecture/DATA_CONTRACTS.md), then actual source. For content-agent work, start with [the quickstart](docs/AGENT_AUTHORING_QUICKSTART.md), not the whole engineering history.

## Authority and scope
- Current actual source and executable contracts outrank dated status claims. Historical notes are preserved at [the pinned pre-consolidation commit](docs/HISTORY_INDEX.md); old completion labels do not prove current correctness.
- Work only on the explicitly authorized branch. Following the user-authorized, verified fast-forward of `Satyam` into `overhaul` (7 November 2026), **P61-A–I is being formally closed on `overhaul`** after the final protected CI audit. Further changes require task-specific user authorization on the correct live branch; completed P61 is not blanket permission for a new programme. Never edit `main` or `baseline/v11`, merge another branch, distribute, or change release policy without new permission. Check the live branch before any write.
- Keep source, generated standalone HTML and data separate. Never hand-edit `Practice_Desk_Offline_Mock_Tests.html`; produce it using `npm run build`.
- Preserve a single typed six-kind examination engine, the offline `file://` build, untrusted import limits, source/reviewed distinction and immutable historical attempts. No v11 data migration or deprecated-format compatibility is required.

## Product invariants
- Freeze the exact paper, question/key revisions, media, scoring policy, original-source references, response events and permitted review disclosure at test start.
- Published SSC CGL originals and printed publisher keys remain distinct from editorial corrections. In particular, **6 Oct Q62**: original invalid item excluded; reviewed caution item scores against published B. Disputes must not leak before submission.
- Correct/partial credit cannot exceed declared question credit; enforce valid negative/blank bounds, multi-select cardinality, matching uniqueness, numeric tolerance and honest unscored written responses.
- Never present solution, answer key, privileged reviewer note or editorial dispute in the candidate-facing test before permitted release. Source/content hashes are integrity checks, **not** authenticity, legal accuracy or reviewer identity.
- Local shared immutable snapshots, concurrency/CAS, additive SHA-checked backup v4, deletion/recovery rules and History/FSRS must remain correct. Learning ratings never rewrite completed exam scores.
- Keep semantic Subject/Topic/Subtopic independent of physical exam sections. Prefer exact source evidence over inferred mastery or fabricated timings.

## Engineering and verification
1. Read the affected source and active contracts; inspect callers and real user flows.
2. Specify invariant, adversarial counterexample, alternatives and minimal change.
3. Change only the approved scope; use strict TypeScript and small ownership boundaries.
4. Reconcile each objective against changed source—not a previous green fixture or status line.
5. Run focused domain/property tests and relevant browser journeys; expand to full CI for cross-cutting risks. State what was actually executed and what remains unverified.

Prefer independent numerical oracles, state-machine/model-based tests, metamorphic properties, adversarial transactions and journey assertions to CSS-click counts, source-text matching or repeated screenshots. **Do not delete a unique safety assertion to reduce test count.** Map every retired test to replacement coverage. See [test strategy](docs/TEST_STRATEGY.md).

Keep offline native Navigation API where present and tested fragment routing when unavailable; test physical Mac Safari separately from Linux WebKit. Maintain 195px + 140% text-scale overflow guards and accessible focus/keyboard semantics. Screenshots only on failures or intentionally reviewed UI changes.

## Truthful status
Software CI, synthetically reviewed content, SHA digests, and a filled quality checklist cannot authenticate an official PYQ, legislation, external references, a PDF transcription, human reviewer independence or actual device accessibility. No release approval is implied. P60 outstanding findings and calendar/survey proposals are **deferred** and must not be implemented as part of documentation or test-bench consolidation.

Authoritative navigation: [docs/README.md](docs/README.md) · [docs/ENGINEERING_PROGRAMME.md](docs/ENGINEERING_PROGRAMME.md) · [docs/QA_CURRENT.md](docs/QA_CURRENT.md) · [docs/decisions/POLICY_REGISTER.md](docs/decisions/POLICY_REGISTER.md).
