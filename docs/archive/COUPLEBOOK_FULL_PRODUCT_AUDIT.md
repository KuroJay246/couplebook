# CoupleBook Full Product Audit

Date: 2026-07-08
Scope: product, structure, UI/UX, code, and architecture audit of the current Couple Book app before redesign

## What The App Is

Couple Book is a private relationship memory system for two approved users. In its current form it is a static multi-page HTML/CSS/JS app with a localStorage-first runtime, selective Firestore sync for user metadata, and local-only private media served by the dev server but intentionally excluded from Hosting and Git.

At the product level it behaves like three things stitched together:

- a protected private couple vault with login and route gating
- a scrapbook/timeline/gallery shell for memories, birthdays, favorites, and profiles
- a set of emotionally expressive one-off special pages that feel more alive than the core app, but are structurally isolated from it

## What It Currently Does Well

- The privacy posture is much stronger than before.
  - strict Firestore rules are live
  - guest/signup/username login are disabled
  - destructive browser admin tools are disabled
  - Hosting publishes only `public/`
  - private media is excluded from Git and `public/`

- The app has a real product surface, not just placeholders.
  - dashboard, timeline, gallery, profiles, favorites, settings, contract flow, and special pages all exist
  - local route checks are disciplined and repeatable
  - there is a meaningful documentation and QA lane already in place

- The emotional intent is visible.
  - naming like “Our Story”, “Recent Memories”, and “Shared Gallery” points in the right direction
  - anniversary counters, birthdays, and special pages are appropriate domains for a private couple app
  - the birthday/Valentine/confession pages carry stronger emotional storytelling than the core app shell

- The shell is meaningfully protected.
  - unauthenticated visits to `/pages/dashboard.html` and `/pages/settings.html` redirect to `/pages/login.html`
  - approved-account-only posture is clearly communicated on the login page

## What Feels Weak

- The core product feels like a technical shell around local media paths, not yet like a premium private memory book.
- The information architecture is broad but shallow: many features exist, but several are still basic CRUD shells around localStorage.
- The emotional tone is inconsistent.
  - the main app feels like a glassmorphism utility dashboard
  - the special pages feel personal and expressive
  - those two moods are not unified into one coherent product identity

- The data model is still too close to “file inventory plus metadata” rather than curated storytelling.
  - many memories are auto-generated from filenames/timestamps
  - gallery and timeline are heavily shaped by what exists in local media folders
  - favorites are still a separate lightweight localStorage model

## What Looks Messy

- Root/public duplication is still manual and pervasive.
  - `core/`, `js/`, `pages/`, `css/`, and `firebase/` are mirrored into `public/`
  - `git diff --no-index` shows them effectively mirrored right now, but the duplication itself is fragile

- The visual system is only partially disciplined.
  - the app has variables, cards, buttons, and layout patterns, but many pages rely on large inline style blocks
  - page-specific styling and component styling are mixed freely
  - some pages feel composed, others feel assembled

- The memory system reads like a dump in places.
  - `core/memories.json` includes many auto-generated records based on device-exported filenames and timestamps
  - several entries are basically technical captures rather than intentionally authored memories
  - special pages are mixed into the same stream as normal memories via `isSpecialPage`

- The special pages are structurally disconnected from the app shell.
  - birthday is a direct page
  - Valentine and confession are wrapped through `legacy.html` iframe loading
  - emotional storytelling lives outside the main product language

## What Is Structurally Fragile

- `core/firestoreSync.js` remains the biggest architecture risk.
  - it reads the full `users` collection
  - it listens to the full `users` collection
  - it merges active-user settings and shared couple data in one place
  - it depends on list access that is broader than necessary for a two-user app

- The local/cloud boundary is implicit instead of deliberately layered.
  - page modules call directly into state or Firestore-related code
  - services/ does not exist yet
  - diagnostics and UI modules duplicate data-access assumptions

- The media model depends on local paths.
  - many flows still assume `/assets/photos/...` or `/assets/videos/...`
  - special pages rely on local companion files that are intentionally excluded
  - dev-server private-media resolution is helpful locally but not a durable product architecture

- The contract/profile/favorites/settings areas are still runtime-coupled to localStorage-first assumptions.

## What Must Be Preserved

- private two-approved-user model
- login gating and route protection
- local media exclusion from Git and Hosting
- dashboard, timeline, gallery, profiles, favorites, settings, contract, and special pages as product domains
- approved-account-only posture
- special page emotional intent
- QA lane and deploy discipline
- localStorage-first stability while refactor is still in progress

## What Should Be Redesigned

- dashboard composition and hierarchy
- navigation shell and app shell framing
- memory cards and storytelling presentation
- gallery as a curated private media experience
- profiles and contract presentation
- favorites experience so it feels intimate rather than basic
- settings information architecture so it feels less like an admin console
- overall typography, spacing, card hierarchy, and page rhythm
- mobile composition and density for the protected app shell

## What Should Be Refactored

- Firestore access into service boundaries
- `core/firestoreSync.js` targeted reads/listeners
- root/public duplication strategy
- data model separation between memories, favorites, settings, profile, and future media metadata
- special-page loading pattern so legacy iframe wrapping is not the long-term answer

