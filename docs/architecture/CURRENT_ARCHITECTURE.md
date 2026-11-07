# Practice Desk — as-built architecture

**Single offline distribution:** `src/app/bootstrap.ts` + `src/template.html` → `scripts/build.mjs` → `Practice_Desk_Offline_Mock_Tests.html`. Local `file://` use requires no remote service. The current application is modular strict TypeScript, not the v11 monolith. This is a source-orientation map, not a substitute for inspecting code.

## Logical ownership
| Layer | Principal owners | Contract |
|---|---|---|
| Question and rules | `src/domain/{question,exam,answer-key,scoring,validate,integrity,media}.ts` | Six kinds, explicit package rules, media and immutable revisions |
| Actual examination | `src/engine/{session,response,clock,scoring,score-ceiling,review-source,source-comparison}.ts` | Events, time, scoring, frozen source/key, permitted review |
| UI and routing | `src/app/{bootstrap,generic-ui,coordinator-context,library-controller,exam-view,learning-ui}.ts` | Library/Exam/Results/History/Learning and feature controllers |
| Local storage | `src/history/*.ts` | Two-store IndexedDB snapshot/attempt pattern, CAS, checked backup v4, replay/delete/recovery |
| Learning | `src/learning/*.ts` | Source-frozen notebook cards, FSRS-7 due dates, evidence-backed revision sets and descriptive topic metrics |
| Authoring | `src/authoring/*.ts` | Local Wordgard editing and staged external source; canonical authoring publication/preview |
| External CLI | `scripts/question-bank-*.mjs`, `content-blueprint.mjs`, `question-quality.mjs`, `editorial-editions.mjs`, `pdf-ingest.mjs`, `agent-handoff.mjs` | External content creation, validation, review, document provenance and create-only export; no device agent bridge |

## Main user journey
```text
Validated CGL / imported exam / authored bank
           → preflight and executable paper policy
           → frozen paper + answer key + media + edition reference
           → validated answer/clear/flag/submit/clock events
           → optimistic persistence and immutable outcome
           → Results / source comparison / History / checked backup
           → explicit notebook and FSRS rating → separate revision paper
```

The edition/source comparison is deliberately conservative; a previous **source-audit backlog** identifies potential revision selection and semantic-comparison defects. Do not infer it is fully correct merely because this architecture exists.

## Distinctions that matter
- Exam **section** controls timing/navigation; semantic **Subject → Topic → Subtopic** describes academic content. One APFC physical section may span many subjects.
- Candidate-facing pre-submit questions and post-submit key/explanation must be separated. Editorial claims are not verified facts. External JSON/source/PDF creation is distinct from in-browser Library import.
- Imported sources, unsaved Wordgard drafts, published packages, frozen exam attempts and notebook ratings have separate lifecycles/backups.
- Native Navigation API is used when available; `file://` fragment-route fallback must work without it. Actual physical macOS/iOS Safari support is not proven by Linux WebKit.
- Generated CSP and SHA-256 guards constrain/integrity-check stored content, not publisher identity or all browser threats.
- No automatic cloud sync, embedded LLM, authenticated independent content/reviewer verification, or real-device certification.

For normative fields see [data contracts](DATA_CONTRACTS.md); for AI source workflow see [content pipeline](AGENT_CONTENT_PIPELINE.md). Detailed historical architecture decisions and evidence remain at [the pinned historical index](../HISTORY_INDEX.md).
