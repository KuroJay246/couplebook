import { useCallback, useEffect, useMemo, useState } from 'react'
import { isLocalHostname, readRuntimeEnv } from '../../data/adapterUtils.js'
import { createGoogleDriveMediaProvider, DRIVE_STATE } from '../../services/googleDriveMediaProvider.js'
import { createLocalGoogleDriveTestProvider } from './localGoogleDriveTestProvider.js'

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

export function getGoogleDriveOAuthOriginIssue(location = typeof window === 'undefined' ? null : window.location) {
  const origin = String(location?.origin || '').trim()
  const hostname = String(location?.hostname || '').trim().toLowerCase()
  const port = String(location?.port || '').trim()

  if (hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
    const suggestedOrigin = port ? `http://localhost:${port}` : 'http://localhost'
    return {
      origin,
      suggestedOrigin,
      requiredOrigins: suggestedOrigin,
      message: `Google Drive sign-in is blocked from ${origin}. Reopen Couple Book at the canonical local origin ${suggestedOrigin}; if Google still blocks sign-in, register only ${suggestedOrigin} as the authorized JavaScript origin for this OAuth client.`,
    }
  }

  return null
}

export function shouldUseLocalDriveTestProvider(localUploadTestHooksEnabled) {
  if (typeof window === 'undefined') return false
  if (localUploadTestHooksEnabled !== 'true') return false
  if (window.__COUPLEBOOK_DRIVE_TEST__?.enabled !== true) return false
  return isLocalHostname(window.location?.hostname || '')
}

function createRenderableState() {
  return {
    generation: 0,
    state: DRIVE_STATE.disconnected,
    message: '',
    files: [],
    previews: {},
  }
}

function isActiveGeneration(generationRef, generation) {
  return generationRef.current === generation
}

function createReconnectRequiredError() {
  const error = new Error('Reconnect Google Drive before accessing private media.')
  error.code = DRIVE_STATE.reconnectRequired
  return error
}

function readCurrentProvider(providerRef, renderRef, apply) {
  const provider = providerRef.current
  if (!provider || renderRef.current.state !== DRIVE_STATE.connected) {
    const error = createReconnectRequiredError()
    apply?.({
      state: DRIVE_STATE.reconnectRequired,
      message: error.message,
      files: [],
      previews: {},
    })
    throw error
  }
  return provider
}

function createAuthorizationTimeoutError() {
  const error = new Error('Google Drive authorization did not finish. Check for a blocked Google popup, allow popups for localhost, then try again.')
  error.code = DRIVE_STATE.temporaryFailure
  return error
}

function withTimeout(promise, timeoutMs, createTimeoutError = createAuthorizationTimeoutError) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise

  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError()), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== null) clearTimeout(timeoutId)
  })
}

async function listAllFiles(provider) {
  const nextFiles = []
  let pageToken = ''
  for (let page = 0; page < 5; page += 1) {
    const result = await provider.listFiles({ pageToken, pageSize: 100 })
    nextFiles.push(...result.files)
    pageToken = result.nextPageToken
    if (!pageToken) break
  }
  return nextFiles
}

