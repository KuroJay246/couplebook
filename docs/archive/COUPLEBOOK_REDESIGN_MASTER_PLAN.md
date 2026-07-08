# CoupleBook Redesign Master Plan

Date: 2026-07-08
Scope: redesign and refactor roadmap only. No runtime code changes, no deploys, no media upload, and no framework migration are performed in this phase.

## A. Product Identity

### What Couple Book Is

Couple Book is a private two-person relationship memory app. It is not a public social platform, not a generic photo vault, and not an admin dashboard. Its purpose is to help two approved people keep, revisit, and shape their shared story through memories, media, milestones, favorites, profiles, and deeply personal special pages.

### Emotional Design Direction

The long-term experience should feel:

- romantic
- private
- premium
- soft but intentional
- story-led instead of widget-led
- personal without becoming childish
- warm without becoming cluttered

The strongest emotional references inside the current repo are the special pages, not the protected app shell. The redesign should bring that emotional clarity into the core app without making the product fragile or chaotic.

### Privacy Promise

Couple Book must remain:

- limited to the two approved Firebase Auth users
- private-by-default in Firestore and Hosting posture
- free of public media exposure
- strict about local-only/raw media staying out of Git and `public/`
- explicit about what is not yet live, especially Storage-backed media

### What It Is Not

Couple Book is not:

- a business admin console
- an event app
- a public content site
- a social feed
- a raw file browser
- a quick patchwork of unrelated HTML pages

## B. Preserve List

The following must survive the redesign/refactor:

- private two-approved-user access model
- current Firestore privacy posture and fail-closed rules model
- route protection and login gate
- dashboard, timeline, gallery, profile, favorites, settings, contract, and special pages as product domains
- birthday, Valentine’s, and confession content intent
- local media exclusion from Git and Hosting
- graceful fallback for excluded special-page companion media
- deploy discipline and QA checks
- localStorage-first stability until a deliberate replacement is ready

## C. Redesign Priorities

### 1. Dashboard

Current problem:

- reads like a utility board with counters and quick-nav widgets

Redesign goal:

- make the home page feel like the entrance to a shared private scrapbook

Direction:

- elevate one emotional hero area
- turn recent memories into story cards rather than technical summaries
- demote purely operational widgets
- make milestones, birthdays, and anniversaries feel cherished rather than numeric

### 2. Sidebar / Navigation

Current problem:

- multiple navigation personalities and inconsistent route framing

Redesign goal:

- one coherent protected shell across desktop and mobile

Direction:

- one primary shell
- one consistent route map
- one mobile nav strategy
- explicit places for special pages without making them feel bolted on

### 3. Memory Cards

Current problem:

- cards feel like records or media entries, not curated memories

Redesign goal:

- treat each memory as a story fragment

Direction:

- better hierarchy for title, date, emotional context, media preview, and tags
- distinguish authored memories from imported/raw captures
- improve empty states and detail views

### 4. Gallery

Current problem:

- gallery is just a media filter over memories

Redesign goal:

- create a true private gallery domain

Direction:

- curated grouping
- better photo/video presentation
- future albums or collections concept
- clear boundary between local-only now and Storage-backed later

### 5. Profiles

Current problem:

- profile editing is functional but form-heavy and plain

Redesign goal:

- make the profile area feel like a shared identity space

Direction:

- reduce utilitarian form tone
- strengthen paired presentation
- better biography, favorites, and couple-context framing

### 6. Favorites

Current problem:

- currently the weakest feature in both data model and UI

Redesign goal:

- make favorites feel intimate and expressive

Direction:

- replace prompt-driven interaction with structured editing
- make categories feel like “things we love” instead of raw lists

### 7. Settings

Current problem:

- still reads too much like an admin/control surface

Redesign goal:

- keep safety, reduce ops flavor

Direction:

- split private app health from emotional/product settings
- keep destructive or sensitive actions contained and sober
- turn technical diagnostics into a lower-emphasis health/status section

### 8. Special Pages

Current problem:

- emotionally strongest pages are structurally isolated

Redesign goal:

- preserve their personality while integrating them into the broader product identity

Direction:

