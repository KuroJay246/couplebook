# Media

## Current Media Boundary

Private media remains private. Do not move, upload, expose, or rewrite private media unless the user explicitly approves a media task.

Google Drive is the canonical original-media archive for Couple Book production media. Firestore stores stable media metadata only.

## App Behavior

The app can render memory and gallery metadata without exposing raw private local media paths or temporary Drive URLs. Media document state is represented with:

- `none`
- `private-legacy-reference`
- `drive-indexed`
- `drive-verified`
- `storage-verified`

Drive media index records must use:

```text
couples/{coupleId}/mediaItems/{mediaId}
couples/{coupleId}/mediaSync/google-drive
```

Allowed stable fields include `driveFileId`, `driveFolderId`, provider, MIME type, media type, dimensions, duration, size, checksum, captured timestamps, safe captions, and relationship to a memory.

Never persist object URLs, Google access tokens, refresh tokens, signed URLs, Drive `thumbnailLink`, Drive `webContentLink`, raw local paths, or private preview URLs.

Historical verified Storage metadata must use scoped paths under:

```text
couples/{coupleId}/media/{mediaId}/original
couples/{coupleId}/media/{mediaId}/thumbnail
couples/{coupleId}/media/{mediaId}/poster
```

Raw local paths, `file://` URLs, public arbitrary URLs, and unverified private media references are not valid app-v2 write targets.

## Deferred Work

Persistent Google Drive sync is deferred until an owner-approved trusted backend exists for OAuth code exchange, refresh-token storage, Drive Changes processing, webhook handling, watch renewal, reconciliation, thumbnail mediation, and privacy-minimal audit writes.

Firebase Storage/private media migration remains historical/deferred and must not become the production original-media path without separate approval. Use `storage.app-v2.rules` and `npm --prefix app-v2 run test:storage-rules` for local rule validation only.

Generated media inventories, duplicate reports, recovery logs, local migration packages, visual audit output, and private review packages are local/private evidence. They are ignored by Git and should not be deleted unless they are reproducible stale output.
