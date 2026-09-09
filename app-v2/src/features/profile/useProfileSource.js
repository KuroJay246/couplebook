import { useCallback, useMemo, useState } from 'react'
import { getBrowserTestCompatibilityState } from '../../lib/browserTestMode.js'
import { getProfileSourceForApprovedUser } from '../../services/profileService.js'
import { useCoupleScopedSource } from '../domain/useCoupleScopedSource.js'

const EMPTY_PROFILE_SOURCE = Object.freeze({
  status: 'empty',
  source: 'profile-domain',
  data: {
    profilesByUsername: {},
    participantOrder: [],
    unknownTopLevelFields: {},
  },
  warnings: Object.freeze([]),
})

function fromBrowserFixture(fixture) {
  return fixture?.snapshot?.sources?.profile || fixture?.compatibility?.snapshot?.sources?.profile || null
}

export function useProfileSource() {
  const [browserTestCompatibility] = useState(() => getBrowserTestCompatibilityState())
  const browserFixtureProfileSource = useMemo(() => fromBrowserFixture(browserTestCompatibility), [browserTestCompatibility])

  const loadSource = useCallback(({ approvedUser, coupleId, sourceMode, uid, username }) => {
    return getProfileSourceForApprovedUser({
      approvedUser,
      coupleId,
      sourceMode,
      uid,
      username,
    })
  }, [])

  return useCoupleScopedSource({
    domainKey: 'profile',
    emptySource: EMPTY_PROFILE_SOURCE,
    fixtureSource: browserFixtureProfileSource,
    loadSource,
  })
}
