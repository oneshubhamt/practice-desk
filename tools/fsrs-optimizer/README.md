# FSRS-7 optimizer

This tool trains Practice Desk's portable FSRS-7 profile without adding Rust/WASI to the standalone `file://` application.

1. Export **optimizer evidence** from Learning.
2. Run `npm install` in this directory.
3. Run `npm run optimize -- path/to/practice-desk-fsrs-reviews.csv profile.json Asia/Kolkata 4`.
4. Import the evaluated profile in Practice Desk.

The beta dependency is pinned to `@open-spaced-repetition/binding@0.6.0`. Training uses FSRS-7, short-term learning, one relearning step and FSRS-7 scheduling penalties, then records time-series evaluation metrics.
