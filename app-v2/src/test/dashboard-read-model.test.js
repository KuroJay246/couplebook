import assert from 'node:assert/strict'
import test from 'node:test'
import { protectedRouteMeta } from '../app/routeConfig.js'
import { buildDashboardReadModel } from '../features/dashboard/dashboardReadModel.js'

test('dashboard read model keeps the approved section order and filters milestone views intentionally', () => {
  const model = buildDashboardReadModel({
    approvedUser: {
      username: 'Jaylan',
      profileName: 'Jaylan',
    },
    compatibilitySnapshot: {
      status: 'ready',
      warnings: [],
      sources: {
        profile: {
          status: 'ready',
          source: 'legacy-local-storage',
          data: {
            participantOrder: ['Jaylan', 'Omia'],
            profilesByUsername: {
              Jaylan: {
                name: 'Jaylan',
                joinedDate: '2025-12-28',
                birthday: '2006-12-13',
              },
              Omia: {
                name: 'Omia',
                joinedDate: '2025-12-29',
                birthday: '2006-09-16',
              },
            },
          },
          warnings: [],
        },
        settings: {
          status: 'ready',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            settings: {
              anniversaryConfig: 'omia',
              privacyToggles: {
                localOnlyMode: true,
                hideOfflineWarning: false,
                unknownFields: {},
              },
              unknownFields: {},
            },
          },
          warnings: [],
        },
        favorites: { status: 'ready', source: 'legacy-local-storage', data: {}, warnings: [] },
        contract: { status: 'ready', source: 'legacy-local-storage', data: { accepted: true }, warnings: [] },
        memories: {
          status: 'ready',
          source: 'legacy-local-dev',
          data: {
            memories: [
              {
                id: 'memory-2',
                title: 'Library afternoon',
                description: 'A fictional compatibility-safe memory.',
                dateLabel: '2026-01-17',
                mediaKind: 'image',
                mediaPath: '/assets/photos/example.jpg',
                source: 'static-json',
              },
              {
                id: 'memory-1',
                title: 'Tea stop',
                description: 'Another fictional compatibility-safe memory.',
                dateLabel: '2026-01-16',
                mediaKind: 'video',
                mediaPath: '/assets/videos/example.mp4',
                source: 'local-custom',
              },
            ],
          },
          warnings: [],
        },
      },
    },
    now: new Date('2026-07-13T12:34:56.000Z'),
    routeMeta: protectedRouteMeta,
  })

  assert.equal(model.hero.eyebrow, 'Private home')
  assert.equal(model.recentMemories.title, 'The latest pages worth reopening')
  assert.equal(model.milestones.title, 'Relationship time stays close at hand')
  assert.equal(model.specialMoments.items.map((item) => item.href).join(','), '/birthday,/valentine,/confession')
  assert.equal(
    model.supportingNavigation.items.map((item) => item.href).join(','),
    '/timeline,/gallery,/profile,/favorites,/settings,/contract',
  )
  assert.equal(model.recentMemories.items.length, 2)
  assert.equal(model.recentMemories.items[0].title, 'Library afternoon')
  assert.equal(model.milestones.anniversaryCards.length, 1)
  assert.equal(model.milestones.anniversaryCards[0].label, "Omia's view")
  assert.equal(model.milestones.birthdayCards.length, 2)
  assert.equal(model.sourceState.items[4].key, 'memories')
})

test('dashboard read model keeps unavailable memory states honest instead of pretending the archive is empty', () => {
  const model = buildDashboardReadModel({
    approvedUser: {
      username: 'Jaylan',
    },
    compatibilitySnapshot: {
      status: 'empty',
      warnings: ['Legacy local memory bridge is disabled.'],
      sources: {
        profile: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
        settings: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
        favorites: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
        contract: { status: 'empty', source: 'legacy-local-storage', data: null, warnings: [] },
        memories: {
          status: 'unavailable',
          source: 'legacy-local-dev',
          data: null,
          warnings: ['Legacy local memory bridge is disabled.'],
        },
      },
    },
    now: new Date('2026-07-13T12:34:56.000Z'),
    routeMeta: protectedRouteMeta,
  })

  assert.equal(model.recentMemories.state, 'unavailable')
  assert.match(model.recentMemories.emptyState.title, /still waiting on its archive/i)
  assert.match(model.recentMemories.emptyState.description, /safe read-only path/i)
  assert.equal(model.sourceState.totals.unavailable, 1)
  assert.equal(model.sourceState.warnings.length, 1)
})

