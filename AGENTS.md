# Practice Desk — development rules

## Mandatory five-step workflow and document map

Before implementation, **read** [README.md](README.md) → [the live architecture scratchpad](docs/ARCHITECTURE_AUDIT_2026-10-28.md) → [DATA_MODEL.md](docs/DATA_MODEL.md) → the [pass acceptance ledger](docs/PASS7_RELEASE_ACCEPTANCE.md) → [v11 parity ledger](docs/V11_PARITY_LEDGER.md) (and relevant [Pass 4](docs/PASS4_RELEASE_ACCEPTANCE.md), [Pass 5](docs/PASS5_RELEASE_ACCEPTANCE.md), [Pass 6](docs/PASS6_RELEASE_ACCEPTANCE.md)). Follow the five-step **audit → analyze → implement → objective check → targeted QA** loop; update the architecture scratchpad at each milestone with evidence, tests, unresolved limits and revisions to scope. Before claiming success, verify latest CI for the exact final branch HEAD. Keep the v11 design/functionality as a **quality floor**: the overhaul is not allowed to remain a rudimentary substitute.


- Follow **CLEAR**: **Clean, Lean, Efficient, Elegant, Reliable**. Prefer simple, readable, well-tested solutions over unnecessary complexity.
- This is a **new app**: no data migration, compatibility shims, or preservation of past storage schemas is needed yet.
- The working v11 application is the frozen baseline reference on `baseline/v11`. Keep behaviour intact unless a task intentionally changes it.
- Deliver **one self-contained HTML** that users can **double-click and run offline** via `file://`. No localhost, server, network, external assets, or runtime module imports. Change deployment strategy only if a later requirement truly warrants it.
- Author modular, **strictly typed TypeScript** (plus separate CSS, HTML template and content files). Use precise domain types, explicit invariants and sound state transitions; avoid unnecessary `any`, `@ts-ignore` and new `@ts-nocheck`. There is no legacy runtime or `@ts-nocheck` exemption in the clean overhaul.
- Use good data topology: stable identities, immutable paper revisions, deliberate normalization, referential integrity and indexes matched to access patterns. **Revisit and optimize data structures when evidence or growth warrants it**; avoid premature complexity.
- Keep source PDFs, reviewed patches and post-submission solutions distinct. Never reveal answers or hints in active tests.
- `Practice_Desk_Offline_Mock_Tests.html` is build-generated; never hand-edit it.
- Keep tests **lean, fast and deterministic**, organised around complete domain functions, invariants and mathematical correctness—not patchwork naming checks. Run `npm run check` before committing and keep CI passing.
- Maintain `docs/ARCHITECTURE_AUDIT_2026-10-28.md` as the architectural roadmap; reassess UI/UX when justified without gratuitous redesign.
