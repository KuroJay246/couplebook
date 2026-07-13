import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebaseClient.js'

export function buildUserDocumentPath(uid) {
  if (!uid) throw new Error('A Firebase user uid is required.')
  return `users/${uid}`
}

export function getUserDocumentRef(uid, firestore = db) {
  if (!firestore) throw new Error('Firestore is not configured for app-v2.')
  return doc(firestore, 'users', uid)
}

export function normalizeApprovedUserRecord(uid, data = {}) {
  return {
    uid,
    username: data.username || '',
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
