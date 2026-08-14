# Firebase Hardening Notes

This is a local audit note for the rules-hardening phase. It is not for deploy or GitHub.

## Firestore Edition

- Project: `couplebook-97830`
- Database: `(default)`
- Edition: `STANDARD`
- Location: `nam5`

## Current Firestore Paths In Use

- `users/{uid}`
  - Read by:
    - `js/auth.js` via `verifyRegisteredAccount()`
    - `core/firestoreSync.js` via collection list + realtime listener
  - Written by:
    - Legacy signup bootstrap only. New browser signup is now disabled.
    - `core/firestoreSync.js` for settings/profile/favorites/signature sync

- `usernames/{lowercaseUsername}`
  - Read by:
    - Legacy only. Client usage has now been disabled in the private draft flow.
  - Written by:
    - Legacy only. Client writes are now disabled in the private draft flow.

- `devices/{deviceId}`
  - Queried by:
    - `js/settings.js` with `where('userId', '==', activeUid)`
  - Deleted by:
    - No active browser flow. Remote revoke is now disabled in the hardened client.
  - Creation is currently disabled in `js/auth.js`

## Current Auth Flow

- Login:
  - Email/password sign-in through Firebase Auth
  - Username login has been disabled in the hardened draft client
  - After sign-in, `verifyRegisteredAccount()` checks whether `users/{uid}` exists and now fails closed on verification errors
  - `js/app.js` then loads Firestore sync for non-guest sessions

- Registration:
  - Self-service signup is now disabled in the hardened draft client
  - Existing approved accounts are preserved
  - No browser flow should create `usernames/{lowercaseUsername}` or `users/{uid}` going forward

- Guest mode:
  - Guest mode is disabled in the hardened draft client
  - Old guest sessions are cleared and redirected back to login with a private-access notice

## Current Privacy Risks

- The currently deployed `firestore.rules` are still loose until the stricter draft is reviewed, updated with real UIDs, and deployed
- Placeholder UIDs in `firestore.rules.private-draft` must be replaced before deployment
- `core/firestoreSync.js` still uses a broad shared `users` document model instead of narrower service-layer collections
- Firebase config is still hardcoded in the browser instead of using environment-managed config like the reference app
- No emulator/rules-unit test setup exists yet in this repo

## Hardened Client Changes Applied

- Login UI now requires account email instead of public username lookup
- Self-service signup is disabled in both source and `public/` runtime login pages
- Guest access is disabled and no longer routes into cached couple data
- Settings device list is read-only in the browser; remote revoke is deferred to a trusted backend flow
- Client-side account deletion and username cleanup tools are removed from `js/settings.js`
- Local reset remains scoped to `memorybook_*` keys only

## Draft Rule Goals

- Only the two approved UIDs can list/read shared couple documents
- A signed-in account may only read its own `users/{uid}` document if it is one of the two approved UIDs
- User docs are owner-writable only and validated on both create and update
- Username registry is fully disabled for the client-side private model
- Future collections fail closed until explicitly designed

## Gather & Savor Patterns Worth Copying

- Approved-user allowlist checks should happen in both client auth flow and rules
- Fail-closed rules with helper functions and explicit validators
- Service-layer isolation for Firestore operations instead of scattered direct calls
- Environment-based Firebase config validation
- Route protection based on verified auth/access state

## Storage Draft Status

- `storage.rules.private-draft` now exists for future media migration
- It is fail-closed by default
- It models private paths for:
  - `users/{uid}/memories/...`
  - `special-pages/birthday/...`
  - `special-pages/valentines/...`
  - `special-pages/confessions/...`
  - `gallery/photos/...`
  - `gallery/videos/...`
- Storage rules were not deployed
- Firebase Storage is not initialized on project `couplebook-97830`, so CLI dry-run compilation could not complete
