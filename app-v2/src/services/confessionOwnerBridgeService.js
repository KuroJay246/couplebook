import { createLocalApiPath, isLocalOrigin, readRuntimeEnv, resolveUrl } from '../data/adapterUtils.js'

export const CONFESSION_OWNER_STATE_PATH = createLocalApiPath('private-media', 'confession', 'owner-state')

export function getConfessionOwnerBridgeBaseUrl(env = readRuntimeEnv()) {
  return String(env.VITE_LEGACY_LOCAL_BASE_URL || '').trim()
}

export function resolveConfessionOwnerBridgeUrl(url, baseUrl = getConfessionOwnerBridgeBaseUrl()) {
  if (!url) return ''
  return resolveUrl(url, baseUrl || globalThis.window?.location?.origin)?.toString() || ''
}

export function canUseConfessionOwnerBridge({
  baseUrl = getConfessionOwnerBridgeBaseUrl(),
  location = globalThis.window?.location,
  user = null,
} = {}) {
  return Boolean(baseUrl && user?.uid && isLocalOrigin(location))
}

export async function loadConfessionOwnerState({
  baseUrl = getConfessionOwnerBridgeBaseUrl(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Owner restoration bridge is unavailable.')
  }

  const response = await fetchImpl(resolveConfessionOwnerBridgeUrl(CONFESSION_OWNER_STATE_PATH, baseUrl))
  if (!response.ok) {
    throw new Error('Owner restoration state is unavailable.')
  }

  return response.json()
}

export async function saveConfessionOwnerMapping({
  baseUrl = getConfessionOwnerBridgeBaseUrl(),
  candidateId = '',
  clear = false,
  fetchImpl = globalThis.fetch,
  slotId,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Owner restoration bridge is unavailable.')
  }

  const response = await fetchImpl(resolveConfessionOwnerBridgeUrl(CONFESSION_OWNER_STATE_PATH, baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clear ? { slotId, clear: true } : { slotId, candidateId }),
  })

  if (!response.ok) {
    throw new Error('Owner mapping update failed.')
  }

  return response.json()
}
