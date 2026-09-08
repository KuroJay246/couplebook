# Couple Book Phase 1B Ownership Map

Date: 2026-09-08
Branch: `feature/couplebook-web-mobile-unified-system`
Checkpoint: `e169d02acd569a0ac9429fe3cf238ca3c103700c`

## Current Result

Phase 1B now has a safer Album ownership boundary:

- `GalleryView.jsx` owns Album presentation, dialogs, and user interaction wiring.
- `gallerySelectors.js` owns Album media filtering, search, and year grouping.
- `mediaUploadQueueDomain.js` owns queue status vocabulary, tones, summaries, and retry classification.
- `useMediaUploadQueue.js` owns queue side effects, Drive upload sequencing, rollback, and object URL cleanup.
- `features/media` owns Google Drive session/provider lifecycle.

This checkpoint does not prove real Google OAuth/Drive production access. The current OAuth blocker remains an owner/cloud-console configuration boundary if `http://localhost:5173` is still not registered on the Google OAuth client.

## GalleryView Responsibility Audit

| Responsibility | Category | Current Owner | Decision | Reason |
| --- | --- | --- | --- | --- |
| Album hero/header, stats, primary layout | UI | `GalleryView.jsx` | KEEP | Presentation-specific and route-local. |
| Filter controls/search/year selection state | FORM/FILTER | `GalleryView.jsx` | KEEP | User interaction state belongs to the route view. |
| Filter/search/year matching | DOMAIN | `gallerySelectors.js` | MOVED | Deterministic read-model selection logic should be testable outside the view. |
| Year group construction | DOMAIN | `gallerySelectors.js` | MOVED | Shared Album structure, not component rendering. |
| Gallery tile media status copy | UI | `GalleryView.jsx` | KEEP | Owner-facing presentation copy. |
| Lightbox dialog, keyboard navigation, remove confirmation | DIALOG/UI | `GalleryView.jsx` | KEEP FOR NOW | Still presentation-heavy; delete semantics need deeper workflow review before extraction. |
| Upload queue rendering | UI | `GalleryView.jsx` | KEEP FOR NOW | The view renders controls; domain status mapping was extracted. |
| Queue state machine/status summary | DOMAIN/SIDE EFFECT | `mediaUploadQueueDomain.js`, `useMediaUploadQueue.js` | MERGED/KEEP | Queue domain and hook now own queue states, labels, tones, summaries, and side effects. |
| Google Drive connect/list/upload/disconnect | SESSION/MEDIA | `features/media` | KEEP | Already moved out of Gallery in the previous checkpoint. |
| Real Drive OAuth local-origin guard | SESSION/SECURITY | `useGoogleDriveConnection.js` | KEEP | Blocks known local IP origin mismatch before Google sign-in. |
| Browser/local Drive test provider | TEST SUPPORT | `features/media/localGoogleDriveTestProvider.js` | KEEP | Deterministic local-only test path, not product proof. |
| Raw provider metadata or temp URLs in Album | LEGACY-COMPATIBILITY | N/A | REMOVE/REJECT | No temporary Drive URLs should persist or become stable read-model data. |

## CompatibilityProvider Data Map

`CompatibilityProvider.jsx` currently remains a protected-shell compatibility container. It does one snapshot load after auth approves a user, then exposes `{ state, snapshot, error, refresh }` through `CompatibilityContext`.

Current consumers:

- Home/Dashboard read model
- Story/Timeline read model
- Album/Gallery read model
- Favorites read model
- Us/Profile read model
- Settings read model
- Contract read model
- Special Moment content model

Current compatibility sources:

- `favorites`
- `profile`
- `settings`
- `contract`
- `memories`
- `specialMoments`
- Firestore metadata: `couple`, `membership`

Migration direction:

- Keep `CompatibilityProvider` until each route can rely on domain-specific data hooks without reintroducing duplicate reads.
- Move read selection first, side effects second.
- Do not split it into per-route Firestore listeners until listener cost, stale auth state, refresh semantics, and test coverage are explicit.

## Firestore Read Map

In Firestore source mode, `loadFirestoreCompatibilitySnapshot()` currently reads:

- `users/{uid}` indirectly through auth approval before compatibility loading.
- `couples/{coupleId}` via `getCoupleDocumentSnapshot()`.
- `couples/{coupleId}/members/{uid}` via `getCoupleMembership()`.
- `couples/{coupleId}/profiles/*` via `getFirestoreProfilesForCouple()`.
- `couples/{coupleId}/favorites/*` via `getFirestoreFavoritesForCouple()`.
- `couples/{coupleId}/settings/shared` via `getFirestoreSharedSettings()`.
- `couples/{coupleId}/settings/{uid}` via `getFirestorePrivateSettings()`.
- `couples/{coupleId}/contract/*` via `getFirestoreContract()`.
- `couples/{coupleId}/memories/*` via `getFirestoreMemoriesForCouple()`.
- `couples/{coupleId}/specialMoments/{birthday|valentine|confession}` via `getFirestoreSpecialMoment()`.

Security requirement: every read remains couple-scoped and membership-gated by Firestore Rules. Frontend route guards are not authorization.

## Delete Semantics

Current product-safe Album delete behavior is removal/archive of the Couple Book memory/media metadata. Original Google Drive media deletion is not yet proven as a real-account lifecycle and should not silently delete Drive originals from Album.

Required final behavior before owner review:

- Label the action accurately as remove/archive unless Drive original deletion is intentionally implemented.
- For Drive-backed media, preserve stable metadata and audit the Couple Book removal action without storing temp preview URLs.
- If a Drive original is ever deleted, require an explicit owner-facing destructive confirmation and prove rollback/orphan recovery.
- Keep Firebase Storage from becoming the production fallback destination.

## Verified In This Checkpoint

- Focused Gallery and queue tests passed.
- Full `npm test` passed: 195 passed, 17 skipped, 0 failed.
- `npm run lint` passed.
- `npm run build` passed.
- Local unauthenticated browser route redirected `/gallery` to `/login` as expected.
- Local authenticated browser regression passed through `npm run test:browser`.

## Still Not Proven

- Real Google OAuth consent completion.
- Real Drive folder listing/rendering from `17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa`.
- Real image/video previews from Drive in the owner account.
- Real upload, duplicate detection, rollback, orphan recovery, and no-Storage-object proof.
- Emulator Firestore/Storage rules tests skipped in the default suite.
- Preview deployment and owner acceptance.
