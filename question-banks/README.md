# Practice Desk question banks

This directory is the repository corpus for examination content. Runtime/domain code stays under `src/`; generic format examples stay under `examples/`.

## One authoritative manifest graph

`catalog.json` owns only exam-family identity, the root manifest address and whether that family is preinstalled.

```text
catalog.json
  → <exam>/manifest.json
    → <year>/manifest.json
      → pyqs/<paper>/manifest.json
      → mocks/<paper>/manifest.json
        → <edition>/bank.authoring.json   (when authoring source exists)
        → <edition>/package.exam.json
        → <edition>/quality-review.json    (when bound)
        → <edition>/blueprint.json         (when bound)
```

Nested manifests own year, paper, edition and canonical paths. The build loader follows this graph; catalog entries do **not** duplicate content paths. A path that is not reachable through the manifest graph is not active bank content.

### Executable manifest contract

- `contentTypes` is non-empty, unique and limited to `pyq` / `mock`; year entries must conform to it.
- `currentPaperRef` names a **paper-manifest node**. Catalog loading resolves it to the canonical immutable runtime `currentPaperRevisionId`.
- An edition that declares `authoring` must point to a file named `bank.authoring.json`. That file is the sole maintained source for the edition; `package.exam.json` is generated material and catalog loading rejects any source/package divergence.
- A maintained authoring edition may bind `qualityReview` to `quality-review.json` and `blueprint` to `blueprint.json`. A non-null binding is executable evidence: catalog loading re-runs the corresponding gate against the exact current `bank.authoring.json` and rejects stale, invalid or publication-incomplete evidence.
- A preinstalled canonical maintained **mock** must declare both evidence fields explicitly. `null` means no bound review/blueprint and carries no certification; it is deliberately different from a passing sidecar.
- Runtime packages are always named `package.exam.json`.
- `archive` entries must stay under the paper's `archive/` directory and name existing files.
- `audit`, when present, must name an existing Markdown file.
- Narrative identity policy is documentation, not executable manifest state. Immutable IDs, edition lineage and source/package equality carry the enforceable identity contract.

## Layout

```text
question-banks/
  catalog.json
  <exam>/
    manifest.json
    <year>/
      manifest.json
      pyqs/
        <paper>/
          manifest.json
          <edition>/
          archive/
      mocks/
        <paper>/
          manifest.json
          <edition>/
          archive/
```

For maintained generic authoring banks, `bank.authoring.json` is the human/AI editing surface and `package.exam.json` is its deterministic runtime projection. Bound quality/blueprint sidecars are evidence about that exact source revision, not alternate content authorities. Recovery/transcription/generation history belongs under `archive/` and must never overwrite active authoring sources.

SSC CGL uses the same canonical package topology as every other included exam. Its immutable Source/Reviewed packages are canonical because those migrated editions do not declare active `authoring` sources; preserved raw transcription, patches and solutions are archive evidence used only by equivalence tooling.

## Efficient AI traversal

1. Read `catalog.json`.
2. Follow the selected exam manifest, then year manifest, then paper manifest.
3. Read only the paper/edition required.
4. When an edition declares `authoring`, edit only its `bank.authoring.json` and regenerate the package through the canonical compiler.
5. Open compiled `.exam.json` only for runtime inspection.
6. Do not scan archives or unrelated papers by default.

## Preinstallation, removal and append

Set a family to `preinstalled: true` in the root catalog to include all canonical papers reachable through its manifest graph. Set it to `false` and rebuild to exclude that family cleanly while keeping its corpus installed. To remove a family from the repository corpus entirely, delete both its catalog entry and its active family directory in the same change; reciprocal reachability intentionally rejects unregistered active bank files.

To append a paper, create one self-contained paper folder and add exactly one entry to its year manifest. No root-catalog package path and no exam-specific scorer/UI branch are required.

Catalog inclusion is packaging policy, not proof that content is official or factually correct.
