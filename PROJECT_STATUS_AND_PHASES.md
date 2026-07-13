# Project Status And Phases

Date: 2026-07-12

## Current Repo Status

| Item | Status |
| --- | --- |
| Current branch | `main` |
| Latest verified commit at recovery audit start | `11b3324701207ffa72f9be3de6aa78749534ea7f` |
| Repo clean at recovery audit start | yes |
| `main` matches `origin/main` at recovery audit start | yes |
| App type | static multi-page HTML/CSS/JS with manual root/public mirroring |
| Runtime publish root | `public/` only |
| Primary local state | `localStorage` plus `core/memories.json` |
| Cloud sync boundary | `core/firestoreSync.js` |

## 2026-07-12 Recovery Audit Snapshot

| Item | Status |
| --- | --- |
| Starting HEAD | `11b3324701207ffa72f9be3de6aa78749534ea7f` |
| `git status --short --branch` | clean `main...origin/main` |
| `git diff --stat` | none |
| Modified files at audit start | none |
| Staged files at audit start | none |
| Untracked files at audit start | none |
| Last completed pushed batch | `Refine live gallery experience` |
| Incomplete Git batch found | none in the worktree |
| Private tracked-media risk found | none tracked; private archive remains outside Git |

## 2026-07-12 Verified Runtime Reality

- `npm run check:all` passed cleanly at audit time.
- The current live baseline is still the static/public mirrored app served by `server.js` from `public/`.
- Protected shell routes redirected an unauthenticated fresh browser session to `/pages/login.html`:
  - `/pages/dashboard.html`
  - `/pages/timeline.html`
  - `/pages/media.html`
  - `/pages/profile.html`
  - `/pages/favorites.html`
  - `/pages/settings.html`
  - `/pages/legacy.html?module=confession/index.html`
- Direct special pages remain publicly reachable outside the protected shell:
  - `/pages/confession/index.html`
  - `/pages/valentine/index.html`
  - `/pages/omnia-happy-birthday.html`
- `contract.html` is not fail-closed enough: a fake `localStorage` session opened `/pages/contract.html` while `/pages/dashboard.html` still redirected to login under the same spoofed local state.
- The current clean workspace does not contain `assets/photos/` or `assets/videos/`. Runtime asset 404s were therefore real, not hypothetical:
  - dashboard: 3 failed media requests
  - timeline: 84 failed media requests
  - media gallery: 44 failed media requests
  - profile: 4 failed media requests
  - contract: 2 failed avatar/media requests
  - confession special page: 6 failed companion-file requests
- Mobile login rendering stayed inside the viewport with no horizontal overflow in a fresh `iPhone 13` browser emulation.
- Full approved-account browser review is still blocked in this audit because no reusable authenticated approved session was available for the headless runtime pass.

## 2026-07-12 Architecture Decision

Selected direction: `Option C` as the long-term target, with a short `Option B` compatibility bridge and the current static app preserved as the temporary live baseline.

Why:

- the current static app already preserves real product content and some private-account guardrails, so it should remain the rollback baseline for now
- the current implementation pays high maintenance cost for manual root/public mirroring, page-scattered auth/runtime logic, and a mixed sync model
- Gather & Savor proves the engineering stack we want: Vite build output, one routed shell, centralized auth/bootstrap, domain services, lint/test/build discipline, and `dist`-only Hosting
- Couple Book should copy that engineering discipline without copying the event product model, staff-role density, or admin-dashboard identity

What to preserve:

- approved-account-only scope
- Firebase Auth as the identity system
- private, two-person product boundary
- current memory content, special-page concepts, and romantic product voice
- existing live static app as a rollback baseline until cutover

What to replace:

- manual root/public mirroring
- page-by-page auth/routing ownership
- collection-wide `users` reads/listeners in `core/firestoreSync.js`
- direct unauthenticated special-page exposure
- `contract.html` localStorage-only gate
- media-path assumptions that currently point to missing local asset folders

What must wait:

- Firebase Storage initialization
- any destructive Firestore or localStorage migration
- live couple-data schema replacement
- Hosting cutover to a React build

