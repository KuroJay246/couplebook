import { useEffect, useState } from 'react'
import { protectedRouteMeta } from '../../app/routeConfig.js'
import { useAuth } from '../../auth/useAuth.js'
import { useCompatibilityData } from '../compatibility/useCompatibilityData.js'
import { buildDashboardReadModel } from './dashboardReadModel.js'

export function useDashboardModel() {
  const { approvedUser } = useAuth()
  const { error, refresh, snapshot, state } = useCompatibilityData()
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
      now,
      routeMeta: protectedRouteMeta,
    }),
    compatibilityError: error,
    compatibilityState: state,
    refreshCompatibility: refresh,
  }
}
