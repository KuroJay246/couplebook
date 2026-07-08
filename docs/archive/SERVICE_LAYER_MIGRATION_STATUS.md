# Service Layer Migration Status

Date: 2026-07-08
Current status: Phase 8C sync boundary mapped; read-only helper preparation added

## New Service Files Added

- [services/userService.js](/C:/Users/Jaylan/Documents/couplebook/services/userService.js)
- [services/deviceService.js](/C:/Users/Jaylan/Documents/couplebook/services/deviceService.js)
- [services/authService.js](/C:/Users/Jaylan/Documents/couplebook/services/authService.js)
- [services/syncReadService.js](/C:/Users/Jaylan/Documents/couplebook/services/syncReadService.js)
- [public/services/userService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/userService.js)
- [public/services/deviceService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/deviceService.js)
- [public/services/authService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/authService.js)
- [public/services/syncReadService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/syncReadService.js)

## Runtime Files Migrated

- [core/healthCheck.js](/C:/Users/Jaylan/Documents/couplebook/core/healthCheck.js)
- [public/core/healthCheck.js](/C:/Users/Jaylan/Documents/couplebook/public/core/healthCheck.js)
- [js/settings.js](/C:/Users/Jaylan/Documents/couplebook/js/settings.js)
- [public/js/settings.js](/C:/Users/Jaylan/Documents/couplebook/public/js/settings.js)
- [js/auth.js](/C:/Users/Jaylan/Documents/couplebook/js/auth.js)
- [public/js/auth.js](/C:/Users/Jaylan/Documents/couplebook/public/js/auth.js)

## What Moved Behind Services

- owner-scoped `users/{uid}` diagnostic read in health checks
- owner-scoped `devices` query in health checks
- owner-scoped `devices` query in settings device list
- owner-scoped approved-user verification reads in auth
- owner-scoped display-name resolution reads in auth
- document-scoped sync-read preparation helpers now exist outside the live sync path

## What Remains Direct

- collection-wide `users` reads/listens and `users/{uid}` merge writes in `core/firestoreSync.js` and `public/core/firestoreSync.js`
- Firebase bootstrap remains in `firebase/firebase-config.js` and `public/firebase/firebase-config.js`

## core/firestoreSync.js Status

`core/firestoreSync.js` remains behavior-unchanged in this phase.

It still needs:

- targeted document-read cleanup
- listener-scope reduction
- separation of shared-couple data from active-user settings logic
- authenticated approved-account smoke before live listener replacement

## Phase 8C Additions

- created [FIRESTORE_SYNC_BOUNDARY_MAP.md](/C:/Users/Jaylan/Documents/couplebook/FIRESTORE_SYNC_BOUNDARY_MAP.md)
- added mirrored non-live read helpers:
  - [services/syncReadService.js](/C:/Users/Jaylan/Documents/couplebook/services/syncReadService.js)
  - [public/services/syncReadService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/syncReadService.js)

These helpers are intentionally limited to:

- owner-scoped `users/{uid}` document reads
- owner-scoped document listeners
- cloud data normalization

They are not wired into production yet.

## Why This Step Was Safe

- only read-only helpers were added
- no writes or deletes were introduced
- no Firestore rules changed
- no auth flow changed
- no data shape changed
- root and `public/` runtime mirrors stayed aligned

## Next Safest Extraction Step

Use the new boundary map and non-live helpers to design a document-oriented replacement for `loadUserData(...)` and `listen(...)`, then wait for approved-account smoke before changing live listener scope.

## Approved-Account Smoke Status

Approved-account smoke is still `HOLD`.

This service-layer progress does not change that gate because no authenticated approved-user browser smoke was performed in this phase.
