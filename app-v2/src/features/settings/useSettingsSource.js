import { useCallback, useMemo, useState } from 'react'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getSettingsSourceForApprovedUser } from '../../services/settingsService.js'
import { useCoupleScopedSource } from '../domain/useCoupleScopedSource.js'

const EMPTY_SETTINGS_SOURCE = Object.freeze({
  status: 'empty',
  source: 'settings-domain',
  data: null,
  warnings: Object.freeze([]),
})

function fromBrowserFixture(fixture) {
  return fixture?.snapshot?.sources?.settings || fixture?.compatibility?.snapshot?.sources?.settings || null
}

export function useSettingsSource() {
  const [browserTestCompatibility] = useState(() => getBrowserTestCompatibilityState())
  const browserFixtureSettingsSource = useMemo(() => fromBrowserFixture(browserTestCompatibility), [browserTestCompatibility])

  const loadSource = useCallback(({ approvedUser, coupleId, forceRefresh, sourceMode, uid, username }) => {
    return getSettingsSourceForApprovedUser({
      approvedUser,
      coupleId,
      forceRefresh,
      sourceMode,
      uid,
      username,
    })
  }, [])

  return useCoupleScopedSource({
    domainKey: 'settings',
    emptySource: EMPTY_SETTINGS_SOURCE,
    fixtureSource: browserFixtureSettingsSource,
    loadSource,
  })
}
