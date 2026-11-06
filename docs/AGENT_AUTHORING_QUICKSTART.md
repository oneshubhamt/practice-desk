# Practice Desk — 1-page AI question-bank agent quickstart

## App functionality without reading its source

Practice Desk is an **offline examination, scoring, results, history and spaced-revision application**, not simply a JSON importer. To discover **current supported capabilities**, run `node scripts/practice-desk-capabilities.mjs summary` and, only for a relevant task, `list`, `show <capability-id>` or `operations`. The [compact AI application guide](AI_APPLICATION_GUIDE.md) explains how authoring, exams, analytics and learning work together; the [versioned machine contract](contracts/practice-desk-capabilities.v1.json) distinguishes implemented features from planned P60 improvements. These read-only commands do **not** connect an agent to the user's offline browser/History. For ordinary question creation, continue below with this quickstart and one exam example. Do not load all architecture documents merely to write questions.


**Read this instead of the whole application repository.** This is the external AI authoring interface, not an LLM embedded in Practice Desk. For exact valid source shapes, read just one small relevant example: [APFC](../examples/ai-first-apfc.json) or [CAT](../examples/ai-first-cat.json). The broader [agent-native rationale and quality policy](architecture/P59_AGENT_NATIVE_QUESTION_AUTHORING.md) is optional on ordinary authoring turns.

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
