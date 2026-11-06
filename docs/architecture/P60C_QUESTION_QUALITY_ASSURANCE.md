# P60-C — Comprehensive question quality assurance and independent-review protocol

**Branch:** `Satyam` · **Authorization:** 6 November 2026, after P60-A/B · **Status:** implemented source contracts under verification; preserve P57–P60-B, offline exam and scorer. **This is NOT a self-running fact-checking AI, authenticated source service or proof that a human/editor actually reviewed an item.**

## 1. Architecture and responsibility

P60-C implements the third stage of the [approved P60 programme](P60_AI_NATIVE_CAPABILITY_PROGRAMME.md), reusing `practice-desk-authoring` v1 and existing canonical P57–P59 QA, compiler, source patcher and P60-B coverage audit.

The workflow divides three distinct responsibilities:

1. **Deterministic software gate:** current source validity, immutable key/scorer coherence, duplicate options and candidate-visible key labels, plus P60-C source-revision bindings and checklist completeness. Real independent software proofs can be labelled `deterministic`. Strong explicit leaks are **blocking** in the shared authoring validator, including ordinary offline source imports. Probable reasoning-pattern clues are heuristic **warnings** rather than automatic rewriting.
2. **Independent semantic/editorial judgment:** a *different* reviewer should independently solve the **blind candidate packet** and then challenge all options, distractors, wording, alternatives, difficulty, generality, syllabus suitability, quantitative reasoning, answer leakage, and educational explanation. The CLI records attributed review; **it cannot verify that the reviewer was independent or did not see the answer**.
3. **Actual source-grounded verification by an external agent/researcher:** fetch relevant primary documents; inspect correct provision/page/edition and amendments/as-of period; corroborate official PYQ identity and source key; note disagreements and exceptions; record locatable source extracts. The offline CLI has **zero external source fetches** and never upgrades `factualVerification:not-performed` to a verified badge because the reviewer entered a URL, `source-consulted`, or `human`.

The intended trust hierarchy is **mechanical program checks < recorded reviewer claims < independently inspected authentic source evidence < explicit human editorial approval**. The software validates the **structure and consistency of the evidence record**, not its external truth or the authenticity of the purported reviewer.

## 2. Low-context agent commands

```bash
# First read one source example and P59 quickstart; no repository architecture dump.
node scripts/question-quality.mjs checklist

# Independent solver: candidate-only text/options, attached shared text and
# referenced image alt/caption; no keyed solution, explanations, provenance,
# source claims or image base64. Default page 10; choose one page at a time.
node scripts/question-quality.mjs candidate bank.json --offset 0 --limit 10

# Optional **incomplete** draft to fill after genuine blinded solving.
node scripts/question-quality.mjs template bank.json --offset 0 --limit 10

# Structural + candidate-leak check, review absent = NOT ready
node scripts/question-quality.mjs audit bank.json --limit 12

# Supply independently completed records for all questions in this source.
node scripts/question-quality.mjs audit bank.json --review reviews.json --offset 0 --limit 12

# Optional strict gate on the EXISTING canonical source validator/compiler;
# refuse a new compiled output unless source, keys and recorded review pass.
node scripts/question-bank-cli.mjs validate-bank bank.json --quality-review reviews.json
node scripts/question-bank-cli.mjs compile-bank bank.json NEW-paper.json --quality-review reviews.json

# P60-B count allocation and P60-C review may be required together:
node scripts/question-bank-cli.mjs compile-bank bank.json NEW-paper.json \
  --blueprint plan.json --quality-review reviews.json

# Repair a failing question through existing P59 inspect/show/SHA patch,
# then repeat blind review: the old review is invalid after source changes.
node scripts/question-bank-agent.mjs inspect bank.json
node scripts/question-bank-agent.mjs show bank.json question-id
```

The `candidate` packet and `template` reveal no author answers, keyed option, explanation, source claim, review notes or media pixels. **They are text/alt representations only.** An actual reviewer must inspect the full rendered question/figure separately for visual-correctness assertions. The `audit` outputs bounded issue counts, SHA references and checklist identifiers, not an entire question set; use offsets to retrieve additional failures.

The P60-C review sidecar is **`practice-desk-quality-review` v1**. It is kept **outside** the frozen exam and question source. One record per question includes the original **source SHA-256** (at document level), raw question **SHA-256**, candidate-only **projection SHA-256**, claimed reviewer kind/ID, independent proposed answer + reasoning, 20 attributed status/basis/rationale records, and up to 15 bounded source excerpts with publisher/title/locator, retrieval date, optional as-of date and HTTPS URL. No statement in it is an authenticated signature.

