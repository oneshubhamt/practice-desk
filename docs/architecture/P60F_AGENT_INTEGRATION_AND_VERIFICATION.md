# P60-F — model-agnostic agent handoff and independent software verification

**Authorized:** 6 November 2026; `Satyam` only. **Implementation:** external Node/CLI integration and matched synthetic verification. **Status:** approved automated software acceptance **VERIFIED** by [five-job exact-source CI 42194153793](https://github.com/oneshubhamt/practice-desk/actions/runs/42194153793) on `784a31e145855329cb4388a520ca8e92a95ee7d6` (426 Node, strict TS, deterministic unchanged HTML, full Chromium/Firefox/WebKit and guarded publisher), independently source-audited. Actual PDF/PYQ/factual/reviewer truth, physical Mac/mobile/AT/human approval, release and merge remain HOLD. [Binding P60 programme](P60_AI_NATIVE_CAPABILITY_PROGRAMME.md).

## Decision and source-level reuse

P57 `practice-desk-authoring` v1 is the **only narrow question source**. P59 already offers SHA-guarded `inspect/show/patch`, P60-A capability discovery, P60-B exact blueprint coverage, P60-C candidate-only packets and 20-source-bound review checks, P60-D immutable original/reviewed pairing and P60-E external PDF intake. The app already imports validated source packages through explicit user choice, freezes scoring and provenance, and supports user-initiated FSRS review. Reuse all of them. **Do not build a new question schema, LLM runtime, PDF parser, database, scorer, History/FSRS engine, network server, browser extension or direct agent/device bridge.** The reported P59 compact QA benchmark only measured JS character counts, not LLM tokens.

The actual P60-F gap is coordination: agents otherwise need to invoke and stitch together 2–5 tools, understand which guards are binding, and supply explicit publication consent. Add exactly one versioned **thin local handoff** `scripts/agent-handoff.mjs`, which delegates to canonical CLIs rather than copying their implementation. Keep its model interface machine-readable, bounded and answer-private. Expose `scripts/agent-handoff.mjs actions` for immediate low-context discovery; use `practice-desk-capabilities.mjs` for application-wide discovery. Do **not** advertise unsupported actions such as direct `inspect-performance` or autonomous device control.

## Supported actions, explicit permission and stable shapes

```bash
# No data access; concise three modes and their privileges
node scripts/agent-handoff.mjs actions

# Single AI bank: source + mandatory independently recorded P60-C review
node scripts/agent-handoff.mjs assess single source.json --quality-review review.json
node scripts/agent-handoff.mjs publish single source.json NEW.exam.json \
  --quality-review review.json --allow-create

# Existing original + separately corrected source:
node scripts/agent-handoff.mjs assess paired original.json reviewed.json decisions.json \
  --quality-review review.json
node scripts/agent-handoff.mjs publish paired original.json reviewed.json decisions.json NEW-directory \
  --quality-review review.json --allow-create

# External agent-transcribed PDF + P60-E source manifest:
node scripts/agent-handoff.mjs assess pdf intake.json original.json source.pdf reviewed.json decisions.json \
  --quality-review review.json
node scripts/agent-handoff.mjs publish pdf intake.json original.json source.pdf \
  reviewed.json decisions.json NEW-directory --quality-review review.json --allow-create
```

For a separate answer-key PDF add `--key-document key.pdf` **only** with `pdf`. For an explicit source-bound P60-B composition plan add `--blueprint plan.json` to any mode. P60-B is optional only when no blueprint is required by the content owner. P60-E carries an original-PDF source-page ledger; the agent must actually transcribe/visually inspect the supplied document outside the app.

`assess` is **read-only** and returns `practice-desk-agent-handoff` v1 with `mode`, `stage`, `readyForPublication`, SHA-256 for each input, a bounded issue list containing codes/paths **but no question bodies, options, correct answers, explanations or base64 media**, plus source-comparison and asserted review/coverage status where appropriate. `publish` refuses to act without **`--allow-create`**, re-runs the same gates, checks input SHA freshness before and after canonical publication, and invokes the **existing** P57, P60-D or P60-E publish command. Each output is a **new file or exclusive-new directory**, never an overwrite. Returns file SHA-256 and explicit offline Library import guidance. It does not open the browser, import packages, touch user storage or manipulate scored attempts. User permission to use the local CLI remains subject to OS/process sandbox/filesystem access; `--allow-create` is a deliberate command-level guard, **not** an authenticated remote authorization protocol.

Directly usable existing operations remain preferred for focused tasks: `inspect-bank`, `show-question`, `patch-bank`, `blind-question-review`, `audit-question-quality`, `audit-content-coverage`, `audit-editorial-editions`, `pdf-intake-audit`. P60-F is worthwhile only for **one source-bound cross-gate preflight and source-ready publication**. No alternate app schema or source correction UI was introduced. Wordgard remains optional for 5–10% human changes; publishing is still explicit.

## Trust and failure invariants

1. **External semantic work stays external.** No citation, publisher label, reviewer name, blind-solver statement or checklist pass is independent proof. The handoff always returns `factualVerification:"not-performed"`, `externalAuthenticatedReview:false`, `externalSourceFetches:0` and `appAccess:"none"`. It never claims authentic PYQ status or a verified educational explanation.
2. **Strict required review.** For `single`, the existing compiler's `--quality-review` is mandatory; for `paired/pdf`, P60-D/E require a completed P60-C SHA-bound record for the reviewed source and recorded editorial dispositions. Absent, stale, conflicting, incomplete and unsupported claims fail closed. A policy-accepted caution status is **not** an authenticated correction.
3. **Source/edition integrity.** Paired compilation retains exact original source bytes and printed key, distinct signed source/reviewed packages, exact changed-field lineage and conservative source-key comparability. A changed key/explanation is **not** assumed safely comparable, and neither old scores nor FSRS records are rewritten.
4. **No accidental publication or sensitive-output leakage.** `assess` cannot accept a create flag. `publish` requires `--allow-create`, refuses existing output paths and any unrecognized flag/mode, uses argument-array subprocesses (no interpolated shell), checks current input SHA, never logs answer keys or media bytes, and emits at most twelve diagnostic codes per action. The existing canonical compilers perform exclusive-new writes.
5. **PDF uncertainty remains blocking.** Unreadable pages, missing source keys, stale document hashes, source-note/page mismatches and unreconciled visual/TeX issues are rejected by P60-E. This handoff does not improve OCR/text recognition simply by adding a command.
6. **No performance/History delegation.** The external agent has no permission to inspect learner activity, IndexedDB, backups, FSRS or user files except explicitly supplied authoring/QA/PDF documents. If the user chooses to provide a separate exported performance record, any future analytics design still requires separately approved, narrowly permissioned access. No speculative P60-F `inspect-performance` command is implemented.

## Independent software QA and measurement

**RED-first tests:** `tests/p60f-agent-handoff.test.mjs` checked a nonexistent P60-F entrypoint before implementation. Its real tested modes are **single**, **paired** and **PDF**; attempts without consent do not create output, stale quality review/decisions and unmet blueprints block, actual published packages validate through existing `validateExamPackage`, paired original and reviewed keys remain distinct and exact original source bytes survive, PDF manifest survives, source-key comparison remains conservative. It also verifies no answer/media output, no in-app data reads and rejected unknown options.

**Actual offline cross-browser journey:** `scripts/acceptance-p57a-bank.mjs` now executes the **actual** P60-F local handoff on a synthetic original/reviewed APFC source before importing both signed packages through the existing Library on Chromium/Firefox/WebKit. It checks original key distinct from reviewed key, frozen source comparison, actual submit/Results, explicit creation of a Learning card, answer-hidden-until-reveal and deliberate FSRS grade/note, reload retention of source package, historical score and review rating. It retains the existing CAT/APFC source staging, Wordgard, 195px/140%, negative-key and CGL-compatible regression coverage. **This does not assert a genuine official PYQ source was authenticated.** Built-in CGL/Q62 and other historical journeys remain covered separately.

**Matched P59→P60-F benchmark:** `scripts/benchmark-p60f-agent.mjs` and `tests/p60f-agent-benchmark.test.mjs` run matched synthetic APFC and CAT source+review fixtures three times per task: baseline **3 agent-visible command invocations** (P59 inspect + P60-C audit + P57 canonical validate) versus integrated **1 external invocation** (P60-F assess, internally delegating to the same canonical checks). They actually measure process wall-clock and emitted JSON bytes (median); source and review inputs are identical. An **independent fixture oracle**, separate from authored keys, mechanically checks five simple arithmetic/parity/ordinal answers, and a deliberately false “second letter” key is flagged by that oracle. Other semantics, legal facts, current law, authentic PYQ source keys and actual editorial independence are NOT verified. Model prompt/completion tokens, LLM generation latency, factual answer accuracy on real exams, learner performance/retention, actual agent research burden and hardware timings are **not measured** and **must not be inferred** from output bytes or call counts. Benchmarks must be reported with the exact source/run/environment and sample size, never as general performance claims.

## Required acceptance and release boundary

Run strict TypeScript, all Node tests, deterministic single-file HTML rebuild, current full offline Chromium/Firefox/WebKit and guarded publication from the **same** SHA; reconcile source-level diff baseline to P60-F and check CGL source/reviewed Q62, frozen History, FSRS, scoring, Wordgard and backup contract changes. Source code and emitted browser file should be unchanged except the external agent/browser-regression test and documentation. CI green alone does not authenticate user-supplied real PDF/official exam or independently verify source facts; physical Mac/iOS/Android, assistive technology, actual storage/OS failure, user visual approval, public distribution and merging remain explicitly HOLD. Do not start a new programme or widen permissions without approval.
