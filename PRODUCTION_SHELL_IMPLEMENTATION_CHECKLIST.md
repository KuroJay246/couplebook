# Production Shell Implementation Checklist

Date: 2026-07-08
Scope: implementation-readiness checklist only. No live UI files are changed in this phase.

## Goal

Turn the non-live shell prototype and related shell/design docs into an actionable production checklist for the existing static app.

This is a planning bridge between:

- prototype-only shell direction
- current protected static runtime
- later live redesign batches

## A. What Can Move From Prototype To Production Later

### Layout Ideas

Safe concepts to carry forward:

- one coherent protected shell frame
- left-rail or compact desktop nav
- clearer separation between story content and lower-emphasis health/status content
- stronger content width and spacing rhythm

### Nav Structure

Safe concepts to carry forward:

- primary destinations limited to:
  - Home
  - Our Story
  - Gallery
  - Us
  - Favorites
  - Settings
- special pages entered through curated context instead of flat main-nav equality

### Hero Hierarchy

Safe concepts to carry forward:

- one emotional home hero
- milestone placement inside the story rather than above it
- featured memory / special moments as the main entry language

### Story-Card Hierarchy

Safe concepts to carry forward:

- distinct story-card tier separate from utility cards
- better title, support copy, and emphasis rhythm
- fewer visually equal “glass cards”

### Health / Status Lower-Emphasis Placement

Safe concepts to carry forward:

- keep health/status present but secondary
- move it into:
  - a compact home section
  - settings support panels
  - smaller chips/badges where appropriate

### Special Moments Entry Area

Safe concepts to carry forward:

- one curated special-moments surface
- contextual entry cards for birthday, Valentine’s, and confession
- special pages remain distinct in tone without feeling bolted on

## B. What Must Not Be Copied Directly

### Placeholder Data

Do not lift prototype text, fake milestone numbers, or fake chapter names directly into the production app.

### Fake Prototype Interactions

Do not copy:

- button actions that only switch static sections
- prototype-only navigation assumptions
- simplified view toggles that ignore the real route architecture

### Non-Live Labels

Do not carry:

- `NON-LIVE PROTOTYPE`
- placeholder chips
- prototype-only explanatory banners

into the actual protected app shell.

### Prototype-Only JS Assumptions

Do not copy:

- JS that assumes one single prototype page
- fake section switching logic in place of real route-aware page composition
- simplified state assumptions that ignore auth, localStorage, and sync boundaries

## C. Static-App Implementation Path

### 1. CSS Token Pass

Goal:

- make the current static app visually more coherent before deeper page surgery

Likely work:

- refine shared color tokens
- refine spacing scale
- define hero/story/utility card tiers
- reduce one-off inline styling pressure where easy

Do not:

- move private media
- change route behavior
- replace the shell in the same batch

### 2. App Shell Class Names

Goal:

- introduce shared class naming for future shell zones

Likely work:

- shell wrapper classes
- page header classes
- hero/story/status layout classes
- consistent nav container naming

Do not:

- change auth behavior
- change data loading order

### 3. Nav Refactor

Goal:

- keep the centralized nav registry but improve how the shell presents it

Likely work:

- desktop shell nav framing
- mobile nav rhythm
- contextual special-page entry treatment

Do not:

- re-enable guest or signup
- alter route protection

### 4. Page-Header Standard

Goal:

- every protected page uses one consistent header model

Likely work:

- title
- support line
- optional primary action
- optional subtle status chip

### 5. Dashboard Hero

Goal:

- redesign the dashboard toward a story-first home

Likely work:

- milestone hero
- featured memory/special moments surface
- reduced quick-nav dominance

### 6. Memory Card System

Goal:

- apply a reusable story-card system to timeline and home

Likely work:

- card hierarchy
- caption/date/tag rhythm
- improved empty/loading/error states

### 7. Mobile Nav Rhythm

Goal:

- bring consistency across protected pages on mobile

Likely work:

- bottom nav rhythm
- drawer/sidebar behavior
- spacing between hero, story, and utility zones

## D. Future Vite/React Path

If the app later moves to a Vite/React architecture, these are the most likely components to implement from the production shell design:

- `AppShell`
- `ProtectedRoute`
- `StoryHero`
- `MemoryCard`
- `GalleryGrid`
- `ProfilePair`
- `HealthStatusPanel`

This path remains future-facing only. It is not required to execute the next static-app redesign batches.

## E. Gate List

Before any live shell implementation batch:

### Approved-Account Smoke Gate

- real approved Jaylan flow tested
- real approved partner flow tested
- no permission-denied on normal private routes

### Service / Sync Readiness Gate

- sync replacement plan documented
- non-live sync helpers validated
- no unclear coupling hidden inside live shell changes

### Route Checks Gate

- `npm run check:routes`
- `npm run check:all`

### Mirror Checks Gate

- `npm run check:mirrors`

### Prototype Isolation Gate

- `npm run check:prototype`
- no prototype code or assets moved under `public/`

## Implementation Rule

Do not treat the prototype as a direct code source.

Treat it as a visual and structural checklist only.

The live app must be changed in small, reversible, batch-scoped steps with the current QA lane still green.