export function createDriveConnectionController({
  createProvider,
  connectTimeoutMs = 20000,
  loadIdentityScript = loadGoogleIdentityScript,
  revokeObjectUrl = (url) => URL.revokeObjectURL(url),
  skipOAuthOriginPreflight = false,
} = {}) {
  const providerRef = { current: null }
  const generationRef = { current: 0 }
  const previewUrlsRef = { current: new Set() }
  const renderRef = { current: createRenderableState() }
  let setRenderState = () => {}

  function bindReact(setState) {
    setRenderState = setState
  }

  function apply(update) {
    const next = { ...renderRef.current, ...update }
    renderRef.current = next
    setRenderState(next)
  }

  function revokeSessionPreviews() {
    for (const url of previewUrlsRef.current) revokeObjectUrl(url)
    previewUrlsRef.current.clear()
  }

  function reset(nextGeneration) {
    revokeSessionPreviews()
    apply({
      generation: nextGeneration,
      files: [],
      previews: {},
    })
  }

  function beginSession(nextState) {
    providerRef.current?.disconnect?.()
    generationRef.current += 1
    const generation = generationRef.current
    providerRef.current = null
    reset(generation)
    apply({ state: nextState, message: '' })
    return generation
  }

  async function connect() {
    const generation = beginSession(DRIVE_STATE.connecting)
    let provider = null
    try {
      const originIssue = skipOAuthOriginPreflight ? null : getGoogleDriveOAuthOriginIssue()
      if (originIssue) {
        throw Object.assign(new Error(originIssue.message), { code: DRIVE_STATE.temporaryFailure })
      }

      await withTimeout(loadIdentityScript(), connectTimeoutMs)
      if (!isActiveGeneration(generationRef, generation)) {
        const error = new Error('A newer Google Drive session replaced this authorization attempt.')
        error.code = DRIVE_STATE.cancelled
        throw error
      }

      provider = createProvider()
      const result = await withTimeout(provider.connect(), connectTimeoutMs)
      const files = await withTimeout(listAllFiles(provider), connectTimeoutMs)
      if (!isActiveGeneration(generationRef, generation)) {
        provider.disconnect?.()
        const error = new Error('A newer Google Drive session replaced this authorization attempt.')
        error.code = DRIVE_STATE.cancelled
        throw error
      }

      providerRef.current = provider
      apply({
        generation,
        state: result.state,
        message: '',
        files,
        previews: {},
      })
      return { ...result, generation, files }
    } catch (error) {
      provider?.disconnect?.()
      if (isActiveGeneration(generationRef, generation)) {
        providerRef.current = null
        apply({
          generation,
          state: error.code || DRIVE_STATE.temporaryFailure,
          message: error.message || 'Google Drive is temporarily unavailable. Try again.',
          files: [],
          previews: {},
        })
      }
      throw error
    }
  }

  async function refreshListing() {
    const generation = generationRef.current
    const provider = readCurrentProvider(providerRef, renderRef, apply)
    const files = await listAllFiles(provider)
    if (!isActiveGeneration(generationRef, generation)) return renderRef.current.files
    apply({ files })
    return files
  }

  async function getPreview(fileId) {
    const current = renderRef.current
    if (current.previews[fileId]) return current.previews[fileId]

    const generation = generationRef.current
    const provider = readCurrentProvider(providerRef, renderRef, apply)
    const url = await provider.fetchPreview(fileId)
    if (!isActiveGeneration(generationRef, generation)) {
      revokeObjectUrl(url)
      const error = new Error('A newer Google Drive session replaced this preview request.')
      error.code = DRIVE_STATE.cancelled
      throw error
    }

    previewUrlsRef.current.add(url)
    apply({
      previews: {
        ...renderRef.current.previews,
        [fileId]: url,
      },
    })
    return url
  }

  function disconnect() {
    const generation = beginSession(DRIVE_STATE.disconnected)
    apply({
      generation,
      state: DRIVE_STATE.disconnected,
      message: '',
    })
  }

  async function retryAccess() {
    return connect()
  }

  function getProvider() {
    return providerRef.current
  }

  function openExternally(fileId) {
    return readCurrentProvider(providerRef, renderRef, apply).openExternally(fileId)
  }

  function getSnapshot() {
    return renderRef.current
  }

  function cleanup() {
    providerRef.current?.disconnect?.()
    providerRef.current = null
    generationRef.current += 1
    revokeSessionPreviews()
  }

  return {
    bindReact,
    cleanup,
    connect,
    disconnect,
    getPreview,
    getProvider,
    getSnapshot,
    openExternally,
    refreshListing,
    retryAccess,
  }
}

export function useGoogleDriveConnection() {
  const env = readRuntimeEnv()
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID
  const localUploadTestHooksEnabled = env.VITE_ENABLE_LOCAL_UPLOAD_TEST_HOOKS
  const useLocalDriveProvider = shouldUseLocalDriveTestProvider(localUploadTestHooksEnabled)
  const controller = useMemo(
    () => createDriveConnectionController({
      createProvider: () => (useLocalDriveProvider
        ? createLocalGoogleDriveTestProvider()
        : createGoogleDriveMediaProvider({ clientId: googleClientId })),
      loadIdentityScript: () => (useLocalDriveProvider ? Promise.resolve() : loadGoogleIdentityScript()),
      skipOAuthOriginPreflight: useLocalDriveProvider,
    }),
    [googleClientId, useLocalDriveProvider],
  )
  const [renderState, setRenderState] = useState(() => controller.getSnapshot())

  useEffect(() => {
    controller.bindReact(setRenderState)
    return () => controller.cleanup()
  }, [controller])

  const connect = useCallback(async () => controller.connect(), [controller])
  const disconnect = useCallback(() => controller.disconnect(), [controller])
  const refreshListing = useCallback(async () => controller.refreshListing(), [controller])
  const retryAccess = useCallback(async () => controller.retryAccess(), [controller])
  const getPreview = useCallback(async (fileId) => controller.getPreview(fileId), [controller])
  const openExternally = useCallback((fileId) => controller.openExternally(fileId), [controller])

  return {
    connect,
    disconnect,
    files: renderState.files,
    generation: renderState.generation,
    getPreview,
    message: renderState.message,
    openExternally,
    previews: renderState.previews,
    provider: controller.getProvider(),
    refreshListing,
    retryAccess,
    state: renderState.state,
  }
}
