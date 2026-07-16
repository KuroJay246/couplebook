import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { readLegacyProfiles } from '../data/legacyProfileAdapter.js'
import { db } from '../lib/firebaseClient.js'
import { pathToString, profilePath, couplePath } from './firestorePaths.js'
import { readCollection, readDocument, requireSchemaVersion, safeString } from './firestoreReaders.js'

export function buildProfileDocumentPath(coupleId, uid) {
  return pathToString(profilePath(coupleId, uid))
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

export function normalizeFirestoreProfile(uid, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  return {
    uid,
    name: safeString(data.name, 80),
    bio: safeString(data.bio, 500),
    anniversaryView: safeString(data.anniversaryView, 40),
    joinedDate: safeString(data.joinedDate, 40),
    birthday: safeString(data.birthday, 40),
  }
}

export async function getFirestoreProfile(coupleId, uid, options = {}) {
  return readDocument({
    firestore: options.firestore || db,
    path: profilePath(coupleId, uid),
    getDocument: options.getDocument,
    normalize: normalizeFirestoreProfile,
  })
}

export async function getFirestoreProfilesForCouple(coupleId, options = {}) {
  return readCollection({
    firestore: options.firestore || db,
    path: [...couplePath(coupleId), 'profiles'],
    getCollection: options.getCollection,
    normalizeEntry: normalizeFirestoreProfile,
  })
}
