# Candidate tools A–F closure audit

This is the de-novo closure record for the candidate-affordance programme: candidate scratch, MCQ elimination/navigation, highlighting, generic references, save feedback and completed-attempt Study Handoff. Executable source/tests/CI remain authoritative.

## Closure findings

| Risk | Ownership / invariant | Independent evidence retained |
|---|---|---|
| Scratch accidentally becomes an answer | Eliminations/highlights live in `candidateScratch`, never `CandidateResponse` | Pure scoring equivalence plus real strike/highlight journeys |
| Annotation drift | Stable question/option/stimulus identities; plain source offsets or RichDocument text-leaf paths | Validator adversaries, rich/plain browser selection, reload and selective removal |
| Rich-content corruption | Authoring marks remain source content; KaTeX/images are atomic | Rich renderer tests and Chromium highlight journey |
| Missing textual-option annotation | Single/multiple-choice option text exposes the existing `option-text` surface; labels/media/strike controls remain outside it | Pure option-anchor test plus browser persistence/non-selection assertion |
| Illegal quick navigation | Next-unanswered/flagged is derived and every destination passes engine navigation legality | Pure forward/section-lock tests plus Chromium journey |
| Reference leakage/inference | Only authored hash-bound `candidateTools.references` resolve; no exam-name activation; paper-supplied material never claims official permission | Pure adversary plus Chromium/Firefox/WebKit reference journeys |
| Reference mutation after start | Resources and verified local assets freeze with the attempt; figures use the one shared verified image viewer | Freeze/hash tests and cross-browser frozen-resource/image-viewer journey |
| Candidate scratch lost or over-shared | Scratch survives attempt persistence/backup, is deleted with the attempt, omitted from learner-focus | Backup/reconstruction and learner-focus privacy tests |
| Save badge lies about a second save path | Badge is a read-only projection of pending durable writes and storage lock | Pure projection test plus real browser `Saving… → Saved` and injected-failure `Save problem` journey |
| CAS/recovery regression | Existing queue, optimistic revision checks, quarantine, mirror and backup paths remain the only persistence owners | Seeded CAS tests, recovery browser journeys, full regression gates |
| Handoff reads unrestricted History | Builder accepts exactly one completed `GenericAttempt`; no store/history capability | Pure API/privacy tests plus browser download journey |
| Handoff leaks unreleased key | `allowReview:false` forces expected responses off in the builder | Pure adversary and real no-review browser download |
| Handoff leaks reviewer/private data | Attempt ID, account/device/calendar/other-history/learning/reviewer/source-url/binary fields are outside the packet; annotations are opt-in | Pure serialization assertions plus real JSON/Markdown download checks |
| Source/Reviewed semantics drift | Candidate references affect semantic comparability; candidate scratch does not | Source-key/reference tests and existing frozen Source review journeys |
| Narrow/a11y/keyboard regressions | Native controls, focus restoration, dialog key containment and 195px/140% checks remain required | Candidate, highlight, reference and handoff browser journeys |
| Distribution drift | Both distributions derive from the same source and execute the same runtime/catalog | Fast byte-equivalence witness, deterministic build/static gate and guarded Publish |

## Result

The first closure review found that `option-text` anchors existed in the domain but were not surfaced by the candidate choice renderer; that was corrected without changing scoring, question hashes or response semantics, and stable conceptual `questionId` was restored to Study Handoff. A second de-novo source audit then found five narrower closure gaps: reference figures did not actually reuse the shared image viewer; reference-panel wording could overstate official permission; the browser witness did not observe transient `Saving…`; Study Handoff flattened rich context too weakly and relied on builder-only size/fixed Markdown fencing; and standalone/static equivalence was structural rather than executable-byte evidence. These are now closed by shared-viewer injection, neutral trust wording, real queue-state observation, one canonical RichDocument-to-text projection with frozen taxonomy classification and serializer hardening, and byte-identical runtime/catalog build assertions.

No alternate storage path, JSON compiler, exam-specific reference registry, per-question timer, Wordgard exam dependency or learning-model coupling was introduced.

## Boundaries not claimed

Passing automated closure does not prove official permission/factual correctness of authored reference material, physical Safari behavior, assistive-technology usability, power-loss durability beyond browser guarantees, or historical/source authenticity. Hashes remain consistency evidence rather than publisher authentication.
