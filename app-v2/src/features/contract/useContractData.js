import { useAuth } from '../../auth/useAuth.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { buildContractReadModel } from './contractReadModel.js'
import { useContractSource } from './useContractSource.js'

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.includes('ready') || states.includes('partial')) return 'ready'
  return states.find(Boolean) || 'empty'
}

export function useContractData() {
  const { approvedUser } = useAuth()
  const { error, refresh, source: contractSource, state } = useContractSource()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()

  function refreshAll() {
    refresh()
    refreshProfile()
  }

  return {
    model: buildContractReadModel({
      approvedUser,
      contractSource,
      profileSource,
    }),
    compatibilityError: error || profileError,
    compatibilityState: combineState([state, profileState]),
    refreshCompatibility: refreshAll,
  }
}
