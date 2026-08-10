# Media

## Current Media Boundary

Private media remains local/private. Do not move, upload, expose, or rewrite private media unless the user explicitly approves a media task.

## App Behavior

The app can render memory and gallery metadata without exposing raw private local media paths. Media document state is represented with:

- `none`
- `private-legacy-reference`
- `storage-verified`

Verified Storage metadata must use scoped paths under:

```text
couples/{coupleId}/media/{mediaId}/original
couples/{coupleId}/media/{mediaId}/thumbnail
couples/{coupleId}/media/{mediaId}/poster
```

Raw local paths, `file://` URLs, public arbitrary URLs, and unverified private media references are not valid app-v2 write targets.

## Deferred Work

Firebase Storage/private media migration is deferred until separately approved. Use `storage.app-v2.rules` and `npm --prefix app-v2 run test:storage-rules` for local rule validation only.