- keep them distinct
- remove long-term dependence on iframe-style legacy framing
- plan for future companion-media strategy without recommitting local media

### 9. Mobile Experience

Current problem:

- responsive behavior exists, but mostly as layout collapse

Redesign goal:

- one truly intentional mobile shell

Direction:

- stronger page rhythm
- better touch-target and nav behavior
- memory-first mobile flows

## D. Architecture Priorities

### 1. Service Layer

Priority:

- high

Reason:

- current UI modules know too much about storage, state shape, and sync assumptions

Plan:

- introduce thin domain services first
- make `core/firestoreSync.js` smaller over time
- centralize Firebase SDK usage

### 2. Firestore Sync Cleanup

Priority:

- highest technical risk

Plan:

- replace collection-wide `users` reads/listeners with owner-scoped reads
- separate sync concerns from page rendering
- move diagnostics behind service boundaries

### 3. Root/Public Duplication Strategy

Priority:

- high

Current rule:

- keep mirrors aligned until a deliberate transition exists

Future direction:

- stop maintaining two source trees manually
- eventually move to one authoritative source and one generated/published output path

### 4. Future Build System Decision

Recommendation:

- do not redesign heavily on the permanent static mirrored architecture
- use a hybrid transition toward a Vite/React-style shell later

### 5. Firebase Config / Env Handling

Priority:

- medium-high

Plan:

- move toward one shared bootstrap module
- preserve current auth/rules behavior exactly
- avoid fake fallback configuration

### 6. QA Automation Expansion

Priority:

- high

Plan:

- keep `check:all`
- add lint/test/build discipline when architecture can support it
- add targeted helper/service tests before broad UI changes

## E. Backend Strategy

### Which Gather Savor Backend Patterns To Reuse

- central service boundaries
- explicit config bootstrap
- strong docs/status gating
- deny-by-default future data domains
- read-only placeholders for future workflows

### Which Patterns To Avoid

- role-heavy access model
- event-scoped assignment complexity
- operations-first data vocabulary
- overgrown settings/status copy in the user-facing product shell

### How Couple Book Data Should Differ

Couple Book should model:

- users
- profiles
- memories
- favorites
- settings
- anniversary/birthday config
- special-page metadata
- future media metadata

It should not inherit Gather Savor’s event/registration/ticket/operations worldview.

### Backend Model Direction

Short-term:

- keep localStorage-first runtime intact
- keep Firestore limited to the private couple scope already in place

Mid-term:

- separate shared couple data from user-owned profile/settings data more clearly
- reduce direct reads and writes in UI modules

Later:

- add Storage-backed media metadata only after approved-account smoke and Storage planning gates pass

## F. Frontend Strategy

### Short-Term

- keep the static app running
- avoid large UI surgery on the current architecture
- document page map, shell map, and component candidates
- make only targeted architecture and safety improvements

### Mid-Term

- prepare one future protected shell concept
- extract reusable domain patterns and token usage
- define the new page/component map before migration

### Long-Term

- migrate the protected core app to a Vite/React-style architecture
- preserve the product domains, not the current file layout

### Suggested Component / Page Map

Future page domains:

- login
- home/dashboard
- memories timeline
- memory detail or modal system
- gallery
- profiles
- contract
- favorites
- settings
- special page hub or special page entry points

Future component families:

- shell/nav
- story cards
- memory cards
- media cards/lightbox/modal
- milestone counters
- profile panels
- favorites lists/editor
- settings panels
- health/status panels

### Layout Shell Concept

- one protected shell
- one persistent nav model
- one page-header pattern
- one mobile bottom-nav or drawer strategy
- clear visual separation between “story”, “utility”, and “private system health”

### Design System Concept

- romantic but restrained typography
- fewer generic glass cards
- stronger hierarchy with hero/section/card tiers
- more intentional spacing rhythm
- softer warm palette without losing contrast
- motion used to support storytelling, not to decorate every interaction

## G. Media Strategy

### Current Rule

- keep media local-only
- do not initialize Storage yet
- do not move raw private assets into Git or `public/`

### Future Rule

- Storage later, only after gates pass
- media blobs stay out of source control
- Firestore should store metadata, not raw media

