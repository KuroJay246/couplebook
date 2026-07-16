import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildGalleryReadModel } from '../features/gallery/galleryReadModel.js'

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
  assert.doesNotMatch(serialized, /\/assets\/photos|\/assets\/videos|C:\\\\|mediaPath|pageUrl|older"|newer"/)
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

test('gallery architecture stays read-only and avoids fetch, writes, broad queries, and Storage', async () => {
  const selectorsSource = await readFile(new URL('../features/gallery/gallerySelectors.js', import.meta.url), 'utf8')
  const readModelSource = await readFile(new URL('../features/gallery/galleryReadModel.js', import.meta.url), 'utf8')
  const hookSource = await readFile(new URL('../features/gallery/useGalleryData.js', import.meta.url), 'utf8')
  const combined = `${selectorsSource}\n${readModelSource}\n${hookSource}`

  assert.doesNotMatch(combined, /fetch\(|XMLHttpRequest|new Image|<img|<video|createObjectURL|getDownloadURL|firebase\/storage/)
  assert.doesNotMatch(combined, /\bsetItem\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(|\bsetDoc\s*\(/)
  assert.doesNotMatch(combined, /collection\([^)]*users|documents\/users(?:[/?#]|\b)/)
  assert.doesNotMatch(combined, /jaylanspencer99|C:\\Users|OUR MEMORIES|\/assets\/photos|\/assets\/videos/)
})
