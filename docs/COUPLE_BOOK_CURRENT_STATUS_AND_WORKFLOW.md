# Couple Book Current Status And Workflow

Last updated: 2026-08-14

This file is the single chat-updatable catch-up reference for Couple Book. It combines the current app state, release workflow, backend/frontend rules, Gather-inspired operating guardrails, and the remaining path to a stable app before September 16, 2026.

## Current Position

- Repository: `C:\Users\Jaylan\Documents\couplebook`
- Active app: `app-v2`
- Active Firebase project: `couplebook-97830`
- Production Hosting: `https://couplebook-97830.web.app`
- V1.1 candidate preview: `https://couplebook-97830--v1-1-candidate-yy9to5g5.web.app`
- Closed release branch: `release/couplebook-v1.1-candidate`
- Active work branch: `feature/couplebook-v1.2-app-experience`
- V1.1 release tag: `couplebook-v1.1-refined-memory-book`
- V1.1 main merge commit: `f02efa6 Merge Couple Book v1.1 refined memory book`
- Tagged V1.1 release head: `37145f1 Document release status and stabilize browser audit`

Production Hosting has been deployed with the V1.1 candidate bundle. Firestore rules were deployed earlier in the release flow after the legacy-revision fix. The V1.1 release branch was audited, tagged, merged to `main`, and pushed.

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
- Current Gather workflow reference commit for V1.2 alignment: `a840e903ce6efd0e6f70140e1c939f1c36d688f2`.
- Couple Book alignment gate: `npm run alignment:check`.

## Verified Release Evidence

Automated checks that passed after the release fixes:

- `npm ci`
- `npm --prefix app-v2 ci`
- `npm --prefix app-v2 audit --omit=dev`
- `npm run docs:check`
- `npm run product:qa`
- `npm run product:audit`
- `npm --prefix app-v2 run test`
- `npm --prefix app-v2 run lint`
- `npm --prefix app-v2 run test:rules`
- `npm --prefix app-v2 run test:storage-rules`
- `npm --prefix app-v2 run test:media-mapping`
- `npm --prefix app-v2 run test:browser`
- `npm --prefix app-v2 run test:product`
- `npm --prefix app-v2 run test:visual`
- `npm --prefix app-v2 run test:performance`
- `npm --prefix app-v2 run health:react` with advisory-only findings
- `npm run release:preflight`
- `npm run check:all`
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
- Final closeout scan found `CODEX_TEST_HIT_COUNT=0` across the expected Couple Book production collections.
- Final signed-out production `/dashboard` smoke redirected to `/login`, exposed no protected route labels, and produced no console or network failures.

## V1.1 Closeout Status

V1.1 is closed:

- Release branch pushed: `release/couplebook-v1.1-candidate`.
- Release tag pushed: `couplebook-v1.1-refined-memory-book`.
- Release branch merged to `main`.
- `main` pushed to origin at merge commit `f02efa6`.
- No production redeploy was performed during closeout because the deployed Hosting runtime was already the V1.1 candidate bundle.
- No Firestore rules deployment was performed during closeout.

## V1.2 Current Focus

V1.2 is the app-experience upgrade branch:

- Branch: `feature/couplebook-v1.2-app-experience`.
- Start point: updated `main` after V1.1 merge.
- Deployment target during V1.2: Firebase Hosting preview channel only.
- Firestore rules: do not deploy production rules during V1.2 unless separately approved.
- Product goal: make the protected app feel like a complete private couple memory book, not a maintenance shell.
- Reference process: Gather-style operational rigor through `docs/EVENT_HUB_ALIGNMENT_STANDARD.md`, not Gather product copying.
- Implemented V1.2 feature set on this branch:
  - Active Home sections: Today in Us, On This Day, For Us Today prompt, Coming Up, Recently, Keep Exploring.
  - Global Quick Add Memory action in the protected shell.
  - Story year jump controls and archived-memory restore panel.
  - Gallery Album grouping by year and Open Related Memory actions.
  - Us destination sections: About Jaylan, About Omia, Our Story, Our Dates, Things We Both Love, Things We Want to Try.
  - Our Plans route at `/plans`, backed by `couples/{coupleId}/plans/{planId}`.
  - Plan-to-memory conversion with deterministic memory IDs and duplicate prevention.
  - V1.2 daily prompt display; answer persistence remains deferred to a later version.
- Firestore rules were updated locally for plans and memory metadata, but V1.2 rules are not deployed to production.

## September 16 Readiness Focus

Priority work before September 16, 2026:

- Complete V1.2 visual/product upgrade on the active feature branch.
- Owner-review the V1.2 preview before any production deployment.
- Continue organizer-style product QA on real user flows: login, dashboard, story, gallery, favorites, profile, settings, contract, and special pages.
- Keep adding focused regression tests for every production bug found through real use.
- Maintain strict cleanup discipline for any approved production smoke write.
- Keep this file updated as the single source for chat handoff context.

