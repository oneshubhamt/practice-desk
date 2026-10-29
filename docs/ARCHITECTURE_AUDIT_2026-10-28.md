> **ARCHIVAL NOTICE — 30 October 2026:** This is the historical architecture audit and Passes 1–10 chronological scratchpad. Some earlier feature-parity claims were later found incomplete by a de novo v11/overhaul source comparison. **Current authoritative Passes 11–16 live scratchpad, feature matrix and decisions: [V11_FEATURE_PARITY_PROGRAMME.md](V11_FEATURE_PARITY_PROGRAMME.md).** Historical paragraphs have not been retroactively edited. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for consolidated history.

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

---

### Implementation addendum — 28 October 2026

This addendum does not alter the original audit above. It records decisions for the new GitHub-based development workflow.

**CLEAR engineering standard:** The application and its implementation should be **Clean, Lean, Efficient, Elegant, Reliable**. Favour strong TypeScript domain models, explicit invariants, clear module boundaries, predictable performance, deterministic state transitions and robust error handling over unnecessary dependencies or abstractions.

**Data topology is an ongoing design decision:** Assess the shape, ownership and lifecycle of exam definitions, source questions, answer-key revisions, editorial overlays, shared passages/figures, attempts, responses, events, settings and derived analytics. Prefer stable identifiers, immutable references, consistent granularity, referential integrity, sensible indexes and transactional writes. Normalize where it prevents inconsistency; share assets/unchanged questions rather than duplicating them. If profiling, new exam formats or growth show that the topology is suboptimal, **redesign or optimize it**, backed by invariants, validation and measurements—not premature overengineering. There is currently **no data-migration or backward-compatibility burden**.

**UI/UX remains reviewable:** The current design is a stable visual baseline, not a permanent constraint. Reconsider exam-family selection, question interactions, navigation, accessibility, responsive layout and results as functional needs evolve; change UI only when an improvement is justified and verifiable.

**Deployment contract:** For now the production artifact must be a **single self-contained HTML file that opens directly via a double-click (`file://`) and runs without localhost or internet access**. Keep source files modular (TypeScript, CSS, HTML, content) and bundle them at build time. A hosted/PWA workflow may be evaluated later only if its benefits outweigh the lost simplicity; it is not required for this phase.

**Quality and release discipline:** Preserve the initial working application on Git branch `baseline/v11`. Develop improvements in deliberate, testable slices; keep the test suite small and fast, centred on complete domain contracts, mathematical correctness, timing, persistence and content validity. Move the transitional `legacy.ts` runtime towards strict TypeScript rather than extending its unchecked architecture. Release each phase only after the offline HTML builds, its invariants pass and the primary exam flows are exercised.

---

## Pass 1 implementation addendum — domain foundation

**Scope:** typed domain contracts and strict source-content validation. This pass intentionally does not replace the v11 runtime or alter the generated offline HTML.

### Canonical domain model

The new `src/domain/` contracts separate the concepts that must not share mutable identity:

- **Exam definition** — stable examination family and display metadata.
- **Paper definition** — stable paper identity and source provenance.
- **Paper revision** — immutable paper structure, ordered sections, navigation/timing/scoring policies, content fingerprint, and an exact answer-key revision reference.
- **Question revision** — immutable wording, response type, option identities, stimulus/media references, editorial status and content fingerprint.
- **Answer-key revision** — separate correct responses and per-question scoring overrides. Question content itself contains no answer key.
- **Stimuli and assets** — shared passages, tables, charts and image assets can be referenced rather than copied into every question.
- **Attempt snapshot** — records the exact paper revision, answer-key revision and scoring policy used when the attempt began.

IDs are branded by entity kind in TypeScript. Revision hashes use a SHA-256 contract. Runtime validation and hash generation for future imported exam packages will be completed when those boundaries are implemented; declaring a type does not itself verify a hash.

### Generic question and exam policies

The canonical question union covers single-choice, multiple-select, numeric entry, true/false, matching and free response. Timing, navigation and scoring are configuration data rather than SSC-specific constants. The current source JSON still uses four-option MCQs; that is intentionally a **legacy import format**, not a limitation of the new generic domain model.

### Source-content integrity

The existing source/patch/solution schema is now explicitly typed. A dependency-free TypeScript validator checks required fields, unknown fields, answer-key labels, question-number uniqueness, image data URIs, source references, passage references and patch/solution links. The build and tests use the same validator; the previous duplicate JavaScript validator has been removed.

The lean content tests now derive counts from the actual bank rather than assuming exactly five papers, 100 questions per paper or 50 solutions per paper. This avoids baking the current CGL collection size into the test architecture.

### Deliberate boundaries

- Existing source questions, review patches, solutions and the generated v11 HTML remain unchanged.
- The new domain contracts are not yet wired into the live runtime. Pass 2 will introduce the adapter and exam/session engine; this separation avoids a risky all-at-once rewrite.
- No data migration or backward-compatibility work is required for this new application.
- The released artifact must continue to open directly from `file://`, without a server or network dependencies.
- UI/UX is not frozen: revisit it after the generic model is connected, focusing on accessibility, clarity, keyboard/focus behaviour and responsive exam workflows rather than decorative redesign.

### Pass 1 acceptance checks

- TypeScript checks the new contracts under strict mode, including exact optional-property semantics.
- Source content validation runs before the single-file build.
- Tests cover current-bank integrity, malformed records and dangling references.
- CI must pass, and rebuilding must leave the generated HTML unchanged.

**Next:** Pass 2 maps the existing CGL papers into these contracts and builds the configurable state/timing/navigation/scoring engine. Pass 3 then implements immutable history and persistence around the frozen attempt snapshot. The UI should be reviewed after those contracts are integrated, before final release acceptance.

---

## Implementation addendum — Pass 1 (domain foundation)

**Scope:** Establish target domain contracts and validation without changing the v11 runtime or generated HTML.

Added:
- Branded identifier types for exam, paper, paper revision, question revision, answer-key revision, attempt, section, option, stimulus and asset identities.
- Discriminated question/response contracts for single-choice, multiple-select, numeric entry, true/false, matching and free-response items.
- Immutable paper/key/question revision contracts, explicit timing and navigation policies, scoring policies and frozen attempt snapshots.
- Runtime validators for question revisions, answer-key revisions and paper revisions, including identity uniqueness, valid response-kind matching, option/item references, timing/section consistency, score-policy constraints and answer-key coverage.
- Focused domain tests for valid configuration and representative invalid states.
- A data-topology document defining authority, immutability, normalization, referential integrity and deferred storage decisions.

**Data topology decision:** Optimize deliberately, based on the real access patterns and growth of the question library/history. Deduplicate image assets by content hash and keep stimuli separate from question records. Do not introduce unnecessary database stores or indexes before the query patterns are established. Pass 3 will decide the concrete IndexedDB schema.

**Important boundary:** These are validated target contracts, not a claim that the legacy runtime already uses them. Current source/patch/solution banks and v11 HTML remain unchanged in this pass. No content hash has been assigned to the existing 500 questions yet; hashes must be computed from a specified canonical serialization when the content-packaging step is implemented.

**UI note:** No visual redesign is part of Pass 1. The existing interface remains the stable reference; usability, focus behaviour, accessibility and library navigation will be reconsidered during Pass 4.

**Acceptance gate:** Strict TypeScript check, content-bank validation, domain invariant tests, build reproducibility and GitHub CI must pass before this pass is considered complete.


## Living implementation ledger — overhaul branch

**Branch policy (user decision):** All remaining implementation passes take place on `overhaul`. `main` and `baseline/v11` remain stable. The earlier `work/pass-2-exam-engine` is superseded as the development target; it is not a separate release lane.

**Pass 1 — complete:** Strict generic domain contracts, validation and source-content integrity. Existing offline HTML and bank unchanged. PR #1 documents the foundational work.

