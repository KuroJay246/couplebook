# QA Automation

This repo now includes a small local QA lane for repeatable safety and route checks.

The modernization track adds a second validation lane inside `app-v2/`:

- `npm run lint`
- `npm test`
- `npm run build`

Those commands validate the isolated React shell without changing the current static baseline.

As of 2026-07-13, the app-v2 lane now also covers:

- legacy compatibility adapters
- production-disabled memory bridge gating
- targeted domain-service contracts
- broad-query guardrails

## Scripts

- `npm run check:routes`
  Verifies the required app routes return `200`. It reuses an existing local server on `http://127.0.0.1:3000` if one is already running, otherwise it starts `server.js` temporarily.

- `npm run check:privacy`
  Uses headless Playwright against the local static app to prove that signed-out or spoofed localStorage cannot unlock `/pages/contract.html`, that direct public special-page routes expose only neutral placeholder content, and that spoofed localStorage does not unlock the legacy wrapper path.

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
  Runs the safety, public, rules, mirrors, services, sync-model, prototype, docs, privacy, and route checks in sequence.

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
- `app-v2` linting for the isolated React track
- `app-v2` auth/route contract tests
- `app-v2` production build generation into `app-v2/dist`
- `app-v2` legacy compatibility adapter tests
- `app-v2` domain-service contract tests
- `app-v2` broad-query and no-write guardrails
- Browser privacy/auth-containment checks for the static contract and retired public special pages

Still manual:

- Approved Jaylan account login smoke
- Approved partner account login smoke
- Browser verification that normal signed-in flows do not hit permission-denied after live rules changes
- Approved-user placeholder-path confirmation for the retired public special pages unless safe local credentials are supplied to the privacy check
- Final visual confirmation for current missing-media fallbacks outside the retired public special pages

## 2026-07-13 app-v2 Approved-User Smoke Result

- the isolated React shell now has one honest live approved-user browser smoke for Jaylan
- local setup required an ignored `app-v2/.env.local` file copied from the existing static Firebase web config before the React login page could initialize Firebase; that file remains uncommitted
- approved-user login succeeded in the visible in-app browser
- `/dashboard`, `/contract`, `/birthday`, `/valentine`, and `/confession` all stayed inside the protected shell for the approved session
- reload restored the approved session on each tested protected route with no redirect loop, no loading stall, and no `permission-denied` state
- sign-out returned the browser to `/login`
- spoofed legacy `memorybook_*` session keys did not restore access to `/contract`
- re-login restored approved access and preserved the requested `/contract` route
- browser console stayed clean during the smoke
- network observation stayed clean except for one expected aborted Firestore listen during sign-out
- observed Firestore auth verification remained targeted to `users/{uid}`; no broad `users` collection query was observed

## Known Coverage Gaps After 2026-07-12 Static Privacy Containment

- `check:routes` still proves HTTP `200` only. The redirect/privacy behavior coverage now lives in `check:privacy`, not `check:routes`.
- The privacy lane does not exercise the approved-user path unless safe local test credentials are deliberately provided through environment variables.
- The current QA lane still does not fail on browser-console/runtime asset 404s from:
  - `core/memories.json` media paths
  - profile/contract avatar paths
  - direct special-page companion media
  - other non-retired page-level local-only asset assumptions
- The `app-v2` auth tests are intentionally non-live. They do not log into production Firebase or prove approved-user behavior in a browser without a safe local test configuration.
- The root `npm run check:all` lane still validates the static rollback app only. It does not exercise the React migration routes.
- The app-v2 memory bridge tests validate localhost gating, production blocking, and sanitized fixture normalization only. They do not fetch or snapshot real private memory content in CI-style runs.
- The app-v2 approved-user smoke is still manual, single-account, and browser-session-dependent. Partner verification and future page-specific migrated-route smoke remain outstanding.

## Next QA Upgrade Targets

- add a headless browser smoke that verifies protected routes end on the login page when the session is missing
- add a browser-console/media-request smoke that fails on unexpected 404s for the current clean local baseline
- add a headless browser smoke for `app-v2` signed-out route protection and approved-user restoration once a safe local test configuration exists
- add an approved-user credential-injected smoke path for the retired public special-page placeholders only when it can run without storing secrets in repo files
- add the partner-account React browser smoke when a safe live session is genuinely available
- add an approved-user React browser smoke for the compatibility-backed dashboard only after the first real page migration lands
