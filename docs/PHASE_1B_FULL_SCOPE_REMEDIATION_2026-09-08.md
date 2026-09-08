# Couple Book Phase 1B Full-Scope Remediation

Date: 2026-09-08
Branch: `feature/couplebook-web-mobile-unified-system`
Firebase project boundary: `couplebook-97830`

## Current Batch

- Rechecked the active repository state from the current working tree before editing.
- Reopened JadenCreates locally as an engineering reference and adapted only the reusable media principles: safe URL boundaries, shared image/video preview behavior, video pause on unmount, stable lightbox behavior, and story-first media presentation.
- Kept Couple Book web-first. No native/mobile work was changed.
- No production Firebase deployment, production data mutation, or main-branch merge was performed.

## Album Boundary

Album now presents owner-facing language first:

- Page title: `Our Memories`
- Album story section: `Browse, open, remember`
- Add flow control: `Add details`
- Drive status copy: `Private folder ready` / `Connection needed to add files`

Provider management is not presented as the primary Album experience. Album can request a connection when adding/opening private media, while Settings owns the explanatory media-management boundary.

## Shared Media Preview

`app-v2/src/components/ui/MediaPreview.jsx` centralizes repeated image/video preview behavior:

- image and video rendering;
- lazy image loading;
- video `controls`, `muted`, `playsInline`, and `preload="metadata"`;
- video pause on unmount;
- consistent failed/unavailable state;
- no object URL creation inside view components.

Object URL ownership remains in services/controllers:

- `mediaUploadService.createPreviewUrl()` creates local upload previews.
- `useMediaUploadQueue()` revokes queue previews on finalize, cancel, remove, clear, and unmount.
- `googleDriveMediaProvider.fetchPreview()` creates temporary Drive preview URLs.
- `googleDriveMediaProvider.disconnect()` and `useGoogleDriveConnection` session reset/cleanup revoke Drive preview URLs.
- Stale preview URLs from replaced Drive sessions are revoked before rejection.

## Drive Session Fix

The OAuth origin guard remains active for the real Google Drive provider. The explicit local Drive test provider now skips only that OAuth-origin preflight, because emulator browser workflows run from `127.0.0.1` and do not open Google sign-in.

This preserves the earlier owner-facing fix for real OAuth `origin_mismatch` while restoring deterministic local media workflow proof.

Real Google Drive OAuth and live Drive upload remain not revalidated in this batch.

## Compatibility Provider Map

Current compatibility state shape:

- `state`: temporary shell status, still used by routes for loading/error/empty rendering.
- `snapshot`: legacy aggregate snapshot, still used by most feature read models.
- `error`: route-level compatibility error display.
- `refresh`: retry handle for recovery UI.

Property-level source map:

- `sources.memories`: now passed directly into Album via `memorySource`, reducing Album dependence on the full compatibility snapshot.
- `sources.settings`: still feeds Settings read model.
- `sources.profile`: still feeds Us/Profile read model.
- `sources.favorites`: still feeds Favorites read model.
- `sources.contract`: still feeds Contract read model.
- `sources.specialMoments`: still feeds Birthday, Valentine, and Confession routes.

Next reduction target should be Story/Timeline memories, then Settings/Profile/Favorites once their route contracts are stable.

## Firestore Read/Write Boundary

Read model direction remains targeted and couple-scoped:

- approved user lookup stays at `users/{uid}`;
- couple membership stays at `couples/{coupleId}/members/{uid}`;
- couple data reads stay under `couples/{coupleId}/...`;
- broad `users` collection access remains blocked by tests.

Write services remain guarded by explicit write mode, active couple membership, schema validation, stale revision checks, and privacy-minimal audit events.

Delete semantics for Album removal are archive-first:

- Album removal archives the linked memory record.
- The original Google Drive file is not deleted by the Album removal confirmation.
- The confirmation copy now states that distinction directly.

## Browser QA Adjustments

Browser and workflow scripts were updated to match the recovered Album language and to avoid false failures:

- stale `Moments we kept close`, `Our Shared Gallery`, and `Manage uploads` assertions were replaced with current copy;
- Vite HMR was disabled for ephemeral browser QA servers so websocket setup noise does not count as app console errors;
- media workflow initial `Ready` badge waits were relaxed where the queue immediately transitions into validation.

## React Doctor

Current run: `npm run health:react`

Result: 37 warnings, score disabled by `--no-score`.

Classified findings:

- `BaaS authority map shipped in browser artifact`: accepted advisory for built Firebase client SDK and app route chunks; no service account or privileged credential was found in targeted source/config scan.
- `createObjectURL without revokeObjectURL`: false positive after source inspection; upload and Drive preview URLs are revoked by queue cleanup, provider disconnect, controller reset, stale-session rejection, and unmount cleanup.
- `Data fetching inside an effect` in `ConfessionPage.jsx`: legitimate advisory; not remediated in this batch.
- `Custom modal instead of dialog`: legitimate accessibility/maintainability advisory; not remediated in this batch.
- `High control-flow complexity` and `giant component`: legitimate maintainability advisories; not remediated in this batch beyond extracting `MediaPreview`.
- script-only array/await advisories: accepted low-risk tooling advisories for deterministic maintenance scripts.

## Gate Results

Passed:

- `npm test` — 196 pass, 17 emulator-gated skips, 0 fail.
- `npm run lint`
- `npm run build`
- `npm run test:rules` — 13 pass, 0 fail.
- `npm run test:storage-rules` — 6 pass, 0 fail.
- `npm run test:browser`
- `npm run test:product`
- `npm run test:media-workflows`
- `npm run test:performance`
- `npm run test:visual`
- `npm run health:react` — completed with 37 warnings.

Warnings:

- Firebase emulator scripts warn that future Firebase Tools versions will require Java 21+.
- Real Google Drive OAuth/live Drive upload was not executed in this batch.

