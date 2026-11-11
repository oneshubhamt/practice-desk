# Practice Desk

Practice Desk is a **local, offline examination and learning application**. Its standalone HTML provides six question kinds, configurable exam rules, original/reviewed editions, immutable scored attempts, History, checked backups, Wordgard authoring and FSRS-based revision. It does **not** contain an embedded AI model or independently certify imported questions.

## Use the application

1. Install Node.js 26 LTS (26.13.0 or newer 26.x) and run `npm ci --no-audit --no-fund`.
2. Run `npm run check` to typecheck, build and run the Node test suite.
3. Open `Practice_Desk_Offline_Mock_Tests.html` directly with `file://`.
4. Create questions in Wordgard or explicitly import a validated bank from Library. Keep your own backups.

External agents may create versioned question-bank JSON with repository CLI tools. **They cannot directly access the user's browser History, import content automatically or verify a claimed PYQ solely from a source hash.** Start with the [agent quickstart](docs/AGENT_AUTHORING_QUICKSTART.md).

## Documentation

Use the [task-oriented documentation index](docs/README.md); do not read every file. Engineers start at [AGENTS.md](AGENTS.md), then the [as-built architecture](docs/architecture/CURRENT_ARCHITECTURE.md) and source. The [current backlog](backlog.md) identifies unresolved risks and separate release gates. Original historical programme records are preserved through [pinned Git history](docs/HISTORY_INDEX.md), not copied into active guidance.

## Verified status and limits

The P61 test-bench consolidation is closed on **`overhaul`**. [Final CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42433146976) passed 408 Node tests, ten selected semantic-mutation checks, 32 Chromium + 20 Firefox + 20 Linux WebKit acceptance journeys and guarded publishing. That verifies bounded software contracts—not independent official question accuracy, physical Mac/mobile accessibility, OS data recovery or release approval.

`main` and `baseline/v11` are protected from unapproved changes. Changes to `overhaul` require a task-specific instruction.
