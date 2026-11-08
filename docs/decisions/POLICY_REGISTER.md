# Practice Desk — binding design and product decisions

These are the **current cross-programme rules**, not an implementation diary. The original chronological D01–D80 record and programme audits are permanently retrievable via [pinned Git history](../HISTORY_INDEX.md). Never reinterpret an abbreviated decision as permission to violate an earlier binding constraint; consult current source and ask for authorization before materially changing policy.

| Area | Binding decision |
|---|---|
| Branch/release | Work on the explicitly approved branch; current branch is **`overhaul`**. Do not alter `main` / `baseline/v11` or release without user authorization. |
| Architecture | Modular strict TypeScript, one canonical six-kind exam/score engine, one built standalone `file://` HTML, one canonical authoring publisher; no shadow v11 system. |
| Compatibility | This is a new application; do not add retired v11/v3 migration or dual-write compatibility without a new decision. Current user state integrity remains mandatory. |
| Grading | Explicit paper/key marking policy; valid negative and unanswered bounds, capped partial credit, exact multi-select/matching constraints, numeric tolerance and manual written-response assessment. |
| Content editions | Frozen printed **Source** and separately corrected **Reviewed** records; never silently overwrite an original paper/key or existing completed result. **6 Oct CGL Q62:** original invalid/excluded, reviewed caution scores published B. |
| Candidate privacy | No pre-submit solution, answer key, explanation-only asset or reviewer-only information. Source SHA checks byte consistency, not authorship, accuracy or official provenance. |
| Taxonomy | Physical paper sections govern timers/navigation; semantic Subject → Topic → Subtopic governs grouping. Keep stable question identity and correct roll-ups across revisions. |
| Storage | Local transactional attempts, deduplicated immutable snapshots, compare-and-swap, checked additive backup v4, explicit deletion/recovery/quarantine and separately exported authoring drafts. |
| UI/navigation | Native Navigation API with reliable fragment fallback, focus/keyboard semantics, responsive narrow layouts including 195px at 140% scale. No claim of physical Mac/AT certification. |
| Learning | FSRS ratings and notebook self-assessment cannot rewrite historical scores. Recommendations and difficulty must be grounded in observed, correctly scoped evidence. |
| Authoring and agents | Wordgard manual authoring and compact external AI-first `practice-desk-authoring` v1; versioned staged sources, separate blind QA/editorial/PDF sidecars, explicit create-new-file permission; no embedded LLM or automatic browser import. |
| QA | Source-level review, independent/adversarial oracles, all required real browser journeys, no removal of unique safety coverage for cosmetic count reduction, guarded source-verified HTML publishing. |
| Truth and ethics | No fabricated legal/PYQ verification, reviewer independence, temporal certainty, device permissions or ability to access local learner data. |
| Unresolved work | [Backlog](../../backlog.md) records deferred P60 correctness, independent content/PDF and physical-device/release checks. A closed test programme does not resolve product findings. |

**For technical detail:** [architecture](../architecture/CURRENT_ARCHITECTURE.md), [data contracts](../architecture/DATA_CONTRACTS.md), [current programme](../ENGINEERING_PROGRAMME.md), [backlog](../../backlog.md).
