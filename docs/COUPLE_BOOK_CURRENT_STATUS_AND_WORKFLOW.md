# Couple Book Current Status And Workflow

Last updated: 2026-08-14

This file is the single chat-updatable catch-up reference for Couple Book. It combines the current app state, release workflow, backend/frontend rules, Gather-inspired operating guardrails, and the remaining path to a stable app before September 16, 2026.

## Current Position

- Repository: `C:\Users\Jaylan\Documents\couplebook`
- Active app: `app-v2`
- Active Firebase project: `couplebook-97830`
- Production Hosting: `https://couplebook-97830.web.app`
- V1.1 candidate preview: `https://couplebook-97830--v1-1-candidate-yy9to5g5.web.app`
- Current release branch: `release/couplebook-v1.1-candidate`
- Latest local release commits:
  - `125eae2 Keep empty favorites owner records editable`
  - `a334db1 Fix favorites stale owner edits`
  - `c4aa8cc Fix owner write release blockers`

Production Hosting has been deployed with the V1.1 candidate bundle. Firestore rules were deployed earlier in the release flow after the legacy-revision fix. The release branch is ahead of remote and still needs final clean audit, push, tag, and merge closeout.

## Product Model

Couple Book is a private two-person memory book. The protected app is not a public landing page. The core experience is:

- Private dashboard/home
- Story/timeline
- Gallery
- Profiles
- Favorites
- Settings
- Contract
- Special moments: Birthday, Valentine, Confession

The app uses Firebase Auth plus Firestore authorization. No localStorage-only shortcut should unlock protected routes.

## Backend Workflow

The production backend target is always `couplebook-97830`.

Primary Firestore shape:

- `users/{uid}`
- `couples/{coupleId}`
- `couples/{coupleId}/members/{uid}`
- `couples/{coupleId}/profiles/{uid}`
- `couples/{coupleId}/favorites/{uid}`
- `couples/{coupleId}/settings/shared`
- `couples/{coupleId}/settings/{uid}`
- `couples/{coupleId}/contracts/current`
- `couples/{coupleId}/memories/{memoryId}`
- `couples/{coupleId}/specialMoments/{birthday|valentine|confession}`

Write rules:

- Signed-out users cannot read or write protected app data.
- Approved users must also have active couple membership.
- Cross-couple access fails closed.
- Partner-private writes are rejected.
- Writes require safe shapes and integer revision handling.
- Legacy V1 documents without `revision` must be replaceable by active members.
- Production writes require an explicit production-write build: `VITE_WRITE_MODE=firestore-production-write`.

Important recent backend fixes:

- `firestore.rules` now reads old missing revisions safely with `resource.data.get('revision', 0)`.
- Full V1 writes now replace legacy documents instead of merging unknown legacy fields forward.
- Favorites, profile, settings, memory, and special moment write paths stay narrow and validated.

## Frontend Workflow

The frontend app is `app-v2`, built with React, React Router, Vite, Firebase Auth, and Firestore.

The frontend workflow is:

- Auth shell restores Firebase identity.
- Approved user profile is read from `users/{uid}`.
- Active couple membership is checked.
- Protected routes read compatibility data and build route-specific read models.
- Write-enabled owner routes use the centralized owner-write service.
- UI writes are reversible where possible and must leave no `CODEX_TEST` records behind.

Important recent frontend fixes:

- Settings now builds form state from the loaded Firestore model and keeps local drafts separate, preventing stale revision writes.
- Favorites no longer opens owner edit controls from placeholder people while Firestore data is still loading.
- Favorites read model keeps empty-but-real owner documents visible so the first favorite can be added.
- Browser regression tests now stub external Google font requests locally so release gates are not dependent on external font availability.

## Gather-Inspired Guardrails Copied Into Couple Book

These are operational patterns copied from the Gather & Savor workflow, adapted to Couple Book. They are not Gather repo edits.

- Use real application flows, not just static audits.
- Keep production project boundaries explicit.
- Treat production data writes as narrow, named, reversible operations.
- Use `CODEX_TEST` markers only for controlled QA, then remove them.
- Verify cleanup after every production write.
- Do not mix Firebase projects: Couple Book is `couplebook-97830`; Gather is `gathervibeshub`.
- Keep backend, frontend, rules, and docs aligned before release closeout.
- Passing automation alone does not authorize a merge or tag if owner acceptance/live smoke gates are incomplete.
- Keep release evidence honest: implemented, deployed, blocked, held, or deferred.

## Verified Release Evidence

Automated checks that passed after the release fixes:

- `npm run product:qa`
- `npm --prefix app-v2 run test`
- `npm --prefix app-v2 run lint`
- `npm --prefix app-v2 run test:rules`
- `npm --prefix app-v2 run test:storage-rules`
- `npm --prefix app-v2 run test:media-mapping`
- `npm --prefix app-v2 run test:browser`
- `npm run release:preflight`
- Production-write Vite build with `VITE_WRITE_MODE=firestore-production-write`

Production browser evidence:

- Signed-out production `/dashboard` redirects to `/login`.
- Protected content is not exposed after logout.
- Production served candidate bundles during verification:
  - `index-BsJUHklK.js`
  - `index-D79eC_rV.js`
  - `index-jR0xamk5.js`
- Live production Favorites add succeeded with `CODEX_TEST V1.1 Production Write`.
- The temporary production favorite persisted after refresh.
- Cleanup was verified through Firestore: no `CODEX_TEST` marker remained, favorites owner revision advanced to `4`, and expected fields remained.

## Current Hold

The final `npm run product:audit` closeout is held by local machine resource pressure, not a product assertion:

- The run reached `test:product`.
- It failed with `page.goto: net::ERR_NO_BUFFER_SPACE`.
- A separate Gather process was running `npm run e2e:full` with Firebase emulators and Playwright at the same time.
- Because that process belongs to `C:\Users\Jaylan\Documents\gathetr`, it was not stopped from this Couple Book release task.

Until the final audit runs cleanly without the unrelated Gather load, tag and merge should remain held.

## Remaining Closeout Steps

Do these in order:

1. Wait for the unrelated Gather Playwright/emulator run to finish, or explicitly stop it if Jaylan approves.
2. Rerun `npm run product:audit`.
3. Confirm `git status --short --branch` is clean except expected branch ahead state.
4. Push `release/couplebook-v1.1-candidate`.
5. Tag the release commit after final audit: `couplebook-v1.1-refined-memory-book`.
6. Merge release branch to `main`.
7. Push `main` and the tag.
8. Do one final production signed-out check.

## September 16 Readiness Focus

Priority work before September 16, 2026:

- Finish the held release closeout once local socket pressure is gone.
- Confirm whether the current MemoryBook visual shell is the intended V1.1 product direction or whether the earlier preview visual style should replace it.
- Continue organizer-style product QA on real user flows: login, dashboard, story, gallery, favorites, profile, settings, contract, and special pages.
- Keep adding focused regression tests for every production bug found through real use.
- Maintain strict cleanup discipline for any production smoke write.
- Keep this file updated as the single source for chat handoff context.

