# Media Migration Plan

Date: 2026-07-08
Scope: planning only. No Storage initialization, no upload, no local file move, and no deploy occurs in this phase.

## Current Local-Only Media Categories

- private photo library under excluded local photo folders
- private video library under excluded local video folders
- raw backup/media organization folders such as `OUR MEMORIES/`
- special-page companion media for confession and Valentine flows
- birthday and other special-page assets that may later need private cloud delivery

## Future Target Storage Paths

- `users/{uid}/memories/{memoryId}/photos/{filename}`
- `users/{uid}/memories/{memoryId}/videos/{filename}`
- `special-pages/birthday/{filename}`
- `special-pages/valentines/{filename}`
- `special-pages/confessions/{filename}`
- `gallery/photos/{filename}`
- `gallery/videos/{filename}`

## Firestore Metadata Map

This app should later keep metadata in Firestore, not raw media blobs.

### User Memory Media

- Firestore collection/domain:
  - future `memories`
  - future `mediaMetadata`
- Suggested metadata:
  - `memoryId`
  - `ownerUid`
  - `storagePath`
  - `type` (`photo`, `video`, `audio`)
  - `contentType`
  - `createdAt`
  - `caption` or `description`
  - `visibility` limited to the approved couple model

### Special Pages

- Firestore collection/domain:
  - future `specialPages`
- Suggested metadata:
  - `pageType` (`birthday`, `valentines`, `confessions`)
  - `storagePath`
  - `type`
  - `contentType`
  - `active`
  - `displayOrder`

### Gallery

- Firestore collection/domain:
  - future `mediaMetadata`
  - possibly future `tags`
- Suggested metadata:
  - `storagePath`
  - `type`
  - `sourceDomain` (`gallery`, `memory`, `special-page`)
  - `tags`
  - `createdAt`

## Recommended Later Upload Order

1. Lowest-risk public-safe test subset approved by the human owner
2. Small photo set for one known memory path
3. Small special-page asset set only if the page reference strategy is ready
4. Gallery photo set
5. Videos last, after bandwidth and access behavior are proven

This order reduces cost and privacy exposure while validating the path model gradually.

## Later Validation Checks

After Storage is intentionally enabled in a future phase:

- confirm Storage rules are private and delete-blocked as designed
- confirm each uploaded file has a matching Firestore metadata record if required
- confirm both approved accounts can access allowed media
- confirm no public/unauthenticated access works
- confirm Git still excludes raw media
- confirm `public/` remains media-clean

## What Should Never Be Uploaded

- raw backup libraries copied only for preservation
- `OUR MEMORIES/` as a bulk dump
- bundle backups
- exports, logs, or service account files
- media not explicitly approved for cross-device access
- any file whose ownership/path purpose is still unknown

## How Special Pages Should Reference Storage Later

- special pages should stop relying on local companion file paths
- they should reference Storage-backed media through metadata or a thin service layer
- local fallback behavior should remain graceful until the Storage-backed reference is fully ready
- no page should assume that local-only excluded companion files exist in production

## Guardrails For The First Real Migration Phase

- do not upload directly from excluded folders without a reviewed selection list
- do not combine Storage initialization, media upload, and UI refactor into one batch
- run `npm run check:all` before and after planning/metadata changes
- preserve original local files regardless of upload success or failure

## Current Status

Migration remains unstarted by design. Raw private media stays local-only, `public/` stays clean, and Storage remains a future decision rather than an active dependency.
