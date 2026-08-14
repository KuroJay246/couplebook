# Couple Book Full Stack Product Reality Audit

Date: July 23, 2026

Audit branch: `audit/couplebook-full-product-reality`

Verified HEAD at audit close: `73bef5b0c0a811734bdce03157312858d315e311` before final closeout commits in this run

Repository: `C:\Users\Jaylan\Documents\couplebook`

React application: `C:\Users\Jaylan\Documents\couplebook\app-v2`

Firebase project: `couplebook-97830`

Prohibited project: `gathervibeshub`

Local authenticated preview used during this audit: `http://127.0.0.1:4274`

Production reference only: `https://couplebook-97830.web.app`

Sanitized visual evidence package: `C:\Users\Jaylan\Documents\couplebook.visual-audit\couplebook-full-product-reality-2026-07`

## Executive Conclusion

- Overall status: `PASS`
- Full audit status: completed
- Production status: `UNCHANGED`
- Version 1.1: `NOT RELEASED`
- Memory-book realism: `PASS`
- Production recommendation: keep production unchanged in this run, keep Version 1.1 unreleased, and use this audited branch for controlled review or merge only

This run closed the material audit gaps that were previously failed, not attempted, partially completed, or unsupported by evidence. The remaining open items are not launch blockers for this audit branch: they are follow-up hardening or polish work, not product-break or data-loss defects.

## Working Tree Forensics

Changed files on the audit branch were classified into these groups before closeout work continued:

- `A. Product-audit UI fixes`
  - Dashboard active-memory normalization and title fallback
  - Gallery canonical-item rendering, truthful counts, accessibility naming, and performance work
  - Timeline mobile copy and memory normalization
  - responsive and special-page CSS refinements
- `B. Product refinement work already present`
  - Favorites, Profile, Settings, and special-page editing refinements
  - related source tests and shell-design assertions
- `C. Authentication and authorization hardening`
  - active membership enforcement
  - explicit couple/member path handling
  - revision-based stale-write protection
  - Firestore rules hardening for revisions and contract acceptance
  - focused auth/rules/write tests
- `D. Audit documentation`
  - this audit report
- `E. Temporary evidence`
  - screenshots, matrix output, Lighthouse reports, clean-install logs, backup fixtures, and local product/performance artifacts

Category `E` artifacts remain outside the Git history and are not committed.

## Completion Summary

| Audit area | Status | Result |
| --- | --- | --- |
| Mobile Gallery performance | PASS | `npm run test:performance` passes; mobile Gallery max frame gap is `24ms` with `0` long frames. |
| Dashboard title quality | PASS | fallback hierarchy now prefers authored copy before date-only neutral fallback. |
| Clean install validation | PASS | isolated `npm ci`, build, and test completed successfully in a clean temp copy. |
| Cross-browser matrix | PASS | Chromium, Firefox, and Playwright WebKit passed; Edge `NOT AVAILABLE`; real Safari `NOT AVAILABLE`. |
| Lighthouse completion | PASS | desktop and mobile runs completed for Login, Dashboard, Timeline, Gallery, Profile, and Contract with no accessibility blocker, no severe Best Practices issue, and no severe CLS. |
| Concurrency and stale-write testing | PASS | revision and stale-write protections exercised through emulator-backed rules tests plus write-service conflict tests. |
| App Check review | PASS | current state determined precisely: packages transitively present, app unconfigured, enforcement absent. |
| Hosting security review | PASS | Hosting config hardened and reviewed; SPA fallback and ignore boundaries are correct; CSP intentionally deferred. |
| Backup and recovery drill | PASS | safe synthetic restore drill passed with project guard, checksum drift rejection, dry-run, restore, readback, and cleanup. |
| Monitoring and failure-state review | PASS | monitoring is local-only user feedback; no remote monitoring or alerting is currently present. |
| Visual evidence package | PASS | route screenshots, close-ups, contact sheet, and route index completed with sanitized fixtures. |
| Audit report update | PASS | this document reflects the completed audit state rather than the earlier partial draft. |

## Product Judgment