The machine reader rejects unknown/duplicate fields and IDs, invalid hashes/dates, truncated or changed question records, missing assessments, disagreement between separately proposed answer and the authored key, incomplete checks, unsubstantiated source-consulted claims, and failed checks. `blindClaim:true` is a **required assertion**, not cryptographic proof of blinding. `readyForPublication:true` from the opt-in gate means **all recorded checks and source-independent code checks pass under this contract**. It **does not mean** an outside verifier authenticated the claims: the response always includes `reviewAssurance:"recorded-self-attestation-not-authenticated"`, `factualVerification:"not-performed"` and `externalSourceFetches:0`.

### Reviewer role and traceability

For defensible real-world use, keep the author, **blind independent solver**, adversarial candidate-clue reviewer, and source/citation verifier as separate *passes* of work; preferably separate agents or human reviewers for consequential questions. Do not show a blind solver the original answer/key, explanation or original QA before collecting the solver's answer and proof. Then compare the solver's result against the author's answer using the source-bound audit. If they disagree, investigate and repair before compiling. Store source excerpts and resolution outside the offline app. A single agent filling every pass may be a convenient provisional workflow, but **cannot be called independently verified**.

### Author-corrected content and PYQs

If an official PYQ or authenticated original paper has a faulty key or ambiguous framing, **preserve its original text and key separately**; do not mutate it under a synthetic official citation or leak the corrected answer into the candidate stem. P60-D will generalize immutable original-versus-reviewed editions; until then, use the existing distinct source/patch/current-review limitations and do not claim this stage implements generic paired editions. P60-E PDF extraction likewise remains future scope.

## 3. Mandatory 20-point quality review (all evidence-labelled)

| ID | Reviewer challenge |
| --- | --- |
| `syllabus-relevance` | Correct official broad heading or honestly attributed user category, topic and question construct? |
| `difficulty-calibration` | Reasonable exam-level challenge given PYQ patterns, not a trivial or marginal trick? |
| `stem-construction` | Complete, grammatical, non-misleading and mathematically well-posed? |
| `task-unambiguous` | Clear objective, assumptions, jurisdiction and time qualifier? |
| `one-defensible-answer` | One defensible correct answer for single-choice; appropriate definitive rule for other kinds? |
| `option-distinctness` | Distinct and mutually discriminating options, not accidental equivalents? |
| `distractor-quality` | Relevant, plausible, conceptually meaningful and demonstrably wrong alternatives? |
| `answer-leakage` | No direct answer/key in stem, options, passage, metadata or alt text? |
| `unintended-hints` | No solution pattern, grammatical cue, option-length giveaway or hidden helpful hint? |
| `mathematical-correctness` | Correct arithmetic, logic, units, rounding, range, boundary and alternate solution? |
| `reasoning-correctness` | Independent complete reasoning establishes conclusion rather than post-hoc guess? |
| `factual-correctness` | Actual source or valid mathematical proof, not a plausibly phrased invented claim? |
| `temporal-correctness` | Current and historical provisions/statistics appropriately separated, commencement and exceptions checked? |
| `pyq-fidelity` | Verified original paper/year/page/stem/option/key claim where asserted? |
| `explanation-quality` | Explains the correct choice **and why each alternative fails** with needed exceptions? |
| `internal-consistency` | Authored key, independent answer, source, worked explanation and displayed options aligned? |
| `cognitive-diversity` | Bank tests recall, understanding, application and reasoning per requested blueprint? |
| `duplication` | Not a duplicate or superficial rewording of existing set or shared stimulus? |
| `blueprint-coverage` | Exact subject/topic/subtopic/difficulty/format quotas satisfied under P60-B? |
| `candidate-view-integrity` | Actual renderer hides solution, editorial notes and key before permitted review? |

Every checklist entry uses `status`: `pass`, `fail`, `not-reviewed`, `not-applicable` and `basis`: `independent-editorial`, `mathematical-proof`, `source-consulted`, `rendered-claim`, or `human-claim`, with a substantive rationale. `not-applicable` should only be used for genuinely irrelevant checks, such as PYQ-fidelity on an unequivocal AI-original question or temporal-currentness of timeless elementary arithmetic. An indiscriminate `pass` or `not-applicable` is poor editorial practice even if structurally accepted.

