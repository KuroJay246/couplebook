import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildFavoritesReadModel } from '../features/favorites/favoritesReadModel.js'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

function createSnapshot(overrides = {}) {
  return {
    status: 'ready',
    warnings: [],
    sources: {
      favorites: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: [],
        data: {
          participantOrder: ['Jaylan', 'Omia'],
          favoritesByOwner: {
            Jaylan: {
              categories: {
                food: ['Ramen', '  Dumplings  ', 'Ramen'],
                places: ['Boardwalk'],
                hobbies: ['Sketching'],
                activities: ['Movie nights'],
              },
              unknownCategories: {
                keepsake: { note: 'hidden-category' },
              },
            },
            Omia: {
              categories: {
                food: ['ramen', 'Tea'],
                places: ['boardwalk', 'Library'],
                hobbies: ['Reading'],
                activities: ['Movie nights', 'Walks', 'Movie nights'],
              },
              unknownCategories: {},
            },
          },
          unknownTopLevelFields: {
            metadata: 'legacy',
          },
        },
      },
      profile: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: [],
        data: {
          participantOrder: ['Jaylan', 'Omia'],
          profilesByUsername: {
            Jaylan: { name: 'Jaylan' },
            Omia: { name: 'Omia' },
          },
          unknownTopLevelFields: {},
        },
      },
      contract: {
        status: 'ready',
        source: 'legacy-local-storage',
        warnings: [],
        data: {
          username: 'Jaylan',
          accepted: true,
          activeSignature: null,
          signaturesByUsername: {
            Jaylan: {
              accepted: true,
            },
            Omia: {
              accepted: false,
            },
          },
        },
      },
    },
    ...overrides,
  }
}

test('favorites read model keeps two people, exact overlap, and related links honest', () => {
  const model = buildFavoritesReadModel({
    compatibilitySnapshot: createSnapshot(),
  })

  assert.equal(model.status, 'ready')
  assert.equal(model.people.length, 2)
  assert.equal(model.people[0].displayName, 'Jaylan')
  assert.deepEqual(model.people[0].categories[0].items, ['Ramen', 'Dumplings'])
  assert.equal(model.people[0].hiddenCategoryCount, 1)
  assert.deepEqual(
    model.categoryIndex.map((category) => category.key),
    ['food', 'places', 'hobbies', 'activities'],
  )
  assert.deepEqual(
    model.shared.exactMatches.map((item) => item.label),
    ['Ramen', 'Boardwalk', 'Movie nights'],
  )
  assert.equal(model.shared.categories[0].label, 'Food')
  assert.equal(model.entries.profile.href, '/profile')
  assert.equal(model.entries.contract.href, '/contract')
  assert.match(model.sourceStatus.notes.join(' '), /favorite field stays tucked away/i)
})

test('favorites read model stays partial when only one preserved collection is available', () => {
  const model = buildFavoritesReadModel({
    compatibilitySnapshot: createSnapshot({
      sources: {
        favorites: {
          status: 'ready',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            participantOrder: ['Jaylan', 'Omia'],
            favoritesByOwner: {
              Jaylan: {
                categories: {
                  food: ['Ramen'],
                  places: [],
                  hobbies: [],
                  activities: [],
                },
                unknownCategories: {},
              },
              Omia: {
                categories: {
                  food: [],
                  places: [],
                  hobbies: [],
                  activities: [],
                },
                unknownCategories: {},
              },
            },
            unknownTopLevelFields: {},
          },
        },
        profile: {
          status: 'ready',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            participantOrder: ['Jaylan', 'Omia'],
            profilesByUsername: {
              Jaylan: { name: 'Jaylan' },
              Omia: { name: 'Omia' },
            },
            unknownTopLevelFields: {},
          },
        },
        contract: {
          status: 'empty',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            username: 'Jaylan',
            accepted: false,
            activeSignature: null,
            signaturesByUsername: {},
          },
        },
      },
    }),
  })

  assert.equal(model.status, 'partial')
  assert.equal(model.people.length, 1)
  assert.equal(model.people[0].displayName, 'Jaylan')
  assert.equal(model.shared.exactMatches.length, 0)
  assert.match(model.sourceStatus.notes.join(' '), /One preserved collection is visible here already/)
})

