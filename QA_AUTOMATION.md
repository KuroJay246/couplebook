# QA Automation

This repo now includes a small local QA lane for repeatable safety and route checks.

The modernization track adds a second validation lane inside `app-v2/`:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:browser`

Those commands validate the isolated React shell without changing the current static baseline.

As of 2026-07-16, the app-v2 lane now also covers:

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
- Contract read-model coverage
- Contract route source coverage
- signature-payload redaction guardrails for Contract
- Timeline source-precedence coverage
- Timeline normalization and chapter-grouping coverage
- Timeline read-model status/filter/summary coverage
- Timeline source and fixture privacy guardrails
- Timeline page source coverage
- Gallery read-model coverage
- Gallery route source coverage
- Gallery metadata-only UI, filter, grouping, and progressive-disclosure coverage
- Gallery no-media-fetch/player/Storage/static-dependency guardrails
- Special Moment Frame source and safe-config coverage
- Special route pending-state and no-private-content guardrails
- Special runtime-content normalization and bridge-gating coverage
- Special route runtime-content rendering and unavailable-state coverage
- browser-test-mode fixture normalization
- signed-out protected-route browser smoke
- spoofed-localStorage browser smoke
- AppShell reload and utility-navigation browser guardrails
- browser console/network/privacy guardrails for app-v2
- Contract browser-content and mobile-overflow guardrails
- Timeline browser protection, spoof-resistance, authorized rendering, unavailable-bridge, no-private-media, no-static-dependency, no-write, and no-broad-users guardrails
- Gallery browser protection, spoof-resistance, authorized rendering, filters, private-media states, no-private-media, no-static-dependency, no-write, and no-broad-users guardrails
- Special-frame browser protection, spoof-resistance, authorized rendering, pending-state, no-media, no-static-dependency, no-write, and no-broad-users guardrails
- Special runtime-content browser fixture coverage for sanitized ready sections, private-media status, and no media elements
- protected unknown-route fallback inside AppShell
- candidate app-v2 Firestore security rules emulator coverage
- app-v2 Firestore source-mode read-model smoke with fictional emulator data
- counts-only Firestore migration dry-run coverage

## Scripts

- `npm run check:routes`
  Verifies the required app routes return `200`. It reuses an existing local server on `http://127.0.0.1:3000` if one is already running, otherwise it starts `server.js` temporarily.

- `npm run check:privacy`
  Uses headless Playwright against the local static app to prove that signed-out or spoofed localStorage cannot unlock `/pages/contract.html`, that direct public special-page routes expose only neutral placeholder content, and that spoofed localStorage does not unlock the legacy wrapper path.

- `cd app-v2 && npm run test:browser`
  Uses headless Playwright against a local app-v2 server with localhost-only injected fixtures so the routed shell can prove signed-out protection, spoofed-localStorage blocking, route reload restoration, AppShell rendering, utility-only Settings placement, and console/network guardrails without storing real account credentials.

- `cd app-v2 && npm run test:rules`
  Starts a local Firestore emulator against `firebase.app-v2.json` and `firestore.app-v2.rules` only. It uses fictional users and couples to prove signed-out denial, member access, unauthorized denial, inactive-member denial, cross-couple denial, unknown-path denial, all-write denial, and app-v2 Firestore source-mode read-model loading. The runner pins `firebase-tools@14.19.0` because this machine has Java 17 and Firebase CLI 15+ requires Java 21.

- `cd app-v2 && npm run migration:plan`
  Runs the non-writing Firestore migration planner. Output is counts-only/redacted and must not include private titles, descriptions, names, raw media paths, signature data, or full records.

## 2026-07-16 Final Readiness Validation

The final migration-readiness sprint used one baseline, focused correction checks, and one final validation lane. Baseline before the correction passed app-v2 `npm run lint`, `npm test`, `npm run build`, `npm run test:browser`, and root `npm run check:all`.

Product audit result:

- routes audited: `/`, `/login`, `/dashboard`, `/timeline`, `/gallery`, `/profile`, `/favorites`, `/settings`, `/contract`, `/birthday`, `/valentine`, `/confession`, and an unknown route
- viewport coverage: `1440x1024`, `1024x768`, and `390x844`
- known routes passed protected-shell, reload, no redirect-loop, no loading-stall, no `permission-denied`, no app-console-error, no private-media, no old static asset, and no horizontal-overflow checks
- P2 fixed: unknown routes now render a protected in-shell fallback instead of a detached page
- partner smoke remains `NOT TESTED`, so the overall real approved-account gate remains `HOLD`

Local Hosting rehearsal result:

- method: production `app-v2/dist` served through local Vite preview only
- no Firebase Hosting deployment, preview channel, rules deployment, index deployment, production write, or tracked `firebase.json` change occurred
- `/`, `/login`, `/dashboard`, `/timeline`, `/gallery`, `/profile`, `/favorites`, `/settings`, `/contract`, `/birthday`, `/valentine`, `/confession`, and an unknown route returned the React index locally with direct route reload support
- local HTML inspection found no source-map references, `.env` exposure, private media, directory listing, or legacy static dependency

Build/privacy scan result:

- production build contained seven files, no source maps, no media files, and no `.env` files
- app-source scans passed for service-account/private-key material, broad `users` reads/listeners, Storage usage, static page fetch dependencies, and localStorage auth shortcuts
- review hits were expected false positives: fictional raw-path redaction fixtures in tests, a test that asserts `dangerouslySetInnerHTML` is absent, and Firebase Auth vendor terminology
- public Firebase web configuration identifiers are expected in a browser Firebase app and are not classified as secrets

## 2026-07-16 Production Data And Security Validation

- candidate rules are isolated in `firestore.app-v2.rules`; production `firestore.rules` was not replaced
- candidate Firebase config is isolated in `firebase.app-v2.json`; production `firebase.json` still publishes `public/`
- app-v2 unit tests now cover source-mode defaults, path validation, Firestore normalizers, no broad `users` query, no write imports, no Storage imports, and migration-planner redaction
- app-v2 rules tests cover:
  - signed-out denial
  - member-one permitted reads
  - member-two permitted reads
  - unauthorized authenticated denial
  - inactive-member denial
  - cross-couple denial
  - unknown path denial
  - create/update/delete/batch/transaction write denial
  - app-v2 Firestore source-mode read-model smoke with fictional data
- `npm run migration:plan` against the local legacy memory dataset reported `114` memories, `114` valid records, `0` invalid records, `0` blockers, and `0` planned writes
- intentional emulator `PERMISSION_DENIED` log lines during `test:rules` are expected negative-test evidence, not production network activity
- partner real-account smoke remains manual and not tested

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
- `app-v2` Gallery UI source/browser guardrails for metadata-only media handling, filters, grouping, Show more, private-media states, and static-dependency blocking
- `app-v2` Special Moment Frame source/browser guardrails for pending protected routes, safe config, common return navigation, and no private/static content
- `app-v2` Special runtime-content model and bridge guardrails for approved keys only, localhost-only reads, production blocking, section validation, no raw HTML, and private-media redaction
- `app-v2` candidate Firestore rules emulator tests with fictional data
- `app-v2` non-writing migration dry-run tests and counts-only output checks
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

## 2026-07-16 app-v2 Contract Validation

- the Contract batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:browser`
  - root `npm run check:all`
- the final app-v2 suite now passes with `78` tests
- automated app-v2 coverage now also verifies:
  - Contract read-model ready, partial, empty, unavailable, and invalid states
  - safe acceptance/signature summaries when protected wording is unavailable
  - legacy signature-payload redaction before data reaches the display layer
  - Contract route source coverage and the absence of sign/edit/export controls
  - browser-lane signed-out protection for `/contract`
  - browser-lane spoofed-localStorage blocking for `/dashboard` and `/contract`
  - authenticated Contract heading, unavailable-wording state, safe signature-status text, and Profile/Favorites links
  - no raw `data:image`, `base64`, or `strokeData` text on the migrated Contract route
  - mobile secondary-navigation placement and no horizontal overflow on Contract
- manual approved Jaylan browser validation also confirmed:
  - `/dashboard`, `/profile`, `/favorites`, `/settings`, and `/contract` stayed stable
  - direct approved access to `/birthday`, `/valentine`, and `/confession` remained protected and readable
  - sign-out returned the shell to `/login`
  - spoofed legacy localStorage keys still could not restore access
  - the observed auth lookup remained targeted to `users/{uid}` only
- the browser regression lane remains local-only and mock-auth based; it does not replace the real Jaylan smoke, the partner smoke, or future pre-cutover manual verification
- smoke status remains honest:
  - Jaylan: `PASS`
  - partner: `NOT TESTED`
  - overall: `HOLD`

## 2026-07-16 app-v2 Timeline Memory-Domain Validation

- the Timeline planning and read-model batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:browser`
  - root `npm run check:all`
