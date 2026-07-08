# Live UI Redesign Phase Plan

Date: 2026-07-08
Scope: safe live-app redesign sequencing only. No live UI files are changed in this phase.

## Batch 1

### Goal

CSS token and shared visual cleanup only.

### Files Likely Touched

- shared CSS token files
- common shell/layout styles
- minimal shared utility classes

### Checks Required

- `npm run check:all`
- `npm run check:mirrors`

### Stop Conditions

- route styling breaks core protected pages badly
- mirror drift appears
- UI edits require auth/sync logic edits

### What Must Not Change

- page behavior
- auth flow
- sync behavior
- route structure
- special-page loading

## Batch 2

### Goal

Shell/nav framing refresh without data-model changes.

### Files Likely Touched

- `js/app.js`
- `public/js/app.js`
- shared shell markup/styles
- protected page shell containers

### Checks Required

- `npm run check:all`
- `npm run check:mirrors`
- real browser route sanity pass

### Stop Conditions

- route protection changes unintentionally
- special pages lose safe entry access
- mobile nav becomes inconsistent

### What Must Not Change

- Firestore rules
- service boundaries
- `core/firestoreSync.js`
- login gating

## Batch 3

### Goal

Dashboard story-first redesign.

### Files Likely Touched

- dashboard HTML
- dashboard JS if small presentational logic changes are needed
- shared hero/story card styles

### Checks Required

- `npm run check:all`
- dashboard browser sanity pass

### Stop Conditions

- dashboard depends on new backend/state assumptions
- route hydration changes
- auth/sync regressions appear

### What Must Not Change

- memory data model
- Firestore sync behavior
- special-page runtime behavior

## Batch 4

### Goal

Timeline and memory-card redesign.

### Files Likely Touched

- `pages/timeline.html`
- `public/pages/timeline.html`
- `js/timeline.js`
- `public/js/timeline.js`
- shared memory-card styles

### Checks Required

- `npm run check:all`
- timeline add/edit/view browser sanity pass

### Stop Conditions

- modal/edit flows break
- tag filtering breaks
- memory rendering depends on undeclared new schema

### What Must Not Change

- current memories dataset
- media storage boundary
- auth/rules posture

## Batch 5

### Goal

Gallery, profile, favorites, and settings redesign.

### Files Likely Touched

- `pages/media.html`
- `pages/profile.html`
- `pages/favorites.html`
- `pages/settings.html`
- mirrored `public/pages/*`
- corresponding `js/*` and `public/js/*` files if presentation logic must shift

### Checks Required

- `npm run check:all`
- page-by-page browser sanity pass

### Stop Conditions

- settings reintroduces admin-heavy destructive behavior
- favorites redesign demands a data-model rewrite in the same batch
- profile changes break contract/signature presentation

### What Must Not Change

- guest/signup/username restrictions
- service-layer safety boundaries
- private media exclusion

## Batch 6

### Goal

Special page integration strategy.

### Files Likely Touched

- special-page entry surfaces in the main app
- `legacy.html` approach planning docs
- future special-page frame helpers

### Checks Required

- `npm run check:all`
- local browser checks for birthday, Valentine’s, confession routes

### Stop Conditions

- special pages lose safe access
- excluded companion media handling regresses
- implementation attempts to reintroduce private media into Git or `public/`

### What Must Not Change

- special-page content intent
- private media exclusion
- current graceful fallback behavior unless explicitly improved safely

## Cross-Batch Rules

- do not combine shell redesign with sync replacement in the same batch
- do not combine redesign with Firestore rules changes
- do not combine redesign with Storage initialization
- keep root/public mirrors aligned
- run `npm run check:all` before every redesign commit
- keep prototype work outside `public/`
