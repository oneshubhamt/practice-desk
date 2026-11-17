# Practice Desk question banks

This directory is the repository corpus for examination content. Runtime/domain code stays under `src/`; generic format examples stay under `examples/`.

## One authoritative manifest graph

`catalog.json` owns only exam-family identity, the root manifest address and whether that family is preinstalled.

```text
catalog.json
  → <exam>/manifest.json
    → <year>/manifest.json
      → <year>/taxonomy.json              (when the year owns semantic taxonomy)
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
- A year manifest may bind `taxonomy` to `taxonomy.json`. The versioned `practice-desk-taxonomy` sidecar owns stable Subject → Topic → Subtopic node IDs, canonical labels and narrowly scoped aliases. Catalog loading validates the hierarchy and exam identity.
- When a maintained authoring edition lives under a year taxonomy, every authored question must resolve its explicit `subject` / optional `topic` / optional `subtopic` path to that taxonomy. The runtime package receives question-revision → taxonomy-node assignments only after checked-in source/package equivalence has passed; the generated `package.exam.json` is not hand-rewritten merely to attach taxonomy.
- An edition that declares `authoring` must point to a file named `bank.authoring.json`. That file is the sole maintained source for the edition; `package.exam.json` is generated material and catalog loading rejects any source/package divergence.
- A maintained authoring edition may bind `qualityReview` to `quality-review.json` and `blueprint` to `blueprint.json`. Bound sidecars live beside that edition's `bank.authoring.json`; catalog loading re-runs the corresponding gate against the exact current source and rejects cross-edition ownership, stale, invalid or publication-incomplete evidence.
- A preinstalled canonical maintained **mock** backed by `bank.authoring.json` must bind both passing sidecars. Missing or `null` evidence is rejected rather than being treated as publication-ready. Noncanonical/nonpreinstalled editions may still omit evidence when they are intentionally retained as source/archive material.
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
      taxonomy.json        # optional, year-owned semantic taxonomy
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

For maintained generic authoring banks, `bank.authoring.json` is the human/AI editing surface and `package.exam.json` is its deterministic runtime projection. An exam taxonomy is data, not runtime source code: authoring uses explicit semantic labels, while the catalog resolves those labels to stable taxonomy nodes when that year declares a taxonomy. Bound quality/blueprint sidecars are evidence about that exact source revision, not alternate content authorities. Recovery/transcription/generation history belongs under `archive/` and must never overwrite active authoring sources.

SSC CGL uses the same canonical package topology as every other included exam. Its immutable Source/Reviewed packages are canonical because those migrated editions do not declare active `authoring` sources; preserved raw transcription, patches and solutions are archive evidence used only by equivalence tooling.

## Efficient AI traversal

1. Read `catalog.json`.
2. Follow the selected exam manifest, then year manifest, then paper manifest. If the year declares `taxonomy.json`, read it when authoring, blueprinting or semantic classification is relevant.
3. Read only the taxonomy/paper/edition required.
4. When an edition declares `authoring`, edit only its `bank.authoring.json` and regenerate the package through the canonical compiler.
5. Open compiled `.exam.json` only for runtime inspection.
6. Do not scan archives or unrelated papers by default.

## Preinstallation, removal and append

Set a family to `preinstalled: true` in the root catalog to include all canonical papers reachable through its manifest graph. Set it to `false` and rebuild to exclude that family cleanly while keeping its corpus installed. To remove a family from the repository corpus entirely, delete both its catalog entry and its active family directory in the same change; reciprocal reachability intentionally rejects unregistered active bank files.

To append a paper, create one self-contained paper folder and add exactly one entry to its year manifest. No root-catalog package path and no exam-specific scorer/UI branch are required.

Catalog inclusion is packaging policy, not proof that content is official or factually correct.
