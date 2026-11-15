# Archived PFRDA Day 1 provenance utilities

These files preserve how the historical Day 1 material was recovered and how the later revised practice content was reconstructed.

They are **not** active corpus generators:

- `recover-from-share.mjs` may write only recovery evidence under the parent `archive/` directory.
- `verify-historical-reconstruction.mjs` reconstructs historical objects in memory and compares them with the maintained `original/revised bank.authoring.json` files; it never writes active content.
- `review-content.mjs` is frozen reconstruction input used by that verifier.

The active maintained sources are the edition-local `bank.authoring.json` files declared by the paper manifest. Runtime `package.exam.json` files are deterministic projections verified by the catalog loader.
