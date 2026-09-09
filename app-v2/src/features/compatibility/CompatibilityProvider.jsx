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

function getApprovedUserUid(approvedUser) {
  return approvedUser?.uid || approvedUser?.raw?.uid || ''
}

function getApprovedUserCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

function getCompatibilityOwnerKey(approvedUser) {
  if (!approvedUser?.username) return ''
  return [getApprovedUserUid(approvedUser), getApprovedUserCoupleId(approvedUser), approvedUser.username].filter(Boolean).join(':')
}

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

    const ownerKey = getCompatibilityOwnerKey(approvedUser)

    if (!isAuthorized || !ownerKey) {
      return undefined
    }

    let active = true
    queueMicrotask(() => {
      if (!active) return
      setCompatibilityState({
        state: 'loading',
        snapshot: null,
        error: '',
      })
    })

    loadCompatibilitySnapshot({
      approvedUser,
      sourceMode: resolveDataSourceMode(),
      username: approvedUser.username,
    })
      .then((snapshot) => {
        if (!active || ownerKey !== getCompatibilityOwnerKey(approvedUser)) return

        setCompatibilityState({
          state: snapshot.status === 'empty' ? 'empty' : 'ready',
          snapshot,
          error: '',
        })
      })
      .catch((error) => {
        if (!active || ownerKey !== getCompatibilityOwnerKey(approvedUser)) return

        setCompatibilityState({
          state: 'error',
          snapshot: null,
          error: error?.message || 'Compatibility data could not be loaded.',
        })
      })

    return () => {
      active = false
    }
  }, [
    approvedUser,
    approvedUser?.coupleId,
    approvedUser?.raw?.coupleId,
    approvedUser?.raw?.uid,
    approvedUser?.uid,
    approvedUser?.username,
    browserTestCompatibility,
    isAuthorized,
    refreshKey,
  ])

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
