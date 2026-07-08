# QA Automation

This repo now includes a small local QA lane for repeatable safety and route checks.

## Scripts

- `npm run check:routes`
  Verifies the required app routes return `200`. It reuses an existing local server on `http://127.0.0.1:3000` if one is already running, otherwise it starts `server.js` temporarily.

- `npm run check:safety`
  Verifies tracked files and reachable Git history do not contain the known private media, export, or backup bundle paths that were previously removed from the repo.

- `npm run check:public`
  Verifies `public/` does not contain `.mp4`, `.mov`, `.mp3`, `.wav`, `.jpg`, `.jpeg`, or `.png` files. For this private app, any future exception should be explicitly documented before the check is relaxed.

- `npm run check:rules`
  Verifies the local Firestore live rules match the reviewed draft, confirms placeholder UIDs are gone, confirms Hosting still publishes only `public/`, confirms the Storage draft still blocks deletes, and runs a Firebase CLI dry-run for Firestore rules only.

- `npm run check:all`
  Runs the safety, public, rules, and route checks in sequence.

## When To Run

- Before committing security, hosting, or rules changes.
- Before pushing after any auth, settings, or routing changes.
- Before any future deploy review.
- After any cleanup that touches Git tracking, `public/`, or Firebase rules.

## What Failures Mean

- `check:routes` failure:
  A route is broken, the local server is not serving correctly, or a path changed without updating runtime links.

- `check:safety` failure:
  A sensitive path is tracked again or has re-entered reachable Git history. Stop and investigate before any push.

- `check:public` failure:
  A media file with a blocked extension exists inside `public/`. Treat it as unsafe until it is proven to be an intentional public-safe UI asset.

- `check:rules` failure:
  The local rules drifted, a placeholder UID remains, Hosting target drifted, Storage delete blocking regressed, or the Firestore rules dry-run no longer validates.

## Automated vs Manual

Automated now:

- Route availability
- Git history/tracked-file sensitive path checks
- `public/` media boundary checks
- Firestore rules drift and dry-run checks

Still manual:

- Approved Jaylan account login smoke
- Approved partner account login smoke
- Browser verification that normal signed-in flows do not hit permission-denied after live rules changes
- Final visual confirmation for special pages that intentionally excluded companion media still degrade gracefully
