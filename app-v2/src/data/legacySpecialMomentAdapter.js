import {
  LEGACY_LOCAL_DEV_SOURCE,
  createCompatibilityResult,
  getRuntimeMode,
  isLocalHostname,
  isLocalOrigin,
  isPlainObject,
  normalizeStringArray,
  readRuntimeEnv,
  resolveUrl,
  toTrimmedString,
} from './adapterUtils.js'

export const SPECIAL_MOMENT_KEYS = Object.freeze(['birthday', 'valentine', 'confession'])

const ALLOWED_SECTION_KINDS = new Set(['paragraph', 'quote', 'list', 'note', 'timeline'])
const FORBIDDEN_TEXT_PATTERN = /<\s*\/?\s*(script|style|iframe|object|embed|img|video|audio|source|link|meta)\b|on[a-z]+\s*=|javascript:/i
const PRIVATE_PATH_PATTERN = /[A-Z]:\\|file:\/\/|\\Users\\|\/Users\/|OUR MEMORIES|assets\/(?:photos|videos)/i

export function isSpecialMomentKey(value) {
  return SPECIAL_MOMENT_KEYS.includes(toTrimmedString(value).toLowerCase())
}

export function createSpecialMomentBridgeConfig(env = readRuntimeEnv()) {
  return {
    enabled: env.VITE_ENABLE_LEGACY_LOCAL_BRIDGE === 'true',
    baseUrl: toTrimmedString(env.VITE_LEGACY_LOCAL_BASE_URL),
    mode: getRuntimeMode(env),
  }
}

function createEmptyContent(momentKey, status, warnings = []) {
  return {
    status,
    content: null,
    media: {
      status: 'unavailable',
      type: null,
      note: 'Companion media remains private and is not rendered in this build.',
    },
    sourceStatus: {
      source: LEGACY_LOCAL_DEV_SOURCE,
      connection: status,
      warningCount: warnings.length,
      runtimeOnly: true,
    },
    privacy: {
      runtimeOnly: true,
      privateContentBundled: false,
    },
  }
}

function rejectUnsafeText(value, warnings, context) {
  const text = toTrimmedString(value)
  if (!text) return ''

  if (FORBIDDEN_TEXT_PATTERN.test(text)) {
    warnings.push(`${context} contained unsafe markup and was withheld.`)
    return ''
  }

  if (PRIVATE_PATH_PATTERN.test(text)) {
    warnings.push(`${context} contained private media metadata and was redacted.`)
    return ''
  }

  return text
}

function normalizeSection(rawSection, index, warnings) {
  if (!isPlainObject(rawSection)) {
    warnings.push('A special-moment section was not an object and was quarantined.')
    return null
  }

  const requestedKind = toTrimmedString(rawSection.kind).toLowerCase()
  const kind = ALLOWED_SECTION_KINDS.has(requestedKind) ? requestedKind : ''
  if (!kind) {
    warnings.push('A special-moment section used an unknown kind and was quarantined.')
    return null
  }

  const heading = rejectUnsafeText(rawSection.heading, warnings, 'Section heading')
  const content = rejectUnsafeText(rawSection.content, warnings, 'Section content')
  const items = normalizeStringArray(rawSection.items).flatMap((item) => {
    const safeItem = rejectUnsafeText(item, warnings, 'Section item')
    return safeItem ? [safeItem] : []
  })

  if (!heading && !content && items.length === 0) {
    warnings.push('An empty special-moment section was omitted.')
    return null
  }

  if ((kind === 'list' || kind === 'timeline') && items.length === 0) {
    warnings.push('A list-like special-moment section had no safe items and was omitted.')
    return null
  }

  return {
    id: rejectUnsafeText(rawSection.id, warnings, 'Section id') || `section-${index + 1}`,
    kind,
    heading,
    content,
    items,
  }
}

function normalizeMedia(rawMedia, warnings) {
  if (!isPlainObject(rawMedia)) {
    return {
      status: 'none',
      type: null,
      note: 'No companion media is connected for this route.',
    }
  }

  const status = toTrimmedString(rawMedia.status).toLowerCase()
  const normalizedStatus = ['none', 'private-legacy-reference', 'unavailable'].includes(status) ? status : 'unavailable'
  const type = toTrimmedString(rawMedia.type).toLowerCase()
  const normalizedType = ['image', 'video', 'audio'].includes(type) ? type : null
  const note =
    rejectUnsafeText(rawMedia.note, warnings, 'Media note') ||
    (normalizedStatus === 'private-legacy-reference'
      ? 'Companion media remains private in the legacy book.'
      : normalizedStatus === 'none'
        ? 'No companion media is connected for this route.'
        : 'Companion media is unavailable in this build.')

  return {
    status: normalizedStatus,
    type: normalizedStatus === 'none' ? null : normalizedType,
    note,
  }
}

