# Pass 4 — clean overhaul release acceptance

Architecture: **one typed runtime**, one offline library/history/results path. No `legacy.ts`, CGL bridge, v11 storage compatibility or migration. The complete v11 reference stays untouched on `baseline/v11`.

## Automated CI gates — passed in [CI #40855216283](https://github.com/oneshubhamt/practice-desk/actions/runs/40855216283)
- [x] Node 24, TypeScript 7.0.2, one reproducible `file://` HTML and no external assets
- [x] 10 built-in CGL source/reviewed editions; strict/flexible/single-section modes through the same engine
- [x] Imported six-response-kind exam, frozen scoring and section/question review
- [x] IndexedDB new-profile save/reopen and stale-tab rejection; localStorage fallback conflict
- [x] SHA-256 backup export/import and rejection of corrupt archives
- [x] Source/reviewed images from inlined data and 390px/768px responsive screens

## Platform-dependent manual release checks
- [ ] Firefox and Safari `file://` open/reopen behavior and storage permissions
- [ ] Device storage-quota denial, private browsing, browsers with blocked IndexedDB
- [ ] Mobile touch/keyboard, assistive technology, reduced-motion and zoomed layouts

**Pass 4 engineering complete and Chromium CI green (29 October 2026).** The unchecked platform-specific items above are real-device/browser release acceptance checks, not remaining legacy-code work. Neither Firefox nor Safari has been claimed as tested.

Pass 5 (mastery analytics, error notebook and revision sets) is separate.