The current React product reads as a private relationship memory book rather than CRUD software. That conclusion is based on the captured evidence, not source inspection alone:

- `desktop-1440x900-dashboard.png` shows a romantic hero, relationship-centered chronology, and recent-memory cards that now pull from the correct active timeline view.
- `desktop-1440x900-gallery.png` and `gallery-desktop-grid.png` read like an album and preserve truthful counts without exposing private media files.
- `mobile-390x844-timeline.png` keeps the relationship-story structure readable on phone-sized viewports.
- `desktop-1440x900-valentine.png` and `valentine-page.png` preserve the private, romantic special-page tone.

The app does not read as too plain overall. The most noticeable remaining visual weakness is that some lower Dashboard utility sections still feel slightly more functional than intimate. That is polish work, not an audit blocker.

## Defect Ledger

### P0

- Found: `0`
- Fixed: `0`
- Remaining: `0`

### P1

- Found: `0`
- Fixed: `0`
- Remaining: `0`

### P2

- Found: `3`
- Fixed: `3`
- Remaining: `0`

Fixed P2 defects closed in this audit completion:

1. Mobile Gallery performance failed the scroll-frame threshold.
2. Dashboard recent-memory fallback titles were overly generic when authored copy was missing.
3. Gallery media-tile buttons exposed unnamed active controls in the product interaction sweep.

### P3

- Found: `2`
- Fixed: `0`
- Remaining: `2`

Deferred P3 items:

1. Lower Dashboard support sections remain a little more utility-heavy than the strongest romantic pages.
2. The desktop shell is currently more header-led than a literal permanent left-rail layout in the captured desktop evidence.

## Mobile Gallery Performance

- Original audited result: `npm run test:performance` failed on `Mobile Gallery scroll frame gaps should stay below 120ms.`
- Root cause: the Gallery path was doing too much work in the initial tile flow and was not yet reduced to the smaller, memoized, truthful render set now used in the audited build.
- Correction applied on this branch:
  - canonical Gallery item list from the read model
  - truthful filtered result count
  - smaller active mobile render surface
  - storage-safe placeholder flow instead of private media fetches
  - product interaction/accessibility cleanup on tile controls
- Final measured mobile Gallery result:
  - `frameCount: 32`
  - `longFrameCount: 0`
  - `maxFrameGapMs: 24`
  - `medianFrameGapMs: 17`
  - `tileCount: 8`
  - `mediaFrameCount: 8`
  - `nodeCount: 231`
  - `imageCount: 0`
  - `videoCount: 0`
  - `usedJsHeapSize: 16100000`
  - `totalJsHeapSize: 20500000`
  - `cumulativeLayoutShift: 0`
  - `privateMediaResourceCount: 0`
- Final command result: `PASS`

## Clean Install Validation

Isolated clean-install validation was run in a safe temp copy, not by deleting the active working tree dependencies.

- Node: `v24.16.0`
- npm: `11.13.0`
- `npm ci`: `PASS`
- Install duration: `22s`
- Lockfile result: consistent
- Install warnings:
  - deprecated `node-domexception@1.0.0`
  - deprecated `glob@10.5.0`
  - deprecated `uuid@9.0.1`
  - `6` moderate dev-only vulnerabilities reported by `npm audit`
- Build result: `PASS`
- Test result: `PASS`

This run also reran `npm ci` inside `app-v2` after the final defect fix; that current-tree reinstall passed as well.

## Cross-Browser Matrix

Evidence file: `C:\Users\Jaylan\Documents\couplebook.visual-audit\couplebook-full-product-reality-2026-07\browser-matrix\browser-matrix.json`

- Chromium: `PASS`
- Firefox: `PASS`
- Playwright WebKit: `PASS`
- Microsoft Edge: `NOT AVAILABLE`
  - reason: `Microsoft Edge executable not found on this machine.`
- Real Safari: `NOT AVAILABLE`
  - reason: `Real Safari is unavailable on this Windows machine; WebKit coverage recorded separately.`

Covered checks included:

- Login layout
- protected-route load and hard refresh for `/dashboard`, `/timeline`, `/gallery`, `/profile`, `/favorites`, `/settings`, `/contract`, `/birthday`, `/valentine`, and `/confession`
- Timeline search/select/date/detail dialog
- Gallery search/select/lightbox/external iCloud link
- Favorites dialog
- Settings editing controls
- browser back and forward
- session persistence
- mobile render, mobile bottom navigation, mobile drawer, and horizontal-overflow checks

Observed browser-matrix errors:

- `consoleErrors: []`
- `pageErrors: []`
- `failedResponses: []`

## Lighthouse

Evidence file: `C:\Users\Jaylan\Documents\couplebook.visual-audit\couplebook-full-product-reality-2026-07\lighthouse\summary.json`

Routes covered:

- Login
- Dashboard
- Timeline
- Gallery
- Profile
- Contract

Desktop and mobile were run for each route.

### Login

- mobile: Perf `58`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7663.31ms`, LCP `7663.31ms`, TBT `1ms`, CLS `0.05`, Speed Index `7663.31ms`
- desktop: Perf `55`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7377.17ms`, LCP `7377.17ms`, TBT `0ms`, CLS `0`, Speed Index `7377.17ms`

### Dashboard

- mobile: Perf `59`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7236.06ms`, LCP `7311.22ms`, TBT `0ms`, CLS `0.03`, Speed Index `7236.06ms`
- desktop: Perf `55`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7393.38ms`, LCP `7694.38ms`, TBT `0ms`, CLS `0`, Speed Index `7393.38ms`

### Timeline

- mobile: Perf `59`, A11y `98`, Best Practices `100`, SEO `100`, FCP `7364.87ms`, LCP `7364.87ms`, TBT `0ms`, CLS `0`, Speed Index `7364.87ms`
- desktop: Perf `55`, A11y `98`, Best Practices `100`, SEO `100`, FCP `7361.95ms`, LCP `7361.95ms`, TBT `0ms`, CLS `0`, Speed Index `7361.95ms`

### Gallery

- mobile: Perf `59`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7361.68ms`, LCP `7361.68ms`, TBT `0ms`, CLS `0`, Speed Index `7361.68ms`
- desktop: Perf `55`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7368.54ms`, LCP `7368.54ms`, TBT `0ms`, CLS `0`, Speed Index `7368.54ms`

### Profile

- mobile: Perf `59`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7359.76ms`, LCP `7359.76ms`, TBT `0ms`, CLS `0`, Speed Index `7359.76ms`
- desktop: Perf `55`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7367.05ms`, LCP `7367.05ms`, TBT `0ms`, CLS `0`, Speed Index `7367.05ms`

### Contract

