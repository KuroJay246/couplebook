import { createHash, randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import {
  beginDriveAuthorization,
  completeDriveAuthorization,
  runDriveDisconnect,
  runDriveMediaRemoval,
  runDriveMediaUpload,
  runDriveSyncNow,
  runDriveWebhook,
} from '@couplebook/drive-backend'

initializeApp()

const db = getFirestore()
const GOOGLE_CLIENT_SECRET = defineSecret('COUPLEBOOK_GOOGLE_OAUTH_CLIENT_SECRET')
const GOOGLE_CLIENT_ID = defineString('COUPLEBOOK_GOOGLE_OAUTH_CLIENT_ID')
const GOOGLE_REDIRECT_URI = defineString('COUPLEBOOK_GOOGLE_OAUTH_REDIRECT_URI')
const GOOGLE_DRIVE_FOLDER_ID = defineString('COUPLEBOOK_GOOGLE_DRIVE_FOLDER_ID')
const GOOGLE_DRIVE_OWNER_EMAIL = defineString('COUPLEBOOK_GOOGLE_DRIVE_OWNER_EMAIL', { default: 'jaylanspencer99@gmail.com' })

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
})

function safeSegment(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 160)
}

function json(res, status, body) {
  res.status(status).set(JSON_HEADERS).send(JSON.stringify(body))
}

function getBearer(headers = {}) {
  const value = String(headers.authorization || headers.Authorization || '')
  return /^Bearer\s+(.+)$/i.exec(value.trim())?.[1] || ''
}

async function tokenVerifier(idToken) {
  return getAuth().verifyIdToken(idToken)
}

async function activeMembershipReader({ coupleId, uid }) {
  const [userSnap, memberSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`couples/${coupleId}/members/${uid}`).get(),
  ])
  const user = userSnap.data() || {}
  const member = memberSnap.data() || {}
  return {
    active: user.approved === true
      && user.accessStatus === 'active'
      && user.coupleId === coupleId
      && member.active === true
      && member.role === 'member',
  }
}

function stateRef(stateId) {
  return db.doc(`serverDriveOAuthStates/${safeSegment(stateId)}`)
}

function connectionRef(coupleId) {
  return db.doc(`couples/${safeSegment(coupleId)}/serverDriveConnections/google-drive`)
}

function credentialRef(coupleId) {
  return db.doc(`couples/${safeSegment(coupleId)}/serverDriveCredentials/google-drive`)
}

function mediaRef(coupleId, mediaId) {
  return db.doc(`couples/${safeSegment(coupleId)}/mediaItems/${safeSegment(mediaId)}`)
}

function mediaCollection(coupleId) {
  return db.collection(`couples/${safeSegment(coupleId)}/mediaItems`)
}

function syncRef(coupleId) {
  return db.doc(`couples/${safeSegment(coupleId)}/mediaSync/google-drive`)
}

function auditCollection(coupleId) {
  return db.collection(`couples/${safeSegment(coupleId)}/auditEvents`)
}

