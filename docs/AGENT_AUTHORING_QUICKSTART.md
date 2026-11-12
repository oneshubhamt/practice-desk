# Practice Desk — agent authoring quickstart

**Goal:** create, review and package exam questions through local files/CLI with minimal context. Practice Desk has no embedded LLM, network source authenticator, browser-History access or automatic Library import.

## Canonical source

Author one `practice-desk-authoring` v1 JSON file. Start from [APFC](../examples/ai-first-apfc.json) or [CAT](../examples/ai-first-cat.json). Source-traced examples in `examples/source-grounded-*.json` are **reconstructions**, not authenticated official PYQs.

A bank declares paper identity/edition/revision, scoring, timing/navigation, physical sections, optional shared stimuli/media and questions. Each question carries a stable id, section, semantic classification, response kind, candidate content, key, explanation and provenance/QA claims. Supported response kinds are `single-choice`, `multiple-select`, `numeric-entry`, `true-false`, `matching` and `free-response`; written responses are manually/self-assessed rather than silently machine-graded. Section timers belong to physical sections, not subjects/topics.

Source files are bounded (currently 200 questions plus bounded media/stimuli); split larger work into staged batches. Material candidate/key/source changes require a new revision and fresh SHA-bound review.

## Ordinary workflow

```bash
node scripts/question-bank-cli.mjs validate-bank bank.json
node scripts/question-bank-cli.mjs qa-bank bank.json
node scripts/question-bank-cli.mjs compile-bank bank.json NEW.exam.json

# Small-context inspection/correction
node scripts/question-bank-agent.mjs inspect bank.json
node scripts/question-bank-agent.mjs show bank.json QUESTION-ID
node scripts/question-bank-agent.mjs patch bank.json ops.json NEW-bank.json --dry-run
```

Research actual syllabus/source documents, dates/current law, original item numbers and answer rationale outside the offline app. Label paraphrases `reconstruction`; claim `official-pyq` only when independently authenticated.

## Blind quality review

```bash
node scripts/agent-handoff.mjs prepare bank.json NEW-review-dir --allow-create
```

This creates candidate-only review material without printing answers/explanations/base64 media. The reviewer independently solves the items and fills all 20 assessments plus evidence. Current v2 review records explicitly declare `mathematical`, `legal` and `timeSensitive` applicability; legal/time-sensitive claims require an ISO `asOfDate` and matching source evidence, while mathematics requires proof/source-backed checking.

The initial template is intentionally pending and **cannot publish**. A completed checklist, SHA, URL, reviewer label or timestamp is not independent factual authentication.

## Assess and publish

```bash
# Single bank
node scripts/agent-handoff.mjs assess single bank.json --quality-review NEW-review-dir/review.json
node scripts/agent-handoff.mjs publish single bank.json NEW.exam.json --quality-review NEW-review-dir/review.json --allow-create

# Source + separately corrected Reviewed
node scripts/editorial-editions.mjs template original.json reviewed.json > decisions.json
# Complete decisions/evidence and reviewed-bank QA.
node scripts/agent-handoff.mjs assess paired original.json reviewed.json decisions.json --quality-review review.json
node scripts/agent-handoff.mjs publish paired original.json reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create

# Supplied PDF: an external reviewer actually inspects/transcribes pages; no built-in OCR.
node scripts/pdf-ingest.mjs template original.json paper.pdf > intake.json
node scripts/agent-handoff.mjs assess pdf intake.json original.json paper.pdf reviewed.json decisions.json --quality-review review.json
node scripts/agent-handoff.mjs publish pdf intake.json original.json paper.pdf reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create
```

Optional blueprint/cognitive files can enforce planned quotas. Partial batches may remain structurally valid for continued work but cannot publish until required totals/allocations are complete.

Published packages are imported **manually** into Library. For paired/PDF results import Source first, then Reviewed, and retain source documents/sidecars externally. Never overwrite an existing output merely to preserve an old revision.

For advanced quota, Source/Reviewed and PDF semantics read [AGENT_CONTENT_PIPELINE.md](architecture/AGENT_CONTENT_PIPELINE.md). Exact runtime/domain invariants live in [DATA_CONTRACTS.md](architecture/DATA_CONTRACTS.md). Machine-discoverable actions are in [practice-desk-capabilities.v1.json](contracts/practice-desk-capabilities.v1.json).
