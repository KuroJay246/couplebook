# Firestore Service Layer Inventory

Date: 2026-07-08
Scope: current active source files and mirrored `public/` runtime files that initialize, query, read, write, or orchestrate Firestore-backed behavior

## Phase 7B Status

The first read-only service-layer foundation is now in place.

New mirrored service files:

- `services/userService.js`
- `services/deviceService.js`
- `services/authService.js`
- `public/services/userService.js`
- `public/services/deviceService.js`
- `public/services/authService.js`

Low-risk runtime files migrated in this phase:

- `core/healthCheck.js`
- `public/core/healthCheck.js`
- `js/settings.js`
- `public/js/settings.js`

Unchanged high-risk runtime files:

- `core/firestoreSync.js`
- `public/core/firestoreSync.js`

## Summary

Current active Firestore domains are narrow:

- `users/{uid}`
- `devices/{deviceId}`

The app no longer depends on the legacy `usernames` collection in active runtime code. The main architectural risk is not rule looseness anymore; it is that the client still performs collection-wide `users` reads/listens in the sync layer instead of targeted document reads.

## Direct Firestore Touch Points

### [C:\Users\Jaylan\Documents\couplebook\firebase\firebase-config.js](C:\Users\Jaylan\Documents\couplebook\firebase\firebase-config.js)
### [C:\Users\Jaylan\Documents\couplebook\public\firebase\firebase-config.js](C:\Users\Jaylan\Documents\couplebook\public\firebase\firebase-config.js)

- Operations:
  - `getFirestore(app)`
  - Firebase app/auth initialization
- Paths:
  - no collection/document path directly accessed here
- Risk level:
  - low
- Rules compatibility:
  - compatible; no reads or writes on its own
- Move to service wrapper later:
  - yes, into a shared `firebaseClient.js` or `firestoreClient.js`

### [C:\Users\Jaylan\Documents\couplebook\services\userService.js](C:\Users\Jaylan\Documents\couplebook\services\userService.js)
### [C:\Users\Jaylan\Documents\couplebook\public\services\userService.js](C:\Users\Jaylan\Documents\couplebook\public\services\userService.js)

- Operations:
  - `getDoc(doc(db, 'users', uid))`
- Paths:
  - `users/{uid}`
- Risk level:
  - low
- Rules compatibility:
  - compatible; owner-scoped read only
- Current callers:
  - `core/healthCheck.js`
  - `public/core/healthCheck.js`
- Notes:
  - no writes
  - no collection-wide reads
  - no username collection usage

### [C:\Users\Jaylan\Documents\couplebook\services\deviceService.js](C:\Users\Jaylan\Documents\couplebook\services\deviceService.js)
### [C:\Users\Jaylan\Documents\couplebook\public\services\deviceService.js](C:\Users\Jaylan\Documents\couplebook\public\services\deviceService.js)

- Operations:
  - `getDocs(query(collection(db, 'devices'), where('userId', '==', uid)))`
- Paths:
  - `devices/{deviceId}`
- Risk level:
  - low
- Rules compatibility:
  - compatible; owner-scoped read only
- Current callers:
  - `core/healthCheck.js`
  - `public/core/healthCheck.js`
  - `js/settings.js`
  - `public/js/settings.js`
- Notes:
  - no writes
  - no delete path
  - no query outside owner UID

### [C:\Users\Jaylan\Documents\couplebook\services\authService.js](C:\Users\Jaylan\Documents\couplebook\services\authService.js)
### [C:\Users\Jaylan\Documents\couplebook\public\services\authService.js](C:\Users\Jaylan\Documents\couplebook\public\services\authService.js)

- Operations:
  - owner-scoped approved-user verification through `users/{uid}`
  - owner-scoped display-name resolution through `users/{uid}`
- Paths:
  - `users/{uid}`
- Risk level:
  - low
- Rules compatibility:
  - compatible; uses only owner-scoped user document reads
- Current callers:
  - `js/auth.js`
  - `public/js/auth.js`
- Notes:
  - no writes
  - no deletes
  - fail-closed verification behavior preserved
  - username collection remains unused

### [C:\Users\Jaylan\Documents\couplebook\js\auth.js](C:\Users\Jaylan\Documents\couplebook\js\auth.js)
### [C:\Users\Jaylan\Documents\couplebook\public\js\auth.js](C:\Users\Jaylan\Documents\couplebook\public\js\auth.js)

- Operations:
  - imports `authService.js`
  - still signs in with Firebase Auth directly
- Paths:
  - no direct Firestore path access remains in this file for approved-user reads
- Risk level:
  - medium
- Rules compatibility:
  - compatible; owner-scoped reads moved behind `authService.js`
- Move to service wrapper later:
  - Phase 8B completed this read-only wrapper step
- Current status:
  - approved-user verification and display-name resolution are now behind `authService.js`
  - login UX and route behavior are intended to remain unchanged

### [C:\Users\Jaylan\Documents\couplebook\core\firestoreSync.js](C:\Users\Jaylan\Documents\couplebook\core\firestoreSync.js)
### [C:\Users\Jaylan\Documents\couplebook\public\core\firestoreSync.js](C:\Users\Jaylan\Documents\couplebook\public\core\firestoreSync.js)

- Operations:
  - `getDocs(collection(db, 'users'))`
  - `setDoc(doc(db, 'users', uid), payload, { merge: true })`
  - `onSnapshot(collection(db, 'users'), ...)`
  - `serverTimestamp()`
