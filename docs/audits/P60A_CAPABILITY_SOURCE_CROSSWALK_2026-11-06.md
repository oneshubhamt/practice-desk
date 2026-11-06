# P60-A independent source-backed capability crosswalk — 6 November 2026

**Branch:** `Satyam`. **Authority:** [P60 target programme](../architecture/P60_AI_NATIVE_CAPABILITY_PROGRAMME.md), [machine capability contract](../contracts/practice-desk-capabilities.v1.json), [agent guide](../AI_APPLICATION_GUIDE.md). **Status:** targeted source inspection and 27 referenced path existence checks performed. Contract tests authored; **exact-source CI full gate not yet confirmed**. Neither cited code nor tests establish legal/PYQ accuracy or release readiness.

## Method and status semantics

Re-read current P59 quickstart and CLI, P57 external-bank parser and quality inspector, key type/engine, exam family and practice composition, navigation, learning evidence, current CGL source/review semantics and local backup. Cross-check each claimed capability against live named owners, distinguish **implemented** from **implemented-with-limits** and proposed P60-B–F. These references are evidence of implementation **scope**, not an exhaustive behavior proof. A CI pass can certify its automated cases, not unknown hardware or source truth.

| Capability ID | Direct source evidence inspected / source ownership | What is actually available | Limit or caveat requiring honest agent wording |
| --- | --- | --- | --- |
| `exam-catalog` | `src/app/exam-families.ts`: `BUILTIN_CGL_FAMILY`, `familyIdFor`, `examFamilyCatalog`, `pairedEdition`; `src/app/library-controller.ts` | Built-in SSC CGL distinguished from imported sources; actual paper edition selection | Imported examId does not confer official identity; no bundled verified universal APFC bank |
| `question-and-scoring` | `src/domain/question.ts`: six `QUESTION_KINDS`; `src/engine/scoring.ts`: `scoreAttempt`, answer matching, componentMarks, free-response pending | One generic scorer, six kinds, optional component partial marks and explicit pending manual free-response | Frozen key is an implementation record, not factual truth or an independently authenticated answer |
| `timing-navigation` | `src/app/exam-view.ts`: `examTimeRemaining`; `src/app/navigation.ts`: native Navigation API/file fragment fallback; `src/app/exam-preflight.ts` | Untimed/whole/section timing and app route handling with configured paper rules | Browser-based WebKit checks do not certify physical Mac Safari or mobile behavior |
| `taxonomy` | `src/learning/syllabus-taxonomy.ts`; `src/authoring/external-bank.ts`; `src/app/practice-compose.ts` | Academic subject/topic/subtopic distinct from exam section; official broad APFC root IDs | Author-submitted labels/difficulty are not expert-certified curriculum facts; quotas proposed for P60-B |
| `practice-builder` | `src/app/practice-compose.ts`: `PracticeFilters`, `practiceInventory`, `composePracticeSet` | Seeded filter and selection from one already frozen valid paper; exact insufficient-stock error | No arbitrary cross-paper composition; not a generated full syllabus coverage audit |
| `history-results` | `src/app/result-controller.ts`; `src/app/history-query.ts`; `src/history/backup.ts` | Actual score records, source/mode-aware history and measured analytics from saved attempts | No agent read API for the user's local private history; no claimed percentile/rank from raw marks |
| `learning-revision` | `src/learning/learning.ts`: learning cards/user error labels/review ratings; `src/learning/revision-selection.ts`: `REVISION_REASONS`; `src/learning/revision-test.ts` | Explicit FSRS-oriented review history, wrong/blank/slow/flagged/due evidence-based selection | Does not determine learner's psychological cause, fabricate unmeasured time or edit scored history |
| `editorial-source` | `src/content/import-cgl.ts`, `src/engine/source-comparison.ts`, `src/domain/question.ts` | Existing CGL original/reviewed and caution/source-key semantics, source-key scoring only where identical enough | Cross-exam universal original/reviewed chain is P60-D **planned**, not implemented |
| `ai-authoring` | `scripts/question-bank-agent.mjs` inspect/show/patch; `scripts/question-bank-cli.mjs` validate/qa/compile; `src/authoring/external-bank*.ts`; `src/authoring/authoring-exchange.ts` | Strict external AI v1 source; bounded inspection; SHA-guarded create-new patch; existing Wordgard source staging, QA and immutable publication | It does not fetch/read primary sources, authenticate PYQs/reviewers or control browser automatically |
| `rich-media` | `src/authoring/external-bank.ts`: shared stimuli, media and rich text; `src/app/image-viewer.ts`; `src/app/katex-math-adapter.ts` | Shared passages, charts/tables/images and local mathematical display/figure zoom | PDF extraction is not present in offline app; assistive technology and physical clarity externally untested |
| `offline-data-recovery` | `src/history/backup.ts`: `BackupV4` and deduplicated snapshots; `src/app/bank-import.ts`, `src/app/exam-package.ts` | Device-local offline import, immutable source checks and exported history v4; separate Wordgard/stage export path described in current authoring guide | History v4 excludes unpublished staging/draft shelf, cannot recover data after all physical copies are lost |

**Existence check:** 27 unique source paths referenced in the v1 machine catalogue were checked against `Satyam` via connected GitHub file reads on this date; 27 paths were present. A path's presence is **not** source-level behavioral proof. Deeper independent source and QA tests are required when implementing each subsequent action.

## Bounded read-only discovery baseline

`scripts/practice-desk-capabilities.mjs` reads only the same local versioned JSON and exposes `summary`, `list`, `show <id>`, and `operations`. It cannot inspect IndexedDB, the browser, local data, a PDF or internet sources. `tests/p60a-agent-capabilities.test.mjs` asserts version/unique capability IDs, existence of source links, bounded summary/list output, focused single-capability lookup, explicit nonavailability of P60-B–F, and refusal of bad/unknown commands.

**Evidence not claimed:** no final Node 24/strict TS/complete browser/guarded publisher run has yet been confirmed for the latest `Satyam` commit. No independent external factual/official source verification was performed. Physical Mac/iOS/Android, AT/IME/OS eviction, user UX approval, release and merge remain separate holds. Tests protect defined facts/behaviors only, not every statement in future guides.

## Before closing P60-A

1. Run new tests **under the repository's pinned Node 24** and repair any contract/test drift.
2. Run full existing exact-source five-job CI and confirm both current source SHA and generated HTML.
3. Validate headless `summary/list/show/operations` output sizes and errors in the actual checked-out repository.
4. Recheck contract claims from current owners, not merely historical descriptions; update this crosswalk and catalogue for discrepancies.
5. Update [engineering ledger](../ENGINEERING_PROGRAMME.md), [current QA](../QA_CURRENT.md) and [policy register](../decisions/POLICY_REGISTER.md) with actual test evidence. Only then mark P60-A automated software complete. Do not start P60-B without user authorization.
