import { useCallback, useMemo, useState } from 'react'
import { FIRESTORE_SOURCE } from '../../data/adapterUtils.js'
import { DATA_SOURCE_MODES } from '../../data/dataSourceMode.js'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getFirestoreMediaIndexForCouple } from '../../services/mediaIndexService.js'
import { useCoupleScopedSource } from '../domain/useCoupleScopedSource.js'

export const EMPTY_MEDIA_INDEX_SOURCE = Object.freeze({
  status: 'empty',
  source: FIRESTORE_SOURCE,
  data: Object.freeze({
    entries: Object.freeze([]),
  }),
  warnings: Object.freeze([]),
})

export const UNAVAILABLE_MEDIA_INDEX_SOURCE = Object.freeze({
  status: 'unavailable',
  source: FIRESTORE_SOURCE,
  data: Object.freeze({
    entries: Object.freeze([]),
  }),
  warnings: Object.freeze(['Firestore media index reads require an approved couple membership.']),
})

function fromBrowserFixture(fixture) {
  return fixture?.snapshot?.sources?.mediaIndex || fixture?.compatibility?.snapshot?.sources?.mediaIndex || null
}

export function useMediaIndexSource() {
  const [browserTestCompatibility] = useState(() => getBrowserTestCompatibilityState())
  const browserFixtureMediaIndexSource = useMemo(() => fromBrowserFixture(browserTestCompatibility), [browserTestCompatibility])

  const loadSource = useCallback(({ coupleId, sourceMode }) => {
    if (sourceMode !== DATA_SOURCE_MODES.firestore) return EMPTY_MEDIA_INDEX_SOURCE
    if (!coupleId) return UNAVAILABLE_MEDIA_INDEX_SOURCE
    return getFirestoreMediaIndexForCouple(coupleId)
  }, [])

  return useCoupleScopedSource({
    domainKey: 'media-index',
    emptySource: EMPTY_MEDIA_INDEX_SOURCE,
    fixtureSource: browserFixtureMediaIndexSource,
    loadSource,
  })
}