**Pass 2 — in progress:** Pure TypeScript exam session transitions and policy-based scoring. Initial engine files: `src/engine/session.ts`, `src/engine/scoring.ts`. Still required: focused tests, review of timer limits and restore semantics, content adapter, CI validation. Do not claim runtime integration before it exists.

**Pass 3 — complete (CI verified):** Immutable attempt history, persistence and transactional restore. Design storage around real access patterns, not hypothetical migrations.

**Pass 4 — pending:** Connect the generic engine and bank to the user interface, then review responsive behaviour, accessibility and exam workflows.

**Final acceptance — pending:** Exact offline single-HTML distribution, original 500-question collection and editions, scoring/timing correctness, and end-to-end flows on `file://`.

**Amendments:** Record changes in this ledger with a reason and validation evidence. Keep the historical audit intact above.


### Pass 2 checkpoint — engine correctness

- Implemented pure transitions for start, tick, visibility, pause/resume, navigation, response, clear, flag, section submit and attempt submit.
- Corrected visibility-time accounting: checkpoint before visibility mutation. Expiry now caps time and allocates oversized ticks across sequential sectional limits.
- Added monotonic-clock rebase for future persisted session restoration. Wall-clock offline restore semantics remain for Pass 3; rebase alone does not enforce elapsed time while the app is closed.
- Implemented scoring for typed answers, explicit overrides, editorial exclusions and pending manual responses. Partial credit supports matching and multiple-select.
- Added focused engine tests. **Pending verification:** CI and runtime adapter; the v11 UI is not yet wired to this engine.
- Known follow-up: strict response validation against question option identities and range rules at the input boundary; clarify manual-vs-automatic section expiry policy before UI integration.


### Pass 2 checkpoint — source bank integration

- Added a strict typed adapter from the five existing SSC CGL source papers and reviewed patch overlays to generic question, answer-key and paper revision records.
- Uses SHA-256 fingerprints of revision payloads; keys and paper revisions pin exact identities. Does not mutate source JSON.
- Keeps source-invalid questions excluded unless an explicit corrected patch repairs them; fixes the audited silent promotion of invalid source records.
- CGL-specific 25-question grouping and 15-minute sectional limits live only in the CGL importer, not the generic engine.
- Added candidate-response boundary checks for options, numeric constraints, matching and free-response length.
- Focused import and scoring tests included. Still pending: CI check, runtime/UI adapter and historical persistence (Pass 3).


### Pass 2 — browser UI wiring (in progress, verify CI before closing)

- Embedded the typed engine/importer into the existing offline HTML build using TypeScript transpilation and a tiny static CommonJS module loader; no network imports, no runtime npm or server.
- Existing library, exam, results and history screens now call the generic adapter for start, answer, clear, flag, navigation, pause, section submit, attempt submit, tick and visibility. Score totals are taken from generic scoring.
- The legacy UI data structures and timer presentation remain during this transitional integration. Pass 2 acceptance requires CI, offline execution checks and reconciling the legacy timer with engine timer before marking complete.
- Fixed earlier CI errors: removed Node crypto dependency from browser importer; corrected merged editorial typing.


### Pass 2 verification and release boundary

- CI run 40636395994 **passed** (strict typecheck, all tests, generated HTML build and reproducibility check).
- CI committed the rebuilt, fully embedded `Practice_Desk_Offline_Mock_Tests.html` to `overhaul` at abbc0e02adb1905c6e9df26a98d8aabfde9e3e01.
- Existing library/exam/results/history UI now invokes the generic browser adapter; policy-based scoring drives total and per-section results.
- Current CGL UI still presents four fixed sections, four letter choices and the existing timer widgets. Generic engine is configured by the importer; Pass 4 must replace the remaining CGL-specific UI assumptions for other exams.
- Pass 3 may begin after the final adapter regression suite passes. No changes to `main` or `baseline/v11`.


### Pass 2 closure — 2026-10-28

**Status: implemented and CI-green for the existing CGL UI.** The pure engine, CGL source/reviewed adapter, response validation, scoring, browser bridge, embedded offline build and integration regression tests are on `overhaul`. CI run 40636491131 passed.

**Explicit scope boundary:** The current interface is still CGL-shaped; its presentation assumes 4 sections and 25 questions, and the existing timer widgets remain. Those are UI generalization tasks for Pass 4, not evidence that the generic engine supports only CGL. No claim of a manual browser smoke test or generic non-CGL end-to-end UI acceptance is made.

**Next:** Pass 3 immutable history, frozen revision snapshots, persistence and restore. Preserve the single-file offline build and CI gate.


### Pass 3 — durable attempt snapshots and restored sessions (implementation checkpoint)

- `src/history/frozen.ts` creates and validates a structured-cloneable copy of paper/key/question revisions and immutable scoring policies per attempt. Historical totals use that frozen content even if the current library changes.
- The user-facing UI preserves an image-free text/options/explanation snapshot of the attempted paper. Image bytes are not duplicated per attempt; original embedded images are only shown when their question revision still matches. Older changed figures may therefore be unavailable in historical review; a deduplicated immutable media archive is future work.
- New live attempts use schema 4 and freeze content before the first answer. Existing IDB `attempts` store retains one atomic record per attempt. No database schema upgrade or migration is needed.
- Session restoration accounts for wall-clock absence without fictitiously charging foreground question time; paused sessions do not accrue time. Timer expiry still uses the existing CGL UI presentation.
- Hardened active mirror recovery so a stale in-progress mirror cannot resurrect a completed IndexedDB record; queued deletes now follow pending writes.
- Completed score snapshots are not silently recalculated when importing backups.
- Pending acceptance: strict CI, restore regressions and testing the file:// reopen flow on supported browsers.


### Pass 3 recovery and backup hardening

- New attempt archives now capture a validated, revision-locked content bundle and image-free display copy; archived scores and text remain independent of later review edits.
- Simplified startup recovery: IndexedDB remains authoritative, recovery journal is imported in atomic per-attempt transactions and cleared once successfully incorporated, and a terminal record wins over stale active mirrors.
- Removed obsolete v2 legacy-history migration code (this new app has no backward-compatibility requirement).
- Backups now use format version 2 containing frozen attempt data. Completed records are append-only by ID during merge; previous completed scores are not overwritten by imported copies.
- Session restore errors no longer discard the entire IndexedDB history in favour of fallback. Restoration is isolated from database opening.
- The archived source image bytes are not duplicated in history; unchanged revisions can still use matching embedded bank images.
- UI generalization and actual file:// browser reopen testing remain for later acceptance.


### Pass 3 integration — revision archive and complete backup

- IndexedDB upgraded in-place from v1 to v2, adding a `revisions` store keyed by SHA-256 paper revision ID; media-rich display content is stored once per revision instead of being repeated in each attempt. An attempt and any newly referenced revision are persisted in **one readwrite transaction**.
- History review now reuses archived display media when available; `frozenDisplay` and frozen domain data retain the original wording, keys and scores.
- Full version-2 backup exports completed **and unfinished** attempts, display revisions and preferences; SHA-256 manifest validated before importing. Duplicate IDs do not overwrite existing records.
- Reopening the offline file restores completed and active history through the existing recovery journal and wall-clock session rebase.
- External browser/file origin storage is still best-effort. Independently exported backups remain necessary; UI generalisation and browser acceptance stay in Pass 4.

### Pass 3 acceptance hardening — atomic backup import

- Verify **every** imported attempt before any mutation; reject an incompatible batch rather than silently dropping records.
- Merge planning is additive: immutable completed records and the current live test are never overwritten.
- IndexedDB backup import commits all new records and their archived display revisions in a single read/write transaction, after prior saves finish. A failed transaction imports none.
- Added tests for additive merge and duplicate identity protection.