## 2026-07-12 Migration Track

### R0 — Recovery Baseline

- keep the current static app as the live rollback point
- close the documentation truth gap
- keep `npm run check:all` green
- do not rewrite data, rules, or media paths

### R1 — Modern Foundation

- create a separate Vite/React app track
- add lint, test, build, and Hosting-ready `dist/` output
- centralize Firebase bootstrap
- no production switch

### R2 — Auth And Protected Shell

- add `AuthProvider`, `ProtectedRoute`, and one `AppShell`
- preserve approved-account-only enforcement
- do not migrate couple data yet

### R3 — Compatibility Data Adapter

- read current `localStorage` keys and `core/memories.json`
- keep the old product content visible inside the new shell
- no destructive conversion

### R4 — Domain Services

- split auth, user, couple, profile, settings, favorites, contract, sync, and media boundaries
- remove collection-wide `users` reads in the new architecture
- keep offline-safe fallbacks explicit

### R5 — Core Page Migration

- dashboard
- timeline
- gallery
- profile
- favorites
- settings

### R6 — Special Page Integration

- move birthday, Valentine, and confession behind the protected routed shell
- preserve their content while retiring direct public entry paths

### R7 — Responsive System

- keep one mobile/desktop shell
- formalize loading, empty, error, and missing-media states
- remove page-specific nav duplication

### R8 — Data Migration Planning

- define future two-user Firestore domains
- dry-run map current local keys and `users/{uid}` data
- no destructive writes

### R9 — Media/Storage Decision

- only after explicit approval
- only after schema and rule review
- first-upload test must be small, reversible, and private

### R10 — Cutover

- parallel verification against the static baseline
- approved-account smoke
- rollback checkpoint
- Hosting switch only after explicit approval

## Safety And Deploy Status

| Area | Status |
| --- | --- |
| Hosting deploy in recent tracks | no |
| Firestore rules deploy in recent tracks | no new deploy in Phases 8-10 |
| Storage deploy | no |
| Firestore indexes deploy | no |
| Firebase Storage initialized | no |
| Private media touched | no |
| Gather Savor modified | no |

## System Health Audit Snapshot

| Check | Status |
| --- | --- |
| `git status --short --branch` | clean |
| `main` vs `origin/main` at latest run start | matched at `1b48d7970b14c712acf7c82c3c38168dc9cce2fd` |
| `npm run check:all` | pass |
| Rules alignment/dry-run | pass |
| Prototype boundary check | pass |
| Route verification | pass |
| Approved-account authenticated smoke | still `HOLD` |
| `MODULE_TYPELESS_PACKAGE_JSON` warning | fixed in QA lane |

## Approved-Account Smoke Status

| Check | Status |
| --- | --- |
| Overall gate | `HOLD` |
| Jaylan authenticated smoke actually run | yes |
| Partner authenticated smoke actually run | no |
| Guest blocked in current source/unsigned checks | yes |
| Signup disabled | yes |
| Username login disabled | yes |
| Destructive browser admin tools disabled | yes |

### Why Smoke Is Still HOLD

Jaylan was successfully tested in a real browser session after correcting the live Jaylan UID mismatch in Firestore rules. The smoke gate is still `HOLD` because the partner account was not available for testing, so the project still cannot honestly claim `PASS`.

## Open Gates

### Highest Gate

1. Real approved-account smoke for both approved users.

### Architecture Gate

2. Replace collection-wide `users` reads/listeners only after smoke passes.

### UI Gate

3. Keep live redesign work behind route/auth/sync safety confirmation.

### Storage Gate

4. Do not initialize Storage until approved-account smoke passes and a first-upload plan is explicitly approved.

## What Is Blocked

- any claim that authenticated strict-rules behavior is fully closed
- risky live `firestoreSync` replacement while smoke is `HOLD`
- Storage initialization or media migration
- broad live UI shell replacement

## What Can Continue Safely

- documentation cleanup and handbook consolidation
- QA automation improvements
- non-live sync modeling
- non-live prototype refinement
- service-layer planning
- page-by-page redesign planning

