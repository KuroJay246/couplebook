# CoupleBook Design System Blueprint

Date: 2026-07-08
Scope: redesign direction only. No live UI replacement is performed in this phase.

## Product Mood

The future design should feel:

- intimate
- premium
- warm
- graceful
- story-led
- modern without becoming generic

The emotional benchmark is not “cute app.” It is “private shared keepsake.”

## Typography Direction

### Primary Serif

Use a soft but character-rich serif for emotional anchors:

- page heroes
- section titles
- milestone moments
- featured memory captions

Desired qualities:

- elegant
- readable
- not wedding-invitation cliché

### Primary Sans

Use a refined sans for:

- navigation
- body copy
- controls
- metadata

Desired qualities:

- calm
- premium
- clear at small sizes

### Typography Rules

- serif for emotional emphasis
- sans for clarity and structure
- avoid too many font personalities
- do not let the login page and special pages feel like different brands

## Color Direction

Current app colors are competent but too cold and dashboard-like. The future palette should be warmer and more layered.

### Core Palette Direction

- soft parchment / cream base
- deep plum, cherry, espresso, or mulberry anchors
- blush and rose accents
- muted gold or candlelight highlights used sparingly

### Contrast Rules

- maintain strong text contrast
- avoid washed-out pastel UI
- avoid harsh neon accents
- reserve strongest accents for moments that matter

## Spacing And Card Hierarchy

The current app overuses one generic glass-card pattern. The redesign needs stronger hierarchy.

### Future Card Tiers

#### Hero Cards

- large
- atmospheric
- emotionally expressive
- lead one page

#### Story Cards

- medium
- content-rich
- memory-first

#### Utility Cards

- compact
- low-emphasis
- health/status/settings usage only

#### Supporting Chips / Tags

- small
- restrained
- consistent

### Spacing Rules

- more vertical breathing room on story pages
- tighter rhythm only for utility/status groups
- avoid stacking too many visually equal panels

## Story Card System

Story cards should represent:

- featured memory
- milestone
- resurfaced special moment
- relationship note

They should support:

- title
- date
- short context
- optional image/media preview later
- tags or mood labels

They should not read like admin records.

## Memory Card System

Memory cards are the workhorse component for timeline and home.

Recommended elements:

- human-readable date
- memory title or lead line
- short caption
- optional media preview
- optional emotional or thematic tag
- clear entry into detail view

Memory cards should distinguish:

- curated authored memories
- imported/raw archive entries
- special milestone references

## Gallery Card System

Gallery cards should feel more visual and less like form results.

Recommended capabilities:

- photo-first layout
- clear video distinction
- optional grouping by moment, month, or theme
- restrained metadata, not overloaded overlays

Long-term:

- gallery becomes a curated archive, not just a media dump

## Profile And Favorites Cards

### ProfilePair

Should feel like:

- two people in one shared frame
- equal weight
- intimate but not childish

### FavoritesPanel

Should feel like:

- “things we love”
- easy to scan
- richer than raw lists

Avoid:

- prompt-driven plain text list vibes
- generic settings-form presentation

## Settings And Health Tone

Settings should still feel safe and serious, but not like admin tooling.

Recommended tone:

- private and calm
- less dashboard-heavy
- diagnostics moved into supporting sections
- future-only notices clearly labeled

Health/status UI should use:

- compact chips
- clear labels
- plain truth
- no dramatic alarm styling for normal local-only states

## Mobile Rhythm

Mobile should prioritize:

- one major idea per viewport
- clear tap targets
- fewer simultaneous panels
- strong content rhythm between hero, memory, and utility blocks

Avoid:

- cramped dashboards
- tiny cards in multi-column stacks
- equally weighted sections everywhere

## Motion Rules

Use motion sparingly and purposefully:

- soft page entrance
- staggered story-card reveal
- gentle modal transitions
- milestone emphasis when appropriate

Avoid:

- hyperactive hover motion
- novelty animation everywhere
- making the protected shell feel less trustworthy

## What Not To Copy From Gather Savor

- event-admin framing
- operations density
- role/status language
- command-center tone
- event-business page composition

What to copy instead:

- structural discipline
- shell consistency
- component/system thinking
- non-live boundary clarity

## Non-Live Prototype Rule

Any visual prototype in this stage must:

- stay outside `public/`
- use placeholder-only content
- avoid Firebase/auth/media
- clearly identify itself as non-live
