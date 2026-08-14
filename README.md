# Couple Book

Private two-person Couple Book repository.

Current app surface: `app-v2`, a Vite React app protected by Firebase Auth and Firestore membership checks. The canonical local path is `C:\Users\Jaylan\Documents\couplebook`.

## Current Workflow

- Develop: `npm run app:v2:dev`
- App checks: `npm --prefix app-v2 run lint`, `npm --prefix app-v2 test`, `npm --prefix app-v2 run build`
- Product QA: `npm run product:qa`
- Full local audit: `npm run product:audit`
- Docs guard: `npm run docs:check`
- Event Hub workflow alignment guard: `npm run alignment:check`

## V1.2 Product Surface

The V1.2 branch adds the active app-experience layer on top of the protected shell:

- Home: Today in Us, On This Day, For Us Today prompt, Coming Up, Recently, and quieter route shortcuts.
- Global Quick Add Memory: protected-shell action using the existing memory write service.
- Story: year chapter jump controls and archived-memory restoration.
- Gallery: album grouping by year with related-memory links and truthful missing-media states.
- Us: About Jaylan, About Omia, Our Story, Our Dates, Things We Both Love, and Things We Want to Try.
- Our Plans: couple-scoped plans at `couples/{coupleId}/plans/{planId}` with plan-to-memory conversion.
- Prompt foundation: deterministic daily prompt display; answer persistence is designed for later expansion and not enabled in V1.2.

## Deployment

Deployment is target-specific and approval-gated.

- Hosting release: `firebase deploy --only hosting --project couplebook-97830`
- Firestore rules release, only when rules changed and were approved: `firebase deploy --only firestore:rules --project couplebook-97830`
- Do not use generic `firebase deploy` as the normal Couple Book release command.
- Rollback is performed from Firebase Hosting release history for `couplebook-97830`, using the last known good Hosting version.

## Boundaries

- Firebase project: `couplebook-97830`
- Prohibited Firebase project: `gathervibeshub`
- Firestore rules source of truth: `firestore.rules`
- Storage rules source: `storage.app-v2.rules`
- Hosting build output: `app-v2/dist`
- Partner access remains pending until explicitly approved.
- Private media stays local/private unless a separate authorized media migration is approved.
- Do not deploy, merge, tag, activate accounts, or mutate production data without explicit approval in the current task.
- V1.2 app-experience work deploys to Hosting preview channels only until owner review approves production.

Start with `docs/PROJECT_HANDOFF.md` and `docs/COUPLE_BOOK_MASTER_SYSTEM_REFERENCE.md` before making product changes.
