import { readLegacyContractState } from '../../data/legacyContractAdapter.js'
import { readLegacyFavorites } from '../../data/legacyFavoritesAdapter.js'
import { readLegacyMemories } from '../../data/legacyMemoryAdapter.js'
import { readLegacyProfiles } from '../../data/legacyProfileAdapter.js'
import { readLegacySettings } from '../../data/legacySettingsAdapter.js'

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
  const username = options.username
  if (!username) {
    return {
      status: 'empty',
      sources: {
        favorites: null,
        profile: null,
        settings: null,
        contract: null,
        memories: null,
      },
      warnings: ['Compatibility data requires an approved username.'],
    }
  }

  const [favorites, profile, settings, contract, memories] = await Promise.all([
    readLegacyFavorites(options),
    readLegacyProfiles(options),
    readLegacySettings(options),
    readLegacyContractState(options),
    readLegacyMemories(options),
  ])

  const sources = { favorites, profile, settings, contract, memories }
  const results = Object.values(sources)

  return Object.freeze({
    status: deriveCompatibilityStatus(results),
    sources,
    warnings: Object.freeze(collectWarnings(results)),
  })
}
