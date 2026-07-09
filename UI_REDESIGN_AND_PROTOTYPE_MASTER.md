# UI Redesign And Prototype Master

Date: 2026-07-08

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
- mobile shell preview is the next safe proving ground for nav rhythm
- special moments entry and private-health placement should keep getting refined in the prototype before any live CSS batch

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

## Current UI Risks

- dashboard still feels utility-led
- special pages are emotionally stronger than the shell
- favorites remains structurally weak
- legacy special-page loading is not a long-term product solution
- root/public duplication makes live UI refactors more fragile

## Next Safe UI Step

While smoke is `HOLD`:

- continue planning and checklist work only
- do not replace the live shell
- do not mix UI redesign with live sync changes

If smoke becomes `PASS` and sync risk is under control:

- start with the smallest token/CSS cleanup batch only
