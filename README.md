# Practice Desk

Practice Desk is a **local-first examination and learning application**. Its static build provides six question kinds, configurable exam rules, original/reviewed editions, immutable scored attempts, History, checked backups, Wordgard authoring, FSRS-7 revision and local browser/WASM weight optimization. A standalone `file://` HTML remains available as a compatibility/offline fallback, but in-app FSRS training requires the static build. Practice Desk does **not** contain an embedded AI model or independently certify imported questions.

## Use the application

1. Install Node.js 26 LTS (26.13.0 or newer 26.x) and run `npm ci --no-audit --no-fund`.
2. Run `npm install --prefix tools/fsrs-optimizer --package-lock=false --no-audit --no-fund` to install the isolated native + WASM optimizer bindings.
3. Run `npm run check` for the core application, or `npm run build:static` to additionally build `Practice_Desk_Static/` with the browser optimizer Worker/WASM.
4. For the full-capability app, serve `Practice_Desk_Static/` over localhost or HTTPS and open its `index.html`. The directory has no required backend; the optimizer runs locally in the browser.
5. `Practice_Desk_Offline_Mock_Tests.html` can still be opened directly with `file://` when a one-file fallback is preferable; scheduling works, but browser weight training is disabled.
6. Create questions in Wordgard or explicitly import a validated bank from Library. Keep your own backups.

External agents may create versioned question-bank JSON with repository CLI tools. **They cannot directly access the user's browser History, import content automatically or verify a claimed PYQ solely from a source hash.** Start with the [agent quickstart](docs/AGENT_AUTHORING_QUICKSTART.md).

## Documentation

Use the [task-oriented documentation index](docs/README.md); do not read every file. Engineers start at [AGENTS.md](AGENTS.md), then the [as-built architecture](docs/architecture/CURRENT_ARCHITECTURE.md) and source. The [current backlog](backlog.md) identifies unresolved risks and separate release gates. Original historical programme records are preserved through [pinned Git history](docs/HISTORY_INDEX.md), not copied into active guidance.

## Verified status and limits

The P61 test-bench consolidation is closed on **`overhaul`**. [Final CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42433146976) passed 408 Node tests, ten selected semantic-mutation checks, 32 Chromium + 20 Firefox + 20 Linux WebKit acceptance journeys and guarded publishing. That verifies bounded software contracts—not independent official question accuracy, physical Mac/mobile accessibility, OS data recovery or release approval.

`main` and `baseline/v11` are protected from unapproved changes. Changes to `overhaul` require a task-specific instruction.
