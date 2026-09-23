import {
  beginDriveAuthorization,
  completeDriveAuthorization,
  runDriveDisconnect,
  runDriveMediaRemoval,
  runDriveMediaUpload,
  runDriveSyncNow,
} from '@couplebook/drive-backend'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
})
const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/
const serviceAccessTokenCache = new Map()

function textEncoder() {
  return new TextEncoder()
}

function safeId(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 160)
}

function base64UrlToBytes(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function base64ToBytes(value) {
  const normalized = String(value || '').replace(/\s/g, '')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function bytesToBase64Url(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function parseJwt(jwt) {
  const parts = String(jwt || '').split('.')
  if (parts.length !== 3) throw new Error('invalid-jwt')
  return {
    header: JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))),
    payload: JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))),
    signed: `${parts[0]}.${parts[1]}`,
    signature: base64UrlToBytes(parts[2]),
  }
}

async function importGoogleJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
}

async function verifyFirebaseToken(idToken, env, fetchImpl = fetch) {
  const parsed = parseJwt(idToken)
  if (parsed.header.alg !== 'RS256' || !parsed.header.kid) throw new Error('invalid-firebase-token-header')
  const certResponse = await fetchImpl('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
  if (!certResponse.ok) throw new Error('firebase-certificates-unavailable')
  const certificateSet = await certResponse.json()
  const jwk = Array.isArray(certificateSet?.keys)
    ? certificateSet.keys.find((entry) => entry?.kid === parsed.header.kid)
    : null
  if (!jwk) throw new Error('firebase-certificate-not-found')
  const key = await importGoogleJwk(jwk)
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, parsed.signature, textEncoder().encode(parsed.signed))
  if (!ok) throw new Error('invalid-firebase-token-signature')
  const now = Math.floor(Date.now() / 1000)
  const projectId = env.FIREBASE_PROJECT_ID || 'couplebook-97830'
  if (parsed.payload.aud !== projectId) throw new Error('firebase-token-wrong-project')
  if (parsed.payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('firebase-token-wrong-issuer')
  if (!parsed.payload.sub || !SAFE_ID.test(parsed.payload.sub)) throw new Error('firebase-token-missing-subject')
  if (Number(parsed.payload.exp || 0) <= now) throw new Error('firebase-token-expired')
  return { uid: parsed.payload.sub, email: parsed.payload.email || '' }
}

async function importServiceAccountKey(privateKeyPem) {
  const body = String(privateKeyPem || '').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  return crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(body),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

async function createServiceJwt(env, scope) {
  const now = Math.floor(Date.now() / 1000)
  const header = bytesToBase64Url(textEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const payload = bytesToBase64Url(textEncoder().encode(JSON.stringify({
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    iss: env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    scope,
  })))
  const signed = `${header}.${payload}`
  const key = await importServiceAccountKey(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY)
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, textEncoder().encode(signed)))
  return `${signed}.${bytesToBase64Url(signature)}`
}

async function getGoogleAccessToken(env, scope = 'https://www.googleapis.com/auth/datastore') {
  const cacheKey = `${env.FIREBASE_PROJECT_ID || ''}:${env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || ''}:${scope}`
  const cached = serviceAccessTokenCache.get(cacheKey)
  if (cached && cached.expiresAtMs > Date.now() + 60_000) return cached.accessToken
  const assertion = await createServiceJwt(env, scope)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      assertion,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }),
  })
  const token = await response.json()
  if (!response.ok || !token.access_token) throw new Error('google-service-account-token-failed')
  serviceAccessTokenCache.set(cacheKey, {
    accessToken: token.access_token,
    expiresAtMs: Date.now() + Math.max(60, Number(token.expires_in || 3600) - 60) * 1000,
  })
  return token.access_token
}

function firestoreDocUrl(env, path) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('nullValue' in value) return null
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {})
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue)
  return null
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]))
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Number.isInteger(value)) return { integerValue: String(value) }
  if (typeof value === 'number') return { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } }
  if (typeof value === 'object') return { mapValue: { fields: toFirestoreFields(value) } }
  return { stringValue: String(value) }
}

function toFirestoreFields(record = {}) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined).map(([key, value]) => [key, toFirestoreValue(value)]))
}

async function firestoreGet(env, path) {
  const accessToken = await getGoogleAccessToken(env)
  const response = await fetch(firestoreDocUrl(env, path), { headers: { Authorization: `Bearer ${accessToken}` } })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('firestore-get-failed')
  const doc = await response.json()
  return fromFirestoreFields(doc.fields || {})
}

