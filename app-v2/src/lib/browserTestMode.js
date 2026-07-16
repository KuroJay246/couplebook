import { freezeClone, isLocalOrigin, isPlainObject, toTrimmedString } from '../data/adapterUtils.js'

function getWindowLike(windowLike) {
  if (windowLike) return windowLike
  if (typeof window !== 'undefined') return window
  return null
}

function readRawBrowserTestMode(windowLike = getWindowLike()) {
  if (!windowLike || !isLocalOrigin(windowLike.location)) {
    return null
  }

  const rawMode = windowLike.__COUPLEBOOK_BROWSER_TEST__
  if (!isPlainObject(rawMode) || rawMode.enabled !== true) {
    return null
  }

  return rawMode
}

function normalizeMetadata(rawMetadata) {
  const lastSignInTime = toTrimmedString(rawMetadata?.lastSignInTime)
  return lastSignInTime ? { lastSignInTime } : {}
}

function normalizeAuthUser(rawUser) {
  if (!isPlainObject(rawUser)) return null

  const uid = toTrimmedString(rawUser.uid) || 'browser-test-user'
  const email = toTrimmedString(rawUser.email)
  const displayName = toTrimmedString(rawUser.displayName)

  if (!email && !displayName && !uid) {
    return null
  }

  return {
    uid,
    email,
    displayName,
    metadata: normalizeMetadata(rawUser.metadata),
  }
}

function normalizeApprovedUser(rawApprovedUser) {
  if (!isPlainObject(rawApprovedUser)) return null

  const username = toTrimmedString(rawApprovedUser.username)
  const displayName = toTrimmedString(rawApprovedUser.displayName)
  const profileName = toTrimmedString(rawApprovedUser.profileName)

  if (!username && !displayName && !profileName) {
    return null
  }

  return {
    username: username || displayName || profileName,
    displayName: displayName || username || profileName,
    profileName: profileName || displayName || username,
  }
}

function normalizeBrowserTestAuth(rawAuth) {
  const status = toTrimmedString(rawAuth?.status).toLowerCase()

  if (status === 'authorized') {
    const user = normalizeAuthUser(rawAuth.user)
    const approvedUser = normalizeApprovedUser(rawAuth.approvedUser)

    if (user && approvedUser) {
      return {
        mode: 'authorized',
        user,
        approvedUser,
        isAuthorized: true,
        authError: '',
      }
    }
  }

  if (status === 'unauthorized') {
    return {
      mode: 'unauthorized',
      user: normalizeAuthUser(rawAuth.user),
      approvedUser: null,
      isAuthorized: false,
      authError: toTrimmedString(rawAuth.authError) || 'This account is not approved for Couple Book.',
    }
  }

  return {
    mode: 'signed-out',
    user: null,
    approvedUser: null,
    isAuthorized: false,
    authError: '',
  }
}

function normalizeBrowserTestCompatibility(rawCompatibility) {
  if (!isPlainObject(rawCompatibility)) {
    return {
      state: 'empty',
      snapshot: null,
      error: '',
    }
  }

  const snapshot = isPlainObject(rawCompatibility.snapshot) ? freezeClone(rawCompatibility.snapshot) : null
  const requestedState = toTrimmedString(rawCompatibility.state).toLowerCase()
  const error = toTrimmedString(rawCompatibility.error)

  let state = requestedState
  if (!['loading', 'ready', 'empty', 'error'].includes(state)) {
    state = snapshot ? (snapshot.status === 'empty' ? 'empty' : 'ready') : 'empty'
  }

  return {
    state,
    snapshot,
    error,
  }
}

export function getBrowserTestMode(windowLike = getWindowLike()) {
  const rawMode = readRawBrowserTestMode(windowLike)
  if (!rawMode) return null

  return freezeClone({
    auth: normalizeBrowserTestAuth(rawMode.auth),
    compatibility: normalizeBrowserTestCompatibility(rawMode.compatibility),
  })
}

export function getBrowserTestAuthState(windowLike = getWindowLike()) {
  return getBrowserTestMode(windowLike)?.auth || null
}

export function getBrowserTestCompatibilityState(windowLike = getWindowLike()) {
  return getBrowserTestMode(windowLike)?.compatibility || null
}