- Paths:
  - `users/{uid}`
  - collection-wide `users`
- Risk level:
  - high
- Rules compatibility:
  - partially compatible today because strict rules still allow approved users to list/read the couple docs, but this is broader than necessary and creates avoidable coupling to list permissions
- Why it is risky:
  - collection-wide reads for a two-user model are broader than needed
  - real-time listener subscribes to the whole `users` collection instead of specific documents
  - saved payload shape must stay exactly aligned with the rules schema
  - merge logic mixes active-user settings with shared couple data
- Move to service wrapper later:
  - yes; this is the highest-priority candidate for `syncService.js` and `userService.js`
- Current status:
  - unchanged in Phase 7B by design

### [C:\Users\Jaylan\Documents\couplebook\js\settings.js](C:\Users\Jaylan\Documents\couplebook\js\settings.js)
### [C:\Users\Jaylan\Documents\couplebook\public\js\settings.js](C:\Users\Jaylan\Documents\couplebook\public\js\settings.js)

- Operations:
  - `getDocs(query(collection(db, 'devices'), where('userId', '==', activeUid)))`
- Paths:
  - `devices/{deviceId}`
- Risk level:
  - medium
- Rules compatibility:
  - compatible if device documents are owner-tagged correctly; current rules allow owner reads
- Why it is risky:
  - device reads remain in page-level UI code
  - any future device schema change would force a UI-file edit instead of a service-layer edit
- Move to service wrapper later:
  - completed in Phase 7B for read-only device listing

### [C:\Users\Jaylan\Documents\couplebook\core\healthCheck.js](C:\Users\Jaylan\Documents\couplebook\core\healthCheck.js)
### [C:\Users\Jaylan\Documents\couplebook\public\core\healthCheck.js](C:\Users\Jaylan\Documents\couplebook\public\core\healthCheck.js)

- Operations:
  - `getDoc(doc(db, 'users', uid))`
  - `getDocs(query(collection(db, 'devices'), where('userId', '==', uid)))`
- Paths:
  - `users/{uid}`
  - `devices/{deviceId}`
- Risk level:
  - medium
- Rules compatibility:
  - compatible for approved signed-in users
- Why it is risky:
  - diagnostics still duplicate production data-access logic
  - if the user-doc or device-doc rules/schema change, this health checker can drift
- Move to service wrapper later:
  - completed in Phase 7B for read-only user/device diagnostics

## Indirect Firestore Boundaries

These files do not issue direct Firestore document operations, but they are part of the Firestore access flow and should be considered during the service-layer cleanup.

### [C:\Users\Jaylan\Documents\couplebook\js\app.js](C:\Users\Jaylan\Documents\couplebook\js\app.js)
### [C:\Users\Jaylan\Documents\couplebook\public\js\app.js](C:\Users\Jaylan\Documents\couplebook\public\js\app.js)

- Role:
  - routes after auth
  - invokes `firestoreSync.loadUserData(...)`
  - starts `firestoreSync.listen(...)`
  - invokes the health check on dashboard load
- Risk level:
  - medium
- Notes:
  - orchestration is centralized, which is good, but it is tightly coupled to the current sync implementation

### [C:\Users\Jaylan\Documents\couplebook\core\state.js](C:\Users\Jaylan\Documents\couplebook\core\state.js)
### [C:\Users\Jaylan\Documents\couplebook\public\core\state.js](C:\Users\Jaylan\Documents\couplebook\public\core\state.js)

- Role:
  - localStorage-first state source
  - fires non-blocking cloud sync through `firestoreSync.syncUserData()`
  - still contains future-facing `firebaseServices.syncMemoryToCloud(...)` calls that are stubs today
- Risk level:
  - medium
- Notes:
  - this is the local/cloud boundary that must stay stable during any later refactor

## Files Reviewed With No Direct Firestore Operations

- [C:\Users\Jaylan\Documents\couplebook\js\profile.js](C:\Users\Jaylan\Documents\couplebook\js\profile.js)
- [C:\Users\Jaylan\Documents\couplebook\js\favorites.js](C:\Users\Jaylan\Documents\couplebook\js\favorites.js)
- [C:\Users\Jaylan\Documents\couplebook\js\timeline.js](C:\Users\Jaylan\Documents\couplebook\js\timeline.js)
- [C:\Users\Jaylan\Documents\couplebook\js\media.js](C:\Users\Jaylan\Documents\couplebook\js\media.js)
- mirrored `public/js/*` versions of the same files

These remain localStorage-first today.

## Current Compatibility With Strict Rules

- `users/{uid}` reads in auth and health check:
  - compatible
- `users/{uid}` merge writes in sync layer:
  - compatible if payload shape remains within the allowed schema
- `users` collection list/read in sync layer:
  - compatible today, but fragile and broader than necessary
- `devices` owner queries in settings and health check:
  - compatible
- `usernames`:
  - no active runtime dependency remains, which matches the deny/frozen rules

## Recommended Priority

1. Replace collection-wide `users` reads/listens in `firestoreSync.js` with targeted document reads plus explicit partner-document lookup logic.
2. Keep `state.js` localStorage-first and treat it as the stable compatibility boundary during migration.
3. Add thin non-live sync read helpers before touching writes or listeners.
4. Only after the sync boundary is mapped in full should collection-wide listeners be replaced.
