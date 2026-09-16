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

test('timeline read model quarantines automated proof memories from owner-facing Story views', () => {
  const model = buildTimelineReadModel({
    memorySource: {
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        customMemoryCount: 1,
        overriddenMemoryCount: 0,
        deletedMemoryCount: 0,
        memories: [
          createMemoryRecord({
            id: 'codex-proof-memory',
            title: 'CODEX_TEST Release acceptance probe',
            status: 'archived',
          }),
          createMemoryRecord({
            id: 'launch-smoke-proof-memory',
            title: 'Temporary launch smoke test',
            status: 'archived',
          }),
          createMemoryRecord({
            id: 'launch-smoke-note-memory',
            title: 'Launch smoke temporary note',
            status: 'archived',
          }),
          createMemoryRecord({
            id: 'real-story-memory',
            title: 'Fictional owner-facing story memory',
          }),
        ],
      },
      warnings: [],
    },
  })

  const visibleTitles = model.chapters.flatMap((chapter) => chapter.groups.flatMap((group) => group.memories.map((memory) => memory.displayTitle)))
  assert.deepEqual(visibleTitles, ['Fictional owner-facing story memory'])
  assert.equal(model.archivedMemories.length, 0)
  assert.equal(model.summary.totalMemories, 1)
  assert.equal(JSON.stringify(model).includes('CODEX_TEST'), false)
  assert.equal(JSON.stringify(model).includes('smoke'), false)
})

test('timeline read model enriches linked memories with trusted Drive index metadata', () => {
  const model = buildTimelineReadModel({
    memorySource: {
      status: 'ready',
      source: 'firestore',
      data: {
        hasBaseDataset: true,
        customMemoryCount: 0,
        overriddenMemoryCount: 0,
        deletedMemoryCount: 0,
        memories: [
          createMemoryRecord({
            id: 'memory-linked-to-drive',
            title: 'Fictional linked memory',
            mediaKind: 'image',
            mediaPath: '',
          }),
        ],
      },
      warnings: [],
    },
    mediaIndexSource: {
      status: 'ready',
      source: 'firestore',
      data: {
        entries: [
          {
            schemaVersion: 1,
            mediaId: 'drive_linked_story_photo',
            provider: 'google-drive',
            driveFileId: '1linkedStoryPhotoFileId',
            driveFolderId: '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa',
            mimeType: 'image/jpeg',
            mediaType: 'image',
            fileName: 'CB_LINKED_STORY.jpg',
            capturedAt: '2026-09-06T15:00:00.000Z',
            linkedMemoryId: 'memory-linked-to-drive',
          },
        ],
      },
      warnings: [],
    },
  })

  const memory = model.chapters[0].groups[0].memories[0]
  assert.equal(memory.media.status, 'drive-indexed')
  assert.equal(memory.media.id, 'drive_linked_story_photo')
  assert.equal(memory.media.provider, 'google-drive')
  assert.equal(memory.media.linkedMemoryId, 'memory-linked-to-drive')
  assert.equal(model.sourceStatus.mediaIndex.linkedCount, 1)
  assert.equal(model.summary.photoMemories, 1)
})
