# Memory Media And Storage Master

Date: 2026-07-08

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