- the final app-v2 suite now passes with `86` tests
- automated app-v2 coverage now also verifies:
  - legacy memory source precedence for base, deleted, overridden, and custom memory state
  - deterministic title and description display rules without mutating saved values
  - tag trimming and case-insensitive deduplication without semantic merging
  - deterministic date handling for ISO datetimes, date-only strings, invalid dates, and missing dates
  - media-state classification for `none`, `private-legacy-reference`, `special-route-only`, and `invalid-reference`
  - special-route whitelisting for birthday, Valentine, and confession only
  - year-based chapter grouping, sparse `Everyday memories` collapse, and explicit undated/date-review placement
  - Timeline read-model `ready`, `empty`, `unavailable`, `partial`, and `invalid` states
  - Timeline summary counts, filter metadata, and `featured: null`
  - source guardrails that block direct memory-dataset imports, static Timeline runtime imports, and Timeline-domain writes
  - fixture guardrails that keep the committed Timeline-memory test surface explicitly fictional
- the Timeline batch intentionally does not replace the real Timeline page or expand browser regression yet
- smoke status remains honest:
  - Jaylan: `PASS`
  - partner: `NOT TESTED`
  - overall: `HOLD`

## 2026-07-16 app-v2 Timeline UI And Gallery Read-Model Validation

- the Timeline UI and Gallery read-model batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:browser`
  - root `npm run check:all`
- the final app-v2 suite now passes with `92` tests
- automated app-v2 coverage now also verifies:
  - Timeline route source coverage and placeholder removal
  - Timeline text-only private-media behavior with no static Timeline dependency
  - Timeline signed-out protection
  - Timeline spoofed legacy localStorage blocking
  - authorized Timeline rendering with local-only fictional memory fixtures
  - Timeline unavailable-bridge state
  - Timeline browser guardrails for no console errors, HTTP failures, broad users lookup, unexpected writes, private-media requests, or static rollback dependencies
  - Gallery photo and video classification
  - Gallery private-reference, invalid-reference, no-media, special-moment, year-filter, and type-filter modeling
  - Gallery immutable inputs and unavailable-versus-empty status boundaries
  - Gallery no-fetch, no-write, no-broad-query, no-Storage, and no-raw-path guardrails
- manual approved Jaylan in-app browser validation confirmed:
  - `/timeline` restored the approved session and stayed inside the protected shell
  - desktop `1440x1024`, tablet `1024x768`, and mobile `390x844` had no horizontal overflow
  - no loading stall, redirect loop, permission-denied state, browser-console error, static Timeline asset, or private-media element was observed
  - the current real local memory bridge is unavailable, so manual validation covered the honest bridge-disabled state while populated Timeline interactions are covered by local authorized fixtures
- the browser regression lane remains local-only and mock-auth based; it does not replace the real Jaylan smoke, partner smoke, or future pre-cutover manual verification
- smoke status remains honest:
  - Jaylan: `PASS`
  - partner: `NOT TESTED`
  - overall: `HOLD`

## 2026-07-16 app-v2 Special Moment Runtime-Content Validation

- the Special Moment runtime-content batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:browser`
  - root `npm run check:all`
