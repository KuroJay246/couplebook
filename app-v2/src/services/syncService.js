import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { loadCompatibilitySnapshot } from '../features/compatibility/compatibilityService.js'
import { COUPLE_BOOK_DRIVE_FOLDER_ID, GOOGLE_DRIVE_SCOPE } from './googleDriveMediaProvider.js'
import { MEDIA_INDEX_PROVIDER, MEDIA_SYNC_STATUS, buildMediaIndexCollectionPath, buildMediaSyncStateDocumentPath } from './mediaIndexService.js'

const DRIVE_SYNC_ENDPOINTS = Object.freeze({
  beginAuthorization: '/api/drive/oauth/begin',
  completeAuthorization: '/api/drive/oauth/callback',
  disconnect: '/api/drive/disconnect',
  syncNow: '/api/drive/sync',
  webhook: '/api/drive/webhook',
  thumbnail: '/api/drive/media/:mediaId/thumbnail',
})

export function getReadOnlySyncContract() {
  return Object.freeze({
    liveFirestoreSync: false,
    automaticWrites: false,
    broadUserQueries: false,
    sourceModel: Object.freeze(['legacy-local-storage', 'legacy-local-dev']),
  })
}

export function getMediaSyncBackendContract(coupleId = 'couple') {
  return Object.freeze({
    projectId: 'couplebook-97830',
    provider: MEDIA_INDEX_PROVIDER,
    driveFolderId: COUPLE_BOOK_DRIVE_FOLDER_ID,
    requiredScope: GOOGLE_DRIVE_SCOPE,
    endpoints: DRIVE_SYNC_ENDPOINTS,
    frontendAuth: Object.freeze([
      'send-firebase-id-token',
      'never-send-google-refresh-token-to-browser',
      'never-persist-drive-access-token',
    ]),
    backendAuth: Object.freeze([
      'verify-firebase-id-token',
      'require-active-couple-membership',
      'bind-authorization-state-to-couple-and-uid',
      'reject-cross-couple-media-index-writes',
    ]),
    backendSecrets: Object.freeze([
      'google-oauth-client-secret',
      'google-refresh-token',
      'drive-watch-channel-secret',
    ]),
    backendWrites: Object.freeze([
      buildMediaIndexCollectionPath(coupleId),
      buildMediaSyncStateDocumentPath(coupleId),
      `couples/${coupleId}/auditEvents/{auditId}`,
    ]),
    forbiddenWrites: Object.freeze([
      'temporary-preview-url',
      'thumbnailLink',
      'webContentLink',
      'access-token',
      'refresh-token',
      'raw-private-caption-in-audit-event',
      'firebase-storage-original-upload',
    ]),
    previewStrategy: Object.freeze({
      grid: 'backend-proxied-thumbnail-or-drive-thumbnail-cache',
      viewer: 'short-lived-backend-mediated-stream',
      staleUrlPolicy: 'do-not-store-or-replay',
    }),
    deploymentStatus: 'owner-approval-required',
    zeroCostBoundary: 'A persistent Drive sync backend may require Cloud Functions or equivalent trusted hosting. Do not deploy, enable billing, or store refresh tokens until the owner approves that exact deployment plan.',
  })
}

export function getMediaSyncArchitectureContract(coupleId = 'couple') {
  const backend = getMediaSyncBackendContract(coupleId)
  return Object.freeze({
    provider: MEDIA_INDEX_PROVIDER,
    driveFolderId: COUPLE_BOOK_DRIVE_FOLDER_ID,
    requiredScope: GOOGLE_DRIVE_SCOPE,
    mediaIndexPath: buildMediaIndexCollectionPath(coupleId),
    syncStatePath: buildMediaSyncStateDocumentPath(coupleId),
    backend,
    frontendCan: Object.freeze([
      'render-indexed-media',
      'request-session-drive-import',
      'dedupe-preview-requests',
      'clear-session-previews-on-logout',
    ]),
    backendRequiredFor: Object.freeze([
      'owner-google-account-authorization',
      'authorization-code-exchange',
      'refresh-token-storage',
      'drive-access-token-refresh',
      'changes-api-cursor-processing',
      'drive-webhook-receiver',
      'watch-channel-renewal',
      'scheduled-reconciliation',
      'fast-thumbnail-proxy-or-cache',
      'drive-original-streaming',
    ]),
    deploymentStatus: 'owner-approval-required',
    zeroCostBoundary: 'Do not enable billing or deploy a persistent token backend without owner approval.',
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
      requiredEndpoints: Object.values(DRIVE_SYNC_ENDPOINTS),
    },
    warnings: [
      'Drive media indexing contract exists, but persistent OAuth refresh and Drive Changes processing require an approved backend deployment.',
    ],
  })
}
