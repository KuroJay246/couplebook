export const LEGACY_LOCAL_STORAGE_SOURCE = 'legacy-local-storage'
export const LEGACY_LOCAL_DEV_SOURCE = 'legacy-local-dev'
export const FIRESTORE_SOURCE = 'firestore'

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function deepClone(value) {
  if (value === null || value === undefined) return value

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value)
  }

  // Last-resort fallback for runtimes without structuredClone.
  return JSON.parse(JSON.stringify(value))
}

export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value
  }

  Object.freeze(value)
  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue)
  }
  return value
}

export function freezeClone(value) {
  return deepFreeze(deepClone(value))
}

export function createCompatibilityResult({ status, source, data = null, warnings = [] }) {
  const normalizedWarnings = Array.isArray(warnings) ? warnings.filter(Boolean) : []

  return Object.freeze({
    status,
    source,
    data: data === null ? null : freezeClone(data),
    warnings: Object.freeze([...normalizedWarnings]),
  })
}

export function resolveStorage(storage) {
  if (storage && typeof storage.getItem === 'function') {
    return storage
  }

  if (typeof globalThis !== 'undefined' && globalThis.localStorage && typeof globalThis.localStorage.getItem === 'function') {
    return globalThis.localStorage
  }

  return null
}

export function readStorageValue(storage, key, warnings) {
  try {
    return storage.getItem(key)
  } catch (error) {
    warnings.push(`Storage read failed for ${key}: ${error?.message || 'unknown error'}`)
    return null
  }
}

export function parseStoredJson(rawValue, key, warnings) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { ok: false, missing: true, value: null }
  }

  try {
    return { ok: true, missing: false, value: JSON.parse(rawValue) }
  } catch (error) {
    warnings.push(`Stored JSON for ${key} is malformed.`)
    return { ok: false, missing: false, value: null, error }
  }
}

export function pickObjectEntries(source, excludedKeys = []) {
  const excluded = new Set(excludedKeys)
  const result = {}

  for (const [key, value] of Object.entries(source || {})) {
    if (!excluded.has(key)) {
      result[key] = deepClone(value)
    }
  }

  return result
}

export function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    const normalized = toTrimmedString(entry)
    return normalized ? [normalized] : []
  })
}

export function normalizePersonKey(key) {
  const normalized = toTrimmedString(key)
  const lower = normalized.toLowerCase()

  if (lower === 'jaylan') return 'Jaylan'
  if (lower === 'omia') return 'Omia'
  return normalized
}

export function readRuntimeEnv() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env
  }

  return {}
}

export function getRuntimeMode(env = readRuntimeEnv()) {
  return env.MODE || (env.PROD ? 'production' : 'development')
}

export function getWindowLocation(locationLike) {
  if (locationLike) return locationLike
  if (typeof window !== 'undefined' && window.location) return window.location
  return null
}

export function isLocalHostname(hostname) {
  const normalized = toTrimmedString(hostname).toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1'
}

export function isLocalOrigin(locationLike) {
  const runtimeLocation = getWindowLocation(locationLike)
  if (!runtimeLocation?.hostname) return false
  return isLocalHostname(runtimeLocation.hostname)
}

export function resolveUrl(value, baseUrl = undefined) {
  try {
    return new URL(value, baseUrl)
  } catch {
    return null
  }
}