async function firestorePatch(env, path, record) {
  const accessToken = await getGoogleAccessToken(env)
  const response = await fetch(firestoreDocUrl(env, path), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(record) }),
  })
  if (!response.ok) throw new Error('firestore-patch-failed')
  return response.json()
}

function firestoreDocumentName(env, path) {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`
}

async function firestoreBatchWrite(env, writes = []) {
  if (!writes.length) return { writeResults: [] }
  const accessToken = await getGoogleAccessToken(env)
  const results = []
  for (let index = 0; index < writes.length; index += 100) {
    const batch = writes.slice(index, index + 100)
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:batchWrite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: batch.map(({ path, record }) => ({
          update: {
            name: firestoreDocumentName(env, path),
            fields: toFirestoreFields(record),
          },
        })),
      }),
    })
    if (!response.ok) throw new Error('firestore-batch-write-failed')
    const data = await response.json()
    results.push(...(data.writeResults || []))
  }
  return { writeResults: results }
}

async function firestoreList(env, collectionPath) {
  const accessToken = await getGoogleAccessToken(env)
  const response = await fetch(firestoreDocUrl(env, collectionPath), { headers: { Authorization: `Bearer ${accessToken}` } })
  if (response.status === 404) return []
  if (!response.ok) throw new Error('firestore-list-failed')
  const data = await response.json()
  return (data.documents || []).map((doc) => fromFirestoreFields(doc.fields || {}))
}

async function createEncryptionKey(rawKey) {
  const bytes = base64UrlToBytes(String(rawKey || ''))
  if (bytes.byteLength !== 32) throw new Error('token-encryption-key-must-be-32-bytes-base64url')
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptJson(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await createEncryptionKey(env.TOKEN_ENCRYPTION_KEY)
  const plaintext = textEncoder().encode(JSON.stringify(value))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext))
  return { ciphertext: bytesToBase64Url(ciphertext), iv: bytesToBase64Url(iv), version: 1 }
}

async function decryptJson(env, envelope) {
  const key = await createEncryptionKey(env.TOKEN_ENCRYPTION_KEY)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlToBytes(envelope.iv) },
    key,
    base64UrlToBytes(envelope.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext))
}

async function kvPutJson(env, key, value, options) {
  await env.DRIVE_TOKEN_KV.put(key, JSON.stringify(value), options)
}

async function kvGetJson(env, key) {
  const value = await env.DRIVE_TOKEN_KV.get(key)
  return value ? JSON.parse(value) : null
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  if (!origin || !allowedOrigins(env).includes(origin)) return {}
  return {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  }
}

function allowedOriginSet(env) {
  return new Set(String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean))
}

function isAllowedReturnUrl(env, value) {
  try {
    const url = new URL(String(value || ''))
    return allowedOriginSet(env).has(url.origin)
  } catch {
    return false
  }
}

function redirectResponse(request, env, url) {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders(request, env),
      Location: url,
    },
  })
}

function jsonResponse(request, env, status, body) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...corsHeaders(request, env) } })
}

function bearerToken(request) {
  return /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '')?.[1] || ''
}

async function tokenVerifierFactory(env) {
  return async (idToken) => verifyFirebaseToken(idToken, env)
}

async function activeMembershipReaderFactory(env) {
  return async ({ coupleId, uid }) => {
    const [user, member] = await Promise.all([
      firestoreGet(env, `users/${safeId(uid)}`),
      firestoreGet(env, `couples/${safeId(coupleId)}/members/${safeId(uid)}`),
    ])
    return {
      active: user?.approved === true
        && user?.accessStatus === 'active'
        && user?.coupleId === coupleId
        && member?.active === true
        && member?.role === 'member',
    }
  }
}

async function driveAccessToken(env, coupleId) {
  const envelope = await kvGetJson(env, `drive-refresh:${safeId(coupleId)}`)
  if (!envelope) throw new Error('drive-not-connected')
  const credential = await decryptJson(env, envelope)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: credential.refreshToken,
    }),
  })
  const token = await response.json()
  if (!response.ok || !token.access_token) throw new Error('drive-token-refresh-failed')
  return token.access_token
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder().encode(String(value || '')))
  return bytesToBase64Url(new Uint8Array(digest))
}

async function mediaIdForDriveFile(fileId) {
  return `drive_${(await sha256Base64Url(fileId)).slice(0, 48)}`
}

async function driveFileToMediaRecord(env, coupleId, file) {
  const mimeType = String(file.mimeType || '')
  const imageMetadata = file.imageMediaMetadata || {}
  const videoMetadata = file.videoMediaMetadata || {}
  return {
    schemaVersion: 1,
    coupleId,
    createdTime: file.createdTime || '',
    deleted: false,
    driveFileId: file.id,
    driveFolderId: env.GOOGLE_DRIVE_FOLDER_ID,
    durationMillis: videoMetadata.durationMillis ? Number(videoMetadata.durationMillis) : null,
    fileName: file.name || '',
    height: imageMetadata.height || videoMetadata.height ? Number(imageMetadata.height || videoMetadata.height) : null,
    hasThumbnail: file.hasThumbnail === true,
    mediaId: await mediaIdForDriveFile(file.id),
    mediaType: mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('audio/') ? 'audio' : 'image',
    mimeType,
    modifiedTime: file.modifiedTime || '',
    name: file.name || '',
    provider: 'google-drive',
    sizeBytes: file.size ? Number(file.size) : null,
    width: imageMetadata.width || videoMetadata.width ? Number(imageMetadata.width || videoMetadata.width) : null,
  }
}

async function listDriveRecords(env, coupleId) {
  const accessToken = await driveAccessToken(env, coupleId)
  const params = new URLSearchParams({
    fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,hasThumbnail,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis)),nextPageToken',
    includeItemsFromAllDrives: 'true',
    pageSize: '1000',
    q: `'${env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/' or mimeType contains 'audio/')`,
    spaces: 'drive',
    supportsAllDrives: 'true',
  })
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}))
    const reason = failure?.error?.errors?.[0]?.reason || failure?.error?.status || ''
    const message = failure?.error?.message || ''
    console.error('drive-list-failed', { status: response.status, reason: String(reason).slice(0, 120), message: String(message).slice(0, 240) })
    throw new Error('drive-list-failed')
  }
  const data = await response.json()
  return Promise.all((data.files || []).map((file) => driveFileToMediaRecord(env, coupleId, file)))
}

async function requireAuthorizedMedia({ body, env, headers, mediaId, tokenVerifier }) {
  const coupleId = String(body.coupleId || '')
  if (!SAFE_ID.test(coupleId) || !SAFE_ID.test(mediaId)) return { ok: false, response: { ok: false, status: 400, code: 'invalid-media-request' } }
  const idToken = bearerTokenFromHeaders(headers)
  if (!idToken) return { ok: false, response: { ok: false, status: 401, code: 'missing-firebase-id-token' } }
  const decoded = await tokenVerifier(idToken)
  const uid = decoded?.uid || ''
  if (!SAFE_ID.test(uid)) return { ok: false, response: { ok: false, status: 401, code: 'invalid-firebase-uid' } }
  const membership = await (await activeMembershipReaderFactory(env))({ coupleId, uid })
  if (membership?.active !== true) return { ok: false, response: { ok: false, status: 403, code: 'active-couple-membership-required' } }
  const media = await firestoreGet(env, `couples/${coupleId}/mediaItems/${safeId(mediaId)}`)
  if (!media || media.coupleId !== coupleId || media.provider !== 'google-drive' || media.deleted === true || !media.driveFileId) {
    return { ok: false, response: { ok: false, status: 404, code: 'media-record-not-found' } }
  }
  return { ok: true, coupleId, media }
}

function bearerTokenFromHeaders(headers = {}) {
  return /^Bearer\s+(.+)$/i.exec(headers.authorization || headers.Authorization || '')?.[1] || ''
}

function filteredDriveHeaders(response) {
  const headers = new Headers()
  for (const key of ['Accept-Ranges', 'Cache-Control', 'Content-Length', 'Content-Range', 'Content-Type', 'ETag', 'Last-Modified']) {
    const value = response.headers.get(key)
    if (value) headers.set(key, value)
  }
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-Content-Type-Options', 'nosniff')
  return headers
}

function driveThumbnailUrl(fileId) {
  const params = new URLSearchParams({
    fields: 'hasThumbnail,thumbnailLink',
    supportsAllDrives: 'true',
  })
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`
}

