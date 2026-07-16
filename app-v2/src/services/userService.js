import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebaseClient.js'
import { pathToString, userPath } from './firestorePaths.js'

export function buildUserDocumentPath(uid) {
  return pathToString(userPath(uid))
}

export function getUserDocumentRef(uid, firestore = db) {
  if (!firestore) throw new Error('Firestore is not configured for app-v2.')
  return doc(firestore, ...userPath(uid))
}

export function normalizeApprovedUserRecord(uid, data = {}) {
  const coupleId = typeof data.coupleId === 'string' ? data.coupleId.trim() : ''
  return {
    uid,
    username: data.username || '',
    coupleId,
    approved: data.approved === true || !!data.username,
    schemaVersion: Number.isInteger(data.schemaVersion) ? data.schemaVersion : null,
    profileName: data.profile?.name || '',
    contractAccepted: data.contractAccepted === true,
    theme: data.theme || null,
    hasFavorites: !!(data.favorites && Object.keys(data.favorites).length > 0),
    hasProfile: !!(data.profile && Object.keys(data.profile).length > 0),
    raw: data,
  }
}

export async function getApprovedUserByUid(uid, options = {}) {
  const getDocument = options.getDocument || getDoc
  const getDocumentReference = options.getUserDocumentRef || getUserDocumentRef
  const reference = getDocumentReference(uid, options.firestore || db)
  const snapshot = await getDocument(reference)

  if (!snapshot.exists()) return null
  const data = snapshot.data() || {}

  return normalizeApprovedUserRecord(uid, data)
}

export const readUserProfileByUid = getApprovedUserByUid
