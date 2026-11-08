# Practice Desk — unresolved risks and separately proposed work

This is the current backlog, **not** a programme/pass diary. Every finding below requires renewed source inspection and a reproducible test or other credible evidence before remediation is claimed. P61 test consolidation is complete; this list does not reopen it.

## Product correctness and source trust

| ID | Finding to examine | Primary owner | Priority |
|---|---|---|---|
| P60-01 | Explanation-only media may be exposed in resources accessible before candidate submission | `src/authoring/authoring-publisher.ts`; `src/app/exam-view.ts` | High: candidate secrecy |
| P60-02 | Partially fulfilled blueprint quotas may be labeled fully publication-ready | `scripts/content-blueprint.mjs`; `scripts/question-bank-cli.mjs` | High: completion integrity |
| P60-03 | Reviewed edition may pair with an incorrect original revision among multiple versions | `src/app/library-controller.ts`; `src/app/exam-families.ts` | High: lineage |
| P60-04 | One unsupported question kind may suppress other valid original-key comparisons | `src/engine/source-comparison.ts` | Medium–high: comparison integrity |
| P60-05 | Taxonomy/explanation metadata may be conflated with answer-semantic comparability | `src/engine/source-comparison.ts` | Medium: false mismatch |
| P60-06 | Earlier AI guide versions contradicted deployed capabilities | Active guides consolidated; reverify CLI/source when designing new agent work | Documentation follow-up |
| P60-07 | Agent-supplied citations and quality/temporal labels cannot independently verify factual truth | `scripts/question-quality.mjs`; external primary-source review | High: content trust |

These are **prior static-source concerns**, not a claim that all seven have been reproduced or fixed. They remain separate from P61's verified *test-bench* scope.

## Independent verification and release gates

- Authenticate imported/external exam papers and key claims against original source documents. Check mathematics, figures, citations, explanations and current statutes with independent reviewers. Supplied-PDF digests and page maps are not visual transcription verification.
- Test **physical** Mac Safari, mobile devices, keyboard/IME and assistive technologies, OS/quota/storage-loss recovery and actual accessibility. Linux WebKit and synthetic narrow-width checks do not certify them.
- Obtain deliberate user visual/usability approval and establish a release procedure before public distribution. Do not infer approval from five-job CI.

## Possible enhancements — separate authorization required

- Richer calendar planning beyond existing FSRS due scheduling.
- Unscored survey/feedback response flows, separate from exam grading.
- Larger source-verified APFC/CAT banks and syllabus/quality calibration.
- Additional test/script restructuring **only** when unique assertion coverage and operational benefit are independently demonstrated; no numerical file-count target justifies losing safeguards.

Read [current programme](docs/ENGINEERING_PROGRAMME.md) for present status, [policy](docs/decisions/POLICY_REGISTER.md) for binding decisions, or [history](docs/HISTORY_INDEX.md) for old implementation evidence.
