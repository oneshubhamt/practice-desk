# Practice Desk — Pass H: CI economics, adequacy and closure

**Baseline source:** Pass G `ceb99196f1b4a61c3a8f6abaf6db709941062659`. **Final executable source:** `18ef4621ecf67d0d271deda8132ecc2f730a09d3`. Verified green on [run 43581732988](https://github.com/oneshubhamt/practice-desk/actions/runs/43581732988) and the final [run 43582144678](https://github.com/oneshubhamt/practice-desk/actions/runs/43582144678), 14 November 2026.

**Scope:** production source and built offline HTML were unchanged. Modifications were limited to CI setup, test-only browser discovery/harness and an optimizer browser-test launcher. No test or meaningful fault witness was removed. This audit closes the Pass E→H programme; see [Pass E](QA_PASS_E.md), [case evidence register](QA_PASS_E_CASE_REGISTER.tsv), [F](QA_PASS_F.md), and [G](QA_PASS_G.md).

## 1. Representative profile (real green CI evidence)

The Pass H baseline used the last Pass G full green run [43579598221](https://github.com/oneshubhamt/practice-desk/actions/runs/43579598221); earlier green [43577585914](https://github.com/oneshubhamt/practice-desk/actions/runs/43577585914) and [43576901601](https://github.com/oneshubhamt/practice-desk/actions/runs/43576901601) help reveal runner variation (but are **not exactly the same test-source version**).

| Cost category | Baseline observations | Reason / disposition |
|---|---:|---|
| Chromium `install --with-deps`, smoke | **13.75 / 22.8 / 16.1 s** | Redundant second browser binary despite offline acceptance already using installed Chrome; **removed** |
| Chromium `install --with-deps`, deep | **16.77 / 17.6 / 17.0 s** | Same redundancy; **removed** |
| WebKit `install --with-deps` | **35.4 / 39.8 / 28.7 s** | Requires actual WebKit + host OS dependencies; **retained** |
| Firefox `install --with-deps` | **17.3 / 17.8 / 13.5 s** | Independent Gecko engine and its dependencies; **retained** |
| Chromium deep scenario engine | **49.12 / 51.79 / 52.7 s** | Cross-feature risk scenarios, **not** duplicate mathematics |
| Chromium smoke scenario engine | **20.13 / 35.77 / 26.15 s** | Candidate and authoring end-to-end witnesses, **retained** |
| WebKit cross scenario engine | **29.20 / 36.34 / 32.64 s** | WebKit media/navigation/recovery, **retained** |
| Fast TypeScript/build/Node | **39.36 / 24.59 / 28.35 s** | High run-to-run CPU variation, not proof of a regression |

**Expensive Node file attribution**, refreshed from the first optimized run's **450 reporter cases** using the frozen Pass E title→file ledger, six verified Pass F renames and eight Pass G cases: `agent-authoring` **24 cases / 26.37 s summed case-duration**; `content-blueprint-quality` **34 / 25.03 s**; `editorial-lineage-and-pdf` **16 / 11.02 s**. These cover real, independent CLI/reviewer/source-integrity transactions. The largest individual observed fast cases included external SHA-bound reviewer verification **6.43 s**, complete source-attributed QA **3.07 s**, and authoring fractional-rule determinism **3.04 s**. **Sums of per-case durations are not per-file standalone wall times**, because Node executes files concurrently and runner contention changes timings.

Browser scenario-level profiling across three successful pre-H runs identified the true deep costs: `storage-resilience` **16–25 s**, `responsive-ui` **9–11 s** and candidate `candidate-core` **10–23 s**. WebKit `partial-recovery` took **~10–11 s**, and WebKit `image-viewer` **~9–15 s**. The storage case includes actual two-tab CAS, fallback export, failed IndexedDB read, quota-denied emergency backup and **real persistent Chrome profile/process restart**; it was deliberately retained.

## 2. What was optimized and why it is safe

1. **One shared Chrome executable discovery.** New test-only `scripts/browser/chrome-path.mjs` resolves the installed executable once per process, fails closed if missing and replaces repeated `--version`/`which` child-process probes in `browser/fixtures.mjs` and the real profile-restart scenario. No browser-state or test logic was deleted.
2. **One Chromium browser binary, not two.** `scripts/fsrs-browser-optimizer-smoke.mjs` now launches the same **system Chrome/Chromium engine** used by actual offline candidate and authoring journeys. Chromium smoke/deep therefore no longer download a separate Playwright Chromium or run its `--with-deps` installer. The WASM optimizer test still executes on a real browser engine and exercises its full training/holdout pathway; Firefox and WebKit still independently exercise their own real engines and Worker probes.
3. **No redundant preflight.** An intermediate version added an explicit installed-Chrome probe. Actual `openHarness` and WASM browser launches already fail closed with a missing executable, so the two redundant preflight steps were retired after the first complete green run.
4. **No unsafe parallelization.** Independent CI lanes already run concurrently **after** the verified Fast artifact is built. Browser journeys remain serial per engine because the pooled harness closes every context after each scenario; parallelizing those within one process would introduce interference and risk false evidence. Real CLI tests remain in Fast, rather than moving reviewer/secrecy failures into a working-only Deep gate. Scale and stress cases stay Deep.
5. **Release authority unchanged.** `publish` still requires `needs: [fast, smoke, cross, deep]` on `working`, source-ancestry comparison and a tested, deterministic offline HTML. Deep still runs on `working` pushes; Smoke and Cross still run for every relevant PR/push. No CI gate or assertion was weakened.

**Intentional boundary change:** browser/WASM Chromium testing now uses installed Chrome instead of a second Playwright-downloaded Chromium build. This is **engine-level equivalence** supported by real Chrome execution, not a claim that those two browser distribution binaries are byte-identical.

## 3. Measured after/before economics

| Measure | Last Pass G baseline run 43579598221 | Final Pass H run 43582144678 |
|---|---:|---:|
| Chrome smoke setup (browser install / redundant preflight) | **13.75 s** | **0 s** |
| Chrome deep setup (browser install / redundant preflight) | **16.77 s** | **0 s** |
| Chromium setup across those two runners | **30.52 s** | **0 s** |
| Fast TypeScript/build/Node | 39.36 s | **23.28 s** |
| Chrome smoke scenarios | 20.13 s | **14.77 s** |
| Chrome deep scenarios | 49.12 s | **42.77 s** |
| 14 targeted mutations | 10.25 s | **9.35 s** |
| WebKit installation (unchanged contract) | 35.4 s | **30.58 s** |
| WebKit cross scenarios | 29.20 s | **27.00 s** |
| GitHub run created→completed elapsed | **179 s** | **132 s** |

The middle verification [43581732988](https://github.com/oneshubhamt/practice-desk/actions/runs/43581732988) was also fully green, with **171 s** workflow elapsed. It measured a temporary **2.60 s total** of installed-Chrome preflight probes versus the baseline **30.52 s** of downloads/install; those probes were then safely removed.

**Measured minimum structural saving:** the two dedicated Chromium browser-install steps themselves fell from **30.52 s to zero** in the selected comparable runs, eliminating two redundant downloads/dependency installers. **Observed workflow completion:** 179→132 s (**47 s / 26% shorter**), but runtime changes outside the removed steps also reflect GitHub runner/provisioning variability. Do not attribute the entire 47 s causally or claim a stable 26% speedup. Further runs should track median/p90 critical-path time and setup cost separately.

On the new Ubuntu 26.04 hosted image, WebKit's latest setup genuinely installed **185 new OS packages** in one observed run; skipping `--with-deps` or substituting Chrome is not defensibly equivalent. Cache/container changes would require a controlled cold-versus-warm experiment and a maintenance/storage-cost analysis; **not implemented** merely to improve a benchmark number.

## 4. Adequacy and old/new equivalence

The exact Pass G baseline and optimized GitHub CI Node reporter results were compared as **name + multiplicity**, not just test totals:

| Witness group | Before | After | Result |
|---|---:|---:|---|
| Fast Node test titles | 443 | 443 | **Identical multiset** |
| Deep Node test titles | 7 | 7 | **Identical multiset** |
| Named source-isolated mutations killed by their designated assertion | 14 | 14 | **Identical set; 14/14** |
| Chromium smoke scenario IDs | 6 | 6 | **Identical order/outcomes** |
| Chromium deep scenario IDs | 8 | 8 | **Identical order/outcomes** |
| Firefox cross scenario IDs | 4 | 4 | **Identical order/outcomes** |
| WebKit cross scenario IDs | 4 | 4 | **Identical order/outcomes** |
| Optimizer native/WASM parity, actual browser Worker activation | Required | Pass | **Preserved** |
| Guarded published artifact and source ancestry | Required | Pass | **Preserved** |

Source-tree comparison `ceb9919…d8dae29` found only **five** test-harness/CI paths changed and **zero** `src/`, `vendor/`, `Practice_Desk_Offline_Mock_Tests.html` or static-output changes. A second workflow-only commit `18ef462` removed the duplicated preflight. Both baseline and final builds independently reproduced the same deterministic offline HTML SHA-256:

`e0f17acb74f9bcb74502156a8fdc6853e83a48acbf261473308dc7d5d914279d`

The final workflow passed **443 fast + 7 deep** Node cases, all **14/14 targeted mutants**, **6+8 Chromium** journeys, **4 Firefox + 4 WebKit** journeys, optimizer smoke/parity/probes and the guarded publisher. This is strong **bounded QA equivalence**; it is not a formally exhaustive proof of browser binary implementation equivalence or absence of all defects.

**Retired:** redundant Chromium install steps, duplicated executable detection and the redundant test-run preflight. **Not retired:** any Node test, browser journey, real CLI reviewer proof, source-integrity witness, test fixture or release gate. No arbitrary test-count or assertion reductions occurred in H.

## 5. Closure and ongoing controls

- **Permanent active contract:** [QA_CURRENT.md](QA_CURRENT.md) (shortened; describes exact gates, source authority, invariants, local commands and evidence limitations). Preserve [Pass E→G](QA_PASS_E.md) as the detailed explanation of why the surviving witnesses are independent; this report is the Pass H economics/equivalence record.
- **No further architecture sweep recommended solely for QA economics.** Target a new cost improvement only with repeated comparable data and a testable per-risk preservation plan.
- **Honest limitations:** green CI does not prove real-world macOS Safari behaviour, accessibility with assistive technologies, interruption from physical power failure, legal-current source truth, authentic PYQs or reviewer identity. Track these independently; do not claim that a synthetic seeded test certifies an outside source.

**Pass H disposition:** complete. The active CI topology is smaller, tested, source-identical for product code and guarded by the original release publication authority.
