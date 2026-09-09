import { useCallback, useMemo } from 'react'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getFavoritesSourceForApprovedUser } from '../../services/favoritesService.js'
import { useCoupleScopedSource } from '../domain/useCoupleScopedSource.js'

const EMPTY_FAVORITES_SOURCE = Object.freeze({
  status: 'empty',
  source: 'favorites-domain',
  data: {
    favoritesByOwner: {},
    participantOrder: [],
    unknownTopLevelFields: {},
  },
  warnings: Object.freeze([]),
})

function fromBrowserFixture(fixture) {
  return fixture?.snapshot?.sources?.favorites || fixture?.compatibility?.snapshot?.sources?.favorites || null
}

export function useFavoritesSource() {
  const browserFixtureSource = useMemo(() => fromBrowserFixture(getBrowserTestCompatibilityState()), [])
  const loadSource = useCallback((options) => getFavoritesSourceForApprovedUser(options), [])

  return useCoupleScopedSource({
    domainKey: 'favorites',
    emptySource: EMPTY_FAVORITES_SOURCE,
    fixtureSource: browserFixtureSource,
    loadSource,
  })
}
