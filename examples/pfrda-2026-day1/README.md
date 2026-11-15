# PFRDA Grade A 2026 — Day 1

The user's **original Day 1** preparation questions, recovered from the [publicly shared ChatGPT conversation](https://chatgpt.com/s/t_6af93d7f091881918cf9123723691cef) and packaged in Practice Desk's canonical authoring format. These are original AI-generated practice items, **not official PYQs**.

- [day1.authoring.json](day1.authoring.json): the two-section, 51-question **Practice Desk authoring bank** (one descriptive précis, 50 original MCQs with their four original options, answer keys, explanations and review metadata).
- [original-50-questions.json](original-50-questions.json): separately retained verbatim candidate-visible 50-question source snapshot from the shared link, without answer keys.
- [general-stream-answer-index.md](general-stream-answer-index.md): answer and concise hint index from the user's subsequent Day 1 evaluation.
- [descriptive-english.md](descriptive-english.md): original English passage and manual evaluation reference.
- [build-from-share.mjs](build-from-share.mjs): repeatable, data-only extraction/transcription script. The snapshot survives if the link becomes unavailable.

## Intended Practice Desk configuration

Practice Desk's canonical authoring contract supports both requested physical sections in one paper:

| Order | Section | Original Day 1 material | Intended duration | Evaluation |
| --- | --- | --- | --- | --- |
| 1 | Descriptive English (Paper 1) | One original précis passage and prompt | 20-minute Day 1 practice | Free response; manual evaluation |
| 2 | General Stream (Paper 2) | Fifty original mixed MCQs | 40 minutes | +2 correct, −0.5 incorrect, 0 blank |

The section labels are the official paper names, **not** two semantic subjects. The exam's full English-paper duration is 60 minutes; the user's actual Day 1 *précis practice* was 20 minutes. This source dossier preserves the Day 1 exercise, not a claim to reproduce the entire official Paper 1. The English exercise's estimated 20-mark rubric is an offline/manual practice assessment, separate from the Paper 2 100-mark MCQ total.

The JSON bank implements both sections with sectional timing and sequential-locked section navigation. Answers, explanations and evaluation guidance are answer-side fields, not candidate prompts/options. Practice Desk grades only the General Stream MCQs automatically; written English is manually assessed.

## Integrity and verification

- **Verbatim restoration:** All 50 stems and all 200 options have been extracted directly from the serialized original quiz at the shared link, without paraphrasing. Original source is in `original-50-questions.json`.
- **Answer provenance:** Keys and hints were transcribed from the user's earlier Day 1 evaluation. Legal, numerical and policy claims retain independent-review flags; source provenance alone is not proof of accuracy.
- **English:** The original passage and manual rubric are reproduced. The précis model is a reference answer, not the only permissible answer.
- **As-of context:** Where needed, questions distinguish FY 2025–26 first advance estimates from FY 2026–27 Budget Estimates/projections. Statutory questions should be checked against current law before final publication.

## Local validation and import preparation

```bash
node scripts/question-bank-cli.mjs validate-bank examples/pfrda-2026-day1/day1.authoring.json
node scripts/question-bank-cli.mjs qa-bank examples/pfrda-2026-day1/day1.authoring.json
node scripts/question-bank-cli.mjs compile-bank examples/pfrda-2026-day1/day1.authoring.json examples/pfrda-2026-day1/day1.exam.json
```

The schema validator and source-only quality check do not independently authenticate facts, legal currentness or the user's original score. The `qa` records therefore remain `needs-review` and the independent review/publish workflow remains a separate quality gate. The compiled `.exam.json` is a practice/import artefact, **not an official or independently certified examination**.

## Publication review gate

1. Re-solve and check all fifty independent of the earlier key; verify statutory as-of dates and Budget/Survey figure definitions and document any corrections.
2. Assess question clarity and distractors, check cross-field candidate visibility and follow the repository's blind review process in the authoring quickstart.
3. Publish as quality-reviewed only once the source-hash-bound review is actually completed; never interpret schema validation as factual certification.

The original question wording is preserved; no new MCQs or noncanonical runtime paper formats were substituted.
