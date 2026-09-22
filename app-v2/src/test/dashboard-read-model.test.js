import assert from 'node:assert/strict'
import test from 'node:test'
import { protectedRouteMeta } from '../app/routeConfig.js'
import { buildDashboardReadModel } from '../features/dashboard/dashboardReadModel.js'

test('dashboard read model keeps Home focused on current product surfaces without Story archive data', () => {
  const model = buildDashboardReadModel({
    approvedUser: { username: 'Jaylan', profileName: 'Jaylan' },
    compatibilitySnapshot: {
      status: 'ready',
      warnings: [],
      sources: {
        profile: {
          status: 'ready',
          source: 'firestore',
          data: {
            participantOrder: ['Jaylan', 'Omia'],
            profilesByUsername: {
              Jaylan: { name: 'Jaylan', joinedDate: '2025-12-28', birthday: '2006-12-13' },
              Omia: { name: 'Omia', joinedDate: '2025-12-29', birthday: '2006-09-16' },
            },
          },
          warnings: [],
        },
        settings: {
          status: 'ready',
          source: 'firestore',
          data: { settings: { anniversaryConfig: 'omia', privacyToggles: {}, unknownFields: {} } },
          warnings: [],
        },
        memories: {
          status: 'ready',
          source: 'firestore',
          data: { memories: [{ id: 'retired-story-memory', title: 'Retired Story data' }] },
          warnings: [],
        },
      },
    },
    now: new Date('2026-07-13T12:34:56.000Z'),
    routeMeta: protectedRouteMeta,
  })

  assert.equal(model.hero.eyebrow, 'Private home')
  assert.equal(model.hero.actions.map((action) => action.href).join(','), '/gallery,/plans')
  assert.equal(model.supportingNavigation.items.map((item) => item.href).join(','), '/gallery,/profile,/favorites,/plans,/settings')
  assert.equal(model.specialMoments.items.map((item) => item.href).join(','), '/birthday,/valentine,/confession')
  assert.equal(model.milestones.anniversaryCards.length, 1)
  assert.equal(model.milestones.anniversaryCards[0].label, "Omia's view")
  assert.equal(model.milestones.birthdayCards.length, 2)
  assert.match(model.hero.timestampLabel, /^\d{1,2}:34 (AM|PM)$/)
  assert.doesNotMatch(JSON.stringify(model), /retired-story-memory|recentMemories|onThisDay|timeline|story/i)
})

test('dashboard source state excludes retired memory archive availability', () => {
  const model = buildDashboardReadModel({
    approvedUser: { username: 'Jaylan' },
    compatibilitySnapshot: {
      status: 'ready',
      warnings: ['Profile warning'],
      sources: {
        profile: { status: 'unavailable', source: 'firestore', data: null, warnings: ['Profile warning'] },
        settings: { status: 'empty', source: 'firestore', data: null, warnings: [] },
        memories: { status: 'unavailable', source: 'firestore', data: null, warnings: ['Retired archive unavailable'] },
      },
    },
    now: new Date('2026-07-13T12:34:56.000Z'),
    routeMeta: protectedRouteMeta,
  })

  assert.deepEqual(model.sourceState.items.map((item) => item.key), ['profile', 'settings', 'favorites', 'contract'])
  assert.equal(model.sourceState.totals.unavailable, 1)
  assert.equal(model.sourceState.warnings.length, 1)
  assert.doesNotMatch(JSON.stringify(model.sourceState), /Retired archive unavailable/)
})
