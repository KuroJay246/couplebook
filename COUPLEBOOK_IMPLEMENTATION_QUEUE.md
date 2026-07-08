# Couple Book Implementation Queue

Date: 2026-07-08
Scope: next recommended work queue after Phase 8 automation

## A. Must Close

### Approved-Account Smoke

- run real authenticated browser smoke for Jaylan approved account
- run real authenticated browser smoke for partner approved account
- mark status as `PASS` only if both succeed without permission-denied errors
- mark `FAIL` honestly if live strict-rules behavior breaks approved-user flow

## B. Architecture

### Auth Service Verification

- review Phase 8B auth wrapper in real authenticated flow
- confirm display-name resolution still behaves correctly for both approved users

### Sync Read Preparation

- validate the new `syncReadService.js` helpers against live approved-user sessions
- confirm normalization assumptions against real cloud user documents

### Targeted `firestoreSync` Replacement Plan

- replace collection-wide active-user read with document-scoped user read
- design partner/shared data lookup without full `users` collection scans
- reduce listener scope from collection-wide to explicit document subscriptions
- keep writes behavior-identical until reads/listeners are proven safe

### Root/Public Mirror Strategy

- keep mirrors aligned short-term
- decide whether the next safe move is generation tooling, source-of-truth reduction, or a later framework migration

## C. QA

### Current Safety Lane

- keep running:
  - `check:all`
  - `check:mirrors`
  - `check:services`
  - `check:prototype`

### Next QA Additions

- lightweight clean-account smoke concept for unauthenticated route gating
- helper-level tests once a test runner exists
- future lint plan when source/public duplication strategy is clearer

## D. UI

### Production Shell Plan

- turn the non-live prototype into an implementation checklist, not a direct copy
- preserve the current static app while planning one coherent protected shell

### Dashboard Redesign Plan

- move from utility dashboard toward story-first private scrapbook home
- reduce status/clock dominance
- elevate milestone and featured-memory storytelling

### Story / Gallery / Profile / Favorites / Settings Plan

- timeline story-card redesign
- curated gallery structure
- paired profile presentation
- richer favorites model/presentation
- calmer, less admin-like settings composition

## E. Storage

- remain future-only
- do not initialize Firebase Storage until explicitly approved
- do not move media until the private migration plan is intentionally opened