function upgradedThumbnailUrl(value) {
  const raw = String(value || '')
  if (!raw) return ''
  return raw.replace(/=s\d+(?:-[a-z]+)?$/i, '=s1600')
}

function isBrowserNativeImage(mimeType) {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/bmp'].includes(String(mimeType || '').toLowerCase())
}

async function proxyDriveOriginal(request, env, { accessToken, media }) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(media.driveFileId)}?alt=media`
  const headers = { Authorization: `Bearer ${accessToken}` }
  const range = request.headers.get('Range')
  if (range) headers.Range = range
  const response = await fetch(url, { headers })
  if (!response.ok && response.status !== 206) throw new Error('drive-media-proxy-failed')
  const proxyHeaders = filteredDriveHeaders(response)
  for (const [key, value] of Object.entries(corsHeaders(request, env))) proxyHeaders.set(key, value)
  return new Response(response.body, { status: response.status, headers: proxyHeaders })
}

async function proxyDriveThumbnail(request, env, { coupleId, media }) {
  const accessToken = await driveAccessToken(env, coupleId)
  const metadataResponse = await fetch(driveThumbnailUrl(media.driveFileId), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!metadataResponse.ok) throw new Error('drive-thumbnail-metadata-failed')
  const metadata = await metadataResponse.json()
  if (metadata?.hasThumbnail !== true || !metadata?.thumbnailLink) {
    if (isBrowserNativeImage(media.mimeType)) {
      return proxyDriveOriginal(request, env, { accessToken, media })
    }
    throw new Error('drive-thumbnail-unavailable')
  }

  const response = await fetch(upgradedThumbnailUrl(metadata.thumbnailLink), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('drive-thumbnail-proxy-failed')
  const proxyHeaders = filteredDriveHeaders(response)
  proxyHeaders.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg')
  for (const [key, value] of Object.entries(corsHeaders(request, env))) proxyHeaders.set(key, value)
  return new Response(response.body, { status: response.status, headers: proxyHeaders })
}

async function proxyDriveMedia(request, env, { coupleId, media }, thumbnail = false) {
  if (thumbnail) return proxyDriveThumbnail(request, env, { coupleId, media })
  const accessToken = await driveAccessToken(env, coupleId)
  return proxyDriveOriginal(request, env, { accessToken, media })
}

function base64ContentToBytes(value) {
  const raw = String(value || '').replace(/^data:[^,]+,/, '').replace(/\s/g, '')
  if (!raw) throw new Error('upload-content-required')
  return base64ToBytes(raw)
}

async function uploadDriveMultipart(env, { base64Content, coupleId, upload }) {
  const bytes = base64ContentToBytes(base64Content)
  if (bytes.byteLength !== Number(upload.sizeBytes)) throw new Error('upload-size-mismatch')
  const accessToken = await driveAccessToken(env, coupleId)
  const boundary = `couplebook_${crypto.randomUUID()}`
  const metadata = {
    mimeType: upload.mimeType,
    name: upload.fileName,
    parents: [env.GOOGLE_DRIVE_FOLDER_ID],
  }
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${upload.mimeType}\r\n\r\n`,
    bytes,
    `\r\n--${boundary}--\r\n`,
  ])
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,parents,md5Checksum,createdTime,modifiedTime,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis)', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!response.ok) throw new Error('drive-upload-failed')
  const data = await response.json()
  return {
    checksum: data.md5Checksum || '',
    createdTime: data.createdTime || '',
    driveFileId: data.id,
    driveFolderId: env.GOOGLE_DRIVE_FOLDER_ID,
    durationMillis: Number(data.videoMediaMetadata?.durationMillis || 0) || null,
    fileName: data.name || upload.fileName,
    height: Number(data.imageMediaMetadata?.height || data.videoMediaMetadata?.height || 0) || null,
    mimeType: data.mimeType || upload.mimeType,
    modifiedTime: data.modifiedTime || data.createdTime || '',
    sizeBytes: Number(data.size || upload.sizeBytes || 0),
    width: Number(data.imageMediaMetadata?.width || data.videoMediaMetadata?.width || 0) || null,
  }
}

