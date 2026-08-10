# Couple Book

Private two-person Couple Book repository.

Current app surface: `app-v2`, a Vite React app protected by Firebase Auth and Firestore membership checks. The canonical local path is `C:\Users\Jaylan\Documents\couplebook`.

## Current Workflow

- Develop: `npm run app:v2:dev`
- App checks: `npm --prefix app-v2 run lint`, `npm --prefix app-v2 test`, `npm --prefix app-v2 run build`
- Product QA: `npm run product:qa`
- Full local audit: `npm run product:audit`
- Docs guard: `npm run docs:check`

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

Start with `docs/PROJECT_HANDOFF.md` and `docs/COUPLE_BOOK_MASTER_SYSTEM_REFERENCE.md` before making product changes.
