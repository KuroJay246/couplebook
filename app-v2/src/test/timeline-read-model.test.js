import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTimelineReadModel } from '../features/timeline/timelineReadModel.js'

function createMemoryRecord(overrides = {}) {
  return {
    id: 'timeline-memory-001',
    title: 'Fictional archive chapter',
    description: 'A fictional archive chapter used only for Timeline read-model coverage.',
    dateLabel: '2026-05-10T12:00:00.000Z',
    tags: ['fictional', 'story'],
    mediaKind: 'image',
    mediaPath: '/assets/photos/fictional-archive.jpg',
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
      favorites: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
      profile: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
      settings: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
      contract: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
      memories: memorySource,
    },
  }
}

test('timeline read model returns a ready state, accurate summary, safe chapters, and featured null when the base dataset is available', () => {
  const model = buildTimelineReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'legacy-local-dev',
      data: {
        hasBaseDataset: true,
        customMemoryCount: 0,
        overriddenMemoryCount: 0,
        deletedMemoryCount: 0,
        memories: [
          createMemoryRecord({
            id: 'special-valentine',
            title: 'Fictional valentine archive',
            dateLabel: '2026-02-14',
            mediaPath: '',
            isSpecialPage: true,
            pageUrl: 'valentine/index.html',
            tags: ['special'],
          }),
          createMemoryRecord({
            id: 'regular-story',
            title: 'Fictional regular archive',
            dateLabel: '2026-05-10T12:00:00.000Z',
            tags: ['story'],
          }),
        ],
      },
      warnings: [],
    }),
  })

  assert.equal(model.status, 'ready')
  assert.equal(model.summary.totalMemories, 2)
  assert.equal(model.summary.specialMoments, 1)
  assert.equal(model.featured, null)
  assert.equal(model.chapters.length, 1)
  assert.equal(model.chapters[0].label, '2026')
  assert.equal(model.chapters[0].groups[0].label, 'Special moments')
  assert.ok(model.filters.availableTags.some((tag) => tag.key === 'special'))
  assert.equal(model.sourceStatus.base.status, 'ready')
  assert.equal(Object.isFrozen(model), true)
})

test('timeline read model distinguishes empty, unavailable, partial overlay-only, and invalid memory states honestly', () => {
  const emptyModel = buildTimelineReadModel({
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
  const unavailableModel = buildTimelineReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'unavailable',
      source: 'legacy-local-dev',
      data: null,
      warnings: ['Legacy local memory bridge is disabled.'],
    }),
  })
  const partialModel = buildTimelineReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'ready',
      source: 'legacy-local-dev',
      data: {
        hasBaseDataset: false,
        customMemoryCount: 1,
        overriddenMemoryCount: 0,
        deletedMemoryCount: 0,
        memories: [
          createMemoryRecord({
            id: 'custom-only',
            source: 'local-custom',
            mediaPath: '',
          }),
        ],
      },
      warnings: ['Legacy local memory bridge is disabled.'],
    }),
  })
  const invalidModel = buildTimelineReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'invalid',
      source: 'legacy-local-dev',
      data: {
        hasBaseDataset: true,
        customMemoryCount: 0,
        overriddenMemoryCount: 1,
        deletedMemoryCount: 0,
        memories: [
          createMemoryRecord({
            id: 'invalid-special',
            mediaPath: '',
            isSpecialPage: true,
            pageUrl: 'unsafe/legacy-route.html',
          }),
        ],
      },
      warnings: ['Stored JSON for memorybook_overridden_memories is malformed.'],
    }),
  })

  assert.equal(emptyModel.status, 'empty')
  assert.equal(unavailableModel.status, 'unavailable')
  assert.equal(partialModel.status, 'partial')
  assert.equal(invalidModel.status, 'invalid')
  assert.equal(partialModel.sourceStatus.base.status, 'empty')
  assert.equal(partialModel.sourceStatus.custom.count, 1)
  assert.equal(invalidModel.chapters[0].groups[0].memories[0].specialMoment.route, null)
})

test('timeline read model does not mutate compatibility inputs and preserves warning boundaries', () => {
  const snapshot = createSnapshot({
    status: 'ready',
    source: 'legacy-local-dev',
    data: {
      hasBaseDataset: true,
      customMemoryCount: 0,
      overriddenMemoryCount: 0,
      deletedMemoryCount: 0,
      memories: [
        createMemoryRecord({
          id: 'fictional-warning-memory',
          mediaPath: 'C:\\Users\\Jaylan\\Pictures\\fictional-warning.png',
        }),
      ],
    },
    warnings: ['Legacy bridge warning.'],
  })
  const before = structuredClone(snapshot)

  const model = buildTimelineReadModel({
    compatibilitySnapshot: snapshot,
  })

  assert.deepEqual(snapshot, before)
  assert.equal(model.warnings.length, 1)
  assert.equal(model.summary.invalidMedia, 1)
})
