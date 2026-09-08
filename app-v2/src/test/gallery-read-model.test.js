import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildGalleryReadModel } from '../features/gallery/galleryReadModel.js'
import { groupGalleryItemsByYear, selectFilteredGalleryItems } from '../features/gallery/gallerySelectors.js'

function createMemoryRecord(overrides = {}) {
  return {
    id: 'gallery-memory-001',
    title: 'Fictional gallery memory',
    description: 'A fictional gallery memory used only for read-model coverage.',
    dateLabel: '2026-05-10T12:00:00.000Z',
    tags: ['fictional', 'gallery'],
    mediaKind: 'image',
    mediaPath: '/assets/photos/fictional-gallery.jpg',
    isSpecialPage: false,
    pageUrl: null,
    source: 'static-json',
    unknownFields: {},
    ...overrides,
  }
}

function createSnapshot(memorySource) {
  return {
    status: memorySource.status === 'unavailable' ? 'empty' : 'ready',
    warnings: memorySource.warnings || [],
    sources: {
      memories: memorySource,
    },
  }
}

test('gallery read model classifies photos, videos, special moments, and unavailable media safely', () => {
  const model = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'legacy-local-dev',
      data: {
        hasBaseDataset: true,
        customMemoryCount: 0,
        overriddenMemoryCount: 0,
        deletedMemoryCount: 0,
        memories: [
          createMemoryRecord({ id: 'photo-one', mediaKind: 'image', mediaPath: '/assets/photos/fictional-one.jpg' }),
          createMemoryRecord({ id: 'video-one', mediaKind: 'video', mediaPath: '/assets/videos/fictional-one.mp4' }),
          createMemoryRecord({
            id: 'special-one',
            mediaKind: 'unknown',
            mediaPath: '',
            isSpecialPage: true,
            pageUrl: 'confession/index.html',
          }),
          createMemoryRecord({ id: 'invalid-one', mediaKind: 'image', mediaPath: 'C:\\private\\fictional.jpg' }),
          createMemoryRecord({ id: 'no-media-one', mediaKind: 'unknown', mediaPath: '' }),
        ],
      },
      warnings: [],
    }),
  })

  assert.equal(model.status, 'ready')
  assert.equal(model.summary.photos, 2)
  assert.equal(model.summary.videos, 1)
  assert.equal(model.summary.specialMoments, 1)
  assert.equal(model.summary.unavailableMedia, 2)
  assert.equal(model.summary.invalidMedia, 1)
  assert.equal(model.summary.noMedia, 2)
  assert.equal(model.items.length, 5)
  assert.equal(model.photos.length, 2)
  assert.equal(model.videos.length, 1)
  assert.equal(model.unavailableMedia.length, 3)
  assert.ok(model.collections.featured.some((collection) => collection.key === 'special-moments' && collection.count === 1))
})

test('gallery read model exposes no raw private paths and keeps deterministic grouping and filters', () => {
  const snapshot = createSnapshot({
    status: 'ready',
    source: 'legacy-local-dev',
    data: {
      hasBaseDataset: true,
      customMemoryCount: 0,
      overriddenMemoryCount: 0,
      deletedMemoryCount: 0,
      memories: [
        createMemoryRecord({ id: 'older', title: 'Older fictional photo', dateLabel: '2025-06-10', mediaPath: '/assets/photos/older.jpg' }),
        createMemoryRecord({ id: 'newer', title: 'Newer fictional video', dateLabel: '2026-05-10', mediaKind: 'video', mediaPath: '/assets/videos/newer.mp4' }),
      ],
    },
    warnings: [],
  })
  const before = structuredClone(snapshot)
  const model = buildGalleryReadModel({ compatibilitySnapshot: snapshot })
  const serialized = JSON.stringify(model)

  assert.deepEqual(snapshot, before)
  assert.equal(Object.isFrozen(model), true)
  assert.equal(model.collections.featured[0].items[0].title, 'Newer fictional video')
  assert.deepEqual(model.filters.availableYears.map((year) => year.key), ['2026', '2025'])
  assert.ok(model.filters.availableTypes.some((type) => type.key === 'photos'))
  assert.ok(model.filters.availableTypes.some((type) => type.key === 'videos'))
  assert.doesNotMatch(serialized, /\/assets\/photos|\/assets\/videos|C:\\\\|mediaPath|pageUrl/)
})

