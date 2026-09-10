import { DRIVE_BACKEND_ENDPOINTS } from '@couplebook/drive-contracts'

export const DRIVE_BACKEND_DEPLOYMENT_STATUS = 'local-contract-only-owner-approval-required'

export const DRIVE_BACKEND_ROUTES = Object.freeze([
  Object.freeze({ key: 'beginAuthorization', method: 'POST', path: DRIVE_BACKEND_ENDPOINTS.beginAuthorization, body: ['coupleId'], secretAccess: false }),
  Object.freeze({ key: 'completeAuthorization', method: 'GET', path: DRIVE_BACKEND_ENDPOINTS.completeAuthorization, body: ['code', 'state'], secretAccess: true }),
  Object.freeze({ key: 'disconnect', method: 'POST', path: DRIVE_BACKEND_ENDPOINTS.disconnect, body: ['coupleId'], secretAccess: true }),
  Object.freeze({ key: 'syncNow', method: 'POST', path: DRIVE_BACKEND_ENDPOINTS.syncNow, body: ['coupleId'], secretAccess: true }),
  Object.freeze({ key: 'uploadMedia', method: 'POST', path: DRIVE_BACKEND_ENDPOINTS.uploadMedia, body: ['coupleId', 'clientUploadId'], secretAccess: true }),
  Object.freeze({ key: 'removeMedia', method: 'POST', path: DRIVE_BACKEND_ENDPOINTS.removeMedia, body: ['coupleId', 'mediaId'], secretAccess: true }),
  Object.freeze({ key: 'webhook', method: 'POST', path: DRIVE_BACKEND_ENDPOINTS.webhook, body: ['channelId', 'resourceId'], secretAccess: true }),
  Object.freeze({ key: 'thumbnail', method: 'GET', path: DRIVE_BACKEND_ENDPOINTS.thumbnail, body: ['mediaId'], secretAccess: true }),
  Object.freeze({ key: 'stream', method: 'GET', path: DRIVE_BACKEND_ENDPOINTS.stream, body: ['mediaId'], secretAccess: true }),
])

export const DRIVE_BACKEND_CAPABILITIES = Object.freeze([
  'firebase-id-token-validation',
  'active-couple-membership-validation',
  'oauth-state-binding',
  'oauth-code-exchange-boundary',
  'indexed-media-authorization',
  'sync-reconciliation-planning',
  'sync-now-handler',
  'media-upload-finalization',
  'exact-duplicate-preflight',
  'orphan-recovery-recording',
  'media-removal-tombstone',
  'drive-original-delete-confirmation',
  'drive-change-cursor-planning',
  'drive-webhook-handler',
  'drive-watch-renewal',
  'drive-disconnect-cleanup',
  'privacy-minimal-audit-events',
  'credential-field-rejection',
])

const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/
const SAFE_AUTH_CODE = /^[A-Za-z0-9._~/-]{8,4096}$/
const SAFE_CHECKSUM = /^[a-f0-9]{32,128}$/i
const SUPPORTED_MEDIA_TYPE = /^(image|video)\//
const SAFE_CHANGE_TOKEN = /^[A-Za-z0-9._~/-]{1,500}$/
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000
const FORBIDDEN_SYNC_FIELD_PATTERN = /(?:^|[_-])(access[_-]?token|refresh[_-]?token|client[_-]?secret|thumbnaillink|webcontentlink|previewurl|downloadurl|signedurl)(?:$|[_-])/i

function isSafeId(value) {
  return typeof value === 'string' && SAFE_ID.test(value)
}

function isSafeAuthCode(value) {
  return typeof value === 'string' && SAFE_AUTH_CODE.test(value)
}

function isSafeChecksum(value) {
  return typeof value === 'string' && SAFE_CHECKSUM.test(value)
}

function isSafeChangeToken(value) {
  return typeof value === 'string' && SAFE_CHANGE_TOKEN.test(value)
}

function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || ''
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization).trim())
  return match?.[1] || ''
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort())
}

function hasForbiddenSyncField(value) {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, child]) => {
    if (FORBIDDEN_SYNC_FIELD_PATTERN.test(key)) return true
    if (typeof child === 'string' && /Bearer\s+[A-Za-z0-9._-]+/i.test(child)) return true
    if (child && typeof child === 'object') return hasForbiddenSyncField(child)
    return false
  })
}

function assertSafeMediaRecord(record, coupleId) {
  if (!record || typeof record !== 'object') throw new Error('Drive sync media record is required.')
  if (hasForbiddenSyncField(record)) throw new Error('Drive sync media records must not include temporary URLs or credential fields.')
  if (record.provider !== 'google-drive') throw new Error('Drive sync media records must use google-drive provider.')
  if (record.coupleId !== coupleId) throw new Error('Drive sync media record couple mismatch.')
  if (!isSafeId(record.mediaId || '')) throw new Error('Drive sync media record requires a safe mediaId.')
  if (!isSafeId(record.driveFileId || '')) throw new Error('Drive sync media record requires a safe driveFileId.')
  return true
}

