# AI-first content pipeline — P57/P59/P60 consolidated task contract

**Audience:** external AI agents and maintainers; start with [the compact quickstart](../AGENT_AUTHORING_QUICKSTART.md). **Runtime boundary:** local Node CLIs operate on explicitly provided source paths and emit files/JSON. They do not provide embedded models, authenticated external sources, browser/device controls, cloud sync or silent Library import. The user's local History/FSRS remains private.

## Stage routing
| Need | Script and handoff | Primary invariants |
|---|---|---|
| AI/human source authoring | `question-bank-cli.mjs validate-bank / qa-bank / compile-bank` | One strict `practice-desk-authoring` v1 source, caution-labelled; compile via existing canonical publisher |
| Small-context corrections | `question-bank-agent.mjs inspect / show / patch` | Paged issues, one-question retrieval, SHA preconditions, create-new-file, no whole-bank dump |
| Planned syllabus distribution (P60-B) | `content-blueprint.mjs validate / audit`, compiler `--blueprint` | Versioned quotas, distinct exam subjects/sections/cognitive tags, explicit partial delivery; compiler cannot certify semantic syllabus correctness |
| Independent editorial/answer-key challenge (P60-C) | `question-quality.mjs prepare / audit`, optional compiler `--quality-review` | Candidate-only blind packet; v2 review sidecar with explicit mathematical/legal/time-sensitive applicability, dated source locators, original 20 checks and source-hash freshness; no content authentication or key leakage |
| Exact Source and separately corrected Reviewed editions (P60-D) | `editorial-editions.mjs template / audit / compile` | Preserve original source bytes/key; hash-bind exact Source paper/key IDs into Reviewed paper, import Source then Reviewed; missing revisions yield unavailable comparisons |
| Supplied document/PDF (P60-E) | `pdf-ingest.mjs template / audit / compile` | External agent actually reads pages, math and diagrams; bind PDF/key bytes and per-item source provenance; no internal OCR |
| One scoped handoff for the above (P60-F) | `agent-handoff.mjs actions / prepare / assess / publish` | Read-only assessment; new-file publication requires explicit `--allow-create`; SHA-stale reviews/decisions block strict export |

For ordinary one-file authoring, the shorter workflow avoids loading every stage into model context. A P60-F `prepare` creates a *blank/unapproved* review sidecar; this cannot demonstrate independent factual checking until genuinely completed and externally researched. A file can be structurally valid while educationally wrong. Source citations, date claims, checkmarks and reviewer labels are not source proof.

## Example: strict reviewed publication
```bash
node scripts/agent-handoff.mjs actions
node scripts/agent-handoff.mjs prepare bank.json NEW-review-dir --allow-create
# A truly independent solver inspects candidate-only packet, actual sources, answers and figures.
# Fill the current review.json with supported evidence and all required checks.
node scripts/agent-handoff.mjs assess single bank.json --quality-review NEW-review-dir/review.json
node scripts/agent-handoff.mjs publish single bank.json NEW.exam.json --quality-review NEW-review-dir/review.json --allow-create
```
For original/reviewed, first derive a decision template using `editorial-editions.mjs template original.json reviewed.json`, fill evidence and reviewed QA, then `agent-handoff.mjs assess paired ...` and `publish paired ...`. For supplied documents, transcribe/source-check outside Practice Desk, fill the `pdf-ingest.mjs template` manifest, then assess/publish `pdf` with document, original source, reviewed corrections, decisions and QA sidecar. Use exact command usage in the quickstart.

## Publication is not content authentication
- A source PDF SHA validates the referenced bytes, but the tool does **not** verify each PDF page/image against transcription, original PYQ authenticity or printed key.
- Source authoring may additionally declare `qa.applicability` booleans (`mathematical`, `legal`, `timeSensitive`) with a dated legal/temporal `asOfDate`; an independent review may not contradict positive source declarations. Applicable legal/time-sensitive assertions must carry a reviewer-declared ISO as-of date and matching locatable source evidence; maths requires explicit applicability and proof/source-based review. Heuristics flag likely omitted categories but cannot discover every misclassified claim. Factual/temporal/legal assertions and distractor quality still require genuine checking against authoritative sources; recorded review assertions are not independently authenticated by the app.
- Revisions to prompt, image, key or explanation may invalidate earlier review/hash records. No candidate-answer exposure is allowed.
- `allowPartial` batches can be structurally `valid:true` for continued authoring while `readyForPublication:false` until the total count and required quotas are fulfilled. The compiler and agent publish path reject incomplete plans; read-only audits/assessments can succeed without mislabeling readiness.
- Original-key comparison is advisory and only reports supported candidate-semantic MCQs. Unsupported question kinds are individually unavailable; explanation/taxonomy edits do not invalidate equal candidate inputs. Frozen schema-2 records remain readable. Remaining source-authentication risks are tracked in [backlog](../../backlog.md).
- Source/Reviewed are explicit *two* Library imports, not atomic remote synchronization. Retain original source/PDF and sidecars outside browser History as appropriate.

**References:** [source authoring](QUESTION_BANK_AUTHORING.md) · [agent quickstart](../AGENT_AUTHORING_QUICKSTART.md) · [machine capability contract](../contracts/practice-desk-capabilities.v1.json). Original individual P60-A–F design documents remain losslessly accessible in [the pinned history](../HISTORY_INDEX.md).