## What Should Wait

- any live Firestore rules change
- Firebase Storage initialization
- media uploads or moves
- major framework migration
- any redesign that assumes approved-account smoke has already passed

## Risk List

- Approved-account live smoke is still pending, so authenticated route rendering after strict rules is not fully proven.
- `core/firestoreSync.js` collection-wide reads/listens create unnecessary coupling to list permissions.
- Root/public duplication increases drift risk during redesign or refactor.
- The memory dataset currently mixes intentional milestones with raw auto-import style entries, which can distort product design decisions if left untreated.
- Special pages depend on excluded companion media and currently degrade through fallback behavior rather than a real content system.

## Visual Notes

Browser visual inspection was available for local pages, but protected app routes honestly redirected to login because no approved authenticated session was available.

Live browser observations:

- `/pages/login.html`
  - visually polished compared with much of the rest of the app
  - dark glass card, strong brand mark, clear approved-account messaging
  - feels narrow and centered, but also a little generic and empty

- `/pages/dashboard.html`
  - redirected to `/pages/login.html` without an approved session
  - route protection is working

- `/pages/settings.html`
  - redirected to `/pages/login.html` without an approved session
  - route protection is working

- `/pages/omnia-happy-birthday.html`
  - visually expressive, custom animated, and emotionally warmer than the main shell
  - feels like a handcrafted standalone page, not part of the same design system as the core app

- `/pages/valentine/index.html`
  - playful, animated, romantic, and much more personality-rich than the protected app pages
  - stronger emotional direction than the dashboard/timeline shell, but disconnected from the app’s design language

- `/pages/confession/index.html`
  - loads with local-only media fallback note when companion assets are absent
  - structurally demonstrates graceful fallback, but visually the missing-media state dominates the experience
  - page is emotionally dense and highly personal, but not integrated into the main shell architecture

## Route-By-Route Audit

### `/`

- Current role:
  - boot loader only
- Strength:
  - simple and safe
- Weakness:
  - no meaningful product-first landing state inside the private app; just a redirect loader

### `/pages/login.html`

- Strengths:
  - clear approved-account-only posture
  - signup hidden
  - guest access visibly disabled
  - visually cleaner than many interior pages
- Weaknesses:
  - branded but emotionally neutral
  - does not yet feel like entering a premium private scrapbook

### `/pages/dashboard.html`

- Structure:
  - live clock
  - recent memories
  - dual anniversary counters
  - birthdays
  - quick-nav cards
- Strengths:
  - all the right domains are present
  - anniversary and birthdays are relevant to the product identity
- Weaknesses:
  - reads like a utility dashboard more than a memory-book home
  - live clock is visually dominant but not emotionally central
  - quick-nav tiles are functional, not curated
  - no strong empty state or “shared story” framing beyond cards

### `/pages/timeline.html`

- Structure:
  - tag filter bar
  - vertical timeline cards
  - add/edit modal
  - detail modal
- Strengths:
  - the “Our Story” framing is directionally correct
  - tag filtering exists
  - memory detail view exists
- Weaknesses:
  - add/edit flow is still local-file-path centric
  - memory quality depends heavily on raw imported data
  - timeline cards feel more like records than curated scrapbook entries
  - tag taxonomy is accidental (`whatsapp`, `snapchat`, `moment`, `video`) instead of story-led

### `/pages/media.html`

- Structure:
  - photo/video tabs
  - media grid
  - image lightbox
  - video modal
  - edit/delete controls
- Strengths:
  - basic gallery mechanics work
  - image/video handling is clearer than on the timeline
- Weaknesses:
  - gallery is just “all memories with media” rather than a true gallery domain
  - current experience is dependent on local assets
  - no real curation, grouping, albums, or emotional context

### `/pages/profile.html`

- Structure:
  - side-by-side partner cards
  - relationship contract section
  - signature history
  - edit profile modal
- Strengths:
  - couples framing is explicit and appropriate
  - contract/signature concept is distinct and memorable
- Weaknesses:
  - layout feels long and blocky
  - emotional tone of the contract is more formal than romantic
  - profiles still lean on local avatar paths and editable metadata fields rather than a refined relationship-profile experience

### `/pages/favorites.html`

- Structure:
  - two side-by-side lists
  - categories for food, places, hobbies, activities
- Strengths:
  - domain fits the product
  - couple comparison is inherently personal
- Weaknesses:
  - data model is a separate raw localStorage object
  - UI is basic and prompt-driven
  - does not feel premium or scrapbook-like
  - categories are thin and not emotionally enriched

### `/pages/settings.html`

- Structure:
  - appearance
  - anniversary config
  - privacy/security
  - account management
  - restricted account controls
- Strengths:
  - safety posture is much better after hardening
  - device status and sync status are useful
  - destructive controls are clearly restrained
- Weaknesses:
  - page still feels admin-like
  - language leans technical rather than intimate
  - too much account/system weight compared to relationship-product tone

### `/pages/contract.html`