function assertSafeUploadDraft(upload, coupleId) {
  if (!upload || typeof upload !== 'object') throw new Error('Drive upload draft is required.')
  if (hasForbiddenSyncField(upload)) throw new Error('Drive upload draft must not include temporary URLs or credential fields.')
  if (!isSafeId(upload.clientUploadId || '')) throw new Error('Drive upload draft requires a safe clientUploadId.')
  if (!isSafeId(upload.mediaId || '')) throw new Error('Drive upload draft requires a safe mediaId.')
  if (upload.coupleId !== coupleId) throw new Error('Drive upload draft couple mismatch.')
  if (!SUPPORTED_MEDIA_TYPE.test(String(upload.mimeType || ''))) throw new Error('Drive upload draft requires supported image or video MIME type.')
  if (!Number.isSafeInteger(Number(upload.sizeBytes)) || Number(upload.sizeBytes) <= 0) throw new Error('Drive upload draft requires a positive sizeBytes value.')
  if (upload.checksum && !isSafeChecksum(upload.checksum)) throw new Error('Drive upload draft checksum is invalid.')
  if (/[\\/]|^\.+$/.test(String(upload.fileName || ''))) throw new Error('Drive upload draft fileName must not contain a local path.')
  return true
}

function createMediaAuditEvent({ action, coupleId, mediaId, nowMs, uid }) {
  return Object.freeze({
    action,
    actorUid: uid,
    coupleId,
    createdAtMs: nowMs,
    provider: 'google-drive',
    resourceId: mediaId,
    resourceType: 'media',
  })
}

function createSyncHealthRecord({ coupleId, lastChangeToken = '', nowMs, pendingChangeCount = 0, status = 'current' }) {
  if (!isSafeId(coupleId || '')) throw new Error('Drive sync health requires a safe coupleId.')
  if (lastChangeToken && !isSafeChangeToken(lastChangeToken)) throw new Error('Drive sync health requires a safe change token.')
  return Object.freeze({
    coupleId,
    lastChangeToken,
    lastWebhookAtMs: nowMs,
    pendingChangeCount,
    provider: 'google-drive',
    status,
  })
}

function assertSafeWatchChannel(channel, coupleId) {
  if (!channel || typeof channel !== 'object') throw new Error('Drive watch channel is required.')
  if (hasForbiddenSyncField(channel)) throw new Error('Drive watch channel must not include credential fields.')
  if (channel.provider !== 'google-drive') throw new Error('Drive watch channel must use google-drive provider.')
  if (channel.coupleId !== coupleId) throw new Error('Drive watch channel couple mismatch.')
  if (!isSafeId(channel.channelId || '')) throw new Error('Drive watch channel requires a safe channelId.')
  if (!isSafeId(channel.resourceId || '')) throw new Error('Drive watch channel requires a safe resourceId.')
  if (!Number.isSafeInteger(Number(channel.expiresAtMs)) || Number(channel.expiresAtMs) <= 0) throw new Error('Drive watch channel requires expiresAtMs.')
  if (channel.startChangeToken && !isSafeChangeToken(channel.startChangeToken)) throw new Error('Drive watch channel requires a safe startChangeToken.')
  return true
}

function createAuditEvent({ coupleId, counts, nowMs, uid }) {
  return Object.freeze({
    action: 'drive.sync',
    actorUid: uid,
    coupleId,
    createdAtMs: nowMs,
    provider: 'google-drive',
    resourceType: 'mediaSync',
    summary: Object.freeze({
      upserted: counts.upserted,
      tombstoned: counts.tombstoned,
      unchanged: counts.unchanged,
    }),
  })
}

export function listDriveBackendEndpointPaths() {
  return Object.freeze(DRIVE_BACKEND_ROUTES.map((route) => route.path))
}

export function listDriveBackendCapabilities() {
  return DRIVE_BACKEND_CAPABILITIES
}

export function findDriveBackendRoute(path, method = 'GET') {
  const normalizedMethod = String(method || '').trim().toUpperCase()
  return DRIVE_BACKEND_ROUTES.find((route) => {
    if (route.method !== normalizedMethod) return false
    if (route.path === path) return true
    if (!route.path.includes(':mediaId')) return false
    const pattern = new RegExp(`^${route.path.replace(':mediaId', '([A-Za-z0-9_-]{1,160})')}$`)
    return pattern.test(path)
  }) || null
}

