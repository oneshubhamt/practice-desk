# Practice Desk — engineering and product contract

**Read narrowly.** Start with the [documentation map](docs/README.md), then inspect the affected source. Read [architecture](docs/architecture/CURRENT_ARCHITECTURE.md), [data contracts](docs/architecture/DATA_CONTRACTS.md) or [QA](docs/QA_CURRENT.md) only when the task touches those contracts. For question creation, start with the [agent authoring quickstart](docs/AGENT_AUTHORING_QUICKSTART.md).

## Authority and branch policy

- Current source, validators and executable tests outrank prose or dated completion claims.
- The authorised development branch is **`working`**. Do not edit `main` or `baseline/v11`, switch/merge/release, or change release policy without explicit authorization.
- The [backlog](backlog.md) contains only unresolved current risks/proposals. Closed programme evidence belongs in [history](docs/HISTORY_INDEX.md), not active guidance.
- Preserve one typed six-kind engine, one canonical publisher/validator and the two supported distributions generated from the same source topology. Never hand-edit generated HTML.

## Clean-slate data rule

Practice Desk is a new application with no production data compatibility obligation. Maintain **one current schema/topology per contract**.

Do not add migration readers, schema upgraders, compatibility readers/writers, dual-write paths, legacy adapters, retired-format fallbacks or transitional persistence bridges unless explicitly authorized. Replace obsolete representations in source, fixtures, tests and generated artifacts. Version fields may identify and reject non-current input. Historical Git is the archive; runtime code is not.

Current resilience mechanisms—IndexedDB fallback, emergency active-attempt mirror, corrupt-data quarantine, immutable frozen snapshots and checked recovery—protect the **current** topology and are not legacy compatibility.

## Binding product decisions

1. **Exam/score fidelity:** freeze exact paper, question/key revisions, media, scoring, timing and edition at attempt start. Honour declared negative/blank/partial/numeric/matching/multi-select/manual-response semantics; never infer marking from an exam name.
2. **Candidate secrecy/editorial integrity:** no key, worked explanation, explanation-only asset or reviewer-only dispute before permitted reveal. Preserve Source separately from Reviewed; later corrections never rewrite completed marks.
3. **Persistence:** preserve immutable snapshots, transactional CAS, checked additive backup, quarantine/recovery and deletion safety. Authoring drafts/staging, attempt History and learning evidence have distinct lifecycles.
4. **Taxonomy/evidence:** physical sections own navigation/timing; Subject → Topic → Subtopic is semantic classification. Keep stable question identity across revisions and do not fabricate mastery or time evidence.
5. **UI/navigation:** native Navigation API with tested fragment fallback, accessible focus/keyboard semantics and narrow-layout support including 195px at 140% scale. Linux WebKit is not physical Mac Safari certification.
6. **Learning:** FSRS ratings/self-assessment cannot rewrite historical scores; recommendations must derive from correctly scoped evidence.
7. **Authoring:** Wordgard and external agents converge on the same canonical publisher. External workflows use versioned source/review/decision/PDF files, explicit create-new-file permission and manual Library import; there is no embedded LLM or shadow runtime format.
8. **Truth boundary:** hashes prove byte consistency, not official provenance or factual correctness. Review forms, PDF maps and agent labels are claims until independently checked. External tools do not imply access to local learner data.
9. **QA:** preserve independent/adversarial witnesses and real browser journeys; do not remove unique safety coverage merely to reduce counts. Guarded publishing must use the tested source ancestry.

## Implementation discipline

Inspect actual callers/data flow, define a reproducible counterexample, make the smallest ownership-correct change, and add an independent expected-value/state/adversarial witness where warranted. For shared-runtime changes run the full CI contract in [QA_CURRENT.md](docs/QA_CURRENT.md).

Report the exact tested commit, empirical results and unverified physical/content boundaries. Visual review is opt-in via `PRACTICE_DESK_VISUAL_REVIEW=1`; routine passing CI need not manufacture screenshots.
