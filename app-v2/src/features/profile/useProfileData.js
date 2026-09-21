import { useAuth } from '../../auth/useAuth.js'
import { useContractSource } from '../contract/useContractSource.js'
import { useFavoritesSource } from '../favorites/useFavoritesSource.js'
import { buildProfileReadModel } from './profileReadModel.js'
import { useProfileSource } from './useProfileSource.js'

function combineState({ contractState, favoritesState, profileState }) {
  if (profileState === 'error') return 'error'
  if (profileState === 'loading') return 'loading'
  if ([contractState, favoritesState].includes('loading') && profileState === 'empty') return 'loading'
  if ([profileState, contractState, favoritesState].every((state) => state === 'empty')) return 'empty'
  return 'ready'
}

function sourceWithWarning(source, error) {
  if (!error) return source
  return {
    ...(source || {}),
    status: 'unavailable',
    warnings: [...new Set([...(Array.isArray(source?.warnings) ? source.warnings : []), error])],
  }
}

export function useProfileData() {
  const { approvedUser } = useAuth()
  const { error: contractError, refresh: refreshContract, source: contractSource, state: contractState } = useContractSource()
  const { error: favoritesError, refresh: refreshFavorites, source: favoritesSource, state: favoritesState } = useFavoritesSource()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()
  const contractSourceForModel = sourceWithWarning(contractSource, contractError)
  const favoritesSourceForModel = sourceWithWarning(favoritesSource, favoritesError)

  return {
    model: buildProfileReadModel({
      approvedUser,
      contractSource: contractSourceForModel,
      favoritesSource: favoritesSourceForModel,
      profileSource,
    }),
    compatibilityError: profileError,
    compatibilityState: combineState({ contractState, favoritesState, profileState }),
    refreshCompatibility: () => {
      refreshContract()
      refreshFavorites()
      refreshProfile()
    },
  }
}