export async function validateDriveBackendRequest({
  activeMembershipReader,
  body = {},
  headers = {},
  method = 'GET',
  path = '',
  tokenVerifier,
} = {}) {
  const route = findDriveBackendRoute(path, method)
  if (!route) return Object.freeze({ ok: false, status: 404, code: 'route-not-found' })

  const idToken = getBearerToken(headers)
  if (!idToken) return Object.freeze({ ok: false, status: 401, code: 'missing-firebase-id-token' })
  if (typeof tokenVerifier !== 'function') return Object.freeze({ ok: false, status: 500, code: 'token-verifier-not-configured' })

  const decoded = await tokenVerifier(idToken)
  const uid = decoded?.uid || ''
  if (!isSafeId(uid)) return Object.freeze({ ok: false, status: 401, code: 'invalid-firebase-uid' })

  const coupleId = body.coupleId || ''
  if (route.body.includes('coupleId') && !isSafeId(coupleId)) {
    return Object.freeze({ ok: false, status: 400, code: 'invalid-couple-id' })
  }

  if (typeof activeMembershipReader !== 'function') {
    return Object.freeze({ ok: false, status: 500, code: 'membership-reader-not-configured' })
  }

  const membership = await activeMembershipReader({ coupleId, uid })
  if (membership?.active !== true) {
    return Object.freeze({ ok: false, status: 403, code: 'active-couple-membership-required' })
  }

  return Object.freeze({
    ok: true,
    routeKey: route.key,
    uid,
    coupleId,
    status: 200,
  })
}

export async function beginDriveAuthorization({
  activeMembershipReader,
  authorizationUrlBuilder,
  body = {},
  headers = {},
  nowMs = Date.now(),
  randomId = () => crypto.randomUUID(),
  stateWriter,
  tokenVerifier,
} = {}) {
  const request = await validateDriveBackendRequest({
    activeMembershipReader,
    body,
    headers,
    method: 'POST',
    path: DRIVE_BACKEND_ENDPOINTS.beginAuthorization,
    tokenVerifier,
  })
  if (!request.ok) return request
  if (typeof stateWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'oauth-state-writer-not-configured' })
  if (typeof authorizationUrlBuilder !== 'function') return Object.freeze({ ok: false, status: 500, code: 'authorization-url-builder-not-configured' })

  const stateId = String(randomId()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120)
  if (!isSafeId(stateId)) return Object.freeze({ ok: false, status: 500, code: 'invalid-generated-state' })

  const stateRecord = Object.freeze({
    stateId,
    uid: request.uid,
    coupleId: request.coupleId,
    status: 'pending',
    createdAtMs: nowMs,
    expiresAtMs: nowMs + DEFAULT_STATE_TTL_MS,
  })

  await stateWriter(stateRecord)
  const authorizationUrl = await authorizationUrlBuilder({ coupleId: request.coupleId, stateId, uid: request.uid })
  return Object.freeze({
    ok: true,
    status: 200,
    authorizationUrl: String(authorizationUrl || ''),
    stateId,
  })
}

export async function completeDriveAuthorization({
  codeExchanger,
  connectionWriter,
  nowMs = Date.now(),
  query = {},
  stateReader,
  stateWriter,
} = {}) {
  const code = query.code || ''
  const stateId = query.state || ''
  if (!isSafeAuthCode(code)) return Object.freeze({ ok: false, status: 400, code: 'invalid-authorization-code' })
  if (!isSafeId(stateId)) return Object.freeze({ ok: false, status: 400, code: 'invalid-oauth-state' })
  if (typeof stateReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'oauth-state-reader-not-configured' })
  if (typeof stateWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'oauth-state-writer-not-configured' })
  if (typeof codeExchanger !== 'function') return Object.freeze({ ok: false, status: 500, code: 'code-exchanger-not-configured' })
  if (typeof connectionWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'connection-writer-not-configured' })

  const stateRecord = await stateReader(stateId)
  if (!stateRecord || stateRecord.status !== 'pending') return Object.freeze({ ok: false, status: 400, code: 'oauth-state-not-pending' })
  if (!isSafeId(stateRecord.uid) || !isSafeId(stateRecord.coupleId)) return Object.freeze({ ok: false, status: 400, code: 'oauth-state-corrupt' })
  if (Number(stateRecord.expiresAtMs || 0) < nowMs) return Object.freeze({ ok: false, status: 400, code: 'oauth-state-expired' })

  const exchange = await codeExchanger({ code, coupleId: stateRecord.coupleId, stateId, uid: stateRecord.uid })
  const serializedExchange = JSON.stringify(exchange || {})
  if (/refresh[_-]?token|access[_-]?token|client[_-]?secret|Bearer\s/i.test(serializedExchange)) {
    return Object.freeze({ ok: false, status: 500, code: 'credential-value-returned-from-exchanger' })
  }
  if (!isSafeId(exchange?.credentialHandle || '')) return Object.freeze({ ok: false, status: 500, code: 'credential-handle-required' })

  const connection = Object.freeze({
    coupleId: stateRecord.coupleId,
    uid: stateRecord.uid,
    provider: 'google-drive',
    credentialHandle: exchange.credentialHandle,
    connectedAccount: String(exchange.connectedAccount || ''),
    scope: String(exchange.scope || ''),
    status: 'connected',
    updatedAtMs: nowMs,
  })
  await connectionWriter(connection)
  await stateWriter({ ...stateRecord, status: 'used', usedAtMs: nowMs })

  return Object.freeze({
    ok: true,
    status: 200,
    coupleId: stateRecord.coupleId,
    connectedAccount: connection.connectedAccount,
    provider: connection.provider,
  })
}

