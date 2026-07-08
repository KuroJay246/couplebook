# Firestore Sync Replacement Design

Date: 2026-07-08
Scope: design-only replacement plan for `core/firestoreSync.js` and `public/core/firestoreSync.js`

## Goal

Replace the current collection-wide `users` read/listener strategy with document-scoped reads and listeners while preserving the live static app behavior.

This document does not authorize a live implementation yet.

Approved-account smoke is still `HOLD`, so the current design target is:

- exact preservation of runtime behavior
- exact preservation of localStorage-first fallback
- no write-path expansion
- no collection-wide `users` query in the future replacement

## A. Current Behavior That Must Be Preserved

### Cloud Pull On Login

`js/app.js` currently does this after approved Firebase Auth succeeds:

1. call `firestoreSync.loadUserData(user.uid, activeUsername)`
2. call `state.restoreUserSession(activeUsername)`
3. call `firestoreSync.listen(user.uid, activeUsername)`

The replacement must preserve that order unless a later tested change proves safe.

### LocalStorage-First Behavior

The app still treats localStorage and `UserStore` as the primary runtime layer.

The replacement must keep:

- app boot working offline
- route hydration surviving Firestore failure
- local theme/settings/profile data remaining usable without cloud access
- fire-and-forget sync behavior from `core/state.js`

### Contract Flags

Current sync behavior preserves and merges:

- `UserStore.set('contract_accepted', 'true')`
- `UserStore.setRaw(\`memorybook_contract_accepted_${username}\`, 'true')`
- `UserStore.setShared('contract_accepted', 'true')`
- signature fallback if `contractAccepted === true` but `signature` is missing

The replacement must preserve this exact compatibility behavior.

### Profiles Merge

Current behavior reconstructs shared profiles by iterating user docs and writing into:

- `profiles[docUsername]`

The replacement must preserve the resulting local structure even if internal lookup changes.

### Favorites Merge

Current behavior merges favorites in two layouts:

1. nested by source username and person
2. backward-compatible top-level person layout

The replacement must preserve the same merged local result before any later data-model cleanup.

### Signature Merge

Current behavior merges:

- `signatures[docUsername] = cloud.signature`

with fallback synthetic signature objects when contract acceptance exists without a signature object.

### Settings Merge

Current behavior deep-merges the active user's cloud settings into local settings and preserves nested:

- `privacyToggles`

Cloud wins on conflict.

### Theme Sync

Current behavior keeps:

- theme pull from cloud on login
- theme update from listener if remote is not stale
- `document.documentElement.setAttribute('data-theme', theme)`
- mirrored `UserStore` user-scoped and shared theme writes

### Listener Update Events

Current behavior emits:

- `window.dispatchEvent(new Event('memorybook-sync-updated'))`

only when shared-profile/signature updates or contract state changes require rerender-relevant refresh.

The replacement must preserve that event behavior.

### Timeout Behavior

Current behavior uses a 5 second timeout around Firestore network work.

The replacement should preserve:

- fail-closed network timeout
- no hanging auth hydration
- no blocking UI forever on Firestore

### Offline/Fallback Behavior

Current behavior catches all load/save/listen failures and logs soft messages instead of breaking the app.

The replacement must preserve:

- catch-and-log behavior
- local fallback
- no route hard failure because Firestore is unavailable

## B. Current Firestore Operations

The live sync file still performs three core operations:

### Collection-Wide Users Read

- `getDocs(collection(db, 'users'))`

Used in `loadUserData(uid, username)` to:

- find the active user's cloud doc
- reconstruct shared profiles
- reconstruct shared favorites
- reconstruct shared signatures

### Collection-Wide Users Listener

- `onSnapshot(collection(db, 'users'), ...)`

Used in `listen(uid, username)` to:

- apply active-user theme updates
- apply active-user contract updates
- merge shared profiles
- merge shared signatures
- emit `memorybook-sync-updated`

### Users Merge Write

- `setDoc(doc(db, 'users', uid), payload, { merge: true })`

Used in `saveUserData(uid, username, partialPayload)`.

This write path is intentionally out of scope for the first replacement step.

## C. Proposed Document-Scoped Replacement

### Active User Document Read

Replace the collection scan for the signed-in user with:

- `getUserDataByUid(activeUid, { timeoutMs })`

This is already compatible with `syncReadService.js`.

### Partner User Document Read Strategy

The current app reconstructs shared couple data by reading all visible user docs. Under the private two-user model, the replacement should read only:

- active user document
- partner user document

Proposed strategy:

1. derive the approved UID pair from the existing strict private-app model
2. determine `partnerUid` as “the other approved UID”
3. read the partner user document directly by UID
4. ignore null or missing partner docs without crashing route hydration

Important:

- this requires a non-live approved UID pair helper or config source later
- it must not change the Firestore rules or UID allowlist

### Explicit Approved UID Pair Strategy

