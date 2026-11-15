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
        → original/...
        → revised/...
```

Nested manifests own year, paper, edition and canonical source/package paths. The build loader follows this graph; catalog entries do **not** duplicate package/content paths. A path that is not reachable through the manifest graph is not active bank content.

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
          original/
          revised/
      mocks/
        <paper>/
          manifest.json
          original/
          revised/
```

PFRDA-style generic banks use `bank.authoring.json` as the human/AI editing surface and `package.exam.json` as generated runtime material. Recovery/transcription evidence belongs under `archive/`.

SSC CGL uses the same canonical package topology as every other included exam. Each PYQ keeps immutable Original/Source and Revised/Reviewed `package.exam.json` editions in its paper folder; preserved raw transcription, patches and solutions are archive evidence used only by tooling equivalence tests, never runtime inputs.

## Efficient AI traversal

1. Read `catalog.json`.
2. Follow the selected exam manifest, then year manifest, then paper manifest.
3. Read only the paper/edition required.
4. For canonical authoring banks, prefer `bank.authoring.json` or `question-bank-agent.mjs inspect/show`.
5. Open compiled `.exam.json` only when runtime-package inspection is needed.
6. Do not scan archives or unrelated papers by default.

## Preinstallation, removal and append

Set a family to `preinstalled: true` in the root catalog to include all canonical papers reachable through its manifest graph. Set it to `false` (or remove the family entry) and rebuild to remove it cleanly.

To append a paper, create one self-contained paper folder and add exactly one entry to its year manifest. No root-catalog package path and no exam-specific scorer/UI branch are required.

Catalog inclusion is packaging policy, not proof that content is official or factually correct.
