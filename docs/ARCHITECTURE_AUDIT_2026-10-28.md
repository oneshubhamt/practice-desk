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
