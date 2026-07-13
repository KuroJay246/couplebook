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

- `npm run check:mirrors`
  Verifies the known root/public mirrored runtime files stay byte-equivalent after normalizing line endings, including the `services/` mirror set.

- `npm run check:services`
  Verifies read-only service helpers do not introduce forbidden writes, deletes, legacy `usernames` usage, broad `users` collection scans, or obvious hardcoded secrets.

- `npm run check:sync-model`
  Verifies the non-live sync model helpers normalize fixture user docs safely, preserve shared profile/favorites/signature expectations, and resolve active/partner docs without Firebase access. The QA loader evaluates the helper through an ephemeral ESM data URL so the repo can stay CommonJS-default without the `MODULE_TYPELESS_PACKAGE_JSON` warning.

- `npm run check:prototype`
  Verifies the non-live shell prototype stays outside `public/`, remains clearly labeled as non-live, and does not reference Firebase or private media paths/extensions.

- `npm run check:docs`
  Verifies the master handbook docs and the required standalone smoke/privacy docs still exist before longer autonomous runs depend on them.

- `npm run check:all`
  Runs the safety, public, rules, mirrors, services, sync-model, prototype, docs, and route checks in sequence.

## When To Run

- Before committing security, hosting, or rules changes.
- Before pushing after any auth, settings, or routing changes.
- Before any future deploy review.
- After any cleanup that touches Git tracking, `public/`, or Firebase rules.
- Before committing mirror-sensitive service or prototype changes.

## What Failures Mean

- `check:routes` failure:
  A route is broken, the local server is not serving correctly, or a path changed without updating runtime links.

- `check:safety` failure:
  A sensitive path is tracked again or has re-entered reachable Git history. Stop and investigate before any push.

- `check:public` failure:
  A media file with a blocked extension exists inside `public/`. Treat it as unsafe until it is proven to be an intentional public-safe UI asset.

- `check:rules` failure:
  The local rules drifted, a placeholder UID remains, Hosting target drifted, Storage delete blocking regressed, or the Firestore rules dry-run no longer validates.

- `check:mirrors` failure:
  A mirrored root/public runtime file drifted. Stop and realign both trees before committing.

- `check:services` failure:
  A service helper crossed the allowed read-only boundary or now contains an unsafe pattern.

- `check:sync-model` failure:
  The non-live sync replacement helpers no longer preserve the expected fixture-based merge and partner-selection behavior.

- `check:prototype` failure:
  A prototype leaked toward production boundaries or now references Firebase/private media.

- `check:docs` failure:
  A required master handbook doc or essential standalone smoke/privacy doc is missing.

## Automated vs Manual

Automated now:

- Route availability
- Git history/tracked-file sensitive path checks
- `public/` media boundary checks
- Firestore rules drift and dry-run checks
- Root/public mirror drift checks
- Read-only service boundary checks
- Non-live sync-model fixture checks
- Prototype isolation checks
- Core documentation presence checks
- Consolidated master-doc presence checks

Still manual:

- Approved Jaylan account login smoke
- Approved partner account login smoke
- Browser verification that normal signed-in flows do not hit permission-denied after live rules changes
- Final visual confirmation for special pages that intentionally excluded companion media still degrade gracefully

## Known Coverage Gaps After 2026-07-12 Recovery Audit

- `check:routes` proves HTTP `200` only. It does not assert the final browser location after client-side auth redirects.
- The current QA lane does not fail when direct special pages are reachable without the protected shell:
  - `/pages/confession/index.html`
  - `/pages/valentine/index.html`
  - `/pages/omnia-happy-birthday.html`
- The current QA lane does not detect that `pages/contract.html` can be opened with only spoofed `localStorage` session keys while `/pages/dashboard.html` still rejects the same fake session.
- The current QA lane does not fail on browser-console/runtime asset 404s from:
  - `core/memories.json` media paths
  - profile/contract avatar paths
  - direct special-page companion media

## Next QA Upgrade Targets

- add a headless browser smoke that verifies protected routes end on the login page when the session is missing
- add a headless browser smoke that proves direct special pages are either retired or protected
- add a headless browser smoke that confirms `contract.html` cannot open from `localStorage` spoofing alone
- add a browser-console/media-request smoke that fails on unexpected 404s for the current clean local baseline
