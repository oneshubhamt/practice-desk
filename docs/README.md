# Practice Desk documentation — canonical map

**Reference:** frozen `baseline/v11` · **implementation:** `overhaul`. **Pass25 update (30 Oct):** Library first-viewport regression **L01 repaired and independently measured** at four laptop widths; **L02–L11 remain OPEN**, so desktop overall UI parity is **not yet demonstrated**. [Pass25 actual screenshot verification](audits/PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md#pass-25-implementation-status--one-of-eleven-findings-repaired-30-oct-2026). Previously, laptop screenshot/first-viewport visual parity **FAILED** despite green functional CI; exam/history tasks remain below fold. Engineering status is *not* full v11 UI parity or a release. Read the [laptop regression audit](audits/PASS24_LAPTOP_VISUAL_REGRESSION_2026-10-30.md) before the conditional earlier Pass23 source/functional report.

## Read in this order

| Need | Canonical location | Type |
|---|---|---|
| **Final verification / outstanding release gates** | [Pass 23 final independent audit and release report](audits/PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md) | All 25 current finding dispositions, six actual paired score/max checks, full automated CI evidence, explicit physical/AT/manual limitations and conditional status |
| **Original findings and chronological worklog** | [Independent V11 source audit / active scratchpad](audits/V11_SOURCE_AUDIT_2026-10-30.md) | Preserves the 25 original problem statements, Passes 17–23 reasoning, evidence, accepted deviations and handoffs |
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
    V11_SOURCE_AUDIT_2026-10-30.md  original 25 findings and active engineering worklog
    PASS23_FINAL_INDEPENDENT_REVIEW_2026-10-30.md  conditional final audit and manual-release gates
  history/
    BASELINE_V11_ARCHITECTURE.md    frozen original audit
    PASSES_04_16.md                complete development history
```

## Evidence and status precedence

1. **Verified current code** for what actually exists; source-only assessment does not prove behavior on a real device.
2. **Explicit user policy decisions**, written in the decision register, control intentional deviations and releases.
3. **Independent audit findings**, with current automated verification in the Pass 23 report. Differentiate previously repaired code from actual physical-device/human risks and unapproved release gates.
4. Existing automated tests/CI/screenshots are regression evidence; the **new** Pass 23 paired frozen v11-versus-current browser tests add independent representative source/behavior proof, **not** exhaustive UI/device/assistive-technology proof.
5. Historical per-pass checkmarks and preliminary scratchpad hypotheses are **archival**, not live release certification.

The original 15 `docs/*.md` files that informed Passes 4–16 were consolidated without silently discarding their text. The entire prior document tree remains permanently available at [Git commit `d4c36f928605`](https://github.com/oneshubhamt/practice-desk/tree/d4c36f9286059af970be342a7a894415517087aa/docs). Their working content and design decisions are folded into [PASSES_04_16.md](history/PASSES_04_16.md); the original v11 audit is separately archived.

## Changes and maintenance

- Keep this index and root README short. The dated Pass 23 report is the single final independent evidence matrix, not a competing implementer scratchpad. Do **not** recreate per-pass acceptance documents or duplicate historical checklists.
- Update architecture/data contracts only for actually implemented changes.
- Append explicit user-approved deviations to the decision register; don't bury decisions in a dated narrative.
- Create dated audits in `docs/audits/` with source branch SHAs, v11 comparison matrix, severities and open/closed reasons. Keep audit findings OPEN until code is repaired, re-reviewed and objectively verified.
- When implementing fixes: **audit → analyze → implement → reconcile objectives → targeted new QA**. Avoid relying solely on preexisting fixtures.
- Separate automatic source/runtime verification from real iOS/Android/macOS Safari, NVDA/VoiceOver, forced storage loss, manual keyboard navigation and human visual signoff.
- Only the user can approve merging into `main`; retain frozen `baseline/v11` intact.
