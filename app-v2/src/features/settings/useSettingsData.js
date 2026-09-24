import { useAuth } from '../../auth/useAuth.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { buildSettingsReadModel } from './settingsReadModel.js'
import { useSettingsSource } from './useSettingsSource.js'
import { toUserFacingError } from '../../services/userFacingError.js'

function hasUsableSettingsData(profileSource, settingsSource) {
  const profileEntries = Array.isArray(profileSource?.data?.entries) ? profileSource.data.entries.length : 0
  const hasSettings = Boolean(settingsSource?.data?.appearanceTheme || settingsSource?.data?.theme || settingsSource?.data?.privacy)
  return profileEntries > 0 || hasSettings
}

function combineState(states, sources) {
  if (hasUsableSettingsData(sources.profileSource, sources.settingsSource)) return 'ready'
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
    compatibilityState: combineState([profileState, settingsState], { profileSource, settingsSource }),
    refreshCompatibility: () => {
      refreshProfile()
      refreshSettings()
    },
  }
}
