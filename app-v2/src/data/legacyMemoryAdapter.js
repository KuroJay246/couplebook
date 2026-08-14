import {
  LEGACY_LOCAL_DEV_SOURCE,
  createCompatibilityResult,
  getRuntimeMode,
  isLocalOrigin,
  isLocalHostname,
  isPlainObject,
  normalizeBoolean,
  parseStoredJson,
  pickObjectEntries,
  readRuntimeEnv,
  readStorageValue,
  resolveStorage,
  resolveUrl,
  toTrimmedString,
} from './adapterUtils.js'
import { mergeLegacyMemorySources } from '../features/timeline/memorySourceMerge.js'

const CUSTOM_MEMORIES_KEY = 'memorybook_custom_memories'
const DELETED_MEMORIES_KEY = 'memorybook_deleted_memories'
const OVERRIDDEN_MEMORIES_KEY = 'memorybook_overridden_memories'

/**
 * @typedef {Object} NormalizedMemoryRecord
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string | null} dateLabel
 * @property {string[]} tags
 * @property {'image' | 'video' | 'unknown'} mediaKind
 * @property {string | null} mediaPath
 * @property {boolean} isSpecialPage
 * @property {string | null} pageUrl
 * @property {boolean} isDeleted
 * @property {'static-json' | 'local-override' | 'local-custom'} source
 * @property {Record<string, unknown>} unknownFields
 */

/**
 * @typedef {Object} NormalizedMemoryState
 * @property {NormalizedMemoryRecord[]} memories
 * @property {boolean} hasBaseDataset
 * @property {number} deletedMemoryCount
 * @property {number} overriddenMemoryCount
 * @property {number} customMemoryCount
 */

export function createLegacyBridgeConfig(env = readRuntimeEnv()) {
  return {
    enabled: env.VITE_ENABLE_LEGACY_LOCAL_BRIDGE === 'true',
    baseUrl: toTrimmedString(env.VITE_LEGACY_LOCAL_BASE_URL),
    mode: getRuntimeMode(env),
  }
}

function inferMediaKind(record) {
  if (normalizeBoolean(record?.isVideo, false)) return 'video'

  const mediaPath = toTrimmedString(record?.media).toLowerCase()
  if (/\.(mp4|mov|webm|m4v)$/.test(mediaPath)) return 'video'
  if (/\.(jpg|jpeg|png|gif|webp|avif)$/.test(mediaPath)) return 'image'
  if (mediaPath) return 'unknown'
  return 'unknown'
}

function normalizeMemoryTags(value) {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    const normalized = toTrimmedString(entry)
    return normalized ? [normalized] : []
  })
}

function normalizeMemoryRecord(rawRecord, index, source) {
  const record = isPlainObject(rawRecord) ? rawRecord : {}

  return {
    id: toTrimmedString(record.id) || `legacy-memory-${index + 1}`,
    title: toTrimmedString(record.title),
    description: toTrimmedString(record.description),
    dateLabel: toTrimmedString(record.date) || null,
    tags: normalizeMemoryTags(record.tags),
    mediaKind: inferMediaKind(record),
    mediaPath: toTrimmedString(record.media) || null,
    isSpecialPage: normalizeBoolean(record.isSpecialPage, false),
    pageUrl: toTrimmedString(record.pageUrl) || null,
    isDeleted: false,
    source,
    unknownFields: pickObjectEntries(record, [
      'id',
      'title',
      'description',
      'date',
      'media',
      'isVideo',
      'tags',
      'isSpecialPage',
      'pageUrl',
    ]),
  }
}

export function normalizeLegacyMemoryPayload(payload, options = {}) {
  const warnings = options.warnings || []

  if (!Array.isArray(payload)) {
    warnings.push('Legacy memory payload was not an array.')
    return { status: 'invalid', memories: [] }
  }

  return {
    status: payload.length ? 'ready' : 'empty',
    memories: payload.map((entry, index) => normalizeMemoryRecord(entry, index, 'static-json')),
  }
}

function readMemoryOverlayState(storage, warnings) {
  const customResult = parseStoredJson(readStorageValue(storage, CUSTOM_MEMORIES_KEY, warnings), CUSTOM_MEMORIES_KEY, warnings)
  const deletedResult = parseStoredJson(readStorageValue(storage, DELETED_MEMORIES_KEY, warnings), DELETED_MEMORIES_KEY, warnings)
  const overriddenResult = parseStoredJson(
    readStorageValue(storage, OVERRIDDEN_MEMORIES_KEY, warnings),
    OVERRIDDEN_MEMORIES_KEY,
    warnings,
  )

  return {
    customMemories:
      customResult.ok && Array.isArray(customResult.value)
        ? customResult.value.map((entry, index) => normalizeMemoryRecord(entry, index, 'local-custom'))
        : [],
    deletedIds:
      deletedResult.ok && Array.isArray(deletedResult.value)
        ? deletedResult.value.flatMap((entry) => {
            const normalized = toTrimmedString(entry)
            return normalized ? [normalized] : []
          })
        : [],
    overrides: overriddenResult.ok && isPlainObject(overriddenResult.value) ? overriddenResult.value : {},
    hadMalformedState:
      (!customResult.missing && !customResult.ok) ||
      (!deletedResult.missing && !deletedResult.ok) ||
      (!overriddenResult.missing && !overriddenResult.ok),
  }
}

