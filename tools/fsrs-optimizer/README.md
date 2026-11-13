# FSRS-7 optimizer

Practice Desk exposes the same conservative FSRS-7 personalization contract through two local runtimes: this native Node tool remains the CI/reference path, while the static application bundles the threadless WASI Preview 1 optimizer in a dedicated browser Worker. The standalone `file://` artifact remains scheduler-capable but does not train weights in-app.

## Personalized FSRS-7 weights

1. Export **optimizer evidence** from Learning.
2. Run `npm ci` in this directory.
3. Run:
   `npm run optimize -- path/to/practice-desk-fsrs-reviews.csv profile.json`
4. Import the profile in Practice Desk only if the tool produces one.

**Review duration semantics are explicit:** new Learning reviews record active foreground time from card presentation through rating, split into recall-before-reveal and post-reveal checking. Hidden-tab intervals are excluded and an interruption flag remains on the Learning review. The upstream CSV receives the measured total foreground duration in `review_duration`; rating and timestamp remain the scheduling/training truth.\n\n**Chronology is explicit and not user-configurable:** optimizer conversion uses a fixed UTC offset of 0 and rollover hour 0 solely to make upstream FSRS-7 conversion equal fixed elapsed 24-hour fractional days. This matches Practice Desk's runtime `dateChrono` scheduling. IANA/DST-normalized study days are intentionally not used, so a 23-hour DST interval remains `23 / 24` model days rather than becoming one local calendar day.

The activation pipeline is deliberately conservative:

`historical 5/6 → train validation weights → final 1/6 holdout → compare stock FSRS-7 and personalized weights on exactly the same holdout → require strictly lower held-out log loss with no RMSE-bins regression → if replacing an active profile, require strictly lower log loss than that incumbent on the same holdout → retrain final 34 weights on all evidence → report five-fold upstream time-series cross-validation`

Practice Desk does not impose an unvalidated minimum gain magnitude: any strictly lower held-out log loss may satisfy the discrimination criterion, provided RMSE-bins does not regress. The v5 profile records raw CSV review/card counts separately from the optimizer items/cards retained by upstream conversion. It still requires at least 64 historical retained items, 64 later retained holdout items, and 16 distinct holdout cards before a personalized profile can be produced. These are application reliability guards, not a claim of statistical significance or proof that a small observed gain will generalize. If the gate fails or evidence is insufficient, the optimizer exits without a profile and the current FSRS-7 weights remain active. The requested output path is cleared before training and is only published after every gate succeeds, so a failed rerun cannot leave a stale profile masquerading as the new result.

To train a native replacement against an existing active profile, pass `--incumbent=active-profile.json`. The emitted v5 profile binds the incumbent evidence hash and weights fingerprint to the held-out comparison. Browser optimization supplies the active profile automatically. Imported replacements are accepted only when their incumbent proof matches the active profile; reset to stock first if you intentionally want to activate a profile that was evaluated only against stock.

The beta native dependency is pinned to `@open-spaced-repetition/binding@0.6.1`; the browser runtime is pinned to `@open-spaced-repetition/binding-wasm32-wasip1@0.6.1`. The isolated optimizer dependency tree is lockfile-controlled. Both runtime adapters call the same `optimizer-pipeline.mjs`; conversion, raw-versus-retained evidence accounting, training options, evidence floors, final-sixth split, strict stock/incumbent held-out comparison, final retraining, time-series evaluation and v5 profile assembly therefore have one semantic implementation. `optimizer-policy.mjs` contains the shared constants/gate primitives, while the main application independently validates FSRS-7 parameter bounds plus emitted chronology/holdout metadata before activation. Earlier profiles are rejected rather than migrated because Practice Desk has no production compatibility obligation.

### Long runs, progress and interruption

Training and cross-validation report progress to stderr. `Ctrl+C` requests a clean stop at the binding's next progress checkpoint. Optional controls:

- `--max-seconds=600` sets a hard wall-clock deadline enforced through the progress callback.
- `--poll-ms=250` controls the native binding's progress polling interval (50–5000 ms). This is not itself a training deadline.
- `--incumbent=active-profile.json` requires the candidate to outperform that active profile on the candidate's later holdout before replacement.

Example:

`npm run optimize -- reviews.csv profile.json --max-seconds=600 --poll-ms=250`

## Experimental learning-step analysis

The same binding exposes `computeOptimalSteps`, but upstream explicitly documents that it fits a **single-decay** forgetting curve and is **not applicable to FSRS-7's dual-trace mixture curve**. Practice Desk therefore exposes it only as an advisory diagnostic:

`npm run analyze-steps -- path/to/practice-desk-fsrs-reviews.csv step-analysis.json 0.5 0.9`

The decay is deliberately mandatory: Practice Desk does not invent an FSRS-7 decay. The output is a separate `practice-desk-fsrs-step-analysis/v1` report marked `advisoryOnly: true` and `compatibility: "single-decay-heuristic-not-fsrs-7"`. It is never imported into, or automatically applied by, the scheduler.

Run `npm run smoke` to exercise the native binding runtime, fixed-elapsed chronology including a DST regression, the held-out activation policy and the advisory step-analysis API. Run `npm run parity` to compare native and WASM conversion, one-epoch training and evaluation numerically on the same evidence.

## Browser/static build

From the repository root, after installing both root and optimizer dependencies, run `npm run build:static`. This creates `Practice_Desk_Static/` containing `index.html`, a bundled `fsrs-optimizer.worker.js`, and its local WASM asset. Serve the directory over localhost or HTTPS. Browser cancellation terminates the Worker; review evidence never leaves the browser for optimizer training.
