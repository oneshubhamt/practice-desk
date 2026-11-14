# Practice Desk — de novo QA programme closure audit

**Audit date:** 14 November 2026  
**Branch:** `working`  
**Current executable source:** `30e0a201bd0799c509926d93c1cdfe3c8b7b9e75`  
**Original Pass G executable baseline:** `c3be7624b313ab07ea870ed405a981cee72b5f85`  
**Current verification:** [workflow 43585791864](https://github.com/oneshubhamt/practice-desk/actions/runs/43585791864), three same-source attempts; all required test gates green.  
**Controlled baseline:** [workflow 43579598221](https://github.com/oneshubhamt/practice-desk/actions/runs/43579598221), three same-source attempts of the pre-H executable/CI topology.

This audit was performed **de novo against the original Pass E–H objectives**, rather than accepting the earlier closure documents as proof. It found two material closure gaps, corrected both, and then re-ran the required evidence.

## 1. Objective-by-objective disposition

| Programme objective | De novo finding | Corrective action / surviving evidence | Final status |
|---|---|---|---|
| **E — invariant-level evidence and redundancy audit** | The Pass E case register, assertion-cluster classification, independence standard, risk→invariant→witness map, deletion rules, Node case timing and browser scenario timing are present and inspectable. | [QA_PASS_E.md](QA_PASS_E.md) + [QA_PASS_E_CASE_REGISTER.tsv](QA_PASS_E_CASE_REGISTER.tsv). | **Met** |
| **F — canonical test structure** | **Gap found:** four large suites still contained mechanically generated `__suite_dep_*` namespace aliases; persistence also retained `p45test/p45assert`. The earlier Pass F closure therefore overstated lexical cleanup. | Commit `30e0a201`: replaced all four alias families with direct semantic imports, removed `p45test/p45assert`, gave the residual storage/optimizer blocks semantic registration names, retained identical test titles/multiplicities. | **Met after correction** |
| **F — presentation-tolerant assertions** | Most high-risk string assertions were justified by security/a11y/disclosure contracts, but one exact `<p class="muted">` dependency still tested irrelevant styling. | Replaced it with the reader-visible frozen-mode disclosure contract; exact wording/ARIA/security checks that are themselves contracts remain. | **Met after correction** |
| **F — safe removal/equivalence** | No meaningful test needed deletion in the corrective pass. | Exact reporter title+multiset comparison remains **443 fast + 7 deep**; no lost/added case names. Browser scenarios unchanged. | **Met** |
| **G — independent mathematical/state testing** | Seeded scoring, event/session, transactional persistence and publication noninterference models are present; candidate/authoring browser witnesses cover cross-feature outcomes rather than duplicating domain arithmetic. | Eight G cases plus earlier independent reference models; 14 targeted semantic mutations. | **Met** |
| **H — expensive-test/setup profiling** | Existing profiling correctly identified Chromium setup, reviewer/CLI cases and browser resilience as costly. | Retained independently valuable costs; removed the redundant Chromium installation path. | **Met** |
| **H — reusable setup, safe concurrency and placement** | Four CI lanes already run concurrently after Fast; serial per-engine browser journeys are intentional because they share pooled browser/context teardown and storage/profile state. Expensive reviewer/secrecy checks belong in Fast; scale/stress belongs in Deep. | One installed Chrome is shared by offline Chrome and Chromium-WASM witnesses; Firefox/WebKit remain real independent engines. No unsafe intra-browser parallelism introduced. | **Met** |
| **H — publication guarantee** | Publisher remains dependent on Fast + Smoke + both Cross legs + Deep and rejects source/CI drift. | Current attempts publish successfully. Re-running the old baseline after `working` advanced caused the old publisher to **refuse publication** because `.github/workflows/ci.yml` had changed—expected fail-closed behaviour. | **Met** |
| **H — reproducibility** | **Gap found:** earlier browser evidence did not name the actual engine versions. | Acceptance/optimizer evidence now records browser version and executable provenance. Current repeated evidence: Chrome **157.0.8103.50** (`system-chrome`), Firefox **157.0**, WebKit **27.2** (Playwright-managed). All three current attempts reproduce the same offline HTML SHA-256. | **Met after correction** |
| **H — median execution/resource reduction** | **Gap found:** the earlier H closure compared selected single runs and explicitly used some different-source runs. It had **not** demonstrated the requested controlled medians. | Three same-source baseline attempts versus three same-source current attempts; results below. | **Met after controlled remeasurement** |
| **H — old/new behavioural equivalence and mutation adequacy** | Exact current-vs-baseline reporter/scenario identities were compared, not just totals. | Fast **443=443**, Deep **7=7**, mutations **14/14=14/14**, Smoke **6=6**, Deep browser **8=8**, Firefox **4=4**, WebKit **4=4**, identical scenario order/outcomes. | **Met** |
| **Permanent concise QA contract** | Contract is short and executable-source-first. | [QA_CURRENT.md](QA_CURRENT.md). | **Met** |

## 2. Corrected Pass F evidence

The de novo scan found the residual mechanical topology that the first Pass F audit missed. Immediately before the corrective commit, synthetic consolidation tokens occurred as follows:

| Suite | Mechanical tokens before | After `30e0a201` |
|---|---:|---:|
| `exam-package-and-import.test.mjs` | 25 | **0** |
| `exam-scoring-and-policy.test.mjs` | 42 | **0** |
| `history-and-persistence.test.mjs` | 88 | **0** |
| `learning-and-analytics.test.mjs` | 62 | **0** |

The scan counted `__suite_dep_*`, `__suite_storage_health`, `p45test` and `p45assert`. Current source has **zero** of these and zero historical `Merged from tests/` / `Consolidated coverage` markers. Two comments still mention the historical origin of a retained capability test; these are non-executable provenance comments, not parallel logic or suite topology.

The corrective refactor preserved the same case names/multiplicities. No production source was touched.

## 3. Controlled H economics — superseding the earlier single-run estimate

The earlier H report's **179 s → 132 s / 26%** comparison remains a historical observation, **not** the programme's effect estimate. The controlled comparison uses three attempts of each exact source/topology and sums the five pre-publication gate job wall times as a simple CI runner-consumption measure.

### Pre-H baseline — run 43579598221, source `c3be7624`

| Attempt | Fast | Smoke | Firefox | WebKit | Deep | Gate runner-seconds | Gate critical path |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 56 | 51 | 51 | 85 | 98 | **341** | **157 s** |
| 2 | 63 | 56 | 70 | 98 | 98 | **385** | **164 s** |
| 3 | 47 | 64 | 62 | 84 | 94 | **351** | **144 s** |
| **Median** | 56 | 56 | 62 | 85 | 98 | **351** | **157 s** |

Attempts 2–3 passed all test gates. Their publisher jobs then correctly rejected the now-stale baseline because the live `working` branch contained a changed CI file; they are therefore **not** described as successful publication attempts.

### Final topology — run 43585791864, source `30e0a201`

| Attempt | Fast | Smoke | Firefox | WebKit | Deep | Gate runner-seconds | Gate critical path |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 59 | 43 | 44 | 92 | 92 | **330** | **154 s** |
| 2 | 38 | 40 | 47 | 97 | 80 | **302** | **138 s** |
| 3 | 51 | 29 | 52 | 99 | 94 | **325** | **153 s** |
| **Median** | 51 | 40 | 47 | 97 | 92 | **325** | **153 s** |

All three final attempts passed Fast, Smoke, Firefox, WebKit, Deep and the guarded publisher.

### Controlled result

- **Median pre-publication gate runner consumption:** **351 → 325 runner-seconds**, **−26 s / −7.4%**.
- **Median gate critical path:** **157 → 153 s**, **−4 s / −2.5%**.
- **Causally identifiable setup saving:** the baseline's two Chromium `install --with-deps chromium` steps totalled **30.52 / 33.05 / 32.77 s** across the three attempts; median **32.77 s → 0** in the final topology.
- WebKit and Firefox installs remain because they provide distinct browser-engine evidence; removing them to improve the headline number would weaken coverage.
- These are GitHub-hosted observations, not latency SLAs. Runner contention remains visible, especially in WebKit and Fast.

This is a smaller but substantially more defensible efficiency result than the earlier single-run claim.

## 4. Reproducibility and equivalence

All three final attempts produced the deterministic offline HTML SHA-256:

`e0f17acb74f9bcb74502156a8fdc6853e83a48acbf261473308dc7d5d914279d`

Current-versus-baseline executable evidence:

- **443/443 Fast reporter titles and multiplicities identical**
- **7/7 Deep reporter titles and multiplicities identical**
- **14/14 named mutants identical and killed**
- **6 Chromium Smoke scenario IDs/order/outcomes identical**
- **8 Chromium Deep scenario IDs/order/outcomes identical**
- **4 Firefox Cross scenario IDs/order/outcomes identical**
- **4 WebKit Cross scenario IDs/order/outcomes identical**
- native/WASM optimizer parity retained
- real browser Worker activation retained
- guarded publisher retained and independently demonstrated both **success on current verified source** and **rejection of stale baseline source**

Comparison from Pass G executable baseline through the corrective current source changes only QA/test/scripts/workflow/docs paths; **no `src/`, `vendor/`, generated offline HTML or static app source changed**.

## 5. Remaining bounded limitations

The E–H programme is now complete for its intended software-QA scope. It still does **not** prove external facts that automated code tests cannot establish: PYQ authenticity, legal/statutory currency, real reviewer identity, native macOS Safari/device behaviour, assistive-technology usability, or arbitrary physical power/OS-profile loss.

Those limitations are not unfinished E–H objectives; they are separate validation domains.

## Final disposition

The first E–H closure was **not fully justified**. The de novo audit found and corrected:

1. residual mechanical Pass F suite scaffolding;
2. one irrelevant CSS-class assertion;
3. missing browser-version/provenance evidence; and
4. the absence of controlled same-source median/resource measurements for Pass H.

After those corrections and three controlled repetitions on both the baseline and final topologies, **all stated Pass E–H objectives are met within the bounded automated-QA scope**. No further QA restructuring is justified without a new measured risk, maintenance problem or cost bottleneck.
