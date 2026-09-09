import { useAuth } from '../../auth/useAuth.js'
import { useContractSource } from '../contract/useContractSource.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { buildFavoritesReadModel } from './favoritesReadModel.js'
import { useFavoritesSource } from './useFavoritesSource.js'

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.includes('ready') || states.includes('partial')) return 'ready'
  return states.find(Boolean) || 'empty'
}

export function useFavoritesData() {
  const { approvedUser } = useAuth()
  const { error, refresh, source: favoritesSource, state } = useFavoritesSource()
  const { error: contractError, refresh: refreshContract, source: contractSource, state: contractState } = useContractSource()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()

  function refreshAll() {
    refresh()
    refreshContract()
    refreshProfile()
  }

  return {
    model: buildFavoritesReadModel({
      approvedUser,
      contractSource,
      favoritesSource,
      profileSource,
    }),
    compatibilityError: error || contractError || profileError,
    compatibilityState: combineState([state, contractState, profileState]),
    refreshCompatibility: refreshAll,
  }
}
