# Memory Domain Model Plan

Date: 2026-07-08
Scope: planning only. No changes to `core/memories.json`, no media moves, no Storage initialization.

## A. Current Memory Data Observations

### Current Dataset Shape

Local observations from `core/memories.json`:

- total entries: 114
- special-page entries: 3
- photo entries: 79
- video entries: 35
- auto-titled entries matching `Photo from ...` or `Video Clip ...`: 111

Top current tags:

- `moment`: 48
- `video`: 35
- `snapchat`: 31
- `whatsapp`: 28
- `screenshot`: 6
- `special`: 3

### Authored vs Auto-Generated Entries

The current dataset is overwhelmingly auto-generated.

Examples:

- special-page entries have authored titles and purpose
- most standard memories are timestamp-derived with generic descriptions
- file-origin tags are doing more classification work than story fields

### Local Media Path Dependency

Most memories still point directly to local-style media paths such as:

- `../assets/photos/...`
- `../assets/videos/...`

This works for the local static app, but it is not a durable long-term product model.

### Special-Page Entries

The three special pages already behave like a distinct content type:

- confession
- Valentine
- birthday

They are currently stored in the same memory stream via:

- `isSpecialPage`
- `pageUrl`

That is useful short-term, but it should become a more intentional domain later.

### Tags / Source-Driven Taxonomy

Current tags are mostly technical or source-derived:

- `moment`
- `video`
- `snapchat`
- `whatsapp`
- `screenshot`
- `instagram`

This is useful for provenance, but weak for a premium story-first memory book.

### Gallery Derived From Memories

The gallery currently behaves as a projection of memories-with-media.

That means:

- gallery quality is only as good as memory metadata quality
- there is no separate media curation layer yet
- memory story and media archive concerns are mixed

## B. Future Memory Model

The future memory model should treat a memory as a story unit, not just a file record.

### Proposed Fields

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

### Field Intent

#### `memoryId`

- stable unique identifier
- not tied to file index or timestamp formatting

#### `title`

- human-authored or reviewed display title

#### `date`

- meaningful memory date
- still sortable

#### `caption` / `story`

- short lead line and optional richer context
- enough to make cards feel like memories rather than imports

#### `mood` / `category`

- emotional and editorial taxonomy
- examples later might be:
  - cozy
  - anniversary
  - celebration
  - everyday
  - special moment

#### `mediaRefs`

- references to media metadata
- not raw file blobs in Firestore

#### `specialPageRef`

- optional explicit link to a special page domain entry
- better than overloading ordinary memory entries

#### `sourceType`

Use:

- `authored`
- `imported`
- `special`
- `system`

This is better than inferring everything from title shape or tags.

#### `visibility`

- should remain `approved-couple-only`

#### `createdAt` / `updatedAt`

- useful later for editorial review and migration safety

#### Owner / Editor Metadata Later

Do not add now, but leave room for later:

- `createdByUid`
- `lastEditedByUid`

## C. Future Gallery Model

The future gallery should be a curated projection over media metadata, not just “all memories with media.”

### Direction

- media metadata separate from memory story records
- gallery cards can be grouped by moment, theme, or album later
- memory records stay story-first
- media records stay asset-first

### Important Boundary

- no raw media blobs in Firestore
- Storage remains future-only
- gallery curation can be planned before Storage initialization

## D. Future Favorites Model

Favorites should become more expressive than the current raw localStorage lists.

### Direction

- structured categories
- richer “things we love” wording
- editorial display text rather than prompt-only items
- preserve localStorage-first behavior until an intentional migration exists

### Important Constraint

- do not force a favorites data-model rewrite during shell redesign
- redesign can improve framing before storage/model migration

## E. Cleanup Plan

### What Not To Do Now

- do not delete current memories
- do not rewrite `core/memories.json`
- do not move media
- do not initialize Storage

### What To Do Later

1. classify current entries
2. distinguish:
   - authored milestones
   - special-page entries
   - technical/raw imports
3. add better captions and categories later
4. create a migration preview before any irreversible cleanup

## F. Redesign Impact

### Memory Cards

Need:

- better story fields
- less dependence on generic timestamps
- clearer distinction between authored and imported content

### Gallery

Needs:

- curation fields
- grouping strategy
- better relationship between story and asset views

### Favorites

Need:

- richer structure
- better category language
- more intimate presentation than prompt-driven list editing

## Planning Conclusion

The future redesign should not simply decorate the current memory dump.

It should preserve the current data safely while introducing a better model for:

- story quality
- editorial curation
- special-page distinction
- gallery projection
- future Storage metadata boundaries
