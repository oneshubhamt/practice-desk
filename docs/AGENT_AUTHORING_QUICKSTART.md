# Practice Desk — 1-page AI question-bank agent quickstart

## App functionality without reading its source

Practice Desk is an **offline examination, scoring, results, history and spaced-revision application**, not simply a JSON importer. To discover **current supported capabilities**, run `node scripts/practice-desk-capabilities.mjs summary` and, only for a relevant task, `list`, `show <capability-id>` or `operations`. The [compact AI application guide](AI_APPLICATION_GUIDE.md) explains how authoring, exams, analytics and learning work together; the [versioned machine contract](contracts/practice-desk-capabilities.v1.json) distinguishes implemented features from planned P60 improvements. These read-only commands do **not** connect an agent to the user's offline browser/History. For ordinary question creation, continue below with this quickstart and one exam example. Do not load all architecture documents merely to write questions.


**Read this instead of the whole application repository.** This is the external AI authoring interface, not an LLM embedded in Practice Desk. For exact valid source shapes, read just one small relevant example: [APFC](../examples/ai-first-apfc.json) or [CAT](../examples/ai-first-cat.json). The broader [agent-native rationale and quality policy](architecture/P59_AGENT_NATIVE_QUESTION_AUTHORING.md) is optional on ordinary authoring turns.

## P60-G — source-level defect corrections (6 November 2026)

Use `--blueprint plan.json --cognitive tags.json` together when the plan specifies cognitive quotas. Add `--against prior-bank.json` to check current questions against an explicitly supplied earlier source; standalone multi-bank coverage also supports repeated `--against` flags. A blueprint with `allowPartial: true` may accept **shortfalls only**, never hidden oversupply or an unallocated category; audits disclose `partialDelivery`, `remainingCount` and quota deficits. These flags work through the canonical compiler, PDF intake and agent handoff. Publication now stages outputs until SHA-bound inputs remain stable; a rejected stale publication must not leave a compiled output. Editorial `corrected` and `caution` are distinct, evidence locators accompany corrections, and shared asset changes are recorded only for affected questions. Mandatory reviewer checks cannot be bypassed by `not-applicable`; mathematical/numeric answers use one-to-one comparisons. All source references and reviewer claims remain unverified until actual independent research.

## P60-F — one low-context, explicit-permission agent handoff

