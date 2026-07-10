# Project Status And Phases

Date: 2026-07-09

## Current Repo Status

| Item | Status |
| --- | --- |
| Current branch | `main` |
| Latest verified commit at consolidation start | `1b48d7970b14c712acf7c82c3c38168dc9cce2fd` |
| Repo clean at consolidation start | yes |
| `main` matches `origin/main` at consolidation start | yes |
| App type | static multi-page HTML/CSS/JS |
| Runtime publish root | `public/` only |
| Primary local state | `localStorage` |
| Cloud sync boundary | `core/firestoreSync.js` |

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

### Prior Workstream Run Summary

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

### Earlier Workstream Run Summary

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