**Additional fail-closed basis rules:** factual correctness cannot receive a source-free generic editorial `pass` (needs `source-consulted` with evidence, or a genuine `mathematical-proof`); legal/current statutory text demands source consultation, a positive temporal check and evidence with `asOfDate`; official PYQs demand actual traceable `pyq-fidelity` evidence; candidate-view integrity passes require an explicit actual-render claim. All are **recorded assertions, not authenticated external observations**.

## 4. Answer-leakage examples and conservative code behavior

**Hard error (automatic shared publisher check):**
- Candidate stem includes `Correct answer: B` or `Answer is C`; options marked `✓`, `[correct]`, `(correct answer)`.
- Shared RC/DILR passage or a referenced figure's alt text/caption contains an explicit key label.
- Such errors block normal `practice-desk-authoring` import/compile even without an opt-in review sidecar. Protected author explanations may legitimately say `Correct answer: B` and are **not** candidate-scanned.

**Heuristic warning (requires semantic inspection):**
- “A number series follows the pattern of consecutive squares: 1, 4, 9, 16. What is the next number?” directly states the pattern.
- A full, long keyed option literally appears in the question stem.
- These can sometimes be legitimate quotations, so code does not automatically rewrite/ban them. A blind solver and adversarial reviewer must decide whether the question still tests the intended construct.

**Not mechanically certifiable:** a GK stem that implicitly states the fact in its premise, two subtly correct answers under differing legal commencement dates, an irrelevant but long answer option, an incorrect graph/figure, unsupported as-of claims, or fabricated reasoning. Use semantic reviewer work and actual source/renderer evidence; the CLI never claims otherwise.

## 5. Primary-source verification process for AI agents

When answering a substantive question, the independent verifier must actually inspect a suitable primary document, not merely quote a publication name or find a search snippet. For APFC legislative questions, record Act/Code, section, **commencement**, applicable rules/notification, predecessor Act status, amendment date, jurisdiction and as-of date. For economic figures use RBI/MoSPI/Budget/Survey original table and relevant period; for CGL/UPSC PYQs use an authentic original examination paper and source key where available, retaining disagreements. For CAT quantitative/reasoning questions independently calculate the proposed key and *every* distractor, alternate interpretations and edge cases. For English/GK, check the grammar/reference or original historical facts and ambiguities.

A source record should provide publisher, title, specific locator (page/provision/table), retrieved-at date, concise excerpt/semantic summary and URL/as-of date when available. The offline program confirms only syntactic plausibility and presence of this record, **not** that the document exists or supports the answer. If no source is accessible, mark `not-reviewed` and withhold a strict review pass rather than invent proof. Disputed sources require explicit resolution; a positive self-claim cannot settle them.

## 6. Explicit non-goals, remaining holds and test evidence

- No embedded AI, external URL fetcher, search engine, authenticated reviewer signatures, official PYQ verification API, automatic answer correction or model-forced publication.
- No new question-bank/source format; no app scorer, immutable History, existing CGL/Q62, FSRS, backup, Navigation/CSP or standalone deployment-policy redesign.
- Ordinary manual offline import remains caution-labelled under existing rules. The **optional** `--quality-review` compiler flag enforces a complete external review sidecar for those authoring workflows choosing it, but manual local device import does not currently enforce external review records.
- No claim that an untrusted reviewer ID, source-corroboration basis, retrieved date, excerpt string or browser inspection statement was authenticated. Even a green CLI output is not proof of externally correct questions.
- P60-B source quotas remain author classifications; P60-D original/reviewed generalized editions and P60-E PDF ingestion remain future programmes.
- Full real-browser candidate secrecy regressions, actual Mac/iOS/Android, assistive tech/IME/storage eviction, verified official content, visual approval and release remain separately required.

**Engineering acceptance (five stages):** first inspect current P57–P60-B source and run red tests; define strict versioned sidecar, issue taxonomy and trust model; build limited pure candidate-integrity checks + standalone CLI + optional existing compiler gate; add adversarial Node coverage including candidate-only extraction, rich/stimulus/media leakage, source mutations, mismatch, malformed evidence, actual exam-renderer proof and complete synthetic review; then run exact-source strict TypeScript, Node tests, deterministic HTML, offline Chromium/Firefox/WebKit and guarded publisher **if the branch permits it**. Never count a skipped publisher as passed or treat CI as fact verification.

**Current source references:** `src/authoring/candidate-integrity.ts`, `src/authoring/external-bank-qa.ts`, `scripts/question-quality.mjs`, `scripts/question-bank-cli.mjs`, `tests/p60c-question-quality.test.mjs`.
