import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { readLegacyContractState } from '../data/legacyContractAdapter.js'
import { readLegacyFavorites } from '../data/legacyFavoritesAdapter.js'
import {
  createLegacyBridgeConfig,
  normalizeLegacyMemoryPayload,
  readLegacyMemories,
} from '../data/legacyMemoryAdapter.js'
import { readLegacyProfiles } from '../data/legacyProfileAdapter.js'
import { readLegacySettings } from '../data/legacySettingsAdapter.js'
import { loadCompatibilitySnapshot } from '../features/compatibility/compatibilityService.js'
import { sanitizedLegacyMemoryFixture } from '../test-fixtures/legacy-memory.fixture.js'

function createStorage(entries = {}) {
  const backing = new Map(Object.entries(entries))
  const calls = {
    getItem: [],
    setItem: [],
    removeItem: [],
  }

  return {
    calls,
    snapshot() {
      return Object.fromEntries(backing.entries())
    },
    storage: {
      getItem(key) {
        calls.getItem.push(key)
        return backing.has(key) ? backing.get(key) : null
      },
      setItem(key, value) {
        calls.setItem.push([key, value])
        backing.set(key, value)
      },
      removeItem(key) {
        calls.removeItem.push(key)
        backing.delete(key)
      },
    },
  }
}

test('legacy favorites adapter normalizes valid values without writing', async () => {
  const storage = createStorage({
    memorybook_favorites: JSON.stringify({
      jaylan: {
        food: ['Ramen', '  Dumplings  '],
        places: ['Boardwalk'],
        hobbies: ['Coding'],
        activities: ['Movies'],
        keepsake: { note: 'unknown-but-preserved' },
      },
      omia: {
        food: ['Tea'],
        places: ['Library'],
        hobbies: ['Drawing'],
        activities: ['Walks'],
      },
      metadata: 'legacy',
    }),
    memorybook_active_session: 'spoofed-session',
  })

  const before = storage.snapshot()
  const result = await readLegacyFavorites({ storage: storage.storage })

  assert.equal(result.status, 'ready')
  assert.deepEqual(result.data.favoritesByOwner.Jaylan.categories.food, ['Ramen', 'Dumplings'])
  assert.deepEqual(result.data.favoritesByOwner.Jaylan.unknownCategories, { keepsake: { note: 'unknown-but-preserved' } })
  assert.deepEqual(result.data.unknownTopLevelFields, { metadata: 'legacy' })
  assert.deepEqual(storage.calls.setItem, [])
  assert.deepEqual(storage.calls.removeItem, [])
  assert.deepEqual(storage.snapshot(), before)
  assert.equal(Object.isFrozen(result.data.favoritesByOwner.Jaylan.categories), true)
})

test('legacy favorites adapter reports empty and invalid states safely', async () => {
  const emptyResult = await readLegacyFavorites({ storage: createStorage().storage })
  assert.equal(emptyResult.status, 'empty')

  const invalidResult = await readLegacyFavorites({
    storage: createStorage({ memorybook_favorites: '{not-json' }).storage,
  })

  assert.equal(invalidResult.status, 'invalid')
  assert.match(invalidResult.warnings.join(' '), /malformed/i)
})

test('legacy profile adapter preserves unknown fields and rejects malformed values', async () => {
  const storage = createStorage({
    memorybook_profiles: JSON.stringify({
      Jaylan: {
        name: 'Jaylan',
        bio: 'Profile text',
        avatar: '/assets/photos/example.png',
        anniversaryView: 'dual',
        joinedDate: '2025-12-28',
        birthday: '2006-12-13',
        favoriteColor: 'blue',
      },
      Omia: 'unexpected-profile-type',
      notes: ['legacy'],
    }),
  })

  const result = await readLegacyProfiles({ storage: storage.storage })

  assert.equal(result.status, 'ready')
  assert.equal(result.data.profilesByUsername.Jaylan.name, 'Jaylan')
  assert.deepEqual(result.data.profilesByUsername.Jaylan.unknownFields, { favoriteColor: 'blue' })
  assert.deepEqual(result.data.unknownTopLevelFields, {
    Omia: 'unexpected-profile-type',
    notes: ['legacy'],
  })
  assert.deepEqual(storage.calls.setItem, [])
})

