# Frozen v11 architectural assessment — original baseline reference

> This is an **archived, unmodified historical assessment** from `baseline/v11`, retained for completeness because the Passes 4–16 programme arose from it. It is not the current architecture, source-parity result or outstanding worklist. Original source: [baseline/v11 architecture audit](https://github.com/oneshubhamt/practice-desk/blob/e661822d865927e89a837790c1c6bc1cfc2562a6/docs/ARCHITECTURE_AUDIT_2026-10-28.md). Read the [current architecture](../architecture/CURRENT_ARCHITECTURE.md) and [new independent audit](../audits/V11_SOURCE_AUDIT_2026-10-30.md) for current state.

---

Worked for 4m 29s

### Practice Desk — Comprehensive Architecture Audit

Audit completed

Current version: v11 · 28 October 2026

My overall assessment: Practice Desk has evolved into a capable offline examination prototype, but its underlying architecture is still fundamentally designed around SSC CGL. It would be unwise to keep adding APFC, UPSC, CAT and RBI examinations without first restructuring its core.

I recommend a substantial architectural upgrade, while retaining the existing interface and single-file distribution format.

I have not modified the HTML in this audit.

### 1\. Executive summary

ARCHITECTURE READINESS

Current SSC CGL practice

Good

General examination support

Needs redesign

Long-term data integrity

Needs strengthening

Question-bank architecture

Promising foundation

Analytics accuracy

Partially reliable

Offline distribution

Good

The application already has several good foundations: a separate embedded question bank, original-versus-reviewed overlays, IndexedDB support, offline operation, multiple test modes and detailed attempt records.

However, the audit identified five particularly important architectural problems:

* The exam format is hard-coded, rather than configurable by examination.

* Historical results are not tied to immutable question-paper revisions, potentially compromising consistency after answer-key changes.

* The question-time tracker has a confirmed bug that can undercount time when the tab becomes hidden.

* Some scoring comparisons are conceptually invalid when corrected questions have different options from their originals.

* Persistence and backup are insufficiently robust for a growing, long-lived examination library.

These are more important to fix than introducing additional visual features.

### 2\. What I audited

I inspected the current 910 KB HTML file, extracted its JavaScript engine and three embedded data banks, examined the storage and scoring functions, and ran isolated headless-browser checks.

| Component                 | Observed implementation              |
| ------------------------- | ------------------------------------ |
| Application engine        | Approximately 68 KB of JavaScript    |
| Source question bank      | Approximately 722 KB of JSON         |
| Reviewed question patches | Approximately 74 KB                  |
| Solution bank             | Approximately 33 KB                  |
| Source questions          | 500 across five papers               |
| Selectable editions       | 10                                   |
| Reviewed patch records    | 131                                  |
| Reasoning/QA solutions    | 250                                  |
| Embedded image assets     | 92                                   |
| Browser persistence       | IndexedDB with localStorage fallback |

The bank contains an individual question record for every source question, with fields such as `stem`, `opts`, `key`, `status`, `images` and `sourcePage`.

### Runtime verification

I exercised strict-mode section progression, early submission, automatic expiry, scoring, the result screen, answer-review rendering, free-mode pausing and question-timing events. I also checked layouts at viewport widths of 320, 390, 768 and 1280 pixels.

The tested paths produced no JavaScript page errors, and none exhibited horizontal document overflow. I could test the application logic in an isolated browser environment, but could not fully exercise persistent IndexedDB across actual local-file reopenings because direct file and localhost navigation were restricted in the test environment. Those persistence risks are therefore identified by code inspection and browser specifications, not claimed as fully reproduced.

### Part I — Findings in the existing architecture

### 3\. The exam engine is currently SSC-specific

High priority

This is the principal limitation to generic reuse.

The current code uses constants and formulas equivalent to:

| Property              | Current assumption       |
| --------------------- | ------------------------ |
| Sections              | Always 4                 |
| Questions per section | Always 25                |
| Options               | Always A–D               |
| Section duration      | Always 15 minutes        |
| Full-paper duration   | Always 60 minutes        |
| Correct response      | +2                       |
| Incorrect response    | −0.5                     |
| Question type         | Single-answer MCQ        |
| Question numbering    | 1–100                    |
| Section detection     | Math.floor((n - 1) / 25) |

These assumptions appear in `questionsFor()`, `questionSection()`, `timeRemaining()`, `sumSection()`, `drawExam()`, navigation controls and analytics.

That means simply uploading an APFC question bank would not make the app genuinely generic.

### What should replace it?

A central Exam Definition should determine all examination rules.

| Exam family     | What the engine must accommodate                                                    |
| --------------- | ----------------------------------------------------------------------------------- |
| SSC CGL         | Four sections with isolated timers                                                  |
| UPSC CSE        | Separate GS and CSAT papers, different marking policies                             |
| UPSC EPFO/APFC  | Examination-specific paper length, timing and negative marking                      |
| CAT             | Multiple section types, locked sectional timing, MCQs and numerical-entry questions |
| RBI             | Phase-specific papers, section rules and configurable scoring                       |
| Custom practice | Arbitrary question counts, question selection and optional timing                   |

The exam engine should not contain expressions such as `s * 25` or a fixed `900000` milliseconds.

Instead, these values should come from the selected examination's configuration.

Recommendation: Introduce a configurable exam-schema layer before adding APFC.

### 4\. The state machine needs formalization

High priority

The current application tracks its state using several mutable global variables:

`active`, `screen`, `cursor`, `attempts`, `resultId`, `prefs`, `trackedQuestion` and others.

Functions directly modify them and call `render()`.

This works reasonably well at the current scale, but it produces tightly coupled behaviour.

### Current functional weaknesses

| Area                 | Risk                                                        |
| -------------------- | ----------------------------------------------------------- |
| Starting an attempt  | UI and persistence are modified in the same operation       |
| Submitting a section | Timer, navigation, section state and saving are intertwined |
| Timer expiry         | Can recursively trigger further transitions and rendering   |
| Resuming attempts    | Relies on multiple stored fields being mutually consistent  |
| Error recovery       | No single authoritative transition mechanism                |
| New exam formats     | Require branching inside multiple existing functions        |

### Recommended state model

Proposed examination lifecycle

The engine should accept explicit events such as `START_ATTEMPT`, `ANSWER_QUESTION`, `PAUSE`, `RESUME`, `EXPIRE_SECTION`, `SUBMIT_SECTION`, `SUBMIT_ATTEMPT` and `RESTORE_SESSION`.

A deterministic transition function should decide what happens. Rendering and saving should follow the transition, not control it.

This makes it possible to prove that a completed section cannot be reopened, that timing rules are obeyed, and that submission cannot happen twice.

### 5\. Timing system — confirmed bug and broader risks

High priority

### Confirmed issue: question-time undercounting

The `visibilitychange` handler sets `tabVisible` to `false` before calling `stopTracking()`.

But `stopTracking()` only records elapsed time when `tabVisible` is `true`.

Consequently, the final visible interval can be discarded.

I reproduced this with a simulated 12-second foreground interval:

| Measurement                      | Result                   |
| -------------------------------- | ------------------------ |
| Expected recorded interval       | Approximately 12 seconds |
| Recorded after tab became hidden | 0 seconds                |
| Tracking state afterwards        | Cleared                  |

This directly affects the credibility of per-question timing analytics.

### Other timer weaknesses

The application primarily uses `Date.now()` to calculate time remaining. That makes timing dependent on the device's wall clock. Changes to that clock, unusual sleep/resume behaviour or clock adjustments can introduce inaccuracies.

For a robust offline examination engine, I recommend combining a monotonic clock (`performance.now()`) during the active session with persisted wall-clock checkpoints for restoration.

The timer should also be driven by a policy rather than a specific mode name.

| Proposed timing policy          | Example use                   |
| ------------------------------- | ----------------------------- |
| Whole-paper countdown           | Unrestricted mock             |
| Independent sectional countdown | SSC-type simulation           |
| Locked sequential sections      | Sectional examination         |
| Optional pause                  | Practice mode                 |
| Untimed                         | Learning/revision             |
| Per-question time limit         | Speed drill                   |
| No backward navigation          | Certain specialized tests     |
| Fixed deadline                  | Time-controlled external test |

A timer should determine the state transition; screen refreshes should only display the current state.

Verdict: Correct the visibility bug, separate timer calculations from rendering and create a standalone timer-policy module.

### 6\. Scoring architecture needs a major correction

High priority

There are two distinct issues.

### 6.1 Marks are hard-coded

The current `sumSection()` calculates:

\text{Score}=2C-0.5W

This is appropriate for the current SSC CGL preset but not a universal examination model.

A generic system needs independent rules for correct responses, incorrect responses, omitted answers, unattempted numerical questions, partial credit and potentially different rules by section or question type.

The scoring engine should consume a scoring policy supplied by the exam configuration.

### 6.2 Original-versus-reviewed comparison can be misleading

This is a more immediate defect.

The current publisher-key comparison checks the user's selected option letter against the PDF's original answer letter.

However, 25 reviewed patch records replace their option arrays.

If a reviewed question replaces or rearranges answer choices, selecting option B in the revised question is not necessarily equivalent to selecting option B in the source question.

A comparison based only on letters is therefore not always meaningful.

### Recommended score model

Maintain three separate concepts:

| Measure                  | Meaning                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| Official-style score     | Score under the paper's stated examination rules                                 |
| Audited score            | Score under verified corrections and appropriate exclusions                      |
| Publisher-key comparison | Available only when original and corrected responses can be mapped unambiguously |

If the options have fundamentally changed, the app should report that a direct publisher-key comparison is unavailable for that question.

Also, scoring rules and score definitions should be saved in the attempt itself, so old results remain interpretable.

### 7\. Question-bank versioning is insufficient

High priority

This is the strongest reason to redesign before building a large library.

The present approach is efficient:

* Source papers are stored once.

* Corrected editions are generated by applying patches.

* Unchanged questions are shared.

That is a good design decision worth retaining.

The problem is that a corrected paper has a stable ID such as `cgl-2026-10-08-reviewed`, even when its contents change in future app releases.

### Example of the problem

Suppose a question currently has answer B, and you take the test today.

A subsequent audit discovers that the correct answer is D, and the next app release changes the question's key.

The old attempt stores your selected answer and score snapshot, but its review screen retrieves the current question bank.

This may cause the old saved score and the displayed correct answer to disagree. Imported attempts are particularly vulnerable because the import routine recalculates scores using the currently installed paper.

### Required improvement

Every examination paper needs an immutable revision identity.

Conceptually:

| Entity               | Example                    |
| -------------------- | -------------------------- |
| Exam family          | ssc-cgl                    |
| Source paper         | ssc-cgl-2026-10-08         |
| Paper edition        | reviewed                   |
| Revision             | r003                       |
| Question             | ssc-cgl-2026-10-08-q017    |
| Revision fingerprint | Content hash               |
| Answer-key revision  | Stored with paper revision |

An attempt would reference the exact paper revision used at its start.

Old revisions should remain available for reviewing old attempts, even if the library displays only the newest reviewed edition by default.

This is essential for trustworthy longitudinal analytics.

### 8\. Reviewed-question quality gates need strengthening

High priority

I found another systematic concern in the construction of reviewed questions.

The application automatically converts source `invalid` or `caution` status to `caution` when constructing a reviewed edition, unless a patch overrides it.

Since only `invalid` questions are excluded by the scoring function, this can allow a previously invalid question to become scoreable without an explicit successful repair.

There is one unpatched source-invalid record in the current bank, 6 October Q62, that passes through this conversion. Its mathematical issue was addressed in earlier editorial work, but the automated transformation does not itself document or enforce that resolution.

The principle should be:

An invalid question must not become scoreable merely because the reviewed edition is being constructed.

Instead, each question should have a structured editorial status.

| Status                 | Scoring treatment                        |
| ---------------------- | ---------------------------------------- |
| Verified               | Score normally                           |
| Corrected and verified | Score normally using corrected key       |
| Wording caution        | Score only if answer remains unambiguous |
| Under review           | Do not certify; provisional exclusion    |
| Invalid                | Exclude                                  |
| Incomplete source      | Exclude until reconstructed              |
| Superseded             | Retain for historical comparison         |

A correction should also record whether it changed wording, options, figures, answer keys or only the explanation.

This would make the editorial system much more defensible when using memory-based papers.

### Part II — Data architecture and persistence

### 9\. IndexedDB is the correct technology, but the data model can improve

The current IndexedDB implementation contains two main object stores:

| Store    | Contents                                               |
| -------- | ------------------------------------------------------ |
| attempts | Entire attempt records, including responses and timing |
| settings | Saved preferences                                      |

There are indexes for completion date, paper, mode and paper/date combinations.

This is a reasonable small-app design. However, history is loaded with `getAll()` and then filtered and sorted in memory, which limits the value of those indexes.

For a longer-lived app, I recommend separating data by responsibility.

### Proposed database topology

For the initial generic version, I would use logical stores for attempts, responses, timing events, bookmarks/notes and settings. Separate indexes would support searching by exam, paper revision, question, topic and date.

The exact number of object stores is less important than their ownership, referential integrity and transactional behaviour.

### Benefits

A response can be saved without rewriting the entire attempt object, question-level history can be retrieved efficiently, and analytics can be computed without loading every completed attempt into memory.

However, related answer and timing-event writes should occur within a single IndexedDB transaction so the two do not become inconsistent.

### 10\. Storage reliability and backup need stronger guarantees

High priority

The current app makes a sensible effort to save progress, but several weaknesses remain.

| Finding                                      | Why it matters                                                                               | Recommended change                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Completed attempts only in JSON exports      | Unfinished attempts are omitted                                                              | Include active attempts in full backups                     |
| Imported history requires the paper to exist | Attempts from an unavailable or older paper can be silently rejected                         | Preserve unknown-paper records in an archive                |
| Imported results are recalculated            | Historical scores can change                                                                 | Preserve original score and paper revision                  |
| One broad initialization error handler       | Certain database errors can force a fallback that does not expose existing IndexedDB records | Distinguish database-open, read, migration and write errors |
| Failed writes switch to fallback             | User may not know exactly what persisted                                                     | Explicit save status and retry queue                        |
| All history loaded into memory               | Scales poorly                                                                                | IndexedDB cursors and pagination                            |
| No structured integrity manifest             | Corruption or mismatch is harder to detect                                                   | Versioned backup manifest and validation                    |

### Important limitation of a local HTML file

Browser storage is tied to an origin, not physically embedded inside the HTML file. Furthermore, behaviour for files opened through `file:` URLs is not fully guaranteed across browsers. MDN specifically documents the variable behaviour of localStorage for local files. MDN

IndexedDB and other browser storage are generally best-effort by default; the existing persistent-storage request helps, but it does not replace an independent backup strategy. MDN

Recommendation: Preserve offline functionality, but introduce reliable backup verification, an explicit data-health panel and immutable history records.

Longer term, a stable-origin PWA would offer a more predictable storage identity than repeatedly opening downloaded HTML files.

### 11\. Data should be separated into three fundamentally different classes

This is a useful architectural distinction that the current app only partly implements.

| Data class        | Examples                                          | Treatment                                                  |
| ----------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Reference content | Papers, questions, options, diagrams, answer keys | Versioned and effectively immutable                        |
| User records      | Attempts, answers, timing, notes, bookmarks       | Persisted, independently backed up                         |
| Derived analytics | Accuracy, pacing, weak topics, comparisons        | Recomputable from frozen source revisions and user records |

The app should not treat calculated insights as the primary record of performance.

The authoritative record should be the attempt and its response events. Derived analytics can then be rebuilt as algorithms improve, without rewriting what the user actually did.

For scores, however, the original published result snapshot must be retained alongside any later reanalysis.

### Part III — Generic test-taking capabilities

### 12\. Support more question types

The current engine supports single-answer MCQs only.

A generic examination platform should eventually support:

| Question type              | Required functionality                                    |
| -------------------------- | --------------------------------------------------------- |
| Single-correct MCQ         | Existing A–D answer handling                              |
| Multiple-correct           | Checkbox selection and partial-credit rules if applicable |
| Numerical entry            | Numeric keyboard, tolerance and answer validation         |
| True/false                 | Two-option response                                       |
| Match-the-following        | Structured matching choices                               |
| Passage-based groups       | Shared passage, independent questions                     |
| Data interpretation        | Shared table/graph across multiple items                  |
| Descriptive                | Typed response, word count, later self/manual evaluation  |
| Unscored survey/assessment | Responses without marks                                   |

For the initial APFC addition, single-correct MCQs may remain sufficient. But the model should support other types before CAT is added.

This should be designed now, even if every input component is not implemented immediately.

### 13\. Introduce a proper examination hierarchy

At present, the home screen is essentially a dropdown of five paper dates.

That will become unwieldy when the library includes APFC, RBI, UPSC and CAT.

I recommend the following hierarchy:

Examination Library

SSC

UPSC / EPFO

CAT

RBI

Selected examination

Papers → Edition → Test mode → Start

The selected examination should determine which paper list, default timing, scoring and sectional structure appear.

The paper edition toggle remains valuable and should be retained.

For minimal interaction, the app should remember the user's last paper, edition, mode and section preference separately for each examination family.

### 14\. Test presets should replace repeated configuration

The current three modes are useful. They should become presets generated from each examination's rules.

I propose four broad test experiences:

| Experience          | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| Exam simulation     | Reproduces the configured exam's timing and navigation rules |
| Full-paper practice | Complete paper with optionally relaxed navigation            |
| Section practice    | One chosen section                                           |
| Custom practice     | Selected topics, question counts, timing and difficulty      |

The default should always be Exam simulation for the chosen exam.

Custom practice can be tucked into an advanced panel so it doesn't interfere with your preference for starting tests quickly.

I would also save one default profile per examination, such as an SSC simulation preset and a separate APFC simulation preset.

### Part IV — Analytics and learning architecture

### 15\. The current analytics are useful, but not yet robust enough

The app already provides:

| Current capability             | Assessment                                         |
| ------------------------------ | -------------------------------------------------- |
| Section-wise marks             | Useful                                             |
| Accuracy and attempt rate      | Useful                                             |
| Per-question foreground time   | Useful after timing bug is corrected               |
| Fast/typical/slow labels       | Needs better statistical treatment                 |
| Answer changes                 | Useful                                             |
| Cross-paper section comparison | Needs comparability controls                       |
| Marks-opportunity analysis     | Useful as a hypothetical ceiling, not a prediction |
| Suggested weak sections        | Needs more evidence and topic granularity          |

A particular concern is that current historical section-priority analysis combines recent full-paper attempts without enforcing equivalence of exam family, section definitions or difficulty.

With SSC only, this is an approximation. With CAT and APFC included, it would become misleading.

The analytics engine must operate on comparable cohorts, not just any recent attempts.

### 16\. A richer analytics engine should have several levels

### Level 1 — Immediate post-test analysis

This is where the existing app is strongest.

Keep score, accuracy, time spent, skipped questions, incorrect responses, answer revisions and section diagnostics.

Improve these by separating first-visit time, total cumulative viewing time, time before first answer and revisiting time. That will be more informative than a single total-duration number.

### Level 2 — Topic-wise performance

This is the most valuable missing capability.

Every question should have a topic taxonomy. For example, Quantitative Aptitude could contain Arithmetic → Time & Work, Algebra → Quadratic Equations, Geometry → Circles, and so forth.

Reasoning could contain Coding-Decoding, Syllogisms, Seating Arrangements, Series, Blood Relations and Non-verbal Reasoning.

Then the app could identify whether your weakness is actually Quantitative Aptitude overall or one recurring subtopic.

### Level 3 — Error diagnosis

Correctness alone is insufficient to guide revision.

Introduce optional post-test error labels:

| Error type     | Interpretation                       |
| -------------- | ------------------------------------ |
| Conceptual     | Underlying concept not understood    |
| Calculation    | Method correct, arithmetic incorrect |
| Interpretation | Question or data misunderstood       |
| Time pressure  | Rushed or unfinished                 |
| Guessing       | Insufficient certainty               |
| Careless       | Avoidable oversight                  |
| Knowledge gap  | Fact or information not known        |

These should be user-confirmed rather than automatically inferred as facts.

### Level 4 — Longitudinal learning

Over multiple attempts, track how often a concept is missed, whether performance improves, and whether improvement persists.

That enables targeted revision rather than repeatedly taking entire papers.

### 17\. New analytics I would recommend

Speed–accuracy quadrant analysis

Identify fast-correct, fast-wrong, slow-correct and slow-wrong questions. The slow-wrong group may signal inefficient approaches or conceptual weakness; fast-wrong may signal rushing, but should not automatically be labelled careless.

Marks decomposition

Show earned positive marks, incurred penalties, unanswered opportunity and excluded items separately. Distinguish observed marks from hypothetical recoverable marks.

Comparable attempt trends

Compare the same exam, mode, edition and section over time. Show accuracy, attempted percentage and marks separately, with sample sizes.

Concept mastery map

Group performance by topic and distinguish insufficient evidence from actual weakness.

Pacing and time-allocation analysis

Show where time was spent, where users repeatedly revisited questions, and whether lengthy questions produced corresponding marks.

Revision notebook

Build a personal collection of mistakes, bookmarked concepts and explanations, linked to source questions.

### What I would avoid

I would not introduce AI-generated percentile predictions, arbitrary readiness scores or claims that a student will achieve a particular rank based only on personal mock-test history.

Such claims require validated comparative data, reliable difficulty calibration and sufficient sample size.

The analytics should remain transparent, inspectable and useful for decision-making.

### 18\. Add a targeted revision and practice engine

This would be a meaningful step beyond a mock-test app.

The existing 250 Reasoning/QA explanations provide the foundation.

After finishing a test, the app could generate practice sets from:

* Previously incorrect questions.

* Previously skipped questions.

* Repeatedly weak topics.

* Bookmarked questions.

* Questions taking unusually long.

* Questions due for spaced revision.

The key design principle is to separate the test engine from the learning engine.

Exam simulation must not accidentally expose hints or explanations. Revision mode may show both, according to its rules.

The same question record can be used in either context, but the allowed interactions differ.

### Part V — Interface and interaction design

### 19\. Current UI strengths

I would preserve much of the existing visual direction.

The application has a restrained layout, clear exam modes, readable questions, a compact paper selector, a useful question palette, a simple Aa menu and an accessible visual hierarchy.

I also confirmed that the current layouts did not produce document-level horizontal overflow in the four tested viewport sizes.

A complete visual replacement is not necessary.

### 20\. UI refinements worth making

| Area                  | Recommended refinement                                                | Priority |
| --------------------- | --------------------------------------------------------------------- | -------- |
| Library               | Exam-family cards or selector with grouped papers                     | High     |
| Starting tests        | One primary Start button with remembered defaults                     | High     |
| Resume                | Clear active-attempt state and storage status                         | High     |
| Question navigation   | Responsive navigator drawer on small screens                          | Medium   |
| Focus                 | Preserve keyboard focus after answering                               | High     |
| Accessibility         | Explicit selected/answered/flagged semantics for assistive technology | High     |
| Figures               | Click-to-enlarge, pan and zoom                                        | Medium   |
| Mathematical notation | Consistent mathematical typesetting                                   | High     |
| Passages              | Shared passage panel with independent scrolling when useful           | Medium   |
| Long tables           | Proper horizontal scrolling and readable headers                      | Medium   |
| Results               | Separate overview, insights, mistakes and solutions                   | Medium   |
| History               | Filter by examination, date, mode and paper revision                  | High     |
| Themes                | Retain current dark/light and font controls                           | Retain   |
| Keyboard              | Documented, configurable shortcuts                                    | Medium   |

### An important implementation concern

The current UI reconstructs large portions of the page using `innerHTML` after many interactions.

This is simple, but it can lose focus, selection state and transient UI position, especially when using keyboard navigation or assistive technology.

I recommend a lightweight component architecture with smaller targeted updates.

A large UI framework is not necessarily required. The app can remain fast and dependency-light with vanilla JavaScript modules and a predictable rendering approach.

### Part VI — Performance, storage footprint and security

### 21\. File size is not currently a problem

The application is approximately 910 KB, even with 500 questions and 92 embedded image assets.

Most of the size comes from content, especially the source question bank and diagrams. The code engine itself is comparatively small.

I would not prioritize aggressive compression of textual questions at this stage.

The more important distinction is between distribution size and runtime behaviour.

| Concern           | Current position                | Recommendation                                                         |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------- |
| HTML size         | Manageable                      | Retain single-file distribution                                        |
| Embedded images   | Already compressed              | Add asset hashes and deduplication                                     |
| Question parsing  | All bank data parsed at startup | Consider loading or decoding only selected packs if growth warrants it |
| UI rendering      | Whole-screen HTML regeneration  | Targeted rendering                                                     |
| History loading   | All attempt records read        | Indexed pagination                                                     |
| Analytics         | Computed from attempt records   | Cache reproducible aggregates where useful                             |
| Code organization | One engine script               | Modular source files, bundled for release                              |

### Recommended development model

The maintainable source project should be modular, even if the delivered app remains a single HTML file.

That means separate source modules for exam definitions, question banks, session control, scoring, storage, analytics and UI.

A build step can bundle them into one self-contained HTML.

This gives the benefits of maintainable architecture without sacrificing offline portability.

### 22\. Security, reliability and privacy

For an offline personal application, the current security exposure is relatively limited. However, generic imports introduce additional risks.

The existing code escapes most displayed text, which is good. But some image and link attributes are assembled directly from data, and there is no comprehensive untrusted-content validation layer.

Before supporting imported question packages, I would introduce:

| Control             | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| Schema validation   | Reject malformed questions and exam definitions     |
| Safe text rendering | Prevent HTML/script injection from imported content |
| URL validation      | Restrict dangerous link and asset schemes           |
| Import limits       | Bound package size and resource use                 |
| Content checksums   | Detect unexpectedly modified question packs         |
| Backup validation   | Detect incompatible or damaged history              |
| Graceful recovery   | Preserve usable data when part of a database fails  |
| Error reporting     | Provide a useful in-app diagnostic screen           |

The app should continue to operate without an account or analytics service by default.

One limitation is unavoidable: in a fully offline, client-only HTML file, answer keys are technically present in the file and can be inspected using developer tools. UI-level answer secrecy can be enforced, but cryptographic secrecy against someone inspecting the client file cannot.

That distinction should be explicit.

### Part VII — Quality assurance and testing

### 23\. Establish automated regression tests

This is particularly important because previous iterations have included subtle bugs involving keys, question timing and corrections.

I recommend a test suite with several layers:

| Test layer                 | What it should verify                                              |
| -------------------------- | ------------------------------------------------------------------ |
| Question-schema validation | Unique IDs, valid response types, complete options                 |
| Editorial checks           | Every corrected question has a traceable change record             |
| Answer-leakage checks      | Revised stems do not disclose newly introduced answers             |
| Scoring unit tests         | Positive, negative, omitted, excluded and partial-credit scenarios |
| Timer tests                | Pause/resume, expiry, backgrounding, early submission              |
| State-machine tests        | Illegal transitions cannot occur                                   |
| Database tests             | Save, restore, conflict resolution, interrupted writes             |
| Backup tests               | Export/import round trip and revision preservation                 |
| Accessibility tests        | Keyboard navigation, focus, labels and contrast                    |
| Performance tests          | Large question banks and large history datasets                    |
| End-to-end tests           | Every exam preset through final submission                         |

### Release-blocking acceptance criteria

Before calling the generic engine stable, I would require every configured examination to pass a test that reproduces its sections, counts, timing, navigation rules and marks exactly.

An attempt must reopen against the same immutable paper revision. A backup round trip must preserve responses and scores. Timer events must be consistent after tab changes, pauses and reloads. No invalid question should become scoreable without an explicit editorial decision.

These are stronger guarantees than simply observing that a browser test produces no JavaScript errors.

### Part VIII — Recommended target architecture

### 24\. The new architecture should have seven independent modules

Presentation layer

Library · Test UI · History · Review · Insights

Exam Configuration

Formats, rules, sections

Question Bank

Immutable papers, corrections

Session Engine

State machine, timers

Scoring Engine

Policies, exclusions

Persistence

IndexedDB, backups

Analytics

Metrics, trends, diagnostics

Application services

Import/export · Validation · Diagnostics · Content packaging

Conceptual architecture. Modules are separate in source but can be bundled into one offline HTML.

The most important architectural rule is that no layer should know unnecessary details about another.

For example, the scoring engine should not know that the examination is SSC CGL. It should know only the scoring policy and responses supplied to it.

Likewise, the question navigator should not assume four sections or 25 questions. It should render the sections and questions defined by the selected paper.

### 25\. Generic exam-definition example

A future examination could conceptually be represented as:

```json

{
  "examId": "example-exam",
  "name": "Example Examination",
  "revision": "1",
  "sections": [
    {
      "id": "general-ability",
      "title": "General Ability",
      "questionCount": 50,
      "durationMinutes": 45,
      "navigation": "free"
    },
    {
      "id": "quantitative",
      "title": "Quantitative Ability",
      "questionCount": 30,
      "durationMinutes": 30,
      "navigation": "free"
    }
  ],
  "timing": {
    "mode": "sectional",
    "allowEarlySubmit": true
  },
  "scoring": {
    "correct": 2,
    "incorrect": -0.5,
    "unattempted": 0
  }
}
```

These are illustrative values, not the rules of any particular examination.

The actual architecture should also support per-question overrides, response types, assessment-level navigation policies and independent paper revisions.

With this approach, adding APFC would primarily involve creating and validating an APFC exam definition and importing its question content. The examination engine would not need to be rewritten.

### Part IX — Implementation priorities

### 26\. Recommended upgrade sequence

I would divide the architectural work into five phases, without introducing all possible features simultaneously.

| Phase                | Work                                                                                                                  | Priority              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1. Integrity repairs | Fix timing bug, historical score consistency, invalid-status handling, publisher-key comparison and backup weaknesses | Critical              |
| 2. Generic exam core | Exam definitions, configurable sections, timers, navigation, question types and scoring                               | Critical              |
| 3. Data architecture | Immutable paper revisions, versioned IndexedDB, safe imports, transactional persistence and validated backups         | Critical              |
| 4. UI restructuring  | Examination library, targeted rendering, accessibility, question navigation and stable preferences                    | High                  |
| 5. Advanced learning | Topic taxonomy, error notebook, richer analytics, revision sets and mastery tracking                                  | High, after integrity |

The key sequencing decision is to stabilize the engine and data contracts before investing in sophisticated analytics. Otherwise, those analytics may be built on historical records that are not consistently interpretable.

### 27\. What I would retain, redesign or remove

| Current feature                               | Decision                                        |
| --------------------------------------------- | ----------------------------------------------- |
| Single-file offline distribution              | Retain                                          |
| Original and Corrected editions               | Retain and strengthen                           |
| IndexedDB                                     | Retain, redesign schema                         |
| localStorage fallback                         | Retain only as a constrained recovery mechanism |
| Strict, flexible and section modes            | Retain as configurable presets                  |
| Per-question timing                           | Retain, correct implementation                  |
| History and backups                           | Strengthen substantially                        |
| Dark/light theme and font controls            | Retain                                          |
| Full-screen mode                              | Retain                                          |
| Question navigator                            | Refine                                          |
| Existing score analytics                      | Rebuild over a consistent metric model          |
| Hard-coded SSC settings                       | Remove                                          |
| Global mutable session state                  | Replace with formal state transitions           |
| Whole-screen innerHTML re-rendering           | Reduce                                          |
| Fixed 1–100 question numbering assumptions    | Remove                                          |
| Paper identity without immutable revision     | Replace                                         |
| Technical debug time override in release code | Remove or isolate in test builds                |

### Part X — Final architectural direction

### 28\. My recommended end state

The ideal application should be a generic, local-first examination and learning platform with three capabilities:

Test-taking: Reproduce a selected examination's structure and rules faithfully, including timing, navigation, response types and marks.

Question-bank management: Store source questions, independent corrections, answer keys, figures, explanations, editorial status and provenance without duplicating unchanged content.

Learning and analytics: Preserve reliable historical records and produce transparent, actionable feedback on accuracy, pacing, topics and revision priorities.

I would retain the current single-file HTML as the user-facing distribution format for now, but maintain a modular application internally. This balances portability, simplicity and future extensibility.

### Final judgment

The current application is worth building upon. It does not need to be discarded or visually reinvented. But I would not recommend adding APFC immediately to the existing hard-coded engine.

The right next step is an architectural v12 focused on integrity and generic examination definitions. Once that foundation is stable, APFC should be the first additional examination family used to validate that the engine genuinely works beyond SSC CGL.

The strongest indicator of success would be that adding a new examination requires supplying a validated exam configuration and question bank—not changing timer, scoring, history or UI logic.

That is the point at which Practice Desk becomes a reusable examination platform rather than an increasingly sophisticated SSC CGL mock-test file.
