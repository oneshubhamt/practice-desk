# AI-supported question-bank work

This is the stable documentation entrypoint referenced by the machine capability contract.

Start with the [agent authoring quickstart](AGENT_AUTHORING_QUICKSTART.md). Read the [advanced content pipeline](architecture/AGENT_CONTENT_PIPELINE.md) only for quota planning, blind review, Source/Reviewed editions or supplied-PDF workflows; use [data contracts](architecture/DATA_CONTRACTS.md) for enduring schema/trust invariants.

AI-assisted authoring remains **external**: no embedded LLM or authenticated-source service, and no unrestricted external-agent access to browser History. The user may deliberately export a reduced exam-scoped learner-focus packet or locally generate a personalised Authoring Brief from it; this does not grant the agent History/database access.

Exam-specific semantic taxonomy is likewise externalized from runtime code. When a maintained year manifest declares `taxonomy.json`, authoring/blueprint agents should use that explicit data sidecar (for example via `content-blueprint.mjs ... --taxonomy ...`) rather than inferring syllabus structure from the exam ID. Source questions use explicit Subject → Topic → Subtopic labels; maintained corpus loading resolves them to stable taxonomy nodes.

For new batches, `content-blueprint.mjs brief` accepts optional `--learner-focus`; Off remains the ordinary non-personalised brief. For repository-maintained custom mocks, use the dry-runnable `question-bank-corpus.mjs add-paper` / `append-revision` bridge after review/blueprint gates instead of asking the authoring agent to edit manifests by hand. PYQ Source/Reviewed/PDF publication remains separate.

The previous full guide remains available in [historical Git](https://github.com/oneshubhamt/practice-desk/blob/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc/docs/AI_APPLICATION_GUIDE.md).
