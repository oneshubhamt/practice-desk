# P57 proposal — AI-first question-bank ingestion, verification and editorial workflow

**Recorded:** 5 November 2026. **Current authorization:** P57-A was explicitly authorized in the subsequent implementation session; source/CLI/browser acceptance tests are now committed on `overhaul`, with exact-source full CI still pending independent verification. [Five-step implementation ledger](../ENGINEERING_PROGRAMME.md#0h-p57-a--unified-ai-first-external-format-and-deterministic-compiler-5-november-2026) and [current external format guide](QUESTION_BANK_AUTHORING.md) distinguish the implemented scope from the original proposal. **P57-B and P57-C remain PROPOSED / NOT AUTHORIZED.** This document records the original full plan, not evidence that those later capabilities exist; do not generate claimed official bank content, merge or distribute without approval.

**Objective:** Practice Desk is expected to acquire roughly **90–95% of new questions through external AI agents**, with **5–10% manually authored or corrected**. The present exam engine is suitable, but the *producer-side ingestion, content QA, staged review and repeatable machine workflow* need a bounded improvement. Build on existing immutable, offline architecture; **do not conduct another overhaul**.

**Next-session starting point:** Read this document, [engineering programme](../ENGINEERING_PROGRAMME.md), [present authoring contract](QUESTION_BANK_AUTHORING.md), [data contracts](DATA_CONTRACTS.md), [current architecture](CURRENT_ARCHITECTURE.md), and [engineering constraints](../../AGENTS.md). Reinspect actual `overhaul` source before implementing: this is a snapshot, not authority over later source changes.

## 1. Design verdict and scope

**Verdict:** Exam execution, scoring, offline persistence, validated import and frozen source/revision structure are in place. The missing product is an **agent-friendly, source-aware production pipeline**. A usable agent should generate content using one documented stable external format, run deterministic validation outside or inside the application, obtain actionable per-question errors, repair content, optionally stage suspect questions for Wordgard manual review, then publish *without composing internal hashes or touching runtime source*.

**Included in P57 planning:** contract, deterministic compiler, validation/diagnostics, exact-and-near duplicate triage, source and editorial evidence, bulk staged editing, safe version-aware publication, reproducible CLI and high-value cross-browser tests.

**Excluded:** an embedded cloud LLM/agent runtime, automatic network fetching from the offline HTML, vendor lock-in, new database or migration system, new scoring engine, Wordgard/KaTeX/FSRS replacement, automatic factual certification, fully reliable PDF/DOCX OCR extraction, source-content generation in this pass, changes to CGL original/reviewed Q62 editorial decisions, and external device/release signoff. No separate AI implementation per exam.

## 2. Current as-built evidence (verified against 5 November `overhaul` sources)

| Existing path | Strength | Deficiency for 90–95% AI production | Read first |
| --- | --- | --- | --- |
| Simple JSON `practice-desk-bank` v1 | Friendly external file; automatically generates IDs, revision SHA digests, key and paper; MCQ/NAT, optional figures, 2,000 questions per file and 25 MiB upload guard | Only MCQ/NAT, flat `section` doubles as navigation group, no independent official subject/topic/subtopic, no per-item structured citations, no bulk staging and no near-duplicate audit. **Critically, it sets every imported question's editorial status to `verified` without external correctness proof.** | `src/app/bank-import.ts`, `src/app/library-controller.ts` |
| Full JSON `practice-desk-exam` v1 | Six kinds, shared passages, rich content, advanced scoring/timing, semantic taxonomy, SHA-validated immutable versioned IDs | AI must synthesize complicated internal envelopes, hashes and cross-references; easy to get invalid or contradictory records; this should remain the *compiled output*, not the expected authoring input | `src/app/exam-package.ts`, `src/domain/{question,exam,answer-key,validate,integrity}.ts` |
| Wordgard draft → inspect → publish | Six kinds, rich math/images/tables, physical section distinct from academic subject, precise authoring preflight, manual editing and immutable publication | Optimized for individual interactive authoring; draft validator limits 200 questions, JSON draft shelf 1.9M chars and 20 drafts. Not a direct automated mass-ingestion or pre-checked agent pipeline | `src/authoring/{authoring-draft,authoring-studio,authoring-publisher}.ts` |
| Library import and practice composition | User-supplied bank persistence, exact import validation, preserved attempts, seeded draws, topic/difficulty filters, exclusion/caution semantics | Uploads one package and reports failure; no dedicated dry-run batch report, queue of suspected questions, cross-bank duplication dashboard, selective acceptance or guided repair cycle | `src/app/{library-controller,practice-compose}.ts` |
| Editorial and source fields | Advanced revisions have `EditorialRecord.status/notes/sourcePage/sources`; published Wordgard questions are marked `caution` as user-authored | Inconsistent between pathways; source note is only 500 characters in drafts; lacks structured provenance/checks/evidence for AI pipelines. A content hash verifies integrity **not factual correctness or official identity** | `src/domain/question.ts`, `src/authoring/authoring-publisher.ts` |
| Browser publishing/backup | Frozen packages and source-linked History, score and revision snapshots are protected | Unpublished Wordgard drafts are device-local and **not included in History backup**; require separate JSON export. External source/QA files should be first-class versioned work products outside the app | `src/authoring/authoring-studio.ts`, `docs/architecture/QUESTION_BANK_AUTHORING.md` |

**Important correction to prior broad claim:** A `practice-desk-bank` import currently labels questions `verified` by construction; this is an **editorial trust bug** for unreviewed AI-generated questions, *not* evidence they were checked. P57 must fix semantics without silently treating all existing/imported material as reliably verified. Use explicit editorial statuses and quality gates.

## 3. Target workflow and trust boundaries

```text
External AI author (ChatGPT / Claude / Codex / other)
  └─ produce documented, versioned AUTHORING-SOURCE files + evidence
       └─ deterministic local validator / CLI (no AI dependency)
            ├─ schema, identity, content, references, timing and key validation
            ├─ rule-/source-/solution-checked QA reports; duplicate triage
            └─ review queue (fatal errors vs warnings vs checks requiring human proof)
                 ├─ agent repairs and reruns the validator
                 ├─ Wordgard opens selected editable items for the user's 5–10%
                 └─ explicitly approved verified/supported subset or whole batch
                      └─ existing immutable compiler and publication/import boundary
                           └─ current offline Exam → Result → Learning → History
```

**Single source of truth:** Authoring-source material and evidence are *editable and not scoreable*. Compiled `practice-desk-exam` packages are immutable, strictly validated, and *scoreable*. External agents never manufacture internal hashes by prompting and never directly modify IndexedDB/history. The app computes hashes, identities and linkages at compile/publish time. Keep authoring files and QA reports exportable and version-control-friendly. The user's browser remains offline; AI generation and source research happen outside it.

**Verification vocabulary:** `schema_valid`, `key_consistent`, `solution_checked`, `source_corroborated`, `human_reviewed` are distinct evidence states. Do not substitute hashes or a second AI opinion for authoritative factual verification. A mere provider claim or populated URL cannot turn an item into official PYQ/verified. Unchecked items must be clearly labelled caution/draft or withheld from publish according to explicit policy. Policy must specify which warnings allow publishing and which block it.

## 4. P57-A — unified external AI authoring contract and deterministic compiler (ESSENTIAL)

1. Define **one documented, versioned, minimal external format** for both agents and human file imports: bank metadata + questions + optional shared stimuli and image inventory + explicit scoring/timing/navigation + independent `examSection` and `subject/topic/subtopic` + provenance and QA metadata. No exposed internal `QuestionRevision.id`, `contentHash`, source-key SHA, Wordgard vendor JSON or implementation-specific storage detail.
2. Support six existing response kinds: single-choice, multiple-select, numeric-entry (accepted values/tolerance), true/false, matching and manual free-response. For CAT, preserve reusable RC passage and DILR shared-set references; structured math, tables, figure IDs, alt text, rich AST (or a strictly defined conversion); for APFC, allow the nine official broad syllabus roots with explicit attribution. Avoid arbitrary Markdown/HTML execution and unsafe generated LaTeX or image URLs.
3. Convert this **external authoring schema → existing canonical draft/normalized domain → existing immutable `ExamPackage`** through one compiler implementation. Reuse `validateExamPackage`, `inspectAuthoringPublication` and other established domain invariants. Preflight and actual publish must use the same compiled object. Prefer additive adapters over a second scorer or full schema replacement; retain both current simple/advanced imports where sensible.
4. Provide a **headless CLI** such as `validate-bank <file>` / `compile-bank <file>` (names indicative, not built): accept JSON from any AI system; exit nonzero for fatal errors; output structured machine-readable diagnostics and optionally a compiled file. Same shared validation in offline UI; no secret keys/cloud API required.
5. Retain deterministic stable semantic IDs across republished revisions; a changed question receives a distinct immutable revision; never overwrite a previously attempted paper. Define human-readable source filenames, bank/batch identity, revision and edit semantics explicitly.
6. Keep two limits explicit: *simple import* currently up to 2,000 questions, *Wordgard drafts* up to 200 with 1.9M local shelf budget. Do not merely raise localStorage limits to emulate large-scale authoring. Large banks should be streamed/batched or constructed outside the browser with bounded memory/size, then staged or compiled safely.
7. Provide at least two copy-ready reference bank files: **small CAT** (shared RC/DILR context and NAT/MCQ) and **small APFC** (one physical mock section, several academic subjects and current-code references). These are *schema demonstrations*, not purported fact-verified exam questions.

**Acceptance:** A fresh external AI agent can follow the versioned instructions, produce CAT/APFC sample authoring files *without calculating hashes*, run the exact validator, compile them and import them into real `file://` practice; same schema powers corrections in Wordgard. The scores, passage relationships, topic filters and historical immutable revisions remain correct.

## 5. P57-B — deterministic QA, source evidence and duplicate triage (ESSENTIAL)

**Required checks and actionable output:**
- Schema/type/range/length/encoding and unsupported fields; four defensible MCQ options where the exam profile requires four; unique identities; complete answer keys and safe numeric tolerances.
- Intra-question consistency: key belongs to displayed choices, distinct/valid options, multiple-select cardinality, matching bijection, accepted NAT alternatives, per-component marking, no unintentional blank/zero-time sections, timing-navigation and advertised score ceiling agreement. Score sample known answers with the *real* engine as an integration oracle.
- References: presence/format/allowed scheme, publisher/title/section/page/URL/date where applicable; verify URL/source content only through an explicitly external source-check process; the offline app must **not** assert that it fetched or authenticated sources.
- Solution consistency: optional exact mathematical recalculation for supported numeric cases; detect answer key vs explanation contradiction where feasible; qualitative checks need reviewed evidence. When checks cannot determine correctness, mark **unverified** rather than passing.
- Duplicate screening: exact canonical duplicate first; conservative same-stem/near-duplicate candidates across batches and revisions (shared stimulus alone must **not** count as duplicate); give similarity evidence and human resolution, not destructive auto-deduplication. Account for renamed options, shuffled order, minor paraphrases and reused PYQs.
- Metadata quality: explicit exam identity, **real physical section distinct from academic subject**, topic hierarchy, difficulty where supplied, source/exam-year status, version identity and original-vs-reviewed provenance. Do not silently fabricate official syllabus labels, PYQ authenticity, statutory effective dates or the answer.
- Machine-readable **per-question** report with field paths and issue codes, severity, confidence/basis, evidence location, suggested safe corrections and counts by error/warning/status; human-readable report suitable for the next agent iteration.

**Editorial trust policy to propose:** new AI-produced content defaults to `caution`/`unreviewed` semantics until evidence is assessed, not `verified` solely because format checks passed. Prevent unchecked source/reviewed claims from becoming official labels. Do not infer legal accuracy or current commencement from old Acts. Preserve any older source/reviewed paper and Q62 editorial decisions; migration is explicitly out of scope unless justified by a proven integrity risk.

**Acceptance:** Deliberately faulty MCQ, numerical, APFC legal reference, CAT passage/set, duplicate, topic label, corrupt media, malicious URL and source-disagreement fixtures produce bounded, precise errors or honest warnings. A formally valid but factually false question cannot be described as automatically fact-verified.

## 6. P57-C — staging, human correction and version-aware publication (HIGH)

1. Import **multiple files or bounded batches** into an editable *staging workspace* (offline first), with question count, exam/topic coverage, type, detected duplicates, QA status and provenance. Stage safely; do not directly publish or mutate scored content.
2. Enable **filter/fix/re-run**: fix missing source, incorrect key, ambiguous question, broken math, image alt text or subject tag in selected items. Use existing **Wordgard** for rich manual corrections rather than building a second editor.
3. Support selective inclusion of validated questions, explicit accepted warnings and **two-person/independent review evidence when provided** without pretending such approval happened. Human review remains optional/targeted, not a forced manual click on every AI question.
4. Produce a **dry-run summary** of exactly what will publish: bank identity, edition, revision, question count/kinds, CAT sections/shared context, APFC syllabus/topic coverage, scores/time, warnings, sources and duplicate triage. Require explicit final publication confirmation; a failed write must not claim success.
5. Publish only through existing immutable/persisted `generic-package` boundary with correct duplicate revision rejection, CAS, saved attempt/result isolation and an exportable human/agent-friendly authoring source plus QA report. Protect against partial batch writes; no silent overwrite of old questions/attempts.
6. Preserve the established original/reviewed distinction; a new corrected revision is separately named and source linked. Handle individual-question revisions without accidental identity churn, and report any cross-bank exact duplicates rather than splicing older attempts.
7. Keep results, notebook and source freeze unchanged; independently test large-bank navigation/filtering/storage and mobile 195px/140%, keyboard and accessible warnings.

**Acceptance:** Import two AI batches with deliberate overlaps and one faulty key → view diagnostic summary → correct only flagged questions in Wordgard → validate again → publish selected immutable revision → take CAT/APFC sample attempts → verify exact marks, filters, source review, History, backup/reload; prior attempts remain intact.

## 7. Exam profiles without divergent pipelines

### CAT (profile/rules, not content creation)

- Support shared RC passages and multi-item DILR sets without replicating stimulus text/media per item.
- Distinguish MCQ and numerical/non-MCQ responses, correct per-section timing, marks, penalties, navigation and allowed review behavior according to **the verified target exam format/year**; no CAT rules hard-coded into the generic engine.
- Preserve math via explicit TeX/linear alternatives, figures and accessible text. Fail or warn on missing passage associations and incomplete data tables.

### UPSC EPFO APFC (profile/rules, not content creation)

- Require explicit selection of the **nine current official broad syllabus headings**, with optional subject→topic→subtopic beneath; one physical exam section may contain multiple syllabus subjects.
- Distinguish genuine primary-source PYQs, reconstructions and AI-original questions; support Act/Code name, publication/commencement/as-of date, relevant provision and citation evidence *when source-checked*. No fabricated claim of official verification.
- For the historical working mock assume 120 × 2.5, −5/6 wrong and 120 minutes **only when selected as a working practice profile**, never certify 120 questions as the 2026 Appendix I exam structure. Other question/score profiles remain configurable; no special APFC scorer.
- Encourage four-option, one-defensible-answer MCQs, source-backed distractor rationale and exceptions as editorial QA; unresolved current-law or commencement evidence goes to review.

## 8. Engineering discipline and non-regression constraints

Use the established **five-stage** implementation and source verification protocol for **each separately authorized P57 subpass**: (1) inspect actual source and red/gap, (2) design scope/invariants, (3) bounded implementation, (4) source-level objective-by-objective reconciliation, (5) targeted adversarial tests + **full exact-source CI** (Node/TypeScript, real offline Chromium, Firefox, WebKit, reproducible guarded standalone HTML). No feature-complete assertion based on old green fixture tests alone.

Immutable protected boundaries: CGL source/reviewed and Q62, editor vendor adapters and KaTeX, six-kind scorer and partial marks, NAT tolerance, source hashes/IDs, file:// CSP and no network, original results, review embargo, storage/CAS/backup, responsive 195px+140% and physical-section-vs-subject taxonomy. Do not introduce migrations for their own sake. The one-file distribution size should be measured; keep optional AI/CLI code **out of the runtime artifact** unless truly used there.

**Evidence required for closure:** per-pass source diff, real red-before/green-after tests of identified defects, AI-external format fixture, passing exact CI run/source SHA, guarded deterministic HTML SHA if changed, explicit deferred/manual gates and an honest outstanding-issues list. An agent should run entirely on local source files with no connector installation as a prerequisite.

## 9. Decision checklist for the next session

- Confirm P57-A/B/C boundaries before writing code, then implement incrementally. Resolve whether AI source format is `practice-desk-bank` v2 or a new external `practice-desk-authoring` format **from source evidence**, not guesswork; avoid parallel importers with inconsistent semantics.
- Choose canonical round-trip conversion between external format and Wordgard editable draft, especially per-question source evidence and rich content. No hidden lossy conversion.
- Decide exact duplicate fingerprint vs near-duplicate triage and publication policy; flag rather than delete when uncertain.
- Choose stable review/audit fields, safe limits, and batch transaction model within existing IDB and offline file limits.
- Establish a minimal user-friendly agent handbook and reproducible CLI command examples.
- Treat **P57 proposal** separately from actual CAT/APFC bank content production and from deferred Mac/iPhone/Android/AT/human visual release approval. No implementation authorization is implied by recording this plan.

## 10. Traceability

- [As-built authoring guide](QUESTION_BANK_AUTHORING.md) (simple MCQ/NAT, advanced packages, Wordgard flow).
- [Current source architecture](CURRENT_ARCHITECTURE.md), [domain data contracts](DATA_CONTRACTS.md).
- [Existing P56 independent integration audit](../audits/P56_INDEPENDENT_INTEGRATION_SOURCE_AUDIT_2026-11-05.md).
- Primary implementation references: `src/app/bank-import.ts`, `src/app/exam-package.ts`, `src/app/library-controller.ts`, `src/app/authoring-controller.ts`, `src/authoring/authoring-draft.ts`, `src/authoring/authoring-publisher.ts`, `src/authoring/authoring-studio.ts`, `src/domain/question.ts`, `src/domain/validate.ts`, `src/app/practice-compose.ts`, `src/learning/syllabus-taxonomy.ts`.
- Existing QA: `tests/exam-package-and-import.test.mjs`, `tests/p47-publication.test.mjs`, `tests/p54-authoring-integrity.test.mjs`, `tests/p56-integration-audit.test.mjs`, `scripts/acceptance-bank-modes.mjs`, `scripts/acceptance-authoring-publication.mjs`, `scripts/acceptance-p53-taxonomy.mjs`, `scripts/acceptance-p54-authoring.mjs`, `scripts/acceptance-p56-integration.mjs`.
- Last independently source-checked preceding software gate: [CI 41972883171](https://github.com/oneshubhamt/practice-desk/actions/runs/41972883171) 5/5, 319/319 Node, three browsers and guarded HTML-only publication for a separate four-state review-colour improvement; **not** evidence P57 exists.

**Ownership:** Plan only. **Implementation intentionally deferred to a new conversation/session on explicit authorization.**
