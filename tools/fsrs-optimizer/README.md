# FSRS-7 optimizer

This tool trains Practice Desk's portable FSRS-7 profile without adding Rust/WASI to the standalone `file://` application.

## Personalized FSRS-7 weights

1. Export **optimizer evidence** from Learning.
2. Run `npm install` in this directory.
3. Run `npm run optimize -- path/to/practice-desk-fsrs-reviews.csv profile.json Asia/Kolkata 4`.
4. Import the evaluated profile in Practice Desk.

The beta dependency is pinned to `@open-spaced-repetition/binding@0.6.0`. Training uses FSRS-7, short-term learning, one relearning step and FSRS-7 scheduling penalties, then records time-series evaluation metrics.

## Experimental learning-step analysis

The same binding also exposes `computeOptimalSteps`, but upstream explicitly documents that it fits a **single-decay** forgetting curve and is **not applicable to FSRS-7's dual-trace mixture curve**. Practice Desk therefore exposes it only as an advisory diagnostic:

`npm run analyze-steps -- path/to/practice-desk-fsrs-reviews.csv step-analysis.json 0.5 0.9`

The decay is deliberately mandatory: Practice Desk does not invent an FSRS-7 decay. The output is a separate `practice-desk-fsrs-step-analysis/v1` report marked `advisoryOnly: true` and `compatibility: "single-decay-heuristic-not-fsrs-7"`. It is never imported into, or automatically applied by, the scheduler. The active FSRS-7 learning/relearning steps remain explicit until upstream provides a model-consistent FSRS-7 step optimizer.

Run `npm run smoke` to exercise the actual native/binding runtime with 34-weight FSRS-7 training and the advisory step-analysis API.
