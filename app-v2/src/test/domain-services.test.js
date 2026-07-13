import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getCoupleDocumentSnapshot, buildCoupleDocumentPath } from '../services/coupleService.js'
import { getLegacyContract, getFirestoreContractByUid, buildContractDocumentPath } from '../services/contractService.js'
import { getRegisteredDevice, buildDeviceDocumentPath } from '../services/deviceService.js'
import { getLegacyFavorites, getFirestoreFavoritesByUid, buildFavoritesDocumentPath } from '../services/favoritesService.js'
import { getLegacyMemories, getFirestoreMemories, buildMemoryCollectionPath } from '../services/memoryService.js'
import { getLegacyProfile, getFirestoreProfileByUid, buildProfileDocumentPath } from '../services/profileService.js'
import { getLegacySettings, getFirestoreSettingsByUid, buildSettingsDocumentPath } from '../services/settingsService.js'
import { getDeferredCloudSyncStatus, getReadOnlySyncContract, refreshCompatibilityReadModel } from '../services/syncService.js'
import { buildUserDocumentPath, getApprovedUserByUid } from '../services/userService.js'

test('user service keeps approved-user reads targeted to users uid docs only', async () => {
  const docCalls = []
  const getCalls = []

  const approvedUser = await getApprovedUserByUid('uid-321', {
    getUserDocumentRef: (uid) => {
      docCalls.push(uid)
      return { path: `users/${uid}` }
    },
    getDocument: async (reference) => {
      getCalls.push(reference.path)
      return {
        exists: () => true,
        data: () => ({
          username: 'Jaylan',
          theme: 'sunset',
          profile: { name: 'Jaylan' },
          favorites: { Jaylan: { food: ['Ramen'] } },
          contractAccepted: true,
        }),
      }
    },
  })

  assert.equal(buildUserDocumentPath('uid-321'), 'users/uid-321')
  assert.deepEqual(docCalls, ['uid-321'])
  assert.deepEqual(getCalls, ['users/uid-321'])
  assert.equal(approvedUser.username, 'Jaylan')
  assert.equal(approvedUser.theme, 'sunset')
  assert.equal(approvedUser.contractAccepted, true)
})

test('domain path builders stay explicit and narrow', () => {
  assert.equal(buildCoupleDocumentPath('couple-alpha'), 'couples/couple-alpha')
  assert.equal(buildMemoryCollectionPath('couple-alpha'), 'couples/couple-alpha/memories')
  assert.equal(buildFavoritesDocumentPath('uid-1'), 'users/uid-1')
  assert.equal(buildProfileDocumentPath('uid-1'), 'users/uid-1')
  assert.equal(buildSettingsDocumentPath('uid-1'), 'users/uid-1')
  assert.equal(buildContractDocumentPath('uid-1'), 'users/uid-1')
  assert.equal(buildDeviceDocumentPath('device-1'), 'devices/device-1')
})

test('adapter-backed domain reads delegate without writes', async () => {
  const calls = []
  const fakeResult = Object.freeze({
    status: 'ready',
    source: 'legacy-local-storage',
    data: Object.freeze({ marker: true }),
    warnings: Object.freeze([]),
  })

  const [favorites, profile, settings, contract, memories] = await Promise.all([
    getLegacyFavorites({
      readLegacyFavorites: async (options) => {
        calls.push(['favorites', options.username])
        return fakeResult
      },
      username: 'Jaylan',
    }),
    getLegacyProfile({
      readLegacyProfiles: async (options) => {
        calls.push(['profile', options.username])
        return fakeResult
      },
      username: 'Jaylan',
    }),
    getLegacySettings({
      readLegacySettings: async (options) => {
        calls.push(['settings', options.username])
        return fakeResult
      },
      username: 'Jaylan',
    }),
    getLegacyContract({
      readLegacyContractState: async (options) => {
        calls.push(['contract', options.username])
        return fakeResult
      },
      username: 'Jaylan',
    }),
    getLegacyMemories({
      readLegacyMemories: async (options) => {
        calls.push(['memories', options.username])
        return fakeResult
      },
      username: 'Jaylan',
    }),
  ])

  assert.deepEqual(calls, [
    ['favorites', 'Jaylan'],
    ['profile', 'Jaylan'],
    ['settings', 'Jaylan'],
    ['contract', 'Jaylan'],
    ['memories', 'Jaylan'],
  ])
  assert.equal(favorites.data.marker, true)
  assert.equal(profile.data.marker, true)
  assert.equal(settings.data.marker, true)
  assert.equal(contract.data.marker, true)
  assert.equal(memories.data.marker, true)
})

