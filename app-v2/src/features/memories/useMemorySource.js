import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { resolveDataSourceMode, DATA_SOURCE_MODES } from '../../data/dataSourceMode.js'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getFirestoreMemoriesForCouple, getLegacyMemories } from '../../services/memoryService.js'

const EMPTY_MEMORY_SOURCE = Object.freeze({
  status: 'empty',
  source: 'memory-domain',
  data: {
    hasBaseDataset: false,
    memories: [],
    customMemoryCount: 0,
    overriddenMemoryCount: 0,
    deletedMemoryCount: 0,
  },
  warnings: Object.freeze([]),
})

function fromBrowserFixture(fixture) {
  return fixture?.snapshot?.sources?.memories || fixture?.compatibility?.snapshot?.sources?.memories || null
}

function getApprovedUserCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

function getMemoryOwnerKey({ approvedUser, browserFixtureMemorySource, isAuthorized }) {
  if (browserFixtureMemorySource) return 'browser-fixture'
  if (!isAuthorized || !approvedUser?.username) return 'empty'
  return [
    resolveDataSourceMode(),
    approvedUser.uid || approvedUser.raw?.uid || approvedUser.username,
    getApprovedUserCoupleId(approvedUser),
    approvedUser.username,
  ].join(':')
}

export function useMemorySource() {
  const { approvedUser, isAuthorized } = useAuth()
  const [browserTestCompatibility] = useState(() => getBrowserTestCompatibilityState())
  const browserFixtureMemorySource = useMemo(() => fromBrowserFixture(browserTestCompatibility), [browserTestCompatibility])
  const [refreshKey, setRefreshKey] = useState(0)
  const ownerKey = getMemoryOwnerKey({ approvedUser, browserFixtureMemorySource, isAuthorized })
  const [state, setState] = useState({
    status: 'loading',
    source: EMPTY_MEMORY_SOURCE,
    error: '',
    ownerKey: '',
  })

  useEffect(() => {
    if (browserFixtureMemorySource) {
      return undefined
    }

    if (!isAuthorized || !approvedUser?.username) {
      return undefined
    }

    let active = true

    async function loadMemories() {
      try {
        const mode = resolveDataSourceMode()
        const coupleId = getApprovedUserCoupleId(approvedUser)
        if (mode === DATA_SOURCE_MODES.firestore && !coupleId) {
          throw new Error('Memory data requires an approved couple membership.')
        }
        const source = mode === DATA_SOURCE_MODES.firestore
          ? await getFirestoreMemoriesForCouple(coupleId)
          : await getLegacyMemories({ approvedUser, username: approvedUser.username, sourceMode: mode })

        if (!active) return
        setState({
          status: source.status === 'empty' ? 'empty' : 'ready',
          source,
          error: '',
          ownerKey,
        })
      } catch (error) {
        if (!active) return
        setState({
          status: 'error',
          source: EMPTY_MEMORY_SOURCE,
          error: error?.message || 'Memory data could not be loaded.',
          ownerKey,
        })
      }
    }

    void loadMemories()

    return () => {
      active = false
    }
  }, [approvedUser, approvedUser?.coupleId, approvedUser?.raw?.coupleId, approvedUser?.username, browserFixtureMemorySource, isAuthorized, ownerKey, refreshKey])

  const refresh = useCallback(() => {
    if (browserFixtureMemorySource) return
    setRefreshKey((value) => value + 1)
  }, [browserFixtureMemorySource])

  const isEmptyOwner = !isAuthorized || !approvedUser?.username
  const hasResolvedOwner = state.ownerKey === ownerKey

  return {
    error: browserFixtureMemorySource || isEmptyOwner || !hasResolvedOwner ? '' : state.error,
    refresh,
    source: browserFixtureMemorySource || (isEmptyOwner || !hasResolvedOwner ? EMPTY_MEMORY_SOURCE : state.source),
    state: browserFixtureMemorySource
      ? browserFixtureMemorySource.status === 'empty' ? 'empty' : 'ready'
      : isEmptyOwner
        ? 'empty'
        : !hasResolvedOwner
          ? 'loading'
        : state.status,
  }
}
