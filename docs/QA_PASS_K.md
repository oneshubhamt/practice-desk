# Practice Desk — Pass K: economics + final adequacy

**Scope:** profile actual remaining wall-time costs, optimize only measured bottlenecks, preserve or increase defect sensitivity, and retain a change only when repeated same-source measurements justify its runtime/maintenance cost.

## Baseline profile

Baseline executable: `b387514ccf5c83bb010df9f1065eb0b57c5df168` (Pass J). Workflow run [43595073345](https://github.com/oneshubhamt/practice-desk/actions/runs/43595073345), three complete green attempts.

| Metric | Attempt 1 | Attempt 2 | Attempt 3 | Median |
|---|---:|---:|---:|---:|
| Pre-publication runner consumption | 299 s | 315 s | 392 s | **315 s** |
| Pre-publication critical path | 153 s | 154 s | 160 s | **154 s** |
| Fast→guarded Publish complete | 163 s | 162 s | 171 s | **163 s** |
| Deep job | 88 s | 75 s | 99 s | **88 s** |
| WebKit Cross job | 70 s | 91 s | 82 s | **82 s** |
| Fast job | 63 s | 60 s | 58 s | **60 s** |

The profile showed a structural Deep bottleneck: scale/benchmark tests, 14 mutation checks and optimizer parity were serialized before an independent Chromium browser suite that itself consumed roughly 46–70 seconds. Fast's slow cases were substantive reviewer/CLI transactions already required for PR screening; they were **not** moved to Deep merely to improve timing.

## Retained optimization

The Deep job now runs two independent lanes concurrently **inside the same GitHub-hosted runner**:

1. contract lane — 7 Deep Node cases → 14 source-isolated semantic mutations → native/WASM optimizer parity;
2. browser lane — the existing 8 Chromium Deep journeys, still serial inside one pooled browser process.

This is safe because mutation sensitivity copies sources into a temporary sandbox and never edits the working tree, while the browser lane reads immutable artifacts produced by the already-green Fast gate. The browser journeys do not run concurrently with one another and do not share contexts/profile state.

No test, mutant, scenario, engine or publication gate was removed or relocated.

The acceptance runner now logs each scenario's elapsed milliseconds directly while preserving the existing JSON evidence. This is observability only.

## Retained-topology measurement

Measured executable: `415a973d3e0b6c2f0834c5d9e3704a64e882db4f`. Workflow run [43600640989](https://github.com/oneshubhamt/practice-desk/actions/runs/43600640989), three complete green attempts.

| Metric | Attempt 1 | Attempt 2 | Attempt 3 | Median | vs baseline median |
|---|---:|---:|---:|---:|---:|
| Pre-publication runner consumption | 313 s | 348 s | 302 s | **313 s** | **−2 s / −0.6%** |
| Pre-publication critical path | 128 s | 147 s | 144 s | **144 s** | **−10 s / −6.5%** |
| Fast→guarded Publish complete | 140 s | 159 s | 155 s | **155 s** | **−8 s / −4.9%** |
| Deep job | 75 s | 70 s | 59 s | **70 s** | **−18 s / −20.5%** |
| WebKit Cross job | 81 s | 100 s | 89 s | **89 s** | setup/runtime variance; not changed |
| Fast job | 44 s | 44 s | 52 s | **44 s** | source-equivalent variability; no Fast scope reduction |

The primary retained gain is therefore genuine: Deep serial work was overlapped without buying the improvement through another runner or through weaker evidence. Median total runner consumption did not increase.

## Rejected cache experiment

Commit `2c563f99f0b64eef7db1cfbe66a7c223c8861b25` tested `actions/cache@v6` for the pinned Firefox/WebKit binaries, keyed by OS, lockfile and engine. Run [43601431166](https://github.com/oneshubhamt/practice-desk/actions/runs/43601431166) was green for three same-source attempts.

The first miss stored about **92 MB WebKit + 109 MB Firefox**. A WebKit hit reduced the timed `install --with-deps` example from **27.554 s to 23.374 s**, because host-package installation still dominates. Three-run medians were **313 s runner consumption / 142 s critical path / 156 s full path** versus the lean retained topology's **313 / 144 / 155 s**.

That is only a ~2-second median critical-path benefit, no runner-consumption gain, and a slightly worse full-path median, in exchange for ~200 MB cache state and an additional CI action/key lifecycle. The experiment was therefore rejected and reverted. Final workflow blob/tree is byte-identical to the retained `415a973` topology.

## Final adequacy

Final executable tree verification: `41a4d50ba329c9a27c0c786910aab17c444bc719`, whose tree SHA is exactly the same as `415a973`. Final workflow run [43602187037](https://github.com/oneshubhamt/practice-desk/actions/runs/43602187037) passed all required gates:

- **445/445 Fast Node** cases;
- **7/7 Deep Node** scale/benchmark cases;
- **14/14** named semantic mutants baseline-green, assertion-killed and source-isolated;
- **6** Chromium Smoke journeys;
- **8** Chromium Deep journeys in one pooled browser launch;
- **4 Firefox + 4 WebKit** engine-sensitive Cross journeys;
- optimizer smoke, native/WASM parity and browser/WASM probes;
- deterministic/static builds and guarded Publish.

The final diff introduces no `src/` production change and no reduction in test inventory. Relative to Pass J executable code, the only retained executable changes are CI scheduling and acceptance timing output.

## Adequacy conclusion

The suite now has the evidence structure intended by Passes I–K: meaningful assertions, selected independent adversaries/reference models, targeted mutation sensitivity, real-browser/persistence evidence and a measured release topology.

Further optimization should require a new measured bottleneck or a newly demonstrated duplication. In particular:

- do not move expensive authoritative/reviewer checks out of Fast solely for speed;
- do not split Deep into additional runners merely to lower critical path unless runner-cost trade-offs are explicitly accepted and measured;
- do not reduce Firefox/WebKit or browser-risk scenarios simply because browser provisioning is expensive;
- do not reintroduce browser caching unless the runner image or Playwright installation economics materially change.

**Pass K stop condition: met.**
