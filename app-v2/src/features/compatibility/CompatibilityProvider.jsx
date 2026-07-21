import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { resolveDataSourceMode } from '../../data/dataSourceMode.js'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { CompatibilityContext } from './CompatibilityContext.js'
import { loadCompatibilitySnapshot } from './compatibilityService.js'

const EMPTY_COMPATIBILITY_STATE = Object.freeze({
  state: 'empty',
  snapshot: null,
  error: '',
})

export function CompatibilityProvider({ children }) {
  const { approvedUser, isAuthorized } = useAuth()
  const [browserTestCompatibility] = useState(() => getBrowserTestCompatibilityState())
  const [refreshKey, setRefreshKey] = useState(0)
  const [compatibilityState, setCompatibilityState] = useState({
    state: 'loading',
    snapshot: null,
    error: '',
  })

  useEffect(() => {
    if (browserTestCompatibility) return undefined

    if (!isAuthorized || !approvedUser?.username) {
      return undefined
    }

    let active = true

    async function loadSnapshot() {
      try {
        const snapshot = await loadCompatibilitySnapshot({
          approvedUser,
          sourceMode: resolveDataSourceMode(),
          username: approvedUser.username,
        })

        if (!active) return

        setCompatibilityState({
          state: snapshot.status === 'empty' ? 'empty' : 'ready',
          snapshot,
          error: '',
        })
      } catch (error) {
        if (!active) return

        setCompatibilityState({
          state: 'error',
          snapshot: null,
          error: error?.message || 'Compatibility data could not be loaded.',
        })
      }
    }

    void loadSnapshot()

    return () => {
      active = false
    }
  }, [approvedUser, approvedUser?.username, browserTestCompatibility, isAuthorized, refreshKey])

  const resolvedState = browserTestCompatibility
    ? isAuthorized && approvedUser?.username
      ? browserTestCompatibility
      : EMPTY_COMPATIBILITY_STATE
    : !isAuthorized || !approvedUser?.username
      ? EMPTY_COMPATIBILITY_STATE
      : compatibilityState

  const refresh = useCallback(() => {
    if (browserTestCompatibility) return

    setCompatibilityState({
      state: 'loading',
      snapshot: resolvedState.snapshot,
      error: '',
    })
    setRefreshKey((value) => value + 1)
  }, [browserTestCompatibility, resolvedState.snapshot])

  const value = useMemo(
    () => ({
      ...resolvedState,
      refresh,
    }),
    [refresh, resolvedState],
  )

  return <CompatibilityContext.Provider value={value}>{children}</CompatibilityContext.Provider>
}
