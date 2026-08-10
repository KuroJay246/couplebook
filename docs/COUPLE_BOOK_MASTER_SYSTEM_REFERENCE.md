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
- `couples/{coupleId}/specialMoments/{birthday|valentine|confession}`

The active Firestore rules source is `firestore.rules`. The app-v2 emulator config also uses `firestore.rules` so tests and deploy configuration do not drift.

## Write Model

Client writes are gated by `VITE_WRITE_MODE=firestore-emulator-write` or another explicitly approved Firestore write mode. The write service verifies:

- Firestore is configured.
- The authenticated user matches the approved user.
- The user has active couple membership.
- Text fields are length-limited and reject unsafe markup.
- Mutable documents use integer `revision` conflict checks.
- Contract acceptance stores status only and preserves existing accepted entries.
- Memory media metadata accepts only verified Storage paths, not raw local paths or public URLs.

## UI Model

The app uses a protected editorial shell with legacy faithful styling carried through `app-v2/src/styles/`. Standardization should preserve the current visual language unless a task explicitly asks for design changes.

## Firebase Boundary

- Required project: `couplebook-97830`
- Prohibited Firebase project: `gathervibeshub`
- Hosting publishes `app-v2/dist`
- No production writes or deployments without explicit current authorization.
