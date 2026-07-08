# Protected Shell Blueprint

Date: 2026-07-08
Scope: future shell planning only. This does not replace the current app shell and is not routed in production.

## Purpose

Couple Book needs one coherent protected shell before real redesign work starts. The current app has protected routes, but it still feels like multiple static pages sharing a theme rather than one intentional private product. This blueprint defines the future shell zones and interaction model while preserving the current live app.

## Shell Principles

- private first
- story first
- emotionally warm, not operational
- clear route protection
- one shell for desktop and mobile
- special pages remain distinct, but no longer feel bolted on
- health/status stays available without becoming the visual center of the product

## Future Shell Zones

### 1. Private Frame

The outer frame should always communicate:

- this is a private shared space
- the user is inside the protected couple app
- navigation is stable and predictable

This frame replaces the current feeling of moving between separate themed pages.

### 2. Primary Navigation Zone

The future nav should cover only the core couple domains:

- Home
- Our Story
- Gallery
- Us
- Favorites
- Settings

Special pages should not sit as equal-weight main app tabs. They should be reachable through curated entry points from home, milestones, or a dedicated “Special Moments” surface.

### 3. Page Header Zone

Every protected page should have one consistent header model:

- page title
- one-sentence emotional or functional framing
- optional right-side action area

This replaces today’s inconsistent mix of quick-nav, page headings, and utility-first widgets.

### 4. Emotional Hero Zone

The protected home should have a hero area that does real product work:

- shared relationship state
- current anniversary or milestone story
- one featured memory or note
- one clear path deeper into the archive

It should not be dominated by raw counters or a live clock.

### 5. Story Content Zone

This is the main body region for:

- story cards
- memory cards
- gallery highlights
- profile pair panels
- favorites highlights
- milestone modules

The design should emphasize depth and emotional hierarchy over dashboard density.

### 6. Private Health / Status Zone

The app still needs technical status, but it should live in a lower-emphasis zone:

- sync state
- local/cloud mode
- device visibility
- privacy reminders
- future non-live notices

This can appear as:

- a compact panel on home
- a dedicated section in settings
- a reusable `HealthStatusPanel`

It should not dominate the main shell.

### 7. Special Pages Entry Zone

Birthday, Valentine’s, and confession should stay special.

Future strategy:

- surfaced through memory/milestone entry cards
- optionally grouped under a “Special Moments” concept
- loaded with a better framing model than the current explicit legacy wrapper
- still allowed to keep their own mood and pacing

## Desktop Layout

Recommended desktop structure:

- left rail or compact sidebar for primary navigation
- top page header across the content area
- wide content column centered inside a constrained max width
- optional right rail only when a page genuinely benefits from secondary context

Desktop zones:

1. nav rail
2. page header
3. hero / lead section
4. main story content
5. secondary health/status or context rail when needed

The desktop shell should feel elegant and scrapbook-like, not like SaaS admin chrome.

## Mobile Layout

Recommended mobile structure:

- top bar with title/context
- bottom nav for the most important destinations
- slide-over drawer for lower-frequency destinations
- stacked story-first content blocks

Mobile rules:

- hero content first
- fewer simultaneous cards
- avoid tiny dashboard widgets
- keep actions large and obvious
- special-page entry cards should remain tappable and visually distinct

## Navigation Model

### Primary Destinations

- Home
- Our Story
- Gallery
- Us
- Favorites
- Settings

### Secondary / Contextual Destinations

- Contract
- Birthday
- Valentine’s
- Confession

These should be entered through curated context, not simply dumped into a flat nav list.

### Route Protection Model

Future equivalent of today’s protection should still guarantee:

- unauthenticated users hit login
- protected routes do not render private content while auth is unresolved
- non-live prototype routes never join production routing

## Page Header Model

Each protected page should define:

- title
- support line
- optional primary action
- optional lightweight status chip

Examples:

- Home: “Your private memory book”
- Our Story: “Moments, milestones, and the shape of us”
- Gallery: “A curated archive of the memories you want to revisit”
- Settings: “Private app preferences, health, and couple configuration”

## Emotional Hero Area

The home hero should combine:

- couple identity
- one milestone signal
- one featured memory/story fragment
- one clear next action

Possible content:

- anniversary state
- featured note or caption
- “memory of the week”
- special moment resurfacing

This is the clearest place to translate Gather Savor’s shell discipline into a romantic product instead of an admin workspace.

## Private Health / Status Placement

Keep health visible but lower-priority:

- compact panel on home
- fuller panel in settings
- optional non-live badges where future features are not active

Good examples of what belongs there:

- local-only media notice
- storage not initialized
- sync active / sync pending
- approved-account smoke status

## Special Pages Entry Strategy

Recommended future strategy:

- Home can surface featured special moments seasonally or contextually
- Timeline can reference special pages as milestone entries
- Profiles or milestones can surface direct entry cards
- Settings should not be the main entry point for special pages

Long-term goal:

- no explicit “legacy” framing in the user-facing experience
- no iframe-centric identity
- no dependence on local-only companion media existing in production

## Translation From Gather Savor

Useful discipline to translate:

- one route registry
- one shell
- one mobile/desktop navigation model
- one consistent page-header pattern
- explicit non-live boundaries

Things not to copy:

- event admin vocabulary
- operations dashboard density
- staff/worker role framing
- event management information architecture

## Implementation Constraint

This blueprint is planning-only for now.

It must not:

- replace the current app shell in this batch
- change production navigation
- introduce a prototype under `public/`
- depend on Firebase, auth, or private media
