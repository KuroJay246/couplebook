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

## V1.2 Scope Notes

- V1.2 adds active Home, global Quick Add Memory, canonical On This Day, Story chapter navigation, archived-memory restore, Gallery Album grouping, Us organization, Our Plans, plan-to-memory, and a deterministic prompt foundation.
- New persistent Couple Book plans live at `couples/{coupleId}/plans/{planId}`.
- Memory writes may include safe `kindLabel` and `mediaNote` fields.
- Prompt answer persistence is not enabled in V1.2 unless a later task explicitly adds that workflow.
- Do not deploy V1.2 Hosting live or V1.2 Firestore rules to production without explicit current approval.

## Distinct Identity Update

As of Saturday, August 22, 2026:

- keep the Couple Book identity distinct from Event Hub across brand, themes, shell styling, navigation styling, route composition, and motion
- keep engineering alignment with Event Hub for auth, authorization, services, repositories, revisions, validation, accessibility, QA, and deployment safeguards
- run `npm run eventhub:review`, `npm run alignment:check`, and `npm run identity:check` for identity-branch closeout