test('legacy settings adapter uses explicit username and falls back to shared theme safely', async () => {
  const storage = createStorage({
    memorybook_settings_Jaylan: JSON.stringify({
      anniversaryConfig: 'dual',
      privacyToggles: {
        localOnlyMode: false,
        hideOfflineWarning: true,
        betaFlag: 'preserve',
      },
      layoutDensity: 'cozy',
    }),
    memorybook_theme: 'sunset',
    memorybook_active_session: 'spoofed-session',
  })

  const result = await readLegacySettings({
    storage: storage.storage,
    username: 'Jaylan',
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.data.theme, 'sunset')
  assert.equal(result.data.usedGlobalThemeFallback, true)
  assert.equal(result.data.settings.privacyToggles.localOnlyMode, false)
  assert.deepEqual(result.data.settings.privacyToggles.unknownFields, { betaFlag: 'preserve' })
  assert.deepEqual(result.data.settings.unknownFields, { layoutDensity: 'cozy' })
  assert.deepEqual(storage.calls.setItem, [])
})

test('legacy settings adapter flags malformed JSON without trusting session keys', async () => {
  const result = await readLegacySettings({
    storage: createStorage({
      memorybook_settings_Jaylan: '{bad-json',
      memorybook_active_session: 'Jaylan',
    }).storage,
    username: 'Jaylan',
  })

  assert.equal(result.status, 'invalid')
  assert.equal(result.data.username, 'Jaylan')
})

test('legacy contract adapter reads only contract state and ignores spoofed session keys', async () => {
  const storage = createStorage({
    memorybook_contract_accepted_Jaylan: 'true',
    memorybook_contract_signatures: JSON.stringify({
      Jaylan: {
        accepted: true,
        timestamp: '2026-01-01T00:00:00.000Z',
        version: '3.0',
        history: [{ accepted: true, timestamp: '2026-01-01T00:00:00.000Z', version: '3.0' }],
        note: 'preserve',
      },
    }),
    memorybook_active_session: 'spoofed-session',
    memorybook_active_user: 'spoofed-user',
  })

  const before = storage.snapshot()
  const result = await readLegacyContractState({
    storage: storage.storage,
    username: 'Jaylan',
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.data.accepted, true)
  assert.equal(result.data.activeSignature.version, '3.0')
  assert.deepEqual(result.data.activeSignature.unknownFields, { note: 'preserve' })
  assert.deepEqual(storage.calls.setItem, [])
  assert.deepEqual(storage.snapshot(), before)
})

test('legacy contract adapter handles missing and malformed signature data safely', async () => {
  const emptyResult = await readLegacyContractState({
    storage: createStorage().storage,
    username: 'Jaylan',
  })

  assert.equal(emptyResult.status, 'empty')

  const invalidResult = await readLegacyContractState({
    storage: createStorage({ memorybook_contract_signatures: '{broken' }).storage,
    username: 'Jaylan',
  })

  assert.equal(invalidResult.status, 'invalid')
})

test('legacy memory normalization uses sanitized fixtures only in tests', () => {
  const result = normalizeLegacyMemoryPayload(sanitizedLegacyMemoryFixture)

  assert.equal(result.status, 'ready')
  assert.equal(result.memories.length, 2)
  assert.equal(result.memories[0].mediaKind, 'image')
  assert.equal(result.memories[1].mediaKind, 'video')
})

test('legacy memory bridge fails closed when disabled or in production mode', async () => {
  const disabledResult = await readLegacyMemories({
    env: {
      MODE: 'development',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'false',
      VITE_LEGACY_LOCAL_BASE_URL: 'http://127.0.0.1:3000',
    },
    storage: createStorage().storage,
  })

  assert.equal(disabledResult.status, 'unavailable')

  const productionResult = await readLegacyMemories({
    env: {
      MODE: 'production',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true',
      VITE_LEGACY_LOCAL_BASE_URL: 'http://127.0.0.1:3000',
    },
    location: { hostname: 'localhost' },
    fetchImpl: async () => {
      throw new Error('should not fetch in production mode')
    },
    storage: createStorage().storage,
  })

  assert.equal(productionResult.status, 'unavailable')
  assert.match(productionResult.warnings.join(' '), /production mode/i)
})

test('legacy memory bridge rejects non-local URLs and non-local runtime origins', async () => {
  const nonLocalUrlResult = await readLegacyMemories({
    env: {
      MODE: 'development',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true',
      VITE_LEGACY_LOCAL_BASE_URL: 'https://example.com',
    },
    location: { hostname: 'localhost' },
    storage: createStorage().storage,
  })

  assert.equal(nonLocalUrlResult.status, 'unavailable')
  assert.match(nonLocalUrlResult.warnings.join(' '), /non-local base url/i)

  const nonLocalOriginResult = await readLegacyMemories({
    env: {
      MODE: 'development',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true',
      VITE_LEGACY_LOCAL_BASE_URL: 'http://127.0.0.1:3000',
    },
    location: { hostname: 'couplebook.web.app' },
    storage: createStorage().storage,
  })

  assert.equal(nonLocalOriginResult.status, 'unavailable')
  assert.match(nonLocalOriginResult.warnings.join(' '), /localhost/i)
})

test('legacy memory bridge accepts localhost, normalizes data, and never persists', async () => {
  const storage = createStorage({
    memorybook_custom_memories: JSON.stringify([
      {
        id: 'fixture-memory-003',
        title: 'Local Custom Memory',
        description: 'A generic custom entry.',
        date: '2026-01-17',
        media: '/assets/photos/local-custom.jpg',
        isVideo: false,
      },
    ]),
    memorybook_deleted_memories: JSON.stringify(['fixture-memory-001']),
    memorybook_overridden_memories: JSON.stringify({
      'fixture-memory-002': {
        title: 'Overridden Imaginary Voice Note',
      },
    }),
  })

  const before = storage.snapshot()
  const fixtureClone = JSON.parse(JSON.stringify(sanitizedLegacyMemoryFixture))
  const result = await readLegacyMemories({
    env: {
      MODE: 'development',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true',
      VITE_LEGACY_LOCAL_BASE_URL: 'http://127.0.0.1:3000',
    },
    location: { hostname: '127.0.0.1' },
    storage: storage.storage,
    fetchImpl: async () => ({
      ok: true,
      json: async () => fixtureClone,
    }),
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.data.hasBaseDataset, true)
  assert.equal(result.data.memories.length, 2)
  assert.equal(result.data.memories[0].id, 'fixture-memory-003')
  assert.equal(result.data.memories[1].title, 'Overridden Imaginary Voice Note')
  assert.deepEqual(storage.calls.setItem, [])
  assert.deepEqual(storage.calls.removeItem, [])
  assert.deepEqual(storage.snapshot(), before)
  assert.deepEqual(fixtureClone, sanitizedLegacyMemoryFixture)
})

test('legacy memory bridge flags malformed responses safely', async () => {
  const result = await readLegacyMemories({
    env: {
      MODE: 'development',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true',
      VITE_LEGACY_LOCAL_BASE_URL: 'http://localhost:3000',
    },
    location: { hostname: 'localhost' },
    storage: createStorage().storage,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ not: 'an-array' }),
    }),
  })

  assert.equal(result.status, 'invalid')
})

