# UI Redesign And Prototype Master

Date: 2026-07-09

## Product Identity

Couple Book is a private two-person romantic memory app.

It should feel:

- private
- premium
- warm
- story-led
- emotionally intentional

It should not feel like:

- an admin dashboard
- an event app
- a public social product
- a raw file browser

## Design Direction

### Typography

- serif for emotional anchors
- refined sans for structure and controls
- avoid multi-brand feeling between login, core app, and special pages

### Color

- warmer layered palette
- parchment / cream / blush / deep plum directions
- strong contrast, no washed-out pastels

### Card Hierarchy

- hero cards
- story cards
- utility cards
- restrained chips/tags

The current app overuses one generic `glass-card` pattern and needs clearer hierarchy.

## Protected Shell

### Shell Principles

- one coherent protected shell
- one mobile/desktop nav model
- one page-header pattern
- story content above status content
- special pages remain distinct but better integrated

### Future Shell Zones

- private frame
- primary navigation
- page header
- emotional hero zone
- story content zone
- lower-emphasis private health/status zone
- special moments entry zone

## Component Map

Future component families:

| Domain | Components |
| --- | --- |
| Shell | `AppShell`, `ProtectedRouteEquivalent`, `HealthStatusPanel` |
| Story | `StoryHero`, `MemoryCard`, `MemoryTimeline`, `MemoryDetail` |
| Media | `GalleryGrid`, `MediaCard`, `MediaViewer` |
| Relationship | `ProfilePair`, `FavoritesPanel`, `ContractPanel` |
| Special moments | `SpecialPageEntry`, `SpecialPageFrame` |
| Shared UI | `EmptyState`, `LoadingState`, `ErrorState`, `SyncStatusChip`, `FutureFeatureBadge` |

## Prototype Rules

The non-live shell prototype at `prototypes/couplebook-shell/` is valid only as planning input.

Rules:

- stay outside `public/`
- use placeholder-only content
- no Firebase
- no auth wiring
- no private media
- no production routing

## Prototype Summary

Current prototype direction already demonstrates:

- home / story / gallery / us / favorites / settings sections
- lower-emphasis private health/status placement
- curated special moments area
- better desktop/mobile rhythm direction

This prototype is not a direct code source for the live app.

## Phase 11 Status

Latest non-live work kept the redesign track moving without touching the deployed app:

- smoke stayed `HOLD`, so no live shell replacement started
- the prototype remains outside `public/` with placeholder-only content
- mobile shell preview remains the safe proving ground for nav rhythm and active-state behavior
- special moments entry and private-health placement keep getting refined in the prototype before any live CSS batch
- shared loading/empty/error placeholders now have prototype-only examples, which should later map to real shared UI states
- the home view now previews a clearer dashboard-to-story-to-gallery flow instead of isolated cards only
- gallery, profile-pair, and favorites previews now model more specific future content groupings instead of generic filler cards
- keyboard-safe nav behavior is now prototyped so future shell work has a clearer accessibility baseline

## Phase 11 Browser Experience Findings

The live Couple Book browser pass confirmed that the product already has emotional material worth preserving, but the protected experience still feels more like a collection of static themed pages than one coherent private app.

### What feels weird

- the protected area behaves like separate HTML screens with one injected nav shell instead of one continuous app
- the dashboard opens with counters, clocks, and utility cards before it establishes a strong emotional story
- pages do not share one obvious page-header rhythm, action area, or content hierarchy
- the same `glass-card` treatment is used for nearly everything, so emotional moments, utility controls, and admin-like status all compete at the same volume

### What feels unfinished

- memory titles and descriptions still read like generated file metadata in many places instead of authored story moments
- timeline and gallery entries feel repeated and mechanically shaped, so the content surface starts to resemble a file browser
- favorites still reads as a side-by-side list editor instead of a cherished shared-space feature
- settings remains visually heavier than it should be for a private scrapbook product

### What feels unlike a real app

- the dashboard, timeline, gallery, profile, favorites, and settings pages are structured as isolated page templates instead of views inside one stable product shell
- page-level inline styles and one-off layouts make the experience feel handcrafted page-by-page rather than assembled from a shared system
- the product has navigation, but not a strong route-to-route workflow or page transition rhythm

### What feels too static or admin-like

- dashboard counters, birthdays, and quick-nav cards are useful but make the first view feel utility-led
- timeline filtering and gallery filters feel functional, but they do not yet create a story-led browsing rhythm
- settings still carries a lot of health, sync, and account framing, which is necessary, but should live lower in the visual hierarchy

