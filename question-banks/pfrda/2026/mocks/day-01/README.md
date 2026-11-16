# PFRDA Grade A 2026 — Day 1

This is an original practice mock under the PFRDA exam corpus.

- `manifest.json` is the paper address and edition map.
- `original/bank.authoring.json` is the sole maintained source for Original r1.
- `revised/bank.authoring.json` is the sole maintained source for Revised Practice r4.
- Each adjacent `package.exam.json` is generated runtime material; catalog loading fails if it differs from its authoring source.
- `archive/` contains recovery/transcription/editorial provenance only and is never a maintained content source.
- `archive/provenance/` contains the historical recovery/reconstruction utilities. They may reconstruct or verify history, but they do not publish or overwrite active authoring sources.
- `audit.md` records content-review findings and verification limits.

Both active revisions remain reachable through the paper manifest; `canonicalEdition: revised` and the exam-level `currentPaperRef` select Revised Practice as the default current paper. Disabling/removing the PFRDA catalog entry removes the family from future builds without PFRDA-specific runtime code.