export async function authorizeIndexedMediaRequest({
  activeMembershipReader,
  body = {},
  headers = {},
  mediaReader,
  method = 'GET',
  path = '',
  tokenVerifier,
} = {}) {
  const request = await validateDriveBackendRequest({
    activeMembershipReader,
    body,
    headers,
    method,
    path,
    tokenVerifier,
  })
  if (!request.ok) return request
  if (typeof mediaReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'media-reader-not-configured' })

  const mediaId = body.mediaId || /\/api\/drive\/media\/([A-Za-z0-9_-]{1,160})(?:\/|$)/.exec(path)?.[1] || ''
  if (!isSafeId(mediaId)) return Object.freeze({ ok: false, status: 400, code: 'invalid-media-id' })

  const media = await mediaReader({ coupleId: request.coupleId, mediaId })
  if (!media || media.provider !== 'google-drive' || media.deleted === true) {
    return Object.freeze({ ok: false, status: 404, code: 'media-not-found' })
  }
  if (media.coupleId !== request.coupleId || media.mediaId !== mediaId) {
    return Object.freeze({ ok: false, status: 403, code: 'media-couple-mismatch' })
  }

  return Object.freeze({
    ok: true,
    status: 200,
    coupleId: request.coupleId,
    mediaId,
    routeKey: request.routeKey,
    uid: request.uid,
  })
}

export function planDriveSyncWrites({
  coupleId,
  driveRecords = [],
  indexedRecords = [],
  nowMs = Date.now(),
  uid = '',
} = {}) {
  if (!isSafeId(coupleId || '')) throw new Error('Drive sync requires a safe coupleId.')
  if (uid && !isSafeId(uid)) throw new Error('Drive sync requires a safe uid when provided.')

  const indexedByDriveFileId = new Map()
  const driveFileIds = new Set()
  const mediaWrites = []
  const tombstoneWrites = []
  let unchanged = 0

  for (const indexedRecord of indexedRecords) {
    assertSafeMediaRecord(indexedRecord, coupleId)
    indexedByDriveFileId.set(indexedRecord.driveFileId, indexedRecord)
  }

  for (const driveRecord of driveRecords) {
    assertSafeMediaRecord(driveRecord, coupleId)
    driveFileIds.add(driveRecord.driveFileId)
    const existing = indexedByDriveFileId.get(driveRecord.driveFileId)
    const nextRecord = Object.freeze({
      ...driveRecord,
      deleted: false,
      lastSyncedAtMs: nowMs,
      provider: 'google-drive',
      syncStatus: 'active',
    })
    if (!existing || existing.deleted === true || stableJson({
      caption: existing.caption || '',
      coupleId: existing.coupleId,
      driveFileId: existing.driveFileId,
      durationMs: existing.durationMs || null,
      height: existing.height || null,
      mediaId: existing.mediaId,
      mimeType: existing.mimeType || '',
      name: existing.name || '',
      provider: existing.provider,
      sizeBytes: existing.sizeBytes || null,
      width: existing.width || null,
    }) !== stableJson({
      caption: nextRecord.caption || '',
      coupleId: nextRecord.coupleId,
      driveFileId: nextRecord.driveFileId,
      durationMs: nextRecord.durationMs || null,
      height: nextRecord.height || null,
      mediaId: nextRecord.mediaId,
      mimeType: nextRecord.mimeType || '',
      name: nextRecord.name || '',
      provider: nextRecord.provider,
      sizeBytes: nextRecord.sizeBytes || null,
      width: nextRecord.width || null,
    })) {
      mediaWrites.push(Object.freeze({
        mediaId: nextRecord.mediaId,
        operation: 'upsert',
        record: nextRecord,
      }))
    } else {
      unchanged += 1
    }
  }

  for (const indexedRecord of indexedRecords) {
    if (driveFileIds.has(indexedRecord.driveFileId) || indexedRecord.deleted === true) continue
    tombstoneWrites.push(Object.freeze({
      mediaId: indexedRecord.mediaId,
      operation: 'tombstone',
      record: Object.freeze({
        ...indexedRecord,
        deleted: true,
        lastSyncedAtMs: nowMs,
        provider: 'google-drive',
        syncStatus: 'missing-in-drive',
      }),
    }))
  }

  const counts = Object.freeze({
    driveFiles: driveRecords.length,
    indexedRecords: indexedRecords.length,
    tombstoned: tombstoneWrites.length,
    unchanged,
    upserted: mediaWrites.length,
  })
  const syncStateWrite = Object.freeze({
    coupleId,
    counts,
    lastSyncedAtMs: nowMs,
    provider: 'google-drive',
    status: 'ok',
  })
  const auditEvent = createAuditEvent({ coupleId, counts, nowMs, uid })
  const plan = Object.freeze({
    auditEvent,
    counts,
    mediaWrites: Object.freeze(mediaWrites),
    provider: 'google-drive',
    syncStateWrite,
    tombstoneWrites: Object.freeze(tombstoneWrites),
  })
  assertNoCredentialValues(plan)
  if (hasForbiddenSyncField(plan)) throw new Error('Drive sync plan contains forbidden media fields.')
  return plan
}

