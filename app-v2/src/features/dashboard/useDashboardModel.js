import { useEffect, useState } from 'react'
import { protectedRouteMeta } from '../../app/routeConfig.js'
import { useAuth } from '../../auth/useAuth.js'
import { useMemorySource } from '../memories/useMemorySource.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { useSettingsSource } from '../settings/useSettingsSource.js'
import { buildDashboardReadModel } from './dashboardReadModel.js'

const MINUTE_MS = 60 * 1000

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.every((state) => state === 'empty')) return 'empty'
  return 'ready'
}

export function useDashboardModel() {
  const { approvedUser } = useAuth()
  const { error: memoryError, refresh: refreshMemories, source: memorySource, state: memoryState } = useMemorySource()
  const { error: profileError, refresh: refreshProfile, source: profileSource, state: profileState } = useProfileSource()
  const { error: settingsError, refresh: refreshSettings, source: settingsSource, state: settingsState } = useSettingsSource()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let interval = 0
    const timeout = window.setTimeout(() => {
      setNow(new Date())
      interval = window.setInterval(() => {
        setNow(new Date())
      }, MINUTE_MS)
    }, Math.max(1000, MINUTE_MS - (Date.now() % MINUTE_MS)))

    return () => {
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
    }
  }, [])

  return {
    model: buildDashboardReadModel({
      approvedUser,
      memorySource,
      now,
      profileSource,
      routeMeta: protectedRouteMeta,
      settingsSource,
    }),
    compatibilityError: memoryError || profileError || settingsError,
    compatibilityState: combineState([memoryState, profileState, settingsState]),
    refreshCompatibility: () => {
      refreshMemories()
      refreshProfile()
      refreshSettings()
    },
  }
}
