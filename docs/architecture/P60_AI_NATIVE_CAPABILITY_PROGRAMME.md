# P60 — AI-native Practice Desk capability, content integrity and agent interaction programme

**Authority:** User-approved target capability, 6 November 2026. **Branch:** `Satyam`. **Implementation status:** P60-A applicable CI green (publisher skipped on Satyam); P60-B bounded automated implementation verified by applicable [CI 42159449898](https://github.com/oneshubhamt/practice-desk/actions/runs/42159449898) (392 Node and Chromium/Firefox/WebKit; publisher skipped on Satyam); P60-C user-authorized and software VERIFIED by [5/5 exact-source CI 42165301894](https://github.com/oneshubhamt/practice-desk/actions/runs/42165301894), **406/406 Node** and offline Chromium/Firefox/WebKit plus source-guarded HTML publication; P60-D authorized and **automated software VERIFIED by [5/5 CI 42179668770](https://github.com/oneshubhamt/practice-desk/actions/runs/42179668770)**, 412/412 Node, offline Chromium/Firefox/WebKit, guarded verified unchanged HTML; P60-E external agent PDF intake **automated software VERIFIED** by [5/5 exact-source CI 42188234511](https://github.com/oneshubhamt/practice-desk/actions/runs/42188234511) on `36f8b993f751687e1b4d176690cc7f18dd2093e7` (419 Node; Chromium/Firefox/WebKit; HTML guarded unchanged), and P60-F user-authorized and **automated software VERIFIED** by [exact-source five-job CI 42194153793](https://github.com/oneshubhamt/practice-desk/actions/runs/42194153793) on `784a31e145855329cb4388a520ca8e92a95ee7d6` (426/426 Node, strict TS, reproducible HTML unchanged, offline Chromium/Firefox/WebKit and guarded publication). The existing P57–P59 software is reused, not replaced for the new P60 acceptance gates. This document describes both the target and its boundaries; a passing import or CI run does not establish content truthfulness.

## 1. Product objective and design constraints

Practice Desk is an offline examination/practice/learning application. Make it exceptionally convenient for **any capable external AI agent**, not just one provider, to understand the application's relevant functionality, research and produce exam-quality questions, verify and correct them, load them in bulk, and use selected app capabilities with minimal implementation/context overhead. The agent should spend its attention on subject knowledge, evidence, exam construct and explanation quality, not on browser automation, internal hashes, database records or application source.

Binding principles:
1. An agent must understand the app's actual capabilities, contracts and limitations **without reading the whole source tree**.
2. Require **minimum sufficient application context**, not minimal research/verification effort. Never trade factual accuracy for fewer tokens.
3. Reuse P57–P59 narrow `practice-desk-authoring` v1, source QA, `inspect/show/patch`, canonical Wordgard compiler, offline importer, immutable history and scoring. Add only narrowly justified capabilities; avoid a competing question/score engine or browser-click-per-question path.
4. Enforce mechanically provable invariants by code; use independent source-connected reasoning for semantic/factual judgments; never represent a model's assertion, citation string, SHA, passed schema or second-model agreement as authenticated truth.
5. Preserve original sources, visible corrections, and source-key vs corrected-key semantics. A claimed official PYQ is not automatically official. New AI originals remain labelled AI originals, not historical PYQs.
6. Keep candidate-visible prompts/options/stimuli distinct from protected author keys, explanations, verification notes and editorial decisions **until authorized review**. Client-side package contents are not a secrecy guarantee against developer tools.
7. No unapproved changes to `main`, `baseline/v11`, existing SSC CGL/Q62 source/score decisions, frozen attempts, FSRS histories, existing backups, offline CSP/build/Navigation fallback or the current generic six-kind scorer. Release and merge remain separate explicit approvals.
8. Keep agent interfaces vendor-neutral, versioned, scoped and least-privilege; direct access to user-local IndexedDB, files, history or analytics requires explicit relevant authorization. Offline import/export stays the baseline; an AI runtime, cloud sync or device bridge is **not implied**.
9. Future app features update versioned capability discovery; descriptions must not misrepresent planned features as implemented.

## 2. Target capability map and progressive disclosure

### P60-A: two complementary artifacts
- **Machine-readable application capability contract:** version, supported features, actual commands and input boundaries, return shapes, status/limitations, privacy and source ownership. Coverage of exam families/papers/editions, six response types, scoring/partial/manual marking, timer/navigation, hierarchy, practice composition, Results/History, Learning/FSRS, source/review, AI staging/Wordgard, rich text/KaTeX, figures/stimuli, offline local storage, archives, recovery and safe UI navigation.
- **Human- and AI-readable application guide:** what the app is for, how the features fit together, which workflow to use, recommended starting commands and examples; factual claims cross-referenced to source. Explain real implementation and intentional limitations, not merely intended architecture.

### Disclosure levels
- **L1: tiny index/quickstart:** purpose, capability names, discovery command, trust restrictions and the **single** next task guide. Read automatically.
- **L2: task-specific contract:** authoring, PDF ingestion, verification, original/reviewed comparison, learning/analytics or app interaction. Fetch only chosen capability and relevant small example.
- **L3: detailed source contracts and examples:** complex kinds, formats, Wordgard exchange, scoring, external primary sources and implementation references **only when needed**.

An agent authoring CAT DILR should discover shared stimuli/table support and avoid repeated passage data. An APFC agent should know nine broad syllabus roots are semantic topics independent of the single physical exam section. An analytics agent should know that timing, accuracy and revisions are evidence-based and do not establish rank or diagnosis.

## 3. P60-B — formal content production/coverage contract

Before producing a substantial bank, convert the user's instruction into a versioned **content blueprint** that contains: exam family and edition, requested total, source/provenance policy, exact per-subject/topic/subtopic allocations (where specified), difficulty proportions, cognitive levels, question kinds, scoring/timer/navigation, target syllabus version/date, priority of core/PYQ-supported areas, exclusions and allowed substitutions, answer/explanation expectations, explicit review thresholds and whether the user permits partial delivery. No inferred allocation is falsely described as official.

A **coverage matrix** must report requested vs actual counts, missing/overweighted topics, kind/difficulty/cognitive variation, answer position distribution and near duplicates across new and prior banks. Example: 40 labour, 30 accountancy and 30 remaining must sum correctly; the 40 labour items must not silently all target the Code on Wages. Enforce exact user-mandated allocation where possible, and report unmet requirements rather than fabricating questions. Keep exam profiles (APFC/CAT/SSC/RBI/UPSC) separate from the general schema. Need strong research and independently reviewed items, typically manageable 10–30 item authoring batches; larger papers are composed using existing bounded staging.

## 4. P60-C — three-layer question QA and content integrity

### 4.1 Layers and trust model
- **L1 deterministic:** schema, bounds, keys vs option IDs, unique options/identifiers, published scoring oracle, certain arithmetic identities, media refs, exact quotas, duplicates, before-submit candidate UI exposure, version/integrity. It can block publication.
- **L2 independent semantic/editorial:** independently solve **without seeing the submitted answer**, assess alternate interpretations, plausible distractors, question difficulty, wording, reasoning chains, misleading patterns, and an adversarial **hint/leakage review** using only the candidate view. AI confidence is not evidence.
- **L3 externally grounded:** confirm original paper/PYQ provenance against authentic documents, current statutes and commencement/rules/amendments as-of a stated date, dates/rates/data from suitable primary sources, calculation inputs and legal exceptions. Keep evidence excerpts/page/provision, source identity, retrieval status and disagreements. Offline QA cannot perform this verification; agents must fetch and check sources outside the app or mark `unverified`.

### 4.2 Mandatory per-question review checklist (each pass/fail/warning/unverified, with rationale)
1. Exam syllabus relevance and appropriate subject/topic/subtopic.
2. Calibrated difficulty and PYQ/core construct appropriateness.
3. Complete, grammatically and mathematically coherent stem.
4. Clear task and jurisdiction/as-of conditions; no hidden assumptions.
5. One defensible correct answer for single-choice (or the correct documented response rule for other kinds).
6. Distinct, plausible options with no accidental alternative correct key.
7. Meaningful distractors testing real misconceptions rather than implausible choices.
8. No key disclosure in prompt, stimulus, caption, metadata, file name or candidate text.
9. No inferential hints from patterns, grammar, option length, reasoning commentary or an overly explanatory stem.
10. Correct numerical calculation, units, rounding, tolerance and boundary cases.
11. Correct complete reasoning and logical entailment; test alternative solutions.
12. Fact-check against appropriate actual sources, not invented/unchecked URLs.
13. Effective dates, amendments, present vs historical provisions, current facts and statistical period.
14. Genuine official PYQ identity, original wording/number/key/image fidelity and page location.
15. Explanations establish why the correct choice holds **and why other options fail**.
16. Key, worked rationale, options, stem and source internally consistent.
17. Mix of recall, interpretation, application and reasoning per user blueprint.
18. Exact/semantic/near duplicates, including previous batches and equivalent options.
19. Requested subject, subtopic, difficulty, kind and other bank-level allocations met.
20. Actual rendered candidate experience contains no pre-submission key, hint, solution or reviewer annotations.

**Leakage regression example:** defective “A number series follows the pattern of consecutive squares: 1, 4, 9, 16. What is the next number?” leaks the pattern. Appropriate candidate stem: “Find the missing term: 1, 4, 9, 16, ?”. This is not solvable by simple answer-string matching; use adversarial candidate-only semantic review and browser rendering checks. Do not “fix” ambiguous/faulty reasoning or GK stems by appending an explanation or the answer directly in candidate-visible text.

### 4.3 Outcomes
- Every review result identifies **check basis**: deterministic, model assessment, actual-source corroboration or human review; `not-performed` must not look like pass.
- Blocking errors prevent publication; uncertain editorial/source matters retain caution or stronger exclusion as appropriate. No silent status promotion based solely on self-declared agent proof.
- Reviewers/citations identify **who actually performed the check and what was inspected**; no fabricated timestamps, official labels or reviewer identities.
- Test false positives/false negatives with intentionally defective reasoning, GK, legal, arithmetic, matching, image and mixed-bank examples. Evaluate question-quality outcomes independently of the generation model.

## 5. P60-D — generalized original/reviewed editorial lifecycle

Source or authentic PYQ: preserve **immutable original transcription**, original options, graphics, source key, official document identity/year/page and uncertainty. Separately review stem/options/key/calculation/current legal and source facts. If correction warranted, create a **separately identifiable reviewed edition** with field-level changes, supporting evidence, editor/agent attribution, date and question scoreability decision. The original remains visible on request, with clear cautions and without silently mutating recorded attempts. Reviewed is the preferred default for ordinary practice **when a defensible reviewed edition exists**, not a blanket claim of official correctness.

AI-original: initial unverified candidate and reviewed iterations remain traceable, without being misrepresented as a historical examination paper. If an original answer key is provably incorrect, retain original key for provenance; corrected grading uses a distinct reviewed edition. A disputed or inherently invalid item may need to be excluded rather than “repaired” using leaked hints. Compare original/reviewed scores **only for exactly comparable frozen semantics**, reusing the existing source-aware comparison safeguards; no letter-only equivalence, no rewriting History or CGL Q62 policy.

Generic across APFC, CAT, UPSC, SSC, RBI and future families; avoid CGL-specific duplicate engines. Define additional data/version contracts before implementing and test round trips, differential keys, provenance, caution/exclusion and frozen attempts.

## 6. P60-E — AI-assisted PDF intake to structured bank

**The AI interprets the PDF; the offline app does not need a second OCR/PDF reasoning engine.**
1. Intake authentic PDF or supplied image-bearing paper, preserve identity and checksum when available.
2. Extract each question, options, answer key, explanation, shared passage/table, figures, number/page.
3. Flag unreadable/cropped/uncertain characters, equations, diagrams and answer keys rather than inventing content.
4. Build a faithful, traceable **original transcription**; keep extracted wording and attached media.
5. Independently re-solve and verify, review math, factual/current law, answer ambiguity and key; record evidence and corrections.
6. Create a distinct reviewed candidate, assigned exam/subject/topic/subtopic/difficulty/kind with blueprint checks.
7. Run deterministic/semantic/source/coverage QA, including answer leakage and duplicates.
8. Emit existing `practice-desk-authoring` v1 or justified narrow exchange, stage via existing Wordgard/import and publish explicitly.

A PDF's **source key** and question text are evidence of what was printed, not proof of correctness. Preserve page coordinates/source references where feasible. Shared stimuli are included once. Do not misrepresent automatic PDF reading as implemented in the offline app.

**P60-E as built:** [External agent document/PDF intake contract](P60E_AGENT_PDF_INGESTION.md) and `scripts/pdf-ingest.mjs` require actual file SHA-256, page/source/key lineage, recorded math/visual/source uncertainties, and strict P60-C/D review (optional P60-B blueprint). The agent reads the source document; no automatic OCR/LLM or source-document interpretation happens inside the offline application. Recorded inspector assertions are not independent source truth.

## 7. P60-F — model-agnostic agent access and independent verification

**As-built implementation (6 November 2026; five-job exact-source software CI VERIFIED, external release/content HOLD):** [P60-F binding handoff and measurement contract](P60F_AGENT_INTEGRATION_AND_VERIFICATION.md), [independent source challenge](../audits/P60F_INDEPENDENT_AGENT_SOURCE_CHALLENGE_2026-11-06.md). `scripts/agent-handoff.mjs actions|assess|publish` provides bounded read-only and explicit create-only operations for `single`, `paired`, and `pdf` source types. It delegates to existing P57/P60-B/C/D/E rather than introducing any new question schema, scoring/History/FSRS process or PDF parser. One offline browser import remains a **manual user step**. Actual cross-browser acceptance covers Source→Reviewed→frozen score→FSRS card and explicit review. `scripts/benchmark-p60f-agent.mjs` measures matched agent-visible calls/output bytes/process times and limited elementary synthetic independent oracles, **not** source authentication, current law, actual model tokens or proven educational gains. Unsupported direct device/History `inspect-performance` remains deliberately absent.


Prefer the existing P59 `inspect`, `show`, `patch`, P57 compiler, narrow QA and offline import. Propose (not yet implemented) discoverable logical actions: `capabilities`, `create-plan`, `inspect-bank`, `show-question`, `review-question`, `compare-editions`, `audit-coverage`, `validate-bank`, `preview-exam`, `publish-bank`, and permission-limited `inspect-performance`.

Only add actions with a real, stable benefit. Return structured bounded outputs with cursors, precise errors and version identifiers, never full source/base64/history without a request. No silent destructive action, no mutation of already scored attempts, no cloud account or device access without separate consent. Keep Wordgard as optional human/editorial route rather than per-question agent UI automation. Distinguish local CLI, offline in-browser actions and future/unsupported external agent actions.

Measure existing P59 vs improved workflows on matched tasks: model-input/output tokens where measurable, calls, latency, context size, QA issues, independently verified answer accuracy, coverage, source evidence, failed/leaked questions, correction workload, and full student examination/review experience. **An interface improvement is not a verified educational improvement until measured.**

## 8. Ordered implementation and acceptance register

| Pass | Bounded deliverable | Essential acceptance |
| --- | --- | --- |
| **P60-A** | Accurate versioned capability contract; brief AI application guide; low-context discovery; current-vs-planned markers | Every advertised implementation has source/test evidence; exact unsupported limitations; agent can discover only needed slice; no runtime/score changes |
| **P60-B** | User-intent blueprint, quotas, coverage audit and exam profiles | Exact requested total/subject/topic constraints enforced and conflicts reported; no invented official proportions |
| **P60-C** | Multilayer quality gates, answer leakage and independent source verification protocol | Defective keys, hints, maths and contradicting claims caught or honestly marked uncertain; no invalid verification claims |
| **P60-D** | General source-vs-reviewed lineage, immutable editorial correction | Original and corrected independently recoverable; source-key scoring comparisons only defensibly compatible |
| **P60-E** | External AI PDF ingest protocol, originals, review, traceable structured export | Mixed PDF page, figure, mathematics and disputed key represented with uncertainty, without silent transcription change |
| **P60-F** | Cohesive agent integration + full independently measured QA | End-to-end new/PYQ generation→review→import→score→Learn, small agent context, regression-free offline |

P60-A, P60-B and P60-C have passed their applicable automated gates after sequential user authorization; P60-D has passed its bounded automated software acceptance, while P60-E external-agent intake passed its bounded automated software gate [CI 42188234511](https://github.com/oneshubhamt/practice-desk/actions/runs/42188234511) and P60-F has passed the bounded full automated software gate; external source truth and physical/human release remain HOLD. Even a P60-C automated green gate cannot authenticate external facts, hardware acceptance, reviewer independence or release permission. Later stages require explicit authorization.

## 9. Engineering discipline (binding, same as existing programme)

For each pass: **(1)** independently inspect current source, docs and tests, list gaps, write baseline/red tests when practical; **(2)** agree/freeze precise contracts, invariants and non-goals; **(3)** implement minimal coherent change with targeted edge/adversarial tests; **(4)** cross-check real source vs each acceptance item, correct failures, preserve decisions and screenshots for UI changes; **(5)** execute complete exact-source CI (strict TypeScript, Node contracts, real offline Chromium/Firefox/WebKit, guarded deterministic HTML publisher) and only then mark automated software verified. Keep physical Mac Safari/iOS/Android, AT/IME/storage-eviction, source/PYQ legal content authentication, human UX and release/merge explicitly separate.

Record per-pass authorized scope, changed source, RED/green CI links and tested SHA, failures, outstanding external gates and next-pass handoff in `docs/ENGINEERING_PROGRAMME.md`; log binding decisions in `docs/decisions/POLICY_REGISTER.md`; reflect reproducible checks in `docs/QA_CURRENT.md`. Never rely on historic “done” claims alone. Do not modify existing `overhaul`, `main` or `baseline/v11` as part of this branch's work.

## 10. Baseline artifacts to preserve and reuse

- `AGENTS.md`, `docs/AGENT_AUTHORING_QUICKSTART.md`, `docs/architecture/P59_AGENT_NATIVE_QUESTION_AUTHORING.md`
- `docs/architecture/QUESTION_BANK_AUTHORING.md`, `docs/ENGINEERING_PROGRAMME.md`
- `examples/ai-first-apfc.json`, `examples/ai-first-cat.json`
- `scripts/question-bank-agent.mjs`, `scripts/question-bank-cli.mjs`
- `src/authoring/external-bank.ts`, `src/authoring/external-bank-qa.ts`, `src/authoring/authoring-publisher.ts`
- `src/app/exam-families.ts`, `src/app/practice-compose.ts`, `src/engine/scoring.ts`, `src/engine/source-comparison.ts`, `src/learning/revision-selection.ts`, `src/history/backup.ts`, `src/domain/question.ts`
- `.github/workflows/ci.yml`, `tests/p59-agent-native-authoring.test.mjs`

## 11. P60-A initial verification ledger (6 November 2026)

| Step | Status | Evidence / open condition |
| --- | --- | --- |
| 1 — source audit | **INSPECTED (targeted)** | Current P59 quickstart/CLI, prior source parser/QA, exam families, practice composer, scorer, source comparison, learning revision and backup behavior; not a new full-repository independent audit |
| 2 — contract | **IN PROGRESS** | Versioned machine contract and agent guide, with source-backed claims and explicit negatives |
| 3 — implementation | **IN PROGRESS** | Headless read-only capability discovery only; no scored app/runtime edits |
| 4 — targeted tests | **PENDING** | Contract/CLI behavior, bounded output, deterministic response shape, file source references, no planned-as-implemented leakage |
| 5 — full CI | **PENDING** | No automatic verification or release claim before exact-source results |

**Explicitly remaining after P60-A:** Blueprint enforcement, independent semantic/factual QA, generic CGL-like source/review, PDF extraction, broad agent control and all external device/content/human release holds.
