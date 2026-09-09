import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { DATA_SOURCE_MODES, resolveDataSourceMode } from '../data/dataSourceMode.js'
import { readLegacyProfiles } from '../data/legacyProfileAdapter.js'
import { db } from '../lib/firebase.js'
import { pathToString, profilePath, couplePath } from './firestorePaths.js'
import { readCollection, requireSchemaVersion, safeString } from './firestoreReaders.js'

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
    revision: Number.isInteger(data.revision) && data.revision > 0 ? data.revision : 0,
  }
}

export async function getFirestoreProfilesForCouple(coupleId, options = {}) {
  return readCollection({
    firestore: options.firestore || db,
    path: [...couplePath(coupleId), 'profiles'],
    getCollection: options.getCollection,
    normalizeEntry: normalizeFirestoreProfile,
  })
}

function getApprovedUserCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

function getApprovedUserUid(approvedUser) {
  return approvedUser?.uid || approvedUser?.raw?.uid || ''
}

export function profilesCollectionToProfileSource(result) {
  if (result.status !== 'ready' && result.status !== 'partial') return result

  const profilesByUsername = {}
  const participantOrder = []
  const entries = Array.isArray(result.data?.entries) ? result.data.entries : []

  for (const entry of entries) {
    if (!entry?.uid) continue
    participantOrder.push(entry.uid)
    profilesByUsername[entry.uid] = {
      name: entry.name,
      bio: entry.bio,
      avatar: '',
      anniversaryView: entry.anniversaryView,
      joinedDate: entry.joinedDate,
      birthday: entry.birthday,
      revision: entry.revision,
      unknownFields: {},
    }
  }

  return createCompatibilityResult({
    status: participantOrder.length > 0 ? result.status : 'empty',
    source: FIRESTORE_SOURCE,
    data: {
      profilesByUsername,
      participantOrder,
      unknownTopLevelFields: {},
    },
    warnings: result.warnings || [],
  })
}

export async function getFirestoreProfileSourceForCouple(coupleId, options = {}) {
  const collectionSource = await getFirestoreProfilesForCouple(coupleId, options)
  return profilesCollectionToProfileSource(collectionSource)
}

export async function getProfileSourceForApprovedUser(options = {}) {
  const approvedUser = options.approvedUser || null
  const sourceMode = options.sourceMode || resolveDataSourceMode()
  const coupleId = options.coupleId || getApprovedUserCoupleId(approvedUser)
  const uid = options.uid || getApprovedUserUid(approvedUser)
  const username = options.username || approvedUser?.username || approvedUser?.displayName || uid

  if (sourceMode === DATA_SOURCE_MODES.firestore) {
    if (!coupleId) {
      return createCompatibilityResult({
        status: 'unavailable',
        source: FIRESTORE_SOURCE,
        warnings: ['Firestore profiles require an approved user document with a coupleId.'],
      })
    }

    return getFirestoreProfileSourceForCouple(coupleId, options)
  }

  return getLegacyProfile({
    ...options,
    approvedUser,
    sourceMode,
    username,
  })
}
