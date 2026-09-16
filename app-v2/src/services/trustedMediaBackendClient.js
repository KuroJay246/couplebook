import { readRuntimeEnv } from '../data/adapterUtils.js'

function normalizeBackendUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
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

export async function removeMediaViaTrustedBackend({ coupleId, deleteOriginal = false, mediaId, user }) {
  const body = { coupleId, deleteOriginal }
  if (deleteOriginal) body.confirmDeleteOriginal = `delete-drive-original-${mediaId}`
  return callMediaBackend(`/api/drive/media/${encodeURIComponent(mediaId)}`, {
    body,
    user,
  })
}
