# Storage And Media

Last updated: 2026-08-22

## Current Boundary

Private media remains private. Couple Book may present media metadata, verified Storage references, and protected viewer states, but it must not expose raw local paths, arbitrary public URLs, or private browser filesystem references.

## Supported Media States

- `none`
- `private-legacy-reference`
- `storage-verified`

Verified Storage paths remain scoped under:

```text
couples/{coupleId}/media/{mediaId}/original
couples/{coupleId}/media/{mediaId}/thumbnail
couples/{coupleId}/media/{mediaId}/poster
```

## Upload Queue

The Album queue retains the tested state machine for validation, duplicate protection, preview, hashing, upload, finalizing, saved, cancel, retry, and remove.
