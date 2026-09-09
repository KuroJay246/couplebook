import { useEffect, useState } from 'react'
import { protectedRouteMeta } from '../../app/routeConfig.js'
import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { useMemorySource } from '../memories/useMemorySource.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { useSettingsSource } from '../settings/useSettingsSource.js'
import { buildDashboardReadModel } from './dashboardReadModel.js'

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.every((state) => state === 'empty')) return 'empty'
  return 'ready'
}

export function useDashboardModel() {
  const { approvedUser } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()
  const { error: memoryError, refresh: refreshMemories, source: memorySource, state: memoryState } = useMemorySource()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()
  const { error: settingsError, refresh: refreshSettings, source: settingsSource, state: settingsState } = useSettingsSource()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  return {
    model: buildDashboardReadModel({
      approvedUser,
      compatibilitySnapshot: snapshot,
      memorySource,
      now,
      profileSource,
      routeMeta: protectedRouteMeta,
      settingsSource,
    }),
    compatibilityError: error || memoryError || profileError || settingsError,
    compatibilityState: combineState([state, memoryState, profileState, settingsState]),
    refreshCompatibility: () => {
      refresh()
      refreshMemories()
      refreshProfile()
      refreshSettings()
    },
  }
}
