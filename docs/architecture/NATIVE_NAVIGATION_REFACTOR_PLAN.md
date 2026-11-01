# Practice Desk — native Navigation API architecture and implementation contract

**1 November 2026 · `overhaul` only · initial audited HEAD `1b971f2ea7bf5464549328e99b2622dc3d2c2ddd` · status: DESIGN FROZEN BEFORE IMPLEMENTATION**

## Decision

Use **the browser's native Navigation API only** (`window.navigation.navigate()`, `navigate` interception and `Navigation.currentEntry`). No hash router, `pushState`, `popstate` or `hashchange` fallback; no React/third-party router. All supported deployment environments are modern browsers. Maintain the distributable as one self-contained offline HTML file usable via `file://`.

Use **same-document query URLs**, not a typed hash router: `?pd=library`, `?pd=history`, `?pd=learning`, `?pd=exam&attempt=...`, `?pd=result&attempt=...&tab=overview|review|timing`. This preserves the same pathname (especially the file path), so `NavigateEvent.canIntercept` permits query changes on `file:` documents; native `navigate` owns the URL and history entries. Avoid hash/fragment scrolling or server-side routes. Parsing and validation are typed, but this is **not** a hash router. Deep links resolve only local saved attempt IDs, never embed answers, scoring data or raw user content. Unrecognized URLs should display Library and canonicalize through native replacement, not throw.

## Evidence / current baseline