### Pass 3 closure — 2026-10-28

**Status: implemented and CI-green.** CI run [40641304190](https://github.com/oneshubhamt/practice-desk/actions/runs/40641304190) completed successfully. Strict TypeScript, unit/integration tests, single-file build and generated artifact reproducibility gate passed.

**Accepted scope:** Frozen question/paper/key/scoring snapshots tied to attempts; immutable completed score records; wall-clock-aware restart with paused-session semantics and terminal mirror precedence; transactional IndexedDB storage for an attempt and a deduplicated display/media revision; complete SHA-256-verified backups including unfinished sessions; atomic additive import with duplicate protection.

**Revision of earlier checkpoint:** The implementation subsequently introduced an IndexedDB **v2** `revisions` store (schema upgrade). Earlier statements above that media archival and database upgrade were not implemented describe only interim checkpoints.

**Not yet claimed:** Manual `file://` browser reopen and backup round-trip testing, multi-tab concurrent mutation correctness, or generic non-CGL end-to-end UI functionality. Those need final acceptance (and the UI work belongs to Pass 4). Local file-origin storage remains browser-dependent; independent exports are advised.

**Next:** Pass 4 removes the remaining fixed-CGL UI and presentation assumptions. Keep `main` and `baseline/v11` unchanged pending final validation.


### Pass 3 hardening checkpoint — historical media and storage

- Avoid recomputing SHA-256 prime constants for every question and backup hash; constants are initialized once per offline build process.
- Archived image bytes are only attached when the frozen stem/options match the archived question. An older attempt cannot silently acquire media from a changed source revision.
- Import preserves existing IndexedDB revision archives: a backup can add a missing revision, but cannot overwrite the already stored revision with the same ID.
- Added append-only backup-merge regression coverage. CI and offline distribution verification required before closure.


### Pass 3 closure — 28 October 2026

**Status: implementation complete, automated CI-green.** Latest verified CI: run 40641863622. Immutable revision references and scoring snapshots are stored with attempts, media-bearing display revisions are shared across attempts in IndexedDB, and the version-2 backup exports both in-progress and completed attempts plus referenced revision archives with a SHA-256 integrity manifest. Restore handles elapsed wall time, paused modes, stale mirrors and backward clock changes. Returning from browser back-forward cache now resumes visibility/timer accounting.

**Acceptance limits:** CI validates compilation, content integrity, scoring, frozen-history contracts, restore logic, backup checksums/merge behaviour and one-file build. Actual reopening under `file://` across Chromium, Firefox and Safari, quota-exhaustion recovery, and multi-tab concurrency have not been independently exercised and remain release acceptance checks. A checksum detects accidental backup alteration; it does not authenticate an untrusted source or encrypt user data.

**Next:** Pass 4 — fully exam-agnostic UI, remove remaining SSC-specific presentation assumptions, accessibility, responsive testing and end-to-end browser/file:// acceptance. `main` and `baseline/v11` remain untouched.


### Pass 4 first implementation — model-driven exam workspace

- Added `src/app/exam-package.ts` as a validated, self-contained examination package contract (paper/key/questions/stimuli/embedded images), alongside adapters for the five existing CGL source/reviewed editions.
- Introduced `src/app/generic-ui.ts` as a schema-driven exam workspace accessible from the existing library. It uses the same generic session/scoring engine and supports single-choice, multiple-select, numeric, true/false, matching and written responses; sections/timers/navigation derive from the paper definition.
- Local JSON packages can be loaded without a network. Generic attempts and imported packs are written to the existing IndexedDB attempts store with distinct record types, leaving the CGL history filtered separately. LocalStorage is a best-effort fallback.
- Existing CGL home/exam/results/history flows remain untouched except the exam-workspace entry point. All code bundles into the single offline HTML.
- Pass 4 remains in progress: generic and existing histories should be unified, complete multi-kind browser tests are needed, image/asset checking needs more coverage, and final file:// acceptance across browsers is outstanding.


### Pass 4 CGL fidelity in generic workspace
- Added option-image references to the typed CGL importer and embedded option-image assets to generic exam packages, preserving figure-based questions in the new UI.
- Explanations are carried separately into each generic package, with the solution bank supplying missing inline explanations; editorial notes and answer keys remain hidden during the attempt.
- The original CGL library and result screens remain unmodified; this work targets the new model-driven workspace only.


### Pass 4 integrity and result transparency
- Images in imported packages are checked against their actual decoded byte SHA-256 hashes. Assets are content-addressed by image bytes rather than data-URI text.
- Attempt results show human-readable option labels, numbers, true/false values, matching labels and manual-response status, with expected answers and source explanations only after submission.
- The frozen generic attempt now carries its explanation text for historical review even if an uploaded package is subsequently edited.


### Pass 4 storage and UI workload checkpoint

- Generic exam workspace timer now checkpoints to IndexedDB at most every 10 seconds during stable countdown; answers, section changes and submission are persisted immediately.
- Added synchronous emergency mirror for the current attempt, reconciled against IndexedDB on reopening with completed records taking precedence.
- Import rejects a package attempting to reuse an existing paper revision ID, preventing silent replacement of built-in or previously imported content.
- An actual multi-browser file:// reopen test is still pending. Browser persistence remains best-effort; signed provenance is not provided by the import checksum.


### Pass 4 integration checkpoint — cross-exam history and generic backup

- The existing History screen now includes completed attempts made in the generic exam workspace, with deep links to their frozen answer review. Metrics count completed generic and CGL attempts, but heterogeneous exams remain excluded from CGL-only analytics trends.
- Generic workspace exports/imports checksum-verified version-2 archives of generic attempts and uploaded package definitions, with additive transactional IDB merge. Incoming records undergo schema, frozen-revision, response and completed-score validation before writes; existing attempt IDs are never replaced.
- Explicitly maintain separate CGL and generic backup export actions; the old CGL import pipeline does not silently accept generic records.
- Deferred acceptance: browser reopen and full file:// smoke tests; consider a unified all-data backup flow before release.


### Pass 4 — actual offline browser acceptance gate

- Added a real Chrome/Chromium headless `file://` CI smoke test: double-click equivalent loads the generated standalone HTML, enters the generic workspace, starts a CGL exam, saves a selected response into IndexedDB, shuts down the browser, reopens **the same file URL and profile**, and checks that the response is restored.
- This supplements (not replaces) pure TypeScript tests and static single-file reproducibility verification.
- The test uses the runner's preinstalled Chrome/Chromium, without changing browser dependencies shipped to users.
- CI run is required before calling the browser acceptance gate verified.


### Pass 4 verified checkpoint — 29 October 2026

**CI success:** [40751917786](https://github.com/oneshubhamt/practice-desk/actions/runs/40751917786) — strict TS, existing engine/content tests, generic backup round-trip and immutable-score validation, single-file build, real Chrome `file://` launch/save/reopen with the same browser profile, keyboard focus persistence after selecting an answer, and generated HTML reproducibility all passed.

**Implemented since the earlier checkpoint:** Main History lists completed generic attempts and opens their frozen reviews without mixing unlike exams in CGL analytics. Generic workspace has SHA-256-verified export/import of saved attempts and uploaded packs, adds records atomically, refuses duplicate record IDs, validates stored responses and frozen scores, and disables Start until storage initializes. Question navigator exposes the current item and flag state to assistive technology.

**Not yet release-complete:** Unified one-click backup across legacy and generic data, manual Firefox/Safari `file://` reopen acceptance, cross-tab write-conflict testing, and removing the parallel CGL-specific user interface in favour of one exam-agnostic presentation. `main` and `baseline/v11` remain unchanged.


### Pass 4 continuation — unified all-data history backup

- Combined the former CGL-only History export/import with generic exam attempts and imported exam-package records in one SHA-256-verified v2 archive; includes CGL frozen display revisions.
- Import validates every record with its own existing domain validator before an atomic IndexedDB `add()` transaction and skips IDs already present. There is no overwrite of completed attempts or installed exam packages.
- History now labels the one-click action `Export all data` and clarifies what is included. Generic workspace's separate export remains available.
- Extended Chrome `file://` acceptance: use the original CGL test UI, save an answer, export a downloaded archive, and verify both generic and CGL records are present.
- Requires CI validation; localStorage fallback cannot provide atomicity across two keys and must clearly surface save failures. This is not a multi-tab edit-lease implementation.

### Pass 4 reliability checkpoint — generic multi-tab write conflicts

- Generic records now include an optional integer `saveRevision` (missing means zero) checked atomically inside an IndexedDB readwrite transaction; failed checks never overwrite another tab's changes.
- A conflict stops further editing in the stale tab, clears its emergency mirror and reloads the last saved record with a warning.
- LocalStorage fallback and the original CGL UI are not yet cross-tab guarded; do not claim complete cross-tab safety.
- Focused version-guard tests added. Real two-tab Chromium verification remains part of the acceptance suite.

### Pass 4 two-tab browser regression gate

- Extended Chrome headless `file://` smoke: two simultaneous tabs reopen the same generic attempt. The second tab commits a newer revision, then the first attempts a stale update.
- The first tab must display a storage-conflict warning and the persisted record must retain the second tab's revision. This is an automated gate for generic attempts only; original CGL tab conflicts and browser-specific fallback behaviour remain deferred.

### Pass 4 verified incremental acceptance — 29 October 2026

**CI run 40805453923 passed:** strict TypeScript, all tests, single offline HTML build and real Chrome `file://` smoke. Browser smoke now covers *both* exam entry points: CGL start/answer, unified backup download including generic and CGL attempts, generic reopen, and simultaneous tabs where an outdated attempt edit is rejected without overwriting the newer IndexedDB revision.

**Current state:** Unified all-data backup and generic IndexedDB optimistic-concurrency guards are implemented. These are real checks, not a claim of final Pass 4 completion. Open acceptance items: original CGL multi-tab edits, consistent localStorage fallback conflict handling, collapsing duplicate fixed-CGL UI into the model-driven workspace, and Firefox/Safari offline manual tests. Preserve `main` and `baseline/v11`.


### Pass 4 reliability and browser-acceptance expansion — 29 October 2026

- The original four-section CGL UI now has optimistic IndexedDB write versions, matching the generic workspace's compare-before-write transaction. A stale CGL tab halts editing, warns and reloads persisted history instead of silently overwriting another tab's answers.
- CGL completion/recovery and deletion paths were strengthened: emergency mirrors are ordered by saved revision, fallback-journal recovery uses a version-guarded transaction, and deletion checks its expected revision.
- The generic localStorage fallback checks for changed records before writes and listens for cross-tab storage changes. Both UIs fail closed and warn on competing fallback edits. This is **best-effort conflict detection**, not a claim of atomic localStorage writes or atomic two-key fallback imports.
- The Chrome `file://` CI gate now tests real **CGL and generic two-tab races**, generic fallback with IndexedDB deliberately unavailable, unified export and actual file-picker import/restore, plus the **six question kinds** in a non-CGL package through submission and frozen historical review.
- Responsive browser gates cover 390 px mobile and 768 px tablet layouts without whole-page horizontal overflow. No external runtime assets, server, localhost or account were added.
- Verified: [CI run 40811155245](https://github.com/oneshubhamt/practice-desk/actions/runs/40811155245) succeeded with strict typecheck, unit tests, reproducible offline build and browser smoke checks.

**Pass 4 remains open.** The remaining substantive implementation is collapsing the fixed-CGL exam and analytics screens into the model-driven workspace without losing existing CGL-specific modes, detailed insights or presentation. The original `legacy.ts` retains `@ts-nocheck`. Manual Firefox/Safari offline testing and quota-exhaustion acceptance are also not verified here. Do not mark final release acceptance complete based on Chrome CI alone. Keep `main` and `baseline/v11` stable.


### Pass 4 shared exam-surface integration — 29 October 2026

- Extracted a pure, strictly typed model-driven `renderModelExam` presentation. The original CGL shell now calls that same renderer using its revision-frozen paper and generic engine state; custom exams already use it.
- Removed the duplicate fixed-CGL active exam markup. All three original CGL modes (locked sectional simulation, free-navigation full paper, and selected single section) retain the legacy CGL history/insights workflow and revision-aware persistence, but draw questions and controls from the generic model. Cached CGL package assets are reused.
- Original CGL and generic rendering both preserve keyboard focus on answer changes. The model-view response form is disabled while a session is paused.
- CI expanded to launch the original CGL free and single-section modes with the shared rendering, test keyboard A-D answer control, section switching, pause/resume and post-submission analytics; existing strict-mode, generic six-kind, multi-tab and backup/file-origin tests remain.
- **Verified Chrome `file://` CI:** [40812177739](https://github.com/oneshubhamt/practice-desk/actions/runs/40812177739) — typecheck, tests, generated artifact, original CGL and non-CGL end-to-end, mobile/tablet responsive gates, full backup import and concurrent-write protection passed.

**Remaining release-boundary limitations:** The CGL-specialized home, rich analytics and historical review still live in the transitional `legacy.ts` shell under `@ts-nocheck`; their removal must be preceded by feature-equivalent typed components, not a silent downgrade. Manual Firefox/Safari `file://` acceptance and quota-exhaustion behaviour are still unverified. The best-effort localStorage fallback cannot offer multi-key atomicity. Keep all changes isolated to `overhaul` until those release qualifications are addressed.


### Pass 4 final Chromium acceptance checkpoint — 29 October 2026

**Verified browser run:** [40848082790](https://github.com/oneshubhamt/practice-desk/actions/runs/40848082790) — Node 24, strict new-module typecheck, all Node tests, standalone `file://` Chrome browser flows and regenerated distribution passed.

**Implemented and verified:**
- One typed `renderModelExam` question/answer interface now handles all three SSC CGL modes and generic/custom tests, including the original/reviewed paper figures and option-image data URIs.
- All six generic response types work through result submission and reopen of a frozen attempt. Min-selection feedback is in-place and accessible; answer inputs are mapped to validated option/matching identities without `as any`.
- Shared controls honor pause, forward-only navigation and no-early-section-submission policies. The question palette disables previously visited positions in forward-only mode.
- Both CGL and generic indexed attempts reject stale-tab writes. Emergency recovery respects saved revisions; fallback storage has best-effort conflict warnings and permits exporting the latest stored generic history even after a conflict.
- Chrome `file://` regression checks restore both generic and CGL history from one checksum-verified export, exercise active-session reopen and two-tab conflicts, check 390/768-pixel layouts and decode real question/option images.
- The shared renderer indexes response records once per redraw rather than repeatedly scanning all answers for each question navigator entry.

**Acceptance decision:** The **Pass 4 shared exam presentation and Chromium regression implementation** is complete. **Final cross-browser release acceptance is not complete**: Firefox and Safari `file://` reopen/storage/backup behaviour, quota-exhaustion recovery and assistive-technology/manual interaction checks require platform testing. The original specialized CGL home, analytics and historical review remain functional but in the `@ts-nocheck` transitional shell; replacing that shell without preserving full feature parity is a separate outstanding architectural cleanup. Do not claim a fully strict-TypeScript frontend.

See `docs/PASS4_RELEASE_ACCEPTANCE.md` for remaining verification. Do not merge to `main` or overwrite `baseline/v11` before deciding on these release gates.


### Pass 4 clean-break overhaul — 29 October 2026 (supersedes earlier Pass 4 architecture notes)

**User decision:** v11 lives on `baseline/v11` as the frozen reference. There are zero current user records to migrate. Do not maintain a second legacy implementation or build backwards-compatibility storage adapters.

**Completed:** Replaced the entire `src/app/legacy.ts` runtime and `src/app/browser-engine.ts` adapter with a single `src/app/bootstrap.ts` entry, strictly typed `src/app/generic-ui.ts`, and versioned `src/app/exam-package.ts` policy configuration. The old files and their adapter tests were deleted from `overhaul` only. One library shows all ten CGL original/reviewed editions and imported exams. CGL strict, flexible and section-practice modes are revisioned paper policies, not separate renderers/engines. One history and result path presents frozen answer keys, editorial notes, explanations, per-section performance and per-question time. Users can resume, delete, export checksum-verified backups, import additive records and switch themes and type scale.

**Storage reset:** Fresh IndexedDB database `practiceDesk.overhaul.v1` (single `attempts` store) and fresh overhaul-prefixed localStorage fallback/mirror/settings keys. No reading or migrating v11 browser data. The source/paper/review/solution JSON remains separate; all execution is single-file offline.

**Verified:** CI [#40855216283](https://github.com/oneshubhamt/practice-desk/actions/runs/40855216283) passed Node 24 / strict TS 7.0.2 / unit tests / new Chrome `file://` smoke. The smoke covers all four CGL sectional submissions, free/single CGL practices, CGL image decode, custom six-response exam, frozen results, backup round trip, persistent-profile restart, IndexedDB stale-tab rejection, blocked-IDB localStorage fallback conflict/export, 390/768 px widths, and page errors. The GitHub Actions build publishes the generated self-contained HTML back to `overhaul` after successful checks. `main` and `baseline/v11` remain untouched.

**Manual release checks only:** Firefox/Safari `file://` persistence/reopen, quota exhaustion and physical-device touch/screen-reader tests remain unverified. These platform-dependent release checks must not be described as completed. Pass 5 is separate.


### Pass 5 — Learning/revision implementation (29 October 2026)

**Runtime decision:** Pin the latest stable `ts-fsrs@6.0.0` (published 28 October 2026), use its asynchronous `DefaultScheduler` with explicit FSRS-7, no homegrown scheduler and no pre-release/beta. Esbuild packages the scheduler into the one standalone `file://` HTML. Node 24 and TypeScript 7.0.2 remain pinned in CI. Retention 0.9, fuzzing disabled for deterministic replay.

**Completed:**
- `src/learning/learning.ts`: strictly validated, revision-frozen notebook cards with self-reported error type, bounded notes, explicit manual subtopics/bookmarks and ISO-ordered review-grade logs. Each card is created only after exam submission, never from an answer preview.
- `src/app/learning-ui.ts`: one responsive learning desk with notebook editing, due-card queue, answer reveal, four explicit FSRS review grades, user filters and descriptive topic/comparable-attempt metrics. The review UI discloses solutions only after revealing.
- `src/app/generic-ui.ts`: individual completed-result question bookmarking and one-click revision set from incorrect/unanswered items. The same validated IndexedDB store, write-revision guards, localStorage fallback and checksum-verified all-data backup now include learning cards. No new migration or duplicate legacy code.
- Evidence taxonomy: source `topicIds`, user-labelled subtopic and section fallback, grouped by exam; minimum 5 answered items before drawing conclusions. Comparable trends require identical immutable paper revision and policy. No rank/percentile prediction.
- `tests/learning.test.mjs`: frozen references and answer-key validation, FSRS-7 deterministic review replay, manual subtopics, fair comparable trend cohorts and backup integrity.
- `scripts/smoke-offline.mjs`: actual Chrome `file://` flow checks save-to-notebook, first review answer hidden/revealed, FSRS grading, note and error classification, backup, close/reopen persistence and previous CGL/generic/regression tests.

**Verified:** [GitHub Actions #40858120327](https://github.com/oneshubhamt/practice-desk/actions/runs/40858120327) — Node 24, TS 7.0.2 strict typecheck, 51 unit tests, single-file build, real Chrome `file://` smoke including Pass 5, IDB recovery/conflict and responsive layouts. Old `main` and `baseline/v11` remain unchanged.

**Release gates still manual:** Firefox and Safari `file://` storage, quota-denial recovery, iOS/Android input and accessibility. FSRS review feedback is self-rated; do not infer its grades from mock scores or claim statistically calibrated readiness.


### Pass 6 — integrity and persistence hardening (29 October 2026)

**Supersedes all older recovery, media and backup-format implementation notes above.** Pass 4/5 checkpoint statements in this historical roadmap refer to the state at the time, not the current branch.

- **Canonical revision integrity:** New `src/domain/hash.ts` and `src/domain/integrity.ts` recalculate hashes for question content/editorial, answer key entries, paper sections/policies/key references and all embedded image bytes. Both built-in SSC paper import and custom fixtures use the canonical hashing rules. Imported exam packages and stored frozen content are independently checked. SHA-256 detects corruption, not malicious forgery.
- **Complete stimulus/media checks:** `src/domain/media.ts` validates passage, case, table, image and chart schemas; references, unique IDs, encoded media types and content digests; media size/count ceilings. Questions cannot reference unavailable figures or stimuli.
- **Historical display durability:** Attempt snapshots now use frozen **schema 2** with the exact referenced stimuli and image assets. Learning cards also pin their own question-specific display media, allowing history and reviews without reliance on a still-available imported package. It intentionally duplicates some image data across records in return for reliable visual history.
- **Scoring integrity:** Completed history import validates every item-level verdict and mark against recomputed scoring in addition to aggregate scores. Stale or altered history with mismatched scoring is rejected.
- **Durable write acknowledgements:** `generic-ui.ts` resolves `save(record)` only after IndexedDB `transaction.oncomplete` or successful fallback write. Notebook edits, explicit FSRS review grades and imported-package UI messages await that result; non-conflict write failures block further edits and retain an exportable in-memory emergency snapshot. Stale-tab guards remain active.
- **Complete backups:** Backup **v3**, replacing v2 in the clean overhaul, includes typed attempt/package/notebook records, frozen media and validated dark-mode/font preferences. Normal exports await pending writes and snapshot authoritative IndexedDB; storage failures use an explicitly labelled `UNSAVED_RECOVERY` file instead. Imports are additive and atomic for records within IndexedDB; preference restoration occurs separately and reports failure if browser storage refuses it. `src/app/preferences.ts` centralizes preference validation.
- **Verified automated gates:** [GitHub Actions #40863482395](https://github.com/oneshubhamt/practice-desk/actions/runs/40863482395): Node 24, strict TypeScript, **55/55 unit tests**, single-file HTML generated (~1.12 MB), and genuine headless Chrome `file://` smoke. Includes full backups/preferences roundtrip, same-profile restart, IndexedDB stale-tab rejection, blocked-IndexedDB fallback conflicts, deliberately rejected `put()` with `QuotaExceededError`, unsaved recovery export, and 390/768-pixel layouts.
- **No migration:** There are no production v11 records to migrate; v11 stays on `baseline/v11`. Fresh frozen schema 2 and backup v3 are clean-break formats in `overhaul`.

**Still unverified and not claimed release-complete:** Firefox/Safari `file://` storage behavior, physical Android/iOS quota and touch tests, forced termination/pagehide data loss, accessibility/screen readers and large-history scaling. Passes 7–9 remain for exam-policy correctness, advanced learning and final UI/release hardening. See `docs/PASS6_RELEASE_ACCEPTANCE.md`.

## Pass 7 current-work scratchpad — audit and design (29 October 2026)

**1 · Audit evidence (current HEAD `69871878`, v11 `e661822d`):**
- Seven Markdown files mapped in [README.md](../README.md) and [AGENTS.md](../AGENTS.md), with this document as the sole live design scratchpad and `PASS7_RELEASE_ACCEPTANCE.md` as the explicit objective list.
- `src/engine/session.ts` handles section expiry and forward-only navigation; **`SUBMIT_ATTEMPT` ignores sectional policy** and `RESUME` does not verify that pausing was allowed; UI offers sectional submission only, but engine contract is bypassable.
- `src/engine/scoring.ts` scores `draft` editorial content despite excluded invalid/under-review/incomplete/superseded statuses; no explicit self-evaluated written response workflow.
- `src/app/exam-package.ts` always freezes mode `exam-simulation` despite separate CGL flexible/section and generic practice paths.
- `src/app/generic-ui.ts` result HTML does **not render frozen stimulus or images**, although `frozen.schema=2` retains them; result only has a long text-only list.
- `src/content/import-cgl.ts` preserves optional source URLs, but loses `sourcePage` and source/patch distinction unless explicitly restored.
- v11 CSS ~28.7 KB vs new CSS ~7.3 KB, and v11 legacy app offers dedicated history, insights, nuanced review, speed/accuracy, question timings, polished navigators and display popover. Overhaul is deliberately cleaner but **visually and functionally below the v11 baseline**. The explicit [v11 parity ledger](V11_PARITY_LEDGER.md) prevents treating this as acceptable; Pass 9 restores/refines it, while Pass 8 supplies richer analytic data and Pass 10 is platform hardening.

**2 · Design constraints and decisions:**
- Keep frozen content and scored snapshot immutable; source and reviewed answer keys must never be conflated. Original-key comparisons require a pinned, validated provenance basis; no newly guessed original scores.
- Enforce timing and navigation in pure engine, not only disabled buttons. CGL strict four 15-minute sections and early section submit **remain supported**. Whole-paper flexible is allowed to end early. For no-early-submit sectional papers, direct submission and premature section submit must be rejected.
- Maintain source-page provenance and explicit original vs reviewed citations in editorial records, verify hashes, and leave unknown sources unknown.
- For written responses, auto result remains `pending`; explicit user self-assessment may add a separately labelled persisted marks layer, never alter the original frozen `scoreAttempt` result.
- Restore all figure/passage/tabular context in results using frozen snapshot even after current package disappearance; HTML escaped and data-URI bounded.
- Run targeted engine + imported synthetic policy tests, immutable result review, v11 CGL smoke, multi-tab and backup/regression. Update this section with outcome when verified.

**3 · Implementation ledger — changes on `overhaul`:**
- `src/engine/session.ts`: sectional attempts require section transitions; direct overall submission cannot bypass them; early-submit policy and delayed section-click after timeout enforced at the pure transition boundary. Clock-rollbacks cannot cause negative time and `RESUME` checks pause policy.
- `src/engine/clock.ts` plus `src/app/generic-ui.ts`: use an epoch-anchored monotonic in-tab clock, replacing `Date.now()` for live exam event timestamps. Offline duration after a browser restart remains a best-effort wall-clock estimate (no anti-tampering claim).
- `src/app/exam-package.ts`: snapshots now distinguish `exam-simulation`, `full-paper-practice`, `section-practice` and `custom-practice`; remains a single generic engine.
- `src/domain/question.ts`, `src/domain/validate.ts`, `src/content/import-cgl.ts`: typed positive `editorial.sourcePage`, with source/review references and hashes preserved. `src/engine/scoring.ts` excludes `draft`.
- `src/engine/manual-grading.ts`: validates optional user-entered marks/notes on submitted pending free-response items; original automatically scored snapshot remains immutable. `generic-ui.ts` awaits durable save and explicitly displays independent self-assessed totals.
- `src/engine/source-comparison.ts`: captures a pinned, integrity-checked original-source key basis for reviewed attempts. Includes original-key unadjusted excluded items, **separately** from audited reviewed marks; only generated when matching source and reviewed revision identities exist.
- `src/app/generic-ui.ts`: historical review now renders frozen passage/table/image/option/matching media, source page, source URLs and answer context; not dependent on currently installed package.
- `tests/pass7-engine.test.mjs`, `tests/exam-package.test.mjs`, `scripts/smoke-offline.mjs`: comprehensive new negative engine tests and preservation of existing Chrome/offline release gates.

**4 · Objective reconciliation:**
1. Policy enforcement — **met**: no-early, strict CGL, delayed click, forward-only, pause/flag in engine tests.
2. Time integrity — **met for in-tab monotonic clock and tested restore/visibility**, **not a guaranteed anti-tamper clock across device shutdown or altered wall clock**; platform release limitation explicitly retained.
3. Mode / source provenance / editorial status — **met** with hash-covered fields and pure tests.
4. Pinned source-key comparator — **met** with separate presentation and mutation rejection.
5. Frozen visual review — **met** in Chrome with decoded built-in CGL figures; media integrity inherited from Pass 6.
6. Written response manual assessment — **met**; original result unchanged and separately persisted, backup and reopen checked.
7. Comprehensive v11 UI/feature parity — **intentionally not met in Pass 7**; feature-by-feature mandatory scope preserved in `docs/V11_PARITY_LEDGER.md`, dedicated Pass 9.
8. Offline platform QA — **Chrome automated met**, Firefox/Safari/manual touch/screen reader/storage remains Pass 10.

**5 · Targeted QA evidence:**
- Strict TS 7.0.2 / Node 24, unit testing and generated offline HTML;
- Engine tests: strict sectional rejection; no-early and automatic timeouts; delayed double-submission prevention; forward-only/flag/pause; monotonic live clock rollback;
- Import/review: draft exclusions, source-page and citation preservation, original-key integrity/tamper, full 100-item CGL frozen media decoding;
- Free response: pending automatic result, durable user-rated mark/note, unchanged scored snapshot, backup v3 and reopen;
- Chromium `file://`: strict/flexible/section modes, six answer kinds, learning/FSRS, backup/preferences, two-tab stale write conflict, fallback collision, simulated quota denial, mobile/tablet widths and no console page errors.
- [Baseline green run #40898692499](https://github.com/oneshubhamt/practice-desk/actions/runs/40898692499) — **63/63 unit tests and full Chrome smoke**, before the later targeted backup/reopen and monotonic-clock additions. The **final-HEAD CI** passed at [GitHub Actions #40899786917](https://github.com/oneshubhamt/practice-desk/actions/runs/40899786917): **64/64 tests**; all Chrome `file://` smoke checks, including manual marks and source references in backup/reopen, passed. This is an engineering/Chromium acceptance result, not cross-browser or v11 product-UI parity.

**Unresolved / next:** Pass 8 deepen learning and analytics without guessing; Pass 9 deliberately recover **v11-or-better** UI and functionality rather than perpetuating the rudimentary implementation; Pass 10 scale/real-device/cross-browser release hardening. Keep v11 frozen as the reference, not as a duplicate runtime in overhaul.


## Pass 8 — live five-step scratchpad (29 October 2026)

**1 · Audit (source, docs, v11 comparison):** `src/learning/learning.ts` has per-question frozen cards, FSRS-7 review replay, section/topic labels with a 5-answered observation gate, and exact-paper comparison, but **no executable revision sets**, no distinct-question or independent-attempt evidence, and no questions' pace/speed–accuracy/negative-mark decomposition. `src/app/learning-ui.ts` presently only lists and edits cards/reviews; `src/app/generic-ui.ts` supports add-to-notebook but not a derived exam. Every redraw calls `scheduledCard` for each item multiple times. The v11 baseline contains richer analytics and dedicated history/insights, recorded in `docs/V11_PARITY_LEDGER.md` and reserved for visual parity in Pass 9. Pass 7 resulted in 64 Node tests and Chrome offline acceptance; do not regress them.

**2 · Analyze/design:** Use one transient, custom revision exam through the existing `ExamPackage` validator, frozen attempt and generic engine. Source cards may be mixed across paper revisions **only within one exam ID**; deduplicate IDs, reject conflicting shared media and unscoreable editorial statuses, and announce +1/0 practice scoring. Revision history must retain all source media even without the original package. Analytics separate raw observation counts, unique questions, and independent attempts, use section-relative measured speed, recompute from frozen responses and marking rules, and avoid rank/causal/predictive claims. Prevent repeated full FSRS schedule replays during the same redraw by caching state keyed to unchanged card objects. [Design details](PASS8_DESIGN.md). Pass 9 remains a **mandatory v11-or-better UX** gate, not optional polish.

**3 · Implement (on `overhaul`):**
- `src/learning/revision-test.ts`: build 1–25 card validated, one-exam, untimed custom practice exams using frozen question/key/media and fixed +1/0/0 marks; reject duplicate/unsafe questions and conflicting shared assets; add integrity-hashed `notebookLineage` tracing each source card to its completed source attempt/paper/section.
- `src/learning/learning.ts`: saved notebook cards now pin the source completed attempt ID. Topic categories distinguish source-provided topic IDs, section labels and user-entered labels; record raw observations, distinct answered revisions and independent **answering** attempts.
- `src/learning/attempt-evidence.ts`: pure, frozen-input section summaries; measurable question time, speed–accuracy with explicit thresholds, actual penalties, hypothetical wrong/skipped improvement arithmetic, and descriptive topic consistency bands that reject repeated-item false confidence.
- `src/app/learning-ui.ts`: "Start revision test" from current due/bookmarked/all filter, scoped to a single exam and up to 25 eligible cards; FSRS-7 schedule cache keyed by unchanged records, invalidated on replacement/deletion; richer topic evidence and consistency tables. Original FSRS rating workflow and answer-reveal behavior unchanged.
- `src/app/generic-ui.ts`: start revision through ordinary validated engine + committed history, show separate result evidence and source-note lineage; generated attempts reopen and export through backup v3 without new parallel storage.
- `src/styles/app.css`: compact responsive metric and evidence layout while explicitly deferring sophisticated home/exam/insights shell to Pass 9; no v11 runtime introduced.

**4 · Objective reconciliation:**
1. **True generated revision exams — met.** Original immutable card questions/keys/media, no active answer leak, validated custom scoring (not official), unique attempt/paper identities, history/backup/reopen and source-attempt lineage.
2. **Topic taxonomy and evidence — met.** Only explicit section/source/user labels, observation versus unique answered question versus answering attempts, five-answer measurement gate and stricter ten-answer/two-attempt/five-unique consistency gate.
3. **Detailed analytics — met as descriptive computations.** Section marks, positive/penalty, coverage, measured time, median-relative speed buckets, changes counted, exact hypothetical score swings; no causation or invented elapsed mental effort.
4. **Longitudinal evidence — met.** Prior exact-paper trend sequence preserved; consistency groups never claim calibrated mastery or compare differing keys/editions as identical.
5. **Efficient FSRS — met.** Cache prevents repeated replay for unchanged cards, invalidates on changes; no automatic rating from mock/revision scores.
6. **v11 visual parity — not claimed.** Dedicated Pass 9 remains mandatory for complete history/insights, rich result tabs, speed and pacing presentation, examiner-grade shell and full display controls.
7. **Cross-browser/manual release acceptance — not claimed.** Firefox/Safari, mobile touch, screen readers, actual quota and forced termination remain Pass 10.

**5 · Targeted QA:**
- New pure tests: genuine revision package and automatic scoring, raw source/answer-media identity, inherited backup v3, unsafe/draft and mixed-exam rejections, valid cross-paper sources within one exam, conflicting asset identities, source lineage tampering, min sample/unique question gates, speed medians and unclassified insufficiency, exact opportunity arithmetic.
- Chromium `file://` end-to-end: create notebook→FSRS rating and note→generate revision→answer hidden→complete→pacing evidence→reopen→backup→restore. Confirm FSRS rating log unchanged by generated exam.
- All previous CGL strict/free/section, six-kind custom, manual scoring, hashed media, offline backup, IndexedDB multi-tab and quota denial, 390/768-pixel responsive gates retained.
- [Green intermediate implementation CI #40903965637](https://github.com/oneshubhamt/practice-desk/actions/runs/40903965637) confirms full test suite/browser flows after lineage integration. Final documentation HEAD [CI #40904651689](https://github.com/oneshubhamt/practice-desk/actions/runs/40904651689) passed: **70/70 Node tests**, strict TS/build, all real Chromium `file://` smoke including generated revision and provenance, FSRS noninterference, complete backups/reopen, CGL/custom modes, stale-tab/fallback/quota failure and responsive layouts.



## Pass 9 — five-step UI and v11 parity scratchpad (29 October 2026)

**1 · Audit:** Current `generic-ui.ts` has one combined library/history listing, exam shell of two panels with plain timer and palette, and a continuous result page with every review rendered. `learning-ui.ts` displays FSRS, revision and topic evidence but remains a raw two-column form/table. Current CSS is ~8 KB versus v11's ~29 KB, and the current header exposes four permanent display buttons instead of v11's compact popover/fullscreen. v11 `legacy.ts` supplies dedicated home, compact in-progress resume, comprehensive history with trend/priorities, tabbed results, review filters, item timings, progress bars, speed×accuracy and mark-swing cards, and a polished immersive exam shell. The **new typed engine, FSRS, backups, provenance, draft/score integrity and offline restrictions are preserved**; no v11 code/DB migrations. [Feature parity ledger](V11_PARITY_LEDGER.md).

**2 · Analyze:** Implement presentation as distinct `library`, `history`, `exam`, `result`, `learning` views using existing record/map/engine; dedicated history sorting/filtering and revision-cohort trends must derive from frozen record data, not invented psychometrics. Result tabs separate overview, question review and timing, with scoped filters; keep original key/manual grades/provenance media available and no answers visible in exams. Add responsive, visually designed home, active-attempt notice, metric cards/visual pacing, enhanced exam navigator/timer, display popover/fullscreen without breaking dark/scale persistence. Preserve all historical tests and add actual Chrome `file://` UI interactions at 390px, 768px and desktop. Pass 10 remains cross-browser/screen-reader/performance/forced-exit QA.

**3 · Implementation (typed, on `overhaul` only):**
- **Home:** `generic-ui.ts` `listHTML` now returns designed page hierarchy (paper/mode card, accurate selected mode stats, active resume, recent attempts, progress summaries, learning and backup utilities, offline rules). The same existing exam store, source banks and engine are used; the new view is not an imported v11 runtime.
- **History:** new `src/app/history-page.ts`, `view:"history"`, query state and event bindings. Search/filter/sort; resume/delete, import/export; same-revision longitudinal visual trend (plotted only for measured accuracy, 2+ eligible points); cross-paper *descriptive* section priorities (no notebook-revision synthetic cohorts).
- **Results:** new `src/app/result-presentation.ts`, stateful `overview/review/timing` tabs, keyboard arrows, scoped review filters, tabpanel labels and frozen question timing rows. Existing immutable scored items/manual grades/media/provenance intact. Score-opportunity and speed-miss controls jump into filtered rich review. Section coverage bars and a coherent scorecard hierarchy.
- **Exam:** `renderModelExam` now renders active mode, high-salience remaining clock and low-time state, accessible timer/coverage progressbar, answered/viewed/flagged counts, section buttons, rich question surface and sticky palette with legend; Alt+arrows navigate via the same typed `transition` as buttons, never bypassing policy.
- **Answer revisions:** session transitions capture actual timestamped per-question selection/clear events; bounded optional histories are validated on every store/backup import (linked events, final response, time bounds and answer shapes). New `src/learning/answer-revisions.ts` computes truthful single-choice wrong→correct / correct→wrong sequences; clears and missing historic logs explicitly do **not** generate outcomes. Previous summary-only answer-change counts still available.
- **Display:** compact header `Aa` settings popover in `src/template.html`, bootstrap keyboard/outside dismiss, font-theme persistence and optional fullscreen with failure reporting. `src/styles/app.css` now contains a consistent responsive tokenized palette, stronger typography, cards, visual hierarchies, history/score/learning and dark state with reduced-motion guard. No runtime network or UI library.
- **Learning:** `src/app/learning-ui.ts` gains due/bookmarked/reviewed summary and self-reported error-pattern cards, maintaining FSRS-7 and source-linked revision behavior.

**4 · Objective reconciliation against [parity ledger](V11_PARITY_LEDGER.md):**
1. Home identity/selected paper/resume — **met** in source + Chromium user flows.
2. Dedicated history/insights — **met** with valid cohort selection, correctly excluded synthetic revisions and accessible archive filters; *not* claiming rank/percentile.
3. Results tabs, source/modified scoring, review filters, ledger — **met** with frozen data and positive/negative paths.
4. Real answer revisions — **met for newly captured direct single-choice edits**; older attempts and clear/reselect events appropriately cannot show rescues/losses.
5. Timed exam shell/palette/keyboard — **met** in strict/flexible/single and generic exams.
6. Appearance popover/theme/size/fullscreen control — **met as browser-supported controls**; actual fullscreen permission behavior remains platform-specific.
7. Integrated learning visuals — **met**; scheduled FSRS records never mutated by mock attempts.
8. Responsive/adaptive CSS and keyboard — **met in automated Chrome 390/768/desktop tests**, **manual real-device visual/accessibility signoff unverified**.
9. Preserved core invariants — **met**: previous 70 Node tests and expanded Pass 9 tests, offline distribution, frozen scoring, media, storage conflict and recovery all retained.
10. Screenshot pixel-perfect parity / all-platform release — **not claimed**. Requires visual review and device testing in Pass 10.

**5 · Targeted QA and evidence:**
- New `tests/pass9-ui.test.mjs`: dedicated history status/search/sort and non-mutating order, empty/null trend behavior, content-safe archive, result tabs/time ledger/review filters, exam shell/no active key leak and recorded answer event rescue/loss with tamper rejection.
- Expanded `scripts/smoke-offline.mjs`: premium home summaries, actual history search/sort/status/return and safe resume, result tabs/keyboard/ledger deep links, filtered review and source media, settings popover/Escape/theme/preferences restoration, accurate free/section mode preview, Alt+arrow exam navigation, desktop and 390/768px overflow across library, history, exam, insights, review, time ledger and learning.
- Existing full flows: strict/whole/section SSC CGL, imported six response kinds, complete original/reviewed scoring, manual written assessment, FSRS cards, notebook-generated exams, backup restore/reopen, IndexedDB stale-tab rejection (assert *newer answer* persists even with timer commits), fallback conflicts, deliberately denied quota save and emergency recovery export.
- [Latest verified pre-documentation Chrome run #40915424874](https://github.com/oneshubhamt/practice-desk/actions/runs/40915424874): **75/75 Node tests**, strict TypeScript, one self-contained HTML and complete `file://` smoke green. Verified final implementation/documentation CI [#40916049802](https://github.com/oneshubhamt/practice-desk/actions/runs/40916049802) passed: **75/75 unit tests**, strict TypeScript, 1,205,906-byte self-contained offline HTML, all Chromium `file://` paths including full CGL/custom and FSRS/revision flows, backup/restore, stale-tab protection, simulated quota denial and mobile/tablet overflow checks. The final recordkeeping-only correction has its own CI.

**Still open as manual Pass 10 signoff:** visual screenshot comparisons with original v11 in browsers, Firefox/Safari/mobile/screen readers, long-history and force-quit recovery, physical device quota and native fullscreen support. None of these are concealed under 'Pass 9 complete'.



## Pass 10 — five-step release and recovery scratchpad (29 October 2026)

**1 · Audit:** Previous Pass 9 Chromium/headless and 75 Node tests were green, but real browser/device behavior, stress, forced exit, accessibility and v11 screenshot signoff were unverified. A source review of `generic-ui.ts` found that a successful IndexedDB open followed by a failed initial `getAll()` left `db` nonnull when the catch selected localStorage fallback; subsequent writes could therefore target the wrong storage backend. [Pass 10 acceptance](PASS10_RELEASE_ACCEPTANCE.md) tracks detailed gates.

**2 · Analyze:** One storage failure must have one coherent fallback backend for both displayed data and future writes; close/clear the defective handle before entering fallback. Test this browser path, not just domain helpers. Keep the current single-file offline distribution and immutable scoring/backup invariants. Use Playwright Chromium, Firefox and Linux WebKit for targeted `file://` persistence and backup checks, plus a bounded 80-attempt history stress screen. Real Safari/iOS, force-crash semantics and screen readers are separate manual gates, not inferable from headless success.

**3 · Implement:** `src/app/generic-ui.ts` closes/sets `db=null` in startup catch. `scripts/smoke-offline.mjs` injects a throw from initial IndexedDB `getAll()`, then verifies a new saved answer reaches localStorage fallback. New `scripts/pass10-platform.mjs` exercises save → export → reload → saved answer in browsers and stresses Chromium with 80 uniquely identified frozen attempts. CI runs these in dedicated jobs using Playwright Firefox and WebKit, in addition to original Chromium smoke and TypeScript/test gates. `README.md`, `AGENTS.md` and this live scratchpad link to `docs/PASS10_RELEASE_ACCEPTANCE.md`.

**4 · Objective reconciliation (pending final-head CI):** Recovery-code fix and tests authored; do not mark multi-browser, scale, final HTML or CI objectives verified until the exact branch HEAD run passes. Existing historical score, provenance, backup and FSRS requirements remain non-regression gates. Additional manual acceptance remains intentionally separate.

**5 · Targeted QA (pending final-head CI):** Check browser jobs and step logs, repair any actual failures, record evidence in the dedicated Pass 10 ledger. Outstanding physical Firefox/Safari/Android/iOS, assistive technology, forced renderer termination and visual screenshot approval cannot be declared passed from the available headless runner.

**Pass 10 automated QA checkpoint — 29 October 2026:** [CI #40921780620](https://github.com/oneshubhamt/practice-desk/actions/runs/40921780620) passed all jobs (full Chromium checks, Firefox, Linux WebKit), 75/75 Node tests, initial-IDB-read-failure fallback regression, all existing browser recovery/score/learning regressions and 80-record history rendering (438 ms on runner). The verified generated distribution was committed as `840e070`. Earlier CI failures were generated-file push races during rapid commits, not browser regressions; workflow concurrency now cancels superseded runs. Final docs-only HEAD CI is pending. Real Safari/iOS/Android, screen readers, forced termination and screenshot approval are still **not** claimed; see [Pass 10 acceptance](PASS10_RELEASE_ACCEPTANCE.md).


## Documentation transition — 30 October 2026 (no code changes)

The historical Passes 1–10 engineering/design record is retained intact here. New direct-source audit of v11 `e661822` against overhaul `5b9dce6` revealed material missing user-facing features despite previously green QA and “parity” descriptions. **Feature-parity execution, Passes 11–16 and five-step objective evidence now live exclusively in [V11_FEATURE_PARITY_PROGRAMME.md](V11_FEATURE_PARITY_PROGRAMME.md).** The historical status and old acceptance documents are indexed in [PROJECT_STATUS.md](PROJECT_STATUS.md). This addendum does not assert any gap fixed.
