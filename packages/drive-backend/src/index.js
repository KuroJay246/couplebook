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

const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/
const SAFE_AUTH_CODE = /^[A-Za-z0-9._~/-]{8,4096}$/
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000
const FORBIDDEN_SYNC_FIELD_PATTERN = /(?:^|[_-])(access[_-]?token|refresh[_-]?token|client[_-]?secret|thumbnaillink|webcontentlink|previewurl|downloadurl|signedurl)(?:$|[_-])/i

function isSafeId(value) {
  return typeof value === 'string' && SAFE_ID.test(value)
}

function isSafeAuthCode(value) {
  return typeof value === 'string' && SAFE_AUTH_CODE.test(value)
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

export function assertNoCredentialValues(value) {
  const serialized = JSON.stringify(value)
  if (/refresh[_-]?token|access[_-]?token|client[_-]?secret|Bearer\s+[A-Za-z0-9._-]+/i.test(serialized)) {
    throw new Error('Drive backend contract output must not contain OAuth credential values.')
  }
  return true
}
