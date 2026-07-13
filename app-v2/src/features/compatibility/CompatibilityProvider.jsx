import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { CompatibilityContext } from './CompatibilityContext.js'
import { loadCompatibilitySnapshot } from './compatibilityService.js'

export function CompatibilityProvider({ children }) {
  const { approvedUser, isAuthorized } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [compatibilityState, setCompatibilityState] = useState({
    state: 'loading',
    snapshot: null,
    error: '',
  })

  useEffect(() => {
    if (!isAuthorized || !approvedUser?.username) {
      return undefined
    }

    let active = true

    async function loadSnapshot() {
      try {
        const snapshot = await loadCompatibilitySnapshot({
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
  }, [approvedUser?.username, isAuthorized, refreshKey])

  const resolvedState =
    !isAuthorized || !approvedUser?.username
      ? {
          state: 'empty',
          snapshot: null,
          error: '',
        }
      : compatibilityState

  return (
    <CompatibilityContext.Provider
      value={{
        ...resolvedState,
        refresh: () => {
          setCompatibilityState({
            state: 'loading',
            snapshot: resolvedState.snapshot,
            error: '',
          })
          setRefreshKey((value) => value + 1)
        },
      }}
    >
      {children}
    </CompatibilityContext.Provider>
  )
}
