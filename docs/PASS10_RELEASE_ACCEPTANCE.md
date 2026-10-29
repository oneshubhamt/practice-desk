# Pass 10 — release hardening and independent acceptance

**Status: IN PROGRESS.** Started 29 October 2026, `overhaul` only. This ledger distinguishes automated engineering checks from physical-device release approval; do not merge into `main` or change `baseline/v11`.

## 1. Audit

**Baseline:** Pass 9 accepted 75 Node tests, strict TypeScript, Chromium `file://` end-to-end scenarios, backup v3, stale-tab protection, quota-failure simulation and responsive layouts. [Pass 9 ledger](PASS9_RELEASE_ACCEPTANCE.md) and [v11 parity](V11_PARITY_LEDGER.md) remain regression sources.

**Confirmed risk:** IndexedDB may open successfully but fail when loading initial history. Previously the startup exception switched the visible history to localStorage fallback while leaving the failed `db` handle active. Later saves could target the abandoned IndexedDB handle rather than the displayed fallback store.

**Other pending risks:** Real Safari/Firefox Android/iOS storage semantics, forced renderer kill, quota eviction, large history/card sets, assistive technology and side-by-side v11 visual signoff.

## 2. Analysis / invariants

- A failed IndexedDB startup/read must close and clear its handle before using fallback, so both reads and writes use the same store.
- User-visible success must follow acknowledged storage writes; backup must reflect committed records or explicitly identify unsaved memory recovery.
- Keep one strict TypeScript exam engine, frozen revisions, validated FSRS and backup v3, standalone `file://` HTML with no runtime network or v11 migration.
- Use Chromium full regression; add Playwright Firefox and WebKit offline workflows. Linux WebKit is not physical Safari/iOS.
- A bounded history benchmark can detect catastrophic regressions, but does not certify slow devices or thousands of real cards.

## 3. Implementation inventory

- [x] `src/app/generic-ui.ts`: close/reset IndexedDB after any bootstrap failure before populating localStorage fallback.
- [x] `scripts/smoke-offline.mjs`: inject initial `getAll()` failure after successful database open; require subsequent answer save in fallback store.
- [x] `scripts/pass10-platform.mjs`: cross-browser offline answer persistence, backup, reload and answer recovery; Chromium-only 80-record history guardrail.
- [x] `.github/workflows/ci.yml`: Chromium original full smoke plus new Pass 10 test; Firefox and WebKit jobs with installed Playwright browsers.

## 4. Objective and targeted-QA ledger

- [ ] Latest exact source and generated HTML verified at final branch HEAD.
- [ ] Strict TS/build and all prior Node and Chromium tests green.
- [ ] Injected IndexedDB read failure and fallback save green on Chromium.
- [ ] Firefox Playwright `file://` profile re-open/save/backup acceptance green.
- [ ] Linux WebKit Playwright `file://` profile re-open/save/backup acceptance green.
- [ ] Bounded Chromium 80-record history rendering green.
- [ ] Final GitHub Actions run evidence links, measured time and known limitations recorded.

## 5. Independent manual/platform release gates

- [ ] Real desktop Firefox/Safari `file://` reopen, history and backups (not just headless Playwright).
- [ ] Physical Android/iOS touch, on-screen keyboard, orientation, zoom, fullscreen, save/export and reimport.
- [ ] NVDA/VoiceOver and keyboard-only accessibility, focus, announcements and contrast.
- [ ] Direct desktop/tablet/phone screenshot comparison with frozen v11; user visual approval.
- [ ] Forced renderer/OS termination before/during/after an unacknowledged IndexedDB transaction. An ordinary close/reload test is **not** an abrupt-crash test.
- [ ] Real quota exhaustion/private/blocked storage/eviction and actual recovery-file usability.
- [ ] High-card-count/multi-thousand-attempt workloads and measured performance on slower devices.
- [ ] Explicit release signoff, including any remaining constraints.

## 6. Verified evidence and release decision

Before Pass 10: final Pass 9 HEAD `70c63d6`, [CI #40916405833](https://github.com/oneshubhamt/practice-desk/actions/runs/40916405833) green.

**Final Pass 10 result pending** until current HEAD CI and manual release gates are assessed. Do not convert automation coverage into claims of physical-device approval.