test('favorites read model distinguishes empty, unavailable, and invalid states', () => {
  const emptyModel = buildFavoritesReadModel({
    compatibilitySnapshot: createSnapshot({
      sources: {
        favorites: {
          status: 'ready',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            favoritesByOwner: {
              Jaylan: {
                categories: {
                  food: [],
                  places: [],
                  hobbies: [],
                  activities: [],
                },
                unknownCategories: {},
              },
              Omia: {
                categories: {
                  food: [],
                  places: [],
                  hobbies: [],
                  activities: [],
                },
                unknownCategories: {},
              },
            },
            participantOrder: ['Jaylan', 'Omia'],
            unknownTopLevelFields: {},
          },
        },
        profile: {
          status: 'ready',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            participantOrder: ['Jaylan', 'Omia'],
            profilesByUsername: {
              Jaylan: { name: 'Jaylan' },
              Omia: { name: 'Omia' },
            },
            unknownTopLevelFields: {},
          },
        },
        contract: {
          status: 'empty',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            username: 'Jaylan',
            accepted: false,
            activeSignature: null,
            signaturesByUsername: {},
          },
        },
      },
    }),
  })

  const unavailableModel = buildFavoritesReadModel({
    compatibilitySnapshot: createSnapshot({
      sources: {
        favorites: {
          status: 'unavailable',
          source: 'legacy-local-storage',
          warnings: ['Storage unavailable.'],
          data: null,
        },
        profile: {
          status: 'ready',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            participantOrder: ['Jaylan'],
            profilesByUsername: {
              Jaylan: { name: 'Jaylan' },
            },
            unknownTopLevelFields: {},
          },
        },
        contract: {
          status: 'empty',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            username: 'Jaylan',
            accepted: false,
            activeSignature: null,
            signaturesByUsername: {},
          },
        },
      },
    }),
  })

  const invalidModel = buildFavoritesReadModel({
    compatibilitySnapshot: createSnapshot({
      sources: {
        favorites: {
          status: 'invalid',
          source: 'legacy-local-storage',
          warnings: ['Malformed JSON.'],
          data: {
            favoritesByOwner: {},
            participantOrder: [],
            unknownTopLevelFields: {},
          },
        },
        profile: {
          status: 'ready',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            participantOrder: ['Jaylan'],
            profilesByUsername: {
              Jaylan: { name: 'Jaylan' },
            },
            unknownTopLevelFields: {},
          },
        },
        contract: {
          status: 'empty',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            username: 'Jaylan',
            accepted: false,
            activeSignature: null,
            signaturesByUsername: {},
          },
        },
      },
    }),
  })

  assert.equal(emptyModel.status, 'empty')
  assert.equal(emptyModel.people.length, 0)
  assert.match(emptyModel.sourceStatus.notes.join(' '), /Favorites will gather here as the shared book grows\./)
  assert.equal(unavailableModel.status, 'unavailable')
  assert.match(unavailableModel.sourceStatus.notes.join(' '), /saved favorites remain safely in the legacy book/i)
  assert.equal(invalidModel.status, 'invalid')
  assert.match(invalidModel.sourceStatus.notes.join(' '), /being held back until they can be reviewed safely/i)
})

test('favorites read model does not create false fuzzy matches and falls back to preserved owner labels', () => {
  const model = buildFavoritesReadModel({
    compatibilitySnapshot: createSnapshot({
      sources: {
        favorites: {
          status: 'ready',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            participantOrder: ['Jaylan', 'Omia'],
            favoritesByOwner: {
              Jaylan: {
                categories: {
                  food: ['Chinese food'],
                  places: ['Cinema'],
                  hobbies: [],
                  activities: [],
                },
                unknownCategories: {},
              },
              Omia: {
                categories: {
                  food: ['Asian food'],
                  places: ['Movies'],
                  hobbies: [],
                  activities: [],
                },
                unknownCategories: {},
              },
            },
            unknownTopLevelFields: {},
          },
        },
        profile: {
          status: 'unavailable',
          source: 'legacy-local-storage',
          warnings: ['Profiles unavailable.'],
          data: null,
        },
        contract: {
          status: 'empty',
          source: 'legacy-local-storage',
          warnings: [],
          data: {
            username: 'Jaylan',
            accepted: false,
            activeSignature: null,
            signaturesByUsername: {},
          },
        },
      },
    }),
  })

  assert.equal(model.status, 'partial')
  assert.equal(model.shared.exactMatches.length, 0)
  assert.deepEqual(
    model.people.map((person) => person.displayNameSource),
    ['owner', 'owner'],
  )
  assert.deepEqual(
    model.people.map((person) => person.displayName),
    ['Jaylan', 'Omia'],
  )
})

test('favorites read model returns frozen data and leaves compatibility inputs untouched', () => {
  const snapshot = createSnapshot()
  const before = structuredClone(snapshot)
  const model = buildFavoritesReadModel({
    compatibilitySnapshot: snapshot,
  })

  assert.deepEqual(snapshot, before)
  assert.equal(Object.isFrozen(model), true)
  assert.equal(Object.isFrozen(model.people), true)
  assert.equal(Object.isFrozen(model.shared), true)
  assert.equal(Object.isFrozen(model.categoryIndex), true)
  assert.equal(Object.isFrozen(model.sourceStatus), true)
})

test('favorites feature sources stay read-only and avoid local auth shortcuts', async () => {
  const readModelSource = await readSource('../features/favorites/favoritesReadModel.js')
  const selectorsSource = await readSource('../features/favorites/favoritesSelectors.js')
  const hookSource = await readSource('../features/favorites/useFavoritesData.js')

  assert.doesNotMatch(readModelSource, /localStorage|setItem|updateDoc|addDoc|deleteDoc|console\.log/)
  assert.doesNotMatch(selectorsSource, /localStorage|setItem|updateDoc|addDoc|deleteDoc|console\.log/)
  assert.doesNotMatch(hookSource, /setItem|signIn|signOut/)
  assert.match(hookSource, /useCompatibilityData/)
})
