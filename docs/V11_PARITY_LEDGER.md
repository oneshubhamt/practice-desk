# v11 feature and visual parity ledger

**Baseline:** `baseline/v11` (`src/app/legacy.ts`, `src/styles/app.css` 28.7 KB, `src/template.html`). **Current:** `overhaul` (`src/app/generic-ui.ts`, `src/styles/app.css` 7.3 KB, `src/template.html`). This is a **behavioral and visual comparison**, not permission to reintroduce `legacy.ts` or its runtime. Preserve the high-quality established UI with cleaner typed modules.

| Capability / experience | v11 | Overhaul after Pass 6 | Restoration target |
|---|---|---|---|
| Visually designed home, strong paper selection / metadata and resume emphasis | Dedicated home grid, summary cards and ongoing-attempt panel | Basic library selector + history list | Pass 9: redesigned premium home with clear hierarchy, richer cards and resume |
| History & insights workspace | Dedicated history screen, sorting, filtering, statistics, best/latest and comparison | Small list with status filter | Pass 9: distinct sophisticated history with search, sort, grouped comparisons |
| Results navigation and structure | Insights and review tabs; powerful exploration | One long vertically stacked summary/review | Pass 9: coherent tabbed insights/review/ledger, responsive and accessible |
| Score explanation and source-vs-reviewed comparisons | Audit-adjusted / publisher-key context | Simple marks tiles | Pass 7: correct comparison logic/provenance; Pass 9: polished presentation |
| Section pacing and visual progress | Progress bars, section breakdown, current time | Table only | Pass 8 evidence; Pass 9 rich presentation |
| Speed × accuracy, improvement opportunities, answer revisions | Rich analytical panels | Missing | Pass 8 faithful analytics; Pass 9 visualization, without unsupported inference |
| Question time ledger, filterable reviews | Detailed question timings and filters | Bare text review for all questions | Pass 7 frozen figure/passage correctness; Pass 9 filters, timestamps and density controls |
| Exam workspace quality | Distinct exam header, clock bar, question navigator, immersive state | Simplified two-column panels | Pass 9: restored polished exam shell, responsive palette, focus and status |
| Display controls | Compact Aa popover, theme/size/fullscreen | Header buttons, no fullscreen | Pass 9: compact, accessible and consistent controls |
| Revision and learned content | Basic earlier history/workflow | FSRS-7 notebook and typed cards; advanced sets incomplete | Pass 8 advanced learning, integrated in Pass 9 visual system |
| Content and correctness safeguards | CGL-specific behavior | More generic, typed, hashed, offline, backup v3 | Keep all new invariants; no regression |

**Acceptance requirement:** Audit each row against actual v11 source and screenshots/UI before marking Pass 9 complete. Preserve content richness, interaction affordances, responsive polish, accessibility, and general-exam capabilities. This ledger records specific deficits and is not evidence of completed parity.
