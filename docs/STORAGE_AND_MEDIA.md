# Storage And Media

Last updated: 2026-09-15

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

## Real Media Format Inventory

The current private Drive-backed Album manifest contains 110 active media items. The verified format inventory is:

| Format | MIME type | Count | Kind | Intended handling |
| --- | --- | ---: | --- | --- |
| HEIC | `image/heic` | 28 | image | Drive-generated browser-compatible thumbnail/poster preview with original-download fallback |
| JPEG/JPG | `image/jpeg` | 45 | image | Native protected image preview and viewer |
| PNG | `image/png` | 2 | image | Native protected image preview and viewer |
| MP4 | `video/mp4` | 35 | video | Native protected video stream with poster fallback |

Current inventory result: 75 images, 35 videos, 0 corrupt items, and 0 unsupported formats. Do not add primary-bundle decoders or paid transcoding for hypothetical formats; support only actual owner media formats as they appear in this inventory.

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

Approved members may prepare local files in the Album upload queue without authorizing Google Drive in the browser. Actual Drive storage for normal partner uploads requires the trusted couple-level media backend so the browser does not receive the owner's Google refresh credential or a reusable Drive access token. The selected production path is Cloudflare Workers Free plus Workers KV, Firebase Auth, Firestore REST, and Google Drive. Until that Worker is deployed and verified, the queue must show a backend-required state instead of opening a Google OAuth popup in Album.

## Persistent Drive Sync Boundary

The frontend may render the Firestore media index and request a session Drive connection for owner review, but persistent Drive authorization requires a trusted backend.

`packages/drive-backend` contains the trusted-backend contract and pure request handlers used to prove the backend boundary before deployment. It validates Firebase bearer-token identity, active couple membership, OAuth state binding to `uid` and `coupleId`, indexed-media couple scope for thumbnail/stream/remove requests, and Drive sync planning for Firestore media-index writes.

`packages/drive-worker/` is the selected zero-cost Cloudflare Worker adapter for that contract. It verifies Firebase ID tokens server-side, checks active couple membership through Firestore REST, stores the Drive refresh credential encrypted in Workers KV, reconciles stable Drive metadata into Firestore, and proxies private media without persisting temporary Drive URLs.

`functions/` is a legacy Firebase Functions adapter from the previous deployment path. It is not selected for production, `firebase.json` does not route `/api/drive/**` to it, and it must not be deployed unless the architecture is explicitly changed later.

The local sync planner accepts already-authorized Drive metadata from an injected backend reader, compares it with indexed Firestore media records, and produces only stable `upsert`, `tombstone`, sync-state, and privacy-minimal audit writes. It rejects cross-couple records and temporary URL or credential-shaped fields such as Drive `thumbnailLink`, `webContentLink`, access tokens, refresh tokens, signed URLs, preview URLs, and download URLs. This proves the write contract; it does not replace the still-required persistent token host, Drive Changes processor, webhook receiver, or thumbnail/original streaming proxy.

The local upload handler validates Firebase identity and active membership, rejects exact duplicates before the Drive write boundary, accepts only image/video drafts with safe metadata, and finalizes stable Firestore media-index records after the injected Drive uploader succeeds. If Drive upload succeeds but Firestore finalization fails, it records a privacy-safe orphan recovery record instead of pretending the item is saved.

The local removal handler defaults to "Remove from Couple Book" semantics by tombstoning the media index record and leaving the original Drive file intact. Permanent Drive-original deletion is a separate destructive path that requires an explicit `delete-drive-original-{mediaId}` confirmation and a configured backend Drive remover. Both paths write privacy-minimal audit events and never expose raw Drive credentials.

The local Drive Changes/webhook handler validates Google Drive watch-channel headers against an injected channel registry, rejects expired or unknown channels, handles Drive `sync` handshakes by updating safe sync health only, and processes change batches from an injected Drive Changes reader. It advances only a safe change cursor, writes media-index upserts/tombstones through the same sync planner, and keeps audit events counts-only. The Worker contract exposes the webhook path, but full live watch/channel validation cannot be proven until the Worker is deployed and connected to Drive watch state.

The local watch-renewal handler decides whether a Drive watch channel is healthy, expiring, expired, or missing, then replaces expiring/missing channels through injected Drive watch operations. The local disconnect handler stops the active watch channel when present, writes a disconnected provider state, and audits the action without deleting Drive files or exposing credential values. Actual watch creation, stopping, and credential revocation still require the trusted Worker to be deployed.

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

Deployment approval for paid Firebase infrastructure is withdrawn. Do not upgrade `couplebook-97830` to Blaze for Couple Book media. Current external blocker for the selected path is Cloudflare account authentication and Worker/KV deployment on the Free plan.
