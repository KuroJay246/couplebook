import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildSettingsReadModel } from './settingsReadModel.js'
import { toUserFacingError } from '../../services/userFacingError.js'

export function useSettingsData() {
  const { approvedUser, user } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()

  return {
    model: buildSettingsReadModel({
      approvedUser,
      authUser: user,
      compatibilitySnapshot: snapshot,
    }),
    compatibilityError: error ? toUserFacingError(error, 'We could not load Settings right now. Try again.') : null,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
