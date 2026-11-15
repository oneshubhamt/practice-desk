# Practice Desk — agent authoring quickstart

**Goal:** create, review and package exam questions through local files/CLI with minimal context. Practice Desk has no embedded LLM, network source authenticator or external-agent access to browser History. Repository-maintained exam families may be explicitly preinstalled through the family switch in `question-banks/catalog.json`; their papers/editions are discovered through the nested manifest graph. Ad-hoc external outputs still require user-controlled import.

## Canonical source

Author one `practice-desk-authoring` v1 JSON file. Generic format examples remain under `examples/`; maintained exam content belongs under [`question-banks/`](../question-banks/). For maintained content, read `question-banks/catalog.json`, follow the selected family’s root manifest → year manifest → paper manifest, then open only the required canonical authoring/source file. The root catalog is not a paper index. Do not ingest generated `.exam.json` packages unless runtime-package inspection is actually needed. Source-traced examples in `examples/source-grounded-*.json` are **reconstructions**, not authenticated official PYQs.

A bank declares paper identity/edition/revision, scoring, timing/navigation, physical sections, optional shared stimuli/media and questions. Each question carries a stable id, section, semantic classification, response kind, candidate content, key, explanation and provenance/QA claims. Choice questions may use **2–26 options**; matching may use **1–26 left items and 1–26 right items**, and the key must reference only those declared items. Supported response kinds are `single-choice`, `multiple-select`, `numeric-entry`, `true-false`, `matching` and `free-response`; written responses are manually/self-assessed rather than silently machine-graded. A `free-response` question may declare an advisory whole-number `wordLimit`; **omitting it means no authored word target** and the compiler does not invent one. Paper `tools.wordCount` may be `auto`, `shown` or `hidden`; `auto` shows the counter in practice modes and hides it in exam simulation. Crossing an advisory limit never prevents saving. Section timers belong to physical sections, not subjects/topics.

Scoring is data-driven rather than exam-name-driven. Paper scoring carries `correctMarks`, `incorrectMarks`, optional `unansweredMarks` (defaults to 0 in external authoring), optional `decimalPlaces`, and optional `byQuestionKind` rules. A physical section may declare `scoringOverride`, and `questions[].scoringOverride` may replace the resolved rule for one question, including a manual written-response ceiling. Runtime precedence remains question override → section override → question-kind rule → paper default. Studio and `question-bank-agent.mjs patch` use the same canonical fields.

**Question cardinality is data-driven:** choice questions may author 2–26 options and matching questions may author 1–26 left/right items. Do not assume A–D or four pairs. The protected answer uses the actual authored option set; candidate keyboard shortcuts cover A–D through configurable bindings and E–Z by their displayed letters. Omit a written `wordLimit` when the source provides no defensible advisory target—never invent one.

**Exam-agnostic mode authoring:** Declare **one physical section** when a paper has no real section boundaries (subjects remain topic tags). Use `timing.kind: "whole-paper"` for one shared deadline; use `"sectional"` only when the exam genuinely specifies individual section limits; use `"untimed"` if no authoritative limit exists. By default, available practice modes are derived from that paper structure. Optional `practiceModes` may **narrow** the eligible runtime modes when the source or intended practice product requires it; it is not an exam-name profile and cannot make structurally impossible section practice valid. Section-only practice is available only for papers with multiple physical sections; a whole-paper deadline is **never divided into invented per-section minutes**. Leave `tools.wordCount` at `"auto"` unless the paper explicitly needs an exception.

Source files are bounded (currently 200 questions plus bounded media/stimuli); split larger work into staged batches. Material candidate/key/source changes require a new revision and fresh SHA-bound review.


### Bounded repair queue and retrieval

Use `next` to ask for the highest-priority unresolved issues without loading question bodies:

```bash
node scripts/question-bank-agent.mjs next bank.json --limit 8
```

It returns errors before warnings/info plus the affected stable question IDs. The limit counts distinct actionable targets, so repeated warnings on one question do not crowd out the next question. Fetch only those questions, up to ten at a time:

```bash
node scripts/question-bank-agent.mjs show bank.json q-17 q-23 q-31
```

Multi-question output deduplicates shared stimuli and media metadata and never emits inline media bytes. The existing one-question `show` response remains unchanged.

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

Every agent patch creates a new immutable source revision: `nextRevision` is required and must strictly exceed the input revision. New questions and materially edited questions are forced back to `needs-review`; a patch cannot self-certify its own changes.

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

Ad-hoc external packages are imported **manually** into Library. A repository-maintained family is preinstalled only when its root catalog entry has `preinstalled: true`; the build then follows that family’s manifest graph to its canonical papers. Set `preinstalled: false` and rebuild to exclude the family while keeping its corpus installed. To remove the family from the repository corpus itself, delete both its catalog entry and active family directory in the same change; reciprocal reachability rejects unregistered active bank files. Append maintained papers by adding a self-contained paper folder plus one year-manifest entry; do not add package paths to the root catalog. For paired/PDF results outside that maintained corpus, import Source first, then Reviewed, and retain source documents/sidecars externally. Never overwrite an existing immutable revision.

For advanced quota, Source/Reviewed and PDF semantics read [AGENT_CONTENT_PIPELINE.md](architecture/AGENT_CONTENT_PIPELINE.md). Exact runtime/domain invariants live in [DATA_CONTRACTS.md](architecture/DATA_CONTRACTS.md). Machine-discoverable actions are in [practice-desk-capabilities.v1.json](contracts/practice-desk-capabilities.v1.json).
