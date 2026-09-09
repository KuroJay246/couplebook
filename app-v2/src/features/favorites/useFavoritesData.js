import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { buildFavoritesReadModel } from './favoritesReadModel.js'

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.includes('ready') || states.includes('partial')) return 'ready'
  return states.find(Boolean) || 'empty'
}

export function useFavoritesData() {
  const { approvedUser } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()

  function refreshAll() {
    refresh()
    refreshProfile()
  }

  return {
    model: buildFavoritesReadModel({
      approvedUser,
      compatibilitySnapshot: snapshot,
      profileSource,
    }),
    compatibilityError: error || profileError,
    compatibilityState: combineState([state, profileState]),
    refreshCompatibility: refreshAll,
  }
}