test('deferred Firestore service contracts fail closed instead of reading or writing broadly', async () => {
  const results = await Promise.all([
    getCoupleDocumentSnapshot(),
    getFirestoreMemories(),
    getFirestoreFavoritesByUid(),
    getFirestoreProfileByUid(),
    getFirestoreSettingsByUid(),
    getFirestoreContractByUid(),
    getRegisteredDevice(),
    getDeferredCloudSyncStatus(),
  ])

  for (const result of results) {
    assert.equal(result.status, 'unavailable')
    assert.equal(result.source, 'firestore')
  }
})

test('sync service exposes a read-only orchestration contract', async () => {
  const contract = getReadOnlySyncContract()
  const snapshot = await refreshCompatibilityReadModel({
    username: 'Jaylan',
    storage: {
      getItem(key) {
        if (key === 'memorybook_profiles') {
          return JSON.stringify({ Jaylan: { name: 'Jaylan' } })
        }

        return null
      },
    },
    env: {
      MODE: 'development',
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'false',
      VITE_LEGACY_LOCAL_BASE_URL: '',
    },
  })

  assert.equal(contract.liveFirestoreSync, false)
  assert.equal(contract.automaticWrites, false)
  assert.equal(contract.broadUserQueries, false)
  assert.deepEqual(contract.sourceModel, ['legacy-local-storage', 'legacy-local-dev'])
  assert.equal(snapshot.status, 'ready')
})

async function collectSourceFiles(directoryUrl) {
  const directoryPath = fileURLToPath(directoryUrl)
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(pathToFileURL(`${fullPath}${path.sep}`))))
      continue
    }

    if (/\.(js|jsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

test('app-v2 query guardrails reject broad users collection access and compatibility writes', async () => {
  const sourceRoot = new URL('../', import.meta.url)
  const files = await collectSourceFiles(sourceRoot)
  const sourceEntries = await Promise.all(
    files.map(async (filePath) => ({
      filePath,
      content: await readFile(filePath, 'utf8'),
    })),
  )

  const combinedSource = sourceEntries.map((entry) => entry.content).join('\n')
  assert.doesNotMatch(combinedSource, /getDocs\s*\(\s*collection\s*\([^)]*['"]users['"]/)
  assert.doesNotMatch(combinedSource, /onSnapshot\s*\(\s*collection\s*\([^)]*['"]users['"]/)

  const compatibilityLayer = sourceEntries.filter((entry) => {
    return /src[\\/](data|features[\\/]compatibility|services)[\\/]/.test(entry.filePath)
  })

  for (const entry of compatibilityLayer) {
    assert.doesNotMatch(entry.content, /\bsetDoc\s*\(/, `${entry.filePath} must not perform Firestore writes.`)
    assert.doesNotMatch(entry.content, /\bupdateDoc\s*\(/, `${entry.filePath} must not perform Firestore writes.`)
    assert.doesNotMatch(entry.content, /\baddDoc\s*\(/, `${entry.filePath} must not perform Firestore writes.`)
    assert.doesNotMatch(entry.content, /\bdeleteDoc\s*\(/, `${entry.filePath} must not perform Firestore writes.`)
    assert.doesNotMatch(entry.content, /\.setItem\s*\(/, `${entry.filePath} must not persist compatibility reads.`)
    assert.doesNotMatch(entry.content, /\.removeItem\s*\(/, `${entry.filePath} must not mutate storage during compatibility reads.`)
  }
})
