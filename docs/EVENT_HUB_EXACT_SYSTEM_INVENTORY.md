# Event Hub Exact System Inventory

Last updated: 2026-08-21

Reference repository: `C:\Users\Jaylan\Documents\gathetr`

Reference commit: `1baf2796f4c5be143bc1f8f242546ebc2c155e1d`

This file records the exact Event Hub source files currently being used as the reusable system reference for the Couple Book rebuild branch `rebuild/couplebook-eventhub-system-port`.

## Application Shell

- `src/layout/AppShell.jsx`
  - desktop rail
  - mobile navigation
  - More sheet
  - app bar
  - route title and subtitle treatment
  - mobile focus trapping
- `src/utils/navigation.js`
  - mobile primary-navigation filtering shape
- `src/components/BrandMark.jsx`
  - product identity placement pattern

## Styling and Tokens

- `src/styles.css`
  - `--gsv-*` token structure
  - safe-area handling
  - mobile tab bar pattern
  - card geometry
  - form and primary action baseline styles
- `docs/GATHER_SAVOR_VISUAL_SYSTEM_STANDARD.md`
  - direction, token hierarchy, responsive rules, and action hierarchy

## Shared UI Components

- `src/components/ui/LoadingState.jsx`
- `src/components/ui/EmptyState.jsx`
- `src/components/ui/ErrorState.jsx`
- `src/components/ui/ConfirmDialog.jsx`
- `src/components/ui/PageTabs.jsx`

These are the direct source references for the Couple Book shared UI pass under `app-v2/src/components/ui/`.

## App Boot and Routing

- `src/main.jsx`
  - provider wrapping order
  - global style entry
- `src/App.jsx`
  - route tree under protected shell
  - suspense fallback shape

## Firebase and Auth Architecture

- `src/lib/firebase.js`
  - single Firebase entry module
  - config completeness checks
  - emulator connection pattern
  - cache-aware Firestore initialization
- `src/auth/AuthProvider.jsx`
  - auth initialization lifecycle
  - persistence and guarded session flow

Couple Book preserves its own approval and couple-membership rules, but now follows the Event Hub single-entry Firebase module pattern through `app-v2/src/lib/firebase.js`.

## QA and Runtime Validation

- `scripts/check-browser-regression.mjs`
  - safe browser-test mode injection
  - route-level protected-shell coverage
- `src/test-fixtures/browser-regression.fixture.js`
  - authenticated local QA fixture shape

Couple Book now mirrors this with:

- `app-v2/scripts/validate-event-hub-shell-port.mjs`

## Current Couple Book Implementations Driven by This Inventory

- `app-v2/src/layout/AppShell.jsx`
- `app-v2/src/components/BrandMark.jsx`
- `app-v2/src/components/ui/`
- `app-v2/src/pages/LoginPage.jsx`
- `app-v2/src/auth/AuthorizationGate.jsx`
- `app-v2/src/pages/NotFoundPage.jsx`
- `app-v2/src/features/dashboard/DashboardView.jsx`
- `app-v2/src/lib/firebase.js`

## Explicit Non-Copy Boundary

Do not copy from Event Hub:

- `gathervibeshub` Firebase project identity
- event collections or event documents
- organizer/staff role logic as Couple Book product logic
- tickets, scanner, imports, payments, or reconciliation workflows as Couple Book content
- event-facing wording or route names
