const REGISTRATION_EVENT = 'couplebook:pwa-registration'
const UPDATE_EVENT = 'couplebook:pwa-update'
const OFFLINE_EVENT = 'couplebook:pwa-network'

function canUseServiceWorker() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD
}

function dispatch(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

function notifyNetworkState() {
  dispatch(OFFLINE_EVENT, { online: navigator.onLine !== false })
}

export function registerServiceWorker() {
  if (!canUseServiceWorker()) return null

  window.addEventListener('online', notifyNetworkState)
  window.addEventListener('offline', notifyNetworkState)

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        dispatch(REGISTRATION_EVENT, { state: 'registered' })

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              dispatch(UPDATE_EVENT, { registration })
            }
          })
        })
      })
      .catch(() => {
        dispatch(REGISTRATION_EVENT, { state: 'unavailable' })
      })
  })

  notifyNetworkState()
  return { registrationEvent: REGISTRATION_EVENT, updateEvent: UPDATE_EVENT, networkEvent: OFFLINE_EVENT }
}

export function requestServiceWorkerUpdate(registration) {
  const waiting = registration?.waiting
  if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' })
  window.location.reload()
}

export const PWA_EVENTS = Object.freeze({
  registration: REGISTRATION_EVENT,
  update: UPDATE_EVENT,
  network: OFFLINE_EVENT,
})
