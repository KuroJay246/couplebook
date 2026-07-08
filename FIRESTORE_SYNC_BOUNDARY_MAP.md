# Firestore Sync Boundary Map

Date: 2026-07-08
Scope: `core/firestoreSync.js`, mirrored `public/core/firestoreSync.js`, and the orchestration/local-state files that call into the sync layer

## Current Role

`core/firestoreSync.js` is still the highest-risk Firestore boundary in the app.

It owns all live cloud sync behavior for the static MemoryBook runtime:

- cloud pull on login
- cloud push on local state changes
- real-time listener startup
- merge rules between Firestore data and localStorage-first state

The file is mirrored under `public/core/firestoreSync.js` and should be treated as production runtime code.

## Public Functions

### `loadUserData(uid, username)`

Purpose:

- runs after Firebase Auth succeeds
- reads Firestore data and merges it into localStorage-backed state

Current Firestore operations:

- `getDocs(collection(db, 'users'))`

Current local storage and `UserStore` writes:

- `UserStore.set('theme', cloud.theme)`
- `UserStore.setShared('theme', cloud.theme)`
- `UserStore.setJSON('settings', merged)`
- `UserStore.set('contract_accepted', 'true')`
- `UserStore.setRaw(\`memorybook_contract_accepted_${username}\`, 'true')`
- `UserStore.setShared('contract_accepted', 'true')`
- `UserStore.setSharedJSON('profiles', profiles)`
- `UserStore.setSharedJSON('favorites', favorites)`
- `UserStore.setSharedJSON('contract_signatures', signatures)`

Reads/merge assumptions:

- every approved user has a document in `users/{uid}`
- the code can locate the active user by scanning the whole `users` collection and matching `doc.id === uid`
- each user doc includes `username`
- shared couple data is reconstructed by scanning all user docs
- `migrationCompleted` gates whether the cloud doc is considered usable
- `theme` is a string
- `settings` is a plain object
- `contractAccepted` is boolean
- `profile` is a plain object
- `favorites` is a plain object keyed by person
- `signature` is either an object or absent

Behavior risk:

- full-collection read is broader than necessary
- merge behavior depends on both user docs being readable in one query
- cloud/shared merge is coupled to `username` values, not only UIDs

### `saveUserData(uid, username, partialPayload = null)`

Purpose:

- writes the active user's current local state into `users/{uid}`
- used both for normal sync pushes and first-login initialization

Current Firestore operations:

- `setDoc(doc(db, 'users', uid), payload, { merge: true })`
- `serverTimestamp()`

Current direct localStorage reads:

- `localStorage.getItem(\`memorybook_contract_accepted_${username}\`)`

Current `UserStore` reads:

- `UserStore.get('theme', 'dark')`
- `UserStore.getJSON('settings')`
- `UserStore.getSharedJSON('profiles')`
- `UserStore.getSharedJSON('favorites')`
- `UserStore.getSharedJSON('contract_signatures')`

Payload assumptions:

- payload shape is valid under current Firestore rules
- `profile` is stored under the current username key inside shared `profiles`
- `favorites` is written from the full shared favorites object, not a reduced owner-only sub-object
- `signature` comes from shared signatures by username
- `migrationCompleted: true` is required for later reads
- partial payloads are allowed and receive only `lastSync` augmentation here

Behavior risk:

- owner-scoped write is narrower than the collection read/listen paths, but payload shape is still tightly coupled to UI state structure
- shared data and active-user preferences are mixed into one document write path

### `syncUserData()`

Purpose:

- fire-and-forget bridge called from `core/state.js`

Current reads:

- `UserStore.getActiveUser()`
- `localStorage.getItem('memorybook_active_uid')`

Current writes:

- none directly; delegates to `saveUserData(...)`

Behavior risk:

- low by itself
- risk comes from the downstream `saveUserData(...)` implementation

### `listen(uid, username)`

Purpose:

- starts a real-time Firestore subscription after login
- updates shared local state when partner data changes

Current Firestore operations:

- `onSnapshot(collection(db, 'users'), ...)`

Current local storage and `UserStore` writes:

- `localStorage.getItem('memorybook_last_local_write')`
- `UserStore.set('theme', cloud.theme)`
- `UserStore.setShared('theme', cloud.theme)`
- `UserStore.set('contract_accepted', 'true')`
- `UserStore.setRaw(\`memorybook_contract_accepted_${username}\`, 'true')`
- `UserStore.setSharedJSON('profiles', profiles)`
- `UserStore.setSharedJSON('contract_signatures', signatures)`
- `window.dispatchEvent(new Event('memorybook-sync-updated'))`

