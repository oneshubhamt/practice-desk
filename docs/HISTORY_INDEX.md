# Practice Desk — historical evidence index

Active documentation describes the **current** system. This file only points to immutable historical snapshots that are useful for audits or design archaeology. Do not treat archived “verified”, “pending” or pass-number notes as current instructions.

## Earlier architecture/programmes

**Pre-consolidation snapshot:** [`a10ac8917b39b5febd228dc825487aeb1d0dba8d`](https://github.com/oneshubhamt/practice-desk/tree/a10ac8917b39b5febd228dc825487aeb1d0dba8d)

This snapshot retains the large architecture set, P04–P60 implementation diaries, chronological D01–D80 policy record, P48/P49/P50/P51 audits and the original P60 AI-native programme. Their enduring decisions were consolidated into current architecture/policy; implementation minutiae remain available at the snapshot.

## Test-bench consolidation

**P61 closure snapshot:** [`81d232b9f7d43d9e0ce398e02c468b6f3e356ebc`](https://github.com/oneshubhamt/practice-desk/tree/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc)

- [Full P61 assertion-retirement ledger](https://github.com/oneshubhamt/practice-desk/blob/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc/docs/TEST_SUITE_LEDGER.md)
- [Independent P61-H coverage audit](https://github.com/oneshubhamt/practice-desk/blob/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc/docs/audits/P61_H_INDEPENDENT_COVERAGE_AUDIT_2026-11-08.md)
- [P61-I final audit](https://github.com/oneshubhamt/practice-desk/blob/81d232b9f7d43d9e0ce398e02c468b6f3e356ebc/docs/audits/P61_I_FINAL_PROGRAMME_SOURCE_AUDIT_2026-11-08.md)
- [Final P61 CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42433146976)

## Source/editorial verification closure

The P62 sequence closed candidate-media secrecy, partial-blueprint readiness, exact Source pairing, mixed-kind comparison and candidate-semantic comparison, while preserving the separate limitation that software does not authenticate external sources.

**Focused closure source:** [`0a571a01443d`](https://github.com/oneshubhamt/practice-desk/tree/0a571a01443d) · [focused evidence run](https://github.com/oneshubhamt/practice-desk/actions/runs/42508271893) · [full protected CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42508271948)

## CLEER architecture closure

The clean-slate/CLEER programme moved package/attempt contracts below `app/`, narrowed controller capabilities, unified persistence/authoring/optimizer/build ownership, removed dead workflow residue and consolidated active documentation.

**Verified source:** [`a339837cca600b63ce0294acbbf96a917e3f16bb`](https://github.com/oneshubhamt/practice-desk/tree/a339837cca600b63ce0294acbbf96a917e3f16bb) · [full CI](https://github.com/oneshubhamt/practice-desk/actions/runs/43172682182): 438/438 Node tests, 10/10 targeted mutations, Chromium 32/32, Firefox 20/20, WebKit 20/20, native/WASM FSRS checks and guarded publication.

The publisher then created [`a31282fd14ce4bd1e5ff983a8c87a8e384d3cc80`](https://github.com/oneshubhamt/practice-desk/commit/a31282fd14ce4bd1e5ff983a8c87a8e384d3cc80), changing only the generated offline HTML.

## Retention

Do not rebase/squash/force-push away these pinned snapshots without separately preserving the evidence and obtaining authorization. Git history is the archive; active product code/docs should not carry old implementation diaries for provenance.
