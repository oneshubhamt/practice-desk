# Practice Desk — Pass I: residual assertion audit

**Scope:** bounded residual cleanup on `working`, after the completed A–H consolidation. No production behaviour, suite reorganisation, test-count target or browser-matrix change is part of this pass.

## Decision rule

Every candidate was judged as:

`risk → invariant → existing independent witness → disposition`

An assertion was changed only when it depended on incidental source/markup shape and a stronger semantic witness could replace it without weakening the protected behaviour. Exact text, ARIA, IDs/data hooks or HTML structure were retained where they are themselves security, accessibility, truthful-disclosure, interaction-wiring or distribution contracts.

## Replaced candidates

| Risk | Invariant | Existing independent witness | Pass-I disposition |
|---|---|---|---|
| History false trend | Insufficient comparable evidence must not render a trend | history metrics/model tests | Replace `history-sparkline` CSS-class absence with absence of the accessible trend-image contract |
| Result pacing | Every frozen section receives visible/accessibly named coverage evidence | canonical attempt evidence and result calculations | Replace exact “Section diagnostics” heading with one progressbar per section and accessible section-coverage labels |
| Question coaching | Rendered coaching must expose the computed suggestion and an accessible action for the longest question | direct `studySuggestions` / `longestQuestionExposure` assertions | Remove three exact headings and internal `data-ledger-q` dependency |
| Math fallback | Invalid TeX remains visible, safe and accessible | malicious-TeX escaping tests | Replace `pd-math-fallback` class dependency with semantic `role="math"` plus existing accessible label/safety assertions |
| Rich question control | Rich authored math still renders an operable answer control | six-kind control tests | Replace `generic-choices` CSS class with actual radio-input semantics |
| Rich table | Authored table stimulus survives import/rendering | table-content and package-integrity tests | Replace `scroll-table` class dependency with semantic `<table>` presence; layout class remains production-owned |
| History all-time metrics | Archive filters must not change all-time summary values | independent 128-query filter model and immutable-record assertions | Remove brittle class-delimited HTML slicing and `summary-stat` count; compare visible label/value pairs under full and filtered queries |
| App composition | Every application controller belongs to the composition graph; controllers are acyclic and vendor-isolated | parsed esbuild import graph | Replace hard-coded controller filename lists/direct-import requirement with dynamically discovered `*-controller.ts` set and transitive reachability from `generic-ui` |

## Reviewed and retained

The following apparent source/presentation assertions remain intentionally:

- **Security/secrecy:** absence of pre-reveal answers, unsafe markup, remote resources and private source data.
- **Accessibility:** ARIA roles/names/states, MathML, keyboard/focus semantics and descriptive media labels.
- **Truthful policy/provenance:** scoring, timing, pause/navigation rules, source/reviewed status and official/non-official disclaimers.
- **Interaction wiring:** stable IDs/data attributes that are active controller hooks where the corresponding interaction is not otherwise completely proven at a cheaper layer.
- **Distribution/layout safety:** CSP/offline-resource assertions and the bounded negative-width clamp check.
- **Cross-surface media launch:** launcher hooks remain because stimulus, candidate, frozen-review and source-review surfaces are distinct ownership boundaries.

These were not retained merely because they already existed; each corresponds to a product or integration contract.

## Stop condition

Pass I is complete when the changed tests preserve their case identities, the Node suites and browser/release gates remain green, and no remaining audited assertion is classified as an incidental phrase/class/filename dependency without an explicit contract.

No reduction in test count is expected or required.


## Verification

Final executable source: `206d809d516f098ebbb310a42cd7be82006de8ea`.

GitHub Actions run [43593749612](https://github.com/oneshubhamt/practice-desk/actions/runs/43593749612) passed the complete required release path: Fast, Chromium Smoke, Firefox Cross, WebKit Cross, Deep, targeted mutations, native/WASM parity, deep Chromium scenarios and guarded Publish.

The pass changed five test files plus QA documentation only. Production source and generated application behaviour were not modified. Existing test titles and the permanent 450-case / 14-scenario topology were retained.

Two intermediate Fast runs correctly rejected an initially over-specific semantic-history fixture expectation (`Papers practised`). The final expectation was reconciled to the production metric's documented identity of unique `examId | paperId` pairs, after which the full release path passed. These failures were test-oracle corrections, not production changes.
