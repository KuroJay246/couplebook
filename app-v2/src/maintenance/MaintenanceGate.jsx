import { Outlet, useLocation } from 'react-router-dom'
import { MaintenanceNotice } from '../pages/MaintenancePage.jsx'
import { useMaintenanceStatus } from './useMaintenanceStatus.js'

export function MaintenanceGate() {
  const location = useLocation()
  const maintenance = useMaintenanceStatus()

  if (maintenance.state === 'loading') {
    return (
      <MaintenanceNotice
        mode="checking"
        onCheckAgain={maintenance.refresh}
        status={maintenance.status}
        statusState={maintenance.state}
      />
    )
  }

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
