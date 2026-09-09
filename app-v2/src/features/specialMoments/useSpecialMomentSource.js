import { useCallback, useMemo } from 'react'
import { DATA_SOURCE_MODES } from '../../data/dataSourceMode.js'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getFirestoreSpecialMoment, getLegacySpecialMoment } from '../../services/specialMomentService.js'
import { useCoupleScopedSource } from '../domain/useCoupleScopedSource.js'

const EMPTY_SPECIAL_MOMENT_SOURCE = Object.freeze({
  status: 'empty',
  source: 'special-moment-domain',
  data: null,
  warnings: [],
})

function fromBrowserFixture(fixture, momentKey) {
  return (
    fixture?.snapshot?.sources?.specialMoments?.[momentKey] ||
    fixture?.compatibility?.snapshot?.sources?.specialMoments?.[momentKey] ||
    null
  )
}

export function useSpecialMomentSource(momentKey) {
  const browserFixtureSource = useMemo(() => fromBrowserFixture(getBrowserTestCompatibilityState(), momentKey), [momentKey])

  const loadSource = useCallback(
    ({ coupleId, sourceMode }) => {
      if (sourceMode === DATA_SOURCE_MODES.firestore) {
        if (!coupleId) {
          throw new Error('Special moment data requires an approved couple membership.')
        }
        return getFirestoreSpecialMoment(coupleId, momentKey)
      }

      return getLegacySpecialMoment(momentKey)
    },
    [momentKey],
  )

  return useCoupleScopedSource({
    domainKey: `special-moment:${momentKey}`,
    emptySource: EMPTY_SPECIAL_MOMENT_SOURCE,
    fixtureSource: browserFixtureSource,
    loadSource,
  })
}
