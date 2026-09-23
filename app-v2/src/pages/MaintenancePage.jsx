import { Clock3, HeartPulse, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEFAULT_AUTHENTICATED_PATH } from '../app/routeConfig.js'
import { useMaintenanceStatus } from '../maintenance/useMaintenanceStatus.js'

const RETURN_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatReturnTime(value) {
  if (!value) return 'Check back shortly'
  try {
    return RETURN_TIME_FORMATTER.format(new Date(value))
  } catch {
    return 'Check back shortly'
  }
}

export function MaintenanceNotice({
  mode = 'direct',
  onCheckAgain,
  returnPath = DEFAULT_AUTHENTICATED_PATH,
  status,
  statusState = 'ready',
} = {}) {
  const [checking, setChecking] = useState(false)
  const isChecking = statusState === 'loading' || statusState === 'checking' || checking
  const isActive = mode === 'active' || status?.enabled === true
  const title = isChecking
    ? 'Checking the app status.'
    : isActive
      ? status.message
      : 'No update is active right now.'
  const description = isActive
    ? status.details
    : 'Couple Book is available. This public page stays here so update windows can be checked without signing in.'

  async function handleCheckAgain() {
    if (!onCheckAgain) return
    setChecking(true)
    const next = await onCheckAgain()
    setChecking(false)
    return next
  }

  return (
    <main className="cb-maintenance-page" data-route="maintenance">
      <section className="cb-maintenance-shell" aria-labelledby="maintenance-title">
        <div className="cb-maintenance-card">
          <p className="cb-maintenance-eyebrow">Couple Book update</p>
          <h1 id="maintenance-title">{title}</h1>
          <p className="cb-maintenance-lede">{description}</p>
          {status?.updateId ? <p className="cb-maintenance-version">Update ID: {status.updateId}</p> : null}
          <div className="cb-maintenance-actions">
            <button className="cb-maintenance-primary" disabled={isChecking} onClick={handleCheckAgain} type="button">
              <RefreshCw aria-hidden="true" className={isChecking ? 'cb-maintenance-spin' : ''} size={18} />
              {isChecking ? 'Checking...' : 'Check again'}
            </button>
            {!isActive ? (
              <Link className="cb-maintenance-secondary" to={returnPath || DEFAULT_AUTHENTICATED_PATH}>
                Open Couple Book
              </Link>
            ) : null}
          </div>
        </div>

        <div className="cb-maintenance-grid" aria-label="Update details">
          <div className="cb-maintenance-panel">
            <HeartPulse aria-hidden="true" />
            <h2>Update in progress</h2>
            <p>{isActive ? 'Some pages are paused while the current app update is reviewed.' : 'This page is ready for the next planned maintenance window.'}</p>
          </div>
          <div className="cb-maintenance-panel">
            <ShieldCheck aria-hidden="true" />
            <h2>Private by default</h2>
            <p>The notice is public, but it does not load Firebase Auth, Firestore, Drive media, or private relationship data.</p>
          </div>
          <div className="cb-maintenance-panel">
            <Clock3 aria-hidden="true" />
            <h2>{formatReturnTime(status?.expectedReturnAt)}</h2>
            <p>{isActive ? 'Use Check again after the update window ends.' : 'Normal sign-in and app routes are available while maintenance is off.'}</p>
          </div>
        </div>
      </section>
    </main>
  )
}

export function MaintenancePage() {
  const navigate = useNavigate()
  const maintenance = useMaintenanceStatus()

  async function handleCheckAgain() {
    const next = await maintenance.refresh()
    if (next?.status?.enabled === false) navigate(DEFAULT_AUTHENTICATED_PATH)
    return next
  }

  return (
    <MaintenanceNotice
      mode={maintenance.status.enabled ? 'active' : 'direct'}
      onCheckAgain={handleCheckAgain}
      status={maintenance.status}
      statusState={maintenance.state}
    />
  )
}
