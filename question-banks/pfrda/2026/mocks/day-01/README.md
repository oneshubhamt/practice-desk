# PFRDA Grade A 2026 — Day 1

This is an original practice mock under the PFRDA exam corpus.

- `manifest.json` is the paper address and edition map.
- `original/bank.authoring.json` is the canonical original-option source with the corrected 20-mark English manual-mark rule.
- `original/package.exam.json` is its compiled runtime package.
- `revised/bank.authoring.json` is the current improved source.
- `revised/package.exam.json` is the current improved runtime package.
- `archive/` contains recovery-only historical inputs and is never preinstalled.
- `audit.md` records content-review findings and verification limits.

Both active packages are currently preinstalled through the root catalog. They remain generic Practice Desk packages; disabling/removing the PFRDA catalog entry removes them from future builds without deleting PFRDA-specific runtime code, because none exists.
