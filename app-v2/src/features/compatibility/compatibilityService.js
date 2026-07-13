import { getLegacyContract } from '../../services/contractService.js'
import { getLegacyFavorites } from '../../services/favoritesService.js'
import { getLegacyMemories } from '../../services/memoryService.js'
import { getLegacyProfile } from '../../services/profileService.js'
import { getLegacySettings } from '../../services/settingsService.js'

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
    getLegacyFavorites(options),
    getLegacyProfile(options),
    getLegacySettings(options),
    getLegacyContract(options),
    getLegacyMemories(options),
  ])

  const sources = { favorites, profile, settings, contract, memories }
  const results = Object.values(sources)

  return Object.freeze({
    status: deriveCompatibilityStatus(results),
    sources,
    warnings: Object.freeze(collectWarnings(results)),
  })
}
