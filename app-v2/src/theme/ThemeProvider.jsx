import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { getFirestorePrivateSettings } from '../services/settingsService.js'
import { ThemeContext } from './ThemeContext.js'
import { DEFAULT_THEME_ID, findTheme, normalizeThemeId, THEME_STORAGE_KEY } from './themeRegistry.js'

function readStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    return normalizeThemeId(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_ID
  }
}

function writeStoredTheme(themeId) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemeId(themeId))
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
  const [savedTheme, setSavedTheme] = useState(() => readStoredTheme())
  const [activeTheme, setActiveTheme] = useState(() => readStoredTheme())
  const pendingLoadRef = useRef(0)

  useEffect(() => {
    applyTheme(activeTheme)
  }, [activeTheme])

  useEffect(() => {
    writeStoredTheme(savedTheme)
  }, [savedTheme])

  useEffect(() => {
    if (!authInitialized) return

    const loadId = pendingLoadRef.current + 1
    pendingLoadRef.current = loadId

    async function loadUserTheme() {
      if (!isAuthorized || !approvedUser?.coupleId || !approvedUser?.uid) {
        const fallback = readStoredTheme()
        if (pendingLoadRef.current !== loadId) return
        setSavedTheme(fallback)
        setActiveTheme(fallback)
        return
      }

      try {
        const result = await getFirestorePrivateSettings(approvedUser.coupleId, approvedUser.uid)
        if (pendingLoadRef.current !== loadId) return
        const loaded = normalizeThemeId(result?.data?.appearanceTheme || result?.data?.theme)
        setSavedTheme(loaded)
        setActiveTheme(loaded)
      } catch {
        if (pendingLoadRef.current !== loadId) return
        const fallback = readStoredTheme()
        setSavedTheme(fallback)
        setActiveTheme(fallback)
      }
    }

    void loadUserTheme()
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
    previewTheme,
    commitTheme,
    resetTheme,
  }), [activeTheme, commitTheme, previewTheme, resetTheme, savedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
