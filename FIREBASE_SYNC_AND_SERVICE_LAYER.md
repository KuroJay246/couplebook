# Firebase Sync And Service Layer

Date: 2026-07-12

## Current Firestore Surface

Current active Firestore domains are narrow:

- `users/{uid}`
- `devices/{deviceId}`

The active runtime no longer depends on the legacy `usernames` collection. The main remaining risk is the sync layer still performing collection-wide `users` reads/listeners.

## 2026-07-12 Verified Auth And Data Findings

- Firebase identity is email/password only in the current Couple Book runtime.
- Approved access is verified by checking that `users/{uid}` exists after Firebase Auth succeeds.
- `js/app.js` owns the real protected-shell route gate through `onAuthStateChanged`, but not every page uses that path.
- `pages/contract.html` is a boundary exception: it trusts `memorybook_active_session` / `memorybook_active_user` in `localStorage` and can be opened without a real Firebase-authenticated user if those keys are spoofed in-browser.
- The special pages under `pages/confession/`, `pages/valentine/`, and `pages/omnia-happy-birthday.html` are outside the centralized protected-shell flow when opened directly.
- `core/firestoreSync.js` still mixes active-user preferences with couple-shared projection rebuilding in one module.
- `core/memories.json` remains local-only and is not represented in Firestore.

## 2026-07-12 Static Privacy Containment Branch Update

- Hotfix branch: `hotfix/static-privacy-boundaries`
- New mirrored helper: `services/pageAccessService.js`
- `pageAccessService` waits for real Firebase Auth state, verifies approval through the existing targeted `users/{uid}` lookup, syncs the approved session keys only after that check, and fails closed on signed-out, unauthorized, timeout, or unavailable-auth states.
- `contract.html` no longer treats `localStorage` as proof of identity. It now opens only after approved-user verification resolves.
- The public special-page routes now publish neutral placeholder content only. Their original sensitive source files remain outside the Hosting root for later routed reintegration.
- This branch deliberately does not fake privacy for the old static special pages. The full sensitive content remains deferred to the future protected app architecture.

## 2026-07-12 Domain Ownership Snapshot

| Domain | Current source of truth | Local state | Firestore state | Notes |
| --- | --- | --- | --- | --- |
| approved users | Firebase Auth + `users/{uid}` existence + hardcoded rules allowlist | `memorybook_active_uid`, `memorybook_active_session`, `memorybook_active_user` | `users/{uid}` | approved-user-only boundary is partly in runtime and partly in rules |
| profiles | shared localStorage projection | `memorybook_profiles` | `users/{uid}.profile` | rebuilt across both user docs |
| memories | static dataset plus local overrides | `core/memories.json`, `memorybook_custom_memories`, `memorybook_deleted_memories`, `memorybook_overridden_memories` | none | not yet a Firestore domain |
| media refs | memory records and special-page file references | path strings only | none | current clean repo lacks the referenced `/assets/photos` and `/assets/videos` folders |
| favorites | mixed shared projection | `memorybook_favorites` | `users/{uid}.favorites` | backward-compatible merge keeps multiple shapes alive |
| settings | per-user local preference record | `memorybook_settings_{username}` | `users/{uid}.settings` | merged with Firestore per active user |
| theme | per-user local key plus legacy shared fallback | `memorybook_theme_{username}`, `memorybook_theme` | `users/{uid}.theme` | active user only |
| contract acceptance | per-user local flag | `memorybook_contract_accepted_{username}` | `users/{uid}.contractAccepted` | one true anywhere stays true via merge logic |
| signatures | shared local signature ledger | `memorybook_contract_signatures` | `users/{uid}.signature` | projected from both user docs |
| devices | mostly cloud-only | optional `memorybook_device_id` read in settings | `devices/{deviceId}` | device registration is currently disabled in auth flow |

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
- the audit baseline exposed direct special pages and a contract bypass; the hotfix branch now contains those paths with approved-session gating and placeholder retirement, but full protected-content reintegration still requires the routed migration shell
- favorites and signatures still rely on compatibility merge shapes rather than clear domain contracts

## Candidate Future Service Boundaries

Smallest useful future boundaries:

- `firebaseClient`
- `authService`
- `userService`
- `coupleService`
- `profileService`
- `settingsService`
- `favoritesService`
- `contractService`
- `memoryService`
- `mediaService`
- `syncService`
- `deviceService`

The Gather & Savor lesson worth copying is not its event schema. It is the separation between routed UI, auth/provider state, Firebase bootstrap, service calls, and pure helpers.

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
