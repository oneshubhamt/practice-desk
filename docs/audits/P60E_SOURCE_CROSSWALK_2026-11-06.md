# P60-E source-to-acceptance audit — 6 November 2026

**Repository:** `oneshubhamt/practice-desk`; **branch:** `Satyam`; **source starting HEAD:** `7dacde4d0a987919b03b70329bdf6b9f1f50a8dd`. **Status:** source implementation and targeted tests committed; final exact-source CI and release holds must be evidenced separately.

## Independent baseline inspection

Directly re-read `AGENTS.md`, `docs/ENGINEERING_PROGRAMME.md`, P60-A/B/C/D/E programme and quickstart, `src/authoring/external-bank.ts` canonical source schema, `scripts/question-bank-cli.mjs`, `scripts/question-quality.mjs`, `scripts/editorial-editions.mjs`, `scripts/content-blueprint.mjs`, existing `src/app/exam-families.ts`, `src/engine/source-comparison.ts`, `src/engine/review-source.ts`, P60-C/D tests and `.github/workflows/ci.yml`. Existing source v1, P60-C blinded independent review ledger, P60-D separately signed source/reviewed paired compiler and source-aware frozen score handling already exist. **A second question schema, PDF understanding runtime, scorer, storage or importer is unwarranted.**

## Requirements and implemented mechanisms

| Requirement | Actual implementation and fail-closed test | Still not established |
| --- | --- | --- |
| Input identity and key file | `scripts/pdf-ingest.mjs` checks actual supplied document/key bytes (size, SHA-256, basic PDF header/trailer), binds source JSON SHA | PDF printed words, publisher authenticity, OCR accuracy |
| Pages and numbering | Manifest claims exact page census, inspected/missing pages, source pages, expected printed question count, omissions and printed numbers unique *within physical section* | True PDF page count, implicit skipped questions despite a false manifest |
| Individual extraction fidelity | Every source question, shared passage/table and embedded image has individual JSON fingerprint, page references, status, notes and unresolved uncertainties; frozen question `provenance.sourceNote` cites a declared page | Actual optical text/math/diagram comparison by software |
| Source key vs corrected answer | Original key must cite its page in the source or a byte-bound distinct key file, otherwise rejected; P60-D separately attributes reviewed changes, decisions and source-key comparability | Examiner's correct answer or key-sheet authority |
| Maths, figures and notes | Rich-math detection and mandatory maths check; media visual-inspection check; original vs editorial explanation origin; attributed inspector and date | Visual/semantic correctness, true reviewer identity |
| Independent educational QA | Reuses P60-C source-bound independently proposed answer, 20 check records and canonical answer-leak blocking; no second QA engine | Source fetching, legal and PYQ factual truth, actual blinded independence |
| Subject and difficulty coverage | Optional existing P60-B blueprint exact audit on reviewed source | True difficulty and syllabus correctness |
| Publication and original preservation | Strict `compile` invokes P60-D canonical publisher, original and reviewed exact raw archives, separate signed exam packages and lineage; adds PDF provenance sidecar in a **new** folder | Auto import/cloud/device access; PDF itself archived by user outside application |
| Minimal agent context | Quickstart, task-specific contract and three compact `template/audit/compile` commands; bounded, answer-free result | Model token cost and actual end-user factual accuracy (not measured) |
| Nonregression | Only new external script/test/docs/contract; no source runtime, History, FSRS, scoring, CGL, Wordgard, backups or other branch edits | Physical Mac/mobile/AT/IME/storage/human UI validation |

## Targeted adversarial evidence

`tests/p60e-pdf-ingest.test.mjs` creates an actual two-page *synthetic* binary PDF with a shared CAT passage, table, inline rich TeX and embedded PNG figure, source keys and four source-bound questions; tests byte identities, missing/cropped pages, page overlap, unanswered key, unverified TeX/image, stale single-question fingerprint and raw source SHA, duplicate printed number within a section, unexplained omission, missing provenance, no automatic publication, exact original/reviewed source raw bytes and existing P60-C/D reviewed correction pipeline. It also tests corrupt or replaced PDFs, intentional output overwrite and stale decisions. Tests verify **mechanical rejection only**; they do not show real image recognition or authentic historical paper comprehension.

Initial [CI 42185124538](https://github.com/oneshubhamt/practice-desk/actions/runs/42185124538) exposed two test fixture mistakes (duplicate number across distinct physical sections; P60-C numeric review answer supplied as array), corrected. [CI 42185762044](https://github.com/oneshubhamt/practice-desk/actions/runs/42185762044) revealed malformed TeX detection regex and was corrected. Exact-source full CI final run/commit not yet verified; record only after 5/5 jobs and source ref are read. Source/footer/publisher claims and inspector attestations remain **unverified**; original keys missing from supplied documents cause a deliberate HOLD, not imputation.

**External/release boundary:** user-supplied real PDF against output, human/AI visual comparison, official exam/PYQ source identity, independent reasoning and citations, current law, physical Safari/mobile/AT/OS-loss, manual UI approval and distribution/merge remain HOLD. P60-F not started. No edits allowed to `main`, `overhaul`, `baseline/v11`.
