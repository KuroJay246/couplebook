# Couple Book Visual Identity Standard

Last updated: 2026-08-22

## Product Personality

Couple Book should read as a private shared journal, premium digital memory book, and personal couple space. It should feel intimate, restrained, readable, and modern. It must not read as Event Hub, business software, a generic SaaS dashboard, or a romantic marketing site.

## Visual Principles

1. Relationship content leads; chrome stays quiet.
2. Photography and memory writing carry most of the emotional weight.
3. Navigation stays predictable across every theme.
4. Themes change atmosphere, not structure or capability.
5. Route compositions should feel related without becoming identical.

## Brand

- Brand asset: `app-v2/src/components/BrandMark.jsx`
- Symbol: two facing journal-page forms meeting at a shared center
- Wordmark: `Couple Book`
- Subtitle: `Private shared journal`

## Theme System

Theme runtime uses `data-theme` on `document.documentElement`.

Supported themes:

- `midnight-rose`: deep aubergine dark default with warm ivory copy and rose accent
- `paper-hearts`: warm paper light theme with ink text and dusty rose accents
- `moonlit`: cool dark theme with blue-charcoal surfaces, silver text, and lavender restraint

Theme ids are fixed and stored only as allowed identifiers. Components consume semantic variables such as app background, nav background, surface, raised surface, text primary, text secondary, divider, focus, accent, success, warning, error, overlay, and shadow.

## Typography

- UI sans-serif for navigation, forms, controls, metadata, and supporting content
- expressive serif for major memory titles, section heads, relationship hero copy, Contract headings, and special moments

## Route Composition

- Home emphasizes relationship moment, featured memory, On This Day, shared prompt, and coming-up content
- Story uses chapter rhythm rather than activity-feed styling
- Album is image-first with chapter grouping and a temporary queue tray
- Us is paired and personal, not directory-like
- Plans is hopeful and relationship-oriented, not operational
- More is calm, compact, and personal
- Contract reads like a document, with status secondary to the promise itself
- Birthday, Valentine, and Confession keep distinct moods inside the shared product system

## Motion And Accessibility

- motion tokens: immediate, quick, standard, deliberate
- no continuous decorative animation
- visible focus on all interactive elements
- theme picker tiles and toggles stay keyboard-accessible and labelled
- touch targets stay usable at mobile sizes and 200% zoom

## Prohibited Patterns

- Event Hub brand treatment
- neon Couple Book revival
- floating particles, bokeh orbs, and heart confetti
- enterprise dashboard card density
- unrestricted theme values or color pickers
