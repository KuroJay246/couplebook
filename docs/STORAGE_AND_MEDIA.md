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

`packages/drive-backend` contains the local trusted-backend contract and pure request handlers used to prove the backend boundary before deployment. It validates Firebase bearer-token identity, active couple membership, OAuth state binding to `uid` and `coupleId`, and indexed-media couple scope for thumbnail/stream/remove requests. This package is not deployed hosting and does not store Google refresh credentials.

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
