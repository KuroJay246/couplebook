import { getLegacyContract } from '../../services/contractService.js'
import { getLegacyFavorites } from '../../services/favoritesService.js'
import { DATA_SOURCE_MODES, resolveDataSourceMode } from '../../data/dataSourceMode.js'
import { loadFirestoreCompatibilitySnapshot } from './firestoreCompatibilityService.js'

function collectWarnings(results) {
  return results.flatMap((result) => result.warnings || [])
}

function deriveCompatibilityStatus(results) {
  if (results.some((result) => result.status === 'ready' || result.status === 'invalid')) {
    return 'ready'
  }

  if (results.some((result) => result.status === 'unavailable')) {
    return 'empty'
  }

  return 'empty'
}

export async function loadCompatibilitySnapshot(options = {}) {
  const mode = options.sourceMode || resolveDataSourceMode(options.env)
  if (mode === DATA_SOURCE_MODES.firestore) {
    return loadFirestoreCompatibilitySnapshot(options)
  }

  const username = options.username
  if (!username) {
    return {
      status: 'empty',
      sources: {
        favorites: null,
        contract: null,
      },
      warnings: ['Compatibility data requires an approved username.'],
    }
  }

  const [favorites, contract] = await Promise.all([
    getLegacyFavorites(options),
    getLegacyContract(options),
  ])

  const sources = { favorites, contract }
  const results = Object.values(sources)

  return Object.freeze({
    status: deriveCompatibilityStatus(results),
    sources,
    warnings: Object.freeze(collectWarnings(results)),
  })
}
