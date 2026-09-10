export const DRIVE_CONNECTION_STATES = Object.freeze([
  'not-connected',
  'connecting',
  'connected',
  'folder-unavailable',
  'permission-insufficient',
  'reconnect-required',
  'temporarily-unavailable',
])

export const DRIVE_USER_MESSAGE = 'Google Drive is not available to this connected account. Check the folder sharing or connect the Google account that owns it.'

export const DRIVE_MEDIA_PROVIDER = 'google-drive'

export const DRIVE_BACKEND_ENDPOINTS = Object.freeze({
  beginAuthorization: '/api/drive/oauth/begin',
  completeAuthorization: '/api/drive/oauth/callback',
  disconnect: '/api/drive/disconnect',
  syncNow: '/api/drive/sync',
  uploadMedia: '/api/drive/media/upload',
  removeMedia: '/api/drive/media/:mediaId',
  webhook: '/api/drive/webhook',
  thumbnail: '/api/drive/media/:mediaId/thumbnail',
  stream: '/api/drive/media/:mediaId/stream',
})

export const DRIVE_FRONTEND_AUTH_CONSTRAINTS = Object.freeze([
  'send-firebase-id-token',
  'never-send-google-refresh-token-to-browser',
  'never-persist-drive-access-token',
  'never-store-temporary-drive-url',
])

export const DRIVE_BACKEND_AUTH_REQUIREMENTS = Object.freeze([
  'verify-firebase-id-token',
  'require-approved-user',
  'require-active-couple-membership',
  'bind-authorization-state-to-couple-and-uid',
  'reject-cross-couple-media-index-writes',
  'verify-media-record-belongs-to-requesting-couple',
])

export const DRIVE_BACKEND_SECRET_CLASSES = Object.freeze([
  'google-oauth-client-secret',
  'google-refresh-token',
  'drive-watch-channel-secret',
])

export const DRIVE_FORBIDDEN_PERSISTED_FIELDS = Object.freeze([
  'temporary-preview-url',
  'thumbnailLink',
  'webContentLink',
  'access-token',
  'refresh-token',
  'signed-url',
  'raw-private-caption-in-audit-event',
  'firebase-storage-original-upload',
])

export const DRIVE_BACKEND_REQUIRED_FOR = Object.freeze([
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
  'partner-upload-to-drive',
  'partner-removal-from-couple-book-without-drive-oauth',
])

export const DRIVE_FRONTEND_CAN_DO = Object.freeze([
  'render-indexed-media',
  'request-session-drive-import',
  'dedupe-preview-requests',
  'clear-session-previews-on-logout',
  'show-owner-sync-status',
])

export function buildDriveBackendContract({
  coupleId = 'couple',
  driveFolderId = '',
  requiredScope = '',
  mediaIndexPath = `couples/${coupleId}/mediaItems`,
  syncStatePath = `couples/${coupleId}/mediaSync/google-drive`,
  auditPath = `couples/${coupleId}/auditEvents/{auditId}`,
  projectId = 'couplebook-97830',
} = {}) {
  return Object.freeze({
    projectId,
    provider: DRIVE_MEDIA_PROVIDER,
    driveFolderId,
    requiredScope,
    endpoints: DRIVE_BACKEND_ENDPOINTS,
    frontendAuth: DRIVE_FRONTEND_AUTH_CONSTRAINTS,
    backendAuth: DRIVE_BACKEND_AUTH_REQUIREMENTS,
    backendSecrets: DRIVE_BACKEND_SECRET_CLASSES,
    backendWrites: Object.freeze([
      mediaIndexPath,
      syncStatePath,
      auditPath,
    ]),
    forbiddenWrites: DRIVE_FORBIDDEN_PERSISTED_FIELDS,
    previewStrategy: Object.freeze({
      grid: 'backend-proxied-thumbnail-or-safe-thumbnail-cache',
      viewer: 'short-lived-backend-mediated-stream',
      staleUrlPolicy: 'do-not-store-or-replay',
    }),
    uploadStrategy: Object.freeze({
      directPartnerUpload: 'firebase-authenticated-member-to-trusted-backend-to-drive',
      browserDriveSession: 'owner-review-only-not-required-for-normal-partners',
      duplicateCheck: 'hash-first-then-reviewed-probable-duplicate-detection',
    }),
    sourceOfTruth: Object.freeze({
      drive: Object.freeze(['original-binary', 'drive-file-existence', 'drive-file-metadata']),
      firestore: Object.freeze(['couple-membership', 'caption', 'favorite', 'linked-memory', 'app-organization', 'sync-health']),
    }),
    deploymentStatus: 'owner-approval-required',
    zeroCostBoundary: 'A persistent Drive sync backend may require Cloud Functions or equivalent trusted hosting. Do not deploy, enable billing, or store refresh tokens until the owner approves that exact deployment plan.',
  })
}

export function buildDriveArchitectureContract(options = {}) {
  const backend = buildDriveBackendContract(options)
  const coupleId = options.coupleId || 'couple'
  const mediaIndexPath = options.mediaIndexPath || `couples/${coupleId}/mediaItems`
  const syncStatePath = options.syncStatePath || `couples/${coupleId}/mediaSync/google-drive`

  return Object.freeze({
    provider: DRIVE_MEDIA_PROVIDER,
    driveFolderId: options.driveFolderId || '',
    requiredScope: options.requiredScope || '',
    mediaIndexPath,
    syncStatePath,
    backend,
    frontendCan: DRIVE_FRONTEND_CAN_DO,
    backendRequiredFor: DRIVE_BACKEND_REQUIRED_FOR,
    deploymentStatus: 'owner-approval-required',
    zeroCostBoundary: 'Do not enable billing or deploy a persistent token backend without owner approval.',
  })
}
