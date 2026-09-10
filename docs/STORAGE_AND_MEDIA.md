# Storage And Media

Last updated: 2026-09-10

## Current Boundary

Private media remains private. Couple Book may present stable media metadata, verified Google Drive references, historical verified Storage references, and protected viewer states, but it must not expose raw local paths, arbitrary public URLs, temporary Drive download URLs, OAuth tokens, or private browser filesystem references.

Google Drive is the canonical original-media archive for production media. Firestore stores only stable metadata needed for private Album browsing and recovery.

Settings may expose an optional `VITE_SHARED_ICLOUD_ALBUM_URL` shortcut when the owner configures a valid HTTPS iCloud shared-album URL. This is only a convenience link for manual review/imports. It is not a media provider, not an authorization source, not scraped by Couple Book, and not used by Album read models.

## Supported Media States

- `none`
- `private-legacy-reference`
- `drive-indexed`
- `drive-verified`
- `storage-verified`

`drive-indexed` records live under:

```text
couples/{coupleId}/mediaItems/{mediaId}
couples/{coupleId}/mediaSync/google-drive
```

Production Album reads depend on the deployed Firestore ruleset containing these paths. Use `npm run rules:drift` to confirm the live ruleset includes active-member read coverage for both paths before treating media-index reads as unblocked. A stale deployed ruleset will produce `permission-denied` for approved members even when the local rules and emulator tests pass.

Allowed stable Drive metadata includes `coupleId`, `memoryId`, `driveFileId`, `driveFolderId`, provider, MIME type, media type, dimensions, duration, size, checksum, safe captions, and created/modified/captured timestamps.

Do not persist:

- browser object URLs;
- Drive `thumbnailLink` or `webContentLink`;
- temporary download URLs;
- OAuth access tokens;
- OAuth refresh tokens;
- signed URLs;
- raw local file paths.

Historical verified Storage paths remain scoped under:

```text
couples/{coupleId}/media/{mediaId}/original
couples/{coupleId}/media/{mediaId}/thumbnail
couples/{coupleId}/media/{mediaId}/poster
```

## Upload Queue

The Album queue retains the tested state machine for validation, duplicate protection, preview, hashing, upload, finalizing, saved, cancel, retry, orphan recovery, and remove. Production media writes must stay Drive-first; Firebase Storage must not silently become the production original-media destination.

Approved members may prepare local files in the Album upload queue without authorizing Google Drive in the browser. Actual Drive storage for normal partner uploads requires the trusted couple-level media backend so the browser does not receive the owner's Google refresh credential or a reusable Drive access token. Until that backend is owner-approved and deployed, the queue must show a backend-required state instead of opening a Google OAuth popup in Album.

## Persistent Drive Sync Boundary

The frontend may render the Firestore media index and request a session Drive connection for owner review, but persistent Drive authorization requires a trusted backend.

`packages/drive-backend` contains the local trusted-backend contract and pure request handlers used to prove the backend boundary before deployment. It validates Firebase bearer-token identity, active couple membership, OAuth state binding to `uid` and `coupleId`, indexed-media couple scope for thumbnail/stream/remove requests, and Drive sync planning for Firestore media-index writes. This package is not deployed hosting and does not store Google refresh credentials.

The local sync planner accepts already-authorized Drive metadata from an injected backend reader, compares it with indexed Firestore media records, and produces only stable `upsert`, `tombstone`, sync-state, and privacy-minimal audit writes. It rejects cross-couple records and temporary URL or credential-shaped fields such as Drive `thumbnailLink`, `webContentLink`, access tokens, refresh tokens, signed URLs, preview URLs, and download URLs. This proves the write contract; it does not replace the still-required persistent token host, Drive Changes processor, webhook receiver, or thumbnail/original streaming proxy.

The local upload handler validates Firebase identity and active membership, rejects exact duplicates before the Drive write boundary, accepts only image/video drafts with safe metadata, and finalizes stable Firestore media-index records after the injected Drive uploader succeeds. If Drive upload succeeds but Firestore finalization fails, it records a privacy-safe orphan recovery record instead of pretending the item is saved.

The local removal handler defaults to "Remove from Couple Book" semantics by tombstoning the media index record and leaving the original Drive file intact. Permanent Drive-original deletion is a separate destructive path that requires an explicit `delete-drive-original-{mediaId}` confirmation and a configured backend Drive remover. Both paths write privacy-minimal audit events and never expose raw Drive credentials.

The local Drive Changes/webhook handler validates Google Drive watch-channel headers against an injected channel registry, rejects expired or unknown channels, handles Drive `sync` handshakes by updating safe sync health only, and processes change batches from an injected Drive Changes reader. It advances only a safe change cursor, writes media-index upserts/tombstones through the same sync planner, and keeps audit events counts-only. It does not create a public webhook endpoint, renew real watch channels, or call Google APIs until an owner-approved trusted deployment exists.

Required backend responsibilities:

- verify Firebase ID tokens and active couple membership;
- bind OAuth state to the requesting `uid` and `coupleId`;
- exchange Google authorization codes server-side;
- store Google refresh credentials outside browser source and Firestore media records;
- process Drive Changes cursors and webhook notifications;
- renew Drive watch channels;
- reconcile Drive files into `couples/{coupleId}/mediaItems`;
- write privacy-minimal audit events;
- serve thumbnail/original previews through short-lived backend mediation or a safe cache without persisting stale URLs.

Deployment remains owner-approval-required. Do not deploy a backend, enable billing, or store refresh credentials until the owner approves that exact plan.
