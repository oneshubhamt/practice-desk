# Practice Desk — current engineering status

**As of 8 November 2026 | Working branch: `overhaul`**

## Product baseline

Practice Desk is a modular strict-TypeScript application distributed as one deterministic, offline `file://` HTML file. The existing architecture includes:

- A single six-kind examination engine with explicit timing, navigation, marking and immutable paper/key revisions.
- Library, Wordgard authoring, results, original/reviewed source comparison, local IndexedDB History, SHA-checked additive backup v4 and learning/FSRS.
- A separate external-agent content pipeline for versioned source, syllabus blueprints, blind quality review, original/reviewed editorial versions, externally interpreted PDFs and permission-scoped file handoff.

See [architecture](architecture/CURRENT_ARCHITECTURE.md), [data contracts](architecture/DATA_CONTRACTS.md) and [content pipeline](architecture/AGENT_CONTENT_PIPELINE.md) for design and supported interfaces. The application does not embed an AI model, remotely access learner data or independently authenticate sources.

## Verified engineering state

The P61 test-bench programme is **closed**, following a source audit and [exact-commit CI](https://github.com/oneshubhamt/practice-desk/actions/runs/42433146976). The current required gate comprises **408 Node test cases; ten selected semantic mutations; 32 Chromium, 20 Firefox and 20 Linux WebKit real browser journeys; and guarded source-verified HTML publishing**. Source-code test coverage and CI outcomes do not independently validate question content or physical devices.

Current documentation is deliberately architecture-first. Detailed P04–P61 implementation records and original audit evidence remain recoverable through [pinned Git history](HISTORY_INDEX.md); they are not current work instructions. No product code, question-bank data or release policy was changed during this documentation restructuring.

## What is not closed

The [active backlog](../backlog.md) is the **single list of unresolved product risks and proposed work**, including P60 source-audit findings, independently sourced exam-content verification and real Mac/mobile/accessibility/storage-recovery testing. An existing architecture or passing synthetic fixture does not convert these into completed capabilities.

## Engineering discipline

For a newly authorized task: (1) inspect the actual source and affected consumers; (2) define the contract and a concrete failing counterexample; (3) change only the agreed scope, preserving offline, scoring, provenance and privacy invariants; (4) run independent Node/property and realistic browser journeys; (5) report the exact tested commit, limits and any residual risks. Do not weaken unique safety tests to lower counts, invent review authenticity or merge to `main`/`baseline/v11` without permission.

**Authority:** [AGENTS](../AGENTS.md) → [binding policy](decisions/POLICY_REGISTER.md) → actual source/validators → [QA](QA_CURRENT.md). Historical pass reports are background, not authority for current completion.
