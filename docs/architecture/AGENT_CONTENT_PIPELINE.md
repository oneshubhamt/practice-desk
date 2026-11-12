# Practice Desk — advanced content pipeline

**Audience:** external agents and maintainers handling workflows beyond ordinary one-file authoring. Start with the [quickstart](../AGENT_AUTHORING_QUICKSTART.md). Local Node CLIs operate only on explicitly supplied files and emit files/JSON; they do not embed models, authenticate external sources, access browser History or silently import into Library.

## Route by need

| Need | Tooling | Invariant |
|---|---|---|
| Validate/compile one source bank | `question-bank-cli.mjs` | One canonical `practice-desk-authoring` v1 source compiled through the canonical publisher |
| Small-context corrections | `question-bank-agent.mjs` | Paged inspection, question-scoped retrieval, SHA preconditions, new-file output |
| Planned distribution | `content-blueprint.mjs` + optional cognitive tags | Explicit quotas/partial delivery; structurally valid partial work is not publication-ready |
| Blind editorial/key challenge | `question-quality.mjs` | Candidate-only packet, v2 applicability declarations, all 20 checks, source-hash freshness |
| Source + separately corrected Reviewed | `editorial-editions.mjs` | Preserve Source bytes/key; bind Reviewed to exact Source paper/key identities |
| Supplied PDF/document | `pdf-ingest.mjs` | External reviewer actually inspects pages/math/figures; bind document/key bytes and per-item provenance; no internal OCR |
| Scoped orchestration | `agent-handoff.mjs` | Read-only assess; publication requires explicit create permission and fresh evidence |

For the common strict-review flow:

```bash
node scripts/agent-handoff.mjs prepare bank.json NEW-review-dir --allow-create
# Independently solve candidate-only material and genuinely inspect cited sources.
node scripts/agent-handoff.mjs assess single bank.json --quality-review NEW-review-dir/review.json
node scripts/agent-handoff.mjs publish single bank.json NEW.exam.json --quality-review NEW-review-dir/review.json --allow-create
```

For paired editions, create/complete an `editorial-editions.mjs template`, review the Reviewed source, then assess/publish `paired`. For supplied documents, complete the `pdf-ingest.mjs template` after actual document inspection, then assess/publish `pdf`.

## Publication/trust rules

- A PDF/source SHA proves referenced bytes, not original publisher identity, transcription accuracy, official-key correctness or current law.
- Positive author declarations for mathematical/legal/time-sensitive content cannot be contradicted away by review. Applicable legal/time-sensitive items require a matching as-of date and locatable evidence; mathematics requires proof/source-backed checking. Heuristics are supplementary only.
- Candidate-visible stem/options/media/stimuli determine Source/Reviewed semantic comparability. Explanation/taxonomy-only changes do not; unsupported response kinds are individually unavailable rather than destroying otherwise valid comparisons.
- Reviewed packages bind exact Source paper/key identities. Noncurrent source-key shapes are rejected rather than migrated.
- Candidate explanations, keys and explanation-only media remain private until the permitted review boundary.
- A partial blueprint can be `valid:true` while `readyForPublication:false`; strict publication rejects incomplete required quotas.
- Source and Reviewed are explicit separate Library imports. Retain original documents and review/decision sidecars outside browser History.

The CLI may report `factualVerification:not-performed`; treat reviewer/source statements as attributed claims unless independently authenticated.

**References:** [quickstart](../AGENT_AUTHORING_QUICKSTART.md) · [data contracts](DATA_CONTRACTS.md) · [machine capability contract](../contracts/practice-desk-capabilities.v1.json) · [historical programme evidence](../HISTORY_INDEX.md).
