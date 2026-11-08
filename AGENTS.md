# Practice Desk — engineering and agent contract

**Start small:** read [documentation map](docs/README.md), [current status](docs/ENGINEERING_PROGRAMME.md), [binding policy](docs/decisions/POLICY_REGISTER.md), then the affected actual source and [data contracts](docs/architecture/DATA_CONTRACTS.md). For creating questions, start instead with the [agent quickstart](docs/AGENT_AUTHORING_QUICKSTART.md). Do not load archived implementation programmes into every task.

## Authority and change scope

- Current source, validators and testable contracts outrank prose and dated completion claims. The authorised current development branch is **`overhaul`**. Do not edit `main` or `baseline/v11`, switch branches, merge, distribute or change release policy without explicit authorization.
- Treat [backlog](backlog.md) concerns as **unresolved source-audit findings**, not implemented fixes. P61 is closed; its historical execution diary is archived through [history](docs/HISTORY_INDEX.md).
- Preserve one typed six-kind engine, one deterministic offline `file://` HTML distribution and one canonical validator/publisher. Never hand-edit generated HTML or add v11 migration/duplicate scoring pipelines.

## Non-negotiable product invariants

1. **Exam and score fidelity:** freeze exact paper, question/answer-key revisions, media, scoring, timings and original-source edition on attempt start. Honor correct/wrong/blank/partial bounds, matching uniqueness, multi-select cardinality, numeric tolerance and genuinely unscored written answers. Do not invent APFC/CAT marking from exam names.
2. **Candidate secrecy and editorial integrity:** no answer, worked explanation, explanation-only asset or private reviewer dispute before permitted release. Preserve printed Source separate from later Reviewed revisions. Specific SSC CGL 6 October Q62: original invalid/excluded; reviewed caution is scoreable against publisher B. Never rewrite completed marks through later corrections.
3. **Local persistence:** preserve immutable snapshots, transactional compare-and-swap, checked additive backup v4, quarantine/recovery and deletion safety. Authoring drafts/staging, completed exam History and FSRS ratings have distinct lifecycles.
4. **Correct taxonomy and evidence:** exam sections govern timing/navigation; Subject → Topic → Subtopic is semantic classification. Preserve stable underlying question identity across revisions, avoid unsupported mastery or invented per-question time.
5. **Offline UX:** native Navigation API where supported, tested fragment fallback otherwise; accessible focus/keyboard semantics, 195px and 140% scale without horizontal overflow. Linux WebKit is not physical Mac Safari certification.
6. **Truth boundary:** a hash authenticates neither an official PYQ nor a reviewer; a completed QA form and synthetic PDF mapping do not independently check primary sources, current laws or question quality. No remote/device/learner access is implicit in external agent tools.

## Implementation and QA discipline

Inspect actual callers and persisted data flow; specify a reproducible counterexample and the smallest correction; preserve source/answer and release boundaries; verify with independent numerical, state-machine or metamorphic tests plus relevant real browser journeys. For cross-cutting changes run the protected full CI described in [QA](docs/QA_CURRENT.md). Any retired assertion needs a mapped equal-or-stronger successor; never sacrifice unique P0/P1 protection to meet a test-count target.

State the exact tested commit, empirical observations, untested physical/content boundaries and unresolved risks. Opt-in visual inspection may use `PRACTICE_DESK_VISUAL_REVIEW=1`; automated screenshots are retained on failures. Current engineering docs contain architecture and policy; old pass-by-pass minutiae belong only in [pinned history](docs/HISTORY_INDEX.md).