test('gallery read model exposes verified storage media without raw local references', () => {
  const model = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        memories: [
          createMemoryRecord({
            id: 'verified-video',
            revision: 3,
            mediaPath: '',
            mediaKind: 'video',
            media: {
              kind: 'video',
              storagePath: 'couples/couple_alpha/media/media_001/original',
              posterPath: 'couples/couple_alpha/media/media_001/poster',
              contentType: 'video/mp4',
              sizeBytes: 100,
            },
          }),
        ],
      },
      warnings: [],
    }),
  })

  assert.equal(model.verifiedMedia.length, 1)
  assert.equal(model.videos[0].memoryRevision, 3)
  assert.equal(model.videos[0].media.status, 'storage-verified')
  assert.equal(model.videos[0].media.storagePath, 'couples/couple_alpha/media/media_001/original')
  assert.doesNotMatch(JSON.stringify(model), /C:\\\\|OUR MEMORIES|\/assets\/videos/)
})

test('gallery read model exposes verified Drive media for Album removal', () => {
  const model = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        memories: [
          createMemoryRecord({
            id: 'verified-drive-image',
            revision: 4,
            mediaPath: '',
            mediaKind: 'image',
            media: {
              provider: 'google-drive',
              kind: 'image',
              driveFileId: 'drive_test_1234567890',
              driveFolderId: '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa',
              contentType: 'image/png',
              sizeBytes: 100,
            },
          }),
        ],
      },
      warnings: [],
    }),
  })

  assert.equal(model.verifiedMedia.length, 1)
  assert.equal(model.photos[0].memoryRevision, 4)
  assert.equal(model.photos[0].media.status, 'drive-verified')
  assert.equal(model.photos[0].media.id, '')
  assert.equal(model.photos[0].media.provider, 'google-drive')
  assert.equal(model.photos[0].media.providerFileId, 'drive_test_1234567890')
  assert.equal(model.photos[0].media.type, 'image')
  assert.equal(model.photos[0].media.mimeType, 'image/png')
  assert.equal(model.photos[0].media.driveFileId, 'drive_test_1234567890')
  assert.equal(model.photos[0].media.driveFolderId, '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa')
  assert.doesNotMatch(JSON.stringify(model), /C:\\\\|OUR MEMORIES|\/assets\/photos/)
})

test('gallery read model preserves the shared normalized media asset shape', () => {
  const model = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        memories: [
          createMemoryRecord({
            id: 'stable-drive-memory',
            mediaPath: '',
            mediaKind: 'image',
            media: {
              id: 'media_stable_001',
              provider: 'google-drive',
              kind: 'image',
              driveFileId: 'drive_test_stable_001',
              driveFolderId: '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa',
              contentType: 'image/webp',
              sizeBytes: 2048,
            },
          }),
        ],
      },
      warnings: [],
    }),
  })

  const media = model.items[0].media
  assert.deepEqual(
    {
      id: media.id,
      provider: media.provider,
      providerFileId: media.providerFileId,
      type: media.type,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
    },
    {
      id: 'media_stable_001',
      provider: 'google-drive',
      providerFileId: 'drive_test_stable_001',
      type: 'image',
      mimeType: 'image/webp',
      sizeBytes: 2048,
    },
  )
})

test('gallery read model excludes archived memories from active collections', () => {
  const model = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        memories: [
          createMemoryRecord({ id: 'active-gallery-memory', title: 'Fictional active gallery', status: 'active' }),
          createMemoryRecord({ id: 'archived-gallery-memory', title: 'Fictional archived gallery', status: 'archived' }),
        ],
      },
      warnings: [],
    }),
  })

  assert.equal(model.summary.totalMemories, 1)
  assert.equal(model.photos.length, 1)
  assert.doesNotMatch(JSON.stringify(model), /archived-gallery-memory|Fictional archived gallery/)
})

