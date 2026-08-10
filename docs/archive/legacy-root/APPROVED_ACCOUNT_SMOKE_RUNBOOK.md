# Approved Account Smoke Runbook

Date: 2026-07-08
Scope: live approved-account smoke against the local app with the already deployed strict Firestore rules

This runbook is for a human tester. Do not place passwords, session tokens, Firebase tokens, or browser-exported credentials into this repo or into Codex prompts.

## Before You Start

1. Open a terminal in `C:\Users\Jaylan\Documents\couplebook`.
2. Run `npm run check:all`.
3. Start the local app with `npm run dev` if it is not already running.
4. Open the app at `http://127.0.0.1:3000/`.
5. Open the browser developer console before login so `permission-denied` errors are visible immediately.

## Jaylan Approved Account

1. Open `http://127.0.0.1:3000/pages/login.html`.
2. Log in with the approved Jaylan email/password directly in the browser.
3. Confirm the login succeeds.
4. Open and verify:
   - dashboard
   - memories/timeline
   - gallery/media
   - profile
   - favorites
   - settings
5. While navigating, watch the browser console for:
   - `permission-denied`
   - failed Firestore reads or writes
   - unexpected auth redirect loops
6. If any issue appears, stop and record the exact page, action, and console error.
7. Log out fully before switching accounts.

## Partner Approved Account

1. Return to the login page.
2. Log in with the approved partner email/password directly in the browser.
3. Confirm the login succeeds.
4. Open and verify:
   - dashboard
   - memories/timeline
   - gallery/media
   - profile
   - favorites
   - settings
5. Watch the browser console for the same `permission-denied`, Firestore, or auth issues.
6. If any issue appears, stop and record the exact page, action, and console error.
7. Log out fully after the test.

## Blocked Behavior Checks

After the approved-account flow:

1. Confirm guest access still cannot enter the private app.
2. Confirm signup remains hidden.
3. Confirm username-style login is rejected.
4. Confirm destructive browser admin tools remain disabled.

## Recording The Outcome

1. Copy [APPROVED_ACCOUNT_SMOKE_RESULTS_TEMPLATE.md](C:\Users\Jaylan\Documents\couplebook\APPROVED_ACCOUNT_SMOKE_RESULTS_TEMPLATE.md).
2. Fill it out manually after the session.
3. Mark the decision as:
   - `PASS` only if both approved accounts complete the normal flow without `permission-denied`
   - `HOLD` if either account fails, any blocked behavior regresses, or the result is incomplete

## Stop And Report Immediately If

- `permission-denied` appears on any normal approved-account page or action
- login succeeds but a page fails to hydrate because Firestore access is blocked
- guest access enters the app
- signup becomes visible or functional
- username-style login is accepted
- destructive browser cleanup or account-delete behavior becomes active again
