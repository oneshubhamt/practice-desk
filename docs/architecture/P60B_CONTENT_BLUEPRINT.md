# P60-B — Content Blueprint and Production Contract (agent handbook)

**Branch:** `Satyam`; **scope:** external source-only AI authoring + audit. **Executable authority:** `scripts/content-blueprint.mjs` (version 1). **Does not authenticate questions.** Keep the P57–P59 `practice-desk-authoring` v1 question format and existing Wordgard compiler/scorer; this is a separate, optional-to-legacy, **mandatory when the user requests exact coverage** production preflight.

## Purpose

Turn a user's exam requirements into an explicit, machine-auditable content plan **before** writing many questions. Report whether the resulting source questions satisfy those requirements, without guessing syllabus/subject facts or loading an entire repository into model context. A pass proves only authored metadata and count constraints, not that the actual question assesses the intended topic or is legally/factually correct; those independent checks belong to P60-C.

A blueprint is `practice-desk-content-blueprint` **version 1**, with:
- `id`, `examId`, `paperId`, `revision`, `targetCount` (1–5,000), optional `allowPartial` (incomplete delivery remains **not ready for publication**).
- `syllabus:{basis,asOfDate,reference}`: `user-defined`, `official-source-attributed`, or `inferred-practice`. **These are attribution labels, not software-authenticated official status.** Reference and as-of date must be accurate and explicit. No invented 2026 allocations.
- Optional `paperRules` with any of `scoring`, `timing`, `navigation`, or `sections`; when specified these must match the actual source policy exactly, not just be consistent between batches.
- `requirements`: optional `requireTopic`, `requireSubtopic`, `requireDifficulty`, `requireExplanation`, `minCitations` (0–12 **claimed** source references), `allowedOrigins` (`ai-original`, `manual`, `reconstruction`, `official-pyq` as **unverified author origin claims**), `excludedTopics:[{subjectKey,topic}]`, `maxTopicSharePercent` (1–100).
- `quotas`: any group `subjects`, `topics`, `subtopics`, `difficulties`, `kinds`, `origins`, `sections`, `cognitive`; each is `{exhaustive:boolean,targets:[...]}`. A declared target is an **exact integer**. If `exhaustive:true`, targets must total the requested question count; unspecified classifications also fail the actual coverage test. Nonexhaustive groups enforce only listed targets, with other categories permitted.

Subject keys use **`heading:<APFC-official-broad-id>`** (e.g. `heading:labour`) or **`subject:<literal user label>`** (e.g. `subject:Reading Comprehension`). The exam's *physical* `examSection` is a separate optional `sections` quota. Topic targets use `{subjectKey,topic,count}`; subtopic targets additionally use `subtopic`. Parent subject/topic targets cannot be smaller than child quota targets; contradictory or duplicated specifications fail before generation.

Difficulty supports `easy`, `medium`, `hard` as **author labels**; kind uses the six current canonical question kinds. Cognitive demands use `recall`, `conceptual`, `application`, `reasoning`; the current AI source v1 contains **no** cognitive-level field, so use the separate optional `practice-desk-cognitive-tags` v1 sidecar with `tags:[{bankId,questionId,level}]`. If cognitive quotas are present, the sidecar is required and each audited question must be tagged exactly once. These labels **are not independently validated cognitive difficulty**.

## Minimal low-context workflow

Read **one** example matching the exam:
- [Synthetic APFC blueprint](../../examples/p60b-apfc-blueprint.json) paired with [existing APFC source](../../examples/ai-first-apfc.json).
- [Synthetic CAT blueprint](../../examples/p60b-cat-blueprint.json) paired with [existing CAT source](../../examples/ai-first-cat.json).

