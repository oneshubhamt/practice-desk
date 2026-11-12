# Practice Desk

Practice Desk is a **local-first examination and learning application** with six question kinds, explicit exam rules, Source/Reviewed editions, immutable scored attempts, local History/backups, Wordgard authoring and FSRS-7 revision.

The full-capability distribution is `Practice_Desk_Static/`, served over localhost or HTTPS. It adds a local browser Worker/WASM FSRS optimizer and requires no application backend. `Practice_Desk_Offline_Mock_Tests.html` is the deterministic one-file `file://` distribution; examination, persistence and scheduling work there, while in-app weight training is intentionally unavailable.

## Build and verify

Use Node.js **26.13.0** with the committed lockfiles.

```bash
npm ci --no-audit --no-fund
npm run check
npm ci --prefix tools/fsrs-optimizer --no-audit --no-fund
npm run build:static
```

For the complete verification contract, including mutation checks and Chromium/Firefox/WebKit journeys, use [QA_CURRENT.md](docs/QA_CURRENT.md). Generated HTML is build output; do not hand-edit it.

## Content

Questions can be authored in Wordgard, supplied as canonical `practice-desk-authoring` v1 JSON, or imported as a validated `practice-desk-exam` package. External agents can create/review versioned files through local CLI tools, but cannot access browser History, silently import content, or authenticate a claimed PYQ merely from a hash. Start with the [agent authoring quickstart](docs/AGENT_AUTHORING_QUICKSTART.md).

## Documentation

Use the [documentation map](docs/README.md) rather than reading every file. Engineers start with [AGENTS.md](AGENTS.md) and the affected source; consult the [architecture](docs/architecture/CURRENT_ARCHITECTURE.md), [data contracts](docs/architecture/DATA_CONTRACTS.md), [QA contract](docs/QA_CURRENT.md) and [live backlog](backlog.md) only as needed. Historical programme evidence is indexed in [HISTORY_INDEX.md](docs/HISTORY_INDEX.md).

The authorised development branch is **`working`**. Do not alter `main` or `baseline/v11`, merge, or release without explicit authorization.