export function normalizeSpecialMomentPayload(momentKey, payload, options = {}) {
  const normalizedKey = toTrimmedString(momentKey).toLowerCase()
  const warnings = Array.isArray(options.warnings) ? [...options.warnings] : []

  if (!isSpecialMomentKey(normalizedKey)) {
    return createCompatibilityResult({
      status: 'invalid',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey || 'unknown', 'invalid', ['Special moment type is not approved.']),
      warnings: ['Special moment type is not approved.'],
    })
  }

  if (!isPlainObject(payload)) {
    const unavailable = createEmptyContent(normalizedKey, 'unavailable', ['Special moment payload was unavailable.'])
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: unavailable,
      warnings: unavailable.sourceStatus.warningCount ? ['Special moment payload was unavailable.'] : [],
    })
  }

  const rawMoment = isPlainObject(payload.moment) ? payload.moment : payload
  const rawSections = Array.isArray(rawMoment.sections) ? rawMoment.sections : []
  const sections = rawSections.flatMap((section, index) => {
    const normalizedSection = normalizeSection(section, index, warnings)
    return normalizedSection ? [normalizedSection] : []
  })
  const type = toTrimmedString(rawMoment.type).toLowerCase() || normalizedKey

  if (type !== normalizedKey || !isSpecialMomentKey(type)) {
    warnings.push('Special moment payload type did not match the requested route.')
    return createCompatibilityResult({
      status: 'invalid',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey, 'invalid', warnings),
      warnings,
    })
  }

  const title = rejectUnsafeText(rawMoment.title, warnings, 'Special moment title')
  const subtitle = rejectUnsafeText(rawMoment.subtitle, warnings, 'Special moment subtitle')
  const date = rejectUnsafeText(rawMoment.date, warnings, 'Special moment date')
  const media = normalizeMedia(payload.media, warnings)
  const hasUnsafeInput = warnings.length > 0
  const hasContent = Boolean(title || subtitle || date || sections.length > 0)
  const status = hasUnsafeInput ? (hasContent ? 'partial' : 'invalid') : hasContent ? 'ready' : 'empty'

  return createCompatibilityResult({
    status,
    source: LEGACY_LOCAL_DEV_SOURCE,
    data: {
      status,
      content: hasContent
        ? {
            type: normalizedKey,
            title,
            subtitle,
            date,
            sections,
          }
        : null,
      media,
      sourceStatus: {
        source: LEGACY_LOCAL_DEV_SOURCE,
        connection: status,
        warningCount: warnings.length,
        runtimeOnly: true,
      },
      privacy: {
        runtimeOnly: true,
        privateContentBundled: false,
      },
    },
    warnings,
  })
}

function resolveSpecialMomentEndpoint(baseUrl, momentKey) {
  if (!isSpecialMomentKey(momentKey) || !baseUrl) return null
  const parsedUrl = resolveUrl(baseUrl)
  if (!parsedUrl || !isLocalHostname(parsedUrl.hostname)) {
    return null
  }

  return new URL(`/api/special-moment/${momentKey}`, parsedUrl).toString()
}

export async function readLegacySpecialMoment(momentKey, options = {}) {
  const normalizedKey = toTrimmedString(momentKey).toLowerCase()
  const bridgeConfig = options.bridgeConfig || createSpecialMomentBridgeConfig(options.env)
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const runtimeLocation = options.location || (typeof window !== 'undefined' ? window.location : null)

  if (!isSpecialMomentKey(normalizedKey)) {
    return normalizeSpecialMomentPayload(normalizedKey, null, {
      warnings: ['Special moment type is not approved.'],
    })
  }

  if (!bridgeConfig.enabled) {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey, 'unavailable', ['Special moment local bridge is disabled.']),
      warnings: ['Special moment local bridge is disabled.'],
    })
  }

  if (bridgeConfig.mode === 'production') {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey, 'unavailable', ['Special moment local bridge is blocked in production mode.']),
      warnings: ['Special moment local bridge is blocked in production mode.'],
    })
  }

  if (!isLocalOrigin(runtimeLocation)) {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey, 'unavailable', ['Special moment local bridge is allowed only from localhost or 127.0.0.1.']),
      warnings: ['Special moment local bridge is allowed only from localhost or 127.0.0.1.'],
    })
  }

  const endpoint = resolveSpecialMomentEndpoint(bridgeConfig.baseUrl, normalizedKey)
  if (!endpoint) {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey, 'unavailable', ['Special moment local bridge rejected a non-local or unknown endpoint.']),
      warnings: ['Special moment local bridge rejected a non-local or unknown endpoint.'],
    })
  }

  if (typeof fetchImpl !== 'function') {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey, 'unavailable', ['Fetch is unavailable for the special moment local bridge.']),
      warnings: ['Fetch is unavailable for the special moment local bridge.'],
    })
  }

  try {
    const response = await fetchImpl(endpoint, { method: 'GET' })
    if (!response?.ok) {
      return createCompatibilityResult({
        status: 'unavailable',
        source: LEGACY_LOCAL_DEV_SOURCE,
        data: createEmptyContent(normalizedKey, 'unavailable', ['Special moment local bridge returned an unavailable response.']),
        warnings: ['Special moment local bridge returned an unavailable response.'],
      })
    }

    const payload = await response.json()
    return normalizeSpecialMomentPayload(normalizedKey, payload)
  } catch {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_DEV_SOURCE,
      data: createEmptyContent(normalizedKey, 'unavailable', ['Special moment local bridge failed closed.']),
      warnings: ['Special moment local bridge failed closed.'],
    })
  }
}