### What is emotionally strong and should be preserved

- the product premise is strong: a private two-person memory book with relationship milestones, special pages, and shared memories
- birthday, Valentine’s, and confession pages have stronger emotional identity than the main shell and should remain distinct
- the dual-anniversary concept is unique and worth preserving, but it should become supporting context inside a stronger hero composition
- the profile and contract idea is valuable because it frames the relationship as shared intentional space instead of generic account settings

### Browser-specific observations

- the live dashboard does render real content and feels more alive than a blank prototype, but its first impression is still card-heavy and structurally flat
- the timeline and gallery clearly expose the current local-media-first model, which is useful internally but reads too much like raw asset inventory
- an unauthenticated browser pass still lands on the focused private-login page correctly, which is good, but the protected product experience behind it needs a more app-like shell
- in-app browser attachment was flaky during this run, so the verified page inspection was completed through terminal Playwright against the local app instead

### Mobile/responsive observations

- the current live structure appears likely to stack into long card columns rather than preserve a strong mobile reading rhythm
- because the shell is injected per page instead of structurally persistent, mobile navigation cohesion is still weaker than it should be
- the prototype should continue proving mobile dock and section-order decisions before any live shell batch

### What should be redesigned first

- first: shared shell structure, page-header rhythm, and token hierarchy
- second: dashboard hero/story ordering
- third: timeline card language and gallery curation structure
- fourth: favorites/profile/settings so they feel like parts of the same product instead of side modules

## Production Implementation Checklist

Safe concepts to move later:

- shell layout ideas
- nav structure
- hero hierarchy
- story-card hierarchy
- health/status lower-emphasis placement
- special moments entry area

Do not copy directly:

- placeholder data
- fake prototype interactions
- non-live labels
- prototype-only JS assumptions

### Static-App Implementation Path

1. CSS token pass
2. shared shell class naming
3. nav refactor
4. page-header standard
5. dashboard hero
6. memory card system
7. mobile nav rhythm

### Future Vite/React Path

Potential future implementation components:

- `AppShell`
- `ProtectedRoute`
- `StoryHero`
- `MemoryCard`
- `GalleryGrid`
- `ProfilePair`
- `HealthStatusPanel`

## Live UI Redesign Batches

| Batch | Goal | Must not change |
| --- | --- | --- |
| 1 | token/CSS cleanup only | behavior, auth, sync, routes |
| 2 | shell/nav framing | rules, sync, login gate |
| 3 | dashboard story-first redesign | sync/data model |
| 4 | timeline and memory-card redesign | memory dataset, auth posture |
| 5 | gallery/profile/favorites/settings redesign | safety boundaries, private media exclusion |
| 6 | special page integration strategy | special-page intent, companion-media safety |

## What Not To Copy From Gather Savor

Copy only:

- app-shell discipline
- service-boundary discipline
- QA and docs hygiene
- explicit non-live boundaries

Do not copy:

- event branding
- event workflows
- admin-heavy language
- staff/scanner/registration/ticketing models

## Gather Savor Structural Reference Findings

Gather Savor feels stronger because it behaves like a modern application from the inside out, not because of its event-specific branding.

### Stack comparison

- Gather Savor uses Vite + React + React Router with a clear `src/` application structure, while Couple Book is still a static multi-page HTML/CSS/JS app with root/public mirroring
- Gather Savor has explicit build, lint, test, and QA scripts; Couple Book currently relies on a custom static server plus project-specific safety checks
- Gather Savor treats Firebase config, environment wiring, and runtime bootstrapping as app infrastructure instead of scattering that logic across multiple page entry points

### Routing comparison

- Gather Savor has one route tree in `src/App.jsx` with protected route logic and nested layouts
- Couple Book relies on page-to-page HTML navigation with auth redirects injected by runtime scripts
- this is a major reason Gather Savor feels like one product while Couple Book feels like adjacent themed pages

### Shell comparison

- Gather Savor uses one persistent `AppShell` with shared header, sidebar, mobile nav, title mapping, and role-aware structure
- Couple Book injects its nav shell centrally, which is better than duplicating nav markup manually, but it still does not create the same persistent app-frame discipline
- Gather Savor’s shell establishes navigation rhythm, page identity, and workflow continuity before page-specific content loads

### Component comparison

