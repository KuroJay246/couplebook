import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildProfileReadModel } from '../features/profile/profileReadModel.js'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

function createSnapshot(overrides = {}) {
  return {
    status: 'ready',
    warnings: [],
    sources: {
      profile: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: [],
        data: {
          participantOrder: ['Jaylan', 'Omia'],
          profilesByUsername: {
            Jaylan: {
              name: 'Jaylan',
              bio: 'Keeps the archive close.',
              avatar: '/assets/photos/anniversary_2025.png',
              anniversaryView: 'dual',
              joinedDate: '2025-12-28',
              birthday: '1999-03-02',
            },
            Omia: {
              name: 'Omia',
              bio: 'Shapes the quieter details.',
              avatar: '/assets/photos/sunset_walk.png',
              anniversaryView: 'omia',
              joinedDate: '2025-12-29',
              birthday: '2000-09-11',
            },
          },
          unknownTopLevelFields: {},
        },
      },
      favorites: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: [],
        data: {
          participantOrder: ['Jaylan', 'Omia'],
          favoritesByOwner: {
            Jaylan: {
              categories: {
                food: ['Pasta'],
                places: ['Waterfront'],
                hobbies: [],
                activities: [],
              },
            },
            Omia: {
              categories: {
                food: [],
                places: [],
                hobbies: ['Sketching'],
                activities: ['Movie nights'],
              },
            },
          },
          unknownTopLevelFields: {},
        },
      },
      contract: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: ['Legacy contract signatures are read-only.'],
        data: {
          username: 'Jaylan',
          accepted: true,
          activeSignature: {
            accepted: true,
            timestamp: '2026-01-01T00:00:00.000Z',
            version: '1.0.0',
            history: [],
            unknownFields: {},
          },
          signaturesByUsername: {
            Jaylan: {
              accepted: true,
              timestamp: '2026-01-01T00:00:00.000Z',
              version: '1.0.0',
              history: [],
              unknownFields: {},
            },
            Omia: {
              accepted: false,
              timestamp: null,
              version: null,
              history: [],
              unknownFields: {},
            },
          },
        },
      },
    },
    ...overrides,
  }
}

test('profile read model keeps two-person content, highlights, and contract summaries explicit', () => {
  const model = buildProfileReadModel({
    compatibilitySnapshot: createSnapshot(),
  })

  assert.equal(model.status, 'ready')
  assert.equal(model.people.length, 2)
  assert.equal(model.people[0].displayName, 'Jaylan')
  assert.equal(model.people[1].anniversaryViewLabel, "Omia's perspective")
  assert.equal(model.relationship.title, 'Jaylan and Omia')
  assert.equal(model.relationship.anniversaries.length, 2)
  assert.equal(model.relationship.milestones.some((item) => item.kind === 'contract'), true)
  assert.equal(model.sharedHighlights.length, 4)
  assert.equal(model.entries.contract.description, '1 of 2 preserved signatures are already visible from the migrated Contract page.')
  assert.equal(
    model.entries.favorites.description,
    '4 favorite highlights are visible here already, and the full shared collection now lives on the migrated Favorites page.',
  )
  assert.deepEqual(
    model.sourceStatus.items.map((item) => item.key),
    ['profile', 'favorites', 'contract'],
  )
  assert.deepEqual(model.warnings, ['Legacy contract signatures are read-only.'])
})

test('profile read model stays unavailable when no safe profile content is accessible', () => {
  const model = buildProfileReadModel({
    compatibilitySnapshot: createSnapshot({
      status: 'empty',
      warnings: ['Browser storage is unavailable for legacy profiles.'],
      sources: {
        profile: {
          status: 'unavailable',
          source: 'legacy-local-storage',
          warnings: ['Browser storage is unavailable for legacy profiles.'],
          data: null,
        },
        favorites: {
          status: 'empty',
          source: 'legacy-local-storage',
          warnings: [],
          data: { favoritesByOwner: {}, participantOrder: [], unknownTopLevelFields: {} },
        },
        contract: {
          status: 'empty',
          source: 'legacy-local-storage',
          warnings: [],
          data: { username: 'Jaylan', accepted: false, activeSignature: null, signaturesByUsername: {} },
        },
      },
    }),
  })

  assert.equal(model.status, 'unavailable')
  assert.equal(model.people.length, 0)
  assert.equal(model.relationship.title, 'Shared profile')
  assert.equal(model.sharedHighlights.length, 0)
  assert.equal(model.entries.contract.status, 'empty')
  assert.deepEqual(model.warnings, ['Browser storage is unavailable for legacy profiles.'])
})

test('profile read model stays partial when only one person or one source is available', () => {
  const partialSnapshot = createSnapshot({
    sources: {
      profile: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: [],
        data: {
          participantOrder: ['Jaylan'],
          profilesByUsername: {
            Jaylan: {
              name: 'Jaylan',
              bio: '',
              avatar: '',
              anniversaryView: 'dual',
              joinedDate: '2025-12-28',
              birthday: null,
            },
          },
          unknownTopLevelFields: {},
        },
      },
      favorites: {
        status: 'empty',
        source: 'legacy-local-storage',
        warnings: [],
        data: { favoritesByOwner: {}, participantOrder: [], unknownTopLevelFields: {} },
      },
      contract: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: [],
        data: { username: 'Jaylan', accepted: true, activeSignature: null, signaturesByUsername: {} },
      },
    },
  })

  const model = buildProfileReadModel({
    compatibilitySnapshot: partialSnapshot,
  })

  assert.equal(model.status, 'partial')
  assert.equal(model.people.length, 1)
  assert.equal(model.relationship.title, "Jaylan's shared profile")
  assert.equal(model.relationship.anniversaries.length, 1)
  assert.equal(model.relationship.milestones.some((item) => item.kind === 'contract'), true)
  assert.equal(model.sharedHighlights.length, 0)
})

test('profile read model returns frozen data and does not mutate compatibility inputs', () => {
  const snapshot = createSnapshot()
  const before = JSON.parse(JSON.stringify(snapshot))
  const model = buildProfileReadModel({
    compatibilitySnapshot: snapshot,
  })

  assert.deepEqual(snapshot, before)
  assert.equal(Object.isFrozen(model), true)
  assert.equal(Object.isFrozen(model.people), true)
  assert.equal(Object.isFrozen(model.relationship), true)
  assert.equal(Object.isFrozen(model.sharedHighlights), true)
  assert.equal(Object.isFrozen(model.sourceStatus), true)
})

test('profile feature sources stay read-only and avoid local auth shortcuts', async () => {
  const readModelSource = await readSource('../features/profile/profileReadModel.js')
  const hookSource = await readSource('../features/profile/useProfileData.js')

  assert.doesNotMatch(readModelSource, /localStorage/)
  assert.doesNotMatch(readModelSource, /setItem|saveProfile|updateDoc|addDoc|collection\(/)
  assert.doesNotMatch(hookSource, /setItem|saveProfile|signIn|signOut/)
  assert.match(hookSource, /useCompatibilityData/)
})
