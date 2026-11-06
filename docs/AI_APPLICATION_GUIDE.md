# Practice Desk — AI application guide (P60-A, current capabilities)

**Audience:** ChatGPT, Claude, Codex and other external agents; vendor-neutral. **Read after the [short authoring quickstart](AGENT_AUTHORING_QUICKSTART.md) only when the task needs application understanding.** This is a truthful description of the existing offline app, **not** a promise that agents can remotely operate a user's local copy.

## What Practice Desk does

Practice Desk is a **standalone offline examination and learning studio**. It can hold separate examination families and authored papers, conduct practice/exams with actual frozen paper rules, evaluate six question kinds, preserve detailed historical attempts, help learners inspect results, build evidence-based practice and manage learning/revision cards with an FSRS-based explicit review scheduler. The same application offers an editable Wordgard authoring workflow, source/correction editorial labels and a strict external AI-question-bank import pipeline.

The **student** uses Library → Exam → Results/History → Learning/Revision. The **content author** uses external source-grounded AI → `practice-desk-authoring` JSON → deterministic QA/compile → optional staging/Wordgard corrections → explicit Library publication. A **source auditor** checks factual claims and source-key consistency outside the app and records documented editorial revisions. A **software engineering agent** may read actual source, but content-authoring agents should not need to.

**Do not mistake the infrastructure for content**: the engine can represent APFC, CAT, UPSC and RBI exams, but complete independently fact-checked banks are not automatically bundled. Current built-in source/reviewed content is SSC CGL. The app has no embedded model or cloud connection.

## The correct low-context starting point

```bash
# Current read-only discovery interface: JSON output, no browser/DB access
node scripts/practice-desk-capabilities.mjs summary
node scripts/practice-desk-capabilities.mjs list
node scripts/practice-desk-capabilities.mjs show ai-authoring
node scripts/practice-desk-capabilities.mjs operations

# Current authoring and correction tools (P57–P59)
node scripts/question-bank-agent.mjs inspect my-bank.json
node scripts/question-bank-agent.mjs show my-bank.json question-01
node scripts/question-bank-agent.mjs patch my-bank.json patch.json NEW-bank.json --dry-run
node scripts/question-bank-cli.mjs qa-bank NEW-bank.json
node scripts/question-bank-cli.mjs compile-bank NEW-bank.json NEW-paper.json
```

For ordinary question generation, **read only the one-page quickstart, one relevant APFC or CAT example and the specific capability/task slice**. Query `show` for one question when repairing. Do not ingest every application file, history record or entire bank by default. Shared table/passage/image content should be referenced rather than redundantly repeated.

## How its features work together

| Area | Current actual functionality | Agent implication |
| --- | --- | --- |
| **Exam Library** | Built-in CGL and imported families separated; source/reviewed/custom papers and revisions. | Keep `examId`, paper, edition and revision identities honest; importing does not mean official. |
| **Exam engine** | Single-choice, multiple-select, numeric, true/false, matching and free response; real scorer, optional matching/multiple-select component marks, manual free-response outcome. | One key per single-choice, correct response format for other kinds; do not create a second scoring algorithm. |
| **Timing and navigation** | Untimed, whole-paper and section-timed policies, restricted/free navigation, pause/review as authored; offline-safe app navigation. | Declare executable paper rules explicitly. Don't infer an exam's official timing from its title. |
| **Taxonomy** | Academic Subject → Topic → Subtopic independent of physical sections; nine APFC broad syllabus roots. | A single APFC paper can have one physical section yet contain many subjects; subject is not an exam-section ID. |
| **Custom practice** | Selects genuine eligible items from one frozen source with seeded section/topic/difficulty filters. | Check available inventory before promising a particular custom set. Cross-paper universal blueprints are planned, not implemented. |
| **Results and History** | Real scores, response outcomes, measured timing and attempt records, frozen answer/source identity; mode/source-aware history. | Report measured evidence only; no invented percentile, rank or time. History is local to the user's device. |
| **Learning and revision** | Notebook, error tags, bookmarks, student notes, explicit FSRS ratings, evidence-backed wrong/blank/slow/flagged/due revision choices. | Do not convert marks into assumed mastery or user grades, and do not regrade immutable attempts. |
| **Source and corrections** | Existing SSC CGL source vs reviewed comparison only when semantics justify it; caution/invalid question flags. | Preserve source key and reviewed correction separately; P60-D universal editorial workflow is still planned. |
| **AI authoring** | Strict external v1 JSON, paged `inspect`, one-question `show`, guarded `patch`, duplicate/arithmetic/structure QA, staging, Wordgard, immutable publication. | External reasoning must fact-check; a valid package and SHA are *not* proof of true facts. |
| **Rich content** | Shared RC/DILR passages, cases, tables, charts, image media with alt text; canonical rich/math AST and KaTeX. | Avoid duplicated stimuli; source figures and math must be checked before publication. |
| **Offline storage** | Local persistence, frozen history/answer snapshots and explicit backup v4; separate unpublished staging/draft archives. | No direct user-device access, silent sync, recovery after missing backups or remote API. |