test('gallery read model distinguishes unavailable from empty and partial states', () => {
  const unavailableModel = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'unavailable',
      source: 'legacy-local-dev',
      data: null,
      warnings: ['Legacy local memory bridge is disabled.'],
    }),
  })
  const emptyModel = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'empty',
      source: 'legacy-local-dev',
      data: {
        hasBaseDataset: true,
        customMemoryCount: 0,
        overriddenMemoryCount: 0,
        deletedMemoryCount: 0,
        memories: [],
      },
      warnings: [],
    }),
  })
  const partialModel = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'legacy-local-dev',
      data: {
        hasBaseDataset: false,
        customMemoryCount: 1,
        overriddenMemoryCount: 0,
        deletedMemoryCount: 0,
        memories: [createMemoryRecord({ source: 'local-custom' })],
      },
      warnings: [],
    }),
  })

  assert.equal(unavailableModel.status, 'unavailable')
  assert.equal(emptyModel.status, 'empty')
  assert.equal(partialModel.status, 'partial')
})

test('gallery read model counts Firestore private media references with the same media semantics as timeline', () => {
  const model = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        memories: [
          createMemoryRecord({
            id: 'firestore-photo',
            dateLabel: '',
            date: '2026-07-21',
            mediaKind: '',
            mediaPath: '',
            mediaState: 'private-legacy-reference',
            isVideo: false,
          }),
          createMemoryRecord({
            id: 'firestore-video',
            title: 'Video Clip 0722',
            dateLabel: '',
            date: '2026-07-22',
            mediaKind: '',
            mediaPath: '',
            mediaState: 'private-legacy-reference',
          }),
        ],
      },
      warnings: [],
    }),
  })

  assert.equal(model.summary.totalMemories, 2)
  assert.equal(model.summary.photos, 1)
  assert.equal(model.summary.videos, 1)
  assert.equal(model.summary.unavailableMedia, 2)
  assert.equal(model.items.length, 2)
  assert.equal(model.photos[0].media.status, 'private-legacy-reference')
  assert.equal(model.videos[0].media.status, 'private-legacy-reference')
})

test('gallery selectors own Album filtering, search, and year grouping', () => {
  const model = buildGalleryReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        memories: [
          createMemoryRecord({ id: 'photo-2026', title: 'Fictional rose garden', dateLabel: '2026-02-14', mediaKind: 'image', mediaPath: '/assets/photos/rose.jpg', tags: ['garden'] }),
          createMemoryRecord({ id: 'video-2025', title: 'Fictional boardwalk clip', dateLabel: '2025-07-01', mediaKind: 'video', mediaPath: '/assets/videos/boardwalk.mp4', tags: ['summer'] }),
          createMemoryRecord({ id: 'photo-2025', title: 'Fictional quiet dinner', dateLabel: '2025-01-15', mediaKind: 'image', mediaPath: '/assets/photos/dinner.jpg', tags: ['dinner'] }),
        ],
      },
      warnings: [],
    }),
  })

  const videos = selectFilteredGalleryItems(model.items, { filter: 'videos' })
  const searchedPhotos = selectFilteredGalleryItems(model.items, { filter: 'photos', search: 'quiet', year: '2025' })
  const grouped = groupGalleryItemsByYear(model.items)

  assert.equal(videos.length, 1)
  assert.equal(videos[0].title, 'Fictional boardwalk clip')
  assert.equal(searchedPhotos.length, 1)
  assert.equal(searchedPhotos[0].title, 'Fictional quiet dinner')
  assert.deepEqual(grouped.map((group) => group.yearLabel), ['2026', '2025'])
  assert.equal(Object.isFrozen(videos), true)
  assert.equal(Object.isFrozen(grouped), true)
})

test('gallery architecture stays read-only and routes Storage through the media service only', async () => {
  const selectorsSource = await readFile(new URL('../features/gallery/gallerySelectors.js', import.meta.url), 'utf8')
  const readModelSource = await readFile(new URL('../features/gallery/galleryReadModel.js', import.meta.url), 'utf8')
  const hookSource = await readFile(new URL('../features/gallery/useGalleryData.js', import.meta.url), 'utf8')
  const combined = `${selectorsSource}\n${readModelSource}\n${hookSource}`

  assert.doesNotMatch(combined, /fetch\(|XMLHttpRequest|new Image|createObjectURL|getDownloadURL|firebase\/storage/)
  assert.doesNotMatch(combined, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(|\bsetDoc\s*\(/)
  assert.doesNotMatch(combined, /collection\([^)]*users|documents\/users(?:[/?#]|\b)/)
  assert.doesNotMatch(combined, /jaylanspencer99|C:\\Users|OUR MEMORIES|\/assets\/photos|\/assets\/videos/)
})