Listener assumptions:

- both couple documents are visible through one collection listener
- `username` remains the stable merge key for shared profile/signature records
- `lastSync` can be compared against `memorybook_last_local_write`
- only theme and contract flags are applied for the active user in real time
- favorites are not updated in the current listener path

Behavior risk:

- collection-wide listener is broader than needed
- partner updates and active-user settings updates are mixed in one callback
- listener does not normalize data before merge, so schema drift can surface directly in UI state

## Internal Helpers

### `withTimeout(promise, ms, label)`

- protects Firestore operations with a 5 second timeout
- good candidate to preserve or share in a later service extraction

### `getDB()`

- lazy-loads `../firebase/firebase-config.js`
- caches `db`

### `getFns()`

- lazy-loads Firestore CDN helpers
- currently exposes:
  - `doc`
  - `getDoc`
  - `setDoc`
  - `collection`
  - `getDocs`
  - `onSnapshot`
  - `serverTimestamp`

Note:

- `getDoc` is imported but not used in the current file
- this is another signal that document-scoped reads were intended but not finished

## Orchestration Callers

### `js/app.js` and `public/js/app.js`

- call `firestoreSync.loadUserData(user.uid, activeUsername)` after auth
- call `state.restoreUserSession(activeUsername)`
- call `firestoreSync.listen(user.uid, activeUsername)`

This means any behavioral change inside `firestoreSync.js` can affect:

- login redirect flow
- dashboard first paint after auth
- shared profile/favorites hydration
- real-time cross-device updates

### `core/state.js` and `public/core/state.js`

- call `firestoreSync.syncUserData()` from:
  - `setTheme`
  - `saveProfile`
  - `acceptContract`
  - `saveSettings`

The live app therefore depends on `firestoreSync.js` for:

- theme sync
- profile sync
- contract sync
- settings sync

## Shared Data Assumptions

The sync layer currently assumes the couple app stores shared or partially shared data in each user's Firestore document:

- `profile`
- `favorites`
- `signature`

It also assumes shared local state is keyed by username:

- `profiles[username]`
- `favorites[username]`
- `contract_signatures[username]`

This is the main reason a simple one-line replacement of collection reads is not yet safe.

## Safe First Moves

These are safe to move before approved-account smoke passes because they can stay non-live or behavior-identical:

1. Add read-only helper modules for `users/{uid}` document reads and listeners.
2. Add data normalization helpers that shape cloud user docs before UI merge.
3. Document exact shared-data dependencies and payload assumptions.
4. Add QA checks that detect mirror drift and forbidden service-layer operations.

## Changes That Should Wait Until Approved Smoke Passes

These should wait until authenticated browser smoke proves both approved accounts still work:

1. Replacing `getDocs(collection(db, 'users'))` with a new partner-resolution strategy.
2. Replacing `onSnapshot(collection(db, 'users'))` with targeted document listeners.
3. Changing how favorites/shared couple data is derived from cloud documents.
4. Splitting active-user settings data from shared couple data writes.
5. Changing event timing around login hydration and render.

## Exact Risk Of Collection-Wide `users` Reads And Listeners

Current strict rules allow the private two-user model to work, but the sync layer still depends on broader collection access than necessary.

Risks:

- list permission remains on the critical path for login hydration
- listener scope is broader than the actual UI need
- shared-data merge depends on every visible user document having a consistent `username`
- if more than the intended two user docs ever exist, merge behavior becomes harder to reason about
- document-oriented rules/service boundaries are harder to enforce cleanly while collection scans remain live

This is a privacy-safety concern and a maintainability concern, even though the repo and deployed rules are otherwise much safer than before.

## Preparation Added In Phase 8C

Phase 8C can safely add non-live read-only helper modules:

- `services/syncReadService.js`
- `public/services/syncReadService.js`

Allowed boundary for those helpers:

- `getUserDataByUid(uid)`
- `listenToUserDoc(uid, callback)`
- `normalizeUserCloudData(data)`

They should not:

- write to Firestore
- delete from Firestore
- read the full `users` collection
- rewire the production `firestoreSync.js` path in this phase

## Phase 8C Conclusion

`core/firestoreSync.js` should remain behavior-stable in this batch.

The safe target is not a broad rewrite. The safe target is a documented replacement plan with small document-scoped helpers ready for a later, authenticated, behavior-verified extraction.