function buildMemoryState(memories, overlayState, hasBaseDataset) {
  return {
    memories,
    hasBaseDataset,
    deletedMemoryCount: overlayState.deletedIds.length,
    overriddenMemoryCount: Object.keys(overlayState.overrides).length,
    customMemoryCount: overlayState.customMemories.length,
  }
}

function resolveBridgeEndpoint(baseUrl) {
  if (!baseUrl) return null
  const parsedUrl = resolveUrl(baseUrl)
  if (!parsedUrl || !isLocalHostname(parsedUrl.hostname)) {
    return null
  }

  return new URL('/core/memories.json', parsedUrl).toString()
}

export async function readLegacyMemories(options = {}) {
  const warnings = []
  const storage = resolveStorage(options.storage)
  const overlayState = storage
    ? readMemoryOverlayState(storage, warnings)
    : { customMemories: [], deletedIds: [], overrides: {}, hadMalformedState: false }

  const bridgeConfig = options.bridgeConfig || createLegacyBridgeConfig(options.env)
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const runtimeLocation = options.location || (typeof window !== 'undefined' ? window.location : null)
  const hasOverlayMemories = overlayState.customMemories.length > 0

  if (!bridgeConfig.enabled) {
    return createCompatibilityResult({
      status: hasOverlayMemories ? 'ready' : 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: hasOverlayMemories ? buildMemoryState(overlayState.customMemories, overlayState, false) : null,
      warnings: [...warnings, 'Legacy local memory bridge is disabled.'],
    })
  }

  if (bridgeConfig.mode === 'production') {
    return createCompatibilityResult({
      status: hasOverlayMemories ? 'ready' : 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: hasOverlayMemories ? buildMemoryState(overlayState.customMemories, overlayState, false) : null,
      warnings: [...warnings, 'Legacy local memory bridge is blocked in production mode.'],
    })
  }

  if (!isLocalOrigin(runtimeLocation)) {
    return createCompatibilityResult({
      status: hasOverlayMemories ? 'ready' : 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: hasOverlayMemories ? buildMemoryState(overlayState.customMemories, overlayState, false) : null,
      warnings: [...warnings, 'Legacy local memory bridge is allowed only from localhost or 127.0.0.1.'],
    })
  }

  const endpoint = resolveBridgeEndpoint(bridgeConfig.baseUrl)
  if (!endpoint) {
    return createCompatibilityResult({
      status: hasOverlayMemories ? 'ready' : 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: hasOverlayMemories ? buildMemoryState(overlayState.customMemories, overlayState, false) : null,
      warnings: [...warnings, 'Legacy local memory bridge rejected a non-local base URL.'],
    })
  }

  if (typeof fetchImpl !== 'function') {
    return createCompatibilityResult({
      status: hasOverlayMemories ? 'ready' : 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: hasOverlayMemories ? buildMemoryState(overlayState.customMemories, overlayState, false) : null,
      warnings: [...warnings, 'Fetch is unavailable for the legacy local memory bridge.'],
    })
  }

  try {
    const response = await fetchImpl(endpoint, { method: 'GET' })
    if (!response?.ok) {
      return createCompatibilityResult({
        status: hasOverlayMemories ? 'ready' : 'unavailable',
        source: LEGACY_LOCAL_DEV_SOURCE,
        data: hasOverlayMemories ? buildMemoryState(overlayState.customMemories, overlayState, false) : null,
        warnings: [...warnings, `Legacy local memory bridge returned ${response?.status || 'an unavailable response'}.`],
      })
    }

    const payload = await response.json()
    const normalizedPayload = normalizeLegacyMemoryPayload(payload, { warnings })
    const mergedMemories = mergeLegacyMemorySources({
      baseMemories: normalizedPayload.memories,
      customMemories: overlayState.customMemories,
      deletedIds: overlayState.deletedIds,
      overrides: overlayState.overrides,
    })
    const status =
      normalizedPayload.status === 'invalid' || overlayState.hadMalformedState
        ? 'invalid'
        : mergedMemories.length
          ? 'ready'
          : 'empty'

    return createCompatibilityResult({
      status,
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: buildMemoryState(mergedMemories, overlayState, true),
      warnings,
    })
  } catch (error) {
    return createCompatibilityResult({
      status: hasOverlayMemories ? 'ready' : 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: hasOverlayMemories ? buildMemoryState(overlayState.customMemories, overlayState, false) : null,
      warnings: [...warnings, `Legacy local memory bridge failed closed: ${error?.message || 'unknown error'}`],
    })
  }
}
