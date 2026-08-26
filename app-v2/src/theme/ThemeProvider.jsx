import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { getFirestorePrivateSettings } from '../services/settingsService.js'
import { ThemeContext } from './ThemeContext.js'
import { DEFAULT_THEME_ID, findTheme, normalizeThemeId, THEME_STORAGE_KEY } from './themeRegistry.js'

const THEME_LOAD_TIMEOUT_MS = 8000

function getThemeStorageKey(uid = '') {
  return uid ? `${THEME_STORAGE_KEY}:${uid}` : THEME_STORAGE_KEY
}

function readStoredTheme(uid = '') {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    return normalizeThemeId(window.localStorage.getItem(getThemeStorageKey(uid)))
  } catch {
    return DEFAULT_THEME_ID
  }
}

function writeStoredTheme(themeId, uid = '') {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getThemeStorageKey(uid), normalizeThemeId(themeId))
  } catch {
    // Best-effort local persistence only.
  }
}

function applyTheme(themeId) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = normalizeThemeId(themeId)
}

export function ThemeProvider({ children }) {
  const { approvedUser, authInitialized, isAuthorized } = useAuth()
  const userId = approvedUser?.uid || ''
  const [savedTheme, setSavedTheme] = useState(() => readStoredTheme())
  const [activeTheme, setActiveTheme] = useState(() => readStoredTheme())
  const [initialization, setInitialization] = useState('loading')
  const pendingLoadRef = useRef(0)

  useEffect(() => {
    applyTheme(activeTheme)
  }, [activeTheme])

  useEffect(() => {
    writeStoredTheme(savedTheme, userId)
  }, [savedTheme, userId])

  useEffect(() => {
    if (!authInitialized) return

    const loadId = pendingLoadRef.current + 1
    pendingLoadRef.current = loadId
    let timeoutId

    const initializationStateId = window.setTimeout(() => {
      setInitialization(authInitialized && isAuthorized ? 'loading' : 'ready')
    }, 0)

    async function loadUserTheme() {
      if (!isAuthorized || !approvedUser?.coupleId || !approvedUser?.uid) {
        const fallback = readStoredTheme()
        if (pendingLoadRef.current !== loadId) return
        setSavedTheme(fallback)
        setActiveTheme(fallback)
        setInitialization('ready')
        return
      }

      try {
        timeoutId = window.setTimeout(() => {
          if (pendingLoadRef.current !== loadId) return
          setInitialization('failure')
        }, THEME_LOAD_TIMEOUT_MS)
        const result = await getFirestorePrivateSettings(approvedUser.coupleId, approvedUser.uid)
        if (pendingLoadRef.current !== loadId) return
        const loaded = normalizeThemeId(result?.data?.appearanceTheme || result?.data?.theme)
        setSavedTheme(loaded)
        setActiveTheme(loaded)
        setInitialization('ready')
      } catch {
        if (pendingLoadRef.current !== loadId) return
        const fallback = readStoredTheme(approvedUser.uid)
        setSavedTheme(fallback)
        setActiveTheme(fallback)
        setInitialization('failure')
      }
    }

    void loadUserTheme()
    return () => {
      window.clearTimeout(initializationStateId)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [approvedUser?.coupleId, approvedUser?.uid, authInitialized, isAuthorized])

  const previewTheme = useCallback((themeId) => {
    setActiveTheme(normalizeThemeId(themeId))
  }, [])

  const commitTheme = useCallback((themeId) => {
    const normalized = normalizeThemeId(themeId)
    setSavedTheme(normalized)
    setActiveTheme(normalized)
  }, [])

  const resetTheme = useCallback(() => {
    setActiveTheme(savedTheme)
  }, [savedTheme])

  const value = useMemo(() => ({
    activeTheme,
    activeThemeDefinition: findTheme(activeTheme),
    savedTheme,
    initialization,
    previewTheme,
    commitTheme,
    resetTheme,
  }), [activeTheme, commitTheme, initialization, previewTheme, resetTheme, savedTheme])

  const showInitializationShell = authInitialized && isAuthorized && initialization === 'loading'

  return (
    <ThemeContext.Provider value={value}>
      {showInitializationShell ? (
        <main className="cb-theme-initialization-shell" aria-live="polite">
          <div className="cb-theme-initialization-mark" aria-hidden="true">CB</div>
          <p>Preparing your private book...</p>
        </main>
      ) : children}
    </ThemeContext.Provider>
  )
}