- the final app-v2 suite now passes with `99` tests
- automated app-v2 coverage now also verifies:
  - accepted moment keys are limited to Birthday, Valentine, and Confession
  - unknown moment types fail safely
  - ready, partial, empty, unavailable, and invalid content states normalize safely
  - unknown section kinds are quarantined
  - script markup, event-handler markup, raw HTML, and private media path text are rejected or withheld
  - inputs remain immutable
  - production mode rejects the local bridge
  - non-local runtime origins and non-local bridge URLs are rejected
  - path traversal-style moment keys are rejected
  - no private media path, Storage use, write call, broad users query, credential literal, or localStorage auth shortcut is introduced
  - browser fixtures render sanitized runtime content without real private text
  - special routes render media status only, with no image, video, audio, iframe, autoplay, or old static page request
- manual approved Jaylan in-app browser validation confirmed:
  - `/birthday`, `/valentine`, and `/confession` restored the approved session and stayed inside the protected shell
  - desktop `1440x1024`, tablet `1024x768`, and mobile `390x844` had no horizontal overflow
  - no loading stall, redirect loop, permission-denied state, browser-console warning/error, media element, old static asset request, or private-media request was observed
  - the current approved local app shows honest unavailable runtime states because the local bridge is not enabled
- scoped special runtime guardrail scans passed for raw HTML injection, old static dependencies, private media paths, core memory imports, production writes, broad users queries, localStorage auth shortcuts, Firebase Storage, credentials, and real private names in browser fixtures
- smoke status remains honest:
  - Jaylan: `PASS`
  - partner: `NOT TESTED`
  - overall: `HOLD`

## 2026-07-16 app-v2 Gallery UI And Special Frame Validation

- the Gallery UI and Special Moment Frame batch passed:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run test:browser`
  - root `npm run check:all`
- the final app-v2 suite now passes with `96` tests
- automated app-v2 coverage now also verifies:
  - Gallery route source coverage and placeholder removal
  - metadata-only Gallery rendering with no image, video, fetch, player, Storage, or old static dependency
  - Gallery filters for All, Photos, Videos, Special moments, Private media, and Year
  - Gallery private-reference, unavailable, special-route, year-grouping, and progressive-disclosure states
  - Special Moment Frame safe config for Birthday, Valentine, and Confession
  - framed pending states with common return navigation and no old static special-page dependency
  - no private special-page content, autoplay, media, write behavior, broad users query, raw private path, credential literal, or localStorage auth shortcut in the changed sprint files
  - browser-lane signed-out protection and spoofed-localStorage blocking for `/gallery`, `/birthday`, `/valentine`, and `/confession`
  - authorized browser fixture rendering for Gallery and all special-frame routes
- manual approved Jaylan in-app browser validation confirmed:
  - Gallery and `/birthday`, `/valentine`, and `/confession` restored the approved session and stayed inside the protected shell
  - desktop `1440x1024`, tablet `1024x768`, and mobile `390x844` had no horizontal overflow
  - no loading stall, redirect loop, permission-denied state, browser-console warning/error, media element, old static asset request, or private-media request was observed
  - the current real local memory bridge is unavailable, so manual validation covered honest unavailable states while local authorized fixtures cover populated Gallery filters and Show more
- the browser regression lane remains local-only and mock-auth based; it does not replace the real Jaylan smoke, partner smoke, or future pre-cutover manual verification
- smoke status remains honest:
  - Jaylan: `PASS`
  - partner: `NOT TESTED`
  - overall: `HOLD`

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
- Timeline and Gallery are no longer model-only; both real app-v2 routes are migrated. The remaining live-account gap is partner smoke, plus real bridge-enabled approved-session validation when the private local bridge is intentionally available.
- Birthday, Valentine, and Confession now have protected runtime-content architecture. Production content connection, partner smoke, and production data-source verification remain pending.

## Next QA Upgrade Targets

- add a browser-console/media-request smoke that fails on unexpected 404s for the current clean local baseline
- add an approved-user credential-injected smoke path for the retired public special-page placeholders only when it can run without storing secrets in repo files
- add the partner-account React browser smoke when a safe live session is genuinely available
- expand browser regression for production special-moment content only after an approved protected production runtime source exists
