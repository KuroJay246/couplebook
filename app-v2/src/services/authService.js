import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../lib/firebaseClient.js'
import { isFirebaseConfigured, missingFirebaseConfigMessage } from '../lib/firebaseConfig.js'

let persistencePromise = null

export async function ensureAuthPersistence() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for app-v2.')
  }

  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
      persistencePromise = null
      throw error
    })
  }

  await persistencePromise
}

export function observeAuthState(onResolve, onError) {
  if (!auth) {
    queueMicrotask(() => onResolve(null))
    return () => {}
  }

  return onAuthStateChanged(auth, onResolve, onError)
}

export async function signInWithEmail(email, password) {
  if (!auth || !isFirebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for app-v2.')
  }

  if (!email?.trim()) throw new Error('Enter an approved account email.')
  if (!password?.trim()) throw new Error('Enter the account password.')

  await ensureAuthPersistence()
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function signOutCurrentUser() {
  if (!auth) return
  await signOut(auth)
}
