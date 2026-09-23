# Couple Book Final Completion Ledger

Last updated: 2026-09-22

This ledger tracks the remaining product-completion requirements for the Couple Book web app. Status values:

- PASS: implemented and verified with current evidence.
- PARTIAL: implemented or improved, but not fully proven across the required runtime surface.
- BLOCKED: cannot be completed without a specific external action or missing source.
- NOT STARTED: not yet validated in the final convergence run.

## Membership Security

Status: PASS

Evidence:

- Firestore project `couplebook-97830` uses the `(default)` STANDARD / FIRESTORE_NATIVE database.
- `npm run rules:drift` confirmed local Firestore rules exactly match deployed ruleset `06830d05-793f-4a9d-a3d8-8f07e66a02c2`.
- `npm --prefix app-v2 run test:rules` passed 16/16 emulator-backed rules tests with no skips after adding explicit `owner` and `partner` role coverage.
- Role expansion is constrained by authenticated UID, approved active user document, matching `coupleId`, active membership document, and allowed role.
- Added denial coverage proving role names alone do not grant access when the account is unapproved or belongs to another couple.

Defect:

- None known in the tested rules matrix.

Next implementation action:

- Keep rules drift in the full release gate and verify Worker authorization uses the same active-account-plus-active-membership model.

## Confession Production Restoration

Status: PARTIAL

Evidence:

- Authentic Confession source works locally through the private bridge.
- Local browser proof confirmed entry gate, original writing, four images, video, and audio render from `127.0.0.1:3003`.
- Implemented production-safe Confession media slots that can carry stable Google Drive media IDs without temporary URLs, OAuth data, object URLs, or local paths.
- Confession runtime now resolves Drive-backed media slots through the trusted media backend for authenticated approved users and revokes generated object URLs on cleanup.
- Firestore rules now validate optional special moment `mediaSlots` and reject URL-bearing slots; deployed ruleset `06830d05-793f-4a9d-a3d8-8f07e66a02c2` matches local rules.
- Focused tests passed for special moment media slot normalization, Firestore write preservation of existing slots, Drive/media index audio classification, and Firestore rules validation.

Defect:

- Production/PWA Confession content still needs actual production Firestore media-slot population with real Drive-indexed `mediaId` values and browser proof with the local bridge disabled.

Next implementation action:

- Inventory Confession media against the Drive index and trusted media backend; populate the Firestore Confession document with stable Drive media IDs without exposing the private mapping file.

## Settings Functionality

Status: PARTIAL

Evidence:

- Grouped Settings layout is implemented and desktop browser checked.
- Settings source/page tests and build passed after layout updates.

Defect:

- Each visible Settings control still needs actual write/reload verification.

Next implementation action:

- Exercise every Settings category in browser and add safe write proof for appearance, notifications, media sync state, and session controls.

## Drive, Album, Product, PWA, QA, Release

Status: PARTIAL

Evidence:

- Existing tests cover Drive contract, Album read models, media queues, PWA source boundaries, maintenance mode, Plans, Us, and special moment framing.

Defect:

- Full browser QA, production HTTPS proof, real mobile/tablet viewport proof, production Confession proof, skipped-test audit, and final deployment verification remain open.

Next implementation action:

- Continue in priority order: Confession production, Settings writes, auth/Drive persistence, Album media workflow, remaining product routes, full QA, documentation, deployment.
