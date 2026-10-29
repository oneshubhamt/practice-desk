# Pass 6 — Integrity and persistence hardening

Status: **Engineering and automated Chromium acceptance complete**, [CI #40863482395](https://github.com/oneshubhamt/practice-desk/actions/runs/40863482395) green, **55/55 unit tests** and real `file://` browser smoke passed. `overhaul` only; `main` and `baseline/v11` are unchanged.

## Engineering scope

- [x] Canonical, recomputed question/key/paper SHA-256 hashes for imported and frozen content; embedded images digest-verified
- [x] Strict five-kind stimulus validation and referential checks for question/option/stimulus assets; bounded media bytes
- [x] Completed attempt validation checks recomputed **item-level verdicts/marks** and aggregate totals
- [x] Exact historical display media frozen in attempts and notebook records; question review can remain self-contained
- [x] Backup v3 with validated all-record snapshots and display preferences; additive atomic IndexedDB record import
- [x] Save promises complete only after IndexedDB commit or localStorage write; UI ratings, notebook edits and package imports do not prematurely announce success
- [x] On storage/write failure, block more edits, display a persistent fault message, preserve in-memory changes and export an explicitly named `UNSAVED_RECOVERY` file
- [x] Tests for hashes, malformed stimuli, missing/corrupt media, frozen media retention, per-item score tampering, backup/preferences restore and browser quota/write failure

## Remaining platform release acceptance

- [ ] Firefox and Safari `file://` storage and export/reimport acceptance
- [ ] Real Android/iOS testing, assistive technology and zoom/keyboard navigation
- [ ] Device-level storage-quota exhaustion and long-history performance; write-rejection simulation is **not** physical-device coverage
- [ ] Independently verify browser-close/pagehide behavior under forced termination

## Deliberate design boundaries

- No migration from v11, backup v2 or frozen attempt schema 1: there are no existing production users of this branch.
- Browser writes remain best-effort on `file://`. An emergency recovery backup is generated from the in-memory state only if the user explicitly exports it; it cannot be guaranteed after a crash.
- Preferences are stored in localStorage and cannot participate in the IndexedDB record transaction. If preference restoration fails after records import, the outcome is reported as partial.
- Canonical digests detect accidental or mismatched content, **not** deliberate forgery of both content and digest. Backup SHA-256 is corruption detection, not authentication.
- Mastery/advanced analytics, exam policy features and larger UI restructuring are Passes 7–9, not claimed by Pass 6.