- Strengths:
  - onboarding contract is a distinctive concept
  - contract gating ties emotional ritual to app access
- Weaknesses:
  - it feels like a setup wizard, not a premium memory ritual
  - contract text is stronger conceptually than visually

### `/pages/legacy.html`

- Role:
  - iframe wrapper for special modules
- Strengths:
  - preserves old modules safely
- Weaknesses:
  - legacy framing is explicit in the architecture
  - iframe wrapper is not a long-term product-quality solution

### Special Pages

- Birthday:
  - strongest standalone celebration feel
  - custom crafted and visually memorable
- Valentine:
  - playful and warm
  - strongest immediate romantic energy
- Confession:
  - emotionally intense and highly personal
  - technically fragile due companion media exclusions and password/local media assumptions

## Feature-By-Feature Audit

### Dashboard

- Good:
  - correct product domains are present
- Weak:
  - hierarchy is too mechanical
  - home does not yet feel like “our private scrapbook”

### Duo Anniversary Counter

- Good:
  - unique couple-specific concept
- Weak:
  - execution is numeric and utility-heavy
  - not integrated into broader storytelling

### Recent Memories

- Good:
  - useful summary section
- Weak:
  - quality depends on imported media naming and timestamps
  - lacks curation and context

### Upcoming Birthdays

- Good:
  - appropriate emotional/product fit
- Weak:
  - reads like another widget rather than a cherished countdown

### Memories / Timeline

- Good:
  - central story concept exists
- Weak:
  - still centered on records and media paths
  - tags and content quality are not curated enough

### Add/Edit Memories

- Good:
  - flow exists and is editable
- Weak:
  - modal relies on selecting local asset paths
  - not future-proof for Storage-backed media

### Tag Filtering

- Good:
  - feature exists
- Weak:
  - taxonomy is technical/source-driven rather than story-driven

### Gallery / Media View

- Good:
  - images and videos have clear display patterns
- Weak:
  - gallery is not yet a designed couple archive
  - current data source is not durable

### Profiles

- Good:
  - pair framing and side-by-side concept work
- Weak:
  - profile edit UX still feels form-based and utilitarian

### Relationship Contract

- Good:
  - distinctive couple-specific ritual
- Weak:
  - more formal than emotionally warm
  - not yet visually elevated

### Favorites

- Good:
  - inherently personal subject matter
- Weak:
  - simplest/weakest feature in both data model and UI

### Settings

- Good:
  - hardening work materially improved safety
- Weak:
  - page weight is more ops/admin than romantic/private-app polish

### Special Pages

- Good:
  - strongest emotional expression in the whole repo
- Weak:
  - architecture, loading, and media assumptions are separate from the main app

## Navigation Consistency

- Positives:
  - centralized nav registry in `js/app.js`
  - desktop, mobile, and sidebar navigation share one definition
- Problems:
  - dashboard quick-nav, top nav, bottom nav, sidebar nav, and legacy module paths create multiple navigation personalities
  - special pages feel bolted on rather than woven into the main product flow

## Typography, Spacing, Color, Cards

- Typography:
  - `Outfit` + `Playfair Display` is a strong enough base for a romantic/private product
  - execution is inconsistent because of heavy inline styles and one-off pages using different fonts

- Spacing:
  - generally competent but page rhythm varies widely
  - some pages breathe well, others stack cards mechanically

- Color:
  - the core shell uses a dark glass gradient with red/violet accents
  - it is cohesive enough technically, but emotionally cooler than the target product

- Card system:
  - `glass-card` is the dominant primitive
  - overused as the universal answer, which flattens hierarchy

## Mobile Responsiveness

- Strengths:
  - there are real media queries for dashboard, profile, settings, and navigation
  - special confession page includes extensive responsive tuning
- Weaknesses:
  - responsive behavior is mostly layout collapse, not truly rethought mobile storytelling
  - mobile nav exists, but overall mobile product polish is still uneven

## Empty, Loading, And Error States

- Good:
  - there are loading placeholders in recent memories, timeline, gallery, device list
  - favorites/timeline/gallery have empty state text
  - special-page local-media fallbacks are explicit
- Weak:
  - many empty/loading states are technically correct but emotionally dry
  - no unified system for friendly private-app errors and offline guidance

## Route Protection And Local/Cloud Boundary

- Route protection:
  - strong at the shell level
  - unauthenticated access redirects correctly

- Local/cloud boundary:
  - localStorage is the real product source today
  - Firestore sync is layered on top
  - this keeps the app functioning, but the architecture is not yet clean

## Main Audit Conclusion

Couple Book is already a real private couple product, but not yet a coherent premium one. The privacy and safety foundation is much stronger than the UI and structure quality. The core shell is functional, protected, and disciplined enough to keep, but it still feels like a collection of static pages wrapped in glassmorphism. The special pages prove there is stronger emotional direction available, but that direction has not yet been translated into a unified protected app shell.

The right next move is not to throw the current product away. It is to preserve the protected private foundation, fix the service/data boundaries, and then redesign the core app so the memory-book identity becomes as strong and intentional as the special pages already are.