**Automated software verified:** [exact-source five-job CI 42194153793](https://github.com/oneshubhamt/practice-desk/actions/runs/42194153793), source `784a31e145855329cb4388a520ca8e92a95ee7d6`, **426/426 Node, all three offline browsers, guarded publication 5/5 PASS**, unchanged standalone HTML. External original/PYQ/factual/reviewer/device authentication remains separate.

Use the **existing** P59 inspect/show/patch for individual questions; use [P60-F's focused contract](architecture/P60F_AGENT_INTEGRATION_AND_VERIFICATION.md) when coordinating full source+review+coverage+publication. There is **no** cloud agent or app/History access. Agents can discover actual operations with `node scripts/agent-handoff.mjs actions`. All three modes require a separately completed **P60-C SHA-bound `--quality-review review.json`**, with optional explicit **P60-B `--blueprint plan.json`**:

```bash
node scripts/agent-handoff.mjs assess single bank.json --quality-review review.json
node scripts/agent-handoff.mjs publish single bank.json NEW.exam.json --quality-review review.json --allow-create

node scripts/agent-handoff.mjs assess paired original.json reviewed.json decisions.json --quality-review review.json
node scripts/agent-handoff.mjs publish paired original.json reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create

node scripts/agent-handoff.mjs assess pdf intake.json original.json paper.pdf reviewed.json decisions.json --quality-review review.json
node scripts/agent-handoff.mjs publish pdf intake.json original.json paper.pdf reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create
```

`assess` is read-only, one concise response with only issue codes/metadata, no answer keys/media. `publish` requires explicit `--allow-create`, will not overwrite an existing file/directory, and delegates to the same original P57/P60-D/E compiler. For a separate printed key add `--key-document key.pdf` to PDF mode. **Import compiled files into the offline Library manually**; for paired PDF/printed source, import **Source then Reviewed**. Review/checklist declarations, file hashes, source-key claims and P60-F success are **not** independent factual or authentic-PYQ proof. Real facts, statutory dates and original PDF meaning still require external human/research verification. The benchmark measures actual CLI calls/bytes/timing only; no model token or learner-outcome improvement claim.

## P60-E — ingest supplied PDFs through an external AI agent

External agents interpret the actual PDF; **no OCR/PDF understanding engine runs inside Practice Desk**. Preserve the original document bytes and transcribe the exact question/number/options/passages/tables/images/TeX into `practice-desk-authoring` v1. Run `node scripts/pdf-ingest.mjs template original.json paper.pdf > intake.json` (optional `--key-document printed-key.pdf`; for image/document sources use `--document-type image|other-document` and optionally `--key-type image|other-document`). Fill the incomplete-by-default SHA-bound page, printed key, source question/stimulus/media, math/figure, inspector and editorial-explanation provenance checks after actually inspecting the pages. Run `node scripts/pdf-ingest.mjs audit intake.json original.json paper.pdf`. Missing pages/keys/cropped maths and unreviewed diagrams **must remain blocked**, never invented. An original-only intake check is not publication-ready. Keep the original unchanged, independently review a separate `reviewed.json` with P60-C, record P60-D decisions, optionally audit P60-B blueprint, then run `node scripts/pdf-ingest.mjs compile intake.json original.json paper.pdf reviewed.json decisions.json NEW-directory --quality-review review.json`. This **delegates** paired publication to existing P60-D and adds a provenance sidecar; explicitly import Source then Reviewed into the offline Library. Source hashes and model-asserted inspections do **not** authenticate question fidelity, PYQ or true reviewer independence. Read [the focused PDF intake contract](architecture/P60E_AGENT_PDF_INGESTION.md) only when needed. **P60-E automated software 5/5 CI verified [42188234511](https://github.com/oneshubhamt/practice-desk/actions/runs/42188234511), 419 Node; real source/document truth still external.** P60-F agent-to-device control is not implemented.

## P60-D — faithful original and a separately reviewed edition

For supplied PYQs or any AI-generated question requiring editorial correction, **preserve the original `practice-desk-authoring` JSON unchanged**. Use existing P59 guarded patches to create a separate reviewed JSON file with the **same paper identity and stable question IDs**. Run `node scripts/editorial-editions.mjs template original.json reviewed.json` to derive every field change without exposing keys; fill the required decision rationale and source/proof locator. First complete the independent P60-C review of the **reviewed** source, then run `node scripts/editorial-editions.mjs audit original.json reviewed.json decisions.json --quality-review review.json` and compile with `node scripts/editorial-editions.mjs compile original.json reviewed.json decisions.json NEW-directory --quality-review review.json`. This writes two individually validated exam packages, a field-level lineage ledger and exact raw input copies. Import **source.exam.json first, reviewed.exam.json second** into the offline Library; both versions coexist and old attempts remain immutable. A claimed authentic PYQ, cited source or reviewer remains **unverified** until inspected outside the app. A reviewed correction is caution-labelled, not automatically official. Read the [P60-D contract](architecture/P60D_ORIGINAL_REVIEWED_EDITORIAL.md) only when constructing a paired edition; ordinary generation still needs just this quickstart and one example.

## P60-C — factual and editorial integrity after drafting

After the [P60-B allocation audit](architecture/P60B_CONTENT_BLUEPRINT.md), use [P60-C's focused reviewer protocol](architecture/P60C_QUESTION_QUALITY_ASSURANCE.md). Generate a **blind candidate-only** page with `node scripts/question-quality.mjs candidate bank.json --limit 10` for an independent solver who must not see the answer or explanation. Use `template` only to create **incomplete** review records; independently research primary sources, check all four options, the key, alternative interpretations, reasoning hints, current law/as-of dates, and actual rendered UI. Audit `node scripts/question-quality.mjs audit bank.json --review review.json` and use `--quality-review review.json` with the existing canonical compiler when requiring a complete SHA-bound review. Direct answer/key disclosures in candidate stems/options/shared stimuli are now blocking in canonical source QA; possible hidden pattern/key echoes are flagged for human/AI semantic review. **No agent-written citation, reviewer ID, 20 pass flags or green CLI status independently authenticates factual correctness**. Source corrections invalidate old review fingerprints. Offline manual imports still do not require an external review sidecar.

## P60-B — content blueprint before sizeable question generation

For requested subject/topic/difficulty allocations, first read the compact [P60-B blueprint guide](architecture/P60B_CONTENT_BLUEPRINT.md) and **one** [APFC](../examples/p60b-apfc-blueprint.json) or [CAT](../examples/p60b-cat-blueprint.json) blueprint example. Run `node scripts/content-blueprint.mjs validate plan.json`; produce 10–30 question batches; run `node scripts/content-blueprint.mjs audit plan.json batch-01.json [batch-02.json ...]` before calling a bank complete. Coverage and issue output are paged/bounded; use `--offset N --limit N` for additional errors, not a full-bank dump. For one exact source, `node scripts/question-bank-cli.mjs compile-bank source.json NEW-paper.json --blueprint plan.json` blocks unmet quotas. Academic labels and citations are author claims, never source-authenticated by quota software; P60-C independent factual/semantic checking remains distinct. The current offline app does not automatically demand the blueprint during manual import.

## Agent workflow: low context, high integrity

**New content:** Research the relevant primary sources **outside the app**, then write `practice-desk-authoring` **v1** JSON in ~10–30 question batches. Each question needs a stable `id`, proper physical `examSection`, academic `syllabusHeadingId` (APFC) or `subject` (other exams), stem, four distinct options, one defensible answer, explanatory reason including why alternatives fail, `provenance:{kind:"ai-original"}` and `qa:{status:"unchecked"}`. Mark legal/rate/current questions `needs-review` until an external source check. **No internal hashes, publisher keys, database writes or browser clicks.** Official PYQ provenance only when proven from the actual paper; a claim or URL never verifies itself.

**Compact QA (no complete bank in chat context):**

```bash
node scripts/question-bank-agent.mjs inspect bank.json
node scripts/question-bank-agent.mjs inspect bank.json --offset 12 --limit 12
node scripts/question-bank-agent.mjs show bank.json labour-01
```

`inspect` returns source-file `sourceSha256`, count, revision, structural validity, compact deterministic QA summary and up to **12** actionable issues by default (use `--limit 1..50`, `--offset N` for more). No full prompts, answer keys, base64 images or 200-question dump. `show` returns exactly one question, stable `questionSha256`, relevant shared stimulus and image metadata **without media bytes**. The SHA values guard *stale updates*, not source/factual authenticity.

**Small corrections rather than recreating the bank:**

```json
{
  "format": "practice-desk-agent-patch",
  "version": 1,
  "baseSha256": "<sourceSha256 from inspect>",
  "nextRevision": 2,
  "updates": [
    {
      "id": "labour-01",
      "expectedQuestionSha256": "<questionSha256 from show>",
      "set": {
        "answer": "C",
        "explanation": "Corrected, independently checked rationale and why A/B/D fail."
      }
    }
  ]
}
```

```bash
node scripts/question-bank-agent.mjs patch bank.json changes.json corrected.json --dry-run
node scripts/question-bank-agent.mjs patch bank.json changes.json corrected.json
node scripts/question-bank-cli.mjs qa-bank corrected.json
node scripts/question-bank-cli.mjs compile-bank corrected.json publication.json
```

Replace placeholders with genuine returned digests. `nextRevision` is **optional while editing an unpublished draft**, but should be a new, strictly larger integer for publishing a separate paper revision; even that cannot modify an already frozen attempt. `updates[].set` replaces only supplied authoring fields. `updates[].unset:["topic"]` removes an optional field. `add:[{...complete newly researched question...}]` appends; `remove:[{id,expectedQuestionSha256}]` removes an item **from the new source file only**, not an existing paper or attempt. Maximum 100 changes per patch. Every **material stem/key/options/solution change is automatically marked `qa.status:"needs-review"`**; an edited question previously claimed to be an `official-pyq` cannot silently retain that status without an explicit source-provenance update. Neither action verifies facts. Every change uses the same strict source compiler/QA; invalid keys, unsupported fields, stale SHA and duplicate IDs fail. Writes use create-new files only, with no existing-path overwrite or partial output. Patching new shared stimuli/media is outside this narrow delta interface: regenerate that source batch, or use Wordgard's exact richer draft exchange.

**Publish and practise:** import the corrected source or validated compiled paper in Library. Batch staging permits selection across up to eight source files/400 staged questions, and 200 selected in Wordgard; editable rich drafts export in a distinct `practice-desk-draft-exchange` v1. Browser storage is **offline, not automatically synced with GitHub/chat**. Export the unpublished staging and draft-shelf backups separately from History v4. The app stores immutable examination and scoring revisions. Keep original/edit patch/QA in version control.

## What the model must verify independently

- **Factual truth:** primary source text, statute commencement/amendments/rules, provision and date, official PYQ identity, rates/current affairs. AI-generated citations alone do not count. For high-stakes legal/current questions, corroborate against two suitable authoritative sources or mark the limitation openly.
- **Unambiguity:** one defensible keyed answer, realistic plausible distinct distractors, no trick based on unspecified time/jurisdiction, no answer leakage, and option-wise explanation.
- **Syllabus validity/difficulty:** official broad APFC heading, inferred core/PYQ-driven subtopic, calibrated APFC (or CAT) difficulty and cognitive diversity.
- **QA:** check contradictions between stem, key and explanation; duplicates/near-duplicates, mathematical workings and distribution of correct options. Re-review questions repaired after errors. Run the deterministic CLI again, but **never interpret `valid:true` as `factually verified`**.

**Quality depends on research and review, not where the LLM runs.** Use ChatGPT/other capable source-connected models for research, generation and correction; the tiny JSON interface for efficient agent control; Practice Desk for persistent import, revision, scored tests, analysis and spaced revision. Physical Mac/mobile/AT/IME/OS-loss and human visual acceptance still require separate user/device signoff.