export async function runDriveSyncNow({
  activeMembershipReader,
  auditWriter,
  body = {},
  driveRecordReader,
  headers = {},
  indexedMediaReader,
  mediaWriter,
  nowMs = Date.now(),
  syncStateWriter,
  tokenVerifier,
} = {}) {
  const request = await validateDriveBackendRequest({
    activeMembershipReader,
    body,
    headers,
    method: 'POST',
    path: DRIVE_BACKEND_ENDPOINTS.syncNow,
    tokenVerifier,
  })
  if (!request.ok) return request
  if (typeof driveRecordReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'drive-record-reader-not-configured' })
  if (typeof indexedMediaReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'indexed-media-reader-not-configured' })
  if (typeof mediaWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'media-writer-not-configured' })
  if (typeof syncStateWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'sync-state-writer-not-configured' })
  if (typeof auditWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'audit-writer-not-configured' })

  const [driveRecords, indexedRecords] = await Promise.all([
    driveRecordReader({ coupleId: request.coupleId, uid: request.uid }),
    indexedMediaReader({ coupleId: request.coupleId, uid: request.uid }),
  ])
  const plan = planDriveSyncWrites({
    coupleId: request.coupleId,
    driveRecords,
    indexedRecords,
    nowMs,
    uid: request.uid,
  })

  for (const write of [...plan.mediaWrites, ...plan.tombstoneWrites]) {
    await mediaWriter({ coupleId: request.coupleId, ...write })
  }
  await syncStateWriter({ coupleId: request.coupleId, record: plan.syncStateWrite })
  await auditWriter({ coupleId: request.coupleId, record: plan.auditEvent })

  return Object.freeze({
    ok: true,
    status: 200,
    counts: plan.counts,
  })
}

export async function runDriveMediaUpload({
  activeMembershipReader,
  auditWriter,
  body = {},
  driveUploader,
  duplicateReader,
  headers = {},
  mediaWriter,
  nowMs = Date.now(),
  orphanWriter,
  tokenVerifier,
} = {}) {
  const request = await validateDriveBackendRequest({
    activeMembershipReader,
    body,
    headers,
    method: 'POST',
    path: DRIVE_BACKEND_ENDPOINTS.uploadMedia,
    tokenVerifier,
  })
  if (!request.ok) return request
  if (typeof duplicateReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'duplicate-reader-not-configured' })
  if (typeof driveUploader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'drive-uploader-not-configured' })
  if (typeof mediaWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'media-writer-not-configured' })
  if (typeof auditWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'audit-writer-not-configured' })

  const upload = Object.freeze({
    checksum: String(body.checksum || ''),
    clientUploadId: body.clientUploadId,
    coupleId: request.coupleId,
    fileName: String(body.fileName || ''),
    mediaId: body.mediaId,
    mimeType: String(body.mimeType || ''),
    sizeBytes: Number(body.sizeBytes || 0),
  })
  try {
    assertSafeUploadDraft(upload, request.coupleId)
  } catch (error) {
    return Object.freeze({ ok: false, status: 400, code: 'invalid-upload-draft', message: error.message })
  }

  const duplicate = await duplicateReader({
    checksum: upload.checksum,
    coupleId: request.coupleId,
    mediaId: upload.mediaId,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
  })
  if (duplicate?.exact) {
    return Object.freeze({
      ok: false,
      status: 409,
      code: 'exact-duplicate-media',
      duplicateMediaId: duplicate.exact.mediaId || '',
    })
  }

  const uploaded = await driveUploader({ coupleId: request.coupleId, uid: request.uid, upload })
  const mediaRecord = Object.freeze({
    caption: '',
    checksum: upload.checksum,
    coupleId: request.coupleId,
    createdByUid: request.uid,
    deleted: false,
    driveFileId: uploaded?.driveFileId || uploaded?.id || '',
    driveFolderId: uploaded?.driveFolderId || '',
    fileName: upload.fileName,
    lastSyncedAtMs: nowMs,
    mediaId: upload.mediaId,
    mediaType: upload.mimeType.startsWith('video/') ? 'video' : 'image',
    mimeType: upload.mimeType,
    provider: 'google-drive',
    sizeBytes: upload.sizeBytes,
    syncStatus: 'active',
    updatedAtMs: nowMs,
  })

  try {
    assertSafeMediaRecord(mediaRecord, request.coupleId)
    await mediaWriter({ coupleId: request.coupleId, mediaId: upload.mediaId, operation: 'upsert', record: mediaRecord })
    await auditWriter({
      coupleId: request.coupleId,
      record: createMediaAuditEvent({
        action: 'media.upload',
        coupleId: request.coupleId,
        mediaId: upload.mediaId,
        nowMs,
        uid: request.uid,
      }),
    })
  } catch (error) {
    if (typeof orphanWriter === 'function' && mediaRecord.driveFileId) {
      await orphanWriter({
        coupleId: request.coupleId,
        record: Object.freeze({
          clientUploadId: upload.clientUploadId,
          coupleId: request.coupleId,
          createdAtMs: nowMs,
          driveFileId: mediaRecord.driveFileId,
          mediaId: upload.mediaId,
          provider: 'google-drive',
          reason: 'media-finalization-failed',
        }),
      })
    }
    return Object.freeze({
      ok: false,
      status: 500,
      code: 'media-finalization-failed',
      mediaId: upload.mediaId,
      retryable: true,
    })
  }

  const response = Object.freeze({
    ok: true,
    status: 200,
    driveFileId: mediaRecord.driveFileId,
    mediaId: upload.mediaId,
  })
  assertNoCredentialValues(response)
  return response
}

