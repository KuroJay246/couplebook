import {
  browserLocalPersistence,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured, missingFirebaseConfigMessage } from '../lib/firebase.js'

let persistencePromise = null
export const GOOGLE_PROVIDER_ID = 'google.com'

export async function ensureAuthPersistence() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for Couple Book.')
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
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for Couple Book.')
  }

  if (!email?.trim()) throw new Error('Enter an approved account email.')
  if (!password?.trim()) throw new Error('Enter the account password.')

  await ensureAuthPersistence()
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export function getLinkedProviderIds(user) {
  const providerIds = []
  for (const provider of user?.providerData || []) {
    const providerId = String(provider?.providerId || '').trim()
    if (providerId) providerIds.push(providerId)
  }
  return providerIds
}

export function isGoogleProviderLinked(user) {
  return getLinkedProviderIds(user).includes(GOOGLE_PROVIDER_ID)
}

export function createGoogleAuthProvider() {
  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

function createGoogleLinkTimeoutError() {
  return new Error('Google sign-in linking did not finish. Check for a blocked Google popup, allow popups for localhost, then try again.')
}

function createGoogleSignInTimeoutError() {
  return new Error('Google sign-in did not finish. Check for a blocked Google popup, allow popups for localhost, then try again.')
}

function createUidMismatchError() {
  const error = new Error('Google sign-in returned a different Firebase account. Sign back in with the approved Couple Book account, then link Google from Settings.')
  error.code = 'auth/google-link-uid-mismatch'
  return error
}

function withTimeout(promise, timeoutMs, createTimeoutError) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise

  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError()), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== null) clearTimeout(timeoutId)
  })
}

export async function linkCurrentUserWithGoogle({
  authInstance = auth,
  ensurePersistence = ensureAuthPersistence,
  firebaseConfigured = isFirebaseConfigured,
  linkPopup = linkWithPopup,
  linkTimeoutMs = 20000,
  providerFactory = createGoogleAuthProvider,
} = {}) {
  if (!authInstance || !firebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for Couple Book.')
  }

  const currentUser = authInstance.currentUser
  if (!currentUser?.uid) throw new Error('Sign in with the existing Couple Book account before linking Google.')

  if (isGoogleProviderLinked(currentUser)) {
    return { user: currentUser, alreadyLinked: true, providerId: GOOGLE_PROVIDER_ID }
  }

  await ensurePersistence()
  const result = await withTimeout(linkPopup(currentUser, providerFactory()), linkTimeoutMs, createGoogleLinkTimeoutError)
  if (result.user?.uid !== currentUser.uid) throw createUidMismatchError()
  return { user: result.user, alreadyLinked: false, providerId: GOOGLE_PROVIDER_ID }
}

export async function signInWithGoogleProvider({
  authInstance = auth,
  ensurePersistence = ensureAuthPersistence,
  firebaseConfigured = isFirebaseConfigured,
  providerFactory = createGoogleAuthProvider,
  signInPopup = signInWithPopup,
  signInTimeoutMs = 20000,
} = {}) {
  if (!authInstance || !firebaseConfigured) {
    throw new Error(missingFirebaseConfigMessage || 'Firebase auth is not configured for Couple Book.')
  }

  await ensurePersistence()
  const result = await withTimeout(signInPopup(authInstance, providerFactory()), signInTimeoutMs, createGoogleSignInTimeoutError)
  return { user: result.user, providerId: GOOGLE_PROVIDER_ID }
}

export async function signOutCurrentUser() {
  if (!auth) return
  await signOut(auth)
}
