import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyProfiles } from '../data/legacyProfileAdapter.js'
import { buildUserDocumentPath } from './userService.js'

export function buildProfileDocumentPath(uid) {
  return buildUserDocumentPath(uid)
}

export async function getLegacyProfile(options = {}) {
  const read = options.readLegacyProfiles || readLegacyProfiles
  return read(options)
}

export async function getFirestoreProfileByUid() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Firestore profile reads remain deferred until the read-only compatibility mapping is proven.'],
  })
}
