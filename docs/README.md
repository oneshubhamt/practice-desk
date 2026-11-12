# Practice Desk — documentation map

**Read only what the task needs.** Current source, validators and executable tests outrank prose. Historical implementation diaries remain in Git history rather than the active documentation set.

| Task | Read |
|---|---|
| Build/run the app | [root README](../README.md) |
| Engineer/review code | [AGENTS](../AGENTS.md) → affected source → [architecture](architecture/CURRENT_ARCHITECTURE.md) as needed |
| Understand schemas/invariants | [data contracts](architecture/DATA_CONTRACTS.md) |
| Understand binding product decisions | [policy register](decisions/POLICY_REGISTER.md) |
| Run or design QA | [QA contract](QA_CURRENT.md) + actual tests/CI |
| Create/review question banks | [agent quickstart](AGENT_AUTHORING_QUICKSTART.md); use [advanced content pipeline](architecture/AGENT_CONTENT_PIPELINE.md) only for blind review, Source/Reviewed or PDF workflows |
| Discover machine operations | [capability contract](contracts/practice-desk-capabilities.v1.json) |
| See unresolved work | [backlog](../backlog.md) |
| Retrieve old audits/programmes | [historical index](HISTORY_INDEX.md) |

**Trust model:** a SHA proves byte consistency; a passing test proves its scoped software assertion; a filled review sidecar records an attributed claim. None alone proves official provenance, current law, educational quality or physical-device accessibility.
