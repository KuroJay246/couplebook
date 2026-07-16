# QA Automation

This repo now includes a small local QA lane for repeatable safety and route checks.

The modernization track adds a second validation lane inside `app-v2/`:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:browser`

Those commands validate the isolated React shell without changing the current static baseline.

As of 2026-07-15, the app-v2 lane now also covers:

- legacy compatibility adapters
- production-disabled memory bridge gating
- targeted domain-service contracts
- broad-query guardrails
- shell design-system structure and token retirement checks
- navigation hierarchy and grouped-route coverage
- shared editorial page-layout primitives
- Settings grouping and utility-page coverage
- Dashboard read-model coverage
- Dashboard route source coverage
- Profile read-model coverage
- Profile route source coverage
- Favorites read-model coverage
- Favorites route source coverage
- exact shared-overlap guardrails for Favorites
- browser-test-mode fixture normalization
- signed-out protected-route browser smoke
- spoofed-localStorage browser smoke
- AppShell reload and utility-navigation browser guardrails
- browser console/network/privacy guardrails for app-v2

## Scripts

- `npm run check:routes`
  Verifies the required app routes return `200`. It reuses an existing local server on `http://127.0.0.1:3000` if one is already running, otherwise it starts `server.js` temporarily.

- `npm run check:privacy`
  Uses headless Playwright against the local static app to prove that signed-out or spoofed localStorage cannot unlock `/pages/contract.html`, that direct public special-page routes expose only neutral placeholder content, and that spoofed localStorage does not unlock the legacy wrapper path.

- `cd app-v2 && npm run test:browser`
  Uses headless Playwright against a local app-v2 server with localhost-only injected fixtures so the routed shell can prove signed-out protection, spoofed-localStorage blocking, route reload restoration, AppShell rendering, utility-only Settings placement, and console/network guardrails without storing real account credentials.

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
- `app-v2` shell-design tests for navigation grouping, shared-state framing, reduced-motion coverage, and retired rose/berry token usage
- `app-v2` browser regression checks for signed-out redirects, spoofed localStorage blocking, authenticated route reloads, AppShell rendering, utility-only Settings placement, and console/network guardrails
- Browser privacy/auth-containment checks for the static contract and retired public special pages

Still manual:

- Approved Jaylan account login smoke
- Approved partner account login smoke
- Real approved-session sign-out and re-login verification in the live Jaylan browser session
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

## 2026-07-13 app-v2 Editorial Shell Validation

- app-v2 shared shell changes were validated with:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - root `npm run check:all`
- automated shell tests now verify:
  - editorial navigation grouping
  - mobile-nav route limits
  - shared-state framing
  - reduced-motion handling
  - retirement of the prior rose/berry token dependency
- browser validation confirmed:
  - protected routes still render inside the approved shell
  - desktop shell works at `1440x1024`
  - tablet shell works at `1024x768`
  - mobile shell works at `390x844`
  - mobile menu overlay opens cleanly
  - no horizontal overflow was observed
  - no console errors remained after the stale Vite hot-reload log was cleared by a full reload

## 2026-07-13 app-v2 Dashboard Validation

- the Dashboard read-model checkpoint passed app-v2 `lint`, `test`, and `build` before it was pushed as `71b1812`
- the migrated Dashboard route now adds:
  - a dedicated Dashboard feature slice
  - a read-only Dashboard model
  - source-level tests that prevent the route from regressing back to the placeholder
- the finished Dashboard migration passed:
  - `npm run lint`
  - `npm test` with 37 passing tests
  - `npm run build`
  - root `npm run check:all`
- in-browser validation for the approved Jaylan session confirmed:
  - `/dashboard` stayed inside the protected shell
  - no login redirect or `permission-denied` state appeared
  - desktop and `390x844` mobile widths stayed free of horizontal overflow
  - the new Dashboard section headings, source-state cards, and special-route links rendered cleanly
  - browser console logs stayed empty during the final Dashboard pass

## 2026-07-13 app-v2 Navigation, Settings, and Profile Validation

- the navigation, layout, Settings, and Profile batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - root `npm run check:all`
- the final app-v2 suite now passes with `48` tests
- automated app-v2 coverage now also verifies:
  - primary versus secondary route grouping
  - mobile navigation limits and labels
  - editorial page-layout primitives
  - Settings grouping structure
  - Profile read-model unavailable and partial states
  - immutable Profile inputs and read-only behavior
  - Profile route source coverage
- in-browser validation for the approved Jaylan session confirmed:
  - `/settings` stayed readable at desktop and mobile widths
  - `/profile` stayed inside the protected shell and stacked cleanly at `390x844`
  - the mobile `More` entry exposed secondary relationship routes, special moments, and utilities without horizontal overflow
  - `/dashboard` remained stable after the navigation and Profile work
  - no login redirect, loading stall, or `permission-denied` state appeared during the final pass
