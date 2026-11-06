# P60 — Full QA of AI-first question-bank pipeline

**Date:** 6 November 2026 · **QA branch:** `Satyam` · **Target:** `overhaul`

**Exact-source result:** [GitHub Actions 42269392249](https://github.com/oneshubhamt/practice-desk/actions/runs/42269392249) — **5/5 jobs PASS** on `e273d82ddf3a13f948342fa581c6868ab205e697`: strict TypeScript, reproducible build, **431/431 Node tests**, actual offline Chromium/Firefox/Linux WebKit journeys and guarded HTML publisher. Publisher advanced only `Practice_Desk_Offline_Mock_Tests.html` in generated-file commit `38f526613f1d3f9d1bed4d98cbef95a6712230da`; the code and test source remained unchanged.

## Method and source coverage

Read the original [P60 objective](../architecture/P60_AI_NATIVE_CAPABILITY_PROGRAMME.md), [capability contract](../contracts/practice-desk-capabilities.v1.json), [quickstart](../AGENT_AUTHORING_QUICKSTART.md), current code and source-level regression results. Inspected `src/authoring/authoring-publisher.ts`, `candidate-integrity.ts`, `external-bank.ts`, `external-bank-qa.ts`, the local agent and canonical CLI, coverage, quality-review, PDF ingestion, editorial original/reviewed publication, source comparison, offline Library, scoring and learning entrypoints.

This was **not** a rubber stamp of the existing completion assertions: source inspection generated new defects, corrected at source, then checked by the real project CI.

## Confirmed defects corrected

1. **Candidate answer leakage in manual/Wordgard publication.** The authoring publisher did not apply the explicit-answer guard that the external AI bank used; private passages and rich shared material were not fully inspected. The shared publisher now applies the canonical candidate-only guard. The guard scans private passage, rich passage/case, rich tables, rich captions and referenced image alt text. Pure rich-to-plain text logic was extracted to `src/authoring/plain-rich-text.ts` to avoid a circular import. Negative tests exercise the actual draft route.
2. **Diagnostic loss after shared validation.** With the above guard added, the external AI bank would fail as a generic `publication-invalid` instead of the precise `candidate-answer-leak`. `src/authoring/external-bank.ts` now preserves the original question ID/field/code; old and new adversarial tests pass.
3. **High-confidence answer markers omitted.** Explicit option annotations such as `(correct)` and `Correct choice: B` are now rejected without wrongly treating a legitimate checkmark-symbol response as a marked answer.
4. **Unusable bundle file paths.** Paired/PDF `writtenFiles[].file` previously returned filenames relative to an unspecified current directory. The local handoff now returns full output paths, with SHA-256 hashes. Tests verify single-file and five-file paired output paths.
5. **Real-source strict publication gap.** Both source-attributed APFC 2023 vocabulary and CAT 2024 math reconstructions now pass a complete mechanical `prepare → fill-review → assess → strict publish → validate package` test, plus no-overwrite and stale-source rejection. The test review is **explicitly synthetic**, not a genuinely blinded independent reviewer.

## P60 objective crosswalk

| Area | Implemented and tested | Boundary not silently certified |
|---|---|---|
| **A — low-context discovery** | 16 capability descriptions, 21 discoverable local CLI operations, concise quickstart | No embedded model or network/user-device bridge |
| **B — content planning** | Validated quotas, topic allocations, explicit partials, cognitive tags, comparison of supplied prior banks, near-duplicate review candidates | Subject-matter fit, genuine cognitive difficulty and semantic equivalence require judgement |
| **C — QA** | Required SHA-bound 20-check review, key-hidden blind packet, deterministic answer/math checks, rich/manual/external leakage blocking | Reviewer identity, source fetching and factual correctness are author/reviewer claims, not authenticated by software |
| **D — original/reviewed** | Distinct raw sources and immutable packages, key correction decisions, source locators, conservative source-score comparison | No claimed official correction is certified automatically |
| **E — PDF/intake** | Binary PDF/image hash, page census, per-item/figure/math uncertainty, distinct source/reviewed publication | No app-native OCR and no independently verified full authentic PDF transcription |
| **F/G/H — agent workflow** | `actions/prepare/assess/publish`, staged create-only files, freshness and no-overwrite guards, low-context output, real-source-derived structural acceptance, actual offline import/browser learning tests | Genuine independent blind solution on APFC/CAT examples, real-agent token cost, source authentication and educational uplift not established |

## Regression evidence and visual checks

- **431/431 Node tests**, including targeted leaks, bogus/incomplete reviewer sidecars, stale hashes, arithmetic, cognitive/coverage, correction lineage, PDF unknown keys, exact source snapshots, output atomicity guards and new strict-source mechanical acceptance.
- **5/5 CI jobs green** for offline Chromium/Firefox/WebKit authoring, imports, timed attempts, result-source comparison, FSRS/learning, recovery and guarded publisher. No application scorer, CGL Q62 policy, frozen History, or backup format was modified for P60 QA.
- **Visual review:** directly opened available CI-generated desktop Wordgard authoring, 195-pixel narrow Wordgard capture, Firefox authoring, mobile Library and submitted answer-review screenshots. No obvious horizontal clipping or broken controls observed in these captures. An automated Linux browser run and screenshot sampling do **not** substitute for physical Mac Safari, mobile screen readers or human visual approval.

## External acceptance not completed

Real authoritative/source-connected blind verification for a substantive 10–30-question bank, a complete authentic PDF/figure transcription, real model-token and human editorial workload comparison, physical Mac/mobile/AT and storage-loss acceptance, and user-approved public release remain **HOLD**. These limits must never be written as completed P60 achievements. The four source-attributed sample items are *reconstructions*, not authenticated original official paper transcriptions.

**Integration policy:** The user authorized merging `Satyam` into `overhaul` after QA. Verify the target is an ancestor with zero divergent commits immediately before applying a **non-forced fast-forward**. Do not modify `main` or `baseline/v11` in this integration.