export async function runDriveMediaRemoval({
  activeMembershipReader,
  auditWriter,
  body = {},
  driveRemover,
  headers = {},
  mediaReader,
  mediaWriter,
  method = 'POST',
  nowMs = Date.now(),
  path = '',
  tokenVerifier,
} = {}) {
  const authorized = await authorizeIndexedMediaRequest({
    activeMembershipReader,
    body,
    headers,
    mediaReader,
    method,
    path,
    tokenVerifier,
  })
  if (!authorized.ok) return authorized
  if (typeof mediaReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'media-reader-not-configured' })
  if (typeof mediaWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'media-writer-not-configured' })
  if (typeof auditWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'audit-writer-not-configured' })

  const media = await mediaReader({ coupleId: authorized.coupleId, mediaId: authorized.mediaId })
  assertSafeMediaRecord(media, authorized.coupleId)

  const deleteOriginal = body.deleteOriginal === true
  if (deleteOriginal) {
    const expectedConfirmation = `delete-drive-original-${authorized.mediaId}`
    if (body.confirmDeleteOriginal !== expectedConfirmation) {
      return Object.freeze({ ok: false, status: 400, code: 'drive-original-delete-confirmation-required' })
    }
    if (typeof driveRemover !== 'function') return Object.freeze({ ok: false, status: 500, code: 'drive-remover-not-configured' })
    await driveRemover({ coupleId: authorized.coupleId, driveFileId: media.driveFileId, mediaId: authorized.mediaId, uid: authorized.uid })
  }

  const record = Object.freeze({
    ...media,
    deleted: true,
    lastSyncedAtMs: nowMs,
    provider: 'google-drive',
    removedAtMs: nowMs,
    removedByUid: authorized.uid,
    syncStatus: deleteOriginal ? 'deleted-original' : 'removed-from-couple-book',
  })
  assertSafeMediaRecord(record, authorized.coupleId)
  await mediaWriter({ coupleId: authorized.coupleId, mediaId: authorized.mediaId, operation: 'tombstone', record })
  await auditWriter({
    coupleId: authorized.coupleId,
    record: createMediaAuditEvent({
      action: deleteOriginal ? 'media.deleteOriginal' : 'media.remove',
      coupleId: authorized.coupleId,
      mediaId: authorized.mediaId,
      nowMs,
      uid: authorized.uid,
    }),
  })

  return Object.freeze({
    ok: true,
    status: 200,
    deletedOriginal: deleteOriginal,
    mediaId: authorized.mediaId,
  })
}

export function planDriveChangeProcessing({
  changes = [],
  coupleId,
  indexedRecords = [],
  nextChangeToken = '',
  nowMs = Date.now(),
  uid = 'drive_webhook',
} = {}) {
  if (!isSafeId(coupleId || '')) throw new Error('Drive change processing requires a safe coupleId.')
  if (nextChangeToken && !isSafeChangeToken(nextChangeToken)) throw new Error('Drive change processing requires a safe next change token.')
  if (!Array.isArray(changes)) throw new Error('Drive changes must be an array.')

  const upsertRecords = []
  const removedDriveFileIds = new Set()
  for (const change of changes) {
    if (!change || typeof change !== 'object') throw new Error('Drive change entry is required.')
    if (hasForbiddenSyncField(change)) throw new Error('Drive changes must not include temporary URLs or credential fields.')
    const removed = change.removed === true || change.deleted === true
    if (removed) {
      const driveFileId = String(change.driveFileId || change.fileId || '')
      if (!isSafeId(driveFileId)) throw new Error('Removed Drive change requires a safe driveFileId.')
      removedDriveFileIds.add(driveFileId)
      continue
    }
    const record = change.mediaRecord || change.record
    assertSafeMediaRecord(record, coupleId)
    upsertRecords.push(record)
  }

  const removedIndexedRecords = indexedRecords.filter((record) => {
    assertSafeMediaRecord(record, coupleId)
    return removedDriveFileIds.has(record.driveFileId)
  })
  const plan = planDriveSyncWrites({
    coupleId,
    driveRecords: [
      ...upsertRecords,
      ...indexedRecords.filter((record) => !removedDriveFileIds.has(record.driveFileId)),
    ],
    indexedRecords,
    nowMs,
    uid,
  })
  const syncStateWrite = Object.freeze({
    ...plan.syncStateWrite,
    lastChangeToken: nextChangeToken,
    pendingChangeCount: changes.length,
    status: 'current',
  })
  const result = Object.freeze({
    ...plan,
    removedDriveFileIds: Object.freeze([...removedDriveFileIds]),
    removedIndexedCount: removedIndexedRecords.length,
    syncStateWrite,
  })
  assertNoCredentialValues(result)
  if (hasForbiddenSyncField(result)) throw new Error('Drive change plan contains forbidden fields.')
  return result
}

