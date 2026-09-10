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

function isSafeId(value) {
  return typeof value === 'string' && SAFE_ID.test(value)
}

function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || ''
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization).trim())
  return match?.[1] || ''
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

export function assertNoCredentialValues(value) {
  const serialized = JSON.stringify(value)
  if (/refresh[_-]?token|access[_-]?token|client[_-]?secret|Bearer\s+[A-Za-z0-9._-]+/i.test(serialized)) {
    throw new Error('Drive backend contract output must not contain OAuth credential values.')
  }
  return true
}
