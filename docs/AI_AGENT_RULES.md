# AI Agent Rules

This file is the required operating brief for Couple Book agents.

## Non-Negotiable Boundaries

- Work in `C:\Users\Jaylan\Documents\couplebook`.
- Keep Couple Book separate from Gather & Savor. `gathervibeshub` is a prohibited Firebase project in this repository.
- Use `couplebook-97830` for Couple Book Firebase checks.
- Do not deploy Hosting, Firestore rules, Storage rules, or Cloud Functions unless the user explicitly approves deployment in the current task.
- Do not write production Firestore, Storage, Auth, or private media unless explicitly authorized in the current task.
- Do not activate the pending partner account unless explicitly authorized.
- Do not redesign the app unless the user asks for design changes.
- Preserve historical evidence under `docs/archive/`.

## Required Work Pattern

1. Read the current docs: `README.md`, `docs/PROJECT_HANDOFF.md`, `docs/COUPLE_BOOK_MASTER_SYSTEM_REFERENCE.md`, and `docs/WORKFLOW.md`.
2. Inspect the actual code and Git state before making claims.
3. Keep edits scoped to the requested behavior.
4. Run the narrowest meaningful tests, then broaden when rules, auth, routing, or shared data contracts change.
5. Report unrun checks honestly.

When using Gather & Savor Event Hub as a workflow reference, also read `docs/EVENT_HUB_ALIGNMENT_STANDARD.md` and run `npm run alignment:check`. Use Gather as a process model only; do not copy its event product model, data schema, Firebase project, private records, route map, QR payloads, or UI copy.

## Active QA Commands

- `npm run docs:check`
- `npm run alignment:check`
- `npm --prefix app-v2 run lint`
- `npm --prefix app-v2 test`
- `npm --prefix app-v2 run test:rules`
- `npm --prefix app-v2 run build`
- `npm run product:qa`
- `npm run product:audit`