## Recent Phase Closeout Summaries

### Latest Workstream Run Summary

- starting commit: `e34591a3eaeac2007203aaf058c43dd7c8d92346`
- Phase 9 track: the repo started with exactly one approved dirty file in `UI_REDESIGN_AND_PROTOTYPE_MASTER.md`, the gallery-scope checkpoint diff was reviewed cleanly, `npm run check:all` passed before implementation, and that planning checkpoint was closed and pushed as `Document live gallery refinement scope`
- Phase 10 track: live sync work was intentionally skipped again and both `core/firestoreSync.js` files remained untouched throughout the gallery batch
- Phase 11 track: the controlled live gallery refinement shipped as a presentation-only pass across the media page structure, renderer language, unavailable-media states, and gallery-specific responsive layout
- Phase 11 result: `/pages/media.html` stayed on the protected route in the authenticated Jaylan session with no redirect loop or permission-denied state, `photos` still showed `79`, `videos` still showed `35`, visible-at-rest card context replaced hover-only metadata, and unavailable local media now resolves into intentional private-memory placeholders instead of blank gray boxes
- checks run in this run: `git status --short --branch`, `git diff --stat`, repeated `npm run check:all`, source review for gallery contracts, authenticated Chrome verification for gallery filters/lightbox/video modal, route verification through the local server, and a separate `390x844` mobile snapshot review generated from the authenticated rendered DOM
- browser sanity result: the gallery now feels much less like a raw import wall, the unavailable photo lightbox and unavailable video modal both present graceful private-memory states, desktop overflow stayed clean, and the mobile snapshot showed no horizontal overflow
- commits completed in this run:
  - `Document live gallery refinement scope`
  - `Refine live gallery experience`
- deploy activity: none
- Gather Savor inspected read-only: unchanged
- Couple Book browser inspected: authenticated Chrome session reused for gallery verification
- private media touched: no
- smoke status: Jaylan approved-account smoke remains `PASS`, partner remains not tested, and overall approved-account smoke remains honestly `HOLD`
- remaining top gate: partner approved-account smoke plus the still-blocked live sync replacement
- next recommended track actions:
  - Phase 9: keep smoke status honest and continue rejecting any unapproved private-media/runtime drift
  - Phase 10: keep live sync replacement blocked until partner smoke passes
  - Phase 11: wait for visual approval of this gallery batch, then choose the next narrow surface-specific polish without touching auth, sync, or memory data

### Prior Workstream Run Summary

- starting commit: `de9f6965c46fd951eb21f3a78f88530dc7595181`
- Phase 9 track: safety baseline stayed green, `npm run check:all` passed across the Favorites correction and the timeline closeout gate, the authenticated Favorites runtime error was reproduced as `TypeError: Cannot read properties of undefined (reading 'food')` in `js/favorites.js:36`, and the fix was already committed cleanly as `Fix Favorites runtime error`
- Phase 9 correction: both Favorites runtime files now normalize the stored object on read, preserve unknown branches, self-heal empty or partial favorites data back to the expected `jaylan` / `omia` category arrays, and render the empty state without changing storage keys, auth, sync, or Firestore rules
- Phase 10 track: live sync work was intentionally skipped again and both `core/firestoreSync.js` files remained untouched throughout the run
- Phase 11 track: the narrow live timeline card-language/class pass verified cleanly in the authenticated Jaylan session and stayed within presentation-only boundaries
- Phase 11 result: `/pages/timeline.html` stayed on the protected route with no auth redirect loop, no permission-denied state, working `special` and `all` filters, working add/detail modal entry points, intact special-page routing, display-only language transforms, and graceful private-memory placeholders for unavailable local media
- checks run in this run: `git status --short --branch`, `git rev-parse main`, `git rev-parse origin/main`, repeated `npm run check:all`, Favorites source review, authenticated Favorites repro and re-check, authenticated timeline verification, route verification through the local server, and a narrow mobile-width timeline observation
- browser sanity result: the timeline now reads more like a shared chronology than an import log, missing local media renders as an intentional private-memory state, and the mobile view stayed inside the viewport without horizontal overflow
- commits completed in this run:
  - `Fix Favorites runtime error`
  - `Refine live timeline story cards`
