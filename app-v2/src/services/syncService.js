import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { loadCompatibilitySnapshot } from '../features/compatibility/compatibilityService.js'
import { buildDriveArchitectureContract, buildDriveBackendContract } from '@couplebook/drive-contracts'
import { COUPLE_BOOK_DRIVE_FOLDER_ID, GOOGLE_DRIVE_SCOPE } from './googleDriveMediaProvider.js'
import { MEDIA_INDEX_PROVIDER, MEDIA_SYNC_STATUS, buildMediaIndexCollectionPath, buildMediaSyncStateDocumentPath } from './mediaIndexService.js'

export function getReadOnlySyncContract() {
  return Object.freeze({
    liveFirestoreSync: false,
    automaticWrites: false,
    broadUserQueries: false,
    sourceModel: Object.freeze(['legacy-local-storage', 'legacy-local-dev']),
  })
}

export function getMediaSyncBackendContract(coupleId = 'couple') {
  return buildDriveBackendContract({
    coupleId,
    driveFolderId: COUPLE_BOOK_DRIVE_FOLDER_ID,
    requiredScope: GOOGLE_DRIVE_SCOPE,
    mediaIndexPath: buildMediaIndexCollectionPath(coupleId),
    syncStatePath: buildMediaSyncStateDocumentPath(coupleId),
  })
}

export function getMediaSyncArchitectureContract(coupleId = 'couple') {
  return buildDriveArchitectureContract({
    coupleId,
    driveFolderId: COUPLE_BOOK_DRIVE_FOLDER_ID,
    requiredScope: GOOGLE_DRIVE_SCOPE,
    mediaIndexPath: buildMediaIndexCollectionPath(coupleId),
    syncStatePath: buildMediaSyncStateDocumentPath(coupleId),
  })
}

export async function refreshCompatibilityReadModel(options = {}) {
  return loadCompatibilitySnapshot(options)
}

export async function getDeferredCloudSyncStatus() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Live synchronization remains disabled in app-v2 while the compatibility bridge stays read-only.'],
  })
}

export async function getDeferredMediaSyncStatus() {
  return createCompatibilityResult({
    status: 'partial',
    source: FIRESTORE_SOURCE,
    data: {
      provider: MEDIA_INDEX_PROVIDER,
      state: MEDIA_SYNC_STATUS.actionRequired,
      persistentBackend: false,
      indexedMediaAvailable: false,
      requiredEndpoints: Object.values(getMediaSyncBackendContract().endpoints),
    },
    warnings: [
      'Drive media indexing contract exists, but persistent OAuth refresh and Drive Changes processing require an approved backend deployment.',
    ],
  })
}
