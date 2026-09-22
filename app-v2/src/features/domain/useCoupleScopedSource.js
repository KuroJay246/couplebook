import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { resolveDataSourceMode } from '../../data/dataSourceMode.js'
import {
  getApprovedUserCoupleId,
  getApprovedUserLabel,
  getApprovedUserUid,
  getCoupleScopedOwnerKey,
} from './coupleSourceIdentity.js'
import { withSourceTimeout } from './sourceTimeout.js'

function getHookStateFromSource(source) {
  return source?.status === 'empty' ? 'empty' : 'ready'
}

export function useCoupleScopedSource({ domainKey, emptySource, fixtureSource = null, loadSource }) {
  const { approvedUser, isAuthorized } = useAuth()
  const sourceMode = resolveDataSourceMode()
  const [refreshKey, setRefreshKey] = useState(0)
  const ownerKey = useMemo(
    () => getCoupleScopedOwnerKey({ approvedUser, domainKey, fixtureSource, isAuthorized, sourceMode }),
    [approvedUser, domainKey, fixtureSource, isAuthorized, sourceMode],
  )
  const [state, setState] = useState({
    status: 'loading',
    source: emptySource,
    error: '',
    ownerKey: '',
  })

  useEffect(() => {
    if (fixtureSource) return undefined

    if (!isAuthorized || !getApprovedUserUid(approvedUser) || !getApprovedUserCoupleId(approvedUser)) {
      return undefined
    }

    let active = true
    const requestOwnerKey = ownerKey

    Promise.resolve()
      .then(() => withSourceTimeout(Promise.resolve(loadSource({
        approvedUser,
        coupleId: getApprovedUserCoupleId(approvedUser),
        forceRefresh: refreshKey > 0,
        refreshKey,
        sourceMode,
        uid: getApprovedUserUid(approvedUser),
        username: getApprovedUserLabel(approvedUser),
      })), domainKey))
      .then((source) => {
        if (!active) return
        setState({
          status: getHookStateFromSource(source),
          source,
          error: '',
          ownerKey: requestOwnerKey,
        })
      })
      .catch((error) => {
        if (!active) return
        setState({
          status: 'error',
          source: emptySource,
          error: error?.message || `${domainKey} could not be loaded.`,
          ownerKey: requestOwnerKey,
        })
      })

    return () => {
      active = false
    }
  }, [approvedUser, domainKey, emptySource, fixtureSource, isAuthorized, loadSource, ownerKey, refreshKey, sourceMode])

  const refresh = useCallback(() => {
    if (fixtureSource) return
    setRefreshKey((value) => value + 1)
  }, [fixtureSource])

  const isEmptyOwner = !isAuthorized || !getApprovedUserUid(approvedUser) || !getApprovedUserCoupleId(approvedUser)
  const hasResolvedOwner = state.ownerKey === ownerKey

  return {
    error: fixtureSource || isEmptyOwner || !hasResolvedOwner ? '' : state.error,
    refresh,
    source: fixtureSource || (isEmptyOwner || !hasResolvedOwner ? emptySource : state.source),
    sourceMode,
    state: fixtureSource
      ? getHookStateFromSource(fixtureSource)
      : isEmptyOwner
        ? 'empty'
        : !hasResolvedOwner
          ? 'loading'
          : state.status,
  }
}
