import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

export function buildUserDocumentPath(uid) {
  if (!uid) throw new Error('A Firebase user uid is required.')
  return `users/${uid}`
}

export function getUserDocumentRef(uid, firestore = db) {
  if (!firestore) throw new Error('Firestore is not configured for app-v2.')
  return doc(firestore, 'users', uid)
}

export async function readUserProfileByUid(uid, options = {}) {
  const getDocument = options.getDocument || getDoc
  const reference = getUserDocumentRef(uid, options.firestore || db)
  const snapshot = await getDocument(reference)

  if (!snapshot.exists()) return null
  const data = snapshot.data() || {}

  return {
    uid,
    username: data.username || '',
    profileName: data.profile?.name || '',
    contractAccepted: data.contractAccepted === true,
    raw: data,
  }
}