```bash
# Validate a plan *before* generation
node scripts/content-blueprint.mjs validate examples/p60b-apfc-blueprint.json

# Compact metadata/coverage audit; no question text, answers or media bytes
node scripts/content-blueprint.mjs audit examples/p60b-apfc-blueprint.json examples/ai-first-apfc.json

# For generated multiple 10–30 question batches sharing exam/paper/revision/policy:
node scripts/content-blueprint.mjs audit plan.json batch-01.json batch-02.json batch-03.json

# Self-attributed cognitive-level classifications (only when needed)
node scripts/content-blueprint.mjs audit plan.json batch-01.json --cognitive cognitive-tags.json --limit 12

# Enforce an exact ONE-BANK blueprint in the *existing* canonical publisher CLI
node scripts/question-bank-cli.mjs validate-bank bank.json --blueprint plan.json
node scripts/question-bank-cli.mjs compile-bank bank.json compiled.json --blueprint plan.json
```

The audit checks the actual P57–P59 parser and publisher QA for each source and returns a **compact** record: `readyForPublication`, `requestedCount` vs `actualCount`, requested versus actual quota counts, limited actual category inventory (top 12 per category, remaining counts disclosed), per-source validity/warning counts, key-position histogram (without keys), source SHA references, up to 12 errors by default (`--limit 1..50`) and total error count. It distinguishes deterministic classifications from independent source truth, always reporting `factualVerification:not-performed`. It detects repeated source bank/question identifiers, exact normalized repeated stems, paper policy mismatches, missing required metadata/explanations/citations, excluded topics, excessive concentration, unassigned cognitive tags, conflicting/exhaustive quota allocations and under/oversupply. Unknown/invalid fields fail closed.

**There is no automatic quota inference from a paper's exam name.** A plausible distribution is still an **author-selected assumption** until the user chooses it or a true official instruction is independently verified. Exact allocations must not be silently relaxed to meet volume; a failed or incomplete result is **not a publication-ready bank** even when `allowPartial:true`.

## Limits and boundaries

- The existing AI source format remains unchanged: **1–200 items per source file**, strict rich/media limits and import budgets. The external read-only P60-B aggregator accepts **1–32 files**, up to **5,000 questions overall**, with 25 MiB maximum *per file*; this does not enlarge Wordgard staging (8 files/400 items, 200 selected) or browser import limits. Larger programmes require multiple audited batches/import publications and an explicit way to reconcile selected final content.
- `--blueprint` on `validate-bank`/`qa-bank`/`compile-bank` is a **single-source exact preflight**. A 300-question cross-batch blueprint cannot be satisfied by compiling only its first 30-question file; run the multi-source `audit` and stage the intended selections separately. The offline browser does **not yet independently require the blueprint when a human imports a file**. Do not misrepresent a preflight report as an authorization to publish to the user's device.
- If a source has images, the P59 agent `show` omits base64 media; coverage audit does not output question stems or answers. Inspect only the relevant question/source when an issue is reported.
- The source's `subject`, `topic`, `subtopic`, `difficulty`, `provenance.kind`, and the separate cognitive tags are **author claims**. Counts cannot establish actual syllabus coverage, cognitive difficulty, accuracy, sound reasoning, good distractors or absence of hints. Those are P60-C tasks.
- Neither a `sources` citation count nor `syllabus.basis:"official-source-attributed"` proves anyone fetched the URL, verified a PYQ or checked current statutory commencement. No model agreement establishes external truth. Mark uncertain source claims accordingly.
- Preserve original published papers, historical results, existing CGL/Q62 source/review data, offline app behavior and separate unpublished backups. P60-D original/reviewed generalization, P60-E PDF extraction and P60-F direct agent application operations are **future stages**.

## Why this is preferable to per-question Wordgard automation

The agent reads this compact contract and one example, allocates topic quotas, generates manageable files, runs the mechanical auditor, corrects only failing items with P59 `inspect/show/patch`, and submits complete validated source for explicit app import. It does not need the entire UI source, app architecture, local IndexedDB, screenshots, scoring internals or unrelated learning history.

**Engineering policy:** preserve source-to-test evidence, red-first new tests, exact-source strict TypeScript/Node and Chromium/Firefox/WebKit offline CI, guarded publisher verification when applicable, and separately recorded physical/device/content/human release holds. An automated green contract is not proof of educational quality.
