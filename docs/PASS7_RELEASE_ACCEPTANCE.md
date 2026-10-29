# Pass 7 — Exam and review correctness

Scope is **source-backed, policy-correct exam behavior** and frozen review. UI redesign and broad analytics belong to Passes 8–9. Follow the workflow and document map in [AGENTS.md](../AGENTS.md).

## Acceptance criteria (check only with concrete tests)

- [ ] Engine owns and enforces early submission, section locking, forward-only, pause and flagging policies; UI never is the only enforcement boundary
- [ ] Running and restored sessions do not silently extend or double-count timers, including visibility/offline and clock rollback
- [ ] Attempt mode denotes strict simulation vs flexible/full/section practice vs custom
- [ ] Review renders exact frozen passage, figure, option and matching media, with actual response and correct answer, without needing the current paper package
- [ ] Source/patch citations and source page provenance preserved when converting built-in content; no fabricated provenance
- [ ] Draft/incomplete/invalid/under-review editorial states excluded or clearly identified; scoring does not reward unverified content
- [ ] Free-response is not silently auto-graded; separate explicit manual marks (if implemented) must not change the immutable exam score snapshot
- [ ] Negative policy tests, score/review fixtures, and offline Chromium smoke, including all legacy modes and non-CGL fixture
- [ ] Architecture scratchpad updated with objective-by-objective evidence and CI for final HEAD

Manual Firefox/Safari, real devices and v11 UI feature parity remain independent later gates.
