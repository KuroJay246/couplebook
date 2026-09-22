export const MAINTENANCE_STATUS_PATH = '/maintenance-status.json'
export const MAINTENANCE_STATUS_TIMEOUT_MS = 2500

export const DEFAULT_MAINTENANCE_STATUS = Object.freeze({
  enabled: false,
  message: 'Couple Book is getting a careful update.',
  details: 'The app may be unavailable for a short time while improvements are reviewed. Your private memories, photos, videos, and special moments stay protected.',
  expectedReturnAt: '',
  updateId: '',
})

function safeText(value, maxLength = 240) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function safeDateTime(value) {
  const normalized = safeText(value, 80)
  if (!normalized) return ''
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? '' : normalized
}

export function normalizeMaintenanceStatus(value = {}) {
  const message = safeText(value.message, 160)
  const details = safeText(value.details, 320)
  const updateId = safeText(value.updateId, 80)
  const expectedReturnAt = safeDateTime(value.expectedReturnAt)

  return {
    enabled: value.enabled === true,
    message: message || DEFAULT_MAINTENANCE_STATUS.message,
    details: details || DEFAULT_MAINTENANCE_STATUS.details,
    expectedReturnAt,
    updateId,
  }
}

export async function fetchMaintenanceStatus({
  fetchImpl = globalThis.fetch,
  path = MAINTENANCE_STATUS_PATH,
  timeoutMs = MAINTENANCE_STATUS_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    return { status: DEFAULT_MAINTENANCE_STATUS, state: 'unavailable' }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetchImpl(path, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    })

    if (!response?.ok) {
      return { status: DEFAULT_MAINTENANCE_STATUS, state: 'unavailable' }
    }

    const raw = await response.json()
    return { status: normalizeMaintenanceStatus(raw), state: 'ready' }
  } catch {
    return { status: DEFAULT_MAINTENANCE_STATUS, state: 'unavailable' }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
