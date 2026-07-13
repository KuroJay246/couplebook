import {
  LEGACY_LOCAL_STORAGE_SOURCE,
  createCompatibilityResult,
  isPlainObject,
  normalizePersonKey,
  normalizeStringArray,
  parseStoredJson,
  pickObjectEntries,
  readStorageValue,
  resolveStorage,
} from './adapterUtils.js'

const STORAGE_KEY = 'memorybook_favorites'
const DEFAULT_OWNER_KEYS = ['Jaylan', 'Omia']
const DEFAULT_CATEGORIES = ['food', 'places', 'hobbies', 'activities']

/**
 * @typedef {Object} NormalizedFavoritesOwner
 * @property {{ food: string[], places: string[], hobbies: string[], activities: string[] }} categories
 * @property {Record<string, unknown>} unknownCategories
 */

/**
 * @typedef {Object} NormalizedFavoritesState
 * @property {Record<string, NormalizedFavoritesOwner>} favoritesByOwner
 * @property {string[]} participantOrder
 * @property {Record<string, unknown>} unknownTopLevelFields
 */

export const legacyFavoritesAdapterBoundary = Object.freeze({
  adapter: 'legacyFavoritesAdapter',
  currentSources: ['localStorage: memorybook_favorites', 'Firestore: users/{uid}.favorites'],
  expectedNormalizedOutput:
    'CompatibilityResult<NormalizedFavoritesState> describing the local shared favorites surface without any writes.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before favorites domain service extraction',
})

function createEmptyFavoritesState() {
  return {
    favoritesByOwner: {},
    participantOrder: [],
    unknownTopLevelFields: {},
  }
}

function normalizeOwnerFavorites(rawOwner, warnings, ownerKey) {
  const categories = {
    food: [],
    places: [],
    hobbies: [],
    activities: [],
  }

  const unknownCategories = {}

  if (!isPlainObject(rawOwner)) {
    warnings.push(`Favorites for ${ownerKey} used an unexpected type and were reset to empty categories.`)
    return { categories, unknownCategories }
  }

  for (const category of DEFAULT_CATEGORIES) {
    categories[category] = normalizeStringArray(rawOwner[category])
  }

  for (const [category, value] of Object.entries(rawOwner)) {
    if (!DEFAULT_CATEGORIES.includes(category)) {
      unknownCategories[category] = value
    }
  }

  return { categories, unknownCategories }
}

export async function readLegacyFavorites(options = {}) {
  const warnings = []
  const storage = resolveStorage(options.storage)

  if (!storage) {
    return createCompatibilityResult({
      status: 'unavailable',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      warnings: ['Browser storage is unavailable for legacy favorites.'],
    })
  }

  const parsed = parseStoredJson(readStorageValue(storage, STORAGE_KEY, warnings), STORAGE_KEY, warnings)
  if (parsed.missing) {
    return createCompatibilityResult({
      status: 'empty',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      data: createEmptyFavoritesState(),
      warnings,
    })
  }

  if (!parsed.ok || !isPlainObject(parsed.value)) {
    return createCompatibilityResult({
      status: 'invalid',
      source: LEGACY_LOCAL_STORAGE_SOURCE,
      data: createEmptyFavoritesState(),
      warnings,
    })
  }

  const favoritesByOwner = {}
  const participantOrder = []
  const unknownTopLevelFields = {}

  for (const [ownerKey, ownerValue] of Object.entries(parsed.value)) {
    if (isPlainObject(ownerValue)) {
      const normalizedOwner = normalizePersonKey(ownerKey)
      favoritesByOwner[normalizedOwner] = normalizeOwnerFavorites(ownerValue, warnings, normalizedOwner)
      participantOrder.push(normalizedOwner)
    } else {
      unknownTopLevelFields[ownerKey] = ownerValue
    }
  }

  for (const owner of DEFAULT_OWNER_KEYS) {
    if (!favoritesByOwner[owner]) {
      favoritesByOwner[owner] = normalizeOwnerFavorites({}, warnings, owner)
      if (!participantOrder.includes(owner)) {
        participantOrder.push(owner)
      }
    }
  }

  return createCompatibilityResult({
    status: Object.keys(favoritesByOwner).length ? 'ready' : 'empty',
    source: LEGACY_LOCAL_STORAGE_SOURCE,
    data: {
      favoritesByOwner,
      participantOrder,
      unknownTopLevelFields: pickObjectEntries(unknownTopLevelFields),
    },
    warnings,
  })
}
