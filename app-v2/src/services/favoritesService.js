import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyFavorites } from '../data/legacyFavoritesAdapter.js'
import { buildUserDocumentPath } from './userService.js'

export function buildFavoritesDocumentPath(uid) {
  return buildUserDocumentPath(uid)
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
