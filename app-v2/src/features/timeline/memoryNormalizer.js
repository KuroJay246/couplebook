import { freezeClone, isPlainObject, normalizeBoolean, toTrimmedString } from '../../data/adapterUtils.js'

const GENERATED_PHOTO_TITLE = /^Photo from\b/i
const GENERATED_VIDEO_TITLE = /^(Video Clip|Video from)\b/i
const GENERATED_ARCHIVE_DESCRIPTION = /^(A beautiful shared moment captured on|A video memory recorded on)\b/i
const AUTO_IMPORT_DESCRIPTION = /^Auto-imported from your (videos|photos) folder\.?$/i
const LOCAL_FILE_PATH = /^(?:[a-zA-Z]:\\|\\\\|file:\/\/)/i
const LEGACY_ASSET_PATH = /^(?:\/assets\/|assets\/|\.\.\/assets\/|\.\/assets\/)/i

export const legacySpecialMomentRoutes = Object.freeze({
  'confession/index.html': '/confession',
  'valentine/index.html': '/valentine',
  'omnia-happy-birthday.html': '/birthday',
})

function normalizeTagEntries(value) {
  if (!Array.isArray(value)) return []

  const seen = new Set()
  const tags = []

  for (const entry of value) {
    const label = toTrimmedString(entry)
    if (!label) continue

    const key = label.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    tags.push(
      Object.freeze({
        key,
        label,
      }),
    )
  }

  return tags
}

