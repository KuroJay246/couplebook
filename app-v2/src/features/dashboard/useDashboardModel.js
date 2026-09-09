import { useEffect, useState } from 'react'
import { protectedRouteMeta } from '../../app/routeConfig.js'
import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { useMemorySource } from '../memories/useMemorySource.js'
import { buildDashboardReadModel } from './dashboardReadModel.js'

export function useDashboardModel() {
  const { approvedUser } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()
  const { error: memoryError, refresh: refreshMemories, source: memorySource, state: memoryState } = useMemorySource()
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
      routeMeta: protectedRouteMeta,
    }),
    compatibilityError: error || memoryError,
    compatibilityState: state === 'error' || memoryState === 'error' ? 'error' : state === 'loading' || memoryState === 'loading' ? 'loading' : state,
    refreshCompatibility: () => {
      refresh()
      refreshMemories()
    },
  }
}