- `src/app/generic-ui.ts:~373` holds `view: "library"|"history"|"exam"|"result"|"learning"` in mount closure. `draw()` at ~1164 mixes URL-independent screen selection, root `innerHTML` replacement, focus preservation and announcements, route-specific event handler setup, and repeat rendering on answers, clocks, imports and results.
- Navigation occurs via direct assignments in Library (History, Learning, Start, reopen), Exam (Library return, submit/expire), Results (History/review/timing tabs), Learning close and revision start; its event handlers do **not** update URL or history. Timer, visibility/pagehide, unsaved response drafts, persistent/optimistic writes and keyboard events are adjacent consumers; do not simply substitute assignment lines.
- `src/app/bootstrap.ts` mounts the workspace and owns Display/immersive controls. `src/app/learning-ui.ts` owns its nested renderer and `show/hide`; it must stay intact but cannot become an independent URL authority.
- Saved record schema, immutable frozen paper/key, distinct source/reviewed editions, timing/expiry, original CGL v11 geometry, test suites and 6 kinds remain unchanged. No migration from older routing, previous app or unsupported devices.
- HTML Navigation API: first load does not generate a `navigate` event; explicit startup URL dispatch is required. `file:` interception permits changing query/fragment without a new pathname; cross-document/external/download/reload navigations must not be hijacked. Traversal (`back`/`forward`) is not generally cancelable. `handler()` runs **after** URL commit: account for guard/checkpoint ordering and stale async transitions. Primary references: WHATWG HTML Navigation API, MDN Navigation API and NavigateEvent.canIntercept/intercept.
- Current release gate: Pass31 CI [41269749418](https://github.com/oneshubhamt/practice-desk/actions/runs/41269749418) is green (all 4 jobs). Freeze baseline v11, `main`, existing UI parity and source banks.

## Route model and invariants (R32-01)

Define a discriminated `AppRoute` in `src/app/navigation.ts`, with `library`, `history`, `learning`, `exam {attemptId}`, `result {attemptId,tab}`. Use strict length/character validation, no raw HTML or key exposure, and canonical query generation; preserve same file path and remove old routing query keys rather than accumulating duplicates. Do not persist a separate competing `view` to IndexedDB/localStorage. The active route is a view projection of the native entry + validated record; the attempt object remains application domain state. `Navigation.currentEntry` is not durable attempt storage.

One native `navigate` listener, registered and disposed with workspace. Intercept only same-document, same-file/same-path *internal* query routes with `event.canIntercept`, rejecting/download or external cases. Route browser navigation and programmatic `navigation.navigate()` through the **same** route activation path; use `history:"replace"` on completion/expiry, deleted-route recovery and canonicalization, `push` for user-level screen transitions; use `traverse` when Back/Forward is invoked. No direct `location.hash`, `history.pushState`, or browser-compatibility fallbacks. No need to use the Navigation API for per-question position and every option edit.

## Separation of concerns (R32-02)

- `navigation.ts`: typed route codec, native event registration, destination guards, navigation actions, URL/back/forward/replace semantics, initial-route activation and shutdown; **no exam engine or DOM innerHTML**.
- `screen-renderer.ts`: reusable screen-switch renderer: DOM injection, visible focus restoration, route-change live-region announcements, result-tab focus, and Learning host show/hide. Preserve no-focus-theft for answer, timer, draft, and filter redraw. **No URL manipulation, persistence or session mutations**.
- `generic-ui.ts`: application coordinator that resolves routes to frozen attempts/records, owns session transitions, checkpoints, protects exam exits, handles input/event wiring, and gives render models to the renderer. `draw()` may remain for in-screen updates but must not own navigation/history. Keep existing CGL and imported six-kind render functions and their stable selectors.
- `bootstrap.ts`: unchanged fullscreen/display owner and single mount; no duplicate history listener.

## Exam exit/entry integrity (R32-03)

- A user activating Library from a running exam receives the existing confirmation **before** calling `navigation.navigate`. A canceled action leaves route, URL, attempt, timer and history untouched. For browser Back/Forward (which cannot always be canceled), **checkpoint the active exam first**, do not prompt a cancelable-only guard, and continue to the target; switching away must dispatch `VISIBILITY:false` so hidden time is not billed to the last question. Write failure should surface recovery warning without corrupting the saved record. Do not silently submit/pause/delete.
- On entering or returning to an exam, restore the requested existing record through `restoreSession` (and reconcile expiry) if it differs from the active attempt; when returning from another view to the same attempt, send `VISIBILITY:true` as appropriate. The timer must continue/expire according to the **frozen timing policy** while outside the exam. Tab/window hidden invokes existing visibility handler. Closing an active question via Back does not change its answer.
- Question navigation, flags, answers and exam section transitions do not push browser history entries. `SUBMIT`/automatic expiry moves to `result` via `history:"replace"` (no Back to an active exam when frozen complete); result review/timing tabs are route-level URLs, with native Back selecting the previous tab (not previous question).
- On pagehide or reload, follow existing frozen checkpoint & mirror path. On startup, initialize packages and storage **before resolving a deep-linked attempt**. Invalid/deleted/unavailable attempt URLs resolve to Library with a meaningful message and native replace; completed attempts cannot be shown as running exams. A deep-linked result of an unfinished attempt must resolve to its exam screen rather than synthesize a score. If an attempt expires while URL points elsewhere, do not unexpectedly redirect from Library/History.

## Navigation events, concurrency and UI (R32-04)

- Establish route activation with the native `navigate` handler and explicit first-load activation. Ensure rapid consecutive navigations use `event.signal`/a monotonic activation generation so a stale async hydration/checkpoint cannot overwrite a newer route.
- Keep a clean distinction between route changes (focus heading, live announcement, scroll to appropriate top) and in-route redraws (preserve selected input, search caret and scroll where appropriate); for tab switches focus active ARIA tab. Native Navigation API `focusReset:"manual",scroll:"manual"` avoids browser defaults fighting existing documented focus behavior.
- Ensure temporary multi-select drafts and matching selections never become persistently scored because the route changed. Discard unsaved drafts only under existing rules.
- URL changes should not leak source keys, answers or private record content; encoded attempt identifiers only. Reject malformed/untrusted route parameters and make missing/deleted record recovery explicit.
- No weakening of frozen scoring, author bank, IndexedDB version checks, section locks, visual geometry, keyboard shortcuts, or result restrictions.

## Execution stages (must complete sequentially)

1. **A — audit and contract:** Inventory every `view=` and `draw()` site, tab changes, restore and clock paths, initial-load races; write this plan and source scratchpad entry **before writing source code**. Confirm Navigation API `file:` query intercept specifications and actual CI browser behavior.
2. **B — route adapter:** Implement pure route codec and native controller with focused Node tests (format/parse/reject; push/replace/traverse sequencing and same-document filter). No old router/legacy migration.
3. **C — renderer split:** Extract DOM screen rendering, focus and live announcement from `generic-ui.ts` into separate typed screen renderer, retaining the Learning Desk's nested rendering and all existing element IDs.
4. **D — app integration:** Replace direct assignments with native navigation; integrate storage-ready initial route, saved attempt hydration, transition checkpoint, correct result/review/history state and redirects. Remove duplicate navigation ownership, route transitions and new subscriptions on dispose. Do not change scorer/session contracts.
5. **E — reconcile and targeted QA:** Independent new actual `file://` browser journeys across Chromium, WebKit, Firefox: initial URL, user transitions, browser Back/Forward, reload with deep link, missing/deleted saved ID, strict/flexible/untimed/manual expiry, pause, reviewed/source and generic APFC MCQ/NAT+six-kind, result tabs, History filters, Learning revision, keyboard/screenreader-equivalent focus, mouse, scroll, light/dark and 1366/390/195 widths. Check no console exceptions/no rerender loops, native URL transitions without document navigation, exact saved response and timestamps, no score drift. Integrate target tests into `.github/workflows/ci.yml`. Run current source/test suites, Pass29 matrix, Pass31 side/header and cross-browser offline acceptance; do not delete or relax unrelated assertions.
6. **F — evidence and documentation:** Record measured screenshots/URL/geometry and CI IDs in original V11 audit **Section G scratchpad**, update `CURRENT_ARCHITECTURE.md`, `docs/README.md` and applicable decision register. State exactly what passed and what requires actual device/manual signoff. Commit only `overhaul`; CI regenerates HTML only after green. **No merge to main without approval.**

## Acceptance checklist

- [ ] R32-01 native-only route controller with canonical file-safe query deep links, accurate Back/Forward and no hash/legacy fallback.
- [ ] R32-02 renderer isolated from route/storage/session mechanics, fully retained focus and live announcement.
- [ ] R32-03 exam leave/return/expire/submit and storage-ready reload protected; no loss of frozen history/marking or draft confidentiality.
- [ ] R32-04 no redundant history entries during question edits; results tab and History/Learning routes work, robust concurrent navigations.
- [ ] R32-05 new and existing automated source/UI/cross-browser suites green with reproducible artifacts; manual/physical/AT release gates remain explicit.

This is an implementation plan and not a claim of completed code or test acceptance. Update checkboxes and exact evidence only after actual work.