test('compatibility snapshot keeps source identities and aggregated warnings', async () => {
  const storage = createStorage({
    memorybook_profiles: JSON.stringify({ Jaylan: { name: 'Jaylan' } }),
  })

  const snapshot = await loadCompatibilitySnapshot({
    username: 'Jaylan',
    storage: storage.storage,
    env: {
      MODE: 'development',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'false',
      VITE_LEGACY_LOCAL_BASE_URL: '',
    },
  })

  assert.equal(snapshot.status, 'ready')
  assert.equal(snapshot.sources.profile.source, 'legacy-local-storage')
  assert.equal(snapshot.sources.memories.source, 'legacy-local-dev')
  assert.ok(Array.isArray(snapshot.warnings))
})

test('routes keep the compatibility provider inside the protected shell', async () => {
  const routesSource = await readFile(new URL('../app/routes.jsx', import.meta.url), 'utf8')
  const providerSource = await readFile(
    new URL('../features/compatibility/CompatibilityProvider.jsx', import.meta.url),
    'utf8',
  )

  assert.match(routesSource, /<CompatibilityProvider>/)
  assert.match(providerSource, /loadCompatibilitySnapshot/)
  assert.doesNotMatch(providerSource, /setItem\(/)
  assert.doesNotMatch(providerSource, /updateDoc\(/)
})

test('legacy bridge env config defaults to disabled', () => {
  const config = createLegacyBridgeConfig({})

  assert.equal(config.enabled, false)
  assert.equal(config.baseUrl, '')
  assert.equal(config.mode, 'development')
})
