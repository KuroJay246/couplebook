import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildProfileReadModel } from './profileReadModel.js'

export function useProfileData() {
  const { approvedUser } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildProfileReadModel({
      approvedUser,
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
