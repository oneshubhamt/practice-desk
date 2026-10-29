> **DOCUMENT STATUS (30 Oct 2026): HISTORICAL RELEASE-HARDENING LEDGER.** The authoritative current v11 feature audit and Passes 11–16 are in [V11_FEATURE_PARITY_PROGRAMME.md](V11_FEATURE_PARITY_PROGRAMME.md); historical green CI or an older “parity complete” claim **does not prove full feature parity**. See [consolidated project status](PROJECT_STATUS.md).

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

- [x] Strict TypeScript, reproducible offline HTML build and **75/75 Node tests**; [Pass 10 source CI #40921780620](https://github.com/oneshubhamt/practice-desk/actions/runs/40921780620) green.
- [x] Original full Chromium `file://` suite, including SSC modes, six question kinds, FSRS, backup/restore, two-tab stale-write and simulated quota failure.
- [x] Injected IndexedDB *initial read* failure now produces working localStorage fallback writes (real Chromium browser).
- [x] Firefox Playwright `file://` saved answer → backup → reload → recovered selection.
- [x] Linux WebKit Playwright `file://` saved answer → backup → reload → recovered selection.
- [x] Bounded Chromium 80-record frozen-history loading/rendering: **438 ms** measured in CI #40921780620 (runner-specific).
- [x] Generated `Practice_Desk_Offline_Mock_Tests.html` refreshed after successful source checks in auto-commit `840e070`.
- [ ] Final documentation-only HEAD CI verification; do not claim its result before it completes.
- [ ] Manual browser, actual devices, crash/OS-kill, screen reader and screenshot signoff remain separate (below).

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

**Pass 10 automated source/Chromium/Firefox/Linux WebKit gates: GREEN** in [CI #40921780620](https://github.com/oneshubhamt/practice-desk/actions/runs/40921780620). Source commit `8eb82a7`; CI-generated offline HTML commit `840e070`. Earlier individual runs on `d71bc68` through `1d3c0e9` failed only because the generated-HTML publishing step raced with newer commits; browser and tests passed. Branch CI now has `cancel-in-progress` concurrency.

**Release decision: NOT YET APPROVED.** Exact final documentation HEAD verification and physical-device/manual signoff remain open; do not convert automated results to device approvals.


## 7. Post-ledger verification and current programme correction (30 October 2026)

The previously pending docs-only final HEAD `5b9dce604faef10a714415341c7da5116bf6ff8a` subsequently **passed all three jobs** in [CI #40922144096](https://github.com/oneshubhamt/practice-desk/actions/runs/40922144096). This resolves the **automated final HEAD verification** row above without rewriting dated original history. It does **not** satisfy device, accessibility, forced-exit or visual signoff. A further **independent source audit identified nontrivial v11 functional/UI gaps**; current status is [V11_FEATURE_PARITY_PROGRAMME.md](V11_FEATURE_PARITY_PROGRAMME.md). Passes 11–16 are planned; no parity fix was made in this documentation update.