export async function runDriveWebhook({
  auditWriter,
  channelReader,
  changesReader,
  headers = {},
  indexedMediaReader,
  mediaWriter,
  nowMs = Date.now(),
  syncStateReader,
  syncStateWriter,
} = {}) {
  const channelId = String(headers['x-goog-channel-id'] || headers['X-Goog-Channel-Id'] || '')
  const resourceId = String(headers['x-goog-resource-id'] || headers['X-Goog-Resource-Id'] || '')
  const resourceState = String(headers['x-goog-resource-state'] || headers['X-Goog-Resource-State'] || '')
  if (!isSafeId(channelId)) return Object.freeze({ ok: false, status: 400, code: 'invalid-drive-channel-id' })
  if (!isSafeId(resourceId)) return Object.freeze({ ok: false, status: 400, code: 'invalid-drive-resource-id' })
  if (typeof channelReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'channel-reader-not-configured' })
  if (typeof changesReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'changes-reader-not-configured' })
  if (typeof indexedMediaReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'indexed-media-reader-not-configured' })
  if (typeof mediaWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'media-writer-not-configured' })
  if (typeof syncStateReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'sync-state-reader-not-configured' })
  if (typeof syncStateWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'sync-state-writer-not-configured' })
  if (typeof auditWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'audit-writer-not-configured' })

  const channel = await channelReader({ channelId, resourceId })
  if (!channel || channel.provider !== 'google-drive') return Object.freeze({ ok: false, status: 404, code: 'drive-watch-channel-not-found' })
  if (!isSafeId(channel.coupleId || '')) return Object.freeze({ ok: false, status: 500, code: 'drive-watch-channel-corrupt' })
  if (Number(channel.expiresAtMs || 0) <= nowMs) return Object.freeze({ ok: false, status: 410, code: 'drive-watch-channel-expired' })

  const syncState = await syncStateReader({ coupleId: channel.coupleId })
  const startToken = String(syncState?.lastChangeToken || channel.startChangeToken || '')
  if (startToken && !isSafeChangeToken(startToken)) return Object.freeze({ ok: false, status: 500, code: 'drive-change-token-corrupt' })

  if (resourceState === 'sync') {
    const record = createSyncHealthRecord({
      coupleId: channel.coupleId,
      lastChangeToken: startToken,
      nowMs,
      pendingChangeCount: 0,
      status: 'current',
    })
    await syncStateWriter({ coupleId: channel.coupleId, record })
    return Object.freeze({ ok: true, status: 200, accepted: true, resourceState })
  }

  const changeBatch = await changesReader({ coupleId: channel.coupleId, startToken })
  const indexedRecords = await indexedMediaReader({ coupleId: channel.coupleId })
  const plan = planDriveChangeProcessing({
    changes: changeBatch?.changes || [],
    coupleId: channel.coupleId,
    indexedRecords,
    nextChangeToken: changeBatch?.nextChangeToken || startToken,
    nowMs,
  })
  for (const write of [...plan.mediaWrites, ...plan.tombstoneWrites]) {
    await mediaWriter({ coupleId: channel.coupleId, ...write })
  }
  await syncStateWriter({ coupleId: channel.coupleId, record: plan.syncStateWrite })
  await auditWriter({ coupleId: channel.coupleId, record: plan.auditEvent })

  return Object.freeze({
    ok: true,
    status: 200,
    accepted: true,
    counts: plan.counts,
    resourceState,
  })
}

export function planDriveWatchRenewal({
  channel,
  coupleId,
  minimumTtlMs = 12 * 60 * 60 * 1000,
  nowMs = Date.now(),
} = {}) {
  if (!isSafeId(coupleId || '')) throw new Error('Drive watch renewal requires a safe coupleId.')
  if (!channel) {
    return Object.freeze({
      action: 'create',
      reason: 'missing-channel',
      status: 'action-required',
    })
  }
  assertSafeWatchChannel(channel, coupleId)
  const ttlMs = Number(channel.expiresAtMs) - nowMs
  if (ttlMs <= 0) {
    return Object.freeze({
      action: 'create',
      previousChannelId: channel.channelId,
      reason: 'expired-channel',
      status: 'action-required',
    })
  }
  if (ttlMs <= minimumTtlMs) {
    return Object.freeze({
      action: 'renew',
      previousChannelId: channel.channelId,
      reason: 'expiring-channel',
      status: 'renewal-required',
      ttlMs,
    })
  }
  return Object.freeze({
    action: 'keep',
    channelId: channel.channelId,
    reason: 'channel-healthy',
    status: 'current',
    ttlMs,
  })
}

