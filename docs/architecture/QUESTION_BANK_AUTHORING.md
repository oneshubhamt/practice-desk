# Question-bank creation and import

**Primary AI/human source:** `practice-desk-authoring` v1. Use the exact [APFC](../../examples/ai-first-apfc.json) or [CAT](../../examples/ai-first-cat.json) example; don't create private compiler hashes or undocumented fields. `Wordgard` in the app also supports editing and publishing six response kinds. All imported/authored questions must be treated as author-supplied unless genuinely independently authenticated.

## Work with one local source file
```bash
node scripts/question-bank-cli.mjs validate-bank examples/ai-first-apfc.json
node scripts/question-bank-cli.mjs qa-bank examples/ai-first-apfc.json
node scripts/question-bank-cli.mjs compile-bank examples/ai-first-apfc.json NEW-apfc.exam.json
node scripts/question-bank-agent.mjs inspect examples/ai-first-apfc.json
node scripts/question-bank-agent.mjs show examples/ai-first-apfc.json question-01
```
CLI calls above do **not** fetch laws, verify original exam papers or import into the app. Import a valid v1 source or compiled exam explicitly from Library. Never overwrite the original bank or previously frozen attempt.

## Structure and grading
One file declares `format`, `version`, `bankId`, `examId`, `paperId`, title, edition, revision, scoring, timing, navigation, physical sections, optional shared stimuli/media and questions. Each question has a stable id, actual `examSection`, semantic subject/syllabus classification, optional topic/subtopic/difficulty, kind, candidate content, answer, explanation and provenance/QA claims.

| Question kind | Typical answer encoding | Evaluation |
|---|---|---|
| `single-choice` | `"B"` | Exactly one available option |
| `multiple-select` | `"A,C"` | Cardinality and any component scoring validated |
| `numeric-entry` | `4` or `[4,4.5]` | Numeric entry with declared tolerance |
| `true-false` | `true` / `false` | Boolean key |
| `matching` | `"1-C,2-A,3-D,4-B"` | One-to-one target constraints |
| `free-response` | Model answer/rubric | Separately manual/self-assessed, not auto-graded |

Plain text and validated rich AST content support TeX, tables/lists and embedded image references with explanatory alt text. Shared passages, charts and tables should be referenced, not reproduced repeatedly; original mathematical/visual details need external source checks. Section timers belong to physical section policy, not topic classification. Numeric marking and edition rules must be explicitly provided rather than inferred from APFC/CAT names.

**Operational bounds:** A single source file is limited to 200 questions, with bounded shared stimuli/media and import budgets; use staged batches for more. Staging is not the same as finished publication. Unpublished Wordgard drafts/staging require separate export from History v4. Increment revision on material changes and re-review stale key/evidence records.

## Advanced path
For quota blueprints, blind 20-check review, corrected Source/Reviewed, externally transcribed PDFs and agent handoff, read [the consolidated content pipeline](AGENT_CONTENT_PIPELINE.md) and the [one-page quickstart](../AGENT_AUTHORING_QUICKSTART.md). Programmatic determinism, source SHA and a completed sidecar never establish external factual or editorial correctness.