- Gather Savor breaks pages into reusable component and provider boundaries
- Couple Book mostly composes page-specific templates with shared CSS classes and ad hoc inline layout decisions
- Gather Savor therefore feels more intentional, while Couple Book feels more handcrafted but less systemized

### Service comparison

- Gather Savor separates auth, Firebase bootstrap, layout, page logic, and service concerns cleanly
- Couple Book has begun moving toward service boundaries, but live sync is still blocked behind `core/firestoreSync.js`
- the service discipline gap affects maintainability more than visual styling alone

### QA comparison

- Gather Savor has stronger conventional app discipline: lint, tests, QA folders, Firebase testing hooks, and clearer README guidance
- Couple Book now has meaningful custom safety checks, but still lacks the broader frontend engineering feedback loop that makes larger UI work safer

### Browser feel comparison

- Gather Savor likely feels stronger because every page sits inside one consistent routed shell and follows one interaction grammar
- Couple Book has richer romantic identity, but the structural framing around that identity is still weaker
- Gather Savor feels like a finished app framework; Couple Book feels like a meaningful private project that has not yet been structurally unified

### What to copy structurally

- one durable app shell
- one route/view ownership model
- one page-header rhythm
- clearer service boundaries
- stronger component naming and composition discipline
- better QA and runbook hygiene

### What not to copy

- event operations language
- staff/admin workflow density
- ticketing/check-in mental model
- business SaaS tone
- event-brand visual identity

## Couple Book Future Structure Decision

### Option A: Keep the static app and refine it

- speed: fastest
- risk: lowest short-term engineering risk
- design quality: moderate improvement only because structure remains page-fragmented
- maintainability: still limited by root/public mirroring, page duplication, and script-driven shell injection
- Firebase/auth impact: lowest immediate risk
- localStorage/media impact: minimal disruption

This is safe, but it will only partially fix why the app feels structurally strange.

### Option B: Hybrid bridge now

- speed: moderate
- risk: controlled if kept behind current smoke and sync gates
- design quality: strong improvement because shell hierarchy, tokens, page headers, and card systems can be unified before a framework migration
- maintainability: much better if the static runtime is gradually reorganized around clearer shell/component/service boundaries
- Firebase/auth impact: manageable because auth and sync behavior can remain stable while the surface is refined
- localStorage/media impact: compatible with the current local-first model

This is the best near-term path. It improves the real product feel without forcing a risky framework migration while smoke and live sync replacement are still gated.

### Option C: Full Vite/React migration later

- speed: slowest
- risk: highest in the near term
- design quality: highest long-term ceiling
- maintainability: strongest eventual outcome if the data model and shell are already clarified first
- Firebase/auth impact: significant because routing, protected-shell behavior, and sync ownership all move at once
- localStorage/media impact: requires deliberate migration planning so the current local media and memory assumptions are not broken

This should remain Phase 13 only, after the live sync boundary is safer and the intended product shell is already proven.

### Recommendation

Use Option B now.

- keep the static app for the immediate production path
- use the non-live prototype and master docs to lock the future shell, page hierarchy, and component map
- after smoke and sync gates allow it, apply the redesign in small production batches
- keep full Vite/React migration as a later explicit decision, not as a side effect of design cleanup

## First Real Refinement Sequence

### Phase 11B: Live CSS token pass

- reduce generic `glass-card` overuse
- establish stronger type scale, spacing rhythm, and card hierarchy
- standardize page headers and section spacing

### Phase 11C: Shell and nav class structure

- keep current behavior, but make the live shell feel persistent and product-like
- define one page-header pattern and one content-frame rhythm
- separate primary journey nav from quieter utility/settings entry points

### Phase 11D: Dashboard story-first redesign

- open with a stronger shared-story hero
- move counters and health/supporting status lower
- connect dashboard flow directly into timeline, gallery, and special moments

### Phase 11E: Timeline and story cards

- replace file-like memory phrasing with authored story cards
- group memories into chapters, milestones, and resurfaced moments
- make filters quieter and subordinate to story flow

### Phase 11F: Gallery, profile, favorites, and settings

- make gallery feel curated rather than dumped
- make profiles feel like one shared relationship frame
- give favorites more meaning and better data grouping
- keep settings private and safe, but visually lower-emphasis

### Phase 13: Future migration only if approved

- move to Vite/React only after the product shell, service boundaries, and sync direction are already clear
- treat framework migration as an implementation upgrade, not as the first design fix

