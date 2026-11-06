# P60-E — agent-assisted PDF/document intake (source-bound, offline)

**Branch:** `Satyam`. **User authorization:** 6 November 2026. **Status:** implemented for targeted QA; exact-source full CI and manual content checks must be evidenced separately before calling automated scope complete. **Governing programme:** [P60 AI-native capability](P60_AI_NATIVE_CAPABILITY_PROGRAMME.md). Reuses [P60-C review](P60C_QUESTION_QUALITY_ASSURANCE.md), [P60-D original/reviewed pairing](P60D_ORIGINAL_REVIEWED_EDITORIAL.md) and [P60-B blueprint](P60B_CONTENT_BLUEPRINT.md).

## Boundary and trust model

An **external capable AI agent**, with access to the actual supplied paper, interprets PDF/pages and transcribes original text, numbering, options, supplied answer keys, explanations (only where actually supplied), figures, shared passages/tables and mathematical expressions. If source math/graphics cannot be faithfully represented by narrow v1, choose the existing rich-document/Wordgard exchange or **hold**, never invent/rewrite the content. This implementation adds **no PDF text extractor, OCR, LLM runtime, browsing, cloud sync, database, browser permission or parallel publishing system**.

`scripts/pdf-ingest.mjs` is a **read-only external-source audit and guarded wrapper** for the existing P60-D compiler. It does not read the PDF page objects, validate printed text, count PDF pages, visually recognize diagrams, read hidden text layers or independently verify historical provenance. It checks the supplied **actual local file bytes**, minimal PDF header/trailer, source file SHA-256, a compact source-bound **manifest** with page/accounting claims and all question/stimulus/media SHA-256 digests. These hashes establish *identity and freshness*, not factual authenticity. `source-comparison.ts`, `review-source.ts`, canonical scorer and offline Library are unchanged.

The independently claimed source comparisons must be performed by a human or agent that can inspect the **same source bytes**. A filled checkbox, manifest, URL, reviewer's claimed identity or green CLI output is not independent evidence that this happened. No key or source wording is silently corrected on the original; P60-D compiles the reviewed proposal separately and labels it caution/invalid according to recorded dispositions.

## Agent-facing workflow (compact; no source-tree scan needed)

1. Obtain source PDF/image file **and any separate key PDF** from an authorized user. Do not upload private papers to unapproved vendors. Identify publisher claim, exam, year, edition, first/last question numbers, every printed page and whether keys are *actually* printed. Preserve exact original PDF bytes outside the app. Record official PYQ **only when provenance is corroborated**; otherwise mark `reconstruction`/other true origin.
2. Transcribe the **unchanged printed edition** to existing `practice-desk-authoring` v1 `original.json`. Use stable IDs and physical section IDs, embed real images as validated local `media`, put each shared passage/table in `stimuli` once, use safe TeX/rich AST for equations. All original `questions[].provenance.sourceNote` must name paper/page/printed item; if no printed key, **do not populate a guessed original key**. Park unresolved questions/documents outside a publishable bank. A fully publishable P60-D original **requires a sourced key** because the canonical scorer has an answer field.
3. Create a **manifest template** bound to the exact JSON and document bytes:
   ```bash
   node scripts/pdf-ingest.mjs template original.json paper.pdf > intake.json
   # optional: --key-document printed-key.pdf
   ```
   The machine-generated template is explicitly incomplete. Record exact document title, claimed publisher/identity, page count, inspected and missing pages, expected printed question count, omitted numbers, every question's printed number/pages/key origin and key pages, stimulus and media source pages, character/math/figure checks, unresolved uncertainties and substantive notes. A document hash cannot infer any of these facts.
4. Inspect original vs actual PDF **page by page** independently. Mark `status:"source-compared"` only after a real source comparison; for math mark `mathStatus:"source-compared"`; for diagrams/images mark `visualStatus:"source-compared"`; list unknown/cropped text in `uncertainties` rather than invent it. Check page gaps and total counts. Treat `documentInventoryStatus:"checked-against-source"` and `externalVerification:"recorded-agent-check"` / `recorded-human-check` as declarations, never cryptographic verification. An unresolved/missing item, missing key, missing page, uninspected graphic or stale SHA **blocks** intake. Keep the intake JSON as the error/recovery ledger and correct only a **new source revision**.
5. Audit ingestion first, without publication:
   ```bash
   node scripts/pdf-ingest.mjs audit intake.json original.json paper.pdf
   # optional --key-document printed-key.pdf
   ```
   A clean transcription-only audit is **not publication-ready**. It provides bounded, key-free issues; PDF source bytes are not copied into the app.
6. Create a **separate** `reviewed.json` with stable question IDs/order and unchanged paper policy. Independently solve the *blind* candidate packets, review explanation and distractors, sources/current law, figures, math, and real rendered candidate UI using P60-C. Fill a SHA-bound `quality-review.json` for **every reviewed question**. Create exact field-by-field P60-D decisions from the original+reviewed. Run P60-B blueprint coverage if applicable:
   ```bash
   node scripts/question-quality.mjs candidate reviewed.json
   node scripts/question-quality.mjs template reviewed.json > quality-review.json
   node scripts/editorial-editions.mjs template original.json reviewed.json > decisions.json
   node scripts/content-blueprint.mjs audit plan.json reviewed.json
   ```
   Templates require substantive completion and external evidence. Reviewing a second model's answer without blinds or source inspection does not make its assertions true.
