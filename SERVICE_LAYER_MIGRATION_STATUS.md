# Service Layer Migration Status

Date: 2026-07-08
Current status: Phase 7B read-only foundation added

## New Service Files Added

- [services/userService.js](/C:/Users/Jaylan/Documents/couplebook/services/userService.js)
- [services/deviceService.js](/C:/Users/Jaylan/Documents/couplebook/services/deviceService.js)
- [public/services/userService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/userService.js)
- [public/services/deviceService.js](/C:/Users/Jaylan/Documents/couplebook/public/services/deviceService.js)

## Runtime Files Migrated

- [core/healthCheck.js](/C:/Users/Jaylan/Documents/couplebook/core/healthCheck.js)
- [public/core/healthCheck.js](/C:/Users/Jaylan/Documents/couplebook/public/core/healthCheck.js)
- [js/settings.js](/C:/Users/Jaylan/Documents/couplebook/js/settings.js)
- [public/js/settings.js](/C:/Users/Jaylan/Documents/couplebook/public/js/settings.js)

## What Moved Behind Services

- owner-scoped `users/{uid}` diagnostic read in health checks
- owner-scoped `devices` query in health checks
- owner-scoped `devices` query in settings device list

## What Remains Direct

- approved-account verification reads in `js/auth.js` and `public/js/auth.js`
- display-username resolution reads in `js/auth.js` and `public/js/auth.js`
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

Move the owner-scoped `users/{uid}` reads in auth behind a thin service boundary while preserving the current fail-closed login behavior.
