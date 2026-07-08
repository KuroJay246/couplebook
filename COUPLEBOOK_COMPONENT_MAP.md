# CoupleBook Component Map

Date: 2026-07-08
Scope: future component and domain map only. This is not a live implementation.

## Core App Structure

### AppShell

Purpose:

- primary protected frame
- desktop/mobile navigation
- page header placement
- shell-level status area

Responsibilities:

- layout only
- no direct data reads

### ProtectedRoute Equivalent

Purpose:

- enforce approved-account access
- prevent protected page render while auth is unresolved

Responsibilities:

- route gating
- redirect behavior
- non-live prototype exclusion from production flow

## Home / Dashboard Domain

### StoryHero

Purpose:

- emotional home lead section
- featured relationship state
- milestone and featured-memory entry

### HomeDashboard

Purpose:

- page composition for home

Likely children:

- `StoryHero`
- `MilestonePanel`
- `RecentMemoryStrip`
- `SpecialPageEntry`
- `HealthStatusPanel`

## Memory Domain

### MemoryCard

Purpose:

- reusable card for memory preview across home and timeline

### MemoryTimeline

Purpose:

- story-first list or stream of memory cards

### MemoryDetail

Purpose:

- richer single-memory context

### EmptyState

Purpose:

- shared zero-data message component for timeline/gallery/favorites

### LoadingState

Purpose:

- shared loading component

### ErrorState

Purpose:

- shared failure state without raw technical tone

## Gallery Domain

### GalleryGrid

Purpose:

- curated media overview

### MediaCard

Purpose:

- image/video preview card

### MediaViewer

Purpose:

- full media lightbox/modal

## Profile Domain

### ProfilePair

Purpose:

- shared paired profile presentation

### ContractPanel

Purpose:

- relationship contract surface
- signature state
- onboarding ritual or renewal context

## Favorites Domain

### FavoritesPanel

Purpose:

- grouped couple favorites
- categories and editing surface later

## Settings Domain

### SettingsPanel

Purpose:

- generic section container for settings

### HealthStatusPanel

Purpose:

- show:
  - sync state
  - local-only media status
  - approved-account smoke status
  - future-only Storage status

## Special Pages Domain

### SpecialPageEntry

Purpose:

- reusable entry card or tile into special pages

### SpecialPageFrame

Purpose:

- future container for special page presentation
- replace explicit legacy framing over time

Rule:

- must preserve page distinctiveness
- must not force the special pages into generic shell styling

## Service-Adjacent Future Components

These are component-level consumers, not service files.

### SyncStatusChip

Purpose:

- small status indicator for local/cloud state

### PrivacyNotice

Purpose:

- communicate local-only/private-only boundaries clearly

### FutureFeatureBadge

Purpose:

- mark Storage-later, prototype-only, or non-live features honestly

## Suggested Domain Grouping

### Shell

- `AppShell`
- `ProtectedRouteEquivalent`
- `HealthStatusPanel`

### Story

- `StoryHero`
- `MemoryCard`
- `MemoryTimeline`
- `MemoryDetail`

### Media

- `GalleryGrid`
- `MediaCard`
- `MediaViewer`

### Relationship

- `ProfilePair`
- `FavoritesPanel`
- `ContractPanel`

### Special Moments

- `SpecialPageEntry`
- `SpecialPageFrame`

### Shared UI

- `EmptyState`
- `LoadingState`
- `ErrorState`
- `SyncStatusChip`
- `FutureFeatureBadge`

## Migration Note

This component map is intentionally framework-agnostic at this stage.

It can guide:

- improved static-shell planning
- future Vite/React migration
- page decomposition work

It must not be mistaken for a live runtime refactor in this batch.
