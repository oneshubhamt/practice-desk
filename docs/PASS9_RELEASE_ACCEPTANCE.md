# Pass 9 — V11-grade product interface and feature restoration

Status: **In progress**, `overhaul` only. Read [architecture scratchpad](ARCHITECTURE_AUDIT_2026-10-28.md), [v11 parity ledger](V11_PARITY_LEDGER.md), [data model](DATA_MODEL.md) and [AGENTS.md](../AGENTS.md) before editing.

## Objectives

- [ ] Premium responsive home: clear paper selection/modes, selected paper stats, recent and ongoing attempts, learning entry and trust/storage guidance
- [ ] Separate history workspace: search/filter/sort, completed/in-progress resume, summary metrics, valid same-paper trend, cross-paper section priorities and backup controls
- [ ] Distinct completed-result tabs: performance overview with source/audited/manual score distinctions, searchable/filtered review, question timing ledger, score opportunities and speed×accuracy
- [ ] Exam experience: readable immersive question area, active section/timing progress, palette status/legend, input feedback, keyboard/accessibility/focus and timed controls
- [ ] Compact display popover: theme, font size, fullscreen and persisted preferences (including existing backup contracts)
- [ ] Visual quality and responsive behavior at 390/768/desktop widths, light/dark themes, keyboard use, reduce-motion; preserve all new learning functionality without a parallel legacy interface
- [ ] Prove all 70 existing tests and full browser flows remain green; add targeted history/results/exam/display QA and note unsupported cross-browser/device gates explicitly
- [ ] Follow five-step audit→analyze→implement→objectives→targeted QA; finalize document parity checks and verify CI on exact final branch head

## Known release limits

Chrome automated `file://` coverage is not physical Android/iOS, Firefox/Safari, screen-reader, long-history stress, or simulated/real mobile keyboard coverage. Those are Pass 10 acceptance gates.