### Metadata Model Direction

- each memory can later reference zero or more media metadata records
- gallery should become a curated projection over media metadata, not just raw file paths
- special pages should later resolve companion media through approved metadata/service paths

### Special-Page Media Strategy

- keep current graceful fallbacks
- do not re-add excluded companion files
- later replace hardcoded local assumptions with service-backed media resolution

## H. Implementation Roadmap

### Next 3 Phases

#### Phase 1: Approved-Account Smoke And Architecture Readiness Closeout

Goals:

- complete real approved-account smoke with both approved users
- confirm strict live rules do not break normal private app usage
- freeze the current live baseline before UI or architecture work

#### Phase 2: Service-Layer Foundation And Sync Boundary Cleanup

Goals:

- introduce shared Firebase client/service wrappers
- reduce direct Firestore access in auth/diagnostics/settings first
- prepare the extraction path away from `core/firestoreSync.js`

#### Phase 3: Product Model And Shell Blueprint

Goals:

- define future shell structure
- define page/component map
- classify current memory/media/story data into curated product domains
- decide how special pages join the future shell without losing identity

### Three Phases After That

#### Phase 4: Shell Refactor Without Full Visual Overhaul

- unify navigation and page framing
- reduce duplicated layout behavior
- keep runtime behavior stable

#### Phase 5: Dashboard And Memory Experience Redesign

- redesign the home and timeline experiences around story-first hierarchy
- improve card language and empty states

#### Phase 6: Gallery / Profiles / Favorites / Settings Redesign

- redesign the weaker feature surfaces
- preserve safety and private-account posture

### What Must Wait Until Approved-Account Smoke Passes

- any claim that the hardened auth/rules rollout is fully closed
- any deeper refactor that assumes authenticated runtime behavior is already fully verified
- any Storage initialization or media migration
- any change that would obscure whether failures come from rules/auth or the redesign work

### What Can Safely Happen Now

- documentation
- architecture/service planning
- source-of-truth mapping
- sync boundary cleanup planning
- non-destructive shell/data model preparation

## I. Red-Team Risks

### What Can Break

- route protection and auth redirect behavior during shell changes
- localStorage/cloud sync consistency during service-layer extraction
- special-page loading during legacy/shell integration work
- root/public parity during any multi-file refactor

### What Can Leak Data

- accidental reintroduction of private media into Git or `public/`
- broad Firestore reads creeping back in
- premature Storage initialization or over-broad rules
- any future build or deploy path that publishes the wrong directory

### What Can Cause Design Drift

- copying Gather Savor’s admin/event language instead of translating its structure
- redesigning individual pages without a shared shell and design system
- letting special pages remain the only emotionally rich surfaces

### What Can Make The App Harder To Maintain

- refactoring UI before clarifying domain services
- keeping root/public duplication for too long without a transition plan
- mixing future Storage assumptions into the current local-only runtime
- doing framework migration and product redesign simultaneously

## J. Decision Gates

### Approved-Account Smoke Gate

Required before:

- declaring the rules rollout fully closed
- beginning higher-risk authenticated behavior refactors

### Service-Layer Gate

Required before:

- broad UI rebuild
- shell migration
- major data-model cleanup

### Redesign Gate

Required before:

- page-by-page visual implementation

Condition:

- shell concept, component map, and service direction are explicit

### Storage Gate

Required before:

- any Storage initialization
- any media upload

Condition:

- approved-account smoke passed
- service layer path clear
- upload scope approved

### Deployment Gate

Required before:

- any future Hosting or rules deploy linked to redesign work

Condition:

- checks pass
- smoke criteria defined
- privacy boundaries reconfirmed

## Final Recommendation

Couple Book should not be redesigned as a prettier version of the current static shell, and it should not be rewritten blindly into React just because Gather Savor uses React. The safest path is a hybrid one:

1. close the approved-account smoke gap
2. fix the service/sync boundaries
3. define the new protected shell and component model
4. redesign the product on top of that clearer structure
5. move to a modern architecture only when the product model is stable enough to justify it

That sequence gives Couple Book the strongest chance of becoming both emotionally better and structurally safer.
