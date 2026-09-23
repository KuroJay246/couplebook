import { Outlet, useLocation } from 'react-router-dom'
import { MaintenanceNotice } from '../pages/MaintenancePage.jsx'
import { useMaintenanceStatus } from './useMaintenanceStatus.js'

export function MaintenanceGate() {
  const location = useLocation()
  const maintenance = useMaintenanceStatus()

  // Keep the routed shell mounted while the public status check resolves.
  // Replacing the whole tree here caused a visible maintenance-page flash on
  // every cold route load, even when maintenance was off.
  if (maintenance.state === 'loading') return <Outlet />

  if (maintenance.status.enabled) {
    return (
      <MaintenanceNotice
        mode="active"
        onCheckAgain={maintenance.refresh}
        returnPath={location.pathname}
        status={maintenance.status}
        statusState={maintenance.state}
      />
    )
  }

  return <Outlet />
}
