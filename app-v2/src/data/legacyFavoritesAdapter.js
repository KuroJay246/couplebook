/**
 * @typedef {Object} NormalizedFavoritesState
 * @property {Record<string, Record<string, string[]>>} favoritesByOwner
 * @property {string[]} participantOrder
 * @property {'local-storage' | 'firestore' | 'hybrid'} source
 */

export const legacyFavoritesAdapterBoundary = Object.freeze({
  adapter: 'legacyFavoritesAdapter',
  currentSources: [
    'localStorage: memorybook_favorites',
    'Firestore: users/{uid}.favorites',
  ],
  expectedNormalizedOutput:
    'NormalizedFavoritesState describing the shared favorites surface without performing any writes.',
  mode: 'read-only',
  futureOwner: 'R3 compatibility mapping before favorites domain service extraction',
})

/**
 * Read-only compatibility boundary for legacy favorites.
 *
 * The eventual adapter must merge the current local shared projection and the active/partner
 * Firestore favorites docs without broad collection scans, destructive cleanup, or local writes.
 *
 * @returns {Promise<NormalizedFavoritesState>}
 */
export async function readLegacyFavorites() {
  throw new Error('legacyFavoritesAdapter remains a read-only stub until R3 compatibility mapping begins.')
}
