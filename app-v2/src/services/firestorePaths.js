import { SPECIAL_MOMENT_KEYS } from '../data/legacySpecialMomentAdapter.js'
import { toTrimmedString } from '../data/adapterUtils.js'

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/

export function assertSafeId(value, label) {
  const id = toTrimmedString(value)
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`${label} must be a non-empty safe Firestore document id.`)
  }
  return id
}

export function assertApprovedMomentType(momentType) {
  const normalized = toTrimmedString(momentType).toLowerCase()
  if (!SPECIAL_MOMENT_KEYS.includes(normalized)) {
    throw new Error('Special moment type is not approved.')
  }
  return normalized
}

export function userPath(uid) {
  return ['users', assertSafeId(uid, 'uid')]
}

export function couplePath(coupleId) {
  return ['couples', assertSafeId(coupleId, 'coupleId')]
}

export function memberPath(coupleId, uid) {
  return [...couplePath(coupleId), 'members', assertSafeId(uid, 'uid')]
}

export function profilePath(coupleId, uid) {
  return [...couplePath(coupleId), 'profiles', assertSafeId(uid, 'uid')]
}

export function favoritesPath(coupleId, uid) {
  return [...couplePath(coupleId), 'favorites', assertSafeId(uid, 'uid')]
}

export function sharedSettingsPath(coupleId) {
  return [...couplePath(coupleId), 'settings', 'shared']
}

export function privateSettingsPath(coupleId, uid) {
  return [...couplePath(coupleId), 'settings', assertSafeId(uid, 'uid')]
}

export function currentContractPath(coupleId) {
  return [...couplePath(coupleId), 'contracts', 'current']
}

export function memoriesPath(coupleId) {
  return [...couplePath(coupleId), 'memories']
}

export function memoryPath(coupleId, memoryId) {
  return [...memoriesPath(coupleId), assertSafeId(memoryId, 'memoryId')]
}

export function specialMomentPath(coupleId, momentType) {
  return [...couplePath(coupleId), 'specialMoments', assertApprovedMomentType(momentType)]
}

export function pathToString(parts) {
  return parts.join('/')
}
