import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildSettingsReadModel } from '../features/settings/settingsReadModel.js'

function createSnapshot(overrides = {}) {
  const baseSnapshot = {
    status: 'ready',
    sources: {
      settings: {
        status: 'ready',
        source: 'legacy-local-storage',
        data: {
          username: 'Jaylan',
          theme: 'sunset',
          usedGlobalThemeFallback: false,
          settings: {
            anniversaryConfig: 'dual',
            privacyToggles: {
              localOnlyMode: false,
              hideOfflineWarning: true,
              unknownFields: {
                betaFlag: 'preserve',
              },
            },
            unknownFields: {
              layoutDensity: 'cozy',
            },
          },
        },
        warnings: [],
      },
      profile: {
        status: 'ready',
        source: 'legacy-local-storage',
        data: {
          profilesByUsername: {
            Jaylan: {
              name: 'Jaylan',
            },
          },
          participantOrder: ['Jaylan'],
          unknownTopLevelFields: {},
        },
        warnings: [],
      },
      favorites: {
        status: 'ready',
        source: 'legacy-local-storage',
        data: {
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
          },
          participantOrder: ['Jaylan'],
          unknownTopLevelFields: {},
        },
        warnings: [],
      },
      contract: {
        status: 'empty',
        source: 'legacy-local-storage',
        data: {
          username: 'Jaylan',
          accepted: false,
          activeSignature: null,
          signaturesByUsername: {},
        },
        warnings: [],
      },
      memories: {
        status: 'unavailable',
        source: 'legacy-local-dev',
        data: null,
        warnings: ['Legacy local memory bridge is disabled.'],
      },
    },
    warnings: ['Legacy local memory bridge is disabled.'],
  }

  return structuredClone({
    ...baseSnapshot,
    ...overrides,
    sources: {
      ...baseSnapshot.sources,
      ...(overrides.sources || {}),
    },
  })
}

test('settings read model keeps approved identity, appearance notes, and migration progress explicit', () => {
  const model = buildSettingsReadModel({
    approvedUser: {
      uid: 'uid-1',
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    authUser: {
      email: 'approved@example.com',
      metadata: {
        lastSignInTime: '2026-01-17T12:00:00.000Z',
      },
    },
    compatibilitySnapshot: createSnapshot(),
    runtimeMode: 'development',
  })

  assert.equal(model.status, 'ready')
  assert.equal(model.account.displayName, 'Jaylan')
  assert.equal(model.account.email, 'approved@example.com')
  assert.equal(model.appearance.runtimeTheme.label, 'Editorial paper and ink')
  assert.equal(model.appearance.preservedTheme.label, 'Warm sunset')
  assert.equal(model.appearance.preservedTheme.origin, 'Scoped legacy preference')
  assert.equal(model.appearance.anniversaryView.label, 'Both perspectives')
  assert.equal(model.privacy.items[2].label, 'Browser storage is not authentication')
  assert.equal(model.compatibility.items[0].statusLabel, 'Available')
  assert.equal(model.compatibility.items[4].statusLabel, 'Development only')
  assert.ok(model.migration.completed.some((entry) => entry.label === 'Dashboard'))
  assert.ok(model.migration.completed.some((entry) => entry.label === 'Settings'))
  assert.deepEqual(model.migration.smokeGate, {
    jaylan: 'PASS',
    partner: 'NOT TESTED',
    overall: 'HOLD',
  })
  assert.ok(model.openingNotes.includes('Approved identity restored'))
})

test('settings read model keeps scoped preference precedence and fallback-only appearance handling explicit', () => {
  const scopedModel = buildSettingsReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    authUser: {
      email: 'approved@example.com',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        settings: {
          status: 'ready',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            theme: 'dark',
            usedGlobalThemeFallback: false,
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
      },
    }),
  })

  const fallbackModel = buildSettingsReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    authUser: {
      email: 'approved@example.com',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        settings: {
          status: 'ready',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            theme: 'light',
            usedGlobalThemeFallback: true,
            settings: {
              anniversaryConfig: 'jaylan',
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
      },
    }),
  })

  assert.equal(scopedModel.appearance.preservedTheme.label, 'Glassmorphism dark')
  assert.equal(scopedModel.appearance.preservedTheme.origin, 'Scoped legacy preference')
  assert.equal(fallbackModel.appearance.preservedTheme.label, 'Crisp light')
  assert.equal(fallbackModel.appearance.preservedTheme.origin, 'Shared legacy fallback')
  assert.equal(fallbackModel.appearance.anniversaryView.label, 'Jaylan perspective')
})