## Phase 11 Live Token Pass Scope

This first live Phase 11 batch is intentionally small, shared, and reversible.

### Files Likely Touched

- shared live CSS in `css/` and `public/css/`
- protected page markup in:
  - `dashboard.html`
  - `timeline.html`
  - `media.html`
  - `profile.html`
  - `favorites.html`
  - `settings.html`
- both root and `public/` mirrors for any touched runtime file

### What Will Change

- shared token refinement for spacing, card rhythm, and page-header hierarchy
- additive card tiers for hero, story, and utility surfaces
- one reusable protected-page header pattern
- slightly calmer shell rhythm so the app feels more like one product and less like isolated screens
- lower visual emphasis for utility/settings-heavy blocks where safe

### What Will Not Change

- auth behavior
- sync or Firestore behavior
- `core/firestoreSync.js`
- `public/core/firestoreSync.js`
- data model or localStorage behavior
- routes
- special-page content
- private media handling
- Firebase rules
- framework/runtime architecture

### Stop Conditions

- any `check:all` regression
- any mirror drift that cannot be corrected safely
- any route or auth regression
- any sign that the batch is turning into a broad redesign instead of a shared token/header pass

## Current UI Risks

- dashboard still feels utility-led
- special pages are emotionally stronger than the shell
- favorites remains structurally weak
- legacy special-page loading is not a long-term product solution
- root/public duplication makes live UI refactors more fragile

## Phase 11 Live Token And Header Pass Summary

The first controlled live Phase 11 batch is now complete.

### Files Touched

- `css/variables.css`
- `css/global.css`
- `css/components.css`
- `css/pages.css`
- `pages/dashboard.html`
- `pages/timeline.html`
- `pages/media.html`
- `pages/profile.html`
- `pages/favorites.html`
- `pages/settings.html`
- mirrored `public/` versions of the same runtime files

### What Changed Visually

- added a shared protected-page header pattern for the main protected pages
- introduced additive card tiers for hero, story, and utility surfaces
- tightened shared shell spacing and max-width rhythm
- softened the generic glass-card sameness without changing app behavior
- gave settings and other utility-heavy areas slightly calmer visual emphasis
- made the dashboard first impression more intentional through header framing, not through a broad layout rewrite

### What Did Not Change

- auth logic
- sync behavior
- Firestore rules
- data model
- localStorage behavior
- routes
- special-page content
- private media handling
- prototype location and non-live boundaries

### Browser And Sanity Result

- `npm run check:all` passed after the live UI cleanup
- mirror alignment stayed green
- login page still renders correctly
- protected dashboard header cleanup was visually observed in a live browser render during this batch
- later protected-route jumps in the automation browser fell back to login once an approved authenticated session was no longer maintained, so protected-page visual verification should still be treated as partial rather than full smoke
- standalone Valentine and confession pages still load, and the confession page still shows the known local-only companion media 404s rather than any new UI regression

### Remaining UI Risks

- the dashboard is more coherent, but it is still not story-first enough
- timeline and gallery content still read too much like memory inventory
- favorites still needs deeper structural improvement beyond this rhythm pass
- settings is calmer, but its internals still rely heavily on page-local markup and inline styling

### Next Phase 11 Step

If this batch stays stable, the next safe UI step is a small dashboard and section-hierarchy refinement pass only, still without touching sync or auth.

## Phase 11 Dashboard Story-Hierarchy Scope

This second live Phase 11 batch stays dashboard-only and keeps the previous token/header pass intact.

### What Will Change

- reorder the live dashboard so story surfaces appear before clocks, counters, and lower utility
- elevate recent memories into a clearer featured story area
- introduce a small dashboard-only hero band and supporting section framing
- keep special-page entry points closer to the emotional flow without changing those pages themselves
- push quick navigation lower so it behaves like supporting navigation instead of the first story beat

### What Will Not Change

- auth logic
- sync logic
- `core/firestoreSync.js`
- `public/core/firestoreSync.js`
- data model or localStorage behavior
- routes
- special-page internals
- private media handling
- Firebase rules
- timeline, gallery, profile, favorites, or settings redesign work

### Files Likely Touched

- `pages/dashboard.html`
- `public/pages/dashboard.html`
- `css/pages.css`
- `public/css/pages.css`
- this master doc

### Stop Conditions

