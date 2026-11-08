# Practice Desk — documentation map

**Read only the document needed for the task.** The active source and executable validators take precedence over prose. This directory describes **current architecture and decisions**; old implementation passes are archived rather than reproduced.

| Task | Primary reference | When to read more |
|---|---|---|
| Run the offline application | [README](../README.md) | [Architecture](architecture/CURRENT_ARCHITECTURE.md) for limitations |
| Engineer or review application changes | [AGENTS](../AGENTS.md) → [Architecture](architecture/CURRENT_ARCHITECTURE.md) | [Data contracts](architecture/DATA_CONTRACTS.md), actual source |
| Understand accepted decisions | [Policy register](decisions/POLICY_REGISTER.md) | [Current programme](ENGINEERING_PROGRAMME.md) and [backlog](../backlog.md) |
| AI-assisted question generation | [Agent quickstart](AGENT_AUTHORING_QUICKSTART.md) | [Content pipeline](architecture/AGENT_CONTENT_PIPELINE.md) for advanced source review |
| Edit or compile an exam bank | [Question-bank authoring](architecture/QUESTION_BANK_AUTHORING.md) | [Data contracts](architecture/DATA_CONTRACTS.md) |
| Test or investigate regression | [QA and test strategy](QA_CURRENT.md) | Actual tests, runner and CI workflow |
| Discover machine-readable operations | [Capability contract](contracts/practice-desk-capabilities.v1.json) | CLI `practice-desk-capabilities.mjs` |
| Retrieve old designs, audits or pass-by-pass details | [Historical source index](HISTORY_INDEX.md) | Pinned original Git commits only |

## Current programme boundary

P61's test-bench consolidation is **complete** on `overhaul` and has a [fully green five-job CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42433146976). Past programme names are **not** active implementation instructions. Unresolved P60 issues, factual/PDF checking and device/release gates are in the [backlog](../backlog.md).

**Trust model:** a SHA proves byte consistency, a passing test proves a scoped software assertion, and a filled review form records an attributed claim. None alone establishes a genuine official paper, current law, independent reviewer or accessible physical-device experience.
