# Memory Media And Storage Master

Date: 2026-07-13

## Current Memory Dataset

Observed local dataset in `core/memories.json`:

| Metric | Count |
| --- | --- |
| Total entries | 114 |
| Special-page entries | 3 |
| Photos | 79 |
| Videos | 35 |
| Auto-titled entries (`Photo from` / `Video Clip`) | 111 |

Most common tags:

- `moment`
- `video`
- `snapchat`
- `whatsapp`
- `screenshot`

## Authored Vs Auto-Generated Memories

### Stronger Authored / Intentional Entries

- confession special page
- Valentine special page
- birthday special page

### Mostly Auto-Generated Entries

- timestamp-derived titles
- generic descriptions
- source-driven tags
- repeated raw media references

This confirms the current dataset behaves more like an import dump than a curated memory book.

## 2026-07-12 Verified Local Media Reality

| Area | Current reality |
| --- | --- |
| `assets/photos/` | missing in the current clean workspace |
| `assets/videos/` | missing in the current clean workspace |
| `assets/thumbnails/` | present but empty |
| `OUR MEMORIES/` | present as a large local-only private archive |
| `public/` media tracking | still clean; no private media was found in Hosting root |
| `core/memories.json` references | still point broadly at `/assets/photos/*` and `/assets/videos/*` |

Runtime audit evidence from the clean workspace:

- dashboard emitted 3 missing-media 404s
- timeline emitted 84 missing-media 404s
- gallery emitted 44 missing-media 404s
- profile emitted 4 missing avatar/media 404s
- contract emitted 2 missing avatar/media 404s
- direct confession page emitted 6 missing companion-file 404s

What this means:

- placeholder UX now softens the failure, but the current clean repo copy cannot render the actual memory media set
- the memory dataset and the private local archive are currently out of sync with the path structure expected by the static app
- any future migration must separate content preservation from path cleanup and upload/storage decisions

## 2026-07-13 Legacy Memory Bridge Safety

The React migration track now treats legacy memory sources with explicit safety classes:

- root `core/memories.json`
  development-only source for the local compatibility bridge
- `public/core/memories.json`
  unsafe publicly exposed mirror that app-v2 must never consume
- `memorybook_custom_memories`
  safe authenticated browser compatibility read
- `memorybook_deleted_memories`
  safe authenticated browser compatibility read
- `memorybook_overridden_memories`
  safe authenticated browser compatibility read

The new app-v2 memory adapter enforces these rules:

- no static import of `core/memories.json`
- no copy of legacy memory JSON into `app-v2/src`
- no copy into `app-v2/public`
- no bundled snapshot containing private memories
- local bridge disabled by default
- local bridge allowed only when:
  - `VITE_ENABLE_LEGACY_LOCAL_BRIDGE=true`
  - `VITE_LEGACY_LOCAL_BASE_URL` resolves to `localhost` or `127.0.0.1`
  - the browser itself is running on `localhost` or `127.0.0.1`
  - the runtime is not a production build
- bridge failures close safely and do not persist fetched memory data

Safe defaults now documented in `app-v2/.env.example`:

- `VITE_ENABLE_LEGACY_LOCAL_BRIDGE=false`
- `VITE_LEGACY_LOCAL_BASE_URL=` blank until local development explicitly opts in

Fixture policy:

- app-v2 tests use only sanitized fictional memory fixtures
- no real private memory entries were copied into app-v2
- no private media paths were added to app-v2

## Future Memory Model

The future model should treat a memory as a story unit.

Suggested fields:

- `memoryId`
- `title`
- `date`
- `caption`
- `story`
- `mood`
- `category`
- `mediaRefs`
- `specialPageRef`
- `sourceType`
- `visibility`
- `createdAt`
- `updatedAt`

Suggested `sourceType` values:

- `authored`
- `imported`
- `special`
- `system`

Current rule:

- do not rewrite the dataset yet
- classify first, migrate later

## Gallery Model

The future gallery should be a curated projection over media metadata, not just “all memories with media.”

Direction:

- media metadata separated from memory story
- better photo/video distinction
- albums or collections later
- no raw media blobs in Firestore

## Favorites Model

Favorites should evolve from the current raw localStorage object into a richer “things we love” structure.

Direction:

- structured categories
- richer presentation language
- keep localStorage-first until migration is intentionally opened

## Storage Decision

Current decision: hold.

Firebase Storage remains:

- uninitialized
- undeployed
- future-only

Do not enable it until:

1. approved-account smoke passes
2. service/sync path is clearer
3. first-upload scope is explicitly approved
4. rules and metadata path plan are reviewed again

## Media Migration Plan

### Future target storage paths

- `users/{uid}/memories/{memoryId}/photos/{filename}`
- `users/{uid}/memories/{memoryId}/videos/{filename}`
- `special-pages/birthday/{filename}`
- `special-pages/valentines/{filename}`
- `special-pages/confessions/{filename}`
- `gallery/photos/{filename}`
- `gallery/videos/{filename}`

### Firestore metadata direction

Store metadata only, not blobs.

Likely metadata:

- `memoryId`
- `ownerUid`
- `storagePath`
- `type`
- `contentType`
- `createdAt`
- `caption`
- `visibility`

### Recommended later upload order

1. smallest approved photo subset
2. one known memory-path subset
3. special-page assets only if reference strategy is ready
4. gallery photos
5. videos last

## What Must Never Be Uploaded

- raw backup libraries
- `OUR MEMORIES/` bulk dumps
- bundle backups
- exports and logs
- service account files
- unreviewed private media
- any file whose ownership or purpose is unclear

## Current Local-Only Rules

Keep local-only:

- excluded private photos
- excluded private videos
- special-page companion media
- backup / manual organization folders
- `OUR MEMORIES/` archive content until a deliberate reviewed mapping exists
- root `core/memories.json` compatibility access unless and until the explicit localhost-only bridge is enabled by a developer

Do not move these during planning.

## Curation Checklist

Before any cleanup later:

1. identify technical/raw entries
2. identify real milestone entries
3. identify special-page entries
4. identify missing captions
5. identify local-only media dependencies
6. decide which memories deserve featured-home treatment
7. do not delete memories without explicit approval

## Project Cleanup Notes

Still true after consolidation:

- `assets/photos/`, `assets/videos/`, and `OUR MEMORIES/` stay out of Git
- `public/` stays media-clean
- backup bundle stays private and outside deploy paths

## Next Safe Media Step

While approved-account smoke is `HOLD`:

- continue planning only
- do not initialize Storage
- do not move private media
- do not rewrite `core/memories.json`
- do not consume `public/core/memories.json` from app-v2
- first restore or map the expected local asset-path contract before claiming any gallery/media runtime is fully healthy
