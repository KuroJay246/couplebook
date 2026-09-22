import { useEffect, useState } from 'react'
import { protectedRouteMeta } from '../../app/routeConfig.js'
import { useAuth } from '../../auth/useAuth.js'
import { useProfileSource } from '../profile/useProfileSource.js'
import { useSettingsSource } from '../settings/useSettingsSource.js'
import { buildDashboardReadModel } from './dashboardReadModel.js'

const MINUTE_MS = 60 * 1000
const MINIMUM_CLOCK_DELAY_MS = 1000

function getDelayUntilNextMinute(now = new Date()) {
  const elapsedMinuteMs = (now.getSeconds() * 1000) + now.getMilliseconds()
  const remainingMinuteMs = MINUTE_MS - elapsedMinuteMs
  return Math.max(MINIMUM_CLOCK_DELAY_MS, remainingMinuteMs)
}

function combineState(states) {
  if (states.includes('error')) return 'error'
  if (states.includes('loading')) return 'loading'
  if (states.every((state) => state === 'empty')) return 'empty'
  return 'ready'
}

export function useDashboardModel() {
  const { approvedUser } = useAuth()
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
    }, getDelayUntilNextMinute())

    return () => {
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
    }
  }, [])

  return {
    model: buildDashboardReadModel({
      approvedUser,
      now,
      profileSource,
      routeMeta: protectedRouteMeta,
      settingsSource,
    }),
    compatibilityError: profileError || settingsError,
    compatibilityState: combineState([profileState, settingsState]),
    refreshCompatibility: () => {
      refreshProfile()
      refreshSettings()
    },
  }
}
