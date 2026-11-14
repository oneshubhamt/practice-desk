# Practice Desk — Pass J: evidence-gap strengthening

**Scope:** materially independent evidence only. No production changes, no new browser scenario IDs, no duplicated Node scoring/session mathematics.

## Added evidence

| New witness | Previously bounded evidence | Plausible defect uniquely targeted |
|---|---|---|
| Real Chromium pagehide → off-document wait → exact exam URL reopen | Pure/session visibility mathematics and ordinary reload/persistence | Browser lifecycle wiring could lose the answer or charge off-document recovery time to foreground question exposure even while the engine model itself is correct |
| Browser authoring secrecy matrix across stem, shared stimulus and image alt metadata | Node candidate-leak inspection plus one stem browser rejection | Source→staging/UI integration could validate the stem but fail to surface/refuse leaks carried by referenced shared content or media accessibility metadata |
| Asia/Kolkata browser datetime-local scheduling across UTC year boundary, persisted and reloaded | Canonical scheduled-record validation and ordinary Calendar journey | Local datetime could be interpreted as UTC, offset twice, or change instant during persistence/reload |
| Canonical calendar temporal-boundary table | Basic scheduled-record shape validation | Non-canonical timezone offsets, impossible dates, reversed audit times or >24h durations could be silently normalised into a different scheduled instant |
| Independent FSRS-7 dual-trace forgetting-curve reference | Adapter determinism, chronology and native/WASM parity | Adapter/model plumbing could use the wrong elapsed unit, one trace only, or omit the FSRS-7 epsilon-adjusted mixture while still remaining internally deterministic and cross-build identical |

## FSRS authority

The FSRS reference test implements the published FSRS-7 dual-trace forgetting-curve equations independently from the Practice Desk adapter and checks the documented `R(0)=0.99999` boundary. It consumes the pinned upstream 34 default weights but does not call the production adapter's forgetting-curve implementation to calculate the expected value.

Specification: https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7

## Deliberate non-additions

- No second scoring/session property model: existing independent ledgers are already stronger.
- No new browser scenario IDs or extra cross-browser matrix: these risks are integration-specific and Chromium already owns the affected deep journeys.
- No generic “answer text absent everywhere” substring sweep: secrecy inputs are adversarially placed at distinct ownership surfaces.
- No parity-only FSRS case counted as independent correctness evidence.

## Stop condition

Pass J is complete only after the two added Node cases and the strengthened existing browser scenarios pass the complete required release path, with the guarded publisher still green.


## Verification

Verified executable source: `b387514ccf5c83bb010df9f1065eb0b57c5df168`.

GitHub Actions run [43595073345](https://github.com/oneshubhamt/practice-desk/actions/runs/43595073345) passed on the first attempt:

- **445/445 Fast Node cases** (two new J cases; previously 443);
- **7/7 Deep Node** scale/benchmark cases;
- **14/14** targeted baseline-green, assertion-killed semantic mutants;
- **6** Chromium Smoke scenarios;
- **8** Chromium Deep scenarios, including the strengthened authoring, storage-resilience and Calendar journeys;
- **4 + 4** Firefox/WebKit Cross scenarios;
- native/WASM optimizer parity and browser Worker evidence;
- guarded Publish.

Observed execution for this run: Fast Node/type/build **40.821 s**, Deep browser scenarios **49.587 s**. These are single-run observations, not performance baselines or SLAs.

The browser evidence explicitly logged the real pagehide/reopen foreground-exclusion witness, and the Calendar integration completed after the Asia/Kolkata year-boundary schedule/reload check. The existing scenario registry remains **14 scenarios / 22 engine executions**.

Pass J changes test/acceptance evidence and QA documentation only. No `src/` production file, generated app behaviour, scoring policy, persistence implementation or browser matrix was changed.

**Disposition:** stop condition met. Further evidence should be added only for a newly identified material risk; J does not justify another generic expansion of the suite.
