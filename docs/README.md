# Practice Desk documentation — canonical map

**Reference**: frozen `baseline/v11` · **working implementation**: `overhaul` · **development state**: Passes 4–16 history consolidated; independent source audit found material open issues. **Do not claim complete v11-superset parity** until findings are repaired and re-audited.

## Read in this order

| Need | Canonical location | Type |
|---|---|---|
| **What to do next / what regressed?** | [Independent V11 source audit, 30 October 2026](audits/V11_SOURCE_AUDIT_2026-10-30.md) | The controlling 25 findings and Passes 17–23 plan; **Section G is the implementer's persistent working scratchpad**, updated during each pass |
| **Current architecture** | [Source topology, modules and lifecycle](architecture/CURRENT_ARCHITECTURE.md) | Current system, not historic proposals |
| **Data and scoring integrity rules** | [Data contracts](architecture/DATA_CONTRACTS.md) | Current contracts and known implementation gaps |
| **Non-negotiable engineering choices** | [Decision/policy register](decisions/POLICY_REGISTER.md) | Binding user-approved decisions, accepted exceptions |
| **All Passes 4–16 work, original checklists and full parity matrix** | [Consolidated historical engineering record](history/PASSES_04_16.md) | Complete archived implementation rationale and older acceptance notes |
| **Why overhaul began / early v11 audit** | [Frozen original v11 architectural assessment](history/BASELINE_V11_ARCHITECTURE.md) | Historic starting diagnosis, not current status |
| **Contribution and build** | [Root README](../README.md) · [root AGENTS](../AGENTS.md) | Entry, branch safety, five-step source-first workflow |

## Information hierarchy

```text
README.md                    concise product / build / entry points
AGENTS.md                    binding developer constraints
docs/
  README.md                  this navigation and evidence hierarchy
  architecture/
    CURRENT_ARCHITECTURE.md  present source/runtime map
    DATA_CONTRACTS.md        immutable records, rule invariants, persistence
  decisions/
    POLICY_REGISTER.md       approved decisions and deliberate exceptions
  audits/
    V11_SOURCE_AUDIT_2026-10-30.md  independent active findings, not prior fixtures
  history/
    BASELINE_V11_ARCHITECTURE.md    frozen original audit
    PASSES_04_16.md                complete development history
```

## Evidence and status precedence

1. **Verified current code** for what actually exists; source-only assessment does not prove behavior on a real device.
2. **Explicit user policy decisions**, written in the decision register, control intentional deviations and releases.
3. **Independent audit findings**, currently OPEN until checked against repaired source. Differentiate confirmed code paths from risks requiring runtime proof.
4. Existing automated tests, CI and screenshots are *regression checks* but **not independent source-parity proof**.
5. Historical per-pass checkmarks and preliminary scratchpad hypotheses are **archival**, not live release certification.

The original 15 `docs/*.md` files that informed Passes 4–16 were consolidated without silently discarding their text. The entire prior document tree remains permanently available at [Git commit `d4c36f928605`](https://github.com/oneshubhamt/practice-desk/tree/d4c36f9286059af970be342a7a894415517087aa/docs). Their working content and design decisions are folded into [PASSES_04_16.md](history/PASSES_04_16.md); the original v11 audit is separately archived.

## Changes and maintenance

- Keep this index and root README short. Do **not** recreate per-pass acceptance documents or duplicate historical checklists.
- Update architecture/data contracts only for actually implemented changes.
- Append explicit user-approved deviations to the decision register; don't bury decisions in a dated narrative.
- Create dated audits in `docs/audits/` with source branch SHAs, v11 comparison matrix, severities and open/closed reasons. Keep audit findings OPEN until code is repaired, re-reviewed and objectively verified.
- When implementing fixes: **audit → analyze → implement → reconcile objectives → targeted new QA**. Avoid relying solely on preexisting fixtures.
- Separate automatic source/runtime verification from real iOS/Android/macOS Safari, NVDA/VoiceOver, forced storage loss, manual keyboard navigation and human visual signoff.
- Only the user can approve merging into `main`; retain frozen `baseline/v11` intact.
