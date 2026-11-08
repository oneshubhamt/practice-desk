# Practice Desk — unresolved risks and separately proposed work

This is the current backlog, **not** a programme/pass diary. Every finding below requires renewed source inspection and a reproducible test or other credible evidence before remediation is claimed. P61 test consolidation is complete; this list does not reopen it.

## Product correctness and source trust

| ID | Finding to examine | Primary owner | Priority |
|---|---|---|---|
| P60-06 | Earlier AI guide versions contradicted deployed capabilities | Active guides consolidated; reverify CLI/source when designing new agent work | Documentation follow-up |
| P60-07 | Agent-supplied citations and quality/temporal labels cannot independently verify factual truth | `scripts/question-quality.mjs`; external primary-source review | High: content trust |

These are unresolved concerns requiring new source-level evidence; they are separate from P61's test-bench work.

## P62-A addressed (8 November 2026)

- **P60-01 — Candidate media exposure:** The publisher now distinguishes candidate `assetIds` from signed solution-only `explanationAssetIds`. Both remain available in frozen resources, but the examination renderer uses only candidate-visible references. This is UI-level secrecy, **not** a claim that offline package bytes are inaccessible to a technically capable user.
- **P60-02 — Partial blueprint readiness:** Partial batches may be `valid:true` but cannot be `readyForPublication:true` until the requested count and allocations are satisfied. Compiler, paired-agent/PDF handoff and publish gates reject incomplete plans; read-only assessments can continue.

Evidence: [source fix](https://github.com/oneshubhamt/practice-desk/commit/bd8a9e6dd378e3d757313dd2c6deb0b2d14a05a6) · [passing CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42484839413) (TypeScript, Node contracts, mutation tests, Chromium, Firefox, WebKit, guarded HTML). Real source authentication remains separately open.

## P62-B addressed (8 November 2026)

- **P60-03 — Exact Source pairing:** New P60-D Reviewed packages embed `sourcePaperRevisionId` and `sourceAnswerKeyRevisionId` in their hash-bound paper revision. The Library selects those exact identities; missing matches disable the advisory Source comparison. Unbound older packages pair only when the source candidate is unambiguous; there is no assertion of original provenance authenticity.
- **P60-04 — Mixed response kinds:** New schema-3 Source-key references retain per-question unavailable rows, including unsupported numerical/non-MCQ items, rather than discarding otherwise comparable MCQs. Frozen schema-2 records remain validated unchanged; unsupported schema 1 is rejected.
- **P60-05 — Semantic comparability:** Candidate-visible wording, options, media and stimulus determine the new semantic digest. Explanations, academic classifications and difficulty tags do not affect Source-key comparability. Actual frozen marks are untouched.

Evidence: [implementation and browser assertion](https://github.com/oneshubhamt/practice-desk/commit/f5b6a259247f35b66864db3540283c6a48daf40c) · [passing CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42498768267) (414 Node, mutation checks, Chromium, Firefox, WebKit and guarded build). Independent source authenticity remains open.

## P62-C enforcement (8 November 2026)

- P60-C quality review keeps the **20 existing checks** and now requires explicit `mathematical`, `legal` and `timeSensitive` declarations per question. A positive category enforces the relevant checks; legal/temporal assertions additionally require a matching as-of date and identifiable, reviewer-attributed source evidence. Heuristics still flag contradictions, including omitted math/legal cues.
- New review sidecars are v2; previous v1 files cannot authorize strict publication without re-review. The optional quality gate does not modify authored keys, frozen attempts or History.
- **P60-07 remains open as a factual-trust limitation:** a reviewer can misclassify an unrecognized question or report inaccurate evidence. Recorded attestations are not independently fetched/authenticated by the offline software.

Evidence: [P62-C source and regression tests](https://github.com/oneshubhamt/practice-desk/commit/dd20f02acd1e3660e72974d819d37647e1f67621) · [passing CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42504775263) (416 Node tests, mutation checks, Chromium, Firefox, WebKit, guarded publication). Software tests do not prove source accuracy.

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