7. Apply all three strict gates (P60-E intake + P60-C independent-review record + P60-D editorial pairing), optionally the P60-B blueprint, **before** creating a fresh output directory:
   ```bash
   node scripts/pdf-ingest.mjs audit intake.json original.json paper.pdf \
     --reviewed reviewed.json --decisions decisions.json --quality-review quality-review.json \
     --blueprint plan.json
   node scripts/pdf-ingest.mjs compile intake.json original.json paper.pdf \
     reviewed.json decisions.json NEW-output-directory \
     --quality-review quality-review.json --blueprint plan.json
   ```
   The optional `--key-document printed-key.pdf` must also be provided on both audit and compile if intake has a key-document record. The compile command **delegates to `editorial-editions.mjs compile`** (existing canonical publisher). It writes the five P60-D outputs plus `pdf-intake-provenance.json` in the *new* directory, preserving the exact original and reviewed JSON bytes and provenance manifest. Never publish into an existing directory. Import `source.exam.json` and then `reviewed.exam.json` **manually**, from the offline Library. The PDF itself is **not** embedded or silently uploaded.
8. Retain actual PDF, any key PDF, source JSON, intake manifest, reviewed JSON, P60-C review, P60-D decisions and blueprint as separate source evidence in controlled storage. The app's imported item source notes and paired edition preserve source cues, but **PDF page scans and the intake manifest are not embedded in every frozen attempt**. Backup/restore is unaffected.

## Contract v1 and explicit rejects

Top-level `practice-desk-pdf-intake` v1 requires `document`, `original`, `questions`, `stimuli`, `media`, `documentInventoryStatus` and `externalVerification`; optionally `keyDocument`. The document record specifies `title`, `type` (`pdf`/`image`/`other-document`), SHA-256, byte length, *asserted* page count, inspected/missing page numbers and identity note. The `original` block binds raw source SHA, bank ID, question count, expected printed count and an explicit list of omissions. Every item record binds exact JSON entity SHA, its source pages, comparison status, uncertainties and notes. `inspector` identifies the claimed source comparator and method/date; the claim is not authenticated. A question adds `printedNumber`, `keyOrigin` (`source-document`/`key-document`/`unavailable`), `keyPages`, `mathStatus` and `explanationOrigin` (`printed-source` or `editorial-not-in-source`). Each frozen `provenance.sourceNote` must include a mapped source page. Media additionally requires `visualStatus`.

Fatal outcomes include stale source or PDF/key bytes; missing/unaccounted/overlapping pages; absent or repeated item/printed-number records; unknown IDs; omitted questions; unavailable or unlocated keys; missing provenance source note; unreviewed equations/figures; unresolved ambiguity; P57 schema/leakage errors; stale/failed P60-C or P60-D review; and blueprint mismatch when supplied. Outputs never include original questions, answers, base64 images or full review explanations. This guard is **fail closed**, not a PDF extraction fidelity oracle.

## Scope limits and recovery

- **No automatic OCR, optical equation conversion or PDF document semantics** inside the application. A PDF can have a valid header/trailer but be semantically unreadable; the source page count is asserted, not independently parsed. Tests with structured synthetic PDF fixtures check deterministic gating, **not real PDF-to-question perceptual accuracy**.
- A source question **without an actual printed key** is not fabricated just to satisfy the source edition's answer requirement. Archive the uncertain transcription, obtain a genuine key, or prepare a separately attributed non-source practice item with proper manual authorization.
- If a source question is genuinely malformed, preserve its original in a safe external archive and record the problem. P60-D will not publish a candidate-visible source answer leak; it also prevents unchecked field changes and unresolved reviewed decisions.
- If expected pages or items are missing, remedy the source and rerun from a new, complete transcription. P60-E does not knowingly publish a partial document in the original/reviewed pairing path.
- Character OCR, stem exactness, diagram meaning, figure labeling, key authority, source legal/current correctness, examiner design, independent reviewer and real-browser visual truth require **actual external inspection** and cannot be certified by these scripts.
- No P60-F app-agent bridge, cross-device synchronization, general PDF extraction model, online service or release is implemented.

## Evidence matrix and ownership

| Requirement | Software source/acceptance | External work not verifiable here |
| --- | --- | --- |
| Source document identity | PDF/file byte hash, length, existing-path checks | Publisher/official paper authenticity |
| Number/page completeness | Count, printed numbers, cited page bounds, missing/uninspected page reject | Correct actual PDF page count and printed question census |
| Maths/figures/stimuli | Per-entity SHA, math/visual checks, all media/stimulus source pages, canonical rich validator | Character-level formula fidelity, diagram content and semantics |
| Key discrepancies | Explicit source-key file/page origin; P60-D original vs reviewed changes and evidence | True printed key or independent proof of the correct answer |
| Independent QA | P60-C SHA-bound reviewer records, blind candidate packet, checklist, leakage gate | Reviewer independence, checked sources, actual UI review |
| Coverage | P60-B existing author-claimed quota auditor | Real syllabus accuracy/difficulty |
| Immutable editions | P60-D compiler; source archive, reviewed archive, imported packages and lineage | Automatic user-device publication (not provided) |
| Recovery/no write | Audit is read-only; compile fresh directory only; no app state mutation | Human handling of inaccessible PDFs and missing source pages |

Use `tests/p60e-pdf-ingest.test.mjs` for regression evidence and `docs/audits/P60E_SOURCE_CROSSWALK_2026-11-06.md` for objective-by-objective verification. Physical devices, subject truth, external authentic papers, human visual approval and release remain HOLD.
