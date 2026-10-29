# Pass 5 — learning and revision acceptance

Status: **Implemented and Chrome `file://` CI verified on 29 October 2026**. Keep `main` and `baseline/v11` unchanged; no v11 migration or separate legacy runtime.

## Automated [CI #40858120327](https://github.com/oneshubhamt/practice-desk/actions/runs/40858120327)

- [x] `ts-fsrs` **6.0.0 stable**, its current FSRS-7 scheduler and explicit user ratings; deterministic replay from saved ISO review logs.
- [x] Notebook questions and correct answers pinned to completed, frozen revisions; cannot create learning cards from unfinished exams.
- [x] Custom user-confirmed error categories, bookmarks, bounded editable notes and manual subtopics; no inferred error diagnoses.
- [x] Individual result-card capture and one-click revision sets from incorrect and skipped questions.
- [x] Responsive review queue, answer hidden until user reveal, Again/Hard/Good/Easy input and FSRS due-card scheduling.
- [x] Topic accuracy, coverage and sample-size evidence from completed attempts; imported topic identifiers and section fallbacks; exact-paper-revision comparable trend groups.
- [x] Learning records in existing IndexedDB/concurrency/fallback storage; validated backup export/import, round-trip and same-profile `file://` reopen.
- [x] 51 Node tests and real headless Chrome user flows for Pass 5 and earlier features.

## Manual release acceptance (not claimed complete)

- [ ] Firefox and Safari `file://` notebook save/reopen and FSRS due-card scheduling.
- [ ] Android/iOS touch, keyboard, zoom and assistive technology.
- [ ] Quota exhaustion, blocked storage and large history/card-count performance on devices.

The app intentionally avoids automatic mock-result grading, AI-derived topic labels, or unvalidated percentile/readiness estimates. Changing `ts-fsrs` or FSRS parameters after storing real user reviews requires a deliberate scheduling-compatibility decision.