test('settings read model keeps empty and invalid states safe without exposing raw technical values', () => {
  const emptyModel = buildSettingsReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    authUser: {
      email: 'approved@example.com',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        settings: {
          status: 'empty',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            theme: null,
            usedGlobalThemeFallback: false,
            settings: {
              anniversaryConfig: null,
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
      },
    }),
  })

  const invalidModel = buildSettingsReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    authUser: {
      email: 'approved@example.com',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        settings: {
          status: 'invalid',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            theme: null,
            usedGlobalThemeFallback: false,
            settings: {
              anniversaryConfig: null,
              privacyToggles: {
                localOnlyMode: true,
                hideOfflineWarning: false,
                unknownFields: {
                  hiddenKey: 'preserve',
                },
              },
              unknownFields: {
                hiddenSetting: 'preserve',
              },
            },
          },
          warnings: ['Stored JSON is malformed.'],
        },
      },
    }),
  })

  assert.equal(emptyModel.status, 'empty')
  assert.equal(emptyModel.appearance.preservedTheme.label, 'No saved preference yet')
  assert.equal(emptyModel.compatibility.items[0].statusLabel, 'Awaiting migration')
  assert.equal(invalidModel.status, 'invalid')
  assert.equal(invalidModel.compatibility.items[0].statusLabel, 'Needs review')

  const serialized = JSON.stringify(invalidModel)
  assert.doesNotMatch(serialized, /memorybook_active_session|memorybook_active_user|memorybook_active_uid/)
  assert.doesNotMatch(serialized, /users\/uid|VITE_FIREBASE|apiKey|authDomain|projectId/)
  assert.doesNotMatch(serialized, /hiddenKey|hiddenSetting/)
})

test('settings read model returns frozen data and leaves compatibility inputs untouched', () => {
  const snapshot = createSnapshot()
  const before = structuredClone(snapshot)

  const model = buildSettingsReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    authUser: {
      email: 'approved@example.com',
    },
    compatibilitySnapshot: snapshot,
  })

  assert.equal(Object.isFrozen(model), true)
  assert.equal(Object.isFrozen(model.account.details), true)
  assert.equal(Object.isFrozen(model.compatibility.items), true)
  assert.deepEqual(snapshot, before)
})

test('settings feature sources stay read-only and use the central migration status definition', async () => {
  const readModelSource = await readFile(new URL('../features/settings/settingsReadModel.js', import.meta.url), 'utf8')
  const selectorsSource = await readFile(new URL('../features/settings/settingsSelectors.js', import.meta.url), 'utf8')
  const hookSource = await readFile(new URL('../features/settings/useSettingsData.js', import.meta.url), 'utf8')
  const migrationSource = await readFile(new URL('../app/migrationStatus.js', import.meta.url), 'utf8')

  assert.match(readModelSource, /migrationStatus\.js/)
  assert.match(migrationSource, /approvedAccountMigrationGate/)
  assert.doesNotMatch(readModelSource, /localStorage|setItem|updateDoc|addDoc|deleteDoc|collection\(/)
  assert.doesNotMatch(selectorsSource, /memorybook_active_session|memorybook_active_user|memorybook_active_uid/)
  assert.doesNotMatch(hookSource, /signIn|signOut|localStorage/)
})
