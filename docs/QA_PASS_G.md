# Practice Desk — Pass G: mathematical and behavioural strengthening

**Source baseline:** Pass F `2cd8756` · **Verified Pass G code:** `c3be762` · **CI:** [43579598221](https://github.com/oneshubhamt/practice-desk/actions/runs/43579598221) — **success**, 14 November 2026.

This is a concise, inspectable addition to the existing [Pass E risk-and-invariant map](QA_PASS_E.md), [Pass E 442-case register](QA_PASS_E_CASE_REGISTER.tsv) and [Pass F assertion equivalence audit](QA_PASS_F.md). The historical ledger is retained **as a pre-G snapshot**; the eight added cases are catalogued below. No production behaviour or app source was changed.

## Outcome at a glance

| Evidence | Pass F | Pass G | Interpretation |
|---|---:|---:|---|
| Node test files | 35 | **39** | Four small, risk-focused property files |
| Executed Node cases | 442 | **450** | 443 fast + 7 deep; **eight new substantive contracts** |
| Node test source bytes | 611,172 | **638,130** | +26,958 bytes (+4.4%) for reference models, not historical compatibility scaffolding |
| Browser scenarios | 14 | **14** | Existing candidate and authoring journeys strengthened, not duplicated |
| Browser scenario-engine executions | 22 | **22** | 14 Chromium + 4 Firefox + 4 WebKit |
| Named semantic mutation faults | 10 | **14** | **14/14 killed** after baseline green, with named assertion failures |
| Production files modified | 0 | **0** | Test code, browser scenarios, mutation harness and QA docs only |

The test count increase is deliberate: the new tests protect independent risks not established by a superficial presence assertion. No previous case or browser scenario was removed or renamed.

## New case-to-risk and independent-witness register

| New executed case | Pass E invariant | Independent / metamorphic evidence | Plausible defect detected |
|---|---|---|---|
| **G scoring: seeded independent six-kind fractional ledger survives policy precedence and split/reordered sections** | SC01–SC03 | 160 reproducible seeds; separately computed per-item verdict and fractional marks, policy source precedence, partial-credit caps, manual-pending/blank/exclusion, independent section addition, response/answer-key input permutations and exclusion noninterference | Wrong rule precedence, accidental early rounding, order-dependent grading, manually graded item in automated ceiling, excluded answer altering marks |
| **G session: 120 seeded event histories are invariant under timer-tick refinement and rebase** | TM01–TM03 | 120 seeds × 75 mixed actions; compare one coarse checkpoint to two intermediate ticks and the same final event; assert all state, answer-event/visit evidence and rebase immutability | Event batching changes recorded answers, visits, foreground assignment, completion or timer state |
| **G session: independently calculated hidden/paused time is not misattributed across automatic sectional expiry** | TM01–TM03 | 100 seeded three-section runs, independently computed foreground accounting from known visible, hidden and paused intervals; exact section budgets and terminal limits | Hidden activity becomes claimed foreground, paused time consumes exam budgets, section overshoot double-attributes time |
| **G persistence: seeded CAS, insertion, deletion, disk failure and competing tabs obey a standalone transactional map** | HS01–HS04 | 55 seeds × 45 operations; independent Map as expected durable state, real fallback backend, injected `setItem` failure, stale-tab rejection, atomic insert and delete semantics | Failed write partially commits, stale writer silently overwrites newer bytes, invalid delete changes data |
| **G persistence: bulk completed deletion is atomic on stale versions and injected quota failure** | HS01–HS02 | Explicit three-record transaction; one stale row, one unfinished row and quota denial; byte-identical rejection plus successful retry | Bulk deletion removes an earlier item before a later conflict or drops recoverable data |
| **G publication: seeded private-key changes leave signed candidate content unchanged while altering only key evidence** | AU01–AU04, SEC02 | 70 source-independent drafts; inspect→compile equivalence; cloned repeat; change private key and separately explanation, verify candidate prompt unaffected, signed hashes and exact source immutability | Private answers exposed in candidate source, QA says ready for non-executable output, key/explanation contaminates unrelated content |
| **G publication: invalid mutations fail closed; revision increase is append-only with stable semantic question identity** | AU01–AU02 | 60 seeds; malformed answer, duplicate ID, alien section and duplicated physical section are rejected without compiled output; v2 gets a fresh revision identity while preserving semantic item identity and v1 source | Revision overwrite, invalid authoring accepted, identity drift or older signed source changed during failed publication |
| **G publication: failed durable write cannot partially publish a new revision or damage its predecessor** | AU02, HS02 | 40 seeded real `WorkspaceStore` fallback transactions: persist valid v1, refuse same-version edit, inject failure before durable v2 save, verify v2 absence and v1 bytes/answer key unchanged, retry successfully with both immutable revisions | Partial publication or failed retry erases prior source, creates half-published release or loses authenticated key |

*Independence qualification:* these cases use separately constructed expected ledgers, standalone state models and metamorphic transformations; not all properties are external reference standards. The actual authoring and scoring implementation is invoked only as the subject under test. Source authenticity and statutory accuracy are not implied.

### Targeted sensitivity evidence (four new independent faults)

| Intentionally introduced fault in sandbox | New witness required to fail |
|---|---|
| Prefer section scoring override over item-specific override | SC01 seeded scoring precedence/reference ledger |
| Count invisible session time as foreground exposure | TM01 independent three-section foreground ledger |
| Allow stale fallback writer to skip authoritative-byte change check | HS01 competing-tab transactional model |
| Append private answer text to candidate-visible authored stem | AU03 private-key/candidate-content separation |

The full **14/14** target mutation set requires baseline green and an assertion failure in the named test. The mutated source exists only inside a temporary copy and is restored byte-for-byte. The mutation score is **not** a global measure of test completeness.

## Stronger real-browser cross-feature witnesses

Changes were limited to the **existing** scenario modules `scripts/acceptance/scenarios/candidate.mjs` and `authoring.mjs`:

1. **Reviewed CGL candidate flow**: after completion, History and page reload, verify preserved published paper revision, exact frozen total and item count, and original completion provenance—not merely that the History row remains visible.
2. **Six-kind manual assessment flow**: after a self-assessed written answer, reload the Library and verify the manual mark remains saved, the immutable automatic score is not rewritten, and the written item retains its `pending` automated verdict.
3. **Real authoring→published exam→result flow**: after actual browser reload, verify that the published private answer-key hash, frozen score, completion reason and worked explanation remain bound to the signed source.

These are **browser-specific storage, reveal and navigation contracts**, not copies of the scoring reference formula. The existing actual browser tests of failed authoring, candidate answer-key secrecy before submission, and the offline immutable publication path remain active. No new browser engine matrix was introduced.

## Verification and actual cost

The source commit `c3be762` passed [GitHub Actions run 43579598221](https://github.com/oneshubhamt/practice-desk/actions/runs/43579598221): **443/443 fast Node, 7/7 deep Node, 14/14 targeted assertion-killed mutants**, 6 Chromium smoke + 8 Chromium deep, 4 Firefox cross + 4 WebKit cross, native/bundled FSRS smoke, browser Worker activation/probes, native/WASM parity and guarded publisher.

| Timed CI command | Observed duration |
|---|---:|
| Fast typecheck/build/443 Node | **39.36 s** |
| Deep 7 Node | 5.13 s |
| Targeted 14 mutants | 10.25 s |
| Chromium smoke / deep | 20.13 s / 49.12 s |
| Firefox cross / WebKit cross | 17.66 s / 29.20 s |
| Optimizer native/WASM parity | 0.71 s |

Measurements are one CI observation, not an SLA. Browser provisioning and runner competition remain variable; use controlled repeat samples for Pass H economics.

**Correction history:** initial run 43579048545 failed due to *test-oracle expectations*: free responses are intentionally excluded from the automated maximum, and the fallback tests asserted overly narrow error message variants. These were corrected, not patched around by changing production code. Subsequent workflow runs were cancelled by newer commits under CI concurrency. The final run 43579598221 succeeded on the complete code change.

## Boundary and open questions

- Fallback publication transaction failure is now exercised as an actual local-storage write rejection, and actual IndexedDB publication/reload is covered by browser workflows; neither alone proves atomicity during arbitrary **IndexedDB power loss** or OS process termination.
- The session properties model hidden and paused intervals; they do not replace testing physical laptop sleep, every browser visibility lifecycle, or accessibility with assistive technology.
- Candidate-content noninterference is stronger, but the complete adversarial all-surface answer-key-leak matrix from Pass E remains a **potential Pass H / focused security** improvement.
- Authenticated JSON hashes and reviewer-entered metadata do not prove external source correctness, real reviewer identity or statutory currency.
- No CI gate was weakened or moved. No product UI, offline policy, scoring, data model, import route or source code was changed.

**Disposition:** Pass G meets the stated mathematical/behavioural scope with the existing source-first risk map preserved. The next improvement should be **Pass H — CI economics, sensitivity adequacy, release authority and final closure**, rather than new browser math duplication.