- any `npm run check:all` regression
- any root/public mirror drift
- any broken dashboard selector, route, or auth behavior
- any sign the change is becoming a broad redesign instead of a small hierarchy pass

## Phase 11 Dashboard Story-Hierarchy Pass Summary

The second controlled live Phase 11 batch is now complete.

### Files Touched

- `pages/dashboard.html`
- `public/pages/dashboard.html`
- `css/pages.css`
- `public/css/pages.css`
- this master doc

### What Changed Visually

- added a dashboard-only story entrance band above the main grid
- moved recent memories into a clear featured chapter area ahead of clocks and counters
- lowered quick navigation so it behaves like support navigation instead of the first emotional beat
- grouped anniversary counters and birthdays as supporting milestone context
- pulled the birthday, Valentine, and confession entry points closer to the dashboard flow without changing those pages

### What Did Not Change

- auth logic
- sync logic
- `core/firestoreSync.js`
- `public/core/firestoreSync.js`
- routes
- Firestore rules
- private media handling
- memory data or rendering logic
- timeline, gallery, profile, favorites, and settings layout work

### Browser And Sanity Result

- `npm run check:all` passed before and after the hierarchy pass
- root/public mirror alignment stayed green
- local route checks stayed `200`
- a local Playwright render pass confirmed the new story-first dashboard order and preserved recent-memory containers and quick-nav links
- the render pass was unauthenticated, so it is layout sanity only and not a replacement for full approved-account smoke
- console noise during the render matched known local gaps: missing local media fallback files and missing `favicon.ico`

### Remaining Dashboard Risks

- some recent-memory images still 404 locally when their private companion files are not present at the requested paths
- the fallback asset path `/assets/photos/anniversary_2025.png` is still missing locally, so image fallback polish remains unfinished
- the dashboard now reads more like a private memory book entrance, but the broader app still has page-by-page structure differences

### Next Phase 11 Step

If this batch stays stable, the next safe UI step should remain small and reversible: either a narrow dashboard polish pass for known local fallback rough edges or a non-live planning pass for timeline/gallery story structure, still without touching sync or auth.

## Phase 11 Dashboard Fallback Polish Scope

This third controlled live Phase 11 batch stays narrow and presentational.

### Safe Fallback Issues Found

- the dashboard recent-memory fallback still points at `/assets/photos/anniversary_2025.png`, which is not present and creates avoidable extra 404 noise
- the app currently has no favicon file at `/favicon.ico`, so the browser always requests a missing asset during sanity checks

### Private Or Local-Only Media Issues That Must Stay Unfixed Here

- recent-memory cards can still reference real local private media paths under `/assets/photos/` and `/assets/videos/`
- if those private files are absent in the local environment, those original requests may still 404 and should not be “fixed” by recommitting relationship media
- special-page companion media remains local-only and outside this polish pass

### Files Likely Touched

- `js/app.js`
- `public/js/app.js`
- `js/dashboard.js`
- `public/js/dashboard.js`
- `favicon.ico`
- `public/favicon.ico`
- this master doc

### What Will Not Change

- auth logic
- sync logic
- `core/firestoreSync.js`
- `public/core/firestoreSync.js`
- memory data
- routes
- Firestore rules
- private media handling
- timeline, gallery, profile, favorites, and settings redesign work

### Stop Conditions

- any `npm run check:all` regression
- any root/public mirror drift
- any sign private media would need to be recommitted
- any route, auth, or dashboard selector regression

## Phase 11 Dashboard Fallback Polish Summary

The third controlled live Phase 11 batch is now complete.

### Files Touched

- `js/app.js`
- `public/js/app.js`
- `js/dashboard.js`
- `public/js/dashboard.js`
- `favicon.ico`
- `public/favicon.ico`
- this master doc

### What Fallback Issue Was Fixed

- replaced the dashboard’s avoidable recent-memory fallback path with a public-safe inline SVG placeholder
- made recent video cards reveal that safe placeholder instead of silently collapsing if a local video file is missing
- added a real favicon response so the app no longer emits the avoidable missing `/favicon.ico` request during browser sanity checks
- replaced the shared shell’s guest/default avatar fallback with a public-safe inline avatar so the dashboard no longer asks for that missing bitmap while unauthenticated

### What Private Or Local Media Issue Remains Intentionally Unfixed

- the dashboard can still hit 404s for actual local-only memory records whose `mem.media` path points at excluded private files
- one remaining dashboard 404 still points at `/assets/photos/anniversary_2025.png` because that file is referenced directly by current memory data, and this pass did not change memory records or recommit media
- special-page companion media remains local-only and outside this cleanup batch

