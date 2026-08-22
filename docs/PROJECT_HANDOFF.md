# Project Handoff

## Current State

- Canonical repo path: `C:\Users\Jaylan\Documents\couplebook`
- Active branch for V1.2 app experience: `feature/couplebook-v1.2-app-experience`
- V1.1 closed on `main`; production remains unchanged during V1.2.
- Origin: `https://github.com/KuroJay246/couplebook.git`
- Recovery fallback preserved outside the repo:
  - `C:\Users\Jaylan\Documents\COUPLEBOOK_RECOVERY_DO_NOT_DELETE`
  - `C:\Users\Jaylan\Documents\couplebook-pre-filter.bundle`

## Active Product

`app-v2` is the maintained React/Firebase app. Legacy static folders remain as historical/reference inputs unless a task explicitly targets them.

Protected routes:

- `/dashboard`
- `/timeline`
- `/gallery`
- `/profile`
- `/favorites`
- `/plans`
- `/settings`
- `/contract`
- `/birthday`
- `/valentine`
- `/confession`

Public route:

- `/login`

## Current Open Boundaries

- Partner account remains pending.
- Firebase Storage and private media migration remain deferred.
- V1.2 production deployment is not approved. Use Hosting preview only.
- Firestore rules changed for V1.2 plans/memory metadata and must be validated in emulator; do not deploy rules to production during V1.2 without separate approval.
- Historical docs may contain old phase language; active workflow docs live in `README.md` and the top-level `docs/` canonical set.

## V1.2 Active Features

- Active Home: Today in Us, On This Day, daily prompt, milestones, recently saved content, and quieter exploration links.
- Global Quick Add Memory: all protected routes can open the progressive Add Memory flow.
- Story: active year navigation and archived-memory restore controls.
- Gallery: Album chapters by year and Open Related Memory actions.
- Us: profile/favorites/relationship sections organized around the couple rather than authorization terminology.
- Our Plans: private couple-scoped plans with add/edit/status and plan-to-memory conversion.

## Distinct Identity Update

As of Saturday, August 22, 2026:

- active identity branch: `design/couplebook-distinct-product-identity`
- engineering baseline branch: `rebuild/couplebook-eventhub-system-port`
- current shell and route compositions use the original Couple Book brand and three-theme runtime
- preview-only deploy command for this branch: `firebase hosting:channel:deploy couplebook-distinct-identity --project couplebook-97830`
