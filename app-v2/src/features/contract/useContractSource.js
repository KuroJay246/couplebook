import { useCallback, useMemo } from 'react'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getContractSourceForApprovedUser } from '../../services/contractService.js'
import { useCoupleScopedSource } from '../domain/useCoupleScopedSource.js'

const EMPTY_CONTRACT_SOURCE = Object.freeze({
  status: 'empty',
  source: 'contract-domain',
  data: null,
  warnings: Object.freeze([]),
})

function fromBrowserFixture(fixture) {
  return fixture?.snapshot?.sources?.contract || fixture?.compatibility?.snapshot?.sources?.contract || null
}

export function useContractSource() {
  const browserFixtureSource = useMemo(() => fromBrowserFixture(getBrowserTestCompatibilityState()), [])
  const loadSource = useCallback((options) => getContractSourceForApprovedUser(options), [])

  return useCoupleScopedSource({
    domainKey: 'contract',
    emptySource: EMPTY_CONTRACT_SOURCE,
    fixtureSource: browserFixtureSource,
    loadSource,
  })
}
