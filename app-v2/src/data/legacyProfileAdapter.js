import {
  LEGACY_LOCAL_STORAGE_SOURCE,
  createCompatibilityResult,
  isPlainObject,
  normalizePersonKey,
  parseStoredJson,
  pickObjectEntries,
  readStorageValue,
  resolveStorage,
  toTrimmedString,
} from './adapterUtils.js'

const STORAGE_KEY = 'memorybook_profiles'

/**
 * @typedef {Object} NormalizedLegacyProfile
 * @property {string} name
 * @property {string} bio
 * @property {string} avatar
 * @property {string | null} anniversaryView
 * @property {string | null} joinedDate
 * @property {string | null} birthday
 * @property {Record<string, unknown>} unknownFields
 */

/**
 * @typedef {Object} NormalizedProfileState
 * @property {Record<string, NormalizedLegacyProfile>} profilesByUsername
 * @property {string[]} participantOrder
 * @property {Record<string, unknown>} unknownTopLevelFields
 */

function createEmptyProfileState() {
  return {
    profilesByUsername: {},
    participantOrder: [],
    unknownTopLevelFields: {},
  }
}

function normalizeProfileRecord(rawProfile) {
  if (!isPlainObject(rawProfile)) {
    return {
      name: '',
      bio: '',
      avatar: '',
      anniversaryView: null,
      joinedDate: null,
      birthday: null,
      unknownFields: {},
    }
  }

  return {
    name: toTrimmedString(rawProfile.name),
    bio: toTrimmedString(rawProfile.bio),
    avatar: toTrimmedString(rawProfile.avatar),
    anniversaryView: toTrimmedString(rawProfile.anniversaryView) || null,
    joinedDate: toTrimmedString(rawProfile.joinedDate) || null,
    birthday: toTrimmedString(rawProfile.birthday) || null,
    unknownFields: pickObjectEntries(rawProfile, ['name', 'bio', 'avatar', 'anniversaryView', 'joinedDate', 'birthday']),
  }
}

export async function readLegacyProfiles(options = {}) {
  const warnings = []
  const storage = resolveStorage(options.storage)

  if (!storage) {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      warnings: ['Browser storage is unavailable for legacy profiles.'],
    })
  }

  const parsed = parseStoredJson(readStorageValue(storage, STORAGE_KEY, warnings), STORAGE_KEY, warnings)
  if (parsed.missing) {
    return createCompatibilityResult({
      status: 'empty',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      data: createEmptyProfileState(),
      warnings,
    })
  }

  if (!parsed.ok || !isPlainObject(parsed.value)) {
    return createCompatibilityResult({
      status: 'invalid',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      data: createEmptyProfileState(),
      warnings,
    })
  }

  const profilesByUsername = {}
  const participantOrder = []
  const unknownTopLevelFields = {}

  for (const [key, value] of Object.entries(parsed.value)) {
    if (isPlainObject(value)) {
      const normalizedKey = normalizePersonKey(key)
      profilesByUsername[normalizedKey] = normalizeProfileRecord(value)
      participantOrder.push(normalizedKey)
    } else {
      unknownTopLevelFields[key] = value
    }
  }

  return createCompatibilityResult({
    status: Object.keys(profilesByUsername).length ? 'ready' : 'empty',
    source: LEGACY_LOCAL_STORAGE_SOURCE,
    data: {
      profilesByUsername,
      participantOrder,
      unknownTopLevelFields,
    },
    warnings,
  })
}
