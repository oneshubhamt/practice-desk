# FSRS-7 optimizer

This isolated Node tool trains Practice Desk's portable FSRS-7 profile without adding Rust/WASI to the standalone `file://` application.

## Personalized FSRS-7 weights

1. Export **optimizer evidence** from Learning.
2. Run `npm install` in this directory.
3. Run:
   `npm run optimize -- path/to/practice-desk-fsrs-reviews.csv profile.json Asia/Kolkata 4`
4. Import the profile in Practice Desk only if the tool produces one.

**Timezone and day rollover are mandatory.** FSRS-7 preserves fractional study days, so the tool will not silently assume UTC. Use an IANA timezone when possible; a fixed UTC offset in minutes is also accepted.

The activation pipeline is deliberately conservative:

`historical 5/6 → train validation weights → final 1/6 holdout → compare stock FSRS-7 and personalized weights on exactly the same holdout → require better log loss with no RMSE-bins regression → retrain final 34 weights on all evidence → report five-fold upstream time-series cross-validation`

Practice Desk additionally requires at least 64 historical training items, 64 later holdout items, and 16 distinct holdout cards before a personalized profile can be produced. These are application reliability guards, not a claim of statistical significance. If the gate fails or evidence is insufficient, the optimizer exits without a profile and the app remains on stock FSRS-7 weights.

The beta dependency is pinned to `@open-spaced-repetition/binding@0.6.1`. Training uses FSRS-7, short-term learning, one relearning step, card IDs and FSRS-7 scheduling penalties.

### Long runs, progress and interruption

Training and cross-validation report progress to stderr. `Ctrl+C` requests a clean stop at the binding's next progress checkpoint. Optional controls:

- `--max-seconds=600` sets a hard wall-clock deadline enforced through the progress callback.
- `--poll-ms=250` controls the native binding's progress polling interval (50–5000 ms). This is not itself a training deadline.

Example:

`npm run optimize -- reviews.csv profile.json Asia/Kolkata 4 --max-seconds=600 --poll-ms=250`

## Experimental learning-step analysis

The same binding exposes `computeOptimalSteps`, but upstream explicitly documents that it fits a **single-decay** forgetting curve and is **not applicable to FSRS-7's dual-trace mixture curve**. Practice Desk therefore exposes it only as an advisory diagnostic:

`npm run analyze-steps -- path/to/practice-desk-fsrs-reviews.csv step-analysis.json 0.5 0.9`

The decay is deliberately mandatory: Practice Desk does not invent an FSRS-7 decay. The output is a separate `practice-desk-fsrs-step-analysis/v1` report marked `advisoryOnly: true` and `compatibility: "single-decay-heuristic-not-fsrs-7"`. It is never imported into, or automatically applied by, the scheduler.

Run `npm run smoke` to exercise the native binding runtime, the held-out activation policy and the advisory step-analysis API.
