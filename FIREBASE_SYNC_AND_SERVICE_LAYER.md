# Firebase Sync And Service Layer

Date: 2026-07-08

## Current Firestore Surface

Current active Firestore domains are narrow:

- `users/{uid}`
- `devices/{deviceId}`

The active runtime no longer depends on the legacy `usernames` collection. The main remaining risk is the sync layer still performing collection-wide `users` reads/listeners.

## Service Files

| File group | Current role | Safety boundary |
| --- | --- | --- |
| `services/userService.js` + mirror | owner-scoped `users/{uid}` reads | read-only |
| `services/deviceService.js` + mirror | owner-scoped device query | read-only |
| `services/authService.js` + mirror | approved-user verification and display-name resolution | read-only |
| `services/syncReadService.js` + mirror | non-live document reads/listeners/normalization | read-only |
| `services/syncModelService.js` + mirror | pure sync data shaping helpers | no Firebase writes or reads |

## Runtime Files Migrated

The following runtime files were moved behind thin service helpers already:

- `core/healthCheck.js`
- `public/core/healthCheck.js`
- `js/settings.js`
- `public/js/settings.js`
- `js/auth.js`
- `public/js/auth.js`

## What Remains Direct

- collection-wide `users` reads/listens in `core/firestoreSync.js` and `public/core/firestoreSync.js`
- `users/{uid}` merge writes in `core/firestoreSync.js` and `public/core/firestoreSync.js`
- Firebase bootstrap in `firebase/firebase-config.js` and `public/firebase/firebase-config.js`

## Service Layer Inventory

### `userService`

- operation: `getDoc(doc(db, 'users', uid))`
- callers: health check
- rules posture: owner-scoped and compatible

### `deviceService`

- operation: owner-scoped `devices` query
- callers: health check and settings
- rules posture: owner-scoped and compatible

### `authService`

- operations:
  - approved-user verification
  - owner-scoped display-name resolution
- callers: `js/auth.js` and mirror
- notes:
  - no writes
  - no deletes
  - no username collection usage

### `syncReadService`

- operations:
  - `getUserDataByUid(uid)`
  - `listenToUserDoc(uid, callback)`
  - `normalizeUserCloudData(data)`
- notes:
  - preparation only
  - not wired into production sync yet

### `syncModelService`

- operations:
  - normalize cloud user docs
  - build shared profiles/favorites/signatures
  - pick active/partner docs from fixture data
- notes:
  - pure helper layer
  - validated by `check:sync-model`

## core/firestoreSync.js Risk

`core/firestoreSync.js` remains the highest-risk boundary.

### Current behavior that must be preserved later

- cloud pull on login
- localStorage-first behavior
- contract flags
- profiles merge
- favorites merge
- signature merge
- settings merge
- theme sync
- listener update events
- timeout behavior
- offline/fallback behavior

### Current Firestore operations

- `getDocs(collection(db, 'users'))`
- `onSnapshot(collection(db, 'users'), ...)`
- `setDoc(doc(db, 'users', uid), payload, { merge: true })`

### Why it is risky

- collection-wide reads are broader than needed
- listener scope is broader than needed
- merge logic depends on username-keyed localStorage structures
- write payload mixes active-user preferences with shared couple data

## Sync Boundary Summary

### `loadUserData(uid, username)`

- reads the whole `users` collection
- locates the active doc by UID
- rebuilds shared profiles, favorites, and signatures across user docs
- seeds cloud state if `migrationCompleted` is missing

### `saveUserData(uid, username, partialPayload)`

- writes `users/{uid}` with merge semantics
- writes `theme`, `settings`, `contractAccepted`, `profile`, `favorites`, `signature`, `migrationCompleted`, `lastSync`

### `syncUserData()`

- fire-and-forget bridge from `core/state.js`

### `listen(uid, username)`

- listens to the whole `users` collection
- updates theme and contract for the active user
- updates shared profiles and signatures
- emits `memorybook-sync-updated`

## Document-Scoped Sync Replacement Plan

### Target read model

- read active user document directly by UID
- read partner user document directly by UID
- stop scanning the full `users` collection

### Target listener model

- one listener for active user doc
- one listener for partner user doc
- preserve current rerender semantics

### Required data-shape contract

Expected `users/{uid}` fields:

- `username`
- `theme`
- `settings`
- `contractAccepted`
- `profile`
- `favorites`
- `signature`
- `migrationCompleted`
- `lastSync`

### Required migration order

1. validate non-live helpers
2. replace read branch only after smoke passes
3. replace listener branch only after read branch proves safe
4. preserve write branch until reads/listeners are proven
5. split shared-couple model later

## Sync Model Helper Notes

`syncModelService.js` exists to support the replacement plan without touching live runtime behavior.

It currently validates:

- normalized data shape
- safe missing-field handling
- shared profile build
- shared favorites build
- shared signatures build
- active/partner doc selection

Current note:

- `check:sync-model` passes
- Node emits an ES-module warning during the fixture check
- warning is non-blocking and does not affect the live app

## Sync Test Plan

### Manual approved-account checks

Require real authenticated browser sessions for:

- Jaylan approved account
- partner approved account
- no `permission-denied`
- no redirect loops
- normal route hydration

### Safe pre-implementation checks

- fixture-based sync-model checks
- mirror drift checks
- service boundary checks
- prototype isolation checks
- route checks

### What cannot be honestly verified while smoke is HOLD

- live signed-in strict-rules flow
- real listener behavior on approved couple docs
- real cloud merge correctness

## Stop Conditions

Stop any future live sync implementation immediately if:

- `permission-denied` appears
- cloud data merge mismatches appear
- route hydration fails
- localStorage corruption appears
- partner doc is missing and breaks flow
- `npm run check:all` fails

## Remaining Firestore Risks

- approved-account smoke is still `HOLD`
- collection-wide `users` list/read is still on the critical path
- username-keyed local structures still drive shared merge behavior
- root/public mirroring still increases maintenance cost

## Next Safe Sync Step

If approved-account smoke remains `HOLD`:

- continue non-live helper validation and documentation only

If approved-account smoke becomes `PASS`:

- attempt only the smallest reversible live active-user read replacement
- do not combine it with listener or write refactors in the same batch

## Gather Savor Service Structure Reference

Gather Savor is useful as a structural reference because its Firebase and app wiring is clearly layered:

- one frontend entry bootstraps the app and providers
- auth state and protected access are centralized instead of page-scattered
- Firebase config lives behind one app/bootstrap module
- pages consume services inside a routed shell instead of owning infrastructure directly

Couple Book should copy that boundary discipline later without copying Gather Savor's event-specific data model or workflows.
