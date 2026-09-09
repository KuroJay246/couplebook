import { useAuth } from '../../auth/useAuth.js'
import { useContractSource } from '../contract/useContractSource.js'
import { useFavoritesSource } from '../favorites/useFavoritesSource.js'
import { buildProfileReadModel } from './profileReadModel.js'
import { useProfileSource } from './useProfileSource.js'

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.every((state) => state === 'empty')) return 'empty'
  return 'ready'
}

export function useProfileData() {
  const { approvedUser } = useAuth()
  const { error: contractError, refresh: refreshContract, source: contractSource, state: contractState } = useContractSource()
  const { error: favoritesError, refresh: refreshFavorites, source: favoritesSource, state: favoritesState } = useFavoritesSource()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()

  return {
    model: buildProfileReadModel({
      approvedUser,
      contractSource,
      favoritesSource,
      profileSource,
    }),
    compatibilityError: contractError || favoritesError || profileError,
    compatibilityState: combineState([contractState, favoritesState, profileState]),
    refreshCompatibility: () => {
      refreshContract()
      refreshFavorites()
      refreshProfile()
    },
  }
}
