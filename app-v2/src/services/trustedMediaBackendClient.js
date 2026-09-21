import { readRuntimeEnv } from '../data/adapterUtils.js'
import { COUPLE_BOOK_DRIVE_FOLDER_ID } from './googleDriveMediaProvider.js'

function normalizeBackendUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isLocalTrustedMediaTestHookEnabled(env = readRuntimeEnv()) {
  if (typeof window === 'undefined') return false
  if (env.VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS !== 'true') return false
  if (window.__COUPLEBOOK_DRIVE_TEST__?.enabled !== true) return false
  return ['localhost', '127.0.0.1'].includes(window.location?.hostname)
}

function readLocalDriveConfig() {
  return window.__COUPLEBOOK_DRIVE_TEST__ || {}
}

function readLocalDriveFiles() {
  const files = readLocalDriveConfig().files
  return Array.isArray(files) ? files : []
}

function writeLocalDriveFiles(files) {
  readLocalDriveConfig().files = Array.isArray(files) ? files : []
}

function createLocalDriveId() {
  if (globalThis.crypto?.randomUUID) {
    return `drive_test_${crypto.randomUUID().replaceAll('-', '')}`
  }
  return `drive_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

async function waitForLocalDriveDelay() {
  const delayMs = Number(readLocalDriveConfig().uploadDelayMs || 0)
  if (Number.isFinite(delayMs) && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

function maybeFailLocalDriveUpload() {
  const config = readLocalDriveConfig()
  const remaining = Number(config.failUploadsRemaining || 0)
  if (!Number.isFinite(remaining) || remaining <= 0) return
  config.failUploadsRemaining = remaining - 1
  const error = new Error('Local trusted media backend test upload failed.')
  error.code = 'temporary-failure'
  throw error
}

export function resolveTrustedMediaBackendUrl(env = readRuntimeEnv()) {
  return normalizeBackendUrl(env.VITE_MEDIA_BACKEND_URL)
}

export function isTrustedMediaBackendConfigured(env = readRuntimeEnv()) {
  return Boolean(resolveTrustedMediaBackendUrl(env))
}

async function idTokenForUser(user) {
  if (!user || typeof user.getIdToken !== 'function') {
    throw new Error('Sign in again before using the private media service.')
  }
  return user.getIdToken()
}

async function readJsonResponse(response) {
  const body = await response.json().catch(() => ({}))
  if (response.ok && body?.ok !== false) return body
  const message = body?.message || body?.code || 'The private media service could not complete this request.'
  throw Object.assign(new Error(message), { code: body?.code || `http-${response.status}`, status: response.status })
}

async function callMediaBackend(path, { body, method = 'POST', user } = {}) {
  const baseUrl = resolveTrustedMediaBackendUrl()
  if (!baseUrl) throw new Error('Private media service is not configured.')
  const idToken = await idTokenForUser(user)
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return readJsonResponse(response)
}

async function fetchMediaBackendBlob(path, { body, user } = {}) {
  const baseUrl = resolveTrustedMediaBackendUrl()
  if (!baseUrl) throw new Error('Private media service is not configured.')
  const idToken = await idTokenForUser(user)
  const url = new URL(`${baseUrl}${path}`)
  for (const [key, value] of Object.entries(body || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })
  if (!response.ok) {
    const fallback = `http-${response.status}`
    const message = response.headers.get('Content-Type')?.includes('application/json')
      ? (await response.json().catch(() => ({})))?.code || fallback
      : fallback
    throw Object.assign(new Error(message), { code: message, status: response.status })
  }
  return response.blob()
}

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

export async function fileToBase64Content(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return bytesToBase64(bytes)
}

export async function uploadMediaViaTrustedBackend({ checksum, coupleId, file, mediaId, user }) {
  if (isLocalTrustedMediaTestHookEnabled()) {
    await waitForLocalDriveDelay()
    maybeFailLocalDriveUpload()
    const driveFileId = createLocalDriveId()
    const now = new Date().toISOString()
    const metadata = {
      id: driveFileId,
      name: file?.name || mediaId,
      mimeType: file?.type || 'application/octet-stream',
      size: String(file?.size || 0),
      parents: [COUPLE_BOOK_DRIVE_FOLDER_ID],
      md5Checksum: checksum || driveFileId.slice(-32),
      createdTime: now,
      modifiedTime: now,
    }
    writeLocalDriveFiles([metadata, ...readLocalDriveFiles()])
    return {
      coupleId,
      driveFileId,
      driveFolderId: COUPLE_BOOK_DRIVE_FOLDER_ID,
      mediaId,
      mimeType: metadata.mimeType,
      sizeBytes: file?.size || 0,
    }
  }

  const base64Content = await fileToBase64Content(file)
  return callMediaBackend('/api/drive/media/upload', {
    body: {
      base64Content,
      checksum,
      clientUploadId: mediaId,
      coupleId,
      fileName: file.name,
      mediaId,
      mimeType: file.type,
      sizeBytes: file.size,
    },
    user,
  })
}

export async function beginDriveOAuthViaTrustedBackend({ coupleId, returnUrl, user }) {
  if (isLocalTrustedMediaTestHookEnabled()) {
    writeLocalDriveFiles(readLocalDriveFiles())
    return { connected: true, coupleId, returnUrl }
  }

  return callMediaBackend('/api/drive/oauth/begin', {
    body: { coupleId, returnUrl },
    user,
  })
}

export async function syncDriveViaTrustedBackend({ coupleId, user }) {
  if (isLocalTrustedMediaTestHookEnabled()) {
    return { counts: { added: readLocalDriveFiles().length, unchanged: 0, removed: 0 }, coupleId, ok: true }
  }

  return callMediaBackend('/api/drive/sync', {
    body: { coupleId },
    user,
  })
}

export async function disconnectDriveViaTrustedBackend({ coupleId, user }) {
  if (isLocalTrustedMediaTestHookEnabled()) {
    return { coupleId, ok: true }
  }

  return callMediaBackend('/api/drive/disconnect', {
    body: { coupleId },
    user,
  })
}

export async function removeMediaViaTrustedBackend({ coupleId, deleteOriginal = false, mediaId, user }) {
  if (isLocalTrustedMediaTestHookEnabled()) {
    writeLocalDriveFiles(readLocalDriveFiles().filter((entry) => entry.id !== mediaId))
    return { coupleId, deleteOriginal, mediaId, ok: true }
  }

  const body = { coupleId, deleteOriginal }
  if (deleteOriginal) body.confirmDeleteOriginal = `delete-drive-original-${mediaId}`
  return callMediaBackend(`/api/drive/media/${encodeURIComponent(mediaId)}`, {
    body,
    user,
  })
}

export async function fetchMediaBlobViaTrustedBackend({ coupleId, mediaId, mode = 'thumbnail', user }) {
  const safeMode = mode === 'stream' ? 'stream' : 'thumbnail'
  return fetchMediaBackendBlob(`/api/drive/media/${encodeURIComponent(mediaId)}/${safeMode}`, {
    body: { coupleId },
    user,
  })
}
