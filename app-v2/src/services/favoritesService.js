import { FIRESTORE_SOURCE, createCompatibilityResult, normalizePersonKey } from '../data/adapterUtils.js'
import { DATA_SOURCE_MODES, resolveDataSourceMode } from '../data/dataSourceMode.js'
import { readLegacyFavorites } from '../data/legacyFavoritesAdapter.js'
import { db } from '../lib/firebase.js'
import { couplePath, favoritesPath, pathToString } from './firestorePaths.js'
import { readCollection, requireSchemaVersion, safeStringArray } from './firestoreReaders.js'
import { getFirestoreProfilesForCouple } from './profileService.js'

export function buildFavoritesDocumentPath(coupleId, uid) {
  return pathToString(favoritesPath(coupleId, uid))
}

export async function getLegacyFavorites(options = {}) {
  const read = options.readLegacyFavorites || readLegacyFavorites
  return read(options)
}

export async function getFirestoreFavoritesByUid() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Firestore favorites reads remain deferred until the user-document field contract is migrated intentionally.'],
  })
}

const FAVORITE_CATEGORIES = ['food', 'songs', 'movies', 'places', 'memories', 'notes']

export function normalizeFirestoreFavorites(uid, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  const favorites = {}
  for (const category of FAVORITE_CATEGORIES) {
    favorites[category] = safeStringArray(data[category], 50, 120)
  }
  return {
    uid,
    favorites,
    revision: Number.isInteger(data.revision) && data.revision > 0 ? data.revision : 0,
    schemaVersion: data.schemaVersion,
  }
}

export async function getFirestoreFavoritesForCouple(coupleId, options = {}) {
  return readCollection({
    firestore: options.firestore || db,
    path: [...couplePath(coupleId), 'favorites'],
    getCollection: options.getCollection,
    normalizeEntry: normalizeFirestoreFavorites,
  })
}

function getApprovedUserCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

function normalizeOwnerLabel(entry, fallback) {
  return normalizePersonKey(entry?.name || entry?.displayName || fallback)
}

export function firestoreFavoritesToCompatibility(result, profiles) {
  if (result.status !== 'ready' && result.status !== 'partial') return result
  const profileEntries = profiles?.data?.entries || []
  const labelByUid = new Map(profileEntries.map((entry) => [entry.uid, normalizeOwnerLabel(entry, entry.uid)]))
  const favoritesByOwner = {}
  const participantOrder = []
  for (const entry of result.data?.entries || []) {
    const owner = labelByUid.get(entry.uid) || normalizePersonKey(entry.uid)
    participantOrder.push(owner)
    favoritesByOwner[owner] = {
      revision: Number.isInteger(entry.revision) && entry.revision > 0 ? entry.revision : 0,
      categories: {
        food: entry.favorites?.food || [],
        songs: entry.favorites?.songs || [],
        movies: entry.favorites?.movies || [],
        places: entry.favorites?.places || [],
        memories: entry.favorites?.memories || [],
        notes: entry.favorites?.notes || [],
      },
      unknownCategories: {},
    }
  }
  return createCompatibilityResult({
    status: participantOrder.length ? result.status : 'empty',
    source: FIRESTORE_SOURCE,
    data: { favoritesByOwner, participantOrder, unknownTopLevelFields: {} },
    warnings: result.warnings,
  })
}

export async function getFavoritesSourceForApprovedUser(options = {}) {
  const approvedUser = options.approvedUser || null
  const sourceMode = options.sourceMode || resolveDataSourceMode(options.env)
  const coupleId = options.coupleId || getApprovedUserCoupleId(approvedUser)

  if (sourceMode === DATA_SOURCE_MODES.firestore) {
    if (!coupleId) {
      return createCompatibilityResult({
        status: 'unavailable',
        source: FIRESTORE_SOURCE,
        warnings: ['Firestore favorites reads require an approved couple membership.'],
      })
    }

    const serviceOptions = { firestore: options.firestore, getCollection: options.getCollection }
    const [favorites, profiles] = await Promise.all([
      getFirestoreFavoritesForCouple(coupleId, serviceOptions),
      getFirestoreProfilesForCouple(coupleId, serviceOptions),
    ])
    return firestoreFavoritesToCompatibility(favorites, profiles)
  }

  return getLegacyFavorites(options)
}