export async function runDriveWatchRenewal({
  activeMembershipReader,
  auditWriter,
  body = {},
  channelReader,
  channelStopper,
  channelWriter,
  headers = {},
  nowMs = Date.now(),
  tokenVerifier,
  watchCreator,
} = {}) {
  const request = await validateDriveBackendRequest({
    activeMembershipReader,
    body,
    headers,
    method: 'POST',
    path: DRIVE_BACKEND_ENDPOINTS.syncNow,
    tokenVerifier,
  })
  if (!request.ok) return request
  if (typeof channelReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'channel-reader-not-configured' })
  if (typeof channelWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'channel-writer-not-configured' })
  if (typeof watchCreator !== 'function') return Object.freeze({ ok: false, status: 500, code: 'watch-creator-not-configured' })
  if (typeof auditWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'audit-writer-not-configured' })

  const existing = await channelReader({ coupleId: request.coupleId })
  const renewal = planDriveWatchRenewal({ channel: existing, coupleId: request.coupleId, nowMs })
  if (renewal.action === 'keep') {
    return Object.freeze({ ok: true, status: 200, renewal })
  }
  if (existing && typeof channelStopper === 'function') {
    await channelStopper({
      channelId: existing.channelId,
      coupleId: request.coupleId,
      resourceId: existing.resourceId,
    })
  }
  const created = await watchCreator({
    coupleId: request.coupleId,
    previousChannelId: existing?.channelId || '',
    uid: request.uid,
  })
  const nextChannel = Object.freeze({
    channelId: created?.channelId || '',
    coupleId: request.coupleId,
    createdAtMs: nowMs,
    expiresAtMs: Number(created?.expiresAtMs || 0),
    provider: 'google-drive',
    resourceId: created?.resourceId || '',
    startChangeToken: created?.startChangeToken || existing?.startChangeToken || '',
  })
  assertSafeWatchChannel(nextChannel, request.coupleId)
  await channelWriter({ coupleId: request.coupleId, record: nextChannel })
  await auditWriter({
    coupleId: request.coupleId,
    record: createMediaAuditEvent({
      action: 'drive.watchRenew',
      coupleId: request.coupleId,
      mediaId: nextChannel.channelId,
      nowMs,
      uid: request.uid,
    }),
  })
  return Object.freeze({
    ok: true,
    status: 200,
    channelId: nextChannel.channelId,
    renewal,
  })
}

export async function runDriveDisconnect({
  activeMembershipReader,
  auditWriter,
  body = {},
  channelReader,
  channelStopper,
  connectionReader,
  connectionWriter,
  headers = {},
  nowMs = Date.now(),
  tokenVerifier,
} = {}) {
  const request = await validateDriveBackendRequest({
    activeMembershipReader,
    body,
    headers,
    method: 'POST',
    path: DRIVE_BACKEND_ENDPOINTS.disconnect,
    tokenVerifier,
  })
  if (!request.ok) return request
  if (typeof connectionReader !== 'function') return Object.freeze({ ok: false, status: 500, code: 'connection-reader-not-configured' })
  if (typeof connectionWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'connection-writer-not-configured' })
  if (typeof auditWriter !== 'function') return Object.freeze({ ok: false, status: 500, code: 'audit-writer-not-configured' })

  const connection = await connectionReader({ coupleId: request.coupleId })
  if (!connection || connection.provider !== 'google-drive') return Object.freeze({ ok: false, status: 404, code: 'drive-connection-not-found' })
  if (hasForbiddenSyncField(connection)) return Object.freeze({ ok: false, status: 500, code: 'drive-connection-contains-forbidden-fields' })

  const channel = typeof channelReader === 'function' ? await channelReader({ coupleId: request.coupleId }) : null
  if (channel) {
    assertSafeWatchChannel(channel, request.coupleId)
    if (typeof channelStopper === 'function') {
      await channelStopper({
        channelId: channel.channelId,
        coupleId: request.coupleId,
        resourceId: channel.resourceId,
      })
    }
  }

  await connectionWriter({
    coupleId: request.coupleId,
    record: Object.freeze({
      coupleId: request.coupleId,
      disconnectedAtMs: nowMs,
      disconnectedByUid: request.uid,
      provider: 'google-drive',
      status: 'disconnected',
    }),
  })
  await auditWriter({
    coupleId: request.coupleId,
    record: createMediaAuditEvent({
      action: 'drive.disconnect',
      coupleId: request.coupleId,
      mediaId: 'google_drive',
      nowMs,
      uid: request.uid,
    }),
  })
  return Object.freeze({
    ok: true,
    status: 200,
    stoppedChannel: Boolean(channel),
  })
}

export function assertNoCredentialValues(value) {
  const serialized = JSON.stringify(value)
  if (/refresh[_-]?token|access[_-]?token|client[_-]?secret|Bearer\s+[A-Za-z0-9._-]+/i.test(serialized)) {
    throw new Error('Drive backend contract output must not contain OAuth credential values.')
  }
  return true
}
