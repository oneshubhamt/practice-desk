# Practice Desk — Pass 4 release acceptance

Status: **Chromium-verified implementation; manual cross-browser acceptance pending (29 October 2026).** All development stays on `overhaul`; `main` and `baseline/v11` are protected reference points.

## Automatically verified by GitHub Actions

- [x] Node 24 / TypeScript 7.0.2 and offline reproducible HTML; no external JS/CSS assets.
- [x] Five SSC CGL source papers plus reviewed editions; 500 source questions.
- [x] Original CGL strict, flexible and single-section workflows use one shared model-driven examination renderer.
- [x] Six generic question kinds, validation, scoring, end-of-attempt explanations and reopened frozen results.
- [x] Original/reviewed figure questions load stem and option images from inline data, under `file://`.
- [x] Chrome `file://` fresh launch, response persistence, same-path same-profile reopen.
- [x] CGL + generic backup export/import, including interrupted and completed attempt data, checksum and additive restore.
- [x] CGL + generic IndexedDB stale-tab rejection; generic fallback localStorage competing-tab warning and recoverable export.
- [x] Responsive no-horizontal-overflow at 390px and 768px; preserved answer focus, pause controls and navigation policies.

## Manual release gates that have **not** been verified here

- [ ] Open the generated HTML directly from its final file location in current **Firefox**. Complete, pause, close/reopen and resume CGL strict/flexible/single and imported exam tests. Confirm same-origin saved responses and final results after restart.
- [ ] Repeat the same `file://` open/close/reopen, history and backup round-trip in current **Safari**, including mobile Safari if supported. Treat local file storage permissions as browser-dependent.
- [ ] Test low-storage / quota denial and blocked IndexedDB. Confirm explicit warnings, no false successful saves and independently usable backup exports. The localStorage two-key import is not atomic.
- [ ] Check iOS/iPadOS and Android keyboard/touch responsiveness, option images, screen-reader announcements, focus order, reduced-motion support and zoomed layouts.
- [ ] Before release, manually compare the original v11 CGL feature set: correction/audit notes, detailed solution explanations, source-PDF comparison, pacing and question-time metrics, history filtering/deletion, dark theme and immersive mode.

## Architectural cleanup not yet complete

- [ ] Replace/transitively type the CGL-specific analytics/library/review shell in `src/app/legacy.ts`, removing `@ts-nocheck` **without dropping features**. The common active exam renderer and new domain/engine modules are already strictly typed.
- [ ] Consider a single consistent history/library presentation for imported exams and CGL while retaining specialized CGL analytics.
- [ ] Remove transitional duplicate state and unused helpers after parity and full browser verification; avoid new dependencies or incompatible storage migrations.

## Scope boundary

Pass 5 (advanced learning) is separate: error notebook, topic taxonomy, revision sets, mastery tracking and richer comparable cross-exam analytics. A green Chromium CI run cannot substitute for the Firefox/Safari and storage manual gates.
