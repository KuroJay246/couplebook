import { useCallback, useMemo, useState } from 'react'
import { readRuntimeEnv } from '../../data/adapterUtils.js'
import { createGoogleDriveMediaProvider, DRIVE_STATE } from '../../services/googleDriveMediaProvider.js'

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Drive authorization requires a browser.'))
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  const existing = document.querySelector('script[data-couplebook-google-identity]')
  if (existing) return new Promise((resolve, reject) => {
    existing.addEventListener('load', resolve, { once: true })
    existing.addEventListener('error', () => reject(new Error('Google Drive authorization could not load.')), { once: true })
  })
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://accounts.google.com/gsi/client'
    script.dataset.couplebookGoogleIdentity = 'true'
    script.onload = resolve
    script.onerror = () => reject(new Error('Google Drive authorization could not load.'))
    document.head.appendChild(script)
  })
}

export function useGoogleDriveConnection() {
  const env = readRuntimeEnv()
  const provider = useMemo(() => createGoogleDriveMediaProvider({ clientId: env.VITE_GOOGLE_CLIENT_ID }), [env.VITE_GOOGLE_CLIENT_ID])
  const [state, setState] = useState(() => provider.getConnectionState())
  const [message, setMessage] = useState('')

  const connect = useCallback(async () => {
    setState(DRIVE_STATE.connecting)
    setMessage('')
    try {
      await loadGoogleIdentityScript()
      const result = await provider.connect()
      setState(result.state)
      return result
    } catch (error) {
      setState(error.code || DRIVE_STATE.temporaryFailure)
      setMessage(error.message)
      throw error
    }
  }, [provider])

  const disconnect = useCallback(() => {
    provider.disconnect()
    setState(DRIVE_STATE.disconnected)
    setMessage('')
  }, [provider])

  const retryAccess = useCallback(async () => connect(), [connect])

  return { connect, disconnect, message, provider, retryAccess, state }
}
