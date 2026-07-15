import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildSettingsReadModel } from './settingsReadModel.js'

export function useSettingsData() {
  const { approvedUser, user } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildSettingsReadModel({
      approvedUser,
      authUser: user,
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
