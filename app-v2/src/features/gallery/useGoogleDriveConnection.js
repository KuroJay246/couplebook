import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState({})
  const previewUrlsRef = useRef(new Set())

  const refreshListing = useCallback(async () => {
    const nextFiles = []
    let pageToken = ''
    for (let page = 0; page < 5; page += 1) {
      const result = await provider.listFiles({ pageToken, pageSize: 100 })
      nextFiles.push(...result.files)
      pageToken = result.nextPageToken
      if (!pageToken) break
    }
    setFiles(nextFiles)
    return nextFiles
  }, [provider])

  const connect = useCallback(async () => {
    setState(DRIVE_STATE.connecting)
    setMessage('')
    try {
      await loadGoogleIdentityScript()
      const result = await provider.connect()
      setState(result.state)
      await refreshListing()
      return result
    } catch (error) {
      setState(error.code || DRIVE_STATE.temporaryFailure)
      setMessage(error.message)
      throw error
    }
  }, [provider, refreshListing])

  const disconnect = useCallback(() => {
    provider.disconnect()
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url)
    previewUrlsRef.current.clear()
    setFiles([])
    setPreviews({})
    setState(DRIVE_STATE.disconnected)
    setMessage('')
  }, [provider])

  const retryAccess = useCallback(async () => connect(), [connect])

  const getPreview = useCallback(async (fileId) => {
    if (previews[fileId]) return previews[fileId]
    const url = await provider.fetchPreview(fileId)
    previewUrlsRef.current.add(url)
    setPreviews((current) => ({ ...current, [fileId]: url }))
    return url
  }, [previews, provider])

  useEffect(() => () => {
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url)
    previewUrlsRef.current.clear()
  }, [])

  return { connect, disconnect, files, getPreview, message, previews, provider, refreshListing, retryAccess, state }
}