function normalizeDateValue(rawValue) {
  const original = toTrimmedString(rawValue)
  if (!original) {
    return {
      original: null,
      status: 'missing',
      precision: 'none',
      timestamp: null,
      year: null,
      month: null,
      day: null,
    }
  }

  const dateOnlyMatch = original.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const month = Number(dateOnlyMatch[2])
    const day = Number(dateOnlyMatch[3])
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      return {
        original,
        status: 'invalid',
        precision: 'invalid',
        timestamp: null,
        year: null,
        month: null,
        day: null,
      }
    }

    return {
      original,
      status: 'valid',
      precision: 'date-only',
      timestamp: date.getTime(),
      year,
      month,
      day,
    }
  }

  const timestamp = Date.parse(original)
  if (Number.isNaN(timestamp)) {
    return {
      original,
      status: 'invalid',
      precision: 'invalid',
      timestamp: null,
      year: null,
      month: null,
      day: null,
    }
  }

  const date = new Date(timestamp)
  return {
    original,
    status: 'valid',
    precision: 'date-time',
    timestamp,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function classifyTitleKind(title) {
  if (!title) return 'missing'
  if (GENERATED_PHOTO_TITLE.test(title)) return 'generated-photo'
  if (GENERATED_VIDEO_TITLE.test(title)) return 'generated-video'
  return 'authored'
}

function classifyDescriptionKind(description) {
  if (!description) return 'missing'
  if (GENERATED_ARCHIVE_DESCRIPTION.test(description) || AUTO_IMPORT_DESCRIPTION.test(description)) {
    return 'generated-archive'
  }

  return 'authored'
}

function normalizeSpecialMoment(record, warnings) {
  const isSpecial = normalizeBoolean(record?.isSpecialPage, false)
  const pageUrl = toTrimmedString(record?.pageUrl)

  if (!isSpecial && !pageUrl) {
    return {
      isSpecial: false,
      route: null,
      routeStatus: 'none',
    }
  }

  if (!isSpecial && pageUrl) {
    warnings.push('A non-special legacy memory carried a page route and was quarantined from routed navigation.')
    return {
      isSpecial: false,
      route: null,
      routeStatus: 'unverified',
    }
  }

  if (!pageUrl) {
    warnings.push('A special memory was missing its legacy route reference.')
    return {
      isSpecial: true,
      route: null,
      routeStatus: 'missing',
    }
  }

  const route = legacySpecialMomentRoutes[pageUrl] || null
  if (!route) {
    warnings.push('A special memory used an unverified legacy route and was quarantined from navigation.')
    return {
      isSpecial: true,
      route: null,
      routeStatus: 'unverified',
    }
  }

  return {
    isSpecial: true,
    route,
    routeStatus: 'verified',
  }
}

function normalizeMediaReference(record, specialMoment) {
  if (record?.media && typeof record.media === 'object') {
    const kind = toTrimmedString(record.media.kind)
    const storagePath = toTrimmedString(record.media.storagePath)
    const thumbnailPath = toTrimmedString(record.media.thumbnailPath)
    const posterPath = toTrimmedString(record.media.posterPath)
    if ((kind === 'image' || kind === 'video') && /^couples\/[A-Za-z0-9_-]{1,120}\/media\/[A-Za-z0-9_-]{1,120}\/(original|thumbnail|poster)$/.test(storagePath)) {
      return {
        status: 'storage-verified',
        kind,
        hasReference: true,
        isAvailableInApp: true,
        displayUrl: null,
        storagePath,
        thumbnailPath,
        posterPath,
        contentType: toTrimmedString(record.media.contentType),
        sizeBytes: Number.isSafeInteger(record.media.sizeBytes) ? record.media.sizeBytes : 0,
      }
    }
  }

  const mediaPath = toTrimmedString(record?.mediaPath)
  const mediaKind = toTrimmedString(record?.mediaKind) || 'unknown'

  if (!mediaPath) {
    return {
      status: specialMoment.isSpecial ? 'special-route-only' : 'none',
      kind: 'none',
      hasReference: false,
      isAvailableInApp: false,
      displayUrl: null,
    }
  }

  if (LOCAL_FILE_PATH.test(mediaPath) || mediaPath.includes('\\')) {
    return {
      status: 'invalid-reference',
      kind: mediaKind,
      hasReference: true,
      isAvailableInApp: false,
      displayUrl: null,
    }
  }

  if (LEGACY_ASSET_PATH.test(mediaPath)) {
    return {
      status: 'private-legacy-reference',
      kind: mediaKind,
      hasReference: true,
      isAvailableInApp: false,
      displayUrl: null,
    }
  }

  if (/^https?:\/\//i.test(mediaPath)) {
    return {
      status: 'invalid-reference',
      kind: mediaKind,
      hasReference: true,
      isAvailableInApp: false,
      displayUrl: null,
    }
  }

  return {
    status: 'invalid-reference',
    kind: mediaKind,
    hasReference: true,
    isAvailableInApp: false,
    displayUrl: null,
  }
}

export function normalizeTimelineMemory(record, options = {}) {
  const warnings = []
  const index = Number.isInteger(options.index) ? options.index : 0
  const id = toTrimmedString(record?.id) || `timeline-memory-${index + 1}`
  const title = toTrimmedString(record?.title)
  const description = toTrimmedString(record?.description)
  const specialMoment = normalizeSpecialMoment(record, warnings)
  const normalized = {
    id,
    title,
    description,
    titleKind: classifyTitleKind(title),
    descriptionKind: classifyDescriptionKind(description),
    date: normalizeDateValue(record?.dateLabel),
    tags: normalizeTagEntries(record?.tags),
    media: normalizeMediaReference(record, specialMoment),
    specialMoment,
    source: {
      type: toTrimmedString(record?.source) || 'unknown',
      isImported:
        classifyTitleKind(title) !== 'authored' ||
        classifyDescriptionKind(description) !== 'authored' ||
        /^autoscan_/i.test(id) ||
        normalizeTagEntries(record?.tags).some((tag) => tag.key === 'auto-import'),
      isCustom: toTrimmedString(record?.source) === 'local-custom',
      isOverridden: toTrimmedString(record?.source) === 'local-override',
      hasUnknownFields: isPlainObject(record?.unknownFields) && Object.keys(record.unknownFields).length > 0,
    },
    warnings,
    sort: {
      ordinal: Number.isInteger(record?.sortOrdinal) ? record.sortOrdinal : index,
      timestamp: normalizeDateValue(record?.dateLabel).timestamp,
    },
  }

  return freezeClone(normalized)
}

export function normalizeTimelineMemories(records = []) {
  const normalized = (Array.isArray(records) ? records : []).map((record, index) =>
    normalizeTimelineMemory(record, { index }),
  )

  return Object.freeze(normalized)
}
