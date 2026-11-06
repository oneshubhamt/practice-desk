# P60-D — generalized original/reviewed editorial system

**Branch:** `Satyam`. **Authorization:** user approved P60-D after verified P60-C (6 November 2026). **Implementation state:** source/QA **CLOSED** for automated scope, [5/5 exact-source CI 42179668770](https://github.com/oneshubhamt/practice-desk/actions/runs/42179668770) on `dd10979c211717583ba87eb2a9715b32738e278a` (412/412 Node, strict TS, offline Chromium/Firefox/WebKit, guarded publisher). HTML SHA-256 `1900846adda793e224c3e63ef2fbec6bafdd0b3b2acd3ecc89d5d6a3bbdc541e` unchanged; external factual/PYQ/device/human release remains HOLD. **Authority:** [P60 target architecture](P60_AI_NATIVE_CAPABILITY_PROGRAMME.md), [P60-C content-review protocol](P60C_QUESTION_QUALITY_ASSURANCE.md). P60-E PDF extraction and P60-F agent/app bridging are **not implemented by this pass**.

## Objective

Generalize the existing SSC CGL **Original / Reviewed** semantics to any externally authored APFC, CAT, UPSC, SSC, RBI or future compatible examination **without copying the scorer, History engine or source-comparison module**. An original paper, options, graphics, printed key and provenance must remain separately recoverable and unchanged; a reviewed edition must have an attributable, evidence-recorded field-level correction log. An AI-generated original is **not** an authentic historical PYQ. Source references and alleged reviewer identities remain unverified claims until actually checked.

## Baseline: reuse, do not replace

- `src/content/import-cgl.ts`: immutable CGL original/reviewed distinction and Q62 caution policy. Preserve untouched.
- `src/app/exam-families.ts` and `src/app/library-controller.ts`: already distinguish imported and built-in families and pair `source` / `reviewed` editions by the same exam/paper identity. Before starting a reviewed attempt they attach `createSourceKeyReference` and `createSourceReviewReference` when a Source paper is available.
- `src/engine/source-comparison.ts`: hypothetical source-key marks only when source/reviewed rendered semantics match; conservative comparisons do not replace frozen reviewed marks or accept positional A–D as semantic evidence.
- `src/engine/review-source.ts`: original source question, answer and referenced images/passages frozen at attempt start; library edits never rewrite past attempts.
- `src/authoring/external-bank.ts`: deliberately narrow AI question schema v1 is `custom` only, hence the new **headless pairing adapter** does not widen that schema or require agents to know internal revisions.
- `src/authoring/authoring-publisher.ts`: existing canonical Wordgard compiler already supports `edition:"source"` and `edition:"reviewed"`, with a source-first requirement and hashed immutable question/paper/key revisions.
- `scripts/question-quality.mjs`: P60-C blind reviewer, source-bound 20-check record and correction gates. Importing/citing source records is not equivalent to verifying historical or legal facts.

## Low-context editorial workflow

1. The AI reads the P59 quickstart and **one** source example, extracts/transcribes the exact original as `practice-desk-authoring` v1. Preserve text, option order, shared stimuli, diagrams and supplied key; do not make covert source corrections.
2. AI independently reviews as in P60-C and, using P59 guarded `patch` **to a new file**, creates a separate reviewed `practice-desk-authoring` v1 source. **Retain original question IDs, order, paper identity and actual scoring/timing/navigation.** Raise the reviewed revision when appropriate; source revision stays fixed.
3. Generate a compact decisions template from the two inputs. The tool derives all changed fields and each question SHA. The agent records a substantive rationale, disposition and attributable supporting evidence/proof for **every changed question**; untouched items do not need redundant decisions.
4. A separate blind reviewer checks the **reviewed** file, records exact P60-C review-bound hashes, reasons, all 20 assessments, source evidence and actual-render claims. Any change to reviewed content invalidates its review.
5. Run the editorial audit; it detects undeclared changes, stale decisions, unknown/removed question IDs, paper-policy drift, source answer leakage, source-independent QA failures and P60-C reviewer disagreement. The preview includes only bounded changed-question fields and paged issues, **no full question text, keys or base64 media**. Its source-key coverage is explicitly conservative.
6. On acceptance, compile to a **new, nonexisting output directory**, writing **five** independently usable files: exact original authoring JSON, exact reviewed authoring JSON, frozen `source.exam.json`, frozen `reviewed.exam.json` and `editorial-lineage.json`. Import the two compiled paper files into the existing offline Library **Source first, Reviewed second**, via its existing one-package import. No silent device access or cloud sync.
7. The Library already offers paired edition viewing and, when exercising the reviewed edition with both packages installed, freezes any defensibly comparable original-key and source-question contexts at attempt start. Source is always the **printed key**, while reviewed is the proposed corrected key; the original remains recoverable and no previous graded attempt changes.

### Example headless commands

```bash
node scripts/editorial-editions.mjs template original.json reviewed.json > decisions-template.json
# Fill the template with rationale, provenance, evidence and disposition.
# Use P60-C candidate-only solver and complete reviewed evidence record separately.
node scripts/editorial-editions.mjs audit original.json reviewed.json decisions.json \
  --quality-review reviewed-review.json
node scripts/editorial-editions.mjs compile original.json reviewed.json decisions.json \
  NEW-editions-folder --quality-review reviewed-review.json
```

**New `practice-desk-editorial-decisions` v1 sidecar:** original/reviewed file SHA-256, exact question hashes and changed field names, one `disposition` (`corrected` proposed / `caution` / `exclude`), reason and bounded evidence (publisher, title, specific locator, optional HTTPS URL, as-of date and note). There are no invented review approvals. Its `corrected` disposition records the editorial decision; it **never automatically promotes an AI source to officially verified**. A reviewed question is published `caution` unless explicitly excluded (`invalid`, unscorable). An original exam package keeps its author-supplied wording/key with editorial caution and an unverified-provenance warning, regardless of the reviewed key.

**New `practice-desk-editorial-lineage` v1 sidecar:** immutable source/reviewed raw SHA-256, compiled paper/key IDs, per-item original/reviewed hashes, exact field differences, reviewer-attributed reasons and evidence, conservative original-key score-comparability summary, and plain `factualVerification:not-performed`. **This ledger is not a valid exam package** and does not mutate stored attempts. Source and reviewed *raw* copies are byte-for-byte preserved. Files cannot overwrite an existing output path.

## Essential invariants and exception cases

- **No official PYQ promotion by metadata.** A printed `official-pyq` label is an author claim requiring actual external source inspection. An AI-original candidate remains AI-original even when revised. Changed or newly claimed PYQ wording/key needs explicit provenance rationale/evidence. Unreadable or keyless originals remain an archival/editorial task, not a playable exam that the system invents a key for.
- **Original source vs correction:** source question/options/answer/media are not mutated to make the reviewed edition pass QA. Source lacks a factual-authentication guarantee; it remains caution-labelled and is never silently rescored using the reviewed key.
- **Structural constraints:** a playable original still needs valid exam/answer structure. A source with an explicit pre-submit answer leak may be **archived outside the playable editions**, but is not silently imported as a question for ordinary assessment. The pairing tool rejects its playable compilation and retains the original raw file in the user's possession. P60-E can later add an archival-only route for corrupted PDFs; no auto-repair is permitted.
- **Exact correspondence:** preserve original semantic question IDs and order; no silent drop/renumber/option shuffle. If source/reviewed passages, figures, alternative content, option text/order or rendered context differ, hypothetical original-key scoring marks the item **unavailable** rather than treating the same A–D as sufficient. Comparing only key letters is prohibited. Rewording may be perfectly defensible for the revised question but cannot be treated as the same source-key scoring scenario.
- **Disposition and scoring:** reviewed `corrected` means recorded, user/agent-attributed editorial correction; it is still `editorial.status:"caution"` unless a separate external process truly certifies it. `exclude` marks the reviewed item invalid and zero-mark/excluded by the original shared scorer. No source-only key patch may rewrite pre-existing attempts.
- **Failure safety:** strict headless compile requires a complete P60-C sidecar, current source and decisions SHA, a valid reviewed source, explicit evidence for material corrections, matching exam rules and successful canonical publication of both editions. Preflight everything before creating output. A nonexisting output folder is mandatory; on ordinary write failures, clean incomplete outputs. No existing file is overwritten.
- **Agent overhead:** one template/compact audit plus one review sidecar, no per-question Wordgard clicks; original and reviewed source are ordinary P57 files and can be patched through P59. Do not ask a content agent to understand local IDB schemas, freeze internals or broad repo source.
- **Scope of storage:** two independently signed imported packages use already existing Library/History/backup storage. The **editable external lineage and raw files are separate**; users must back them up. No transactional multi-package browser import is claimed.
- **External limitations:** no true source authentication, reviewer identity proof, OCR/PDF ingestion, device-local API, physical Mac Safari/mobile/AT/IME/storage-loss certification, human visual approval or final release.

## Five-step engineering and acceptance

1. **Source challenge and RED:** inspect actual CGL patch and imported edition comparison, frozen attempt validation and publisher source-first contract. Write tests that must fail until generic pair adapter exists, including a bad source key and changed wording/figure.
2. **Versioned contracts:** use the existing narrow v1 authoring source untouched, new bounded decision/lineage sidecars and explicit original-vs-reviewed status.
3. **Bounded implementation:** source/reviewed adapter is a **headless external agent tool**, not another exam/scorer implementation. Retain existing source first and reviewed second app import; no CGL/History/FSRS changes.
4. **Adversarial QA:** exact original-byte copy, correction rationale/evidence completeness, source key vs reviewed key, stale SHA, score-comparability true and false, prohibited source edit, invalid source leakage, source/compiled identity, no partial directory, hard refusal to overwrite, and actual offline app source/reviewed import + frozen review/score comparison regressions.
5. **Exact SHA CI:** strict TypeScript, all Node tests, deterministic offline HTML, Chromium/Firefox/Linux WebKit, guarded HTML publisher; then independently recheck changed source and document test/sha/holds. **Do not claim completed before evidence.** CGL Q62, prior frozen history, original key, academic content truth and human release approval are non-regression boundaries.

**Next stage P60-E:** AI reading PDFs and producing faithful source + reviewed banks using this system; not part of P60-D.

## Completion evidence

The [independent P60-D source crosswalk](../audits/P60D_ORIGINAL_REVIEWED_SOURCE_CROSSWALK_2026-11-06.md) maps every target invariant to current source and tests. [GitHub Actions run 42179668770](https://github.com/oneshubhamt/practice-desk/actions/runs/42179668770) passed **all five jobs**, with **412/412 Node tests** and actual Source→Reviewed offline browser import in all three engines; guarded publisher verified no HTML change was needed. Source SHA: `dd10979c211717583ba87eb2a9715b32738e278a`. The stage is complete for automated software, **not** for authentic-source content verification, physical-device testing, human editorial/visual approval or release. P60-E/F have not been implemented.
