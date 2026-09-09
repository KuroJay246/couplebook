import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
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
  const { error, refresh, snapshot, state } = useCompatibilityData()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()

  return {
    model: buildProfileReadModel({
      approvedUser,
      compatibilitySnapshot: snapshot,
      profileSource,
    }),
    compatibilityError: error || profileError,
    compatibilityState: combineState([state, profileState]),
    refreshCompatibility: () => {
      refresh()
      refreshProfile()
    },
  }
}