async function deleteDriveFile(env, { coupleId, driveFileId }) {
  const accessToken = await driveAccessToken(env, coupleId)
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok && response.status !== 404) throw new Error('drive-delete-failed')
  return { ok: true }
}

async function exchangeCode(env, { code, coupleId }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    }),
  })
  const token = await response.json()
  if (!response.ok) {
    const reason = safeId(token.error || response.status)
    throw new Error(`drive-oauth-exchange-failed-${reason}`)
  }
  if (!token.access_token) throw new Error('drive-oauth-exchange-missing-access-token')
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  const profile = profileResponse.ok ? await profileResponse.json() : {}
  const connectedAccount = String(profile.email || '')
  if (env.GOOGLE_DRIVE_OWNER_EMAIL && connectedAccount.toLowerCase() !== String(env.GOOGLE_DRIVE_OWNER_EMAIL).toLowerCase()) {
    throw new Error('drive-owner-account-required')
  }
  const refreshKey = `drive-refresh:${safeId(coupleId)}`
  const existingCredential = await kvGetJson(env, refreshKey)
  if (!token.refresh_token && !existingCredential) throw new Error('drive-oauth-refresh-token-required')
  if (token.refresh_token) {
    await kvPutJson(env, refreshKey, await encryptJson(env, {
      refreshToken: token.refresh_token,
      scope: token.scope || DRIVE_SCOPE,
    }))
  }
  return { connectedAccount, credentialHandle: 'cloudflare-kv-encrypted', scope: token.scope || DRIVE_SCOPE }
}

