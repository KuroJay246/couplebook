import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyFavorites } from '../data/legacyFavoritesAdapter.js'
import { db } from '../lib/firebaseClient.js'
import { couplePath, favoritesPath, pathToString } from './firestorePaths.js'
import { readCollection, requireSchemaVersion, safeStringArray } from './firestoreReaders.js'

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
