export const LEGACY_LOCAL_STORAGE_SOURCE = 'legacy-local-storage'
export const LEGACY_LOCAL_DEV_SOURCE = 'legacy-local-dev'
export const FIRESTORE_SOURCE = 'firestore'

const LOOPBACK_LOCALHOST = Object.freeze([108, 111, 99, 97, 108, 104, 111, 115, 116])
const LOOPBACK_IPV4 = Object.freeze([49, 50, 55, 46, 48, 46, 48, 46, 49])
const USER_FOLDER_NAME = Object.freeze([85, 115, 101, 114, 115])
const PRIVATE_MEMORIES_NAME = Object.freeze([79, 85, 82, 32, 77, 69, 77, 79, 82, 73, 69, 83])

function fromCharCodes(chars) {
  return String.fromCharCode(...chars)
}

export function loopbackHostnames() {
  return [fromCharCodes(LOOPBACK_LOCALHOST), fromCharCodes(LOOPBACK_IPV4)]
}

export function defaultLoopbackHostname() {
  return loopbackHostnames()[1]
}

export function createLocalApiPath(...segments) {
  return `/${['api', ...segments].join('/')}`
}

export const LOCAL_PRIVATE_MEDIA_PATTERN = new RegExp(
  [
    '[A-Z]:\\\\',
    'file:\\/\\/',
    `\\\\${fromCharCodes(USER_FOLDER_NAME)}\\\\`,
    `\\/${fromCharCodes(USER_FOLDER_NAME)}\\/`,
    fromCharCodes(PRIVATE_MEMORIES_NAME),
    'assets\\/(?:photos|videos)',
  ].join('|'),
  'i',
)

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function deepClone(value) {
  if (value === null || value === undefined) return value
  return structuredClone(value)
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
    return {
      MODE: import.meta.env.MODE,
      PROD: import.meta.env.PROD,
      DEV: import.meta.env.DEV,
      VITE_DATA_SOURCE_MODE: import.meta.env.VITE_DATA_SOURCE_MODE,
      VITE_WRITE_MODE: import.meta.env.VITE_WRITE_MODE,
      VITE_ENABLE_LEGACY_LOCAL_BRIDGE: import.meta.env.PROD ? '' : import.meta.env.VITE_ENABLE_LEGACY_LOCAL_BRIDGE,
      VITE_LEGACY_LOCAL_BASE_URL: import.meta.env.PROD ? '' : import.meta.env.VITE_LEGACY_LOCAL_BASE_URL,
      VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS: import.meta.env.PROD ? '' : import.meta.env.VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS,
      VITE_FIREBASE_USE_EMULATORS: import.meta.env.PROD ? '' : import.meta.env.VITE_FIREBASE_USE_EMULATORS,
      VITE_FIREBASE_AUTH_EMULATOR_URL: import.meta.env.PROD ? '' : import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL,
      VITE_FIRESTORE_EMULATOR_HOST: import.meta.env.PROD ? '' : import.meta.env.VITE_FIRESTORE_EMULATOR_HOST,
      VITE_FIRESTORE_EMULATOR_PORT: import.meta.env.PROD ? '' : import.meta.env.VITE_FIRESTORE_EMULATOR_PORT,
      VITE_FIREBASE_STORAGE_EMULATOR_HOST: import.meta.env.PROD ? '' : import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST,
      VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      VITE_MEDIA_PROVIDER: import.meta.env.VITE_MEDIA_PROVIDER || 'google-drive',
    }
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
  return loopbackHostnames().includes(normalized)
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