## P60-B — planned coverage before content creation

For nontrivial question banks, use the [Content Production Blueprint](architecture/P60B_CONTENT_BLUEPRINT.md) to record exact targets, source origin, paper rules and required classification; run read-only `content-blueprint.mjs validate/audit` or enforce `--blueprint` in the existing single-source compiler. This prevents silently missing user-requested quotas, but does **not** establish semantic syllabus accuracy or factual truth. The guide remains low-context: only fetch the blueprint contract and one source example for authoring; avoid reading the exam engine implementation. Multi-batch audits must not be misrepresented as an in-browser publication gate.

## Recommended task routes

**Generate new questions:** Read [authoring quickstart](AGENT_AUTHORING_QUICKSTART.md) + **one** [APFC](../examples/ai-first-apfc.json) or [CAT](../examples/ai-first-cat.json) example → research the syllabus and sources → author ~10–30 genuine questions in the existing `practice-desk-authoring` v1 source → check each key/distractor independently → run compact `inspect`/full `qa-bank` and targeted `show`/SHA patch → generate a new validated file → import into the offline Library. Respect source-count and user specifications, even though full formal P60-B quota enforcement is not yet available.

**Repair one item:** `inspect` for issues → `show` for exact question, digest and linked stimulus → inspect actual factual documents → create a delta `patch` → `--dry-run` → new versioned source → repeat QA. Material changes reopen `needs-review`; an author-claimed official PYQ cannot silently retain that claim after key/stem/option edits. A citation record is not a verification result.

**Work with a previous-year PDF:** An external AI must independently read and transcribe the PDF, preserve original page/number/key/figures, flag uncertainty, review sources/solutions and emit the same structured format. The offline app **does not currently** offer automatic PDF intake. Generalized source-vs-reviewed storage and independent factual QA are P60-D/C targets, not present features.

**Support learner revision:** Read the relevant `learning-revision` and `history-results` capability entries, then only authorized exported learner evidence; recommend revision cards based on observed mistakes and due status. No automatic external agent connection to device-local History or Learning exists.

**Software/app functionality development:** Use engineering sources and [P60 programme](architecture/P60_AI_NATIVE_CAPABILITY_PROGRAMME.md); implement new capabilities behind versioned contracts, preserve scoring/backups/old CGL and publish only after real regression evidence. Current guide describes functionality for content agents; it is not a substitute for source inspection when changing code.

## Limits, evidence and quality policies

- **Factual accuracy:** offline QA detects structural issues, duplicate candidates, a narrow class of arithmetic mistakes and author-citation presence. It does **not** check statutory commencement, primary-source authenticity, PYQ identity, source claims or semantic answer quality. Any actual-source check must state which text/date/page was read and what remains uncertain.
- **Candidate-view safety:** questions and stimuli shown before permitted submission/review must not leak the answer, a hidden reasoning hint, explanation, editorial note or flagged official-key dispute. This must be assessed against real rendered exam UI as well as text, without pretending offline client code offers cryptographic secrecy.
- **Source preservation:** never silently rewrite original wording, diagrams or published answer keys. Keep reviewed changes separately with reasons and ambiguity warnings; only compare scores for genuinely semantically comparable material. Full generic P60-D lineage is still a proposal.
- **Privacy and writes:** the capabilities CLI is read-only, handles only repository documentation, and does not open the browser, History, IndexedDB or any cloud account. `patch` creates **new** source files. Library import/publication remains a separate user action.
- **Operational limits:** external source files max 200 questions; staging max 8 files/400 items and Wordgard max 200 selected; pending drafts and staging require separate backups from History v4. Media and local persistence have their own validated budgets.
- **Release boundaries:** CI in Chromium/Firefox/Linux WebKit does not establish actual Mac Safari, iOS/Android, screen reader/IME, OS eviction, authentic content verification or human UI approval.

## Where to look next — only if needed

- **Machine contract:** [`contracts/practice-desk-capabilities.v1.json`](contracts/practice-desk-capabilities.v1.json).
- **One-page authoring and command contract:** [`AGENT_AUTHORING_QUICKSTART.md`](AGENT_AUTHORING_QUICKSTART.md).
- **Precise existing authoring types:** [`architecture/QUESTION_BANK_AUTHORING.md`](architecture/QUESTION_BANK_AUTHORING.md).
- **P60 future capabilities, engineering gates and limitations:** [`architecture/P60_AI_NATIVE_CAPABILITY_PROGRAMME.md`](architecture/P60_AI_NATIVE_CAPABILITY_PROGRAMME.md).

**Maintenance rule:** The capability catalogue, this guide, its tests and the source implementation must stay aligned. When a feature is introduced/changed/removed, update the capability entry with source ownership, current status and limits. P60-B blueprint validate/audit are active external source commands; P60-C–F remain proposed.
