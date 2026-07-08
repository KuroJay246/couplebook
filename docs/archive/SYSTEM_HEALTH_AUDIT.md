# System Health Audit

Date: 2026-07-08
Scope: local repo state, Git safety, Hosting boundary, Firebase rules state, static runtime health, and current QA coverage

## Executive Summary

Overall state: stable enough for continued private development, with one major remaining gate.

- Pass: Git history and tracked-file privacy cleanup remain intact
- Pass: Firebase Hosting is structurally limited to `public/`
- Pass: Live Firestore rules were hardened and deployed rules-only
- Pass: Local route checks are repeatable and currently clean
- Pass: Guest/signup/username/destructive-browser-admin flows remain blocked from source and unsigned-session checks
- Warn: Approved Jaylan and partner account browser smoke has not been completed with real credentials or a live authenticated session
- Warn: Firebase Storage is still uninitialized, so media migration remains future work only

## Current Architecture Snapshot

- App type: static multi-page HTML/CSS/JS site
- Local server: [C:\Users\Jaylan\Documents\couplebook\server.js](C:\Users\Jaylan\Documents\couplebook\server.js)
- Hosted runtime root: `public/`
- Client Firebase init: browser CDN modules from [C:\Users\Jaylan\Documents\couplebook\firebase\firebase-config.js](C:\Users\Jaylan\Documents\couplebook\firebase\firebase-config.js)
- Primary runtime storage: `localStorage`
- Cloud sync layer: [C:\Users\Jaylan\Documents\couplebook\core\firestoreSync.js](C:\Users\Jaylan\Documents\couplebook\core\firestoreSync.js)

## Git And Privacy Health

- `git rev-list --objects --all` sensitive-path check is clean for the previously removed media, export, and bundle names
- `git ls-files` sensitive-file check is clean
- Private raw media remains excluded from Git and from `public/`
- Backup bundle remains a private local artifact and must never be uploaded

Health: pass

## Hosting Boundary Health

- [C:\Users\Jaylan\Documents\couplebook\firebase.json](C:\Users\Jaylan\Documents\couplebook\firebase.json) publishes only `public/`
- Repo-root notes, server code, cleanup docs, and local-only media are outside the deploy root
- `public/` currently contains no `.mp4`, `.mov`, `.mp3`, `.wav`, `.jpg`, `.jpeg`, or `.png` files

Health: pass

## Firestore And Auth Health

- Live [C:\Users\Jaylan\Documents\couplebook\firestore.rules](C:\Users\Jaylan\Documents\couplebook\firestore.rules) now matches the reviewed private draft locally
- The approved UID allowlist is restricted to the two real approved Firebase Auth UIDs
- `users/{uid}` is owner-scoped
- `usernames` is denied/frozen
- `devices` is owner-only
- Future collections fail closed
- Deletes are blocked except the intentionally modeled device-owner delete path
- Browser auth is email/password only
- Username login is disabled
- Self-service signup is disabled
- Guest access is disabled

Health: pass with manual smoke still pending

## Storage Health

- [C:\Users\Jaylan\Documents\couplebook\storage.rules.private-draft](C:\Users\Jaylan\Documents\couplebook\storage.rules.private-draft) blocks deletes explicitly
- Storage rules are still draft-only
- Firebase Storage is not initialized for project `couplebook-97830`
- No media migration has started

Health: warn, future-only by design

## Settings And Destructive Action Health

- The old hardcoded unlock model has been replaced by Firebase reauthentication for sensitive settings access
- Client-side full `localStorage.clear()` behavior has been narrowed to `memorybook_` keys only
- Browser-side account deletion and username cleanup tools remain disabled
- Remote device revoke remains disabled until a trusted backend/session-management flow exists

Health: pass

## Route And Runtime Health

The following routes currently return `200` under local verification:

- `/`
- `/pages/login.html`
- `/pages/dashboard.html`
- `/pages/timeline.html`
- `/pages/media.html`
- `/pages/profile.html`
- `/pages/favorites.html`
- `/pages/settings.html`
- `/pages/legacy.html?module=confession/index.html`
- `/pages/confession/index.html`
- `/pages/valentine/index.html`
- `/pages/omnia-happy-birthday.html`

Health: pass

## Automation Coverage

Current local scripts:

- `npm run check:routes`
- `npm run check:safety`
- `npm run check:public`
- `npm run check:rules`
- `npm run check:all`

These cover route availability, Git/history safety, `public/` media boundaries, and Firestore rules dry-run validation.

Health: pass

## Remaining Gaps

- Approved Jaylan account smoke is still pending
- Approved partner account smoke is still pending
- No browser-authenticated live post-rules smoke has yet confirmed the normal signed-in flow end to end
- `core/firestoreSync.js` still relies on collection-wide reads of `users` and local merge assumptions that should be reviewed before broader refactor work
- Root/public duplication still exists and should be reduced in a later cleanup phase

## Recommended Immediate Order

1. Run the manual approved-account smoke checklist with real credentials or a saved authenticated session.
2. If both accounts pass without `permission-denied`, treat the rules rollout as fully closed.
3. Begin architecture inventory and service-layer planning before any UI redesign or media migration.
