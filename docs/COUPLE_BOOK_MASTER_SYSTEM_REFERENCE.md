# Couple Book Master System Reference

## Application Model

Couple Book is a private two-person memory app. The current app is `app-v2`, built with React 19, React Router, Vite, Firebase Auth, and Firestore.

## Auth And Authorization

- Firebase Auth establishes identity.
- `users/{uid}` is the authorization profile.
- Access requires `approved: true`, `accessStatus: "active"`, and a `coupleId`.
- Access also requires `couples/{coupleId}/members/{uid}` with `active: true` and `role: "member"`.
- Pending, inactive, unauthorized, signed-out, and cross-couple users fail closed.

## Firestore Shape

- `users/{uid}`
- `couples/{coupleId}`
- `couples/{coupleId}/members/{uid}`
- `couples/{coupleId}/profiles/{uid}`
- `couples/{coupleId}/favorites/{uid}`
- `couples/{coupleId}/settings/shared`
- `couples/{coupleId}/settings/{uid}`
- `couples/{coupleId}/contracts/current`
- `couples/{coupleId}/memories/{memoryId}`
- `couples/{coupleId}/plans/{planId}`
- `couples/{coupleId}/specialMoments/{birthday|valentine|confession}`

The active Firestore rules source is `firestore.rules`. The app-v2 emulator config also uses `firestore.rules` so tests and deploy configuration do not drift.

## Write Model

Client writes default to disabled. `app-v2/.env.example` uses `VITE_WRITE_MODE=production-write-disabled`; local write testing should use `firestore-emulator-write`. Production writes require explicit approval and `firestore-production-write` in a production build. The write service verifies:

- Firestore is configured.
- The authenticated user matches the approved user.
- The user has active couple membership.
- Text fields are length-limited and reject unsafe markup.
- Mutable documents use integer `revision` conflict checks.
- Contract acceptance stores status only and preserves existing accepted entries.
- Memory media metadata accepts only verified Storage paths, not raw local paths or public URLs.
- Memories support safe `kindLabel` and `mediaNote` fields for Quick Add.
- Archived memories can be restored through the central owner-write service.
- Plans use allowed categories/statuses, integer revisions, protected `createdBy`, server timestamps, and deterministic plan-to-memory conversion.

## UI Model

The app uses a protected editorial shell with legacy faithful styling carried through `app-v2/src/styles/`. Standardization should preserve the current visual language unless a task explicitly asks for design changes.

V1.2 routes add an active consumer-app layer:

- Home: Today in Us, On This Day, For Us Today, Coming Up, Recently, Keep Exploring.
- Story: year chapters, jump controls, active filters, archive/restore.
- Gallery: album grouping by year, related-memory actions, private-media placeholders.
- Us: About Jaylan, About Omia, Our Story, Our Dates, shared favorites/plans links.
- Plans: `/plans`, backed by `couples/{coupleId}/plans/{planId}`.

## Firebase Boundary

- Required project: `couplebook-97830`
- Prohibited Firebase project: `gathervibeshub`
- Hosting publishes `app-v2/dist`
- No production writes or deployments without explicit current authorization.
