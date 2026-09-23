# Couple Book Final Completion Ledger

Last updated: 2026-09-23

This ledger tracks the remaining product-completion requirements for the Couple Book web app. Status values:

- PASS: implemented and verified with current evidence.
- PARTIAL: implemented or improved, but not fully proven across the required runtime surface.
- BLOCKED: cannot be completed without a specific external action or missing source.
- NOT STARTED: not yet validated in the final convergence run.

## Membership Security

Status: PASS

Evidence:

- Firestore project `couplebook-97830` uses the `(default)` STANDARD / FIRESTORE_NATIVE database.
- `npm run rules:drift` confirmed local Firestore rules exactly match deployed ruleset `0a7c0343-d9ba-4d44-a248-4b8f422788bc`.
- `npm --prefix app-v2 run test:rules` passed 16/16 emulator-backed rules tests with no skips after adding explicit `owner` and `partner` role coverage.
- Role expansion is constrained by authenticated UID, approved active user document, matching `coupleId`, active membership document, and allowed role.
- Added denial coverage proving role names alone do not grant access when the account is unapproved or belongs to another couple.

Defect:

- None known in the tested rules matrix.

Next implementation action:

- Keep rules drift in the full release gate and verify Worker authorization uses the same active-account-plus-active-membership model.

## Confession Production Restoration

Status: PASS for local owner review

Evidence:

- Authentic Confession source works locally through the private bridge.
- Local browser proof confirmed entry gate, original writing, four images, video, and audio render from `127.0.0.1:3003`.
- Implemented production-safe Confession media slots that can carry stable Google Drive media IDs without temporary URLs, OAuth data, object URLs, or local paths.
- Confession runtime now resolves Drive-backed media slots through the trusted media backend for authenticated approved users and revokes generated object URLs on cleanup.
- Uploaded the four Confession images, closing video, and background audio through the trusted Drive backend into Google Drive; Firestore stores only stable media IDs.
- Deployed Worker version `a36378f0-987a-4691-b72b-2705007f7a9f`, adding audio upload/finalization support.
- Firestore Confession document `couples/couplebook-v1/specialMoments/confession` is restored at revision 6 with one full restored letter section and six Google Drive media slots.
- Firestore rules deployed as ruleset `0a7c0343-d9ba-4d44-a248-4b8f422788bc`; local/deployed drift check passed.
- Firestore rules redeployed as ruleset `f4286238-2706-404e-9aab-344a5d235705`; local/deployed drift check passed.
- Special-moment `mediaSlots` are now trusted-backend-managed at the database boundary: client creates cannot include `mediaSlots`, and client updates must leave existing `mediaSlots` unchanged.
- Emulator rules tests prove active members can preserve existing trusted Confession slots while direct client attempts to add slots, replace a media ID, or inject a preview URL fail closed.
- Focused tests passed for special moment media slot normalization, Firestore write preservation of existing slots, Drive/media index audio classification, and Firestore rules validation.
- Browser runtime proof on `http://localhost:5173/confession` with Firestore mode and local bridge disabled: protected route resolved, unlock succeeded, card opened, full restored letter rendered, 4/4 images loaded from blob URLs, 1 video source used a blob URL, 1 audio source used a blob URL, and console warnings/errors were empty.
- Browser runtime proof on `http://localhost:5173/confession` after visible restoration: protected route resolved, unlock succeeded with `mara`, card opened, 4/4 images loaded with natural dimensions, 1 video reached `readyState: 4`, 1 audio reached `readyState: 4`, no horizontal overflow at the inspected viewport, and console warnings/errors were empty.

Defect:

- None known in the tested Confession restoration and media-slot write boundary.

Next implementation action:

- Continue full product QA: Settings write/reload proof, Album media workflow proof, responsive multi-viewport browser pass, and production Hosting review.

## Special Moment Visual Recovery

Status: PARTIAL

Evidence:

- Compared current React Birthday, Valentine, and Confession pages against legacy sources:
  - `pages/omnia-happy-birthday.html`
  - `pages/valentine/index.html`
  - `pages/confession/index.html`
- Restored Birthday to the legacy animated SVG cake structure with original `Happy Birthday Omia My Love` title, `With all my heart ♥` subtitle, purple card, frosting/candle/cherry animation, and six-piece confetti.
- Restored Valentine legacy surface details: `Omia, Will you be my Valentine?`, `Yes 💖`, `No 🙈`, `No is not an option ml ✨`, original flirty message set, moving No button, pop-up messages, floating hearts/flowers/text, and local confetti burst.
- Restored Confession visible cues without breaking the trusted Drive media path: lock emoji/hint copy, `For Mara 💜`, floating hearts/kisses/flowers, original front-card wording, and `One of my favourite moments with you 💞` media heading.
- Added `/home` as an authenticated alias/redirect to `/dashboard`; browser proof showed `http://localhost:5173/home` resolved to `http://localhost:5173/dashboard`.
- Browser proof showed Home clock remained visible on `/dashboard`.
- Browser visual sanity proof at the inspected viewport showed Birthday, Valentine, and unlocked Confession each resolved to their route, had no horizontal overflow, and produced no console warnings/errors.

Defect:

- Full multi-viewport visual comparison against the legacy pages is still pending; current proof is one live browser viewport plus DOM/media checks.

Next implementation action:

- Run mobile/tablet/desktop screenshots for Birthday, Valentine, and Confession and tune spacing/scale where the legacy identity degrades.

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
