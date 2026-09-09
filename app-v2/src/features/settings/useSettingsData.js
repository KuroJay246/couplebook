import { useAuth } from '../../auth/useAuth.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { buildSettingsReadModel } from './settingsReadModel.js'
import { useSettingsSource } from './useSettingsSource.js'
import { toUserFacingError } from '../../services/userFacingError.js'

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.every((state) => state === 'empty')) return 'empty'
  return 'ready'
}

export function useSettingsData() {
  const { approvedUser, user } = useAuth()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()
  const { error: settingsError, refresh: refreshSettings, source: settingsSource, state: settingsState } = useSettingsSource()

  return {
    model: buildSettingsReadModel({
      approvedUser,
      authUser: user,
      profileSource,
      settingsSource,
    }),
    compatibilityError: profileError || settingsError ? toUserFacingError(profileError || settingsError, 'We could not load Settings right now. Try again.') : null,
    compatibilityState: combineState([profileState, settingsState]),
    refreshCompatibility: () => {
      refreshProfile()
      refreshSettings()
    },
  }
}
