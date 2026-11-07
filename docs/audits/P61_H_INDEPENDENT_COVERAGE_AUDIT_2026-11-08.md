# P61-H — independent test-coverage audit and adversarial counterexamples

**Date:** 8 November 2026 · **Baseline source:** [`92e85085ac2169eb25d8587b8d788ec30834b6a2`](https://github.com/oneshubhamt/practice-desk/tree/92e85085ac2169eb25d8587b8d788ec30834b6a2) on `overhaul`.
**Scope:** inspect production contract owners, the 41 surviving `tests/*.test.mjs` suites, browser suite manifest, mutation runner, and prior P61 evidence. **Not** an independent verification of actual exam facts, PDF visual transcription, physical devices or release accessibility.
**Status: VERIFIED AND COMPLETE.** [Exact-source five-job GitHub Actions CI run 42410337888](https://github.com/oneshubhamt/practice-desk/actions/runs/42410337888) succeeded at source commit [`12e7ba7e83b64a53914b85fcb98434564cb0dccb`](https://github.com/oneshubhamt/practice-desk/commit/12e7ba7e83b64a53914b85fcb98434564cb0dccb). All 408 Node tests, ten targeted mutations, 72 distinct browser journeys and guarded publishing passed.

## Method and disposition

1. Inspected concrete source paths and surviving test registrations, including scoring, paper schemas, PDF intake CLI, signed backup v4, concurrency/recovery, rich authoring, six-kind compilation, learning/FSRS, source/reviewed comparisons and exact cross-browser journey manifest.
2. Matched risk to independent reference, adversarial, integrated and browser witnesses. **Names and previous green runs were not treated as proof that an assertion checks a risk.** The scorer's original 200-seed policy reference, for example, generates **single-choice questions only**, although separate tests check six kinds.
3. Contrasted candidate smoke-test retirements with remaining unique controls. No evidence-supported further mass deletion was found: many similar names reflect intentionally different layers (pure policy vs persisted record vs candidate browser, forged manifest vs compact snapshot vs recovery).
4. Specified four new deliberately faulty changes and one six-kind metamorphic reference test; preserve existing unique tests. The new mutation gate is a **test-sensitivity sample**, not code coverage, independent authenticity, or a claim that all defects will be detected.

## Contract × source × surviving witness matrix

| Priority / contract | Actual production owner | Primary executable witness | Audit finding |
|---|---|---|---|
| P0 Score exactness and overrides | `src/engine/scoring.ts`, `src/engine/score-ceiling.ts` | `tests/exam-scoring-and-policy.test.mjs`: 200-seed independent precedence/ledger/bounds model, partial credit cap, APFC exact one-third penalty; `tests/exam-package-and-import.test.mjs` for six-kind journey | **Strong with specific gap:** prior generated scoring reference was single-choice only. Add a 128-seed independent six-kind ledger and response/key-ID permutation invariance test; never retire the separate signed-package tests |
| P0 No answer-key disclosure before permitted review | `src/app/exam-view.ts`, `src/authoring/candidate-integrity.ts`, `src/authoring/authoring-publisher.ts` | `tests/p60c-question-quality.test.mjs` candidate source/text leakage checks; `tests/p56-integration-audit.test.mjs` review embargo; `scripts/acceptance-critical.mjs` and editorial provenance journeys | **Partial:** candidate-text/key checks exist; P60-01 **explanation-only asset visibility** remains a separately recorded unimplemented source-audit finding; not silently closed here |
| P0 Content hashes and hostile fields | `src/domain/integrity.ts`, `src/domain/validate.ts`, `src/app/exam-package.ts` | `tests/p48-security-integrity.test.mjs` 18 hostile nested fields, legitimate six-kind and APFC/NAT positive controls; `tests/p60c-question-quality.test.mjs` independent review limits | Sound local schema/hash coverage. **Hash ≠ authentic reviewer/PYQ**; fail-closed checks cannot establish correct external facts |
| P0 Frozen score, review and history | `src/history/shared-store.ts`, `src/app/stored-record-validator.ts`, `src/history/frozen.ts` | `tests/history-and-persistence.test.mjs`: frozen key, 576-case independent saved/mirror recovery model; `tests/p48-recovery-integrity.test.mjs`: quarantined corrupt sibling and forged snapshot; `scripts/acceptance-partial-recovery.mjs` | Keep both surviving unit and browser witnesses: one verifies recovery precedence, the other snapshot-level contamination |
| P0 Transaction/CAS and additive restore | `src/history/concurrency.ts`, `src/history/backup.ts`, `src/history/shared-store.ts` | `tests/history-and-persistence.test.mjs`: 250×150 seeded two-tab interleavings, 200-seed idempotent additive merge, 0/1/7/101/5000 records/manifest/checksum; `tests/p48-security-integrity.test.mjs` unknown-field hostility | Strong synthetic invariants. Add **backup checksum-bypass mutant** to prove one independent witness really detects tampered payload |
| P0 Source/Reviewed identity | `src/engine/source-comparison.ts`, `src/app/exam-families.ts` | `tests/content-and-provenance.test.mjs`: all five/ten CGL source/reviewed editions, 6 Oct Q62 caution vs invalid; `tests/p60d-editorial-editions.test.mjs` source bytes, omitted/stale decisions, pairing rules | Preserve source-vs-reviewed witnesses. P60-03/04/05 are **deferred audit findings**, not resolved by green parity tests |
| P0 Verified AI/PDF intake boundary | `scripts/pdf-ingest.mjs`, `scripts/question-quality.mjs`, `scripts/editorial-editions.mjs` | `tests/p60e-pdf-ingest.test.mjs`: 7 real structured synthetic PDF/doc scenarios, page/key identity, incomplete intake, CLI malformed-header/trailer rejection, stale decisions; `tests/p60c-question-quality.test.mjs` 20-check review protocol | **Unique; retain all.** PDF code explicitly does not parse/OCR or independently compare printed visual text; test page maps are agent assertions. Add EOF-corruption mutant. Human source comparison still mandatory |
| P0 Authoring integrity, mathematical/media content | `src/authoring/authoring-publisher.ts`, `src/domain/rich-document.ts`, `src/authoring/candidate-integrity.ts` | `tests/authoring-domain.test.mjs`: six-kind source-hash publication→actual scoring, input rejection, six-kind tamper, 128 seeded rich strings × four boundary variants; `tests/p57c-authoring-staging.test.mjs` draft/staging | Strong layer separation. Publisher hashes protect local stability, **not independent truth**. Keep actual editor browser journeys; do not fold into pure schema tests |
| P1 FSRS and learning privacy | `src/learning/learning.ts`, `src/learning/fsrs-scheduler-adapter.ts`, `src/learning/revision-selection.ts` | `tests/learning-and-analytics.test.mjs`: 300-seed evidence progression, 90 six-kind cases, explicit FSRS rating/replay, topic/source separations; `tests/revision-evidence.test.mjs` due and review-permitted filters | Preserve unique learning review and source-exam boundaries. Add **explicit rating-overwrite mutant**. These tests do not establish actual long-term human learning improvement |
| P1 Media, editor, narrow viewport | `src/app/image-viewer.ts`, `src/app/exam-view.ts`, `src/authoring/*` | `tests/p47-image-viewer.test.mjs`, `tests/p47-image-preparation.test.mjs`; `scripts/acceptance-p58c-scale.mjs`: real 400-staged/200-selected stress and 195px/140% checks | Keep distinct viewer geometry, MIME/source media, signed import and actual browser geometry. Linux WebKit is not physical Mac Safari |
| P1 Offline navigation/accessibility | `src/app/navigation*.ts`, controller/UI runtime | `scripts/acceptance-navigation.mjs`, `scripts/acceptance-ui.mjs`, `tests/p47-pure-modules.test.mjs` | Native/fallback and focus assertions exist; **actual** macOS Safari, screen-reader, IME, mobile-device and storage-eviction tests remain external release gates |
| P1 Agent integration and scale | `scripts/content-blueprint.mjs`, `scripts/question-bank-cli.mjs`, source authoring | `tests/p60a-agent-capabilities.test.mjs`, `tests/p60b-content-blueprint.test.mjs`, `tests/p60f-agent-handoff.test.mjs`, `tests/p58c-independent-scale.test.mjs` | Keep 400/200 and agent handoff tests: separate source/CLI risks. A complete machine blueprint does not certify sourced APFC/CAT/PYQ correctness (P60-02, P60-07 deferred) |

## Explicit nonduplicate cases that must remain

- **Pure scorer vs six-kind package vs browser candidate result:** the 200-seed rule/ledger oracle uses synthetic pure data, the signed package demonstrates valid six-kind import, and the browser verifies user-visible release and navigation. No single test supersedes all three.
- **Backup checksum vs compact snapshot vs corrupt-sibling recovery:** checksum protects transport byte consistency; snapshot verification protects frozen source/key integrity; quarantine prevents one bad row from destroying valid siblings.
- **PDF intake vs P60-C quality assessment vs reviewed-source pairing:** they answer three different questions—document identity/page claims, independent review-record completeness, and edition/key lineage.
- **FSRS schedule vs revision inventory vs aggregate learning evidence:** one replays explicit ratings, another selects privacy-eligible source evidence, and the third measures attempts/topics without fabricated certainty.
- **Image preparation vs viewer geometry vs 195px/140% browser stress:** media provenance/optimization, math/keyboard behavior and actual layout are different oracles.

## Mutation-gate independent challenge

**P61-G baseline:** `scripts/mutation-sensitivity.mjs` demonstrated six hand-picked semantic faults, requiring baseline named PASS then same named test assertion FAIL in a temporary source copy. The harness restores and SHA-checks source bytes and removes the sandbox; CI fails closed. **Limits:** selected one-at-a-time mutants only, exact-text mutation anchors can drift, named tests do not constitute a global mutation score, the sandbox shares installed dependencies, and the gate by itself cannot establish PDF transcription or legal factual truth.

**P61-H expansion:** four additional named mutants, each verified against actual CI:
1. Single/multiple-choice scorer incorrectly accepts overlapping rather than exactly matching selected options → new 128-seed six-kind independent reference.
2. Backup v4 skips SHA-256 core-payload comparison → pre-existing 0–5000-record checksum property must detect.
3. PDF CLI ignores missing `%%EOF` trailer → pre-existing corrupt-PDF end-to-end CLI test must detect.
4. FSRS explicit `Good` rating is silently rewritten as `Again` → pre-existing rating/replay test must detect.

**New property:** 128 seeded experiments jointly cover all six question kinds, independent verdicts/marks and caps, and the metamorphic requirement that a bijective rename of candidate/key option and matching IDs plus order permutations **must not change scored outcomes**. This is an additional registration, not a removal or substitute for validated authoring.

All four new mutants were detected by named assertion failures while the corresponding unmodified targeted tests passed. A future surviving mutant must be treated as a test failure, not silently retired or used to justify production changes.

## Delivery and open items

- **Verified:** retained 41 existing Node suite modules, **407 → 408 test cases** (one new six-kind model), and **72 unchanged browser journeys** across Chromium/Firefox/Linux WebKit; selected semantic mutants **6 → 10**.
- No production `src/` changes and no blanket test retirements. Correct stale branch/CI descriptions in current guidance.
- Remaining P61-I is the **final independent source-to-ledger reconciliation, release-gate regression, and documentation closure**, not permission to skip physical Safari, accessibility or source-authenticity reviews.
- Pending P60-01/02/03/04/05/07 findings, actual PYQ/statutory content checks and real user/device verification remain explicitly out of scope.

## Independently observed execution evidence

Source SHA: `12e7ba7e83b64a53914b85fcb98434564cb0dccb`. [GitHub Actions run 42410337888](https://github.com/oneshubhamt/practice-desk/actions/runs/42410337888), five jobs **SUCCESS**, 232 s created→updated. Logs inspected:
- Strict TypeScript, deterministic build and Node contracts: **408 tests passed, zero failed**.
- Isolated mutation witness runner: **10/10 selected mutations killed**, each with a baseline-green target and mutated **named assertion failure**. New four: multi-select overlap, v4 digest bypass, PDF missing `%%EOF`, and FSRS Good→Again rewrite all killed.
- Browser source-mapped journey logs: **32 unique Chromium, 20 unique Firefox, 20 unique Linux WebKit** scenarios. No scenario removed or silently skipped; all three engine runs passed.
- Guarded publisher: **SUCCESS** after core and all browsers.
- Production files under `src/`, exam/example banks and user-facing HTML unchanged. Exact-SHA Git comparison shows only one Node test file, one test-only mutation script, and audit/current engineering guidance.
- Actual CI wall **232 s**, compared with merged baseline run 42381748128; hosted runner timing is observational, not controlled throughput proof.

**Disposition:** No further unconditional test deletions in P61-H. Complementary safety cases are retained. The **only remaining planned P61 pass is P61-I**, final programme-wide consistency and closure, after which independently verified content and physical device/release constraints remain external.
