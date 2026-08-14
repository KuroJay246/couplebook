# Project Cleanup Notes

This project is a private couple memory book. Privacy and local memory preservation take priority over convenience.

## What Was Excluded From Git

- `assets/photos/`
- `assets/videos/`
- `OUR MEMORIES/`
- private confession page media under `pages/confession/`
- private Valentine page audio under `pages/valentine/`
- environment files, service-account files, keys, logs, caches, and OS junk

## What Remains Local Only

- Original private photo and video libraries
- Duplicated raw media folders used for backup or manual organization
- Special-page private media assets that should not be committed to source control
- Confession and Valentine companion media files that are intentionally excluded from `public/` and Git
- Browser-local state until the app is refactored into cleaner Firestore and Storage-backed domains

## What Should Later Move To Firebase Storage

Recommended future paths:

- `users/{uid}/memories/{memoryId}/photos/{filename}`
- `users/{uid}/memories/{memoryId}/videos/{filename}`
- `special-pages/birthday/{filename}`
- `special-pages/valentines/{filename}`
- `special-pages/confessions/{filename}`
- `gallery/photos/{filename}`
- `gallery/videos/{filename}`

## What Must Never Be Committed

- `.env`
- `.env.*`
- service account JSON files
- private keys, certificates, and signing material
- `*.bundle` backups, including `C:\Users\Jaylan\Documents\couplebook-pre-filter.bundle`
- private raw photo and video libraries
- generated cache folders
- build output
- debug logs

## What Must Not Be Deployed Publicly

- repo-root miscellaneous files
- local backup folders such as `OUR MEMORIES/`
- source-control metadata or local export files
- any private media that has not been intentionally migrated to Firebase Storage
- special-page companion photos, videos, and audio that remain local-only

## Hosting Safety Recommendation

Current Firebase Hosting publishes only `public/`, which is the safer structure for this project.

Current expectation:

1. Keep private local media outside `public/`.
2. Keep backup bundles outside the repo and outside any deploy path.
3. Treat special-page companion media as local-only until it is intentionally migrated to Firebase Storage.
4. Re-check `firebase.json` before any future deploy to ensure it still publishes only `public/`.

## Firestore Rules Recommendation

The current rules are too open for a private two-person app. Use [firestore.rules.private-draft](/C:/Users/Jaylan/Documents/couplebook/firestore.rules.private-draft:1) as a starting point for a later locked-down rules phase. Do not deploy it unchanged.
