# Pass 4 — clean overhaul release acceptance

Architecture: **one typed runtime**, one offline library/history/results path. No `legacy.ts`, CGL bridge, v11 storage compatibility or migration. The complete v11 reference stays untouched on `baseline/v11`.

## Automated CI gates
- [ ] Node 24, TypeScript 7.0.2, one reproducible `file://` HTML and no external assets
- [ ] 10 built-in CGL source/reviewed editions; strict/flexible/single-section modes through the same engine
- [ ] Imported six-response-kind exam, frozen scoring and section/question review
- [ ] IndexedDB new-profile save/reopen and stale-tab rejection; localStorage fallback conflict
- [ ] SHA-256 backup export/import and rejection of corrupt archives
- [ ] Source/reviewed images from inlined data and 390px/768px responsive screens

## Platform-dependent manual release checks
- [ ] Firefox and Safari `file://` open/reopen behavior and storage permissions
- [ ] Device storage-quota denial, private browsing, browsers with blocked IndexedDB
- [ ] Mobile touch/keyboard, assistive technology, reduced-motion and zoomed layouts

Pass 5 (mastery analytics, error notebook and revision sets) is separate.
