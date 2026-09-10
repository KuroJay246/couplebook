import { useEffect, useState } from 'react'
import { InlineAlert } from '../components/ui/InlineAlert.jsx'
import { PWA_EVENTS, requestServiceWorkerUpdate } from './registerServiceWorker.js'

export function PwaStatus() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine !== false)
  const [waitingRegistration, setWaitingRegistration] = useState(null)

  useEffect(() => {
    function handleNetwork(event) {
      if (event.detail && typeof event.detail.online === 'boolean') {
        setOnline(event.detail.online)
        return
      }
      setOnline(typeof navigator === 'undefined' ? true : navigator.onLine !== false)
    }

    function handleUpdate(event) {
      setWaitingRegistration(event.detail?.registration || null)
    }

    window.addEventListener(PWA_EVENTS.network, handleNetwork)
    window.addEventListener(PWA_EVENTS.update, handleUpdate)
    window.addEventListener('online', handleNetwork)
    window.addEventListener('offline', handleNetwork)
    return () => {
      window.removeEventListener(PWA_EVENTS.network, handleNetwork)
      window.removeEventListener(PWA_EVENTS.update, handleUpdate)
      window.removeEventListener('online', handleNetwork)
      window.removeEventListener('offline', handleNetwork)
    }
  }, [])

  if (waitingRegistration) {
    return (
      <div className="cb-pwa-status">
        <InlineAlert
          tone="info"
          title="A Couple Book update is ready"
          description="Refresh when you are ready to use the latest version. Private media and uploads will continue to require a connection."
          action={<button className="cb-button cb-button-primary min-h-10 px-4 text-sm" type="button" onClick={() => requestServiceWorkerUpdate(waitingRegistration)}>Refresh</button>}
        />
      </div>
    )
  }

  if (!online) {
    return (
      <div className="cb-pwa-status">
        <InlineAlert
          tone="offline"
          title="You are offline"
          description="The app shell can stay open, but Drive media, uploads, and fresh Firestore data will wait for the connection to return."
        />
      </div>
    )
  }

  return null
}
