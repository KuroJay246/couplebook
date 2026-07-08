# Firestore Service Layer Plan

Date: 2026-07-08
Scope: future architecture cleanup only; no runtime refactor implemented in this phase

## Goals

- Reduce direct Firestore calls from page and core UI modules
- Keep the strict two-approved-user privacy model intact
- Remove unnecessary dependence on collection-wide reads
- Preserve localStorage-first behavior while the app is still static and multi-page
- Keep root and `public/` mirrors aligned safely until a cleaner build path exists

## Proposed Service Structure

### `services/firebaseClient.js`

- Initializes and exports shared Firebase app, auth, and Firestore handles
- Becomes the only place runtime code imports Firebase SDK modules directly

### `services/authService.js`

- Sign-in with email/password
- Approved-account verification
- Resolve the current user profile/username from `users/{uid}`
- Sign-out

### `services/userService.js`

- Read `users/{uid}`
- Write `users/{uid}` payloads in a rules-safe shape
- Expose helpers for profile, favorites, signature, and settings hydration

### `services/syncService.js`

- Pull cloud user data into local state
- Push local state to cloud
- Own the real-time subscription strategy
- Eventually replace `core/firestoreSync.js`

### `services/settingsService.js`

- Load and persist settings-related cloud fields through `userService.js`
- Avoid page-level Firestore writes from `settings.js`

### `services/deviceService.js`

- Read owner-scoped device records
- Later own any safe device registration/revocation flow if a trusted backend exists

### `services/storageService.js`

- Future-only
- No implementation until Firebase Storage is intentionally initialized

## Current Problems To Solve

### Too Many Direct Firestore Touch Points

Auth, settings, health checks, and sync logic each build their own Firestore operations. This makes rule/schema changes harder to roll out safely.

### Collection-Wide `users` Reads

The current sync layer reads and listens to the entire `users` collection. That works under the present private two-user rules, but it is still broader than necessary and keeps list permissions on the critical path.

### UI Files Own Data-Access Details

`settings.js` and `healthCheck.js` know query shapes directly. That should be moved behind service wrappers so rule/schema drift is handled in one place.

### Root/Public Mirroring Is Manual

Because the runtime app lives in `public/` but source mirrors still exist at the repo root, the safest short-term approach is to keep the service-layer design mirror-friendly rather than introducing a build system prematurely.

## Compatibility Rules For The Future Refactor

- Do not broaden Firestore permissions
- Do not change the approved UID allowlist unless explicitly approved
- Do not re-enable guest, signup, or username login
- Keep live behavior localStorage-first during early migration
- Keep all changes mirrored between root and `public/` until the source/runtime split is intentionally redesigned

## Safest First Implementation Step

Create a thin shared Firestore client/service wrapper without changing behavior:

1. Add a shared Firebase client module for SDK imports.
2. Add read-only `userService.getCurrentUserDoc(uid)` and `deviceService.listDevicesForUser(uid)` helpers.
3. Update diagnostics and auth verification to consume those helpers first.
4. Only after that, split `firestoreSync.js` into targeted read/write helpers.

This sequence reduces duplication before changing the higher-risk sync behavior.

## How To Reduce Direct Firestore Calls

- Centralize all `doc`, `collection`, `getDoc`, `getDocs`, `setDoc`, and `onSnapshot` usage in service files
- Make page scripts consume semantic methods instead of raw query code
- Keep validation and payload-shaping logic near the service layer so the client writes stay rules-safe

## How To Protect Approved-User Checks

- Keep approved-account verification in one auth service path
- Use owner-scoped reads by UID for all signed-in user doc access
- Avoid reintroducing username lookup or public identity discovery
- Fail closed if cloud verification cannot prove that the signed-in Firebase account belongs to the private app

## How To Avoid Collection-Wide Reads

- Replace `getDocs(collection(db, 'users'))` with direct `getDoc(doc(db, 'users', uid))` for the active user
- For partner/shared data, use explicit known document IDs or a small targeted lookup strategy rather than full collection scans
- Replace collection-wide `onSnapshot` listeners with document-specific listeners where possible

## How To Keep LocalStorage-First Stable

- Treat `core/state.js` as the source of truth during the early migration
- Keep cloud sync non-blocking until the service layer is proven stable
- Do not move memories/media flows into Firestore prematurely
- Keep offline fallback intact in every new wrapper

## How To Mirror Source/Public Safely

- Introduce service files in both root and `public/` in lockstep until the build/publish strategy changes
- Keep function names and module boundaries identical between both trees
- Use `npm run check:all` after each small step to catch route/rules regressions immediately
