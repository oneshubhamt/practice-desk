# Current architecture — Practice Desk `overhaul`

**Scope:** source-derived architecture map, not a claim of v11 functional parity. Read [independent source audit](../audits/V11_SOURCE_AUDIT_2026-10-30.md) before release. The canonical [Passes 4–16 historical record](../history/PASSES_04_16.md) preserves all older designs and superseded decisions.

## 1. Topology

```text
src/content/*.json (published, independent patches, post-test solutions)
       │  validateContent (build) + importCglBank
       ▼
ExamPackage ── validateExamPackage ─── imported JSON
       │                │
       ▼                ▼
PaperRevision, AnswerKeyRevision, QuestionRevision, stimuli/media
       │    ids and immutable content hashes
       ▼
startGenericAttempt → freezeAttempt (paper/key/media/questions/mode)
       │
       ▼
SessionState ── SessionEvent transition, checkpoint, rebase/restore
       │
       ├── response validation → frozen scoreAttempt
       │     ├── scoreableMaximum / section evidence
       │     └── manual written self-assessment (separately labeled)
       │
       ├── frozen source-key/reference provenance
       │
       └── optimistic persisted RecordItem (IndexedDB / localStorage fallback)
                  │
                  ├── SHA-256 backup v3 (all records, optional preferences)
                  ├── history/review/results UI
                  └── LearningCard/FSRS → notebook revision ExamPackage
```

## 2. Source modules

| Layer | Files | Responsibility |
|---|---|---|
| Build/entry | `scripts/build.mjs`, `src/template.html`, `src/app/bootstrap.ts` | One script/style/content-embedded file, appearance, global events |
| CGL+external import | `src/content/import-cgl.ts`, `validate.ts`, `src/app/exam-package.ts` | Immutable original/reviewed editions, six-kind package intake |
| Domain contracts | `src/domain/{ids,question,exam,answer-key,scoring,integrity,media,validate}.ts` | IDs, revisions, content hashes, answer and media validation |
| Session/scoring | `src/engine/{session,clock,response,scoring,score-ceiling,manual-grading}.ts` | Policy-driven timer/navigation/input and score |
| Source provenance | `src/engine/{source-comparison,review-source}.ts` | Original key and original question/media comparison after submit |
| Data/history | `src/history/{frozen,backup,concurrency}.ts` | Immutable attempts, clock restoration, checked backup, optimistic writes |
| Learning | `src/learning/*.ts`, `src/app/learning-ui.ts` | Notebook, FSRS-7, honest analytics, revision exams |
| UI | `src/app/{generic-ui,history-page,result-presentation,history-metrics,preferences,practice-selection}.ts`, CSS | Library, history, exam, results, learning, prefs |

## 3. State lifecycle

- Start: validate selected package, derive CGL mode if relevant, freeze exact revision/key, initialize timer and first question visit; source comparison snapshot only for compatible paired reviewed editions.
- Edit: UI dispatches validated `ANSWER/CLEAR/FLAG/NAVIGATE/PAUSE/RESUME`; engine checkpoints time; new state/records optimistically saved.
- Finish: manual submit or elapsed budget produces completed state and immutable scoring result. Editorially invalid/excluded questions are omitted; written answers remain pending for optional self assessment.
- Restore: open frozen record, reconcile wall-time away from the page, avoid attributing hidden time to a question, and surface results if expired. All history computation derives from saved frozen evidence.
- Persistence: `saveRevision` checked on record updates, loaded IndexedDB first; localStorage fallback is separately version-guarded; uncommitted recovery exports are labelled. Downloaded backups are checksum-covered and additive.
- Reuse: stored question revision enters a LearningCard; FSRS rating is explicit feedback, not a rescoring of mock answer accuracy; revision exam is a fresh untimed custom paper with provenance and its own +1/0 rules.

## 4. Engineering quality and known boundaries

- **Strengths over v11:** no monolithic untyped scoring engine, exact frozen exam definitions, generic six-kind input, typed rule/response model, source revisions, content and backup integrity, checked concurrency, separately attributable learning evidence.
- **Debt:** `src/app/generic-ui.ts` still combines storage, routing, event handling and HTML construction in ~1,462 lines. Result tab redraw builds hidden views. Review current [audit findings](../audits/V11_SOURCE_AUDIT_2026-10-30.md) before claiming a performance or usability advantage.
- **Open imported policy gaps:** `whole-paper+sequential-locked` cannot progress, sectional `transition=manual` ignored, strange unanswered awards can exceed nominal maximum, impossible matching/multi-select keys can validate. Repair at the engine/validator boundary, not with a UI-only patch.
- **Offline:** no live network calls, local browser storage is best-effort, one self-contained HTML; appearance and local selection stored by browser.

## 5. Non-inferences

Source architecture does not prove iOS/Safari storage correctness, actual keyboard/screen reader speech, touch reachability, OS-kill recovery, content authoring accuracy or human superiority of aesthetics. Keep these separate from automated build evidence.