- fresh browser-console logs remained clean after a timestamped cutoff separated stale historical Vite hot-reload noise from the final run
- the observed authorization check remained targeted to `users/{uid}` only
- no private-media requests or production writes were introduced by the migrated routes

## 2026-07-13 app-v2 Favorites Validation

- the Favorites read-model and page batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - root `npm run check:all`
- the final app-v2 suite now passes with `57` tests
- automated app-v2 coverage now also verifies:
  - Favorites read-model ready, partial, empty, unavailable, and invalid states
  - exact-match-only shared overlap rules
  - duplicate-value normalization for display
  - no false fuzzy matches
  - Favorites route source coverage
  - Profile/Favorites integration copy after migration
- in-browser validation for the approved Jaylan session confirmed:
  - `/favorites` stayed inside the protected shell
  - reload restored the approved session directly on `/favorites`
  - `/profile` and `/contract` links from Favorites worked
  - `/dashboard` and `/profile` remained stable after the Favorites migration
  - desktop `1440x1024`, tablet `1024x768`, and mobile `390x844` stayed free of horizontal overflow
  - mobile kept only four primary destinations plus `More`
  - the mobile secondary menu exposed Favorites, Contract, special moments, and Settings correctly
  - the actual approved-session Favorites source on this origin rendered an honest empty state instead of fabricated preferences
  - fresh browser-console warnings/errors stayed empty during the final pass
- no static `/pages/favorites.html` or `js/favorites.js` runtime dependency was observed
- no private-media requests or production writes were observed during the validation pass

## 2026-07-15 app-v2 Settings And Browser Regression Validation

- the Settings and browser-guardrail batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:browser`
  - root `npm run check:all`
- the final app-v2 suite now passes with `69` tests
- the focused browser lane now covers:
  - signed-out protection for `/dashboard`, `/contract`, `/birthday`, `/valentine`, and `/confession`
  - spoofed `memorybook_active_*` session-value blocking
  - authenticated route stability on `/settings`, `/dashboard`, and `/contract`
  - direct reload restoration inside the protected shell
  - AppShell rendering and primary-navigation rendering
  - Settings utility-only placement in the mobile `More` flow
  - console-error, page-error, HTTP-failure, broad-users, unexpected-write, static-rollback, and private-media guardrails
- manual approved Jaylan browser validation also confirmed:
  - `/dashboard`, `/profile`, `/favorites`, and `/settings` stayed stable
  - direct approved access to `/contract`, `/birthday`, `/valentine`, and `/confession` remained protected and readable
  - sign-out returned the shell to `/login`
  - spoofed legacy localStorage keys still could not restore access
  - the observed auth lookup remained targeted to `users/{uid}` only
- the browser regression lane is intentionally local-only and mock-auth based; it does not replace the real Jaylan smoke, the partner smoke, or future pre-cutover manual verification
- smoke status remains honest:
  - Jaylan: `PASS`
  - partner: `NOT TESTED`
  - overall: `HOLD`

## Known Coverage Gaps After 2026-07-12 Static Privacy Containment

- `check:routes` still proves HTTP `200` only. The redirect/privacy behavior coverage now lives in `check:privacy`, not `check:routes`.
- The privacy lane does not exercise the approved-user path unless safe local test credentials are deliberately provided through environment variables.
- The current QA lane still does not fail on browser-console/runtime asset 404s from:
  - `core/memories.json` media paths
  - profile/contract avatar paths
  - direct special-page companion media
  - other non-retired page-level local-only asset assumptions
- The `app-v2` auth and browser-regression lanes are intentionally non-live. They do not log into production Firebase or replace approved-user behavior verification in a real browser session.
- The root `npm run check:all` lane still validates the static rollback app only. It does not exercise the React migration routes.
- The app-v2 memory bridge tests validate localhost gating, production blocking, and sanitized fixture normalization only. They do not fetch or snapshot real private memory content in CI-style runs.
- The app-v2 approved-user smoke is still manual, single-account, and browser-session-dependent. Partner verification and future page-specific migrated-route smoke remain outstanding.
- The app-v2 shell visual checks are still targeted browser inspections, not full visual-regression snapshots.

## Next QA Upgrade Targets

- add a browser-console/media-request smoke that fails on unexpected 404s for the current clean local baseline
- add an approved-user credential-injected smoke path for the retired public special-page placeholders only when it can run without storing secrets in repo files
- add the partner-account React browser smoke when a safe live session is genuinely available
- expand the local browser regression lane to the Contract page once the Contract migration is the active batch
