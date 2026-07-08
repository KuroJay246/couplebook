# Approved Account Smoke Checklist

Date: 2026-07-08

Use this checklist only with the two approved Firebase Auth accounts for this private couple app.

## Jaylan Account

- Login succeeds with the approved Jaylan email/password
- Dashboard opens
- Memories page opens
- Gallery/media page opens
- Profile page opens
- Favorites page opens
- Settings page opens
- No `permission-denied` errors appear in normal flow

## Partner Account

- Login succeeds with the approved partner email/password
- Dashboard opens
- Memories page opens
- Gallery/media page opens
- Profile page opens
- Favorites page opens
- Settings page opens
- No `permission-denied` errors appear in normal flow

## Blocked Behavior

- Guest cannot enter the private app
- Signup remains hidden
- Username login remains disabled
- Username collection is not required by the active app
- Destructive browser admin tools remain disabled

## Stop Conditions

- Any approved account gets `permission-denied`
- Any route loads but fails to hydrate because Firestore access is blocked
- Guest access enters the private app
- Signup is visible or functional again
- Username login is accepted
- A destructive browser cleanup or account-delete action becomes active again
