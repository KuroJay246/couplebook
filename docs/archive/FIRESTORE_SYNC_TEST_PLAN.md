# Firestore Sync Test Plan

Date: 2026-07-08
Scope: manual and low-risk local testing plan for a future document-scoped sync replacement

## Goal

Define how the live sync replacement should be tested without pretending that unauthenticated route checks are enough.

## Manual Approved-Account Test Cases

These require a real authenticated browser session and remain blocked while smoke is `HOLD`.

### Jaylan Approved Account

Verify:

- login succeeds
- dashboard hydrates
- timeline hydrates
- media page hydrates
- profile page hydrates
- favorites page hydrates
- settings page hydrates
- no `permission-denied` console errors
- no auth redirect loops

### Partner Approved Account

Verify:

- login succeeds
- dashboard hydrates
- timeline hydrates
- media page hydrates
- profile page hydrates
- favorites page hydrates
- settings page hydrates
- no `permission-denied` console errors
- no auth redirect loops

## Local No-Auth Route Tests

These are already covered by `npm run check:routes` and remain useful after any sync work.

Verify:

- `/` returns `200`
- all required static routes return `200`
- unauthenticated protected pages still redirect correctly in real browser use

## Offline / LocalStorage Fallback Checks

Manual expectations for a later sync implementation phase:

- Firestore outage should not crash the app
- route rendering should still occur with local state
- soft console warnings are acceptable
- local theme/settings should still hydrate from `UserStore`
- protected routes should not hang forever waiting for Firestore

## Console Error Checks

Watch for:

- `permission-denied`
- timeout-related errors
- auth redirect loops
- unhandled promise rejections
- missing listener unsubscribe errors
- localStorage parsing failures

## Data Merge Checks

For a later approved-user live test, verify:

### Active User

- cloud theme overrides local only when the remote write is not stale
- settings merge preserves nested `privacyToggles`
- contract acceptance remains true once accepted
- active profile fields hydrate into local shared profile map

### Shared Couple Data

- partner profile appears in shared local profiles
- partner signature appears in shared local signatures
- favorites merge remains backward-compatible with the current local structure
- missing partner doc does not crash route hydration

## Listener Behavior Checks

When live document listeners are eventually introduced, verify:

- listener starts after auth and after initial load pull
- duplicate renders do not explode
- `memorybook-sync-updated` still fires when profile/signature/contract changes require it
- stale remote theme writes do not overwrite newer local theme changes
- logout or route transition does not leave broken listeners behind

## What Cannot Be Tested Without Real Approved Login

These cannot be honestly marked as passing while smoke is `HOLD`:

- normal signed-in protected flow for Jaylan
- normal signed-in protected flow for partner
- real Firestore document read permissions under live rules
- real listener behavior under live couple data
- real cross-device sync correctness
- real contract/profile/favorites cloud merge behavior in authenticated production-like use

## Safe Pre-Implementation Checks

These are safe to automate before the live replacement:

- fixture-based normalization checks
- partner-picking helper checks
- shared profile/favorites/signature merge helper checks
- mirror drift checks
- service boundary checks
- prototype isolation checks

## Implementation Gate

Do not replace live `firestoreSync.js` reads or listeners until:

1. non-live helper checks pass
2. `npm run check:all` stays green
3. approved-account smoke is available and ready to run
4. the implementation step is small enough to revert cleanly if the smoke test fails
