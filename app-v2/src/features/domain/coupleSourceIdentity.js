export function getApprovedUserCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

export function getApprovedUserUid(approvedUser) {
  return approvedUser?.uid || approvedUser?.raw?.uid || ''
}

export function getApprovedUserLabel(approvedUser) {
  return approvedUser?.username || approvedUser?.displayName || approvedUser?.profileName || getApprovedUserUid(approvedUser)
}

export function getCoupleScopedOwnerKey({ approvedUser, domainKey, fixtureSource, isAuthorized, sourceMode }) {
  if (fixtureSource) return `${domainKey}:browser-fixture`
  if (!isAuthorized || !getApprovedUserUid(approvedUser) || !getApprovedUserCoupleId(approvedUser)) return `${domainKey}:empty`
  return [
    domainKey,
    sourceMode,
    getApprovedUserUid(approvedUser),
    getApprovedUserCoupleId(approvedUser),
    getApprovedUserLabel(approvedUser),
  ].join(':')
}