- deploy activity: none
- Gather Savor inspected read-only: unchanged from prior comparison work
- Couple Book browser inspected: authenticated Chrome session reused for Favorites verification, timeline verification, and the mobile-width timeline observation
- private media touched: no
- smoke status: Jaylan approved-account smoke remains `PASS`, partner remains not tested, and overall approved-account smoke remains honestly `HOLD`
- remaining top gate: partner approved-account smoke plus the still-blocked live sync replacement
- next recommended track actions:
  - Phase 9: keep smoke status honest and leave partner approved-account testing as the remaining overall gate
  - Phase 10: keep live sync replacement blocked until smoke passes
  - Phase 11: begin the controlled live gallery refinement baseline now that the timeline batch is documented and landed cleanly

### Earlier Workstream Run Summary

- starting commit: `bf29ec112a33de6dbb34a98411594757c1ee4226`
- Phase 9 track: safety baseline stayed green, `npm run check:all` passed before planning and will be re-run for closeout, Jaylan approved-account smoke remains `PASS`, partner approved-account smoke remains not tested, and overall smoke remains honestly `HOLD`
- Phase 10 track: live sync work was intentionally skipped again and both `core/firestoreSync.js` files remained untouched
- Phase 11 track: inspected the live timeline/gallery structure, documented why both pages still feel closer to raw inventory than a curated memory-book flow, and aligned the non-live shell prototype around chapter-led timeline and collection-led gallery direction without editing live timeline/gallery files or memory data
- checks run so far: `git status --short --branch`, `git rev-parse main`, `git rev-parse origin/main`, `npm run check:all`, master-doc review, live timeline/gallery source review, prototype review, local dataset shape review, and dev-server verification
- browser sanity result: route and source review were used for this planning batch; an in-app browser attempt initially hit localhost connection refusal before the dev server was restarted, so authenticated visual smoke was not re-claimed or overstated
- commits planned in this run:
  - `Plan timeline and gallery story structure`
- deploy activity: none
- Gather Savor inspected read-only: unchanged from prior comparison work
- Couple Book browser inspected: limited planning-only check
- private media touched: no
- remaining top gate: partner approved-account smoke plus blocked-behavior re-check in a fresh post-rules browser session
- next recommended track actions:
  - Phase 9: keep smoke status honest and run the partner approved-account smoke when credentials/session are available
  - Phase 10: keep live sync replacement blocked until smoke passes
  - Phase 11: if this planning batch stays stable, use the documented next live batch for a narrow timeline card-language/class pass only

### Older Workstream Run Summary

- starting commit: `ec9774e590975219e12a71c0a41e9487958809a9`
- Phase 9 track: safety baseline stayed green again, `npm run check:all` passed before and after the missing-media presentation pass, Jaylan approved-account smoke remains `PASS`, partner approved-account smoke remains not tested, and overall smoke remains honestly `HOLD`
- Phase 10 track: live sync work was intentionally skipped again and both `core/firestoreSync.js` files remained untouched
- Phase 11 track: improved the dashboard’s missing-local-media presentation by marking failed recent-memory cards as intentionally local-only, keeping card layout stable, and surfacing warm fallback copy without touching auth, sync, routes, or memory data
- checks run: `git status --short --branch`, `git rev-parse main`, `git rev-parse origin/main`, `npm run check:all` twice, dashboard renderer/CSS review, master-doc review, dev-server verification, and local Playwright sanity checks for login and dashboard route rendering
- browser sanity result: the dashboard route still rendered its recent-memory cards before unauthenticated routing returned the session to login, the route checks stayed green, and the remaining console errors continued to reflect true local-only missing media paths rather than new UI regressions
- commits in this run:
  - `Improve dashboard missing-media presentation`