async function stateWriter(record) {
  await stateRef(record.stateId).set({ ...record, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

async function stateReader(stateId) {
  const snap = await stateRef(stateId).get()
  return snap.exists ? snap.data() : null
}

async function connectionWriter(record) {
  await connectionRef(record.coupleId).set({ ...record, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

async function connectionReader({ coupleId }) {
  const snap = await connectionRef(coupleId).get()
  return snap.exists ? snap.data() : null
}

async function readCredential(coupleId) {
  const snap = await credentialRef(coupleId).get()
  const data = snap.exists ? snap.data() : null
  if (!data?.refreshToken) throw new Error('drive-credential-not-connected')
  return data
}

async function writeCredential({ coupleId, credential }) {
  await credentialRef(coupleId).set({
    connectedAccount: credential.connectedAccount || '',
    provider: 'google-drive',
    refreshToken: credential.refreshToken,
    scope: credential.scope || DRIVE_SCOPE,
    tokenType: credential.tokenType || 'Bearer',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}

async function exchangeGoogleCode({ code, coupleId, uid }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID.value(),
      client_secret: GOOGLE_CLIENT_SECRET.value(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI.value(),
    }),
  })
  const token = await response.json()
  if (!response.ok || !token.refresh_token) throw new Error('google-oauth-code-exchange-failed')
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  const profile = profileResponse.ok ? await profileResponse.json() : {}
  const connectedAccount = String(profile.email || '')
  const ownerEmail = GOOGLE_DRIVE_OWNER_EMAIL.value()
  if (ownerEmail && connectedAccount && connectedAccount.toLowerCase() !== ownerEmail.toLowerCase()) {
    throw new Error('google-drive-owner-account-required')
  }
  await writeCredential({
    coupleId,
    credential: {
      connectedAccount,
      refreshToken: token.refresh_token,
      scope: token.scope || DRIVE_SCOPE,
      tokenType: token.token_type || 'Bearer',
      uid,
    },
  })
  return {
    connectedAccount,
    credentialHandle: 'google_drive',
    scope: token.scope || DRIVE_SCOPE,
  }
}

async function getAccessToken(coupleId) {
  const credential = await readCredential(coupleId)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID.value(),
      client_secret: GOOGLE_CLIENT_SECRET.value(),
      grant_type: 'refresh_token',
      refresh_token: credential.refreshToken,
    }),
  })
  const token = await response.json()
  if (!response.ok || !token.access_token) throw new Error('google-drive-access-token-refresh-failed')
  return token.access_token
}

function mediaIdForDriveFile(fileId) {
  return `drive_${createHash('sha256').update(String(fileId)).digest('hex').slice(0, 32)}`
}

function toMediaRecord(file, coupleId) {
  const mimeType = String(file.mimeType || '')
  return {
    coupleId,
    createdTime: file.createdTime || '',
    deleted: false,
    driveFileId: file.id,
    driveFolderId: GOOGLE_DRIVE_FOLDER_ID.value(),
    height: file.imageMediaMetadata?.height ? Number(file.imageMediaMetadata.height) : null,
    lastSyncedAtMs: Date.now(),
    mediaId: mediaIdForDriveFile(file.id),
    mediaType: mimeType.startsWith('video/') ? 'video' : 'image',
    mimeType,
    name: file.name || '',
    provider: 'google-drive',
    sizeBytes: file.size ? Number(file.size) : null,
    syncStatus: 'active',
    updatedAtMs: Date.now(),
    width: file.imageMediaMetadata?.width ? Number(file.imageMediaMetadata.width) : null,
  }
}

async function listDriveRecords({ coupleId }) {
  const accessToken = await getAccessToken(coupleId)
  const folderId = GOOGLE_DRIVE_FOLDER_ID.value()
  const fields = 'files(id,name,mimeType,size,createdTime,modifiedTime,imageMediaMetadata(width,height)),nextPageToken'
  const params = new URLSearchParams({
    fields,
    includeItemsFromAllDrives: 'false',
    pageSize: '1000',
    q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`,
    supportsAllDrives: 'false',
  })
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json()
  if (!response.ok) throw new Error('google-drive-list-failed')
  return (data.files || []).map((file) => toMediaRecord(file, coupleId))
}

async function indexedMediaReader({ coupleId }) {
  const snap = await mediaCollection(coupleId).get()
  return snap.docs.map((doc) => doc.data())
}

async function mediaReader({ coupleId, mediaId }) {
  const snap = await mediaRef(coupleId, mediaId).get()
  return snap.exists ? snap.data() : null
}

async function mediaWriter({ coupleId, mediaId, record }) {
  await mediaRef(coupleId, mediaId).set({ ...record, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

async function syncStateWriter({ coupleId, record }) {
  await syncRef(coupleId).set({ ...record, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

async function auditWriter({ coupleId, record }) {
  await auditCollection(coupleId).add({ ...record, createdAt: FieldValue.serverTimestamp() })
}

async function duplicateReader({ checksum, coupleId, mediaId }) {
  if (!checksum) return null
  const snap = await mediaCollection(coupleId).where('checksum', '==', checksum).limit(1).get()
  const exact = snap.docs.map((doc) => doc.data()).find((record) => record.mediaId !== mediaId)
  return exact ? { exact } : null
}

async function driveUploader() {
  throw new Error('drive-multipart-upload-requires-billing-enabled-deploy')
}

async function driveRemover({ coupleId, driveFileId }) {
  const accessToken = await getAccessToken(coupleId)
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('google-drive-delete-failed')
}

function requestBody(req) {
  return req.method === 'GET' ? req.query || {} : req.body || {}
}

async function dispatch(req) {
  const path = req.path || req.url.split('?')[0]
  const body = requestBody(req)
  const headers = req.headers || {}
  const shared = { activeMembershipReader, headers, tokenVerifier }
  if (req.method === 'GET' && path === '/api/drive/health') return { ok: true, status: 200, service: 'couplebook-drive-api' }
  if (req.method === 'POST' && path === '/api/drive/oauth/begin') {
    return beginDriveAuthorization({
      ...shared,
      body,
      authorizationUrlBuilder: async ({ stateId }) => {
        const params = new URLSearchParams({
          access_type: 'offline',
          client_id: GOOGLE_CLIENT_ID.value(),
          include_granted_scopes: 'true',
          prompt: 'consent',
          redirect_uri: GOOGLE_REDIRECT_URI.value(),
          response_type: 'code',
          scope: DRIVE_SCOPE,
          state: stateId,
        })
        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
      },
      randomId: randomUUID,
      stateWriter,
    })
  }
  if (req.method === 'GET' && path === '/api/drive/oauth/callback') {
    return completeDriveAuthorization({
      codeExchanger: exchangeGoogleCode,
      connectionWriter,
      query: req.query || {},
      stateReader,
      stateWriter,
    })
  }
  if (req.method === 'POST' && path === '/api/drive/sync') {
    return runDriveSyncNow({
      ...shared,
      auditWriter,
      body,
      driveRecordReader: listDriveRecords,
      indexedMediaReader,
      mediaWriter,
      syncStateWriter,
    })
  }
  if (req.method === 'POST' && path === '/api/drive/media/upload') {
    return runDriveMediaUpload({
      ...shared,
      auditWriter,
      body,
      driveUploader,
      duplicateReader,
      mediaWriter,
    })
  }
  const mediaMatch = /^\/api\/drive\/media\/([A-Za-z0-9_-]{1,160})$/.exec(path)
  if (req.method === 'POST' && mediaMatch) {
    return runDriveMediaRemoval({
      ...shared,
      auditWriter,
      body: { ...body, mediaId: mediaMatch[1] },
      driveRemover,
      mediaReader,
      mediaWriter,
      path,
    })
  }
  if (req.method === 'POST' && path === '/api/drive/disconnect') {
    return runDriveDisconnect({
      ...shared,
      auditWriter,
      body,
      connectionReader,
      connectionWriter,
    })
  }
  if (req.method === 'POST' && path === '/api/drive/webhook') {
    return runDriveWebhook({
      auditWriter,
      changesReader: async () => ({ changes: [], nextChangeToken: '' }),
      channelReader: async () => null,
      headers,
      indexedMediaReader,
      mediaWriter,
      syncStateReader: async ({ coupleId }) => (await syncRef(coupleId).get()).data() || null,
      syncStateWriter,
    })
  }
  return { ok: false, status: 404, code: 'drive-route-not-found' }
}

export const driveApi = onRequest({
  cors: false,
  invoker: 'public',
  maxInstances: 3,
  region: 'us-central1',
  secrets: [GOOGLE_CLIENT_SECRET],
  timeoutSeconds: 120,
}, async (req, res) => {
  try {
    const result = await dispatch(req)
    json(res, result.status || (result.ok ? 200 : 500), result)
  } catch (error) {
    json(res, 500, {
      ok: false,
      code: error?.message || 'drive-api-error',
    })
  }
})
