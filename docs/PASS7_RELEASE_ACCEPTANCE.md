# Pass 7 — Exam and review correctness

**Status:** Pass 7 correctness engineering complete and verified by [GitHub Actions #40899786917](https://github.com/oneshubhamt/practice-desk/actions/runs/40899786917): **64/64 Node tests**, strict TypeScript, one standalone offline HTML, and headless Chrome `file://` end-to-end smoke green. Implemented on `overhaul`. Keep `main` and `baseline/v11` unchanged. Follow the [five-step workflow and file map](../README.md#architecture-and-execution-map); full reasoning and evidence are in the [architecture scratchpad](ARCHITECTURE_AUDIT_2026-10-28.md).

## Objective-by-objective acceptance

- [x] **Engine policy ownership:** `SUBMIT_ATTEMPT` can no longer bypass sectional timers or section locks; `SUBMIT_SECTION` honours `allowEarlySubmit` and delayed clicks cannot submit two sections. Pure tests cover automatic expiry, forward-only navigation, disallowed pause and flag actions.
- [x] **Clock safety within a live tab:** `createSessionClock` measures time from monotonic elapsed duration rather than mutable wall clock; a backward sample never generates negative time or double counts. Existing restart/visibility/expiry tests pass.
- [x] **Frozen attempt-mode correctness:** strict simulation, flexible whole-paper practice, section practice and custom practice freeze their distinct mode labels and paper revisions; tested on built-in CGL and imported six-response-kind exam.
- [x] **Frozen historical review:** Results render the exact frozen passages, tables/charts, stem media, choice media and matching media independently of a currently selected package, preserving escaped text and input/read-only separation. Chrome decodes real CGL figures after submission.
- [x] **Source provenance:** built-in questions retain original `sourcePage`, validated source links and review-patch citations without inventing references. Hashes include editorial provenance.
- [x] **Original vs reviewed score correctness:** reviewed CGL attempts optionally pin an independently validated original-source answer-key reference at start; an explicitly labelled *unadjusted* comparison includes the original source key's defective items, separately from frozen reviewed/audited marks. The comparison is not asserted to be an official score.
- [x] **Editorial/scoring rules:** draft, invalid, incomplete-source, under-review and superseded questions are excluded from scoring. Tests cover excluded draft despite a matching response.
- [x] **Written-response workflow:** answered free-response questions remain `pending` in automated scoring; optional self-assessed marks (0–configured correct marks) and notes are separately validated, persisted and recoverable, never overwrite the immutable automated score. UI waits for durable writes.
- [x] **Targeted QA & earlier regression:** pure policy/score/recovery tests plus complete real Chrome `file://` CGL (all 3 modes), custom six kinds, rich review, manual grading, source comparison, backup v3, reopen, IndexedDB conflicts, injected quota denial and 390/768 px responsiveness.
- [x] **Five-step documentary process:** original code audit, design choices, implementation map, objective ledger and targeted QA evidence recorded in the architecture scratchpad.

## Remaining independent release gates

- [ ] **Cross-restart adversarial wall-clock changes / forced tab termination:** no purely offline clock can authenticate the real time elapsed while the browser and device are off or while the system clock is deliberately modified. Current restore uses the best-available wall interval; do not promise anti-tamper enforcement.
- [ ] Manual Firefox/Safari `file://`, Android/iOS, device quota behavior and assistive technology (Pass 10).
- [ ] **v11-grade feature and visual parity**: home, distinct history, insight/review tabs, speed–accuracy, pacing, filters, polished exam navigator, display popover and fullscreen (Passes 8–9). Track each in the [v11 parity ledger](V11_PARITY_LEDGER.md).

Pass 7 is exam/review **correctness**, not the end of the product overhaul or a claim that the simpler current UI matches v11.
