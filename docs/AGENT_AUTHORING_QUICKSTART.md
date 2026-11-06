# Practice Desk — AI agent quickstart

**Goal:** create, review, correct and package exam questions for the existing offline app, with minimal context. This is a local CLI; it has **no** embedded LLM, network/source authenticator, user-browser control, History access or automatic Library import.

## Start here

1. Read this file and **one** relevant source shape: [APFC](../examples/ai-first-apfc.json) or [CAT](../examples/ai-first-cat.json). Two source-traced **reconstructions**, not authenticated official PYQs: [APFC 2023 vocabulary](../examples/source-grounded-apfc-2023.json) and [CAT 2024 QA](../examples/source-grounded-cat-2024.json).
2. To discover app features (not needed for ordinary bank writing), run `node scripts/practice-desk-capabilities.mjs summary`; for available agent operations, run `node scripts/agent-handoff.mjs actions`. Refer to [AI application guide](AI_APPLICATION_GUIDE.md) only for feature-specific details.
3. Research **actual** syllabus, source PDF/HTML, dates, current law, original item numbers and answer rationale. Draft a `practice-desk-authoring` v1 JSON with real, distinct distractors, explanations, stable IDs, explicit origin and source locators. Label paraphrases `reconstruction`; only independently authenticated exact original paper items qualify as `official-pyq`.

## One-command complete blind review preparation

```bash
node scripts/agent-handoff.mjs prepare bank.json NEW-review-dir --allow-create
```

Creates `blind-candidates.json` and `review.json` for **all questions** without printing answers, explanations or base64 media to the agent. The reviewer must first solve candidate-only items, inspect relevant documents/figures and fill **all 20** required assessments, defensible independent solutions and genuine evidence. The initially generated review **cannot publish**: it contains `blindClaim:false`, `not-reviewed` checks and no evidence. The JSON has the exact expected review schema, so no manual field deletion or merging pages. Never invent blind review, source research, reviewer identity or timestamp; a SHA and cited URL are not source authentication.

## Assess, then explicitly publish

```bash
# One ordinary AI-original/reconstruction bank
node scripts/agent-handoff.mjs assess single bank.json --quality-review NEW-review-dir/review.json
node scripts/agent-handoff.mjs publish single bank.json NEW.exam.json --quality-review NEW-review-dir/review.json --allow-create

# Preserve original and separate corrected/reviewed version
node scripts/editorial-editions.mjs template original.json reviewed.json > decisions-template.json
# Complete substantive decisions, evidence and reviewed bank's blind quality review.
node scripts/agent-handoff.mjs assess paired original.json reviewed.json decisions.json --quality-review review.json
node scripts/agent-handoff.mjs publish paired original.json reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create

# Supplied PDF: external agent actually inspects/transcribes pages; no built-in OCR
node scripts/pdf-ingest.mjs template original.json paper.pdf > intake-template.json
# Fill complete page/key/figure/source comparison and independently review reviewed.json.
node scripts/agent-handoff.mjs assess pdf intake.json original.json paper.pdf reviewed.json decisions.json --quality-review review.json
node scripts/agent-handoff.mjs publish pdf intake.json original.json paper.pdf reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create
```

Optional `--blueprint plan.json`, paired with `--cognitive tags.json` if cognitive quotas exist; `--against prior.json` compares explicitly supplied previous sources. Blueprints with `allowPartial:true` disclose remaining questions rather than fabricate completed quotas. Agents should publish only when returned `readyForPublication:true`, source evidence was genuinely checked and required review was actually performed. The CLI reports `factualVerification:not-performed` and reviewer statements are attributed claims, not independent system certification.

A published `NEW.exam.json` is imported **manually** into Practice Desk's offline Library. For paired/PDF results import `source.exam.json` first, then `reviewed.exam.json`; retain original documents/sidecars. **Never replace** an existing output. Changes to keys/stems invalidate earlier SHA-bound reviews; prepare/review them again.

## Focused references (open only when needed)

- [Source authoring contract](architecture/QUESTION_BANK_AUTHORING.md), [blueprint/quotas](architecture/P60B_CONTENT_BLUEPRINT.md), [20-point review](architecture/P60C_QUESTION_QUALITY_ASSURANCE.md)
- [Original/reviewed corrections](architecture/P60D_ORIGINAL_REVIEWED_EDITORIAL.md), [PDF transcription](architecture/P60E_AGENT_PDF_INGESTION.md), [agent handoff scope](architecture/P60F_AGENT_INTEGRATION_AND_VERIFICATION.md)
- **Real-source caveat:** the [EduTap APFC 2023 reproduction](https://edutap.in/wp-content/uploads/2026/05/UPSC-EPFO-APFC-2023-PYQ-Book.pdf) places the *ineffable* item at **Q6**, while [a separate quiz page](https://www.yourmocktest.com/pyq/upsc-epfo/upsc-epfo-apfc-official-paper-held-on-02-jul-2023-previous-year-paper) labels that item Q1. The [CAT 2024 Q47/Q52 reproduction](https://cracku.in/cat-2024-slot-1-quant-question-paper-solved) is also third-party. **Do not silently certify original question numbers, official answer keys or exact wording from secondary reproductions.**