test('dashboard read model reuses the active timeline ordering so archived smoke entries stay out of recent cards', () => {
  const model = buildDashboardReadModel({
    approvedUser: {
      username: 'Jaylan',
      profileName: 'Jaylan',
    },
    compatibilitySnapshot: {
      status: 'ready',
      warnings: [],
      sources: {
        profile: { status: 'ready', source: 'firestore', data: { participantOrder: [], profilesByUsername: {} }, warnings: [] },
        settings: { status: 'ready', source: 'firestore', data: { settings: { privacyToggles: {}, unknownFields: {} } }, warnings: [] },
        favorites: { status: 'ready', source: 'firestore', data: {}, warnings: [] },
        contract: { status: 'ready', source: 'firestore', data: {}, warnings: [] },
        memories: {
          status: 'ready',
          source: 'firestore',
          data: {
            memories: [
              {
                id: 'archived-smoke-note',
                title: 'Temporary launch smoke test',
                description: 'Archived synthetic memory that should never reopen on the dashboard.',
                date: '2026-07-22',
                status: 'archived',
                mediaState: 'none',
                schemaVersion: 1,
              },
              {
                id: 'older-active',
                title: 'Library afternoon',
                description: 'A real active memory.',
                date: '2026-07-20',
                status: 'active',
                mediaState: 'none',
                schemaVersion: 1,
              },
              {
                id: 'newest-active',
                title: 'Golden hour walk',
                description: 'The newest active memory should appear first.',
                date: '2026-07-23',
                status: 'active',
                mediaState: 'private-legacy-reference',
                isVideo: false,
                schemaVersion: 1,
              },
            ],
          },
          warnings: [],
        },
      },
    },
    now: new Date('2026-07-23T12:34:56.000Z'),
    routeMeta: protectedRouteMeta,
  })

  assert.equal(model.recentMemories.totalCount, 2)
  assert.deepEqual(
    model.recentMemories.items.map((item) => item.title),
    ['Golden hour walk', 'Library afternoon'],
  )
  assert.doesNotMatch(JSON.stringify(model.recentMemories), /Temporary launch smoke test/)
})

test('dashboard read model prefers authored copy before date-only fallback titles', () => {
  const model = buildDashboardReadModel({
    approvedUser: {
      username: 'Jaylan',
      profileName: 'Jaylan',
    },
    compatibilitySnapshot: {
      status: 'ready',
      warnings: [],
      sources: {
        profile: { status: 'ready', source: 'firestore', data: { participantOrder: [], profilesByUsername: {} }, warnings: [] },
        settings: { status: 'ready', source: 'firestore', data: { settings: { privacyToggles: {}, unknownFields: {} } }, warnings: [] },
        favorites: { status: 'ready', source: 'firestore', data: {}, warnings: [] },
        contract: { status: 'ready', source: 'firestore', data: {}, warnings: [] },
        memories: {
          status: 'ready',
          source: 'firestore',
          data: {
            memories: [
              {
                id: 'description-first',
                title: 'Photo from 2026-07-20',
                description: 'Slow dancing under the kitchen light.',
                date: '2026-07-20',
                status: 'active',
                mediaState: 'private-legacy-reference',
                isVideo: false,
                schemaVersion: 1,
              },
              {
                id: 'special-fallback',
                title: 'Photo from 2026-07-19',
                description: 'A beautiful shared moment captured on July 19, 2026.',
                date: '2026-07-19',
                status: 'active',
                isSpecialPage: true,
                pageUrl: 'valentine/index.html',
                mediaState: 'none',
                schemaVersion: 1,
              },
              {
                id: 'date-fallback',
                title: 'Photo from 2026-07-18',
                description: 'Auto-imported from your photos folder.',
                date: '2026-07-18',
                status: 'active',
                mediaState: 'private-legacy-reference',
                schemaVersion: 1,
              },
            ],
          },
          warnings: [],
        },
      },
    },
    now: new Date('2026-07-23T12:34:56.000Z'),
    routeMeta: protectedRouteMeta,
  })

  assert.equal(model.recentMemories.items[0].title, 'Slow dancing under the kitchen light')
  assert.equal(model.recentMemories.items[0].description, 'Saved on July 20, 2026.')
  assert.equal(model.recentMemories.items[1].title, 'Valentine chapter')
  assert.equal(model.recentMemories.items[1].description, 'Saved on July 19, 2026.')
  assert.equal(model.recentMemories.items[2].title, 'Memory from July 18, 2026')
  assert.equal(model.recentMemories.items[2].description, 'Original media stays outside this shell.')
  assert.doesNotMatch(JSON.stringify(model.recentMemories.items), /A photo from July/)
})
