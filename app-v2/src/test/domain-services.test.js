import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildCoupleDocumentPath } from '../services/coupleService.js'
import { getLegacyContract, getFirestoreContractByUid, buildContractDocumentPath } from '../services/contractService.js'
import { getRegisteredDevice, buildDeviceDocumentPath } from '../services/deviceService.js'
import { getLegacyFavorites, getFirestoreFavoritesByUid, buildFavoritesDocumentPath } from '../services/favoritesService.js'
import { getLegacyMemories, getFirestoreMemories, buildMemoryCollectionPath } from '../services/memoryService.js'
import { getLegacyProfile, getFirestoreProfileByUid, buildProfileDocumentPath } from '../services/profileService.js'
import { getLegacySettings, getFirestoreSettingsByUid, buildSettingsDocumentPath } from '../services/settingsService.js'
import { getDeferredCloudSyncStatus, getDeferredMediaSyncStatus, getMediaSyncArchitectureContract, getMediaSyncBackendContract, getReadOnlySyncContract, refreshCompatibilityReadModel } from '../services/syncService.js'
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
          approved: true,
          accessStatus: 'active',
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
  assert.equal(approvedUser.approved, true)
  assert.equal(approvedUser.accessStatus, 'active')
  assert.equal(approvedUser.theme, 'sunset')
  assert.equal(approvedUser.contractAccepted, true)
})

test('domain path builders stay explicit and narrow', () => {
  assert.equal(buildCoupleDocumentPath('couple-alpha'), 'couples/couple-alpha')
  assert.equal(buildMemoryCollectionPath('couple-alpha'), 'couples/couple-alpha/memories')
  assert.equal(buildFavoritesDocumentPath('couple-alpha', 'uid-1'), 'couples/couple-alpha/favorites/uid-1')
  assert.equal(buildProfileDocumentPath('couple-alpha', 'uid-1'), 'couples/couple-alpha/profiles/uid-1')
  assert.equal(buildSettingsDocumentPath('couple-alpha', 'uid-1'), 'couples/couple-alpha/settings/uid-1')
  assert.equal(buildContractDocumentPath('couple-alpha'), 'couples/couple-alpha/contracts/current')
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

test('Firestore service contracts stay unavailable unless targeted couple context exists', async () => {
  const results = await Promise.all([
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
  assert.throws(() => buildCoupleDocumentPath('bad/couple'))
})

test('sync service exposes a read-only orchestration contract', async () => {
  const contract = getReadOnlySyncContract()
  const snapshot = await refreshCompatibilityReadModel({
    username: 'Jaylan',
    storage: {
      getItem(key) {
        if (key === 'memorybook_favorites') {
          return JSON.stringify({ Jaylan: { food: ['Ramen'] } })
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

test('sync service exposes the Google Drive media index architecture without pretending backend deployment exists', async () => {
  const contract = getMediaSyncArchitectureContract('couple-alpha')
  const status = await getDeferredMediaSyncStatus()

  assert.equal(contract.provider, 'google-drive')
  assert.equal(contract.driveFolderId, '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa')
  assert.equal(contract.mediaIndexPath, 'couples/couple-alpha/mediaItems')
  assert.equal(contract.syncStatePath, 'couples/couple-alpha/mediaSync/google-drive')
  assert.equal(contract.backend.projectId, 'couplebook-97830')
  assert.equal(contract.backend.endpoints.beginAuthorization, '/api/drive/oauth/begin')
  assert.equal(contract.backend.endpoints.thumbnail, '/api/drive/media/:mediaId/thumbnail')
  assert.ok(contract.backend.frontendAuth.includes('never-send-google-refresh-token-to-browser'))
  assert.ok(contract.backend.backendAuth.includes('require-active-couple-membership'))
  assert.ok(contract.backend.backendWrites.includes('couples/couple-alpha/mediaItems'))
  assert.ok(contract.backend.forbiddenWrites.includes('refresh-token'))
  assert.ok(contract.frontendCan.includes('render-indexed-media'))
  assert.ok(contract.backendRequiredFor.includes('refresh-token-storage'))
  assert.ok(contract.backendRequiredFor.includes('fast-thumbnail-proxy-or-cache'))
  assert.equal(contract.deploymentStatus, 'owner-approval-required')
  assert.match(contract.zeroCostBoundary, /Do not enable billing/)
  assert.equal(status.status, 'partial')
  assert.equal(status.data.persistentBackend, false)
  assert.ok(status.data.requiredEndpoints.includes('/api/drive/webhook'))
  assert.match(status.warnings.join(' '), /approved backend deployment/)
})

test('Drive sync backend contract requires a trusted server boundary before persistent OAuth', () => {
  const contract = getMediaSyncBackendContract('couple-alpha')
  const serialized = JSON.stringify(contract)

  assert.equal(contract.provider, 'google-drive')
  assert.equal(contract.driveFolderId, '17Ar4UK5_puORz9TE1dijIk2-qHgh7oIa')
  assert.deepEqual(Object.keys(contract.endpoints), [
    'beginAuthorization',
    'completeAuthorization',
    'disconnect',
    'syncNow',
    'webhook',
    'thumbnail',
    'stream',
  ])
  assert.ok(contract.backendSecrets.includes('google-refresh-token'))
  assert.ok(contract.backendAuth.includes('bind-authorization-state-to-couple-and-uid'))
  assert.ok(contract.backendWrites.includes('couples/couple-alpha/mediaSync/google-drive'))
  assert.equal(contract.previewStrategy.staleUrlPolicy, 'do-not-store-or-replay')
  assert.match(contract.zeroCostBoundary, /Do not deploy/)
  assert.doesNotMatch(serialized, /clientSecretValue|refreshTokenValue|accessTokenValue|Bearer\s/i)
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

  const productionSourceEntries = sourceEntries.filter((entry) => !/src[\\/]test[\\/]/.test(entry.filePath))
  const combinedSource = productionSourceEntries.map((entry) => entry.content).join('\n')
  assert.doesNotMatch(combinedSource, /getDocs\s*\(\s*collection\s*\([^)]*['"]users['"]/)
  assert.doesNotMatch(combinedSource, /onSnapshot\s*\(\s*collection\s*\([^)]*['"]users['"]/)

  const compatibilityLayer = productionSourceEntries.filter((entry) => {
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
