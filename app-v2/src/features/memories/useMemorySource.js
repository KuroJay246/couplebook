import { useCallback, useMemo, useState } from 'react'
import { DATA_SOURCE_MODES } from '../../data/dataSourceMode.js'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getFirestoreMemoriesForCouple, getLegacyMemories } from '../../services/memoryService.js'
import { useCoupleScopedSource } from '../domain/useCoupleScopedSource.js'

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

export function useMemorySource() {
  const [browserTestCompatibility] = useState(() => getBrowserTestCompatibilityState())
  const browserFixtureMemorySource = useMemo(() => fromBrowserFixture(browserTestCompatibility), [browserTestCompatibility])

  const loadSource = useCallback(({ approvedUser, coupleId, sourceMode, username }) => {
    if (sourceMode === DATA_SOURCE_MODES.firestore && !coupleId) {
      throw new Error('Memory data requires an approved couple membership.')
    }

    return sourceMode === DATA_SOURCE_MODES.firestore
      ? getFirestoreMemoriesForCouple(coupleId)
      : getLegacyMemories({ approvedUser, username, sourceMode })
  }, [])

  return useCoupleScopedSource({
    domainKey: 'memories',
    emptySource: EMPTY_MEMORY_SOURCE,
    fixtureSource: browserFixtureMemorySource,
    loadSource,
  })
}