- mobile: Perf `59`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7397.39ms`, LCP `7397.39ms`, TBT `0ms`, CLS `0`, Speed Index `7397.39ms`
- desktop: Perf `55`, A11y `100`, Best Practices `100`, SEO `100`, FCP `7364.66ms`, LCP `7364.66ms`, TBT `0ms`, CLS `0`, Speed Index `7364.66ms`

Lighthouse conclusion:

- no accessibility blocker
- no severe Best Practices issue
- no severe CLS
- no mobile Gallery outlier after the performance correction
- performance scores are moderate and consistent rather than route-specific breakage

## Concurrency and Stale-Write Testing

Concurrency and stale-write risk was exercised through emulator-backed rules tests plus write-service conflict tests rather than a manual two-browser destructive drill.

Completed coverage:

- stale memory overwrite rejection
- stale archive rejection
- stale profile overwrite rejection
- revision progression for profile, favorites, settings, memories, and special moments
- active-membership gating during writes
- contract acceptance constrained to valid member updates
- duplicate and malformed write rejection at the rules layer
- pending, inactive, unauthorized, and cross-couple write denial

Relevant results:

- `npm run test:rules`: `9` pass
- `npm run test:storage-rules`: `6` pass
- `npm test`: stale-write service tests passed

Conclusion:

- stale updates do not silently overwrite newer data in the revised Firestore write path
- revoked or inactive access fails closed
- contract acceptance remains constrained
- buttons in the product views clear saving state on both success and error

## App Check Review

Current state:

- Installed: transitively present only through the Firebase package tree
- Configured in app code: `No`
- Initialized in browser client: `No`
- Enforcement active: `No`
- Debug-token handling present: `No`

Source review findings:

- no `initializeAppCheck`
- no reCAPTCHA/App Check bootstrap
- no App Check environment configuration
- current Firebase client initializes app, auth, and Firestore only

Risk and rollout conclusion:

- Current preview and localhost flows would need explicit debug-token and staged rollout handling before enforcement.
- Immediate enforcement in this branch would carry owner lockout risk and would break current local preview/test workflows.

Recommendation: `enable monitoring first`

That means prepare App Check deliberately, verify localhost and preview behavior, and only then evaluate enforcement.

## Hosting Security Review

Reviewed file: `C:\Users\Jaylan\Documents\couplebook\firebase.json`

Confirmed configuration:

- Hosting publishes `app-v2/dist`
- SPA rewrite routes all paths to `/index.html`
- source maps are excluded with `"**/*.map"`
- environment files are excluded with `"**/.env*"`
- local backups and migration artifacts are excluded
- `app-v2/src/**`, `app-v2/scripts/**`, and `app-v2/public/**` are excluded from Hosting
- JS/CSS cache policy: `max-age=3600`
- image/video cache policy: `max-age=86400`

Headers now configured in `firebase.json`:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: DENY`

Security review conclusion:

- Hosting config hardening is present in the branch.
- No CSP was added in this run because a rushed CSP would risk breaking Firebase Auth, Firestore, Google-hosted fonts, preview Hosting, or the external iCloud navigation path.
- Local emulator/header probing in this audit did not surface the configured headers reliably, so header activation was not claimed as locally verified runtime behavior.

## Backup and Recovery Exercise

Safe environment used: synthetic backup fixture plus emulator-only restore flow.

Completed checks:

1. Prohibited-project guard rejects `gathervibeshub`.
2. Dry-run works.
3. Restore target is explicit.
4. Checksum drift is detected.
5. Restore succeeds safely in the emulator path.
6. Restored record reads back correctly.
7. Missing target remains missing.
8. Cleanup succeeds.
9. No private content was printed into audit logs.

Observed safe results from the recovery drill:

- dry-run output: `{"projectId":"couplebook-97830","dryRun":true,"restoreCount":1,"missingCount":1}`
- checksum-corrupt fixture: rejected with `Backup checksum verification failed.`
- emulator apply output: `{"projectId":"couplebook-97830","dryRun":false,"restored":1,"skippedMissing":1}`

Rollback documentation boundary reviewed:

- Hosting rollback: preserved outside this branch
- rules rollback: preserved outside this branch
- Git-tag rollback references: preserved
- archived-memory recovery path: script-supported
- Google Drive recovery archive: documented as external archival boundary
- four missing-media references: still deferred with private-media follow-up work, not in the public bundle

## Monitoring and Failure-State Review

Current monitoring class: `local only`

Present behavior:

- auth failures surface readable messages from the auth provider
- write failures in Timeline, Profile, Favorites, Settings, Contract, and special pages clear saving state and show user-readable feedback
- Gallery private-media failures render protected placeholders instead of broken media loads
- special-moment and compatibility failure states fail closed into unavailable/error states

Absent behavior:

- no React `ErrorBoundary`
- no remote monitoring service
- no remote alerting
- no release or environment tagging in telemetry
- no production incident pipeline inside this app

Observed browser audit result:

- no console errors in the browser matrix normal-flow sweep
- no page errors in the browser matrix normal-flow sweep

Conclusion:

- error handling is acceptable for local user feedback
- observability remains limited to local UI-state reporting and console-level diagnostics
- remote monitoring is a deferred hardening item, not something already present

## React Doctor Warning-by-Warning Disposition

Command results:

- `npm run health:react`: `PASS with warnings`
- `npx -y react-doctor@latest --no-telemetry --verbose`: `PASS with warnings`

Final counts:

- Security: `3`
- Performance: `11`
- Maintainability: `0`
- Bugs: `0`
- Accessibility: `0`
- Total: `14`

Detailed classification:

### Security warnings

1. `dist/assets/firebase-auth-C-iKE7Td.js:1`
   - classification: `Firebase browser-config false positive`
   - reason: built browser artifact contains public Firebase client config plus client-side collection names; real enforcement remains in Firebase rules
2. `dist/assets/firebase-firestore-znb0GVEo.js:26`
   - classification: `Firebase browser-config false positive`
   - reason: same issue class in the Firestore bundle artifact
3. `dist/assets/index-BRGCmDM0.js:2`
   - classification: `Firebase browser-config false positive`
   - reason: same issue class in the app bundle artifact

### Performance warnings

4. `scripts/lib/media-duplicate-audit.mjs:191`
   - classification: `migration-script issue`
   - reason: chained iteration in private media tooling, not browser-product code
5. `scripts/lib/media-duplicate-audit.mjs:202`
   - classification: `migration-script issue`
   - reason: same
6. `scripts/lib/media-duplicate-audit.mjs:214`
   - classification: `migration-script issue`
   - reason: same
7. `scripts/lib/media-duplicate-audit.mjs:215`
   - classification: `migration-script issue`
   - reason: same
8. `scripts/lib/media-duplicate-audit.mjs:244`
   - classification: `migration-script issue`
   - reason: same
9. `scripts/lib/media-duplicate-audit.mjs:302`
   - classification: `migration-script issue`
   - reason: same
10. `scripts/lib/media-mapping.mjs:239`
   - classification: `migration-script issue`
   - reason: same class in media-mapping tooling, not shipped UI code
11. `scripts/lib/media-duplicate-audit.mjs:220`
   - classification: `migration-script issue`
   - reason: `[...array].sort()` warning in offline audit tooling
12. `scripts/lib/migration-engine.mjs:35`
   - classification: `intentional retained architecture`
   - reason: sequential await is deliberate in ordered migration work
13. `scripts/lib/migration-engine.mjs:95`
   - classification: `intentional retained architecture`
   - reason: same
14. `src/features/favorites/FavoritesView.jsx:120`
   - classification: `tooling-only issue`
   - reason: the warning flags a very small string-search check inside a bounded UI list; it is not a measured browser-product defect and did not justify another behavior change in this run

`src/services/mediaService.js` review result:

- classification: `obsolete file`
- action taken: removed from the branch
- result: no callers remain in `app-v2/src` or `app-v2/scripts`

## Dependency Classification

### `npm audit --omit=dev`

- result: `PASS`
- production vulnerabilities: `0`

### `npm audit`

- result: `FAIL`
- vulnerabilities: `6` moderate
- classification: `accepted dev-only risk`

Exact chain:

- direct dev dependency: `firebase-admin@14.2.0`
- transitive path: `firebase-admin` -> `@google-cloud/storage` -> `gaxios` / `retry-request` / `teeny-request` -> `uuid@9.0.1`
- advisory of note: `GHSA-w5hq-g745-h8pq`

Bundle impact:

- not in the production browser bundle
- limited to Node-side tooling and scripts

Resolution status:

- no safe non-major fix was available in this run
- current installed `firebase-admin` was already the latest published version checked during this audit

### `npm outdated`

- result: `FAIL`
- classification: version drift, not test failure

Drift summary:

- security: none proven in production dependencies
- compatibility patch:
  - `react` `19.2.7 -> 19.2.8`
  - `react-dom` `19.2.7 -> 19.2.8`
- tooling patch:
  - `@tailwindcss/vite` `4.3.2 -> 4.3.3`
  - `tailwindcss` `4.3.2 -> 4.3.3`
- tooling major:
  - `@eslint/js` `9.39.5 -> 10.0.1`
  - `eslint` `9.39.5 -> 10.7.0`
  - `@vitejs/plugin-react` `5.2.0 -> 6.0.4`
  - `globals` `16.5.0 -> 17.7.0`
  - `vite` `7.3.6 -> 8.1.5`
- optional improvement:
  - `eslint-plugin-react-refresh` `0.4.26 -> 0.5.3`

### `npm ls --all`

- result: `PASS`

## Visual Evidence Package

Package root: `C:\Users\Jaylan\Documents\couplebook.visual-audit\couplebook-full-product-reality-2026-07`

Completed artifacts:

- route screenshots: `55`
- close-up screenshots: `20`
- skipped close-up captures: `1`
- contact sheet: `C:\Users\Jaylan\Documents\couplebook.visual-audit\couplebook-full-product-reality-2026-07\contact-sheet\contact-sheet.html`
- route and viewport index: `C:\Users\Jaylan\Documents\couplebook.visual-audit\couplebook-full-product-reality-2026-07\route-viewport-index.json`
- notes: `C:\Users\Jaylan\Documents\couplebook.visual-audit\couplebook-full-product-reality-2026-07\visual-evidence-notes.md`

Route coverage:

- `/login`
- `/dashboard`
- `/timeline`
- `/gallery`
- `/profile`
- `/favorites`
- `/settings`
- `/contract`
- `/birthday`
- `/valentine`
- `/confession`

Viewport coverage:

- `1440x900`
- `1024x768`
- `390x844`
- `320x568`
- `200% zoom`

Sanitization boundary:

- local browser-test fixture mode only
- no private messages, passwords, or raw private-media files committed

## Exact Validation Results

| Command | Status | Count / outcome | Relevant finding |
| --- | --- | --- | --- |
| `npm ci` in isolated clean copy | PASS | `22s` | clean-install validation completed without mutating the active tree |
| `npm ci` in `app-v2` current tree | PASS | reinstall complete | rerun succeeded after final fixes |
| `npm run lint` | PASS | no errors | lint clean |
| `npm test` | PASS | `153` pass, `13` skipped, `0` fail | full node suite green |
| `npm run build` | PASS | build complete | production bundle compiles cleanly |
| `npm run test:rules` | PASS | `9` pass | rules, revision enforcement, and active-member gates hold |
| `npm run test:storage-rules` | PASS | `6` pass | private media rules hold |
| `npm run test:browser` | PASS | script pass | browser regression suite green |
| `npm run test:product` | PASS | script pass | product interaction suite green after Gallery naming fix |
| `npm run test:visual` | PASS | script pass | visual regression suite green |
| `npm run test:performance` | PASS | script pass | mobile Gallery performance gap resolved |
| `npm run test:media-mapping` | PASS | `10` pass | private media mapping tests green |
| `npm run health:react` | PASS with warnings | `14` warnings | no accessibility or bug findings |
| `npx -y react-doctor@latest --no-telemetry --verbose` | PASS with warnings | `14` warnings | warnings individually classified above |
| `npm audit --omit=dev --json` | PASS | `0` vulnerabilities | no production dependency vulnerability reported |
| `npm audit --json` | FAIL | `6` moderate | dev-only transitive chain through `firebase-admin` tooling |
| `npm outdated --json` | FAIL | `10` packages outdated | drift only; not a validation regression |
| `npm ls --all --json` | PASS | dependency tree listed | no blocking tree integrity issue |
| `git diff --check` | PASS | exit `0` | only line-ending warnings printed |
| `npm run release:preflight` | PASS | script pass | Firebase project guard passed for `couplebook-97830` |
| `npm run check:all` | PASS | script pass | root safety, privacy, rules, docs, and route checks passed |

## Branch Commits for Closeout

This audit closeout is structured into these three commits:

1. `53129ef` - `Complete Couple Book product refinement fixes`
2. `706da1d` - `Require active membership and secure Couple Book writes`
3. `Complete Couple Book full product audit`

The exact commit hashes are recorded at closeout in Git history for this audit branch.

## Release Recommendation

- Full audit: `PASS`
- Production: `UNCHANGED`
- Version 1.1: `NOT RELEASED`
- Do not deploy production from this run.
- Do not create a release tag from this run.

## Deferred

- partner activation after the surprise reveal
- Firebase Storage/private media production rollout
- optional post-launch visual polish