- deploy activity: none
- Gather Savor inspected read-only: unchanged from prior comparison work
- Couple Book browser inspected: yes
- private media touched: no
- remaining top gate: partner approved-account smoke plus blocked-behavior re-check in a fresh post-rules browser session
- next recommended track actions:
  - Phase 9: keep smoke status honest and run the partner approved-account smoke when credentials/session are available
  - Phase 10: keep live sync replacement blocked until smoke passes
  - Phase 11: if this presentation batch stays stable, decide whether the next safe step is a similar non-data fallback pass on another surface or non-live planning for timeline/gallery story structure

### Phase 8 Summary

- refreshed baseline and kept smoke honest
- added `authService` wrappers
- mapped the Firestore sync boundary
- expanded QA checks
- expanded the non-live shell prototype
- documented closeout and next queue

Phase 8 commits:

| Commit | Summary |
| --- | --- |
| `26a5a74` | auth service wrapper |
| `9c9c796` | sync boundary mapping |
| `2ef0fec` | QA expansion |
| `2a994c5` | prototype expansion |
| `ba04acf` | closeout and next queue |

### Phase 9 Summary

- kept smoke at `HOLD`
- designed the document-scoped sync replacement
- added non-live sync model helpers and `check:sync-model`
- converted prototype and redesign planning into production checklists
- documented memory-domain and curation planning
- documented closeout and next long-run prompt

Phase 9 commits:

| Commit | Summary |
| --- | --- |
| `931e892` | sync replacement design |
| `e074e3b` | sync model helpers |
| `2c3c18c` | production shell planning |
| `d1d859a` | memory-domain planning |
| `9bc974d` | closeout and next long run |

## Workstream Phase Model

### Phase 9: Maintenance / Safety / QA Corrections

Use `9A`, `9B`, `9C`, and so on for:

- QA fixes
- runtime errors
- mirror drift
- service guardrail fixes
- `check:all` failures
- documentation cleanup
- smoke status updates

### Phase 10: Backend / Sync / Service Layer

Use `10A`, `10B`, `10C`, and so on for:

- auth service improvements
- sync replacement
- service-layer cleanup
- root/public strategy
- Firestore model cleanup

### Phase 11: UI / Redesign / Product Experience

Use `11A`, `11B`, `11C`, and so on for:

- production shell planning
- design token cleanup
- dashboard redesign
- timeline redesign
- gallery/profile/favorites/settings redesign
- special page integration

### Phase 12: Storage / Media Migration

Use `12A`, `12B`, `12C`, and so on later for:

- Storage initialization review
- media metadata introduction
- controlled upload/migration batches

### Phase 13: Future Framework Migration

Use `13A`, `13B`, `13C`, and so on only if explicitly approved for:

- source-of-truth restructuring
- build-pipeline introduction
- Vite/React migration

## Parallel Work Rule

These tracks may move in parallel only when safe.

Examples:

- Phase 9 can fix `check:all` or documentation hygiene
- Phase 10 can continue service/sync planning
- Phase 11 can continue non-live design or implementation planning

If Phase 9 finds a serious safety or runtime failure, it pauses Phase 10 and Phase 11 until fixed.

Do not create new phase docs unless the master docs cannot handle the topic cleanly.

### Reporting Rule

Future long-run reports should be grouped by track:

- Phase 9 track
- Phase 10 track
- Phase 11 track

## Next Run Queue

### Phase 9 Track

- keep smoke status honest
- fix any `check:all` regressions
- keep docs and mirrors clean

### Phase 10 Track

- if smoke is still `HOLD`, stay in planning/non-live sync prep
- if smoke becomes `PASS`, prepare the smallest reversible live sync read replacement

### Phase 11 Track

- allow small reversible live UI cleanup batches
- keep redesign work away from sync/auth/service changes while smoke and sync gates remain unresolved

## Recommended Immediate Order

1. Run real approved-account smoke if credentials/session are available.
2. If both accounts pass, decide whether the next safe batch should be the smallest live sync read replacement or the first dashboard story-hierarchy cleanup.
3. Otherwise continue Phase 9 and only small reversible Phase 11 UI cleanup without changing live sync behavior.
