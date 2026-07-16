import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildContractReadModel } from './contractReadModel.js'

export function useContractData() {
  const { approvedUser } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildContractReadModel({
      approvedUser,
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
