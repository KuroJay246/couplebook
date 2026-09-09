import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { useSettingsSource } from '../features/settings/useSettingsSource.js'
import { ThemeContext } from './ThemeContext.js'
import { DEFAULT_THEME_ID, findTheme, normalizeThemeId, THEME_STORAGE_KEY } from './themeRegistry.js'

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
  const { source: settingsSource, state: settingsState } = useSettingsSource()
  const userId = approvedUser?.uid || ''
  const [savedTheme, setSavedTheme] = useState(() => readStoredTheme())
  const [activeTheme, setActiveTheme] = useState(() => readStoredTheme())
  const [initialization, setInitialization] = useState('loading')

  useEffect(() => {
    applyTheme(activeTheme)
  }, [activeTheme])

  useEffect(() => {
    writeStoredTheme(savedTheme, userId)
  }, [savedTheme, userId])

  useEffect(() => {
    if (!authInitialized) return

    let active = true
    const uid = approvedUser?.uid || ''

    queueMicrotask(() => {
      if (!active) return

      if (!isAuthorized) {
        const fallback = readStoredTheme()
        setSavedTheme(fallback)
        setActiveTheme(fallback)
        setInitialization('ready')
        return
      }

      if (settingsState === 'loading') {
        setInitialization('loading')
        return
      }

      const loadedTheme = settingsSource?.data?.appearanceTheme || settingsSource?.data?.theme
      if (loadedTheme) {
        const loaded = normalizeThemeId(loadedTheme)
        setSavedTheme(loaded)
        setActiveTheme(loaded)
        setInitialization('ready')
        return
      }

      const fallback = readStoredTheme(uid)
      setSavedTheme(fallback)
      setActiveTheme(fallback)
      setInitialization(settingsState === 'error' ? 'failure' : 'ready')
    })

    return () => {
      active = false
    }
  }, [approvedUser?.coupleId, approvedUser?.raw?.coupleId, approvedUser?.raw?.uid, approvedUser?.uid, authInitialized, isAuthorized, settingsSource, settingsState])

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