### Browser And Sanity Result

- `npm run check:all` passed before and after the fallback polish
- root/public mirror alignment stayed green
- local route checks for login, dashboard, Valentine, confession, and birthday stayed `200`
- a Playwright login render no longer reported the prior missing favicon asset
- a Playwright dashboard render kept the story hierarchy intact and reduced console noise to the true local-only missing memory paths plus the expected health-check warning for no active session

### Remaining Dashboard Risks

- the remaining dashboard 404s now come from data-owned local-only media references, not from public-safe fallback assets
- the unauthenticated dashboard still logs the expected health-check warning because there is no active session during this sanity path
- broader timeline/gallery/profile/favorites/settings structure work is still out of scope for this batch

### Next Phase 11 Step

If this batch stays stable, the next safe UI step should stay narrow: either a review of how to present data-owned missing local media more gracefully without mutating memory records, or a non-live planning pass for timeline/gallery story structure.

## Phase 11 Missing Local Media Presentation Scope

This fourth controlled live Phase 11 batch stays dashboard-focused and presentational.

### Missing-Media States Found

- dashboard recent-memory cards can still fall back from real local image paths to the safe inline placeholder
- dashboard recent-memory video cards can silently collapse into a placeholder image when the local file is unavailable
- the current fallback preserves card structure, but it does not clearly tell the user that the original media remains private and local-only

### What Will Be Improved

- keep dashboard memory cards stable when local media is missing
- reveal clear, warm missing-media copy only when a real local file fails
- keep the story title and date visible while making the unavailable state intentional instead of ambiguous

### What Will Not Be Changed

- memory data or `core/memories.json`
- routes
- auth or sync logic
- `core/firestoreSync.js`
- `public/core/firestoreSync.js`
- private media handling
- timeline, gallery, profile, favorites, or settings redesign

### Files Likely Touched

- `js/dashboard.js`
- `public/js/dashboard.js`
- `css/pages.css`
- `public/css/pages.css`
- this master doc

### Stop Conditions

- any `npm run check:all` regression
- any root/public mirror drift
- any memory-data mutation
- any route, auth, sync, or selector regression

## Phase 11 Missing Local Media Presentation Summary

The fourth controlled live Phase 11 batch is now complete.

### Files Touched

- `js/dashboard.js`
- `public/js/dashboard.js`
- `css/pages.css`
- `public/css/pages.css`
- this master doc

### What Was Improved

- dashboard recent-memory cards now mark failed local media as an intentional unavailable state instead of only swapping the image silently
- missing local image and video cards keep their structure, title, and date while surfacing warm copy that explains the media remains private and local-only
- the unavailable state now uses explicit card styling and copy so the placeholder reads as preserved story context instead of a broken thumbnail

### What Remains Intentionally Local-Only

- actual private media files under `/assets/photos/` and `/assets/videos/` remain excluded and unfixed in Git/public
- memory records that point at those local-only files still make the browser request the original path first
- special-page companion media remains intentionally local-only and outside this dashboard batch

### Browser And Sanity Result

- `npm run check:all` passed before and after the presentation pass
- root/public mirror alignment stayed green
- local route checks for login, dashboard, Valentine, confession, and birthday stayed `200`
- Playwright confirmed the dashboard route still renders its recent-memory cards before unauthenticated routing returns to login
- remaining console noise stayed honest and limited to the real local-only missing media paths plus the expected no-session health-check warning

### Remaining UI And Media Risks

- the browser still requests the original memory path first, so local-only missing media will continue to log real 404s until the data model or media strategy changes
- unauthenticated browser sanity cannot stand in for full approved-account protected-route smoke
- this pass is dashboard-only and does not yet extend the same presentation pattern to timeline or gallery

### Next Phase 11 Step

If this batch stays stable, the next safe UI step should remain narrow: either apply the same graceful missing-local-media presentation pattern to another already-approved surface without mutating data, or move into non-live planning for timeline/gallery story structure.

## Next Safe UI Step

While smoke is `HOLD`:

- allow only small reversible live UI batches like token, header, hierarchy, and spacing cleanup
- do not replace the live shell
- do not mix UI redesign with live sync changes

If smoke becomes `PASS` and sync risk is under control:

- move from dashboard hierarchy cleanup into the first timeline/gallery content-structure pass
