# Practice Desk — historical design and audit archive

The **active documents** are linked from [the documentation map](README.md). This page exists solely to locate earlier architectural thinking, policy decisions and full implementation/audit evidence **without loading them into the everyday agent context**.

Original Git commits are immutable snapshots: removing obsolete prose from the current branch **does not erase its historical content**. Never treat an archived “verified” or “pending” line as current status; inspect the present source, [programme](ENGINEERING_PROGRAMME.md) and [backlog](../backlog.md).

## Archived architecture and older programmes

**Pre-consolidation snapshot:** [commit `a10ac8917b39b5febd228dc825487aeb1d0dba8d`](https://github.com/oneshubhamt/practice-desk/tree/a10ac8917b39b5febd228dc825487aeb1d0dba8d).

- [Original large architecture and detailed contracts](https://github.com/oneshubhamt/practice-desk/tree/a10ac8917b39b5febd228dc825487aeb1d0dba8d/docs/architecture): earlier design trade-offs, all module boundaries and original P47–P60 architecture plans. The **enduring architecture** is now represented concisely in [current architecture](architecture/CURRENT_ARCHITECTURE.md) and [data contracts](architecture/DATA_CONTRACTS.md).
- [Independent P49/P50/P51 audit](https://github.com/oneshubhamt/practice-desk/blob/a10ac8917b39b5febd228dc825487aeb1d0dba8d/docs/audits/P49_P50_P51_INDEPENDENT_SOURCE_REAUDIT_2026-11-04.md): conceptual distinctions around subject hierarchy, Wordgard policy authoring and granular UI/unsaved-state safety; **not** a live defect list.
- [Full P48 source audit](https://github.com/oneshubhamt/practice-desk/blob/a10ac8917b39b5febd228dc825487aeb1d0dba8d/docs/audits/P48_REQUIREMENT_BY_REQUIREMENT_SOURCE_REAUDIT_2026-11-03.md) and [other historical source audits](https://github.com/oneshubhamt/practice-desk/tree/a10ac8917b39b5febd228dc825487aeb1d0dba8d/docs/audits): implementation-specific inspections, defect evidence and decisions as of their dates.
- [P60 AI-native capability design](https://github.com/oneshubhamt/practice-desk/blob/a10ac8917b39b5febd228dc825487aeb1d0dba8d/docs/architecture/P60_AI_NATIVE_CAPABILITY_PROGRAMME.md): original staged capability specification; current agent architecture is [content pipeline](architecture/AGENT_CONTENT_PIPELINE.md).
- [Original binding chronological policy register](https://github.com/oneshubhamt/practice-desk/blob/a10ac8917b39b5febd228dc825487aeb1d0dba8d/docs/decisions/POLICY_REGISTER.md) and [historical passes](https://github.com/oneshubhamt/practice-desk/tree/a10ac8917b39b5febd228dc825487aeb1d0dba8d/docs/history): earlier D01–D80 decisions, P04–P60 implementation diary and exceptions. [Current policy](decisions/POLICY_REGISTER.md) consolidates still-binding directions.

## Test-bench consolidation archive

**P61 verified closure snapshot:** [commit `81d232b9f7d43d9e0ce398e02c468b6f3e356ebc`](https://github.com/oneshubhamt/practice-desk/tree/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc).

- [P61 A–I implementation and source-to-assertion ledger](https://github.com/oneshubhamt/practice-desk/blob/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc/docs/TEST_SUITE_LEDGER.md)
- [Independent P61-H risk/contract audit](https://github.com/oneshubhamt/practice-desk/blob/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc/docs/audits/P61_H_INDEPENDENT_COVERAGE_AUDIT_2026-11-08.md)
- [P61-I final source-reconciled audit and objective exceptions](https://github.com/oneshubhamt/practice-desk/blob/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc/docs/audits/P61_I_FINAL_PROGRAMME_SOURCE_AUDIT_2026-11-08.md)
- [Final successful five-job CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42433146976): 408 Node tests, 10 targeted mutations and all 72 browser scenario executions, with guarded publishing.

The historical record includes **implementation minutiae**—old progress notes, temporary test counts, screenshots, step-by-step commits and previous QA failures—for audit or forensic use. It should **not** be duplicated in the current architecture, policy, QA or agent guides.

**Retention rule:** Do not rebase, squash, force-push or otherwise destroy pinned historical ancestry without separately preserving these evidence snapshots and obtaining approval.