Future design target:

- one small non-live helper that returns the exact two approved UIDs in stable order
- `pickPartnerUserCloudData(userDocs, activeUid, approvedUidPair)` decides which document is partner data

This should remain outside live sync wiring until smoke passes.

### Targeted Document Listeners

Replace one collection listener with:

- one listener on the active user document
- one listener on the partner user document

Expected listener responsibilities:

- active listener:
  - theme updates
  - contract updates
  - active-user profile changes if needed
  - active-user signature changes if needed
- partner listener:
  - partner profile changes
  - partner signature changes
  - optional partner favorites merge once the read branch is proven

### No Full Users Collection Query

The target replacement must remove:

- `getDocs(collection(db, 'users'))`
- `onSnapshot(collection(db, 'users'), ...)`

from the live sync path.

## D. Data-Shape Contract

The replacement should preserve the current effective `users/{uid}` contract.

### Expected Fields In `users/{uid}`

- `username: string`
- `theme: string | null`
- `settings: object | null`
- `contractAccepted: boolean`
- `profile: object | null`
- `favorites: object | null`
- `signature: object | null`
- `migrationCompleted: boolean`
- `lastSync: Firestore timestamp | null`

### Profile Shape

Current code assumes:

- plain object
- merged under `profiles[username]`
- fields may include `name`, `bio`, `avatar`, `anniversaryView`, `joinedDate`, `birthday`

### Favorites Shape

Current code assumes:

- plain object
- keyed by person/category structure
- safe to merge shallowly per nested person object
- still backward-compatible with top-level layout

### Signature Shape

Current code assumes:

- plain object
- may include `accepted`, `timestamp`, `version`, `history`

### Settings Shape

Current code assumes:

- plain object
- may include `theme`, `anniversaryConfig`, and nested `privacyToggles`
- `privacyToggles` must be deep-merged

### `migrationCompleted` Behavior

Current meaning:

- if absent or false, the user cloud doc is treated as uninitialized
- load path then calls `saveUserData(uid, username)` to seed the cloud document

The replacement must preserve this bootstrap behavior.

### `lastSync` Behavior

Current meaning:

- written on every save
- compared against `memorybook_last_local_write`
- protects newer local theme state from stale remote overwrite in the listener

The replacement must preserve the same stale-write guard.

## E. Migration Strategy

### Step 1: Non-Live Helper Validation

- validate `syncReadService.js` assumptions
- add pure sync-model helpers outside live wiring
- add QA checks with fixture data

### Step 2: Replace Read Branch Only

First live code change, only after approved-account smoke passes:

- replace collection-wide load read with direct active/partner doc reads
- keep current write branch intact
- keep current listener branch intact for that step if needed

### Step 3: Replace Listener Branch Only

After read branch proves stable:

- replace one collection listener with targeted doc listeners
- preserve `memorybook-sync-updated` semantics
- preserve route hydration order

### Step 4: Preserve Write Branch Until Reads/Listeners Are Proven

Do not rewrite `saveUserData(...)` in the same step as read/listener replacement.

The write path is coupled to:

- localStorage keys
- shared data payload shape
- migration bootstrap behavior

### Step 5: Later Split Shared Couple Data Model

Only after approved smoke and replacement stability:

- reduce mixed active-user/shared-couple write coupling
- consider long-term separation of shared couple state from owner settings state

## F. Risks

### Username-Keyed localStorage Assumptions

Shared local structures are keyed by username, not UID:

- `profiles[username]`
- `favorites[username]`
- `contract_signatures[username]`

This means a doc-only read strategy still needs stable `username` values from cloud docs.

### Partner Doc Lookup

The current live sync logic never has to explicitly resolve the partner UID; it gets both docs by collection scan.

The replacement must now resolve:

- which second doc to read
- what to do if that doc is missing

### Real-Time Update Timing

Two listeners may produce different event timing than one collection listener.

Potential risks:

- duplicate rerenders
- out-of-order updates
- stale contract/theme application

### Favorites Not Currently Updated In Listener Path

The current listener updates:

- theme
- contract
- profiles
- signatures

It does not currently re-merge favorites in real time.

The replacement must either preserve that limitation intentionally or change it only in a separately tested step.

### Approved-Account Smoke Still HOLD

This remains the main delivery gate.

Until both approved accounts are actually tested:

- no risky sync replacement should be wired into production

## G. Stop Conditions For Implementation

If a later live implementation phase hits any of these, stop immediately:

- `permission-denied`
- cloud data merge mismatch
- route hydration failure
- localStorage corruption
- missing partner doc causing broken protected routes
- `npm run check:all` failure

## Recommended Next Safe Implementation Gate

Before touching live sync:

1. keep approved-account smoke honest
2. add pure sync-model helpers and fixture-based QA
3. validate the document-scoped design in non-live code first
4. wait for real approved-account smoke before replacing live reads/listeners
