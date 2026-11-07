# Practice Desk — current AI application guide

Practice Desk is an **offline examination application**, not an embedded LLM, PDF OCR service, or remote device agent. External AI/human agents can prepare and validate structured question-bank source on a computer with access to the repository; **the user explicitly imports** published JSON into Library. Neither an agent CLI nor GitHub access grants browser History, FSRS, local bank/device data or cloud permissions.

## Minimum-context workflow
1. Read [the agent quickstart](AGENT_AUTHORING_QUICKSTART.md), one matching [APFC](../examples/ai-first-apfc.json) or [CAT](../examples/ai-first-cat.json) source example, and the task-specific slice of [the pipeline contract](architecture/AGENT_CONTENT_PIPELINE.md).
2. Discover machine capabilities without source dumping:
   `node scripts/practice-desk-capabilities.mjs summary`;
   `... list`, `... show ai-authoring`, or `... operations`.
3. Research questions externally. Use the strict `practice-desk-authoring` v1 source with declared exam rules, taxonomy, answers, explanation and source/evidence claims.
4. `node scripts/question-bank-agent.mjs inspect my-bank.json`, `show my-bank.json question-id`, `patch my-bank.json ops.json NEW-bank.json --dry-run`.
5. Validate/compile with `node scripts/question-bank-cli.mjs qa-bank my-bank.json` and `compile-bank my-bank.json NEW-paper.json`. Add coverage blueprint, blind review, paired Source/Reviewed or PDF provenance checks as needed.
6. In Library use the file import control. No automatic agent-to-app import, cloud sync or learner-data extraction is built in.

## Available task-specific external CLI contracts
| Job | Implementation |
|---|---|
| Content coverage and quota planning | `scripts/content-blueprint.mjs`; stage B of [pipeline](architecture/AGENT_CONTENT_PIPELINE.md) |
| Candidate-only blind packet and attributed 20-check review | `scripts/question-quality.mjs`; stage C |
| Immutable original + separate reviewed edition | `scripts/editorial-editions.mjs`; stage D |
| Supplied PDF interpreted by an external agent, SHA/page/key provenance | `scripts/pdf-ingest.mjs`; stage E; **no automatic OCR/text/image understanding** |
| Bounded local prepare/assess/publish cross-gate | `scripts/agent-handoff.mjs actions`; stage F; explicit new-file permission |
| Rich graphical manual editing and staging | In-app Wordgard; draft backup is separate from History v4 |

## Crucial epistemic and candidate limits
A source hash proves consistent bytes, **not** original paper authenticity or factual truth. Citations, labels like `verified`, filled review records, reviewer names or audit success are not independent verification. Current statutes, PYQs, worked solutions, math/figures and correct distractors require genuine independent research. Never expose a key/solution, explanation-only image or editorial dispute during candidate assessment. Do not infer difficulty or mastery solely from authored metadata.

The P60 static audit has deferred correctness findings recorded in [backlog](../backlog.md). This guide reflects available commands, **not** closure of those findings, human review, real agent-token benchmarking, physical device testing or release approval.

When building new app features, read [AGENTS](../AGENTS.md), [architecture](architecture/CURRENT_ARCHITECTURE.md), [data contracts](architecture/DATA_CONTRACTS.md) and current source; do not use this AI-user guide as a substitute for a source audit.
