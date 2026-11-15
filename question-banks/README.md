# Practice Desk question banks

This is the repository corpus for examination content. Runtime/domain code stays under `src/`; generic authoring examples stay under `examples/`.

## Layout

```text
question-banks/
  catalog.json
  <exam>/
    manifest.json
    <year>/
      manifest.json
      pyqs/
        <paper>/original/...
        <paper>/revised/...
      mocks/
        <paper>/original/...
        <paper>/revised/...
```

Each paper has a machine-readable manifest. `bank.authoring.json` is the canonical human/AI editing surface; `package.exam.json` is a compiled runtime artifact. Recovery/transcription evidence belongs under `archive/`, not beside the current editable bank.

## Efficient AI traversal

1. Read `catalog.json` to locate the exam family.
2. Follow the exam/year/paper manifest.
3. Read the paper's current `bank.authoring.json`, or use `question-bank-agent.mjs inspect/show` for bounded context.
4. Open generated `.exam.json` only when validating runtime packaging.
5. Do not scan every exam folder or archive by default.

## Preinstallation

`preinstalled: true` plus explicit package/content paths makes a maintained family available in Library at build time. Set it to `false` or remove the family entry and rebuild to remove **any** family, including SSC CGL, cleanly. For package-based families, one package may be marked `current: true`; that revision is the default when the user first selects the family. Add a paper by placing it in the exam hierarchy and listing its package; no exam-specific scorer/UI branch is required.

Catalog inclusion says nothing by itself about official provenance or factual accuracy.
