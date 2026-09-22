import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_MAINTENANCE_STATUS, fetchMaintenanceStatus } from './maintenanceStatus.js'

export function useMaintenanceStatus() {
  const mountedRef = useRef(false)
  const [snapshot, setSnapshot] = useState({
    status: DEFAULT_MAINTENANCE_STATUS,
    state: 'loading',
  })

  const refresh = useCallback(async () => {
    setSnapshot((current) => ({ ...current, state: current.state === 'ready' ? 'checking' : 'loading' }))
    const next = await fetchMaintenanceStatus()
    if (mountedRef.current) setSnapshot(next)
    return next
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchMaintenanceStatus().then((next) => {
      if (mountedRef.current) setSnapshot(next)
    })
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...snapshot,
    refresh,
  }
}