async function dispatch(request, env) {
  const url = new URL(request.url)
  const path = url.pathname
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) })
  if (request.method === 'GET' && path === '/api/drive/health') return jsonResponse(request, env, 200, { ok: true, service: 'couplebook-drive-worker' })

  const body = request.method === 'GET' ? Object.fromEntries(url.searchParams) : await request.json().catch(() => ({}))
  const headers = { authorization: `Bearer ${bearerToken(request)}` }
  const tokenVerifier = await tokenVerifierFactory(env)
  const activeMembershipReader = await activeMembershipReaderFactory(env)

  if (request.method === 'POST' && path === '/api/drive/oauth/begin') {
    const result = await beginDriveAuthorization({
      activeMembershipReader,
      authorizationUrlBuilder: async ({ stateId }) => {
        const params = new URLSearchParams({
          access_type: 'offline',
          client_id: env.GOOGLE_OAUTH_CLIENT_ID,
          include_granted_scopes: 'true',
          prompt: 'consent',
          redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
          response_type: 'code',
          scope: DRIVE_SCOPE,
          state: stateId,
        })
        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
      },
      body,
      headers,
      randomId: () => crypto.randomUUID(),
      stateWriter: async (state) => kvPutJson(env, `oauth-state:${state.stateId}`, state, { expirationTtl: 600 }),
      tokenVerifier,
    })
    return jsonResponse(request, env, result.status || 500, result)
  }

  if (request.method === 'GET' && path === '/api/drive/oauth/callback') {
    const result = await completeDriveAuthorization({
      codeExchanger: (args) => exchangeCode(env, args),
      connectionWriter: (record) => firestorePatch(env, `couples/${safeId(record.coupleId)}/mediaSync/google-drive`, {
        connectedAccount: record.connectedAccount,
        coupleId: record.coupleId,
        provider: 'google-drive',
        status: 'connected',
        updatedAtMs: Date.now(),
      }),
      query: body,
      stateReader: (stateId) => kvGetJson(env, `oauth-state:${safeId(stateId)}`),
      stateWriter: (state) => kvPutJson(env, `oauth-state:${state.stateId}`, state, { expirationTtl: 600 }),
    })
    if (result.ok && isAllowedReturnUrl(env, result.returnUrl)) {
      const returnUrl = new URL(result.returnUrl)
      returnUrl.searchParams.set('media', 'connected')
      return redirectResponse(request, env, returnUrl.toString())
    }
    return jsonResponse(request, env, result.status || 500, result)
  }

  if (request.method === 'POST' && path === '/api/drive/sync') {
    const firestoreWrites = []
    const result = await runDriveSyncNow({
      activeMembershipReader,
      auditWriter: async ({ coupleId, record }) => {
        firestoreWrites.push({ path: `couples/${safeId(coupleId)}/auditEvents/${crypto.randomUUID()}`, record })
      },
      body,
      driveRecordReader: ({ coupleId }) => listDriveRecords(env, coupleId),
      headers,
      indexedMediaReader: ({ coupleId }) => firestoreList(env, `couples/${safeId(coupleId)}/mediaItems`),
      mediaWriter: async ({ coupleId, mediaId, record }) => {
        firestoreWrites.push({ path: `couples/${safeId(coupleId)}/mediaItems/${safeId(mediaId)}`, record })
      },
      syncStateWriter: async ({ coupleId, record }) => {
        firestoreWrites.push({ path: `couples/${safeId(coupleId)}/mediaSync/google-drive`, record })
      },
      tokenVerifier,
    })
    if (result.ok) await firestoreBatchWrite(env, firestoreWrites)
    return jsonResponse(request, env, result.status || 500, result)
  }

  if (request.method === 'POST' && path === '/api/drive/disconnect') {
    const result = await runDriveDisconnect({
      activeMembershipReader,
      auditWriter: async ({ coupleId, record }) => firestorePatch(env, `couples/${safeId(coupleId)}/auditEvents/${crypto.randomUUID()}`, record),
      body,
      connectionReader: ({ coupleId }) => firestoreGet(env, `couples/${safeId(coupleId)}/mediaSync/google-drive`),
      connectionWriter: ({ coupleId, record }) => firestorePatch(env, `couples/${safeId(coupleId)}/mediaSync/google-drive`, record),
      headers,
      tokenVerifier,
    })
    return jsonResponse(request, env, result.status || 500, result)
  }

  if (request.method === 'POST' && path === '/api/drive/media/upload') {
    const result = await runDriveMediaUpload({
      activeMembershipReader,
      auditWriter: async ({ coupleId, record }) => firestorePatch(env, `couples/${safeId(coupleId)}/auditEvents/${crypto.randomUUID()}`, record),
      body,
      driveUploader: ({ coupleId, upload }) => uploadDriveMultipart(env, { base64Content: body.base64Content, coupleId, upload }),
      duplicateReader: async ({ checksum, coupleId }) => {
        if (!checksum) return null
        const records = await firestoreList(env, `couples/${safeId(coupleId)}/mediaItems`)
        const exact = records.find((record) => record.checksum === checksum)
        return exact ? { exact } : null
      },
      headers,
      mediaWriter: ({ coupleId, mediaId, record }) => firestorePatch(env, `couples/${safeId(coupleId)}/mediaItems/${safeId(mediaId)}`, record),
      tokenVerifier,
    })
    return jsonResponse(request, env, result.status || 500, result)
  }

  const streamMatch = /^\/api\/drive\/media\/([A-Za-z0-9_-]{1,160})\/(stream|thumbnail)$/.exec(path)
  if (request.method === 'GET' && streamMatch) {
    const authorized = await requireAuthorizedMedia({
      body,
      env,
      headers,
      mediaId: streamMatch[1],
      tokenVerifier,
    })
    if (!authorized.ok) return jsonResponse(request, env, authorized.response.status || 500, authorized.response)
    return proxyDriveMedia(request, env, authorized, streamMatch[2] === 'thumbnail')
  }

  const mediaMatch = /^\/api\/drive\/media\/([A-Za-z0-9_-]{1,160})$/.exec(path)
  if (request.method === 'POST' && mediaMatch) {
    const result = await runDriveMediaRemoval({
      activeMembershipReader,
      auditWriter: async ({ coupleId, record }) => firestorePatch(env, `couples/${safeId(coupleId)}/auditEvents/${crypto.randomUUID()}`, record),
      body: { ...body, mediaId: mediaMatch[1] },
      driveRemover: ({ coupleId, driveFileId }) => deleteDriveFile(env, { coupleId, driveFileId }),
      headers,
      mediaReader: ({ coupleId, mediaId }) => firestoreGet(env, `couples/${safeId(coupleId)}/mediaItems/${safeId(mediaId)}`),
      mediaWriter: ({ coupleId, mediaId, record }) => firestorePatch(env, `couples/${safeId(coupleId)}/mediaItems/${safeId(mediaId)}`, record),
      path,
      tokenVerifier,
    })
    return jsonResponse(request, env, result.status || 500, result)
  }

  return jsonResponse(request, env, 404, { ok: false, code: 'drive-worker-route-not-found' })
}

export default {
  async fetch(request, env) {
    try {
      return await dispatch(request, env)
    } catch (error) {
      return jsonResponse(request, env, 500, { ok: false, code: error?.message || 'drive-worker-error' })
    }
  },
}

export const internals = {
  allowedOrigins,
  corsHeaders,
  decryptJson,
  driveThumbnailUrl,
  driveFileToMediaRecord,
  encryptJson,
  firestoreBatchWrite,
  firestoreDocumentName,
  isBrowserNativeImage,
  mediaIdForDriveFile,
  parseJwt,
  proxyDriveOriginal,
  toFirestoreFields,
  fromFirestoreFields,
  upgradedThumbnailUrl,
}
