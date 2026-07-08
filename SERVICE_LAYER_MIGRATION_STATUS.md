# Service Layer Migration Status

Date: 2026-07-08
Current status: Phase 7B read-only foundation added

## New Service Files Added

- [services/userService.js](/C:/Users/Jaylan/Documents/couplebook/services/userService.js)
- [services/deviceService.js](/C:/Users/Jaylan/Documents/couplebook/services/deviceService.js)
- [services/authService.js](/C:/Users/Jaylan/Documents/couplebook/services/authService.js)
- [public/services/userService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/userService.js)
- [public/services/deviceService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/deviceService.js)
- [public/services/authService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/authService.js)

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

## What Remains Direct

- collection-wide `users` reads/listens and `users/{uid}` merge writes in `core/firestoreSync.js` and `public/core/firestoreSync.js`
- Firebase bootstrap remains in `firebase/firebase-config.js` and `public/firebase/firebase-config.js`

## core/firestoreSync.js Status

`core/firestoreSync.js` remains unchanged in this phase.

It still needs:

- targeted document-read cleanup
- listener-scope reduction
- separation of shared-couple data from active-user settings logic

## Why This Step Was Safe

- only read-only helpers were added
- no writes or deletes were introduced
- no Firestore rules changed
- no auth flow changed
- no data shape changed
- root and `public/` runtime mirrors stayed aligned

## Next Safest Extraction Step

Map `core/firestoreSync.js` in exact detail and add non-live read-only sync helpers before attempting any change to collection-wide reads or listeners.

## Approved-Account Smoke Status

Approved-account smoke is still `HOLD`.

This service-layer progress does not change that gate because no authenticated approved-user browser smoke was performed in this phase.
