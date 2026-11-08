# Practice Desk

An offline, single-file examination and learning application. It supports six question kinds, immutable exam/answer histories, author-supplied and SSC CGL Source/Reviewed editions, Wordgard manual authoring, AI-assisted external question-bank generation, post-test analytics, backups and FSRS revision. Imported content is not automatically official or fact-checked.

## Use
1. Install Node.js 24 and run `npm ci --no-audit --no-fund`.
2. Run `npm run check` (strict TypeScript, deterministic build, Node tests).
3. Open the generated `Practice_Desk_Offline_Mock_Tests.html` directly through `file://`.
4. In Library, import your supported JSON bank or create questions with Wordgard. Exam, History and Learning remain local to your browser; export backups deliberately.

For agents creating banks, read [quickstart](docs/AGENT_AUTHORING_QUICKSTART.md), [AI application guide](docs/AI_APPLICATION_GUIDE.md), then only the relevant focused contract. External agents do **not** automatically access the app, device History or learner records.

## Engineering
- [Documentation index](docs/README.md)
- [Current architecture](docs/architecture/CURRENT_ARCHITECTURE.md) and [data contracts](docs/architecture/DATA_CONTRACTS.md)
- [Current programme and deferred findings](docs/ENGINEERING_PROGRAMME.md)
- [QA instructions](docs/QA_CURRENT.md), [test strategy and documented deviations](docs/TEST_STRATEGY.md), and [P61 final audit](docs/audits/P61_I_FINAL_PROGRAMME_SOURCE_AUDIT_2026-11-08.md)
- [Historic original engineering/audit documents](docs/HISTORY_INDEX.md) retained at an immutable source commit

**Status:** P61 test-bench re-engineering has passed its independent source audit; formal P61-I closure is gated by the final exact-commit five-job CI. The authorized engineering branch is `overhaul` after the verified `Satyam` fast-forward. Prior [green CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42410827277) does not prove independent question truth, actual Mac/mobile/assistive-technology use or user release approval. Do not modify `main` or `baseline/v11` without authorization.
